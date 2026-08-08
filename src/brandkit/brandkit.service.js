const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { query } = require('../db/client');

// 브랜드킷 로직 단일소스 — 레거시 라우트(brandkit.route.js)와 Nest(nest/brandkit)가 함께 사용한다.
//   (NestJS 이관 중 로직/업로드 설정이 두 벌로 갈라지지 않도록 라우트에서 분리했다.)

// 로고 업로드 경로·파일명 규칙(레거시와 동일) — multer 설정을 양쪽이 공유한다.
const uploadDir = path.join(process.cwd(), 'tmp', 'images');
fs.mkdirSync(uploadDir, { recursive: true });

const LOGO_MAX_BYTES = 5 * 1024 * 1024;

/** multer diskStorage 옵션(레거시 라우트/Nest FileInterceptor 공용) */
function multerOptions(multer) {
  return {
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (_req, file, cb) =>
        cb(null, `logo_${crypto.randomUUID()}${path.extname(file.originalname) || '.png'}`),
    }),
    limits: { fileSize: LOGO_MAX_BYTES },
  };
}

/** 사용자 브랜드킷 조회 (없으면 기본값) */
async function getBrandKit(userId) {
  const r = await query('SELECT logo_url, primary_color, font_name, enabled FROM brand_kits WHERE user_id = $1', [userId]);
  return r.rows[0] || { logo_url: null, primary_color: null, font_name: null, enabled: false };
}

/** 색상·폰트·사용여부 부분 수정(upsert). 미전달 필드는 기존값 유지. */
async function updateBrandKit(userId, { primaryColor, fontName, enabled } = {}) {
  const r = await query(
    `INSERT INTO brand_kits (user_id, primary_color, font_name, enabled, updated_at)
     VALUES ($1, $2, $3, COALESCE($4, false), now())
     ON CONFLICT (user_id) DO UPDATE SET
       primary_color = COALESCE($2, brand_kits.primary_color),
       font_name     = COALESCE($3, brand_kits.font_name),
       enabled       = COALESCE($4, brand_kits.enabled),
       updated_at    = now()
     RETURNING logo_url, primary_color, font_name, enabled`,
    [userId, primaryColor || null, fontName || null, typeof enabled === 'boolean' ? enabled : null]
  );
  return r.rows[0];
}

/** 업로드된 로고 파일명을 브랜드킷에 반영(upsert) */
async function setLogo(userId, filename) {
  const logoUrl = `/images/${filename}`;
  const r = await query(
    `INSERT INTO brand_kits (user_id, logo_url, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE SET logo_url = $2, updated_at = now()
     RETURNING logo_url, primary_color, font_name, enabled`,
    [userId, logoUrl]
  );
  return r.rows[0];
}

module.exports = { uploadDir, LOGO_MAX_BYTES, multerOptions, getBrandKit, updateBrandKit, setLogo };
