/**
 * ─── 비동기 작업 (2026-10-16) — Cloudflare 100초 제한 회피 ───
 *
 * dev.doppia.ai 등은 Cloudflare 뒤라 응답이 100초를 넘으면 브라우저 쪽 연결이 끊긴다(nginx 499 · CF 524).
 * Face swap(~130s)·Editor 업스케일 ×16 같은 긴 작업은 ?async=1 로 받으면 jobId 를 바로 돌려주고
 * 실제 처리는 같은 프로세스에서 계속한다 → 화면이 GET /api/generate/jobs/:id 로 결과를 가져간다.
 *
 * 저장소는 프로세스 메모리 — 세 환경 모두 pm2 instances:1 이라 충분하다(ecosystem.config.js).
 * 재시작되면 진행 중 작업 상태는 사라지지만 결과물은 핸들러가 DB·Library 에 이미 저장한다(화면은 "Library 확인" 안내).
 * 인스턴스를 늘리면 이 저장소를 DB/Redis 로 옮겨야 한다.
 */
const crypto = require('crypto');
const logger = require('./logger');

const TTL_MS = 60 * 60 * 1000; // 끝난 작업은 1시간 보관
const jobs = new Map();

function prune() {
  const now = Date.now();
  for (const [id, j] of jobs) if (j.doneAt && now - j.doneAt > TTL_MS) jobs.delete(id);
}

/** run() → Promise<{ status, body }> 를 백그라운드로 돌리고 jobId 반환 */
function start(userId, kind, run) {
  prune();
  const id = crypto.randomUUID();
  const job = { id, userId, kind, status: 'running', createdAt: Date.now(), doneAt: null, result: null };
  jobs.set(id, job);
  Promise.resolve().then(run).then((r) => { job.result = r; }).catch((e) => {
    logger.warn({ err: e && e.message, kind }, 'async job crashed');
    job.result = { status: 500, body: { success: false, error: 'Server error — check your Library before retrying.' } };
  }).finally(() => { job.status = 'done'; job.doneAt = Date.now(); });
  return id;
}

/** 내 작업만 — 없으면 null */
function get(userId, id) {
  const j = jobs.get(String(id || ''));
  if (!j || j.userId !== userId) return null;
  return { id: j.id, kind: j.kind, status: j.status, elapsedMs: (j.doneAt || Date.now()) - j.createdAt, result: j.result };
}

module.exports = { start, get };
