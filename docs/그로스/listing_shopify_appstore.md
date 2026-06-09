# Doppia 스토어 리스팅 — Shopify App Store · iOS App Store · Google Play

> 작성: 그로스 도메인 워커 / 브랜치 `feat/ux-monetization-v2` (PR #8)
> 대상 제품: 셀카·제품 사진 1장 → 템플릿 → 스튜디오급 사진·릴스 SaaS. 도메인 `doppia.ai`.
> **실등록 금지 — 본 문서는 메타·카피·심사대응 초안(파일 저장)만이다.**
>
> **가격 전제(반드시 읽을 것):** 아래 모든 가격 숫자는 **추정 placeholder(estimated)** 다.
> 엔진 COGS(프로바이더 청구 → `costMeter.js`) 확정 전이며, 단일 소스는
> `/Users/jeon-yedam/HeyHoAI/public/js/pricing.js` 다. 마케팅 카피에 새 숫자를 발명하지 말고
> 리스팅 제출 직전 `pricing.js` 최신값으로 재검수한다. 웹 DOM은 `data-dp` 규약으로 채우지만
> 스토어 리스팅 텍스트는 정적이므로 본 문서 값과 `pricing.js`가 일치하는지 수동 대조가 필요하다.

---

## 0. 단일 가격 소스 스냅샷 (pricing.js 기준, 전부 추정)

| 구분 | 항목 | 월 | 연간 환산 월 | 크레딧 | 비고 |
|---|---|---|---|---|---|
| 구독 | Free | $0 | $0 | ◈10 | Personal |
| 구독 | Creator | $19 | $15 | ◈250 | Personal · 무워터마크·HD |
| 구독 | Pro (featured) | $39 | $31 | ◈600 | Personal · Brand kit·4K·다국어 캡션 |
| 구독 | Brand | $79 | $63 | ◈1,400 | **Commercial** · 프리미엄 모델·팀 시트 |
| 팩 | 50 | $5 | — | ◈50 (+0) | $0.10/◈ |
| 팩 | 200 | $18 | — | ◈200 (+20) | $0.082/◈ |
| 팩 | 500 | $40 | — | ◈500 (+80) | $0.069/◈ |
| 팩 | 1,500 | $110 | — | ◈1,500 (+250) | $0.063/◈ **best** |
| 팀 | Team | $199 | — | ◈2,000 풀/월 | 3 seat 포함 · +$15/추가석 |
| 프로모 | firstMonthOff | — | — | — | 신규 24h 첫 결제 **50%** |

> 주의: `business.html` 화이트라벨 4티어($199/$499/$999/$1,999)와 마진 시뮬레이터의
> 도매원가 $0.04/◈는 `pricing.js`에 **미포함**(DOM 하드코딩)이다. → §5 검수 결과 참조.

---

## 1. Shopify App Store 리스팅

### 1-1. 앱 메타 (영문 카피)

- [ ] **App name:** `Doppia — AI Studio Photos & Reels`
- [ ] **Tagline (한 줄):** `Turn one product photo into studio-grade shots & reels.`
- [ ] **Category:** Primary `Store design` (또는 `Marketing and conversion`), Secondary `Product images / Photography`
- [ ] **Languages:** English (런칭), Korean (2차)
- [ ] **Pricing model:** Recurring subscription + usage credits (Shopify Billing API, **모두 추정가**)

### 1-2. 상세 설명 (App listing — 영문)

```
Doppia turns a single product photo into a full studio shoot — on-model shots,
lookbooks and scroll-stopping reels — generated straight from your catalog.

WHY MERCHANTS USE DOPPIA
• One photo in, a campaign out — no studio, no model, no shoot day.
• Bulk-generate lookbooks, on-model shots and reels from your product catalog.
• Auto-syncs new products: new SKU → fresh creative, automatically.
• Pick a template (recipe), render in minutes, publish or download in HD/4K.
• Brand kit keeps every asset on-brand across the whole store.

BUILT FOR YOUR STORE
• Native Shopify install (OAuth) — connect in two clicks.
• Generate by product, collection, or in bulk.
• Commercial license on the Brand plan for ads & paid usage.

API FOR SCALE
Programmatic rendering via POST https://api.doppia.ai/v1/render — same engine,
your workflow. (Brand plan and above.)

PRICING (estimated — see in-app billing for live prices)
Free, Creator, Pro and Brand subscriptions plus on-demand credit packs.
Credits are spent per render. Team pooling available.
```

- [ ] 상세설명의 `Install (OAuth)` / `POST https://api.doppia.ai/v1/render` / `auto-syncs new products` 카피가 `business.html`과 1:1 일치하는지 확인 (§5에서 검수 완료)
- [ ] 가격 문구에 구체 숫자 대신 "estimated — see in-app billing" 처리(COGS 확정 전 숫자 노출 최소화)

### 1-3. 가격 표기 (Shopify Billing API 정합)

- [ ] 과금은 **Shopify Billing API**(`AppSubscription` recurring + `AppUsageRecord` usage)로 처리 — 외부결제 우회 금지(Shopify 정책)
- [ ] 구독 4티어를 `RecurringApplicationCharge`/`AppSubscription`으로 매핑:
  - [ ] Free $0 · Creator $19(연 $15) · Pro $39(연 $31) · Brand $79(연 $63) — **전부 추정**
- [ ] 크레딧 팩은 **usage-based**(`appUsageRecordCreate`, capped amount)로 매핑: ◈50/$5·◈200+20/$18·◈500+80/$40·◈1,500+250/$110 (추정)
- [ ] `firstMonthOff 50` 프로모는 Billing API 할인(`AppSubscriptionDiscount`)으로 표현 — 신규 24h 한정 조건 명시
- [ ] 가격 통화·세금 표기는 Shopify가 처리(VAT/판매세) — 리스팅엔 USD 기준·"estimated" 명시
- [ ] **리스팅 제출 직전 `pricing.js` 최신값과 대조**(COGS 확정 시 변동 가능)

### 1-4. 스크린샷 / 데모영상 스펙

- [ ] **스크린샷:** 최소 3장, 권장 5~6장. 사이즈 **1600 × 900 px (16:9), PNG/JPG**. 첫 장 = 핵심 가치(1장 입력 → 결과 그리드)
- [ ] **앱 아이콘:** **1200 × 1200 px**(정사각, 모서리 둥글림은 Shopify가 적용)
- [ ] **피처 이미지(선택):** 큰 배너 — 1600 × 900 px 권장
- [ ] **데모 영상(선택, 권장):** YouTube/Vimeo 링크, 2~3분 이내, 설치→상품 선택→렌더→릴스 출력 플로우
- [ ] 스크린샷 내 가격 텍스트가 있으면 "estimated" 라벨 포함 (§5 카피 정합)

### 1-5. 심사 대응 체크리스트 (Shopify App Store Requirements)

- [ ] **OAuth:** 표준 OAuth 2.0 install flow, 요청 scope 최소화(`read_products`, `write_products`?만 필요 범위로), online/offline token 처리
- [ ] **App Bridge / Embedded:** 최신 App Bridge 사용, 임베디드 앱 UX 가이드 준수
- [ ] **GDPR 필수 웹훅 3종 구현·응답:**
  - [ ] `customers/data_request`
  - [ ] `customers/redact`
  - [ ] `shop/redact`
- [ ] **앱 제거 웹훅:** `app/uninstalled` 처리(토큰·데이터 정리)
- [ ] **Billing:** 모든 과금 Shopify Billing API 경유(외부 결제 우회 금지), test charge로 검증
- [ ] **성능:** 설치 후 즉시 동작, Lighthouse/Web Vitals 기준 충족, 무한 로딩·에러 없음
- [ ] **개인정보처리방침 URL:** `https://doppia.ai/privacy` (필수, 작동 링크)
- [ ] **지원 URL / 이메일:** `https://doppia.ai/support` · `support@doppia.ai`
- [ ] **데모 스토어/테스트 계정:** 심사용 development store + 테스트 자격 제공
- [ ] **앱 동작 일관성:** "Install on Shopify" 버튼 → 실제 OAuth 연결(현재 `business.html`은 mock toast → 실연동 필요, §5)

---

## 2. iOS App Store 리스팅

### 2-1. 메타 (영문)

- [ ] **App Name (≤30자):** `Doppia: AI Studio Photos`
- [ ] **Subtitle (≤30자):** `One selfie → studio shots & reels`
- [ ] **Promotional Text (≤170자, 수시 변경 가능):** `Turn one photo into a studio shoot. Pick a template, render pro shots & reels in minutes. New templates added weekly.`
- [ ] **Keywords (≤100자, 콤마 구분):** `ai photo,studio,headshot,reels,product photo,lookbook,ai model,selfie,content,brand,ugc,template`
- [ ] **Description:**

```
Doppia turns a single selfie or product photo into a full studio shoot —
pro photos and scroll-stopping reels, generated in minutes.

• One photo in, a gallery out — no studio, no shoot.
• Pick a template (recipe) — lookbook, on-model, GRWM, UGC ad, and more.
• HD / 4K output. Brand kit keeps everything on-brand.
• New templates added every week.

Free to start. Upgrade anytime for more credits, no watermark, and 4K.
```

### 2-2. 스크린샷 사이즈 (App Store Connect 필수)

- [ ] **6.7" iPhone (15/14 Pro Max 등):** **1290 × 2796 px** (필수 세트)
- [ ] **6.5" iPhone:** **1242 × 2688 px** (또는 6.7"로 대체 가능 — 최신 정책 확인)
- [ ] **iPad Pro 12.9" (3세대~):** **2048 × 2732 px** (iPad 지원 시 필수)
- [ ] 각 사이즈 최소 1장, 권장 3~6장. 첫 2장이 검색 결과 미리보기 → 가장 강한 비주얼
- [ ] **App Preview 영상(선택):** 각 디바이스 사이즈, 15~30초

