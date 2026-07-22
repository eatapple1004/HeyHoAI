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
const { runPack } = require('./pack.service');
const { bakeOne } = require('./refBake.service');            // 레퍼 재굽기
const { genStill } = require('./stills.service');            // 컷 재생성·추가
const { suiteFor } = require('./suites');                    // 컷 라이브러리(컨셉 추가) + refBake 스펙
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
  if (stored && stored.promptText) return { key: stored.key, label: stored.label, w: stored.w, h: stored.h, neg: stored.neg, prompt: stored.promptText };
  const suite = suiteFor(pack.vertical);
  const s = (suite.stills || []).find((c) => c.key === cutKey);
  if (s) return s; // suite 컷(prompt는 함수 — genStill이 처리)
  if (stored) return { key: stored.key, label: stored.label, w: stored.w || 768, h: stored.h || 960, neg: stored.neg, prompt: stored.label }; // 최후: 라벨로라도
  return null;
}

/** 최신 캐논 레퍼의 로컬 경로(재생성 참조용). 없거나 로컬 파일 유실이면 null. */
function latestRefPath(pack) {
  const refs = (pack.assets || []).filter((a) => a.kind === 'ref' && a.url);
  for (let i = refs.length - 1; i >= 0; i--) { const p = localPathForUrl(refs[i].url); if (fs.existsSync(p)) return p; }
  return null;
}

async function processPack(pack, { sourcePaths, vertical, product, skus, userId }) {
  pack.config = pack.config || {};
  pack.product = pack.product || product;
  const workDir = path.join(process.cwd(), 'tmp', 'pack', pack.share_id);
  fs.mkdirSync(workDir, { recursive: true });
  // 소스 사진을 durable 위치로 복사(멀터 임시 → 팩 workDir) → 레퍼 재굽기가 나중에 읽게.
  const durableSources = [];
  (sourcePaths || []).forEach((sp, i) => {
    try { const dst = path.join(workDir, `src_${i}${path.extname(sp) || '.jpg'}`); fs.copyFileSync(sp, dst); durableSources.push(dst); }
    catch (_) { durableSources.push(sp); }
  });
  try {
    await runPack({
      sourcePaths: durableSources, vertical, product, skus, workDir,
      onPlan: async (plan) => { await repo.setPlan(pack.id, plan); },  // plan={total,slots,cuts,refSkus,product,vertical,sources}
      onAsset: async (a) => { await recordAsset(pack, { kind: a.kind, key: a.key, label: a.label, absPath: a.path, userId }); },
      onProgress: (e) => logger.info?.(`[pack ${pack.id}] ${JSON.stringify(e)}`),
    });
    await repo.setStatus(pack.id, 'done');
  } catch (e) {
    logger.error?.(`[pack ${pack.id}] failed: ${e.message}`);
    await repo.setStatus(pack.id, 'failed', e.message);
  }
}

router.post('/', upload.array('photos', 10), async (req, res, next) => {
  try {
    if (!req.files || !req.files.length) return res.status(400).json({ error: '사진을 업로드하세요' });
    const vertical = req.body.vertical || 'beverage';
    const product = (req.body.product || '').slice(0, 300);
    let skus = null;
    try { skus = req.body.skus ? JSON.parse(req.body.skus) : null; } catch (_) { skus = null; }

    const pack = await repo.createPack({
      userId: req.user && req.user.id, vertical, product, config: { skus, photoCount: req.files.length },
    });
    res.status(202).json({ id: pack.id, shareId: pack.share_id, status: 'processing' });

    setImmediate(() => processPack(pack, {
      sourcePaths: req.files.map((f) => f.path), vertical, product, skus, userId: req.user && req.user.id,
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
    const refPath = latestRefPath(pack);
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
    const skuLabel = ((plan.refSkus || []).find((s) => s.sku === sku) || {}).label;
    const buf = await bakeOne({ sourcePaths: sources, label: skuLabel, refBake: suite.refBake });
    const asset = await recordAsset(pack, { kind: 'ref', key: `ref_${sku}`, label: sku, buffer: buf, userId: req.user && req.user.id });
    res.json({ asset });
  } catch (e) { next(e); }
});

module.exports = router;
