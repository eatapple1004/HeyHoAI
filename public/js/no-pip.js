// no-pip.js — strip the browser's native Picture-in-Picture hover control from every <video>.
// Edge/Chrome inject a "picture-in-picture" / "작은 화면으로 보기" toggle when hovering any video.
// Doppia never uses PiP, so `disablePictureInPicture` opts every clip out. Covers static markup,
// innerHTML-rendered cards/scenes, and programmatically created (layered player) videos.
(function () {
  function strip(v) {
    try { v.disablePictureInPicture = true; } catch (e) {}
    try { v.setAttribute('disablepictureinpicture', ''); } catch (e) {}
  }
  function sweep(root) {
    if (!root || !root.querySelectorAll) return;
    var vs = root.querySelectorAll('video');
    for (var i = 0; i < vs.length; i++) strip(vs[i]);
  }
  // 관찰자는 즉시 설치(파싱 중에도 documentElement 존재) → 이후 삽입되는 모든 <video> 커버.
  try {
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) continue;
          if (n.tagName === 'VIDEO') strip(n); else sweep(n);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
  // 초기 정적 <video>도 한 번 훑기.
  function initial() { sweep(document); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initial);
  else initial();
})();
