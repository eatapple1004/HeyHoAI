/**
 * Product Pack — API 라우트.
 *   POST /api/pack                  업로드 + 생성 시작(즉시 202, 백그라운드 처리)
 *   GET  /api/pack/:id              팩 + 자산 조회(상태 폴링)
 *   POST /api/pack/:id/regenerate-cut  {cutKey}  같은 컨셉 재생성(새 버전)
 *   POST /api/pack/:id/rebake-ref      {sku?}    캐논 레퍼 재굽기(새 버전)
 *   POST /api/pack/:id/add-cut         {cutKey}  라이브러리에서 컨셉 추가
 *   GET  /api/pack/:id/cut-library                추가 가능한 컷(안 뽑힌 것)
 *
 * 통합 시 index.js 1줄: app.use('/api/pack', requireAuth, require('./pack/pack.route'));
 */
const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../lib/logger');
const mediaStore = require('../storage/mediaStore');
const repo = require('./pack.repository');
const { runPack, sniffMime } = require('./pack.service');
const { classifyProduct } = require('./planner.service');    // 확인 단계용 가벼운 분류
const { bakeOne } = require('./refBake.service');            // 레퍼 재굽기
const { genStill } = require('./stills.service');            // 컷 재생성·추가
const { composeRow } = require('./compositor');              // 세트 합성(generate 단계)
const { suiteFor, STATE_COMPOSITES } = require('./suites');  // 컷 라이브러리(컨셉 추가) + refBake 스펙 + 상태 합성
const promptRepo = require('../generate/prompt.repository'); // 크리에이션 dual-write(내 크리에이션·라이브러리·공유 = generation_results→prompts)
const resultRepo = require('../generate/result.repository');
const teamCredit = require('../teams/team.credit');         // 활성 팀 — prompt.team_id에 붙여야 팀 유저 피드에 뜸

const router = Router();

const PACK_MODEL = 'Nano Banana'; // 크리에이션 카드 모델 라벨(스틸·합성·레퍼 모두 nano-banana 계열)

const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const imagesDir = path.join(process.cwd(), 'tmp', 'images'); // 생성물 = /images 프록시(로컬우선→R2) 서빙 — generate.route와 동일 규약
fs.mkdirSync(imagesDir, { recursive: true });
const upload = multer({ storage: multer.diskStorage({ destination: uploadDir }), limits: { fileSize: 12 * 1024 * 1024 } });

/** /images/<name> URL → 로컬 파일 경로(재생성이 캐논 레퍼를 참조로 읽을 때). */
function localPathForUrl(url) { return path.join(imagesDir, String(url || '').split('/').pop()); }

/** 팩의 prompt_idx 확보(크리에이션 dual-write 그룹핑 — 재생성분도 같은 배치에 묶이게). config에 캐시·영속. */
async function ensurePackPrompt(pack, userId) {
  pack.config = pack.config || {};
  if (pack.config.prompt_idx != null) return pack.config.prompt_idx;
  if (userId == null) return null;
  try {
    const teamId = await teamCredit.activeTeamId(userId).catch(() => null);
    const p = await promptRepo.insert({ userId, teamId, promptText: (pack.product || '콘텐츠 팩'), model: PACK_MODEL, tags: ['pack'] });
    pack.config.prompt_idx = p.idx;
    await repo.setPromptIdx(pack.id, p.idx);
    return p.idx;
  } catch (e) { logger.warn?.(`[pack ${pack.id}] prompt insert failed: ${e.message}`); return null; }
}

/** 자산 하나 적재: tmp/images 발행(+R2) + pack_assets(새 행=버전) + generation_results dual-write. 반환 {kind,cut_key,label,url}. */
async function recordAsset(pack, { kind, key, label, absPath, buffer, userId }) {
  const name = `pack_${pack.share_id}_${kind}_${key}_${Date.now()}.jpg`; // 버전마다 별 파일(재생성=비파괴)
  const buf = buffer || fs.readFileSync(absPath);
  fs.writeFileSync(path.join(imagesDir, name), buf);      // 로컬 우선 서빙
  await mediaStore.put(name, buf).catch(() => {});        // 영속(R2) best-effort
  const url = `/images/${name}`;
  await repo.addAsset({ packId: pack.id, kind, cutKey: key, label, url });
  try {
    const idx = await ensurePackPrompt(pack, userId);
    if (idx != null) {
      await resultRepo.insert({
        promptIdx: idx, filePath: `tmp/images/${name}`, model: PACK_MODEL,  // 피드가 basename → /images/<name> 서빙
        metadata: { source: 'pack', kind, cut_key: key, cut: label || null, pack_share_id: pack.share_id },
        visibility: 'private', templateSource: 'pack', templateName: label || '콘텐츠 팩',
      });
    }
  } catch (e) { logger.warn?.(`[pack ${pack.id}] result insert failed: ${e.message}`); }
  return { kind, cut_key: key, label, url };
}

