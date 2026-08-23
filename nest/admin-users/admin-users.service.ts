import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import * as path from 'path';
import { Pool } from 'pg';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

/**
 * 환경별 사용자·생성물 조회.
 *
 * 세 환경의 DB가 **같은 RDS 클러스터**에 있고 자격증명도 같다 — dbname만 다르다.
 * 그래서 현재 서버의 DATABASE_URL에서 db 이름만 바꿔 붙이면 한 화면에서 셋을 다 볼 수 있다.
 *
 * ⚠️ **읽기 전용으로 못을 박는다.** 연결 옵션에 `default_transaction_read_only=on`을 걸어
 *   실수로 UPDATE/DELETE가 나가도 DB가 거절하게 한다. 관리자 화면에서 prod에 쓰기가
 *   가능해지는 순간이 제일 위험하다(로컬 .env가 prod를 가리켜 dev.test 계정을 prod에 만든 전례가 있다).
 */

/**
 * 저장 경로 → 서빙 URL. admin.service의 규약과 같다 —
 * R2/외부 URL·로스터(`/img/…`)는 그대로, 그 외 tmp 경로는 `/images/<파일명>`.
 * ⚠️ 규약이 갈리면 같은 파일이 한 화면에선 보이고 다른 화면에선 깨진다.
 */
