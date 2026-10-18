/**
 * ─── LINE 입구 (2026-10-18, 기획 = docs/카톡_LINE_연동_기획_2026-10-17.md + 작전판 아티팩트) ───
 * 메신저는 새 기능이 아니라 입구. 안에서 도는 건 Lens(제품컷)·Shoot(AI 인물) 그대로. 여기 코드는 다섯 조각뿐:
 *   받기(웹훅, 서명 검증) → 접수 응답(reply token, 약 1분) → 비동기 생성 → 돌려주기(push) → 계정 묶기(섀도 계정).
 *
 * 흐름(v1):
 *   follow            → 인사 + 퀵리플라이(제품컷 · AI 인물 고르기 · 사용법)
 *   postback menu=…   → 메뉴 전환
 *   postback model=…  → AI 인물 선택 → 그 인물의 인사 + 장면 칩 6개
 *   postback preset=… → 고른 인물로 그 장면 촬영(Shoot shot)
 *   text              → 인물이 골라져 있으면 그 글대로 촬영, 아니면 안내
 *   image             → 메뉴가 shoot 이고 인물이 있으면 입히기(Outfit, NB Pro) / 아니면 제품컷(Lens 'clean-studio')
 * 계정: 첫 메시지에 섀도 계정 자동 생성(가입 보너스 크레딧) — 무료 3턴은 free_left 로 센다(지금은 안내만, 과금은 크레딧이 한다).
 * 결과 이미지 URL: /images 공개 URL 은 클라우드플레어가 봇을 막으므로(10-16 실측) R2 서명 URL 을 준다.
 * 언어: LINE 프로필 language(ja/ko/en) → 없으면 ja. 대표가 ko 로 테스트하므로 ko 도 완비.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { env } = require('../config');
const logger = require('../lib/logger');
const mediaStore = require('../storage/mediaStore');
const teamCredit = require('../teams/team.credit');
const repo = require('./messenger.repository');
const userRepo = require('../auth/user.repository');
const shootRepo = require('../shoot/shootModel.repository');
const shoot = require('../shoot/shootModel.service');
const lens = require('../lens/lens.service');

const API = 'https://api.line.me/v2/bot';
const DATA = 'https://api-data.line.me/v2/bot';
const CHANNEL = 'line';
const NOTICE = { ko: 'AI로 제작한 이미지입니다', ja: 'AIで生成した画像です', en: 'Made with AI' };
// 채팅용 장면 칩 6 — 웹 Shoot 프리셋 28 중(기획 작전판 결정 9, 안이 확정되면 여기만 고친다)
const PRESETS = [
  ['paris', { ko: '파리 거리', ja: 'パリの街', en: 'Paris street' }, 'in front of Haussmann buildings on a Paris street, trench coat, soft overcast light, candid'],
  ['cafe', { ko: '카페', ja: 'カフェ', en: 'Cafe window' }, 'by a cafe window in a white shirt, holding a coffee, soft smile, morning light'],
  ['studio', { ko: '스튜디오', ja: 'スタジオ', en: 'Studio' }, 'in a clean grey studio, three-quarter portrait, soft beauty light, black turtleneck, calm gaze into the lens'],
  ['night', { ko: '밤거리', ja: '夜の街', en: 'Night out' }, 'on a neon-lit street at night, satin shirt, wet pavement reflections, looking over the shoulder'],
  ['beach', { ko: '해변', ja: 'ビーチ', en: 'Beach' }, 'walking along the shoreline at sunset in a light shirt, hair blowing, golden backlight'],
  ['office', { ko: '사무실', ja: 'オフィス', en: 'Office' }, 'at a desk in a modern office in a smart shirt, laptop open, thoughtful look, window light'],
];
const STR = {
  ko: {
    hello: 'Doppia예요 👋 사진 한 장이면 제품컷을, AI 인물을 고르면 모델컷을 만들어 드려요. 무료 3번.',
    product: '제품컷', shootPick: 'AI 인물 고르기', help: '사용법',
    sendProduct: '제품 사진을 보내주세요. 흰 배경 스튜디오 컷으로 돌려드릴게요.',
    howto: '① 제품 사진을 보내면 제품컷 ② "AI 인물 고르기"로 모델을 고른 뒤 옷 사진을 보내면 입히기, 장면을 고르면 촬영, 글을 보내면 그대로 촬영. 결과는 30초쯤 걸려요.',
    pickTitle: '모델을 골라주세요', pickBtn: '이 모델로', more: '더 보기 (웹)',
    modelHi: (n) => `안녕, 나는 ${n}이에요 👋 옷 사진을 보내면 입어볼게요. 아니면 장면을 골라주세요.`,
    received: '접수했어요. 30초쯤 걸려요 ⏳', noModel: '먼저 "AI 인물 고르기"로 모델을 골라주세요.',
    failed: '이번엔 만들지 못했어요. 다른 사진으로 다시 보내주세요.', again: '다시', other: '다른 인물', web: '웹에서 더 보기',
    noCredit: '무료 횟수를 다 썼어요. 웹에서 이어서 쓸 수 있어요.',
  },
  ja: {
    hello: 'Doppiaです 👋 写真1枚で商品ショット、AIモデルを選べばモデルショットを作ります。無料3回。',
    product: '商品ショット', shootPick: 'AIモデルを選ぶ', help: '使い方',
    sendProduct: '商品の写真を送ってください。白背景のスタジオショットでお返しします。',
    howto: '① 商品写真を送ると商品ショット ② 「AIモデルを選ぶ」でモデルを選び、服の写真を送ると着せ替え、シーンを選ぶと撮影、文章を送るとその通りに撮影。結果は30秒ほどです。',
    pickTitle: 'モデルを選んでください', pickBtn: 'このモデルで', more: 'もっと見る（Web）',
    modelHi: (n) => `こんにちは、${n}です 👋 服の写真を送ってくれたら着てみます。または、シーンを選んでください。`,
    received: '受け付けました。30秒ほどお待ちください ⏳', noModel: 'まず「AIモデルを選ぶ」でモデルを選んでください。',
    failed: '今回は作れませんでした。別の写真でもう一度送ってください。', again: 'もう一度', other: '別のモデル', web: 'Webでもっと見る',
    noCredit: '無料回数を使い切りました。Webで続けられます。',
  },
  en: {
    hello: "This is Doppia 👋 Send one product photo for a product shot, or pick an AI model for model shots. 3 free.",
    product: 'Product shot', shootPick: 'Pick an AI model', help: 'How it works',
    sendProduct: 'Send a product photo. You get a clean white-studio shot back.',
    howto: '① Send a product photo → product shot ② "Pick an AI model", then send a garment photo to dress them, pick a scene to shoot, or type a line to shoot it. About 30 seconds.',
    pickTitle: 'Pick a model', pickBtn: 'Use this model', more: 'More (web)',
    modelHi: (n) => `Hi, I'm ${n} 👋 Send a garment photo and I'll wear it, or pick a scene.`,
    received: 'Got it. About 30 seconds ⏳', noModel: 'Pick an AI model first.',
    failed: "That one didn't work. Try another photo.", again: 'Again', other: 'Other model', web: 'See more on the web',
    noCredit: 'Free shots used up. Continue on the web.',
  },
};
const t = (lang) => STR[lang] || STR.ja;
const site = () => String(env.PUBLIC_URL || 'https://doppia.ai').replace(/\/$/, '');

function configured() { return !!(env.LINE_CHANNEL_SECRET && env.LINE_CHANNEL_ACCESS_TOKEN); }

/** X-Line-Signature = base64(HMAC-SHA256(channel secret, raw body)) */
function verifySignature(rawBody, signature) {
  if (!env.LINE_CHANNEL_SECRET || !signature || !rawBody) return false;
  const mac = crypto.createHmac('sha256', env.LINE_CHANNEL_SECRET).update(rawBody).digest('base64');
  return mac.length === signature.length && crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(signature));
}

