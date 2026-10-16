/**
 * ─── Shoot "Create your model" — 사진 → (다각도) → Soul ID 학습 → 장면 뱅크 ───
 *
 * (2026-10-16) 흐름(사용자 지시: "Soul ID 처럼 사진 여러 장이 기본, 한 장뿐이면 우리가 다각도를 만들어 준다 — 학습 전에 그 자리에서 따로")
 *   A. 다각도(선택): POST /api/shoot/angles 사진 1장 → Nano Banana Pro 로 얼굴 클로즈업 ANGLES.length 장(좌우·상하 각도 + 표정, 아래 ANGLES 주석). ANGLE_PARALLEL 장씩 동시에.
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
// 다각도 = **얼굴 학습셋 24컷**(Soul ID 는 얼굴을 배운다 — 사용자 10-16 확정). 옷·반신·조명 변주 없이 얼굴이 프레임을 채우는 클로즈업만.
//   좌우 11단계(정면·좌우 15/30/45/60/90) + 상하 5(정면 로우·하이, 좌30 로우, 우30 하이, 턱 들기) + 표정 8(미소·웃음·큰웃음·놀람·생각·눈감음·스머크·입 살짝).
//   10-16 실측: 유나 전신 거리 컷·다른 인물 전신 컷 모두 24/24, 60°·90° 측면까지 실제로 돌고 정체성 유지. 같은 세트로 Soul ID 학습 → 10장면 일관.
//   문구 규칙(앵커 파이프라인 실측): 옷·배경·머리를 "묘사"하면 다시 그린다 → 카메라 자리·도수·표정만 말하고, 프레이밍 한 줄을 매 컷에 붙인다.
//   모델: 각도마다 Pro → Flash 순(저작권 캐릭터는 Pro 전부 거절·Flash 일부 통과), 둘 다 막히면 그 각도만 건너뛴다. 한 장 20초라 ANGLE_PARALLEL 장씩 동시에 돈다.
const ANGLE_KEEP = 'This is the same fictional character in the same photo session. Keep the face, the features, the makeup and the hair colour exactly the same. Only the camera position, the head angle and the expression change.';
const ANGLE_FRAME = 'Framing: a tight face close-up, 105mm equivalent — the face fills the frame from the hairline to just below the chin, every feature sharp, the same lighting and background as the photo.';
const YAW = [['directly in front of the face'], ['fifteen degrees to the left of the face'], ['fifteen degrees to the right of the face'], ['thirty degrees to the left'], ['thirty degrees to the right'], ['forty-five degrees to the left'], ['forty-five degrees to the right'], ['sixty degrees to the left'], ['sixty degrees to the right'], ['ninety degrees to the left, a clean profile, one ear fully visible'], ['ninety degrees to the right, a clean profile, one ear fully visible']];
const ANGLES = [
  ...YAW.map(([where]) => `The camera stands ${where}, at eye level. Calm, unsmiling, eyes to the lens.`),
  'The camera stands directly in front, dropped to chin height and tilting up a little. The jawline and the underside of the chin come forward, the eyes look down into the lens. Calm.',
  'The camera stands directly in front, risen just above the eyeline and tilting down a little. The forehead fills more of the frame, the eyes lift to the lens. Calm.',
  'The camera stands thirty degrees to the left, dropped to chin height and tilting up a little. Calm.',
  'The camera stands thirty degrees to the right, risen above the eyeline and tilting down a little. Calm.',
  'The camera stands directly in front at eye level. The head tips back slightly, chin up, eyes down to the lens. Calm.',
  'Directly in front at eye level. A closed-lip smile, the eyes creasing slightly.',
  'Thirty degrees to the right at eye level. Laughing with the teeth showing, eyes narrowed in a real smile.',
  'Directly in front at eye level. A big open laugh, head tipped slightly back, eyes almost shut.',
  'Directly in front at eye level. Surprised: eyebrows raised, eyes wide, mouth slightly open.',
  'Fifteen degrees to the left at eye level. Pensive: the eyes look down and away, mouth relaxed.',
  'Directly in front at eye level. The eyes gently closed, the face relaxed, lips together.',
  'Thirty degrees to the left at eye level. A chic half-smirk, one corner of the mouth lifted, a direct gaze.',
  'Fifteen degrees to the right at eye level. Lips parted very slightly, a soft relaxed expression, eyes to the lens.',
];
const ANGLE_PARALLEL = 6;
const ANGLE_MODELS = ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image'];
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
const pubAngles = (j) => ({ id: j.id, done: j.done, error: j.error || null, urls: j.urls, total: ANGLES.length, skipped: j.skipped, source: j.source });

/** 각도 한 장 — 모델 순서대로(각 2회: 503 같은 일시 오류 대비), 전부 실패면 null(건너뛴다) */
async function shootAngle(nano, src, angle) {
  for (const model of ANGLE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const out = await nano.generate({ prompt: `${ANGLE_KEEP}\n\n${angle} ${ANGLE_FRAME}`, references: [{ path: src, kind: 'person' }], model, width: 768, height: 1024, imageSize: '1K' });
        return out.url.replace('file://', '');
      } catch (err) { logger.info({ model, attempt, err: String(err.message || err).slice(0, 120) }, 'shoot angle failed'); }
    }
  }
  return null;
}

