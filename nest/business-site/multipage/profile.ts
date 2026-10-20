/**
 * 여러 페이지 사이트의 업종별 프로필 — 같은 엔진(라우터·페이지·점검·AI 시안)을 쓰고 말·페이지 구성·색만 바꾼다.
 *   corporate: 발주처·협력사가 보는 회사(제품 상세 페이지, 견적 문의)
 *   매장형(cafe·restaurant·beauty·clinic·general): 동네 손님이 보는 가게(메뉴·가격, 영업시간, 후기, 오시는 길)
 *   clinic 은 의료광고 규정 때문에 후기를 싣지 않는다(템플릿 reviews=false 와 같은 원칙).
 */

export type ProfileKey = 'corporate' | 'cafe' | 'restaurant' | 'beauty' | 'clinic' | 'general';

export interface SiteProfile {
  key: ProfileKey;
  /** 동네 매장형 — 영업시간·후기·메뉴 가격을 보여 준다 */
  store: boolean;
  /** 메뉴 묶음 이름(회사소개 / 매장 소개) */
  aboutMenu: string;
  /** about 페이지 제목 */
  aboutPage: string;
  /** about 페이지 정보 표 제목 */
  infoTitle: string;
  /** 제품 자리의 이름(제품 / 메뉴 / 시술·가격 …) */
  items: string;
  itemsAll: string;
  itemsHome: string;
  /** 제품마다 상세 페이지를 만드는가 — 메뉴 한 가지로는 페이지를 채울 자료가 없다(빈 페이지 금지) */
  itemDetail: boolean;
  /** 방문자 후기 페이지(Google 리뷰·블로그 링크) */
  reviews: boolean;
  /** 기본 행동 버튼 */
  cta: string;
  ctaTitle: string;
  ctaLead: string;
  contactLead: string;
  msgHint: string;
  interest: string;
  /** 문의 폼에 회사명 칸 */
  companyField: boolean;
  /** 개인정보 처리 목적 */
  purpose: string;
  /** 인사말 서명 앞 직함 */
  ceoTitle: string;
  /** AI에 주는 독자·문체 */
  audience: string;
  /** 사진 종류(AI가 붙인다) */
  photoKinds: string[];
  /** schema.org 형식 */
  ldType: string;
  theme: { bg: string; ink: string; steel: string; line: string; dark: string; display: string; fontHref: string };
}

