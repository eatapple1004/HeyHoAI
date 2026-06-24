const { Router } = require('express');
const { query } = require('../db/client');
const { env } = require('../config');
const creditService = require('../credits/credit.service');
const { resolveToolId } = require('../tools/registry');

const router = Router();

const CATEGORIES = new Set(['Influencer', 'Shopping', 'UGC', 'Custom']);
const TYPES = new Set(['image', 'reel']);
const CREATOR_SHARE = 0.7; // 크리에이터 70% 수익분배

// 유료 과금이 실제로 도는가? 공식 시드(is_official)는 배포 즉시 라이브 유료(게이트 무관),
// 비공식(유저 생성) 유료 템플릿은 MARKETPLACE_PAID 점화 전엔 무료 취급(가격은 노출·저장만).
function paidActive(tpl) {
  return env.MARKETPLACE_PAID === true || tpl.is_official === true;
}

const PUBLIC_COLS = `id, creator_id, creator_handle, name, description, category, type, style, prompt,
  negative_prompt, tool, visibility, emoji, price_credits, use_price_credits, recipe_id, usage_count, likes_count,
  preview_media, reference_examples, is_official, created_at`;
// JOIN(template_bookmarks)에서 created_at 모호성 회피용 mt. 한정 버전
const MT_COLS = PUBLIC_COLS.split(',').map((c) => 'mt.' + c.trim()).join(', ');
// 템플릿 id = UUID. 비UUID(예: recipe 슬러그)를 id로 넘기면 `WHERE id = $1`이 캐스트 에러로 500 → 404로 가드.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 각 템플릿의 글로벌 테마 slug 배열(크리에이터 다중 태그) — Explore 칩 표시·필터용. 없으면 빈 배열.
const THEMES_SUBQ = `COALESCE((SELECT array_agg(th.slug ORDER BY th.sort_order)
    FROM template_themes tt JOIN themes th ON th.id = tt.theme_id
    WHERE tt.template_id = marketplace_templates.id), '{}') AS themes`;

// 템플릿의 글로벌 테마 태그를 슬러그 배열로 재설정(기존 삭제 후 유효 슬러그만 재삽입). 반환=확정 슬러그 배열.
async function setTemplateThemes(templateId, slugs) {
  const arr = Array.isArray(slugs)
    ? [...new Set(slugs.filter((s) => typeof s === 'string' && s))].slice(0, 12) : [];
  await query('DELETE FROM template_themes WHERE template_id = $1', [templateId]);
  if (arr.length) {
    await query(
      `INSERT INTO template_themes (template_id, theme_id)
       SELECT $1, th.id FROM themes th WHERE th.slug = ANY($2::text[])
       ON CONFLICT DO NOTHING`,
      [templateId, arr]
    );
  }
  // 유효 테마가 하나도 안 남으면(미설정 or 전부 무효 slug) 'general' 폴백 — "테마 없음 = General".
  const cnt = await query('SELECT count(*)::int AS c FROM template_themes WHERE template_id = $1', [templateId]);
  if (cnt.rows[0].c === 0) {
    await query(`INSERT INTO template_themes (template_id, theme_id) SELECT $1, id FROM themes WHERE slug = 'general' ON CONFLICT DO NOTHING`, [templateId]);
  }
  const r = await query(
    `SELECT th.slug FROM template_themes tt JOIN themes th ON th.id = tt.theme_id
      WHERE tt.template_id = $1 ORDER BY th.sort_order`,
    [templateId]
  );
  return r.rows.map((x) => x.slug);
}

/**
 * GET /api/marketplace/templates?category=Influencer&feed=1
 * 기본: 공개 + 내 비공개(타인 비공개 누수 방지).
 * feed=1: 공개 무료(price_credits=0)만, 좋아요순 — Library Feed용.
 */
