import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

/**
 * 여러 페이지 기업 사이트 문구 — 두 단계로 나눠 쓴다.
 *   1) 사이트 골격: 홈·회사소개·인사말·연혁·인증·회사정보·제품 분류·제품 목록(요약)·사진 배정
 *   2) 제품 상세: 제품마다 따로(소개 문단·특징·사양표) — 한 번에 쓰면 응답 길이 한도에 걸려 잘린다(실측)
 * 사실(수치·연도·사양·인증·이름·번호)은 회사 자료에 글자로 적힌 것만. 없으면 비운다 — 화면이 그 블록을 숨긴다.
 */

const BASE_RULES = `당신은 중소기업 홈페이지를 만드는 에이전시의 카피라이터입니다. 발주처·구매 담당자·협력사가 읽습니다.
규칙:
1. 수치·연도·사양·인증·특허·대표 이름·사업자번호·연락처는 아래 자료에 글자로 적힌 것만 옮긴다. 계산·추정·일반 상식으로 채우지 않는다. 모르면 비운다.
2. "최고", "1위", "유일한", "완벽한" 같은 최상급·비교 표현과 확인할 수 없는 주장은 쓰지 않는다.
3. 매출 감소·소송·회생·구조조정 같은 민감한 경영 정보는 쓰지 않는다.
4. 문체는 단정하고 구체적으로. 같은 업종 아무 회사에나 붙는 말("정밀한 설계, 견고한 완성", "고객 만족을 최우선으로")은 금지 — 이 회사 자료에만 있는 사실(최초·특허·수출·고객·수치)로 말한다.
5. 설명 없이 JSON만 반환한다.`;

export interface CorpWriterInput {
  name: string;
  industry?: string | null;
  memo?: string | null;
  facts: Record<string, unknown>;
  material: string;
  images: { data: string; mediaType: string }[];
  /** 사진 이름(전체 사진 수만큼, 앞쪽 images.length 장만 첨부) — 기존 홈페이지에서 가져온 사진은 제품명이 붙어 있다 */
  photoNames?: string[];
  /** 관리자가 승인한 기획안 — 있으면 컨셉·분류·제품 목록을 따른다 */
  plan?: { concept: string; tone: string; headlineDraft: string; audience: string[]; categories: { id: string; name: string }[]; products: string[] };
}

export interface CorpSkeleton {
  headline: string; sub: string; ctaLabel: string; seoDescription: string; accent: string;
  aboutTitle: string; about: string;
  highlights: { title: string; body: string }[];
  stats: { value: string; label: string; note?: string }[];
  ceo?: { title?: string; body: string; name?: string };
  history: { year: string; text: string }[];
  certifications: string[];
  company: Record<string, string>;
  categories: { id: string; name: string; summary?: string }[];
  products: { id: string; name: string; category?: string; summary?: string; keySpec?: string; photos: number[] }[];
  photos: { i: number; kind: string; caption: string }[];
  hero: number | null;
  aboutPhoto: number | null;
}

export interface CorpProductDetail {
  body: string;
  features: { title: string; body?: string }[];
  specs: { k: string; v: string }[];
}

@Injectable()
export class CorpWriterService {
  private client: Anthropic | null = null;

