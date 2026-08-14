const { ZodError } = require('zod');
const log = require('../lib/logger')('Error');
const { isProviderError, classifyProviderError } = require('../lib/providerError');

function errorHandler(err, _req, res, _next) {
  // Zod 검증 에러 (zod 4: err.issues; zod 3 호환: err.errors)
  if (err instanceof ZodError) {
    const issues = err.issues || err.errors || [];
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: issues.map((e) => ({
        path: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
        message: e.message,
      })),
    });
  }

  // 커스텀 에러 (statusCode가 있는 경우)
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.violations && { violations: err.violations }),
    });
  }

  // AI 제공자 에러 — 재시도로 풀릴 것과 아닌 것을 구분해 문구를 정직하게 낸다.
  //   ⚠️ 502를 쓰지 않는다. Cloudflare가 오리진 502의 본문을 자기 에러 페이지로 갈아치워
  //   우리가 넣은 메시지가 사용자에게 도달하지 못한다(2026-08-14 실측). 503은 그대로 통과한다.
  if (isProviderError(err)) {
    const c = classifyProviderError(err);
    log.error(`${c.operator} [${c.kind}] ${err.message}`);
    return res.status(c.status).json({
      success: false,
      error: c.userMessage,
      code: 'AI_PROVIDER_' + c.kind.toUpperCase(),
      retryable: c.retryable,
    });
  }

  // 기타 에러
  log.error('Unhandled:', err.message, err.stack?.slice(0, 300));
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}

module.exports = { errorHandler };
