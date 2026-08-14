import { ShotVo } from '../vo/ad-studio.vo';

// ── 요청 (class — 나중에 class-validator를 붙이려면 런타임 메타데이터가 필요하다) ──

export class CompileAdDto {
  /** 수집된 제품. web_product_id 또는 인라인 product 중 하나 */
  webProductId?: string;
  product?: { name?: string; price?: string; attributes?: Record<string, any>; images?: string[] };
  /** 사용자가 적은 희망사항(자유 서술). 비면 훅·장소를 자동으로 고른다. */
  direction?: string;
  /** 직접 고를 때만. 비면 direction·제품을 보고 자동 선택 */
  hookId?: string;
  settingId?: string;
  /** 로스터 모델 id. 지정하면 REFERENCE BLOCK이 붙는다 */
  avatarIds?: string[];
  mode?: string;
  durationSec?: number;
  aspectRatio?: string;
  resolution?: string;
  generateAudio?: boolean;
  tier?: 'standard' | 'fast';
}

// ── 응답 ──

export interface CompileResultDto {
  /** 영상 모델에 그대로 들어갈 최종 프롬프트 */
  enhancedPrompt: string;
  shots: ShotVo[];
  /** 블록별 원문 — UI에서 어느 부분이 왜 들어갔는지 보여주기 위함 */
  blocks: {
    reference: string;
    angleLock: string;
    location: string;
    shots: string;
    technical: string;
  };
  /** 컴파일러가 스스로 잡아낸 문제(경쟁사는 이걸 안 해서 duration을 넘긴다) */
  warnings: string[];
  /** 자동으로 고른 훅·장소(사용자가 지정하지 않았을 때). 화면에 "이렇게 골랐습니다"로 보여준다. */
  chosen: { hook: string | null; setting: string | null; auto: boolean };
  durationSec: number;
  /** 생성 시 차감될 크레딧(참고용 — 실제 차감은 생성 시점) */
  estimatedCredits: number;
}

export interface AdCostDto {
  credits: number;
  durationSec: number;
  tier: string;
  resolution: string;
}
