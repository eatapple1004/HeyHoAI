/**
 * 짧은 주소 리다이렉트 — `/q/<이름>` → 원래 주소.
 *
 * 왜: 긴 주소(구글 지도 공유 링크 등)를 그대로 QR로 만들면 칸이 빼곡해져 인쇄·인식이 나빠진다.
 *   우리 짧은 주소를 QR에 넣고 여기서 넘겨주면 QR이 단순해지고, 목적지를 나중에 바꿔도 QR은 그대로 쓴다.
 *
 * 302(임시)로 넘긴다 — 301은 브라우저가 기억해 버려서, 목적지를 바꿔도 이미 찍어 본 폰은 옛 주소로 간다.
 * 이름은 소문자로 비교한다(QR 스캐너·사람이 대소문자를 섞어 칠 수 있다).
 *
 * 새 링크 추가: 아래 LINKS에 한 줄 넣고 배포. (nest/main.ts·src/index.js 둘 다 이 모듈을 쓴다)
 */
const LINKS = {
  // MIMI K-beauty Care Pharmacy — 구글 지도 (2026-10-13 요청)
  mimi: 'https://www.google.com/maps/place/MIMI+K-beauty+Care+Pharmacy/data=!3m1!4b1!4m4!3m3!1s0x357ca36a4cb5554f:0xd06c510638a43d33!16s%2Fg%2F11zf3zwrv9!20s8Q99H297%2B37R?entry=ttu&g_ep=EgoyMDI2MTAwNy4wIKXMDSoASAFQAw%3D%3D',
};

function shortlinkHandler(req, res) {
  const key = String(req.path || '').replace(/^\/+|\/+$/g, '').toLowerCase();
  const url = Object.prototype.hasOwnProperty.call(LINKS, key) ? LINKS[key] : null;
  if (!url) return res.status(404).type('text/plain').send('Not found');
  res.set('Cache-Control', 'no-store');
  return res.redirect(302, url);
}

module.exports = { LINKS, shortlinkHandler };
