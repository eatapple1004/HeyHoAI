# 🔌 백엔드/플랫폼 총지휘 — 세션 명령서

> 너는 **Doppia 백엔드/플랫폼 도메인 총지휘(orchestrator) 세션**이다. 작업 디렉터리 `~/HeyHoAI`, 브랜치 `feat/ux-monetization-v2`(PR #8). 세션끼리 메모리는 공유 안 되므로 **공유 백본 = 레포 파일시스템.** 이 도메인의 백본 체크리스트는 `docs/BACKEND_HANDOFF.md`이고, 이 도메인의 진행보드는 `docs/섹션명령서/backend/_STATUS.md`(아래 §3에서 생성)다.

## 0) 역할
프론트/UX가 mock으로 완성한 수익화·생성 플로우를 **실제 서버 진실(plan·credit·signup시각)** 위에서 돌아가게 만드는 PRODUCT LAYER 전체를 책임진다. 구체적으로 auth·세션, 서버 크레딧 원장, Stripe 결제(구독/팩/24h오퍼/pause), 게이팅 강제(워터마크·상업라이선스·Pro기능), `/api/pricing` 단일 가격소스, 그리고 이 전부를 떠받치는 DB 마이그레이션·인프라를 담당한다. 엔진(`src/images,videos,generate,visuals,publishing`)은 **건드리지 않고**, PRODUCT LAYER가 감싸서 user_id·크레딧·게이팅을 입힌다. 워커들이 만든 모듈을 수거·검증하고 `_STATUS.md`로 진행을 종합해 Chief(👑총최고관리자)에 보고한다.

## 1) 범위 & 책임 영역
백본 문서: **`docs/BACKEND_HANDOFF.md`**(§1~6 = 이 도메인 핵심), 보조 `docs/PRODUCT_STRUCTURE.md`(아키텍처·DB 6테이블·API 라우트), `HANDOFF.md`(§7 남은작업 권장순서).

이미 머지된 것(재사용·확장 대상):
- 인증: `src/auth/{auth.route.js,auth.controller.js,auth.service.js,password.js,token.js,user.repository.js}` — signup/login/logout/me + JWT 쿠키(`token`) 발급. 멀티테넌시 `users` 테이블 존재.
- 미들웨어: `src/middleware/{auth.js(requireAuth·requirePage),ownership.js(소유권 검증 7종),errorHandler.js}`.
- 설정: `src/config/index.js`(zod env 스키마 — `JWT_SECRET`,`DATABASE_URL`,`ANTHROPIC_API_KEY`,프로바이더 키. **`STRIPE_*`는 아직 없음 → 추가 대상**).
- 서버 진입: `src/index.js`(Express5 + cookie-parser, `/api/auth` 공개, 나머지 `/api/*`는 `requireAuth`). **`/api/pricing`·`/api/billing`·`/api/studio`·`/api/credits` 라우트 미장착.**
- DB: `src/db/{client.js,migrate.js}`. migrate.js에 기존 엔진 테이블 + `users`만 있음. **PRODUCT LAYER 신규 테이블(`credit_ledger,payments,subjects,recipes,render_jobs`)과 `generation_costs`는 미생성**(`generation_costs`는 `src/studio/costMeter.js`의 `GENERATION_COSTS_SQL`에 준비됨).
- 원가: `src/studio/costMeter.js`(estimateJobCost·computeMargin·meterGeneration, 순수함수, 미연결).

프론트 측 연결 대상(서버가 대체해야 할 mock):
- `public/js/hh.js` — 지금 `localStorage`(`hh_credits`/`hh_plan`/`hh_first_seen`)가 단일소스 → **서버 세션 값으로 교체**.
- `public/js/pricing.js`(`window.PRICING`) — landing·billing·studio 전부 이걸 읽음 → **`GET /api/pricing` 응답으로 대체**.
- `public/studio.html`(`generate()`,`recommendTier()`,`paywallTopup*`,`paywallSub`), `public/billing.html`(`checkout()`, 24h오퍼, auto top-up, cancel→pause).

명시적 비범위(이 도메인 아님): 프론트/UX 시각·카피(=UX 도메인), 레시피 시드 콘텐츠(=🎨템플릿 도메인), 배포·PG가맹·앱리스팅(=그로스 도메인), 마켓플레이스/B2B 정산·SSO(후순위, 리드캡처만 본 도메인 API 골격으로).

## 2) 하위(워커) 세션
워커는 **파일만 저장(commit/push 금지)**. 신규 PRODUCT LAYER 디렉터리는 `src/<name>/`로 만들고, 라우트는 `src/index.js`에 워커가 직접 `app.use(...)` 추가하되 머지 정합은 총지휘가 확인한다. 산출 모듈 옆에 `*.demo.js`(DB 없이 도는 순수 검증 데모)를 같이 남겨 총지휘가 수거 검증할 수 있게 한다.

**W1 · auth·세션 보강**
- 목적: 머지된 auth를 프론트 진실원으로 승격 — `/api/auth/me`가 `{plan, credits, first_seen, role}` 반환, `hh.js`의 localStorage를 서버 값으로 교체. `users`에 `plan`,`credits_balance`,`signup_at`(첫 24h오퍼 윈도우) 컬럼 추가.
- 산출물: `src/auth/auth.service.js`(me 확장), `src/auth/user.repository.js`(컬럼), `src/db/migrate.js`(users alter), `public/js/hh.js`(서버연동), `src/auth/session.demo.js`.
- 붙여넣기: "W1 auth·세션: `~/HeyHoAI`에서 `docs/BACKEND_HANDOFF.md` §1과 `src/auth/*`,`src/middleware/auth.js`,`public/js/hh.js`를 읽고, `/api/auth/me`가 서버의 plan·credits·signup_at을 반환하도록 보강하고 hh.js의 localStorage 단일소스를 서버 세션으로 교체해. users 컬럼은 migrate.js에 추가. 파일만 저장(commit 금지)."

**W2 · 크레딧 서버 원장**
- 목적: `credit_ledger` 테이블 + 원자적 차감/충전 서비스. generate/주간세트/리믹스에서 차감(photo=◈2/reel=◈6/UGC=◈8 + 4K·HD·캡션·워터마크제거 애드온). 잔액 부족 시 402. `costMeter.meterGeneration()`을 `generation_costs`에 적재.
- 산출물: `src/credits/{credit.service.js,credit.repository.js,credit.route.js}`, `src/db/migrate.js`(`credit_ledger`,`generation_costs`=costMeter `GENERATION_COSTS_SQL`), `src/credits/credit.demo.js`.
- 붙여넣기: "W2 크레딧원장: `~/HeyHoAI`에서 `docs/BACKEND_HANDOFF.md` §2·§6, `src/studio/costMeter.js`를 읽고 `src/credits/`에 원자적 차감/충전 원장 서비스와 `credit_ledger`·`generation_costs` 마이그레이션을 만들어. 잔액부족=402, photo◈2/reel◈6/UGC◈8+애드온 단가는 핸드오프 기준. 파일만 저장."

**W3 · 결제(Stripe)·웹훅**
- 목적: 구독·크레딧팩·24h 50%오퍼·auto top-up·cancel→pause를 Stripe Checkout/Customer Portal로. `payments` 테이블 + 웹훅(`/api/billing/webhook`, `STRIPE_WEBHOOK_SECRET` 검증)으로 구독 상태전이·팩 크레딧 적립을 W2 원장에 반영. `billing.html checkout()`·`studio paywall*` mock 대체.
- 산출물: `src/billing/{billing.service.js,billing.route.js,stripe.client.js,webhook.handler.js}`, `src/config/index.js`(`STRIPE_SECRET_KEY`,`STRIPE_WEBHOOK_SECRET`,price IDs zod 추가), `src/db/migrate.js`(`payments`), `src/billing/billing.demo.js`.
- 붙여넣기: "W3 결제Stripe: `~/HeyHoAI`에서 `docs/BACKEND_HANDOFF.md` §5, `public/billing.html`,`public/studio.html`의 checkout/paywall mock을 읽고 `src/billing/`에 Stripe Checkout·Customer Portal·웹훅(구독/팩/24h오퍼/pause)을 만들어. 웹훅은 서명검증 후 W2 크레딧원장 반영. STRIPE_* 키는 config zod에 추가. 파일만 저장."

**W4 · 게이팅·엔타이틀먼트**
- 목적: 프론트 "권유"를 서버 강제로. 미들웨어 `requireEntitlement(feature)` — 무료=첫 결과 1개만 워터마크 없음 이후 워터마크/제거는 유료, 상업라이선스=Brand(다운로드/게시 시 권리검증·발급), 브랜드킷·4K·다국어캡션 always-on=Pro+. `studio.html recommendTier()` 신호에 맞춰 실제 권한 부여.
- 산출물: `src/middleware/entitlement.js`, `src/entitlements/{entitlement.service.js,license.service.js}`, `src/entitlements/entitlement.demo.js`. (기존 `src/middleware/ownership.js` 패턴 따름)
- 붙여넣기: "W4 게이팅: `~/HeyHoAI`에서 `docs/BACKEND_HANDOFF.md` §4, `src/middleware/{auth.js,ownership.js}`,`public/studio.html`의 recommendTier를 읽고 `requireEntitlement(feature)` 미들웨어와 라이선스 발급 서비스를 만들어. 워터마크/상업라이선스/Pro기능을 서버에서 강제. 파일만 저장."

**W5 · API·/api/pricing**
- 목적: `window.PRICING`을 `GET /api/pricing` 응답으로 대체(plans/packs/team/firstMonthOff 단일소스). studio 오케스트레이터 `POST /api/studio/render`(subject×recipe→엔진 호출 + W2 차감 + costMeter 적재)와 라우트들을 `src/index.js`에 정합 장착.
- 산출물: `src/pricing/{pricing.route.js,pricing.data.js}`, `src/studio/{studio.service.js,studio.route.js}`, `src/index.js`(app.use 등록), `public/js/pricing.js`(fetch로 전환), `src/studio/studio.demo.js`.
- 붙여넣기: "W5 API·pricing: `~/HeyHoAI`에서 `docs/BACKEND_HANDOFF.md` §2·§3, `public/js/pricing.js`,`src/index.js`,`src/studio/costMeter.js`를 읽고 `GET /api/pricing`(=window.PRICING 형태)과 `POST /api/studio/render`(엔진연결+W2차감+costMeter적재)를 만들어 index.js에 등록하고 pricing.js를 fetch로 전환해. 파일만 저장."

**W6 · DB·인프라**
- 목적: PRODUCT LAYER 신규 6테이블 마이그레이션 통합(`users`확장,`credit_ledger`,`payments`,`subjects`,`recipes`,`render_jobs`,`generation_costs`), `.env.example`에 `STRIPE_*` 추가, `subjects` 업로드(multer)·제품 누끼 골격, PM2/헬스체크 점검. 워커별 migrate 조각을 충돌 없이 한 파일로 병합.
- 산출물: `src/db/migrate.js`(통합), `.env.example`, `src/subjects/{subject.route.js,subject.service.js}`(multer 업로드), `src/db/migrate.verify.js`(테이블 존재 점검).
- 붙여넣기: "W6 DB·인프라: `~/HeyHoAI`에서 `HANDOFF.md` §7, `docs/PRODUCT_STRUCTURE.md`, `src/db/migrate.js`를 읽고 PRODUCT LAYER 신규 6테이블+generation_costs를 migrate.js에 통합하고 .env.example에 STRIPE_* 추가, subjects 업로드(multer) 골격을 만들어. W1·W2·W3가 추가하는 컬럼/테이블과 충돌 없게 조율. 파일만 저장."

## 3) 공유 백본 / _STATUS
- **백본 = `docs/BACKEND_HANDOFF.md`** 의 §1~6을 이 도메인 체크리스트로 사용. 각 항목을 `done`/`pending`으로 추적.
- **이 도메인 보드 = `docs/섹션명령서/backend/_STATUS.md`**(아래 양식으로 총지휘가 생성·갱신).
- **자동 점검 스크립트(총지휘가 만들어 돌림): `scripts/check_backend.js`** — 다음을 정적/런타임 점검해 `_STATUS.md`를 갱신하고 exit 0(클린)/1(미완):
  1. 파일 존재: `src/{credits,billing,entitlements,pricing,studio,subjects}/*.route.js`, `src/middleware/entitlement.js`.
  2. 라우트 등록: `src/index.js`에 `/api/pricing`,`/api/billing`,`/api/credits`,`/api/studio` `app.use` 라인 grep.
  3. config: `src/config/index.js`에 `STRIPE_SECRET_KEY`·`STRIPE_WEBHOOK_SECRET` 존재.
  4. 마이그레이션: `src/db/migrate.js`에 `credit_ledger`,`payments`,`subjects`,`recipes`,`render_jobs`,`generation_costs` `CREATE TABLE` 존재.
  5. 프론트 전환: `public/js/pricing.js`에 `fetch('/api/pricing')`, `public/js/hh.js`에서 `localStorage` 단일소스 제거 여부.
  6. 데모: 각 워커 `*.demo.js`가 `node`로 에러 없이 실행.
- 빠른 수기 점검(스크립트 만들기 전):
  - `grep -rn "STRIPE_" src/config/index.js`
  - `grep -nE "credit_ledger|payments|subjects|render_jobs|generation_costs" src/db/migrate.js`
  - `grep -nE "/api/(pricing|billing|credits|studio)" src/index.js`
  - `grep -n "fetch('/api/pricing')" public/js/pricing.js`

## 4) Chief에 보고할 _STATUS 요약 형태
`docs/섹션명령서/backend/_STATUS.md`(스크립트 자동생성 헤더 + 표):
```
# 🔌 백엔드/플랫폼 현황 (자동: node scripts/check_backend.js)
도메인 진행: N/6 워커 done · 백본 §1~6: M/6 done

| 항목(BACKEND_HANDOFF) | 워커 | 상태 | 산출물 | 비고 |
|---|---|---|---|---|
| §1 인증·세션 | W1 | done/pending | src/auth/* · public/js/hh.js | me 확장·서버진실 |
| §2 크레딧 원장 | W2 | done/pending | src/credits/* | 402·costMeter적재 |
| §5 결제 Stripe | W3 | done/pending | src/billing/* | 웹훅 서명검증 |
| §4 게이팅 강제 | W4 | done/pending | src/middleware/entitlement.js | 워터마크·라이선스 |
| §3 /api/pricing | W5 | done/pending | src/pricing/* · studio.service | pricing.js fetch전환 |
| DB·인프라(6테이블) | W6 | done/pending | src/db/migrate.js · .env.example | STRIPE_* env |

## 블로커 / Chief 결정 필요
- (예) 운영가 확정 대기: costMeter 실원가 수집 후 §3 가격 세팅 — Chief 승인 필요
## E2E 게이트
- [ ] 무료 1회 생성 E2E  [ ] 게이팅+Stripe E2E  [ ] /api/pricing 운영가 반영
```
Chief에는 한 줄: `🔌 backend N/6 done, 블로커: <…>, E2E: <게이트 통과 여부>`.

## 5) 완료 기준(DoD) 체크리스트
- [ ] `node scripts/check_backend.js` → exit 0(파일·라우트·config·마이그레이션·데모 전부 통과).
- [ ] `npm run migrate`(또는 `migrate.verify.js`)로 신규 6테이블 + `generation_costs` 생성 확인.
- [ ] **§1** `/api/auth/me`가 서버 plan·credits·signup_at 반환, `hh.js`가 서버값 사용(localStorage 단일소스 제거).
- [ ] **§2** generate/세트/리믹스에서 서버 원장 차감(◈2/◈6/◈8+애드온), 잔액부족 402, costMeter→`generation_costs` 적재.
- [ ] **§5** Stripe Checkout/Portal로 구독·팩·24h오퍼·auto top-up·cancel→pause 동작, 웹훅 서명검증 후 원장 반영.
- [ ] **§4** 워터마크·상업라이선스(Brand)·Pro기능(브랜드킷/4K/다국어캡션)이 서버에서 강제(프론트 우회 불가).
- [ ] **§3** `GET /api/pricing`가 `window.PRICING` 형태로 응답, `pricing.js`가 fetch로 전환(가격 단일소스 일원화).
- [ ] E2E 2종 통과: ①무료 1회 생성 ②게이팅+Stripe(구독/팩/24h/pause). (BACKEND_HANDOFF "테스트 순서" 1·2)
- [ ] `.env`/시크릿 커밋 없음. 워커 산출은 도메인 총지휘가 git 정리, **최종 머지/릴리스는 Chief**(브랜치 `feat/ux-monetization-v2`, push는 사용자 승인, 강제푸시 금지).

## 6) 총지휘 세션 붙여넣기 문구
> "`~/HeyHoAI`에서 `docs/섹션명령서/backend/00_총지휘_백엔드.md`(이 파일)와 `docs/BACKEND_HANDOFF.md`를 읽고 🔌 백엔드/플랫폼 도메인 총지휘를 맡아. W1~W6 워커가 `src/{auth,credits,billing,entitlements,pricing,studio,subjects}` 와 `src/db/migrate.js`에 떨군 모듈을 수거하고, `scripts/check_backend.js`(없으면 §3 점검을 그 스크립트로 작성)로 검증해 `docs/섹션명령서/backend/_STATUS.md`를 갱신해. 블로커는 Chief에 한 줄 보고하고, 무료 1회 생성·게이팅+Stripe E2E가 통과하면 도메인 git을 정리해(머지는 Chief)."

## 7) 워커 세션 붙여넣기 문구 모음
- W1: "W1 auth·세션: `~/HeyHoAI`에서 `docs/BACKEND_HANDOFF.md` §1과 `src/auth/*`,`src/middleware/auth.js`,`public/js/hh.js`를 읽고 `/api/auth/me`가 서버 plan·credits·signup_at을 반환하도록 보강하고 hh.js의 localStorage 단일소스를 서버 세션으로 교체해. users 컬럼은 migrate.js에 추가. 파일만 저장(commit 금지)."
- W2: "W2 크레딧원장: `~/HeyHoAI`에서 `docs/BACKEND_HANDOFF.md` §2·§6, `src/studio/costMeter.js`를 읽고 `src/credits/`에 원자적 차감/충전 원장과 `credit_ledger`·`generation_costs` 마이그레이션을 만들어. 잔액부족=402, photo◈2/reel◈6/UGC◈8+애드온. 파일만 저장."
- W3: "W3 결제Stripe: `~/HeyHoAI`에서 `docs/BACKEND_HANDOFF.md` §5, `public/billing.html`·`public/studio.html`의 checkout/paywall mock을 읽고 `src/billing/`에 Stripe Checkout·Portal·웹훅(구독/팩/24h오퍼/pause)을 만들어. 웹훅 서명검증 후 W2 원장 반영, STRIPE_* 키는 config zod에 추가. 파일만 저장."
- W4: "W4 게이팅: `~/HeyHoAI`에서 `docs/BACKEND_HANDOFF.md` §4, `src/middleware/{auth.js,ownership.js}`·`public/studio.html`의 recommendTier를 읽고 `requireEntitlement(feature)` 미들웨어와 라이선스 발급 서비스를 만들어. 워터마크/상업라이선스/Pro기능 서버 강제. 파일만 저장."
- W5: "W5 API·pricing: `~/HeyHoAI`에서 `docs/BACKEND_HANDOFF.md` §2·§3, `public/js/pricing.js`·`src/index.js`·`src/studio/costMeter.js`를 읽고 `GET /api/pricing`과 `POST /api/studio/render`(엔진연결+W2차감+costMeter적재)를 만들어 index.js에 등록하고 pricing.js를 fetch로 전환해. 파일만 저장."
- W6: "W6 DB·인프라: `~/HeyHoAI`에서 `HANDOFF.md` §7·`docs/PRODUCT_STRUCTURE.md`·`src/db/migrate.js`를 읽고 PRODUCT LAYER 신규 6테이블+generation_costs를 migrate.js에 통합하고 .env.example에 STRIPE_* 추가, subjects 업로드(multer) 골격을 만들어. W1·W2·W3 추가분과 충돌 없게 조율. 파일만 저장."

---
**공통 규칙**: 조직 = 👑총최고관리자(Chief) → 도메인 총지휘들 → 워커 세션들. 세션끼리 메모리 비공유 → **공유 백본 = 레포 파일시스템**(각 도메인은 자기 _STATUS 보드를 가지며 Chief가 취합). git = **워커는 파일만 저장(commit/push 금지)**, 도메인 총지휘가 자기 도메인 git 정리, **최종 머지/릴리스는 Chief**. 브랜치 `feat/ux-monetization-v2`(mock 단계, push는 사용자 승인, 강제푸시 금지). 패턴 출처 = 🎨템플릿 총지휘(`docs/섹션명령서/00_총지휘_종합관리.md` — 워커 11 + `scripts/consolidate_recipes.js` + `_STATUS.md`)를 그대로 따른다. 현 상태 = 프론트/UX는 mock 대부분 완료, 백엔드·엔진은 미연결(`docs/BACKEND_HANDOFF.md` 대기), 그로스는 배포·PG가맹·리스팅 진행 중.
