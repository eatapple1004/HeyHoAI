# Doppia — 백엔드 연결 핸드오프 (실테스트용)

작성 2026-06-08. 대상 브랜치 `feat/ux-monetization-v2` (PR #8). 현재 상태 = **프론트/플로우/수익화 UI는 mock으로 완성**(Doppia 리브랜딩 완료, 가격 단일소스화 완료). 아래는 **실데이터 E2E 테스트를 위해 백엔드가 연결해야 할 것**의 체크리스트.

## 0. 선행: .env 키
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / price IDs
- 이미지·영상 프로바이더 키 (Nano Banana/Gemini, FLUX, Runway, Kling 등 기존 엔진이 쓰던 것)
- `DATABASE_URL` (PRODUCT LAYER 신규 6테이블)
- `ANTHROPIC_API_KEY` (다국어 캡션 생성)

## 1. 인증·세션 (일부 완료)
- 개발자 auth(saas-login/회원가입/멀티테넌시)는 이미 머지됨.
- **할 일**: studio/billing/gallery가 지금 `localStorage`(`hh_credits`/`hh_plan`/`hh_first_seen`)를 단일 소스로 씀(`public/js/hh.js`). → **서버 세션의 실제 plan·credit·signup시각**으로 교체. `hh_first_seen`은 실제 가입 타임스탬프로(첫 24h 오퍼 윈도우 계산).

## 2. 크레딧 원장 + 실제 생성 엔진
- 현재 `studio.html`의 `generate()`는 **mock**(그라디언트 블록, 업로드는 FileReader 없이 무시). 결과 카드도 placeholder.
- **할 일**: 업로드(subject) → 기존 엔진(`src/images,videos,generate,visuals`) 연결, 결과 실제 렌더. 크레딧은 서버 원장에서 차감(generate/주간세트/리믹스). photo=◈2 / reel=◈6 / UGC=◈8 / 4K·HD·캡션·워터마크제거 애드온 비용은 UI에 이미 반영됨.

## 3. 가격 — 단일 소스 (중요)
- **모든 가격이 `public/js/pricing.js`의 `window.PRICING` 한 곳에서 나옴**(plans/packs/team/firstMonthOff). landing·billing·studio 전부 여기서 읽음.
- **할 일**: `PRICING`를 **`GET /api/pricing` 응답으로 대체**(또는 빌드시 주입). 그러면 실제 운영가 확정 시 서버 한 곳만 바꾸면 전 페이지 일관 반영.
- **실제 가격 확정 절차**: §6 costMeter로 건당 실원가(COGS) 수집 → 목표 마진으로 크레딧 단가·플랜가 세팅(구독 단가 < 팩 단가 유지=카니발 방지). 지금 숫자(Free10/Creator$19·250 / Pro$39·600 / Brand$79·1,400 / 팩 $0.10→0.063 / Team$199)는 **추정 placeholder**.

## 4. 게이팅 강제 (현재 UI-only)
프론트는 티어를 "권유"만 함. **서버에서 강제 필요**:
- 무료=첫 결과 1개만 워터마크 없음, 이후 워터마크 / 워터마크 제거는 유료
- 상업 라이선스 = Brand (다운로드/게시 시 권리 검증·발급)
- 브랜드킷·4K·다국어캡션 always-on = Pro+
- `recommendTier()`(studio.html)는 작업신호 기반 라우팅 로직 — 백엔드는 이 신호에 맞춰 실제 권한 부여만 하면 됨.

## 5. 결제·체크아웃
- `paywallTopup/paywallTopupSmall/paywallSub`(studio), `checkout()`(billing), 24h 50% 오퍼, auto top-up, cancel→pause, 화이트라벨/팀 "Join beta·Talk to sales" 전부 **mock 토스트** → Stripe Checkout/Customer Portal 연결. pause/cancel은 구독 상태 전이로.

## 6. 원가 로깅 (가격 확정의 근거)
- `src/studio/costMeter.js` 존재(순수함수: estimateJobCost·computeMargin·meterGeneration·GENERATION_COSTS_SQL).
- **할 일**: 실제 프로바이더 청구를 `PROVIDER_COSTS`에 넣고 generate마다 로깅 → 어떤 SKU가 적자인지·마진 파악 → §3 가격 확정에 사용.

## 7. 마켓플레이스·공급측 (mock 골격만)
- 셀러 온보딩 신청(marketplace `openSell`) → 실제 신청·심사 파이프라인 + 알림
- Creator Earnings(earnings.html) → 실제 사용량·정산·페이아웃(70/30), 크레딧→통화 환산
- 템플릿/가상모델 publish, Standard/Exclusive 라이선스 발급, 1st-party 모델 100% 수취

## 8. B2B
- Team: 좌석 과금·공유 풀·역할(business Team 탭, billing team-band) → 실제 seat 결제·SSO·인보이스
- White-label: 4티어 셀프 체크아웃(business pWl) + 마진 시뮬레이터 → 실제 워크스페이스 프로비저닝·도메인·테마
- API & Shopify: 키 발급·사용량 미터·Shopify 앱·카탈로그 벌크 생성

## 9. 후순위
- i18n 언어 스위처(영어 우선이라 보류; 캡션 다국어는 이미 작동). 통화 현지화·로컬 결제수단.
- v3 감사 잔여(독점 상한 SKU·광고사용권 카피·대형팩 단가·시각증거 등) → `docs/감사_v3_doppia_재감사.md`.

## 테스트 순서
1. .env 채우고 auth+크레딧 원장+generate 엔진 연결 → 무료 1회 생성 E2E
2. 게이팅 강제 + Stripe 결제(구독/팩/24h오퍼/pause) E2E
3. costMeter로 실원가 수집 → `/api/pricing`(=PRICING)로 운영가 확정
4. 마켓플레이스/B2B는 리드캡처부터 단계적
