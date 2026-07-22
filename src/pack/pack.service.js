/**
 * Product Pack — 오케스트레이터.
 * 입력(사진 1~N + 카테고리 + 구성) → [비전 플래너: 사진 분석→맞춤 컷] → 레퍼 베이크
 *   → 스틸 배치 → 다개체 합성 → 매니페스트.
 *
 * 스토리지 무관: workDir(로컬)에 산출물을 쓰고 {key,path} 매니페스트를 반환한다.
 *   라우트가 이후 mediaStore로 업로드하고 DB에 pack_asset을 적재한다.
 */
const fs = require('fs');
const path = require('path');
const { suiteFor } = require('./suites');
const { bakeRefs } = require('./refBake.service');
const { genStill } = require('./stills.service');
const { composeRow } = require('./compositor');
const { planPack } = require('./planner.service');

function mimeOf(p) {
  const e = (p.split('.').pop() || '').toLowerCase();
  return e === 'png' ? 'image/png' : e === 'webp' ? 'image/webp' : 'image/jpeg';
}

/**
 * @param {object} p
 * @param {string[]} p.sourcePaths            업로드 소스 이미지 경로
 * @param {string}   [p.vertical]             카테고리(플래너 실패 시 suite 폴백에 사용)
 * @param {string}   [p.product]              판매자 힌트(플래너가 실제 서술은 자동 도출)
 * @param {Array<{sku,label}>} [p.skus]       세트/변형 구성(없으면 단일)
 * @param {string}   p.workDir                산출물 로컬 디렉터리
 * @param {Array<{sku,path}>}  [p.refs]       미리 준비된 캐논 레퍼(있으면 베이크 스킵)
 * @param {string[]} [p.only]                 생성할 cut key 화이트리스트
 * @param {boolean}  [p.noPlan]               true면 플래너 스킵(고정 suite 사용)
 * @param {(e:object)=>void} [p.onProgress]
 * @returns {Promise<{vertical, product, plan, refs:[], stills:[], composites:[]}>}
 */
async function runPack({ sourcePaths, vertical, product, skus, workDir, refs, only, noPlan, onProgress, onAsset, onPlan }) {
  fs.mkdirSync(workDir, { recursive: true });
  const suite = suiteFor(vertical);
  const manifest = { vertical: suite.vertical, product, plan: null, refs: [], stills: [], composites: [] };
  const emit = (e) => { try { onProgress && onProgress(e); } catch (_) {} };
  // 각 자산을 **생성 즉시** 라우트에 넘긴다(업로드+DB적재) → 유저가 완료되는대로 하나씩 받는다.
  const ship = async (kind, o) => { try { onAsset && await onAsset({ kind, ...o }); } catch (_) {} };

  // 0) 비전 플래너 — 사진 분석 → 이 제품에 맞는 컷·프롬프트(1순위). 실패/미사용 시 고정 suite 폴백.
  let cuts = suite.stills;
  let ctxProduct = product || '';
  let planSkus = skus; // 폼이 세트를 안 줬으면 플래너가 감지한 변형으로 자동
  if (!noPlan && sourcePaths && sourcePaths.length) {
    try {
      const images = sourcePaths.map((p) => ({ data: fs.readFileSync(p).toString('base64'), mediaType: mimeOf(p) }));
      const plan = await planPack({ images, hint: product });
      if (plan.cuts && plan.cuts.length) {
        cuts = plan.cuts;
        ctxProduct = plan.product || product || '';
        manifest.product = ctxProduct;
        manifest.plan = { product: plan.product, category: plan.category, ingredient: plan.ingredient, isSet: plan.isSet, variants: plan.variants };
        // 세트 자동: 폼이 skus를 안 줬는데 플래너가 세트+변형 2개↑ 감지 → 그걸로 굽는다.
        if ((!skus || !skus.length) && plan.isSet && Array.isArray(plan.variants) && plan.variants.length > 1) planSkus = plan.variants;
        emit({ stage: 'plan', category: plan.category, product: plan.product, cuts: cuts.length, isSet: plan.isSet, variants: (plan.variants || []).length });
      }
    } catch (e) {
      emit({ stage: 'plan', error: e.message }); // 폴백: 고정 suite
    }
  }

  // 0.5) 계획 확정 통지 — 플래너가 컷을 정한 직후 "생성될 자산 슬롯목록"을 라우트에 넘긴다.
  //   → 폴링이 config.plan 으로 받아 유저에게 "생성되는 수만큼" 스피너를 즉시 깐다(컷 UX 동일).
  //   순서는 UI 렌더 순서(스틸→합성→레퍼)로 맞춘다. 실제 생성은 레퍼가 먼저지만 그리드 배치는 이 순.
  {
    const refSkus = (planSkus && planSkus.length) ? planSkus : [{ sku: 'main' }];
    const stillCuts = only ? cuts.filter((c) => only.includes(c.key)) : cuts;
    const stillSlots = stillCuts.map((c) => ({ kind: 'still', key: c.key, label: c.label }));
    const compSlots = refSkus.length > 1 ? suite.composites.map((c) => ({ kind: 'composite', key: c.key, label: c.label })) : [];
    const refSlots = refSkus.map((s) => ({ kind: 'ref', key: `ref_${s.sku}`, label: s.sku }));
    const slots = [...stillSlots, ...compSlots, ...refSlots];
    // 컷 스펙(직렬화 가능분)·소스·컨텍스트도 함께 저장 → 라우트가 config.plan에 넣고 재생성/재굽기/컷추가에 재사용.
    const planCuts = stillCuts.map((c) => ({ key: c.key, label: c.label, w: c.w, h: c.h, neg: c.neg, aspect: c.aspect || null, promptText: c.promptText || null }));
    try {
      onPlan && await onPlan({ total: slots.length, slots, cuts: planCuts, refSkus, product: ctxProduct, vertical: suite.vertical, sources: sourcePaths || [] });
    } catch (_) {}
    emit({ stage: 'plan-slots', total: slots.length });
  }

  // 1) 레퍼 확보 — 주어졌으면 스킵, 아니면 베이크
  if (refs && refs.length) {
    manifest.refs = refs.map((r) => ({ sku: r.sku, key: `ref_${r.sku}`, path: r.path }));
  } else {
    const baked = await bakeRefs({ sourcePaths, skus: planSkus, refBake: suite.refBake });
    for (const b of baked) {
      const p = path.join(workDir, `ref_${b.sku}.jpg`);
      fs.writeFileSync(p, b.buffer);
      manifest.refs.push({ sku: b.sku, key: `ref_${b.sku}`, path: p });
      emit({ stage: 'ref', key: b.sku });
    }
  }
  for (const r of manifest.refs) await ship('ref', { key: r.key, label: r.sku, path: r.path });
  const primaryRef = manifest.refs[0].path;
  const ctx = { product: ctxProduct };

  // 2) 스틸 배치 (플래너 컷 or suite)
  for (const cut of cuts) {
    if (only && !only.includes(cut.key)) continue;
    try {
      const buf = await genStill({ canonRefPath: primaryRef, cut, ctx });
      const p = path.join(workDir, `${cut.key}.jpg`);
      fs.writeFileSync(p, buf);
      manifest.stills.push({ key: cut.key, label: cut.label, path: p });
      emit({ stage: 'still', key: cut.key });
      await ship('still', { key: cut.key, label: cut.label, path: p });
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
        await ship('composite', { key: comp.key, label: comp.label, path: p });
      } catch (e) {
        emit({ stage: 'composite', key: comp.key, error: e.message });
      }
    }
  }

  return manifest;
}

module.exports = { runPack };
