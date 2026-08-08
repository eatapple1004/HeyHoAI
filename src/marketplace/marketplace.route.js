const { Router } = require('express');
const { query } = require('../db/client');
const svc = require('./marketplace.service');

const router = Router();

// 공용 상수/헬퍼는 marketplace.service.js 단일소스(레거시·Nest 공용).
const { PUBLIC_COLS, MT_COLS, UUID_RE, THEMES_SUBQ, CREATOR_SHARE } = svc;

// statusCode 도메인 에러는 그대로 응답(402는 data 동봉 — toErrorBody가 처리).
function handle(err, res, next) {
  if (err.statusCode) return res.status(err.statusCode).json(svc.toErrorBody(err));
  next(err);
}

// ─────────────────────────────────────────────────────────────
// /templates 서브트리 = NestJS로 이관 완료(dev). 아래는 prod/staging용 얇은 라우트로,
// 로직은 marketplace.service.js를 그대로 호출한다(로직 이중화 금지).
// ─────────────────────────────────────────────────────────────

/** GET /api/marketplace/templates?category=&feed=1&theme= — 카탈로그 */
router.get('/templates', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.listTemplates(req.user.id, req.query) });
  } catch (err) { handle(err, res, next); }
});

/** GET /api/marketplace/templates/:id — 템플릿 상세(유료는 prompt 블랙박스) */
router.get('/templates/:id', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.getTemplate(req.user.id, req.params.id) });
  } catch (err) { handle(err, res, next); }
});

/** GET /api/marketplace/templates/:id/creations — 이 템플릿으로 만든 공개 creation들 */
router.get('/templates/:id/creations', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.getTemplateCreations(req.params.id) });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/marketplace/templates — 템플릿 저장(Save as template) */
router.post('/templates', async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await svc.createTemplate(req.user, req.body || {}) });
  } catch (err) { handle(err, res, next); }
});

/** PATCH /api/marketplace/templates/:id — 내 템플릿 편집 */
router.patch('/templates/:id', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.updateTemplate(req.user.id, req.params.id, req.body || {}) });
  } catch (err) { handle(err, res, next); }
});

/** DELETE /api/marketplace/templates/:id — 내 템플릿 내리기 */
router.delete('/templates/:id', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.deleteTemplate(req.user.id, req.params.id) });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/marketplace/templates/:id/use — 사용(보유 게이트) */
router.post('/templates/:id/use', async (req, res, next) => {
  try {
    const out = await svc.useTemplate(req.user.id, req.params.id);
    res.json({ success: true, ...out });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/marketplace/templates/:id/acquire — 보유 획득(유료면 과금+로열티) */
router.post('/templates/:id/acquire', async (req, res, next) => {
  try {
    const out = await svc.acquireTemplate(req.user, req.params.id);
    res.json({ success: true, ...out });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/marketplace/templates/:id/add-to-my-templates — 내 템플릿을 My templates에 추가(멱등) */
router.post('/templates/:id/add-to-my-templates', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.addToMyTemplates(req.user.id, req.params.id) });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/marketplace/templates/:id/report — 신고(누적 시 자동 테이크다운) */
router.post('/templates/:id/report', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.reportTemplate(req.user.id, req.params.id, (req.body || {}).reason) });
  } catch (err) { handle(err, res, next); }
});

/** POST /api/marketplace/templates/:id/bookmark — 저장(멱등) */
router.post('/templates/:id/bookmark', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.bookmarkTemplate(req.user.id, req.params.id) });
  } catch (err) { handle(err, res, next); }
});

/** DELETE /api/marketplace/templates/:id/bookmark — 저장 해제 */
router.delete('/templates/:id/bookmark', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.unbookmarkTemplate(req.user.id, req.params.id) });
  } catch (err) { handle(err, res, next); }
});

