/**
 * ugcVideo.service.js — UGC 영상 엔진 비동기 오케스트레이션 (스튜디오 배선)
 * ============================================================================
 * 제품+컨셉 → 대본 → broll 클립(이미지→모션) → RenderPlan → ffmpeg 조립 → 결과 저장.
 * videoJob.service 의 크레딧·결과저장·mediaStore 패턴을 재사용하되, UGC는 단일 Kling task가
 * 아니라 다단계 오케스트레이션이라 자체 백그라운드 잡으로 돈다(공유 Kling 폴러 미사용).
 *
 * 잡 상태 = `ugc_jobs` 테이블(재시작·멀티인스턴스 견고). ⚠️ prod엔 마이그레이션 미적용 —
 *   배포 배치에서 `node src/db/migrate.js` 실행 필요([[doppia_local_prod_isolation]]로 로컬만 적용됨).
 * ⚠️ 크레딧 원가 = placeholder(클립수 × videoCost). 확정 단가는 비즈 결정(별도).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../lib/logger');
const log = logger('UgcVideo');
const { query } = require('../db/client');
const promptRepo = require('../generate/prompt.repository');
const resultRepo = require('../generate/result.repository');
const reviewRepo = require('../generate/review.repository');
const creditService = require('../credits/credit.service');
const teamCredit = require('../teams/team.credit');
const mediaStore = require('../storage/mediaStore');

const { generateUgcScript, suggestConcept, refineScene, generateAddScene, normalizeAddSceneObj } = require('./ugcScript.service');
const { renderClips, renderSceneClip } = require('./clipPipeline.service');
const refBake = require('../pack/refBake.service'); // 캐논 레퍼 bake(팩 파이프라인 재사용) — Ad Video 제품 일관성/라벨 보존
const { buildRenderPlan, aspectDims } = require('./renderPlan');
const { assemble, burnCaptions, muxAudio, probeDurationMs } = require('./assembler/ffmpeg.assembler');
const music = require('./audio/music.service');
const tts = require('./audio/tts.service');

// P4(음성모드): 클립 생성 前 씬별 VO를 먼저 합성·길이 측정 → 그 길이로 클립을 뽑게(음성>클립 갭 방지).
//   반환 [{sceneN, path, durationMs}] 또는 null(음성 미요청·미설정·대사 없음·전부 실패). assemble엔 reuseVo로 넘겨 재합성 0.
async function preSynthVoice(script, audio, workDir, jobId) {
  if (!audio || !audio.voice || !tts.isConfigured()) return null;
  const scenes = ((script && script.scenes) || []).filter((s) => s.type === 'broll' && (s.spoken || s.onScreenText || '').trim());
  if (!scenes.length) return null;
  fs.mkdirSync(workDir, { recursive: true });
  const out = [];
  for (const s of scenes) {
    const text = (s.spoken || s.onScreenText || '').trim();
    const rel = `pvo_${s.n}.mp3`;
    try {
      // B: with-timestamps 합성 → 실 발화 타이밍 청크(chunks). ElevenLabs 아니거나 실패면 chunks=null(균등 폴백).
      const r = await tts.synthesizeWithChunks(text, { outPath: path.join(workDir, rel), voiceId: audio.voiceId, speed: audio.speed });
      if (r && r.path) out.push({ sceneN: s.n, path: r.path, durationMs: await probeDurationMs(r.path), chunks: r.chunks || null });
    } catch (e) { log.info(`[${jobId}] pre-VO 씬${s.n} 실패(스킵): ${e.message}`); }
  }
  return out.length ? out : null;
}

const servedDir = path.join(process.cwd(), 'tmp', 'images'); // /images 라우트가 서빙하는 디렉토리

// ── 오디오 캐싱(옵션 B) ──────────────────────────────────────────────
// VO·음악 mp3를 영속화하고 캐시키로 재사용 판단 → 편집 시 안 바뀐 오디오는 재생성 안 함.
//   VO 키 = 내레이션 텍스트 + 보이스 + 속도.  음악 키 = 음악 프롬프트(무드) + 영상 길이.
//   음악만 바꾸기 = musicVibe만 달라짐 → 음악 키만 변경 → VO 재사용, 음악만 재생성.
function audioKey(parts) { return crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16); }
// VO 키 = 씬 대사(spoken 우선)만 — voSegments와 동일 기준(hook/CTA 제외). 자막만 바뀌고 spoken 있으면 키 불변→VO 재사용.
function voKey(script, audio = {}) {
  const text = (script.narration && String(script.narration).trim())
    || (script.scenes || []).map((s) => (s.spoken || s.onScreenText || '').trim()).filter(Boolean).join('|');
  return audioKey([text, audio.voiceId || '', String(audio.speed || 1)]);
}
// 음악 키 = 무드(프롬프트)만. 길이는 제외 — 음성 주도로 durationMs가 매 편집 변하는데,
//   음악 길이는 muxAudio가 영상에 맞춰 트림/패딩하므로 재생성 불필요. vibe 바뀔 때만 재생성.
function musicKey(script) { return audioKey([music.promptFromScript(script)]); }

/** assemble이 만든 오디오 mp3(로컬 절대경로)를 서빙 디렉토리로 영속화 → basename 반환(restoreClipLocal로 복원). */
async function persistAudioFile(localPath) {
  if (!localPath || !fs.existsSync(localPath)) return null;
  const filename = `${crypto.randomUUID()}.mp3`;
  const dest = path.join(servedDir, filename);
  fs.mkdirSync(servedDir, { recursive: true });
  fs.copyFileSync(localPath, dest);
  try { await mediaStore.putFile(dest); } catch {}
  return filename;
}

/** mp4(무자막 베이스 등)를 서빙 디렉토리로 영속화 → basename 반환(restoreClipLocal로 복원). B+ 재합성 토대. */
async function persistVideoFile(localPath) {
  if (!localPath || !fs.existsSync(localPath)) return null;
  const filename = `${crypto.randomUUID()}.mp4`;
  const dest = path.join(servedDir, filename);
  fs.mkdirSync(servedDir, { recursive: true });
  fs.copyFileSync(localPath, dest);
  try { await mediaStore.putFile(dest); } catch {}
  return filename;
}

/**
 * assemble 반환 오디오 경로 → {vo:{file,key}, music:{file,key}} 영속 자산.
 * reuseMap[kind] 있으면(=재사용된 트랙) 재영속화 없이 기존 entry 유지.
 */
async function buildAudioAssets(rendered, script, audio, reuseMap = {}) {
  const assets = {};
  // VO = 씬별 세그먼트 배열(F). 재사용이면 기존 entry 유지, 아니면 각 세그먼트 영속화 + 캐시키(전체 텍스트 기준).
  if (rendered && Array.isArray(rendered.vo) && rendered.vo.length) {
    assets.vo = reuseMap.vo || {
      key: voKey(script, audio),
      segs: await Promise.all(rendered.vo.map(async (s) => ({ sceneN: s.sceneN, file: await persistAudioFile(s.path), startMs: s.startMs }))),
    };
  }
  if (rendered && rendered.music) assets.music = reuseMap.music || { file: await persistAudioFile(rendered.music), key: musicKey(script) };
  return assets;
}

/** ugc_jobs 상태 갱신 (updated_at 자동). patch 키 = 컬럼명 */
async function updateJob(id, patch) {
  const cols = Object.keys(patch);
  if (!cols.length) return;
  const set = cols.map((c, i) => `${c}=$${i + 2}`).join(', ');
  await query(`UPDATE ugc_jobs SET ${set}, updated_at=now() WHERE id=$1`, [id, ...cols.map((c) => patch[c])]);
}

/** Kling 생성 길이(네이티브 5s/10s only) — 8초+ 는 10초 생성, 그 이하는 5초 생성(짧게는 5초 만들어 트림). */
function klingGenDur(durationSec) { return (Number(durationSec) > 5) ? 10 : 5; }

/** 크레딧 원가 추정 — 씬별 Kling 생성 길이(5/10) 단가 합산. 짧게(3~4s)는 5초 생성이라 5초 단가. */
function estimateCost(script, quality, isTemplate) {
  const isTier = (quality === 'low' || quality === 'high');   // Ad Video 화질 티어(625/945). 미지정=레거시(팩 비디오 810 보존)
  const per = (dur) => isTier ? creditService.adVideoSceneCost(dur, quality) : creditService.videoCost(dur, 'pro', isTemplate);
  const broll = ((script && script.scenes) || []).filter((s) => s.type === 'broll');
  if (!broll.length) return per(5);
  return broll.reduce((sum, s) => sum + per(klingGenDur(s.durationSec)), 0);
}

function brollCount(script) { return ((script && script.scenes) || []).filter((s) => s.type === 'broll').length; }

/**
 * 씬별 클립을 영속화하고 { [sceneN]: {clip, thumb, durationMs, isStill} } 맵을 만든다(결과 편집용).
 *   - nanoBanana 이미지(imageUrl=file://tmp/images/x)와 dryRun 클립은 이미 로컬+S3 → basename만.
 *   - Kling live 클립(http)은 tmp/images로 다운로드 + mediaStore.putFile 후 basename.
 * basename만 저장 → 재조립은 tmp/images/<base>(로컬) 또는 /images/<base>(S3 폴백)로 복원.
 */
async function persistSceneClips(clips) {
  const map = {};
  for (const c of clips || []) {
    if (!c.clipUrl) continue;
    const entry = { durationMs: c.durationMs, isStill: !!c.isStill };
    if (c.imageUrl && String(c.imageUrl).startsWith('file://')) entry.thumb = path.basename(c.imageUrl.replace('file://', ''));
    if (String(c.clipUrl).startsWith('file://')) {
      entry.clip = path.basename(c.clipUrl.replace('file://', ''));
    } else if (/^https?:\/\//i.test(c.clipUrl)) {
      let saved = false;
      try {
        const res = await fetch(c.clipUrl);
        if (res.ok) {
          const filename = `${crypto.randomUUID()}.mp4`;
          const dest = path.join(servedDir, filename);
          fs.mkdirSync(servedDir, { recursive: true });
          fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
          await mediaStore.putFile(dest); // 영속 스토리지 best-effort
          entry.clip = filename; saved = true;
        }
      } catch (e) { log.warn(`scene ${c.sceneN} clip persist failed: ${e.message}`); }
      // 다운로드 실패 시 원본 URL 폴백 보관 → 씬 유실 방지(만료 전까지 편집 가능; 재조립이 http 다운로드)
      if (!saved) { entry.clip = c.clipUrl; entry.remote = true; }
    } else {
      entry.clip = path.basename(String(c.clipUrl));
    }
    if (entry.clip) map[c.sceneN] = entry;
  }
  return map;
}

// 씬 클립 엔트리에서 순수 클립 정보만(버전 목록 element용) — versions/v 같은 메타 제외.
function stripClipEntry(e) { const o = {}; ['clip', 'thumb', 'isStill', 'durationMs', 'remote'].forEach((k) => { if (e && k in e) o[k] = e[k]; }); return o; }

// 자막 타이밍 → 텍스트 리졸버. 자유 자막(직접 추가)은 자기 text, 씬 자막(음성자막)은 씬의 spoken(옛 잡 onScreenText 폴백).
function captionTextOf(t, byN) { if (t && t.text != null) return String(t.text).trim(); const s = byN[t && t.sceneN]; if (!s) return ''; return String((s.spoken && String(s.spoken).trim()) ? s.spoken : (s.onScreenText || '')).trim(); }

// ── 완성본(컴포지트) 캐시 — 버전 전환 즉시화 ─────────────────────────────
// 편집 상태 전체(씬 클립 버전·순서·자막·오디오·비율)로 완성 mp4를 캐싱 → 같은 상태로 다시 오면
//   재조립(concat+오디오믹싱+자막번인) 없이 URL 스왑만(0). 키가 상태 전체를 담아 스테일 불가능
//   (상태가 하나라도 다르면 키가 달라져 miss→재조립). 버전 전환 후 자막/음성 편집도 키가 바뀌어 재조립됨.
//   각 엔트리는 최종본(file)+무자막 미리보기(preview)+무음(silent)+자막 스펙(caption)을 함께 보관 →
//   전환 시 previewBase/silentBase/caption도 그 버전 것으로 복원(오버레이·치싼 재합성 정확, "잡당 베이스 1개" 가정 붕괴 방지).
const MAX_COMPOSITES = 6;                 // 편집 중 잡당 보관 상한 — 초과 시 가장 오래된 비활성 엔트리 제거(디스크 스파이크 방지)
const UUID_MP4 = /^[0-9a-f-]{8,}\.mp4$/i; // 삭제 가드: 우리가 만든 UUID 컴포지트 파일만 지움

