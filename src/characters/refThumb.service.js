/**
 * 레퍼런스 이미지 썸네일 — Select Media 그리드가 원본(폰 사진 수 MB)을 통째로 받던 문제의 정석 해결.
 *
 * 규약(⚠️ DB 칼럼 없음 — 파일 이름 규약이 전부):
 *   원본  /images/<filename>          (tmp/images/<filename> + R2 dual)
 *   썸네일 /images/thumb_<filename>.jpg (480px 안쪽, JPEG q80 — 목록 그리드 전용)
 * 프런트는 URL 치환으로 썸네일을 먼저 시도하고, 404면 원본으로 폴백한다(백필 전 기존 자산 호환).
 * 생성 입력·확대 보기·저장은 전부 원본 그대로 — 썸네일은 목록 표시에만 쓰인다.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const mediaStore = require('../storage/mediaStore');

const IMAGES_DIR = path.join(process.cwd(), 'tmp', 'images');
const THUMB_WIDTH = 480;

function thumbName(filename) { return `thumb_${filename}.jpg`; }

/**
 * /images/<fn> 원본에서 썸네일 생성(+R2 영속화). 실패해도 던지지 않는다(본 흐름 무영향).
 * @param {string} imageUrl  '/images/<filename>' 형태
 * @returns {Promise<boolean>} 생성 여부
 */
async function makeRefThumb(imageUrl) {
  try {
    if (!imageUrl || imageUrl.indexOf('/images/') !== 0) return false;
    const fn = imageUrl.slice('/images/'.length);
    if (!fn || fn.indexOf('/') >= 0 || fn.indexOf('thumb_') === 0) return false;
    const srcPath = path.join(IMAGES_DIR, fn);
    const outPath = path.join(IMAGES_DIR, thumbName(fn));
    if (fs.existsSync(outPath)) return true;
    let buf = null;
    if (fs.existsSync(srcPath)) {
      buf = fs.readFileSync(srcPath);
    } else {
      // 로컬에 없으면 R2에서 복원(cleanup cron이 tmp를 비웠을 수 있음)
      const obj = await mediaStore.getObject(fn);
      if (!obj || !obj.Body) return false;
      const chunks = [];
      for await (const c of obj.Body) chunks.push(c);
      buf = Buffer.concat(chunks);
    }
    const out = await sharp(buf).rotate().resize(THUMB_WIDTH, THUMB_WIDTH, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    fs.writeFileSync(outPath, out);
    try { await mediaStore.putFile(outPath); } catch (_) {}
    return true;
  } catch (e) {
    try { require('../lib/logger').warn?.(`refThumb failed ${imageUrl}: ${e.message}`); } catch (_) {}
    return false;
  }
}

module.exports = { makeRefThumb, thumbName };
