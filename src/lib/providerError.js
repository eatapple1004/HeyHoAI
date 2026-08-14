/**
 * AI 제공자(Anthropic·OpenAI·Gemini) 에러 분류.
 *
 * 왜 필요한가 — 두 가지를 구분하지 못해서 실제로 사고가 났다(2026-08-14 prod).
 *   ① 재시도하면 풀리는 것(과부하·레이트리밋)
 *   ② 재시도해도 절대 안 풀리는 것(계정 잔액 소진·키 무효)
 * ②인데 "잠시 후 다시 시도해 주세요"라고 안내하면 사용자는 계속 눌러보고,
 * 운영자는 문제를 늦게 안다. Anthropic 잔액이 0이 되어 모든 생성이 멈췄는데
 * 화면엔 "Server is busy (502)"만 떠서 원인을 찾는 데 오래 걸렸다.
 *
 * ⚠️ 상태코드는 **502를 쓰지 않는다.** Cloudflare가 오리진 502의 본문을 자기 에러 페이지로
 *   통째로 갈아치워(`content-length: 16`, "error code: 502") 우리가 넣은 메시지가 사용자에게
 *   도달하지 못한다. 503은 본문 그대로 통과한다(실측 확인).
 */

/** 제공자 에러인가 — SDK들이 공통으로 status + error 를 달아 준다. */
function isProviderError(err) {
  return Boolean(err && err.status && err.error);
}

function messageOf(err) {
  const m = err && (err.message || (err.error && (err.error.message || err.error.type)) || '');
  return String(m || '');
}

/**
 * 분류 결과
 *   kind        out_of_credit | auth | rate_limit | overloaded | other
 *   retryable   사용자가 다시 눌러서 풀릴 여지가 있는가
 *   status      우리가 응답할 HTTP 상태(502 금지 — 위 주석 참조)
 *   userMessage 사용자에게 보일 문구(정직하게. 안 풀릴 일에 "잠시 후" 금지)
 */
function classifyProviderError(err) {
  const msg = messageOf(err).toLowerCase();
  const status = Number(err && err.status) || 0;

  // 계정 잔액 소진 — Anthropic "credit balance is too low",
  //   OpenAI "insufficient_quota", Gemini/Vertex "billing"·"quota exceeded".
  if (
    msg.includes('credit balance is too low') ||
    msg.includes('insufficient_quota') ||
    msg.includes('insufficient quota') ||
    (msg.includes('billing') && (msg.includes('enable') || msg.includes('account')))
  ) {
    return {
      kind: 'out_of_credit',
      retryable: false,
      status: 503,
      userMessage:
        'AI 생성이 일시 중단되었습니다. 다시 시도해도 해결되지 않으니 support@doppia.ai 로 알려주세요. (사용하신 크레딧은 자동 환불됩니다)',
      operator: '🔴 AI 제공자 잔액 소진 — 콘솔에서 크레딧을 충전해야 복구됩니다(자동 충전 권장).',
    };
  }

  // 키 무효·권한 — 설정을 고쳐야 풀린다.
  if (status === 401 || status === 403 || msg.includes('invalid x-api-key') || msg.includes('authentication')) {
    return {
      kind: 'auth',
      retryable: false,
      status: 503,
      userMessage:
        'AI 생성이 일시 중단되었습니다. 다시 시도해도 해결되지 않으니 support@doppia.ai 로 알려주세요. (사용하신 크레딧은 자동 환불됩니다)',
      operator: '🔴 AI 제공자 인증 실패 — API 키가 무효하거나 권한이 없습니다(.env 확인).',
    };
  }

  // 레이트리밋·과부하 — 잠시 후면 실제로 풀린다.
  if (status === 429) {
    return {
      kind: 'rate_limit',
      retryable: true,
      status: 503,
      userMessage: '요청이 몰려 잠시 대기가 필요합니다. 30초 후 다시 시도해 주세요.',
      operator: '⚠️ AI 제공자 레이트리밋(429).',
    };
  }
  if (status === 529 || status >= 500) {
    return {
      kind: 'overloaded',
      retryable: true,
      status: 503,
      userMessage: 'AI 서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.',
      operator: '⚠️ AI 제공자 과부하/장애.',
    };
  }

  return {
    kind: 'other',
    retryable: true,
    status: 503,
    userMessage: 'AI 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    operator: '⚠️ AI 제공자 오류.',
  };
}

module.exports = { isProviderError, classifyProviderError };
