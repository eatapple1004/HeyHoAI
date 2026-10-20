import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

/**
 * 진단 리포트의 해석 — 모은 자료(facts)와 계산된 점수(scores)만 보고 쓴다. 점수를 바꾸거나 새 숫자를 만들지 않는다.
 *   목표치(metrics.target)만 제안 숫자를 허용하고, 그 밖의 글 속 숫자는 서비스가 facts 와 대조한다.
 */

const RULES = `당신은 동네 가게·중소기업의 마케팅을 진단하는 컨설턴트입니다. 보고서는 사장님이 읽습니다.
규칙:
1. 숫자·사실은 [자료]에 있는 것만 그대로. 매출·방문자 수·전환율처럼 자료에 없는 수치는 추정하지 않는다.
2. 점수는 이미 계산돼 있다 — 다시 매기거나 바꾸지 않는다. 점수가 null 이면 "자료 없음"으로 다룬다.
3. "주변 유입 요인"은 시설 수 기준이지 실제 방문자 수가 아님을 혼동하지 않는다.
4. 리뷰는 표본(최근 몇 개)이다. 전체 경향처럼 단정하지 않는다.
5. 할 일은 이 가게가 실제로 할 수 있는 구체적인 일로. 도피아가 해 줄 수 있는 일(홈페이지·인스타 게시물·리뷰 답글 초안·진단 재측정)은 담당을 "도피아"로.
6. 사장님이 읽는 글이다 — 자료의 영어 이름(posted30, ownPhotos, naverAvailable, presence 등)이나 draft·published·ready 같은 상태 값을 쓰지 말고 우리말로(예: "최근 30일 인스타 게시", "직접 가진 사진", "공개 전", "승인 대기"). 전화번호는 자료에 적힌 표기 그대로.
7. 설명 없이 JSON만.`;

export interface ReportStory {
  summary: string;
  findings: { title: string; body: string }[];
  actions: { title: string; owner: string; when: string; why: string }[];
  reviewThemes: { good: string[]; bad: string[] };
  plan: { phase: string; period: string; tasks: { task: string; owner: string; metric: string }[] }[];
  metrics: { name: string; now: string; target: string; note: string }[];
  missing: { item: string; why: string; how: string }[];
  questions: string[];
}

@Injectable()
export class BizReportWriterService {
  private client: Anthropic | null = null;

