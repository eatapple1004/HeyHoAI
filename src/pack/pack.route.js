/**
 * Product Pack — API 라우트.
 *   POST /api/pack                  업로드 + 생성 시작(즉시 202, 백그라운드 처리)
 *   GET  /api/pack/:id              팩 + 자산 조회(상태 폴링)
 *   POST /api/pack/:id/regenerate-cut  {cutKey}       같은 컨셉 재생성(새 버전)
 *   POST /api/pack/:id/rebake-ref      {sku?}         캐논 레퍼 재굽기(새 버전)
 *   POST /api/pack/:id/resume          {depth?}       중단된 팩 이어서 만들기(남은 컷부터)
 *   POST /api/pack/:id/extend          {count?}       이미 기획된 남은 컷 더 생성(플래너 0회)
 *   POST /api/pack/:id/more-like       {cutKey,count?} 이 컷과 같은 결로 형제 컷 N장(플래너 1회)
 *   POST /api/pack/:id/concept-more    {brief,count?}  자유 컨셉으로 새 방향 컷 N장(플래너 1회)
 *   POST /api/pack/:id/video                           팩 재료로 광고 영상 1편(Ad Video 엔진, 선택형·과금)
 *
 * 통합 시 index.js 1줄: app.use('/api/pack', requireAuth, require('./pack/pack.route'));
 */
const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const heicConvert = require('heic-convert');   // sharp가 못 푸는 HEIC(HEVC) 전용 디코더
const logger = require('../lib/logger');
const mediaStore = require('../storage/mediaStore');
const repo = require('./pack.repository');
const { runPack, sniffMime, toVisionImage } = require('./pack.service');
const { classifyProduct, planPack } = require('./planner.service');    // 확인 단계용 분류 + "이런 걸로 더" 재기획
const { bakeOne } = require('./refBake.service');            // 레퍼 재굽기
const { genStill, PACK_IMAGE_MODEL } = require('./stills.service');   // 컷 재생성·추가 (+ 카드 라벨용 실제 모델)
const { composeRow } = require('./compositor');              // 세트 합성(generate 단계)
const { suiteFor, STATE_COMPOSITES } = require('./suites');  // 컷 라이브러리(컨셉 추가) + refBake 스펙 + 상태 합성
const promptRepo = require('../generate/prompt.repository'); // 크리에이션 dual-write(내 크리에이션·라이브러리·공유 = generation_results→prompts)
const resultRepo = require('../generate/result.repository');
const ugcVideoService = require('../ugc/ugcVideo.service');   // 🎬 팩 재료로 광고 영상 1편(Ad Video 엔진 재사용)
const teamCredit = require('../teams/team.credit');         // 활성 팀 — prompt.team_id에 붙여야 팀 유저 피드에 뜸 + 생성비 차감(chargeGeneration/refundGeneration)
const creditService = require('../credits/credit.service');  // 단가표(imageCost) — 팩 스틸 = pro·template
const { refBakeFree, refPeriodStart } = require('../lib/entitlements');   // 팩 미리보기 굽기 한도(주기당 총량)

const router = Router();

// 크리에이션 카드 모델 라벨(스틸·합성·레퍼 모두 nano-banana 계열).
//   실제 쓰는 모델에서 파생 — 하드코딩하면 pro로 올려놓고 카드는 계속 flash라고 말한다.
const PACK_MODEL = /pro/i.test(PACK_IMAGE_MODEL) ? 'Nano Banana Pro' : 'Nano Banana';

// 🚫 합성(상태 비교·세트 로우)은 만들지 않는다 — 중앙 슬라이스 방식이 넓적한 제품(봉투·박스)에서 잘려
//   못 쓰는 컷이 나왔고(사용자 결정), 스틸만으로 충분하다. 되살리려면 PACK_COMPOSITES=1 + restart.
const PACK_COMPOSITES = process.env.PACK_COMPOSITES === '1';

// ─── 과금(2026-07-27) — Shots(generate.route)와 **동일 패턴**: 라우트에서 동기 차감(부족=402·viewer=403 즉시 응답),
//   백그라운드 생성 후 실패·미생성분 환불. 팩은 2K·자동기획(유저 프롬프트 없음) → pro·template.
//   💸 레퍼(캐논 베이크·rebake-ref)는 딜리버리가 아니라 내부 부품(피드에도 안 올림)이라 무과금 — 스틸 단가가 원가를 흡수.
//   ⚠️ imageCost(count)는 count를 ≤8로 클램프(studio 배치캡용)라 팩(12·풀 20+)엔 못 쓴다 → 단가만 받고 곱셈은 바깥에서.
const STILL_UNIT = creditService.imageCost('pro', 1, true);   // = IMG_CREDIT['pro'][1](template) 300/장. 변경 시 pack.html PACK_CUT_CR 동기화.

/** 스틸 n장 동기 차감. 부족(402)·viewer(403)는 statusCode 에러로 던짐(라우트가 상태코드로 응답). admin·개인면제·n≤0 → null. */
async function chargeStills(user, n, description, refId) {
  if (!user || !(n > 0)) return null;
  return teamCredit.chargeGeneration(user, STILL_UNIT * n, description, refId);
}

// ─── 팩 미리보기(캐논 레퍼) 정산 (2026-08-03) ─────────────────────────────────
//   규칙 하나: 굽기(새로 굽기 + 재굽기 **합산**)가 주기당 refBakeFree 회까지 무료, 초과분 ◈200.
//   위 48행 "레퍼는 무과금" 주석은 이제 **무료 구간에 한해** 참이다. 기능을 자르는 곳은 없다.
//   ⚠️ ◈100이 아니라 ◈200인 이유: 상위 티어는 컷당 마진이 낮아(볼륨 할인) ◈100의 마진($0.085)이
//      굽기 원가($0.149)에 못 미쳤다. Elite 손익분기 ◈175 위로 잡아야 전 티어가 안전하다.
const REF_UNIT = 200;

/** 화면이 비용·잔여를 말하기 위한 값. 확인 모달(팩 생성 전)과 게이트(생성 후) 둘 다 쓴다. */
async function refInfo(userId) {
  if (!userId) return null;
  const u = await repo.getUserPlanFields(userId);
  const user = { id: userId, ...u };
  const used = await repo.countBakesSince(userId, refPeriodStart(user));
  return { unit: REF_UNIT, used, free: refBakeFree(user) };
}

/**
 * 굽기 1회 — 주기 무료분을 넘었으면 ◈200 차감.
 * 402·403은 던진다(동기 경로인 재굽기가 상태코드로 응답). 그 외 실패는 로그만 —
 * 이미 구운 이미지를 ◈200 때문에 버리는 건 과하다.
 */
