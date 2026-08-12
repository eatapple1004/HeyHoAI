import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CharacterVo, CharacterPersonaVo, CharacterStatus } from './vo/character.vo';

/**
 * 캐릭터 데이터 접근 — src/characters/character.repository.js 를 TypeScript로 이식.
 * Spring의 @Repository 자리. SQL은 여기 밖으로 새지 않는다.
 */
@Injectable()
export class CharacterRepository {
  constructor(private readonly db: DbService) {}

  /** 캐릭터 저장 */
  async insert(data: {
    userId: string;
    name: string;
    concept: string;
    persona: CharacterPersonaVo | Record<string, unknown>;
    teamId?: string | null;
  }): Promise<CharacterVo> {
    const { userId, name, concept, persona, teamId = null } = data;
    const result = await this.db.query<CharacterVo>(
      `INSERT INTO characters (user_id, name, concept, persona, status, team_id)
       VALUES ($1, $2, $3, $4, 'active', $5)
       RETURNING *`,
      [userId, name, concept, JSON.stringify(persona), teamId],
    );
    return result.rows[0];
  }

  /** ID로 조회 */
  async findById(id: string): Promise<CharacterVo | null> {
    const result = await this.db.query<CharacterVo>('SELECT * FROM characters WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * 목록 조회 — 팀 컨텍스트면 그 팀 소유만, 개인이면 **본인 소유 & 팀 미소속**만.
   * (개인 컨텍스트에서 팀 캐릭터가 섞이지 않게 하는 기존 동작을 그대로 보존한다)
   */
  async findAll(opts: {
    userId?: string;
    teamId?: string | null;
    status?: CharacterStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ rows: CharacterVo[]; total: number }> {
    const { userId, teamId, status, limit = 20, offset = 0 } = opts;
    const conditions: string[] = ["status != 'archived'"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (teamId) {
      conditions.push(`team_id = $${paramIndex++}`);
      params.push(teamId);
    } else if (userId) {
      conditions.push(`user_id = $${paramIndex++} AND team_id IS NULL`);
      params.push(userId);
    }
    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    const where = 'WHERE ' + conditions.join(' AND ');

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) FROM characters ${where}`, params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await this.db.query<CharacterVo>(
      `SELECT * FROM characters ${where} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset],
    );
    return { rows: dataResult.rows, total };
  }

  /** 상태 변경(삭제는 status='archived' 소프트 삭제) */
  async updateStatus(id: string, status: CharacterStatus): Promise<CharacterVo | null> {
    const result = await this.db.query<CharacterVo>(
      `UPDATE characters SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [status, id],
    );
    return result.rows[0] || null;
  }

  /**
   * 대표 이미지 지정 — 이후 이미지 생성이 이걸 reference로 써서 동일 인물을 유지한다.
   * imageUrl은 /images/... 웹 경로여야 한다(file:// 절대경로는 브라우저가 못 읽는다).
   */
  async setReferenceImage(
    characterId: string, imageId: string | null, imageUrl: string | null,
  ): Promise<CharacterVo | null> {
    const result = await this.db.query<CharacterVo>(
      `UPDATE characters
       SET reference_image_id = $1, reference_image_url = $2, updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [imageId, imageUrl, characterId],
    );
    return result.rows[0] || null;
  }

  /** 대표 이미지 해제 */
  async clearReferenceImage(characterId: string): Promise<CharacterVo | null> {
    const result = await this.db.query<CharacterVo>(
      `UPDATE characters
       SET reference_image_id = NULL, reference_image_url = NULL, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [characterId],
    );
    return result.rows[0] || null;
  }
}