router.get('/templates', async (req, res, next) => {
  try {
    const { category, feed, theme } = req.query;
    const isFeed = feed === '1' || feed === 'true';
    const params = [req.user.id];
    let where = isFeed
      ? `status = 'active' AND visibility = 'public' AND price_credits = 0`
      : `status = 'active' AND (visibility = 'public' OR creator_id = $1)`;
    if (category && CATEGORIES.has(category)) {
      params.push(category);
      where += ` AND category = $${params.length}`;
    }
    if (theme) {
      params.push(theme);
      where += ` AND EXISTS(SELECT 1 FROM template_themes tt JOIN themes th ON th.id = tt.theme_id
                            WHERE tt.template_id = marketplace_templates.id AND th.slug = $${params.length})`;
    }
    const order = isFeed ? 'likes_count DESC, usage_count DESC' : 'is_official DESC, usage_count DESC';
    const r = await query(
      `SELECT ${PUBLIC_COLS}, (creator_id = $1) AS mine,
              EXISTS(SELECT 1 FROM template_bookmarks tb WHERE tb.template_id = marketplace_templates.id AND tb.user_id = $1) AS bookmarked,
              EXISTS(SELECT 1 FROM template_owns ow WHERE ow.template_id = marketplace_templates.id AND ow.user_id = $1) AS owned,
              ${THEMES_SUBQ}
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
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ success: false, error: '템플릿을 찾을 수 없습니다.' });
    const r = await query(
      `SELECT ${PUBLIC_COLS}, (creator_id = $2) AS mine,
              EXISTS(SELECT 1 FROM template_bookmarks tb WHERE tb.template_id = marketplace_templates.id AND tb.user_id = $2) AS bookmarked,
              EXISTS(SELECT 1 FROM template_owns ow WHERE ow.template_id = marketplace_templates.id AND ow.user_id = $2) AS owned,
              ${THEMES_SUBQ}
       FROM marketplace_templates
       WHERE id = $1 AND status = 'active' AND (visibility = 'public' OR creator_id = $2)`,
      [req.params.id, req.user.id]
    );
    const tpl = r.rows[0];
    if (!tpl) return res.status(404).json({ success: false, error: '템플릿을 찾을 수 없습니다.' });
    // 블랙박스: 보유(구매/제작)하지 않은 유료 템플릿은 prompt 숨김. 보유/내 것은 그대로.
    if (tpl.price_credits > 0 && !tpl.mine && !tpl.owned) { tpl.prompt = null; tpl.negative_prompt = null; }

    // 이 템플릿으로 만들어진 creation 수 + 좋아요 합. ⚠️ recipe-backed 공식 템플릿은 creation이
    // source='recipe', template_id=recipe_id 로 귀속되므로 그것도 매칭(마켓 귀속 + 레시피 귀속 둘 다).
    const agg = await query(
      `SELECT COUNT(*)::int AS creations, COALESCE(SUM(likes_count), 0)::int AS likes
         FROM generation_results
        WHERE ((template_source = 'marketplace' AND template_id = $1)
            OR ($2 <> '' AND template_source = 'recipe' AND template_id = $2))
          AND status = 'success' AND taken_down = false`,
      [req.params.id, tpl.recipe_id || '']
    );
    tpl.creationsCount = agg.rows[0].creations;
    tpl.totalLikes = agg.rows[0].likes;
    // 수익은 본인 템플릿에만 노출(남의 수익 비공개). 로열티 포인트(type='royalty', ref_id=템플릿id) 합 — earnings와 동일 계산.
    if (tpl.mine) {
      const rev = await query(
        `SELECT COALESCE(SUM(amount), 0)::int AS revenue
           FROM point_ledger WHERE user_id = $1 AND type = 'royalty' AND ref_id = $2`,
        [req.user.id, String(req.params.id)]
      );
      tpl.revenue = rev.rows[0].revenue;
    }
    res.json({ success: true, data: tpl });
  } catch (err) { next(err); }
});

/** GET /api/marketplace/templates/:id/creations — 이 템플릿으로 만든 공개 creation들, 좋아요순(이미지/영상 갤러리·사회적 증명). */
router.get('/templates/:id/creations', async (req, res, next) => {
  try {
    // recipe-backed 공식 템플릿은 creation이 source='recipe', template_id=recipe_id 로 귀속 → 마켓·레시피 둘 다 매칭.
    const r = await query(
      `SELECT gr.idx, gr.file_path, gr.metadata, gr.likes_count
         FROM generation_results gr
         JOIN marketplace_templates mt ON mt.id = $1
        WHERE ((gr.template_source = 'marketplace' AND gr.template_id = mt.id::text)
            OR (mt.recipe_id IS NOT NULL AND gr.template_source = 'recipe' AND gr.template_id = mt.recipe_id))
          AND gr.visibility = 'public' AND gr.status = 'success'
          AND gr.taken_down = false AND gr.file_path IS NOT NULL
        ORDER BY gr.likes_count DESC, gr.created_at DESC
        LIMIT 60`,
      [req.params.id]
    );
    res.json({ success: true, data: r.rows.map((x) => ({
      idx: x.idx,
      url: x.file_path ? `/${x.file_path.replace(/^tmp\//, '')}` : null,
      type: (x.metadata && x.metadata.type === 'video') ? 'video' : 'image',
      likes: x.likes_count || 0,
    })) });
  } catch (err) { next(err); }
});

