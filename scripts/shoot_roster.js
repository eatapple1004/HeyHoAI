/**
 * shoot_roster.js — Doppia Shoot 공식 로스터 만들기 (2026-10-16)
 * ------------------------------------------------------------------------------
 * 고객 "Create your model" 과 같은 공정을 관리자 계정으로 돌려 official 행으로 만든다(src/shoot/shootModel.service.js — 과금 없음).
 *   앵커 사진(Soul 2 로 뽑은 얼굴 1장) → 얼굴 24각도(startAngles) → Soul ID 학습 + 장면 뱅크(create) → ready 면 official=true.
 *   한 명당 실원가 ≈ $5.8(각도 24 × $0.134 + 학습 $2.50 + 뱅크 8 × $0.006). 동시에: 각도 --angles 명(명당 Gemini 20 동시) · 학습 --train 명.
 *
 * 사용(dev 서버, 서비스가 서버 코드를 그대로 쓴다):
 *   NODE_ENV=development node scripts/shoot_roster.js build <앵커 폴더>   # 파일명(확장자 뺀 것) = 모델 이름
 *   NODE_ENV=development node scripts/shoot_roster.js yuna                 # 유나(이미 학습된 Soul ID + 정적 뱅크 /img/shoot/yuna) 를 official 행으로
 *   NODE_ENV=development node scripts/shoot_roster.js retry                 # 학습 실패 행(관리자 것, 비공식) 을 같은 사진으로 다시 — 성공하면 official, 실패 행은 지운다
 *   NODE_ENV=development node scripts/shoot_roster.js thumbs <출력 폴더>   # Shoot 템플릿 28종 썸네일 — 공식 모델을 돌아가며 한 장씩(→ public/img/shoot/tpl/NN.jpg)
 * 옵션: --owner <userId>(기본 관리자) --angles 4 --train 6 · thumbs: --only 14,23,24(번호만 다시) --shift 3(모델 배정 밀기)
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const svc = require(path.join(ROOT, 'src/shoot/shootModel.service'));
const repo = require(path.join(ROOT, 'src/shoot/shootModel.repository'));
const { query } = require(path.join(ROOT, 'src/db/client'));

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const USER = { id: opt('owner', '8e9dedfb-b885-4883-bf90-a5c717ae3dfb') };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

/** 동시 n개 풀 — 끝나는 순서대로 다음 항목 */
async function pool(items, n, fn) {
  const out = []; let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next; next += 1; out[i] = await fn(items[i], i).catch((e) => ({ error: String(e.message || e) })); }
  }));
  return out;
}

async function angles(file) {
  const job = await svc.startAngles(USER, file);
  for (;;) {
    await sleep(5000);
    const j = await svc.getAngles(USER, job.id);
    if (j.done) return j;
  }
}

async function train(name, urls) {
  const m = await svc.create(USER, { name, photoUrls: urls, consent: 'true' });
  for (let t = 0; t < 60 * 12; t += 1) { // 최대 60분
    await sleep(5000);
    const r = await svc.get(USER, m.id);
    if (r.status === 'ready' || r.status === 'failed') return r;
  }
  return { id: m.id, status: 'failed', error: 'timed out waiting' };
}

async function build(dir) {
  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  const nAng = +opt('angles', 4); const nTrain = +opt('train', 6);
  log(`build ${files.length} models — angles ×${nAng}, train ×${nTrain}`);
  // 각도는 풀 A 로, 각도가 끝난 사람부터 풀 B(학습)로 — 두 풀이 겹쳐 돈다
  let active = 0; const queue = [];
  const drain = () => { while (active < nTrain && queue.length) { active += 1; queue.shift()(); } };
  const trainIn = (fn) => new Promise((resolve, reject) => { queue.push(() => fn().then(resolve, reject).finally(() => { active -= 1; drain(); })); drain(); });
  const results = await pool(files, nAng, async (f) => {
    const name = path.basename(f, path.extname(f));
    const a = await angles(path.join(dir, f));
    log(`${name}: angles ${a.urls.length}/${a.total}${a.error ? ` — ${a.error}` : ''}`);
    if (a.urls.length < 12) return { name, error: `only ${a.urls.length} angles` };
    const r = await trainIn(() => train(name, a.urls));
    log(`${name}: ${r.status}${r.error ? ` — ${r.error}` : ''} ${r.id}`);
    if (r.status === 'ready') await repo.update(r.id, { official: true, avatar: `/images/${path.basename(a.source)}` }); // 대표사진 = 앵커 원본(뱅크 포트레이트는 밋밋·이상한 컷이 섞인다, 사용자 10-16)
    return { name, id: r.id, status: r.status, error: r.error };
  });
  console.log(JSON.stringify(results, null, 1));
}

