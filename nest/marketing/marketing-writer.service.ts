import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

/**
 * AI 마케팅 팀 — 에이전트들의 글쓰기. 결과는 전부 "초안"이고 관리자가 승인해야 실행된다.
 *   동향 담당: 웹 검색으로 동네·업종·경쟁 동향을 보고 "다음 할 일"을 제안(NoimosAI Advisor 에 해당)
 *   리뷰 담당: Google 리뷰에 사장님 답글 초안
 *   지시: 관리자가 한 줄로 시킨 일을 할 일 목록으로 나눈다
 *   진단 이어받기: 마케팅 진단(biz-report)의 약점·할 일을 팀의 할 일로 바꾼다
 * 인스타 게시물 캡션은 기존 사업체 캡션 서비스(BusinessCaptionService)를 그대로 쓴다.
 */

const RULES = `당신은 동네 가게·중소기업의 마케팅을 대신 맡은 AI 마케팅 팀입니다. 결과는 사장님(관리자)이 승인한 뒤에만 실행됩니다.
규칙:
1. 사실은 자료·검색 결과에 있는 것만. 없는 메뉴·가격·이벤트·수치를 지어내지 않는다.
2. "최고", "1위", "유일" 같은 과장, 의학적 효능 주장, 경쟁사 비방은 쓰지 않는다.
3. 브랜드 노트(사장님이 전에 거절하며 남긴 말)를 반드시 지킨다.
4. 설명 없이 JSON만 마지막에 반환한다.`;

export interface Action { title: string; why: string; kind: 'post' | 'site' | 'review' | 'other'; brief: string }
export interface TrendReport { summary: string; findings: { text: string; source?: { title: string; url: string } }[]; actions: Action[]; searches: string[] }

const KINDS = ['post', 'site', 'review', 'other'];

@Injectable()
export class MarketingWriterService {
  private client: Anthropic | null = null;

