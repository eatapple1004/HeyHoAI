# HeyHoAI Studio — 개발자 핸드오프

> 인계 시점: 2026-06-07 · 목표 출시: 2026-06-11(목)
> 한 줄 요약: 기존 HeyHoAI 엔진(이미지/영상 생성)을 **셀프서비스 콘텐츠 SaaS**로 재포장하는 프로젝트. **프론트엔드 8페이지 + 수익화 UI는 완성(UI+mock)**, 남은 일은 **백엔드 연결**.

---

## 1. 지금 바로 화면 보기 (백엔드 불필요)

정적 프리뷰 — `public/`을 그대로 서빙하면 모든 UI가 mock으로 동작합니다.

```bash
cd HeyHoAI
python3 -m http.server 4173 --directory public
# → http://localhost:4173/landing.html
```

페이지: `landing · login · studio · gallery · billing · marketplace · affiliate · business`
(상단 nav로 서로 연결됨)

---

## 2. 풀 앱 실행 (백엔드 연결 후)

```bash
npm install
cp .env.example .env      # 키 채우기 (아래 3번)
npm run migrate           # DB 스키마 생성 (src/db/migrate.js)
npm start                 # node src/index.js  (dev: npm run dev)
```

Node/Express + PostgreSQL. PM2 스크립트도 있음(`npm run pm2:start`).

---

## 3. 필요한 환경변수 (`.env.example` 참고)

| 키 | 용도 |
|---|---|
| `DATABASE_URL` | PostgreSQL |
| `ANTHROPIC_API_KEY` | Claude (캡션/번역, 레시피 확장) |
| `REPLICATE_API_TOKEN` / `FAL_API_KEY` | 이미지 생성 (FLUX 등) |
| `RUNWAY_API_KEY` / `KLING_API_KEY` / `MINIMAX_API_KEY` | 영상 생성 |
| `OPENAI_API_KEY` | (옵션) GPT Image |
| `ZERNIO_API_KEY` | 인스타 게시 |
| `STRIPE_*` | 결제/구독 (현재 .env.example에 미포함 — 추가 필요) |

> ⚠️ `.env`는 `.gitignore`에 있음 — **절대 커밋 금지**.

---

## 4. 폴더 구조

```
public/            프론트 8페이지 (완성, UI+mock)
  css/theme.css    공유 디자인시스템 (?v= 캐시버스트)
  landing/login/studio/gallery/billing/marketplace/affiliate/business.html
  (index.html 등은 기존 관리자 페이지 = 내부 운영툴, 그대로 유지)
src/
  images/ videos/ generate/ visuals/ characters/ publishing/   ← 엔진(기존, 건드리지 말 것)
  recipes/         레시피 리졸버 + 시드 (recipeResolver.js, resolve.demo.js)
  studio/          costMeter.js (생성당 원가/마진) + demo
  db/ config/ middleware/ lib/
docs/
  PRODUCT_STRUCTURE.md     아키텍처 · DB 6테이블 · API 라우트 · 생성 흐름
  TEMPLATE_STRUCTURE.md    레시피(템플릿) 스키마 설계
  UI_기능설명서.md          ★ 모든 화면 기능 + mock/동작 구분 (먼저 읽으세요)
```

---

## 5. 꼭 먼저 읽을 문서 (순서)

1. **`docs/UI_기능설명서.md`** — 화면에 뭐가 있고, 무엇이 실제 동작(⚙️)이고 무엇이 mock(🔸)인지. **부록 B에 "mock→실제 연결에 필요한 것" 매핑표** 있음.
2. **`docs/PRODUCT_STRUCTURE.md`** — 레이어 아키텍처, 신규 DB 6테이블, API 라우트, studio.render 생성 흐름.
3. **`docs/TEMPLATE_STRUCTURE.md`** — 레시피 JSON 스키마(A2 레이어 + A5 샷리스트).

---

## 6. 아키텍처 원칙

```
FRONT(public) ─REST/api─> PRODUCT LAYER(신규) ─내부호출─> ENGINE(기존, 재사용)
```
- **엔진(`src/images,videos,generate,visuals,publishing`)은 건드리지 않는다.** PRODUCT LAYER가 감싸 user_id·크레딧·양식을 입힘.
- PRODUCT LAYER 신규 디렉터리(만들 것): `auth/ billing/ subjects/ recipes/ studio/`.

---

## 7. 남은 작업 (권장 순서)

1. **auth** — 회원가입/로그인(JWT) + `authMiddleware`. (login.html의 mock 제출을 실 API로)
2. **DB 마이그레이션** — 신규 6테이블(`users, credit_ledger, payments, subjects, recipes, render_jobs`) + `generation_costs`(costMeter에 SQL 준비됨). 기존 6테이블 재사용.
3. **studio 오케스트레이터** — `studio.service`가 subject×recipe로 엔진 호출 + 크레딧 차감 + `costMeter.meterGeneration()` 적재. (studio.html 생성바의 비용 로직과 1:1 매칭)
4. **billing/Stripe** — 구독·크레딧팩·자동충전·pause (billing.html UI와 매칭).
5. **recipes 시드** — 레시피 30~40종 시드(`src/recipes/seeds/`) + QA.
6. **subjects** — 파일 업로드(multer) + 제품 누끼.

---

## 8. 개발 규칙

- 테스트 중에는 **`main`에 직접 커밋/푸시 금지** — 기능 브랜치 + PR로.
- 시크릿은 `.env`로만 (커밋 금지).
- 프론트는 "UI-first → 백엔드 끼우기" 패턴 유지 (mock 자리에 실 API).