// 씬 순서 + 각 씬 활성 클립 basename → 비디오 트랙 시그니처(버전·순서·삭제·정지여부·길이 반영)
function videoSig(scenes, sceneClips) {
  return (scenes || []).filter((s) => s.type === 'broll').map((s) => {
    const cl = sceneClips[s.n] || sceneClips[String(s.n)] || {};
    return `${s.n}~${cl.clip || ''}~${cl.durationMs || ''}~${cl.isStill ? 1 : 0}`;
  }).join(',');
}
// 실제 번인될 자막 트랙(씬 자막+자유 자막의 텍스트·타이밍) → 자막 시그니처
function subtitleSig(plan) {
  return (((plan && plan.tracks && plan.tracks.subtitle) || [])).map((t) =>
    `${t.sceneN != null ? t.sceneN : ''}#${t.id || ''}@${t.startMs}+${t.durMs}:${(t.text || '').trim()}`).join('|');
}
// 완성본 캐시 키 = 조립 결과 mp4 바이트를 결정하는 모든 상태(비디오·자막·오디오·비율·스타일·언어).
//   오디오는 voKey(내레이션+보이스+속도)·musicKey(무드)+on/off 플래그로 완전 포착(reuse 여부는 출력 불변이라 제외).
function compositeKey(scenes, sceneClips, plan, audio, aspect, style, script) {
  return audioKey([
    'ck1', aspect || '9:16', videoSig(scenes, sceneClips), subtitleSig(plan),
    `voice=${audio && audio.voice ? 1 : 0}`, `music=${audio && audio.music ? 1 : 0}`,
    voKey(script, audio || {}), musicKey(script),
    JSON.stringify(style || {}), (script && script.language) || 'ko',
  ]);
}
// UUID 컴포지트 파일만 로컬 삭제(가드) — protectedSet(활성 결과·활성 베이스)은 절대 안 지움.
//   S3(오브젝트 스토리지)는 손대지 않음(그쪽 GC는 별개 리스크, [[doppia_media_storage_bug]]).
function delCompositeFiles(entry, protectedSet) {
  for (const k of ['file', 'preview', 'silent']) {
    const bn = entry && entry[k];
    if (bn && !protectedSet.has(bn) && UUID_MP4.test(bn)) {
      try { fs.unlinkSync(path.join(servedDir, bn)); } catch {}
    }
  }
}
// 캐시 조회 — 즉시 전환의 핵심인 **최종 파일만 있으면 히트**(preview/silent는 있으면 복원해 쓰고, 없으면 그 필드만 null).
//   (전엔 셋 다 요구 → prod tmp에서 하나만 사라져도 미스→full 재조립. 최종본만 있으면 URL 스왑은 즉시 가능하므로 완화.)
//   MRU 갱신. 최종 파일까지 없으면 스테일 엔트리 제거 후 miss. 반환은 복원 성공한 것만 담은 사본(죽은 링크 주입 방지).
async function lookupComposite(R, key) {
  const arr = Array.isArray(R.composites) ? R.composites : [];
  const i = arr.findIndex((e) => e && e.key === key);
  if (i < 0) return null;
  const e = arr[i];
  if (!(await restoreClipLocal(e.file))) { arr.splice(i, 1); R.composites = arr; return null; } // 최종 파일 없으면 진짜 미스
  const preview = e.preview ? await restoreClipLocal(e.preview) : null; // 있으면 로컬로 웜(오버레이·치싼 재합성용)
  const silent = e.silent ? await restoreClipLocal(e.silent) : null;
  arr.splice(i, 1); arr.push(e); R.composites = arr; // MRU(최근 사용을 뒤로)
  return Object.assign({}, e, { preview: preview ? e.preview : null, silent: silent ? e.silent : null }); // 복원 안 된 베이스는 null → 히트 경로가 죽은 basename을 안 씀
}
// 캐시 저장 + LRU 정리 — 활성 결과(currentBasename)는 절대 제거 대상 아님.
function storeComposite(R, key, entry, currentBasename) {
  const arr = Array.isArray(R.composites) ? R.composites.filter((e) => e && e.key !== key) : [];
  arr.push(Object.assign({ key }, entry));
  const prot = new Set([currentBasename, R.previewBase, R.silentBase, entry.preview, entry.silent, entry.file].filter(Boolean));
  while (arr.length > MAX_COMPOSITES) {
    const idx = arr.findIndex((e) => e.file !== currentBasename); // 활성 아닌 가장 오래된 것
    if (idx < 0) break;
    delCompositeFiles(arr.splice(idx, 1)[0], prot);
  }
  R.composites = arr;
}
// 커밋/백스톱 정리 — 활성 결과 엔트리만 남기고 나머지 컴포지트 파일 제거(가드). 이후 편집은 캐시 재축적.
function pruneComposites(R, keepBasename) {
  if (!R || !Array.isArray(R.composites)) return;
  const prot = new Set([keepBasename, R.previewBase, R.silentBase].filter(Boolean));
  const kept = [];
  for (const e of R.composites) {
    if (e && e.file === keepBasename) kept.push(e);
    else delCompositeFiles(e, prot);
  }
  R.composites = kept;
}

/**
 * 1단계 — 대본만 생성(무료·미리보기). 과금·DB·렌더 없음. 유저 검토용.
 * @returns {Promise<{ script:object, nClips:number, cost:number }>}
 */
// model = 선택된 로스터 모델의 메타({isMinor, ageBand, ageBandLabel, gender}) — 빌더가 나이에 맞는 씬을 쓰게 한다.
//   안 넘기면 빌더는 모델이 성인인지 아동인지 모른 채 쓴다(= 프롬프트와 레퍼런스가 어긋난다).
// ⚠️ 이 함수는 인자를 **화이트리스트로 구조분해**한다 — 여기 이름을 안 적으면 라우트가 보내도 조용히 사라진다.
//   실사고(2026-07-30): scenePlan(대본 직접 쓰기)을 라우트·빌더·서비스에 다 붙여놓고 **이 줄만 빼먹어서**
//   유저가 쓴 씬이 통째로 무시됐다. 안쪽 generateUgcScript 를 직접 호출해 테스트하는 바람에 이 층을 건너뛰어
//   검증에서도 안 걸렸다. 새 입력을 추가할 땐 **여기와 아래 호출 두 곳 모두**에 이름을 적을 것.
async function generateScript({ product, concept, outputType = 'product-ad', image = null, images = null, details = '', voiceover = true, category = '', sceneCount = 0, sceneDuration = 0, durationSec = undefined, language = 'en', model = null, scenePlan = null }) {
  if (!concept) { const e = new Error('concept is required'); e.statusCode = 400; throw e; }
  // durationSec = 앞단 총 길이(목표) — 빌더의 기존 입력(baseDuration = input.durationSec || 프로파일 기본)에 그대로 얹힌다.
  const script = await generateUgcScript({ product, concept, outputType, image, images, details, voiceover, category, sceneCount, sceneDuration, durationSec, language, model, scenePlan });
  const nClips = brollCount(script);
  if (!nClips) { const e = new Error('script produced no broll scenes'); e.statusCode = 422; throw e; }
  return { script, nClips, cost: estimateCost(script, false) };
}

/**
 * 2단계 — 검토한 대본으로 렌더(여기서만 과금). jobId 즉시 반환, 파이프라인 백그라운드.
 * @returns {Promise<{ jobId:string, cost:number }>}
 */
async function render({ user, script, product, concept, outputType = 'product-ad',
  referenceImagePath = null, productImagePath = null, productImagePaths = null, modelImagePath = null, aspect = '9:16', dryRunVideo = false, visibility, isTemplate = false,
  audio = {}, autoCommit = false, batchId = null, quality = null }) {
  if (!script || !Array.isArray(script.scenes)) { const e = new Error('script is required'); e.statusCode = 400; throw e; }
  const nClips = brollCount(script);
  if (!nClips) { const e = new Error('script has no broll scenes'); e.statusCode = 422; throw e; }

  // 레퍼런스: 업로드 제품 사진들(동일 제품 다각도)=제품 고정('product'), 없고 모델 ref면 인물 유지('person').
  //   productImagePaths(배열) 우선, 없으면 단일 productImagePath(하위호환), 그것도 없으면 referenceImagePath.
  const prodPaths = (Array.isArray(productImagePaths) && productImagePaths.length) ? productImagePaths.filter(Boolean)
    : (productImagePath ? [productImagePath] : []);
  const refImages = prodPaths.length ? prodPaths : (referenceImagePath ? [referenceImagePath] : []);
  const refImage = refImages[0] || null; // 하위호환(첫 장)
  const refKind = prodPaths.length ? 'product' : 'person';

  // 과금(씬별 길이 반영) — statusCode 에러(402/403) 그대로 전파. 승인 후에만.
  const cost = estimateCost(script, quality, isTemplate);
  const charge = await teamCredit.chargeGeneration(user, cost, `UGC 영상 (${outputType}, ${nClips}컷${quality ? `, ${quality}` : ''})`);
  const teamId = await teamCredit.activeTeamId(user.id);

  const vis = visibility === 'private' ? 'private' : 'public';
  const ins = await query(
    `INSERT INTO ugc_jobs (user_id, team_id, output_type, product, concept, title, n_clips,
       charge_amount, status, caption, hashtags, visibility)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'processing',$9,$10,$11) RETURNING id`,
    [user.id, teamId, outputType, String(product || '').slice(0, 500), String(concept || '').slice(0, 1000),
     script.title, nClips, charge ? charge.amount : 0, script.caption,
     JSON.stringify(script.hashtags || []), vis]
  );
  const jobId = ins.rows[0].id;
  log.info(`UGC job ${jobId} render (${outputType}, ${nClips}컷, cost=${cost})`);

  runPipeline({ jobId, script, refImage, refImages, refKind, productImagePaths: prodPaths, modelImagePath, aspect, dryRunVideo, visibility, teamId, userId: user.id, charge, audio, autoCommit, batchId, quality })
    .catch((err) => log.error(`UGC job ${jobId} pipeline crash: ${err.message}`));

  return { jobId, cost };
}

/** 원샷(하네스/하위호환): 대본 생성 → 즉시 렌더. */
async function submit(input) {
  const { script } = await generateScript(input);
  const r = await render({ ...input, script });
  return { ...r, script };
}

