/**
 * 정적 사진·영상·폰트 캐시 헤더 (2026-10-18)
 *   express.static 기본값은 max-age=0 이라 Cloudflare 가 /img 파일을 매번 서버에 다시 물어봤다(REVALIDATED, 장당 0.5~1초).
 *   사진·영상·폰트만 브라우저 1일 · Cloudflare 7일 캐시. js·css·html 은 배포 즉시 바뀌어야 해서 손대지 않는다.
 *   ⚠️ public/img 의 파일을 **같은 이름으로 덮어쓰면** Cloudflare 에서 최대 7일 옛 파일이 보인다 → 새 이름으로 올리거나 CF 캐시 비우기.
 */
const MEDIA_RE = /\.(png|jpe?g|webp|gif|svg|avif|ico|mp4|webm|mov|mp3|woff2?|ttf)$/i;
function setStaticCache(res, filePath) {
  if (MEDIA_RE.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
}
module.exports = { setStaticCache };