/** 실패한 학습을 같은 사진(각도 24컷은 이미 우리 서버에 있다)으로 다시. 각도 비용 없이 학습 $2.50 만. --train 명씩. */
async function retry() {
  const nTrain = +opt('train', 2);
  const rows = (await query(`SELECT id, name, photos FROM shoot_models WHERE user_id = $1 AND status = 'failed' AND NOT official AND jsonb_array_length(photos) >= 12 ORDER BY created_at`, [USER.id])).rows;
  const byName = new Map(rows.map((r) => [r.name, r])); // 같은 이름은 마지막 것
  log(`retry ${byName.size} models — train ×${nTrain}`);
  const out = await pool([...byName.values()], nTrain, async (old) => {
    const r = await train(old.name, old.photos);
    log(`${old.name}: ${r.status}${r.error ? ` — ${r.error}` : ''} ${r.id}`);
    if (r.status === 'ready') { await repo.update(r.id, { official: true }); await query('DELETE FROM shoot_models WHERE name = $1 AND status = $2 AND user_id = $3 AND NOT official', [old.name, 'failed', USER.id]); }
    return { name: old.name, id: r.id, status: r.status, error: r.error };
  });
  console.log(JSON.stringify(out, null, 1));
}

async function yuna() {
  const exists = (await query(`SELECT id FROM shoot_models WHERE official AND name = 'Yuna'`)).rows[0];
  if (exists) { log('Yuna already official', exists.id); return; }
  const bank = [['street', 'Street'], ['studio', 'Studio'], ['cafe', 'Cafe'], ['rooftop', 'Rooftop'], ['park', 'Park'], ['night', 'Night'], ['wall', 'Golden hour']].map(([key, label]) => ({ key, label, url: `/img/shoot/yuna/${key}.jpg` }));
  const row = await repo.insert({ userId: USER.id, teamId: null, name: 'Yuna', status: 'ready', photos: [], charged: false, profile: { gender: 'woman', age: '20s', hair: 'long dark wavy hair', build: 'slim' } });
  await repo.update(row.id, { hf_reference_id: '217633ee-74f5-4862-96e2-ddb9c93c1a43', avatar: '/img/shoot/yuna/avatar.jpg', bank, official: true });
  log('Yuna official', row.id);
}

async function thumbs(outDir) {
  const sharp = require('sharp');
  fs.mkdirSync(outDir, { recursive: true });
  const html = fs.readFileSync(path.join(ROOT, 'public/shoot.html'), 'utf8');
  const tpl = [...html.matchAll(/^ \['[^']*','([^']+)','([^']+)'\],$/gm)].map((m) => [m[1], m[2]]); // SHOT_TPL 과 같은 순서
  const models = await repo.findOfficial();
  if (!models.length) throw new Error('no official models');
  const only = opt('only', '').split(',').filter(Boolean).map((n) => +n - 1); // --only 14,23 = 그 번호만 다시(얼굴이 안 보이는 컷 교체)
  const shift = +opt('shift', 0); // 모델 배정을 밀어 다른 모델로
  const jobs = tpl.map((t, i) => [t, i]).filter(([, i]) => !only.length || only.includes(i));
  log(`thumbs: ${jobs.length} templates over ${models.length} models`);
  const out = await pool(jobs, 6, async ([[name, prompt], i]) => {
    const m = models[(i + shift) % models.length];
    const r = await svc.shot(USER, m.id, { prompt, count: 1, aspectRatio: '3:4', privateMode: true });
    const res = r.results[0];
    if (!res.success) throw new Error(`${name}: ${res.error}`);
    const file = path.join(outDir, `${String(i + 1).padStart(2, '0')}.jpg`);
    await sharp(path.join(ROOT, 'tmp/images', path.basename(res.url))).resize({ width: 600 }).jpeg({ quality: 82 }).toFile(file);
    log(`${String(i + 1).padStart(2, '0')} ${name} ← ${m.name}`);
    return { name, model: m.name, file };
  });
  console.log(JSON.stringify(out.filter((o) => o.error), null, 1));
}

(async () => {
  const [cmd, arg] = argv;
  if (cmd === 'build') await build(arg);
  else if (cmd === 'yuna') await yuna();
  else if (cmd === 'retry') await retry();
  else if (cmd === 'thumbs') await thumbs(arg);
  else { console.log('usage: build <dir> | retry | yuna | thumbs <outDir>'); process.exit(1); }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