async function chargeRefBake(userId, packId, why) {
  if (!userId) return null;
  const u = await repo.getUserPlanFields(userId);
  const user = { id: userId, ...u };
  const used = await repo.countBakesSince(userId, refPeriodStart(user));
  if (used <= refBakeFree(user)) return null;      // 방금 넣은 행 포함이라 <= 로 비교
  try {
    return await teamCredit.chargeGeneration(user, REF_UNIT, why, packId);
  } catch (e) {
    if (e.statusCode) throw e;
    logger.warn?.(`[pack ${packId}] ref charge skipped: ${e.message}`);
    return null;
  }
}

/** 과금분 중 실제 생성 안 된 만큼 환불(부분·전량 공통). expected=청구 장수, ok=성공 장수. finally에서 호출. */
async function settleRefund(charge, user, expected, ok, refId) {
  if (!charge) return;
  const refundN = Math.max(0, expected - ok);
  if (refundN <= 0) return;
  try {
    if (refundN >= expected) await charge.refund();   // 전량 실패 = 전액
    else await teamCredit.refundGeneration(user, STILL_UNIT * refundN, `팩 부분 실패 환불 (${refundN}장)`, refId);
  } catch (_) {}
}

/** 이번 요청에서 실제 생성할 스틸 수(과금 대상) — depth 창 안에서 아직 안 만든 컷(generatePack 루프와 동일 규칙). */
function stillsToGenerate(pack, depth) {
  const cuts = ((pack.config && pack.config.plan) || {}).cuts || [];
  const limit = (depth && depth > 0) ? Math.min(depth, cuts.length) : cuts.length;
  const done = new Set((pack.assets || []).filter((a) => a.kind === 'still' && a.url).map((a) => a.cut_key));
  return cuts.slice(0, limit).filter((c) => !done.has(c.key)).length;
}

// 🧟 부팅 회수 — 프로세스가 죽으면 진행 중이던 팩(setImmediate 백그라운드)도 함께 사라지는데
//   DB엔 'processing'이 남아 화면이 영원히 스피너였다. 뜰 때 한 번 훑어 내린다.
//   (활동 창은 failStale이 지킨다 → 같은 DB를 보는 다른 프로세스의 진행 중 팩은 안 건드린다.)
//   DB 준비 여유를 두고 1회. 실패해도 조회 경로(GET)가 같은 규칙으로 늦게라도 회수한다.
setTimeout(() => {
  repo.failStale()
    .then((ids) => { if (ids.length) logger.warn?.(`[pack] 중단된 팩 ${ids.length}개 회수(failed): ${ids.join(',')}`); })
    .catch((e) => logger.warn?.(`[pack] 부팅 회수 실패(무시): ${e.message}`));
}, 20000).unref?.();

const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const imagesDir = path.join(process.cwd(), 'tmp', 'images'); // 생성물 = /images 프록시(로컬우선→R2) 서빙 — generate.route와 동일 규약
fs.mkdirSync(imagesDir, { recursive: true });
const upload = multer({ storage: multer.diskStorage({ destination: uploadDir }), limits: { fileSize: 12 * 1024 * 1024 } });

// ─── 업로드 진입점 정규화 ────────────────────────────────────────────────
// 🔑 형식 문제는 **받는 자리에서 한 번만** 처리한다. 그 뒤로는 아무도 원본 형식을 몰라도 되게.
//   예전엔 경로마다 각자 해석했다 — 분류는 브라우저가 준 mimetype, 플래너는 매직바이트,
//   provider는 파일 확장자. 그래서 아이폰 HEIC 한 장에 네 군데가 따로 터졌다:
//     분류=Anthropic 거부 · 원본저장=sharp 실패 · 플래너=400 후 6컷 폴백 · 레퍼=HEIC를 png라고 전송.
//   ⚠️ sharp는 HEIC 메타데이터는 읽지만 **픽셀은 못 푼다**(프리빌트에 HEVC 디코더 없음 — 특허 라이선스).
//     그래서 "지원되는 것처럼" 보이다가 변환에서 죽는다. heic-convert(WASM 디코더)로 따로 푼다.
const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1', 'avif', 'avis']);
function isHeif(buf) {
  return !!buf && buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp'
    && HEIF_BRANDS.has(buf.toString('ascii', 8, 12).toLowerCase());
}

async function normalizeUploads(req, res, next) {
  const files = req.files || [];
  const rejected = [];
  for (const f of files) {
    try {
      let buf = fs.readFileSync(f.path);
      let mime = sniffMime(buf);
      if (!mime && isHeif(buf)) {
        const jpeg = await heicConvert({ buffer: buf, format: 'JPEG', quality: 0.92 });
        buf = await sharp(jpeg).rotate().jpeg({ quality: 92, mozjpeg: true }).toBuffer();  // 회전 정리 + 용량 절감
        fs.writeFileSync(f.path, buf);
        f.size = buf.length;
        mime = 'image/jpeg';
        logger.info?.(`[pack] HEIC → JPEG 변환: ${f.originalname || f.filename} (${Math.round(buf.length / 1024)}KB)`);
      }
      if (!mime) { rejected.push(f.originalname || '파일'); continue; }
      f.mimetype = mime;   // 🔑 브라우저가 말한 것 말고 **실제 바이트**로 교정(분류 경로가 이걸 그대로 쓴다)
    } catch (e) {
      logger.warn?.(`[pack] 업로드 정규화 실패(${f.originalname}): ${e.message}`);
      rejected.push(f.originalname || '파일');
    }
  }
  // 🔴 못 읽는 파일은 **거절한다**. 예전처럼 "그래도 jpeg라고 우기며 보내기"는 실패를 숨길 뿐이었다
  //   (판매자 눈엔 원인 모를 6컷 폴백으로 보였다). 한 장이라도 못 읽으면 조용히 빼지 않고 알린다 —
  //   그 사진을 고른 이유가 있다(상태별 사진 등).
  if (rejected.length) {
    files.forEach((f) => { try { fs.unlinkSync(f.path); } catch (_) {} });
    return res.status(400).json({ error: `읽을 수 없는 이미지예요: ${rejected.join(', ')} — JPG·PNG·WEBP·HEIC 로 올려주세요.` });
  }
  next();
}

/** /images/<name> URL → 로컬 파일 경로(재생성이 캐논 레퍼를 참조로 읽을 때). */
function localPathForUrl(url) { return path.join(imagesDir, String(url || '').split('/').pop()); }

/**
 * 이 팩의 원본 사진 URL — 크리에이션 카드의 "무엇으로 만들었는지" 썸네일.
 *
 * 🔑 studio 카드는 이 썸네일을 `characters.reference_image_url` 조인으로 받는다. 그런데 팩 결과는
 *   character_id 가 없어서(캐릭터를 안 쓴다) 그 조인이 항상 NULL → **팩만 썸네일이 비어 있었다.**
 *   프론트가 `metadata.product_image` 를 폴백으로 이미 읽으므로, 거기에 직접 실어주면 된다
 *   (API·프론트 수정 0 — studio 피드와 같은 자리에 같은 모양으로 뜬다).
 * pack_assets(kind='source') 우선, 없으면 config.sourceRef.
 */
