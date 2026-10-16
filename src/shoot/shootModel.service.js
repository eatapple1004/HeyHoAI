/**
 * ─── Shoot "Create your model" — 사진 → (다각도) → Soul ID 학습 → 장면 뱅크 ───
 *
 * (2026-10-16) 흐름(사용자 지시: "Soul ID 처럼 사진 여러 장이 기본, 한 장뿐이면 우리가 다각도를 만들어 준다 — 학습 전에 그 자리에서 따로")
 *   A. 다각도(선택): POST /api/shoot/angles 사진 1장 → Nano Banana Pro 로 카메라 위치만 바꾼 ANGLES.length 장(앵커 파이프라인 angles_pure 의 keep 문장).
 *      프로세스 안 잡(angleJobs) — GET /api/shoot/angles/:id 로 진행·결과 URL. 결과는 사용자가 고른 뒤 photoUrls 로 학습에 넣는다.
 *   B. 학습: POST /api/shoot/models 사진(업로드 + photoUrls) → 공개 URL(PUBLIC_URL/images/…) → 힉스필드 POST /v1/custom-references(v2)
 *      → 'training' 폴링(not_ready→queued→in_progress→completed|failed) → 'bank' Soul 2 + custom_reference_id 로 SCENES 장면(우리 /images 로 저장,
 *      힉스필드 결과 URL 은 7일 뒤 사라진다) → 'ready'. 실패는 'failed' + error, 과금된 건만 환불.
 *      단계 진행은 프로세스 안 러너(kick) — GET 때 멈춘 모델이 보이면 다시 돌린다. dev 는 pm2 단일 프로세스라 충분하다.
 *
 * 과금(자리값): 다각도 = IMG_CREDIT.pro × 장수 · 학습 = IMG_CREDIT['shoot-train'] 1회. 실원가: Soul ID 학습 40cr=$2.50 + 장면 8장 × $0.006 · 다각도 10장 × $0.134.
 * ⚠️ 얼굴 사전검사는 두지 않는다(사용자 10-16: "어디까지 되는지 아직 모르니까") — 힉스필드가 거절하면 그 메시지가 그대로 카드에 뜬다.
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
// 다각도. 앵커 파이프라인(angles_pure.json) 실측: 옷·배경·머리를 "묘사"하면 다시 그린다 → 카메라 위치만 말한다.
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
const ANGLE_JOB_TTL_MS = 2 * 60 * 60 * 1000;

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const hfHeaders = () => ({ Authorization: `Key ${env.HIGGSFIELD_API_KEY}`, 'Content-Type': 'application/json' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const publicUrl = (name) => `${env.PUBLIC_URL.replace(/\/$/, '')}/images/${name}`;
const isOurs = (u) => typeof u === 'string' && !!env.PUBLIC_URL && u.startsWith(`${env.PUBLIC_URL.replace(/\/$/, '')}/images/`);
// eslint-disable-next-line global-require
const credit = () => require('../credits/credit.service');

function requireConfigured() {
  if (!env.HIGGSFIELD_API_KEY) throw httpError(503, 'Model training is not configured on this server');
  if (!env.PUBLIC_URL) throw httpError(400, 'Model training needs PUBLIC_URL (Higgsfield fetches the photos by URL)');
}

/** 로컬 파일(또는 버퍼) → tmp/images + 영속 스토리지. 돌려주는 값 = 파일명(공개 URL·/images 경로 둘 다 이걸로 만든다). */
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

// ── A. 다각도 잡 ──
const angleJobs = new Map(); // id → { userId, src, source, urls, error, done, at, charged }
const pubAngles = (j) => ({ id: j.id, done: j.done, error: j.error || null, urls: j.urls, total: ANGLES.length, source: j.source });

