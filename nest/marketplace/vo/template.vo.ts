/**
 * 마켓플레이스 템플릿 행(VO) — src/marketplace/marketplace.service.js 의 PUBLIC_COLS 그대로.
 * ⚠️ 컬럼명(snake_case)이 응답 JSON에 그대로 나가고 프론트가 그 이름을 읽는다. 바꾸지 말 것.
 */
export interface TemplateVo {
  readonly id: string;
  readonly creator_id: string | null;
  readonly creator_handle: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly category: TemplateCategory;
  readonly type: TemplateType;
  readonly style: string | null;
  /** 유료 미보유면 블랙박스 처리로 null이 된다(getTemplate) */
  readonly prompt: string | null;
  readonly negative_prompt: string | null;
  readonly tool: string | null;
  readonly visibility: TemplateVisibility;
  readonly emoji: string | null;
  readonly price_credits: number;
  /** 사용당 로열티(소액, ≤50) */
  readonly use_price_credits: number;
  readonly recipe_id: string | null;
  readonly usage_count: number;
  readonly likes_count: number;
  readonly preview_media: unknown[] | null;
  readonly reference_examples: unknown[] | null;
  readonly target_image_url: string | null;
  readonly is_official: boolean;
  readonly created_at: string;
}

export type TemplateCategory = 'Influencer' | 'Shopping' | 'UGC' | 'Custom';
export type TemplateType = 'image' | 'reel';
export type TemplateVisibility = 'public' | 'private';
/** studio 배치용 대분류 — 공식은 라벨, 비공식은 포스트잇(개인 배치)으로 판정 */
export type MacroGroup = 'Influencer' | 'Shopping';

/** 목록 카드에 붙는 파생 필드(내 것인지·저장했는지·보유했는지·썸네일·테마) */
export interface TemplateCardVo extends TemplateVo {
  readonly mine: boolean;
  readonly bookmarked: boolean;
  /** 무료 오피셜은 owns 행이 없어도 true(기본제공) */
  readonly owned: boolean;
  readonly thumb: string | null;
  readonly themes: string[];
}

/** 보유 목록(/owned) 행 — 개인 배치 결과가 themes·macroGroup으로 확정돼 나온다 */
export interface OwnedTemplateVo extends TemplateVo {
  readonly from_creation_idx: number | null;
  readonly origin: TemplateOrigin;
  readonly owned: boolean;
  readonly own_source: string;
  readonly in_studio: boolean;
  readonly mine: boolean;
  readonly thumb: string | null;
  readonly themes: string[];
  readonly macroGroup: MacroGroup;
}

/** 자동민팅(auto)은 명시적 추가 전까지 My templates에 안 뜬다 */
export type TemplateOrigin = 'auto' | 'manual' | string;

/** 내 템플릿(/me) 행 — 라이브러리 추가 여부가 붙는다 */
export interface MyTemplateVo extends TemplateVo {
  readonly from_creation_idx: number | null;
  readonly origin: TemplateOrigin;
  readonly added_to_library: boolean;
  readonly themes: string[];
}

/** 크리에이터 스토어프론트 카드 — prompt를 노출하지 않는 축약 컬럼셋(블랙박스 보호) */
export interface CreatorTemplateVo {
  readonly id: string;
  readonly creator_handle: string | null;
  readonly name: string;
  readonly category: TemplateCategory;
  readonly type: TemplateType;
  readonly style: string | null;
  readonly tool: string | null;
  readonly emoji: string | null;
  readonly price_credits: number;
  readonly usage_count: number;
  readonly likes_count: number;
  readonly preview_media: unknown[] | null;
  readonly is_official: boolean;
  readonly created_at: string;
  readonly bookmarked: boolean;
}

/** 정산 대시보드의 템플릿별 수익 행 */
export interface TemplateEarningVo {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly emoji: string | null;
  readonly category: TemplateCategory;
  readonly type: TemplateType;
  readonly price_credits: number;
  readonly use_price_credits: number;
  readonly usage_count: number;
  readonly visibility: TemplateVisibility;
  readonly origin: TemplateOrigin;
  readonly from_creation_idx: number | null;
  readonly created_at: string;
  readonly themes: string[];
  readonly added_to_library: boolean;
  /** 누적 로열티 포인트 */
  readonly earned: number;
  readonly uses_paid: number;
}

/** 최근 로열티 적립 내역 */
export interface RoyaltyEntryVo {
  readonly amount: number;
  readonly description: string | null;
  readonly created_at: string;
}

/** 글로벌 테마(themes 테이블) */
export interface ThemeVo {
  readonly slug: string;
  readonly name: string;
}