function toUrl(p: unknown): string {
  const s = String(p || '');
  if (!s) return '';
  if (s.startsWith('/img/') || /^https?:\/\//i.test(s)) return s;
  return '/images/' + s.split('/').pop();
}

export type EnvKey = 'development' | 'staging' | 'production';

/** 환경 → 실제 DB 이름. 화면 라벨과 분리해 둔다(라벨이 바뀌어도 연결은 안 흔들린다). */
const DB_NAME: Record<EnvKey, string> = {
  development: 'doppia_dev',
  staging: 'doppia_staging',
  production: 'postgres',
};

export const ENV_LABEL: Record<EnvKey, string> = {
  development: 'dev',
  staging: 'staging',
  production: 'prod',
};

@Injectable()
export class AdminUsersService implements OnModuleDestroy {
  /** 환경별 풀 — 요청마다 새로 만들면 커넥션이 금세 바닥난다. 만들어 두고 재사용한다. */
  private pools = new Map<EnvKey, Pool>();

  private poolFor(key: EnvKey): Pool {
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

  onModuleDestroy(): void {
    for (const p of this.pools.values()) p.end().catch(() => undefined);
  }

  /** 현재 서버가 어느 환경인지 — 화면 기본 선택값 */
  current(): EnvKey {
    const n = String(env.NODE_ENV || 'development');
    return (['development', 'staging', 'production'].includes(n) ? n : 'development') as EnvKey;
  }

  /**
   * 사용자별 생성물 집계.
   * 무엇을 만들었는지가 핵심이라 종류별 개수를 한 줄에 모은다 —
   * "가입만 하고 안 쓴 계정"과 "실제로 만든 계정"이 눈으로 갈려야 한다.
   */
  async users(key: EnvKey) {
    if (!DB_NAME[key]) throw new BadRequestException('env는 development | staging | production 중 하나여야 합니다');
    const pool = this.poolFor(key);
    const { rows } = await pool.query(`
      SELECT u.id, u.email, u.display_name, u.role, u.plan, u.status,
             (u.google_id IS NOT NULL) AS via_google,
             u.credit_balance, u.created_at,
             (SELECT count(*)::int FROM prompts       p  WHERE p.user_id  = u.id) AS images,
             (SELECT count(*)::int FROM video_jobs    v  WHERE v.user_id  = u.id) AS videos,
             (SELECT count(*)::int FROM ugc_jobs      g  WHERE g.user_id  = u.id) AS ugc,
             (SELECT count(*)::int FROM content_packs k  WHERE k.user_id::text = u.id::text) AS packs,
             (SELECT count(*)::int FROM payments      pm WHERE pm.user_id = u.id) AS payments,
             (SELECT coalesce(sum(-amount), 0)::int FROM credit_ledger cl
               WHERE cl.user_id = u.id AND cl.amount < 0) AS credits_spent
        FROM users u
       ORDER BY u.created_at DESC`);
    return { env: key, label: ENV_LABEL[key], db: DB_NAME[key], users: rows };
  }

  /**
   * 한 사용자의 상세 — 계정 정보 + 무엇을 만들었는지 + 크레딧이 어디로 갔는지.
   *
   * 목록은 "몇 개"만 말한다. 여기서는 **무엇을** 만들었는지 봐야 한다 —
   * 어뷰징인지 진짜 사용인지는 개수가 아니라 내용에서 갈린다.
   * 각 목록은 최근 것부터 상한을 둔다(한 계정이 수천 건이면 화면이 못 버틴다).
   */
  async detail(key: EnvKey, userId: string) {
    if (!DB_NAME[key]) throw new BadRequestException('env는 development | staging | production 중 하나여야 합니다');
    if (!/^[0-9a-f-]{36}$/i.test(String(userId))) throw new BadRequestException('사용자 id 형식이 올바르지 않습니다');
    const pool = this.poolFor(key);

    const q = async (sql: string, params: any[] = []) => (await pool.query(sql, params)).rows;

    const [user] = await q(
      `SELECT u.*, (u.google_id IS NOT NULL) AS via_google FROM users u WHERE u.id = $1`, [userId]);
    if (!user) throw new BadRequestException('사용자를 찾을 수 없습니다');
    delete (user as any).password_hash;   // 해시라도 화면에 내보낼 이유가 없다

    const [images, videos, ugc, packs, ledger, payments] = await Promise.all([
      // 프롬프트만으로는 "무엇을 만들었는지" 알 수 없다 — 결과 파일까지 붙여야 눈으로 판단된다.
      //   결과는 generation_results.prompt_idx 로 연결된다(한 프롬프트에 여러 장 나올 수 있다).
      q(`SELECT p.idx, p.prompt_text, p.model, p.style_preset, p.reference_image_path, p.created_at,
                COALESCE(
                  array_agg(gr.file_path ORDER BY gr.created_at) FILTER (WHERE gr.file_path IS NOT NULL),
                  ARRAY[]::text[]
                ) AS files
           FROM prompts p
           LEFT JOIN generation_results gr ON gr.prompt_idx = p.idx AND gr.taken_down IS NOT TRUE
          WHERE p.user_id = $1
          GROUP BY p.idx, p.prompt_text, p.model, p.style_preset, p.reference_image_path, p.created_at
          ORDER BY p.created_at DESC LIMIT 60`, [userId]),
      q(`SELECT id, prompt, mode, duration, status, charge_amount, result_url, error, created_at
           FROM video_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`, [userId]),
      q(`SELECT id, title, product, concept, output_type, n_clips, status, charge_amount, result_url, error, created_at
           FROM ugc_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`, [userId]),
      q(`SELECT p.id, p.vertical, p.product, p.status, p.error, p.created_at,
                (SELECT count(*)::int FROM pack_assets a WHERE a.pack_id = p.id AND a.kind = 'still') AS stills,
                COALESCE((SELECT array_agg(a.url) FROM (
                   SELECT url FROM pack_assets WHERE pack_id = p.id AND kind = 'still' AND url IS NOT NULL
                   ORDER BY created_at LIMIT 4) a), ARRAY[]::text[]) AS thumbs
           FROM content_packs p WHERE p.user_id::text = $1 ORDER BY p.created_at DESC LIMIT 30`, [userId]),
      q(`SELECT amount, balance_after, type, description, created_at
           FROM credit_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT 60`, [userId]),
      q(`SELECT provider, order_id, product, amount_usd, credits, created_at
           FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [userId]),
    ]);

    const imagesOut = images.map((r: any) => ({
      ...r,
      files: undefined,
      urls: (r.files || []).map(toUrl).filter(Boolean),
      refUrl: toUrl(r.reference_image_path),
    }));
    const videosOut = videos.map((r: any) => ({ ...r, result_url: toUrl(r.result_url) }));
    const ugcOut = ugc.map((r: any) => ({ ...r, result_url: toUrl(r.result_url) }));

    return { env: key, label: ENV_LABEL[key], db: DB_NAME[key], user,
      images: imagesOut, videos: videosOut, ugc: ugcOut, packs, ledger, payments };
  }
}
