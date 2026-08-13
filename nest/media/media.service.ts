import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { MediaRepository } from './media.repository';
import { OwnershipService } from '../common/security/ownership.service';
import {
  ImageAssetVo, VideoAssetVo, GenerationJobVo, VideoJobVo,
  VisualAttributeVo, VisualCategoryVo, VisualPresetVo,
} from './vo/media.vo';
import {
  GenerateImagesResultDto, GenerateVideoResultDto, CompilePromptResultDto,
  ListByStatusQueryDto, CreateVisualPresetDto, CompilePromptDto, ListAttributesQueryDto,
} from './dto/media.dto';

/**
 * ⚠️ **생성 엔진은 이식 대상이 아니다** — Gemini/Kling 호출·재시도·후보 선별이 얽힌 덩어리라
 *    TS 재작성 이득보다 리스크가 크고, 로컬에서 성공 경로를 검증할 수도 없다.
 *    Nest는 **권한·검증·조회·응답 형태**를 소유하고, 실제 생성만 엔진에 위임한다.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const imageEngine = require(path.join(__dirname, '..', '..', 'src', 'images', 'imageGeneration.service.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const videoEngine = require(path.join(__dirname, '..', '..', 'src', 'videos', 'videoGeneration.service.js'));
// 검증 스키마는 zod 단일소스 재사용(class-validator 도입 전까지) — 규칙을 복제하면 두 곳이 갈린다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { generateImagesRequestSchema } = require(path.join(__dirname, '..', '..', 'src', 'images', 'image.validator.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { generateVideoRequestSchema } = require(path.join(__dirname, '..', '..', 'src', 'videos', 'video.validator.js'));

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

/** 프롬프트 조합 순서 — 기하 → 조명 → 색 → 구도 → 심리 → 질감 → 맥락. 순서가 결과 이미지를 바꾼다. */
const CATEGORY_ORDER = ['geometry', 'lighting', 'color', 'composition', 'psychology', 'texture', 'context'];

@Injectable()
export class MediaService {
  constructor(
    private readonly repo: MediaRepository,
    private readonly ownership: OwnershipService,
  ) {}

  // ── 이미지 ──

  /** 후보 이미지 생성 — 소유 검증 → 입력 검증 → 엔진 → 응답 형태 정리 */
  async generateImages(userId: string, characterId: string, body: any): Promise<GenerateImagesResultDto> {
    await this.ownership.assertCharacterOwned(characterId, userId);
    const opts = generateImagesRequestSchema.parse(body || {});
    const result = await imageEngine.generateForCharacter(characterId, opts);
    return {
      job: {
        id: result.job.id,
        status: result.job.status,
        candidateCount: result.candidates.length,
      },
      master: result.master
        ? { id: result.master.id, url: result.master.image_url, variation: result.master.variation_label }
        : null,
      candidates: result.candidates.map((c: ImageAssetVo) => ({
        id: c.id, url: c.image_url, variation: c.variation_label, status: c.status,
      })),
    };
  }

  async listImages(userId: string, characterId: string, q: ListByStatusQueryDto): Promise<ImageAssetVo[]> {
    await this.ownership.assertCharacterOwned(characterId, userId);
    return this.repo.findImagesByCharacter(characterId, { status: (q || {}).status });
  }

  async listImageJobs(userId: string, characterId: string): Promise<GenerationJobVo[]> {
    await this.ownership.assertCharacterOwned(characterId, userId);
    return this.repo.findImageJobsByCharacter(characterId);
  }

  /** 대표 이미지 수동 지정 — 다른 캐릭터의 이미지 id를 넣어도 통과하지 않도록 소속을 다시 확인한다 */
  async setMasterImage(userId: string, characterId: string, imageId: string): Promise<ImageAssetVo> {
    await this.ownership.assertCharacterOwned(characterId, userId);
    const image = await this.repo.findImageById(imageId);
    if (!image || image.character_id !== characterId) {
      throw httpError(404, 'Image not found for this character');
    }
    await this.repo.setMasterImage(characterId, imageId);
    return (await this.repo.findImageById(imageId)) as ImageAssetVo;
  }