/** 백그라운드: 클립 렌더 → 조립 → 서빙 디렉토리로 복사 → 결과 저장 → 잡 완료. 실패 시 환불. */
async function runPipeline({ jobId, script, refImage, refImages = [], refKind, productImagePaths = [], modelImagePath, aspect = '9:16', dryRunVideo, visibility, teamId, userId, charge, audio = {}, autoCommit = false, batchId = null, quality = null }) {
  let renderWorkDir = null; // assemble 작업 폴더(스크래치) — 성공/실패 무관 finally에서 정리(디스크 누수 방지). 서빙본·베이스·씬클립은 이미 servedDir로 복사된 뒤라 안전.
  try {
    const { w, h } = aspectDims(aspect);
    renderWorkDir = path.join(process.cwd(), 'tmp', 'ugc', crypto.randomUUID().slice(0, 8));

    // P4 음성모드: 클립 생성 前 씬별 VO 합성·측정 → 씬 durationSec을 음성 커버 길이로 세팅(음성>클립 갭 방지).
    //   assemble엔 reuseVo로 넘겨 재합성 0. 음악모드(audio.voice=false)는 스킵=기존 경로 무변경.
    let reuseVo, voiceChunks;
    if (audio && audio.voice) {
      const preVo = await preSynthVoice(script, audio, renderWorkDir, jobId);
      if (preVo && preVo.length) {
        for (const s of (script.scenes || [])) {
          if (s.type !== 'broll') continue;
          const seg = preVo.find((v) => v.sceneN === s.n);
          if (!seg) continue;
          const tail = Math.max(300, Math.min(Number(s.tailMs) || 0, 3000)); // retimeByVoice와 동일(최소 VO_TAIL_MS 300)
          const lead = Math.max(0, Math.min(Number(s.leadInMs) || 0, 3000));
          s.durationSec = Math.max(2, Math.ceil((seg.durationMs + tail + lead) / 1000)); // 클립 생성·트림 길이 = 음성+여백 커버
        }
        reuseVo = preVo.map((v) => ({ sceneN: v.sceneN, path: v.path, startMs: 0 }));
        voiceChunks = {}; for (const v of preVo) if (v.chunks && v.chunks.length) voiceChunks[v.sceneN] = v.chunks; // B: 씬별 실 타임스탬프 청크(없으면 균등 폴백)
        log.info(`[${jobId}] 음성모드: 씬별 VO ${preVo.length}개 선합성 → 클립을 음성 길이로 생성 (타임스탬프 청크 ${Object.keys(voiceChunks).length}씬)`);
      }
    }

    // 🎯 캐논 레퍼 bake — 업로드 원본 대신 "깨끗한 단품 플레이트"에서 씬을 렌더(라벨 깨짐·씬간 드리프트↓).
    //   팩 refBake 재사용(제품 정체성만 고정 — 씬 배경/구도는 brollPrompt가 결정). 영상당 1회·무과금(인프라).
    //   실패 시 원본 업로드로 폴백(잡 유지). person(모델 전용)·제품 없음이면 스킵.
    if (refKind === 'product' && Array.isArray(productImagePaths) && productImagePaths.length) {
      try {
        const bakedBuf = await refBake.bakeOne({ sourcePaths: productImagePaths });
        fs.mkdirSync(servedDir, { recursive: true });
        const bakedPath = path.join(servedDir, `ugcref_${crypto.randomUUID()}.jpg`); // resultToBuffer=JPEG → .jpg(guessMime 정합)
        fs.writeFileSync(bakedPath, bakedBuf);
        log.info(`[${jobId}] 캐논 레퍼 bake 완료 → ${path.basename(bakedPath)} (원본 ${productImagePaths.length}장 대체)`);
        productImagePaths = [bakedPath]; refImages = [bakedPath]; refImage = bakedPath; // 씬 렌더 + 재렌더 영속화 모두 클린 플레이트로
      } catch (e) {
        log.warn?.(`[${jobId}] 캐논 레퍼 bake 실패 — 원본 업로드로 폴백: ${e && e.message}`);
      }
    }

    // 클립(이미지→모션) — 스튜디오는 LIVE(dryRunVideo=false)가 기본. refImage 있으면 제품/모델 고정. 음성모드는 위에서 durationSec=음성길이.
    const clips = await renderClips(script, { dryRunVideo, referenceImagePath: refImage, referenceKind: refKind, productImagePaths, modelImagePath, width: w, height: h, aspect, quality, concurrency: 2, log: (m) => log.info(`[${jobId}] ${m}`) });
    if (!clips.some((c) => c.clipUrl)) throw new Error('all clips failed to render');

    const sceneClips = await persistSceneClips(clips); // 결과 편집(재배치·삭제·재생성)용 씬 클립 영속화

    const plan = buildRenderPlan(script, clips);
    plan.meta.aspect = aspect; // 선택 비율을 조립기·결과 메타에 반영
    const out = await assemble(plan, { audio, script, aspect, reuseVo, voiceChunks, outDir: renderWorkDir, log: (m) => log.info(`[${jobId}] ${m}`) });

    // 서빙 디렉토리로 복사(/images 라우트가 서빙 + mediaStore 영속화)
    fs.mkdirSync(servedDir, { recursive: true });
    const filename = `${crypto.randomUUID()}.mp4`;
    const served = path.join(servedDir, filename);
    fs.copyFileSync(out.videoPath, served);

    // 🔖 DRAFT: 완성 mp4·대본·씬클립만 영속화. generation_results 저장은 "Save & finish" 또는 이탈 시(commitJob)로 미룸.
    //   → 저장 전엔 generation_results에 없으므로 My creations/Library/Explore 어디에도 안 뜸(쿼리 무수정).
    const durationSec = Math.round((plan.meta.durationMs || 0) / 1000);
    await mediaStore.putFile(served); // 영속 스토리지 best-effort(라이브 404 방지)

    // 편집(재조립/씬재생성)용: 대본 + 렌더 설정 + 레퍼런스(다각도) + 씬 클립을 영속화.
    //   products=배열(동일 제품 여러 각도). 하위호환으로 product=첫 장도 유지(옛 redo 코드 폴백).
    const srcRefs = (Array.isArray(refImages) && refImages.length) ? refImages : (refImage ? [refImage] : []);
    let products = [];
    for (const rp of srcRefs) {
      try { await mediaStore.putFile(rp); } catch {} // 재배포/cleanup 후 redo 대비 R2 영속화
      products.push({ clip: path.basename(rp), kind: refKind || 'product' });
    }
    const productRef = products[0] || null; // 하위호환(단일 필드)
    // 오디오 캐싱: 생성된 VO·음악을 영속화 + 캐시키 저장 → 이후 편집 시 안 바뀐 트랙 재사용(무재생성).
    const audioAssets = await buildAudioAssets(out.audioAssets, script, audio || {}, {});
    // B+ 재합성 토대: 무자막·무음 베이스(silentBase, 음악 교체용) + 자막 없는 미리보기 베이스(previewBase, 자막 1패스 재번인·오버레이용) + 자막 타이밍.
    const silentBase = await persistVideoFile(out.silentPath);
    const previewBase = await persistVideoFile(out.basePath);
    const persistedScript = { ...script, _render: {
      audio: audio || {}, aspect, product: productRef, products, model: modelImagePath || null, audioAssets,
      silentBase, previewBase, caption: out.caption, durationMs: plan.meta.durationMs || 0,
    } };
    // 완성본 캐시 시드 — 최초 완성본(전 씬 v0)도 캐싱. 씬 재생성 후 되돌리면 첫 전환부터 즉시(재조립 0).
    persistedScript._render.composites = [{
      key: compositeKey(script.scenes, sceneClips, plan, audio || {}, aspect, undefined, script),
      file: filename, preview: previewBase, silent: silentBase, caption: out.caption,
      durationSec, subtitleMode: out.subtitleMode,
    }];
    await updateJob(jobId, {
      status: 'succeeded', result_url: `/images/${filename}`,
      duration_sec: durationSec, subtitle_mode: out.subtitleMode,
      script: JSON.stringify(persistedScript), scene_clips: JSON.stringify(sceneClips),
    });
    log.info(`UGC job ${jobId} succeeded(draft) → /images/${filename} (자막=${out.subtitleMode})`);
    // 🔖 에디터 없는 경로(팩 영상 등)는 여기서 바로 저장 확정(commit) → generation_results(내 크리에이션)에 뜬다.
    //   기본 false라 Ad Video 에디터 흐름(Save & finish)은 그대로. 서빙본은 이미 복사됐고, 실패해도 draft는 남으니 무시.
    if (autoCommit) {
      await commitJob(jobId, userId, batchId).catch((e) => log.warn?.(`UGC job ${jobId} 자동커밋 실패(무시): ${e && e.message}`));
    }
  } catch (err) {
    if (charge) await charge.refund().catch(() => {});
    await updateJob(jobId, { status: 'failed', error: String(err.message).slice(0, 300) });
    log.error(`UGC job ${jobId} failed(refunded): ${err.message}`);
  } finally {
    // 렌더 스크래치 정리 — 서빙본·silentBase·previewBase·오디오·씬클립은 try 안에서 이미 servedDir로 복사됨(finally는 그 뒤 실행). 편집 경로(tryReComposite)와 동일 패턴.
    if (renderWorkDir) { try { fs.rmSync(renderWorkDir, { recursive: true, force: true }); } catch (e) {} }
  }
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}

/** 영속 씬 클립(basename) → 로컬 절대경로. 로컬에 없으면(재배포 후) mediaStore에서 복원. 없으면 null. */
async function restoreClipLocal(basename) {
  if (!basename) return null;
  const p = path.join(servedDir, basename);
  if (fs.existsSync(p)) return p;
  try {
    const obj = await mediaStore.getObject(basename);
    if (obj && obj.Body) {
      fs.mkdirSync(servedDir, { recursive: true });
      fs.writeFileSync(p, await streamToBuffer(obj.Body));
      return p;
    }
  } catch (e) { log.warn(`restore clip ${basename} failed: ${e.message}`); }
  return null;
}

/**
 * 진행 중인 내 잡 목록(소유권 게이트) — 새로고침·이탈 후 재연결용.
 *
 * 렌더는 이미 요청과 무관하게 끝까지 돈다(render()가 runPipeline을 await하지 않음).
 * 없던 건 "클라이언트가 돌아올 길" 하나였다: getJob은 id를 이미 알아야 하는데
 * 새로고침하면 그 id가 날아가고, generation_results에는 commit 전까지 행이 없어서
 * 크리에이션 피드로도 안 잡힌다 → 서버는 만들고 있는데 화면만 모르는 상태가 됐다.
 *
 * 목록으로 돌려주는 이유: 지금 UI는 1개만 그리지만(renderUgcInline이 .find()),
 * 동시 N개로 갈 때 이 엔드포인트를 그대로 쓰기 위함.
 *
 * ⚠️ maxAgeMinutes — 고아 잡을 물고 늘어지지 않기 위한 안전장치.
 *   렌더 중에는 script가 NULL이다(runPipeline이 끝날 때 status='succeeded'와 함께 기록).
 *   그런데 reapStaleProcessing은 `AND script IS NOT NULL` 조건이라 최초 렌더 도중
 *   프로세스가 죽으면(pm2 reload=배포, OOM) 그 잡은 processing에 영구히 갇히고 회수되지 않는다.
 *   그 상태로 이 목록에 계속 잡히면 Studio를 열 때마다 클라가 붙어 최대 16분 폴링하고
 *   (pollUgcJob은 240회 상한) 그동안 genActive>0이라 대본 작성까지 막힌다.
 *   실제 렌더는 몇 분이고 폴링도 ~16분에 포기하므로, 그보다 넉넉한 30분을 넘긴 processing은
 *   살아있지 않다고 보고 목록에서 뺀다. (근본 해결 = 최초 렌더 크래시를 failed+환불로 회수하는 것)
 */
