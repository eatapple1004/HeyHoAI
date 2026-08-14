import { Injectable } from '@nestjs/common';
import { ShotVo } from './vo/ad-studio.vo';

/**
 * 프롬프트 컴파일러 — 구조화 입력 → 영상 모델에 넣을 최종 프롬프트.
 * ============================================================================
 * 경쟁사의 "Hermes Agent"에 대응하는 계층이다. 다만 **조립과 검증은 전부 결정적 코드**로 한다.
 * LLM은 샷 계획(창작)만 맡는다(ShotPlannerService).
 *
 * 블록 구조(경쟁사 실측 구조를 참고하되 문장은 우리 것):
 *   [REFERENCE]  아바타 외모 고정 — 얼굴만 참조, 배경은 복제 금지
 *   [ANGLE LOCK] 레퍼런스에 없는 각도를 지어내지 못하게 — 제품 광고의 최대 결함 해법
 *   [LOCATION]   장소
 *   [SHOTS]      타임코드 + 동작 + 대사
 *   [TECHNICAL]  렌즈·센서·손떨림·오디오
 *
 * ⚠️ 타임코드는 **요청이 아니라 제약**으로 다룬다. 경쟁사는 duration 8에 11초 계획을 통과시켰다(실측).
 *    여기서는 초과분을 잘라내고 warnings에 남긴다.
 */

const MAX_SHOTS = 6;
/** 사용자에게 보이는 초 표기 — 0.1초 단위로 자른다(7.299999999999999가 그대로 나가면 안 된다). */
function sec1(v: number): number {
  return Math.round(v * 10) / 10;
}

function fmt(sec: number): string {
  const s = Math.max(0, Math.round(sec * 10) / 10);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(Math.floor(s % 60)).padStart(2, '0');
  const frac = Math.round((s % 1) * 10);
  return frac ? `${mm}:${ss}.${frac}` : `${mm}:${ss}`;
}

@Injectable()
export class PromptCompilerService {
  /**
   * 샷 리스트를 총 길이 안에 **강제로** 밀어넣는다.
   * 넘치면 자르고, 남으면 마지막 샷을 늘려 끝을 맞춘다. 무엇을 고쳤는지 전부 warnings로 보고한다.
   */
  private fitShots(shots: ShotVo[], durationSec: number): { shots: ShotVo[]; warnings: string[] } {
    const warnings: string[] = [];
    let out = shots.filter((s) => s.endSec > s.startSec);

    if (!out.length) {
      warnings.push('샷이 비어 있어 전체 길이를 한 샷으로 대체했다.');
      return {
        shots: [{ index: 1, startSec: 0, endSec: durationSec, action: 'product showcase', dialogueKo: '' }],
        warnings,
      };
    }

    if (out.length > MAX_SHOTS) {
      warnings.push(`샷이 ${out.length}개라 ${MAX_SHOTS}개로 줄였다(짧은 영상에 컷이 많으면 아무것도 안 보인다).`);
      out = out.slice(0, MAX_SHOTS);
    }

    // 총 길이 초과분 절단 — 경쟁사가 안 해서 계획이 duration을 넘긴다.
    const overrun = out[out.length - 1].endSec - durationSec;
    if (overrun > 0.05) {
      warnings.push(`샷 합계가 ${sec1(out[out.length - 1].endSec)}초로 요청(${durationSec}초)을 넘어 잘라냈다.`);
      out = out.filter((s) => s.startSec < durationSec)
        .map((s) => ({ ...s, endSec: Math.min(s.endSec, durationSec) }))
        .filter((s) => s.endSec - s.startSec >= 0.5);
    }

    // 끝이 모자라면 마지막 샷을 늘려 정확히 맞춘다.
    const last = out[out.length - 1];
    if (durationSec - last.endSec > 0.05) {
      warnings.push(`마지막 샷이 ${sec1(last.endSec)}초에서 끝나 ${durationSec}초까지 늘렸다.`);
      out[out.length - 1] = { ...last, endSec: durationSec };
    }

    return { shots: out.map((s, i) => ({ ...s, index: i + 1 })), warnings };
  }

  private referenceBlock(avatarNames: string[]): string {
    if (!avatarNames.length) return '';
    return [
      '[REFERENCE]',
      `Keep the exact same person as in the reference image${avatarNames.length > 1 ? 's' : ''}: same face, hair, and body proportions across every shot.`,
      'Use the reference ONLY for the person\'s appearance. Do NOT copy the reference background, lighting, or framing.',
    ].join('\n');
  }

  /**
   * ANGLE LOCK — 레퍼런스 사진에 없는 면을 모델이 지어내는 문제의 해법.
   * 제품 광고에서 가장 자주 깨지는 지점이라 별도 블록으로 못박는다.
   */
  private angleLockBlock(hasProductImage: boolean): string {
    if (!hasProductImage) return '';
    return [
      '[ANGLE LOCK]',
      'Show only the product faces that are visible in the provided product image.',
      'Do NOT rotate, flip, or re-orient the product so that an unseen face becomes visible.',
      'Do NOT invent logos, labels, or text that are not present in the provided image.',
    ].join('\n');
  }

  private technicalBlock(aspectRatio: string, _generateAudio: boolean): string {
    return [
      '[TECHNICAL]',
      `Format: vertical ${aspectRatio}, smartphone-shot look, handheld with light natural shake.`,
      'Lens: 28mm equivalent, shallow depth of field on the product.',
      'Grade: natural color, no heavy filter, realistic skin tone.',
      'No on-screen text, captions, subtitles, or written words of any kind.',
      'No speech, no dialogue, no voice.',
    ].join('\n');
  }

  /**
   * 최종 조립. 반환값의 enhancedPrompt가 영상 모델에 그대로 들어간다.
   */
  compile(input: {
    productName: string;
    productSummary?: string;
    shots: ShotVo[];
    durationSec: number;
    settingPrompt?: string;
    avatarNames?: string[];
    hasProductImage?: boolean;
    aspectRatio?: string;
    generateAudio?: boolean;
  }) {
    const aspectRatio = input.aspectRatio || '9:16';
    const { shots, warnings } = this.fitShots(input.shots, input.durationSec);

    const reference = this.referenceBlock(input.avatarNames || []);
    const angleLock = this.angleLockBlock(input.hasProductImage !== false);
    const location = input.settingPrompt ? `[LOCATION]\n${input.settingPrompt}` : '';

    // 무성 영상 — 대사·자막을 넣지 않는다. 보이는 것만으로 전달한다.
    const shotLines = shots.map((s) => `SHOT ${s.index} [${fmt(s.startSec)}–${fmt(s.endSec)}] ${s.action}`);
    const shotsBlock = [
      '[SHOTS]',
      `Total length: exactly ${input.durationSec} seconds.`,
      `Subject: ${input.productName}${input.productSummary ? ` — ${input.productSummary}` : ''}`,
      ...shotLines,
    ].join('\n');

    const technical = this.technicalBlock(aspectRatio, input.generateAudio !== false);

    const enhancedPrompt = [reference, angleLock, location, shotsBlock, technical]
      .filter(Boolean)
      .join('\n\n');

    return {
      enhancedPrompt,
      shots,
      blocks: { reference, angleLock, location, shots: shotsBlock, technical },
      warnings,
      durationSec: input.durationSec,
    };
  }
}