/** 컷 키 → 생성 스펙. 우선 config.plan.cuts(플래너, 직렬 promptText) → 없으면 suite 라이브러리(함수 prompt). */
function resolveCut(pack, cutKey) {
  const plan = (pack.config && pack.config.plan) || {};
  const stored = (plan.cuts || []).find((c) => c.key === cutKey);
  // refSku = 이 컷이 어느 캐논 레퍼(상태 닫음/열음, 또는 변형 red/pink)로 생성돼야 하는지 — 재생성도 같은 레퍼를 써야 안 틀어진다.
  if (stored && stored.promptText) return { key: stored.key, label: stored.label, w: stored.w, h: stored.h, neg: stored.neg, prompt: stored.promptText, refSku: stored.refSku || null };
  const suite = suiteFor(pack.vertical);
  const s = (suite.stills || []).find((c) => c.key === cutKey);
  if (s) return s; // suite 컷(prompt는 함수 — genStill이 처리)
  if (stored) return { key: stored.key, label: stored.label, w: stored.w || 768, h: stored.h || 960, neg: stored.neg, prompt: stored.label, refSku: stored.refSku || null }; // 최후: 라벨로라도
  return null;
}

/** 최신 캐논 레퍼의 로컬 경로(재생성 참조용). 없거나 로컬 파일 유실이면 null. */
function latestRefPath(pack) {
  const refs = (pack.assets || []).filter((a) => a.kind === 'ref' && a.url);
  for (let i = refs.length - 1; i >= 0; i--) { const p = localPathForUrl(refs[i].url); if (fs.existsSync(p)) return p; }
  return null;
}

/** 특정 레퍼(상태 또는 변형 sku)의 최신 캐논 레퍼 경로. 그 레퍼가 없으면 전체 최신으로 폴백. */
function latestRefPathFor(pack, sku) {
  if (sku) {
    const refs = (pack.assets || []).filter((a) => a.kind === 'ref' && a.url && a.cut_key === `ref_${sku}`);
    for (let i = refs.length - 1; i >= 0; i--) { const p = localPathForUrl(refs[i].url); if (fs.existsSync(p)) return p; }
  }
  return latestRefPath(pack);
}

/** 합성용 레퍼 경로들 — 🔑 재굽기로 버전이 쌓이므로 **상태(sku)별 최신 1장씩**만.
 *  (안 그러면 닫힘v1·열림v1·닫힘v2 3장이 전부 나란히 붙는다.) 순서는 plan의 상태/세트 순서를 따른다. */
function composeRefPaths(pack) {
  const plan = (pack.config && pack.config.plan) || {};
  const latest = {};
  (pack.assets || []).filter((a) => a.kind === 'ref' && a.url).forEach((a) => { latest[a.cut_key || 'ref_main'] = a.url; }); // id ASC → 뒤가 최신
  const order = ((plan.states && plan.states.length) ? plan.states.map((s) => `ref_${s.key}`)
    : (plan.refSkus || []).map((s) => `ref_${s.sku}`)).filter((k) => latest[k]);
  const keys = order.length ? order : Object.keys(latest);
  return keys.map((k) => localPathForUrl(latest[k])).filter((p) => fs.existsSync(p));
}

