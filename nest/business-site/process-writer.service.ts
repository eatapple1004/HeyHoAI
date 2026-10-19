import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

/**
 * 제작 과정의 앞 두 단계 — 사람(관리자)이 확인하고 넘기는 문서를 AI가 초안으로 쓴다.
 *   1) 조사 시트: 수집 자료 + 웹 검색으로 회사 사실을 모으고 사실마다 출처를 단다. 모자란 자료는 "요청할 자료"로.
 *   2) 기획안: 조사 시트에서 "사이트에 쓰기"로 둔 사실만 보고 컨셉·페이지 구성·제품 분류·강조색·필요한 사진을 정한다.
 * 관리자가 기획안을 승인해야 제작(CorpWriter)이 돈다 — 매번 다른 사이트가 나오지 않게 방향을 먼저 고정한다.
 */

export type FactLevel = 'confirmed' | 'reference' | 'unverified';

export interface ResearchFact {
  id: string;
  topic: string;
  text: string;
  source: { kind: 'company' | 'site' | 'place' | 'web'; title: string; url?: string };
  level: FactLevel;
  /** 사이트에 쓸지 — 확인된 사실만 기본 켬. 관리자가 바꾼다 */
  use: boolean;
}

export interface ResearchSheet {
  summary: string;
  identity: { legalName?: string; ceo?: string; founded?: string; industry?: string; address?: string; phone?: string; website?: string };
  /** 이름이 같은 다른 업체 — 섞이면 안 된다 */
  homonyms: string[];
  facts: ResearchFact[];
  products: { name: string; note?: string }[];
  gaps: { item: string; why: string }[];
  benchmarks: { name: string; url: string; why: string }[];
  searches: string[];
}

export interface SitePlan {
  concept: string;
  conceptWhy: string;
  audience: string[];
  tone: string;
  accent: string;
  accentWhy: string;
  headlineDraft: string;
  pages: { key: string; include: boolean; reason: string }[];
  categories: { id: string; name: string }[];
  products: string[];
  photoNeeds: string[];
  risks: string[];
}

export const PLAN_PAGES: Record<string, string> = {
  ceo: '대표 인사말', history: '연혁', certifications: '인증·특허', products: '제품 소개(목록·상세)', location: '오시는 길', contact: '문의 폼',
};

const RULES = `당신은 중소기업 홈페이지 제작 에이전시의 기획자입니다. 결과는 관리자가 검토한 뒤 고객사에 확인받습니다.
규칙:
1. 사실은 출처가 있는 것만. 출처 없는 추정·일반 상식으로 채우지 않는다.
2. 이름이 같은 다른 회사 정보를 섞지 않는다 — 주소·업종이 다르면 다른 회사다.
3. AI가 생성했다고 밝힌 기업정보 사이트, 구인 플랫폼 소개글, 블로그는 "reference"(참고)로만 둔다.
4. 설명 없이 JSON만 마지막에 반환한다.`;

@Injectable()
export class ProcessWriterService {
  private client: Anthropic | null = null;