// ─────────────────────────────────────────────────────────────
// 아래는 아직 레거시 전용(다음 이관 단계 대상): themes·me·earnings·apply·creators·
// bookmarks·recipe-gates·owned·default-officials
// ─────────────────────────────────────────────────────────────

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
    // My templates = 내가 추가한 것만. auto 자동민팅(origin='auto') 중 아직 추가(owns) 안 한 건 제외(누출 방지).
    //   manual(수동 Save·시드)은 항상 포함, 추가된 auto는 owns 있어 포함.
    const mine = await query(
      `SELECT ${PUBLIC_COLS}, from_creation_idx, origin,
              EXISTS(SELECT 1 FROM template_owns o WHERE o.template_id = marketplace_templates.id AND o.user_id = $1) AS added_to_library,
              ${THEMES_SUBQ} FROM marketplace_templates
        WHERE creator_id = $1
          AND (origin <> 'auto' OR EXISTS(SELECT 1 FROM template_owns o WHERE o.template_id = marketplace_templates.id AND o.user_id = $1))
        ORDER BY created_at DESC`,
      [req.user.id]
    );
    // My templates 마스터: 내 것(저장/생성) + 오피셜(플랫폼 공식). 둘 다 studio 테마에 넣다뺐다 가능.
    const official = await query(
      `SELECT ${PUBLIC_COLS}, from_creation_idx, origin,
              EXISTS(SELECT 1 FROM template_owns o WHERE o.template_id = marketplace_templates.id AND o.user_id = $1) AS added_to_library,
              ${THEMES_SUBQ} FROM marketplace_templates WHERE is_official = true AND status = 'active' AND visibility = 'public' ORDER BY created_at DESC`,
      [req.user.id]
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
              mt.origin, mt.from_creation_idx, mt.created_at,
              COALESCE((SELECT array_agg(th.slug ORDER BY th.sort_order) FROM template_themes tt JOIN themes th ON th.id = tt.theme_id WHERE tt.template_id = mt.id), '{}') AS themes,
              EXISTS(SELECT 1 FROM template_owns o WHERE o.template_id = mt.id AND o.user_id = $1) AS added_to_library,
              COALESCE(SUM(pl.amount), 0)::int AS earned,
              COUNT(pl.id)::int AS uses_paid
       FROM marketplace_templates mt
       LEFT JOIN point_ledger pl
         ON pl.ref_id = mt.id::text AND pl.user_id = $1 AND pl.type = 'royalty'
       WHERE mt.creator_id = $1
         -- 자동민팅 폐지(2026-07-01): 승격(owns)하지 않은 옛 auto 템플릿은 Creator Studio에서 숨김(/me와 동일 규칙)
         AND (mt.origin <> 'auto' OR EXISTS(SELECT 1 FROM template_owns o2 WHERE o2.template_id = mt.id AND o2.user_id = $1))
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
              COALESCE((SELECT ow.in_studio FROM template_owns ow WHERE ow.template_id = mt.id AND ow.user_id = $1), true) AS in_studio
       FROM marketplace_templates mt
       WHERE mt.recipe_id IS NOT NULL AND mt.status = 'active' AND mt.price_credits > 0`,
      [req.user.id]
    );
    // owned=보유 → 메인 그리드 노출 / 미보유 → 프리미엄 업셀. (in_studio 폐기·안A: studio 노출은 테마 멤버십이 결정)
    res.json({ success: true, data: r.rows.map((x) => ({ templateId: x.id, recipeId: x.recipe_id, price: x.price_credits, owned: x.owned, in_studio: x.in_studio })) });
  } catch (err) { next(err); }
});

/** GET /api/marketplace/owned — 내가 보유(무료추가/구매)한 템플릿 전부(내가 만든 것 + 타인에게서 구매한 것).
 *  §5: Library My templates의 정본 소스(owns 기준). studio pick-a-template 머지에도 사용. 보유분은 prompt 포함.
 *  origin(Auto 배지)·mine(내 것 vs 구매)·themes(테마 필터) 포함. */
router.get('/owned', async (req, res, next) => {
  try {
    const uid = req.user.id;
    const r = await query(
      `SELECT ${MT_COLS}, mt.from_creation_idx, mt.origin, true AS owned, COALESCE(ow.source, 'default') AS own_source, COALESCE(ow.in_studio, true) AS in_studio,
              (mt.creator_id = $1) AS mine,
              COALESCE(mt.preview_media->>0, (SELECT '/'||regexp_replace(gr.file_path,'^tmp/','') FROM generation_results gr
                 WHERE ((gr.template_source='marketplace' AND gr.template_id = mt.id::text)
                     OR (mt.recipe_id IS NOT NULL AND gr.template_source='recipe' AND gr.template_id = mt.recipe_id))
                   AND gr.visibility='public' AND gr.status='success' AND gr.taken_down=false AND gr.file_path IS NOT NULL
                 ORDER BY gr.likes_count DESC, gr.created_at DESC LIMIT 1)) AS thumb,
              COALESCE((SELECT array_agg(th.slug ORDER BY th.sort_order)
                FROM template_themes tt JOIN themes th ON th.id = tt.theme_id
                WHERE tt.template_id = mt.id), '{}') AS label_themes
       FROM marketplace_templates mt
       LEFT JOIN template_owns ow ON ow.template_id = mt.id AND ow.user_id = $1
       WHERE mt.status = 'active' AND (ow.user_id IS NOT NULL OR (mt.is_official = true AND mt.price_credits = 0)) -- (2026-07-06) 무료 오피셜=기본제공=행 없이도 보유로 노출
       ORDER BY COALESCE(ow.created_at, mt.created_at) DESC`,
      [uid]
    );
    const rows = r.rows;
    // 테마 판단 규칙(사용자 확정 2026-06-27): 공식=라벨(template_themes·처음부터 스튜디오에 존재) / 비공식=포스트잇(개인 배치).
    //   포스트잇 = 기본테마 오버라이드(user_theme_overrides) + 커스텀테마 배치(user_studio_theme_items→macro_group).
    //   themes(기본테마 slug)는 Library 칩·Studio 기본필터용 / macroGroup(Influencer|Shopping)은 Studio 모드 배치용.
    const ids = rows.filter((t) => !t.is_official).map((t) => String(t.id));
    const ovAdd = {}, ovRem = {}, customGrp = {};
    if (ids.length) {
      const ov = await query(
        `SELECT item_id, theme_slug, action FROM user_theme_overrides
          WHERE user_id = $1 AND item_type = 'template' AND item_id = ANY($2)`, [uid, ids]);
      ov.rows.forEach((o) => { const m = (o.action === 'add' ? ovAdd : ovRem); (m[o.item_id] = m[o.item_id] || new Set()).add(o.theme_slug); });
      const ci = await query(
        `SELECT i.item_id, t.macro_group FROM user_studio_theme_items i
           JOIN user_studio_themes t ON t.id = i.user_studio_theme_id
          WHERE i.user_id = $1 AND i.item_type = 'template' AND i.item_id = ANY($2)`, [uid, ids]);
      ci.rows.forEach((x) => { (customGrp[x.item_id] = customGrp[x.item_id] || new Set()).add(x.macro_group === 'Influencer' ? 'Influencer' : 'Shopping'); });
    }
    const INFLU = new Set(['people']);
    const slugGroup = (s) => (INFLU.has(s) ? 'Influencer' : 'Shopping');
    const data = rows.map((t) => {
      const id = String(t.id);
      const label = t.label_themes || [];
      delete t.label_themes;
      if (t.is_official) {
        return { ...t, themes: label, macroGroup: label.some((s) => INFLU.has(s)) ? 'Influencer' : 'Shopping' };
      }
      // 비공식 = 포스트잇 우선. 기본테마 오버라이드 add가 있으면 그것만(라벨 무시), 없으면 라벨−remove로 폴백.
      const adds = [...(ovAdd[id] || [])];
      const removes = ovRem[id] || new Set();
      const customGroups = [...(customGrp[id] || [])];
      const hasPostit = adds.length > 0 || customGroups.length > 0;
      const themes = adds.length ? adds : (hasPostit ? [] : label.filter((s) => !removes.has(s)));
      const groups = new Set([...adds.map(slugGroup), ...customGroups]);
      if (!groups.size) themes.forEach((s) => groups.add(slugGroup(s)));
      const macroGroup = groups.has('Influencer') ? 'Influencer' : 'Shopping';
      return { ...t, themes, macroGroup };
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// (2026-07-02 부활) PATCH /api/marketplace/owned/in-studio { ids:[uuid], in_studio:bool }
//   보유 템플릿 일괄 스튜디오 배치/해제 = In Studio ↔ Library only 이동. in_studio=false면 Library only(대기조), true면 스튜디오 노출.
router.patch('/owned/in-studio', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String).filter((x) => UUID_RE.test(x)) : [];
    const inStudio = req.body.in_studio !== false;
    if (!ids.length) return res.status(400).json({ success: false, error: 'ids가 필요합니다.' });
    const r = await query(
      `UPDATE template_owns SET in_studio = $3 WHERE user_id = $1 AND template_id = ANY($2::uuid[]) RETURNING template_id`,
      [req.user.id, ids, inStudio]
    );
    res.json({ success: true, data: { updated: r.rows.map((x) => x.template_id), in_studio: inStudio } });
  } catch (err) { next(err); }
});

// GET /api/marketplace/default-officials — 기본공개(무료) 프롬프트 기반 공식 템플릿.
//   소유 무관 전 유저 스튜디오 노출용(레시피 기반 product-cut의 프롬프트 기반 대응).
//   조건: is_official=true · price_credits=0(무료 기본공개) · recipe_id NULL(recipe-backed은 클라 카드가 있어 제외).
//   생성은 마켓 프롬프트 경로라 402 없음(generate.route: marketplace 출처는 소유 게이트 없음). 응답 shape은 /owned 카드빌드와 호환.
router.get('/default-officials', async (req, res, next) => {
  try {
    const uid = req.user.id;
    const r = await query(
      `SELECT ${MT_COLS}, mt.from_creation_idx, mt.origin, false AS owned, (mt.creator_id = $1) AS mine,
              COALESCE(mt.preview_media->>0, (SELECT '/'||regexp_replace(gr.file_path,'^tmp/','') FROM generation_results gr
                 WHERE gr.template_source='marketplace' AND gr.template_id = mt.id::text
                   AND gr.visibility='public' AND gr.status='success' AND gr.taken_down=false AND gr.file_path IS NOT NULL
                 ORDER BY gr.likes_count DESC, gr.created_at DESC LIMIT 1)) AS thumb,
              COALESCE((SELECT array_agg(th.slug ORDER BY th.sort_order)
                FROM template_themes tt JOIN themes th ON th.id = tt.theme_id
                WHERE tt.template_id = mt.id), '{}') AS themes
         FROM marketplace_templates mt
        WHERE mt.is_official = true AND mt.status = 'active'
          AND mt.price_credits = 0 AND mt.recipe_id IS NULL
        ORDER BY mt.created_at DESC`,
      [uid]
    );
    const INFLU = new Set(['people']);
    const data = r.rows.map((t) => ({ ...t, in_studio: true, macroGroup: (t.themes || []).some((s) => INFLU.has(s)) ? 'Influencer' : 'Shopping' }));
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = { router };
