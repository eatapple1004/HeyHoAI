import { BadRequestException, Injectable } from '@nestjs/common';
import { EnvDbService, EnvKey, ENV_LABEL, DB_NAME } from '../common/env-db.service';

/**
 * 환경별 사용자·생성물 조회.
 *
 * 연결(환경별 읽기 전용 풀·DB 이름표)은 EnvDbService가 단일소스로 들고 있다 —
 *   환경 선택을 다는 화면이 둘 이상(사용자·환불)이 되면서 여기서 꺼냈다.
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

// 기존 import 경로(이 모듈에서 EnvKey를 가져가던 컨트롤러)를 그대로 유지한다.
export type { EnvKey };
export { ENV_LABEL };

@Injectable()
export class AdminUsersService {
  constructor(private readonly envDb: EnvDbService) {}

  private poolFor(key: EnvKey) { return this.envDb.poolFor(key); }

  /** 현재 서버가 어느 환경인지 — 화면 기본 선택값 */
  current(): EnvKey { return this.envDb.current(); }

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