async function listActiveJobs(userId, { maxAgeMinutes = 30 } = {}) {
  const r = await query(
    `SELECT id, status, title, product, concept, output_type, n_clips, created_at
     FROM ugc_jobs
     WHERE status = 'processing'
       AND updated_at > now() - ($2 * interval '1 minute')
       AND (user_id = $1 OR (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $1)))
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId, maxAgeMinutes]
  );
  return r.rows;
}

/**
 * 완성됐지만 아직 저장(commit) 안 된 잡 — "당신을 기다리는 것".
 *
 * 완성 ≠ 라이브러리다. runPipeline이 끝나면 status='succeeded'가 되지만 result_idx는 없고,
 * generation_results 행은 commit(Save & finish 또는 이탈 시 sendBeacon 자동저장) 때 생긴다.
 * 자동 커밋 스위퍼는 없다 → 렌더 중에 자리를 뜨면 영상이 draft로 남아 어디에도 안 보인다.
 * (prod 실측: succeeded 88개 중 6개가 이 상태로 방치)
 *
 * 이걸 세어 레일 배지로 띄우고, Ad Video로 돌아왔을 때 복원해 저장할 수 있게 한다.
 * maxAgeHours — 오래된 draft(며칠 전 테스트 등)가 배지에 영원히 남지 않도록.
 */
async function listPendingReview(userId, { maxAgeHours = 24 } = {}) {
  const r = await query(
    `SELECT id, status, title, product, concept, output_type, n_clips, updated_at
     FROM ugc_jobs
     WHERE status = 'succeeded' AND result_idx IS NULL AND result_url IS NOT NULL
       AND updated_at > now() - ($2 * interval '1 hour')
       AND (user_id = $1 OR (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $1)))
     ORDER BY updated_at DESC
     LIMIT 20`,
    [userId, maxAgeHours]
  );
  return r.rows;
}

/**
 * 편집 가능한 저장본의 result_idx 목록 — 피드 카드가 [Edit]를 띄울지 판단하는 근거.
 *   편집 = 저장된 씬 클립 재조립이라 대본 없는 옛 잡은 원천적으로 불가(getJobByResultIdx도 404).
 *   클라가 미리 알아야 "눌러도 안 되는 버튼"을 안 띄운다.
 *   게이트·조건은 getJobByResultIdx와 같은 것을 봐야 한다(한쪽만 바뀌면 버튼과 실제가 어긋남).
 */
async function listEditableResultIdxs(userId) {
  const r = await query(
    `SELECT DISTINCT result_idx FROM ugc_jobs
      WHERE result_idx IS NOT NULL AND script IS NOT NULL
        AND (user_id = $1 OR (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $1)))`,
    [userId]
  );
  return r.rows.map((x) => x.result_idx);
}

/** 편집용 원본 잡 로드(소유권 게이트). script/scene_clips 원문 포함. */
async function loadJobForEdit(id, userId) {
  const r = await query(
    `SELECT id, status, result_idx, result_url, output_type, visibility, script, scene_clips
     FROM ugc_jobs WHERE id = $1 AND (
       user_id = $2 OR (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)))`,
    [id, userId]
  );
  return r.rows[0] || null;
}

/**
 * broll 씬 배열에 편집(삭제·자막/내레이션 수정·재정렬)을 적용한 새 배열을 반환(순수).
 * @param {Array} scenes  script.scenes (broll 포함)
 * @param {{ order?:number[], removed?:number[], edits?:object }} ops
 */
function applySceneEdits(scenes, { order = null, removed = [], edits = {} } = {}) {
  const removedSet = new Set((removed || []).map(Number));
  const out = (scenes || []).filter((s) => s.type === 'broll' && !removedSet.has(s.n)).map((s) => ({ ...s }));
  for (const s of out) {
    const e = (edits || {})[s.n] || (edits || {})[String(s.n)];
    if (!e) continue;
    if ('onScreenText' in e) s.onScreenText = String(e.onScreenText || '').slice(0, 300);
    if ('spoken' in e) s.spoken = String(e.spoken || '').slice(0, 600);
    if ('leadInMs' in e) s.leadInMs = Math.max(0, Math.min(Number(e.leadInMs) || 0, 3000)); // 3a: 음성 시작 딜레이
    if ('tailMs' in e) s.tailMs = Math.max(0, Math.min(Number(e.tailMs) || 0, 3000));       // 3a: 음성 끝 여백
  }
  if (Array.isArray(order) && order.length) {
    const pos = new Map(order.map((n, i) => [Number(n), i]));
    out.sort((a, b) => (pos.has(a.n) ? pos.get(a.n) : 1e9) - (pos.has(b.n) ? pos.get(b.n) : 1e9));
  }
  return out;
}

/**
 * 재조립 킥오프(동기) — 소유권·편집가능 검증 후 잡을 'processing'으로 마킹하고 이전 URL 반환.
 *   라우트가 이걸 먼저 await(빠름)해 404/400을 즉시 응답한 뒤, reRender는 백그라운드로 돌린다.
 *   (동기 재조립이 Cloudflare 100초 한도를 넘겨 524가 나던 문제 해결 — 특히 Kling 씬재생성.)
 */
async function beginRerender(jobId, userId) {
  const row = await loadJobForEdit(jobId, userId);
  if (!row) { const e = new Error('Job not found'); e.statusCode = 404; throw e; }
  if (!row.script) { const e = new Error('This video is not editable'); e.statusCode = 400; throw e; }
  await updateJob(jobId, { status: 'processing', error: null }); // 폴링이 processing→succeeded 전환으로 완료 감지
  return { jobId, prevUrl: row.result_url };
}

/** 백그라운드 재조립 실패 처리 — 잡을 다시 편집가능('succeeded')으로 되돌리고 에러를 남겨 프론트가 표시. */
async function failRerender(jobId, err) {
  log.error(`UGC re-render ${jobId} failed: ${err && err.message}`);
  await updateJob(jobId, { status: 'succeeded', error: String((err && err.message) || 'Could not apply changes').slice(0, 300) }).catch(() => {});
}

/**
 * B+ 값싼 재합성 — 자막(텍스트/스타일)·음악·음성 편집을 "무자막 베이스 + 캐시/재합성 오디오"에서 재조립.
 *   영상 길이 고정 + 음성 단일 나레이션이라 재타이밍 없음 → 클립 재작업 0. 음성 변경 시 나레이션만 재합성(TTS 1회)+재믹싱.
 *   자막/스타일만 = previewBase에 자막 1패스. 음악/음성 = silentBase에 오디오 재믹싱 후 자막.
 *   muxAudio+burnCaptions+tts+music 프리미티브 재사용 → 몇 초·실패지점 최소.
 *   ⚠️ 씬 구조 바뀌는 편집(순서·삭제·씬재생성/추가·spoken·leadIn/tail)은 null → 전체 reRender 폴백. 레거시 잡(베이스 미영속)·복원 실패도 null.
 * @returns {Promise<{jobId,resultUrl,durationSec,cost}|null>}
 */
async function tryReComposite({ user, jobId, order = null, removed = [], edits = {}, redoScenes = [], addScenes = [], musicVibe = null, voice = null, voiceId = null, speed = null, subtitleStyle = null, narration = null, captionTimings = null, setVersions = null }) {
  if ((redoScenes && redoScenes.length) || (addScenes && addScenes.length) || (removed && removed.length) || (setVersions && Object.keys(setVersions).length)) return null; // 씬 구조/클립 변경(버전 전환 포함) → 전체 재조립 폴백
  for (const k in (edits || {})) { for (const f in (edits[k] || {})) if (f !== 'onScreenText') return null; } // 자막 텍스트 외(spoken/lead/tail)면 폴백
  const hasCaptionEdit = Object.keys(edits || {}).length > 0;
  const hasStyle = subtitleStyle && typeof subtitleStyle === 'object' && Object.keys(subtitleStyle).length > 0;
  const mv = musicVibe == null ? null : String(musicVibe).trim();
  const hasMusic = mv != null;
  const narrationChanged = narration != null; // V2 나레이션 편집기 → 통 나레이션 재합성(값싼)
  const hasVoiceEdit = (voice != null) || !!voiceId || (speed != null && speed !== '') || narrationChanged;
  const hasTimingEdit = Array.isArray(captionTimings) && captionTimings.length > 0; // V2 자막 타임라인 → 자막 타이밍만(값싼)
  if (!hasCaptionEdit && !hasStyle && !hasMusic && !hasVoiceEdit && !hasTimingEdit) return null; // 값싼 경로로 처리할 변경이 없음

  const row = await loadJobForEdit(jobId, user.id);
  if (!row || !row.script) return null;
  const script = safeParse(row.script);
  const R = script && script._render;
  if (!script || !Array.isArray(script.scenes) || !R || !R.silentBase || !R.previewBase || !R.caption) return null; // 레거시 잡 → 폴백
  // 씬별 VO(음성-주도 리타이밍, 옵션B) 잡은 값싼 재합성 불가(편집이 재타이밍을 유발 → silentBase 무효) → 전체 reRender 폴백(reuseVo 캐시로 재TTS·재Kling은 0).
  const _voSegs = R.audioAssets && R.audioAssets.vo && Array.isArray(R.audioAssets.vo.segs) ? R.audioAssets.vo.segs : null;
  if (_voSegs && (_voSegs.length > 1 || _voSegs.some((s) => s && ((s.startMs || 0) > 0 || Number(s.sceneN || 0) !== 0)))) return null;

  const curOrder = script.scenes.map((s) => s.n);
  if (order && order.length && (order.length !== curOrder.length || order.some((n, i) => Number(n) !== curOrder[i]))) return null; // 순서 변경 → 폴백

  // ── 오디오 재생성 과금(2026-07-27) — 초기 생성은 베이스 포함/무과금, **편집 중 다시 만들 때만** 과금.
  //   실제 재생성될 것만 사전 차감(음성=re-TTS 조건, 음악=게이트 a 조건과 동일). 402/403은 여기서 throw → 무료 폴백 방지.
  const _audioNext = { ...(R.audio || {}) };
  if (hasMusic) _audioNext.music = (mv.toLowerCase() !== 'none');
  if (voice != null) _audioNext.voice = !!voice;
  const _narrText = ((narration != null ? String(narration) : (script.narration || script.scenes.map((s) => (s.spoken || s.onScreenText || '').trim()).filter(Boolean).join(' '))) || '').trim();
  const _durSec = Math.round((R.durationMs || R.caption.timings.reduce((m, t) => Math.max(m, t.startMs + t.durMs), 0) || 6000) / 1000);
  let regenCredits = 0;
  if (hasVoiceEdit && _audioNext.voice && _narrText && tts.isConfigured()) regenCredits += creditService.voiceRegenCost(_narrText.length);
  if (hasMusic && _audioNext.music && music.isConfigured()) regenCredits += creditService.musicRegenCost(_durSec);
  let rcCharge = null;
  if (regenCredits > 0) rcCharge = await teamCredit.chargeGeneration(user, regenCredits, `오디오 재생성 (편집 ${jobId})`);
  let ok = false;

  const rlog = (m) => log.info(`[recompose ${jobId}] ${m}`);
  const workDir = path.join(process.cwd(), 'tmp', 'ugc', `rc_${crypto.randomUUID().slice(0, 8)}`);
  fs.mkdirSync(workDir, { recursive: true });
  try {
    // 편집 반영(영속 대상): 자막 텍스트(onScreenText만) → script.scenes, 스타일 → _render.subtitleStyle, 음악 → _render.audio
    for (const k in (edits || {})) { const e = edits[k]; const s = script.scenes.find((x) => String(x.n) === String(k)); if (s && e && 'onScreenText' in e) s.onScreenText = String(e.onScreenText || '').slice(0, 300); }
    if (hasStyle) R.subtitleStyle = { ...(R.subtitleStyle || {}), ...subtitleStyle };
    let audio = { ...(R.audio || {}) };
    if (hasMusic) { if (mv.toLowerCase() === 'none') audio.music = false; else { script.musicVibe = mv.toLowerCase() === 'auto' ? '' : mv; audio.music = true; } }
    if (voice != null) audio.voice = !!voice;                              // 음성 on/off
    if (voiceId) audio.voiceId = String(voiceId);                          // 보이스 교체
    if (speed != null && speed !== '') audio.speed = Number(speed);        // 말속도
    if (narrationChanged) script.narration = String(narration).slice(0, 5000); // V2 나레이션 편집기 → 통 나레이션 텍스트
    if (hasMusic || hasVoiceEdit) R.audio = audio;                         // 오디오 변경 영속
    // V2 자막 타임라인 → 자막 타이밍 override(영속). 씬 매핑·숫자만 정제, 영상 길이 안에 클램프.
    if (hasTimingEdit) {
      const dur = R.durationMs || 0;
      R.caption.timings = captionTimings.map((t) => {
        const start = Math.max(0, Math.round(Number(t.startMs) || 0));
        let d = Math.max(200, Math.round(Number(t.durMs) || 0));
        if (dur && start + d > dur) d = Math.max(200, dur - start);
        const e = { startMs: start, durMs: d };
        if (Number.isFinite(Number(t.sceneN))) e.sceneN = Number(t.sceneN); // 씬 자막(텍스트는 씬에서)
        if (t.text != null) e.text = String(t.text).slice(0, 300);          // 자유 자막(자기 텍스트 보유)
        if (t.id != null) e.id = String(t.id).slice(0, 40);
        return e;
      }).filter((t) => Number.isFinite(t.sceneN) || (t.text != null && t.text !== '')); // 씬 자막 또는 텍스트 있는 자유 자막만
    }

    const byN = {}; script.scenes.forEach((s) => { byN[s.n] = s; });
    const style = { ...(R.caption.style || {}), ...(R.subtitleStyle || {}), lang: script.language || (R.caption.style && R.caption.style.lang) || 'ko' };
    const captionsOff = !!(R.subtitleStyle && R.subtitleStyle.off);
    const subtitle = captionsOff ? [] : R.caption.timings
      .map((t) => ({ sceneN: t.sceneN, startMs: t.startMs, durMs: t.durMs, text: captionTextOf(t, byN), chunked: t.chunked })) // 자유=자기 text, 씬=씬에서. chunked(B 실 청크)는 보존→재청킹 안 함
      .filter((s) => s.text);
    const W = R.caption.w || 1080, H = R.caption.h || 1920;
    const durMs = R.durationMs || R.caption.timings.reduce((m, t) => Math.max(m, t.startMs + t.durMs), 0) || 6000;
    const wantVoice = !!audio.voice, wantMusic = !!audio.music;

    let baseAbs; // 자막 얹을 베이스(영상+오디오, 자막 없음)
    if (hasMusic || hasVoiceEdit) {
      // 음악/음성 변경 → silentBase에 오디오 재믹싱 → previewBase 갱신 (재타이밍·클립 재작업 0)
      const silent = await restoreClipLocal(R.silentBase);
      if (!silent) return null; // 베이스 복원 실패 → 폴백
      const audioInputs = [];
      // VO(통 나레이션): 음성 편집이면 새 보이스/속도로 재합성, 아니면 캐시 재사용. voice off면 VO 없음.
      if (wantVoice) {
        const narrText = (script.narration && String(script.narration).trim()) || script.scenes.map((s) => (s.spoken || s.onScreenText || '').trim()).filter(Boolean).join(' ');
        let voLocal = null;
        if (hasVoiceEdit && narrText && tts.isConfigured()) {
          rlog(`나레이션 재합성(음성 변경) [${tts.provider()}]`);
          try { voLocal = await tts.synthesize(narrText, { outPath: path.join(workDir, 'vo.mp3'), voiceId: audio.voiceId, speed: audio.speed }); } catch (e) { rlog(`VO 재합성 실패: ${e.message}`); }
          if (voLocal && R.audioAssets) R.audioAssets.vo = { key: voKey(script, audio), segs: [{ sceneN: 0, file: await persistAudioFile(voLocal), startMs: 0 }] };
        } else if (R.audioAssets && R.audioAssets.vo && Array.isArray(R.audioAssets.vo.segs) && R.audioAssets.vo.segs[0]) {
          voLocal = await restoreClipLocal(R.audioAssets.vo.segs[0].file); // 재사용(음성 안 바뀜)
        }
        if (voLocal) audioInputs.push({ file: voLocal, volume: 1.0, kind: 'vo', delayMs: 0 });
        else if (hasVoiceEdit && narrText && tts.isConfigured()) { rlog('VO 재합성 실패 → 무음 성공 방지, 전체 reRender 폴백'); return null; } // #8: 음성 편집 요청인데 합성 실패 시, 나레이션 없는 영상을 '성공'으로 내지 않고 전체 경로로 폴백(사용자에 오류 노출/재시도)
      } else if (R.audioAssets) { delete R.audioAssets.vo; } // voice off → VO 자산 제거
      if (wantMusic) {
        if (hasMusic && music.isConfigured()) {   // 게이트(a): musicVibe 실제 변경 시만 재생성(+과금). 음성만 편집 시엔 아래에서 기존 음악 재사용.
          rlog('음악 재생성 [elevenlabs music]');
          const m = await music.composeForScript(script, { durationMs: durMs, outPath: path.join(workDir, 'music.mp3') });
          if (m) { audioInputs.push({ file: m, volume: audioInputs.length ? 0.18 : 0.5, kind: 'music' }); if (R.audioAssets) R.audioAssets.music = { file: await persistAudioFile(m), key: musicKey(script) }; }
        } else if (R.audioAssets && R.audioAssets.music) { const mp = await restoreClipLocal(R.audioAssets.music.file); if (mp) audioInputs.push({ file: mp, volume: audioInputs.length ? 0.18 : 0.5, kind: 'music' }); } // 재사용(vibe 미변경 or 미설정)
      } else if (R.audioAssets) { delete R.audioAssets.music; }
      if (audioInputs.length) baseAbs = await muxAudio(silent, audioInputs, Math.max(durMs / 1000, 1), workDir, 'base.mp4');
      else { baseAbs = path.join(workDir, 'base.mp4'); fs.copyFileSync(silent, baseAbs); }
      R.previewBase = await persistVideoFile(baseAbs); // 오디오 바뀐 새 무자막 미리보기 베이스
    } else {
      baseAbs = await restoreClipLocal(R.previewBase); // 자막/스타일만 → 기존 미리보기 베이스(영상+오디오) 재사용
      if (!baseAbs) return null;
    }

    const burned = await burnCaptions({ basePath: baseAbs, subtitle, style, w: W, h: H, workDir, hasAudio: wantVoice || wantMusic, log: rlog });

    fs.mkdirSync(servedDir, { recursive: true });
    const filename = `${crypto.randomUUID()}.mp4`;
    const served = path.join(servedDir, filename);
    fs.copyFileSync(burned.videoPath, served);
    await mediaStore.putFile(served).catch(() => {});
    const durationSec = Math.round(durMs / 1000);
    if (row.result_idx) { // committed 후에만 generation_results in-place 갱신(draft는 스킵)
      await query(`UPDATE generation_results SET file_path=$2, file_size_kb=$3, metadata=$4 WHERE idx=$1`,
        [row.result_idx, `tmp/images/${filename}`, Math.round(fs.statSync(served).size / 1024),
         JSON.stringify({ type: 'video', source: 'ugc', outputType: row.output_type, duration: durationSec, subtitleMode: burned.subtitleMode, edited: true })]);
    }
    await updateJob(jobId, { status: 'succeeded', result_url: `/images/${filename}`, duration_sec: durationSec, subtitle_mode: burned.subtitleMode, script: JSON.stringify(script) });
    ok = true;   // 성공 — finally에서 재생성 과금 환불 안 함
    rlog(`값싼 재합성 완료(${(hasMusic || hasVoiceEdit) ? '오디오+' : ''}자막, 클립/재타이밍 0, 재생성과금 ${regenCredits}) → /images/${filename}`);
    return { jobId, resultUrl: `/images/${filename}`, durationSec, cost: regenCredits };
  } catch (e) {
    log.warn(`[recompose ${jobId}] 실패 → 전체 재조립 폴백: ${e.message}`);
    return null; // 폴백(잡 미갱신 — 호출부 reRender가 원본 script로 다시 처리)
  } finally {
    if (!ok && rcCharge) { try { await rcCharge.refund(); } catch {} } // 재합성 실패·폴백 시 재생성 과금 환불(성공분만 유지)
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
  }
}

/**
 * 재조립/씬재생성 — 저장된 씬 클립을 재사용해 재배치·삭제·자막수정을 반영(무과금),
 *   redoScenes 지정 시 그 씬만 이미지→모션 재생성(과금). 기존 결과를 in-place 갱신(피드에 새 카드 안 쌓임).
 *   - 재배치/삭제/자막: Kling/nanoBanana 재호출 0 → 무과금. spoken 바뀌고 음성ON이면 그 구간만 재TTS(무과금).
 *   - redoScenes: 씬당 1클립 과금(placeholder=videoCost). editedPrompts[n]로 brollPrompt 교체(P3 Advanced).
 * @param {{ user:object, jobId:string, order?:number[], removed?:number[], edits?:object,
 *           redoScenes?:number[], editedPrompts?:object, dryRunVideo?:boolean }} p
 */
// 잡별 직렬화 큐 — 동시 재생성/편집/커밋이 scene_clips·결과·오디오·완성본캐시를 경쟁(하나만 반영·음성 겹침·피드 지터)하던 것 방지.
//   같은 jobId 요청은 앞 작업이 끝난 뒤 순서대로 실행 → 각 작업이 직전 결과 위 상태를 로드해 누적. reRender·commitJob·백스톱이 공유.
//   ⚠️ 인메모리 = 단일 인스턴스 전제(ecosystem.config.js instances:1). prod가 멀티 인스턴스면 DB 락 필요(후속).
const _rerenderChain = Object.create(null);
function chainRun(jobId, fn) {
  if (!jobId) return fn();
  const prev = _rerenderChain[jobId] || Promise.resolve();
  const cur = prev.then(fn, fn); // 성패 무관 앞 작업 뒤 실행
  const tail = cur.then(() => {}, () => {});
  _rerenderChain[jobId] = tail;
  tail.then(() => { if (_rerenderChain[jobId] === tail) delete _rerenderChain[jobId]; }); // 큐 비면 키 정리(누수 방지)
  return cur;
}
// #6·#7: 저장된 씬 자막 커스텀 타이밍(R.caption.timings의 sceneN 항목)을 plan.tracks.subtitle에 재적용.
//   buildRenderPlan은 씬 자막을 기본 커서 타이밍으로만 만드므로, full reRender에서 타임라인 편집이 유실되던 것을 복원.
//   subtitle 요소를 in-place로 갱신(startMs/durMs). durMs 클램프로 영상 길이 초과 방지.
function applySceneCaptionTimings(subtitle, timings, durMs) {
  if (!Array.isArray(subtitle) || !Array.isArray(timings)) return subtitle;
  const byScene = {};
  for (const t of timings) { const n = Number(t && t.sceneN); if (Number.isFinite(n)) byScene[n] = t; }
  for (const s of subtitle) {
    const t = (s && s.sceneN != null) ? byScene[Number(s.sceneN)] : null;
    if (!t) continue;
    let start = Math.max(0, Math.round(Number(t.startMs) || 0));
    let d = Math.max(200, Math.round(Number(t.durMs) || 0));
    if (durMs && start + d > durMs) d = Math.max(200, durMs - start);
    s.startMs = start; s.durMs = d;
  }
  return subtitle;
}
function reRender(params) {
  return chainRun(params && params.jobId, () => _reRenderImpl(params));
}
async function _reRenderImpl({ user, jobId, order = null, removed = [], edits = {}, redoScenes = [], editInstructions = {}, editRefPaths = [], addScenes = [], musicVibe = null, voice = null, voiceId = null, speed = null, subtitleStyle = null, narration = null, captionTimings = null, setVersions = {}, dryRunVideo = false }) {
  // B+ 값싼 경로 우선: 자막(텍스트/스타일·타이밍)·음악·음성/나레이션만 바뀌면 베이스에서 재합성(클립/재타이밍 0). 처리 불가면 null → 아래 전체 경로.
  const cheap = await tryReComposite({ user, jobId, order, removed, edits, redoScenes, addScenes, musicVibe, voice, voiceId, speed, subtitleStyle, narration, captionTimings, setVersions });
  if (cheap) return cheap;

  const row = await loadJobForEdit(jobId, user.id);
  if (!row) { const e = new Error('Job not found'); e.statusCode = 404; throw e; }
  // 편집 가능 조건 = 대본 보유(완성된 잡). result_idx는 요구하지 않음
  //   (draft 라이프사이클: 완성 직후엔 result_idx 없음 → Save & finish 전에도 편집 허용).
  //   status는 재조립을 백그라운드로 돌리는 동안 'processing'으로 두므로 여기선 판단 기준에서 제외
  //   (초기 생성 중 잡은 아직 script가 없어 자연히 걸러짐). generation_results 갱신은 result_idx 있을 때만.
  if (!row.script) {
    const e = new Error('This video is not editable'); e.statusCode = 400; throw e;
  }
  const script = safeParse(row.script);
  const sceneClips = safeParse(row.scene_clips) || {};
  if (!script || !Array.isArray(script.scenes)) { const e = new Error('script unavailable'); e.statusCode = 400; throw e; }

  // 편집 적용: broll 씬만 대상 → 삭제 → 자막/내레이션 수정 → 재정렬(순수 헬퍼)
  const scenes = applySceneEdits(script.scenes, { order, removed, edits });
  if (!scenes.length) { const e = new Error('At least one scene must remain'); e.statusCode = 422; throw e; }

  const aspect = (script._render && script._render.aspect) || script.aspect || '9:16';
  let audio = (script._render && script._render.audio) || {};

  // "음악만 바꾸기" — musicVibe override(무과금). 영상·클립·VO는 그대로, 배경음만 재생성+재조립.
  //   ''(Auto)=AI 기본 무드, 'none'=음악 끔, 그 외=무드 프리셋/자연어. 변경은 _render.audio에도 영속화(다음 편집서 유지).
  const mv = musicVibe == null ? null : String(musicVibe).trim();
  if (mv != null) {
    if (mv.toLowerCase() === 'none') {
      audio = { ...audio, music: false };
    } else {
      script.musicVibe = mv.toLowerCase() === 'auto' ? '' : mv;
      audio = { ...audio, music: true };
    }
    if (script._render) script._render.audio = audio;
  }

  // 음성 override(A/B) — on/off·보이스·속도. 캐싱이 voKey(텍스트+보이스+속도)로 재생성 자동 판단.
  //   voiceId/speed 바뀌면 VO만 재생성(클립·음악 재사용), voice=false면 VO 트랙 제거(무과금).
  let audioTouched = mv != null;
  if (voice != null) { audio = { ...audio, voice: !!voice }; audioTouched = true; }
  if (voiceId) { audio = { ...audio, voiceId: String(voiceId) }; audioTouched = true; }
  if (speed != null && speed !== '') { audio = { ...audio, speed: Number(speed) }; audioTouched = true; }
  if (audioTouched && script._render) script._render.audio = audio;

  // 자막 스타일 override(C) — 위치·크기·색상. 클립·VO·음악 전부 재사용, 자막만 재번인 = 완전 무과금.
  if (subtitleStyle && typeof subtitleStyle === 'object' && Object.keys(subtitleStyle).length && script._render) {
    script._render.subtitleStyle = { ...(script._render.subtitleStyle || {}), ...subtitleStyle };
  }

  // 새 씬 추가(끝에) — 기존 대본 맥락으로 Claude가 생성(자연어 지시 or AI 제안). 한 영상 최대 12씬.
  const adds = Array.isArray(addScenes) ? addScenes : [];
  if (adds.length) {
    if (scenes.length + adds.length > 12) { const e = new Error('You can have up to 12 scenes in one video'); e.statusCode = 422; throw e; }
    let maxN = scenes.reduce((mx, s) => Math.max(mx, Number(s.n) || 0), 0);
    const vo = scenes.some((s) => s.spoken && s.spoken.trim());
    for (const a of adds) {
      const ns = (a && a.scene && (a.scene.brollPrompt || a.scene.summary))
        ? normalizeAddSceneObj(a.scene, row.output_type, vo) // 제안 선택 — Claude 재생성 없이 그대로 추가
        : await generateAddScene({ script, instruction: a && a.instruction, outputType: row.output_type }); // 자연어 → 생성
      ns.n = ++maxN;
      scenes.push(ns);
    }
  }
  script.scenes = scenes;

  // 렌더 대상 = 재생성 지정 씬(redoScenes) + 새로 추가된 씬(클립 없음). 과금.
  const redoSet = new Set((redoScenes || []).map(Number));
  const addedNs = new Set(adds.length ? scenes.slice(-adds.length).map((s) => s.n) : []);
  const toRender = scenes.filter((s) => redoSet.has(s.n) || addedNs.has(s.n));
  let charge = null;
  if (toRender.length) {
    const cost = toRender.reduce((sum, s) => sum + creditService.videoCost(klingGenDur(s.durationSec), 'pro', false), 0);
    charge = await teamCredit.chargeGeneration(user, cost, `UGC 씬 ${toRender.length}컷 (재생성/추가)`); // 402/403 전파
  }
  try {
    if (toRender.length) {
      const { w, h } = aspectDims(aspect);
      const R0 = script._render || {};
      // 다각도 레퍼런스 복원: products(배열) 우선, 없으면 product(단일, 옛 잡). 전부 R2/로컬 복원.
      const refEntries = (Array.isArray(R0.products) && R0.products.length) ? R0.products : (R0.product ? [R0.product] : []);
      const productKind = (refEntries[0] && refEntries[0].kind) || 'product';
      const productLocals = [];
      for (const e of refEntries) { if (!e || !e.clip) continue; const lp = await restoreClipLocal(e.clip); if (lp) productLocals.push(lp); }
      // 원본에 제품 레퍼런스가 있었는데 하나도 복원 못 함 → off-brand 이미지 생성+과금 방지(환불되게 throw)
      if (refEntries.length && !productLocals.length) throw Object.assign(new Error('Product reference is no longer available — cannot re-generate this scene'), { statusCode: 410 });
      const modelPath = (script._render && script._render.model) || null;
      // Edit scene 추가 레퍼런스(이번 재생성에만 참고) — 이미 tmp/images에 저장된 로컬 경로. 제품 레퍼런스에 합침(product-ad).
      const editExtra = (Array.isArray(editRefPaths) ? editRefPaths.filter(Boolean) : []);
      for (const s of toRender) {
        // 재생성 씬만 자연어 지시 반영(새 씬은 generateAddScene이 프롬프트 이미 생성) → Claude 이미지/모션 라우팅
        const ins = redoSet.has(s.n) ? (editInstructions[s.n] != null ? editInstructions[s.n] : editInstructions[String(s.n)]) : null;
        if (ins != null && String(ins).trim()) {
          const refined = await refineScene({ brollPrompt: s.brollPrompt, direction: s.direction, summary: s.summary, instruction: ins, subject: s.subject, language: script.language });
          s.brollPrompt = refined.brollPrompt; s.direction = refined.direction; s.summary = refined.summary;
        }
        const clip = await renderSceneClip(s, {
          productImagePaths: productKind === 'product' ? [...productLocals, ...editExtra] : editExtra,
          referenceImagePath: productKind === 'product' ? null : (editExtra.length ? null : (productLocals[0] || null)),
          referenceKind: productKind, modelImagePath: modelPath,
          width: w, height: h, aspect, dryRunVideo,
          log: (m) => log.info(`[re-render ${jobId}] ${m}`),
        });
        if (!clip || !clip.clipUrl) throw Object.assign(new Error(`Scene ${s.n} could not be re-generated`), { statusCode: 503 });
        // 비파괴: 덮어쓰지 않고 versions[]에 추가 + 새 것을 활성으로. 이전 클립 보존 → 씬 카드에서 되돌리기 가능.
        const nm = await persistSceneClips([clip]);
        const ne = nm[s.n] || nm[String(s.n)];
        if (ne) {
          const prev = sceneClips[s.n] || sceneClips[String(s.n)];
          let versions = (prev && Array.isArray(prev.versions)) ? prev.versions.slice() : (prev && prev.clip ? [stripClipEntry(prev)] : []);
          versions.push(stripClipEntry(ne));
          if (versions.length > 8) versions = versions.slice(-8); // 버전 상한(스토리지 보호)
          sceneClips[s.n] = Object.assign(stripClipEntry(ne), { versions, v: versions.length - 1 });
        }
      }
    }
    // 씬 버전 전환(무과금): 지정 씬의 활성 클립을 versions[idx]로 교체(재조립만, Kling 0). 렌더 뒤·복원 앞에 적용.
    //   ⚠️ 방금 재생성(redo)·추가(added)한 씬은 스킵 — 새로 만든 버전을 활성으로 유지해야 함. 프론트가 자동으로
    //   보내는 setVersions(재생성 前 활성)가 새 버전을 옛 버전으로 되돌려 "새 버전이 안 보이던" 버그 방지.
    for (const k in (setVersions || {})) {
      const n = Number(k), idx = Number(setVersions[k]);
      if (redoSet.has(n) || addedNs.has(n)) continue; // 재생성/추가 씬은 새 버전 활성 유지
      const cur = sceneClips[n] || sceneClips[String(n)];
      if (cur && Array.isArray(cur.versions) && cur.versions[idx]) {
        sceneClips[n] = Object.assign(stripClipEntry(cur.versions[idx]), { versions: cur.versions, v: idx });
      }
    }

    // 저장된 클립 복원(redo된 건 새 것, 나머지 기존; 로컬 우선 없으면 S3)
    const clips = [];
    for (const s of scenes) {
      const cl = sceneClips[s.n] || sceneClips[String(s.n)];
      if (!cl || !cl.clip) continue;
      let clipUrl;
      if (cl.remote) { clipUrl = cl.clip; } // persist 실패분: 원본 http URL(assembler가 다운로드)
      else { const local = await restoreClipLocal(cl.clip); if (!local) continue; clipUrl = `file://${local}`; }
      const thumbLocal = cl.thumb ? await restoreClipLocal(cl.thumb) : null;
      clips.push({ sceneN: s.n, clipUrl, durationMs: cl.durationMs, isStill: !!cl.isStill, imageUrl: thumbLocal ? `file://${thumbLocal}` : null });
    }
    if (!clips.length) throw Object.assign(new Error('Scene clips are no longer available'), { statusCode: 410 });

    // 재조립(원본 오디오/비율 재사용)
    const plan = buildRenderPlan(script, clips);
    plan.meta.aspect = aspect;
    // 자유(직접 추가) 자막은 씬에 안 묶임 → buildRenderPlan(씬 기반)이 놓치므로, 저장된 timings의 자유 자막을 이어붙여 보존.
    {
      const Rc = script._render && script._render.caption;
      const capOff = !!(script._render && script._render.subtitleStyle && script._render.subtitleStyle.off);
      if (Rc && Array.isArray(Rc.timings) && !capOff) {
        const dur = plan.meta.durationMs || 0;
        for (const t of Rc.timings) {
          if (t.text == null || !String(t.text).trim() || Number.isFinite(Number(t.sceneN))) continue; // 씬 자막은 아래서 처리
          let start = Math.max(0, Math.round(Number(t.startMs) || 0));
          let d = Math.max(200, Math.round(Number(t.durMs) || 0));
          if (dur && start + d > dur) d = Math.max(200, dur - start);
          if (!dur || start < dur) plan.tracks.subtitle.push({ id: t.id, startMs: start, durMs: d, text: String(t.text).trim() });
        }
        // #6·#7: 씬 자막의 커스텀 타이밍(타임라인 편집)을 재적용 — buildRenderPlan은 기본 커서 타이밍이라 full reRender서 유실됐음.
        //   → (a)구운 자막이 편집 타이밍 반영, (b)subtitleSig(캐시키) 변경으로 stale hit 방지.
        applySceneCaptionTimings(plan.tracks.subtitle, Rc.timings, dur);
      }
    }

    // ── 완성본 캐시: 이 상태(버전 전환 포함)의 완성본이 있으면 재조립 0, URL 스왑만 ──
    //   키가 비디오(버전·순서·삭제)+자막+오디오+비율+스타일 전체를 담아 스테일 불가능. 미스면 아래서 재조립.
    const R2 = script._render || (script._render = {});
    const styleForKey = (R2.subtitleStyle && typeof R2.subtitleStyle === 'object') ? R2.subtitleStyle : undefined;
    const ckey = compositeKey(scenes, sceneClips, plan, audio, aspect, styleForKey, script);
    const hit = await lookupComposite(R2, ckey);
    if (hit) {
      // 활성 베이스/자막 스펙을 이 버전 것으로 복원(오버레이·치싼 재합성 정확성).
      //   preview/silent 파일이 유실됐으면(lookup이 null 반환) 베이스도 null로 → 오버레이는 최종본 표시,
      //   이후 편집은 스테일 베이스 대신 full 경로로 재생성(다른 버전 영상이 섞이는 것 방지).
      R2.previewBase = hit.preview || null;
      R2.silentBase = hit.silent || null;
      if (hit.caption) R2.caption = hit.caption;
      const durationSec = hit.durationSec || Math.round((plan.meta.durationMs || 0) / 1000);
      R2.durationMs = (durationSec * 1000) || plan.meta.durationMs || R2.durationMs || 0; // 활성 완성본 길이 반영 → 이후 '음악만 교체'가 이 길이로 재생성
      const servedHit = path.join(servedDir, hit.file);
      if (row.result_idx) { // committed 후에만 generation_results in-place 갱신(draft는 스킵)
        await query(`UPDATE generation_results SET file_path=$2, file_size_kb=$3, metadata=$4 WHERE idx=$1`,
          [row.result_idx, `tmp/images/${hit.file}`, fs.existsSync(servedHit) ? Math.round(fs.statSync(servedHit).size / 1024) : null,
           JSON.stringify({ type: 'video', source: 'ugc', outputType: row.output_type, duration: durationSec, subtitleMode: hit.subtitleMode, clips: plan.tracks.video.length, edited: true })]);
      }
      await updateJob(jobId, {
        status: 'succeeded', result_url: `/images/${hit.file}`, duration_sec: durationSec,
        subtitle_mode: hit.subtitleMode, script: JSON.stringify(script), scene_clips: JSON.stringify(sceneClips),
      });
      log.info(`UGC job ${jobId} 완성본 캐시 히트(재조립 0) → /images/${hit.file}`);
      return { jobId, resultUrl: `/images/${hit.file}`, durationSec, cost: charge ? charge.amount : 0 };
    }

    // 오디오 캐싱: 저장된 VO·음악 중 키가 그대로면 재사용(재생성 안 함). 다르면 재생성.
    //   음악만 바꾸기 = 음악 키만 변경 → VO 재사용, 음악만 새로. 재배치/자막편집 = 텍스트 바뀌면 VO만 재생성.
    const prevAssets = (script._render && script._render.audioAssets) || {};
    const reuseMap = {};
    let reuseVo = null, reuseMusic = null;
    if (audio.voice && prevAssets.vo && prevAssets.vo.key === voKey(script, audio) && Array.isArray(prevAssets.vo.segs)) {
      const restored = [];
      for (const s of prevAssets.vo.segs) {
        const local = await restoreClipLocal(s.file);
        if (local) restored.push({ sceneN: s.sceneN, path: local, startMs: s.startMs });
      }
      if (restored.length === prevAssets.vo.segs.length) { reuseVo = restored; reuseMap.vo = prevAssets.vo; } // 전부 복원돼야 재사용
    }
    if (audio.music && prevAssets.music && prevAssets.music.key === musicKey(script)) {
      reuseMusic = await restoreClipLocal(prevAssets.music.file);
      if (reuseMusic) reuseMap.music = prevAssets.music;
    }
    const out = await assemble(plan, { audio, script, aspect, reuseVo, reuseMusic, subtitleStyle: (script._render && script._render.subtitleStyle) || undefined, log: (m) => log.info(`[re-render ${jobId}] ${m}`) });
    // 자산 갱신: 재사용 트랙은 기존 entry 유지, 재생성 트랙만 새로 영속화
    if (script._render) script._render.audioAssets = await buildAudioAssets(out.audioAssets, script, audio, reuseMap);

    // in-place 갱신: 새 mp4 서빙 + 기존 generation_results 행 교체 + 잡 갱신
    fs.mkdirSync(servedDir, { recursive: true });
    const filename = `${crypto.randomUUID()}.mp4`;
    const served = path.join(servedDir, filename);
    fs.copyFileSync(out.videoPath, served);
    await mediaStore.putFile(served);
    const durationSec = Math.round((plan.meta.durationMs || 0) / 1000);
    // 완성본 캐시 갱신 + 활성 베이스(오버레이·치싼 재합성용)를 이 버전 것으로 영속화 → 다음에 같은 상태면 즉시 히트.
    //   (풀 재조립 경로가 previewBase/silentBase를 안 갱신하던 잠복 버그도 해소: 버전 전환 후 오버레이가 옛 클립을 보이던 문제.)
    const previewBase = await persistVideoFile(out.basePath);
    const silentBase = await persistVideoFile(out.silentPath);
    if (script._render) {
      if (previewBase) script._render.previewBase = previewBase;
      if (silentBase) script._render.silentBase = silentBase;
      if (out.caption) script._render.caption = out.caption;
      script._render.durationMs = plan.meta.durationMs || 0; // 씬 추가/삭제로 바뀐 현재 길이 반영 → 이후 '음악만 교체'가 이 길이로 재생성(옛 길이로 음악 짧아지고 영상 잘리던 버그 방지)
      storeComposite(script._render, ckey, { file: filename, preview: previewBase, silent: silentBase, caption: out.caption, durationSec, subtitleMode: out.subtitleMode }, filename);
    }
    if (row.result_idx) { // committed(저장됨) 후 편집만 generation_results 반영. draft는 result_idx 없어 스킵.
      await query(
        `UPDATE generation_results SET file_path=$2, file_size_kb=$3, metadata=$4 WHERE idx=$1`,
        [row.result_idx, `tmp/images/${filename}`, Math.round(fs.statSync(served).size / 1024),
         JSON.stringify({ type: 'video', source: 'ugc', outputType: row.output_type, duration: durationSec,
           subtitleMode: out.subtitleMode, clips: plan.tracks.video.length, edited: true })]
      );
    }
    await updateJob(jobId, {
      status: 'succeeded', // 백그라운드 재조립 완료 — beginRerender가 걸어둔 'processing'을 해제(프론트 폴링 종료 신호)
      result_url: `/images/${filename}`, duration_sec: durationSec, subtitle_mode: out.subtitleMode,
      script: JSON.stringify(script), scene_clips: JSON.stringify(sceneClips),
    });
    log.info(`UGC job ${jobId} re-rendered (씬 ${scenes.length}개, 렌더 ${toRender.length}, ${charge ? 'cost=' + charge.amount : '무과금'}) → /images/${filename}`);
    return { jobId, resultUrl: `/images/${filename}`, durationSec, cost: charge ? charge.amount : 0 };
  } catch (e) {
    if (charge) await charge.refund().catch(() => {}); // redo 렌더/조립/저장 어디서 실패해도 재생성 과금 환불
    throw e;
  }
}

