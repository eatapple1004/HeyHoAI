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
    company: '헬담',                 // 상호 (사업자등록증)
    brand: 'Doppia',                 // 서비스 브랜드명
    ceo: '전예담',                   // 대표자
    bizNo: '649-22-01859',           // 사업자등록번호
    mailOrderNo: '신고 준비 중',      // 통신판매업신고번호 (TODO: 발급 후 'YYYY-지역-번호' 입력)
    address: '충청남도 천안시 서북구 공원로 176, 305동 4205호 (불당동, 천안불당시티프라디움 3차)',
    tel: '010-9941-3546',            // 대표전화/고객센터
    email: 'adamcompanyofficial@gmail.com', // 운영 이메일
    hosting: 'Amazon Web Services',  // 호스팅 제공자 (선택)
  };

  var sep = '<span class="bizf-sep">|</span>';
  var rows = [
    '상호 <b>' + BIZ.company + '</b> (' + BIZ.brand + ')',
    '대표자 <b>' + BIZ.ceo + '</b>',
    '사업자등록번호 <b>' + BIZ.bizNo + '</b>',
    '통신판매업신고번호 <b>' + BIZ.mailOrderNo + '</b>',
    '주소 ' + BIZ.address,
    '대표전화 ' + BIZ.tel,
    '이메일 <a href="mailto:' + BIZ.email + '">' + BIZ.email + '</a>',
    '호스팅 ' + BIZ.hosting,
  ];

  var css =
    '.bizf{border-top:1px solid rgba(255,255,255,.08);margin-top:0;padding:22px 24px 30px;' +
    'font-size:12px;line-height:1.85;color:#8a8fa3;background:rgba(0,0,0,.18)}' +
    '.bizf .bizf-in{max-width:1080px;margin:0 auto}' +
    '.bizf b{color:#aab0c4;font-weight:600}' +
    '.bizf a{color:#8a8fa3;text-decoration:none}.bizf a:hover{text-decoration:underline}' +
    '.bizf .bizf-sep{margin:0 9px;color:rgba(255,255,255,.18)}' +
    '.bizf .bizf-copy{margin-top:10px;color:#6b7080;font-size:11.5px}';

  function mount() {
    if (document.getElementById('bizf-block')) return;
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var el = document.createElement('div');
    el.className = 'bizf';
    el.id = 'bizf-block';
    el.innerHTML =
      '<div class="bizf-in">' +
      rows.join(sep) +
      '<div class="bizf-copy">© 2026 ' + BIZ.company + ' (' + BIZ.brand + '). All rights reserved.</div>' +
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
