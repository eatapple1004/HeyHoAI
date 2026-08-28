# GENOVA HONORS — 기업 홈페이지

`홈페이지 기획안.docx` (31개 항목) 기준으로 제작한 **건설기업 코퍼레이트 사이트**입니다.
빌드 도구 없이 순수 HTML / CSS / JS 로 구성되어 파일만 열면 동작합니다.

## 로컬 실행

```bash
cd genova-honors
python3 -m http.server 5501
# → http://localhost:5501
```

## 이전 버전과의 관계

| 폴더 | 내용 | 상태 |
|---|---|---|
| `../songdo-jacknicklaus/` | 송도 잭니클라우스 **단일 분양 랜딩** (이전 작업) | 그대로 보존. 참고용 |
| `genova-honors/` | **제노바 아너스 기업 홈페이지** (현재) | 기획안 반영본 |

이전 사이트는 삭제하지 않았습니다. 확인 후 필요 없으면 지우셔도 됩니다.

## 페이지 구성 (기획안 30. 최종 사이트맵)

```
index.html               HOME
about.html               ABOUT — Vision / What we do / Values / CEO / History
business.html            BUSINESS — 5개 사업영역
construction.html        CONSTRUCTION — 6단계 프로세스 / Before·During·After / 관리체계
projects.html            PROJECTS — 포트폴리오 (필터)
project-songdo.html      PROJECT DETAIL — 송도 잭니클라우스 케이스 스터디
news.html                NEWS (필터)
contact.html             CONTACT — 문의 4종 + 폼
```

## 기획안 대비 반영 내역

| 기획안 | 반영 |
|---|---|
| 01 · 31 | 송도를 **대표 프로젝트 1개**로 격하, 기업 홈페이지로 재구성 |
| 02 | 컨셉 `BUILDING VALUE. CREATING LIFESTYLE.` → about 비전 섹션 |
| 03 | TRUST·QUALITY·DESIGN·CONSTRUCTION·VALUE → about 브랜드 밸류 5종 |
| 05 · 27 | HERO `BUILDING THE FUTURE` + `SCROLL TO EXPLORE` |
| 06 | WHAT WE DO / HOW WE BUILD / WHAT WE VALUE 3단 구성 |
| 07 | 사업영역 5종 카드 |
| 08 | 6단계 프로세스 타임라인 |
| 10~16 | 송도 프로젝트를 5개 STORY + 갤러리로 재구성 |
| 17 | **BEFORE · DURING · AFTER** 3단 구성 |
| 18 | QUALITY / SAFETY / TECHNOLOGY / ENGINEERING / MANAGEMENT |
| 19 | 포트폴리오형 대형 이미지 + hover 시 프로젝트명·메타 노출 |
| 20 | VISION → BUSINESS → CAPABILITY → PROJECTS → PEOPLE → CONTACT 순서 |
| 21 · 22 | 연혁 타임라인, CEO 메시지 (자리만, 실제 자료 필요) |
| 23 · 24 · 25 | NEWS / 문의 4종 / 푸터 |
| 26 | Deep Navy + Charcoal + Champagne Gold |
| 29 | **분양 관련 요소 전면 제거** (아래 참조) |
| 31 | 다국어 구조 (KO/EN 완성, ZH/JA 확장 준비) |

### ⚠️ 기획안 29번에 따라 삭제한 것

이전 사이트에 있던 아래 요소는 "부동산·분양 홈페이지처럼 보이는" 항목이라 **전부 제거**했습니다.

- 분양가표 (토지가격 / 건물가격 / 공급가액 / 부가세 / 총 분양가 $5,200,000)
- 분양 면적표 (대지·전용·주차·계약면적)
- "분양 정보 보기", "프라이빗 투어 신청", "분양 문의" CTA
- "송도 최고의 프리미엄 주거" 류 카피

