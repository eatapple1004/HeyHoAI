# Doppia — 결제 가맹 런치 체크리스트 (Stripe 글로벌 + 국내 PG)

작성 2026-06-10. 대상 브랜치 `feat/ux-monetization-v2` (PR #8). 도메인 `doppia.ai`.
제품: 셀카/제품 1장 → 템플릿 → 스튜디오급 사진·릴스 SaaS (디지털 콘텐츠/SaaS).

> ⚠️ **실신청 금지 — 파일만.** 이 문서는 가맹 신청 준비용 체크리스트·메타데이터다. 실제 계정 개설·가맹 신청·서류 제출은 하지 않는다.
>
> ⚠️ **가격은 전부 추정(estimated) placeholder.** 엔진 실원가(COGS)는 `src/studio/costMeter.js`로 수집 후 확정한다(`docs/BACKEND_HANDOFF.md` §3·§6). 가격 단일소스 = `public/js/pricing.js`(`window.PRICING`). 이 문서의 숫자는 그 값을 그대로 옮긴 것이며 새 숫자를 발명하지 않는다.
>
> **현재 결제 UI 상태**: `billing.html`의 `checkout()`, `studio.html`의 `paywallTopup`/`paywallTopupSmall`/`paywallSub`, 24h 50% 첫달 오퍼, auto top-up, pause/cancel은 전부 **mock 토스트**다. Stripe Checkout / Customer Portal 연결 대기 (`docs/BACKEND_HANDOFF.md` §5).

---

## 진행률 산출 규칙
체크박스 `- [ ]`(미완) / `- [x]`(완료)의 개수로 진행률을 계산한다.
`checklistDone` = `- [x]` 개수, `checklistTotal` = `- [ ]` + `- [x]` 합계.
외부 승인·서류 의존 항목은 본문에 **(외부 대기)**로 표기하며, 우리가 통제할 수 없으므로 사전준비가 끝나도 `- [ ]`로 둔다.

---

## 1. Stripe (글로벌 — USD 기준)

### 1.1 계정 개설·KYC
- [ ] Stripe 계정 개설 **(외부 대기 — 실가입 금지, 본 문서로 준비만)**
- [ ] 사업자(법인/개인사업자) 정보 입력: 상호·사업자등록번호·주소 **(외부 대기 — 사업자번호 미정)**
- [ ] 대표자(representative) 신원: 성명·생년월일·주소 **(외부 대기)**
- [ ] 은행 정산계좌 등록(USD 수취·국내 원화 정산 경로 확인) **(외부 대기)**
- [ ] 사업 카테고리 = SaaS / 디지털 콘텐츠(software, digital goods)로 신고
- [ ] 사이트 URL `doppia.ai` · 환불정책·약관·개인정보처리방침 링크 노출(심사 요건) — §4와 연결

### 1.2 제품·Price 객체 (가격은 추정 placeholder, 단일소스=pricing.js)
> 모든 금액은 `window.PRICING` 기준. 운영가 확정 시 `pricing.js` 한 곳만 바꾸고 Stripe Price ID를 재발급한다.
- [ ] 구독 Product 4종 + Price 객체(월/연 각각, 추정):
      - Free $0 / ◈10 (one-time, 결제 불필요 — 무료 게이트)
      - Creator $19/mo · 연 $15/mo 환산($180/yr) / ◈250/mo
      - Pro $39/mo · 연 $31/mo 환산($372/yr) / ◈600/mo (featured · Most popular)
      - Brand $79/mo · 연 $63/mo 환산($756/yr) / ◈1,400/mo (Commercial license)
- [ ] 일회성 크레딧 팩 Price 4종(추정): ◈50/$5($0.10) · ◈200+20/$18($0.082) · ◈500+80/$40($0.069) · ◈1,500+250/$110($0.063 best value)
- [ ] Team 플랜(추정): $199/mo · 3 seats 포함 · 공유 풀 ◈2,000 · 추가 좌석 +$15/seat
- [ ] 첫 결제 24h 50% 오퍼: `firstMonthOff=50` → Stripe Coupon(50% off, first invoice/once) 또는 별도 할인 Price
- [ ] 월/연 cycle 토글(`billing.html` `setCycle`)을 Price 분기로 매핑(연간 SAVE 20% 표기 정합)

### 1.3 Checkout · Customer Portal
- [ ] Stripe **Checkout** 세션 생성 API: `billing.html` `checkout('plan'|'pack', label)` mock → 실세션으로 교체
- [ ] `studio.html` paywall 3종 연결: `paywallTopupSmall`(◈50/$5) · `paywallTopup`(◈220/$18) · `paywallSub`(추천 플랜 구독) → Checkout
- [ ] **Customer Portal** 활성화(플랜 변경·결제수단·인보이스·해지 셀프서비스)
- [ ] auto top-up(`billing.html` `topupSw`/`topupCfg`): 임계치 미만 시 팩 자동결제 → off-session 결제(SetupIntent로 카드 사전저장) 설계
- [ ] 성공/취소 redirect URL · 세금·VAT 표기 설정

### 1.4 구독 상태 전이 (pause / cancel)
- [ ] **Pause**(`pauseFlow`): Stripe `pause_collection`으로 청구 중단·계정/갤러리/학습얼굴 유지 → 상태 `paused`
- [ ] **Cancel**(`reallyCancel`): `cancel_at_period_end` 우선 제안, 즉시 해지 시 `canceled` → 갤러리·얼굴 보존, 월 크레딧·워터마크제거·Pro 기능 중단
- [ ] Resume: paused → active 복귀 경로
- [ ] 상태별 서버 게이팅(워터마크/상업 라이선스/4K/다국어캡션 always-on)과 동기화(`docs/BACKEND_HANDOFF.md` §4)

### 1.5 Webhook
- [ ] Webhook 엔드포인트 등록 + `STRIPE_WEBHOOK_SECRET`(`.env`, `docs/BACKEND_HANDOFF.md` §0)
- [ ] 결제 성공: `checkout.session.completed` / `invoice.paid` → 크레딧 원장 적립·plan 갱신
- [ ] 결제 실패: `invoice.payment_failed` → dunning·리트라이·알림
- [ ] 구독 변경: `customer.subscription.updated` / `deleted` → pause/cancel/plan 전이 반영
- [ ] 팩 결제: `payment_intent.succeeded` → 일회성 크레딧 적립
- [ ] 서명 검증(signature verify) · 멱등성(idempotency) 처리

### 1.6 세금 · 인증 · 환불/분쟁
- [ ] **Stripe Tax** 활성화(VAT/GST/US sales tax 자동 계산) — 가격 VAT 포함/별도 정책은 §4와 일치
- [ ] **SCA · 3DS**(EU 등) 대응 — Checkout 기본 지원, off-session(auto top-up) 시 인증 예외 처리
- [ ] 환불 절차 정의(전액/부분, 미사용 크레딧 처리 기준)
- [ ] 분쟁/차지백(chargeback) 대응 절차·증빙(이용내역·약관 동의 로그) 준비 **(외부 대기 — 분쟁 발생 시 카드사/Stripe 심사)**

---

## 2. 국내 PG (원화 KRW 카드결제)

### 2.1 PG사 비교 (정기결제 빌링키 / 수수료 / 심사기간 — 일반 공개정보 기준, 실계약 시 재확인 필요)

| PG | 정기결제(빌링키) | 카드 수수료(영세~일반, 추정 범위) | 심사기간(추정) | 비고 |
|---|---|---|---|---|
| 포트원(아임포트) | 지원(다수 PG 연동 게이트웨이) | 연동 PG에 따름 | 연동 PG 심사에 종속 | 멀티 PG 추상화 SDK, 해외/국내 병행에 유리 |
| 토스페이먼츠 | 지원(빌링/자동결제) | 약 1.8~3.x% 대(가맹등급별) | 약 1~2주 | 개발자 문서·SDK 정비 양호 |
| NHN KCP | 지원(정기결제) | 약 1.8~3.x% 대 | 약 1~2주 | 전통 PG, SaaS 정기결제 레퍼런스 다수 |
| 나이스페이먼츠 | 지원(빌링키) | 약 1.8~3.x% 대 | 약 1~2주 | 전통 PG, 안정성 |

> 수수료·심사기간 수치는 **추정 범위 placeholder**다(가맹점 등급·업종·매출규모로 변동). 실계약 견적으로 확정. 디지털콘텐츠/SaaS 정기결제 가능 여부·해외카드 수용 여부를 각 사에 별도 확인.

- [ ] 위 표 기준 1차 후보 선정(국내 원화 정기결제 + 해외카드 병행 가능성 우선)
- [ ] 선정 PG 빌링키(정기결제) 연동 사양 확인
- [ ] Stripe(글로벌 USD)와 역할 분담 결정(예: 해외=Stripe / 국내 원화=국내 PG, 또는 포트원으로 통합 추상화)

### 2.2 가맹 제출서류 (전형적 요구 서류 — 실제 목록은 PG/카드사별 상이)
- [ ] 사업자등록증 사본 **(외부 대기 — 사업자등록 미완)**
- [ ] 통신판매업 신고증 **(외부 대기 — 신고 필요)**
- [ ] 대표자 신분증 사본 **(외부 대기)**
- [ ] 정산(입금) 계좌 통장 사본 **(외부 대기)**
- [ ] 사이트 심사용 URL(`doppia.ai`): 상품·가격·환불정책·약관·사업자정보 표시 페이지 **(외부 대기 — PG 심사)**

### 2.3 카드사 가맹 승인
- [ ] PG 접수 후 카드사 가맹 심사·승인 **(외부 대기 — 카드사별 심사, 통상 수일~2주)**
- [ ] 정기결제(빌링) 승인 별도 확인 **(외부 대기)**
- [ ] 한도/리스크 등급에 따른 보증·예치 조건 확인 **(외부 대기)**

---

## 3. 공통 컴플라이언스 (국내 기준)

- [ ] **전자상거래법** 기반 환불/취소 정책 수립(청약철회 기준·디지털콘텐츠 예외·미사용 크레딧 처리)
- [ ] **이용약관** 작성·게시 (구독·크레딧 소멸·자동갱신 고지)
- [ ] **개인정보처리방침** 작성·게시
- [ ] **가격 VAT 표기 정책 확정**: 포함(VAT included) vs 별도(+VAT) — 표시 카피 통일
- [ ] **영수증 / 세금계산서 / 현금영수증** 발급 경로(국내 PG 연동·B2B Team 인보이스)
- [ ] **결제수단 노출** 정책(카드·간편결제 등) 및 보안 문구("Payments secured by Stripe" 등) 정합
- [ ] 사업자정보(상호·대표자·사업자번호·주소·통신판매업번호·연락처) 푸터/별도 페이지 표기 **(외부 대기 — 사업자정보 미정)**
- [ ] 자동결제(정기구독·auto top-up) 사전 동의·갱신 전 고지 플로우

---

## 4. 신청 메타데이터 (placeholder)

가맹 신청서·심사에 들어갈 항목. 미정값은 명시.

- 사이트 URL: `https://doppia.ai`
- 상호 / 법인명: **미정 (TBD)**
- 사업자등록번호: **미정 (TBD)**
- 통신판매업 신고번호: **미정 (TBD)**
- 대표자명: **미정 (TBD)**
- 사업장 주소: **미정 (TBD)**
- 정산 계좌: **미정 (TBD)**
- 상품 카테고리: **디지털 콘텐츠 / SaaS** (AI 사진·릴스 생성 구독 + 크레딧)
- 결제수단 카테고리: 해외 카드(Stripe, USD) · 국내 카드 정기결제(국내 PG, KRW 빌링키) · 일회성 크레딧 팩
- 예상 월 거래액: **미정 (TBD)** — 런치 후 추정치 산정(가격이 추정 placeholder이므로 보류)
- 통화: USD(글로벌) / KRW(국내) — i18n 통화 현지화는 후순위(`docs/BACKEND_HANDOFF.md` §9)
- 정기결제 여부: 예(월/연 구독) + 일회성(크레딧 팩)
- 첫 결제 프로모션: 가입 후 24h 내 첫달 50% (`firstMonthOff=50`)

---

## 5. public/business.html 결제·플랜 카피 정합성 검수 결과

`public/business.html`을 읽고 `public/js/pricing.js`(`window.PRICING`) 및 `billing.html`/`studio.html`과 대조했다.

**일치 확인:**
- [x] Team 플랜 카피 정합: $199/mo · 3 seats · 공유 풀 ◈2,000 · +$15/extra seat (business.html 줄 172·174, billing.html `data-dp` team.* 줄 185~186, pricing.js `team` 객체 일치)
- [x] Brand 플랜 = Commercial license 위치 정합(business.html 줄 139 "Brand plan", billing.html 줄 168~174 Commercial license, pricing.js `brand.license='Commercial'`)
- [x] 크레딧 기호 ◈ 표기 통일(business.html 줄 117·172, 전 페이지 공통)
- [x] billing.html "Brand는 $0.056/credit" 카피(줄 196)는 추정 Brand 월가 기준 $79÷1,400≈$0.0564로 산식 일치 — 팩 최저 $0.063보다 싸다는 "구독이 팩보다 항상 싸다" 메시지와 모순 없음

**주의/후속(가맹과 직접 무관하나 기록):**
- business.html White-label 4티어($199/$499/$999 등, 줄 192·204·217)와 `WL_COST_PER_CR=0.04`(줄 333)는 **pricing.js 단일소스 밖**의 별도 가격군이다. 본 가맹 범위(구독 4플랜+팩+Team)에는 미포함이나, 향후 화이트라벨도 결제 연결 시 동일 단일소스화·추정 표기 필요(`docs/BACKEND_HANDOFF.md` §8).
- business.html Team 좌석 추가 토스트 "+$15/mo"(줄 176)는 pricing.js `team.extraSeat=15`와 일치(mock 토스트, Stripe seat 과금 연결 대기 — §1.3·BACKEND_HANDOFF §8).
- [x] 검수 결과: **구독 4플랜 + 팩 + Team 가격 카피는 pricing.js 단일소스와 정합.** 신규 가격 숫자 발명 없음. 가맹 신청서의 가격은 전부 추정 placeholder임을 위 §1.2·§4에 명시.

---

## 참고 파일 (절대경로)
- 가격 단일소스: `/Users/jeon-yedam/HeyHoAI/public/js/pricing.js`
- 백엔드 연결 핸드오프: `/Users/jeon-yedam/HeyHoAI/docs/BACKEND_HANDOFF.md` (§5 결제, §3·§6 가격 확정, §4 게이팅)
- 결제 UI(mock): `/Users/jeon-yedam/HeyHoAI/public/billing.html`, `/Users/jeon-yedam/HeyHoAI/public/studio.html`
- 플랜·Team·White-label 카피: `/Users/jeon-yedam/HeyHoAI/public/business.html`
- 원가 미터(가격 확정 근거): `/Users/jeon-yedam/HeyHoAI/src/studio/costMeter.js`