  private anthropic(): Anthropic {
    if (!this.client) {
      if (!env.ANTHROPIC_API_KEY) throw new InternalServerErrorException('ANTHROPIC_API_KEY not configured');
      this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  /** 진단 이어받기 — 진단 글(점수·발견·할 일·계획·빈칸)을 이 팀이 할 수 있는 일로 나눈다(웹 검색 없이, 진단에 있는 사실만) */
  async fromReport(input: { name: string; industry?: string | null; notes: string; diagnosis: Record<string, unknown> }): Promise<{ summary: string; actions: Action[] }> {
    const user = `업체: ${input.name}${input.industry ? ` (${input.industry})` : ''}
[브랜드 노트] ${input.notes || '없음'}

[마케팅 진단 결과]
${JSON.stringify(input.diagnosis).slice(0, 12000)}

이 진단을 마케팅 팀의 이번 할 일 3~6개로 바꾸세요.
- 진단의 약점(점수가 낮은 영역)과 진단이 제안한 할 일을 먼저.
- kind: post(인스타 게시물 — brief에 어떤 사진으로 무엇을 보여 주고 무엇을 말할지), site(홈페이지에 고칠·더할 것), review(리뷰 대응), other(사장님이 직접 할 일·결정할 일 — title 앞에 "[사장님]").
- 사실은 진단에 있는 것만. 진단에 없는 메뉴·가격·이벤트·수치를 만들지 않는다. 할인·이벤트는 "제안"으로.
- why: 진단의 어떤 결과 때문인지 한 문장(점수·근거를 그대로 인용).
- summary: 진단에서 팀이 이어받는 핵심 2문장.
JSON: {"summary":"","actions":[{"title":"","why":"","kind":"post","brief":""}]}`;
    let j: any;
    try { j = parseJson((await this.run(user, 3000, false)).text); } catch { j = parseJson((await this.run(user, 3000, false)).text); }
    return { summary: clip(j.summary, 400), actions: actions(j.actions) };
  }

  /** 동향 보고 — 웹 검색(서버 도구)을 켠다. 검색이 막힌 키면 자료만으로 */
  async trends(input: { name: string; industry?: string | null; memo?: string | null; place: Record<string, unknown>; notes: string; stats: Record<string, unknown>; focus?: string; diagnosis?: string; naver?: string }): Promise<TrendReport> {
    const user = `업체: ${input.name}${input.industry ? ` (${input.industry})` : ''}
${input.memo ? `관리자 메모: ${input.memo}` : ''}
[지도 정보] ${JSON.stringify(input.place)}
[최근 30일 인스타 게시 현황] ${JSON.stringify(input.stats)}
${input.naver ? `[네이버 검색 결과 — 필수 참고(NAVER 검색 API). 블로그·카페 후기, 뉴스에서 이번 주 소재를 찾는다. 출처 url 은 이 주소 그대로]\n${input.naver}\n` : ''}${input.diagnosis ? `[최근 마케팅 진단 — 약점을 메우는 쪽으로 할 일을 고른다]\n${input.diagnosis}\n` : ''}[브랜드 노트 — 지킬 것]
${input.notes || '없음'}
${input.focus ? `\n[이번에 특히 볼 것 — 관리자 지시]\n${input.focus}\n` : ''}
할 일:
1. 위 네이버 검색 결과를 먼저 보고, 웹 검색 3~6번으로 이 업체 주변·업종의 최근 동향을 본다 — 같은 동네 같은 업종 가게들의 소식, 계절·시즌 이슈, 지역 행사, 업종 트렌드, 이 업체에 대한 최근 글.
2. findings: 이 업체에 의미 있는 발견 3~6개(한 줄씩, 검색 결과 출처 url).
3. actions: 이번 주 할 일 3~5개. kind: post(인스타 게시물 — brief에 무엇을 보여 주고 무엇을 말할지), site(홈페이지 고칠 것), review(리뷰 대응), other.
   업체 자료로 할 수 있는 일만. 할인·이벤트처럼 사장님 결정이 필요한 건 "제안"으로 쓴다.
4. summary: 사장님께 드리는 3문장 보고.
JSON: {"summary":"","findings":[{"text":"","source":{"title":"","url":""}}],"actions":[{"title":"","why":"","kind":"post","brief":""}]}`;
    let res: { text: string; urls: Set<string>; searches: string[] };
    try {
      res = await this.run(user, 8000, true);
    } catch (e: any) {
      if (!/web_search|tool/i.test(String(e?.message || ''))) throw e;
      res = await this.run(user + '\n\n(웹 검색을 쓸 수 없습니다. 위 자료만으로 하세요.)', 6000, false);
    }
    // 네이버 검색 결과 주소도 실제로 본 출처로 친다
    for (const m of (input.naver || '').matchAll(/\((https?:\/\/[^\s)]+)\)/g)) res.urls.add(normUrl(m[1]));
    const j = parseJson(res.text);
    return {
      summary: clip(j.summary, 600),
      // 출처 주소는 실제 검색 결과에 있던 것만 남긴다(지어낸 주소 방지)
      findings: arr(j.findings).slice(0, 8).map((f: any) => {
        const url = clip(f?.source?.url, 400);
        return { text: clip(f?.text, 300), ...(url && res.urls.has(normUrl(url)) ? { source: { title: clip(f?.source?.title, 120) || url, url } } : {}) };
      }).filter((f) => f.text),
      actions: actions(j.actions),
      searches: res.searches.slice(0, 10),
    };
  }

  /** 지시 — 관리자가 한 줄로 시킨 일을 할 일로 나눈다(웹 검색 없이) */
  async direct(input: { name: string; industry?: string | null; memo?: string | null; notes: string; instruction: string }): Promise<{ reply: string; actions: Action[] }> {
    const user = `업체: ${input.name}${input.industry ? ` (${input.industry})` : ''}
${input.memo ? `관리자 메모: ${input.memo}` : ''}
[브랜드 노트] ${input.notes || '없음'}

[사장님 지시]
${input.instruction}

이 지시를 마케팅 팀의 할 일 1~5개로 나누세요. kind: post(인스타 게시물, brief에 보여 줄 것·말할 것), site, review, other.
reply: 무엇을 하겠다는 짧은 답(2문장).
JSON: {"reply":"","actions":[{"title":"","why":"","kind":"post","brief":""}]}`;
    const j = parseJson((await this.run(user, 3000, false)).text);
    return { reply: clip(j.reply, 400), actions: actions(j.actions) };
  }

  /** 리뷰 답글 — 리뷰 내용에 맞춰 짧게. 낮은 별점은 사과·개선 약속(구체 보상 약속은 하지 않는다) */
  async reviewReplies(input: { name: string; industry?: string | null; notes: string; reviews: { author: string; rating?: number; text: string }[] }): Promise<string[]> {
    const user = `업체: ${input.name}${input.industry ? ` (${input.industry})` : ''}
[브랜드 노트] ${input.notes || '없음'}

아래 Google 리뷰마다 사장님 답글 초안을 쓰세요.
- 2~3문장, 리뷰에 나온 구체적인 내용을 짚는다. 복붙 같은 인사말 금지.
- 별점이 낮으면 변명 없이 사과하고 고치겠다고. 환불·쿠폰 같은 구체 보상은 약속하지 않는다.
- 리뷰어 개인정보(이름 외)를 언급하지 않는다.
${input.reviews.map((r, i) => `${i}. ${r.author} (${r.rating ?? '?'}점): ${r.text.slice(0, 500)}`).join('\n')}
JSON: {"replies":[{"i":0,"reply":""}]}`;
    const j = parseJson((await this.run(user, 3000, false)).text);
    const out: string[] = input.reviews.map(() => '');
    for (const x of arr(j.replies)) { const i = Number(x?.i); if (Number.isInteger(i) && i >= 0 && i < out.length) out[i] = clip(x?.reply, 600); }
    return out;
  }

  private async run(user: string, maxTokens: number, webSearch: boolean): Promise<{ text: string; urls: Set<string>; searches: string[] }> {
    const messages: any[] = [{ role: 'user', content: user }];
    const urls = new Set<string>();
    const searches: string[] = [];
    let last = '';
    for (let turn = 0; turn < 4; turn++) {
      const res: any = await this.anthropic().messages.create({
        model: env.CLAUDE_MODEL, max_tokens: maxTokens, system: RULES, messages,
        ...(webSearch ? { tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6, user_location: { type: 'approximate', country: 'KR' } }] } : {}),
      } as any);
      let tail = '';
      for (const b of res.content || []) {
        if (b.type === 'server_tool_use' && b.input?.query) searches.push(String(b.input.query));
        if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) { for (const r of b.content) if (r?.url) urls.add(normUrl(r.url)); tail = ''; }
        if (b.type === 'text') tail += b.text;
      }
      last = tail || last;
      if (res.stop_reason !== 'pause_turn') break;
      messages.push({ role: 'assistant', content: res.content });
    }
    return { text: last, urls, searches };
  }
}

function actions(v: unknown): Action[] {
  return arr(v).slice(0, 6).map((a: any) => ({
    title: clip(a?.title, 80), why: clip(a?.why, 240), kind: (KINDS.includes(a?.kind) ? a.kind : 'other') as Action['kind'], brief: clip(a?.brief, 400),
  })).filter((a) => a.title);
}

function parseJson(text: string): any {
  const a = text.indexOf('{'); const b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch { /* 아래 */ } }
  throw new InternalServerErrorException('AI 응답을 읽지 못했습니다.');
}
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
function normUrl(u: string): string {
  try { const x = new URL(u); return (x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/+$/, '') + (x.search || '')).toLowerCase(); } catch { return u.toLowerCase(); }
}
