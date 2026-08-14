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
  required: ['shots', 'chosenHookSlug', 'chosenSettingSlug'],
  properties: {
    chosenHookSlug: { type: 'string', description: '고른 훅의 slug. 사용자가 이미 지정했으면 빈 문자열' },
    chosenSettingSlug: { type: 'string', description: '고른 장소의 slug. 사용자가 이미 지정했으면 빈 문자열' },
    shots: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['startSec', 'endSec', 'action'],
        properties: {
          startSec: { type: 'number', description: '샷 시작 초' },
          endSec: { type: 'number', description: '샷 종료 초' },
          action: { type: 'string', description: '화면에서 벌어지는 일 — **영어로** (영상 모델이 읽는다)' },
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
- ⚠️ **말·대사·자막·문자를 쓰지 않는다.** 소리 없는 영상이므로 **보이는 것만으로** 전달해야 한다.
  손동작·표정·제품 변화·카메라 움직임으로 설명하라. 화면에 글자를 넣으라고 지시하지 마라.
- 제품에 대해 **주어진 정보에 없는 효능·수치·성분을 지어내지 않는다**(광고 심의 위반).
- 첫 샷은 훅이다. 스크롤을 멈추게 하는 게 유일한 목적이다.

훅·장소를 **네가 고르는 경우**(목록이 주어졌을 때):
- 제품 성격과 사용자의 희망사항에 가장 맞는 것을 하나씩 고르고 slug를 돌려준다.
- 고른 것을 실제 샷 구성에 반영한다. 고르기만 하고 무시하면 안 된다.`;

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
    /** 사용자가 적은 희망사항 — 있으면 최우선으로 반영한다 */
    direction?: string;
    /** 훅·장소를 사용자가 안 골랐을 때 여기서 고르라고 넘기는 목록 */
    hookLibrary?: Array<{ slug: string; name: string; prompt: string }>;
    settingLibrary?: Array<{ slug: string; name: string; prompt: string }>;
    durationSec: number;
    hasAvatar: boolean;
  }): Promise<{ shots: ShotVo[]; chosenHookSlug: string; chosenSettingSlug: string }> {
    const user = [
      `총 길이: ${input.durationSec}초 (마지막 샷 endSec = ${input.durationSec})`,
      `제품: ${input.productName}`,
      input.productSummary ? `설명: ${input.productSummary}` : '',
      input.sellingPoints?.length ? `셀링포인트: ${input.sellingPoints.join(' / ')}` : '',
      // 사용자가 적은 희망사항이 최우선 — 라이브러리 선택도 여기에 맞춘다.
      input.direction ? `\n★ 사용자 요청(최우선 반영): ${input.direction}\n` : '',
      input.hookPrompt ? `훅(첫 샷에 반영): ${input.hookPrompt}` : '',
      input.settingPrompt ? `배경/장소: ${input.settingPrompt}` : '',
      input.hookLibrary?.length
        ? `고를 수 있는 훅(slug: 이름 — 지시):\n${input.hookLibrary.map((h) => `  ${h.slug}: ${h.name} — ${h.prompt}`).join('\n')}`
        : '',
      input.settingLibrary?.length
        ? `고를 수 있는 장소(slug: 이름 — 지시):\n${input.settingLibrary.map((x) => `  ${x.slug}: ${x.name} — ${x.prompt}`).join('\n')}`
        : '',
      input.hasAvatar
        ? '사람의 손·동작이 등장한다. 말이 아니라 동작으로 보여줘라.'
        : '사람이 등장하지 않는다. 제품 자체의 변화와 디테일로 구성하라.',
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

    const parsed = JSON.parse(m[1]);
    const raw = parsed.shots || [];
    const shots = raw
      .map((s: any, i: number) => ({
        index: i + 1,
        startSec: Number(s.startSec) || 0,
        endSec: Number(s.endSec) || 0,
        action: String(s.action || '').trim(),
        dialogueKo: '',   // 대사는 쓰지 않는다(무성 영상). VO 부활 시 여기부터 되살린다.
      }))
      .sort((a: ShotVo, b: ShotVo) => a.startSec - b.startSec)
      .map((s: ShotVo, i: number) => ({ ...s, index: i + 1 }));

    return {
      shots,
      chosenHookSlug: String(parsed.chosenHookSlug || ''),
      chosenSettingSlug: String(parsed.chosenSettingSlug || ''),
    };
  }
}
