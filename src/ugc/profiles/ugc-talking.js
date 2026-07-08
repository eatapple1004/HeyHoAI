/**
 * ugc-talking — 기존 UGC(발화 스포크스퍼슨 + 제품컷 혼합) 프로파일
 * ============================================================================
 * 현행 UGC 대본 동작을 보존. spoken(아바타 립싱크 예정) + broll 혼합.
 * spoken 씬은 토킹 아바타 벤더(v4)가 필요하므로 v1에선 스튜디오 잠금 유지.
 */
module.exports = {
  outputType: 'ugc-talking',
  label: 'UGC Talking (presenter + product)',
  aspect: '9:16',
  defaultDurationSec: 20,

  sceneTypes: ['spoken', 'broll'],

  systemGuide: [
    'OUTPUT TYPE: short-form UGC ad that feels like a real person talking to camera.',
    '- Structure as a sequence of SCENES, each tagged "spoken" or "broll":',
    '    "spoken" = an on-camera presenter delivers this line (lip-synced by an avatar).',
    '    "broll"  = a product-focused shot with the message shown as caption / voiceover on top.',
    '- Mix them: intercut a talking presenter with beautiful product shots.',
    '- For "broll" scenes, write "brollPrompt": a concise product photo/video prompt (scene, angle, lighting, mood). No people faces in broll.',
    '- Keep spoken words realistic for the duration (~2.5 words/sec). Hook lands in the first 2s.',
  ].join('\n'),

  // spoken=아바타 벤더(v4), broll=제품 렌더
  renderMap: { spoken: 'presenter', broll: 'product-render' },
};