/**
 * "Save & finish" 또는 이탈 시 — draft를 generation_results에 확정 저장(My creations/Library/Explore 노출). 멱등.
 *   ⚠️ reRender와 같은 잡별 직렬화 큐(chainRun)에 태워 호출(commit vs 편집 경쟁 방지 — 아래 commitJob 래퍼).
 * @returns {Promise<{resultIdx:number, already?:boolean}|null>} null=없음/권한없음/미완성
 */
async function _commitJobImpl(id, userId, batchId) {
  const r = await query(
    `SELECT id, user_id, team_id, output_type, visibility, title, caption, hashtags,
            duration_sec, subtitle_mode, result_url, result_idx, script, status
     FROM ugc_jobs WHERE id = $1 AND (
       user_id = $2 OR (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)))`,
    [id, userId]
  );
  const j = r.rows[0];
  if (!j) return null;
  if (j.result_idx) return { resultIdx: j.result_idx, already: true }; // 이미 저장됨(멱등 — 중복 방지)
  if (j.status !== 'succeeded' || !j.result_url) return null; // 아직 완성 안 됨
  const filename = String(j.result_url).split('/').pop();
  const served = path.join(servedDir, filename);
  const script = safeParse(j.script) || {};
  const nClips = ((script.scenes || []).filter((s) => s.type === 'broll')).length;
  const savedPrompt = await promptRepo.insert({
    userId: j.user_id, promptText: `${j.title || ''} — ${j.caption || ''}`.slice(0, 2000),
    model: 'ugc-v1', tags: ['video', 'ugc', j.output_type], teamId: j.team_id,
  });
  // 크리에이션 카드에 "고객이 어떤 제품 사진을 넣었는지" 표시용.
  //   사진 생성은 characters JOIN(gr.character_id)으로 가져오는데 영상 결과엔 character_id가 안 실린다
  //   → 여기서 metadata에 직접 남긴다. 원본은 재렌더용으로 이미 script._render.products[].clip에
  //   보존돼 있고(tmp/images 파일명), 웹 서빙 경로가 /images/<파일명>이라 그대로 URL이 된다.
  const _R = script._render || {};
  const _prod = (Array.isArray(_R.products) && _R.products[0]) || _R.product || null;
  const _prodUrl = (_prod && _prod.clip) ? `/images/${_prod.clip}` : null;

  const savedResult = await resultRepo.insert({
    promptIdx: savedPrompt.idx, filePath: `tmp/images/${filename}`,
    fileSizeKb: fs.existsSync(served) ? Math.round(fs.statSync(served).size / 1024) : null, model: 'ugc-v1',
    metadata: { type: 'video', source: 'ugc', outputType: j.output_type, duration: j.duration_sec,
      subtitleMode: j.subtitle_mode, clips: nClips,
      ...(batchId != null ? { batch_id: String(batchId) } : {}),   // 🔗 팩 영상을 팩 이미지와 같은 배치로 묶기
      ...(_prodUrl ? { product_image: _prodUrl } : {}) },
    visibility: j.visibility === 'private' ? 'private' : 'public',
  });
  await reviewRepo.insert({ resultIdx: savedResult.idx, promptIdx: savedPrompt.idx }).catch(() => {});
  await updateJob(id, { result_idx: savedResult.idx });
  // 정리: 활성 결과만 남기고 다른 완성본 캐시 파일 제거(디스크 회수·가드 삭제 — 참조/활성 베이스는 안 지움).
  //   commit 후에도 편집(in-place)은 가능 → 캐시는 이후 다시 축적됨.
  const R = script._render;
  if (R && Array.isArray(R.composites) && R.composites.length > 1) {
    pruneComposites(R, filename);
    await updateJob(id, { script: JSON.stringify(script) });
  }
  log.info(`UGC job ${id} committed → generation_results idx ${savedResult.idx}`);
  return { resultIdx: savedResult.idx };
}
// 공개 커밋 — reRender와 같은 잡별 큐에 태움(commit vs 편집 경쟁 방지). sendBeacon 자동커밋도 이 경로.
function commitJob(id, userId, batchId) {
  return chainRun(id, () => _commitJobImpl(id, userId, batchId));
}