  private anthropic(): Anthropic {
    if (!this.client) {
      if (!env.ANTHROPIC_API_KEY) throw new InternalServerErrorException('ANTHROPIC_API_KEY not configured');
      this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  /**
   * 조사 — 웹 검색(Anthropic 서버 도구)을 켜고 부른다. 검색 도구가 막혀 있으면(조직 설정) 수집 자료만으로 다시 한다.
   *   웹 출처 URL은 실제 검색 결과에 나온 주소인지 대조한다 — 없는 주소면 'unverified'.
   */
  async research(input: { name: string; industry?: string | null; memo?: string | null; place: Record<string, unknown>; homonyms: string[]; material: string; reviews: string[] }): Promise<ResearchSheet> {
    const user = `조사 대상: ${input.name}
${input.industry ? `업종(관리자 입력): ${input.industry}` : ''}
${input.memo ? `관리자 메모: ${input.memo}` : ''}

[지도 서비스에서 고른 장소 — 이 주소의 회사가 대상이다]
${JSON.stringify(input.place, null, 1)}

[이름이 같은 다른 장소(카카오 검색) — 대상이 아니다]
${input.homonyms.length ? input.homonyms.map((h) => `- ${h}`).join('\n') : '없음'}

[회사가 준 자료·기존 홈페이지 글]
${input.material.slice(0, 30000) || '없음'}

[방문자 리뷰]
${input.reviews.slice(0, 5).join('\n') || '없음'}

할 일:
1. 웹 검색으로 이 회사(위 주소의 회사)의 공개 정보를 찾는다 — 공식 홈페이지, 기업정보(대표·설립·업종), 제조사 협력사 목록, 납품·인증·특허, 뉴스, 제품 카탈로그.
   검색어는 회사명+지역, 회사명+제품, 회사명+대표자 처럼 바꿔 가며 4~8번.
2. 사실을 한 줄씩 정리하고 출처를 단다. source.kind: company(회사 자료), site(기존 홈페이지), place(지도 서비스), web(검색 결과 — url 필수).
   level: confirmed(공식 출처·회사 자료·두 곳 이상 일치) / reference(한 곳뿐이거나 2차 출처).
   topic: 회사 / 연혁 / 제품 / 고객·납품 / 인증 / 설비·규모 / 연락처 중 하나.
3. products: 이 회사가 만드는 것으로 확인된 제품·서비스.
4. gaps: 홈페이지를 제대로 만들려면 회사에 받아야 할 자료(제품 사진, 사양, 연혁, 인증서, 대표 인사말, 로고, 납품 실적 등)와 이유.
5. benchmarks: 같은 업종에서 홈페이지 구성이 잘 된 회사 2~4곳(url은 검색 결과에서 확인한 것만) — 구성 참고용.
6. homonyms: 대상과 헷갈리기 쉬운 같은 이름 회사(지역·업종 포함 한 줄씩).

JSON:
{"summary":"조사 요약 3~4문장","identity":{"legalName":"","ceo":"","founded":"","industry":"","address":"","phone":"","website":""},"homonyms":[""],"facts":[{"topic":"","text":"","source":{"kind":"web","title":"","url":""},"level":"confirmed"}],"products":[{"name":"","note":""}],"gaps":[{"item":"","why":""}],"benchmarks":[{"name":"","url":"","why":""}]}`;

    let res: { text: string; urls: Set<string>; searches: string[] };
    try {
      res = await this.run(user, 16000, true);
    } catch (e: any) {
      // 웹 검색 도구를 못 쓰는 키·조직이면 수집 자료만으로
      if (!/web_search|tool/i.test(String(e?.message || ''))) throw e;
      console.warn('[process-writer] web search unavailable, research without it:', e?.message);
      res = await this.run(user + '\n\n(웹 검색을 쓸 수 없습니다. 위 자료만으로 정리하세요.)', 12000, false);
    }
    const j = parseJson(res.text);
    const s = clip;
    const facts: ResearchFact[] = arr(j.facts).slice(0, 80).map((f: any, i: number) => {
      const kind = ['company', 'site', 'place', 'web'].includes(f?.source?.kind) ? f.source.kind : 'web';
      const url = /^https?:\/\//.test(f?.source?.url || '') ? s(f.source.url, 400) : '';
      let level: FactLevel = f?.level === 'confirmed' ? 'confirmed' : 'reference';
      // 웹 출처인데 검색 결과에 없던 주소(또는 주소 없음) — 사람이 확인하기 전엔 쓰지 않는다
      if (kind === 'web' && (!url || !res.urls.has(normUrl(url)))) level = 'unverified';
      return {
        id: `f${i + 1}`, topic: s(f?.topic, 20) || '회사', text: s(f?.text, 300),
        source: { kind, title: s(f?.source?.title, 120) || kindLabel(kind), ...(url ? { url } : {}) },
        level, use: level === 'confirmed',
      };
    }).filter((f) => f.text);
    return {
      summary: s(j.summary, 800),
      identity: Object.fromEntries(['legalName', 'ceo', 'founded', 'industry', 'address', 'phone', 'website']
        .map((k) => [k, s(j.identity?.[k], 200)]).filter(([, v]) => v)),
      homonyms: arr(j.homonyms).map((x: unknown) => s(x, 160)).filter(Boolean).slice(0, 10),
      facts,
      products: arr(j.products).slice(0, 40).map((p: any) => ({ name: s(p?.name, 60), note: s(p?.note, 200) })).filter((p) => p.name),
      gaps: arr(j.gaps).slice(0, 20).map((g: any) => ({ item: s(g?.item, 80), why: s(g?.why, 200) })).filter((g) => g.item),
      benchmarks: arr(j.benchmarks).slice(0, 6).map((b: any) => ({ name: s(b?.name, 60), url: s(b?.url, 300), why: s(b?.why, 200) }))
        .filter((b) => b.name && /^https?:\/\//.test(b.url) && res.urls.has(normUrl(b.url))),
      searches: res.searches.slice(0, 12),
    };
  }

  /** 기획안 — 사이트에 쓰기로 한 사실만 본다 */
  async plan(input: { name: string; industry?: string | null; facts: ResearchFact[]; products: { name: string; note?: string }[]; gaps: { item: string }[]; photoCount: number; photoNotes: string[]; benchmarks: { name: string; why: string }[] }): Promise<SitePlan> {
    const user = `회사: ${input.name}${input.industry ? ` (${input.industry})` : ''}

[확인된 사실 — 이것만 근거로]
${input.facts.map((f) => `- [${f.topic}] ${f.text}`).join('\n') || '없음'}

[제품 후보]
${input.products.map((p) => `- ${p.name}${p.note ? `: ${p.note}` : ''}`).join('\n') || '없음'}

[아직 없는 자료]
${input.gaps.map((g) => `- ${g.item}`).join('\n') || '없음'}

[가진 사진] ${input.photoCount}장${input.photoNotes.length ? `\n${input.photoNotes.map((n) => `- ${n}`).join('\n')}` : ''}

[구성 참고 사이트]
${input.benchmarks.map((b) => `- ${b.name}: ${b.why}`).join('\n') || '없음'}

이 회사의 여러 페이지 홈페이지 기획안을 쓰세요.
- concept: 사이트 전체를 꿰는 한 줄(예: "숫자로 증명하는 트레일러"). 이 회사 사실에서 나와야 한다. conceptWhy: 근거 사실.
- audience: 사이트를 볼 사람 2~3부류(구체적으로).
- tone: 문체 한 줄.
- accent: 강조색 #RRGGBB 하나와 accentWhy(로고·제품·업종에서 온 이유, 근거가 없으면 업종에 맞는 차분한 색이라고 쓴다).
- headlineDraft: 첫 화면 헤드라인 초안(25자 안팎, 확인된 사실로).
- pages: ${Object.entries(PLAN_PAGES).map(([k, v]) => `${k}(${v})`).join(', ')} 각각 include(true/false)와 reason. 자료가 없는 페이지는 false — 빈 페이지를 만들지 않는다.
- categories: 제품 분류 0~4개(id는 영어 소문자·하이픈). 제품이 적으면 [].
- products: 사이트에 올릴 제품 이름(확인된 것만).
- photoNeeds: 이 기획을 화면으로 만들려면 회사에서 받아야 할 사진 목록(구체적으로, 예: "냉동탑차 완성차 측면 사진").
- risks: 공개 전에 고객에게 꼭 확인할 것.
JSON: {"concept":"","conceptWhy":"","audience":[""],"tone":"","accent":"#","accentWhy":"","headlineDraft":"","pages":[{"key":"","include":true,"reason":""}],"categories":[{"id":"","name":""}],"products":[""],"photoNeeds":[""],"risks":[""]}`;
    const j = parseJson((await this.run(user, 6000, false)).text);
    const s = clip;
    const pages = Object.keys(PLAN_PAGES).map((key) => {
      const p = arr(j.pages).find((x: any) => x?.key === key);
      return { key, include: p ? p.include !== false : true, reason: s(p?.reason, 160) };
    });
    const ids = new Set<string>();
    return {
      concept: s(j.concept, 60), conceptWhy: s(j.conceptWhy, 300),
      audience: arr(j.audience).map((x: unknown) => s(x, 80)).filter(Boolean).slice(0, 4),
      tone: s(j.tone, 120),
      accent: /^#[0-9a-f]{6}$/i.test(j.accent || '') ? j.accent : '#2D5B8C', accentWhy: s(j.accentWhy, 200),
      headlineDraft: s(j.headlineDraft, 60),
      pages,
      categories: arr(j.categories).slice(0, 4).map((c: any, i: number) => {
        let id = String(c?.id || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || `cat-${i + 1}`;
        while (ids.has(id)) id += `-${i + 1}`;
        ids.add(id);
        return { id, name: s(c?.name, 30) };
      }).filter((c) => c.name),
      products: arr(j.products).map((x: unknown) => s(x, 60)).filter(Boolean).slice(0, 40),
      photoNeeds: arr(j.photoNeeds).map((x: unknown) => s(x, 120)).filter(Boolean).slice(0, 15),
      risks: arr(j.risks).map((x: unknown) => s(x, 200)).filter(Boolean).slice(0, 10),
    };
  }

  /** 한 번 부르고(서버 도구가 길어 pause_turn 이면 이어서) 마지막 답 글과 검색 결과 주소를 돌려준다 */
  private async run(user: string, maxTokens: number, webSearch: boolean): Promise<{ text: string; urls: Set<string>; searches: string[] }> {
    const messages: any[] = [{ role: 'user', content: user }];
    const urls = new Set<string>();
    const searches: string[] = [];
    let last = '';
    for (let turn = 0; turn < 4; turn++) {
      const res: any = await this.anthropic().messages.create({
        model: env.CLAUDE_MODEL, max_tokens: maxTokens, system: RULES, messages,
        ...(webSearch ? { tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8, user_location: { type: 'approximate', country: 'KR' } }] } : {}),
      } as any);
      let tail = '';
      for (const b of res.content || []) {
        if (b.type === 'server_tool_use' && b.input?.query) searches.push(String(b.input.query));
        if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
          for (const r of b.content) if (r?.url) urls.add(normUrl(r.url));
          tail = ''; // 검색 뒤에 오는 글이 최종 답
        }
        if (b.type === 'text') tail += b.text;
      }
      last = tail || last;
      if (res.stop_reason !== 'pause_turn') {
        if (res.stop_reason === 'max_tokens') console.warn('[process-writer] hit max_tokens');
        break;
      }
      messages.push({ role: 'assistant', content: res.content });
    }
    return { text: last, urls, searches };
  }
}

function parseJson(text: string): any {
  const a = text.indexOf('{'); const b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch { /* 아래 */ } }
  console.warn('[process-writer] JSON parse failed', { len: text.length, tail: text.slice(-200) });
  throw new InternalServerErrorException('AI 응답을 읽지 못했습니다.');
}

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const kindLabel = (k: string) => ({ company: '회사 자료', site: '기존 홈페이지', place: '지도 서비스', web: '웹 검색' }[k] || k);
/** 대조용 — 프로토콜·www·끝 슬래시·추적 파라미터 차이는 같은 주소로 본다 */
export function normUrl(u: string): string {
  try {
    const x = new URL(u);
    return (x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/+$/, '') + (x.search || '')).toLowerCase();
  } catch { return u.toLowerCase(); }
}
