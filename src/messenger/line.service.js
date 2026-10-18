/**
 * ─── LINE 입구 (2026-10-18, 기획 = docs/카톡_LINE_연동_기획_2026-10-17.md + 작전판 아티팩트) ───
 * 메신저는 새 기능이 아니라 입구. 안에서 도는 건 Lens(제품컷) 그대로. 여기 코드는 다섯 조각뿐:
 *   받기(웹훅, 서명 검증) → 접수 응답(reply token, 약 1분) → 비동기 생성 → 돌려주기(push) → 계정 묶기(섀도 계정).
 *
 * (10-18 저녁) v1 = **Doppia Lens 만**. 대표 실측에서 Shoot 경로(AI 인물 캐러셀·장면 프리셋·입히기)는 채팅에서 안 돌았고
 *   "일단 렌즈만 LINE에서" 로 결정 → Shoot 코드는 전부 걷어냈다(git 에 남아 있다, 카톡/v2 때 다시 꺼낸다).
 * 흐름(v1):
 *   follow / text        → 안내 + 스타일 칩(공식 Lens 제품 스타일 5개)
 *   image                → 고른 스타일(기본 Clean Studio)로 제품컷 1장 → push
 *   postback style=slug  → 스타일 저장. 마지막 사진이 있으면 그 사진으로 바로 다시 만든다(사진 다시 안 보내도 됨)
 *   postback again       → 마지막 사진 + 현재 스타일로 다시
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
const lens = require('../lens/lens.service');

const API = 'https://api.line.me/v2/bot';
const DATA = 'https://api-data.line.me/v2/bot';
const CHANNEL = 'line';
const NOTICE = { ko: 'AI로 제작한 이미지입니다', ja: 'AIで生成した画像です', en: 'Made with AI' };
// 채팅용 스타일 칩 — 공식 Lens 제품 스타일 중 product 입력 1장짜리만(사람 사진이 필요한 street-snap · 4컷 세트 · 영상은 제외)
const STYLES = [
  ['clean-studio', { ko: '흰 배경', ja: '白背景', en: 'Clean studio' }],
  ['marble-vanity', { ko: '화장대', ja: '洗面台', en: 'Marble vanity' }],
  ['in-hand', { ko: '손에 든', ja: '手持ち', en: 'In hand' }],
  ['flat-lay', { ko: '플랫레이', ja: '俯瞰', en: 'Flat lay' }],
  ['holiday-gift', { ko: '선물', ja: 'ギフト', en: 'Gift' }],
];
const DEFAULT_STYLE = 'clean-studio';
const STR = {
  ko: {
    hello: 'Doppia Lens예요 👋 제품 사진 한 장을 보내면 판매용 제품컷으로 돌려드려요. 무료 3장.',
    sendProduct: '제품 사진을 보내주세요. 스타일은 아래에서 고를 수 있어요(기본: 흰 배경).',
    howto: '제품 사진을 보내면 30초쯤 뒤 제품컷이 와요. 아래 칩으로 스타일을 바꾸면 같은 사진으로 바로 다시 만들어요.',
    styleSet: (n) => `스타일: ${n}. 제품 사진을 보내주세요.`,
    received: '접수했어요. 30초쯤 걸려요 ⏳',
    failed: '이번엔 만들지 못했어요. 다른 사진으로 다시 보내주세요.', again: '다시', web: '웹에서 더 보기',
    noCredit: '무료 횟수를 다 썼어요. 웹에서 이어서 쓸 수 있어요.',
  },
  ja: {
    hello: 'Doppia Lensです 👋 商品写真を1枚送ると、販売用の商品ショットにしてお返しします。無料3枚。',
    sendProduct: '商品の写真を送ってください。スタイルは下から選べます（初期設定: 白背景）。',
    howto: '商品写真を送ると30秒ほどで商品ショットが届きます。下のチップでスタイルを変えると、同じ写真ですぐ作り直します。',
    styleSet: (n) => `スタイル: ${n}。商品の写真を送ってください。`,
    received: '受け付けました。30秒ほどお待ちください ⏳',
    failed: '今回は作れませんでした。別の写真でもう一度送ってください。', again: 'もう一度', web: 'Webでもっと見る',
    noCredit: '無料回数を使い切りました。Webで続けられます。',
  },
  en: {
    hello: "This is Doppia Lens 👋 Send one product photo and get a sellable product shot back. 3 free.",
    sendProduct: 'Send a product photo. Pick a style below (default: clean studio).',
    howto: 'Send a product photo and the shot arrives in about 30 seconds. Change the style with the chips to redo the same photo.',
    styleSet: (n) => `Style: ${n}. Send a product photo.`,
    received: 'Got it. About 30 seconds ⏳',
    failed: "That one didn't work. Try another photo.", again: 'Again', web: 'See more on the web',
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
const styleName = (slug, lang) => { const st = STYLES.find(([k]) => k === slug); return st ? (st[1][lang] || st[1].ja) : slug; };
const styleQuick = (lang, L, withAgain) => quick([...(withAgain ? [[L.again, 'again']] : []), ...STYLES.map(([key, names]) => [names[lang] || names.ja, `style=${key}`])]);

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
const SIZE = { '1:1': [1024, 1024], '4:5': [832, 1040], '3:4': [768, 1024] };
/** 제품컷 = 공식 Lens 스타일 프롬프트 + 사용자 사진(product) → Nano Banana Pro 1장(비율은 스타일 설정을 따른다) */
async function productCut(row, absPath, slug) {
  // eslint-disable-next-line global-require
  const nano = require('../images/providers/nanoBanana.provider');
  // eslint-disable-next-line global-require
  const credit = require('../credits/credit.service');
  const off = lens.OFFICIAL.find((o) => o.slug === slug) || lens.OFFICIAL.find((o) => o.slug === DEFAULT_STYLE);
  const cfg = off.config;
  const [width, height] = SIZE[cfg.aspect] || SIZE['1:1'];
  const prompt = lens.buildImagePrompt(cfg, { slots: ['product'], refCount: 0 });
  await teamCredit.chargeGeneration({ id: row.user_id }, credit.imageCost('pro', 1, false), `LINE product shot: ${off.slug}`);
  const out = await nano.generate({ prompt, references: [{ path: absPath, kind: 'product' }], model: 'gemini-3-pro-image-preview', width, height, imageSize: '1K' });
  const abs = out.url.replace('file://', '');
  await mediaStore.putFile(abs).catch(() => {});
  return path.basename(abs);
}

