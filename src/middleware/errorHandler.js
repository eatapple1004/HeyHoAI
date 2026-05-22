const { ZodError } = require('zod');
const log = require('../lib/logger')('Error');

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

  // Anthropic API 에러
  if (err.status && err.error) {
    log.error('Anthropic API:', err.message);
    return res.status(502).json({
      success: false,
      error: 'AI provider error',
      message: err.message,
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