/** GET /api/marketplace/themes — 글로벌 테마 목록(크리에이터 태깅·Explore 칩·스튜디오 시드용). */
router.get('/themes', async (req, res, next) => {
  try {
    const r = await query('SELECT slug, name FROM themes ORDER BY sort_order, name');
    res.json({ success: true, data: r.rows });
  } catch (err) { next(err); }
});

/** GET /api/marketplace/me — 크리에이터 상태 + 내가 게시한 템플릿 */
router.get('/me', async (req, res, next) => {
  try {
    const u = await query('SELECT is_creator FROM users WHERE id = $1', [req.user.id]);
    const mine = await query(
      `SELECT ${PUBLIC_COLS}, from_creation_idx FROM marketplace_templates WHERE creator_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    // My templates 마스터: 내 것(저장/생성) + 오피셜(플랫폼 공식). 둘 다 studio 테마에 넣다뺐다 가능.
    const official = await query(
      `SELECT ${PUBLIC_COLS}, from_creation_idx FROM marketplace_templates WHERE is_official = true AND status = 'active' AND visibility = 'public' ORDER BY created_at DESC`,
      []
    );
    res.json({ success: true, data: { isCreator: u.rows[0]?.is_creator || false, templates: mine.rows, official: official.rows } });
  } catch (err) { next(err); }
});

/**
 * GET /api/marketplace/earnings — 셀러(크리에이터) 정산 대시보드
 * 로열티는 '포인트'로 적립(point_ledger type='royalty', ref_id=템플릿id). 총수익·템플릿별·최근·현재 포인트 잔액 반환.
 */
router.get('/earnings', async (req, res, next) => {
  try {
    const u = await query('SELECT is_creator, point_balance FROM users WHERE id = $1', [req.user.id]);
    const isCreator = u.rows[0]?.is_creator || false;

    // 총 수익(누적 포인트) + 적립 건수
    const totals = await query(
      `SELECT COALESCE(SUM(amount), 0)::int AS total_earned, COUNT(*)::int AS payout_count
       FROM point_ledger WHERE user_id = $1 AND type = 'royalty'`,
      [req.user.id]
    );

    // 템플릿별 수익 (ref_id=템플릿 UUID를 TEXT로 저장 → 캐스팅 조인)
    const byTemplate = await query(
      `SELECT mt.id, mt.name, mt.description, mt.emoji, mt.category, mt.type, mt.price_credits, mt.use_price_credits, mt.usage_count, mt.visibility,
              COALESCE(SUM(pl.amount), 0)::int AS earned,
              COUNT(pl.id)::int AS uses_paid
       FROM marketplace_templates mt
       LEFT JOIN point_ledger pl
         ON pl.ref_id = mt.id::text AND pl.user_id = $1 AND pl.type = 'royalty'
       WHERE mt.creator_id = $1
       GROUP BY mt.id
       ORDER BY earned DESC, mt.created_at DESC`,
      [req.user.id]
    );

    // 최근 적립 내역
    const recent = await query(
      `SELECT amount, description, created_at
       FROM point_ledger WHERE user_id = $1 AND type = 'royalty'
       ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        isCreator,
        handle: '@' + String(req.user.email || 'creator').split('@')[0],
        creatorShare: CREATOR_SHARE,
        pointBalance: u.rows[0]?.point_balance || 0, // 교환 가능한 현재 포인트
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
      name, description = '', category, type = 'image', style = 'Natural', prompt,
      negativePrompt = '', emoji = '🎨', priceCredits = 0, usePriceCredits = 0,
      tool, visibility = 'private', previewMedia = [], referenceExamples = [],
      themeSlugs = [], // 크리에이터 다중 테마 태그(글로벌 themes.slug 배열)
      sourceResultIdx, // 이 템플릿의 씨앗 creation(역링크 + 누적 좋아요 롤업용, 선택)
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
    const usePrice = Math.max(0, Math.min(parseInt(usePriceCredits, 10) || 0, 50)); // 사용당 로열티(소액, ≤50)
    const preview = Array.isArray(previewMedia) ? previewMedia.slice(0, 6) : [];
    // 전시용 레퍼런스(제작에 쓴 입력 이미지) — 생성엔 미주입, 상세페이지 갤러리 전용. 문자열 URL만 통과·최대 6장.
    const refExamples = Array.isArray(referenceExamples)
      ? referenceExamples.filter((u) => typeof u === 'string' && u).slice(0, 6) : [];
    const desc = String(description || '').slice(0, 600);
    const handle = '@' + String(req.user.email || 'creator').split('@')[0];

    const r = await query(
      `INSERT INTO marketplace_templates
         (creator_id, creator_handle, name, description, category, type, style, prompt, negative_prompt, tool, visibility, emoji, price_credits, use_price_credits, preview_media, reference_examples)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb) RETURNING ${PUBLIC_COLS}`,
      [req.user.id, handle, String(name).slice(0, 120), desc, category, t, String(style).slice(0, 50),
       String(prompt).slice(0, 8000), String(negativePrompt).slice(0, 1000), resolvedTool, vis,
       String(emoji).slice(0, 8), price, usePrice, JSON.stringify(preview), JSON.stringify(refExamples)]
    );
    const created = r.rows[0];

    // 씨앗 creation 역링크 + 누적 좋아요 롤업(등록 즉시 사회적 증명). 본인 소유·아직 미귀속(Custom) 결과만.
    // 공개(마켓) 게시일 때만 — 비공개(개인) 템플릿은 마켓 노출이 없어 역링크 시 creation에 막다른 Get CTA가 생김.
    const srcIdx = parseInt(sourceResultIdx, 10);
    if (srcIdx && vis === 'public') {
      const link = await query(
        `UPDATE generation_results gr
            SET template_id = $1, template_source = 'marketplace'
           FROM prompts p
          WHERE p.idx = gr.prompt_idx AND gr.idx = $2 AND p.user_id = $3
            AND gr.template_id IS NULL
          RETURNING gr.likes_count`,
        [created.id, srcIdx, req.user.id]
      );
      const seedLikes = link.rows[0] ? (link.rows[0].likes_count || 0) : 0;
      if (seedLikes > 0) {
        await query('UPDATE marketplace_templates SET likes_count = likes_count + $2 WHERE id = $1', [created.id, seedLikes]);
        created.likes_count = (created.likes_count || 0) + seedLikes;
      }
    }
    created.themes = await setTemplateThemes(created.id, themeSlugs);
    res.status(201).json({ success: true, data: created });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/marketplace/templates/:id — 내 템플릿 편집(이름·가격·공개·카테고리·네거티브).
 * 비공개→공개 전환은 크리에이터 게이트. 가격 0~100 클램프(0=무료). 부분 업데이트.
 */
router.patch('/templates/:id', async (req, res, next) => {
  try {
    const cur = await query(
      `SELECT id, visibility FROM marketplace_templates WHERE id = $1 AND creator_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!cur.rows[0]) return res.status(404).json({ success: false, error: '내 템플릿이 아니거나 없습니다.' });

    const body = req.body || {};
    const sets = [];
    const params = [];
    if (typeof body.name === 'string' && body.name.trim()) {
      params.push(body.name.trim().slice(0, 120)); sets.push(`name = $${params.length}`);
    }
    if (body.category !== undefined && CATEGORIES.has(body.category)) {
      params.push(body.category); sets.push(`category = $${params.length}`);
    }
    if (body.description !== undefined) {
      params.push(String(body.description || '').slice(0, 600)); sets.push(`description = $${params.length}`);
    }
    if (body.priceCredits !== undefined) {
      const price = Math.max(0, Math.min(parseInt(body.priceCredits, 10) || 0, 100));
      params.push(price); sets.push(`price_credits = $${params.length}`);
    }
    if (body.usePriceCredits !== undefined) {
      const usePrice = Math.max(0, Math.min(parseInt(body.usePriceCredits, 10) || 0, 50));
      params.push(usePrice); sets.push(`use_price_credits = $${params.length}`);
    }
    if (body.negativePrompt !== undefined) {
      params.push(String(body.negativePrompt).slice(0, 1000)); sets.push(`negative_prompt = $${params.length}`);
    }
    if (body.visibility !== undefined) {
      const vis = body.visibility === 'public' ? 'public' : 'private';
      // 공개 전환만 게이트(이미 공개거나 비공개 전환은 자유)
      if (vis === 'public' && cur.rows[0].visibility !== 'public') {
        const u = await query('SELECT is_creator FROM users WHERE id = $1', [req.user.id]);
        if (!u.rows[0]?.is_creator) {
          return res.status(403).json({ success: false, error: '공개 게시는 먼저 크리에이터로 신청해 주세요.' });
        }
      }
      params.push(vis); sets.push(`visibility = $${params.length}`);
    }
    const hasThemes = body.themeSlugs !== undefined; // 테마만 바꾸는 것도 허용
    if (!sets.length && !hasThemes) return res.status(400).json({ success: false, error: '변경할 내용이 없습니다.' });

    let row;
    if (sets.length) {
      params.push(req.params.id);
      const r = await query(
        `UPDATE marketplace_templates SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING ${PUBLIC_COLS}`,
        params
      );
      row = r.rows[0];
    } else {
      const r = await query(`SELECT ${PUBLIC_COLS} FROM marketplace_templates WHERE id = $1`, [req.params.id]);
      row = r.rows[0];
    }
    if (hasThemes) row.themes = await setTemplateThemes(req.params.id, body.themeSlugs);
    res.json({ success: true, data: row });
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
async function isOwned(userId, tpl) {
  if (tpl.creator_id === userId) return true; // 제작자는 자동 보유
  const o = await query('SELECT 1 FROM template_owns WHERE user_id = $1 AND template_id = $2', [userId, tpl.id]);
  return !!o.rows[0];
}

router.post('/templates/:id/use', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT ${PUBLIC_COLS} FROM marketplace_templates WHERE id = $1 AND status = 'active' AND (visibility = 'public' OR creator_id = $2)`,
      [req.params.id, req.user.id]
    );
    const tpl = r.rows[0];
    if (!tpl) return res.status(404).json({ success: false, error: '템플릿을 찾을 수 없습니다.' });

    // buy-to-own: 보유해야 사용. 유료 미보유 → 402(구매 필요). 무료 미보유 → 자동 보유(추가).
    if (!(await isOwned(req.user.id, tpl))) {
      if (tpl.price_credits > 0) {
        return res.status(402).json({ success: false, error: '먼저 구매해야 사용할 수 있습니다.', data: { needPurchase: true, price: tpl.price_credits } });
      }
      await query(
        `INSERT INTO template_owns (user_id, template_id, source, price_paid) VALUES ($1,$2,'free',0) ON CONFLICT DO NOTHING`,
        [req.user.id, tpl.id]
      );
    }

    await query('UPDATE marketplace_templates SET usage_count = usage_count + 1 WHERE id = $1', [tpl.id]);
    res.json({
      success: true,
      data: {
        id: tpl.id, name: tpl.name, category: tpl.category, type: tpl.type, style: tpl.style,
        prompt: tpl.prompt, negativePrompt: tpl.negative_prompt || '', tool: tpl.tool || null, emoji: tpl.emoji,
        recipeId: tpl.recipe_id || null, // recipe-backed면 스튜디오가 리치 recipe를 로드
      },
      charged: 0, // 사용 시점엔 과금 없음(구매료=/acquire / 사용당 로열티=생성 시점)
    });
  } catch (err) { next(err); }
});

/**
 * POST /api/marketplace/templates/:id/acquire — 보유 획득.
 * 무료=즉시 보유(추가). 유료=price_credits 1회 과금 + 크리에이터 70% 로열티 + 보유. 이미 보유=멱등(무과금).
 */
router.post('/templates/:id/acquire', async (req, res, next) => {
  let charge = null;
  try {
    const r = await query(
      `SELECT ${PUBLIC_COLS} FROM marketplace_templates WHERE id = $1 AND status = 'active' AND (visibility = 'public' OR creator_id = $2)`,
      [req.params.id, req.user.id]
    );
    const tpl = r.rows[0];
    if (!tpl) return res.status(404).json({ success: false, error: '템플릿을 찾을 수 없습니다.' });

    if (await isOwned(req.user.id, tpl)) {
      return res.json({ success: true, data: { id: tpl.id, owned: true, alreadyOwned: true }, charged: 0 });
    }

    // 점화 게이트: 비공식 유료 템플릿은 MARKETPLACE_PAID 전엔 가격 0 취급(무료 언락). 공식은 항상 과금.
    const effectivePrice = paidActive(tpl) ? tpl.price_credits : 0;
    let source = 'free', pricePaid = 0;
    if (effectivePrice > 0) {
      charge = await creditService.charge(req.user, effectivePrice, {
        type: 'template_purchase', description: `템플릿 구매: ${tpl.name}`, refId: tpl.id,
      });
      source = 'purchase';
      pricePaid = charge ? charge.amount : effectivePrice;
    }

    const ins = await query(
      `INSERT INTO template_owns (user_id, template_id, source, price_paid) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, template_id) DO NOTHING RETURNING user_id`,
      [req.user.id, tpl.id, source, pricePaid]
    );
    if (ins.rowCount === 0) { // 동시 획득 — 이미 보유. 과금했으면 환불.
      if (charge) await charge.refund();
      return res.json({ success: true, data: { id: tpl.id, owned: true, alreadyOwned: true }, charged: 0 });
    }
    // 구매 성공 후에만 로열티 분배(70%) → 크리에이터 포인트(현금성, credit 아님)
    if (charge && tpl.creator_id && effectivePrice > 0) {
      const royalty = Math.round(effectivePrice * CREATOR_SHARE);
      if (royalty > 0) await creditService.addPoints(tpl.creator_id, royalty, {
        type: 'royalty', description: `템플릿 판매: ${tpl.name}`, refId: tpl.id,
      }).catch(() => {});
    }
    res.json({ success: true, data: { id: tpl.id, owned: true, source }, charged: pricePaid });
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

/**
 * GET /api/marketplace/creators/:handle — 크리에이터 공개 스토어프론트.
 * 공개·active 템플릿 + 쇼케이스(해당 크리에이터 공개 결과물). prompt(레시피)는 노출 안 함(블랙박스 보호).
 */
router.get('/creators/:handle', async (req, res, next) => {
  try {
    const raw = String(req.params.handle || '').replace(/^@+/, '').slice(0, 80);
    if (!raw) return res.status(400).json({ success: false, error: 'handle이 필요합니다.' });
    const handle = '@' + raw;
    // 핸들 → 실제 소유자(user) 해석. 템플릿은 brittle한 creator_handle 문자열이 아니라 소유자(creator_id)로 매칭
    // (creator_handle이 소유자와 어긋나면 본인 공개 템플릿이 프로필에 0건으로 뜨던 버그 방지). 공식(creator_id NULL)은 handle로.
    const cu = await query("SELECT id FROM users WHERE split_part(email, '@', 1) = $1 LIMIT 1", [raw]);
    const creatorId = cu.rows[0] ? cu.rows[0].id : null;
    const tpls = await query(
      `SELECT id, creator_handle, name, category, type, style, tool, emoji,
              price_credits, usage_count, likes_count, preview_media, is_official, created_at,
              EXISTS(SELECT 1 FROM template_bookmarks tb WHERE tb.template_id = marketplace_templates.id AND tb.user_id = $2) AS bookmarked
       FROM marketplace_templates
       WHERE status = 'active' AND visibility = 'public'
         AND ( ($3::uuid IS NOT NULL AND creator_id = $3) OR (creator_id IS NULL AND creator_handle = $1) )
       ORDER BY is_official DESC, usage_count DESC, created_at DESC LIMIT 100`,
      [handle, req.user.id, creatorId]
    );
    const showcase = await query(
      `SELECT gr.idx, gr.file_path, gr.metadata
       FROM generation_results gr
       JOIN prompts p ON p.idx = gr.prompt_idx
       JOIN users u   ON u.id = p.user_id
       WHERE split_part(u.email, '@', 1) = $1 AND gr.visibility = 'public'
         AND gr.status = 'success' AND gr.taken_down = false AND gr.file_path IS NOT NULL
       ORDER BY gr.created_at DESC LIMIT 12`,
      [raw]
    );
    if (!tpls.rows.length && !showcase.rows.length) {
      return res.status(404).json({ success: false, error: '크리에이터를 찾을 수 없습니다.' });
    }
    const totalLikes = tpls.rows.reduce((s, t) => s + (t.likes_count || 0), 0);
    // 팔로우 상태(위에서 해석한 creatorId 재사용)
    const isOwn = !!creatorId && creatorId === req.user.id;
    let followers = 0, following = false;
    if (creatorId) {
      followers = (await query('SELECT count(*)::int AS n FROM follows WHERE creator_id = $1', [creatorId])).rows[0].n;
      if (!isOwn) following = (await query('SELECT 1 FROM follows WHERE creator_id = $1 AND follower_id = $2', [creatorId, req.user.id])).rowCount > 0;
    }
    res.json({
      success: true,
      data: {
        handle,
        templateCount: tpls.rows.length,
        totalLikes,
        followers,
        following,
        isOwn,
        templates: tpls.rows,
        showcase: showcase.rows.map((r) => ({
          idx: r.idx,
          url: r.file_path ? `/${r.file_path.replace(/^tmp\//, '')}` : null,
          type: (r.metadata && r.metadata.type === 'video') ? 'video' : 'image',
        })),
      },
    });
  } catch (err) { next(err); }
});

// 크리에이터 팔로우/언팔로우 — handle을 creator user id로 해석. 자기 자신 금지, 멱등.
async function resolveCreatorId(raw) {
  const r = await query("SELECT id FROM users WHERE split_part(email, '@', 1) = $1 LIMIT 1", [raw]);
  return r.rows[0] ? r.rows[0].id : null;
}
async function followerCount(creatorId) {
  return (await query('SELECT count(*)::int AS n FROM follows WHERE creator_id = $1', [creatorId])).rows[0].n;
}
router.post('/creators/:handle/follow', async (req, res, next) => {
  try {
    const raw = String(req.params.handle || '').replace(/^@+/, '').slice(0, 80);
    const creatorId = await resolveCreatorId(raw);
    if (!creatorId) return res.status(404).json({ success: false, error: '크리에이터를 찾을 수 없습니다.' });
    if (creatorId === req.user.id) return res.status(400).json({ success: false, error: '자기 자신은 팔로우할 수 없습니다.' });
    await query('INSERT INTO follows (follower_id, creator_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, creatorId]);
    res.json({ success: true, data: { following: true, followers: await followerCount(creatorId) } });
  } catch (err) { next(err); }
});
router.delete('/creators/:handle/follow', async (req, res, next) => {
  try {
    const raw = String(req.params.handle || '').replace(/^@+/, '').slice(0, 80);
    const creatorId = await resolveCreatorId(raw);
    if (!creatorId) return res.status(404).json({ success: false, error: '크리에이터를 찾을 수 없습니다.' });
    await query('DELETE FROM follows WHERE follower_id = $1 AND creator_id = $2', [req.user.id, creatorId]);
    res.json({ success: true, data: { following: false, followers: await followerCount(creatorId) } });
  } catch (err) { next(err); }
});

/** GET /api/marketplace/bookmarks — 내가 저장한 템플릿(Library Saved 탭). active만, 최근 저장순. */
router.get('/bookmarks', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT ${MT_COLS}, (mt.creator_id = $1) AS mine, true AS bookmarked
       FROM template_bookmarks tb
       JOIN marketplace_templates mt ON mt.id = tb.template_id
       WHERE tb.user_id = $1 AND mt.status = 'active'
       ORDER BY tb.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) { next(err); }
});

/** GET /api/marketplace/recipe-gates — recipe-backed 유료 템플릿 게이트. 스튜디오: 미보유=recipe 숨김 / 보유=노출. */
router.get('/recipe-gates', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT mt.id, mt.recipe_id, mt.price_credits,
              EXISTS(SELECT 1 FROM template_owns ow WHERE ow.template_id = mt.id AND ow.user_id = $1) AS owned,
              EXISTS(SELECT 1 FROM template_owns ow WHERE ow.template_id = mt.id AND ow.user_id = $1 AND ow.in_studio) AS in_studio
       FROM marketplace_templates mt
       WHERE mt.recipe_id IS NOT NULL AND mt.status = 'active' AND mt.price_credits > 0`,
      [req.user.id]
    );
    // inStudio = 보유 && in_studio (스튜디오 노출 결정). owned는 카탈로그 필터/구매 판단용.
    res.json({ success: true, data: r.rows.map((x) => ({ templateId: x.id, recipeId: x.recipe_id, price: x.price_credits, owned: x.owned, inStudio: x.in_studio })) });
  } catch (err) { next(err); }
});

/** GET /api/marketplace/owned — 내가 보유(무료추가/구매)한 템플릿. studio pick-a-template 머지용. 보유분은 prompt 포함. */
router.get('/owned', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT ${MT_COLS}, mt.from_creation_idx, true AS owned, ow.source AS own_source, ow.in_studio
       FROM template_owns ow
       JOIN marketplace_templates mt ON mt.id = ow.template_id
       WHERE ow.user_id = $1 AND mt.status = 'active'
       ORDER BY ow.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) { next(err); }
});

/** PATCH /api/marketplace/owned/:templateId  { inStudio } — 보유 템플릿의 studio 노출 토글. */
router.patch('/owned/:templateId', async (req, res, next) => {
  try {
    const inStudio = !!(req.body && (req.body.inStudio === true || req.body.inStudio === 'true'));
    const r = await query(
      `UPDATE template_owns SET in_studio = $1 WHERE user_id = $2 AND template_id = $3 RETURNING template_id, in_studio`,
      [inStudio, req.user.id, req.params.templateId]
    );
    if (r.rowCount === 0) return res.status(404).json({ success: false, error: '보유하지 않은 템플릿입니다.' });
    res.json({ success: true, data: { templateId: r.rows[0].template_id, inStudio: r.rows[0].in_studio } });
  } catch (err) { next(err); }
});

/** POST /api/marketplace/templates/:id/bookmark — 템플릿 저장(Saved). 공개 또는 내 것만. (멱등) */
router.post('/templates/:id/bookmark', async (req, res, next) => {
  try {
    const t = await query(
      `SELECT id FROM marketplace_templates WHERE id = $1 AND status = 'active' AND (visibility = 'public' OR creator_id = $2)`,
      [req.params.id, req.user.id]
    );
    if (!t.rows[0]) return res.status(404).json({ success: false, error: '템플릿을 찾을 수 없습니다.' });
    await query(
      `INSERT INTO template_bookmarks (user_id, template_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.user.id, req.params.id]
    );
    res.json({ success: true, data: { bookmarked: true } });
  } catch (err) { next(err); }
});

/** DELETE /api/marketplace/templates/:id/bookmark — 저장 해제 */
router.delete('/templates/:id/bookmark', async (req, res, next) => {
  try {
    await query(`DELETE FROM template_bookmarks WHERE user_id = $1 AND template_id = $2`, [req.user.id, req.params.id]);
    res.json({ success: true, data: { bookmarked: false } });
  } catch (err) { next(err); }
});

module.exports = { router };
