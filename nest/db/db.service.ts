import { Injectable } from '@nestjs/common';
import * as path from 'path';

/**
 * DB 접근 프로바이더 — Spring의 JdbcTemplate 자리.
 *   커넥션 풀은 레거시 src/db/client.js 단일소스를 그대로 쓴다(풀을 두 개 만들면 커넥션이 두 배가 된다).
 *   리포지토리는 이 서비스만 주입받아 SQL을 실행한다.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const client = require(path.join(__dirname, '..', '..', 'src', 'db', 'client.js'));

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

/** 동시 생성 시 나오는 "이미 있음" 계열 — 무시해도 안전(원하는 최종 상태가 이미 달성됨) */
const DUPLICATE_CODES = new Set([
  '42P07', // duplicate_table
  '42710', // duplicate_object (인덱스·제약)
  '23505', // unique_violation — pg_type/pg_class 동시 삽입 시
]);

@Injectable()
export class DbService {
  private readonly schemaInflight = new Map<string, Promise<void>>();
  /** 파라미터 바인딩 쿼리($1, $2 …) — SQL 인젝션 방지 */
  query<T = any>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return client.query(sql, params);
  }

  /** 트랜잭션이 필요한 리포지토리가 직접 커넥션을 잡을 때 사용 */
  get pool() {
    return client.pool;
  }

  /**
   * 지연 스키마 생성(self-ensure).
   *
   * `CREATE TABLE IF NOT EXISTS`는 Postgres에서 **동시 실행 안전하지 않다** — 두 세션이 같은 순간에
   * 만들면 한쪽이 duplicate key로 죽는다(빈 DB에 동시 요청이 들어가 실제로 500 발생).
   * 진행 중 Promise를 키별로 캐시해 프로세스 안 경쟁을 합치고, "이미 있음" 에러는 성공으로 본다.
   */
  ensureSchema(key: string, sql: string | string[]): Promise<void> {
    const cached = this.schemaInflight.get(key);
    if (cached) return cached;

    const statements = Array.isArray(sql) ? sql : [sql];
    const p = (async () => {
      for (const s of statements) {
        try {
          await this.query(s);
        } catch (err: any) {
          if (!DUPLICATE_CODES.has(err && err.code)) throw err;
        }
      }
    })().catch((err) => {
      this.schemaInflight.delete(key);   // 실패는 캐시하지 않는다(다음 요청이 재시도)
      throw err;
    });

    this.schemaInflight.set(key, p);
    return p;
  }

  /** 트랜잭션용 커넥션 대여 — 반드시 finally에서 release() 할 것(누수 시 풀 고갈) */
  connect(): Promise<any> {
    return client.pool.connect();
  }
}
