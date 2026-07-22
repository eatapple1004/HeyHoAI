/**
 * Product Pack — 오케스트레이터.
 * 입력(사진 1~N + 카테고리 + 구성) → 레퍼 베이크 → 스틸 배치 → 다개체 합성 → 매니페스트.
 *
 * 스토리지 무관: workDir(로컬)에 산출물을 쓰고 {key,path} 매니페스트를 반환한다.
 *   라우트가 이후 mediaStore로 업로드하고 DB에 pack_asset을 적재한다(배선 계층 분리).
 */
const fs = require('fs');
const path = require('path');
const { suiteFor } = require('./suites');
const { bakeRefs } = require('./refBake.service');
const { genStill } = require('./stills.service');
const { composeRow } = require('./compositor');

/**
 * @param {object} p
 * @param {string[]} p.sourcePaths            업로드 소스 이미지 경로
 * @param {string}   p.vertical               카테고리(suites 키)
 * @param {string}   p.product                제품 서술(프롬프트 컨텍스트)
 * @param {Array<{sku,label}>} [p.skus]       세트/변형 구성(없으면 단일)
 * @param {string}   p.workDir                산출물 로컬 디렉터리
 * @param {Array<{sku,path}>}  [p.refs]       미리 준비된 캐논 레퍼(있으면 베이크 스킵 — 테스트/재실행용)
 * @param {string[]} [p.only]                 생성할 still key 화이트리스트
 * @param {(e:object)=>void} [p.onProgress]
 * @returns {Promise<{vertical, product, refs:[], stills:[], composites:[]}>}
 */
async function runPack({ sourcePaths, vertical, product, skus, workDir, refs, only, onProgress }) {
  fs.mkdirSync(workDir, { recursive: true });
  const suite = suiteFor(vertical);
  const manifest = { vertical: suite.vertical, product, refs: [], stills: [], composites: [] };
  const emit = (e) => { try { onProgress && onProgress(e); } catch (_) {} };

  // 1) 레퍼 확보 — 주어졌으면 스킵, 아니면 베이크
  if (refs && refs.length) {
    manifest.refs = refs.map((r) => ({ sku: r.sku, key: `ref_${r.sku}`, path: r.path }));
  } else {
    const baked = await bakeRefs({ sourcePaths, skus, refBake: suite.refBake });
    for (const b of baked) {
      const p = path.join(workDir, `ref_${b.sku}.jpg`);
      fs.writeFileSync(p, b.buffer);
      manifest.refs.push({ sku: b.sku, key: `ref_${b.sku}`, path: p });
      emit({ stage: 'ref', key: b.sku });
    }
  }
  const primaryRef = manifest.refs[0].path;
  const ctx = { product };

  // 2) 단품 스틸 배치
  for (const cut of suite.stills) {
    if (only && !only.includes(cut.key)) continue;
    try {
      const buf = await genStill({ canonRefPath: primaryRef, cut, ctx });
      const p = path.join(workDir, `${cut.key}.jpg`);
      fs.writeFileSync(p, buf);
      manifest.stills.push({ key: cut.key, label: cut.label, path: p });
      emit({ stage: 'still', key: cut.key });
    } catch (e) {
      emit({ stage: 'still', key: cut.key, error: e.message });
    }
  }

  // 3) 다개체 합성 — 세트(레퍼 2장 이상)일 때만
  if (manifest.refs.length > 1) {
    for (const comp of suite.composites) {
      try {
        const refPaths = manifest.refs.map((r) => r.path);
        const buf = comp.method === 'row' ? await composeRow(refPaths) : null;
        if (!buf) continue;
        const p = path.join(workDir, `${comp.key}.jpg`);
        fs.writeFileSync(p, buf);
        manifest.composites.push({ key: comp.key, label: comp.label, path: p });
        emit({ stage: 'composite', key: comp.key });
      } catch (e) {
        emit({ stage: 'composite', key: comp.key, error: e.message });
      }
    }
  }

  return manifest;
}

module.exports = { runPack };