async function startAngles(user, file) {
  if (!env.PUBLIC_URL) throw httpError(400, 'Angle shots need PUBLIC_URL');
  if (!file) throw httpError(400, 'Add a photo');
  const name = await keep(file);
  const charge = await teamCredit.chargeGeneration(user, credit().imageCost('pro', ANGLES.length, false), `Shoot angles ×${ANGLES.length}`); // 관리자는 null
  const job = { id: crypto.randomUUID(), userId: user.id, src: path.join(process.cwd(), 'tmp', 'images', name), source: publicUrl(name), urls: [], error: null, done: false, at: Date.now(), charged: !!charge };
  angleJobs.set(job.id, job);
  for (const [id, j] of angleJobs) if (Date.now() - j.at > ANGLE_JOB_TTL_MS) angleJobs.delete(id); // 오래된 잡 정리
  (async () => {
    // eslint-disable-next-line global-require
    const nano = require('../images/providers/nanoBanana.provider');
    try {
      for (const angle of ANGLES) {
        const out = await nano.generate({ prompt: `${ANGLE_KEEP}\n\n${angle}`, references: [{ path: job.src, kind: 'person' }], model: 'gemini-3-pro-image-preview', width: 768, height: 1024, imageSize: '1K' });
        const abs = out.url.replace('file://', '');
        await mediaStore.putFile(abs).catch(() => {});
        job.urls.push(publicUrl(path.basename(abs)));
      }
    } catch (err) {
      job.error = String(err.message || err).slice(0, 300);
      logger.warn({ err: job.error, jobId: job.id, made: job.urls.length }, 'shoot angles failed');
      if (job.charged && job.urls.length < ANGLES.length) { // 못 만든 장수만큼 환불
        await teamCredit.refundGeneration(user, credit().imageCost('pro', ANGLES.length - job.urls.length, false), 'Shoot angles failed').catch(() => {});
      }
    } finally { job.done = true; }
  })();
  return pubAngles(job);
}

function getAngles(user, id) {
  const job = angleJobs.get(id);
  if (!job || job.userId !== user.id) throw httpError(404, 'Angle job not found');
  return pubAngles(job);
}

// ── B. 모델 ──
function pub(row) {
  return {
    id: row.id, name: row.name, status: row.status, error: row.error || null,
    avatar: row.avatar || null, bank: row.bank || [], photos: row.photos || [],
    progress: row.status === 'bank' ? `${(row.bank || []).length}/${SCENES.length}` : null,
    createdAt: row.created_at,
  };
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
      if (row.status === 'training') row = await stepTrain(row);
      if (row.status === 'bank') row = await stepBank(row);
    } catch (err) {
      const message = String(err.message || err).slice(0, 300);
      logger.warn({ err: message, modelId: id, status: row && row.status }, 'shoot model failed');
      await repo.update(id, { status: 'failed', error: message });
      if (row && row.charged) await teamCredit.refundGeneration({ id: row.user_id }, credit().imageCost('shoot-train', 1, false), `Shoot model failed: ${row.name}`).catch(() => {});
    } finally { running.delete(id); }
  })();
}

async function create(user, { name, files, photoUrls, consent }) {
  requireConfigured();
  if (String(consent) !== 'true') throw httpError(400, 'Please confirm the photos are yours (or of an adult who gave permission)'); // 힉스필드 Soul ID 와 같은 초상·생체정보 동의
  const photos = (Array.isArray(photoUrls) ? photoUrls : []).filter(isOurs); // 다각도 결과 등 이미 우리 서버에 있는 사진
  for (const f of (files || []).slice(0, 20)) photos.push(publicUrl(await keep(f)));
  if (!photos.length) throw httpError(400, 'Add at least one photo');
  const clean = String(name || '').trim().slice(0, 100) || 'My model';
  const charge = await teamCredit.chargeGeneration(user, credit().imageCost('shoot-train', 1, false), `Shoot model: ${clean}`); // 관리자는 null(과금 없음)
  const row = await repo.insert({ userId: user.id, teamId: await teamCredit.activeTeamId(user.id), name: clean, status: 'training', photos: photos.slice(0, 100), charged: !!charge });
  kick(row.id);
  return pub(row);
}

async function list(user) {
  const rows = await repo.findMine(user.id, await teamCredit.activeTeamId(user.id));
  rows.filter((r) => ['training', 'bank'].includes(r.status)).forEach((r) => kick(r.id)); // 재시작 뒤 멈춘 것 재개
  return rows.map(pub);
}

async function get(user, id) {
  const row = await repo.findById(id);
  const teamId = await teamCredit.activeTeamId(user.id);
  if (!row || !(row.user_id === user.id || (teamId && row.team_id === teamId))) throw httpError(404, 'Model not found');
  if (['training', 'bank'].includes(row.status)) kick(row.id);
  return pub(row);
}

module.exports = { create, list, get, startAngles, getAngles, SCENES, ANGLES };