/**
 * D: 미굽힌 클라이언트 편집(재배치·삭제·자막·버전전환)을 먼저 굽고(무과금 reRender) 커밋.
 *   C가 편집을 클라이언트 즉시(서버 굽기 0)로 바꾼 뒤, Save·이탈 시 그 편집 상태로 최종본을 1회 굽기 위함.
 *   reRender·commitJob 둘 다 chainRun(jobId) → await reRender 완료 후 commit이 순서대로 실행(경쟁 없음).
 *   bake 실패해도 마지막 완성본으로 커밋(데이터 유실 방지 — 편집 반영만 놓치고 저장은 됨).
 * @param {{ user:object, jobId:string, order?:number[], removed?:number[], edits?:object, setVersions?:object }} p
 */
async function commitDraft(p) {
  try {
    await reRender({ user: p.user, jobId: p.jobId, order: p.order, removed: p.removed, edits: p.edits, setVersions: p.setVersions });
  } catch (e) {
    log.warn(`commitDraft ${p.jobId} bake 실패 → 마지막 완성본으로 커밋: ${e.message}`);
  }
  return commitJob(p.jobId, p.user.id);
}

/**
 * 백스톱 — 하드 크래시 등으로 커밋 없이 방치된 잡의 완성본 캐시 정리(고아 파일 회수).
 *   updated_at이 오래된(=편집 안 하는) 잡만, 활성 결과는 남기고 비활성 컴포지트만 제거(잡별 큐 경유).
 *   ⚠️ prod에서만 실행(index.js가 DISABLE_VIDEO_POLLER로 게이트 — 로컬 :3001은 prod DB에 붙으므로 sweep 금지).
 */
