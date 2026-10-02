import { Injectable } from '@nestjs/common';
import { EnvDbService, EnvKey, ENV_LABEL, DB_NAME } from '../common/env-db.service';

/**
 * 환경별 **결제 조회**(관리자 전용, 읽기 전용).
 *
 * 왜 따로 만드나 — 지금 결제를 보려면 환불 화면(취소 이력)이나 사용자 화면(계정당 건수)밖에 없었다.
 *   "언제 누가 얼마를 결제했나"를 세 환경에서 한 화면으로 보는 자리가 없었다.
 *
 * ⚠️ 이 화면은 **조회 전용**이다. 연결은 EnvDbService의 읽기 전용 풀이라 쓰기는 DB가 거절한다.
 */

/**
 * 환경마다 **배포 시점이 달라 스키마가 다르다** — 실측(2026-09-16): prod에는
 * `payments.refunded_usd`가 없다(환불 기능 미배포). 그래서 컬럼을 박아 쓰면 그 환경 조회가 통째로 500이 된다.
 * 있는 컬럼만 골라 쓰고, 없으면 화면에 "그 환경엔 아직 없음"이라고 말한다.
 */
const num = (v: any) => (v == null ? 0 : Number(v));

@Injectable()
export class AdminPaymentsService {
  constructor(private readonly envDb: EnvDbService) {}

  current(): EnvKey { return this.envDb.current(); }

  async payments(key: EnvKey, limit = 500) {
    const pool = this.envDb.poolFor(key);
    const q = async (sql: string, params: any[] = []) => (await pool.query(sql, params)).rows;

    const cols = new Set(
      (await q(`SELECT column_name FROM information_schema.columns
                 WHERE table_schema = current_schema() AND table_name = 'payments'`))
        .map((r: any) => r.column_name),
    );
    const hasRefunded = cols.has('refunded_usd');
    const refunded = hasRefunded ? 'p.refunded_usd' : 'NULL::numeric';
    // PortOne 행은 raw에 **실제 청구액(원)** 이 들어 있다(amount_usd는 USD 환산이라 원화 매출이 안 보인다).
    const krw = `NULLIF(p.raw->>'paidAmount', '')::numeric`;

    const [rows, agg, byProvider] = await Promise.all([
      q(`SELECT p.id, p.user_id, p.created_at, p.provider, p.order_id, p.product, p.amount_usd, p.credits,
                ${refunded} AS refunded_usd, ${krw} AS paid_krw,
                u.email, u.display_name, u.role
           FROM payments p LEFT JOIN users u ON u.id = p.user_id
          ORDER BY p.created_at DESC LIMIT $1`, [Math.min(2000, Math.max(1, limit))]),
      // 합계는 **표에 실린 만큼이 아니라 전체**로 낸다 — 상한에 걸린 목록으로 매출을 세면 조용히 틀린다.
      q(`SELECT count(*)::int AS n, count(DISTINCT p.user_id)::int AS users,
                COALESCE(SUM(p.amount_usd), 0) AS usd,
                COALESCE(SUM(${refunded}), 0) AS refunded,
                COALESCE(SUM(p.credits), 0)::int AS credits,
                COALESCE(SUM(${krw}), 0) AS krw,
                MIN(p.created_at) AS first_at, MAX(p.created_at) AS last_at
           FROM payments p`),
      q(`SELECT p.provider, count(*)::int AS n, COALESCE(SUM(p.amount_usd), 0) AS usd
           FROM payments p GROUP BY p.provider ORDER BY n DESC`),
    ]);

    const a = agg[0] || {};
    return {
      env: key,
      label: ENV_LABEL[key],
      db: DB_NAME[key],
      current: this.envDb.current(),
      // 화면이 "왜 환불 열이 비었나"를 말할 수 있어야 한다 — 값이 0인 것과 컬럼이 없는 것은 다르다.
      schema: { refundedUsd: hasRefunded },
      summary: {
        count: num(a.n), users: num(a.users),
        usd: num(a.usd), refundedUsd: num(a.refunded), netUsd: num(a.usd) - num(a.refunded),
        krw: num(a.krw), credits: num(a.credits),
        firstAt: a.first_at || null, lastAt: a.last_at || null,
        byProvider: byProvider.map((r: any) => ({ provider: r.provider, n: num(r.n), usd: num(r.usd) })),
      },
      rows: rows.map((r: any) => ({
        ...r,
        amount_usd: num(r.amount_usd),
        refunded_usd: r.refunded_usd == null ? null : num(r.refunded_usd),
        paid_krw: r.paid_krw == null ? null : num(r.paid_krw),
      })),
    };
  }
}
