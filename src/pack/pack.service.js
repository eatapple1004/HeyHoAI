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
const { suiteFor, NEUTRAL_STILLS, STATE_COMPOSITES } = require('./suites');
const { bakeRefs, bakeOne } = require('./refBake.service');
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
 * @param {Array<{key,label,photoIndex}>} [p.states]  상태 구성(뚜껑 닫음/열음 등). 2개↑면 상태마다 레퍼+컷세트.
 * @param {string}   [p.unit]                 한 단위 판별(single|pair|with_package|group) — 레퍼 베이크가 몇 개를 그릴지.
 * @param {string}   p.workDir                산출물 로컬 디렉터리
 * @param {Array<{sku,path}>}  [p.refs]       미리 준비된 캐논 레퍼(있으면 베이크 스킵)
 * @param {string[]} [p.only]                 생성할 cut key 화이트리스트
 * @param {boolean}  [p.noPlan]               true면 플래너 스킵(고정 suite 사용)
 * @param {(e:object)=>void} [p.onProgress]
 * @returns {Promise<{vertical, product, plan, refs:[], stills:[], composites:[]}>}
 */
async function runPack({ sourcePaths, vertical, product, skus, states, unit, category, workDir, refs, only, noPlan, stopAfter, onProgress, onAsset, onPlan }) {
  fs.mkdirSync(workDir, { recursive: true });
  const suite = suiteFor(vertical);
  const manifest = { vertical: suite.vertical, product, plan: null, refs: [], stills: [], composites: [] };
  const emit = (e) => { try { onProgress && onProgress(e); } catch (_) {} };
  // 각 자산을 **생성 즉시** 라우트에 넘긴다(업로드+DB적재) → 유저가 완료되는대로 하나씩 받는다.
  const ship = async (kind, o) => { try { onAsset && await onAsset({ kind, ...o }); } catch (_) {} };

  // 0) 비전 플래너 — 사진 분석 → 이 제품에 맞는 컷·프롬프트(1순위). 실패 시 🔴제품 중립 폴백(beverage 아님!).
  //   🔵 상태(state)가 2개 이상이면 **상태마다 플래너를 따로 호출**한다.
  //      · 호출당 출력이 8~10컷로 유지 → JSON truncation(참사 원인) 원천 차단
  //      · 총 컷 수가 상태 수만큼 선형 증가 → 20컷+가 억지 복제 없이 자연스럽게 나온다
  const stateList = (Array.isArray(states) ? states : []).filter((s) => s && s.key);
  const stateMode = stateList.length > 1;   // 1개면 기존 단일 경로 그대로(레퍼 'main').
  let cuts = NEUTRAL_STILLS;    // 플래너 실패해도 음료·성분 안 씌우고 안전한 단품 컷으로만.
  let ctxProduct = product || '';
  let planSkus = skus; // 폼이 세트를 안 줬으면 플래너가 감지한 변형으로 자동
  let planStates = null;

  const b64 = (paths) => paths.map((p) => ({ data: fs.readFileSync(p).toString('base64'), mediaType: mimeOf(p) }));
  // 상태 → 그 상태를 가장 잘 보여주는 소스 사진(지정이 없거나 범위 밖이면 전체 사진).
  const srcFor = (st) => {
    const i = Number(st && st.photoIndex);
    return (Number.isInteger(i) && i >= 0 && i < (sourcePaths || []).length) ? [sourcePaths[i]] : (sourcePaths || []);
  };
  // 상태 컷 태깅 — 🔑 키를 상태로 네임스페이스(두 상태가 같은 key를 뱉으면 assetId가 충돌해 카드가 겹친다).
  //   refSku = "이 컷을 어느 캐논 레퍼로 그릴 것인가". 상태(닫힘/열림)든 변형(red/pink)이든 같은 필드를 쓴다.
  const tag = (list, st) => list.map((c) => ({ ...c, key: `${st.key}__${c.key}`, label: `${c.label} · ${st.label}`, refSku: st.key }));

  // 🔵 컷 천장 — 플래너 한 호출의 안전선은 8~12컷이다(더 요구하면 JSON이 잘려 폴백으로 떨어진다).
  //   "대량"을 채우려면 호출을 **차수(round)로 나눈다**: 2차부터 앞서 뽑은 라벨을 넘겨 "이것 말고 다른 것"을 받는다.
  //   상태 분할과 같은 트릭 — 호출당 출력 크기는 그대로 두고 총량만 늘리므로 제품 종류와 무관하게 20컷+가 된다.
  const TARGET_CUTS = 20, PER_ROUND = 10, MAX_ROUNDS = 3;
  const roundsFor = (nUnits) => Math.max(1, Math.min(MAX_ROUNDS, Math.ceil(TARGET_CUTS / Math.max(1, nUnits) / PER_ROUND)));

  /** 한 계획 단위(상태 1개 또는 제품 전체)에 대해 차수를 돌며 컷을 모은다. 실패해도 앞 차수 결과는 살린다. */
  async function planUnit({ images, state, rounds, onMeta }) {
    const got = [];
    const taken = new Set();
    for (let r = 1; r <= rounds; r++) {
      try {
        const plan = await planPack({ images, hint: product, category, state, exclude: got.map((c) => c.label) });
        if (onMeta) onMeta(plan);
        const list = (plan.cuts && plan.cuts.length) ? plan.cuts : [];
        let added = 0;
        for (const c of list) {
          // 차수 간 키 충돌 방지 — 2차가 1차와 같은 key를 뱉을 수 있다(그러면 assetId가 겹쳐 카드가 덮인다).
          let k = c.key;
          if (taken.has(k)) k = `${k}_r${r}`;
          if (taken.has(k)) continue;
          taken.add(k); got.push({ ...c, key: k }); added++;
        }
        emit({ stage: 'plan', state: state ? state.key : null, round: r, added, total: got.length });
        if (!added) break;   // 더 뽑을 게 없다고 판단 — 빈 차수를 더 돌리지 않는다
      } catch (e) {
        emit({ stage: 'plan', state: state ? state.key : null, round: r, error: e.message });
        break;   // 이 단위는 여기까지(앞 차수에서 모은 건 그대로 쓴다)
      }
    }
    return got;
  }

  if (!noPlan && sourcePaths && sourcePaths.length) {
    if (stateMode) {
      planStates = stateList.map((s) => ({ key: s.key, label: s.label || s.key, sources: srcFor(s) }));
      const rounds = roundsFor(planStates.length);   // 상태가 이미 총량을 늘리므로 보통 1차면 충분
      const perState = [];
      for (const st of planStates) {
        const got = await planUnit({
          images: b64(st.sources), rounds,
          state: { key: st.key, label: st.label, perState: 8 },
          onMeta: (plan) => {
            if (!ctxProduct) ctxProduct = plan.product || product || '';
            if (!manifest.plan) manifest.plan = { product: plan.product, category: plan.category, ingredient: plan.ingredient, isSet: false, variants: [] };
          },
        });
        perState.push(tag(got.length ? got : NEUTRAL_STILLS, st));   // 이 상태만 중립 폴백(다른 상태는 살린다)
      }
      // 🔑 상태별 인터리브 — depth는 앞에서 N개를 자르므로, 번갈아 배치해야 부분 생성도 모든 상태를 커버한다.
      //   (안 그러면 "표준 8컷" = 상태A 8컷 + 상태B 0컷이 된다.) 각 상태 안에서는 1차 컷이 앞에 있다.
      cuts = [];
      const deepest = Math.max(...perState.map((a) => a.length));
      for (let i = 0; i < deepest; i++) for (const arr of perState) if (arr[i]) cuts.push(arr[i]);
      manifest.product = ctxProduct;
      planSkus = planStates.map((s) => ({ sku: s.key, label: s.label }));  // 레퍼를 상태마다 굽는다
      emit({ stage: 'plan-states', states: planStates.length, rounds, cuts: cuts.length });
    } else {
      // category = 사용자가 확인·확정한 카테고리(오분류 제거)
      const got = await planUnit({
        images: b64(sourcePaths), rounds: roundsFor(1),
        onMeta: (plan) => {
          if (!ctxProduct) ctxProduct = plan.product || product || '';
          if (!manifest.plan) {
            manifest.plan = { product: plan.product, category: plan.category, ingredient: plan.ingredient, isSet: plan.isSet, variants: plan.variants };
            // 세트 자동: 폼이 skus를 안 줬는데 플래너가 세트+변형 2개↑ 감지 → 그걸로 굽는다.
            if ((!skus || !skus.length) && plan.isSet && Array.isArray(plan.variants) && plan.variants.length > 1) planSkus = plan.variants;
          }
        },
      });
      if (got.length) { cuts = got; manifest.product = ctxProduct; }
      emit({ stage: 'plan-done', rounds: roundsFor(1), cuts: cuts.length });
    }
  }

  // 0.4) 세트(변형 2종 이상) — 컷을 변형에 **라운드로빈 배분**.
  //   상태와 달리 변형은 "같은 그림, 색만 다름"이라 상태처럼 N배로 뽑으면 지루한 중복이 된다.
  //   컷 수는 그대로 두고 red→pink→nude→red… 로 돌려, 컷 하나하나가 서로 다른 변형을 보여주게 한다.
  //   (안 그러면 레퍼를 N장 구워놓고 스틸은 전부 한 종만 써서, 나머지 변형은 개별 컷이 0장이 된다.)
  if (!stateMode && planSkus && planSkus.length > 1) {
    cuts = cuts.map((c, i) => {
      const v = planSkus[i % planSkus.length];
      return { ...c, refSku: v.sku, label: `${c.label} · ${v.label || v.sku}` };
    });
    emit({ stage: 'plan-variants', variants: planSkus.length, cuts: cuts.length });
  }

  // 0.5) 계획 확정 통지 — 플래너가 컷을 정한 직후 "생성될 자산 슬롯목록"을 라우트에 넘긴다.
  //   → 폴링이 config.plan 으로 받아 유저에게 "생성되는 수만큼" 스피너를 즉시 깐다(컷 UX 동일).
  //   순서는 UI 렌더 순서(스틸→합성→레퍼)로 맞춘다. 실제 생성은 레퍼가 먼저지만 그리드 배치는 이 순.
  {
    const refSkus = (planSkus && planSkus.length) ? planSkus : [{ sku: 'main' }];
    const stillCuts = only ? cuts.filter((c) => only.includes(c.key)) : cuts;
    const stillSlots = stillCuts.map((c) => ({ kind: 'still', key: c.key, label: c.label }));
    // 합성: 상태 모드면 "상태 비교 · 나란히", 세트(다른 SKU)면 기존 "세트 · 로우".
    const compList = stateMode ? STATE_COMPOSITES : suite.composites;
    const compSlots = refSkus.length > 1 ? compList.map((c) => ({ kind: 'composite', key: c.key, label: c.label })) : [];
    const refSlots = refSkus.map((s) => ({ kind: 'ref', key: `ref_${s.sku}`, label: s.label || s.sku }));
    const slots = [...stillSlots, ...compSlots, ...refSlots];
    // 컷 스펙(직렬화 가능분)·소스·컨텍스트도 함께 저장 → 라우트가 config.plan에 넣고 재생성/재굽기/컷추가에 재사용.
    //   refSku = 이 컷이 어느 캐논 레퍼로 생성돼야 하는지(재생성도 같은 레퍼를 써야 안 틀어진다).
    //   promptText: 중립 폴백 컷은 prompt가 함수라 직렬화가 안 된다 → 여기서 문자열로 확정해 재생성 가능하게.
    const planCuts = stillCuts.map((c) => ({
      key: c.key, label: c.label, w: c.w, h: c.h, neg: c.neg, aspect: c.aspect || null,
      refSku: c.refSku || null,
      promptText: c.promptText || (typeof c.prompt === 'function' ? c.prompt({ product: ctxProduct }) : null),
    }));
    try {
      onPlan && await onPlan({
        total: slots.length, slots, cuts: planCuts, refSkus, product: ctxProduct,
        vertical: suite.vertical, sources: sourcePaths || [],
        states: planStates,   // [{key,label,sources}] — 게이트 UI·상태별 재굽기가 씀
        unit: unit || null,   // 'pair'|'with_package'|'group' — 재굽기도 같은 단위를 유지해야 한다
      });
    } catch (_) {}
    emit({ stage: 'plan-slots', total: slots.length });
  }

  // 1) 레퍼 확보 — 주어졌으면 스킵, 아니면 베이크
  if (refs && refs.length) {
    manifest.refs = refs.map((r) => ({ sku: r.sku, key: `ref_${r.sku}`, path: r.path }));
  } else if (stateMode) {
    // 상태마다 **그 상태를 찍은 사진**으로 따로 굽는다(닫힘 레퍼는 닫힌 사진에서, 열림은 열린 사진에서).
    for (const st of planStates) {
      const buffer = await bakeOne({ sourcePaths: st.sources, refBake: suite.refBake, state: st.label, unit });
      const p = path.join(workDir, `ref_${st.key}.jpg`);
      fs.writeFileSync(p, buffer);
      manifest.refs.push({ sku: st.key, key: `ref_${st.key}`, label: st.label, path: p });
      emit({ stage: 'ref', key: st.key });
    }
  } else {
    const baked = await bakeRefs({ sourcePaths, skus: planSkus, refBake: suite.refBake, unit });
    for (const b of baked) {
      const p = path.join(workDir, `ref_${b.sku}.jpg`);
      fs.writeFileSync(p, b.buffer);
      manifest.refs.push({ sku: b.sku, key: `ref_${b.sku}`, path: p });
      emit({ stage: 'ref', key: b.sku });
    }
  }
  for (const r of manifest.refs) await ship('ref', { key: r.key, label: r.label || r.sku, path: r.path });
  const primaryRef = manifest.refs[0].path;
  const ctx = { product: ctxProduct };
  // 🔑 컷 → 그 컷이 쓸 캐논 레퍼. (예전엔 모든 스틸이 refs[0] 하나만 썼다 → 레퍼가 여럿이면 전부 첫 것으로 나옴.)
  const refBySku = {};
  manifest.refs.forEach((r) => { refBySku[r.sku] = r.path; });
  const refForCut = (cut) => (cut && cut.refSku && refBySku[cut.refSku]) || primaryRef;

  if (stopAfter === 'ref') return manifest; // 🔵 레퍼 소프트 게이트: 레퍼까지만 굽고 멈춘다(스틸은 사용자 확인 후 generate 단계에서).

  // 2) 스틸 배치 (플래너 컷 or suite)
  for (const cut of cuts) {
    if (only && !only.includes(cut.key)) continue;
    try {
      const buf = await genStill({ canonRefPath: refForCut(cut), cut, ctx });
      const p = path.join(workDir, `${cut.key}.jpg`);
      fs.writeFileSync(p, buf);
      manifest.stills.push({ key: cut.key, label: cut.label, path: p });
      emit({ stage: 'still', key: cut.key });
      await ship('still', { key: cut.key, label: cut.label, path: p });
    } catch (e) {
      emit({ stage: 'still', key: cut.key, error: e.message });
    }
  }

  // 3) 다개체 합성 — 레퍼 2장 이상일 때만(상태 비교 or 세트 로우)
  if (manifest.refs.length > 1) {
    for (const comp of (stateMode ? STATE_COMPOSITES : suite.composites)) {
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