const headers = () => ({ Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' });
async function reply(replyToken, messages) {
  const r = await fetch(`${API}/message/reply`, { method: 'POST', headers: headers(), body: JSON.stringify({ replyToken, messages }) });
  if (!r.ok) logger.warn({ status: r.status, body: (await r.text()).slice(0, 200) }, 'line reply failed');
}
async function push(to, messages) {
  const r = await fetch(`${API}/message/push`, { method: 'POST', headers: headers(), body: JSON.stringify({ to, messages }) });
  if (!r.ok) logger.warn({ status: r.status, body: (await r.text()).slice(0, 200) }, 'line push failed');
}
async function profile(userId) {
  try { const r = await fetch(`${API}/profile/${userId}`, { headers: headers() }); return r.ok ? r.json() : null; } catch { return null; }
}
/** 사용자가 보낸 이미지 원본 → tmp/images (+R2). 돌려주는 값 = 파일명 */
async function fetchContent(messageId) {
  const r = await fetch(`${DATA}/message/${messageId}/content`, { headers: headers() });
  if (!r.ok) throw new Error(`line content ${r.status}`);
  const ext = /png/i.test(r.headers.get('content-type') || '') ? '.png' : '.jpg';
  const name = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), 'tmp', 'images'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), Buffer.from(await r.arrayBuffer()));
  await mediaStore.putFile(path.join(dir, name)).catch(() => {});
  return name;
}
/** LINE 이 가져갈 수 있는 HTTPS URL — R2 서명 URL(없으면 공개 URL) */
async function fetchable(name) { return (await mediaStore.signedUrl(name).catch(() => null)) || `${site()}/images/${name}`; }
/** 로컬에 없는 우리 이미지(/images/x) 를 tmp 로 내려받는다(R2 에만 있는 뱅크 사진) */
async function ensureLocal(urlOrName) {
  const name = String(urlOrName).split('/').pop();
  const abs = path.join(process.cwd(), 'tmp', 'images', name);
  if (fs.existsSync(abs)) return abs;
  const o = await mediaStore.getObject(name).catch(() => null);
  if (!o || !o.Body) return null;
  fs.writeFileSync(abs, Buffer.from(await o.Body.transformToByteArray())); // aws-sdk v3 Body 헬퍼
  return abs;
}