function packSourceUrl(pack) {
  const a = (pack.assets || []).find((x) => x.kind === 'source' && x.url);
  if (a) return a.url;
  const ref = (pack.config && pack.config.sourceRef) || '';   // 'tmp/images/<name>'
  return ref ? `/images/${String(ref).split('/').pop()}` : null;
}

/** 이 팩에 올라온 원본 사진 **전부**(source_0, source_1…). 유저가 여러 각도를 넣으면 카드에 다 보여준다.
 *  🔑 예전엔 첫 장(packSourceUrl)만 실어 "여러 개 넣었는데 하나만 보임" 버그. cut_key(source_N) 순으로 정렬. */
function packSourceUrls(pack) {
  const srcs = (pack.assets || []).filter((x) => x.kind === 'source' && x.url)
    .sort((a, b) => String(a.cut_key || '').localeCompare(String(b.cut_key || ''), undefined, { numeric: true }))
    .map((x) => x.url);
  if (srcs.length) return srcs;
  const one = packSourceUrl(pack);
  return one ? [one] : [];
}

/** 팩의 prompt_idx 확보(크리에이션 dual-write 그룹핑 — 재생성분도 같은 배치에 묶이게). config에 캐시·영속. */
async function ensurePackPrompt(pack, userId) {
  pack.config = pack.config || {};
  if (pack.config.prompt_idx != null) return pack.config.prompt_idx;
  if (userId == null) return null;
  try {
    const teamId = await teamCredit.activeTeamId(userId).catch(() => null);
    // referenceImagePath = 유저 업로드 원본(첫 장). before/after(원본→결과)로 나열·제안서에 쓰이도록 연결.
    const p = await promptRepo.insert({ userId, teamId, promptText: (pack.product || '콘텐츠 팩'), model: PACK_MODEL, tags: ['pack'], referenceImagePath: pack.config.sourceRef || null });
    pack.config.prompt_idx = p.idx;
    await repo.setPromptIdx(pack.id, p.idx);
    return p.idx;
  } catch (e) { logger.warn?.(`[pack ${pack.id}] prompt insert failed: ${e.message}`); return null; }
}

/** 업로드 원본을 영속 저장(tmp/images + R2) + pack_assets(kind='source'). 크리에이션 피드엔 안 올림.
 *  반환 = prompts.reference_image_path에 넣을 'tmp/images/<name>' 경로(서빙 = /images/<name>). */
async function recordSource(pack, absPath, i) {
  const name = `pack_${pack.share_id}_source_${i}_${Date.now()}.jpg`;
  const buf = await sharp(fs.readFileSync(absPath)).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  fs.writeFileSync(path.join(imagesDir, name), buf);   // 로컬 서빙
  await mediaStore.put(name, buf).catch(() => {});     // 영속(R2) best-effort
  await repo.addAsset({ packId: pack.id, kind: 'source', cutKey: `source_${i}`, label: '원본', url: `/images/${name}` });
  return { durable: `tmp/images/${name}`, url: `/images/${name}` };
}

/** 이 팩 원본 사진 서빙 URL 전부 — assets(재조회 경로) 우선, 없으면 config(prepPack 인메모리). */
function packSourceUrlsFrom(pack) {
  const fromAssets = packSourceUrls(pack);
  if (fromAssets.length) return fromAssets;
  const cfg = pack.config || {};
  if (Array.isArray(cfg.sourceRefs) && cfg.sourceRefs.length) return cfg.sourceRefs.map((r) => `/images/${String(r).split('/').pop()}`);
  return cfg.sourceRef ? [`/images/${String(cfg.sourceRef).split('/').pop()}`] : [];
}

/** 이 팩 캐논 레퍼 URL 전부 — 상태/변형(cut_key)별 **최신 1장씩**(재굽기 버전은 최신만). 크리에이션 카드에 "생성 기준"으로 붙인다. */
function packRefUrls(pack) {
  const latest = {};   // cut_key → url (id ASC 라 뒤가 최신)
  (pack.assets || []).filter((a) => a.kind === 'ref' && a.url).forEach((a) => { latest[a.cut_key || 'ref_main'] = a.url; });
  return Object.values(latest);
}

