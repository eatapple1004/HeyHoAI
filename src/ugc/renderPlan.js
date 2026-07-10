/**
 * renderPlan.js — 트랙 스택 자료구조 (재작업 0의 핵심)
 * ============================================================================
 * 최종 영상을 "트랙 스택"으로 표현한다. v1은 video + subtitle 만 채우고,
 * music / vo / presenter 는 슬롯만 비워둔다. v2~v4는 이 슬롯에 렌더러를
 * 꽂기만 하면 되므로 조립기 구조를 재작업하지 않는다.
 *
 *   video:     [{ clipUrl, startMs, durMs, sceneN }]   // v1 필수 — 모션 클립 시퀀스
 *   subtitle:  [{ text, startMs, durMs, style }]        // v1 필수 — 키네틱 자막
 *   music:     null   // v2 (배경음)
 *   vo:        null   // v3 (ElevenLabs TTS)
 *   presenter: null   // v4 (토킹 아바타 벤더)
 */

/**
 * 대본 + 렌더된 클립 → RenderPlan.
 * @param {object} script  ugcScript.service 산출 대본(scenes[] 포함)
 * @param {Array<{ sceneN:number, clipUrl:string, durationMs:number }>} clips
 *        각 broll 씬에 대응하는 모션 클립(씬 순서와 무관하게 sceneN으로 매칭)
 * @returns {object} RenderPlan
 */
function buildRenderPlan(script, clips) {
  const byScene = new Map(clips.map((c) => [c.sceneN, c]));
  const scenes = Array.isArray(script.scenes) ? script.scenes : [];

  const video = [];
  const subtitle = [];
  let cursorMs = 0;

  for (const scene of scenes) {
    const clip = byScene.get(scene.n);
    if (!clip || !clip.clipUrl) continue; // 클립 렌더 실패한 씬은 스킵(무음 갭 방지)

    const durMs = clip.durationMs || Math.round((scene.durationSec || 3) * 1000);

    // imageUrl/isStill = assembler가 동영상 클립 정규화 실패 시 정지컷으로 폴백하는 데 사용(견고성).
    video.push({ clipUrl: clip.clipUrl, startMs: cursorMs, durMs, sceneN: scene.n, imageUrl: clip.imageUrl || null, isStill: !!clip.isStill });

    // 음성 자막(A+): 기본 자막 = 그 씬에서 말하는 것(spoken). 옛 잡은 spoken 없어 onScreenText 폴백.
    // 여기선 씬당 1개(전체 문장)만 담고, 어셈블러가 청크로 확장(captionChunk) → 프리뷰 오버레이와 동일.
    const text = (scene.spoken || scene.onScreenText || '').trim();
    if (text) {
      subtitle.push({ text, startMs: cursorMs, durMs, style: 'kinetic', sceneN: scene.n }); // sceneN=음성 주도 retiming 매칭용
    }

    cursorMs += durMs;
  }

  return {
    meta: {
      outputType: script.outputType || null,
      title: script.title || '',
      aspect: script.aspect || '9:16',
      language: script.language || 'ko',
      durationMs: cursorMs,
      cta: script.cta || '',
      caption: script.caption || '',
      hashtags: script.hashtags || [],
      musicVibe: script.musicVibe || '', // v2 배경음 선택 힌트(아직 미사용)
    },
    tracks: {
      video,          // v1 필수
      subtitle,       // v1 필수
      music: null,    // v2 슬롯
      vo: null,       // v3 슬롯
      presenter: null,// v4 슬롯
    },
  };
}

/** 채워진(non-null) 트랙 이름 목록 — 조립기가 렌더할 트랙 판단용 */
function activeTracks(plan) {
  return Object.entries(plan.tracks)
    .filter(([, v]) => v != null && (!Array.isArray(v) || v.length > 0))
    .map(([k]) => k);
}

// 비율 → 픽셀 치수(Kling 영상 지원: 9:16·1:1·16:9). Gemini 이미지도 이 치수로 맞춤.
const ASPECT_DIMS = { '9:16': { w: 1080, h: 1920 }, '1:1': { w: 1080, h: 1080 }, '16:9': { w: 1920, h: 1080 } };
function aspectDims(a) { return ASPECT_DIMS[a] || ASPECT_DIMS['9:16']; }

module.exports = { buildRenderPlan, activeTracks, aspectDims, ASPECT_DIMS };