// 1단계(prep): 분석 → 계획 저장 → **캐논 레퍼만 굽고** 멈춘다(status='ref_ready'). 스틸은 게이트 통과 후 generate에서.
async function prepPack(pack, { sourcePaths, vertical, product, skus, states, unit, category, userId }) {
  pack.config = pack.config || {};
  pack.product = pack.product || product;
  const workDir = path.join(process.cwd(), 'tmp', 'pack', pack.share_id);
  fs.mkdirSync(workDir, { recursive: true });
  // 소스 사진을 durable 위치로 복사(멀터 임시 → 팩 workDir) → 레퍼 재굽기가 나중에 읽게.
  const durableSources = [];
  (sourcePaths || []).forEach((sp, i) => {
    // 🔴 확장자로 이름 붙이면 안 된다 — multer 임시파일은 이름이 랜덤 hex라 확장자가 없어서
    //   전부 .jpg 로 붙었고, PNG를 올린 사용자에서 플래너가 media_type 불일치로 400을 맞았다.
    //   실제 바이트를 보고 이름을 정한다(파일명이 정직해야 나중에 읽는 코드도 안 속는다).
    try {
      const buf = fs.readFileSync(sp);
      const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' };
      const dst = path.join(workDir, `src_${i}${EXT[sniffMime(buf)] || path.extname(sp) || '.bin'}`);
      fs.writeFileSync(dst, buf); durableSources.push(dst);
    } catch (_) { durableSources.push(sp); }
  });
  try {
    await runPack({
      // states[].photoIndex 는 업로드 순서 기준 — durableSources가 같은 순서로 복사되므로 그대로 유효하다.
      sourcePaths: durableSources, vertical, product, skus, states, unit, category, workDir, stopAfter: 'ref',
      onPlan: async (plan) => { await repo.setPlan(pack.id, plan); },  // plan={total,slots,cuts,refSkus,product,vertical,sources}
      onAsset: async (a) => { await recordAsset(pack, { kind: a.kind, key: a.key, label: a.label, absPath: a.path, userId }); },
      onProgress: (e) => logger.info?.(`[pack ${pack.id}] ${JSON.stringify(e)}`),
    });
    await repo.setStatus(pack.id, 'ref_ready'); // 🔵 레퍼 소프트 게이트 대기
  } catch (e) {
    logger.error?.(`[pack ${pack.id}] prep failed: ${e.message}`);
    await repo.setStatus(pack.id, 'failed', e.message);
  }
}

// 2단계(generate): 게이트 통과 후 — 저장된 plan.cuts를 depth만큼 스틸 생성 + 세트면 합성. status='done'.
async function generatePack(pack, { depth, userId }) {
  try {
    const fresh = await repo.getPack({ id: pack.id });
    fresh.config = fresh.config || {};
    const plan = fresh.config.plan || {};
    const cuts = plan.cuts || [];
    if (!latestRefPath(fresh)) throw new Error('캐논 레퍼 없음');
    const ctx = { product: plan.product || fresh.product || '' };
    // depth는 앞에서 N개를 자른다 — plan.cuts가 상태별 인터리브로 저장돼 있어 부분 생성도 모든 상태를 커버한다.
    const limit = (depth && depth > 0) ? Math.min(depth, cuts.length) : cuts.length; // 0=전부
    for (const c of cuts.slice(0, limit)) {
      try {
        const cut = { key: c.key, label: c.label, w: c.w, h: c.h, neg: c.neg, prompt: c.promptText || c.label, refSku: c.refSku || null };
        // 🔑 그 컷에 배정된 레퍼로 생성(상태든 변형이든).
        //   예전엔 전부 최신 레퍼 1장만 써서, 레퍼를 N장 구워놓고도 스틸은 임의의 한 종만 나왔다.
        const buf = await genStill({ canonRefPath: latestRefPathFor(fresh, c.refSku), cut, ctx });
        await recordAsset(fresh, { kind: 'still', key: c.key, label: c.label, buffer: buf, userId });
      } catch (e) { logger.warn?.(`[pack ${fresh.id}] still ${c.key} 실패: ${e.message}`); }
    }
    // 레퍼 2장 이상이면 합성 — 상태 모드면 "상태 비교 · 나란히", 세트면 "세트 · 로우".
    const refPaths = composeRefPaths(fresh);
    const stateMode = (plan.states || []).length > 1;
    if (refPaths.length > 1) {
      for (const comp of (stateMode ? STATE_COMPOSITES : (suiteFor(fresh.vertical).composites || []))) {
        try { const buf = comp.method === 'row' ? await composeRow(refPaths) : null; if (buf) await recordAsset(fresh, { kind: 'composite', key: comp.key, label: comp.label, buffer: buf, userId }); }
        catch (e) { logger.warn?.(`[pack ${fresh.id}] composite ${comp.key} 실패: ${e.message}`); }
      }
    }
    await repo.setStatus(fresh.id, 'done');
  } catch (e) {
    logger.error?.(`[pack ${pack.id}] generate failed: ${e.message}`);
    await repo.setStatus(pack.id, 'failed', e.message);
  }
}

