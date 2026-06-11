/**
 * costMeter 데모 — DB/네트워크 없이 실행.
 *   node src/studio/costMeter.demo.js
 * 실제 studio SKU별 원가·매출·마진을 계산하고, 적자(is_loss) SKU를 감지하는지 검증한다.
 */
const { meterGeneration } = require('./costMeter');

// 새 크레딧 가격(docs/가격_재설계.md): 사진 4cr, 릴스5초 8cr/10초 16cr, Runway 기본.
const SCENARIOS = [
  { label: 'Photo set (4) · Standard',        outputType: 'image', provider: 'nano-banana', creditsCharged: 4 },
  { label: 'Photo set (4) · HD',              outputType: 'image', provider: 'nano-banana', quality: 'hd',  creditsCharged: 5 },
  { label: 'Photo set (4) · 4K + caption',    outputType: 'image', provider: 'nano-banana', quality: '4k', caption: true, creditsCharged: 8 },
  { label: 'Reel 5s · Runway (기본)',          outputType: 'reel',  provider: 'runway', creditsCharged: 8 },
  { label: 'Reel 10s · Runway',               outputType: 'reel',  provider: 'runway', count: 1, creditsCharged: 16 },
  { label: 'Reel 5s · Kling (고가옵션)',       outputType: 'reel',  provider: 'kling',  creditsCharged: 8 },
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
