/* ──────────────────────────────────────────────────────────
 * 사업자정보 footer (전자상거래법 제10조 표시사항) — 단일 소스
 * 모든 페이지에 <script src="/js/biz-footer.js?v=1"></script> 로 포함.
 * 값 변경은 아래 BIZ 객체 한 곳만 고치면 전 페이지에 반영된다.
 *
 * 근거: Eximbay 가맹점 심사 요건 — "사이트 하단에 사업자등록증과 동일한 정보".
 * ⚠️ TODO(확인 필요): 통신판매업신고번호 / 대표전화 / 이메일 실제값 입력.
 * ────────────────────────────────────────────────────────── */
(function () {
  var BIZ = {
    company: '주식회사아담컴퍼니',    // 상호 (사업자등록증)
    brand: 'Doppia',                 // 서비스 브랜드명
    ceo: '전예담',                   // 대표자
    bizNo: '785-86-03908',           // 사업자등록번호
    mailOrderNo: '2026-인천서구-2621', // 통신판매업신고번호
    address: '인천 서구 청라한내로72번길 7-29 1003호',
    tel: '070-8098-3546',            // 대표전화/고객센터
    email: 'support@doppia.ai',      // 운영 이메일
    hosting: 'Amazon Web Services',  // 호스팅 제공자 (선택)
  };

  // 영문 표기(EN 페이지 전용) — 법정 정본은 국문. 로마자는 사업자등록증 표기 기준 병기.
  var BIZ_EN = {
    company: 'ADAM Company Inc. (주식회사아담컴퍼니)',
    ceo: 'Yedam Jeon',
    mailOrderNo: '2026-Incheon Seo-gu-2621',
    address: '1003, 7-29, Cheongnahannae-ro 72beon-gil, Seo-gu, Incheon, Republic of Korea',
    tel: '+82-70-8098-3546',
  };
  var sep = '<span class="bizf-sep">|</span>';
  // ⚠️ **함수로 감싼 이유** — 최상위에서 계산하면 안 된다.
  //   이 스크립트는 body 파싱 중 즉시 실행되는데, i18n.js는 defer라 그 **뒤에** 돌면서
  //   <html lang>을 사용자 언어로 바꾼다. 최상위에서 lang을 읽으면 HTML에 하드코딩된 값
  //   (billing.html은 lang="en")만 보게 돼, 한국어로 전환해도 사업자정보가 계속 영문으로 나온다.
  //   실제로 그 상태였다 — 링크(mount 안에서 판정)는 국문인데 사업자정보만 영문인 기묘한 푸터.
  //   mount()는 DOMContentLoaded에 불리므로 그때는 i18n이 lang을 이미 정해뒀다.
  function isKoDocNow() {
    return ((document.documentElement.getAttribute('lang') || 'ko').toLowerCase().indexOf('en') !== 0);
  }
  function buildRows() {
  return isKoDocNow() ? [
    '상호 <b>' + BIZ.company + '</b> (' + BIZ.brand + ')',
    '대표자 <b>' + BIZ.ceo + '</b>',
    '사업자등록번호 <b>' + BIZ.bizNo + '</b>',
    '통신판매업신고번호 <b>' + BIZ.mailOrderNo + '</b>',
    '주소 ' + BIZ.address,
    '대표전화 ' + BIZ.tel,
    '이메일 <a href="mailto:' + BIZ.email + '">' + BIZ.email + '</a>',
    '호스팅 ' + BIZ.hosting,
  ] : [
    'Company <b>' + BIZ_EN.company + '</b> (' + BIZ.brand + ')',
    'CEO <b>' + BIZ_EN.ceo + '</b>',
    'Business Registration No. <b>' + BIZ.bizNo + '</b>',
    'E-commerce Report No. <b>' + BIZ_EN.mailOrderNo + '</b>',
    'Address ' + BIZ_EN.address,
    'Tel ' + BIZ_EN.tel,
    'Email <a href="mailto:' + BIZ.email + '">' + BIZ.email + '</a>',
    'Hosting ' + BIZ.hosting,
  ];
  }

  var css =
    '.bizf{border-top:1px solid rgba(255,255,255,.08);margin-top:0;padding:22px 24px 30px;' +
    'font-size:12px;line-height:1.85;color:#8a8fa3;background:rgba(0,0,0,.18)}' +
    '.bizf .bizf-in{max-width:1080px;margin:0 auto}' +
    '.bizf b{color:#aab0c4;font-weight:600}' +
    '.bizf a{color:#8a8fa3;text-decoration:none}.bizf a:hover{text-decoration:underline}' +
    '.bizf .bizf-sep{margin:0 9px;color:rgba(255,255,255,.18)}' +
    '.bizf .bizf-legal{margin-bottom:12px;font-size:12.5px}' +
    '.bizf .bizf-legal a{color:#aab0c4;font-weight:500}' +
    '.bizf .bizf-legal a:hover{color:#dfe3ee}' +
    '.bizf .bizf-legal b{color:#dfe3ee;font-weight:700}' +
    '.bizf .bizf-copy{margin-top:10px;color:#6b7080;font-size:11.5px}';

  function mount() {
    if (document.getElementById('bizf-block')) return;
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var el = document.createElement('div');
    el.className = 'bizf';
    el.id = 'bizf-block';
    // 페이지 언어(문서 lang)에 따라 법적 문서 링크·라벨 스위칭 — EN 페이지는 영어 번역본(-en)으로.
    // 사업자정보 행은 전자상거래법 표시사항이라 국문 유지.
    var isKo = isKoDocNow();
    var rows = buildRows();
    var legal = isKo
      ? '<a href="/terms">이용약관</a>' + sep +
        '<a href="/terms#ai-use-policy">AI 이용정책</a>' + sep +
        '<a href="/privacy"><b>개인정보처리방침</b></a>' + sep +
        '<a href="/refund">취소·환불 및 청약철회</a>'
      : '<a href="/terms-en">Terms of Service</a>' + sep +
        '<a href="/terms-en#ai-use-policy">AI Use Policy</a>' + sep +
        '<a href="/privacy-en"><b>Privacy Policy</b></a>' + sep +
        '<a href="/refund-en">Cancellation &amp; Refund</a>';
    el.innerHTML =
      '<div class="bizf-in">' +
      '<div class="bizf-legal">' + legal + '</div>' +
      rows.join(sep) +
      '<div class="bizf-copy">© 2026 ' + (isKo ? BIZ.company : 'ADAM Company Inc.') + ' (' + BIZ.brand + '). All rights reserved.</div>' +
      '</div>';

    // 마운트 우선순위: #biz-footer 지정 위치 → 기존 <footer> 뒤 → body 끝
    var target = document.getElementById('biz-footer');
    if (target) { target.appendChild(el); return; }
    var footer = document.querySelector('footer');
    if (footer && footer.parentNode) { footer.parentNode.insertBefore(el, footer.nextSibling); return; }
    document.body.appendChild(el);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
