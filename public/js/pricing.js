/* Doppia — 단일 가격 소스 (canonical pricing config)
 * ⚠️ 실제 운영 원가(프로바이더 청구 → costMeter.js)가 확정되면 "여기만" 수정하면
 *    landing / billing / studio 전 페이지가 자동으로 일관 반영됩니다.
 * 백엔드 연동 시: 이 객체를 서버 응답(/api/pricing)으로 대체하면 됨.
 *
 * 사용법:
 *  - DOM에 number를 박지 말고 <span data-dp="creator.cr" data-fmt="1"></span> 처럼 표기 → applyDP()가 채움
 *  - JS 로직(studio PLANS 등)은 window.PRICING.plans 를 직접 참조
 */
(function () {
  var PRICING = {
    // 개인 구독 (price=월$, priceKRW=월₩[VAT포함], priceY=연간환산 월$, priceYKRW=연간환산 월₩, cr=월 크레딧).
    // KRW = USD × 환율(2026-07-13 1,503.60) × 1.10(VAT 포함분) 라운딩 → 고정가 페그. 작은 플랜=비쌈→큰 플랜=쌈.
    // ⚠️ 기능·라이선스 축의 진실 = src/lib/entitlements.js PLANS. 여기 license/line은 표시용 파생이지 권한이 아니다.
    //    (2026-07-17) 상업권 유료 전티어 개방 → 유료 4티어 license='Commercial'.
    //    이 블록은 src/pricing/pricing.config.js 와 자구까지 동일해야 한다(서버가 /api/pricing으로 덮어씀).
    //    (2026-07-29) line: 가격표 진실화 완료 — 랜딩 확정 진실 세트(Private Mode·커머셜·기업 slots)로 교체.
    plans: {
      free:     { name: 'Free',     price: 0,   priceKRW: 0,      priceY: 0,   priceYKRW: 0,      cr: 1500,  license: 'Personal' },
      starter:  { name: 'Starter',  price: 19,  priceKRW: 31000,  priceY: 16,  priceYKRW: 26000,  cr: 7300,  license: 'Commercial',
                  line: 'Private Mode · commercial · ◈7,300/mo' },
      standard: { name: 'Standard', price: 49,  priceKRW: 81000,  priceY: 41,  priceYKRW: 68000,  cr: 20300, license: 'Commercial', featured: true,
                  line: 'Private Mode · commercial · ◈20,300/mo' },
      pro:      { name: 'Pro',      price: 99,  priceKRW: 164000, priceY: 82,  priceYKRW: 136000, cr: 44000, license: 'Commercial',
                  line: 'Private Mode · commercial · ◈44,000/mo' },
      premium:  { name: 'Premium',  price: 199, priceKRW: 329000, priceY: 165, priceYKRW: 273000, cr: 95000, license: 'Commercial',
                  line: 'Private Mode · commercial · highest volume · ◈95,000/mo' }
    },
    // 기업 (연간 결제, price=월환산$, priceKRW=월환산₩[VAT포함], cr=월 크레딧). 볼륨 최저가.
    enterprise: {
      team:  { name: 'Enterprise Team', price: 599,  priceKRW: 990000,  cr: 362000, slots: 10, line: 'Shared credit pool · 10 concurrent jobs' },
      pro:   { name: 'Enterprise Pro',  price: 899,  priceKRW: 1490000, cr: 575000, slots: 15, featured: true, line: '15 concurrent jobs · priority support' },
      elite: { name: 'Elite',           price: 1199, priceKRW: 1990000, cr: 813000, slots: 20, line: '20 concurrent jobs · dedicated support' }
    },
    // 일회성 크레딧 팩 (id=결제연동 키, cr=기본, bonus=보너스, price=$, priceKRW=₩[VAT포함]). 충동성=최고가.
    packs: [
      { id: 'pack9',   cr: 3000,   bonus: 400,   price: 9,   priceKRW: 15000,  ppc: '0.0026' },
      { id: 'pack49',  cr: 17000,  bonus: 2200,  price: 49,  priceKRW: 81000,  ppc: '0.0026' },
      { id: 'pack199', cr: 72000,  bonus: 7500,  price: 199, priceKRW: 329000, ppc: '0.0025' },
      { id: 'pack349', cr: 128000, bonus: 14000, price: 349, priceKRW: 579000, ppc: '0.0025', best: true }
    ],
    // 신규 24h 첫 결제 할인율(%)
    firstMonthOff: 50,
    // 🔒 국내(KRW) 1회 충전 한도 — PG 심사 요건(토스페이먼츠, 포인트충전 업종: 10만원 미만).
    //   가격 정책이 아니라 규제값이다. 서버 pricing.config.js와 반드시 같은 값을 유지할 것.
    krwOneTimeChargeLimit: 100000,
    // 구독 판매 여부 — 서버(/api/pricing)가 환경 값으로 덮어쓴다. 기본 켜짐.
    //   급히 내릴 땐 서버에서 SUBSCRIPTIONS_FOR_SALE=false (코드 수정 없이 즉시 차단).
    subscriptionsForSale: true,
    // 통화·PG: KRW=국내(토스페이먼츠, 포트원 연동), USD=해외(Eximbay). 표시통화=결제통화=PG. KRW는 고정가 페그(VAT 포함).
    currency: { krwPeggedFx: 1503.60, krwVatIncluded: true, peggedOn: '2026-07-13' },
    // 확정가 — 실원가 재검증(2026-07-06, docs/생성원가_마진_분석). 커스텀 2~3배/템플릿 4~6배 + 크레딧 30배. 서버(/api/pricing)가 동일값으로 덮어씀.
    estimated: false,

    // path 조회: PRICING.get('creator.cr') → 250
    get: function (path) {
      return path.split('.').reduce(function (o, k) { return o && o[k]; }, PRICING);
    },
    fmt: function (n) {
      var v = (typeof n === 'number') ? n : (parseInt(n, 10) || 0);
      return v.toLocaleString();
    }
  };

  // ── 통화(currency): 표시통화 = 결제통화 = PG. KRW→국내(토스페이먼츠, 포트원 연동), USD→해외(Eximbay). ──
  //   기본값 = 지역 자동감지 프록시(저장 언어 ko 또는 브라우저 언어 ko → KRW, 그 외 USD). doppia_currency로 독립 오버라이드.
  var CUR_KEY = 'doppia_currency';
  function detectCurrency() {
    try { var s = localStorage.getItem(CUR_KEY); if (s === 'KRW' || s === 'USD') return s; } catch (e) {}
    var lang = ''; try { lang = localStorage.getItem('doppia_lang') || ''; } catch (e) {}
    if (lang === 'ko') return 'KRW';
    if (!lang && typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().indexOf('ko') === 0) return 'KRW';
    return 'USD';
  }
  var CURRENCY = detectCurrency();
  // 월 구독 전제 — :12 주석(price=월$ · priceY=연간환산 월$ · cr=월 크레딧) · subscription.route.js:23
  //   "Eximbay 구독상품 심사 통과 후 결제 성공 webhook에서 activatePlan(...) 호출 예정".
  //   ⚠️ 심사 통과 전까지 subscription.route.js:31이 non-admin에 501을 준다 —
  //      즉 '/월'·'매월 자동결제·언제든 해지'는 **결제 개시 시점부터** 참이 된다(사용자 결정: 개시 전제로 작업).
  //      개시가 지연되면 이 문구가 라이브 거짓이 되므로 런칭 전 반드시 재확인할 것.
  //   소비처: pricing.js:101(data-price) · billing.html:308 — 한 소스라 양쪽이 함께 움직인다.
  var CUR_META = {
    KRW: { code: 'KRW', symbol: '₩', per: ' /월', pg: '토스페이먼츠', tax: 'VAT 포함', note: 'VAT 포함 · 매월 자동결제 · 언제든 해지' },
    USD: { code: 'USD', symbol: '$', per: ' /mo', pg: 'Eximbay', tax: 'VAT excl.', note: 'VAT excl. · billed monthly · cancel anytime' }
  };
  PRICING.getCurrency = function () { return CURRENCY; };
  PRICING.curMeta = function () { return CUR_META[CURRENCY]; };
  // 플랜/팩의 현재 통화 금액(숫자). annual=true면 연간환산 월요금.
  PRICING.amount = function (o, annual) {
    if (!o) return 0;
    return CURRENCY === 'KRW' ? ((annual ? o.priceYKRW : o.priceKRW) || 0) : ((annual ? o.priceY : o.price) || 0);
  };
  // 현재 통화 금액 포맷 문자열(기호 포함). "₩31,000" | "$19".
  PRICING.priceOf = function (o, annual) {
    return CUR_META[CURRENCY].symbol + PRICING.fmt(PRICING.amount(o, annual));
  };
  /**
   * 🔒 현재 통화로 **판매 가능한** 크레딧 팩만 돌려준다.
   *   KRW는 PG 심사 요건상 1회 충전 한도(krwOneTimeChargeLimit) 미만만 판매할 수 있다.
   *   USD(해외 PG)는 이 규제 대상이 아니라 전량 그대로 노출한다.
   *   ⚠️ 팩을 그리는 화면은 PRICING.packs 대신 **이 함수**를 써야 한다 —
   *      화면마다 조건을 각자 쓰면 한 곳을 빠뜨렸을 때 심사가 다시 반려된다.
   */
  PRICING.sellablePacks = function () {
    var list = PRICING.packs || [];
    if (CURRENCY !== 'KRW') return list;
    var limit = PRICING.krwOneTimeChargeLimit || Infinity;
    return list.filter(function (p) { return Number(p.priceKRW) < limit; });
  };
  PRICING.setCurrency = function (c) {
    if (c !== 'KRW' && c !== 'USD') c = 'USD';
    if (c === CURRENCY) return;
    CURRENCY = c;
    try { localStorage.setItem(CUR_KEY, c); } catch (e) {}
    applyDP();
    try { document.dispatchEvent(new CustomEvent('dp:currency', { detail: { currency: c } })); } catch (e) {}
  };

  // [data-dp="creator.cr"] 요소를 PRICING 값으로 채움 (data-fmt="1"이면 천단위 콤마)
  function applyDP() {
    document.querySelectorAll('[data-dp]').forEach(function (el) {
      var v = PRICING.get(el.getAttribute('data-dp'));
      if (v != null) el.textContent = (el.dataset.fmt === '1') ? PRICING.fmt(v) : v;
    });
    // 통화 인지 가격: <div data-price="starter"></div> → "₩31,000 /월" | "$19 /mo". data-annual="1"이면 연환산.
    var m = CUR_META[CURRENCY];
    document.querySelectorAll('[data-price]').forEach(function (el) {
      var plan = PRICING.plans && PRICING.plans[el.getAttribute('data-price')];
      if (!plan) return;
      el.innerHTML = m.symbol + PRICING.fmt(PRICING.amount(plan, el.dataset.annual === '1')) + (m.per ? '<small>' + m.per + '</small>' : '');
    });
  }
  // (2026-07-17) 노출 — 랜딩 플랜 스위처가 data-price를 갈아끼운 뒤 재렌더해야 한다.
  //   지금까진 setCurrency() 안에서만 불려서 밖에서 재실행할 방법이 없었다.
  PRICING.applyDP = applyDP;

  // 서버 주도 단일 소스: /api/pricing 성공 시 임베드 값을 서버 값으로 덮어쓰고 재적용.
  // 실패(정적 호스팅·오프라인 등) 시 위 임베드 PRICING을 그대로 동기 폴백으로 사용.
  function hydrateFromServer() {
    if (typeof fetch !== 'function') return;
    fetch('/api/pricing', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (s) {
        if (!s || typeof s !== 'object') return;
        if (s.plans) PRICING.plans = s.plans;
        if (s.enterprise) PRICING.enterprise = s.enterprise;
        if (s.packs) PRICING.packs = s.packs;
        if (s.team) PRICING.team = s.team;
        if (s.currency) PRICING.currency = s.currency;
        if (typeof s.firstMonthOff === 'number') PRICING.firstMonthOff = s.firstMonthOff;
        // 규제값이라 서버가 진실원본 — 임베드 폴백이 낡아도 서버 값이 이긴다.
        if (typeof s.krwOneTimeChargeLimit === 'number') PRICING.krwOneTimeChargeLimit = s.krwOneTimeChargeLimit;
        if (typeof s.subscriptionsForSale === 'boolean') PRICING.subscriptionsForSale = s.subscriptionsForSale;
        if (typeof s.estimated === 'boolean') PRICING.estimated = s.estimated;
        applyDP();
      })
      .catch(function () { /* 조용히 폴백 */ });
  }

  window.PRICING = PRICING;
  window.applyDP = applyDP;
  window.setCurrency = PRICING.setCurrency;
  if (document.readyState !== 'loading') applyDP();
  else document.addEventListener('DOMContentLoaded', applyDP);
  hydrateFromServer();
})();
