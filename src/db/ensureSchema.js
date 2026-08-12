/**
 * 지연 스키마 생성(self-ensure) 공용 헬퍼.
 *
 * 문제: `let _ready = false; if (_ready) return; await query('CREATE TABLE IF NOT EXISTS ...'); _ready = true;`
 *   패턴은 두 가지 경쟁에 취약하다 —
 *   ① **프로세스 내부**: 플래그가 await 이후에 세팅되므로 동시 요청 2개가 모두 CREATE로 진입한다.
 *   ② **프로세스 간**: `CREATE TABLE IF NOT EXISTS` 는 Postgres에서 동시 실행 안전하지 않다.
 *      두 세션이 같은 순간에 만들면 한쪽이 duplicate key(pg_type/pg_class) 로 죽는다.
 *   실제로 dev에서 빈 DB에 동시 요청이 들어가 500이 났다(레거시·Nest 비교 중 관측).
 *
 * 해결: 진행 중인 Promise를 키별로 캐시해 동시 호출을 하나로 합치고(①),
 *   "이미 있음" 계열 에러는 성공으로 간주한다(②).
 */
const { query } = require('./client');

/** 동시 생성 시 나오는 "이미 있음" 계열 — 무시해도 안전(원하는 최종 상태가 이미 달성됨) */
const DUPLICATE_CODES = new Set([
  '42P07', // duplicate_table
  '42710', // duplicate_object (인덱스·제약)
  '23505', // unique_violation — pg_type/pg_class 동시 삽입 시
]);

const inflight = new Map();

/**
 * @param {string} key  캐시 키(테이블/모듈 이름)
 * @param {string|string[]} sql  실행할 DDL(여러 개면 순서대로)
 * @returns {Promise<void>} 이미 준비됐거나 방금 준비되면 resolve
 */
function ensureSchema(key, sql) {
  if (inflight.has(key)) return inflight.get(key);

  const statements = Array.isArray(sql) ? sql : [sql];
  const p = (async () => {
    for (const s of statements) {
      try {
        await query(s);
      } catch (err) {
        if (!DUPLICATE_CODES.has(err && err.code)) throw err;
        // 다른 프로세스/요청이 먼저 만든 것 — 원하는 상태이므로 통과.
      }
    }
  })().catch((err) => {
    inflight.delete(key); // 실패는 캐시하지 않는다(다음 요청이 다시 시도)
    throw err;
  });

  inflight.set(key, p);
  return p;
}

module.exports = { ensureSchema };