### 2-3. App Privacy (데이터 수집 항목 — Nutrition Label)

- [ ] **Contact Info:** 이메일(계정) — App Functionality
- [ ] **User Content:** 사진/이미지(업로드한 셀카·제품 사진) — App Functionality. **저장·학습 사용 여부 정책 명확화 필요**
- [ ] **Identifiers:** User ID — App Functionality / Analytics
- [ ] **Usage Data:** 제품 상호작용 — Analytics
- [ ] **Purchases:** 구매 내역 — App Functionality
- [ ] "Data Linked to You" vs "Not Linked" 정확히 분류, 제3자 추적(Tracking) 여부 선언
- [ ] 업로드 이미지의 보존기간·삭제·학습 미사용 여부를 privacy 정책과 일치시킬 것

### 2-4. 연령등급 / 결제 정책

- [ ] **연령등급:** 4+ 예상(UGC·AI 생성 결과물 필터링 정책 명시 시). 사용자 생성/공유 기능 있으면 12+ 검토
- [ ] **결제 정책 — 가장 큰 리스크 (Apple Guideline 3.1.1 — In-App Purchase):**
  - [ ] **디지털 크레딧·구독은 iOS 앱 내에서 반드시 Apple IAP(StoreKit)로 판매해야 함.** 외부 웹결제로 우회·유도 금지(3.1.1, 3.1.3 anti-steering — Reader 앱 아님)
  - [ ] `pricing.js`의 구독/팩을 **App Store Connect IAP 상품으로 별도 등록**(가격 티어는 Apple 가격표에 매핑, 추정값)
  - [ ] **Apple 수수료(15~30%)로 인해 웹 대비 iOS 가격이 달라질 수 있음** → COGS·수수료 반영 후 iOS 전용 가격표 산정 필요(현재 전부 추정, 별도 검토 항목)
  - [ ] 앱 내에 외부 결제 페이지(`billing.html`) 링크·"웹에서 더 싸게" 유도 **금지**(미국 외 일부 지역 link-out 예외는 별도 검토)
  - [ ] **대응안:** iOS 빌드는 StoreKit IAP 전용 결제 레이어를 두고, 웹/Shopify 결제와 분리. 크레딧 잔액은 계정 단위 동기화(구매 출처 무관 잔액 합산)
