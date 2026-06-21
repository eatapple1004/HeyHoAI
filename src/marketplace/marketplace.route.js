const { Router } = require('express');
const { query } = require('../db/client');
const creditService = require('../credits/credit.service');
const { resolveToolId } = require('../tools/registry');

const router = Router();

const CATEGORIES = new Set(['Influencer', 'Shopping', 'UGC', 'Custom']);
const TYPES = new Set(['image', 'reel']);
const CREATOR_SHARE = 0.7; // 크리에이터 70% 수익분배

const PUBLIC_COLS = `id, creator_id, creator_handle, name, category, type, style, prompt,
  negative_prompt, tool, visibility, emoji, price_credits, usage_count, likes_count,
  preview_media, is_official, created_at`;

/**
 * GET /api/marketplace/templates?category=Influencer&feed=1
 * 기본: 공개 + 내 비공개(타인 비공개 누수 방지).
 * feed=1: 공개 무료(price_credits=0)만, 좋아요순 — Library Feed용.
 */
router.get('/templates', async (req, res, next) => {
  try {
    const { category, feed } = req.query;
    const isFeed = feed === '1' || feed === 'true';
    const params = [req.user.id];
    let where = isFeed
      ? `status = 'active' AND visibility = 'public' AND price_credits = 0`
      : `status = 'active' AND (visibility = 'public' OR creator_id = $1)`;
    if (category && CATEGORIES.has(category)) {
      params.push(category);
      where += ` AND category = $${params.length}`;
    }
    const order = isFeed ? 'likes_count DESC, usage_count DESC' : 'is_official DESC, usage_count DESC';
    const r = await query(
      `SELECT ${PUBLIC_COLS}, (creator_id = $1) AS mine
       FROM marketplace_templates WHERE ${where}
       ORDER BY ${order} LIMIT 200`,
      params
    );
    res.json({ success: true, data: r.rows });
  } catch (err) { next(err); }
});

/** GET /api/marketplace/templates/:id — 템플릿 상세(상품 페이지용). 공개 또는 내 것만.
 *  ⚠️ 유료 템플릿은 prompt(레시피) 비공개(블랙박스) — 결과·예시만 노출. */
router.get('/templates/:id', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT ${PUBLIC_COLS}, (creator_id = $2) AS mine
       FROM marketplace_templates
       WHERE id = $1 AND status = 'active' AND (visibility = 'public' OR creator_id = $2)`,
      [req.params.id, req.user.id]
    );
    const tpl = r.rows[0];
    if (!tpl) return res.status(404).json({ success: false, error: '템플릿을 찾을 수 없습니다.' });
    // 유료 + 내 것 아니면 prompt 숨김(블랙박스). 무료/내 것은 그대로.
    if (tpl.price_credits > 0 && !tpl.mine) { tpl.prompt = null; tpl.negative_prompt = null; }
    res.json({ success: true, data: tpl });
  } catch (err) { next(err); }
});

/** GET /api/marketplace/me — 크리에이터 상태 + 내가 게시한 템플릿 */
router.get('/me', async (req, res, next) => {
  try {
    const u = await query('SELECT is_creator FROM users WHERE id = $1', [req.user.id]);
    const mine = await query(
      `SELECT ${PUBLIC_COLS} FROM marketplace_templates WHERE creator_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: { isCreator: u.rows[0]?.is_creator || false, templates: mine.rows } });
  } catch (err) { next(err); }
});

/**
 * GET /api/marketplace/earnings — 셀러(크리에이터) 정산 대시보드
 * royalty 원장(type='royalty', ref_id=템플릿id)을 집계해 총수익·템플릿별 수익·최근 내역 반환.
 */
