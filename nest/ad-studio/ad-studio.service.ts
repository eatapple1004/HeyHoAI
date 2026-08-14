import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { AdStudioRepository } from './ad-studio.repository';
import { PromptCompilerService } from './prompt-compiler.service';
import { ShotPlannerService } from './shot-planner.service';
import { AdSetupItemVo, SetupItemType } from './vo/ad-studio.vo';
import { AdCostDto, CompileAdDto, CompileResultDto } from './dto/ad-studio.dto';

// ⚠️ 가격표는 단일소스(복제 금지) — 크레딧 환산 계수가 갈리면 청구액이 갈린다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pricing = require(path.join(__dirname, '..', '..', 'src', 'credits', 'credit.service.js'));

const MIN_DURATION = 4;
const MAX_DURATION = 15;

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

@Injectable()
export class AdStudioService {
  constructor(
    private readonly repo: AdStudioRepository,
    private readonly planner: ShotPlannerService,
    private readonly compiler: PromptCompilerService,
  ) {}

  listSetupItems(type: SetupItemType, userId: string): Promise<AdSetupItemVo[]> {
    return this.repo.listSetupItems(type, userId);
  }

  /** 생성 전 비용 — **무료**. 사용자가 길이·화질을 바꿔가며 확인할 수 있어야 한다. */
  cost(body: CompileAdDto): AdCostDto {
    const durationSec = this.clampDuration(body.durationSec);
    const tier = body.tier === 'fast' ? 'fast' : 'standard';
    const resolution = ['480p', '720p', '1080p'].includes(body.resolution || '') ? body.resolution! : '720p';
    return { credits: pricing.adStudioCost(durationSec, tier, resolution), durationSec, tier, resolution };
  }

  /**
   * 컴파일만 수행 — **크레딧 0**. 영상은 만들지 않는다.
   * 결과가 마음에 들 때까지 여기서 돌려보고, 확정되면 생성으로 넘어가는 흐름(Phase 5).
   */
  async compile(userId: string, body: CompileAdDto): Promise<CompileResultDto> {
    const durationSec = this.clampDuration(body.durationSec);

    // 제품 — 저장된 수집물 우선, 없으면 인라인
    let product = body.product;
    let hasProductImage = !!(product?.images || []).length;
    if (body.webProductId) {
      const wp = await this.repo.findWebProduct(body.webProductId, userId);
      if (!wp) throw httpError(404, '수집된 제품을 찾을 수 없습니다.');
      if (wp.status !== 'ready') throw httpError(409, '제품 수집이 아직 끝나지 않았습니다.');
      product = {
        name: wp.name || '',
        price: wp.price || '',
        attributes: wp.attributes || {},
        images: wp.images || [],
      };
      hasProductImage = (wp.images || []).length > 0;
    }
    if (!product?.name) throw httpError(400, '제품 정보가 필요합니다.');

    const [hook, setting] = await Promise.all([
      body.hookId ? this.repo.findSetupItem(body.hookId, userId) : null,
      body.settingId ? this.repo.findSetupItem(body.settingId, userId) : null,
    ]);
    if (body.hookId && !hook) throw httpError(404, '훅을 찾을 수 없습니다.');
    if (body.settingId && !setting) throw httpError(404, '장소를 찾을 수 없습니다.');

    const attrs: any = product.attributes || {};
    // 훅 프롬프트의 {{product}}는 여기서 치환한다(시드에 박아둔 자리표시자).
    const hookPrompt = hook ? hook.prompt.replace(/\{\{product\}\}/g, product.name) : undefined;

    const shots = await this.planner.plan({
      productName: product.name,
      productSummary: attrs.summary,
      sellingPoints: attrs.sellingPoints,
      hookPrompt,
      settingPrompt: setting?.prompt,
      durationSec,
      hasAvatar: !!(body.avatarIds || []).length,
    });

    const compiled = this.compiler.compile({
      productName: product.name,
      productSummary: attrs.summary,
      shots,
      durationSec,
      settingPrompt: setting?.prompt,
      avatarNames: body.avatarIds || [],
      hasProductImage,
      aspectRatio: body.aspectRatio || '9:16',
      generateAudio: body.generateAudio !== false,
    });

    return { ...compiled, estimatedCredits: this.cost({ ...body, durationSec }).credits };
  }

  /** Seedance가 4~15초만 받는다. 범위를 벗어나면 조용히 보정하지 않고 여기서 한 번만 클램프. */
  private clampDuration(v: unknown): number {
    return Math.min(MAX_DURATION, Math.max(MIN_DURATION, parseInt(String(v), 10) || 8));
  }
}
