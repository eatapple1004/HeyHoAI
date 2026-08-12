import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { UserVo } from './vo/user.vo';

/** 비밀번호 해시를 포함한 내부 전용 행 — **응답에 그대로 내보내면 안 된다** */
export interface UserRowVo extends UserVo {
  readonly password_hash: string | null;
  readonly google_id?: string | null;
}

/** 공개 필드만 — 로그인/조회 응답에 그대로 나가는 컬럼 목록(해시 유출 방지) */
const PUBLIC_COLS = 'id, email, display_name, role, status, created_at';

@Injectable()
export class UserRepository {
  constructor(private readonly db: DbService) {}

  /** 로그인 검증용 — password_hash 포함. 호출측이 반드시 제거하고 반환할 것. */
  async findByEmail(email: string): Promise<UserRowVo | null> {
    const r = await this.db.query<UserRowVo>(
      'SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()]);
    return r.rows[0] || null;
  }

  async findById(id: string): Promise<UserVo | null> {
    const r = await this.db.query<UserVo>(
      `SELECT ${PUBLIC_COLS} FROM users WHERE id = $1`, [id]);
    return r.rows[0] || null;
  }

  async insert(d: { email: string; passwordHash: string; displayName?: string | null; role?: string }): Promise<UserVo> {
    const r = await this.db.query<UserVo>(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, $4) RETURNING ${PUBLIC_COLS}`,
      [String(d.email).toLowerCase(), d.passwordHash, d.displayName ?? null, d.role || 'user']);
    return r.rows[0];
  }

  async updateDisplayName(id: string, displayName: string): Promise<UserVo | null> {
    const r = await this.db.query<UserVo>(
      `UPDATE users SET display_name = $2, updated_at = now() WHERE id = $1
       RETURNING ${PUBLIC_COLS}`, [id, displayName]);
    return r.rows[0] || null;
  }

  /** 소프트 삭제 — 실제 DELETE는 생성물·원장의 FK를 무너뜨리므로 status만 바꾼다(로그인은 차단됨) */
  async softDelete(id: string): Promise<void> {
    await this.db.query(`UPDATE users SET status = 'deleted', updated_at = now() WHERE id = $1`, [id]);
  }
}
