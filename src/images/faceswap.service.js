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
const FF_ENHANCER = String(env.FACEFUSION_FACE_ENHANCER ?? '').trim(); // 기본 OFF(합성 어우러짐 우선). 값 넣으면 인핸서 켜짐
const FF_ENHANCER_BLEND = Number(env.FACEFUSION_FACE_ENHANCER_BLEND ?? 80);      // 인핸서 강도 0~100
const FF_OUTPUT_QUALITY = Number(env.FACEFUSION_OUTPUT_QUALITY ?? 100);          // 출력 품질 0~100
// combo 모드: 스왑 2회(B=boost만·톤, D=boost+gpen·디테일) → 주파수합성. 최대 선명 + 몸 톤 어우러짐 둘 다.
const FF_COMBO = /^(1|true|on|yes)$/i.test(String(env.FACEFUSION_COMBO ?? '').trim());
const FF_COMBO_ENHANCER = String(env.FACEFUSION_COMBO_ENHANCER ?? 'gpen_bfr_1024').trim();
const FF_COMBO_DETAIL_SWAPPER = String(env.FACEFUSION_COMBO_DETAIL_SWAPPER ?? '').trim(); // D패스 스와퍼(빈값=B와 동일)
const FF_COMBO_BLEND = Number(env.FACEFUSION_COMBO_BLEND ?? 80);
const FF_COMBO_RADIUS = Number(env.FACEFUSION_COMBO_RADIUS ?? 12);
const FF_COMBO_GAIN = Number(env.FACEFUSION_COMBO_GAIN ?? 1);          // 고주파 증폭(>1=더 선명)
const FF_MASK_BLUR = String(env.FACEFUSION_MASK_BLUR ?? '').trim();    // 경계 페더링(빈값=facefusion 기본)
const FF_MASK_TYPES = String(env.FACEFUSION_MASK_TYPES ?? '').trim();  // 마스크 타입(예 "box occlusion")
const COMBINE_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'freq_combine.py'); // 주파수합성 헬퍼(facefusion venv python으로 실행)
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
function runFacefusion({ sourcePath, targetPath, outputPath, jobId, pixelBoost = FF_PIXEL_BOOST, enhancer = FF_ENHANCER, enhancerBlend = FF_ENHANCER_BLEND, swapperModel = FF_MODEL }) {
  return new Promise((resolve, reject) => {
    // processors: 스왑 먼저, 인핸서(설정 시)는 스왑 후 마감. 순서 중요. (combo 패스별로 스와퍼·인핸서 다를 수 있음)
    const processors = ['face_swapper'];
    if (enhancer) processors.push('face_enhancer');
    const args = [
      'facefusion.py', 'headless-run',
      '--processors', ...processors,
      '--face-swapper-model', swapperModel,
    ];
    if (pixelBoost) args.push('--face-swapper-pixel-boost', pixelBoost);
    if (enhancer) args.push('--face-enhancer-model', enhancer, '--face-enhancer-blend', String(enhancerBlend));
    args.push(
      '-s', sourcePath, '-t', targetPath, '-o', outputPath,
      '--execution-providers', ...FF_PROVIDERS,
      '--output-image-quality', String(FF_OUTPUT_QUALITY),
    );
    if (FF_MASK_BLUR) args.push('--face-mask-blur', FF_MASK_BLUR);                        // 경계 페더링(턱·목 이음새 완화)
    if (FF_MASK_TYPES) args.push('--face-mask-types', ...FF_MASK_TYPES.split(/\s+/));     // occlusion 등(머리카락 가림)
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

// 주파수합성 헬퍼 실행 — B(톤)·D(디테일) → outputPath. facefusion venv python(PIL/numpy 보유)으로 셸아웃.
function runCombine({ bPath, dPath, outputPath, jobId }) {
  return new Promise((resolve, reject) => {
    const args = [COMBINE_SCRIPT, bPath, dPath, outputPath, String(FF_COMBO_RADIUS), String(FF_OUTPUT_QUALITY), String(FF_COMBO_GAIN)];
    const child = spawn(FF_PY, args, { cwd: FF_DIR, detached: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    let settled = false;
    child.stderr.on('data', (d) => { if (stderr.length < 4000) stderr += d.toString(); });
    const timer = setTimeout(() => {
      if (settled) return; settled = true;
      try { process.kill(-child.pid, 'SIGKILL'); } catch (e) {}
      reject(new Error(`combine timeout (job ${jobId})`));
    }, 60000);
    child.on('error', (err) => { if (settled) return; settled = true; clearTimeout(timer); reject(err); });
    child.on('close', (code) => {
      if (settled) return; settled = true; clearTimeout(timer);
      if (code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) resolve();
      else reject(new Error(`combine failed exit=${code} (job ${jobId}) ${stderr.slice(-300).replace(/\s+/g, ' ')}`));
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
    let tag;
    if (FF_COMBO) {
      // 2-pass 순차(await로 항상 facefusion 1개만 — 메모리 스파이크 없음): B=boost만(톤), D=boost+gpen(디테일) → 주파수합성.
      const bPath = path.join(dir, 'b.jpg');
      const dPath = path.join(dir, 'd.jpg');
      const detailSwapper = FF_COMBO_DETAIL_SWAPPER || FF_MODEL;
      await runFacefusion({ sourcePath: sourceFacePath, targetPath, outputPath: bPath, jobId, enhancer: '' }); // B=inswapper(정체성/톤)
      await runFacefusion({ sourcePath: sourceFacePath, targetPath, outputPath: dPath, jobId, enhancer: FF_COMBO_ENHANCER, enhancerBlend: FF_COMBO_BLEND, swapperModel: detailSwapper }); // D=디테일 소스
      await runCombine({ bPath, dPath, outputPath, jobId });
      tag = `combo ${FF_MODEL}+D:${detailSwapper} boost=${FF_PIXEL_BOOST} B톤+${FF_COMBO_ENHANCER}@${FF_COMBO_BLEND}디테일 r=${FF_COMBO_RADIUS} gain=${FF_COMBO_GAIN}${FF_MASK_BLUR ? ' maskblur=' + FF_MASK_BLUR : ''}${FF_MASK_TYPES ? ' mask=' + FF_MASK_TYPES : ''}`;
    } else {
      await runFacefusion({ sourcePath: sourceFacePath, targetPath, outputPath, jobId });
      tag = `${FF_MODEL}${FF_PIXEL_BOOST ? ' boost=' + FF_PIXEL_BOOST : ''}${FF_ENHANCER ? ' enh=' + FF_ENHANCER + '@' + FF_ENHANCER_BLEND : ''}${FF_MASK_BLUR ? ' maskblur=' + FF_MASK_BLUR : ''}${FF_MASK_TYPES ? ' mask=' + FF_MASK_TYPES : ''}`;
    }
    const ms = Number((process.hrtime.bigint() - t0) / 1000000n);
    const buf = fs.readFileSync(outputPath); // 성공 버퍼만 반환(실패는 위에서 throw)
    log.info(`job ${jobId} swap ok ${ms}ms ${buf.length}B [${tag}]`);
    return buf;
  } finally {
    release();
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} // 무조건 청소
  }
}

module.exports = { swapFace, cleanupOnBoot, TMP_ROOT };
