import { CorpSite, routeCorp } from './multipage';
import { aboutPages } from './multipage/layout';

/**
 * 자동 점검 — 사람이 보기 전에 기계로 걸러낼 수 있는 것.
 *   fail: 공개하면 안 되는 것(페이지 오류, 출처에 없는 숫자, 금지 표현)
 *   warn: 공개는 되지만 고객에게 받아야 할 것(사진·사양 없음, 연락처 없음)
 * 숫자 대조는 "출처 글 전체"에 그 숫자가 글자로 있는지만 본다 — 의미까지 맞는지는 사람이 본다.
 */

export interface QaItem { level: 'fail' | 'warn' | 'ok'; area: string; msg: string; path?: string }
export interface QaReport { at: string; items: QaItem[]; counts: { fail: number; warn: number; ok: number }; pages: number }

const SUPERLATIVES = ['최고', '1위', '넘버원', '유일', '완벽', '최상', '국내 최대', '업계 최초', '독보적', '압도적'];
const GENERIC = ['고객 만족을 최우선', '정밀한 설계', '견고한 완성', '최상의 품질', '신뢰와 기술', '끊임없는 연구', '고객과 함께'];

export function runQa(m: CorpSite, sourceText: string, opts: { homonyms?: string[]; planPages?: Record<string, boolean> } = {}): QaReport {
  const items: QaItem[] = [];
  const src = norm(sourceText);

  // 1) 모든 페이지가 열리는지 + 템플릿 구멍(undefined·NaN·[object Object])
  const paths = ['', ...aboutPages(m).map((p) => p.path), ...(m.products.length ? ['products', ...m.products.map((p) => `products/${p.id}`)] : []), 'contact', 'privacy', 'robots.txt'];
  let broken = 0;
  for (const p of paths) {
    const r = routeCorp(m, p, {});
    if (r.status !== 200) { broken++; items.push({ level: 'fail', area: '페이지', msg: `열리지 않음 (${r.status})`, path: p || '/' }); continue; }
    const text = r.body.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
    const hole = /\b(undefined|NaN|null)\b|\[object Object\]/.exec(text);
    if (hole) { broken++; items.push({ level: 'fail', area: '페이지', msg: `화면에 "${hole[0]}" 글자가 보임`, path: p || '/' }); }
  }
  if (!broken) items.push({ level: 'ok', area: '페이지', msg: `${paths.length}개 페이지가 모두 열림` });

  // 2) 출처에 없는 숫자 — 연도·수량·사양 숫자를 지어냈는지
  const copy: { where: string; path: string; text: string }[] = [
    { where: '헤드라인', path: '/', text: m.headline }, { where: '부제', path: '/', text: m.sub },
    { where: '회사 개요', path: 'about', text: m.about },
    ...m.highlights.map((h) => ({ where: '강점', path: 'about', text: `${h.title} ${h.body}` })),
    ...m.stats.map((s) => ({ where: '핵심 수치', path: '/', text: `${s.value} ${s.label} ${s.note || ''}` })),
    ...m.history.map((h) => ({ where: '연혁', path: 'about/history', text: `${h.year} ${h.text}` })),
    ...(m.ceo ? [{ where: '대표 인사말', path: 'about', text: m.ceo.body }] : []),
    ...m.certifications.map((c) => ({ where: '인증', path: 'about/certifications', text: c })),
    ...m.products.flatMap((p) => [
      { where: `제품 ${p.name}`, path: `products/${p.id}`, text: [p.name, p.summary, p.keySpec, p.body, ...(p.features || []).map((f) => `${f.title} ${f.body || ''}`)].join(' ') },
      ...(p.specs || []).map((s) => ({ where: `제품 ${p.name} 사양 "${s.k}"`, path: `products/${p.id}`, text: s.v })),
    ]),
  ];
  const seen = new Set<string>();
  let numIssues = 0;
  for (const c of copy) {
    for (const n of numbers(c.text)) {
      const key = `${c.where}|${n}`;
      if (seen.has(key) || src.includes(n) || loosely(src, n)) continue;
      seen.add(key);
      numIssues++;
      if (numIssues <= 25) items.push({ level: 'fail', area: '출처 없는 숫자', msg: `${c.where}: "${n}"이(가) 조사 자료에 없음`, path: c.path });
    }
  }
  if (numIssues > 25) items.push({ level: 'fail', area: '출처 없는 숫자', msg: `그 밖에 ${numIssues - 25}건 더` });
  if (!numIssues) items.push({ level: 'ok', area: '출처 없는 숫자', msg: '화면의 숫자가 모두 조사 자료에 있음' });

  // 3) 금지 표현 — 자료 원문에 그 말이 있으면(예: 인증서 이름) 통과
  const all = copy.map((c) => c.text).join(' ');
  const bad = [...SUPERLATIVES, ...GENERIC].filter((w) => all.includes(w) && !sourceText.includes(w));
  for (const w of bad) items.push({ level: SUPERLATIVES.includes(w) ? 'fail' : 'warn', area: '표현', msg: `"${w}" — ${SUPERLATIVES.includes(w) ? '근거 없는 최상급' : '아무 회사에나 붙는 말'}` });
  if (!bad.length) items.push({ level: 'ok', area: '표현', msg: '최상급·상투 표현 없음' });
  if (m.headline.length > 32) items.push({ level: 'warn', area: '표현', msg: `헤드라인이 깁니다(${m.headline.length}자)`, path: '/' });

  // 4) 고객에게 받아야 할 것
  if (!m.facts.phone && !m.company.phone) items.push({ level: 'warn', area: '연락처', msg: '대표 전화가 없음 — 하단 전화 버튼이 빠집니다' });
  if (!m.facts.address && !m.company.address) items.push({ level: 'warn', area: '연락처', msg: '주소가 없음 — 오시는 길 지도가 빠집니다', path: 'about/location' });
  if (!m.company.bizNo) items.push({ level: 'warn', area: '회사 정보', msg: '사업자등록번호가 없음 — 꼬리말 표기 필요' });
  if (!m.heroPhoto) items.push({ level: 'warn', area: '사진', msg: '첫 화면 사진이 없음', path: '/' });
  const noPhoto = m.products.filter((p) => !p.photos.length);
  if (noPhoto.length) items.push({ level: 'warn', area: '사진', msg: `제품 ${noPhoto.length}개에 사진 없음: ${noPhoto.slice(0, 6).map((p) => p.name).join(', ')}${noPhoto.length > 6 ? ' …' : ''}` });
  const noSpec = m.products.filter((p) => !(p.specs || []).length);
  if (noSpec.length) items.push({ level: 'warn', area: '사양', msg: `제품 ${noSpec.length}개에 사양표 없음: ${noSpec.slice(0, 6).map((p) => p.name).join(', ')}${noSpec.length > 6 ? ' …' : ''}` });
  if (!m.products.length && opts.planPages?.products !== false) items.push({ level: 'warn', area: '제품', msg: '제품이 하나도 없음 — 제품 메뉴가 빠집니다' });
  if (opts.homonyms?.length) items.push({ level: 'warn', area: '동명 업체', msg: `이름이 같은 다른 업체 ${opts.homonyms.length}곳 — 공개 전 고객에게 회사 정보 확인: ${opts.homonyms.slice(0, 3).join(' / ')}` });

  const counts = { fail: 0, warn: 0, ok: 0 };
  for (const i of items) counts[i.level]++;
  return { at: new Date().toISOString(), items, counts, pages: paths.length };
}

