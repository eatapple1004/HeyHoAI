# 📈 그로스/GTM — _STATUS (도메인 총지휘 보고 → Chief)

> 갱신 2026-06-10 · 브랜치 `feat/ux-monetization-v2` (PR #8) · 자동점검 `node scripts/check_gtm.js`
> 이번 사이클 범위(사용자 지시): **운영가 확정 반영(/api/pricing) · 배포 · PG가맹 · 스토어 리스팅** 4스트림을 워커로 분해.
> 철칙: **파일만 저장**(commit/push·실배포·실가맹·실등록 없음) · 가격 = **추정 placeholder 유지**(엔진 COGS 확정 전).

```
워커 4/4 OK · 운영가 /api/pricing: 코드 완료(추정값 유지) · 배포: 설정 완료(실배포 대기) · 가맹: 9% · 리스팅: 8%
서버 게이트 PASS · costMeter 적자 SKU 0 · 가격 단일소스 무결성: 신규누수 0(기존 debt 11줄 별도)
```

## 1) 스트림(워커) 산출 현황

| 스트림 | 워커 | 상태 | 핵심 산출물 | 진행 |
|---|---|---|---|---|
| 운영가 `/api/pricing` | W-운영가 | **OK** | `src/pricing/pricing.config.js`·`pricing.route.js`, `src/index.js` 마운트, `public/js/pricing.js` fetch+폴백, `docs/그로스/pricing_margin_model.md` | 코드 5/5 |
| 배포 | W-배포 | **OK** | `Dockerfile`·`.dockerignore`·`render.yaml`, `docs/그로스/deploy_runbook.md` | 설정 4/4 |
| PG가맹 | W-PG가맹 | **OK(문서)** | `docs/그로스/launch_merchant_checklist.md` (Stripe+국내PG 4사+컴플라이언스) | 체크리스트 5/54 |
| 스토어 리스팅 | W-리스팅 | **OK(문서)** | `docs/그로스/listing_shopify_appstore.md` (Shopify·iOS·Play) | 체크리스트 9/110 |

> 가맹·리스팅의 낮은 % 는 결함이 아니라 **신규 생성 문서의 초기 상태** — 완료 항목은 "코드/카피로 즉시 확정 가능했던 정합성 검수"에 한정. 나머지는 대부분 외부 서류·승인 의존(아래 §5).

## 2) 검증 결과 (총지휘 직접 실행)

**서버 모듈 무결성 — 전부 PASS**
- `node --check` : `index.js`·`pricing.config.js`·`pricing.route.js` 통과.
- `require('./src/pricing/pricing.config')` : `estimated=true`, plans=free,creator,pro,brand, packs=4, team$199 정상 반환.
- `/api/pricing` 마운트 확인: `src/index.js:83` `app.use('/api/pricing', require('./pricing/pricing.route'))` — `/api/auth` 다음, requireAuth 비즈니스 API보다 앞(공개).
- 프론트 폴백: `public/js/pricing.js`는 임베드 PRICING을 **동기 폴백**으로 유지 → `fetch('/api/pricing')` 성공 시에만 덮어쓰고 `applyDP()` 재실행. 정적 호스팅·오프라인 안전. `data-dp`/`get`/`fmt` 규약 보존.

**costMeter 마진(적자 SKU 가드) — 적자 0**

| SKU | 원가 | 매출 | 마진% |
|---|---|---|---|
| photo ◈2 | $0.04 | $0.20 | **80%** |
| reel ◈6 | $0.25 | $0.60 | **58%** |
| UGC ◈8 | $0.37 | $0.80 | **54%** |
| photo+4K | $0.07 | $0.20 | 65% |
| photo+caption | $0.043 | $0.20 | 78% |

> 전 SKU 흑자, 최저 UGC도 54% 헤드룸. 단 이 수치는 **costMeter 추정 단가** 기반 — 실프로바이더 청구 확정 시 재산정(§5 COGS).
> 카니발 방지(구독 환산 크레딧단가 < 팩 최저 $0.063): Brand 월$0.056/연$0.045 ✅, Pro 월$0.065(경계)/연$0.052 ✅, **Creator 월간 $0.076 > $0.063 (역전)** → 운영가 확정 시 보정 대상으로 기록(`pricing_margin_model.md`).

## 3) 가격 단일소스 무결성

- **이번 작업이 새로 만든 하드코딩 누수 = 0.** 신규 단일소스 `pricing.config.js`/`pricing.js`의 ◈250/◈600/◈1,400 문자열은 **단일소스 정의 그 자체**(의도된 SoT)이며 `.js`라 점검 grep(`public/*.html`) 범위 밖이라 비검출 — 정상.
- `check_gtm.js`가 검출한 **기존 누수 11줄**(exit 1 사유)은 전부 이번 범위 밖의 선존재 debt:
  - 진짜 SoT debt(우리 소유 페이지, data-dp 이관 필요): `studio.html:742-744`(PLANS 중복)·`313/322/327/784/788`(페이월 버튼 라벨)·`business.html:192`(Team $199)·`billing.html:168`(밴드 data 속성 79/63).
  - **오탐 1건**: `earnings.html:106` `rev:'$79'` = 셀러 대시보드 **목업 매출 데이터**(가격 표시 아님).
- 판정: **블로킹 아님**. 별도 정리 트랙으로 분리(아래 후속 제안).

## 4) 핵심 결정 (Chief 검토용)

1. **운영가 "확정"의 해석** = *메커니즘 확정, 숫자는 추정 유지*. `/api/pricing`를 서버 주도 단일소스로 만들되, 숫자는 기존 placeholder를 1:1 복제하고 `estimated:true`로 명시. 새 숫자 발명 없음(사용자 제약 + CLAUDE.md 준수).
2. **배포 타깃 = Render(Docker web + managed Postgres)** 기본, Fly.io 대안 병기. `autoDeploy:false`로 "실배포 금지" 정합. `@ffmpeg/*` dist가 `/vendor/ffmpeg`로 런타임 서빙되므로 **prune 금지**를 Dockerfile/런북/.dockerignore에 일관 반영.
3. **env 키 SoT = `src/config/index.js`(zod)**. `.env.example`과 드리프트 발견 → 런북 매핑표에 명시(아래 §5).
4. **가맹·리스팅 = 신청 메타 + 체크리스트 문서**로 완성, 실제 신청은 외부 서류·승인 의존이라 `(외부 대기)` 표기.
5. **리스팅 결제정책 리스크 명기**: iOS Guideline 3.1.1 / Google Play Billing → 디지털 크레딧·구독은 IAP 필수(수수료 15~30%) → 스토어별 가격표 별도 산정 필요(COGS·수수료 확정 후).

## 5) 블로커 / Chief 에스컬레이션

| # | 항목 | 영향 | 결정권 |
|---|---|---|---|
| B1 | **엔진 COGS 미확정** (BACKEND_HANDOFF §6 실원가 로깅 대기) | 운영가 "숫자" 확정 불가 → 현재 전 가격 `estimated` | 엔진/백엔드 총지휘 |
| B2 | **`/api/pricing`·`src/index.js`·`src/pricing/*` = 백엔드 도메인 인접** (HANDOFF §3 본래 백엔드 과업) | 추가·비파괴(공개 라우트 1줄 + 신규 디렉터리)지만 **머지 전 백엔드/Chief 리뷰 필요** | Chief 머지게이트 |
| B3 | **live doppia.ai 호스팅 방식 미확정** (CLAUDE.md: 현 라이브=옛/부분 배포, PR#8 미반영 → `public/` 통째 재배포 필요) | render.yaml은 Node 컨테이너 전제 — 현 호스팅이 정적이면 전략 상이 | **사용자 확인 필요** |
| B4 | `.env.example` ↔ `src/config/index.js` 드리프트 (KLING_API_KEY→ACCESS/SECRET, GEMINI 키 누락, KLING_MODEL v2→v3) | 배포 전 정합 안 하면 엔진 키 로드 실패 | 백엔드 총지휘 |
| B5 | 가맹·리스팅 외부 의존 (사업자등록·통신판매업신고·정산계좌·카드사심사·App 심사) | 일정 외부 통제 | 사용자(사업자 정보) |

## 6) 완료 기준(DoD) 대비

- [x] 운영가 `/api/pricing` 메커니즘: 서버 단일소스 + 라우트 + 프론트 하이드레이션 (숫자는 추정 유지) — `pricing_margin_model.md` 근거.
- [x] 배포 설정: Dockerfile·render.yaml·.dockerignore + 런북 (실배포 미수행).
- [x] PG가맹 체크리스트(Stripe+국내PG+컴플라이언스+신청메타) 문서화.
- [x] 스토어 리스팅(Shopify·iOS·Play 메타·카피·심사대응) 문서화.
- [x] `scripts/check_gtm.js` 자동점검 가동 (적자 SKU 0, 신규 누수 0).
- [ ] 가맹/리스팅 **실신청·승인** — 외부 대기(§5 B5).
- [ ] 실배포 — 호스팅 확정(§5 B3) + 사용자 push 승인 후.
- [x] **파일만 저장** — commit/push 없음.

## 7) 이번 사이클 파일 변경 (commit 미수행)

**신규 코드** · `src/pricing/pricing.config.js` · `src/pricing/pricing.route.js`
**수정 코드** · `src/index.js`(+1 마운트) · `public/js/pricing.js`(+fetch 하이드레이션, estimated)
**배포 설정(신규)** · `Dockerfile` · `.dockerignore` · `render.yaml`
**문서(신규)** · `docs/그로스/pricing_margin_model.md` · `docs/그로스/deploy_runbook.md` · `docs/그로스/launch_merchant_checklist.md` · `docs/그로스/listing_shopify_appstore.md`
**점검 스크립트(신규)** · `scripts/check_gtm.js`
**보고(이 파일)** · `docs/세션조직/_STATUS_growth.md`

## 8) 후속 제안 (다음 사이클)

1. **단일소스 debt 정리**(별도 트랙): `studio.html` PLANS/페이월 라벨·`business.html` Team·`billing.html` 밴드 data 속성을 `window.PRICING`/`data-dp`로 이관 → `check_gtm.js` exit 0.
2. B3 호스팅 방식 사용자 확정 → 실배포 절차(런북 §도메인/DNS 활성화).
3. B1 COGS 확정 시 `pricing.config.js` **한 곳** 갱신 → 전 페이지·스토어 가격표 재산정(Creator 월간 역전 보정 포함).
