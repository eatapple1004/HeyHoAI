/**
 * ─── Shoot "Create your model" — 사진 → (다각도) → Soul ID 학습 → 장면 뱅크 ───
 *
 * (2026-10-16) 흐름(사용자 지시: "Soul ID 처럼 사진 여러 장이 기본, 한 장뿐이면 우리가 다각도를 만들어 준다 — 학습 전에 그 자리에서 따로")
 *   A. 다각도(선택): POST /api/shoot/angles 사진 1장 → Nano Banana Pro 로 얼굴 클로즈업 ANGLES.length 장(좌우·상하 각도 + 표정, 아래 ANGLES 주석). ANGLE_PARALLEL 장씩 동시에.
 *      DB 잡(shoot_angle_jobs) — GET /api/shoot/angles/:id 로 진행·결과 URL, 재시작 뒤엔 GET 이 남은 각도를 재개. 결과는 사용자가 고른 뒤 photoUrls 로 학습에 넣는다.
 *   B. 학습: POST /api/shoot/models 사진(업로드 + photoUrls) → 공개 URL(PUBLIC_URL/images/…) → 힉스필드 POST /v1/custom-references(v2)
 *      → 'training' 폴링(not_ready→queued→in_progress→completed|failed) → 'bank' Soul 2 + custom_reference_id 로 SCENES 장면(우리 /images 로 저장,
 *      힉스필드 결과 URL 은 7일 뒤 사라진다) → 'ready'. 실패는 'failed' + error, 과금된 건만 환불.
 *      단계 진행은 프로세스 안 러너(kick) — GET 때 멈춘 모델이 보이면 다시 돌린다. dev 는 pm2 단일 프로세스라 충분하다.
 *
 *   공식 로스터: official 행 — 모두에게 보이고 누구나 Shoot 할 수 있다(scripts/shoot_roster.js 가 같은 공정으로 만든다).
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
// 뱅크 공통 옷 — 성별 무관(10-16 실측: 유나용 베이지 원피스가 고정돼 있어 남자 얼굴 학습에 여자 몸·원피스가 붙고 얼굴이 잘렸다). 옷은 Shoot 에서 갈아입는다.
const OUTFIT = 'wearing a plain white t-shirt and dark straight jeans';
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
const ANGLE_PARALLEL = 20; // (10-16 사용자) 20장씩 — 다각도 24장이면 두 바퀴 약 40초, 뱅크 8장면은 한 바퀴
const ANGLE_MODELS = ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image'];
const TRAIN_MAX_MS = 40 * 60 * 1000;
const SHOT_ASPECTS = new Set(['3:4', '9:16', '1:1', '4:3', '16:9', '2:3', '3:2']);
// 공식 로스터 = shoot_models.official 행(10-16: 유나 + Soul 2 로 뽑은 앵커 얼굴 → scripts/shoot_roster.js 로 같은 공정(24컷→Soul ID→뱅크)). 모두에게 보이고 누구나 Shoot 할 수 있다.

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const hfHeaders = () => ({ Authorization: `Key ${env.HIGGSFIELD_API_KEY}`, 'Content-Type': 'application/json' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const publicUrl = (name) => `${env.PUBLIC_URL.replace(/\/$/, '')}/images/${name}`;
const isOurs = (u) => typeof u === 'string' && !!env.PUBLIC_URL && u.startsWith(`${env.PUBLIC_URL.replace(/\/$/, '')}/images/`);
// eslint-disable-next-line global-require
const credit = () => require('../credits/credit.service');

/**
 * 프로필 — Soul ID 는 얼굴만 배운다. 성별·나이대·몸·머리는 생성 프롬프트가 정하므로 사진에서 한 번 추정해 모든 뱅크·Shoot 프롬프트 앞에 붙인다.
 * (10-16 실측: 남자 얼굴로 학습한 모델이 여자 몸으로 나옴) Gemini Flash 텍스트, 실패하면 중립('a person').
 */
