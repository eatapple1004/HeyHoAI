import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', '..', 'src', 'config'));

/**
 * AI 맞춤 디자인 — 템플릿을 쓰지 않고 회사마다 디자인 시스템과 페이지 HTML을 새로 쓴다(한성·재노바 방식의 상품화).
 *   1) 디자인 시스템: 방향 설명 + 폰트 + CSS 전체 + 머리말·꼬리말 HTML
 *   2) 페이지: 디자인 시스템 CSS의 클래스를 써서 <main> 안 본문만. 내용(문구·사실)은 이미 검증된 데이터만 넘긴다
 * 결과는 서버에서 소독(sanitize.ts)한 뒤 저장·렌더한다. JS 는 쓰지 않는다(모바일 메뉴도 <details>).
 */

const SYSTEM = `당신은 한국 중소기업·동네 가게 홈페이지를 만드는 시니어 웹 디자이너 겸 프론트엔드 개발자입니다. 결과물은 실제로 돈을 받고 납품합니다.
반드시 지킬 것:
1. 정적 HTML과 CSS만. <script>·이벤트 속성·외부 이미지·iframe·폼 태그를 쓰지 않는다(지도·문의 폼은 지정된 자리표시자만).
2. 사실(회사명·수치·연도·사양·인증·고객사·연락처)은 넘겨받은 데이터에 있는 것만, 글자 그대로. 장식용 눈금·축·번호에도 데이터에 없는 연도·숫자를 만들지 않는다. 새 수치·고객·수상·약속을 지어내지 않는다. 데이터 문구를 고쳐 쓰지 말고 배치·강조만 디자인한다. 섹션 제목·버튼 같은 짧은 안내 말은 써도 된다.
3. 이미지는 넘겨받은 사진 주소만 그대로 쓴다. 사진이 없는 자리는 사진 없이도 완성된 구성으로 만든다(회색 상자·"이미지 준비 중" 금지).
4. 반응형: 360px~1440px에서 가로 스크롤이 생기지 않게. 모바일 메뉴는 <details>/<summary>로.
5. 접근성: 본문 대비 4.5:1 이상, :focus-visible 표시, prefers-reduced-motion 존중, 이미지 alt.
6. 피할 것(흔한 AI 사이트 티): 보라·파랑 그라데이션, 모든 요소 가운데 정렬, 둥근 카드 남발, 이모지 아이콘, 의미 없는 장식 블롭, 영어 대문자 슬로건 남발.
7. 업종의 실물에서 온 시각 요소 하나를 기억에 남는 장치로 쓴다(예: 특장차라면 적재함 치수선·도면 격자, 빵집이라면 종이 봉투·가격 이름표, 미용실이라면 거울·빗 선). 과하지 않게 한 군데. 숫자가 들어가는 장치는 데이터의 숫자만.
8. 한국어 타이포: word-break:keep-all, 본문 16~18px, 줄간격 1.7 안팎.`;

export interface DesignSystem { note: string; fonts: string; css: string; header: string; footer: string }

@Injectable()
export class DesignWriterService {
  private client: Anthropic | null = null;