/** 자산 하나 적재: tmp/images 발행(+R2) + pack_assets(새 행=버전) + generation_results dual-write. 반환 {kind,cut_key,label,url}. */
async function recordAsset(pack, { kind, key, label, absPath, buffer, userId, skipRefCharge }) {
  const name = `pack_${pack.share_id}_${kind}_${key}_${Date.now()}.jpg`; // 버전마다 별 파일(재생성=비파괴)
  const buf = buffer || fs.readFileSync(absPath);
  fs.writeFileSync(path.join(imagesDir, name), buf);      // 로컬 우선 서빙
  await mediaStore.put(name, buf).catch(() => {});        // 영속(R2) best-effort
  const url = `/images/${name}`;
  await repo.addAsset({ packId: pack.id, kind, cutKey: key, label, url });
  // 굽기 1회 = 초기든 재굽기든 동일. 재굽기는 라우트에서 선차감하므로 skipRefCharge로 건너뛴다.
  if (kind === 'ref' && userId && !skipRefCharge) {
    await chargeRefBake(userId, pack.id, '미리보기 만들기(무료 횟수 초과)').catch(() => {});
  }
  // 🚫 캐논 레퍼·합성은 크리에이션 피드(generation_results)에 **독립 항목으로 안 넣는다** — 딜리버리가 아니라 부품이라
  //   피드 개수를 부풀리고 딜리버리처럼 보였다. 대신 스틸 카드 옆에 "생성 기준"으로 딸려 보인다(canonical_refs).
  //   pack_assets 에는 그대로 남으니 pack 결과 페이지 "캐논 레퍼" 섹션·제안서 before/after(pack_assets 직접 조회)는 무영향.
  if (kind === 'ref' || kind === 'composite') return { kind, cut_key: key, label, url };
  try {
    const idx = await ensurePackPrompt(pack, userId);
    if (idx != null) {
      // product_image(s) = 유저가 올린 원본 사진. studio 는 characters 조인으로 받지만 팩은 캐릭터가 없어
      //   그 자리가 늘 비었다 → 직접 실어준다(프론트가 metadata 폴백을 읽는다).
      //   🔑 여러 각도를 넣으면 전부(product_images) — 예전엔 첫 장만 실어 "하나만 보임" 버그.
      const srcUrls = packSourceUrlsFrom(pack);
      const refUrls = packRefUrls(pack);   // 🏷 캐논 레퍼 전부 — 카드에 "생성 기준"으로 나란히
      await resultRepo.insert({
        promptIdx: idx, filePath: `tmp/images/${name}`, model: PACK_MODEL,  // 피드가 basename → /images/<name> 서빙
        metadata: { source: 'pack', kind, cut_key: key, cut: label || null, pack_share_id: pack.share_id, batch_id: pack.share_id,
          ...(srcUrls[0] ? { product_image: srcUrls[0], product_images: srcUrls } : {}),
          ...(refUrls.length ? { canonical_refs: refUrls } : {}) },
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
async function prepPack(pack, { sourcePaths, vertical, product, skus, states, unit, lenses, category, userId }) {
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
  // 업로드 원본을 영속 저장(R2·서빙) + 첫 장을 prompt.reference_image_path로 연결(before/after·제안서용).
  try {
    const sourceRefs = [];   // 🔑 원본 서빙 URL **전부**(여러 각도 넣으면 카드에 다 보이게)
    for (let i = 0; i < durableSources.length; i++) {
      const ref = await recordSource(pack, durableSources[i], i);
      if (i === 0) pack.config.sourceRef = ref.durable; // 인메모리 — 같은 prepPack 실행 중 ensurePackPrompt가 읽어 prompt에 연결
      sourceRefs.push(ref.url);
    }
    pack.config.sourceRefs = sourceRefs;   // 인메모리(recordAsset이 프리p 중 dual-write할 때 읽음)
    // 🔑 DB에도 남긴다 — 재생성·컨셉추가·재개는 **별도 요청**이라 인메모리 값이 없다.
    //   그 경로들도 크리에이션 카드에 원본 썸네일을 붙이려면 여기 저장된 걸 읽어야 한다.
    if (pack.config.sourceRef) await repo.mergeConfig(pack.id, { sourceRef: pack.config.sourceRef, sourceRefs });
  } catch (e) { logger.warn?.(`[pack ${pack.id}] source persist failed: ${e.message}`); }
  try {
    await runPack({
      // states[].photoIndex 는 업로드 순서 기준 — durableSources가 같은 순서로 복사되므로 그대로 유효하다.
      sourcePaths: durableSources, vertical, product, skus, states, unit, lenses, category, workDir, stopAfter: 'ref',
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
async function generatePack(pack, { depth, userId, charge = null, user = null, expected = 0 }) {
  let ok = 0;   // 실제 생성 성공 스틸 수 — finally 환불 정산에 사용
  try {
    const fresh = await repo.getPack({ id: pack.id });
    fresh.config = fresh.config || {};
    const plan = fresh.config.plan || {};
    const cuts = plan.cuts || [];
    if (!latestRefPath(fresh)) throw new Error('캐논 레퍼 없음');
    const ctx = { product: plan.product || fresh.product || '' };
    // depth는 앞에서 N개를 자른다 — plan.cuts가 상태별 인터리브로 저장돼 있어 부분 생성도 모든 상태를 커버한다.
    const limit = (depth && depth > 0) ? Math.min(depth, cuts.length) : cuts.length; // 0=전부
    // 🧟 이미 만든 컷은 건너뛴다 → "이어서 만들기"가 남은 컷부터 재개한다(다시 굽지 않으니 크레딧도 안 태움).
    //   최초 생성에선 자산이 없어 no-op — 경로를 하나로 유지한다.
    const doneCuts = new Set((fresh.assets || []).filter((a) => a.kind === 'still' && a.url).map((a) => a.cut_key));
    for (const c of cuts.slice(0, limit)) {
      if (doneCuts.has(c.key)) continue;
      try {
        const cut = { key: c.key, label: c.label, w: c.w, h: c.h, neg: c.neg, prompt: c.promptText || c.label, refSku: c.refSku || null };
        // 🔑 그 컷에 배정된 레퍼로 생성(상태든 변형이든).
        //   예전엔 전부 최신 레퍼 1장만 써서, 레퍼를 N장 구워놓고도 스틸은 임의의 한 종만 나왔다.
        // 🏷 파생 상태(브랜드 안 보임) 컷은 포장 레퍼를 함께 참조 → 라벨이 프레임에 들어간다.
        const derived = (plan.states || []).some((s) => s.key === c.refSku && s.derived);
        const brandRefPath = (derived && plan.brandSku) ? latestRefPathFor(fresh, plan.brandSku) : null;
        const buf = await genStill({ canonRefPath: latestRefPathFor(fresh, c.refSku), brandRefPath, cut, ctx });
        await recordAsset(fresh, { kind: 'still', key: c.key, label: c.label, buffer: buf, userId });
        ok++;
      } catch (e) { logger.warn?.(`[pack ${fresh.id}] still ${c.key} 실패: ${e.message}`); }
    }
    // 레퍼 2장 이상이면 합성 — 상태 모드면 "상태 비교 · 나란히", 세트면 "세트 · 로우". (기본 OFF)
    const refPaths = composeRefPaths(fresh);
    const stateMode = (plan.states || []).length > 1;
    if (PACK_COMPOSITES && refPaths.length > 1) {
      const doneComps = new Set((fresh.assets || []).filter((a) => a.kind === 'composite' && a.url).map((a) => a.cut_key));
      for (const comp of (stateMode ? STATE_COMPOSITES : (suiteFor(fresh.vertical).composites || []))) {
        if (doneComps.has(comp.key)) continue;   // 재개 시 중복 합성 방지
        try { const buf = comp.method === 'row' ? await composeRow(refPaths) : null; if (buf) await recordAsset(fresh, { kind: 'composite', key: comp.key, label: comp.label, buffer: buf, userId }); }
        catch (e) { logger.warn?.(`[pack ${fresh.id}] composite ${comp.key} 실패: ${e.message}`); }
      }
    }
    await repo.setStatus(fresh.id, 'done');
  } catch (e) {
    logger.error?.(`[pack ${pack.id}] generate failed: ${e.message}`);
    await repo.setStatus(pack.id, 'failed', e.message);
  } finally {
    await settleRefund(charge, user, expected, ok, pack.id);   // 미생성·실패분 환불(성공분만 과금 유지)
  }
}

/** 씨앗 컷의 소스 사진 — 상태 컷이면 그 상태를 찍은 사진, 아니면 전체 소스(재굽기와 같은 규칙). */
function sourcesForSeed(plan, refSku) {
  const st = (plan.states || []).find((s) => s.key === refSku);
  const paths = (st ? (st.sources || []) : (plan.sources || [])).filter((p) => fs.existsSync(p));
  return paths.length ? paths : (plan.sources || []).filter((p) => fs.existsSync(p));
}

/**
 * 팩에 새 컷 N장을 **재기획 후 즉시 생성**해 붙인다(백그라운드). 세 방향을 한 몸으로 처리:
 *
 *   ✦ 씨앗(seedCutKey) — "이 컷처럼 더". 씨앗의 렌즈·프롬프트·상태를 물려 같은 결/다른 구도.
 *   💡 컨셉(brief)     — "다른 컨셉으로 더". 자유 브리프가 기획을 주도(briefClause), 대표(브랜드) 레퍼로.
 *   🧠 자동(둘 다 없음) — "알아서 더". 여태 안 나온 **새 컨셉을 스스로 창안**(autoConcept). 잔여물 긁기 아님.
 *
 * 공통: exclude=기존 라벨 전부(복제 방지) · 확정 category 그라운딩(오분류 방지) · 새 컷을 config.plan에
 *   append(이후 "다시"·"더 뽑기"가 인식) · 2K·원본썸네일은 recordAsset 공통경로라 자동. 완료 후 done.
 */
async function growPack(pack, { seedCutKey, brief, count, userId, charge = null, user = null, expected = 0 }) {
  const briefText = String(brief || '').trim();
  const mode = seedCutKey ? 'more-like' : (briefText ? 'concept-more' : 'auto-concept');
  let ok = 0;   // 실제 생성 성공 컷 수 — finally 환불 정산에 사용
  try {
    const fresh = await repo.getPack({ id: pack.id });
    const plan = (fresh.config && fresh.config.plan) || {};
    const cuts = plan.cuts || [];

    // 방향에 따라 (씨앗·렌즈·힌트·참조 상태·자동)를 정한다.
    let seed = null, lens = null, hint = fresh.product || '', refSku = null, seedLensIdx = null, autoConcept = false;
    if (seedCutKey) {
      const s = cuts.find((c) => c.key === seedCutKey);
      if (!s) throw new Error('씨앗 컷을 찾을 수 없어요');
      seed = { label: s.label, prompt: s.promptText || s.prompt };
      lens = (plan.lenses || [])[s.lensIdx != null ? s.lensIdx : -1] || null;
      refSku = s.refSku || null;
      seedLensIdx = s.lensIdx != null ? s.lensIdx : null;
    } else {
      // 컨셉/자동 둘 다 새 방향이라 특정 상태에 안 묶는다 → 브랜드가 보이는 대표 레퍼로(포장이 프레임에 들어와야 상품이 산다).
      refSku = plan.brandSku || (plan.refSkus && plan.refSkus[0] && plan.refSkus[0].sku) || null;
      if (briefText) hint = briefText;          // 컨셉: 브리프가 기획 주도
      else { hint = ''; autoConcept = true; }    // 자동: 플래너가 새 컨셉 창안
    }
    const refPath = latestRefPathFor(fresh, refSku);
    if (!refPath) throw new Error('캐논 레퍼가 없어요');
    // 소스 사진: 씨앗이면 그 상태 사진, 컨셉/자동이면 전체(제품을 넓게 이해해야 새 방향이 산다).
    const srcPaths = seedCutKey ? sourcesForSeed(plan, refSku) : (plan.sources || []).filter((p) => fs.existsSync(p));
    if (!srcPaths.length) throw new Error('소스 사진이 없어 더 못 만들어요(이 팩은 원본 저장 전 버전)');

    const want = Math.max(2, Math.min(4, count || 3));
    const images = await Promise.all(srcPaths.map(toVisionImage));
    const category = (fresh.config && fresh.config.category) || fresh.vertical || null;  // 확정 category 그라운딩
    const planned = await planPack({ images, hint, category, product: plan.product, want, lens, exclude: cuts.map((c) => c.label), seed, autoConcept });

    const ctx = { product: plan.product || fresh.product || '' };
    const derived = (plan.states || []).some((s) => s.key === refSku && s.derived);
    const brandRefPath = (derived && plan.brandSku) ? latestRefPathFor(fresh, plan.brandSku) : null;
    // 키 충돌 방지 — 새 컷이 기존 컷·자산과 key가 겹치면 카드가 덮인다.
    const taken = new Set(cuts.map((c) => c.key).concat((fresh.assets || []).filter((a) => a.kind === 'still').map((a) => a.cut_key)));
    const newPlanCuts = [];
    for (const c of (planned.cuts || [])) {
      let key = c.key || 'more'; let i = 1;
      while (taken.has(key)) key = `${c.key || 'more'}_m${i++}`;
      taken.add(key);
      const cut = { key, label: c.label, w: c.w, h: c.h, neg: c.neg, prompt: c.promptText || c.label, refSku };
      try {
        const buf = await genStill({ canonRefPath: refPath, brandRefPath, cut, ctx });
        await recordAsset(fresh, { kind: 'still', key, label: cut.label, buffer: buf, userId });
        ok++;
        // 컨셉 컷은 렌즈가 없다(브리프가 축) → lensIdx=null. 씨앗 컷은 씨앗의 렌즈를 물린다.
        newPlanCuts.push({ key, label: cut.label, w: cut.w, h: cut.h, neg: cut.neg, aspect: c.aspect || null, refSku, lensIdx: seedLensIdx, promptText: cut.prompt });
      } catch (e) { logger.warn?.(`[pack ${fresh.id}] ${mode} ${key} 실패: ${e.message}`); }
    }
    if (!newPlanCuts.length) throw new Error('생성에 실패했어요 — 크레딧·한도를 확인해 주세요');
    const cur = await repo.getPack({ id: pack.id });
    const cplan = (cur.config && cur.config.plan) || {};
    cplan.cuts = (cplan.cuts || []).concat(newPlanCuts);
    cplan.slots = (cplan.slots || []).concat(newPlanCuts.map((c) => ({ kind: 'still', key: c.key, label: c.label })));
    await repo.setPlan(pack.id, cplan);
    await repo.setStatus(pack.id, 'done');
  } catch (e) {
    logger.error?.(`[pack ${pack.id}] ${mode} failed: ${e.message}`);
    await repo.setStatus(pack.id, 'failed', e.message);
  } finally {
    await settleRefund(charge, user, expected, ok, pack.id);   // 계획부족·실패분 환불(성공분만 과금 유지)
  }
}

/** 확인 단계 — 사진+힌트로 카테고리·제품 감지(가벼움). 프론트가 "이거 맞아요?" 확인받고 POST /로 확정 생성. */
router.post('/classify', upload.array('photos', 10), normalizeUploads, async (req, res, next) => {
  try {
    if (!req.files || !req.files.length) return res.status(400).json({ error: '사진을 업로드하세요' });
    const hint = (req.body.product || '').slice(0, 600); // 컨셉 브리프(여러 줄) 수용
    const images = req.files.map((f) => ({ data: fs.readFileSync(f.path).toString('base64'), mediaType: f.mimetype || 'image/jpeg' }));
    const result = await classifyProduct({ images, hint });
    req.files.forEach((f) => { try { fs.unlinkSync(f.path); } catch (_) {} }); // 분류용 임시 업로드 정리(생성은 별도 POST에서 재업로드)
    // 확인 모달이 비용·잔여를 말하려면 **팩이 생기기 전에** 알아야 한다 → 여기 실어 보낸다(추가 왕복 없음).
    res.json({ ...result, ref: await refInfo(req.user && req.user.id) });
  } catch (e) { next(e); }
});

router.post('/', upload.array('photos', 10), normalizeUploads, async (req, res, next) => {
  try {
    if (!req.files || !req.files.length) return res.status(400).json({ error: '사진을 업로드하세요' });
    const vertical = req.body.vertical || 'beverage';
    const product = (req.body.product || '').slice(0, 600); // 컨셉 브리프(여러 줄) = 기획 주도
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
    // 🟣 렌즈 — classify가 제품 보고 뽑은 촬영 축(유효순). 없으면 runPack이 범용 폴백을 쓴다.
    let lenses = null;
    try { lenses = req.body.lenses ? JSON.parse(req.body.lenses) : null; } catch (_) { lenses = null; }
    if (Array.isArray(lenses)) lenses = lenses.filter((l) => l && l.key && l.brief).slice(0, 12);

    const pack = await repo.createPack({
      userId: req.user && req.user.id, vertical, product, config: { skus, states, unit, lenses, category, photoCount: req.files.length },
    });
    res.status(202).json({ id: pack.id, shareId: pack.share_id, status: 'processing' });

    setImmediate(() => prepPack(pack, {
      sourcePaths: req.files.map((f) => f.path), vertical, product, skus, states, unit, lenses, category, userId: req.user && req.user.id,
    }));
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const key = String(req.params.id);
    const byId = /^\d+$/.test(key);
    const pack = await repo.getPack(byId ? { id: Number(key) } : { shareId: key });
    if (!pack) return res.status(404).json({ error: 'not found' });
    // 🧟 폴링이 곧 회수 기회다 — 부팅 회수 이후에 죽은 팩도 여기서 걸린다(부팅 sweep만으론 늦다).
    //   전체 sweep이 아니라 **이 행 하나**만 손본다(폴링마다 전역 UPDATE를 돌리면 안 된다).
    if (repo.isStale(pack)) {
      await repo.setStatus(pack.id, 'failed', repo.STALE_ERROR);
      pack.status = 'failed'; pack.error = repo.STALE_ERROR;
      logger.warn?.(`[pack ${pack.id}] 활동 없음 ${repo.STALE_MIN}분 → failed 로 회수`);
    }
    pack.ref = await refInfo(req.user && req.user.id);   // 게이트가 굽기 비용·잔여를 말하려면 필요
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
    const expected = stillsToGenerate(pack, depth);
    let charge;
    try { charge = await chargeStills(req.user, expected, `팩 컷 생성 (${expected}장)`, pack.id); }
    catch (e) { if (e.statusCode) return res.status(e.statusCode).json({ error: e.message }); throw e; }   // 402 부족·403 viewer
    await repo.mergeConfig(pack.id, { depth });   // 중단 후 "이어서 만들기"가 같은 깊이로 재개하도록 남긴다
    await repo.setStatus(pack.id, 'processing');
    res.json({ ok: true });
    setImmediate(() => generatePack(pack, { depth, userId: req.user && req.user.id, charge, user: req.user, expected }));
  } catch (e) { next(e); }
});

/**
 * 🧟 이어서 만들기 — 중단된 팩(서버 재시작·크래시·hang)에서 **남은 컷부터** 재개.
 *   generatePack이 이미 있는 컷을 건너뛰므로 여기선 다시 태우기만 하면 된다.
 *   ⚠️ 커버 범위 = **스틸 단계**(계획+캐논 레퍼가 이미 있는 팩). 레퍼 굽기 전에 죽은 팩은
 *      플래너부터 다시 돌아야 해서 재개 대상이 아니다 → 처음부터 만들도록 안내한다.
 */
router.post('/:id/resume', async (req, res, next) => {
  try {
    const pack = await repo.getPack({ id: Number(req.params.id) });
    if (!pack) return res.status(404).json({ error: 'not found' });
    if (pack.status === 'done') return res.status(409).json({ error: '이미 완료된 팩이에요' });
    if (pack.status === 'ref_ready') return res.status(409).json({ error: '아직 게이트 대기예요(깊이를 고르고 생성하세요)' });
    if (pack.status === 'processing' && !repo.isStale(pack)) return res.status(409).json({ error: '아직 생성 중이에요' });
    const plan = (pack.config && pack.config.plan) || {};
    if (!(plan.cuts || []).length) return res.status(409).json({ error: '계획이 없어 재개할 수 없어요(처음부터 다시 만들어 주세요)' });
    if (!latestRefPath(pack)) return res.status(409).json({ error: '캐논 레퍼가 없어 재개할 수 없어요(처음부터 다시 만들어 주세요)' });
    // 깊이 = 요청 > 게이트에서 고른 값 > 전부. 재개인데 깊이가 줄면 남은 컷이 영영 안 나온다.
    const depth = Math.max(0, parseInt((req.body && req.body.depth) || (pack.config && pack.config.depth) || 0, 10) || 0);
    const expected = stillsToGenerate(pack, depth);
    let charge;
    try { charge = await chargeStills(req.user, expected, `팩 이어서 생성 (${expected}장)`, pack.id); }
    catch (e) { if (e.statusCode) return res.status(e.statusCode).json({ error: e.message }); throw e; }
    await repo.setStatus(pack.id, 'processing');
    res.json({ ok: true, depth });
    setImmediate(() => generatePack(pack, { depth, userId: req.user && req.user.id, charge, user: req.user, expected }));
  } catch (e) { next(e); }
});

/**
 * ➕ 더 뽑기 — **이미 기획된** 남은 컷을 생성한다(플래너 재호출 0). 게이트 depth로 일부만 만든 뒤
 *   "역시 더"일 때, 기획·지불은 이미 끝난 컷을 꺼낸다. generatePack이 이미 만든 컷을 건너뛴다.
 *   count 미지정이면 남은 전부. done/failed/유휴 상태에서 동작(생성 중이면 409).
 */
router.post('/:id/extend', async (req, res, next) => {
  try {
    const pack = await repo.getPack({ id: Number(req.params.id) });
    if (!pack) return res.status(404).json({ error: 'not found' });
    if (pack.status === 'ref_ready') return res.status(409).json({ error: '아직 게이트 대기예요(깊이를 고르고 생성하세요)' });
    if (pack.status === 'processing' && !repo.isStale(pack)) return res.status(409).json({ error: '아직 생성 중이에요' });
    const plan = (pack.config && pack.config.plan) || {};
    const cuts = plan.cuts || [];
    if (!cuts.length) return res.status(409).json({ error: '계획이 없어요(처음부터 다시 만들어 주세요)' });
    if (!latestRefPath(pack)) return res.status(409).json({ error: '캐논 레퍼가 없어요(처음부터 다시 만들어 주세요)' });
    const made = new Set((pack.assets || []).filter((a) => a.kind === 'still' && a.url).map((a) => a.cut_key));
    const remaining = cuts.filter((c) => !made.has(c.key)).length;
    if (remaining <= 0) return res.status(409).json({ error: '계획한 컷을 다 만들었어요 — 컷의 "이런 걸로 더"로 새 컷을 뽑아 보세요' });
    const count = req.body && req.body.count ? Math.max(1, parseInt(req.body.count, 10) || 0) : remaining;
    // depth = 앞에서 N개. generatePack이 이미 만든 컷을 건너뛰므로, (만든 수 + 원하는 만큼)까지 열면 그만큼 새로 나온다.
    const depth = Math.min(made.size + count, cuts.length);
    // 실제 새로 생성될 컷(=과금 대상) = depth 창 안의 미생성 컷. generatePack 루프와 동일 산식이라
    //   초기 실패로 생긴 갭 백필까지 정확히 반영(min(count,remaining)은 갭을 놓쳐 과소청구될 수 있었다).
    const adding = stillsToGenerate(pack, depth);
    let charge;
    try { charge = await chargeStills(req.user, adding, `팩 컷 추가 (${adding}장)`, pack.id); }
    catch (e) { if (e.statusCode) return res.status(e.statusCode).json({ error: e.message }); throw e; }
    await repo.mergeConfig(pack.id, { depth });
    await repo.setStatus(pack.id, 'processing');
    res.json({ ok: true, remaining, adding });
    setImmediate(() => generatePack(pack, { depth, userId: req.user && req.user.id, charge, user: req.user, expected: adding }));
  } catch (e) { next(e); }
});

/**
 * ✦ 이런 걸로 더 — 씨앗 컷과 같은 결로 형제 컷 N장(무드 유지, 구도 변주). 플래너 1회 + 생성.
 *   done/failed/유휴 상태에서 동작. 백그라운드라 프론트는 refreshPack 폴링으로 새 카드를 받는다.
 */
router.post('/:id/more-like', async (req, res, next) => {
  try {
    const pack = await repo.getPack({ id: Number(req.params.id) });
    if (!pack) return res.status(404).json({ error: 'not found' });
    if (pack.status === 'ref_ready') return res.status(409).json({ error: '아직 게이트 대기예요' });
    if (pack.status === 'processing' && !repo.isStale(pack)) return res.status(409).json({ error: '아직 생성 중이에요' });
    const cutKey = String((req.body && req.body.cutKey) || '');
    const plan = (pack.config && pack.config.plan) || {};
    const seed = (plan.cuts || []).find((c) => c.key === cutKey);
    if (!seed) return res.status(400).json({ error: '컷을 찾을 수 없어요' });
    if (!latestRefPathFor(pack, seed.refSku)) return res.status(409).json({ error: '캐논 레퍼가 없어요' });
    if (!sourcesForSeed(plan, seed.refSku).length) return res.status(409).json({ error: '소스 사진이 없어 더 못 만들어요(이 팩은 원본 저장 전 버전)' });
    const count = Math.max(2, Math.min(4, parseInt((req.body && req.body.count) || 3, 10) || 3));
    let charge;
    try { charge = await chargeStills(req.user, count, `팩 "이런 걸로 더" (${count}장)`, pack.id); }
    catch (e) { if (e.statusCode) return res.status(e.statusCode).json({ error: e.message }); throw e; }
    await repo.setStatus(pack.id, 'processing');
    res.json({ ok: true, adding: count });
    setImmediate(() => growPack(pack, { seedCutKey: cutKey, count, userId: req.user && req.user.id, charge, user: req.user, expected: count }));
  } catch (e) { next(e); }
});

/**
 * 💡 컨셉으로 더 — 자유 브리프로 새 방향 컷 N장. "이런 걸로 더"가 있는 컷에 갇힌다면 이건 밖으로 나간다.
 *   🧠 **브리프를 비우면 자동 모드** — 플래너가 여태 안 나온 새 컨셉을 스스로 창안한다("알아서 더").
 *   씨앗 대신 브리프(또는 자동 컨셉)가 기획을 주도하고, 브랜드가 보이는 대표 레퍼로 생성한다.
 */
router.post('/:id/concept-more', async (req, res, next) => {
  try {
    const pack = await repo.getPack({ id: Number(req.params.id) });
    if (!pack) return res.status(404).json({ error: 'not found' });
    if (pack.status === 'ref_ready') return res.status(409).json({ error: '아직 게이트 대기예요' });
    if (pack.status === 'processing' && !repo.isStale(pack)) return res.status(409).json({ error: '아직 생성 중이에요' });
    const brief = String((req.body && req.body.brief) || '').trim().slice(0, 400);   // 비면 growPack이 자동 컨셉 모드로
    const plan = (pack.config && pack.config.plan) || {};
    if (!latestRefPath(pack)) return res.status(409).json({ error: '캐논 레퍼가 없어요' });
    if (!(plan.sources || []).filter((p) => fs.existsSync(p)).length) return res.status(409).json({ error: '소스 사진이 없어 더 못 만들어요(이 팩은 원본 저장 전 버전)' });
    const count = Math.max(2, Math.min(4, parseInt((req.body && req.body.count) || 3, 10) || 3));
    let charge;
    try { charge = await chargeStills(req.user, count, `팩 컨셉으로 더 (${count}장)`, pack.id); }
    catch (e) { if (e.statusCode) return res.status(e.statusCode).json({ error: e.message }); throw e; }
    await repo.setStatus(pack.id, 'processing');
    res.json({ ok: true, adding: count, auto: !brief });
    setImmediate(() => growPack(pack, { brief, count, userId: req.user && req.user.id, charge, user: req.user, expected: count }));
  } catch (e) { next(e); }
});

/**
 * 🎬 광고 영상 만들기 — 팩 재료(제품·카테고리·컨셉·캐논 레퍼)로 **한 편** 생성한다(Ad Video 엔진 재사용).
 *
 *   🔑 자동 아님·선택형: 영상은 초당 과금(Kling+ElevenLabs)이라 팩 생성마다 굽지 않는다. 버튼 눌렀을 때만 1편.
 *   재료 매핑: product=플래너가 파악한 제품 설명 / concept=판매자 브리프 / productImagePaths=캐논 레퍼(깨끗한 2K로
 *     전 씬 제품 고정, 없으면 원본 소스) / category=확정 카테고리 / 한국어.
 *   엔진 흐름: 대본(Claude) → 씬별 프레임(캐논 레퍼 기준 생성) → Kling 모션 → 음성·음악 → 조립 → ugc_jobs.
 *   결과는 ugc_jobs 잡으로 비동기 진행 → 프론트가 /api/generate/ugc/jobs/:id 폴링 → 완료 시 팩 화면에 영상.
 */
router.post('/:id/video', async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ error: '로그인이 필요해요' });
    const pack = await repo.getPack({ id: Number(req.params.id) });
    if (!pack) return res.status(404).json({ error: 'not found' });
    const plan = (pack.config && pack.config.plan) || {};
    if (!latestRefPath(pack)) return res.status(409).json({ error: '먼저 콘텐츠를 만들어 주세요(캐논 레퍼 없음)' });
    // 이미 만드는 중이면 막는다(중복 과금 방지). config.videoJobId 잡이 processing이면 409.
    if (pack.config && pack.config.videoJobId) {
      try {
        const prev = await ugcVideoService.getJob(pack.config.videoJobId, req.user.id);
        if (prev && prev.status === 'processing') return res.status(409).json({ error: '이미 영상을 만들고 있어요', jobId: prev.id });
      } catch (_) {}
    }
    // 재료: 캐논 레퍼(깨끗한 2K, 전 씬 제품 고정) 우선 — 없으면 원본 소스. 로컬 파일 경로로.
    const refLocalPaths = packRefUrls(pack).map((u) => localPathForUrl(u)).filter((p) => fs.existsSync(p));
    const srcPaths = (plan.sources || []).filter((p) => fs.existsSync(p));
    const productImagePaths = (refLocalPaths.length ? refLocalPaths : srcPaths).slice(0, 5);   // UGC_MAX_PRODUCT_IMAGES
    if (!productImagePaths.length) return res.status(409).json({ error: '영상에 쓸 제품 이미지가 없어요' });

    const product = (plan.product || pack.product || '').slice(0, 500);   // 제품 설명(플래너 파악)
    const concept = String(pack.product || '').slice(0, 1000);            // 판매자 브리프(팩 생성 시 입력)
    const category = (pack.config && pack.config.category) || pack.vertical || '';

    // submit = 대본 생성(Claude) → 과금 → 파이프라인 enqueue → {jobId,cost}. 대본 실패·크레딧 부족은 statusCode로 전파.
    const out = await ugcVideoService.submit({
      user: req.user, product, concept, category,
      outputType: 'product-ad', language: 'ko',
      productImagePaths,
      dryRunVideo: false,          // LIVE
      visibility: 'private',       // 제품 영상 보호(팩 컷과 동일 기본)
      autoCommit: true,            // 🔖 에디터 없는 팩 영상 → 완성 즉시 자동 저장(내 크리에이션에 뜨게)
      batchId: pack.share_id,      // 🔗 팩 이미지와 같은 배치로 묶기(내 크리에이션에서 함께 보이게)
    });
    await repo.mergeConfig(pack.id, { videoJobId: out.jobId });
    res.json({ ok: true, jobId: out.jobId, cost: out.cost });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });   // 402 크레딧부족·403 등 그대로
    next(e);
  }
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
    let charge;
    try { charge = await chargeStills(req.user, 1, `팩 컷 재생성 (${cut.label || cut.key})`, pack.id); }
    catch (e) { if (e.statusCode) return res.status(e.statusCode).json({ error: e.message }); throw e; }
    try {
      const ctx = { product: (pack.config && pack.config.plan && pack.config.plan.product) || pack.product || '' };
      const buf = await genStill({ canonRefPath: refPath, cut, ctx });
      const asset = await recordAsset(pack, { kind: 'still', key: cut.key, label: cut.label, buffer: buf, userId: req.user && req.user.id });
      res.json({ asset });
    } catch (e) { if (charge) await charge.refund().catch(() => {}); throw e; }   // 생성 실패 = 전액 환불
  } catch (e) { next(e); }
});

// (제거됨) POST /:id/add-cut — suite 라이브러리에서 컷을 골라 추가했으나, SUITES에 beverage 하나뿐이라
//   화장품·의류 팩에서도 음료 컷 목록이 떴다(오분류 계열 누수). "이런 걸로 더"(more-like)가 대체한다 —
//   남의 카테고리 라이브러리에서 고르는 것보다 이 제품의 실제 컷을 씨앗으로 변주하는 게 맞다.

/** 캐논 레퍼 재굽기 — 저장된 소스 사진에서 다시 베이크(새 버전). 이후 컷 재생성은 이 새 레퍼를 씀. */
router.post('/:id/rebake-ref', async (req, res, next) => {
  let rbCharge = null;   // 굽기 실패 시 되돌리려면 catch에서 보여야 한다(try 안에 두면 스코프 밖)
  try {
    const pack = await repo.getPack({ id: Number(req.params.id) });
    if (!pack) return res.status(404).json({ error: 'not found' });
    // 재굽기는 **굽기 전에 동기 차감**한다 — 컷을 안 뽑아도 무한 반복되는 경로라 402를 제대로 돌려줘야 한다.
    //   무료분 판정은 chargeRefBake 안에 있다(초기 굽기와 같은 규칙 = 한 곳).
    const rbUser = req.user && req.user.id;
    if (rbUser) {
      const u = await repo.getUserPlanFields(rbUser);
      const user = { id: rbUser, ...u };
      const used = await repo.countBakesSince(rbUser, refPeriodStart(user));
      if (used >= refBakeFree(user)) {
        try { rbCharge = await teamCredit.chargeGeneration(user, REF_UNIT, '미리보기 재생성(무료 횟수 초과)', pack.id); }
        catch (e) { if (e.statusCode) return res.status(e.statusCode).json({ error: e.message }); throw e; }
      }
    }
    const plan = (pack.config && pack.config.plan) || {};
    const sources = (plan.sources || []).filter((p) => fs.existsSync(p));
    if (!sources.length) { if (rbCharge) await rbCharge.refund().catch(() => {}); return res.status(409).json({ error: '소스 사진이 없어 재굽기 불가(이 팩은 재굽기 전 버전)' }); }
    const sku = String((req.body && req.body.sku) || 'main');
    const hint = String((req.body && req.body.hint) || '').slice(0, 200); // 교정(예: "한 쌍으로") — 낱개→페어 등
    const skuLabel = ((plan.refSkus || []).find((s) => s.sku === sku) || {}).label;
    // 상태 레퍼면 **그 상태를 찍은 사진**으로 다시 굽는다(전체 사진으로 구우면 다른 상태가 섞인다).
    const st = (plan.states || []).find((s) => s.key === sku);
    const stSources = st ? (st.sources || []).filter((p) => fs.existsSync(p)) : [];
    const buf = await bakeOne({
      sourcePaths: stSources.length ? stSources : sources,
      // 🔴 state 는 **영어 desc**(장면 설명)를 넘겨야 한다 — 한국어 label 을 넘기면 모델이 그걸
      //   제품에 인쇄할 글자로 오해한다(찻잔에 "우린 차"가 찍혔던 그 버그). label 은 UI 표시 전용.
      //   runPack 은 91a0dec 에서 고쳤는데 **이 재굽기 경로가 빠져 있었다**(게이트에서 누르면 재발).
      label: st ? null : skuLabel, state: st ? (st.desc || st.label) : null,
      unit: plan.unit || (pack.config && pack.config.unit) || null,
      // 카테고리는 플래너가 이미 판별해 config 에 저장해둔 값 — 재굽기도 같은 제시 방식을 써야 한다.
      category: (pack.config && pack.config.category) || null, hint,
    });
    const asset = await recordAsset(pack, { kind: 'ref', key: `ref_${sku}`, label: (st && st.label) || sku, buffer: buf, userId: rbUser, skipRefCharge: true });
    res.json({ asset, refCharged: !!rbCharge, ref: await refInfo(rbUser) });
  } catch (e) { if (rbCharge) await rbCharge.refund().catch(() => {}); next(e); }   // 굽기 실패 = 방금 받은 ◈100 환불
});

module.exports = router;