async function describeProfile(absPath) {
  try {
    // eslint-disable-next-line global-require
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const mime = /\.png$/i.test(absPath) ? 'image/png' : /\.webp$/i.test(absPath) ? 'image/webp' : 'image/jpeg';
    const r = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ parts: [
      { inlineData: { mimeType: mime, data: fs.readFileSync(absPath).toString('base64') } },
      { text: 'Describe the main person for a photo prompt. Reply with JSON only: {"gender":"man"|"woman"|"person","age":"<e.g. 20s, 30s, 40s>","hair":"<short phrase: length, style, colour>","build":"<short phrase, e.g. slim, athletic, average>"}' },
    ] }] });
    const text = String(r.text || '');
    const p = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    return { gender: ['man', 'woman'].includes(p.gender) ? p.gender : 'person', age: String(p.age || '').slice(0, 20), hair: String(p.hair || '').slice(0, 60), build: String(p.build || '').slice(0, 40) };
  } catch (err) {
    logger.info({ err: String(err.message || err).slice(0, 120) }, 'shoot profile estimate failed — neutral');
    return { gender: 'person', age: '', hair: '', build: '' };
  }
}
/** 프롬프트 앞 한 줄: "a 30s man with short dark hair, athletic" */
function profileLine(p) {
  if (!p) return 'a person';
  return [`a ${[p.age, p.gender].filter(Boolean).join(' ')}`, p.hair && `with ${p.hair}`, p.build].filter(Boolean).join(', ');
}

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

// ── A. 다각도 잡 — DB(shoot_angle_jobs). 배포로 프로세스가 죽어도 GET 때 남은 각도부터 다시 돈다 ──
const pubAngles = (j) => ({ id: j.id, done: j.done, error: j.error || null, urls: (j.results || []).map((r) => r.url), total: ANGLES.length, skipped: (j.skipped || []).length, source: j.source });
const runningAngles = new Set();

/** 아직 안 된 각도만 ANGLE_PARALLEL 장씩 돌린다. 같은 잡은 한 번에 하나만. */
function kickAngles(id) {
  if (runningAngles.has(id)) return;
  runningAngles.add(id);
  (async () => {
    let job = await repo.findAngleJob(id);
    // eslint-disable-next-line global-require
    const nano = require('../images/providers/nanoBanana.provider');
    const src = path.join(process.cwd(), 'tmp', 'images', String(job.source).split('/').pop());
    const todo = ANGLES.map((_, i) => i).filter((i) => !job.results.some((r) => r.i === i) && !job.skipped.includes(i));
    try {
      await mapLimit(todo, ANGLE_PARALLEL, async (i) => {
        const abs = await shootAngle(nano, src, ANGLES[i]);
        job = await repo.findAngleJob(id); // 동시 갱신 — 최신 행 위에 더한다
        if (!abs) { job = await repo.updateAngleJob(id, { skipped: job.skipped.concat(i) }); return; } // 두 모델 다 막힘(저작권 캐릭터 등)
        await mediaStore.putFile(abs).catch(() => {});
        job = await repo.updateAngleJob(id, { results: job.results.concat({ i, url: publicUrl(path.basename(abs)) }) });
      });
      const n = job.skipped.length;
      const error = n === ANGLES.length ? 'Every angle was blocked — this photo may be a copyrighted character or not a real person' : n ? `${n} of ${ANGLES.length} angles were blocked` : null;
      job = await repo.updateAngleJob(id, { done: true, error });
    } catch (err) {
      job = await repo.updateAngleJob(id, { done: true, error: String(err.message || err).slice(0, 300) });
      logger.warn({ err: job.error, jobId: id, made: job.results.length }, 'shoot angles failed');
    } finally {
      runningAngles.delete(id);
      const missing = ANGLES.length - job.results.length;
      if (job.charged && missing > 0) await teamCredit.refundGeneration({ id: job.user_id }, credit().imageCost('pro', missing, false), 'Shoot angles: blocked angles refunded').catch(() => {}); // 못 만든 장수만큼 환불
    }
  })();
}

async function startAngles(user, file) {
  if (!env.PUBLIC_URL) throw httpError(400, 'Angle shots need PUBLIC_URL');
  if (!file) throw httpError(400, 'Add a photo');
  const name = await keep(file);
  const charge = await teamCredit.chargeGeneration(user, credit().imageCost('pro', ANGLES.length, false), `Shoot angles ×${ANGLES.length}`); // 관리자는 null
  const job = await repo.insertAngleJob({ userId: user.id, source: publicUrl(name), charged: !!charge });
  kickAngles(job.id);
  return pubAngles(job);
}

async function getAngles(user, id) {
  const job = await repo.findAngleJob(id);
  if (!job || job.user_id !== user.id) throw httpError(404, 'Angle job not found');
  if (!job.done) kickAngles(job.id); // 재시작 뒤 멈춘 잡 재개
  return pubAngles(job);
}