- [ ] **Sign in with Apple:** 타사 소셜 로그인 제공 시 동등 옵션으로 필수 제공(4.8)

---

## 3. Google Play 리스팅

### 3-1. 메타 (영문)

- [ ] **App title (≤30자):** `Doppia: AI Studio Photos`
- [ ] **Short description (≤80자):** `One photo → studio-grade shots & reels. Pick a template, render in minutes.`
- [ ] **Full description (≤4000자):**

```
Doppia turns a single selfie or product photo into a full studio shoot —
professional photos and reels, generated in minutes. No studio, no shoot day.

WHAT YOU CAN DO
• Upload one photo, pick a template (recipe), and render pro shots & reels.
• Lookbook, on-model, GRWM, UGC ad, product photography and more.
• HD / 4K output. Brand kit keeps every asset on-brand.
• New templates added every week.

Free to start, with optional subscriptions and credit packs for more output,
no watermark, 4K, and a commercial license on the Brand plan.
```

### 3-2. 그래픽 에셋 스펙 (Play Console 필수)

- [ ] **앱 아이콘:** **512 × 512 px**, 32-bit PNG(알파), ≤1MB
- [ ] **피처 그래픽(Feature graphic):** **1024 × 500 px**, PNG/JPG (필수)
- [ ] **폰 스크린샷:** 최소 2장(권장 4~8장), 16:9 또는 9:16, 변당 320~3840px, JPG/PNG
- [ ] **7" 태블릿 스크린샷:** 태블릿 지원 선언 시 권장
- [ ] **10" 태블릿 스크린샷:** 태블릿 지원 선언 시 권장
- [ ] **프로모 영상(선택):** YouTube 링크

