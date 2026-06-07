/**
 * costMeter 데모 — DB/네트워크 없이 실행.
 *   node src/studio/costMeter.demo.js
 * 실제 studio SKU별 원가·매출·마진을 계산하고, 적자(is_loss) SKU를 감지하는지 검증한다.
 */
const { meterGeneration } = require('./costMeter');

// studio.html의 크레딧 가격을 그대로 반영한 시나리오
const SCENARIOS = [
  { label: 'Photo set (4) · Standard',        outputType: 'image', provider: 'nano-banana', creditsCharged: 2 },
  { label: 'Photo set (4) · HD',              outputType: 'image', provider: 'nano-banana', quality: 'hd',  creditsCharged: 3 },
  { label: 'Photo set (4) · 4K + caption',    outputType: 'image', provider: 'nano-banana', quality: '4k', caption: true, creditsCharged: 5 },
  { label: 'Reel 5s · Kling',                 outputType: 'reel',  provider: 'kling',  creditsCharged: 6 },
  { label: 'Reel 5s · Runway + priority',     outputType: 'reel',  provider: 'runway', creditsCharged: 7 },
  { label: 'UGC ad · A/B ×3 (Kling lipsync)', outputType: 'reel',  provider: 'kling', ugc: true, variants: 3, caption: true, creditsCharged: 24 },
  // 의도적 과소책정 — 적자 감지 확인용
  { label: 'UGC ad · UNDERPRICED (1cr)',      outputType: 'reel',  provider: 'runway', ugc: true, creditsCharged: 1 },
];

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

console.log('\n  SKU                                  charged   cost$    rev$   margin$   margin%   loss');
console.log('  ' + '-'.repeat(86));
let losses = 0;
for (const sc of SCENARIOS) {
  const r = meterGeneration({ userId: 'u_demo', renderJobId: 'rj_demo', recipeId: 'rc_demo', ...sc });
  if (r.is_loss) losses++;
  console.log(
    '  ' + pad(sc.label, 36) +
    padL('◈' + r.credits_charged, 7) +
    padL('$' + r.actual_cost_usd.toFixed(3), 9) +
    padL('$' + r.revenue_usd.toFixed(2), 8) +
    padL('$' + r.margin_usd.toFixed(3), 9) +
    padL(r.margin_pct + '%', 9) +
    padL(r.is_loss ? '⚠ LOSS' : 'ok', 9)
  );
}
console.log('  ' + '-'.repeat(86));
console.log(`\n  ${SCENARIOS.length} SKU 계산 완료 · 적자 감지: ${losses}건\n`);