// ── B. 모델 ──
function pub(row) {
  return {
    id: row.id, name: row.name, status: row.status, error: row.error || null,
    avatar: row.avatar || null, bank: row.bank || [], photos: row.photos || [], profile: row.profile || null, profileLine: profileLine(row.profile), official: !!row.official,
    progress: row.status === 'bank' ? `${(row.bank || []).length}/${SCENES.length}` : null,
    createdAt: row.created_at,
  };
}

async function submitTraining(row) {
  const r = await fetch(`${HF}/v1/custom-references`, { method: 'POST', headers: hfHeaders(), body: JSON.stringify({ name: row.name.slice(0, 100), model_version: 'v2', input_images: row.photos.map((u) => ({ type: 'image_url', image_url: u })) }) });
  if (!r.ok) throw new Error(`Soul ID submit failed (${r.status}): ${(await r.text()).slice(0, 300)}`);
  return (await r.json()).id;
}

async function stepTrain(row) {
  let refId = row.hf_reference_id || await submitTraining(row);
  if (refId !== row.hf_reference_id) row = await repo.update(row.id, { hf_reference_id: refId });
  const start = Date.now();
  let resubmitted = false;
  while (Date.now() - start < TRAIN_MAX_MS) {
    const st = await (await fetch(`${HF}/v1/custom-references/${refId}`, { headers: hfHeaders() })).json().catch(() => ({}));
    const s = String(st.status || '').toLowerCase();
    if (s === 'completed') return repo.update(row.id, { status: 'bank' });
    if (s === 'failed') {
      // (10-16 실측) "We couldn't prepare your photos … Please try again" — 멀쩡한 얼굴 24컷도 동시 제출 6건 중 3건이 이걸로 떨어졌다. 말 그대로 한 번 다시 낸다.
      if (/prepare your photos/i.test(st.fail_reason || '') && !resubmitted) { resubmitted = true; await sleep(20000); refId = await submitTraining(row); row = await repo.update(row.id, { hf_reference_id: refId }); continue; }
      throw new Error(`Soul ID training failed: ${st.fail_reason || ''}`);
    }
    await sleep(10000);
  }
  throw new Error('Soul ID training timed out');
}

async function stepBank(row) {
  // eslint-disable-next-line global-require
  const soul = require('../images/providers/higgsfield.provider');
  const done = new Set((row.bank || []).map((b) => b.key));
  // 장면 8개를 ANGLE_PARALLEL 로 한꺼번에(사용자 10-16 "너무 느리다"). 끝나는 대로 저장해 진행률이 보이고, 마지막에 SCENES 순서로 정렬한다.
  await mapLimit(SCENES.filter(([key]) => !done.has(key)), ANGLE_PARALLEL, async ([key, label, scene]) => {
    const out = await soul.generate({ prompt: `photo of ${profileLine(row.profile)}, ${OUTFIT}, ${scene}, the face clearly visible and looking at the camera, natural pose, photorealistic`, aspectRatio: '3:4', imageSize: '1080p', model: SOUL_MODEL, customReferenceId: row.hf_reference_id });
    const name = await keep(null, await download(out.url));
    const fresh = await repo.findById(row.id); // 동시 갱신 — 최신 행 위에 더한다
    if (fresh.bank.some((b) => b.key === key)) return; // 러너가 둘(스크립트 + 서버 kick)이면 같은 장면이 두 번 — 먼저 온 것만
    await repo.update(row.id, { bank: fresh.bank.concat({ key, label, url: `/images/${name}` }) });
  });
  const order = SCENES.map(([key]) => key);
  const bank = (await repo.findById(row.id)).bank.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
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
  const first = (files && files[0]) || path.join(process.cwd(), 'tmp', 'images', String(photos[0]).split('/').pop()); // 업로드 원본 우선, 없으면 첫 사진(다각도 결과)
  const profile = await describeProfile(first);
  const charge = await teamCredit.chargeGeneration(user, credit().imageCost('shoot-train', 1, false), `Shoot model: ${clean}`); // 관리자는 null(과금 없음)
  const row = await repo.insert({ userId: user.id, teamId: await teamCredit.activeTeamId(user.id), name: clean, status: 'training', photos: photos.slice(0, 100), charged: !!charge, profile }); // 힉스필드 input_images 최대 100 — 업로드 80 + 다각도 24 면 앞의 100장만
  kick(row.id);
  return pub(row);
}

