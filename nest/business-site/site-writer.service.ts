import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { TEMPLATES, TEMPLATE_KEYS, SiteContent } from './templates';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

const SYSTEM_PROMPT = `당신은 동네 가게의 홈페이지 문구를 쓰는 카피라이터입니다.
아래 자료(카카오·구글·네이버에서 모은 공개 정보, 관리자 메모)만 보고 홈페이지에 들어갈 글을 씁니다.

규칙:
1. 자료에 있는 사실만 쓴다. 자료에 없는 메뉴·가격·이벤트·수상·경력·역사를 지어내지 않는다.
2. 메뉴/서비스(services)는 자료에 이름이 실제로 나온 것만 넣는다. 가격은 관리자 메모에 적힌 것만 쓰고, 리뷰·블로그에서 본 가격은 쓰지 않는다(바뀌었을 수 있다). 근거가 없으면 빈 배열.
3. "최고", "1위", "유일한", "완벽한" 같은 최상급·비교 표현과 효능 단정은 쓰지 않는다.
4. 광고 문구처럼 부풀리지 말고, 사장님이 손님에게 직접 소개하듯 담백하게 쓴다. 문장은 짧게.
5. 리뷰 요약(reviewSummary)은 여러 리뷰에서 반복되는 점만 묶어 2~3문장으로. 리뷰가 없으면 빈 문자열.
6. reviewPicks는 홈페이지에 인용할 구글 리뷰 번호(0부터) 최대 3개 — 구체적이고 긍정적이며, 개인정보·욕설·다른 가게 언급이 없는 것.
7. blogPicks는 이 가게에 대한 글이 확실한 블로그 번호(0부터) 최대 4개. 광고·체험단 표시가 있거나 다른 가게 글로 보이면 고르지 않는다.
8. 헤드라인은 20자 안팎, 부제(sub)는 60자 안팎. 가게 이름을 헤드라인에 반복하지 않아도 된다.
9. 설명 없이 JSON만 반환한다.`;

export interface WriterInput {
  name: string;
  industry?: string | null;
  memo?: string | null;
  facts: Record<string, unknown>;
  reviews: { author: string; rating?: number; text: string }[];
  blogs: { title: string; snippet: string; blogger?: string }[];
  suggestedTemplate: string;
  /** 관리자가 템플릿을 이미 골랐으면 AI가 바꾸지 않는다 */
  lockTemplate?: boolean;
}

export interface WriterOutput {
  template: string;
  content: SiteContent & { reviewPicks?: number[]; blogPicks?: number[] };
}

@Injectable()
export class SiteWriterService {
  private client: Anthropic | null = null;

  private anthropic(): Anthropic {
    if (!this.client) {
      if (!env.ANTHROPIC_API_KEY) throw new InternalServerErrorException('ANTHROPIC_API_KEY not configured');
      this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  async write(input: WriterInput): Promise<WriterOutput> {
    const templateList = TEMPLATE_KEYS.map((k) => `- ${k}: ${TEMPLATES[k].label} (${TEMPLATES[k].fits})`).join('\n');
    const user = `사업체: ${input.name}
${input.industry ? `업종(관리자 입력): ${input.industry}` : ''}
${input.memo ? `관리자 메모: ${input.memo}` : ''}

[가게 정보]
${JSON.stringify(input.facts, null, 1)}

[구글 리뷰]
${input.reviews.length ? input.reviews.map((r, i) => `${i}. (${r.rating ?? '-'}점) ${r.text.replace(/\s+/g, ' ').slice(0, 500)}`).join('\n') : '없음'}

[네이버 블로그 검색 결과 — 제목·요약만]
${input.blogs.length ? input.blogs.map((b, i) => `${i}. ${b.title} — ${b.snippet}`).join('\n') : '없음'}

[템플릿 — 하나만 고른다]
${templateList}
${input.lockTemplate ? `템플릿은 관리자가 "${input.suggestedTemplate}"(으)로 정했다. 그대로 쓴다.` : `분류로 추정한 기본값: ${input.suggestedTemplate}`}
※ clinic(병원·약국)은 의료광고 규정 때문에 리뷰를 싣지 않는다 — clinic이면 reviewSummary는 "", reviewPicks·blogPicks는 [], 효과·치료 결과를 말하지 않는다.

아래 JSON 형식으로만 답하세요:
{
  "template": "${TEMPLATE_KEYS.join('|')}",
  "headline": "", "sub": "",
  "aboutTitle": "", "about": "두세 문단, 문단 사이는 빈 줄",
  "highlights": [{"title": "", "body": ""}],
  "servicesTitle": "", "services": [{"name": "", "desc": "", "price": ""}],
  "reviewTitle": "", "reviewSummary": "", "keywords": ["리뷰에서 반복되는 짧은 말 3~6개"],
  "reviewPicks": [0], "blogPicks": [0],
  "ctaLabel": "첫 화면 버튼 문구(예: 예약 전화, 길찾기)",
  "seoTitle": "검색 결과 제목 40자 이내", "seoDescription": "검색 결과 설명 120자 이내"
}`;

    const res = await this.anthropic().messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: user }],
    });
    const text = res.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('');
    const json = parseJson(text);
    if (!json) throw new InternalServerErrorException('AI 응답을 읽지 못했습니다. 다시 시도해 주세요.');

    const template = input.lockTemplate || !TEMPLATES[json.template] ? input.suggestedTemplate : json.template;
    const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
    const idx = (v: unknown, max: number, n: number) => (Array.isArray(v) ? v : [])
      .map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < max).slice(0, n);
    const noReviews = !TEMPLATES[template].reviews;

    return {
      template,
      content: {
        headline: str(json.headline, 60),
        sub: str(json.sub, 200),
        aboutTitle: str(json.aboutTitle, 40),
        about: str(json.about, 1500),
        highlights: (Array.isArray(json.highlights) ? json.highlights : []).slice(0, 4)
          .map((h: any) => ({ title: str(h?.title, 40), body: str(h?.body, 160) })).filter((h: any) => h.title),
        servicesTitle: str(json.servicesTitle, 30),
        services: (Array.isArray(json.services) ? json.services : []).slice(0, 16)
          .map((s: any) => ({ name: str(s?.name, 50), desc: str(s?.desc, 120), price: str(s?.price, 30) })).filter((s: any) => s.name),
        reviewTitle: str(json.reviewTitle, 40),
        reviewSummary: noReviews ? '' : str(json.reviewSummary, 400),
        keywords: noReviews ? [] : (Array.isArray(json.keywords) ? json.keywords : []).map((k: unknown) => str(k, 20)).filter(Boolean).slice(0, 6),
        reviewPicks: noReviews ? [] : idx(json.reviewPicks, input.reviews.length, 3),
        blogPicks: noReviews ? [] : idx(json.blogPicks, input.blogs.length, 4),
        ctaLabel: str(json.ctaLabel, 16),
        seoTitle: str(json.seoTitle, 60),
        seoDescription: str(json.seoDescription, 160),
      },
    };
  }
}

/** ```json 펜스·앞뒤 설명이 붙어 와도 첫 { … 마지막 } 을 읽는다 */
function parseJson(text: string): any {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(text.slice(a, b + 1)); } catch { return null; }
}