async function sweepStaleComposites({ maxAgeHours = 24, limit = 300 } = {}) {
  let rows;
  try {
    rows = (await query(
      `SELECT id, result_url FROM ugc_jobs
       WHERE status='succeeded' AND script IS NOT NULL AND updated_at < now() - ($1 * interval '1 hour')
       ORDER BY updated_at ASC LIMIT $2`, [maxAgeHours, limit])).rows;
  } catch (e) { log.warn(`sweepStaleComposites 쿼리 실패: ${e.message}`); return { swept: 0 }; }
  let swept = 0;
  for (const j of rows) {
    await chainRun(j.id, async () => { // 라이브 편집과 직렬화(경쟁 방지). 큐 안에서 최신 상태 재조회 후 판단.
      const fresh = (await query(`SELECT script, result_url FROM ugc_jobs WHERE id=$1`, [j.id])).rows[0];
      const s = fresh && safeParse(fresh.script); const R = s && s._render;
      if (!R || !Array.isArray(R.composites) || R.composites.length <= 1) return;
      const keep = fresh.result_url ? String(fresh.result_url).split('/').pop() : null;
      pruneComposites(R, keep);
      await updateJob(j.id, { script: JSON.stringify(s) });
      swept++;
    }).catch((e) => log.warn(`sweep ${j.id} 실패: ${e.message}`));
  }
  if (swept) log.info(`sweepStaleComposites: ${swept}개 잡의 비활성 완성본 캐시 정리`);
  return { swept };
}

/**
 * #9: 크래시·OOM·pm2 reload로 status='processing'에 영구 갇힌 ugc_jobs 회수.
 *   beginRerender가 processing으로 마킹 후 배경 reRender 도중 프로세스가 죽으면 .catch(failRerender)가 못 돌아 잡이 영영 로딩 상태로 남는다.
 *   video_jobs 리퍼 패턴 미러링 — 오래된 processing을 'succeeded'로 되돌려 재편집 가능하게(에러 라벨로 프론트에 안내).
 */
async function reapStaleProcessing({ maxAgeMinutes = 15 } = {}) {
  try {
    const r = await query(
      `UPDATE ugc_jobs SET status='succeeded', error='Editing was interrupted — please try again', updated_at=now()
       WHERE status='processing' AND script IS NOT NULL AND updated_at < now() - ($1 * interval '1 minute') RETURNING id`,
      [maxAgeMinutes]
    );
    if (r.rows.length) log.info(`reapStaleProcessing: ${r.rows.length}개 갇힌 processing 잡 회수`);
    return { reaped: r.rows.length };
  } catch (e) { log.warn(`reapStaleProcessing 실패: ${e.message}`); return { reaped: 0 }; }
}

/**
 * 최초 렌더가 크래시·재배포로 죽은 잡 회수 — failed + 환불. **부팅 시 1회만** 실행.
 *
 * 왜 필요한가 (reapStaleProcessing의 구멍):
 *   runPipeline은 script를 '끝날 때' status='succeeded'와 함께 기록한다 → 렌더 중엔 script가 NULL.
 *   그런데 reapStaleProcessing은 `AND script IS NOT NULL` 조건이라(원래 reRender/편집 경로용)
 *   최초 렌더 도중 프로세스가 죽으면 그 잡을 절대 건드리지 않는다.
 *   → 유저는 선차감된 채(render()가 chargeGeneration 후 INSERT) 잡도 영상도 못 받는다.
 *
 * 왜 '시간'이 아니라 '부팅'인가:
 *   runPipeline은 중간에 updateJob을 부르지 않아 렌더 내내 updated_at이 INSERT 시각에 멈춰 있다.
 *   즉 10분짜리 정상 렌더도 "10분간 멈춘 것"처럼 보인다 → 나이로 판단하면 살아있는 렌더를
 *   failed+환불로 죽인다(오탐 = 돈이 두 번 나감).
 *   반면 파이프라인은 프로세스 메모리에만 산다. pm2 instances:1 + fork 모드라 재시작 시 겹침이
 *   없으므로, **새 프로세스가 떴다 = 이전 파이프라인은 100% 죽었다**가 확정이다. 추측이 0.
 *   그래서 인터벌로 돌리지 않는다(reapStaleProcessing과 다른 점 — 그쪽은 돈이 안 걸려 있다).
 *
 * 멱등성: UPDATE ... WHERE status='processing' ... RETURNING 이 원자적이라 실제로 뒤집힌 행만
 *   돌아온다 → 환불은 행당 1회. 갱신 후 환불 순서인 이유: 사이에서 죽으면 '환불 누락'(수동 복구 가능)이지
 *   '이중 환불'(돈이 나감)이 아니다.
 */
