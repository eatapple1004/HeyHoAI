const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const log = require('../lib/logger')('AdStudio:frame');

/**
 * 시작 프레임을 목표 비율로 맞춘다.
 * ============================================================================
 * ⚠️ **image2video 엔진은 `aspect_ratio` 파라미터를 무시하고 입력 이미지 비율을 따라간다.**
 *   실측(2026-08-14): 500×500 제품 썸네일을 9:16으로 요청 → 960×960 정사각 영상이 나왔다.
 *   릴스는 9:16이어야 하므로, 제출 **전에** 프레임을 만들어 넣어야 한다.
 *
 * 단순 레터박스(위아래 검은 띠)는 광고로 못 쓴다. 그래서
 *   ① 원본을 cover로 늘려 **블러 배경**을 깔고
 *   ② 그 위에 원본을 contain으로 얹는다
 * 상품 사진이 잘리지 않으면서 화면이 꽉 차 보인다(쇼핑 릴스에서 흔한 처리).
 */

const RATIOS = {
  '9:16': [1080, 1920],
  '16:9': [1920, 1080],
  '1:1': [1080, 1080],
  '4:3': [1440, 1080],
  '3:4': [1080, 1440],
};
/** 상품이 가장자리에 붙으면 답답하다. 가로 기준 이 비율까지만 채운다. */
const INSET = 0.86;
const OUTPUT_DIR = path.join(process.cwd(), 'tmp', 'images');

/** 이미 목표 비율이면(오차 2%) 손대지 않는다 — 불필요한 재인코딩은 화질만 깎는다. */
function needsFit(w, h, tw, th) {
  return Math.abs((w / h) - (tw / th)) / (tw / th) > 0.02;
}

/**
 * @param {string} src 이미지 URL 또는 로컬 경로
 * @param {string} aspect '9:16' 등
 * @returns {Promise<{filePath:string, url:string, changed:boolean}>} 우리 서빙 경로(/images/...)
 */
async function fitStartFrame(src, aspect = '9:16') {
  const [tw, th] = RATIOS[aspect] || RATIOS['9:16'];

  let buf;
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`시작 이미지 다운로드 실패 (${res.status})`);
    buf = Buffer.from(await res.arrayBuffer());
  } else {
    const abs = path.isAbsolute(src) ? src : path.join(process.cwd(), src);
    if (!fs.existsSync(abs)) throw new Error(`시작 이미지를 찾을 수 없습니다: ${src}`);
    buf = fs.readFileSync(abs);
  }

  const meta = await sharp(buf).metadata();
  if (!needsFit(meta.width, meta.height, tw, th)) {
    return { filePath: null, url: src, changed: false };
  }

  const bg = await sharp(buf).resize(tw, th, { fit: 'cover' }).blur(28).modulate({ brightness: 0.72 }).toBuffer();
  const fg = await sharp(buf).resize(Math.round(tw * INSET), Math.round(th * INSET), { fit: 'inside' }).toBuffer();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.jpg`;
  const abs = path.join(OUTPUT_DIR, filename);
  await sharp(bg)
    .composite([{ input: fg, gravity: 'center' }])
    .jpeg({ quality: 92 })
    .toFile(abs);

  log.info(`시작 프레임 보정 ${meta.width}x${meta.height} → ${tw}x${th} (${aspect})`);
  return { filePath: abs, url: `/images/${filename}`, changed: true };
}

module.exports = { fitStartFrame, RATIOS };
