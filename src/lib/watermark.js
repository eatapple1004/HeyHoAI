const sharp = require('sharp');
const logger = require('./logger');

/**
 * 무료 티어 표시용 Doppia 워터마크를 이미지 버퍼에 합성한다.
 * 우하단에 반투명 알약(pill) + 다이아몬드 마크 + "Doppia" 워드마크.
 * 합성 실패 시 원본 버퍼를 그대로 반환한다(생성 자체를 막지 않는다).
 *
 * @param {Buffer} inputBuffer  PNG 이미지 버퍼
 * @returns {Promise<Buffer>}   워터마크가 합성된 PNG 버퍼 (실패 시 원본)
 */
async function applyWatermark(inputBuffer) {
  try {
    const meta = await sharp(inputBuffer).metadata();
    const w = meta.width || 1024;
    const h = meta.height || 1024;

    // 이미지 크기에 비례해 스케일
    const fontSize = Math.max(16, Math.round(w * 0.032));
    const padX = Math.round(fontSize * 0.85);
    const padY = Math.round(fontSize * 0.5);
    const gap = Math.round(fontSize * 0.45);
    const diamond = Math.round(fontSize * 0.62); // 다이아몬드 한 변(중심→꼭짓점)
    const text = 'Doppia';
    // 글리프 폭 추정(워드마크 박스 크기 산정용)
    const textW = Math.round(text.length * fontSize * 0.56);

    const pillH = fontSize + padY * 2;
    const pillW = padX + diamond * 2 + gap + textW + padX;
    const margin = Math.round(w * 0.022);
    const x = w - pillW - margin;
    const y = h - pillH - margin;

    // 다이아몬드 중심
    const dcx = x + padX + diamond;
    const dcy = y + pillH / 2;
    const tx = dcx + diamond + gap;
    const ty = y + pillH / 2 + fontSize * 0.35; // baseline 보정

    const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <g opacity="0.78">
    <rect x="${x}" y="${y}" width="${pillW}" height="${pillH}" rx="${pillH / 2}"
          fill="rgba(8,8,14,0.46)" stroke="rgba(255,255,255,0.28)" stroke-width="1"/>
    <polygon points="${dcx},${dcy - diamond} ${dcx + diamond},${dcy} ${dcx},${dcy + diamond} ${dcx - diamond},${dcy}"
             fill="#ffffff"/>
    <text x="${tx}" y="${ty}" font-family="Sora, 'Helvetica Neue', Arial, sans-serif"
          font-size="${fontSize}" font-weight="700" fill="#ffffff"
          letter-spacing="0.5">${text}</text>
  </g>
</svg>`;

    return await sharp(inputBuffer)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toBuffer();
  } catch (err) {
    logger.warn?.('[Watermark] 합성 실패, 원본 반환:', err.message);
    return inputBuffer;
  }
}

module.exports = { applyWatermark };