/** 동시 실행 n개 — 결과는 입력 순서대로 */
async function mapLimit(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next; next += 1; out[i] = await fn(items[i], i); }
  }));
  return out;
}

async function startAngles(user, file) {
  if (!env.PUBLIC_URL) throw httpError(400, 'Angle shots need PUBLIC_URL');
  if (!file) throw httpError(400, 'Add a photo');
  const name = await keep(file);
  const charge = await teamCredit.chargeGeneration(user, credit().imageCost('pro', ANGLES.length, false), `Shoot angles ×${ANGLES.length}`); // 관리자는 null
  const job = { id: crypto.randomUUID(), userId: user.id, src: path.join(process.cwd(), 'tmp', 'images', name), source: publicUrl(name), urls: [], skipped: 0, error: null, done: false, at: Date.now(), charged: !!charge };
  angleJobs.set(job.id, job);
  for (const [id, j] of angleJobs) if (Date.now() - j.at > ANGLE_JOB_TTL_MS) angleJobs.delete(id); // 오래된 잡 정리
  (async () => {
    // eslint-disable-next-line global-require
    const nano = require('../images/providers/nanoBanana.provider');
    try {
      await mapLimit(ANGLES, ANGLE_PARALLEL, async (angle) => { // 24장 × 20초를 ANGLE_PARALLEL 로 나눠 돈다(사용자: "한 번에 다 돌리게")
        const abs = await shootAngle(nano, job.src, angle);
        if (!abs) { job.skipped += 1; return; } // 두 모델 다 막힘(저작권 캐릭터 등) — 이 각도만 건너뛴다
        await mediaStore.putFile(abs).catch(() => {});
        job.urls.push(publicUrl(path.basename(abs)));
      });
      if (job.skipped === ANGLES.length) job.error = 'Every angle was blocked — this photo may be a copyrighted character or not a real person';
      else if (job.skipped) job.error = `${job.skipped} of ${ANGLES.length} angles were blocked`;
    } catch (err) {
      job.error = String(err.message || err).slice(0, 300);
      logger.warn({ err: job.error, jobId: job.id, made: job.urls.length }, 'shoot angles failed');
    } finally {
      job.done = true;
      if (job.charged && job.urls.length < ANGLES.length) { // 못 만든 장수만큼 환불
        await teamCredit.refundGeneration(user, credit().imageCost('pro', ANGLES.length - job.urls.length, false), 'Shoot angles: blocked angles refunded').catch(() => {});
      }
    }
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
  for (const f of (files || []).slice(0, 80)) photos.push(publicUrl(await keep(f))); // 업로드 상한 80(힉스필드 웹과 동일)
  if (!photos.length) throw httpError(400, 'Add at least one photo');
  const clean = String(name || '').trim().slice(0, 100) || 'My model';
  const charge = await teamCredit.chargeGeneration(user, credit().imageCost('shoot-train', 1, false), `Shoot model: ${clean}`); // 관리자는 null(과금 없음)
  const row = await repo.insert({ userId: user.id, teamId: await teamCredit.activeTeamId(user.id), name: clean, status: 'training', photos: photos.slice(0, 100), charged: !!charge }); // 힉스필드 input_images 최대 100 — 업로드 80 + 다각도 24 면 앞의 100장만
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