router.get('/earnings', async (req, res, next) => {
  try {
    const u = await query('SELECT is_creator FROM users WHERE id = $1', [req.user.id]);
    const isCreator = u.rows[0]?.is_creator || false;

    // 총 수익 + 적립 건수
    const totals = await query(
      `SELECT COALESCE(SUM(amount), 0)::int AS total_earned, COUNT(*)::int AS payout_count
       FROM credit_ledger WHERE user_id = $1 AND type = 'royalty'`,
      [req.user.id]
    );

    // 템플릿별 수익 (ref_id=템플릿 UUID를 TEXT로 저장 → 캐스팅 조인)
    const byTemplate = await query(
      `SELECT mt.id, mt.name, mt.emoji, mt.category, mt.type, mt.price_credits, mt.usage_count,
              COALESCE(SUM(cl.amount), 0)::int AS earned,
              COUNT(cl.id)::int AS uses_paid
       FROM marketplace_templates mt
       LEFT JOIN credit_ledger cl
         ON cl.ref_id = mt.id::text AND cl.user_id = $1 AND cl.type = 'royalty'
       WHERE mt.creator_id = $1
       GROUP BY mt.id
       ORDER BY earned DESC, mt.created_at DESC`,
      [req.user.id]
    );

    // 최근 적립 내역
    const recent = await query(
      `SELECT amount, description, created_at
       FROM credit_ledger WHERE user_id = $1 AND type = 'royalty'
       ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        isCreator,
        creatorShare: CREATOR_SHARE,
        totalEarned: totals.rows[0].total_earned,
        payoutCount: totals.rows[0].payout_count,
        templates: byTemplate.rows,
        recent: recent.rows,
      },
    });
  } catch (err) { next(err); }
});

/** POST /api/marketplace/apply — 크리에이터 신청(즉시 승인) */
router.post('/apply', async (req, res, next) => {
  try {
    await query('UPDATE users SET is_creator = true WHERE id = $1', [req.user.id]);
    res.json({ success: true, data: { isCreator: true } });
  } catch (err) { next(err); }
});

/**
 * POST /api/marketplace/templates — 템플릿 저장(Save as template).
 * 비공개(개인용)는 마찰 없이 누구나 / 공개 게시만 크리에이터 게이트.
 * tool(레지스트리 해석)·visibility·previewMedia·negativePrompt 저장.
 */
router.post('/templates', async (req, res, next) => {
  try {
    const {
      name, category, type = 'image', style = 'Natural', prompt,
      negativePrompt = '', emoji = '🎨', priceCredits = 0,
      tool, visibility = 'private', previewMedia = [],
    } = req.body || {};
    if (!name || !prompt) return res.status(400).json({ success: false, error: 'name과 prompt는 필수입니다.' });
    if (!CATEGORIES.has(category)) return res.status(400).json({ success: false, error: '유효한 category가 필요합니다.' });
    const t = TYPES.has(type) ? type : 'image';
    const vis = visibility === 'public' ? 'public' : 'private';

    // 공개 게시만 크리에이터 게이트 — 비공개 개인 저장은 마찰 없이 허용
    if (vis === 'public') {
      const u = await query('SELECT is_creator FROM users WHERE id = $1', [req.user.id]);
      if (!u.rows[0]?.is_creator) {
        return res.status(403).json({ success: false, error: '공개 게시는 먼저 크리에이터로 신청해 주세요.' });
      }
    }

    const resolvedTool = resolveToolId(tool, t === 'reel' ? 'reel' : 'image');
    const price = Math.max(0, Math.min(parseInt(priceCredits, 10) || 0, 100));
    const preview = Array.isArray(previewMedia) ? previewMedia.slice(0, 6) : [];
    const handle = '@' + String(req.user.email || 'creator').split('@')[0];

    const r = await query(
      `INSERT INTO marketplace_templates
         (creator_id, creator_handle, name, category, type, style, prompt, negative_prompt, tool, visibility, emoji, price_credits, preview_media)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb) RETURNING ${PUBLIC_COLS}`,
      [req.user.id, handle, String(name).slice(0, 120), category, t, String(style).slice(0, 50),
       String(prompt).slice(0, 2000), String(negativePrompt).slice(0, 1000), resolvedTool, vis,
       String(emoji).slice(0, 8), price, JSON.stringify(preview)]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/** DELETE /api/marketplace/templates/:id — 내 템플릿 내리기 */
router.delete('/templates/:id', async (req, res, next) => {
  try {
    const r = await query(
      `DELETE FROM marketplace_templates WHERE id = $1 AND creator_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ success: false, error: '내 템플릿이 아니거나 없습니다.' });
    res.json({ success: true, data: { id: r.rows[0].id } });
  } catch (err) { next(err); }
});

