/**
 * ─── Shoot "Create your model" — 사진 → Soul ID 학습 → 장면 뱅크 ───
 *
 * (2026-10-16) 흐름(사용자 지시: "Soul ID 처럼 사진 여러 장이 기본, 한 장뿐이면 우리가 다각도를 만들어 학습시킨다")
 *   1. 사진 N장 업로드 → 공개 URL(PUBLIC_URL/images/…) — 힉스필드가 URL 로 받아간다.
 *   2. 한 장이면 'angles': Nano Banana Pro 로 카메라 위치만 바꾼 다각도 ANGLES.length 장을 먼저 만든다(앵커 파이프라인 angles_pure 의 keep 문장 그대로).
 *   3. 'training': POST /v1/custom-references(model_version v2) → GET /v1/custom-references/{id} 폴링(not_ready→queued→in_progress→completed|failed).
 *   4. 'bank': Soul 2 + custom_reference_id 로 SCENES 장면을 한 장씩 → 우리 /images 로 내려받아 저장(힉스필드 결과 URL 은 7일 뒤 사라진다).
 *   5. 'ready'. 실패는 'failed' + error + 환불.
 *   단계 진행은 프로세스 안 러너(kick) — GET 때 멈춘 모델이 보이면 다시 돌린다(재시작 복구). dev 는 pm2 단일 프로세스라 충분하다.
 *
 * 과금 = IMG_CREDIT['shoot-train'] 1회(자리값). 실원가: Soul ID 학습 40cr=$2.50 + 장면 8장 × Soul 2 1080p $0.006 + 다각도 10장 × Pro $0.134(한 장 경로만).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { env } = require('../config');
const logger = require('../lib/logger');
const mediaStore = require('../storage/mediaStore');
const teamCredit = require('../teams/team.credit');
const repo = require('./shootModel.repository');

const HF = 'https://api.higgsfield.ai';
const SOUL_MODEL = 'higgsfield-ai/soul/v2/standard';
const OUTFIT = 'wearing a plain fitted beige sleeveless mock-neck mini dress'; // 뱅크 공통 옷 — 옷은 Shoot 에서 갈아입는다
const SCENES = [
  ['portrait', 'Portrait', 'close-up portrait from the chest up in a clean light-grey studio, soft even light, looking at the camera'],
  ['street', 'Street', 'standing on a sunlit Paris street with Haussmann buildings, golden hour backlight, head to toe visible'],
  ['studio', 'Studio', 'standing in a clean light-grey seamless studio, soft even light, head to toe visible'],
  ['cafe', 'Cafe', 'standing inside a bright minimal cafe by a large window, soft daylight, head to toe visible'],
  ['rooftop', 'Rooftop', 'standing on a city rooftop at dusk, skyline behind, blue hour, head to toe visible'],
  ['park', 'Park', 'standing on a green park path, dappled afternoon sunlight, head to toe visible'],
  ['night', 'Night', 'standing on a neon-lit city street at night, wet pavement reflections, head to toe visible'],
  ['wall', 'Golden hour', 'leaning one hand on a stone wall in a narrow old-town alley, warm golden hour light, head to toe visible'],
];
// 사진 1장 → 다각도. 앵커 파이프라인(angles_pure.json) 실측: 옷·배경·머리를 "묘사"하면 다시 그린다 → 카메라 위치만 말한다.
const ANGLE_KEEP = 'Same photograph, same person. The face, hair, makeup, clothing, lighting and background all stay exactly as they are in this image. The only thing that changes is where the camera is standing.';
const ANGLES = [
  'The camera stands directly in front of the person at eye level.',
  'The camera has moved fifteen degrees to the left, still at eye level.',
  'The camera has moved fifteen degrees to the right, still at eye level.',
  'The camera has moved thirty degrees to the left, still at eye level.',
  'The camera has moved thirty degrees to the right, still at eye level.',
  'The camera has moved forty-five degrees to the left, still at eye level.',
  'The camera has moved forty-five degrees to the right, still at eye level.',
  'The camera is slightly above eye level, looking gently down.',
  'The camera is slightly below eye level, looking gently up.',
  'The camera has moved closer for a tight head-and-shoulders framing, straight on.',
];
const TRAIN_MAX_MS = 40 * 60 * 1000;

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const hfHeaders = () => ({ Authorization: `Key ${env.HIGGSFIELD_API_KEY}`, 'Content-Type': 'application/json' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const publicUrl = (name) => `${env.PUBLIC_URL.replace(/\/$/, '')}/images/${name}`;

/** 로컬 파일 → tmp/images + 영속 스토리지. 돌려주는 값 = 파일명(공개 URL·/images 경로 둘 다 이걸로 만든다). */
async function keep(absPath, buffer) {
  const outputDir = path.join(process.cwd(), 'tmp', 'images');
  fs.mkdirSync(outputDir, { recursive: true });
  const name = `${crypto.randomUUID()}${buffer ? '.png' : (path.extname(absPath) || '.jpg')}`;
  const dest = path.join(outputDir, name);
  if (buffer) fs.writeFileSync(dest, buffer); else fs.copyFileSync(absPath, dest);
  await mediaStore.putFile(dest).catch(() => {});
  return name;
}

