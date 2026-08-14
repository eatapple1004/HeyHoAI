import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { ShotVo } from './vo/ad-studio.vo';

// Anthropic SDK — 대본·샷 계획은 창작이라 LLM이 맡는다(조립·검증은 컴파일러가 코드로 한다).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Anthropic = require('@anthropic-ai/sdk');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

/**
 * 샷 계획 — 제품·훅·장소를 받아 **타임코드가 박힌 샷 리스트**를 만든다.
 *
 * 역할 분담이 핵심이다:
 *   · 여기(LLM)  = 무엇을 몇 초에 보여주고 무슨 말을 할지 — 창작
 *   · 컴파일러(코드) = 블록 조립·제약 문구·**타임코드 검증** — 결정적이어야 하는 것
 *
 * 경쟁사는 이 둘을 한 LLM에 맡겨서 `duration: 8` 요청에 11초짜리 9컷 계획을 뱉었다(실측).
 * 검증을 코드로 분리하는 이유가 그것이다.
 */

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SHOT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['shots'],
  properties: {
    shots: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['startSec', 'endSec', 'action', 'dialogueKo'],
        properties: {
          startSec: { type: 'number', description: '샷 시작 초' },
          endSec: { type: 'number', description: '샷 종료 초' },
          action: { type: 'string', description: '화면에서 벌어지는 일 — **영어로** (영상 모델이 읽는다)' },
          dialogueKo: { type: 'string', description: '화자 대사 — **한국어로**. 없으면 빈 문자열' },
        },
      },
    },
  },
};

const SYSTEM = `너는 숏폼 광고 감독이다. 제품과 훅을 받아 세로형(9:16) 광고의 샷 리스트를 짠다.

반드시 지킬 것:
- **마지막 샷의 endSec은 주어진 총 길이와 정확히 같아야 한다.** 넘기면 영상이 잘린다.
- 샷은 2~4개. 8초짜리에 9컷을 넣으면 아무것도 안 보인다.
- \`action\`은 **영어**로 쓴다(영상 모델이 영어를 더 잘 알아듣는다).
- \`dialogueKo\`는 **한국어 구어체**로 쓴다. 번역투 금지. 실제 사람이 말하듯이.
- 대사는 1초에 4~5글자가 자연스럽다. 2초 샷에 20글자를 넣으면 말이 빨라져 못 알아듣는다.
- 제품에 대해 **주어진 정보에 없는 효능·수치·성분을 지어내지 않는다**(광고 심의 위반).
- 첫 샷은 훅이다. 스크롤을 멈추게 하는 게 유일한 목적이다.`;

@Injectable()
export class ShotPlannerService {
  /**
   * @param input.durationSec 총 길이(초) — 마지막 샷이 여기에 정확히 맞아야 한다
   * @returns 타임코드 순으로 정렬된 샷. 검증·보정은 컴파일러가 한다.
   */
  async plan(input: {
    productName: string;
    productSummary?: string;
    sellingPoints?: string[];
    hookPrompt?: string;
    settingPrompt?: string;
    durationSec: number;
    hasAvatar: boolean;
  }): Promise<ShotVo[]> {
    const user = [
      `총 길이: ${input.durationSec}초 (마지막 샷 endSec = ${input.durationSec})`,
      `제품: ${input.productName}`,
      input.productSummary ? `설명: ${input.productSummary}` : '',
      input.sellingPoints?.length ? `셀링포인트: ${input.sellingPoints.join(' / ')}` : '',
      input.hookPrompt ? `훅(첫 샷에 반영): ${input.hookPrompt}` : '',
      input.settingPrompt ? `배경/장소: ${input.settingPrompt}` : '',
      input.hasAvatar
        ? '화자(사람)가 등장한다. 대사를 넣어라.'
        : '사람이 등장하지 않는다. 제품 중심으로 구성하고 dialogueKo는 내레이션으로 쓴다.',
    ].filter(Boolean).join('\n');

    const res = await client.messages.create({
      model: env.CLAUDE_MODEL_SCRIPT,
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: 'user', content: user }],
      output_config: { format: { type: 'json_schema', schema: SHOT_SCHEMA } },
    });

    const text = res.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
    const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (!m) throw new Error('샷 계획: 유효한 JSON이 오지 않았습니다.');

    const raw = JSON.parse(m[1]).shots || [];
    return raw
      .map((s: any, i: number) => ({
        index: i + 1,
        startSec: Number(s.startSec) || 0,
        endSec: Number(s.endSec) || 0,
        action: String(s.action || '').trim(),
        dialogueKo: String(s.dialogueKo || '').trim(),
      }))
      .sort((a: ShotVo, b: ShotVo) => a.startSec - b.startSec)
      .map((s: ShotVo, i: number) => ({ ...s, index: i + 1 }));
  }
}