/** 확인 단계 — 사진+힌트로 카테고리·제품 감지(가벼움). 프론트가 "이거 맞아요?" 확인받고 POST /로 확정 생성. */
router.post('/classify', upload.array('photos', 10), async (req, res, next) => {
  try {
    if (!req.files || !req.files.length) return res.status(400).json({ error: '사진을 업로드하세요' });
    const hint = (req.body.product || '').slice(0, 300);
    const images = req.files.map((f) => ({ data: fs.readFileSync(f.path).toString('base64'), mediaType: f.mimetype || 'image/jpeg' }));
    const result = await classifyProduct({ images, hint });
    req.files.forEach((f) => { try { fs.unlinkSync(f.path); } catch (_) {} }); // 분류용 임시 업로드 정리(생성은 별도 POST에서 재업로드)
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/', upload.array('photos', 10), async (req, res, next) => {
  try {
    if (!req.files || !req.files.length) return res.status(400).json({ error: '사진을 업로드하세요' });
    const vertical = req.body.vertical || 'beverage';
    const product = (req.body.product || '').slice(0, 300);
    const category = (req.body.category || '').slice(0, 40) || null;  // 사용자가 확인·확정한 카테고리
    let skus = null;
    try { skus = req.body.skus ? JSON.parse(req.body.skus) : null; } catch (_) { skus = null; }
    // 🔵 상태(뚜껑 닫음/열음 등) — 확인 스텝에서 사용자가 켠 것만 온다. 2개↑면 상태마다 레퍼+컷세트.
    let states = null;
    try { states = req.body.states ? JSON.parse(req.body.states) : null; } catch (_) { states = null; }
    // 🔴 중복 상태 제거 — classify가 같은 뜻의 상태를 두 번 뱉는 일이 실제로 있었다("봉지 열림" ×2).
    //   그대로 두면 같은 모습의 레퍼를 두 장 굽고 컷도 2배로 만든다(크레딧 낭비). key·라벨 둘 다로 접는다.
    if (Array.isArray(states)) {
      const norm = (v) => String(v || '').toLowerCase().replace(/[\s·・‧,.\-_()[\]/]+/g, '');
      const seen = new Set();
      states = states.filter((s) => {
        if (!s || !s.key) return false;
        const k = norm(s.key), l = norm(s.label);
        if (seen.has(k) || (l && seen.has(l))) return false;
        seen.add(k); if (l) seen.add(l);
        return true;
      }).slice(0, 4);
    }
    // 한 단위 판별(단품/한 쌍/본체+박스) — 캐논 레퍼를 몇 개로 구울지. 화이트리스트 밖은 무시(기본 단품).
    const unit = ['pair', 'with_package', 'group'].includes(req.body.unit) ? req.body.unit : null;

    const pack = await repo.createPack({
      userId: req.user && req.user.id, vertical, product, config: { skus, states, unit, category, photoCount: req.files.length },
    });
    res.status(202).json({ id: pack.id, shareId: pack.share_id, status: 'processing' });

    setImmediate(() => prepPack(pack, {
      sourcePaths: req.files.map((f) => f.path), vertical, product, skus, states, unit, category, userId: req.user && req.user.id,
    }));
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const key = String(req.params.id);
    const byId = /^\d+$/.test(key);
    const pack = await repo.getPack(byId ? { id: Number(key) } : { shareId: key });
    if (!pack) return res.status(404).json({ error: 'not found' });
    res.json(pack);
  } catch (e) { next(e); }
});

/** 레퍼 게이트 통과 → 스틸 생성 시작(depth = 만들 컷 수, 0=전부). ref_ready 상태에서만. */
router.post('/:id/generate', async (req, res, next) => {
  try {
    const pack = await repo.getPack({ id: Number(req.params.id) });
    if (!pack) return res.status(404).json({ error: 'not found' });
    if (pack.status !== 'ref_ready') return res.status(409).json({ error: '게이트 대기 상태가 아니에요' });
    const depth = Math.max(0, parseInt((req.body && req.body.depth) || 0, 10) || 0);
    await repo.setStatus(pack.id, 'processing');
    res.json({ ok: true });
    setImmediate(() => generatePack(pack, { depth, userId: req.user && req.user.id }));
  } catch (e) { next(e); }
});

/** 추가 가능한 컨셉(그 카테고리 컷 라이브러리 중 아직 안 만든 것). "컨셉 추가" 메뉴용. */
router.get('/:id/cut-library', async (req, res, next) => {
  try {
    const pack = await repo.getPack({ id: Number(req.params.id) });
    if (!pack) return res.status(404).json({ error: 'not found' });
    const have = new Set((pack.assets || []).filter((a) => a.kind === 'still').map((a) => a.cut_key));
    const suite = suiteFor(pack.vertical);
    const items = (suite.stills || []).filter((c) => !have.has(c.key)).map((c) => ({ key: c.key, label: c.label }));
    res.json({ items });
  } catch (e) { next(e); }
});

/** 컷 재생성 — 같은 컨셉, 새 표본(새 버전). 기존 캐논 레퍼로 다시 생성. */
router.post('/:id/regenerate-cut', async (req, res, next) => {
  try {
    const pack = await repo.getPack({ id: Number(req.params.id) });
    if (!pack) return res.status(404).json({ error: 'not found' });
    const cut = resolveCut(pack, String((req.body && req.body.cutKey) || ''));
    if (!cut) return res.status(400).json({ error: 'unknown cut' });
    const refPath = latestRefPathFor(pack, cut.refSku); // 그 컷에 배정된 레퍼로 재생성(안 그러면 다른 상태·변형으로 바뀐다)
    if (!refPath) return res.status(409).json({ error: '캐논 레퍼가 아직 없어요(먼저 생성 완료 필요)' });
    const ctx = { product: (pack.config && pack.config.plan && pack.config.plan.product) || pack.product || '' };
    const buf = await genStill({ canonRefPath: refPath, cut, ctx });
    const asset = await recordAsset(pack, { kind: 'still', key: cut.key, label: cut.label, buffer: buf, userId: req.user && req.user.id });
    res.json({ asset });
  } catch (e) { next(e); }
});

/** 컨셉 추가 — 라이브러리 컷 하나를 새로 생성(기존 레퍼로). */
router.post('/:id/add-cut', async (req, res, next) => {
  try {
    const pack = await repo.getPack({ id: Number(req.params.id) });
    if (!pack) return res.status(404).json({ error: 'not found' });
    const cutKey = String((req.body && req.body.cutKey) || '');
    const suite = suiteFor(pack.vertical);
    const cut = (suite.stills || []).find((c) => c.key === cutKey) || resolveCut(pack, cutKey);
    if (!cut) return res.status(400).json({ error: 'unknown cut' });
    const refPath = latestRefPath(pack);
    if (!refPath) return res.status(409).json({ error: '캐논 레퍼가 아직 없어요' });
    const ctx = { product: (pack.config && pack.config.plan && pack.config.plan.product) || pack.product || '' };
    const buf = await genStill({ canonRefPath: refPath, cut, ctx });
    const asset = await recordAsset(pack, { kind: 'still', key: cut.key, label: cut.label, buffer: buf, userId: req.user && req.user.id });
    res.json({ asset });
  } catch (e) { next(e); }
});

/** 캐논 레퍼 재굽기 — 저장된 소스 사진에서 다시 베이크(새 버전). 이후 컷 재생성은 이 새 레퍼를 씀. */
router.post('/:id/rebake-ref', async (req, res, next) => {
  try {
    const pack = await repo.getPack({ id: Number(req.params.id) });
    if (!pack) return res.status(404).json({ error: 'not found' });
    const plan = (pack.config && pack.config.plan) || {};
    const sources = (plan.sources || []).filter((p) => fs.existsSync(p));
    if (!sources.length) return res.status(409).json({ error: '소스 사진이 없어 재굽기 불가(이 팩은 재굽기 전 버전)' });
    const suite = suiteFor(pack.vertical);
    const sku = String((req.body && req.body.sku) || 'main');
    const hint = String((req.body && req.body.hint) || '').slice(0, 200); // 교정(예: "한 쌍으로") — 낱개→페어 등
    const skuLabel = ((plan.refSkus || []).find((s) => s.sku === sku) || {}).label;
    // 상태 레퍼면 **그 상태를 찍은 사진**으로 다시 굽는다(전체 사진으로 구우면 다른 상태가 섞인다).
    const st = (plan.states || []).find((s) => s.key === sku);
    const stSources = st ? (st.sources || []).filter((p) => fs.existsSync(p)) : [];
    const buf = await bakeOne({
      sourcePaths: stSources.length ? stSources : sources,
      label: st ? null : skuLabel, state: st ? st.label : null,
      unit: plan.unit || (pack.config && pack.config.unit) || null,
      refBake: suite.refBake, hint,
    });
    const asset = await recordAsset(pack, { kind: 'ref', key: `ref_${sku}`, label: (st && st.label) || sku, buffer: buf, userId: req.user && req.user.id });
    res.json({ asset });
  } catch (e) { next(e); }
});

module.exports = router;