  private anthropic(): Anthropic {
    if (!this.client) {
      if (!env.ANTHROPIC_API_KEY) throw new InternalServerErrorException('ANTHROPIC_API_KEY not configured');
      this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  async write(input: { facts: any; scores: any[] }): Promise<ReportStory> {
    const user = `[자료 — 공식 API·조사 시트·도피아 운영 기록]
${JSON.stringify(input.facts, null, 1).slice(0, 60000)}

[계산된 점수 — 0~100, 근거 포함]
${JSON.stringify(input.scores, null, 1)}

이 가게의 마케팅 진단 보고서 해석을 쓰세요.
- summary: 결론 2~3문장(무엇을 지키고 무엇을 먼저 고칠지).
- findings: 핵심 발견 3개(title 짧게, body 2문장, 자료의 숫자를 근거로).
- actions: 지금 할 일 3개(owner: "사장님" 또는 "도피아", when: "이번 주"·"2주 안" 처럼).
- reviewThemes: 리뷰 표본에서 좋게 말한 점(good)과 아쉬운 점(bad) 각 1~4개(짧은 구절). 리뷰가 없으면 빈 배열.
- plan: 90일 계획 3단계 — [{"phase":"고치기","period":"1~30일"}, {"phase":"열기","period":"31~60일"}, {"phase":"키우기","period":"61~90일"}] 마다 tasks 2~4개(task, owner, metric=무엇으로 확인).
- metrics: 90일 뒤 볼 지표 3~6개 — now 는 자료에 있는 값만(없으면 "측정 전"), target 은 제안값(근거는 note).
- missing: 진단에 더 필요한 자료(공개 API로 못 구하는 것: 매출·시간대별 방문·네이버 플레이스 리뷰 수·배달앱 등)와 왜 필요한지, 어떻게 받는지(how).
- questions: 사장님께 여쭐 것 3~5개.
JSON: {"summary":"","findings":[{"title":"","body":""}],"actions":[{"title":"","owner":"","when":"","why":""}],"reviewThemes":{"good":[""],"bad":[""]},"plan":[{"phase":"","period":"","tasks":[{"task":"","owner":"","metric":""}]}],"metrics":[{"name":"","now":"","target":"","note":""}],"missing":[{"item":"","why":"","how":""}],"questions":[""]}`;
    // 가끔 JSON 이 깨져 온다(실측 1/3) — 한 번 더 받는다
    let j: any = null; let stop = '';
    for (let attempt = 0; attempt < 2 && !j; attempt++) {
      const res: any = await this.anthropic().messages.create({ model: env.CLAUDE_MODEL, max_tokens: 8000, system: RULES, messages: [{ role: 'user', content: user }] } as any);
      const text = (res.content || []).map((b: any) => (b.type === 'text' ? b.text : '')).join('');
      stop = res.stop_reason;
      const a = text.indexOf('{'); const b = text.lastIndexOf('}');
      if (a >= 0 && b > a) { try { j = JSON.parse(text.slice(a, b + 1)); } catch (e: any) { console.warn('[biz-report] JSON parse failed', attempt, e?.message, text.slice(-160)); } }
    }
    if (!j) throw new InternalServerErrorException(stop === 'max_tokens' ? 'AI 응답이 길이 한도에 걸려 잘렸습니다.' : 'AI 응답을 읽지 못했습니다.');
    // 규칙을 줘도 가끔 자료의 영어 이름이 글에 섞인다 — 사장님이 읽는 말로 바꿔 둔다
    const TERMS: [RegExp, string][] = [[/\bpresence\b/g, '온라인 노출'], [/\breputation\b/g, '평판'], [/\blocality\b/g, '주변 유입 요인'], [/\bcompetition\b/g, '경쟁 위치'],
      [/\bposted30\b/g, '최근 30일 게시'], [/\bownPhotos\b/g, '직접 가진 사진'], [/\bnaverAvailable\b[=:]?\s*(false|true)?/g, '네이버 검색 연결'], [/\b(draft)\b/g, '공개 전'], [/\b(published)\b/g, '공개'], [/\bready\b/g, '승인 대기']];
    const plain = (t: string) => TERMS.reduce((x, [re, to]) => x.replace(re, to), t);
    const s = (v: unknown, n: number) => (typeof v === 'string' ? plain(v.trim()).slice(0, n) : '');
    const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
    return {
      summary: s(j.summary, 600),
      findings: arr(j.findings).slice(0, 4).map((x) => ({ title: s(x?.title, 60), body: s(x?.body, 400) })).filter((x) => x.title),
      actions: arr(j.actions).slice(0, 4).map((x) => ({ title: s(x?.title, 80), owner: s(x?.owner, 10) || '사장님', when: s(x?.when, 20), why: s(x?.why, 240) })).filter((x) => x.title),
      reviewThemes: { good: arr(j.reviewThemes?.good).map((x) => s(x, 40)).filter(Boolean).slice(0, 4), bad: arr(j.reviewThemes?.bad).map((x) => s(x, 40)).filter(Boolean).slice(0, 4) },
      plan: arr(j.plan).slice(0, 3).map((p) => ({ phase: s(p?.phase, 20), period: s(p?.period, 20), tasks: arr(p?.tasks).slice(0, 5).map((t) => ({ task: s(t?.task, 120), owner: s(t?.owner, 10), metric: s(t?.metric, 80) })).filter((t) => t.task) })),
      metrics: arr(j.metrics).slice(0, 6).map((m) => ({ name: s(m?.name, 40), now: s(m?.now, 40) || '측정 전', target: s(m?.target, 40), note: s(m?.note, 160) })).filter((m) => m.name),
      missing: arr(j.missing).slice(0, 8).map((m) => ({ item: s(m?.item, 60), why: s(m?.why, 200), how: s(m?.how, 200) })).filter((m) => m.item),
      questions: arr(j.questions).map((q) => s(q, 200)).filter(Boolean).slice(0, 6),
    };
  }
}
