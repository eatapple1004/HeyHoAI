// faceswap.service.js — facefusion CLI 래퍼 (On Model stage-2 얼굴 스왑).
// 우리 AI 합성 로스터 얼굴(source)을 stage-1 생성 바디(target)에 스왑한다.
//   설계: docs/onmodel_faceswap_설계_2026-07-18.md · 자기청소 규약: docs/섹션명령서/14_underwear_작업기록.md §5.
// facefusion 코드는 미수정(CLI 셸아웃만). facefusion 자체 nsfw(nsfw_1)+age(fairface) 게이트가 안전 3층.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { env } = require('../config');
const logger = require('../lib/logger');
const log = logger('Faceswap');

const FF_DIR = env.FACEFUSION_DIR || path.join(os.homedir(), 'facefusion');
const FF_PY = env.FACEFUSION_PYTHON || path.join(FF_DIR, 'venv', 'bin', 'python');
const FF_MODEL = env.FACEFUSION_MODEL || 'inswapper_128';
const FF_PROVIDERS = String(env.FACEFUSION_PROVIDERS || 'cpu').split(',').map((s) => s.trim()).filter(Boolean);
// 화질 튜닝(2026-07-19): boost=스왑 고픽셀 재처리(정직한 선명화), enhancer=gfpgan 피부결 마감. 빈값=해당 단계 끔.
const FF_PIXEL_BOOST = String(env.FACEFUSION_PIXEL_BOOST ?? '512x512').trim();   // '' 이면 boost 끔
const FF_ENHANCER = String(env.FACEFUSION_FACE_ENHANCER ?? 'gpen_bfr_1024').trim(); // '' 이면 인핸서 끔(gfpgan=더 매끈)
const FF_ENHANCER_BLEND = Number(env.FACEFUSION_FACE_ENHANCER_BLEND ?? 80);      // 인핸서 강도 0~100
const FF_OUTPUT_QUALITY = Number(env.FACEFUSION_OUTPUT_QUALITY ?? 100);          // 출력 품질 0~100
const TIMEOUT_MS = Number(env.FACEFUSION_TIMEOUT_MS || 120000); // 이미지당 하드 타임아웃(좀비 방지)
const MAX_CONCURRENCY = Number(env.FACEFUSION_CONCURRENCY || 1); // facefusion 무더기 방지(자원 보호)
const TMP_ROOT = path.join(process.cwd(), 'tmp', 'faceswap');

// ── 동시성 캡 (전역 세마포어) ──
let active = 0;
const waiters = [];
function acquire() {
  return new Promise((resolve) => {
    if (active < MAX_CONCURRENCY) { active++; resolve(); } else { waiters.push(resolve); }
  });
}
function release() {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) { active++; next(); }
}

// 부팅 시 좀비 temp 전부 청소(크래시/재배포로 남은 tmp/faceswap/*).
function cleanupOnBoot() {
  try { fs.rmSync(TMP_ROOT, { recursive: true, force: true }); log.info('tmp/faceswap 부팅 청소 완료'); } catch (e) {}
}

// facefusion headless-run — detached 프로세스 그룹 + 하드 타임아웃(그룹 몰살).
function runFacefusion({ sourcePath, targetPath, outputPath, jobId }) {
  return new Promise((resolve, reject) => {
    // processors: 스왑 먼저, 인핸서(설정 시)는 스왑 후 마감. 순서 중요.
    const processors = ['face_swapper'];
    if (FF_ENHANCER) processors.push('face_enhancer');
    const args = [
      'facefusion.py', 'headless-run',
      '--processors', ...processors,
      '--face-swapper-model', FF_MODEL,
    ];
    if (FF_PIXEL_BOOST) args.push('--face-swapper-pixel-boost', FF_PIXEL_BOOST);
    if (FF_ENHANCER) args.push('--face-enhancer-model', FF_ENHANCER, '--face-enhancer-blend', String(FF_ENHANCER_BLEND));
    args.push(
      '-s', sourcePath, '-t', targetPath, '-o', outputPath,
      '--execution-providers', ...FF_PROVIDERS,
      '--output-image-quality', String(FF_OUTPUT_QUALITY),
    );
    const child = spawn(FF_PY, args, { cwd: FF_DIR, detached: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    let settled = false;
    child.stderr.on('data', (d) => { if (stderr.length < 4000) stderr += d.toString(); });
    const timer = setTimeout(() => {
      if (settled) return; settled = true;
      try { process.kill(-child.pid, 'SIGKILL'); } catch (e) {} // 그룹(-pid) 몰살
      reject(new Error(`faceswap timeout ${TIMEOUT_MS}ms (job ${jobId})`));
    }, TIMEOUT_MS);
    child.on('error', (err) => { if (settled) return; settled = true; clearTimeout(timer); reject(err); });
    child.on('close', (code) => {
      if (settled) return; settled = true; clearTimeout(timer);
      if (code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) resolve();
      // 실패·nsfw게이트 차단·산출 없음 = 실패로 전파(안전: 반쪽 산출 원천봉쇄).
      else reject(new Error(`faceswap failed exit=${code} (job ${jobId}) ${stderr.slice(-500).replace(/\s+/g, ' ')}`));
    });
  });
}

/**
 * source 얼굴(로스터)을 target 바디(stage-1)에 스왑. 성공 시 결과 이미지 버퍼 반환.
 * 작업별 격리 temp에서 실행하고 finally에서 무조건 청소(좀비 방지).
 * @param {{ sourceFacePath: string, targetBuffer: Buffer, jobId: string|number }} p
 * @returns {Promise<Buffer>}
 */
async function swapFace({ sourceFacePath, targetBuffer, jobId }) {
  if (!fs.existsSync(sourceFacePath)) throw new Error(`source face not found: ${sourceFacePath} (job ${jobId})`);
  if (!targetBuffer || !targetBuffer.length) throw new Error(`empty target buffer (job ${jobId})`);
  const dir = path.join(TMP_ROOT, String(jobId));
  const targetPath = path.join(dir, 'target.jpg');
  const outputPath = path.join(dir, 'out.jpg');
  await acquire();
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(targetPath, targetBuffer);
    const t0 = process.hrtime.bigint();
    await runFacefusion({ sourcePath: sourceFacePath, targetPath, outputPath, jobId });
    const ms = Number((process.hrtime.bigint() - t0) / 1000000n);
    const buf = fs.readFileSync(outputPath); // 성공 버퍼만 반환(실패는 위에서 throw)
    log.info(`job ${jobId} swap ok ${ms}ms ${buf.length}B [${FF_MODEL}${FF_PIXEL_BOOST ? ' boost=' + FF_PIXEL_BOOST : ''}${FF_ENHANCER ? ' enh=' + FF_ENHANCER + '@' + FF_ENHANCER_BLEND : ''}]`);
    return buf;
  } finally {
    release();
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} // 무조건 청소
  }
}

module.exports = { swapFace, cleanupOnBoot, TMP_ROOT };
