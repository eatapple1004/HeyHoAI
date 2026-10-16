/**
 * ─── 결과물 출처(origin) — "어디서 · 무슨 기능 · 어떤 엔진으로 만들었나" (2026-10-16) ───
 *
 * generation_results.metadata.origin 에 같은 모양으로 남긴다. result.repository.insert 가 모든 저장에 자동으로 붙이고,
 * 호출부가 아는 게 더 있으면(op·실제 엔진·페이지) metadata.origin 으로 넘겨 덮어쓴다.
 *   { feature, featureLabel, op?, engine?, engineLabel?, page?, template? , fallbackFrom? }
 * 예전 행은 scripts/backfill_result_origin.js 가 같은 규칙(deriveOrigin)으로 채운다.
 */
const { TOOLS } = require('../tools/registry');

const FEATURES = {
  'create-image': 'Create Image',
  'create-video': 'Create Video',
  editor: 'Editor',
  'ad-video': 'Ad Video',
  pack: 'Content Pack',
  lens: 'Doppia Lens',
  template: 'Template',
  remix: 'Remix',
  shoot: 'Doppia Shoot',
  'face-swap': 'Face swap',
  'product-swap': 'Product swap',
  'video-editor': 'Video Editor',
};

// 엔진 표기 통일 — id·엔드포인트·costKey·라벨 어느 것으로 와도 registry 툴 하나로 모은다(예: gemini-3-pro-image-preview = Nano Banana Pro)
const BY_KEY = new Map();
for (const t of Object.values(TOOLS)) {
  for (const k of [t.id, t.model, t.refModel, t.t2vModel, t.editModel, t.label]) {
    if (k && !BY_KEY.has(String(k).toLowerCase())) BY_KEY.set(String(k).toLowerCase(), t);
  }
}
const EXTRA = { 'kling-v3': ['kling', 'Kling 3.0'], 'ugc-v1': null, 'video-editor': null, 'soul-shot': ['soul', 'Higgsfield Soul 2'] };

/** 모델 문자열 → { engine, engineLabel } (모르면 원문 그대로) */
function engineOf(model) {
  if (!model) return {};
  const m = String(model).replace(/^(faceswap|editor-[a-z_]+):?/, '');
  if (Object.prototype.hasOwnProperty.call(EXTRA, model)) return EXTRA[model] ? { engine: EXTRA[model][0], engineLabel: EXTRA[model][1] } : {};
  const t = BY_KEY.get(m.toLowerCase());
  return t ? { engine: t.id, engineLabel: t.label } : (m ? { engine: m, engineLabel: m } : {});
}

/** 요청의 페이지 경로(Referer) — "어디서" */
function pageOf(req) {
  try {
    const r = req && req.get && req.get('referer');
    return r ? new URL(r).pathname.slice(0, 80) : undefined;
  } catch (e) { return undefined; }
}

/** 행 정보만으로 출처를 추정 — 저장 시 기본값이자 백필 규칙 */
function deriveOrigin({ model, metadata, templateSource, templateName, filePath } = {}) {
  const md = metadata || {};
  const mdl = String(model || '');
  const tn = String(templateName || '');
  const isVideo = md.type === 'video' || /\.(mp4|webm|mov)$/i.test(String(filePath || ''));
  let feature; let op;
  if (tn === 'Video Editor' || mdl === 'video-editor') { feature = 'video-editor'; op = mdl === 'video-editor' ? 'export' : undefined; } // 영상 편집기 내보내기도 metadata.editor 를 쓴다 → Editor 보다 먼저
  else if (/^editor-/.test(mdl) || tn === 'Editor' || md.editor) { feature = 'editor'; op = (md.editor && md.editor.op) || mdl.replace(/^editor-/, '') || undefined; }
  else if (mdl === 'ugc-v1' || md.source === 'ugc') feature = 'ad-video';
  else if (templateSource === 'pack' || md.source === 'pack') feature = 'pack';
  else if (templateSource === 'lens' || /^Lens · /.test(tn)) feature = 'lens';
  else if (tn === 'Doppia Shoot' || md.shoot_model) feature = 'shoot';
  else if (tn === 'Face swap' || /^faceswap:/.test(mdl)) feature = 'face-swap';
  else if (tn === 'Product swap') feature = 'product-swap';
  else if (templateSource === 'marketplace' || templateSource === 'recipe') feature = 'template';
  else if (templateSource === 'creation') feature = 'remix';
  else feature = isVideo ? 'create-video' : 'create-image';

  const eng = feature === 'editor' && md.editor && md.editor.engine ? engineOf(md.editor.engine)
    : feature === 'face-swap' && md.faceswap && md.faceswap.engine ? engineOf(md.faceswap.engine)
      : feature === 'ad-video' && Array.isArray(md.engines) && md.engines.length ? { engine: md.engines.join(','), engineLabel: md.engines.map((e) => engineOf(e).engineLabel || e).join(' + ') }
        : engineOf(md.engine || mdl);
  const out = { feature, featureLabel: FEATURES[feature] || feature, ...(op ? { op } : {}), ...eng };
  if (tn && !['Editor', 'Face swap', 'Product swap', 'Video Editor', 'Doppia Shoot', 'Image'].includes(tn)) out.template = tn.slice(0, 120);
  if (md.editor && Array.isArray(md.editor.fallback_from) && md.editor.fallback_from.length) out.fallbackFrom = md.editor.fallback_from;
  return out;
}

/** 저장용: 추정값 + 호출부가 넘긴 origin(우선) — 빈 값은 버린다 */
function withOrigin(row) {
  const md = row.metadata || {};
  const given = md.origin && typeof md.origin === 'object' ? md.origin : {};
  const merged = { ...deriveOrigin(row), ...Object.fromEntries(Object.entries(given).filter(([, v]) => v != null && v !== '')) };
  if (given.feature && !given.featureLabel) merged.featureLabel = FEATURES[given.feature] || given.feature;
  return { ...md, origin: merged };
}

module.exports = { deriveOrigin, withOrigin, engineOf, pageOf, FEATURES };