  private anthropic(): Anthropic {
    if (!this.client) {
      if (!env.ANTHROPIC_API_KEY) throw new InternalServerErrorException('ANTHROPIC_API_KEY not configured');
      this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  private async call(content: any[], maxTokens: number): Promise<string> {
    const res: any = await this.anthropic().messages.create({
      model: env.CLAUDE_MODEL, max_tokens: maxTokens, system: SYSTEM, messages: [{ role: 'user', content }],
    } as any);
    if (res.stop_reason === 'max_tokens') throw new InternalServerErrorException('AI 응답이 길이 한도에 걸려 잘렸습니다.');
    return (res.content || []).map((b: any) => (b.type === 'text' ? b.text : '')).join('');
  }

  async system(input: {
    name: string; audience?: string; brief: string; direction: string; accent: string; nav: { label: string; href: string; sub?: { label: string; href: string }[] }[];
    company: Record<string, string>; images: { data: string; mediaType: string }[];
  }): Promise<DesignSystem> {
    const text = `회사: ${input.name}
${input.audience ? `읽는 사람: ${input.audience}\n` : ''}[기획 요약 — 승인된 기획안·조사 시트]
${input.brief}

[이번 시안의 방향]
${input.direction || '기획안의 컨셉을 가장 잘 드러내는 방향으로 자유롭게'}

강조색(회사 색 또는 기획안 색): ${input.accent} — 강조에만 아껴 쓴다.
밝은 강조색(어두운 배경 위 글자·숫자·선 전용): ${lighten(input.accent)} — :root 에 --accent-light 로 정의한다.
⚠️ 대비 규칙: 어두운 배경(배경 명도가 낮은 섹션·머리말·꼬리말) 위의 글자·작은 제목·숫자에는 --accent 를 쓰지 말고 --accent-light 나 흰색 계열을 쓴다. 밝은 배경 위에서는 --accent. 본문 글자는 어느 배경에서든 4.5:1 이상.
메뉴(이 링크 그대로): ${JSON.stringify(input.nav)}
꼬리말에 넣을 회사 정보(있는 것만): ${JSON.stringify(input.company)}
첨부 사진: 이 회사 실제 사진 일부(분위기·색 참고용).

이 회사 사이트 전체에 쓸 디자인 시스템을 만드세요. 아래 태그 형식 그대로, 다른 말 없이:
<note>디자인 방향 설명 3~4줄(왜 이 색·서체·구성인지, 기억에 남는 장치는 무엇인지)</note>
<fonts>Google Fonts css2 주소 하나(한글 지원 서체, 예: https://fonts.googleapis.com/css2?family=...&display=swap) 또는 비움 — Pretendard 는 따로 넣어 주므로 font-family 에 'Pretendard Variable', Pretendard 를 써도 된다</fonts>
<css>
사이트 전체 CSS. :root 에 색·간격 토큰(--accent 포함). 리셋, 타이포, .wrap 레이아웃, 머리말·꼬리말, 버튼, 섹션, 제목 띠(서브 페이지 상단), 표(사양표), 카드/목록, 사진 비율, 반응형 미디어쿼리까지.
페이지들이 재사용할 클래스 이름을 일관되게 정해 두고 주석으로 짧게 용도를 적는다.
body 에는 페이지별로 pg-home, pg-about, pg-history, pg-certs, pg-location, pg-products, pg-product, pg-reviews, pg-contact, pg-privacy 클래스가 붙는다(홈 머리말을 다르게 하고 싶으면 활용).
문의 폼은 서버가 class="dp-form" 으로 넣는다 — .dp-form 의 입력칸·버튼·동의 문구 스타일도 이 CSS에 포함한다(label, input, select, textarea, button, .dp-agree, .dp-msg.ok, .dp-msg.err).
</css>
<site-header>머리말 HTML 전체(<header>…</header>, 여는·닫는 태그 포함) — 회사명 로고 글자, 데스크톱 메뉴(하위 메뉴 포함), 모바일 <details> 메뉴, 전화 문의 버튼</site-header>
<site-footer>꼬리말 HTML 전체(<footer>…</footer>) — 회사 정보, <a href="/privacy"><strong>개인정보처리방침</strong></a>, 저작권 줄, 사진 출처 자리 <!--{{CREDITS}}--></site-footer>`;
    const content = [
      ...input.images.slice(0, 6).flatMap((im) => [{ type: 'image', source: { type: 'base64', media_type: im.mediaType, data: im.data } }]),
      { type: 'text', text },
    ];
    const out = await this.call(content, 16000);
    const tag = (t: string) => (new RegExp(`<${t}>([\\s\\S]*?)</${t}>`, 'i').exec(out)?.[1] || '').trim();
    // 감싸는 태그를 <header>로 하면 안쪽 <header>의 닫는 태그에서 잘려 머리말이 안 닫힌다(시안 2에서 <main>이 머리말 안에 들어감)
    const ds = { note: tag('note'), fonts: tag('fonts'), css: tag('css'), header: closeTags(tag('site-header'), 'header'), footer: closeTags(tag('site-footer'), 'footer') };
    if (!ds.css || !ds.header || !ds.footer) {
      console.warn('[design-writer] system parse failed', { len: out.length, tail: out.slice(-200) });
      throw new InternalServerErrorException('디자인 시스템 응답을 읽지 못했습니다.');
    }
    return ds;
  }

  /**
   * 대비 보정 — 실제 브라우저가 잰 미달 지점(선택자·글자색·배경색)을 주면 덮어쓰는 CSS 규칙만 돌려받는다.
   *   배치·크기는 건드리지 않고 색만. 서버가 다시 재서 나아졌을 때만 남긴다.
   */
  async fixContrast(input: { css: string; accent: string; hits: { sel: string; text: string; fg: string; bg: string; ratio: number; need: number; pages: string[] }[] }): Promise<string> {
    const text = `[디자인 시스템 CSS]
${input.css.slice(0, 24000)}

[실제 브라우저에서 잰 글자 대비 미달 — 선택자 / 글자 예시 / 지금 글자색 / 실제 배경색 / 대비 / 필요 대비 / 페이지]
${input.hits.slice(0, 30).map((h) => `- ${h.sel} | "${h.text}" | ${h.fg} | ${h.bg} | ${h.ratio.toFixed(2)}:1 | ${h.need}:1 이상 | ${h.pages.slice(0, 3).join(', ')}${h.pages.length > 3 ? ' 외' : ''}`).join('\n')}

강조색 ${input.accent}, 어두운 배경용 밝은 강조색 ${lighten(input.accent)}.
위 지점들이 필요 대비를 넘도록 **덮어쓰는 CSS 규칙만** 쓰세요.
- 색(color, 필요하면 background-color)만 바꾼다. 크기·배치·여백은 그대로.
- 위 선택자를 그대로 쓰되 앞에 body 를 붙여 우선순위를 높인다(예: body header .nav a {color:…}).
- 글자 배경이 흰색인데 글자도 흰색인 카드(사진이 없는 카드 등)는 글자색을 어둡게, 또는 그 카드에 어두운 배경을 준다.
- 이 회사 디자인 톤(토큰)을 유지한다. 형식: <css>…</css>`;
    const out = await this.call([{ type: 'text', text }], 6000);
    return (/<css>([\s\S]*?)<\/css>/i.exec(out)?.[1] || '').trim();
  }

  /** 한 페이지 본문 — 디자인 시스템 CSS 를 보고 그 클래스로 */
  async page(input: { name: string; css: string; note: string; fix?: string[]; page: { key: string; title: string; data: unknown; placeholders?: string[]; links: { label: string; href: string }[] } }): Promise<string> {
    const p = input.page;
    const text = `회사: ${input.name}
[디자인 방향]
${input.note}

[디자인 시스템 CSS — 이 클래스와 토큰을 재사용한다]
${input.css.slice(0, 24000)}

[만들 페이지] ${p.title} (body 클래스 pg-${p.key})
[이 페이지 데이터 — 사실은 이것만, 문구는 글자 그대로]
${JSON.stringify(p.data, null, 1)}

[이 페이지에서 쓸 수 있는 사이트 안 링크]
${p.links.map((l) => `- ${l.label}: ${l.href}`).join('\n')}
${p.placeholders?.length ? `\n[반드시 넣을 자리표시자 — 서버가 실제 내용으로 바꾼다. 주석 그대로]\n${p.placeholders.join('\n')}` : ''}

<main> 안에 들어갈 본문 HTML만 쓰세요(머리말·꼬리말·<html>·<head> 제외). 서브 페이지는 상단에 제목 띠(페이지 제목과 상위 경로)를 둔다.
이 페이지만의 스타일이 필요하면 맨 앞에 짧은 <style> 하나를 둘 수 있다(디자인 시스템과 같은 토큰 사용).
데이터에 없는 항목은 섹션째 생략한다. 형식: <page>…</page>${input.fix?.length ? `

⚠️ 지난번에 이 페이지를 쓸 때 데이터에 없는 숫자(${input.fix.join(', ')})가 들어가 반려됐습니다. 이 숫자들을 쓰지 말고(눈금·장식 포함), 데이터의 숫자만 글자 그대로 쓰세요.` : ''}`;
    const out = await this.call([{ type: 'text', text }], 14000);
    const html = /<page>([\s\S]*?)<\/page>/i.exec(out)?.[1] || '';
    if (!html.trim()) throw new InternalServerErrorException(`${p.title} 페이지 응답을 읽지 못했습니다.`);
    return html.trim();
  }
}

/** 어두운 배경 위에서 읽히는 강조색 — 흰색과 섞어 명도를 올린다(이미 밝으면 그대로) */
export function lighten(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#9EC1E6';
  const n = parseInt(m[1], 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  if (lum > 0.6) return hex;
  const t = lum < 0.25 ? 0.62 : 0.45;
  return '#' + rgb.map((c) => Math.round(c + (255 - c) * t).toString(16).padStart(2, '0')).join('');
}

/** 여는 태그가 닫는 태그보다 많으면 끝에 닫아 준다 — AI 응답이 잘렸거나 감싸기가 꼬였을 때 페이지 전체 구조가 무너지지 않게 */
export function closeTags(html: string, tag: string): string {
  const open = (html.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length;
  const close = (html.match(new RegExp(`</${tag}\\s*>`, 'gi')) || []).length;
  return html + `</${tag}>`.repeat(Math.max(0, open - close));
}