/** 숫자 토큰 — 두 자리 이상이거나 단위가 붙은 것만(“3가지”, “1층” 같은 말은 빼려고 한 자리 맨숫자는 무시) */
export function numbers(text: string): string[] {
  const out: string[] = [];
  const re = /\d[\d,.]*\d|\d/g;
  for (let x = re.exec(text || ''); x; x = re.exec(text || '')) {
    const n = x[0].replace(/,/g, '').replace(/\.$/, '');
    if (n.replace(/\D/g, '').length < 2) continue;
    out.push(n);
  }
  return out;
}

/**
 * 표기만 다른 같은 숫자 — "2014.12" ↔ "2014  12"(연혁 이미지), "0.5톤" ↔ "0_5톤"(옛 사이트 제품명), "2015.02.16" ↔ "2015년 02월 16일".
 *   숫자 묶음이 같은 순서로, 사이에 숫자가 아닌 글자 1~6개만 두고 나오면 같은 값으로 본다.
 */
export function loosely(src: string, n: string): boolean {
  const groups = n.split('.').filter(Boolean);
  if (groups.length < 2) return false;
  const re = new RegExp(`(?<!\\d)${groups.map((g) => `0?${g.replace(/^0(?=\d)/, '')}`).join('[^0-9]{1,6}')}(?!\\d)`);
  return re.test(src);
}

const norm = (t: string) => (t || '').replace(/(\d),(?=\d{3})/g, '$1');
