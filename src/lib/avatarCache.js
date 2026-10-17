/**
 * ─── SNS 프로필 사진 보관 (2026-10-17) ───
 * 인스타그램·페이스북 CDN 프로필 사진 URL 은 서명이 들어 있어 며칠 뒤 만료된다(→ /accounts 카드 사진이 깨짐).
 * 계정을 저장할 때 사진을 받아 우리 저장소(/images/avatar-<내용해시>.jpg, R2 포함)에 두고 그 주소를 저장한다.
 * 받기 실패·다른 호스트면 원래 URL 그대로(동작은 예전과 같음). 같은 사진은 같은 파일명이라 중복 저장 없음.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mediaStore = require('../storage/mediaStore');

const EXPIRING_HOSTS = /(^|\.)(cdninstagram\.com|fbcdn\.net|fbsbx\.com)$/i;

async function persistAvatar(url) {
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) return url;
  let host;
  try { host = new URL(url).hostname; } catch (e) { return url; }
  if (!EXPIRING_HOSTS.test(host)) return url;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const type = String(res.headers.get('content-type') || '');
    if (!res.ok || !/^image\//i.test(type)) return url;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > 5 * 1024 * 1024) return url;
    const ext = /png/i.test(type) ? 'png' : /webp/i.test(type) ? 'webp' : 'jpg';
    const name = `avatar-${crypto.createHash('sha1').update(buf).digest('hex').slice(0, 20)}.${ext}`;
    const dir = path.join(process.cwd(), 'tmp', 'images');
    fs.mkdirSync(dir, { recursive: true });
    const abs = path.join(dir, name);
    if (!fs.existsSync(abs)) fs.writeFileSync(abs, buf);
    if (mediaStore.isRemote()) await mediaStore.putFile(abs).catch(() => {});
    return `/images/${name}`;
  } catch (e) {
    return url;
  }
}

module.exports = { persistAvatar };