### 3-3. Data Safety (Play Console 필수)

- [ ] 수집·공유 데이터 선언(iOS App Privacy와 정합 유지):
  - [ ] **사진/동영상:** 사용자 업로드 이미지 — 앱 기능. 보존·삭제·학습 미사용 정책 선언
  - [ ] **개인정보:** 이메일 — 계정
  - [ ] **앱 활동:** 상호작용/Analytics
  - [ ] **결제 정보:** 결제 처리자(Play Billing) 경유 — 직접 저장 여부 선언
- [ ] **전송 암호화(in transit)** 선언, 사용자 **데이터 삭제 요청 경로** 제공(`doppia.ai/privacy` 내 삭제 절차 링크)

### 3-4. 콘텐츠 등급 / 결제 정책

- [ ] **콘텐츠 등급:** IARC 설문 작성 → Everyone/Teen 예상(AI 생성·UGC 필터링 정책 반영)
- [ ] **결제(Play Billing):** 앱 내 디지털 상품(구독·크레딧)은 **Google Play Billing 필수**(외부 결제 우회 금지)
  - [ ] `pricing.js` 구독·팩을 Play Console 구독/인앱상품으로 등록(추정 가격, 통화별 가격표)
  - [ ] **Play 수수료(15~30%) 반영 → Android 전용 가격 산정 필요**(현재 전부 추정)
  - [ ] 구독 갱신·취소·환불 정책 명시
- [ ] **타깃 API 레벨**·권한 최소화·`AD_ID` 선언 등 Play 기술 요건 충족

---

## 4. 공통 (전 스토어)

- [ ] **개인정보처리방침 URL:** `https://doppia.ai/privacy` — 3개 스토어 모두 필수, 작동 확인
- [ ] **서비스 약관 URL:** `https://doppia.ai/terms`
- [ ] **지원 URL / 이메일:** `https://doppia.ai/support` · `support@doppia.ai`
- [ ] **마케팅 카피 가격 정합:** 모든 리스팅의 가격 문구는 `pricing.js` 값 = `data-dp` 규약과 동일해야 하며 **"estimated"** 표기. COGS·플랫폼 수수료 확정 후 일괄 재검수
- [ ] **브랜드명 일관성:** 전부 **Doppia**(레거시 "heyhoai" 잔재 노출 금지 — §5 참조)
- [ ] **이미지/AI 결과물 권리·라이선스:** Brand 플랜 = Commercial 명시, 그 외 Personal 명시(스토어 카피와 `pricing.js` license 필드 일치)
- [ ] **스크린샷 일관성:** 3개 스토어 비주얼 톤·핵심 메시지("1장 → 스튜디오") 통일

---

## 5. business.html 카피 검수 결과

> 대상: `/Users/jeon-yedam/HeyHoAI/public/business.html` (API & Shopify 탭 중심)

### 5-1. 정합(일치) — 그대로 인용 가능

