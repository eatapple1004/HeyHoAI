import {
  TemplateVo, TemplateCardVo, TemplateCategory, TemplateType, TemplateVisibility, MacroGroup,
} from '../vo/template.vo';

/** 마켓플레이스 API 경계 계약 — src/marketplace/marketplace.service.js */

// ── 응답 ──

/** 상세(상품 페이지) — 목록 카드 + 집계, 내 것이면 수익까지 */
export interface TemplateDetailDto extends TemplateCardVo {
  creationsCount: number;
  totalLikes: number;
  /** 본인 템플릿에만 노출(남의 수익 비공개) */
  revenue?: number;
}

/** 템플릿으로 만든 공개 creation(사회적 증명 갤러리) */
export interface TemplateCreationDto {
  idx: number;
  url: string | null;
  type: 'video' | 'image';
  likes: number;
}

/** 생성/수정 결과 — 템플릿 행 + 확정된 테마 슬러그 */
export interface SavedTemplateDto extends TemplateVo {
  themes?: string[];
}

/** 스튜디오가 바로 적용할 수 있는 사용 파라미터(카멜케이스로 변환해 내려간다) */
export interface UseTemplateDto {
  id: string;
  name: string;
  category: TemplateCategory;
  type: TemplateType;
  style: string | null;
  prompt: string | null;
  negativePrompt: string;
  tool: string | null;
  emoji: string | null;
  /** recipe-backed면 스튜디오가 리치 recipe를 로드 */
  recipeId: string | null;
}

/** 보유 획득 결과 — 이미 보유면 alreadyOwned, 신규면 source */
export interface AcquireResultDto {
  id: string;
  owned: true;
  alreadyOwned?: true;
  source?: 'free' | 'purchase';
}

/**
 * use/acquire 응답 봉투 — 표준 {success,data}에 **최상위 charged**가 더 붙는다.
 *   차감된 크레딧을 프론트가 즉시 반영하기 위한 필드.
 */
export interface ApiWithCharged<T> {
  success: true;
  data: T;
  charged: number;
}

export interface AddToMyTemplatesResultDto {
  id: string;
  added: true;
}

/** 신고 결과 — 서로 다른 신고자 3명 이상이면 자동 테이크다운 */
export interface ReportResultDto {
  reported: true;
  takenDown: boolean;
}

export interface BookmarkResultDto {
  bookmarked: boolean;
}

export interface DeletedTemplateDto {
  id: string;
}

/** 크리에이터 상태 + 내 템플릿 + 오피셜 마스터(My templates 화면) */
export interface CreatorMeDto {
  isCreator: boolean;
  templates: import('../vo/template.vo').MyTemplateVo[];
  official: import('../vo/template.vo').MyTemplateVo[];
}

/** 셀러 정산 대시보드 — 로열티는 크레딧이 아니라 포인트로 적립된다 */
export interface EarningsDto {
  isCreator: boolean;
  handle: string;
  /** 크리에이터 수익 배분율(0.7) */
  creatorShare: number;
  /** 교환 가능한 현재 포인트 */
  pointBalance: number;
  totalEarned: number;
  payoutCount: number;
  templates: import('../vo/template.vo').TemplateEarningVo[];
  recent: import('../vo/template.vo').RoyaltyEntryVo[];
}

export interface ApplyCreatorResultDto {
  isCreator: true;
}

/** 크리에이터 공개 스토어프론트 */
export interface CreatorStorefrontDto {
  handle: string;
  templateCount: number;
  totalLikes: number;
  followers: number;
  following: boolean;
  isOwn: boolean;
  templates: import('../vo/template.vo').CreatorTemplateVo[];
  showcase: Array<{ idx: number; url: string | null; type: 'video' | 'image' }>;
}

export interface FollowResultDto {
  following: boolean;
  followers: number;
}

/** recipe-backed 유료 게이트 — 미보유면 스튜디오에서 recipe 카드를 숨긴다 */
export interface RecipeGateDto {
  templateId: string;
  recipeId: string;
  price: number;
  owned: boolean;
  in_studio: boolean;
}

/** 기본공개(무료) 공식 템플릿 — 소유 무관 전 유저 노출. /owned 카드빌드와 호환되는 shape */
export interface DefaultOfficialDto extends TemplateVo {
  from_creation_idx: number | null;
  origin: string;
  owned: false;
  mine: boolean;
  thumb: string | null;
  themes: string[];
  in_studio: true;
  macroGroup: MacroGroup;
}

export interface OwnedInStudioResultDto {
  updated: string[];
  in_studio: boolean;
}

// ── 요청 (지금은 타입 전용 — class-validator 붙이면 그대로 검증 대상이 된다) ──

export class ListTemplatesQueryDto {
  category?: TemplateCategory;
  /** '1' | 'true' 면 공개 무료만 좋아요순(Library Feed) */
  feed?: string;
  theme?: string;
}

export class CreateTemplateDto {
  name!: string;
  prompt!: string;
  category!: TemplateCategory;
  description?: string;
  type?: TemplateType;
  style?: string;
  negativePrompt?: string;
  emoji?: string;
  /** 0~100 클램프 */
  priceCredits?: number | string;
  /** 0~50 클램프(사용당 로열티) */
  usePriceCredits?: number | string;
  tool?: string;
  visibility?: TemplateVisibility;
  previewMedia?: string[];
  referenceExamples?: string[];
  /** 글로벌 themes.slug 배열(최대 12, 없으면 general 폴백) */
  themeSlugs?: string[];
  /** 씨앗 creation — 역링크 + 누적 좋아요 롤업(공개 게시일 때만) */
  sourceResultIdx?: number | string;
  targetImageUrl?: string | null;
}

/** 부분 수정 — 전달된 필드만 반영. 테마만 바꾸는 것도 허용 */
export class UpdateTemplateDto {
  name?: string;
  category?: TemplateCategory;
  description?: string;
  priceCredits?: number | string;
  usePriceCredits?: number | string;
  prompt?: string;
  negativePrompt?: string;
  targetImageUrl?: string | null;
  visibility?: TemplateVisibility;
  themeSlugs?: string[];
}

export class ReportTemplateDto {
  reason?: string;
}

export class SetOwnedInStudioDto {
  ids!: string[];
  /** 기본 true — false면 Library only(대기조) */
  in_studio?: boolean;
}