// ── 메시지 조립 ──
const quick = (items) => ({ items: items.map(([label, data]) => ({ type: 'action', action: { type: 'postback', label: label.slice(0, 20), data, displayText: label } })) });
const text = (s, qr) => Object.assign({ type: 'text', text: s }, qr ? { quickReply: qr } : {});
const image = (url) => ({ type: 'image', originalContentUrl: url, previewImageUrl: url });
const menuQuick = (L) => quick([[L.product, 'menu=product'], [L.shootPick, 'menu=shoot'], [L.help, 'menu=help']]);
const presetQuick = (lang, L) => quick(PRESETS.map(([key, names]) => [names[lang] || names.ja, `preset=${key}`]).concat([[L.other, 'menu=shoot']]));
const afterQuick = (L, hasModel) => quick([[L.again, 'again'], ...(hasModel ? [[L.other, 'menu=shoot']] : [[L.shootPick, 'menu=shoot']]), [L.product, 'menu=product']]);

async function modelCarousel(lang) {
  const L = t(lang);
  const rows = (await shootRepo.findOfficial()).slice(0, 9); // 캐러셀 최대 10 — 마지막 칸은 "더 보기"
  const columns = [];
  for (const m of rows) {
    const thumb = m.avatar && m.avatar.startsWith('/images/') ? await fetchable(m.avatar.split('/').pop()) : `${site()}${m.avatar}`;
    columns.push({ thumbnailImageUrl: thumb, title: m.name.slice(0, 40), text: shoot.profileLine(m.profile).slice(0, 60), actions: [{ type: 'postback', label: L.pickBtn, data: `model=${m.id}`, displayText: m.name }] });
  }
  columns.push({ title: 'Doppia Shoot', text: L.more, actions: [{ type: 'uri', label: L.more, uri: `${site()}/shoot` }] });
  return { type: 'template', altText: L.pickTitle, template: { type: 'carousel', imageAspectRatio: 'square', imageSize: 'cover', columns } };
}

