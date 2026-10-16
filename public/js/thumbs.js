/**
 * 카드용 썸네일 공용 (2026-10-16) — Library(gallery.html)와 같은 규칙.
 *   /images/<uuid>.<ext> → /images/t/<w>/<uuid>.<ext> (서버가 사진은 WebP, 영상은 첫 프레임 JPEG 로 줄여 캐시)
 * 원본 PNG(6~8MB)를 카드마다 받아 Image·Video 결과, Explore·Home 커뮤니티 카드가 한참 비어 보이던 것.
 *   DoppiaThumb.url(u, w)      썸네일 주소(다른 형태 URL 은 그대로)
 *   DoppiaThumb.img(u, cls, sel)  <img> — 썸네일 실패하면 원본, 원본도 실패하면 sel(카드) 제거
 *   DoppiaThumb.video(u, cls, sel) <video> — 포스터만 먼저, 화면에 보일 때만 영상 로드·재생
 *   DoppiaThumb.watch(root, onSized)  root 안 video[data-src] 를 화면 보임에 맞춰 재생/정지(+포스터 비율로 크기)
 *   DoppiaThumb.play(u)        카드 재생용 가벼운 영상 주소(/images/v/)
 *   DoppiaThumb.label(r)       카드 라벨 — 엔드포인트 원문 대신 사람이 읽는 이름(metadata.origin)
 */
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function url(u, w) { var m = /^\/images\/([\w.-]+\.(png|jpe?g|webp|mp4|webm|mov))$/i.exec(u || ''); return m ? '/images/t/' + (w || 480) + '/' + m[1] : u; }
  // 카드 재생용 가벼운 영상(/images/v/ — 720·~1.8Mbps). 아직 안 만들어졌으면 서버가 원본으로 보내 준다
  function play(u) { var m = /^\/images\/([\w.-]+\.(mp4|webm|mov))$/i.exec(u || ''); return m ? '/images/v/' + m[1] : u; }
  function onerr(sel) { return 'onerror="var c=this.closest(\'' + sel + '\');if(this.dataset.full&&this.src.indexOf(\'/images/t/\')>=0){this.src=this.dataset.full;this.removeAttribute(\'srcset\');}else if(c)c.remove()"'; }
  function img(u, cls, sel) {
    var t = url(u, 480);
    return '<img class="' + esc(cls || '') + '" src="' + esc(t) + '"' + (t !== u ? ' srcset="' + esc(t) + ' 1x, ' + esc(url(u, 960)) + ' 2x" data-full="' + esc(u) + '"' : '') + ' loading="lazy" decoding="async" alt="" ' + onerr(sel) + '>';
  }
  function video(u, cls, sel) {
    var t = url(u, 480);
    return '<video class="' + esc(cls || '') + '" data-src="' + esc(play(u)) + '"' + (t !== u ? ' poster="' + esc(t) + '"' : '') + ' muted loop playsinline preload="none" onerror="var c=this.closest(\'' + sel + '\');if(c)c.remove()"></video>';
  }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        if (!v.getAttribute('src') && v.dataset.src) { v.src = v.dataset.src; v.preload = 'auto'; }
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else if (!v.paused) v.pause();
    });
  }, { rootMargin: '200px 0px' }) : null;
  // preload=none 영상은 메타데이터가 없어 300×150 기본 크기로 잡힌다 → 포스터 이미지 비율로 먼저 잡고 onSized(v) 호출
  function watch(root, onSized) {
    (root || document).querySelectorAll('video[data-src]').forEach(function (v) {
      if (v._dtWatched) return; v._dtWatched = true; v.muted = true;
      if (v.poster && !v.style.aspectRatio) { var im = new Image(); im.onload = function () { if (im.naturalWidth) { v.style.aspectRatio = im.naturalWidth + '/' + im.naturalHeight; if (onSized) onSized(v); } }; im.src = v.poster; }
      if (io) io.observe(v); else { v.src = v.dataset.src; v.autoplay = true; }
    });
  }
  function label(r) {
    var o = (r && r.metadata && r.metadata.origin) || {};
    if (o.feature && o.feature !== 'create-image' && o.feature !== 'create-video') return o.featureLabel || o.feature;
    return o.engineLabel || (r && r.metadata && r.metadata.engine) || (r && r.model) || '';
  }
  window.DoppiaThumb = { url: url, play: play, img: img, video: video, watch: watch, label: label };
})();
