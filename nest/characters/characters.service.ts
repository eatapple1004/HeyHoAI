import { Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { CharacterRepository } from './character.repository';
import { TeamCreditRepository } from '../teams/team-credit.repository';
import { ImageAssetRepository } from '../images/image-asset.repository';
import { OwnershipService } from '../common/security/ownership.service';
import { CharacterVo, CharacterPersonaVo } from './vo/character.vo';
import {
  CharacterListDto, CreateCharacterDto, RegisterCharacterDto,
  RegisterWithImageDto, ListCharactersQueryDto,
} from './dto/character.dto';

// ── 아직 TS로 이식하지 않은 도메인 모듈(엔진·공용) — 순차 이식 대상 ──
//   Claude 캐릭터 생성·소유권 검증·이미지 리포지토리·R2 영속화·썸네일 생성.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const characterCore = require(path.join(__dirname, '..', '..', 'src', 'characters', 'character.service.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createCharacterRequestSchema } = require(path.join(__dirname, '..', '..', 'src', 'characters', 'character.validator.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mediaStore = require(path.join(__dirname, '..', '..', 'src', 'storage', 'mediaStore.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeRefThumb } = require(path.join(__dirname, '..', '..', 'src', 'characters', 'refThumb.service.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer');

/** statusCode를 가진 에러 — LegacyErrorFilter가 레거시와 동일 형식으로 응답 */
function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

// 레퍼런스 이미지 업로드(multer) — 레거시와 동일한 저장경로·파일명(ref_<uuid>)·10MB.
const uploadDir = path.join(process.cwd(), 'tmp', 'images');
fs.mkdirSync(uploadDir, { recursive: true });
export const REF_MULTER_OPTIONS = {
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req: any, file: any, cb: any) =>
      cb(null, `ref_${crypto.randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
};

/** 간단 등록(register 계열)이 쓰는 기본 persona — Claude 호출 없이 채운다 */
function defaultPersona(name: string, concept: string): CharacterPersonaVo {
  return {
    name,
    age: 25,
    gender: 'Female',
    nationality: 'Korean',
    occupation: 'Content Creator',
    personality: ['natural', 'casual', 'friendly'],
    backstory: concept,
    visualDescription: {
      bodyType: 'slim',
      hairStyle: 'long',
      hairColor: 'dark',
      eyeColor: 'dark brown',
      skinTone: 'fair',
      distinctiveFeatures: '',
      defaultOutfit: 'casual everyday style',
    },
    instagramProfile: { username: name.toLowerCase().replace(/\s+/g, '_'), bio: concept },
    voiceGuidelines: { tone: 'casual', vocabulary: 'simple', emojiStyle: 'minimal', captionLength: 'short' },
    brandSafety: { approvedThemes: ['lifestyle'], bannedTopics: ['politics'], targetAudience: '18-35' },
  };
}

/**
 * 캐릭터 도메인 서비스 — Spring의 @Service.
 * 데이터 접근은 CharacterRepository(주입)로만, 요청 오케스트레이션은 여기서.
 */
@Injectable()
export class CharactersService {
  constructor(
    private readonly characters: CharacterRepository,
    private readonly ownership: OwnershipService,
    private readonly teamCredit: TeamCreditRepository,
    private readonly imageAssets: ImageAssetRepository,
  ) {}

  /** 활성 작업 컨텍스트의 팀 id (개인이면 null) */
  private async activeTeamId(userId: string): Promise<string | null> {
    const ctx = await this.teamCredit.resolveContext(userId);
    return ctx.type === 'team' ? ctx.teamId : null;
  }

  /** POST /api/characters — Claude가 프로필을 만들고 저장(201) */
  async create(userId: string, body: CreateCharacterDto): Promise<CharacterVo> {
    const input = createCharacterRequestSchema.parse(body);
    return characterCore.createCharacter(input, userId, await this.activeTeamId(userId));
  }

  /** 캐릭터 상세 — 본인 것 또는 그 캐릭터 팀의 멤버만 */
  getById(userId: string, id: string): Promise<CharacterVo> {
    return characterCore.getCharacter(id, userId);
  }

  /** 목록 + pagination(응답 최상위 필드) */
  async list(userId: string, q: ListCharactersQueryDto): Promise<CharacterListDto> {
    const { status, limit, offset } = q || {};
    const teamId = await this.activeTeamId(userId);
    const result = await this.characters.findAll({
      userId: teamId ? undefined : userId,
      teamId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return {
      data: result.rows,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  /** 대표 이미지 지정 — 그 캐릭터의 이미지여야 한다 */
  async setReferenceImage(userId: string, id: string, imageId: string): Promise<CharacterVo | null> {
    await this.ownership.assertCharacterOwned(id, userId);
    const image = await this.imageAssets.findById(imageId);
    if (!image || image.character_id !== id) {
      throw httpError(404, 'Image not found for this character');
    }
    const character = await this.characters.setReferenceImage(id, imageId, image.image_url);
    makeRefThumb(image.image_url); // 목록 썸네일(비동기 best-effort)
    return character;
  }

  /** 대표 이미지 해제 */
  async clearReferenceImage(userId: string, id: string): Promise<CharacterVo | null> {
    await this.ownership.assertCharacterOwned(id, userId);
    return this.characters.clearReferenceImage(id);
  }

  /** 간단 등록(멀티파트 referenceImage) — 201 */
  async register(userId: string, body: RegisterCharacterDto, file?: any): Promise<CharacterVo> {
    const { name, concept } = body || ({} as RegisterCharacterDto);
    if (!name || !concept) throw httpError(400, 'Name and concept are required');

    const saved = await this.characters.insert({
      userId, name, concept, persona: defaultPersona(name, concept), teamId: await this.activeTeamId(userId),
    });

    // 대표 이미지 — /images/ 웹 경로로 저장(file:// 절대경로는 브라우저 로드 불가)
    if (file) {
      const refUrl = `/images/${file.filename}`;
      await this.characters.setReferenceImage(saved.id, null, refUrl);
      (saved as any).reference_image_url = refUrl;
      try { await mediaStore.putFile(file.path); } catch (e) {} // R2 영속화(cleanup cron 대비)
      makeRefThumb(refUrl);
    }
    return saved;
  }

  /** 생성된 이미지 파일명으로 등록 — 201 */
  async registerWithImage(userId: string, body: RegisterWithImageDto): Promise<CharacterVo> {
    const { name, concept, imageFilename } = body || ({} as RegisterWithImageDto);
    if (!name || !concept || !imageFilename) {
      throw httpError(400, 'Name, concept, and imageFilename are required');
    }
    const saved = await this.characters.insert({
      userId, name, concept, persona: defaultPersona(name, concept), teamId: await this.activeTeamId(userId),
    });

    const imageUrl = `/images/${imageFilename}`;
    await this.characters.setReferenceImage(saved.id, null, imageUrl);
    (saved as any).reference_image_url = imageUrl;
    try {
      const lp = path.join(process.cwd(), 'tmp', 'images', imageFilename);
      if (fs.existsSync(lp)) await mediaStore.putFile(lp);
    } catch (e) {} // R2 영속화(생성물이 R2에 없을 경우 대비)
    makeRefThumb(imageUrl);
    return saved;
  }

  /** 소프트 삭제(status → archived) */
  async remove(userId: string, id: string): Promise<CharacterVo> {
    await this.ownership.assertCharacterOwned(id, userId);
    const character = await this.characters.updateStatus(id, 'archived');
    if (!character) throw httpError(404, 'Character not found');
    return character;
  }
}
