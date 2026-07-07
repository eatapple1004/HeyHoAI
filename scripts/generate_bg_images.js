/**
 * generate_bg_images.js — 배경 로스터 → nano-banana 프리뷰 이미지
 * ------------------------------------------------------------------
 * 소스: src/backgrounds/roster.v1.js → public/img/backgrounds/<id>.jpg (3:4, 모델 in scene)
 * provider: nano-banana(gemini-2.5-flash-image). GEMINI_API_KEY 필요.
 *
 * 사용:
 *   node scripts/generate_bg_images.js --sample      # 카테고리별 1개(8개)
 *   node scripts/generate_bg_images.js --all
 *   node scripts/generate_bg_images.js --ids bg-studio-1,bg-nature-3
 *   옵션: --force --limit N
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.join(__dirname, '..');
const roster = require(path.join(ROOT, 'src/backgrounds/roster.v1.js'));
const provider = require(path.join(ROOT, 'src/images/providers/nanoBanana.provider.js'));

const OUT_DIR = path.join(ROOT, 'public/img/backgrounds');
fs.mkdirSync(OUT_DIR, { recursive: true });

// 카테고리별 대표 1개 = 8개
const SAMPLE_IDS = ['bg-studio-1', 'bg-home-1', 'bg-venue-1', 'bg-urban-1', 'bg-architectural-1', 'bg-nature-1', 'bg-golden-1', 'bg-seasonal-1'];

function parseArgs(argv) {
  const a = { mode: null, ids: [], force: false, limit: Infinity };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--sample') a.mode = 'sample';
    else if (t === '--all') a.mode = 'all';
    else if (t === '--force') a.force = true;
    else if (t === '--ids') { a.mode = 'ids'; a.ids = (argv[++i] || '').split(',').map(s => s.trim()).filter(Boolean); }
    else if (t === '--limit') a.limit = parseInt(argv[++i], 10) || Infinity;
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!process.env.GEMINI_API_KEY) { console.error('✗ GEMINI_API_KEY 미설정'); process.exit(1); }

  let targets;
  if (args.mode === 'sample') targets = roster.filter(p => SAMPLE_IDS.includes(p.id));
  else if (args.mode === 'ids') targets = roster.filter(p => args.ids.includes(p.id));
  else if (args.mode === 'all') targets = roster.slice();
  else { console.error('모드 지정 필요: --sample | --ids a,b | --all'); process.exit(1); }

  targets = targets.slice(0, args.limit);
  console.log(`대상 ${targets.length}개 · 예상비용 ≈$${(targets.length * 0.04).toFixed(2)}\n`);

  let done = 0, skipped = 0, failed = 0;
  for (const p of targets) {
    const outPath = path.join(OUT_DIR, `${p.id}.jpg`);
    if (fs.existsSync(outPath) && !args.force) { skipped++; console.log(`- ${p.id} (${p.name}) 스킵(존재)`); continue; }
    process.stdout.write(`… ${p.id} ${p.name} (${p.category}) 생성 중… `);
    try {
      const res = await provider.generate({ prompt: p.preview_prompt, negativePrompt: p.negative, width: 768, height: 1024 });
      const src = (res.metadata && res.metadata.localPath) || (res.url || '').replace('file://', '');
      if (!src || !fs.existsSync(src)) throw new Error('생성물 경로 없음');
      await sharp(src).jpeg({ quality: 85, mozjpeg: true }).toFile(outPath);
      fs.unlinkSync(src);
      const kb = Math.round(fs.statSync(outPath).size / 1024);
      done++; console.log(`✓ → ${p.id}.jpg (${kb}KB)`);
    } catch (e) {
      failed++; console.log(`✗ ${e.message}`);
    }
  }
  console.log(`\n완료: 생성 ${done} · 스킵 ${skipped} · 실패 ${failed}`);
}
main().catch(e => { console.error(e); process.exit(1); });
