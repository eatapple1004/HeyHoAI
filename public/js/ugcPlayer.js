/**
 * ugcMakePlayer — 클라이언트 클립 시퀀서(더블버퍼) + 자막 싱크 콜백.
 *   미리보기를 "이어붙인 한 영상" 대신 씬 클립들을 순서대로 재생 → 씬 버전전환/재배치 = 클립 스왑(서버 0, 즉시).
 *   무음(Phase 1). 소리는 별도 오디오 트랙(Phase 2)에서 이 시계를 master로 동기.
 *
 * wrap: 컨테이너(position:relative). opts: { scenes:[{n,clipUrl,isStill,durationSec}], onTime:(ms,total)=>{}, loop }
 * 반환: { play, pause, seekTo, setScenes, currentTime, total, visibleClip, destroy }
 */
function ugcMakePlayer(wrap, opts) {
  opts = opts || {};
  var scenes = opts.scenes || [];
  var onTime = opts.onTime || function () {};
  var onError = opts.onError || function () {}; // 클립 로드 실패(404/유실) 콜백 — 마운트 계층이 폴백 판단
  var loop = opts.loop !== false;

  function buildSegs(sc) {
    var segs = [], acc = 0;
    (sc || []).forEach(function (s) {
      var d = Math.max(300, Math.round((s.durationSec || 3) * 1000));
      segs.push({ n: s.n, clipUrl: s.clipUrl || '', isStill: !!s.isStill, startMs: acc, durMs: d });
      acc += d;
    });
    return { segs: segs, total: acc || 1 };
  }
  var T = buildSegs(scenes), segs = T.segs, total = T.total;

  function mkv() {
    var v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.loop = false;
    v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0';
    // 클립 로드 실패(404/유실) 감지 → 마운트 계층에 알림(빈 src '' 무시). 검은 세그먼트로 방치되지 않게 폴백 유도.
    v.addEventListener('error', function () { if (v.src && v.dataset.clip && v.error) onError(v.dataset.clip); });
    wrap.appendChild(v); return v;
  }
  var vA = mkv(), vB = mkv(), cur = vA, nxt = vB, curIdx = -1;
  var t = 0, raf = null, playing = false, lastTs = null;

  function segAt(ms) { for (var i = 0; i < segs.length; i++) { if (ms < segs[i].startMs + segs[i].durMs) return i; } return Math.max(0, segs.length - 1); }

  function preloadInto(v, url) { if (v.dataset.clip !== url) { v.dataset.clip = url; v.src = url || ''; try { v.load(); } catch (e) {} } }

  function showSeg(i, offsetMs) {
    var s = segs[i]; if (!s) return;
    if (curIdx !== i) {
      if (nxt.dataset.clip === s.clipUrl && s.clipUrl) { var tmp = cur; cur = nxt; nxt = tmp; } // 프리로드된 다음 클립으로 스왑(끊김 없음)
      else { preloadInto(cur, s.clipUrl); }
      cur.style.opacity = '1'; nxt.style.opacity = '0';
      curIdx = i;
      var ni = (i + 1 < segs.length) ? i + 1 : (loop ? 0 : -1); // 다음 클립 프리로드
      if (ni >= 0 && segs[ni]) preloadInto(nxt, segs[ni].clipUrl);
    }
    if (!s.isStill && cur.dataset.clip) { // 클립 내 위치 맞춤(트림 대비). 큰 편차만 보정(잦은 seek 방지).
      var want = Math.max(0, offsetMs) / 1000;
      if (isFinite(cur.duration) && cur.duration > 0) want = Math.min(want, Math.max(0, cur.duration - 0.05));
      if (Math.abs((cur.currentTime || 0) - want) > 0.35) { try { cur.currentTime = want; } catch (e) {} }
      if (playing && cur.paused) cur.play().catch(function () {});
      if (!playing && !cur.paused) cur.pause();
    }
  }

  function frame(ts) {
    if (!playing) return;
    if (lastTs == null) lastTs = ts; var dt = ts - lastTs; lastTs = ts; t += dt;
    if (t >= total) { if (loop) t = t % total; else { t = total; playing = false; } }
    var i = segAt(t); showSeg(i, t - segs[i].startMs); onTime(t, total);
    if (playing) raf = requestAnimationFrame(frame);
  }

  var api = {
    play: function () { if (playing) return; playing = true; lastTs = null; var i = segAt(t); showSeg(i, t - segs[i].startMs); raf = requestAnimationFrame(frame); },
    pause: function () { playing = false; if (raf) cancelAnimationFrame(raf); try { cur.pause(); nxt.pause(); } catch (e) {} },
    seekTo: function (ms) { t = Math.max(0, Math.min(ms, total)); var i = segAt(t); showSeg(i, t - segs[i].startMs); onTime(t, total); },
    setScenes: function (sc) { scenes = sc; var R = buildSegs(sc); segs = R.segs; total = R.total; curIdx = -1; nxt.dataset.clip = ''; var i = segAt(t); showSeg(i, Math.max(0, t - segs[i].startMs)); onTime(t, total); }, // 버전전환/재배치 즉시 반영
    currentTime: function () { return t; },
    total: function () { return total; },
    visibleClip: function () { return (cur.style.opacity === '1') ? cur.dataset.clip : (nxt.style.opacity === '1' ? nxt.dataset.clip : cur.dataset.clip); },
    destroy: function () { api.pause(); try { wrap.removeChild(vA); wrap.removeChild(vB); } catch (e) {} },
  };
  return api;
}
if (typeof module !== 'undefined' && module.exports) module.exports = { ugcMakePlayer };
