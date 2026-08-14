import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { AdJobRepository, AdJobVo } from './ad-job.repository';
import { AdStudioService } from './ad-studio.service';
import { TeamCreditService } from '../teams/team-credit.service';
import { CompileAdDto } from './dto/ad-studio.dto';

/**
 * 광고 영상 잡 — 컴파일 → 과금 → 엔진 제출 → 폴링 → 영속화.
 * ============================================================================
 * ⚠️ **폴링은 요청 시점에 한다**(백그라운드 폴러 없음).
 *   Cloudflare가 프록시 요청을 100초에 끊기 때문에 동기 생성이 불가능하고, 잡 큐가 정답이다.
 *   다만 폴러를 하나 더 띄우면 이중 폴링·고아 잡 관리가 따라붙는다. 프론트가 어차피 폴링하므로
 *   `GET /jobs/:id`가 들어올 때 provider를 확인해 상태를 전진시킨다.
 *   → 사용자가 창을 닫으면 잡이 processing에 남는다. 회수 스윕은 후속 과제(§남은 것).
 *
 * ⚠️ 돈이 오가는 경로다. 제출 실패·엔진 실패 어느 쪽이든 **반드시 환불**한다.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const seedanceProvider = require(path.join(__dirname, '..', '..', 'src', 'videos', 'providers', 'seedance.provider.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const klingProvider = require(path.join(__dirname, '..', '..', 'src', 'videos', 'providers', 'kling.provider.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mediaStore = require(path.join(__dirname, '..', '..', 'src', 'storage', 'mediaStore.js'));
// ⚠️ image2video 엔진은 aspect_ratio를 무시하고 **입력 이미지 비율**을 따라간다(실측).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fitStartFrame } = require(path.join(__dirname, '..', '..', 'src', 'ad-studio', 'frameFit.service.js'));

const OUTPUT_DIR = path.join(process.cwd(), 'tmp', 'images');
/** Kling은 5·10초만 받는다. Seedance는 4~15초 자유. */
const KLING_DURATIONS = [5, 10];

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

@Injectable()
export class AdJobService {
  constructor(
    private readonly repo: AdJobRepository,
    private readonly studio: AdStudioService,
    private readonly credits: TeamCreditService,
  ) {}

  /**
   * 엔진 선택 — Seedance(단일패스, 경쟁사와 동일)를 우선하고, 키가 없으면 Kling으로 떨어진다.
   * 어느 쪽으로 갔는지 `ad_jobs.engine`에 남긴다(경쟁사는 이걸 숨겨서 품질 추적이 불가능하다).
   */
  private pickEngine(): { name: string; provider: any } {
    if (seedanceProvider.isConfigured()) return { name: 'seedance', provider: seedanceProvider };
    if (klingProvider.isConfigured()) return { name: 'kling', provider: klingProvider };
    throw httpError(503, '영상 생성 엔진이 설정되지 않았습니다(FAL_API_KEY 또는 KLING_ACCESS_KEY 필요).');
  }

  /** Kling은 5·10초뿐이라 요청 길이를 가장 가까운 값으로 맞춘다. */
  private engineDuration(engine: string, durationSec: number): number {
    if (engine !== 'kling') return durationSec;
    return KLING_DURATIONS.reduce((a, b) => (Math.abs(b - durationSec) < Math.abs(a - durationSec) ? b : a));
  }