// ── 계정 ──
async function ensureUser(externalId) {
  let row = await repo.find(CHANNEL, externalId);
  if (row) return row;
  const p = await profile(externalId);
  const lang = /^ja/i.test(p && p.language) ? 'ja' : /^ko/i.test(p && p.language) ? 'ko' : /^en/i.test(p && p.language) ? 'en' : 'ja';
  // 섀도 계정 — 이메일 로그인은 못 한다(무작위 해시). 카카오싱크/LINE Login 으로 정식 계정과 병합할 때 user_id 를 옮긴다.
  const user = await userRepo.insert({ email: `line.${externalId.toLowerCase()}@messenger.doppia.ai`, passwordHash: crypto.randomBytes(32).toString('hex'), displayName: (p && p.displayName) || 'LINE user' });
  // eslint-disable-next-line global-require
  await require('../credits/credit.service').grantSignupBonus(user.id).catch(() => {});
  row = await repo.insert({ channel: CHANNEL, externalId, userId: user.id, lang });
  logger.info({ externalId, userId: user.id, lang }, 'line shadow user created');
  return row;
}

// ── 생성 ──
/** 제품컷 = 공식 Lens 'clean-studio' 프롬프트 + 사용자 사진(product) → Nano Banana Pro 1장 */
async function productCut(row, absPath) {
  // eslint-disable-next-line global-require
  const nano = require('../images/providers/nanoBanana.provider');
  // eslint-disable-next-line global-require
  const credit = require('../credits/credit.service');
  const cfg = (lens.OFFICIAL.find((o) => o.slug === 'clean-studio') || {}).config;
  const prompt = lens.buildImagePrompt(cfg, { slots: ['product'], refCount: 0 });
  await teamCredit.chargeGeneration({ id: row.user_id }, credit.imageCost('pro', 1, false), 'LINE product shot');
  const out = await nano.generate({ prompt, references: [{ path: absPath, kind: 'product' }], model: 'gemini-3-pro-image-preview', width: 1024, height: 1024, imageSize: '1K' });
  const abs = out.url.replace('file://', '');
  await mediaStore.putFile(abs).catch(() => {});
  return path.basename(abs);
}
/** 입히기 = 고른 AI 인물의 거리컷(또는 마지막 결과) 위에 옷 사진을 입힌다(웹 Shoot Outfit 과 같은 문구) */
async function outfit(row, model, garmentAbs) {
  // eslint-disable-next-line global-require
  const nano = require('../images/providers/nanoBanana.provider');
  // eslint-disable-next-line global-require
  const credit = require('../credits/credit.service');
  const baseUrl = row.last_result || (model.bank.find((b) => b.key === 'street') || model.bank[0] || {}).url;
  const baseAbs = baseUrl && await ensureLocal(baseUrl);
  if (!baseAbs) throw new Error('no base image for outfit');
  const who = `${shoot.profileLine(model.profile)}. `;
  const prompt = `${who}Image 1 is the photo to edit. Dress the person in image 1 in the garment from image 2, reproduced faithfully — same color, print, logo placement and proportions. Replace only what the garment covers; keep the rest of the outfit, pose, background, lighting and camera. Keep the same face and identity.`;
  await teamCredit.chargeGeneration({ id: row.user_id }, credit.imageCost('pro', 1, false), `LINE outfit: ${model.name}`);
  const out = await nano.generate({ prompt, references: [{ path: baseAbs, kind: 'person' }, { path: garmentAbs, kind: 'product' }], model: 'gemini-3-pro-image-preview', width: 768, height: 1024, imageSize: '1K' });
  const abs = out.url.replace('file://', '');
  await mediaStore.putFile(abs).catch(() => {});
  return path.basename(abs);
}
/** 촬영 = Shoot shot(Soul 2 + 공식 AI 인물) — Library 에도 저장된다 */
async function shot(row, modelId, prompt) {
  const r = await shoot.shot({ id: row.user_id }, modelId, { prompt, count: 1, aspectRatio: '3:4', privateMode: true });
  const ok = r.results.find((x) => x.success);
  if (!ok) throw new Error((r.results[0] && r.results[0].error) || 'shot failed');
  return ok.url.split('/').pop();
}

async function deliver(row, name, lang, hasModel) {
  const L = t(lang);
  const url = await fetchable(name);
  await repo.update(row.id, { last_result: `/images/${name}` });
  await push(row.external_id, [image(url), text(`${NOTICE[lang] || NOTICE.ja} · ${L.web}: ${site()}/gallery`, afterQuick(L, hasModel))]);
}

