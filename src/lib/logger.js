const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.cwd(), 'logs');
fs.mkdirSync(LOG_DIR, { recursive: true });

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const LOG_LEVEL = LEVELS[(process.env.LOG_LEVEL || 'debug').toLowerCase()] || 0;

// 날짜별 로그 파일 (YYYY-MM-DD.log)
function getLogFile() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `${date}.log`);
}

function timestamp() {
  return new Date().toISOString();
}

function formatArgs(args) {
  return args.map(a => {
    if (a === null || a === undefined) return String(a);
    if (typeof a === 'object') {
      try { return JSON.stringify(a); } catch { return String(a); }
    }
    return String(a);
  }).join(' ');
}

function write(level, tag, args) {
  if (LEVELS[level] < LOG_LEVEL) return;

  const ts = timestamp();
  const prefix = tag ? `[${tag}]` : '';
  const message = formatArgs(args);
  const line = `${ts} ${level.toUpperCase().padEnd(5)} ${prefix} ${message}`;

  // 콘솔 출력
  const consoleFn = level === 'error' ? console.error
    : level === 'warn' ? console.warn
    : console.log;
  consoleFn(line);

  // 파일 기록
  try {
    fs.appendFileSync(getLogFile(), line + '\n');
  } catch {}
}

/**
 * 태그 기반 로거 생성
 * const log = logger('Audio');
 * log.info('started');        → "2026-04-29T12:00:00.000Z INFO  [Audio] started"
 * log.error('failed', err);   → "2026-04-29T12:00:00.000Z ERROR [Audio] failed {...}"
 */
function logger(tag) {
  return {
    debug: (...args) => write('debug', tag, args),
    info: (...args) => write('info', tag, args),
    warn: (...args) => write('warn', tag, args),
    error: (...args) => write('error', tag, args),
  };
}

// 기본 로거 (태그 없음)
logger.debug = (...args) => write('debug', '', args);
logger.info = (...args) => write('info', '', args);
logger.warn = (...args) => write('warn', '', args);
logger.error = (...args) => write('error', '', args);

module.exports = logger;
