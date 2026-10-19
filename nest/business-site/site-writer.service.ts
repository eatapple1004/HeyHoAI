import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { TEMPLATES, TEMPLATE_KEYS, SiteContent } from './templates';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

const SYSTEM_PROMPT = `당신은 동네 가게와 중소기업의 홈페이지 문구를 쓰는 카피라이터입니다.
아래 자료(카카오·구글·네이버에서 모은 공개 정보, 회사가 준 자료·기존 홈페이지 글, 관리자 메모)만 보고 홈페이지에 들어갈 글을 씁니다.

규칙:
1. 자료에 있는 사실만 쓴다. 자료에 없는 메뉴·가격·이벤트·수상·경력·역사를 지어내지 않는다.
2. 메뉴/서비스(services)는 자료에 이름이 실제로 나온 것만 넣는다. 가격은 관리자 메모에 적힌 것만 쓰고, 리뷰·블로그에서 본 가격은 쓰지 않는다(바뀌었을 수 있다). 근거가 없으면 빈 배열.
3. "최고", "1위", "유일한", "완벽한" 같은 최상급·비교 표현과 효능 단정은 쓰지 않는다.
4. 광고 문구처럼 부풀리지 말고, 사장님이 손님에게 직접 소개하듯 담백하게 쓴다. 문장은 짧게.
5. 이 글은 사장님 홈페이지에 실린다. 리뷰 요약(reviewSummary)과 keywords에는 여러 리뷰에서 반복되는 **좋은 점만** 담는다(불만·주의사항·혼잡·가격 불평 등 단점은 빼고, 사실을 부풀리지도 않는다). 2~3문장. 리뷰가 없으면 빈 문자열.
6. reviewPicks는 홈페이지에 인용할 구글 리뷰 번호(0부터) 최대 3개 — 4점 이상이고, 단점·불만·주의 문장이 섞이지 않은 긍정적인 리뷰만. 개인정보·욕설·다른 가게 언급이 있으면 고르지 않는다. 사이트 언어(한국어)로 쓴 리뷰를 우선한다(외국어 리뷰는 한국어 리뷰가 부족할 때만). 마땅한 게 없으면 [].
7. blogPicks는 이 가게에 대한 글이 확실한 블로그 번호(0부터) 최대 4개. 광고·체험단 표시가 있거나 다른 가게 글로 보이면 고르지 않는다.
8. 헤드라인은 20자 안팎, 부제(sub)는 60자 안팎. "성수동 베이커리 카페"처럼 같은 업종 아무 가게에나 붙는 말은 금지 — 사진과 리뷰에서 본 **이 가게만의 구체적인 것**(대표 메뉴, 공간의 특징, 손님이 반복해서 말하는 점)으로 쓴다.
9. 사진이 첨부되면 한 장씩 직접 보고 종류(food·interior·exterior·people·other)와 짧은 설명(15자 안팎, 보이는 것만)을 단다. 사진에 보이는 메뉴는 services에 넣고 그 메뉴가 주인공인 음식(food) 사진 번호를 photo로 연결한다(진열대·매장 사진은 연결하지 않는다)(이름을 모르면 "크루아상"처럼 보이는 그대로의 일반 명칭).
10. hero는 첫 화면 큰 사진 번호 — 이 가게의 성격이 한눈에 보이고 선명한 사진. 흐리거나 사람 얼굴이 크게 나온 사진은 피한다.
11. corporate(중소기업) 템플릿이면 stats·history·certifications·company를 채운다. 수치·연도·인증·특허·대표 이름·사업자번호는 **회사 자료에 글자로 적힌 것만** 옮기고, 계산하거나 추정하지 않는다. 손님 말투가 아니라 발주처·협력사에게 신뢰를 주는 단정한 문체로 쓴다. 매출 감소·소송·회생 같은 민감한 경영 정보는 쓰지 않는다.
   - stats는 이 회사를 가장 잘 증명하는 수치 3~4개(예: {"value":"−2t","label":"공차중량 감소","note":"동급 스틸 대비"}). 연혁 연도 개수 같은 뻔한 수치는 피한다.
   - history는 자료의 연혁을 연도 오름차순으로, 같은 해는 한 줄로 묶어 최대 20줄.
   - services는 사업분야·대표 제품. 사진이 있으면 그 제품이 주인공인 사진 번호를 photo로 연결하고, price 자리에는 가격 대신 핵심 사양 한 줄(자료에 있는 것만)을 넣어도 된다.
   - accent는 로고·제품 사진에서 보이는 회사 색 하나(#RRGGBB). 확실하지 않으면 "".
12. 설명 없이 JSON만 반환한다.`;

