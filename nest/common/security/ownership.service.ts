import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';

/**
 * 소유권 검증 — src/middleware/ownership.js 를 TypeScript로 이식.
 *   Spring의 메서드 시큐리티(@PreAuthorize("@owner.check(...)")) 자리.
 *   실패는 **403 statusCode 에러**를 throw → LegacyErrorFilter가 레거시와 동일 형식으로 응답.
 *
 * 규칙 두 가지가 반복된다:
 *   ① 개인 소유(user_id 일치) **또는** 그 리소스가 속한 팀의 멤버면 허용 (characters·prompts·reviews)
 *   ② 계정 계열은 소유자 단일 판정 (social_accounts.user_id)
 */
@Injectable()
export class OwnershipService {
  constructor(private readonly db: DbService) {}

  /** statusCode를 가진 403 에러 */
  private forbidden(message = 'Forbidden') {
    return Object.assign(new Error(message), { statusCode: 403 });
  }

  private async assertExists(sql: string, params: unknown[], message: string) {
    const r = await this.db.query(sql, params);
    if (r.rowCount === 0) throw this.forbidden(message);
  }

  /** 캐릭터 — 본인 소유거나 그 캐릭터가 속한 팀의 멤버 */
  async assertCharacterOwned(characterId: string, userId: string): Promise<void> {
    if (!characterId) throw this.forbidden('characterId is required');
    await this.assertExists(
      `SELECT 1 FROM characters c
       WHERE c.id = $1 AND (
         c.user_id = $2
         OR (c.team_id IS NOT NULL AND c.team_id IN (SELECT team_id FROM team_members WHERE user_id = $2))
       )`,
      [characterId, userId],
      '해당 캐릭터에 접근 권한이 없습니다.',
    );
  }

  /** 소셜 계정 — 소유자 본인만 */
  async assertAccountOwned(accountId: string, userId: string): Promise<void> {
    if (!accountId) throw this.forbidden('accountId is required');
    await this.assertExists(
      'SELECT 1 FROM social_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId],
      '해당 계정에 접근 권한이 없습니다.',
    );
  }

  /** 콘텐츠 — 캐릭터를 통해 소유 판정 */
  async assertContentOwned(contentId: string, userId: string): Promise<void> {
    if (!contentId) throw this.forbidden('contentId is required');
    await this.assertExists(
      `SELECT 1 FROM contents c JOIN characters ch ON ch.id = c.character_id
       WHERE c.id = $1 AND ch.user_id = $2`,
      [contentId, userId],
      '해당 콘텐츠에 접근 권한이 없습니다.',
    );
  }

  /** 발행 작업 — 캐릭터를 통해 소유 판정 */
  async assertPublishJobOwned(publishJobId: string, userId: string): Promise<void> {
    if (!publishJobId) throw this.forbidden('publishJobId is required');
    await this.assertExists(
      `SELECT 1 FROM publish_jobs pj JOIN characters ch ON ch.id = pj.character_id
       WHERE pj.id = $1 AND ch.user_id = $2`,
      [publishJobId, userId],
      '해당 발행 작업에 접근 권한이 없습니다.',
    );
  }

  /** 프롬프트 — 본인 또는 팀 멤버 */
  async assertPromptOwned(idx: number | string, userId: string): Promise<void> {
    await this.assertExists(
      `SELECT 1 FROM prompts p WHERE p.idx = $1 AND (
         p.user_id = $2
         OR (p.team_id IS NOT NULL AND p.team_id IN (SELECT team_id FROM team_members WHERE user_id = $2))
       )`,
      [idx, userId],
      '해당 프롬프트에 접근 권한이 없습니다.',
    );
  }

  /** 리뷰 — 프롬프트를 통해 본인/팀 판정 */
  async assertReviewOwned(idx: number | string, userId: string): Promise<void> {
    await this.assertExists(
      `SELECT 1 FROM reviews r JOIN prompts p ON p.idx = r.prompt_idx
       WHERE r.idx = $1 AND (
         p.user_id = $2
         OR (p.team_id IS NOT NULL AND p.team_id IN (SELECT team_id FROM team_members WHERE user_id = $2))
       )`,
      [idx, userId],
      '해당 리뷰에 접근 권한이 없습니다.',
    );
  }

  /**
   * 계정 하위 리소스(미디어·큐·릴스템플릿·의상프롬프트) — 리소스 → social_accounts.user_id 체인.
   * ⚠️ 테이블명이 SQL에 직접 들어가므로 **화이트리스트 필수**(인젝션 방지).
   */
  async assertAccountResourceOwned(table: AccountChildTable, id: string, userId: string): Promise<void> {
    if (!ACCOUNT_CHILD_TABLES.has(table)) throw this.forbidden('Invalid resource table');
    if (!id) throw this.forbidden('resource id is required');
    await this.assertExists(
      `SELECT 1 FROM ${table} t JOIN social_accounts sa ON sa.id = t.account_id
       WHERE t.id = $1 AND sa.user_id = $2`,
      [id, userId],
      '해당 리소스에 접근 권한이 없습니다.',
    );
  }
}

/** account_id를 가진 자식 테이블 화이트리스트 (SQL 인젝션 방지) */
export type AccountChildTable = 'account_media' | 'post_queue' | 'reel_templates' | 'outfit_prompts';
const ACCOUNT_CHILD_TABLES = new Set<string>([
  'account_media',
  'post_queue',
  'reel_templates',
  'outfit_prompts',
]);