async function reapCrashedRenders({ minAgeMinutes = 2 } = {}) {
  let rows;
  try {
    rows = (await query(
      `UPDATE ugc_jobs
          SET status='failed',
              error='Rendering was interrupted by a server restart — your credits were refunded.',
              updated_at=now()
        WHERE status='processing' AND script IS NULL
          AND updated_at < now() - ($1 * interval '1 minute')
        RETURNING id, user_id, charge_amount`,
      [minAgeMinutes]
    )).rows;
  } catch (e) { log.warn(`reapCrashedRenders 쿼리 실패: ${e.message}`); return { reaped: 0, refunded: 0 }; }
  if (!rows.length) return { reaped: 0, refunded: 0 };
  let refunded = 0;
  for (const r of rows) {
    const amt = Number(r.charge_amount) || 0;
    if (amt <= 0) continue; // admin 등 무과금 잡
    try {
      await teamCredit.refundGeneration({ id: r.user_id }, amt, 'UGC 영상 렌더 중단(서버 재시작) 환불', r.id);
      refunded += amt;
    } catch (e) { log.warn(`reapCrashedRenders 환불 실패 job=${r.id}: ${e.message}`); }
  }
  log.info(`reapCrashedRenders: 중단된 렌더 ${rows.length}개 회수, ${refunded}크레딧 환불`);
  return { reaped: rows.length, refunded };
}

/** 잡 상태 조회(소유자 본인 또는 팀 멤버) */
async function getJob(id, userId) {
  const gate = `(user_id = $2 OR (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)))`;
  let r;
  try {
    r = await query(
      `SELECT id, status, result_url, error, title, output_type, caption, hashtags,
              duration_sec, subtitle_mode, charge_amount, n_clips, script, scene_clips
       FROM ugc_jobs WHERE id = $1 AND ${gate}`,
      [id, userId]
    );
  } catch (e) {
    // script/scene_clips 컬럼 미마이그레이션 환경 폴백(구버전 잡)
    r = await query(
      `SELECT id, status, result_url, error, title, output_type, caption, hashtags,
              duration_sec, subtitle_mode, charge_amount, n_clips
       FROM ugc_jobs WHERE id = $1 AND ${gate}`,
      [id, userId]
    );
  }
  const j = r.rows[0];
  if (!j) return null;
  const sc = j.script ? (safeParse(j.script) || {}) : {};
  const R = sc._render || {};
  return {
    id: j.id, status: j.status, resultUrl: j.result_url, error: j.error,
    title: j.title, outputType: j.output_type, caption: j.caption, hashtags: j.hashtags,
    durationSec: j.duration_sec, subtitleMode: j.subtitle_mode, cost: j.charge_amount, nClips: j.n_clips,
    scenes: editableScenes(j.script, j.scene_clips), // 결과 편집용(brollPrompt 미노출)
    // B+ 2b: 편집 중 자막 없는 미리보기 영상 + 브라우저 오버레이용 자막 스펙(타이밍·스타일).
    previewUrl: R.previewBase ? `/images/${R.previewBase}` : null,
    captionSpec: R.caption ? { timings: R.caption.timings || [], style: R.caption.style || {}, w: R.caption.w || 1080, h: R.caption.h || 1920 } : null,
    subtitleStyle: R.subtitleStyle || null,
    language: sc.language || 'ko',
    // V2: 통 나레이션 텍스트(편집기 프리필) — 전용 필드 우선, 없으면 씬 대사 이어붙임. 음성 켜진 잡만 의미.
    narration: (sc.narration && String(sc.narration).trim()) || (Array.isArray(sc.scenes) ? sc.scenes.map((s) => (s.spoken || '').trim()).filter(Boolean).join(' ') : ''),
    hasVoice: !!(R.audio && R.audio.voice),
    hasMusic: !!(R.audio && R.audio.music),
    // A(레이어드 재생기): 음성·음악을 개별 트랙 URL로 노출 → 재생기가 별도 <audio> 2개로 얹어 on/off·볼륨·더킹을 클라이언트 즉시.
    //   파일은 이미 buildAudioAssets가 /images에 순수(pre-mix) mp3로 영속화 → 여기선 URL 파생만(추가 굽기 0).
    ...audioTrackUrls(R),
  };
}

/**
 * 저장된 결과(result_idx) → 그 잡. 피드 카드가 아는 열쇠는 result_idx 하나뿐이라,
 * "저장하고 나면 다시는 편집 못 하던" 결함의 되돌아올 길이 된다(카드 [Edit] → 조리대).
 *
 * 소유 게이트는 getJob과 동일 — id 해석에 한 번 걸고, 반환은 getJob에 위임해 한 번 더 걸린다
 * (직렬화·필드 정의가 getJob 한 곳에만 있게). sceneStoryboardForResult(공개 상세용, 게이트 없음)와
 * 혼동 금지: 저건 allowlist로 추린 관람용, 이건 소유자 편집용 전체.
 * 편집 가능 조건 = 대본 보유 → script IS NOT NULL(생성 중인 잡은 자연히 걸러짐).
 */
async function getJobByResultIdx(resultIdx, userId) {
  const idx = Number(resultIdx);
  if (!Number.isInteger(idx)) return null;
  const gate = `(user_id = $2 OR (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)))`;
  const r = await query(
    `SELECT id FROM ugc_jobs
      WHERE result_idx = $1 AND script IS NOT NULL AND ${gate}
      ORDER BY (status = 'succeeded') DESC, created_at DESC LIMIT 1`,
    [idx, userId]
  );
  const row = r.rows[0];
  if (!row) return null;
  return getJob(row.id, userId);
}

/**
 * A: script._render.audioAssets → 재생기용 개별 오디오 트랙 URL.
 *   voiceUrl = 통 나레이션 단일 트랙(t=0부터 재생). 음악 = 단일 트랙. 둘 다 풀볼륨 원본(더킹은 클라이언트가 적용).
 *   렌더 시 꺼진(파일 없는) 트랙은 null — 그 트랙 켜기는 서버 재생성(수초). 옛 씬별 다중 세그먼트(segs>1)는
 *   단일 트랙 모델과 안 맞아 노출 안 함(→ 재생기는 muxed previewUrl로 폴백).
 * @returns {{voiceUrl:string|null, musicUrl:string|null}}
 */
function audioTrackUrls(R) {
  const a = (R && R.audioAssets) || {};
  const segs = a.vo && Array.isArray(a.vo.segs) ? a.vo.segs : null;
  const voiceUrl = (segs && segs.length === 1 && segs[0].file && (segs[0].startMs || 0) === 0)
    ? `/images/${segs[0].file}` : null;
  const musicUrl = a.music && a.music.file ? `/images/${a.music.file}` : null;
  return { voiceUrl, musicUrl };
}

/**
 * 저장된 script + scene_clips → 프론트 편집용 씬 배열.
 * broll 씬만, 편집에 필요한 필드만(자막·내레이션·썸네일·길이). brollPrompt/direction은 노출하지 않음(No prompt 원칙).
 */
function editableScenes(script, sceneClips) {
  if (!script) return null;
  const s = typeof script === 'string' ? safeParse(script) : script;
  const clips = typeof sceneClips === 'string' ? safeParse(sceneClips) : (sceneClips || {});
  if (!s || !Array.isArray(s.scenes)) return null;
  return s.scenes.filter((sc) => sc.type === 'broll').map((sc) => {
    const cl = clips[sc.n] || clips[String(sc.n)] || {};
    return {
      n: sc.n,
      onScreenText: sc.onScreenText || '',
      spoken: sc.spoken || '',
      leadInMs: sc.leadInMs || 0, // 3a: 음성 시작 딜레이
      tailMs: sc.tailMs || 0,     // 3a: 음성 끝 여백
      summary: sc.summary || '', // 사람용 장면 설명(프롬프트 숨김)
      subject: sc.subject || 'product',
      durationSec: sc.durationSec || Math.round((cl.durationMs || 3000) / 1000),
      thumb: cl.thumb ? `/images/${cl.thumb}` : null,
      clipUrl: cl.clip ? (cl.remote ? cl.clip : `/images/${cl.clip}`) : null, // 씬 카드 자동재생용
      isStill: !!cl.isStill, // 정지이미지 클립(dryRun)이면 video 대신 썸네일
      hasClip: !!cl.clip,
      // 비파괴 재생성: 이 씬의 렌더된 버전들(썸네일+클립URL)+활성 인덱스 → 프론트 버전 선택기 + 클라이언트 즉시 전환(재생기가 클립만 스왑).
      versions: Array.isArray(cl.versions) ? cl.versions.map((v) => ({
        thumb: v.thumb ? `/images/${v.thumb}` : null, isStill: !!v.isStill,
        clipUrl: v.clip ? (v.remote ? v.clip : `/images/${v.clip}`) : null, // 클라이언트 시퀀서 버전 스왑용
        durationSec: Math.round((v.durationMs || 3000) / 1000),
      })) : [],
      activeVersion: typeof cl.v === 'number' ? cl.v : 0,
      // 원본 프롬프트는 프론트로 보내지 않음(No prompt engineering) — 수정은 자연어 지시로만
    };
  });
}
// script/scene_clips는 JSONB 컬럼 → pg가 조회 시 이미 JS 객체로 자동 파싱함. 객체면 그대로 반환
//   (문자열을 또 JSON.parse 하면 실패해 null → reRender가 "script unavailable" 400을 던지던 버그).
function safeParse(v) { if (v && typeof v === 'object') return v; try { return JSON.parse(v); } catch { return null; } }

// 공개 상세페이지(creation.html)용 씬 스토리보드.
//   editableScenes가 이미 brollPrompt/direction(렌더 레시피)을 제외하고, 여기서 다시 명시적 allowlist로만
//   추려 반환한다 — raw 씬 객체 spread 금지(향후 실수로 recipe/summary 등이 새는 것 방지).
//   ⚠️ 자막 기능은 첫 출시에서 제외 → 씬별 텍스트(onScreenText/spoken/summary) 미노출. 이미지(썸네일)+호버 재생(clipUrl)만.
//   컨셉은 script.hook 한 줄만 노출(전체 광고 컨셉). 씬 클립·썸네일은 공개 영상의 조각이라 이미 보임 → 새 유출 없음.
//   ⚠️ 접근제어 없음(공개/소유 필터 X) — 호출부가 result_idx를 반드시 선인가해야 함(현재 유일 호출부 generate.route 상세는
//      findDetailForViewer로 비공개/타인 결과를 404 처리한 뒤 호출). 다른 곳에서 게이트 없이 호출 금지.
async function sceneStoryboardForResult(resultIdx) {
  const r = await query(
    `SELECT script, scene_clips FROM ugc_jobs
      WHERE result_idx = $1 AND script IS NOT NULL
      ORDER BY (status = 'succeeded') DESC, created_at DESC LIMIT 1`, [resultIdx]);
  const job = r.rows[0];
  if (!job) return null;
  const full = editableScenes(job.script, job.scene_clips);
  if (!full || !full.length) return null;
  const scenes = full.map((sc) => ({
    n: Number(sc.n) || 0,                               // 숫자 강제(비정규 DB값의 프론트 미이스케이프 주입 차단)
    durationSec: Number(sc.durationSec) || 0,
    thumb: sc.thumb || null,                            // /images/<basename> 정지 포스터
    clipUrl: sc.isStill ? null : (sc.clipUrl || null),  // 호버 재생용 씬 클립(정지컷=null)
    isStill: !!sc.isStill,
  }));
  const s = safeParse(job.script);
  const hook = (s && typeof s.hook === 'string') ? s.hook : '';
  return { hook, sceneCount: scenes.length, scenes };
}

module.exports = { generateScript, render, submit, getJob, getJobByResultIdx, listActiveJobs, listPendingReview, listEditableResultIdxs, reapCrashedRenders, reRender, beginRerender, failRerender, commitJob, commitDraft, sweepStaleComposites, reapStaleProcessing, applySceneCaptionTimings, estimateCost, suggestConcept, persistSceneClips, editableScenes, applySceneEdits, sceneStoryboardForResult };