export interface WriterInput {
  name: string;
  industry?: string | null;
  memo?: string | null;
  facts: Record<string, unknown>;
  reviews: { author: string; rating?: number; text: string }[];
  blogs: { title: string; snippet: string; blogger?: string }[];
  suggestedTemplate: string;
  /** 회사가 준 자료·기존 홈페이지 글 — 기업형에서 사실의 주 출처 */
  material?: string;
  /** 사진(번호 = 배열 순서). 이미지를 못 읽은 건 빠진 채로 온다 */
  images?: { data: string; mediaType: string }[];
  /** 관리자가 템플릿을 이미 골랐으면 AI가 바꾸지 않는다 */
  lockTemplate?: boolean;
}

export interface WriterOutput {
  template: string;
  content: SiteContent & { reviewPicks?: number[]; blogPicks?: number[] };
  /** 사진 번호별 AI 판독 — 서비스가 ref 로 바꿔 저장한다 */
  photos: { i: number; kind: string; caption: string }[];
  hero: number | null;
  /** services[k] 에 연결된 사진 번호 */
  servicePhotos: (number | null)[];
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

[회사 자료·기존 홈페이지]
${input.material ? input.material.slice(0, 30000) : '없음'}

[구글 리뷰]
${input.reviews.length ? input.reviews.map((r, i) => `${i}. (${r.rating ?? '-'}점) ${r.text.replace(/\s+/g, ' ').slice(0, 500)}`).join('\n') : '없음'}

[네이버 블로그 검색 결과 — 제목·요약만]
${input.blogs.length ? input.blogs.map((b, i) => `${i}. ${b.title} — ${b.snippet}`).join('\n') : '없음'}

[템플릿 — 하나만 고른다]
${templateList}
[사진] ${input.images?.length ? `${input.images.length}장 첨부 — 첨부 순서대로 0번부터` : '없음 — photos는 [], hero는 null'}

${input.lockTemplate ? `템플릿은 관리자가 "${input.suggestedTemplate}"(으)로 정했다. 그대로 쓴다.` : `분류로 추정한 기본값: ${input.suggestedTemplate}`}
※ clinic(병원·약국)은 의료광고 규정 때문에 리뷰를 싣지 않는다 — clinic이면 reviewSummary는 "", reviewPicks·blogPicks는 [], 효과·치료 결과를 말하지 않는다.

아래 JSON 형식으로만 답하세요:
{
  "template": "${TEMPLATE_KEYS.join('|')}",
  "headline": "", "sub": "",
  "aboutTitle": "", "about": "두세 문단, 문단 사이는 빈 줄",
  "highlights": [{"title": "", "body": ""}],
  "servicesTitle": "", "services": [{"name": "", "desc": "", "price": "", "photo": null}],
  "reviewTitle": "", "reviewSummary": "", "keywords": ["리뷰에서 반복되는 짧은 말 3~6개"],
  "reviewPicks": [0], "blogPicks": [0],
  "ctaLabel": "첫 화면 버튼 문구(예: 예약 전화, 길찾기)",
  "stats": [{"value": "", "label": "", "note": ""}],
  "history": [{"year": "", "text": ""}],
  "certifications": [""],
  "company": {"ceo": "", "founded": "", "fax": "", "email": "", "bizNo": "", "address": "", "phone": ""},
  "accent": "",
  "photos": [{"i": 0, "kind": "food|interior|exterior|people|other", "caption": ""}],
  "hero": 0,
  "seoTitle": "검색 결과 제목 40자 이내", "seoDescription": "검색 결과 설명 120자 이내"
}`;

    const res = await this.anthropic().messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          ...(input.images || []).flatMap((im, i) => [
            { type: 'text' as const, text: `사진 ${i}` },
            { type: 'image' as const, source: { type: 'base64' as const, media_type: im.mediaType as any, data: im.data } },
          ]),
          { type: 'text' as const, text: user },
        ],
      }],
    });
    const text = res.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('');
    const json = parseJson(text);
    if (!json) throw new InternalServerErrorException('AI 응답을 읽지 못했습니다. 다시 시도해 주세요.');

    const template = input.lockTemplate || !TEMPLATES[json.template] ? input.suggestedTemplate : json.template;
    const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
    const idx = (v: unknown, max: number, n: number) => (Array.isArray(v) ? v : [])
      .map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < max).slice(0, n);
    const noReviews = !TEMPLATES[template].reviews;

    const nImg = input.images?.length || 0;
    const KINDS = ['food', 'interior', 'exterior', 'people', 'other'];
    const photoIdx = (v: unknown) => (Number.isInteger(Number(v)) && v !== null && v !== '' && Number(v) >= 0 && Number(v) < nImg ? Number(v) : null);
    const rawServices = (Array.isArray(json.services) ? json.services : []).slice(0, 16).filter((x: any) => str(x?.name, 50));

    return {
      template,
      photos: (Array.isArray(json.photos) ? json.photos : [])
        .map((p: any) => ({ i: photoIdx(p?.i), kind: KINDS.includes(p?.kind) ? p.kind : 'other', caption: str(p?.caption, 40) }))
        .filter((p: any) => p.i !== null) as { i: number; kind: string; caption: string }[],
      hero: photoIdx(json.hero),
      servicePhotos: rawServices.map((x: any) => photoIdx(x?.photo)),
      content: {
        headline: str(json.headline, 60),
        sub: str(json.sub, 200),
        aboutTitle: str(json.aboutTitle, 40),
        about: str(json.about, 1500),
        highlights: (Array.isArray(json.highlights) ? json.highlights : []).slice(0, 4)
          .map((h: any) => ({ title: str(h?.title, 40), body: str(h?.body, 160) })).filter((h: any) => h.title),
        servicesTitle: str(json.servicesTitle, 30),
        services: rawServices.map((x: any) => ({ name: str(x?.name, 50), desc: str(x?.desc, 120), price: str(x?.price, 30) })),
        reviewTitle: str(json.reviewTitle, 40),
        reviewSummary: noReviews ? '' : str(json.reviewSummary, 400),
        keywords: noReviews ? [] : (Array.isArray(json.keywords) ? json.keywords : []).map((k: unknown) => str(k, 20)).filter(Boolean).slice(0, 6),
        // 별점 4점 미만은 AI가 골라도 뺀다 — 사장님 홈페이지에 불만 리뷰가 인용되면 안 된다
        reviewPicks: noReviews ? [] : idx(json.reviewPicks, input.reviews.length, 3).filter((i) => (input.reviews[i].rating ?? 5) >= 4),
        blogPicks: noReviews ? [] : idx(json.blogPicks, input.blogs.length, 4),
        ctaLabel: str(json.ctaLabel, 16),
        stats: (Array.isArray(json.stats) ? json.stats : []).slice(0, 4)
          .map((x: any) => ({ value: str(x?.value, 16), label: str(x?.label, 30), note: str(x?.note, 40) })).filter((x: any) => x.value && x.label),
        history: (Array.isArray(json.history) ? json.history : []).slice(0, 24)
          .map((x: any) => ({ year: str(x?.year, 12), text: str(x?.text, 160) })).filter((x: any) => x.year && x.text),
        certifications: (Array.isArray(json.certifications) ? json.certifications : []).map((x: unknown) => str(x, 40)).filter(Boolean).slice(0, 16),
        company: Object.fromEntries(['ceo', 'founded', 'fax', 'email', 'bizNo', 'address', 'phone']
          .map((k) => [k, str(json.company?.[k], 120)]).filter(([, v]) => v)),
        accent: /^#[0-9a-f]{6}$/i.test(json.accent || '') ? json.accent : '',
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