/**
 * POST /api/marketplace/templates/:id/use
 * 사용 기록 + (유료면) 사용료 차감 → 크리에이터 70% 분배. 스튜디오 적용용 파라미터(tool 포함) 반환.
 * 비공개는 본인 것만 사용 가능(타인 비공개 누수 방지).
 */
router.post('/templates/:id/use', async (req, res, next) => {
  let charge = null;
  try {
    const r = await query(
      `SELECT ${PUBLIC_COLS} FROM marketplace_templates WHERE id = $1 AND status = 'active' AND (visibility = 'public' OR creator_id = $2)`,
      [req.params.id, req.user.id]
    );
    const tpl = r.rows[0];
    if (!tpl) return res.status(404).json({ success: false, error: '템플릿을 찾을 수 없습니다.' });

    const isOwner = tpl.creator_id === req.user.id;
    // 유료 템플릿이고 내 것이 아니면 사용료 차감 + 크리에이터 분배
    if (tpl.price_credits > 0 && !isOwner) {
      charge = await creditService.charge(req.user, tpl.price_credits, {
        type: 'template_use',
        description: `템플릿 사용료: ${tpl.name}`,
        refId: tpl.id,
      });
      if (charge && tpl.creator_id) {
        const royalty = Math.round(tpl.price_credits * CREATOR_SHARE);
        if (royalty > 0) {
          await creditService.addCredits(tpl.creator_id, royalty, {
            type: 'royalty',
            description: `템플릿 수익: ${tpl.name}`,
            refId: tpl.id,
          }).catch(() => {});
        }
      }
    }

    await query('UPDATE marketplace_templates SET usage_count = usage_count + 1 WHERE id = $1', [tpl.id]);

    res.json({
      success: true,
      data: {
        id: tpl.id,
        name: tpl.name,
        category: tpl.category,
        type: tpl.type,
        style: tpl.style,
        prompt: tpl.prompt,
        negativePrompt: tpl.negative_prompt || '',
        tool: tpl.tool || null,
        emoji: tpl.emoji,
      },
      charged: charge ? charge.amount : 0,
    });
  } catch (err) {
    if (charge) await charge.refund();
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
});

const REPORT_THRESHOLD = 3; // 서로 다른 신고자 N명 이상 → 자동 비공개(테이크다운)

/** POST /api/marketplace/templates/:id/report — 공개 템플릿 신고(중복 무시). 누적 시 자동 테이크다운. */
router.post('/templates/:id/report', async (req, res, next) => {
  try {
    const reason = String((req.body && req.body.reason) || 'other').slice(0, 40);
    const tpl = await query(`SELECT id, creator_id, status FROM marketplace_templates WHERE id = $1`, [req.params.id]);
    if (!tpl.rows[0]) return res.status(404).json({ success: false, error: '템플릿을 찾을 수 없습니다.' });
    if (tpl.rows[0].creator_id === req.user.id) return res.status(400).json({ success: false, error: '본인 템플릿은 신고할 수 없습니다.' });

    await query(
      `INSERT INTO template_reports (template_id, reporter_id, reason) VALUES ($1,$2,$3)
       ON CONFLICT (template_id, reporter_id) DO NOTHING`,
      [req.params.id, req.user.id, reason]
    );
    // 서로 다른 신고자 수 → 임계 초과 + 아직 active면 자동 비공개
    const cnt = await query(`SELECT COUNT(DISTINCT reporter_id)::int AS n FROM template_reports WHERE template_id = $1`, [req.params.id]);
    let takenDown = false;
    if (cnt.rows[0].n >= REPORT_THRESHOLD && tpl.rows[0].status === 'active') {
      await query(`UPDATE marketplace_templates SET status = 'taken_down' WHERE id = $1`, [req.params.id]);
      takenDown = true;
    }
    res.json({ success: true, data: { reported: true, takenDown } });
  } catch (err) { next(err); }
});

module.exports = { router };