/** 공식 로스터 + 내 것(공식은 한 번만 — 관리자가 만든 공식 행은 "내 것"에도 걸린다) */
async function list(user) {
  const official = await repo.findOfficial();
  const mine = (await repo.findMine(user.id, await teamCredit.activeTeamId(user.id))).filter((r) => !r.official);
  mine.filter((r) => ['training', 'bank'].includes(r.status)).forEach((r) => kick(r.id)); // 재시작 뒤 멈춘 것 재개
  return official.concat(mine).map(pub);
}

/** 볼 수 있는 행 — 공식이거나 내(팀) 것. 아니면 404(존재도 숨긴다) */
async function visible(user, id) {
  const row = await repo.findById(id);
  const teamId = row && !row.official && await teamCredit.activeTeamId(user.id);
  if (!row || !(row.official || row.user_id === user.id || (teamId && row.team_id === teamId))) throw httpError(404, 'Model not found');
  return row;
}

async function get(user, id) {
  const row = await visible(user, id);
  if (['training', 'bank'].includes(row.status)) kick(row.id);
  return pub(row);
}

// ── C. Shoot(새 컷) — 프롬프트만으로 Soul 2 + 내 모델. 편집(Nano Banana Pro)과 달리 "찍는" 쪽: 조명·포즈·장면이 진짜 사진 품질(사용자 10-16).
//   결과는 /api/generate 와 같은 모양으로 저장(prompts·generation_results·reviews)해 Library·피드에 그대로 뜬다.
async function shot(user, id, { prompt, count, aspectRatio, privateMode }) {
  requireConfigured();
  const text = String(prompt || '').trim().slice(0, 1000);
  if (!text) throw httpError(400, 'Describe the shot');
  const n = Math.min(4, Math.max(1, parseInt(count, 10) || 1));
  const aspect = SHOT_ASPECTS.has(aspectRatio) ? aspectRatio : '3:4';
  const row = await visible(user, id);
  if (row.status !== 'ready' || !row.hf_reference_id) throw httpError(400, 'This model is not ready yet');
  const { hf_reference_id: refId, profile, name } = row;
  const cost = credit().imageCost('soul', n, false);
  const charge = await teamCredit.chargeGeneration(user, cost, `Shoot: ${name} ×${n}`);
  const teamId = await teamCredit.activeTeamId(user.id);
  // eslint-disable-next-line global-require
  const soul = require('../images/providers/higgsfield.provider');
  // eslint-disable-next-line global-require
  const { promptRepo, resultRepo, reviewRepo, sharp } = { promptRepo: require('../generate/prompt.repository'), resultRepo: require('../generate/result.repository'), reviewRepo: require('../generate/review.repository'), sharp: require('sharp') };
  const full = `photo of ${profileLine(profile)}, ${text}, photorealistic`;
  const saved = await promptRepo.insert({ userId: user.id, characterId: null, promptText: full, model: 'soul-shot', referenceImagePath: null, tags: ['shoot', 'soul'], stylePreset: null, teamId });
  const results = await mapLimit(Array.from({ length: n }), ANGLE_PARALLEL, async () => {
    try {
      const out = await soul.generate({ prompt: full, aspectRatio: aspect, imageSize: '1080p', model: SOUL_MODEL, customReferenceId: refId });
      const buffer = await sharp(await download(out.url)).png().toBuffer();
      const fileName = await keep(null, buffer);
      const meta = await sharp(buffer).metadata();
      const row = await resultRepo.insert({ promptIdx: saved.idx, characterId: null, filePath: `tmp/images/${fileName}`, fileSizeKb: Math.round(buffer.length / 1024), width: meta.width, height: meta.height, model: 'soul-shot', visibility: privateMode ? 'private' : 'public', templateName: 'Doppia Shoot', metadata: { shoot_model: id, shot: true } });
      await reviewRepo.insert({ resultIdx: row.idx, promptIdx: saved.idx });
      return { success: true, idx: row.idx, url: `/images/${fileName}` };
    } catch (err) { return { success: false, error: String(err.message || err).slice(0, 200) }; }
  });
  const failed = results.filter((r) => !r.success).length;
  if (charge && failed) await teamCredit.refundGeneration(user, credit().imageCost('soul', failed, false), `Shoot failed ×${failed}`).catch(() => {});
  return { results, cost: cost - (failed ? credit().imageCost('soul', failed, false) : 0) };
}

module.exports = { create, list, get, shot, startAngles, getAngles, describeProfile, profileLine, SCENES, ANGLES };
