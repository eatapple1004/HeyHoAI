/**
 * generate_model_images.js — 로스터 페르소나 → nano-banana 이미지 생성
 * ------------------------------------------------------------------
 * 소스: src/models/roster.v1.js  →  public/img/models/<id>.png (3:4 세로 풀바디 캐스팅컷)
 * provider: nano-banana(gemini-2.5-flash-image). GEMINI_API_KEY 필요(.env).
 *
 * 사용:
 *   node scripts/generate_model_images.js --sample        # 대표 6명(인종군 분산)
 *   node scripts/generate_model_images.js --ids f-east_asian-1,m-mena-2
 *   node scripts/generate_model_images.js --all           # 80명 전부
 *   옵션: --force(기존 파일 덮어쓰기) --limit N
 *
 * 비용: 이미지당 ≈$0.04(gemini flash image). 기본은 기존 파일 스킵.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const sharp = require('sharp');
const roster = require(path.join(ROOT, 'src/models/roster.v1.js'));
const provider = require(path.join(ROOT, 'src/images/providers/nanoBanana.provider.js'));

const OUT_DIR = path.join(ROOT, 'public/img/models');
fs.mkdirSync(OUT_DIR, { recursive: true });

// 대표 샘플 6명(성별·인종군 최대 분산)
const SAMPLE_IDS = [
  'f-east_asian-1', 'f-black_african-1', 'f-hispanic_latino-1',
  'm-white_european-1', 'm-south_asian-1', 'm-southeast_asian-1',
];

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
  console.log(`대상 ${targets.length}명 · 예상비용 ≈$${(targets.length * 0.04).toFixed(2)}\n`);

  let done = 0, skipped = 0, failed = 0;
  for (const p of targets) {
    const outPath = path.join(OUT_DIR, `${p.id}.jpg`);
    if (fs.existsSync(outPath) && !args.force) { skipped++; console.log(`- ${p.id} (${p.name}) 스킵(존재)`); continue; }
    process.stdout.write(`… ${p.id} ${p.name} (${p.descent} ${p.gender}) 생성 중… `);
    try {
      const res = await provider.generate({ prompt: p.prompt, negativePrompt: p.negative, width: 768, height: 1024 });
      const src = (res.metadata && res.metadata.localPath) || (res.url || '').replace('file://', '');
      if (!src || !fs.existsSync(src)) throw new Error('생성물 경로 없음');
      await sharp(src).jpeg({ quality: 85, mozjpeg: true }).toFile(outPath); // PNG→JPG 압축(레포 경량화)
      fs.unlinkSync(src); // tmp 정리
      const kb = Math.round(fs.statSync(outPath).size / 1024);
      done++; console.log(`✓ → ${p.id}.jpg (${kb}KB)`);
    } catch (e) {
      failed++; console.log(`✗ ${e.message}`);
    }
  }
  console.log(`\n완료: 생성 ${done} · 스킵 ${skipped} · 실패 ${failed}`);
}
main().catch(e => { console.error(e); process.exit(1); });