// ── 이벤트 ──
async function onEvent(ev) {
  const externalId = ev.source && ev.source.userId;
  if (!externalId) return;
  const row = await ensureUser(externalId);
  const lang = row.lang || 'ja'; const L = t(lang);
  const model = row.model_id ? await shootRepo.findById(row.model_id) : null;

  if (ev.type === 'follow') return reply(ev.replyToken, [text(L.hello, menuQuick(L))]);

  if (ev.type === 'postback') {
    const d = String(ev.postback && ev.postback.data || '');
    if (d === 'menu=product') { await repo.update(row.id, { menu: 'product' }); return reply(ev.replyToken, [text(L.sendProduct)]); }
    if (d === 'menu=help') return reply(ev.replyToken, [text(L.howto, menuQuick(L))]);
    if (d === 'menu=shoot') { await repo.update(row.id, { menu: 'shoot' }); return reply(ev.replyToken, [await modelCarousel(lang)]); }
    if (d.startsWith('model=')) {
      const m = await shootRepo.findById(d.slice(6));
      if (!m || !m.official) return reply(ev.replyToken, [text(L.noModel, menuQuick(L))]);
      await repo.update(row.id, { menu: 'shoot', model_id: m.id, last_result: null });
      return reply(ev.replyToken, [text(L.modelHi(m.name), presetQuick(lang, L))]);
    }
    if (d.startsWith('preset=')) {
      if (!model) return reply(ev.replyToken, [text(L.noModel, menuQuick(L))]);
      const p = PRESETS.find(([k]) => k === d.slice(7));
      if (!p) return;
      await reply(ev.replyToken, [text(L.received)]);
      try { await deliver(row, await shot(row, model.id, p[2]), lang, true); } catch (err) { logger.warn({ err: String(err.message || err) }, 'line preset shot failed'); await push(externalId, [text(L.failed, afterQuick(L, true))]); }
      return;
    }
    if (d === 'again') {
      // 마지막 입력을 따로 저장하지 않는다(v1) — 인물이 있으면 기본 장면으로 다시, 없으면 사진을 다시 요청
      if (!model) return reply(ev.replyToken, [text(L.sendProduct)]);
      await reply(ev.replyToken, [text(L.received)]);
      try { await deliver(row, await shot(row, model.id, PRESETS[0][2]), lang, true); } catch (err) { await push(externalId, [text(L.failed, afterQuick(L, true))]); }
      return;
    }
    return;
  }

  if (ev.type !== 'message' || !ev.message) return;
  const msg = ev.message;

  if (msg.type === 'text') {
    const s = String(msg.text || '').trim();
    if (!model) return reply(ev.replyToken, [text(L.howto, menuQuick(L))]);
    await reply(ev.replyToken, [text(L.received)]);
    try { await deliver(row, await shot(row, model.id, s.slice(0, 500)), lang, true); } catch (err) { logger.warn({ err: String(err.message || err) }, 'line text shot failed'); await push(externalId, [text(L.failed, afterQuick(L, true))]); }
    return;
  }

  if (msg.type === 'image') {
    await reply(ev.replyToken, [text(L.received)]);
    try {
      const name = await fetchContent(msg.id);
      const abs = path.join(process.cwd(), 'tmp', 'images', name);
      const useOutfit = row.menu === 'shoot' && model;
      const out = useOutfit ? await outfit(row, model, abs) : await productCut(row, abs);
      await deliver(row, out, lang, !!model);
    } catch (err) {
      logger.warn({ err: String(err.message || err) }, 'line image failed');
      const insufficient = /credit|크레딧/i.test(String(err.message || ''));
      await push(externalId, [text(insufficient ? L.noCredit : L.failed, afterQuick(L, !!model))]);
    }
  }
}

/** 웹훅 본체 — 즉시 200 을 돌려주고 이벤트는 뒤에서(LINE 은 1초 안에 응답을 원한다) */
function handleWebhook(body) {
  const events = (body && Array.isArray(body.events)) ? body.events : [];
  for (const ev of events) onEvent(ev).catch((err) => logger.warn({ err: String(err.message || err), type: ev.type }, 'line event failed'));
  return { received: events.length };
}

module.exports = { configured, verifySignature, handleWebhook, PRESETS };
