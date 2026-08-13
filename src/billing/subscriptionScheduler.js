/**
 * 구독 정기청구 스케줄러 — 도래한 구독을 주기적으로 청구한다.
 *
 * ⚠️ **실제 돈이 빠지는 유일한 자동 경로다.** 그래서 기동 자체가 옵트인이다
 *   (`BILLING_SCHEDULER=on` 인 프로세스에서만 src/index.js가 start()를 부른다).
 *   여러 환경이 같은 DB를 보는 구성에서 두 곳이 켜지면 같은 구독을 두 번 집을 수 있다 —
 *   `subscription_charges(subscription_id, period_start)` 유니크 인덱스가 막아주지만,
 *   애초에 켜는 곳을 한 곳으로 두는 게 맞다.
 */
const log = require('../lib/logger')('SubScheduler');
const billing = require('./subscriptionBilling.service');
const portone = require('./portone.service');

/** 청구 확인 주기 — 구독은 월 단위라 시간 단위로 충분하다(분 단위 폴링은 낭비). */
const TICK_MS = 60 * 60 * 1000;
/** 한 틱에 처리할 최대 건수 — PG 레이트리밋·장애 시 피해 범위를 묶는다. */
const BATCH = 50;

let timer = null;
let running = false;

async function tick() {
  if (running) { log.warn('이전 틱이 아직 도는 중 — 이번 틱 건너뜀'); return; }
  running = true;
  try {
    if (!portone.configured()) {
      log.warn('PortOne 미설정 — 정기청구 건너뜀');
      return;
    }
    await billing.chargeDue(BATCH);
  } catch (e) {
    log.error('정기청구 틱 실패:', e.message);
  } finally {
    running = false;
  }
}

function start() {
  if (timer) return;
  // 부팅 직후엔 돌리지 않는다 — 배포·재시작이 잦은 시점에 청구가 몰리면 원인 추적이 어렵다.
  timer = setInterval(tick, TICK_MS);
  log.warn(`⚠️ 구독 정기청구 스케줄러 ON — ${TICK_MS / 60000}분 주기, 배치 ${BATCH}건 (실청구 발생)`);
}

function stop() {
  if (timer) { clearInterval(timer); timer = null; }
}

module.exports = { start, stop, tick };
