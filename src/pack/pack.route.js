/**
 * Product Pack — API 라우트.
 *   POST /api/pack        업로드 + 생성 시작(즉시 202 반환, 백그라운드 처리)
 *   GET  /api/pack/:id    팩 + 자산 조회(상태 폴링)
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

const router = Router();

const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const imagesDir = path.join(process.cwd(), 'tmp', 'images'); // 생성물은 /images 프록시(로컬우선→R2)로 서빙 — generate.route와 동일 규약
fs.mkdirSync(imagesDir, { recursive: true });
const upload = multer({ storage: multer.diskStorage({ destination: uploadDir }), limits: { fileSize: 12 * 1024 * 1024 } });

/** 자산 파일 → 공개 URL. tmp/images 로컬 write(dual-write) + R2 best-effort → /images/<name> 프록시가 서빙. */
async function publishAsset(absPath, name) {
  const buffer = fs.readFileSync(absPath);
  fs.writeFileSync(path.join(imagesDir, name), buffer);   // 로컬 우선 서빙
  await mediaStore.put(name, buffer).catch(() => {});      // 영속(R2) best-effort — 미설정 시 no-op
  return `/images/${name}`;
}

async function processPack(pack, { sourcePaths, vertical, product, skus }) {
  const workDir = path.join(process.cwd(), 'tmp', 'pack', pack.share_id);
  try {
    // onAsset: 각 컷이 **생성되는 즉시** 업로드+DB적재 → 폴링이 하나씩 집어감(완료되는대로 하나씩).
    await runPack({
      sourcePaths, vertical, product, skus, workDir,
      onAsset: async (a) => {
        const name = `pack_${pack.share_id}_${a.kind}_${a.key}.jpg`;
        const url = await publishAsset(a.path, name);
        await repo.addAsset({ packId: pack.id, kind: a.kind, cutKey: a.key, label: a.label, url });
      },
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

    // TODO(P1): teamCredit 로 예상 크레딧 사전 차감(402 게이트). 지금은 생성만.
    const pack = await repo.createPack({
      userId: req.user && req.user.id, vertical, product, config: { skus, photoCount: req.files.length },
    });
    res.status(202).json({ id: pack.id, shareId: pack.share_id, status: 'processing' });

    setImmediate(() => processPack(pack, {
      sourcePaths: req.files.map((f) => f.path), vertical, product, skus,
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

module.exports = router;
