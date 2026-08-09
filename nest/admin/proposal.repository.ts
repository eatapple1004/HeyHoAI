import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

/**
 * 제안서(회사 맞춤 소개 페이지) 저장소.
 *
 * selection에는 **URL·dataURL만** 담는다(이미지 바이트를 넣지 않는다) — 행이 수 MB로 불어나면
 * 목록 조회까지 느려진다. 실제 임베드는 빌드 시 프론트가 한다.
 */
const PROPOSALS_SQL = `
  CREATE TABLE IF NOT EXISTS proposals (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID,
    company    TEXT NOT NULL,
    title      TEXT,
    meta       JSONB NOT NULL DEFAULT '{}'::jsonb,      -- {about,intro,svc,ctaLabel,ctaUrl}
    selection  JSONB NOT NULL DEFAULT '[]'::jsonb,      -- [{gkey,beforeUrl,altBeforeUrl,beforeKind,caption,results:[{afterUrl}]}]
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_proposals_user ON proposals(user_id, updated_at DESC);
`;

@Injectable()
export class ProposalRepository {
  constructor(private readonly db: DbService) {}

  /** 지연 생성 — 이 테이블은 마이그레이션이 아니라 최초 사용 시점에 만들어진다 */
  private ensure() {
    return this.db.ensureSchema('proposals', PROPOSALS_SQL);
  }

  /**
   * 1개 레퍼런스 → n개 결과. 같은 레퍼런스(gkey)의 결과를 묶어 **그룹 단위로** 페이지네이션한다.
   *   gkey = pack이면 pack_share_id(한 팩의 모든 컷 = 한 레퍼런스), 아니면 prompts.reference_image_path.
   */
  async findResultRows(userId: string | null, o: { limit: number; offset: number; scope: string }) {
    const params: unknown[] = [o.limit, o.offset];
    let scopeWhere = '';
    if (o.scope === 'mine' && userId) {
      params.push(userId);
      scopeWhere = ` AND pr.user_id = $${params.length}`;
    }
    const r = await this.db.query(
      `WITH base AS (
         SELECT gr.idx, gr.file_path, gr.model, gr.template_name, gr.template_source,
                pr.reference_image_path, refpack.url AS canonical_ref,
                COALESCE(gr.metadata->>'pack_share_id', pr.reference_image_path) AS gkey,
                (gr.template_source = 'pack') AS is_pack
           FROM generation_results gr
           JOIN prompts pr ON gr.prompt_idx = pr.idx
           LEFT JOIN LATERAL (
             SELECT pa.url FROM pack_assets pa
               JOIN content_packs cp ON cp.id = pa.pack_id
              WHERE cp.share_id = (gr.metadata->>'pack_share_id') AND pa.kind = 'ref'
              ORDER BY pa.id DESC LIMIT 1
           ) refpack ON true
          WHERE gr.file_path IS NOT NULL AND gr.taken_down = false
            AND COALESCE(gr.metadata->>'kind','') <> 'ref'
            AND (pr.reference_image_path IS NOT NULL OR refpack.url IS NOT NULL)${scopeWhere}
       ),
       g AS (
         SELECT gkey, MAX(idx) AS max_idx FROM base GROUP BY gkey ORDER BY MAX(idx) DESC LIMIT $1 OFFSET $2
       )
       SELECT b.*, g.max_idx FROM base b JOIN g ON b.gkey = g.gkey
        ORDER BY g.max_idx DESC, b.idx DESC`, params);
    return r.rows;
  }

  async insert(userId: string | null, d: { company: string; title: string; meta: unknown; selection: unknown }): Promise<string> {
    await this.ensure();
    const r = await this.db.query<{ id: string }>(
      `INSERT INTO proposals (user_id, company, title, meta, selection)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [userId || null, d.company, d.title, JSON.stringify(d.meta), JSON.stringify(d.selection)]);
    return r.rows[0].id;
  }

  async update(id: string, d: { company: string; title: string; meta: unknown; selection: unknown }): Promise<string | null> {
    await this.ensure();
    const r = await this.db.query<{ id: string }>(
      `UPDATE proposals SET company=$2, title=$3, meta=$4, selection=$5, updated_at=now()
        WHERE id=$1 RETURNING id`,
      [id, d.company, d.title, JSON.stringify(d.meta), JSON.stringify(d.selection)]);
    return r.rows[0] ? r.rows[0].id : null;
  }

  /** 목록은 selection 본문 대신 **그룹 수만** 센다(행이 크므로 목록에서 통째로 읽지 않는다) */
  async list() {
    await this.ensure();
    const r = await this.db.query(
      `SELECT id, company, title, updated_at, jsonb_array_length(selection) AS groups
         FROM proposals ORDER BY updated_at DESC LIMIT 100`);
    return r.rows;
  }

  async findById(id: string) {
    await this.ensure();
    const r = await this.db.query(
      'SELECT id, company, title, meta, selection FROM proposals WHERE id=$1', [id]);
    return r.rows[0] || null;
  }

  async remove(id: string): Promise<void> {
    await this.ensure();
    await this.db.query('DELETE FROM proposals WHERE id=$1', [id]);
  }
}