async function deliver(row, name, lang) {
  const L = t(lang);
  const url = await fetchable(name);
  await repo.update(row.id, { last_result: `/images/${name}` });
  await push(row.external_id, [image(url), text(`${NOTICE[lang] || NOTICE.ja} · ${L.web}: ${site()}/gallery`, styleQuick(lang, L, true))]);
}
/** 마지막 사진 + 스타일로 만들어 보낸다. 실패 사유가 크레딧이면 그 안내로. */
async function run(row, lang, inputName, slug) {
  const L = t(lang);
  try {
    const abs = await ensureLocal(`/images/${inputName}`);
    if (!abs) throw new Error('input photo missing');
    await deliver(row, await productCut(row, abs, slug), lang);
  } catch (err) {
    logger.warn({ err: String(err.message || err), slug }, 'line product shot failed');
    const insufficient = /credit|크레딧/i.test(String(err.message || ''));
    await push(row.external_id, [text(insufficient ? L.noCredit : L.failed, styleQuick(lang, L, false))]);
  }
}

// ── 이벤트 ──
async function onEvent(ev) {
  const externalId = ev.source && ev.source.userId;
  if (!externalId) return;
  const row = await ensureUser(externalId);
  const lang = row.lang || 'ja'; const L = t(lang);
  const slug = STYLES.some(([k]) => k === row.menu) ? row.menu : DEFAULT_STYLE;

  if (ev.type === 'follow') return reply(ev.replyToken, [text(L.hello, styleQuick(lang, L, false))]);

  if (ev.type === 'postback') {
    const d = String(ev.postback && ev.postback.data || '');
    if (d.startsWith('style=')) {
      const next = d.slice(6);
      if (!STYLES.some(([k]) => k === next)) return;
      await repo.update(row.id, { menu: next });
      if (!row.last_input) return reply(ev.replyToken, [text(L.styleSet(styleName(next, lang)), styleQuick(lang, L, false))]);
      await reply(ev.replyToken, [text(L.received)]); // 사진이 있으면 그 사진으로 바로 — 스타일 비교가 채팅의 핵심 경험
      return run(row, lang, row.last_input, next);
    }
    if (d === 'again') {
      if (!row.last_input) return reply(ev.replyToken, [text(L.sendProduct, styleQuick(lang, L, false))]);
      await reply(ev.replyToken, [text(L.received)]);
      return run(row, lang, row.last_input, slug);
    }
    return;
  }

  if (ev.type !== 'message' || !ev.message) return;
  const msg = ev.message;
  if (msg.type === 'text') return reply(ev.replyToken, [text(L.howto, styleQuick(lang, L, !!row.last_input))]);
  if (msg.type === 'image') {
    await reply(ev.replyToken, [text(L.received)]);
    let name;
    try { name = await fetchContent(msg.id); } catch (err) { logger.warn({ err: String(err.message || err) }, 'line image fetch failed'); return push(externalId, [text(L.failed, styleQuick(lang, L, false))]); }
    await repo.update(row.id, { last_input: name });
    return run(row, lang, name, slug);
  }
}

/** 웹훅 본체 — 즉시 200 을 돌려주고 이벤트는 뒤에서(LINE 은 1초 안에 응답을 원한다) */
function handleWebhook(body) {
  const events = (body && Array.isArray(body.events)) ? body.events : [];
  for (const ev of events) onEvent(ev).catch((err) => logger.warn({ err: String(err.message || err), type: ev.type }, 'line event failed'));
  return { received: events.length };
}

module.exports = { configured, verifySignature, handleWebhook, STYLES };
