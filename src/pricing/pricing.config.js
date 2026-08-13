/**
 * Doppia — 서버측 가격 단일 소스 (canonical pricing config, server-authoritative)
 *
 * ⚠️ 모든 가격 숫자 = 추정 placeholder. 엔진 실원가(COGS)가 확정되기 전까지의 잠정값이다.
 *    실제 운영가는 src/studio/costMeter.js 추정 단가 → BACKEND_HANDOFF.md §6 실원가 로깅으로
 *    확정한 뒤, "여기만" 수정하면 GET /api/pricing 을 통해 landing/billing/studio 전 페이지가
 *    자동으로 일관 반영된다.
 *
 * 값은 public/js/pricing.js 의 임베드 PRICING(동기 폴백)과 정확히 일치해야 한다.
 * 프론트는 로드시 GET /api/pricing 으로 이 객체를 받아 폴백 값을 덮어쓴다.
 */

const PRICING = {
  // --- 메타 (2026-07-06 재설계: 커스텀/템플릿 분리 + 크레딧 30배 + 티어 다양화) ---
  estimated: false,
  source: 'cost-validated',
  basis: '실프로바이더 공식단가(2026-07: nano-banana Pro $0.134/장 · Kling Pro 릴 $0.112/s) 기준. '
       + '커스텀 1.65~3배 / 템플릿 3.3~5.9배(플랜별) · 크레딧 30배 인플레이션. 근거: docs/생성원가_마진_분석_2026-07-06.md',
  confirmedOn: '2026-07-06',

  // 개인 구독 (price=월$, priceKRW=월₩[VAT포함], priceY=연간환산 월$, priceYKRW=연간환산 월₩, cr=월 크레딧).
  // KRW = USD × 환율(2026-07-13 1,503.60) × 1.10(VAT 포함분) 라운딩 → 고정가 페그(실시간 변환 아님). 배수: 작은 플랜=비쌈 → 큰 플랜=쌈.
  // ⚠️ 기능·라이선스 축의 진실 = src/lib/entitlements.js PLANS. 여기 license/line은 '표시용 파생'이지 권한이 아니다.
  //    (2026-07-17) 상업권 유료 전티어 개방 → 유료 4티어 license='Commercial'(terms.html 제13조② 표와 일치).
  //    ⚠️ line:은 아직 날조를 품고 있다(slots·lookbook·Edit·Concept cut — entitlements.js에 축 자체가 없음).
  //       소비자 0건인 죽은 데이터라 화면에는 안 나가지만, 가격표 진실화 작업에서 함께 교체할 것.
  plans: {
    free:     { name: 'Free',     price: 0,   priceKRW: 0,      priceY: 0,   priceYKRW: 0,      cr: 1500,  license: 'Personal' },
    starter:  { name: 'Starter',  price: 19,  priceKRW: 31000,  priceY: 16,  priceYKRW: 26000,  cr: 7300,  license: 'Commercial',
                line: 'No watermark · group lookbook · ◈7,300/mo' },
    standard: { name: 'Standard', price: 49,  priceKRW: 81000,  priceY: 41,  priceYKRW: 68000,  cr: 20300, license: 'Commercial', featured: true,
                line: 'Edit · 2K · 4 slots · ◈20,300/mo' },
    pro:      { name: 'Pro',      price: 99,  priceKRW: 164000, priceY: 82,  priceYKRW: 136000, cr: 44000, license: 'Commercial',
                line: 'Concept cut · 5 slots · ◈44,000/mo' },
    premium:  { name: 'Premium',  price: 199, priceKRW: 329000, priceY: 165, priceYKRW: 273000, cr: 95000, license: 'Commercial',
                line: 'Video · 6 slots · commercial · ◈95,000/mo' }
  },
  // 기업 (연간 결제, price=월환산$, priceKRW=월환산₩[VAT포함], cr=월 크레딧). 볼륨 최저가(템플릿 3.3~3.7배).
  enterprise: {
    team:  { name: 'Enterprise Team', price: 599,  priceKRW: 990000,  cr: 362000, slots: 10, line: 'Team roles · shared pool · 10 slots' },
    pro:   { name: 'Enterprise Pro',  price: 899,  priceKRW: 1490000, cr: 575000, slots: 15, featured: true, line: 'Everything · 15 slots · priority' },
    elite: { name: 'Elite',           price: 1199, priceKRW: 1990000, cr: 813000, slots: 20, line: 'Max scale · 20 slots · dedicated support' }
  },
  // 일회성 크레딧 팩 (id=결제연동 키, cr=기본, bonus=보너스, price=$, priceKRW=₩[VAT포함]). 충동성=최고가(5.5~5.9배).
  packs: [
    { id: 'pack9',   cr: 3000,   bonus: 400,   price: 9,   priceKRW: 15000,  ppc: '0.0026' },
    { id: 'pack49',  cr: 17000,  bonus: 2200,  price: 49,  priceKRW: 81000,  ppc: '0.0026' },
    { id: 'pack199', cr: 72000,  bonus: 7500,  price: 199, priceKRW: 329000, ppc: '0.0025' },
    { id: 'pack349', cr: 128000, bonus: 14000, price: 349, priceKRW: 579000, ppc: '0.0025', best: true }
  ],
  // 신규 24h 첫 결제 할인율(%)
  firstMonthOff: 50,
  /**
   * 🔒 국내(KRW) 1회 충전 한도 — **PG 심사 요건이지 가격 정책이 아니다.**
   *   토스페이먼츠 계약팀 요건(2026-08): 포인트충전 업종은 1회 충전 최고가액을 10만원 **미만**으로
   *   제한해야 한다. 이 값 이상인 팩은 KRW 결제 경로에서 노출·결제 모두 차단된다
   *   (USD/해외 PG는 이 규제 대상이 아니므로 그대로 판매한다).
   *   ⚠️ 낮추는 건 자유지만 올릴 때는 PG 심사 조건을 먼저 확인할 것.
   */
  krwOneTimeChargeLimit: 100000,
  /**
   * 구독 플랜 판매 여부 — **기본 켜짐**.
   *   2026-08-12 PG 심사 대응으로 잠시 내렸다가, 빌링(정기결제)을 심사 범위에 포함하기로 하면서
   *   2026-08-13 판매를 재개했다. 빌링 결제경로를 제출하려면 구독 상품이 화면에 있어야 한다.
   *   급히 내려야 할 때만 `SUBSCRIPTIONS_FOR_SALE=false` 로 끈다(코드 수정·배포 없이 즉시 차단).
   *
   *   참고: 1회 10만원 한도는 **충전형 상품에만** 걸리는 규제로 보인다 —
   *   토스 충전업종 가이드(4p·12p)에만 나오고 빌링 가이드에는 금액 한도 언급이 없다.
   *   구독 플랜(₩31,000~₩1,990,000)은 대상이 아닐 가능성이 높으나 회신으로 확답을 받을 것.
   */
  subscriptionsForSale: String(process.env.SUBSCRIPTIONS_FOR_SALE || '').trim().toLowerCase() !== 'false',
  // 통화·PG: KRW=국내(NHN KCP), USD=해외(Eximbay). 표시통화=결제통화=PG. KRW는 고정가 페그(VAT 포함).
  currency: { krwPeggedFx: 1503.60, krwVatIncluded: true, peggedOn: '2026-07-13' },
};

/** KRW 결제로 판매 가능한 팩인가(1회 충전 한도 미만). USD 경로에는 적용하지 않는다. */
function isKrwSellable(pack) {
  return Number(pack.priceKRW) < PRICING.krwOneTimeChargeLimit;
}

/** 가격 단일 소스(메타 포함)를 반환. GET /api/pricing 의 응답 본문. */
function getPricing() {
  return PRICING;
}

module.exports = { PRICING, getPricing, isKrwSellable };
