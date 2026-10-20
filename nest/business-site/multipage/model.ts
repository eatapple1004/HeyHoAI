/**
 * 여러 페이지 기업 사이트 — 렌더에 쓰는 모델.
 *   content(JSON, AI가 쓰고 관리자가 고침) + facts(수집 자료) + 사진 목록을 합쳐 서비스가 만든다.
 *   ⚠️ 사실 정보(주소·전화·연혁·수치·사양)는 수집 자료·회사 자료에 있던 것만 들어온다 — 템플릿은 지어내지 않는다.
 */

import { SiteProfile } from './profile';

export interface CorpPhoto { url: string; caption?: string; kind?: string; credit?: string; creditUri?: string }

export interface CorpProduct {
  id: string;
  name: string;
  category?: string;
  /** 목록 카드용 한두 문장 */
  summary?: string;
  /** 상세 소개(문단은 빈 줄) */
  body?: string;
  features?: { title: string; body?: string }[];
  /** 사양표 — 회사 자료에 적힌 값만 */
  specs?: { k: string; v: string }[];
  /** 대표 사양 한 줄(카드·상단) */
  keySpec?: string;
  /** 가격(매장형 메뉴) — 회사 자료·관리자 메모·기존 홈페이지에 적힌 것만 */
  price?: string;
  photos: CorpPhoto[];
}

export interface CorpCategory { id: string; name: string; summary?: string }

export interface CorpReview { author: string; authorUri?: string; text: string; rating?: number; when?: string }

export interface CorpSite {
  name: string;
  /** 업종 프로필 — 말·페이지 구성·색 */
  profile: SiteProfile;
  /** 이 사이트의 경로 앞부분 — 공개 `/site/<slug>`, 미리보기 `/admin-business/<id>/site/preview` (도메인 연결 시 '') */
  base: string;
  /** 검색엔진용 절대 주소 앞부분 */
  origin: string;
  preview: boolean;
  accent: string;
  headline: string;
  sub: string;
  ctaLabel: string;
  stats: { value: string; label: string; note?: string }[];
  highlights: { title: string; body: string }[];
  aboutTitle: string;
  about: string;
  ceo?: { title?: string; body: string; name?: string };
  history: { year: string; text: string }[];
  certifications: string[];
  categories: CorpCategory[];
  products: CorpProduct[];
  company: { ceo?: string; founded?: string; fax?: string; email?: string; bizNo?: string; address?: string; phone?: string };
  facts: { address: string; phone: string; lat?: number; lng?: number; kakaoUrl?: string; googleUrl?: string; rating?: number; ratingCount?: number };
  /** 영업시간(Google, "월요일: 오전 9:00~오후 9:00") — 없으면 [] */
  hours: string[];
  /** 방문 후기(Google, 작성자 표기) — 프로필이 후기를 안 쓰면 [] */
  reviews: CorpReview[];
  /** 블로그 후기 링크(네이버) — 글은 옮기지 않고 링크만 */
  blogs: { title: string; link: string; blogger?: string }[];
  heroPhoto?: CorpPhoto;
  aboutPhoto?: CorpPhoto;
  gallery: CorpPhoto[];
  seoDescription: string;
  /** 사진 출처 표기(Google 등) */
  credits: { name: string; uri?: string }[];
}