async function download(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download failed (${r.status})`);
  return Buffer.from(await r.arrayBuffer());
}

function pub(row) {
  return {
    id: row.id, name: row.name, status: row.status, error: row.error || null,
    avatar: row.avatar || null, bank: row.bank || [], photos: row.photos || [],
    progress: row.status === 'bank' ? `${(row.bank || []).length}/${SCENES.length}` : row.status === 'angles' ? `${Math.max(0, (row.photos || []).length - 1)}/${ANGLES.length}` : null,
    createdAt: row.created_at,
  };
}

// ── 단계 ──
async function stepAngles(row) {
  // eslint-disable-next-line global-require
  const nano = require('../images/providers/nanoBanana.provider');
  const src = path.join(process.cwd(), 'tmp', 'images', String(row.photos[0]).split('/').pop());
  for (const angle of ANGLES.slice(row.photos.length - 1)) { // 재개하면 남은 각도만
    const out = await nano.generate({ prompt: `${ANGLE_KEEP}\n\n${angle}`, references: [{ path: src, kind: 'person' }], model: 'gemini-3-pro-image-preview', width: 768, height: 1024, imageSize: '1K' });
    const file = out.url.replace('file://', '');
    await mediaStore.putFile(file).catch(() => {});
    row = await repo.update(row.id, { photos: row.photos.concat(publicUrl(path.basename(file))) }); // 한 장씩 저장 → 진행률
  }
  return repo.update(row.id, { status: 'training' });
}

async function stepTrain(row) {
  let refId = row.hf_reference_id;
  if (!refId) {
    const r = await fetch(`${HF}/v1/custom-references`, { method: 'POST', headers: hfHeaders(), body: JSON.stringify({ name: row.name.slice(0, 100), model_version: 'v2', input_images: row.photos.map((u) => ({ type: 'image_url', image_url: u })) }) });
    if (!r.ok) throw new Error(`Soul ID submit failed (${r.status}): ${(await r.text()).slice(0, 300)}`);
    refId = (await r.json()).id;
    row = await repo.update(row.id, { hf_reference_id: refId });
  }
  const start = Date.now();
  while (Date.now() - start < TRAIN_MAX_MS) {
    const st = await (await fetch(`${HF}/v1/custom-references/${refId}`, { headers: hfHeaders() })).json().catch(() => ({}));
    const s = String(st.status || '').toLowerCase();
    if (s === 'completed') return repo.update(row.id, { status: 'bank' });
    if (s === 'failed') throw new Error(`Soul ID training failed: ${st.fail_reason || ''}`);
    await sleep(10000);
  }
  throw new Error('Soul ID training timed out');
}

async function stepBank(row) {
  // eslint-disable-next-line global-require
  const soul = require('../images/providers/higgsfield.provider');
  const bank = row.bank || [];
  for (const [key, label, scene] of SCENES.slice(bank.length)) {
    const out = await soul.generate({ prompt: `photo of a person ${OUTFIT}, ${scene}, natural pose, photorealistic`, aspectRatio: '3:4', imageSize: '1080p', model: SOUL_MODEL, customReferenceId: row.hf_reference_id });
    const name = await keep(null, await download(out.url));
    bank.push({ key, label, url: `/images/${name}` });
    row = await repo.update(row.id, { bank });
  }
  const portrait = bank.find((b) => b.key === 'portrait');
  return repo.update(row.id, { status: 'ready', avatar: portrait ? portrait.url : bank[0].url, bank: bank.filter((b) => b.key !== 'portrait') });
}

const running = new Set();
/** 멈춰 있는 단계부터 끝까지 돌린다. 같은 모델은 한 번에 하나만. */
function kick(id) {
  if (running.has(id)) return;
  running.add(id);
  (async () => {
    let row = await repo.findById(id);
    try {
      if (row.status === 'angles') row = await stepAngles(row);
      if (row.status === 'training') row = await stepTrain(row);
      if (row.status === 'bank') row = await stepBank(row);
    } catch (err) {
      const message = String(err.message || err).slice(0, 300);
      logger.warn({ err: message, modelId: id, status: row && row.status }, 'shoot model failed');
      await repo.update(id, { status: 'failed', error: message });
      // eslint-disable-next-line global-require
      const credit = require('../credits/credit.service');
      await teamCredit.refundGeneration({ id: row.user_id }, credit.imageCost('shoot-train', 1, false), `Shoot model failed: ${row.name}`).catch(() => {});
    } finally { running.delete(id); }
  })();
}

// ── API ──
async function create(user, { name, files, consent }) {
  if (!env.HIGGSFIELD_API_KEY) throw httpError(503, 'Model training is not configured on this server');
  if (String(consent) !== 'true') throw httpError(400, 'Please confirm the photos are yours (or of an adult who gave permission)'); // 힉스필드 Soul ID 와 같은 생체정보·초상 동의
  if (!env.PUBLIC_URL) throw httpError(400, 'Model training needs PUBLIC_URL (Higgsfield fetches the photos by URL)');
  if (!files || !files.length) throw httpError(400, 'Add at least one photo');
  const clean = String(name || '').trim().slice(0, 100) || 'My model';
  const photos = [];
  for (const f of files.slice(0, 20)) photos.push(publicUrl(await keep(f)));
  // eslint-disable-next-line global-require
  const credit = require('../credits/credit.service');
  await teamCredit.chargeGeneration(user, credit.imageCost('shoot-train', 1, false), `Shoot model: ${clean}`);
  const row = await repo.insert({ userId: user.id, teamId: await teamCredit.activeTeamId(user.id), name: clean, status: photos.length === 1 ? 'angles' : 'training', photos });
  kick(row.id);
  return pub(row);
}

async function list(user) {
  const rows = await repo.findMine(user.id, await teamCredit.activeTeamId(user.id));
  rows.filter((r) => ['angles', 'training', 'bank'].includes(r.status)).forEach((r) => kick(r.id)); // 재시작 뒤 멈춘 것 재개
  return rows.map(pub);
}

async function get(user, id) {
  const row = await repo.findById(id);
  const teamId = await teamCredit.activeTeamId(user.id);
  if (!row || !(row.user_id === user.id || (teamId && row.team_id === teamId))) throw httpError(404, 'Model not found');
  if (['angles', 'training', 'bank'].includes(row.status)) kick(row.id);
  return pub(row);
}

module.exports = { create, list, get, SCENES, ANGLES };