- [x] **API 엔드포인트:** 리스팅의 `POST https://api.doppia.ai/v1/render`가 `business.html` (143행) 코드 샘플과 **정확히 일치**
- [x] **인증 방식:** `Authorization: Bearer sk_live_...` (144행) — API 리스팅 카피와 정합
- [x] **요청 바디 필드:** `subject_id` / `recipe` / `count` (147~149행) — render 카피 근거로 사용 가능
- [x] **Shopify 가치 제안:** "Bulk-generate lookbooks, on-model shots and reels straight from your product catalog. Auto-syncs new products." (155행) — Shopify 상세설명 카피와 **1:1 일치**(그대로 차용)
- [x] **Install 버튼 존재:** "Install on Shopify" 버튼(156행) 확인 — 리스팅 OAuth 카피의 근거
- [x] **API 게이팅:** "Brand plan" 배지(139행)로 API가 Brand 이상 기능임을 명시 — 리스팅 "API for scale (Brand plan)" 카피와 정합
- [x] **Team 시트 정책:** "3 seats included · +$15 / extra seat"(174행)가 `pricing.js` `team`(seats:3, extraSeat:15)와 **일치**
- [x] **Team 풀:** "◈ 2,000 / month"(172행)가 `pricing.js` `team.pool:2000`과 **일치**

### 5-2. 불일치 / 리스크 (리스팅 전 정리 필요)

- [ ] **[High] "Install on Shopify"가 mock toast** — 156행 `HH.toast('Installing on Shopify (mock)')`. 실제 OAuth 미연동. Shopify 심사(§1-5) 통과 위해 실제 install flow 구현 필요. **리스팅 카피는 실연동 전제로 작성됨 → 제출 전 기능 구현 의존.**
- [ ] **[High — 가격 소스 분리] 화이트라벨 4티어 가격 DOM 하드코딩** — `business.html` 190~238행의 $199/$499/$999/$1,999가 `pricing.js`에 **미존재**. `data-dp` 규약 위반(DOM 하드코딩 금지). → 본 리스팅은 이 4티어를 스토어 가격으로 **사용하지 않음**(별도 white-label, 추정). pricing.js로 이관 권고.
- [ ] **[Med] 마진 시뮬레이터 도매원가 $0.04/◈ 하드코딩** — 337행 `WL_COST_PER_CR=0.04`. COGS 미확정인데 구체 숫자 노출 → 추정 표기·pricing 소스화 권고. 스토어 리스팅엔 비노출.
- [ ] **[Med] Team 가격 $199 표기 위치** — `business.html` 본문엔 "$199" 직접 텍스트는 없으나(시트/풀만 표기), 리스팅 Team 카피 작성 시 `pricing.js` `team.price:199`(추정) 사용. Apple/Play 측은 IAP/Play Billing 수수료 반영가 별도.
- [ ] **[Med] API 사용량 "10,000 calls" 표기** — 151행 "3,810 / 10,000 calls"는 데모 수치. 리스팅에 API 호출 한도를 명시하려면 `pricing.js`/플랜 정책과 정합 필요(현재 한도값 단일 소스 없음).
- [ ] **[Low] 브랜드 잔재 점검** — 화이트라벨 카피 "heyhoai badge hidden"(193행) 등 내부 표현 존재. 외부 리스팅엔 **Doppia**로 통일, 레거시 명칭 비노출.
- [ ] **[정보] 구독 4티어 가격(Free/Creator/Pro/Brand)** — `business.html`엔 직접 노출 없음. 리스팅 가격은 `pricing.js` 단일 소스에서 인용(전부 추정).

### 5-3. 검수 결론

- [x] API render·Shopify 핵심 가치 카피: **business.html과 정합** → 리스팅에 그대로 반영함
- [ ] Shopify "Install" 실연동 + 화이트라벨/마진 숫자의 pricing 소스화 + 브랜드명 통일: **리스팅 실제 제출 전 선결 과제**
- [ ] 모든 가격은 **추정** — COGS·Apple/Play 수수료 확정 후 스토어별 가격표 재산정 및 본 문서 일괄 업데이트

---

## 6. 제출 전 최종 게이트 (요약)

- [ ] `pricing.js` 최신값과 본 문서 §0 표 대조 완료
- [ ] Shopify GDPR 웹훅 3종 + OAuth + Billing API 실동작 확인
- [ ] iOS IAP(StoreKit) 결제 레이어 분리 — 외부결제 유도 제거
- [ ] Google Play Billing 등록 + Data Safety 작성
- [ ] privacy/terms/support URL(doppia.ai) 전부 작동
- [ ] 브랜드명 Doppia 통일, 레거시 명칭 비노출
- [ ] 모든 가격 카피에 "estimated" 표기 유지