  private anthropic(): Anthropic {
    if (!this.client) {
      if (!env.ANTHROPIC_API_KEY) throw new InternalServerErrorException('ANTHROPIC_API_KEY not configured');
      this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  private async call(content: any[], maxTokens: number): Promise<any> {
    const res = await this.anthropic().messages.create({
      model: env.CLAUDE_MODEL, max_tokens: maxTokens, system: BASE_RULES, messages: [{ role: 'user', content }],
    });
    const text = res.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('');
    const a = text.indexOf('{'); const b = text.lastIndexOf('}');
    let json: any = null;
    if (a >= 0 && b > a) { try { json = JSON.parse(text.slice(a, b + 1)); } catch { json = null; } }
    if (!json) {
      console.warn('[corp-writer] JSON parse failed', { stop: (res as any).stop_reason, len: text.length, tail: text.slice(-200) });
      throw new InternalServerErrorException((res as any).stop_reason === 'max_tokens' ? 'AI 응답이 길이 한도에 걸려 잘렸습니다.' : 'AI 응답을 읽지 못했습니다.');
    }
    return json;
  }

  async skeleton(input: CorpWriterInput): Promise<CorpSkeleton> {
    const nSeen = input.images.length;
    const names = input.photoNames || [];
    const nImg = Math.max(nSeen, names.length);
    const user = `회사: ${input.name}
${input.industry ? `업종: ${input.industry}` : ''}
${input.memo ? `관리자 메모: ${input.memo}` : ''}

[수집한 기본 정보]
${JSON.stringify(input.facts, null, 1)}

[회사 자료·기존 홈페이지]
${input.material.slice(0, 40000) || '없음'}

[사진] ${nImg ? `모두 ${nImg}장 — 0~${nSeen - 1}번은 첨부(직접 보고 판단)${nImg > nSeen ? `, ${nSeen}~${nImg - 1}번은 첨부 없이 이름만` : ''}` : '없음'}
${names.some(Boolean) ? names.map((n, i) => (n ? `사진 ${i}: ${n}` : '')).filter(Boolean).join('\n') : ''}
${input.plan ? `
[승인된 기획안 — 반드시 따른다]
컨셉: ${input.plan.concept}
읽는 사람: ${input.plan.audience.join(', ')}
문체: ${input.plan.tone}
헤드라인 초안: ${input.plan.headlineDraft} (다듬어도 되지만 같은 사실을 말할 것)
제품 분류: ${input.plan.categories.length ? input.plan.categories.map((c) => `${c.id}=${c.name}`).join(', ') + ' — categories에 이 id·이름 그대로' : '없음 — categories는 []'}
올릴 제품: ${input.plan.products.join(', ') || '없음'} — products는 이 목록만(이름 그대로)
` : ''}
여러 페이지 회사 홈페이지(홈·회사 개요·인사말·연혁·인증·제품 목록·제품 상세·오시는 길·문의)의 골격을 만드세요.
- headline: 홈 첫 화면 한 줄(25자 안팎). 이 회사만의 사실로.
- sub: 60자 안팎.
- about: 회사 개요 3~4문단(빈 줄로 구분). aboutTitle은 짧게.
- highlights: 강점 3개.
- stats: 이 회사를 증명하는 수치 3~4개(자료에 있는 것만).
- ceo: 자료에 대표 인사말이 있을 때만 — 원문 취지를 지키며 다듬는다(새 약속·포부를 지어내지 않는다). 없으면 null.
- history: 연도 오름차순, 같은 해는 한 줄로, 최대 30줄.
- certifications: 인증·특허·지정 이름.
- company: ceo, founded, fax, email, bizNo, address, phone — 자료에 있는 것만.
- categories: 제품 분류 2~4개(예: 민수·군수). id는 영어 소문자·하이픈. 분류가 의미 없으면 [].
- products: 자료에 나온 제품 전부(기획안이 있으면 기획안 목록). 사진 이름이 제품명과 같거나 그 제품의 변형이면 그 사진들을 photos에 넣는다. id는 영어 소문자·하이픈(예: "aluminum-flatbed"). summary 1~2문장, keySpec은 대표 사양 한 줄(자료에 있으면). photos는 그 제품이 주인공인 사진 번호들.
- photos: 첨부한 사진(0~${Math.max(nSeen - 1, 0)}번)만 kind(product·factory·people·other)와 15자 이내 설명. 이름만 받은 사진은 쓰지 않는다.
- hero: 첫 화면 사진 번호 — 회사의 대표 제품·현장이 선명하게 보이는 사진. 다른 회사·옛 상호 로고가 크게 보이는 사진은 피한다.
- aboutPhoto: 회사 개요 옆 사진 번호(공장·현장이 있으면 우선), 없으면 null.
- accent: 로고·제품에서 보이는 회사 색(#RRGGBB), 확실하지 않으면 "".
- seoDescription: 검색 결과 설명 120자 이내.

JSON 형식:
{"headline":"","sub":"","ctaLabel":"견적 문의","seoDescription":"","accent":"","aboutTitle":"","about":"","highlights":[{"title":"","body":""}],"stats":[{"value":"","label":"","note":""}],"ceo":{"title":"","body":"","name":""},"history":[{"year":"","text":""}],"certifications":[""],"company":{},"categories":[{"id":"","name":"","summary":""}],"products":[{"id":"","name":"","category":"","summary":"","keySpec":"","photos":[0]}],"photos":[{"i":0,"kind":"","caption":""}],"hero":0,"aboutPhoto":null}`;
    const content = [
      ...input.images.flatMap((im, i) => [
        { type: 'text', text: `사진 ${i}` },
        { type: 'image', source: { type: 'base64', media_type: im.mediaType, data: im.data } },
      ]),
      { type: 'text', text: user },
    ];
    const j = await this.call(content, 16000);

    const str = clipper;
    const idx = (v: unknown) => (v !== null && v !== '' && Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) < nImg ? Number(v) : null);
    const slug = (v: unknown, i: number, used: Set<string>) => {
      let s = String(v || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || `item-${i + 1}`;
      while (used.has(s)) s = `${s}-${i + 1}`;
      used.add(s);
      return s;
    };
    const catIds = new Set<string>();
    const categories = arr(j.categories).slice(0, 6).map((c: any, i: number) => ({ id: slug(c?.id || c?.name, i, catIds), name: str(c?.name, 30), summary: str(c?.summary, 120) })).filter((c: any) => c.name);
    const prodIds = new Set<string>();
    const products = arr(j.products).slice(0, 40).map((p: any, i: number) => ({
      id: slug(p?.id || p?.name, i, prodIds),
      name: str(p?.name, 60),
      category: categories.some((c: any) => c.id === p?.category) ? p.category : (categories.find((c: any) => c.name === p?.category)?.id || ''),
      summary: str(p?.summary, 200),
      keySpec: str(p?.keySpec, 80),
      photos: [...new Set(arr(p?.photos).map(idx).filter((x: any) => x !== null))] as number[],
    })).filter((p: any) => p.name);
    const KINDS = ['product', 'factory', 'people', 'other'];
    return {
      headline: str(j.headline, 60), sub: str(j.sub, 200), ctaLabel: str(j.ctaLabel, 16) || '견적 문의',
      seoDescription: str(j.seoDescription, 160), accent: /^#[0-9a-f]{6}$/i.test(j.accent || '') ? j.accent : '',
      aboutTitle: str(j.aboutTitle, 40), about: str(j.about, 3000),
      highlights: arr(j.highlights).slice(0, 3).map((h: any) => ({ title: str(h?.title, 40), body: str(h?.body, 200) })).filter((h: any) => h.title),
      stats: arr(j.stats).slice(0, 4).map((x: any) => ({ value: str(x?.value, 16), label: str(x?.label, 30), note: str(x?.note, 50) })).filter((x: any) => x.value && x.label),
      ceo: j.ceo && str(j.ceo.body, 3000) ? { title: str(j.ceo.title, 60), body: str(j.ceo.body, 3000), name: str(j.ceo.name, 20) } : undefined,
      history: arr(j.history).slice(0, 40).map((x: any) => ({ year: str(x?.year, 12), text: str(x?.text, 200) })).filter((x: any) => x.year && x.text),
      certifications: arr(j.certifications).map((x: unknown) => str(x, 60)).filter(Boolean).slice(0, 30),
      company: Object.fromEntries(['ceo', 'founded', 'fax', 'email', 'bizNo', 'address', 'phone'].map((k) => [k, str(j.company?.[k], 120)]).filter(([, v]) => v)),
      categories, products,
      photos: arr(j.photos).map((p: any) => ({ i: idx(p?.i), kind: KINDS.includes(p?.kind) ? p.kind : 'other', caption: str(p?.caption, 40) })).filter((p: any) => p.i !== null) as any,
      hero: idx(j.hero), aboutPhoto: idx(j.aboutPhoto),
    };
  }

  async productDetail(input: { name: string; material: string; product: { name: string; summary?: string; keySpec?: string } }): Promise<CorpProductDetail> {
    const user = `회사: ${input.name}
제품: ${input.product.name}
${input.product.summary ? `요약: ${input.product.summary}` : ''}

[회사 자료·기존 홈페이지]
${input.material.slice(0, 40000)}

이 제품의 상세 페이지 내용을 쓰세요.
- body: 제품 소개 2~3문단(빈 줄로 구분). 용도·구조·적용 기술을 자료에 있는 만큼만.
- features: 주요 특징 3~6개(title 짧게, body 한 문장). 자료 근거가 없으면 적게.
- specs: 사양표 — 자료에 이 제품의 값으로 적힌 것만 {"k":"항목","v":"값"}. 다른 제품 값을 옮기지 않는다. 없으면 [].
JSON: {"body":"","features":[{"title":"","body":""}],"specs":[{"k":"","v":""}]}`;
    const j = await this.call([{ type: 'text', text: user }], 4000);
    return {
      body: clipper(j.body, 2500),
      features: arr(j.features).slice(0, 6).map((f: any) => ({ title: clipper(f?.title, 40), body: clipper(f?.body, 200) })).filter((f: any) => f.title),
      specs: arr(j.specs).slice(0, 30).map((s: any) => ({ k: clipper(s?.k, 40), v: clipper(s?.v, 120) })).filter((s: any) => s.k && s.v),
    };
  }
}

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);

/** 길이 제한은 단어 경계에서 — 숫자 중간에서 끊기지 않게 */
function clipper(v: unknown, n: number): string {
  const t = typeof v === 'string' ? v.trim() : '';
  if (t.length <= n) return t;
  const cut = t.slice(0, n);
  const i = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf(','), cut.lastIndexOf('·'));
  return (i > n * 0.5 ? cut.slice(0, i) : cut).replace(/[\s,·]+$/, '');
}
