/**
 * Product Pack — 다개체 합성기(compositor).
 *
 * 왜 필요: 생성모델(nano-banana/kling)은 "정확히 N개의 서로 다른 SKU"를 한 컷에 못 그린다
 *   (실측: 요일 7병 요청 → 6~8병·요일 오류. 폴리시 모드로도 병이 빠짐).
 *   → 멀티오브젝트(로우·기프트세트)는 생성이 아니라 **개별 베이크한 클린 레퍼를 코드로 합성**한다.
 *
 * 전략(오아플 돈워리비애플 실증): 캐논 레퍼들은 같은 베이크라 배경이 거의 동일 →
 *   각 병 중앙 세로 슬라이스를 잘라 **배경 밝기만 공통값으로 정규화**한 뒤 이어붙이면 무이음새.
 *   (P0는 butt-join + 밝기정규화. 미세 이음새 남으면 feather는 후속.)
 *
 * 순수 이미지 처리(sharp) — 생성 크레딧 0.
 */
const sharp = require('sharp');

/**
 * 세로 슬라이스 로우 합성.
 * @param {string[]} refPaths  순서대로(예: MON..SUN) 캐논 레퍼 파일 경로
 * @param {object}   [opt]
 * @param {number}   [opt.bandRatio=0.40]  각 병에서 가져올 중앙 세로 밴드 폭 비율
 * @param {number}   [opt.targetBg=234]    배경 밝기 정규화 목표(0~255)
 * @param {{r,g,b}}  [opt.bg]              캔버스 배경색
 * @param {number}   [opt.quality=92]
 * @returns {Promise<Buffer>} JPEG 버퍼
 */
async function composeRow(refPaths, opt = {}) {
  if (!Array.isArray(refPaths) || refPaths.length < 2) {
    throw new Error('composeRow: 레퍼 2장 이상 필요');
  }
  const bandRatio = opt.bandRatio ?? 0.40;
  const targetBg = opt.targetBg ?? 234;
  const bg = opt.bg ?? { r: 234, g: 230, b: 225 };

  // 1) 각 병 중앙 세로 슬라이스 추출 + 배경 밝기 정규화
  const slices = [];
  for (const p of refPaths) {
    const meta = await sharp(p).metadata();
    const w = meta.width, h = meta.height;
    const bandW = Math.round(w * bandRatio);
    const left = Math.round((w - bandW) / 2);

    // 상단 6% 스트립 평균 밝기 샘플 → gain
    const strip = await sharp(p)
      .extract({ left, top: 0, width: bandW, height: Math.max(4, Math.round(h * 0.06)) })
      .stats();
    const mean = (strip.channels[0].mean + strip.channels[1].mean + strip.channels[2].mean) / 3;
    const gain = targetBg / Math.max(mean, 1);

    const buf = await sharp(p)
      .extract({ left, top: 0, width: bandW, height: h })
      .linear(gain, 0)            // 배경 밝기 통일(전체 곱, gain≈1.0)
      .toColourspace('srgb')
      .png()
      .toBuffer();
    slices.push({ buf, h });
  }

  // 2) 공통 높이로 리사이즈
  const H = Math.min(...slices.map((s) => s.h));
  const resized = [];
  let totalW = 0;
  for (const s of slices) {
    const rb = await sharp(s.buf).resize({ height: H }).png().toBuffer();
    const rm = await sharp(rb).metadata();
    resized.push({ buf: rb, w: rm.width });
    totalW += rm.width;
  }

  // 3) 캔버스에 이어붙이기(butt-join)
  const composites = [];
  let x = 0;
  for (const r of resized) {
    composites.push({ input: r.buf, left: x, top: 0 });
    x += r.w;
  }
  return sharp({ create: { width: totalW, height: H, channels: 3, background: bg } })
    .composite(composites)
    .jpeg({ quality: opt.quality ?? 92, mozjpeg: true })
    .toBuffer();
}

module.exports = { composeRow };
