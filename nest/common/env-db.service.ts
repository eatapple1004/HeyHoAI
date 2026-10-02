import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import * as path from 'path';
import { Pool } from 'pg';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

/**
 * 환경(dev·staging·prod) 교차 **읽기 전용** DB 접근.
 *
 * 세 환경의 DB가 **같은 RDS 클러스터**에 있고 자격증명도 같다 — dbname만 다르다.
 * 그래서 현재 서버의 DATABASE_URL에서 db 이름만 바꿔 붙이면 한 화면에서 셋을 다 볼 수 있다.
 *
 * ⚠️ **읽기 전용으로 못을 박는다.** 연결 옵션에 `default_transaction_read_only=on`을 걸어
 *   실수로 UPDATE/DELETE가 나가도 DB가 거절하게 한다. 관리자 화면에서 prod에 쓰기가
 *   가능해지는 순간이 제일 위험하다(로컬 .env가 prod를 가리켜 dev.test 계정을 prod에 만든 전례가 있다).
 *   쓰기는 **그 환경 서버의 자기 DB 연결(src/db/client)** 로만 한다 — 이 서비스로는 애초에 불가능하다.
 *
 * 원래 admin-users.service 안에 있던 것을 꺼냈다. 환경 선택을 다는 화면이 둘 이상이 되는 순간
 *   DB 이름 표가 두 벌이 되기 때문(한쪽만 고치면 조용히 어긋난다).
 */
export type EnvKey = 'development' | 'staging' | 'production';

/** 환경 → 실제 DB 이름. 화면 라벨과 분리해 둔다(라벨이 바뀌어도 연결은 안 흔들린다). */
export const DB_NAME: Record<EnvKey, string> = {
  development: 'doppia_dev',
  staging: 'doppia_staging',
  production: 'postgres',
};

export const ENV_LABEL: Record<EnvKey, string> = {
  development: 'dev',
  staging: 'staging',
  production: 'prod',
};

/** 레거시 서비스에 주입하는 질의 함수 꼴 — src/db/client 의 query(text, params) 와 같다. */
export type QueryFn = (text: string, params?: any[]) => Promise<{ rows: any[] }>;

@Injectable()
export class EnvDbService implements OnModuleDestroy {
  /** 환경별 풀 — 요청마다 새로 만들면 커넥션이 금세 바닥난다. 만들어 두고 재사용한다. */
  private pools = new Map<EnvKey, Pool>();

  /** 넘어온 값이 환경 키인지 — 아니면 400. 화면·API 경계에서 한 번만 검사하면 된다. */
  assertEnv(key: string): EnvKey {
    if (!DB_NAME[key as EnvKey]) {
      throw new BadRequestException('env는 development | staging | production 중 하나여야 합니다');
    }
    return key as EnvKey;
  }

  poolFor(key: EnvKey): Pool {
    this.assertEnv(key);
    const cached = this.pools.get(key);
    if (cached) return cached;

    const raw = String(env.DATABASE_URL || '');
    if (!raw) throw new BadRequestException('DATABASE_URL이 없습니다');
    const url = new URL(raw);
    url.pathname = `/${DB_NAME[key]}`;

    const pool = new Pool({
      connectionString: url.toString(),
      ssl: /(?:localhost|127\.0\.0\.1)/.test(raw) ? false : { rejectUnauthorized: false },
      max: 2,                       // 조회 전용이라 크게 잡을 이유가 없다
      idleTimeoutMillis: 30_000,
      // 🔒 쓰기 차단 + 폭주 쿼리 차단
      options: '-c default_transaction_read_only=on -c statement_timeout=15000',
    });
    pool.on('error', () => undefined); // 유휴 커넥션 끊김이 프로세스를 죽이지 않게
    this.pools.set(key, pool);
    return pool;
  }

  /** 레거시 서비스(src/**)에 그대로 넘길 수 있는 질의 함수. 읽기 전용 풀에 묶여 있다. */
  queryFn(key: EnvKey): QueryFn {
    const pool = this.poolFor(key);
    return (text: string, params?: any[]) => pool.query(text, params);
  }

  /** 현재 서버가 어느 환경인지 — 화면 기본 선택값이자 "쓰기가 허용되는 유일한 환경". */
  current(): EnvKey {
    const n = String(env.NODE_ENV || 'development');
    return (['development', 'staging', 'production'].includes(n) ? n : 'development') as EnvKey;
  }

  label(key: EnvKey): string { return ENV_LABEL[key]; }
  dbName(key: EnvKey): string { return DB_NAME[key]; }

  onModuleDestroy(): void {
    for (const p of this.pools.values()) p.end().catch(() => undefined);
  }
}