  /** 이미지 단건 — 이미지가 속한 캐릭터의 소유자만 볼 수 있다 */
  async getImage(userId: string, id: string): Promise<ImageAssetVo> {
    const image = await this.repo.findImageById(id);
    if (!image) throw httpError(404, 'Image not found');
    await this.ownership.assertCharacterOwned(image.character_id, userId);
    return image;
  }

  // ── 영상 ──

  async generateVideo(userId: string, characterId: string, body: any): Promise<GenerateVideoResultDto> {
    await this.ownership.assertCharacterOwned(characterId, userId);
    const opts = generateVideoRequestSchema.parse(body || {});
    const result = await videoEngine.generateForCharacter(characterId, opts);
    return {
      job: {
        id: result.job.id, status: result.job.status,
        provider: result.job.provider, attempt: result.job.attempt,
      },
      video: {
        id: result.video.id,
        videoUrl: result.video.video_url,
        durationMs: result.video.duration_ms,
        videoStyle: result.video.video_style,
        sourceImageId: result.video.source_image_id,
        status: result.video.status,
      },
    };
  }

  async listVideos(userId: string, characterId: string, q: ListByStatusQueryDto): Promise<VideoAssetVo[]> {
    await this.ownership.assertCharacterOwned(characterId, userId);
    return this.repo.findVideosByCharacter(characterId, { status: (q || {}).status });
  }

  async listVideoJobs(userId: string, characterId: string): Promise<VideoJobVo[]> {
    await this.ownership.assertCharacterOwned(characterId, userId);
    return this.repo.findVideoJobsByCharacter(characterId);
  }

  async getVideo(userId: string, id: string): Promise<VideoAssetVo> {
    const video = await this.repo.findVideoById(id);
    if (!video) throw httpError(404, 'Video not found');
    await this.ownership.assertCharacterOwned(video.character_id, userId);
    return video;
  }

  async getVideoJob(userId: string, jobId: string): Promise<VideoJobVo> {
    const job = await this.repo.findVideoJobById(jobId);
    if (!job) throw httpError(404, 'Job not found');
    await this.ownership.assertCharacterOwned(job.character_id, userId);
    return job;
  }

  // ── 비주얼 속성/프리셋 ──

  listCategories(): Promise<VisualCategoryVo[]> {
    return this.repo.listCategories();
  }

  listAttributes(q: ListAttributesQueryDto): Promise<VisualAttributeVo[]> {
    const { category, tags } = q || ({} as ListAttributesQueryDto);
    if (category) return this.repo.findAttributesByCategory(category);
    if (tags) return this.repo.findAttributesByTags(String(tags).split(','));
    return this.repo.findAllAttributes();
  }

  createAttribute(body: any): Promise<VisualAttributeVo> {
    return this.repo.insertAttribute(body || {});
  }

  /** attribute_ids → 하나의 프롬프트 문자열(+ 사용된 속성 목록) */
  async compilePrompt(body: CompilePromptDto): Promise<CompilePromptResultDto> {
    const attributeIds = (body || ({} as CompilePromptDto)).attributeIds;
    const attributes = await this.repo.findAttributesByIds(attributeIds);
    return { prompt: this.compile(attributes), attributes };
  }

  async createPreset(userId: string, characterId: string, body: CreateVisualPresetDto): Promise<VisualPresetVo> {
    await this.ownership.assertCharacterOwned(characterId, userId);
    const b = body || ({} as CreateVisualPresetDto);
    const attrs = await this.repo.findAttributesByIds(b.attributeIds);
    return this.repo.insertPreset({
      characterId,
      name: b.name,
      description: b.description,
      attributeIds: b.attributeIds,
      compiledPrompt: this.compile(attrs),
      isDefault: (b as any).isDefault,
    });
  }

  async listPresets(userId: string, characterId: string): Promise<VisualPresetVo[]> {
    await this.ownership.assertCharacterOwned(characterId, userId);
    return this.repo.findPresetsByCharacter(characterId);
  }

  /** 카테고리 고정 순서로 prompt_fragment를 이어붙인다(목록에 없는 카테고리는 -1 → 맨 앞). */
  private compile(attrs: VisualAttributeVo[]): string {
    return [...attrs]
      .sort((a, b) => CATEGORY_ORDER.indexOf(a.category_id) - CATEGORY_ORDER.indexOf(b.category_id))
      .map((a) => a.prompt_fragment)
      .join(', ');
  }
}
