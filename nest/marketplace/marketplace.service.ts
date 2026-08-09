import { Injectable } from '@nestjs/common';
import {
  TemplateCardVo, OwnedTemplateVo, MyTemplateVo, ThemeVo,
} from './vo/template.vo';
import {
  TemplateDetailDto, TemplateCreationDto, SavedTemplateDto, UseTemplateDto, AcquireResultDto,
  AddToMyTemplatesResultDto, ReportResultDto, BookmarkResultDto, DeletedTemplateDto,
  CreatorMeDto, EarningsDto, ApplyCreatorResultDto, CreatorStorefrontDto, FollowResultDto,
  RecipeGateDto, DefaultOfficialDto, OwnedInStudioResultDto,
  ListTemplatesQueryDto, CreateTemplateDto, UpdateTemplateDto,
} from './dto/template.dto';
import * as path from 'path';

// 마켓플레이스 로직 재사용(중복 금지) — SQL·과금/로열티는 레거시 marketplace.service.js 단일소스.
//   dist/marketplace/marketplace.service.js 기준 ../../src/... = <repo>/src/...
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'marketplace', 'marketplace.service.js'));

// 402(구매 필요)처럼 부가 data를 실어보내는 도메인 에러 → 응답 바디(레거시와 공용 변환).
export const toErrorBody = legacy.toErrorBody;

@Injectable()
export class MarketplaceService {
  // ── /templates 서브트리 (이관 11단계) ──
  listTemplates(userId: string, q: ListTemplatesQueryDto): Promise<TemplateCardVo[]> {
    return legacy.listTemplates(userId, q || {});
  }

  getTemplate(userId: string, id: string): Promise<TemplateDetailDto> {
    return legacy.getTemplate(userId, id);
  }

  getTemplateCreations(id: string): Promise<TemplateCreationDto[]> {
    return legacy.getTemplateCreations(id);
  }

  createTemplate(user: any, body: CreateTemplateDto): Promise<SavedTemplateDto> {
    return legacy.createTemplate(user, body || {});
  }

  updateTemplate(userId: string, id: string, body: UpdateTemplateDto): Promise<SavedTemplateDto> {
    return legacy.updateTemplate(userId, id, body || {});
  }

  deleteTemplate(userId: string, id: string): Promise<DeletedTemplateDto> {
    return legacy.deleteTemplate(userId, id);
  }

  // { data, charged } 봉투를 그대로 돌려준다(레거시 응답이 top-level charged를 포함).
  useTemplate(userId: string, id: string): Promise<{ data: UseTemplateDto; charged: number }> {
    return legacy.useTemplate(userId, id);
  }

  acquireTemplate(user: any, id: string): Promise<{ data: AcquireResultDto; charged: number }> {
    return legacy.acquireTemplate(user, id);
  }

  addToMyTemplates(userId: string, id: string): Promise<AddToMyTemplatesResultDto> {
    return legacy.addToMyTemplates(userId, id);
  }

  reportTemplate(userId: string, id: string, reason?: string): Promise<ReportResultDto> {
    return legacy.reportTemplate(userId, id, reason);
  }

  bookmarkTemplate(userId: string, id: string): Promise<BookmarkResultDto> {
    return legacy.bookmarkTemplate(userId, id);
  }

  unbookmarkTemplate(userId: string, id: string): Promise<BookmarkResultDto> {
    return legacy.unbookmarkTemplate(userId, id);
  }
}

// ── 크리에이터·라이브러리 영역 (이관 12단계) ──
@Injectable()
export class MarketplaceCreatorsService {
  // 글로벌 테마 목록(크리에이터 태깅·Explore 칩)
  listThemes(): Promise<ThemeVo[]> {
    return legacy.listThemes();
  }

  // 크리에이터 상태 + 내가 게시한 템플릿 + 오피셜 마스터
  getMe(userId: string): Promise<CreatorMeDto> {
    return legacy.getMe(userId);
  }

  // 정산 대시보드(로열티 포인트 집계)
  getEarnings(user: any): Promise<EarningsDto> {
    return legacy.getEarnings(user);
  }

  applyCreator(userId: string): Promise<ApplyCreatorResultDto> {
    return legacy.applyCreator(userId);
  }

  getCreator(userId: string, handle: string): Promise<CreatorStorefrontDto> {
    return legacy.getCreator(userId, handle);
  }

  followCreator(userId: string, handle: string): Promise<FollowResultDto> {
    return legacy.followCreator(userId, handle);
  }

  unfollowCreator(userId: string, handle: string): Promise<FollowResultDto> {
    return legacy.unfollowCreator(userId, handle);
  }

  listBookmarks(userId: string): Promise<TemplateCardVo[]> {
    return legacy.listBookmarks(userId);
  }

  listRecipeGates(userId: string): Promise<RecipeGateDto[]> {
    return legacy.listRecipeGates(userId);
  }

  // Library My templates 정본(owns 기준) — 테마/macroGroup 파생 포함
  listOwned(userId: string): Promise<OwnedTemplateVo[]> {
    return legacy.listOwned(userId);
  }

  setOwnedInStudio(userId: string, body: any): Promise<OwnedInStudioResultDto> {
    return legacy.setOwnedInStudio(userId, body || {});
  }

  listDefaultOfficials(userId: string): Promise<DefaultOfficialDto[]> {
    return legacy.listDefaultOfficials(userId);
  }
}
