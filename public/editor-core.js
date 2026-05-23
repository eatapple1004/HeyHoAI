// Shared video editor core. Imported by both editor.html and step 5 of template-flow.html.
// Call initEditor() once after the editor's DOM is present.
//
// Options:
//   - initialClipUrls: string[]  (image/video URLs to auto-append to the timeline)
//   - initialBgmUrl: string      (audio URL to auto-select as BGM)
//   - initialBgmName?: string    (display name override for the BGM)

import { FFmpeg } from '/vendor/ffmpeg/index.js';
import { fetchFile, toBlobURL } from '/vendor/ffmpeg-util/index.js';

export async function initEditor(opts = {}) {
  // Early diagnostics so we can tell from the log pane alone whether initEditor
  // even started running and whether it can reach the DOM elements it expects.
  console.log('[editor] initEditor called with opts:', opts);
  try {
    const logPaneEl = document.getElementById('logPane');
    if (logPaneEl) {
      const line = document.createElement('div');
      line.className = 'log-line';
      line.textContent = '[editor] init 시작';
      logPaneEl.appendChild(line);
    } else {
      console.error('[editor] #logPane not found — wrong DOM context');
    }
    const statusEl = document.getElementById('statusText');
    if (statusEl) statusEl.textContent = 'init…';
  } catch (e) {
    console.error('[editor] pre-init diagnostics failed:', e);
  }

  const state = {
    clips: [],          // { id, type, file, name, url, duration, trimStart, trimEnd, mediaDuration, thumbDataUrl }
    bgm: null,          // { file, name, url, volume }
    texts: [],          // { id, text, fontSize, color, fontWeight, xPct, yPct, startTime, endTime }
    selectedClipId: null,
    selectedTextId: null,
    rendering: false,
    outputUrl: null,
  };

  const $ = (id) => document.getElementById(id);
  const log = (msg, cls = '') => {
    const el = document.createElement('div');
    el.className = 'log-line ' + cls;
    el.textContent = msg;
    $('logPane').appendChild(el);
    $('logPane').scrollTop = $('logPane').scrollHeight;
  };
  const uid = () => Math.random().toString(36).slice(2, 10);

  // ---------- FFmpeg setup ----------
  const ffmpeg = new FFmpeg();
  let ffmpegReady = false;

  ffmpeg.on('log', ({ message }) => {
    if (message && message.length < 300) log(message);
  });
  ffmpeg.on('progress', ({ progress }) => {
    const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
    $('progressFill').style.width = pct + '%';
  });

  async function loadFFmpeg() {
    const baseURL = '/vendor/ffmpeg-core';
    log('FFmpeg.load() 호출…');
    console.log('[editor] starting ffmpeg.load');
    try {
      await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      });
      ffmpegReady = true;
      $('statusText').textContent = 'Ready';
      $('renderBtn').disabled = false;
      log('FFmpeg loaded.', 'ok');
      console.log('[editor] ffmpeg ready');
    } catch (e) {
      $('statusText').textContent = 'FFmpeg 로딩 실패';
      log('FFmpeg load error: ' + (e && e.message ? e.message : String(e)), 'err');
      console.error('[editor] ffmpeg load failed:', e);
    }
  }
  loadFFmpeg();

  // ---------- Helpers ----------
  function getAspect() {
    const v = $('aspectSelect').value;
    const qEl = $('qualitySelect');
    const quality = qEl ? qEl.value : '1080';
    const baseLong = quality === '720' ? 1280 : 1920;
    const baseShort = quality === '720' ? 720 : 1080;
    if (v === '9:16') return { w: baseShort, h: baseLong };
    if (v === '1:1') return { w: baseShort, h: baseShort };
    return { w: baseLong, h: baseShort };
  }
  function fitFilter(w, h) {
    return `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`;
  }
  function clipUsedDuration(c) {
    if (c.type === 'image') return c.duration;
    return Math.max(0, (c.trimEnd ?? c.mediaDuration) - (c.trimStart ?? 0));
  }
  function totalDuration() {
    return state.clips.reduce((s, c) => s + clipUsedDuration(c), 0);
  }

  function getVideoDuration(file) {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => resolve(v.duration || 0);
      v.onerror = () => resolve(0);
      v.src = URL.createObjectURL(file);
    });
  }

  function getVideoFirstFrame(file) {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata'; v.muted = true; v.playsInline = true;
      v.crossOrigin = 'anonymous';
      v.onloadeddata = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = v.videoWidth; canvas.height = v.videoHeight;
          canvas.getContext('2d').drawImage(v, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } catch { resolve(null); }
      };
      v.onerror = () => resolve(null);
      v.src = URL.createObjectURL(file);
      v.currentTime = 0.1;
    });
  }

  // Capture N evenly-spaced low-res thumbnails for the trim strip background
  function captureVideoStrip(file, count = 16) {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'auto'; v.muted = true; v.playsInline = true;
      v.crossOrigin = 'anonymous';
      v.src = URL.createObjectURL(file);
      v.onloadedmetadata = async () => {
        const dur = v.duration || 0;
        if (!dur) { URL.revokeObjectURL(v.src); return resolve([]); }
        const frames = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const W = 160;
        const H = Math.max(1, Math.round(W * (v.videoHeight || 1) / (v.videoWidth || 1)));
        canvas.width = W; canvas.height = H;
        for (let i = 0; i < count; i++) {
          const t = ((i + 0.5) / count) * dur;
          await new Promise((r) => {
            const onSeek = () => { v.removeEventListener('seeked', onSeek); r(); };
            v.addEventListener('seeked', onSeek);
            v.currentTime = Math.min(t, dur - 0.01);
          });
          ctx.drawImage(v, 0, 0, W, H);
          frames.push({ time: t, dataUrl: canvas.toDataURL('image/jpeg', 0.6) });
        }
        URL.revokeObjectURL(v.src);
        resolve(frames);
      };
      v.onerror = () => resolve([]);
    });
  }

  function frameNearestTime(frames, time) {
    if (!frames || frames.length === 0) return null;
    let best = frames[0], bestDiff = Math.abs(best.time - time);
    for (const f of frames) {
      const d = Math.abs(f.time - time);
      if (d < bestDiff) { best = f; bestDiff = d; }
    }
    return best.dataUrl;
  }

  // Reusable video element per clip for exact frame seeking
  function getClipCaptureVideo(clip) {
    if (clip._captureVideo) return clip._captureVideo;
    const v = document.createElement('video');
    v.src = clip.url; v.muted = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
    clip._captureVideo = v;
    return v;
  }

  function captureExactFrame(clip, time) {
    return new Promise((resolve) => {
      const v = getClipCaptureVideo(clip);
      const dur = v.duration || clip.mediaDuration || 0;
      const target = Math.max(0, Math.min(dur - 0.01, time));
      const onSeeked = () => {
        v.removeEventListener('seeked', onSeeked);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = v.videoWidth; canvas.height = v.videoHeight;
          canvas.getContext('2d').drawImage(v, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } catch { resolve(null); }
      };
      v.addEventListener('seeked', onSeeked);
      if (v.readyState >= 1) {
        v.currentTime = target;
      } else {
        v.addEventListener('loadedmetadata', () => { v.currentTime = target; }, { once: true });
      }
    });
  }

  // ---------- Media import ----------
  async function addMediaFiles(files) {
    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) continue;

      const url = URL.createObjectURL(file);
      const clip = {
        id: uid(),
        type: isVideo ? 'video' : 'image',
        file, name: file.name, url,
        duration: isVideo ? 0 : 3,
        trimStart: 0, trimEnd: 0,
        mediaDuration: 0,
        thumbDataUrl: isImage ? url : null,
      };
      if (isVideo) {
        clip.mediaDuration = await getVideoDuration(file);
        clip.duration = clip.mediaDuration;
        clip.trimEnd = clip.mediaDuration;
        clip.thumbDataUrl = await getVideoFirstFrame(file);
        clip.stripFrames = null;
        // Generate trim-strip thumbnails in the background so the user can keep adding clips
        captureVideoStrip(file, 16).then((frames) => {
          clip.stripFrames = frames;
          if (state.selectedClipId === clip.id) renderClipInspector();
        });
      }
      state.clips.push(clip);
    }
    renderAll();
  }

  $('mediaInput').addEventListener('change', async (e) => {
    await addMediaFiles(Array.from(e.target.files || []));
    e.target.value = '';
  });

  // External file drop (anywhere on the page → timeline)
  let dragFileDepth = 0;
  const isFileDrag = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');
  window.addEventListener('dragenter', (e) => {
    if (!isFileDrag(e)) return;
    dragFileDepth++;
    $('timeline').classList.add('file-drop-active');
  });
  window.addEventListener('dragleave', (e) => {
    if (!isFileDrag(e)) return;
    dragFileDepth--;
    if (dragFileDepth <= 0) {
      dragFileDepth = 0;
      $('timeline').classList.remove('file-drop-active');
    }
  });
  window.addEventListener('dragover', (e) => {
    if (isFileDrag(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
  });
  window.addEventListener('drop', async (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragFileDepth = 0;
    $('timeline').classList.remove('file-drop-active');
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) await addMediaFiles(files);
  });

  $('bgmInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    await selectBgmFromFile(file);
  });

  $('aspectSelect').addEventListener('change', () => renderDesignStage());
  if ($('qualitySelect')) $('qualitySelect').addEventListener('change', () => renderDesignStage());

  // ---------- Text overlays ----------
  $('addTextBtn').onclick = () => {
    const total = totalDuration() || 3;
    const t = {
      id: uid(),
      text: '텍스트',
      fontSize: 64,
      color: '#ffffff',
      fontWeight: 700,
      xPct: 50, yPct: 50,
      startTime: 0,
      endTime: total,
    };
    state.texts.push(t);
    state.selectedTextId = t.id;
    renderAll();
  };

  function clampText(t) {
    const total = Math.max(0.1, totalDuration());
    t.startTime = Math.max(0, Math.min(t.startTime, total - 0.1));
    t.endTime = Math.max(t.startTime + 0.1, Math.min(t.endTime, total));
    t.xPct = Math.max(0, Math.min(100, t.xPct));
    t.yPct = Math.max(0, Math.min(100, t.yPct));
  }

  function renderTextList() {
    const box = $('textList');
    if (state.texts.length === 0) {
      box.innerHTML = '<div class="empty-text" id="textListEmpty">「텍스트 추가」 버튼으로 새 텍스트를 만드세요.</div>';
      return;
    }
    box.innerHTML = '<div class="text-list"></div>';
    const list = box.querySelector('.text-list');
    for (const t of state.texts) {
      const row = document.createElement('div');
      row.className = 'text-row' + (t.id === state.selectedTextId ? ' selected' : '');
      row.innerHTML = `
        <div class="text-preview">${t.text || '(빈 텍스트)'}</div>
        <div class="text-meta">
          <span>${t.fontSize}px · ${t.color}</span>
          <span>${t.startTime.toFixed(1)}s → ${t.endTime.toFixed(1)}s</span>
        </div>
      `;
      row.onclick = () => { state.selectedTextId = t.id; renderAll(); };
      list.appendChild(row);
    }
  }

  function renderTextInspector() {
    const box = $('textInspector');
    const t = state.texts.find(x => x.id === state.selectedTextId);
    if (!t) {
      box.innerHTML = '<div class="empty-text">텍스트를 추가하거나 선택하세요.</div>';
      return;
    }
    const total = Math.max(0.1, totalDuration());
    box.innerHTML = '';

    const mkRow = (label, node, value) => {
      const r = document.createElement('div'); r.className = 'row';
      const l = document.createElement('label'); l.textContent = label;
      r.appendChild(l); r.appendChild(node);
      if (value !== undefined) {
        const v = document.createElement('span'); v.className = 'value'; v.textContent = value;
        r.appendChild(v);
      }
      return r;
    };

    const txt = document.createElement('input');
    txt.type = 'text'; txt.value = t.text;
    txt.oninput = () => { t.text = txt.value; renderTextList(); renderDesignStage(); };
    box.appendChild(mkRow('내용', txt));

    const size = document.createElement('input');
    size.type = 'range'; size.min = '12'; size.max = '240'; size.step = '1'; size.value = t.fontSize;
    const sizeRow = mkRow('크기', size, t.fontSize + 'px');
    size.oninput = () => { t.fontSize = parseInt(size.value); sizeRow.querySelector('.value').textContent = t.fontSize + 'px'; renderDesignStage(); renderTextList(); };
    box.appendChild(sizeRow);

    const col = document.createElement('input');
    col.type = 'color'; col.value = t.color;
    col.oninput = () => { t.color = col.value; renderDesignStage(); renderTextList(); };
    box.appendChild(mkRow('색상', col));

    const xR = document.createElement('input');
    xR.type = 'range'; xR.min = '0'; xR.max = '100'; xR.step = '0.5'; xR.value = t.xPct;
    const xRow = mkRow('가로 위치', xR, t.xPct.toFixed(0) + '%');
    xR.oninput = () => { t.xPct = parseFloat(xR.value); xRow.querySelector('.value').textContent = t.xPct.toFixed(0) + '%'; renderDesignStage(); };
    box.appendChild(xRow);

    const yR = document.createElement('input');
    yR.type = 'range'; yR.min = '0'; yR.max = '100'; yR.step = '0.5'; yR.value = t.yPct;
    const yRow = mkRow('세로 위치', yR, t.yPct.toFixed(0) + '%');
    yR.oninput = () => { t.yPct = parseFloat(yR.value); yRow.querySelector('.value').textContent = t.yPct.toFixed(0) + '%'; renderDesignStage(); };
    box.appendChild(yRow);

    // Timing - dual range
    const dr = document.createElement('div'); dr.className = 'dual-range';
    const track = document.createElement('div'); track.className = 'track';
    const fill = document.createElement('div'); fill.className = 'track-fill';
    const minR = document.createElement('input');
    minR.type = 'range'; minR.min = '0'; minR.max = String(total); minR.step = '0.1'; minR.value = t.startTime;
    const maxR = document.createElement('input');
    maxR.type = 'range'; maxR.min = '0'; maxR.max = String(total); maxR.step = '0.1'; maxR.value = t.endTime;
    dr.appendChild(track); dr.appendChild(fill); dr.appendChild(minR); dr.appendChild(maxR);

    const tRow = document.createElement('div'); tRow.className = 'row';
    const tL = document.createElement('label'); tL.textContent = '노출 구간';
    tRow.appendChild(tL); tRow.appendChild(dr);
    const tV = document.createElement('span'); tV.className = 'value'; tV.style.width = '120px';
    tV.textContent = `${t.startTime.toFixed(1)}–${t.endTime.toFixed(1)}s`;
    tRow.appendChild(tV);
    box.appendChild(tRow);

    const updateFill = () => {
      const a = parseFloat(minR.value), b = parseFloat(maxR.value);
      fill.style.left = (a / total * 100) + '%';
      fill.style.right = (100 - b / total * 100) + '%';
    };
    minR.oninput = () => {
      if (parseFloat(minR.value) >= parseFloat(maxR.value) - 0.1) minR.value = (parseFloat(maxR.value) - 0.1).toFixed(1);
      t.startTime = parseFloat(minR.value); clampText(t);
      tV.textContent = `${t.startTime.toFixed(1)}–${t.endTime.toFixed(1)}s`;
      updateFill(); renderTextList();
    };
    maxR.oninput = () => {
      if (parseFloat(maxR.value) <= parseFloat(minR.value) + 0.1) maxR.value = (parseFloat(minR.value) + 0.1).toFixed(1);
      t.endTime = parseFloat(maxR.value); clampText(t);
      tV.textContent = `${t.startTime.toFixed(1)}–${t.endTime.toFixed(1)}s`;
      updateFill(); renderTextList();
    };
    updateFill();

    const del = document.createElement('button');
    del.className = 'remove-btn'; del.textContent = '× 텍스트 삭제';
    del.onclick = () => {
      state.texts = state.texts.filter(x => x.id !== t.id);
      if (state.selectedTextId === t.id) state.selectedTextId = null;
      renderAll();
    };
    box.appendChild(del);
  }

  // ---------- Design stage ----------
  function renderDesignStage() {
    const wrap = $('designStage');
    const aspect = getAspect();
    const ratio = aspect.w / aspect.h;
    const maxW = Math.min(560, wrap.parentElement.clientWidth || 560);
    const maxH = 480;
    let w = maxW, h = maxW / ratio;
    if (h > maxH) { h = maxH; w = maxH * ratio; }
    wrap.style.width = w + 'px';
    wrap.style.height = h + 'px';

    // Clear (preserve empty placeholder if no clips)
    wrap.innerHTML = '';

    if (state.clips.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'stage-empty';
      empty.textContent = '미리보기 영역 — 클립을 추가하면 첫 프레임이 배경으로 표시됩니다. 텍스트를 끌어 위치를 정하세요.';
      wrap.appendChild(empty);
    } else {
      const bg = state.clips[0];
      if (bg.thumbDataUrl) {
        const img = document.createElement('img');
        img.className = 'stage-bg';
        img.src = bg.thumbDataUrl;
        wrap.appendChild(img);
      }
    }

    for (const t of state.texts) {
      const el = document.createElement('div');
      el.className = 'text-overlay' + (t.id === state.selectedTextId ? ' selected' : '');
      el.style.left = t.xPct + '%';
      el.style.top = t.yPct + '%';
      const scaledFontPx = t.fontSize * (h / aspect.h);
      el.style.fontSize = scaledFontPx + 'px';
      el.style.color = t.color;
      el.style.fontWeight = String(t.fontWeight);
      el.textContent = t.text || '텍스트';
      el.dataset.id = t.id;

      el.onpointerdown = (ev) => {
        ev.preventDefault();
        // Update selection without rebuilding the stage (so we keep dragging this exact element)
        state.selectedTextId = t.id;
        wrap.querySelectorAll('.text-overlay').forEach(n => {
          n.classList.toggle('selected', n.dataset.id === t.id);
        });
        renderTextList();
        renderTextInspector();

        const rect = wrap.getBoundingClientRect();
        let pendingX = t.xPct, pendingY = t.yPct;
        let rafScheduled = false;

        const applyFrame = () => {
          rafScheduled = false;
          t.xPct = pendingX;
          t.yPct = pendingY;
          el.style.left = pendingX + '%';
          el.style.top = pendingY + '%';
        };

        const move = (mv) => {
          const px = mv.clientX - rect.left;
          const py = mv.clientY - rect.top;
          pendingX = Math.max(0, Math.min(100, (px / rect.width) * 100));
          pendingY = Math.max(0, Math.min(100, (py / rect.height) * 100));
          if (!rafScheduled) {
            rafScheduled = true;
            requestAnimationFrame(applyFrame);
          }
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          if (rafScheduled) applyFrame();
          renderTextList();      // refresh meta line
          renderTextInspector(); // refresh x/y slider values
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      };
      wrap.appendChild(el);
    }
  }

  // ---------- Timeline ----------
  let dragClipId = null;

  function renderTimeline() {
    const tl = $('timeline');
    tl.innerHTML = '';
    if (state.clips.length === 0) {
      tl.innerHTML = '<div class="empty">상단의 「사진/영상 추가」 버튼을 누르거나 파일을 여기로 끌어다 놓으세요.</div>';
      return;
    }
    for (const clip of state.clips) {
      const el = document.createElement('div');
      el.className = 'clip' + (clip.id === state.selectedClipId ? ' selected' : '');
      el.dataset.id = clip.id;
      el.draggable = true;

      const thumb = document.createElement('div');
      thumb.className = 'clip-thumb';
      if (clip.thumbDataUrl) {
        const img = document.createElement('img');
        img.src = clip.thumbDataUrl;
        img.draggable = false;
        thumb.appendChild(img);
      } else if (clip.type === 'video') {
        const v = document.createElement('video');
        v.src = clip.url; v.muted = true;
        thumb.appendChild(v);
      }
      el.appendChild(thumb);

      const type = document.createElement('div');
      type.className = 'clip-type'; type.textContent = clip.type;
      el.appendChild(type);

      const name = document.createElement('div');
      name.className = 'clip-name'; name.textContent = clip.name;
      el.appendChild(name);

      const dur = document.createElement('div');
      dur.className = 'clip-duration';
      dur.textContent = clipUsedDuration(clip).toFixed(1) + 's';
      el.appendChild(dur);

      const actions = document.createElement('div');
      actions.className = 'clip-actions';
      const db = document.createElement('button'); db.textContent = '×'; db.onclick = (ev) => { ev.stopPropagation(); removeClip(clip.id); };
      actions.appendChild(db);
      el.appendChild(actions);

      el.onclick = () => { state.selectedClipId = clip.id; renderAll(); };

      el.ondragstart = (ev) => {
        dragClipId = clip.id;
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/x-clip-id', clip.id);
        setTimeout(() => el.classList.add('dragging'), 0);
      };
      el.ondragend = () => {
        dragClipId = null;
        el.classList.remove('dragging');
        clearDropIndicator();
      };
      tl.appendChild(el);
    }
  }

  function clearDropIndicator() {
    document.querySelectorAll('.drop-indicator').forEach(n => n.remove());
  }

  function computeDropIndex(ev) {
    const tl = $('timeline');
    const items = Array.from(tl.querySelectorAll('.clip'));
    let idx = items.length;
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      if (ev.clientX < r.left + r.width / 2) { idx = i; break; }
    }
    return idx;
  }

  function bindTimelineReorder() {
    const tl = $('timeline');
    tl.addEventListener('dragover', (ev) => {
      if (!dragClipId) return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'move';
      const idx = computeDropIndex(ev);
      clearDropIndicator();
      const ind = document.createElement('div');
      ind.className = 'drop-indicator';
      const items = Array.from(tl.querySelectorAll('.clip'));
      if (idx >= items.length) tl.appendChild(ind);
      else tl.insertBefore(ind, items[idx]);
    });
    tl.addEventListener('dragleave', (ev) => {
      if (!tl.contains(ev.relatedTarget)) clearDropIndicator();
    });
    tl.addEventListener('drop', (ev) => {
      if (!dragClipId) return;
      ev.preventDefault();
      ev.stopPropagation();
      const fromIdx = state.clips.findIndex(c => c.id === dragClipId);
      let toIdx = computeDropIndex(ev);
      clearDropIndicator();
      if (fromIdx < 0) return;
      const [moved] = state.clips.splice(fromIdx, 1);
      if (toIdx > fromIdx) toIdx--;
      state.clips.splice(toIdx, 0, moved);
      renderAll();
    });
  }
  bindTimelineReorder();

  function removeClip(id) {
    const idx = state.clips.findIndex(c => c.id === id);
    if (idx < 0) return;
    URL.revokeObjectURL(state.clips[idx].url);
    state.clips.splice(idx, 1);
    if (state.selectedClipId === id) state.selectedClipId = null;
    renderAll();
  }

  // ---------- Clip inspector ----------
  function renderClipInspector() {
    const box = $('clipInspector');
    const clip = state.clips.find(c => c.id === state.selectedClipId);
    if (!clip) {
      box.innerHTML = '<div class="empty-text">타임라인에서 클립을 선택하세요.</div>';
      return;
    }
    box.innerHTML = '';
    if (clip.type === 'image') {
      const row = document.createElement('div'); row.className = 'row';
      const l = document.createElement('label'); l.textContent = '노출 시간';
      row.appendChild(l);
      const slider = document.createElement('input');
      slider.type = 'range'; slider.min = '0.5'; slider.max = '4'; slider.step = '0.1'; slider.value = Math.min(clip.duration, 4);
      const val = document.createElement('span'); val.className = 'value'; val.textContent = clip.duration.toFixed(1) + 's';
      slider.oninput = () => {
        clip.duration = parseFloat(slider.value);
        val.textContent = clip.duration.toFixed(1) + 's';
        renderTimeline();
        rebalanceTexts();
      };
      row.appendChild(slider); row.appendChild(val);
      box.appendChild(row);
    } else {
      const total = clip.mediaDuration || 0.1;

      const editor = document.createElement('div'); editor.className = 'trim-editor';

      // Start / End preview thumbnails
      const thumbs = document.createElement('div'); thumbs.className = 'trim-thumbs';
      const mkThumbBox = (labelText, time) => {
        const box2 = document.createElement('div'); box2.className = 'trim-thumb-box';
        const frame = document.createElement('div'); frame.className = 'trim-thumb-frame';
        const img = document.createElement('img'); img.className = 'trim-thumb-img';
        img.onload = () => {
          if (img.naturalWidth && img.naturalHeight) {
            frame.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
          }
        };
        img.src = frameNearestTime(clip.stripFrames, time) || clip.thumbDataUrl || '';
        frame.appendChild(img);
        const lbl = document.createElement('div'); lbl.className = 'trim-thumb-label';
        lbl.textContent = `${labelText} ${time.toFixed(2)}s`;
        box2.appendChild(frame); box2.appendChild(lbl);
        return { box: box2, img, lbl };
      };
      const startThumb = mkThumbBox('시작', clip.trimStart);
      const endThumb = mkThumbBox('끝', clip.trimEnd);
      thumbs.appendChild(startThumb.box);
      thumbs.appendChild(endThumb.box);
      editor.appendChild(thumbs);

      // Strip with handles
      const strip = document.createElement('div'); strip.className = 'trim-strip';
      const stripBg = document.createElement('div'); stripBg.className = 'trim-strip-bg';
      if (clip.stripFrames && clip.stripFrames.length) {
        for (const f of clip.stripFrames) {
          const img = document.createElement('img'); img.src = f.dataUrl; img.draggable = false;
          stripBg.appendChild(img);
        }
      } else if (clip.thumbDataUrl) {
        const img = document.createElement('img'); img.src = clip.thumbDataUrl; img.draggable = false;
        stripBg.appendChild(img);
      } else {
        const ph = document.createElement('div'); ph.className = 'strip-placeholder';
        stripBg.appendChild(ph);
      }
      strip.appendChild(stripBg);
      const fill = document.createElement('div'); fill.className = 'trim-strip-fill';
      strip.appendChild(fill);
      const startHandle = document.createElement('div'); startHandle.className = 'trim-handle';
      const endHandle = document.createElement('div'); endHandle.className = 'trim-handle';
      strip.appendChild(startHandle); strip.appendChild(endHandle);
      editor.appendChild(strip);

      const useRow = document.createElement('div'); useRow.className = 'row'; useRow.style.marginTop = '4px';
      useRow.innerHTML = `<label>사용 길이</label><span class="value">${clipUsedDuration(clip).toFixed(2)}s / ${total.toFixed(2)}s</span>`;
      const useVal = useRow.querySelector('.value');
      editor.appendChild(useRow);

      box.appendChild(editor);

      const updateUi = () => {
        const sp = (clip.trimStart / total) * 100;
        const ep = (clip.trimEnd / total) * 100;
        startHandle.style.left = sp + '%';
        endHandle.style.left = ep + '%';
        fill.style.left = sp + '%';
        fill.style.right = (100 - ep) + '%';
        startThumb.lbl.textContent = `시작 ${clip.trimStart.toFixed(2)}s`;
        endThumb.lbl.textContent = `끝 ${clip.trimEnd.toFixed(2)}s`;
        useVal.textContent = `${clipUsedDuration(clip).toFixed(2)}s / ${total.toFixed(2)}s`;
      };
      updateUi();

      const bindHandle = (handleEl, which) => {
        handleEl.onpointerdown = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const rect = strip.getBoundingClientRect();
          let raf = false;
          const apply = (clientX) => {
            const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
            const t = (x / rect.width) * total;
            if (which === 'start') {
              clip.trimStart = Math.max(0, Math.min(t, clip.trimEnd - 0.1));
            } else {
              clip.trimEnd = Math.min(total, Math.max(t, clip.trimStart + 0.1));
            }
          };
          const move = (mv) => {
            apply(mv.clientX);
            if (raf) return;
            raf = true;
            requestAnimationFrame(() => {
              raf = false;
              updateUi();
              renderTimeline();
              const target = which === 'start' ? clip.trimStart : clip.trimEnd;
              const tImg = which === 'start' ? startThumb.img : endThumb.img;
              const cached = frameNearestTime(clip.stripFrames, target);
              if (cached) tImg.src = cached;
            });
          };
          const up = async () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            updateUi();
            rebalanceTexts();
            // Final exact-frame capture for the preview thumbnail
            const target = which === 'start' ? clip.trimStart : clip.trimEnd;
            const tImg = which === 'start' ? startThumb.img : endThumb.img;
            const exact = await captureExactFrame(clip, target);
            if (exact) tImg.src = exact;
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        };
      };
      bindHandle(startHandle, 'start');
      bindHandle(endHandle, 'end');
    }
  }

  function rebalanceTexts() {
    const total = Math.max(0.1, totalDuration());
    for (const t of state.texts) {
      if (t.endTime > total) t.endTime = total;
      if (t.startTime >= t.endTime - 0.1) t.startTime = Math.max(0, t.endTime - 0.1);
    }
    renderTextList();
    renderTextInspector();
  }

  // ---------- BGM ----------
  let bgmLibrary = [];
  let bgmSourceTab = 'library';      // 'library' | 'upload'
  let bgmPreviewAudio = null;        // currently playing preview audio

  async function loadBgmLibrary() {
    try {
      const res = await fetch('/api/generate/bgm/list');
      const json = await res.json();
      bgmLibrary = (json && json.data) || [];
    } catch (e) {
      log('BGM 라이브러리 로드 실패: ' + e.message, 'err');
      bgmLibrary = [];
    }
    renderBgmInspector();
  }

  async function decodeBgmBuffer(arrayBuffer) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new Ctx();
    try {
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      const channel = audioBuffer.getChannelData(0);
      const samples = 240;
      const blockSize = Math.max(1, Math.floor(channel.length / samples));
      const peaks = new Float32Array(samples);
      for (let i = 0; i < samples; i++) {
        let max = 0;
        const off = i * blockSize;
        for (let j = 0; j < blockSize; j++) {
          const v = Math.abs(channel[off + j] || 0);
          if (v > max) max = v;
        }
        peaks[i] = max;
      }
      audioCtx.close();
      return { duration: audioBuffer.duration, peaks };
    } catch (e) {
      audioCtx.close();
      throw e;
    }
  }

  function resetBgmPreview() {
    if (bgmPreviewAudio) { try { bgmPreviewAudio.pause(); } catch {} bgmPreviewAudio = null; }
  }

  async function selectBgmFromServer(item) {
    resetBgmPreview();
    if (state.bgm && state.bgm.fileUrl) URL.revokeObjectURL(state.bgm.fileUrl);
    log(`BGM 디코딩: ${item.filename}`);
    try {
      const buf = await fetch(item.url).then(r => r.arrayBuffer());
      const { duration, peaks } = await decodeBgmBuffer(buf);
      state.bgm = {
        source: 'server', name: item.filename, url: item.url, file: null, fileUrl: null,
        volume: 0.8, duration, trimStart: 0, trimEnd: duration, peaks,
      };
      renderBgmInspector();
    } catch (e) {
      log('BGM 디코딩 실패: ' + e.message, 'err');
    }
  }

  async function selectBgmFromFile(file) {
    resetBgmPreview();
    if (state.bgm && state.bgm.fileUrl) URL.revokeObjectURL(state.bgm.fileUrl);
    log(`BGM 디코딩: ${file.name}`);
    try {
      const buf = await file.arrayBuffer();
      const { duration, peaks } = await decodeBgmBuffer(buf);
      state.bgm = {
        source: 'upload', name: file.name, url: null, file,
        fileUrl: URL.createObjectURL(file),
        volume: 0.8, duration, trimStart: 0, trimEnd: duration, peaks,
      };
      renderBgmInspector();
    } catch (e) {
      log('BGM 디코딩 실패: ' + e.message, 'err');
    }
  }

  function drawWaveform(canvas, peaks) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 64;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(162,155,254,0.7)';
    const barW = w / peaks.length;
    const mid = h / 2;
    for (let i = 0; i < peaks.length; i++) {
      const v = peaks[i];
      const half = Math.max(1, v * (h * 0.45));
      ctx.fillRect(i * barW, mid - half, Math.max(0.5, barW - 0.5), half * 2);
    }
  }

  function renderBgmInspector() {
    const box = $('bgmInspector');
    box.innerHTML = '';

    // Source tabs
    const tabs = document.createElement('div'); tabs.className = 'bgm-source-tabs';
    const mkTab = (key, label) => {
      const b = document.createElement('button');
      b.textContent = label;
      if (bgmSourceTab === key) b.classList.add('active');
      b.onclick = () => { bgmSourceTab = key; resetBgmPreview(); renderBgmInspector(); };
      return b;
    };
    tabs.appendChild(mkTab('library', '라이브러리'));
    tabs.appendChild(mkTab('upload', '업로드'));
    box.appendChild(tabs);

    if (bgmSourceTab === 'library') {
      const list = document.createElement('div'); list.className = 'bgm-list';
      if (bgmLibrary.length === 0) {
        list.innerHTML = '<div class="empty-text">서버에 저장된 BGM이 없습니다.</div>';
      } else {
        for (const item of bgmLibrary) {
          const row = document.createElement('div'); row.className = 'bgm-item';
          if (state.bgm && state.bgm.source === 'server' && state.bgm.name === item.filename) {
            row.classList.add('selected');
          }
          const n = document.createElement('div'); n.className = 'bgm-item-name'; n.textContent = item.filename;
          const s = document.createElement('div'); s.className = 'bgm-item-size'; s.textContent = item.size;
          const playBtn = document.createElement('button');
          playBtn.textContent = '▶';
          let audio = null;
          playBtn.onclick = () => {
            if (audio && !audio.paused) {
              audio.pause(); playBtn.textContent = '▶'; return;
            }
            resetBgmPreview();
            audio = new Audio(item.url);
            bgmPreviewAudio = audio;
            audio.onended = () => { playBtn.textContent = '▶'; };
            audio.play().then(() => { playBtn.textContent = '⏸'; }).catch(err => log('재생 실패: ' + err.message, 'err'));
          };
          const useBtn = document.createElement('button');
          useBtn.className = 'use-btn'; useBtn.textContent = '선택';
          useBtn.onclick = () => selectBgmFromServer(item);
          row.appendChild(n); row.appendChild(s); row.appendChild(playBtn); row.appendChild(useBtn);
          list.appendChild(row);
        }
      }
      box.appendChild(list);

      const refresh = document.createElement('div');
      refresh.style.cssText = 'text-align:right;margin-top:6px;';
      const reBtn = document.createElement('button');
      reBtn.style.cssText = 'background:transparent;border:none;color:var(--dim);font-size:11px;cursor:pointer;font-family:inherit;';
      reBtn.textContent = '↻ 새로고침';
      reBtn.onclick = loadBgmLibrary;
      refresh.appendChild(reBtn);
      box.appendChild(refresh);
    } else {
      const drop = document.createElement('label'); drop.className = 'bgm-upload-area';
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'audio/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) await selectBgmFromFile(file);
      };
      const txt = document.createElement('div'); txt.textContent = '＋ 오디오 파일 선택';
      drop.appendChild(input); drop.appendChild(txt);
      box.appendChild(drop);
    }

    if (!state.bgm) return;

    const sel = document.createElement('div'); sel.className = 'bgm-selected';

    const nm = document.createElement('div'); nm.className = 'bgm-name';
    nm.textContent = state.bgm.name + (state.bgm.source === 'server' ? ' (라이브러리)' : ' (업로드)');
    sel.appendChild(nm);

    // Waveform + trim handles
    const wrap = document.createElement('div'); wrap.className = 'bgm-waveform-wrap';
    const canvas = document.createElement('canvas'); wrap.appendChild(canvas);
    const fill = document.createElement('div'); fill.className = 'bgm-trim-fill'; wrap.appendChild(fill);
    const startHandle = document.createElement('div'); startHandle.className = 'trim-handle';
    const endHandle = document.createElement('div'); endHandle.className = 'trim-handle';
    wrap.appendChild(startHandle); wrap.appendChild(endHandle);
    sel.appendChild(wrap);

    const tRow = document.createElement('div'); tRow.className = 'row';
    tRow.innerHTML = `<label>구간</label>`;
    const tVal = document.createElement('span'); tVal.className = 'value'; tVal.style.width = '160px';
    tRow.appendChild(tVal);
    sel.appendChild(tRow);

    // 트림 구간 미리듣기 + 영상 길이에 맞춤
    const actionRow = document.createElement('div');
    actionRow.style.cssText = 'display:flex;gap:8px;';

    const previewBtn = document.createElement('button');
    previewBtn.style.cssText =
      'padding:6px 12px;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-size:11px;border-radius:6px;cursor:pointer;font-family:inherit;';
    previewBtn.textContent = '▶ 구간 미리듣기';
    let previewTimer = null;
    const stopPreview = () => {
      if (bgmPreviewAudio) { try { bgmPreviewAudio.pause(); } catch {} bgmPreviewAudio = null; }
      if (previewTimer) { clearInterval(previewTimer); previewTimer = null; }
      previewBtn.textContent = '▶ 구간 미리듣기';
    };
    previewBtn.onclick = () => {
      if (bgmPreviewAudio && !bgmPreviewAudio.paused) {
        stopPreview();
        return;
      }
      resetBgmPreview();          // 라이브러리 미리듣기와 충돌 방지
      const srcUrl = state.bgm.fileUrl || state.bgm.url;
      if (!srcUrl) return;
      const audio = new Audio(srcUrl);
      bgmPreviewAudio = audio;
      const s = state.bgm.trimStart || 0;
      const e = state.bgm.trimEnd || state.bgm.duration || 0;
      audio.currentTime = s;
      audio.volume = state.bgm.volume != null ? state.bgm.volume : 0.8;
      audio.play()
        .then(() => { previewBtn.textContent = '⏸ 정지'; })
        .catch((err) => log('미리듣기 실패: ' + err.message, 'err'));
      audio.onended = stopPreview;
      // 트림 끝점에 도달하면 정지
      previewTimer = setInterval(() => {
        if (!bgmPreviewAudio) return;
        if (bgmPreviewAudio.currentTime >= e) stopPreview();
      }, 100);
    };
    actionRow.appendChild(previewBtn);

    // "영상 길이에 맞춤" — 현재 타임라인 길이만큼만 BGM에서 선택. 시작점은 유지하되 폭만 영상 길이로.
    const fitBtn = document.createElement('button');
    fitBtn.style.cssText =
      'padding:6px 12px;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-size:11px;border-radius:6px;cursor:pointer;font-family:inherit;';
    fitBtn.textContent = '영상 길이에 맞춤';
    fitBtn.onclick = () => {
      const videoSec = totalDuration();
      if (videoSec <= 0) { log('타임라인에 클립이 없습니다.', 'err'); return; }
      const total = state.bgm.duration || 0;
      const wantedDur = Math.min(videoSec, total);
      let s = state.bgm.trimStart || 0;
      if (s + wantedDur > total) s = Math.max(0, total - wantedDur);
      state.bgm.trimStart = s;
      state.bgm.trimEnd = s + wantedDur;
      stopPreview();
      renderBgmInspector();
    };
    actionRow.appendChild(fitBtn);
    sel.appendChild(actionRow);

    const fmt = (s) => {
      const m = Math.floor(s / 60);
      const ss = (s - m * 60).toFixed(1);
      return `${m}:${ss.padStart(4, '0')}`;
    };

    const updateTrim = () => {
      const total = state.bgm.duration || 0.1;
      const sp = (state.bgm.trimStart / total) * 100;
      const ep = (state.bgm.trimEnd / total) * 100;
      startHandle.style.left = sp + '%';
      endHandle.style.left = ep + '%';
      fill.style.left = sp + '%';
      fill.style.right = (100 - ep) + '%';
      tVal.textContent = `${fmt(state.bgm.trimStart)}–${fmt(state.bgm.trimEnd)} (${(state.bgm.trimEnd - state.bgm.trimStart).toFixed(1)}s)`;
    };

    const bindHandle = (handleEl, which) => {
      handleEl.onpointerdown = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const rect = wrap.getBoundingClientRect();
        let raf = false;
        const apply = (clientX) => {
          const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
          const t = (x / rect.width) * state.bgm.duration;
          if (which === 'start') {
            state.bgm.trimStart = Math.max(0, Math.min(t, state.bgm.trimEnd - 0.5));
          } else {
            state.bgm.trimEnd = Math.min(state.bgm.duration, Math.max(t, state.bgm.trimStart + 0.5));
          }
        };
        const move = (mv) => {
          apply(mv.clientX);
          if (raf) return;
          raf = true;
          requestAnimationFrame(() => { raf = false; updateTrim(); });
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          updateTrim();
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      };
    };
    bindHandle(startHandle, 'start');
    bindHandle(endHandle, 'end');

    // Defer drawing until canvas has a size in the layout
    requestAnimationFrame(() => {
      drawWaveform(canvas, state.bgm.peaks);
      updateTrim();
    });

    // Volume
    const vRow = document.createElement('div'); vRow.className = 'row';
    vRow.innerHTML = `<label>볼륨</label>`;
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '0'; slider.max = '1'; slider.step = '0.05'; slider.value = state.bgm.volume;
    const pct = document.createElement('span'); pct.className = 'value';
    pct.textContent = Math.round(state.bgm.volume * 100) + '%';
    slider.oninput = () => {
      state.bgm.volume = parseFloat(slider.value);
      pct.textContent = Math.round(state.bgm.volume * 100) + '%';
    };
    vRow.appendChild(slider); vRow.appendChild(pct);
    sel.appendChild(vRow);

    const remove = document.createElement('button');
    remove.className = 'remove-btn'; remove.textContent = '× BGM 제거';
    remove.onclick = () => {
      if (state.bgm && state.bgm.fileUrl) URL.revokeObjectURL(state.bgm.fileUrl);
      state.bgm = null;
      renderBgmInspector();
    };
    sel.appendChild(remove);

    box.appendChild(sel);
  }

  function renderAll() {
    renderTimeline();
    renderClipInspector();
    renderDesignStage();
    renderTextList();
    renderTextInspector();
  }
  window.addEventListener('resize', () => renderDesignStage());

  // ---------- Text PNG rendering ----------
  async function makeTextPNG(text, outW, outH) {
    const canvas = document.createElement('canvas');
    canvas.width = outW; canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.font = `${text.fontWeight} ${text.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", sans-serif`;
    ctx.fillStyle = text.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    const x = outW * (text.xPct / 100);
    const y = outH * (text.yPct / 100);
    const lines = (text.text || '').split('\n');
    const lh = text.fontSize * 1.2;
    const yStart = y - ((lines.length - 1) * lh) / 2;
    lines.forEach((ln, i) => ctx.fillText(ln, x, yStart + i * lh));
    return new Promise(r => canvas.toBlob(b => r(b), 'image/png'));
  }

  // ---------- Render pipeline ----------
  async function renderVideo() {
    if (state.rendering) return;
    if (!ffmpegReady) { log('FFmpeg 아직 준비 안됨', 'err'); return; }
    if (state.clips.length === 0) { log('클립을 먼저 추가하세요.', 'err'); return; }

    state.rendering = true;
    $('renderBtn').disabled = true; $('downloadBtn').disabled = true;
    $('progressBar').classList.add('active'); $('progressFill').style.width = '0%';
    $('statusText').textContent = '렌더링 중…';

    const { w, h } = getAspect();
    const fps = 30;
    const segments = [];

    // ffmpeg.wasm exec는 비정상 종료(non-zero exit)에도 promise를 reject하지 않는다.
    // 이걸 일반 try/catch로 잡으려면 exit code를 직접 확인해 throw 해줘야 한다.
    const run = async (args) => {
      const code = await ffmpeg.exec(args);
      if (code !== 0) {
        throw new Error(`ffmpeg exited with code ${code}`);
      }
      return code;
    };

    try {
      // 시작 전 타임라인 전체 길이를 미리 확인 — 의도와 다르게 길면 즉시 중단할 기회
      const totalSec = totalDuration();
      log(`타임라인 ${state.clips.length}개 클립, 총 ${totalSec.toFixed(2)}초`);
      state.clips.forEach((c, i) => {
        log(`  [${i + 1}] ${c.type} ${c.name || ''} — ${clipUsedDuration(c).toFixed(2)}s`);
      });
      if (totalSec > 600) {
        const ok = confirm(`타임라인 총 길이가 ${(totalSec / 60).toFixed(1)}분으로 매우 깁니다. 정말 계속할까요?`);
        if (!ok) {
          log('사용자가 렌더링 취소', 'err');
          throw new Error('User cancelled');
        }
      }

      // Step 1 — normalize clips
      for (let i = 0; i < state.clips.length; i++) {
        const clip = state.clips[i];
        const outName = `seg_${String(i).padStart(3, '0')}.mp4`;
        const inputName = `in_${i}.${clip.type === 'image' ? 'img' : 'mp4'}`;
        log(`[${i + 1}/${state.clips.length}] ${clip.type} → 정규화 (${clipUsedDuration(clip).toFixed(2)}s)`);
        await ffmpeg.writeFile(inputName, await fetchFile(clip.file));

        // 모든 세그먼트가 동일한 video stream 파라미터를 갖도록 filter_complex 패턴을 통일
        //   → 이후 concat demuxer + -c copy 로 재인코딩 없이 합칠 수 있음
        const vFilter = `[0:v]${fitFilter(w, h)},fps=${fps},setsar=1[vout]`;

        if (clip.type === 'image') {
          const dur = clip.duration;
          await run([
            '-y', '-loop', '1', '-t', String(dur), '-i', inputName,
            '-f', 'lavfi', '-t', String(dur), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
            '-filter_complex', `${vFilter};[1:a]anull[aout]`,
            '-map', '[vout]', '-map', '[aout]',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
            '-shortest', outName,
          ]);
        } else {
          const start = clip.trimStart || 0;
          const dur = Math.max(0.1, (clip.trimEnd || clip.mediaDuration) - start);
          // 영상에 오디오가 있는지 미리 판단 (브라우저 video 엘리먼트 기준).
          // (ffmpeg.wasm에서 amix=inputs=2 + [0:a?] 패턴은 오디오가 없을 때 abort 함)
          let hasAudio = false;
          try {
            const probe = document.createElement('video');
            probe.preload = 'metadata'; probe.muted = true;
            probe.src = clip.url;
            await new Promise((res) => {
              probe.onloadedmetadata = res;
              probe.onerror = res;
              setTimeout(res, 3000);
            });
            // 브라우저별 비표준 시그널을 가능한 한 모아 본다
            hasAudio = !!(probe.mozHasAudio || probe.webkitAudioDecodedByteCount || (probe.audioTracks && probe.audioTracks.length > 0));
          } catch {}

          const aFilter = hasAudio
            ? `[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=0,aresample=44100[aout]`
            : `[1:a]anull[aout]`;

          await run([
            '-y',
            '-ss', String(start), '-t', String(dur), '-i', inputName,
            '-f', 'lavfi', '-t', String(dur), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
            '-filter_complex', `${vFilter};${aFilter}`,
            '-map', '[vout]', '-map', '[aout]',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
            '-shortest', outName,
          ]).catch(async (err) => {
            // hasAudio 잘못 판단했을 경우 silent로 폴백
            log('amix 실패, silent로 재시도: ' + err.message, 'err');
            await run([
              '-y',
              '-ss', String(start), '-t', String(dur), '-i', inputName,
              '-f', 'lavfi', '-t', String(dur), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
              '-filter_complex', `${vFilter};[1:a]anull[aout]`,
              '-map', '[vout]', '-map', '[aout]',
              '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
              '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
              '-shortest', outName,
            ]);
          });
        }
        segments.push(outName);
        await ffmpeg.deleteFile(inputName).catch(() => {});
      }

      // Step 2 — concat (demuxer + -c copy: 재인코딩 없음, 매우 빠름)
      //  모든 세그먼트가 동일한 filter_complex 패턴으로 인코딩되어 stream 파라미터가 같다.
      //  혹시 -c copy가 거부하면 filter-based concat으로 폴백한다.
      log('병합 중…');
      if (segments.length === 1) {
        const data = await ffmpeg.readFile(segments[0]);
        await ffmpeg.writeFile('concat.mp4', data);
      } else {
        const listTxt = segments.map(n => `file '${n}'`).join('\n');
        await ffmpeg.writeFile('concat.txt', new TextEncoder().encode(listTxt));
        try {
          await run(['-y', '-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'concat.mp4']);
        } catch (err) {
          log('concat -c copy 실패, filter로 재인코딩 폴백: ' + err.message, 'err');
          const concatInputs = [];
          const labels = [];
          for (let i = 0; i < segments.length; i++) {
            concatInputs.push('-i', segments[i]);
            labels.push(`[${i}:v:0][${i}:a:0]`);
          }
          const concatFilter = `${labels.join('')}concat=n=${segments.length}:v=1:a=1[vout][aout]`;
          await run([
            '-y',
            ...concatInputs,
            '-filter_complex', concatFilter,
            '-map', '[vout]', '-map', '[aout]',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
            'concat.mp4',
          ]);
        }
      }

      // Step 3 — text overlays + BGM in one final pass (if any)
      const hasTexts = state.texts.length > 0;
      const hasBgm = !!state.bgm;
      let finalOut = 'output.mp4';

      if (hasTexts || hasBgm) {
        const inputs = ['-i', 'concat.mp4'];

        // text PNGs as inputs
        const textPngNames = [];
        if (hasTexts) {
          log(`텍스트 ${state.texts.length}개 생성…`);
          for (let i = 0; i < state.texts.length; i++) {
            const name = `text_${i}.png`;
            const blob = await makeTextPNG(state.texts[i], w, h);
            await ffmpeg.writeFile(name, new Uint8Array(await blob.arrayBuffer()));
            inputs.push('-loop', '1', '-i', name);
            textPngNames.push(name);
          }
        }
        if (hasBgm) {
          const bgmSource = state.bgm.file || state.bgm.url;  // File for upload, URL for server lib
          await ffmpeg.writeFile('bgm.original', await fetchFile(bgmSource));
          const bStart = state.bgm.trimStart || 0;
          const bEnd = state.bgm.trimEnd || state.bgm.duration || 0;
          const bDur = Math.max(0.1, bEnd - bStart);
          // 1) 사용자가 선택한 BGM 구간만 추출 (.m4a로 컨테이너 명시)
          await run([
            '-y',
            '-ss', String(bStart),
            '-t', String(bDur),
            '-i', 'bgm.original',
            '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2',
            'bgm.segment.m4a',
          ]);
          await ffmpeg.deleteFile('bgm.original').catch(() => {});

          // 2) 영상 총 길이만큼만 — 부족하면 반복(stream_loop), 넘치면 자름(-t)
          //    → 결과는 정확히 totalSec 짜리 finite 오디오 파일.
          //    이 단계가 없으면 stream_loop된 무한 입력 + amix duration=first 조합이
          //    -shortest를 무력화시켜 출력이 BGM 길이만큼 길어지는 경우가 있음.
          await run([
            '-y',
            '-stream_loop', '-1',
            '-i', 'bgm.segment.m4a',
            '-t', String(totalSec),
            '-c:a', 'copy',
            'bgm.m4a',
          ]);
          await ffmpeg.deleteFile('bgm.segment.m4a').catch(() => {});

          // 최종 패스에서 BGM은 더 이상 무한이 아니라 정확히 totalSec짜리 → loop 옵션 불필요
          inputs.push('-i', 'bgm.m4a');
        }

        const bgmIdx = 1 + (hasTexts ? state.texts.length : 0); // input index of bgm
        const filters = [];
        let vLabel = '[0:v]';
        if (hasTexts) {
          for (let i = 0; i < state.texts.length; i++) {
            const tx = state.texts[i];
            const inIdx = 1 + i; // input index of this text png
            filters.push(`${vLabel}[${inIdx}:v]overlay=0:0:enable='between(t,${tx.startTime.toFixed(2)},${tx.endTime.toFixed(2)})'[v${i + 1}]`);
            vLabel = `[v${i + 1}]`;
          }
          // Rename the last produced label to [vout]
          const last = filters.pop();
          filters.push(last.replace(/\[v\d+\]$/, '[vout]'));
        }
        // -map references: bracketed = filter graph label, non-bracketed = input stream
        const vFinalLabel = hasTexts ? '[vout]' : '0:v';

        let aFinalLabel;
        if (hasBgm) {
          const vol = state.bgm.volume.toFixed(2);
          filters.push(`[0:a]volume=0.4[a0]`);
          filters.push(`[${bgmIdx}:a]volume=${vol}[a1]`);
          filters.push(`[a0][a1]amix=inputs=2:duration=first:dropout_transition=0[aout]`);
          aFinalLabel = '[aout]';
        } else {
          aFinalLabel = '0:a';
        }

        // 텍스트 오버레이가 없으면 비디오 스트림은 재인코딩 없이 copy → 큰 속도 향상
        const videoCodecArgs = hasTexts
          ? ['-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p']
          : ['-c:v', 'copy'];

        const args = [
          '-y',
          ...inputs,
          '-filter_complex', filters.join('; '),
          '-map', vFinalLabel,
          '-map', aFinalLabel,
          ...videoCodecArgs,
          '-c:a', 'aac', '-b:a', '160k',
          '-shortest',
          finalOut,
        ];
        log('최종 합성 중…');
        await run(args);

        for (const n of textPngNames) await ffmpeg.deleteFile(n).catch(() => {});
        await ffmpeg.deleteFile('bgm.m4a').catch(() => {});
        await ffmpeg.deleteFile('concat.mp4').catch(() => {});
      } else {
        // No texts and no bgm — concat.mp4 IS the output
        const data = await ffmpeg.readFile('concat.mp4');
        await ffmpeg.writeFile('output.mp4', data);
        await ffmpeg.deleteFile('concat.mp4').catch(() => {});
      }

      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      if (state.outputUrl) URL.revokeObjectURL(state.outputUrl);
      state.outputUrl = URL.createObjectURL(blob);

      $('resultSection').classList.add('visible');
      $('renderedVideo').src = state.outputUrl;
      $('previewCaption').textContent = `${w}×${h} · ${(blob.size / 1024 / 1024).toFixed(2)} MB`;
      $('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });

      for (const n of segments) await ffmpeg.deleteFile(n).catch(() => {});
      await ffmpeg.deleteFile('concat.txt').catch(() => {});
      await ffmpeg.deleteFile('output.mp4').catch(() => {});

      $('downloadBtn').disabled = false;
      log('완료', 'ok');
      $('statusText').textContent = 'Ready';
    } catch (e) {
      log('에러: ' + e.message, 'err');
      $('statusText').textContent = '실패';
    } finally {
      state.rendering = false;
      $('renderBtn').disabled = false;
      $('progressBar').classList.remove('active');
    }
  }

  $('renderBtn').onclick = renderVideo;
  const downloadOutput = () => {
    if (!state.outputUrl) return;
    const a = document.createElement('a');
    a.href = state.outputUrl;
    a.download = `heyhoai-${Date.now()}.mp4`;
    a.click();
  };
  $('downloadBtn').onclick = downloadOutput;
  $('resultDownloadBtn').onclick = downloadOutput;

  // Init
  renderAll();
  renderBgmInspector();
  loadBgmLibrary();

  // ── Auto-populate from previous-step media ─────────────────────────────
  //  loadFFmpeg가 끝나기 전에 무거운 fetch/디코딩을 시작하면 메인 스레드가 점유돼
  //  FFmpeg 워커 메시지 콜백이 밀려 "FFmpeg 로딩 중…" 상태에서 멈춰 보이는 문제가 있었다.
  //  → ffmpegReady를 기다린 뒤 fire-and-forget로 실행한다.
  //  필요한 시점에 호스트 페이지가 호출 가능하도록 loadMedia 함수를 반환한다.
  //  initialClipUrls / initialBgmUrl 이 비어있으면 아무것도 하지 않음.
  const waitForFFmpeg = () => new Promise((resolve) => {
    if (ffmpegReady) return resolve();
    const t0 = Date.now();
    const check = () => {
      if (ffmpegReady) return resolve();
      // FFmpeg가 실패해도(또는 매우 느려도) 30초 후엔 그냥 진행한다.
      if (Date.now() - t0 > 30000) return resolve();
      setTimeout(check, 200);
    };
    check();
  });

  async function loadMedia(more = {}) {
    await waitForFFmpeg();
    if (Array.isArray(more.initialClipUrls) && more.initialClipUrls.length) {
      const fetched = [];
      for (const url of more.initialClipUrls) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const blob = await res.blob();
          const name = (url.split('/').pop() || 'media').split('?')[0];
          let type = blob.type;
          if (!type) {
            if (/\.(mp4|mov|webm)$/i.test(name)) type = 'video/mp4';
            else if (/\.(png)$/i.test(name)) type = 'image/png';
            else if (/\.(jpg|jpeg)$/i.test(name)) type = 'image/jpeg';
          }
          fetched.push(new File([blob], name, { type: type || 'application/octet-stream' }));
        } catch (e) { log('Auto-populate fetch error: ' + e.message, 'err'); }
      }
      if (fetched.length) await addMediaFiles(fetched);
    }
    if (more.initialBgmUrl) {
      try {
        const res = await fetch(more.initialBgmUrl);
        if (res.ok) {
          const blob = await res.blob();
          const name = more.initialBgmName || (more.initialBgmUrl.split('/').pop() || 'bgm.mp3').split('?')[0];
          await selectBgmFromFile(new File([blob], name, { type: blob.type || 'audio/mpeg' }));
        }
      } catch (e) { log('Auto-populate BGM error: ' + e.message, 'err'); }
    }
  }

  loadMedia(opts); // fire-and-forget — initEditor 자체는 즉시 resolve

  // 호스트 페이지(template-flow)가 재진입 시 신규 미디어만 추가로 넣을 수 있게 핸들 반환
  return { loadMedia };
}