const PLEX = { display: "'IBM Plex Sans KR',sans-serif", fontHref: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@500;600;700&display=swap' };
const GOWUN = { display: "'Gowun Batang',serif", fontHref: 'https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap' };
const MYEONGJO = { display: "'Nanum Myeongjo',serif", fontHref: 'https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@700;800&display=swap' };
const WARM = { bg: '#F7F4EF', ink: '#211D19', steel: '#6A6158', line: '#E4DDD3', dark: '#1A1612' };

const STORE_BASE = {
  store: true, aboutMenu: '매장 소개', aboutPage: '매장 이야기', infoTitle: '매장 정보', itemDetail: false,
  cta: '문의하기', ctaTitle: '방문 전에 궁금한 점이 있으신가요?', ctaLead: '전화나 문의 남기기로 편하게 물어보세요.',
  contactLead: '궁금한 점을 남겨 주시면 매장에서 확인 후 연락드립니다.', msgHint: '문의 내용을 적어 주세요.',
  companyField: false, purpose: '문의 응대', ceoTitle: '대표',
  audience: '동네 손님과 처음 찾아오는 손님(지도·검색에서 들어와 메뉴·영업시간·위치를 확인한다)',
  photoKinds: ['food', 'interior', 'exterior', 'people', 'other'],
};

export const PROFILES: Record<ProfileKey, SiteProfile> = {
  corporate: {
    key: 'corporate', store: false, aboutMenu: '회사소개', aboutPage: '회사 개요', infoTitle: '기업 정보',
    items: '제품', itemsAll: '전체 제품', itemsHome: '주요 제품', itemDetail: true, reviews: false,
    cta: '견적 문의', ctaTitle: '제품 사양과 견적이 궁금하신가요?', ctaLead: '용도와 운송 조건을 알려 주시면 담당자가 확인해 연락드립니다.',
    contactLead: '제품 사양·견적·납기 문의를 남겨 주시면 담당자가 확인 후 연락드립니다.', msgHint: '용도, 수량, 희망 납기 등을 적어 주시면 더 정확히 안내드릴 수 있습니다.',
    interest: '관심 제품', companyField: true, purpose: '제품·견적 문의 응대', ceoTitle: '대표이사',
    audience: '발주처·구매 담당자·협력사',
    photoKinds: ['product', 'factory', 'people', 'other'], ldType: 'Organization',
    theme: { bg: '#F3F4F5', ink: '#15191E', steel: '#5B6570', line: '#D6DADF', dark: '#0F1317', ...PLEX },
  },
  cafe: {
    ...STORE_BASE, key: 'cafe', items: '메뉴', itemsAll: '전체 메뉴', itemsHome: '대표 메뉴', reviews: true, interest: '관심 메뉴',
    ldType: 'CafeOrCoffeeShop', theme: { ...WARM, ...GOWUN },
  },
  restaurant: {
    ...STORE_BASE, key: 'restaurant', items: '메뉴', itemsAll: '전체 메뉴', itemsHome: '대표 메뉴', reviews: true, interest: '관심 메뉴',
    msgHint: '방문 날짜, 인원 등 궁금한 점을 적어 주세요.', ldType: 'Restaurant', theme: { ...WARM, ...GOWUN },
  },
  beauty: {
    ...STORE_BASE, key: 'beauty', items: '시술·가격', itemsAll: '전체 시술', itemsHome: '대표 시술', reviews: true, interest: '관심 시술',
    msgHint: '원하시는 시술과 희망 날짜를 적어 주세요.', ldType: 'BeautySalon',
    theme: { bg: '#F8F5F3', ink: '#231E1E', steel: '#6E6262', line: '#E7DEDB', dark: '#1C1717', ...MYEONGJO },
  },
  clinic: {
    ...STORE_BASE, key: 'clinic', aboutMenu: '병원 소개', aboutPage: '병원 소개', infoTitle: '병원 정보',
    items: '진료 안내', itemsAll: '전체 진료', itemsHome: '진료 과목', reviews: false, interest: '관심 진료',
    contactLead: '진료 시간·예약 관련 문의를 남겨 주시면 확인 후 연락드립니다. 증상 등 건강 정보는 적지 마세요.',
    msgHint: '문의 내용을 적어 주세요(증상·병력 등 건강 정보는 적지 마세요).', purpose: '진료 예약·문의 응대',
    audience: '진료를 알아보는 지역 주민(진료 과목·진료 시간·위치를 확인한다)', ldType: 'MedicalClinic',
    theme: { bg: '#F3F6F7', ink: '#152025', steel: '#55666E', line: '#D5DFE3', dark: '#0F1A1E', ...PLEX },
  },
  general: {
    ...STORE_BASE, key: 'general', items: '서비스', itemsAll: '전체 서비스', itemsHome: '주요 서비스', reviews: true, interest: '관심 서비스',
    photoKinds: ['product', 'interior', 'exterior', 'people', 'other'], ldType: 'LocalBusiness',
    theme: { bg: '#F5F5F3', ink: '#1C1D1F', steel: '#61646A', line: '#DDDEDB', dark: '#141517', ...PLEX },
  },
};

export const profileOf = (key?: string | null): SiteProfile => PROFILES[(key || '') as ProfileKey] || PROFILES.general;

/** 기획안에서 켜고 끄는 페이지 — 업종마다 다르다(이름은 화면·자료 요청서에 쓴다) */
export function planPages(p: SiteProfile): Record<string, string> {
  if (!p.store) return { ceo: '대표 인사말', history: '연혁', certifications: '인증·특허', products: '제품 소개(목록·상세)', location: '오시는 길', contact: '문의 폼' };
  return {
    ceo: '인사말', history: '연혁', products: p.items,
    ...(p.reviews ? { reviews: '방문 후기' } : {}),
    location: '오시는 길·영업시간', contact: '문의 폼',
  };
}