  /**
   * 생성 시작. 컴파일까지 마친 뒤 과금하고 제출한다.
   * @returns 생성 중인 잡(status=processing). 결과는 폴링으로 받는다.
   */
  async create(user: { id: string; role?: string }, body: CompileAdDto): Promise<AdJobVo> {
    const compiled = await this.studio.compile(user.id, body);
    const { name: engine, provider } = this.pickEngine();

    const cost = this.studio.cost(body);
    const aspectRatio = body.aspectRatio || '9:16';
    let startImage = (body.product?.images || [])[0];
    if (engine === 'kling' && !startImage) {
      // Kling은 image2video라 첫 프레임이 반드시 있어야 한다.
      throw httpError(400, '이 엔진은 시작 이미지가 필요합니다. 제품 이미지를 먼저 준비해 주세요.');
    }

    // ── 시작 프레임 비율 보정 ──
    //   요청 비율과 이미지 비율이 다르면 결과가 이미지 비율로 나온다(500×500 → 960×960 실측).
    //   과금 **전에** 한다 — 여기서 실패하면 돈을 받지 않는다.
    if (startImage) {
      try {
        startImage = (await fitStartFrame(startImage, aspectRatio)).url;
      } catch (e: any) {
        throw httpError(400, `시작 이미지를 처리할 수 없습니다: ${e.message}`);
      }
    }

    // ── 과금 ── 팀 컨텍스트면 팀 풀에서, 개인이면 개인 잔액에서(admin 면제)
    const charge = await this.credits.chargeGeneration(
      user, cost.credits, `광고 영상 생성 (${cost.durationSec}초 ${cost.resolution})`, null,
    );

    let job: AdJobVo;
    try {
      job = await this.repo.insert({
        userId: user.id,
        teamId: await this.credits.activeTeamId(user.id),
        mode: body.mode || 'ugc',
        specificMode: body.webProductId ? 'web_product' : 'default',
        webProductId: body.webProductId || null,
        hookId: body.hookId || null,
        settingId: body.settingId || null,
        avatarIds: body.avatarIds || [],
        duration: cost.durationSec,
        resolution: cost.resolution,
        aspectRatio,
        generateAudio: body.generateAudio !== false,
        enhancedPrompt: compiled.enhancedPrompt,
        engine,
        charged: charge ? charge.amount : 0,
      });
    } catch (e) {
      if (charge) await charge.refund();
      throw e;
    }

    // ── 제출 ── 실패하면 잡을 failed로 남기고 환불한다(크레딧만 빠지는 상태를 만들지 않는다)
    try {
      const submitted = await provider.submit({
        sourceImageUrl: startImage,
        motionPrompt: compiled.enhancedPrompt,
        negativePrompt: '',                       // Seedance는 미지원, Kling은 프롬프트에 포함시킨다
        durationSec: this.engineDuration(engine, cost.durationSec),
        aspectRatio,
        resolution: cost.resolution,
        generateAudio: body.generateAudio !== false,
        tier: body.tier || 'standard',
        style: 'natural',
      });
      await this.repo.markSubmitted(job.id, submitted.providerJobId, submitted.metadata || {});
    } catch (e: any) {
      await this.repo.markFailed(job.id, e.message);
      if (charge) await charge.refund();
      throw httpError(502, `영상 생성 요청에 실패했습니다: ${e.message}`);
    }

    return (await this.repo.findById(job.id, user.id)) as AdJobVo;
  }

  /**
   * 잡 조회. processing이면 provider를 확인해 상태를 전진시킨다(폴링 진입점).
   */
  async get(user: { id: string }, id: string): Promise<AdJobVo> {
    const job = await this.repo.findById(id, user.id);
    if (!job) throw httpError(404, '잡을 찾을 수 없습니다.');
    if (job.status !== 'processing' || !job.provider_job_id) return job;

    const provider = job.engine === 'seedance' ? seedanceProvider : klingProvider;
    let poll: any;
    try {
      poll = await provider.poll(job.provider_job_id, job.provider_meta || {});
    } catch (e: any) {
      // 폴링 실패는 잡 실패가 아니다(일시적 네트워크일 수 있다) — 상태를 그대로 두고 다음 요청에 재시도.
      return job;
    }

    if (poll.status === 'completed' && poll.videoUrl) {
      const stored = await this.persist(poll.videoUrl).catch(() => poll.videoUrl);
      await this.repo.markCompleted(job.id, stored);
    } else if (poll.status === 'failed') {
      await this.repo.markFailed(job.id, poll.error || '엔진이 생성에 실패했습니다.');
      // 결과를 못 받았으므로 환불한다.
      if (job.charged > 0) {
        await this.credits.refundGeneration(user, job.charged, '광고 영상 생성 실패 환불', job.id);
      }
    }
    return (await this.repo.findById(id, user.id)) as AdJobVo;
  }

  list(user: { id: string }): Promise<AdJobVo[]> {
    return this.repo.listByUser(user.id);
  }

  /**
   * 결과 영상을 우리 스토리지로 옮긴다.
   * ⚠️ provider가 주는 URL은 **만료된다**(Kling·fal 모두 임시 URL). 그대로 저장하면 며칠 뒤 깨진다.
   */
  private async persist(videoUrl: string): Promise<string> {
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error(`결과 다운로드 실패 (${res.status})`);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}.mp4`;
    const abs = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(abs, Buffer.from(await res.arrayBuffer()));
    await mediaStore.putFile(abs);        // R2 미설정이면 no-op(로컬만)
    return `/images/${filename}`;         // 우리 서빙 경로(로컬 우선 → 없으면 R2)
  }
}
