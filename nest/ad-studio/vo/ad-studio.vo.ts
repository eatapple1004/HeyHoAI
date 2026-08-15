/**
 * Ad Studio 행 스냅샷(VO) — DB 컬럼명(snake_case) 유지.
 */
export type SetupItemType = 'hook' | 'setting' | 'style';

/** ad_setup_items 행 — 훅과 장소가 같은 테이블에 산다(type으로 구분) */
export interface AdSetupItemVo {
  readonly id: string;
  readonly type: SetupItemType;
  /** style 전용 — { camera:boolean, direction:string }. 그 외 타입은 null */
  readonly meta?: { camera?: boolean; direction?: string; location?: boolean; hook?: boolean; technical?: string[] } | null;
  readonly slug: string;
  readonly name: string;
  readonly prompt: string;
  readonly locale: string;
  readonly is_official: boolean;
  readonly user_id: string | null;
  readonly sort_order: number;
}

/** web_products 행 */
export interface WebProductVo {
  readonly id: string;
  readonly user_id: string;
  readonly url: string;
  readonly name: string | null;
  readonly description: string | null;
  readonly price: string | null;
  readonly screenshots: Array<{ viewport: string; url: string }>;
  readonly images: string[];
  readonly attributes: Record<string, any>;
  readonly collector: string | null;
  readonly status: string;
  readonly error: string | null;
  readonly created_at: string;
}

/** 컴파일된 샷 하나 — 타임코드는 초 단위 */
export interface ShotVo {
  readonly index: number;
  readonly startSec: number;
  readonly endSec: number;
  /** 화면에서 벌어지는 일(영어 — 영상 모델이 읽는다) */
  readonly action: string;
  /** 화자 대사(한국어 — 우리 차별점). 없으면 빈 문자열 */
  readonly dialogueKo: string;
}