> 분양 정보가 별도로 필요하시면 기업 홈페이지가 아닌 **별도 분양 페이지**로 분리하는 편이 기획 의도에 맞습니다. 기존 `songdo-jacknicklaus/` 폴더가 그 역할을 그대로 할 수 있습니다.

## 구조

```
assets/
├── css/style.css      디자인 토큰 → 컴포넌트 → 한국어 타이포 → 반응형
└── js/
    ├── i18n.js        번역 사전(KO/EN) + 언어 엔진
    ├── layout.js      공통 헤더·푸터·아이콘 스프라이트 (여기만 고치면 8페이지 전체 반영)
    └── main.js        스크롤/메뉴/필터/라이트박스/폼
```

**스크립트 순서 고정** — `i18n.js` → `layout.js` → `main.js`.
layout.js 가 헤더를 주입한 뒤 main.js 가 그 요소를 잡습니다.

### 메뉴 수정
`layout.js` 상단 `NAV` 배열만 고치면 헤더·푸터가 함께 바뀝니다.

### 문구 수정
`i18n.js` 의 `ko` / `en` 사전에서 해당 키만 수정. HTML 은 건드릴 필요 없습니다.

### 언어 추가 (중국어 / 일본어)
1. `i18n.js` 에 `zh: { ... }` 를 `en` 과 **같은 키**로 추가
2. `layout.js` 의 `LANGS` 배열에서 해당 줄 주석 해제

현재 KO/EN 각 **약 300개 키**가 양쪽에 모두 존재합니다 (누락 0건 검증 완료).

## 이미지 현황

`assets/img/projects/songdo/` — 25장. 모두 **제공받은 브로슈어 PDF에서 추출한 참고용 시안**입니다
(400dpi 렌더 후 문구 없는 영역만 크롭).

기획안 마지막 `IMAGE REFERENCE 가이드`에 따라, **실제 사진이 없는 자리는 다른 사진으로 채우지 않고
플레이스홀더로 비워 두었습니다.** 클라이언트에게 무엇이 필요한지 그대로 보이도록 한 의도입니다.

플레이스홀더가 들어간 위치:
- `construction.html` — Before(설계) / During(**시공 현장**)
- `about.html` — CEO 사진
- `project-songdo.html` — 갤러리 `시공 현장` 카테고리
- `projects.html`, `index.html` — 추가 프로젝트 슬롯

## 받아야 할 자료 (우선순위)

1. **시공 현장 사진** — 기획안 17·29번의 핵심. 이게 없으면 시행사로 보입니다
2. 회사 기본 정보 — 주소 / 대표전화 / 이메일 (현재 `— 입력 필요 —` 표시)
3. 실제 회사 연혁 (현재 2020~2025 예시)
4. CEO 메시지 원문 + 사진
5. 보유 기술 / 면허 / 특허 / 인증 / 시공능력평가 → `construction.html` 관리체계 수치화
6. 프로젝트별 고해상도 원본 (외관 1 + 시공현장 1 + 내부/디테일 1 이상)
7. HOME HERO 용 초광각 대표 이미지 (16:9 이상)

## 남은 작업

- [ ] 문의 폼 백엔드 연결 — `main.js` 의 `TODO: 백엔드 연결`
- [ ] NEWS 상세 페이지 (현재 목록만)
- [ ] 개인정보처리방침 페이지
- [ ] OG 이미지 / favicon / sitemap.xml
- [ ] 이미지 webp 변환 + `loading="lazy"`
- [ ] 기획안 04번엔 `DESIGN(건축·디자인)` 메뉴가 있으나 30번 최종 사이트맵엔 없어 **제외**했습니다. 필요 시 `layout.js` NAV 에 추가

## 검증 완료

8개 페이지 전체에 대해 헤드리스 크롬으로 확인:
번역 키 누락 0 · 빈 텍스트 0 · 깨진 이미지 0 · 가로 스크롤 0 · 헤더/푸터 주입 정상
