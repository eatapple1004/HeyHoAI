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
const localMediaDir = path.join(process.cwd(), 'public', 'pack-media');
fs.mkdirSync(localMediaDir, { recursive: true });
const upload = multer({ storage: multer.diskStorage({ destination: uploadDir }), limits: { fileSize: 12 * 1024 * 1024 } });

/** 자산 파일 → 공개 URL. R2 있으면 R2, 없으면 public/pack-media 정적 서빙. */
async function publishAsset(absPath, name) {
  const dest = path.join(uploadDir, name);           // putFile은 basename으로 업로드하니 유니크 이름으로 복사
  try { fs.copyFileSync(absPath, dest); } catch (_) { /* absPath가 이미 유니크면 무시 */ }
  const uploaded = await mediaStore.putFile(dest).catch(() => false);
  if (uploaded && mediaStore.isRemote()) return mediaStore.remoteUrl(name);
  // 로컬 폴백: public/pack-media 로 복사 → 정적 서빙
  fs.copyFileSync(absPath, path.join(localMediaDir, name));
  return `/pack-media/${name}`;
}

async function processPack(pack, { sourcePaths, vertical, product, skus }) {
  const workDir = path.join(process.cwd(), 'tmp', 'pack', pack.share_id);
  try {
    const manifest = await runPack({
      sourcePaths, vertical, product, skus, workDir,
      onProgress: (e) => logger.info?.(`[pack ${pack.id}] ${JSON.stringify(e)}`),
    });
    const groups = [['ref', manifest.refs], ['still', manifest.stills], ['composite', manifest.composites]];
    for (const [kind, list] of groups) {
      for (const a of list) {
        const name = `pack_${pack.share_id}_${kind}_${a.key || a.sku}.jpg`;
        const url = await publishAsset(a.path, name);
        await repo.addAsset({ packId: pack.id, kind, cutKey: a.key || a.sku, label: a.label, url });
      }
    }
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
