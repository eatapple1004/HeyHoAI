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

@Injectable()
export class DbService {
  /** 파라미터 바인딩 쿼리($1, $2 …) — SQL 인젝션 방지 */
  query<T = any>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return client.query(sql, params);
  }

  /** 트랜잭션이 필요한 리포지토리가 직접 커넥션을 잡을 때 사용 */
  get pool() {
    return client.pool;
  }

  /** 트랜잭션용 커넥션 대여 — 반드시 finally에서 release() 할 것(누수 시 풀 고갈) */
  connect(): Promise<any> {
    return client.pool.connect();
  }
}
