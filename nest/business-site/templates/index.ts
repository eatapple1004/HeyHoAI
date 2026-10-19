import { SiteModel } from './shared';
import { renderCafe } from './cafe';
import { renderRestaurant } from './restaurant';
import { renderBeauty } from './beauty';
import { renderClinic } from './clinic';
import { renderGeneral } from './general';

export * from './shared';

/**
 * 업종별 템플릿 목록 — AI는 이 key 중 하나만 고른다(새 HTML을 짜지 않는다).
 *   reviews=false 인 템플릿은 리뷰를 그리지 않는다(의료광고 규정) → AI에게도 리뷰 요약을 요청하지 않는다.
 *   새 업종을 추가하면 여기와 화면(admin-business-site.html)의 미리보기 목록만 늘리면 된다.
 */
export const TEMPLATES: Record<string, {
  label: string; fits: string; reviews: boolean; render: (m: SiteModel) => string;
}> = {
  cafe: { label: '카페·베이커리', fits: '카페, 베이커리, 디저트, 브런치, 찻집', reviews: true, render: renderCafe },
  restaurant: { label: '식당·주점', fits: '한식·중식·일식·양식 식당, 고깃집, 분식, 주점, 포차', reviews: true, render: renderRestaurant },
  beauty: { label: '뷰티·살롱', fits: '미용실, 네일, 속눈썹, 피부관리, 왁싱, 스파, 마사지', reviews: true, render: renderBeauty },
  clinic: { label: '병원·약국', fits: '병원, 의원, 치과, 한의원, 동물병원, 약국', reviews: false, render: renderClinic },
  general: { label: '매장·서비스 일반', fits: '그 밖의 모든 업종 — 매장, 공방, 학원, 스튜디오, 수리·서비스업', reviews: true, render: renderGeneral },
};

export const TEMPLATE_KEYS = Object.keys(TEMPLATES);

/** 카카오 분류("음식점 > 카페 > 커피전문점")로 첫 추천 — AI 호출 전 기본값·AI 실패 시 폴백 */
export function guessTemplate(category = '', industry = ''): string {
  const s = `${category} ${industry}`;
  if (/카페|베이커리|제과|디저트|커피|브런치|찻집|빵/.test(s)) return 'cafe';
  if (/병원|의원|치과|한의원|약국|의료|클리닉|동물병원/.test(s)) return 'clinic';
  if (/미용|헤어|네일|피부|뷰티|왁싱|속눈썹|스파|마사지|에스테틱/.test(s)) return 'beauty';
  if (/음식점|식당|한식|중식|일식|양식|분식|주점|술집|고기|치킨|피자|포차|이자카야|요리/.test(s)) return 'restaurant';
  return 'general';
}

export function renderSite(template: string, m: SiteModel): string {
  return (TEMPLATES[template] || TEMPLATES.general).render(m);
}
