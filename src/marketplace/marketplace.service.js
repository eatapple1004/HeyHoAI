const { query } = require('../db/client');
const { env } = require('../config');
const creditService = require('../credits/credit.service');
const { resolveToolId } = require('../tools/registry');

// 마켓플레이스 로직 단일소스 — 레거시 라우트(marketplace.route.js)와 Nest(nest/marketplace)가 함께 사용한다.
//   (NestJS 이관 중 SQL/과금·로열티 로직이 두 벌로 갈라지지 않도록 라우트에서 분리했다.)

const CATEGORIES = new Set(['Influencer', 'Shopping', 'UGC', 'Custom']);
const TYPES = new Set(['image', 'reel']);
const CREATOR_SHARE = 0.7; // 크리에이터 70% 수익분배
const REPORT_THRESHOLD = 3; // 서로 다른 신고자 N명 이상 → 자동 비공개(테이크다운)

/** statusCode를 가진 에러 (errorHandler/LegacyErrorFilter가 그대로 응답) */
function httpError(statusCode, message, extra) {
  return Object.assign(new Error(message), { statusCode }, extra || {});
}

/**
 * 도메인 에러 → 응답 바디. 402(구매 필요)처럼 부가 data를 실어보내는 케이스가 있어
 * 레거시 라우트와 Nest 컨트롤러가 같은 변환을 쓰도록 공용화한다.
 */
function toErrorBody(err) {
  return { success: false, error: err.message, ...(err.data ? { data: err.data } : {}) };
}

// 유료 과금이 실제로 도는가? 공식 시드(is_official)는 배포 즉시 라이브 유료(게이트 무관),
// 비공식(유저 생성) 유료 템플릿은 MARKETPLACE_PAID 점화 전엔 무료 취급(가격은 노출·저장만).
function paidActive(tpl) {
  return env.MARKETPLACE_PAID === true || tpl.is_official === true;
}

const PUBLIC_COLS = `id, creator_id, creator_handle, name, description, category, type, style, prompt,
  negative_prompt, tool, visibility, emoji, price_credits, use_price_credits, recipe_id, usage_count, likes_count,
  preview_media, reference_examples, target_image_url, is_official, created_at`;
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

/** 제작자는 자동 보유, 그 외는 owns 행 존재 여부 */
async function isOwned(userId, tpl) {
  if (tpl.creator_id === userId) return true; // 제작자는 자동 보유
  const o = await query('SELECT 1 FROM template_owns WHERE user_id = $1 AND template_id = $2', [userId, tpl.id]);
  return !!o.rows[0];
}

/**
 * 템플릿 목록.
 * 기본: 공개(발행)된 것만. feed=1: 공개 무료(price_credits=0)만, 좋아요순 — Library Feed용.
 */
async function listTemplates(userId, { category, feed, theme } = {}) {
  const isFeed = feed === '1' || feed === 'true';
  const params = [userId];
  // Explore 카탈로그 = 공개(발행)된 것만. 내 미공개(private·auto 자동민팅)는 Explore에 노출 안 함 — Creator Studio/My templates에서만 관리.
  //   ($1=userId은 아래 SELECT의 mine/bookmarked/owned 표시에 계속 사용)
  let where = isFeed
    ? `status = 'active' AND visibility = 'public' AND price_credits = 0`
    : `status = 'active' AND visibility = 'public'`;
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
            (EXISTS(SELECT 1 FROM template_owns ow WHERE ow.template_id = marketplace_templates.id AND ow.user_id = $1)
               OR (marketplace_templates.is_official = true AND marketplace_templates.price_credits = 0)) AS owned, -- (2026-07-06) 무료 오피셜=기본제공=항상 보유
            COALESCE(preview_media->>0, (SELECT '/'||regexp_replace(gr.file_path,'^tmp/','') FROM generation_results gr
               WHERE ((gr.template_source='marketplace' AND gr.template_id = marketplace_templates.id::text)
                   OR (marketplace_templates.recipe_id IS NOT NULL AND gr.template_source='recipe' AND gr.template_id = marketplace_templates.recipe_id))
                 AND gr.visibility='public' AND gr.status='success' AND gr.taken_down=false AND gr.file_path IS NOT NULL
               ORDER BY gr.likes_count DESC, gr.created_at DESC LIMIT 1)) AS thumb,
            ${THEMES_SUBQ}
     FROM marketplace_templates WHERE ${where}
     ORDER BY ${order} LIMIT 200`,
    params
  );
  return r.rows;
}

/**
 * 템플릿 상세(상품 페이지용). 공개 또는 내 것만.
 * ⚠️ 유료 템플릿은 prompt(레시피) 비공개(블랙박스) — 결과·예시만 노출.
 */
async function getTemplate(userId, id) {
  if (!UUID_RE.test(id)) throw httpError(404, '템플릿을 찾을 수 없습니다.');
  const r = await query(
    `SELECT ${PUBLIC_COLS}, marketplace_templates.from_creation_idx, (creator_id = $2) AS mine,
            EXISTS(SELECT 1 FROM template_bookmarks tb WHERE tb.template_id = marketplace_templates.id AND tb.user_id = $2) AS bookmarked,
            (EXISTS(SELECT 1 FROM template_owns ow WHERE ow.template_id = marketplace_templates.id AND ow.user_id = $2)
               OR (marketplace_templates.is_official = true AND marketplace_templates.price_credits = 0)) AS owned, -- (2026-07-06) 무료 오피셜=기본제공=항상 보유
            ${THEMES_SUBQ}
     FROM marketplace_templates
     WHERE id = $1 AND status = 'active' AND (visibility = 'public' OR creator_id = $2)`,
    [id, userId]
  );
  const tpl = r.rows[0];
  if (!tpl) throw httpError(404, '템플릿을 찾을 수 없습니다.');
  // 블랙박스: 보유(구매/제작)하지 않은 유료 템플릿은 prompt 숨김. 보유/내 것은 그대로.
  if (tpl.price_credits > 0 && !tpl.mine && !tpl.owned) { tpl.prompt = null; tpl.negative_prompt = null; }
  // 포인터형 템플릿(from_creation_idx, prompt='') — 내 것이면 원본 creation의 실제 프롬프트를 폴백 노출(편집 시 비어보이지 않게).
  if (tpl.mine && tpl.from_creation_idx && (!tpl.prompt || !String(tpl.prompt).trim())) {
    const src = await query(
      `SELECT p.prompt_text FROM generation_results gr JOIN prompts p ON p.idx = gr.prompt_idx WHERE gr.idx = $1`,
      [tpl.from_creation_idx]
    );
    if (src.rows[0]?.prompt_text) tpl.prompt = src.rows[0].prompt_text;
  }
  delete tpl.from_creation_idx; // 내부 포인터는 응답에서 제거

  // 이 템플릿으로 만들어진 creation 수 + 좋아요 합. ⚠️ recipe-backed 공식 템플릿은 creation이
  // source='recipe', template_id=recipe_id 로 귀속되므로 그것도 매칭(마켓 귀속 + 레시피 귀속 둘 다).
  const agg = await query(
    `SELECT COUNT(*)::int AS creations, COALESCE(SUM(likes_count), 0)::int AS likes
       FROM generation_results
      WHERE ((template_source = 'marketplace' AND template_id = $1)
          OR ($2 <> '' AND template_source = 'recipe' AND template_id = $2))
        AND status = 'success' AND taken_down = false`,
    [id, tpl.recipe_id || '']
  );
  tpl.creationsCount = agg.rows[0].creations;
  tpl.totalLikes = agg.rows[0].likes;
  // 수익은 본인 템플릿에만 노출(남의 수익 비공개). 로열티 포인트(type='royalty', ref_id=템플릿id) 합 — earnings와 동일 계산.
  if (tpl.mine) {
    const rev = await query(
      `SELECT COALESCE(SUM(amount), 0)::int AS revenue
         FROM point_ledger WHERE user_id = $1 AND type = 'royalty' AND ref_id = $2`,
      [userId, String(id)]
    );
    tpl.revenue = rev.rows[0].revenue;
  }
  return tpl;
}

/** 이 템플릿으로 만든 공개 creation들, 좋아요순(이미지/영상 갤러리·사회적 증명). */
async function getTemplateCreations(id) {
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
    [id]
  );
  return r.rows.map((x) => ({
    idx: x.idx,
    url: x.file_path ? `/${x.file_path.replace(/^tmp\//, '')}` : null,
    type: (x.metadata && x.metadata.type === 'video') ? 'video' : 'image',
    likes: x.likes_count || 0,
  }));
}

/**
 * 템플릿 저장(Save as template). 비공개(개인용)는 마찰 없이 누구나 / 공개 게시만 크리에이터 게이트.
 * @param {{id:string, email?:string}} user
 */
async function createTemplate(user, body = {}) {
  const {
    name, description = '', category, type = 'image', style = 'Natural', prompt,
    negativePrompt = '', emoji = '🎨', priceCredits = 0, usePriceCredits = 0,
    tool, visibility = 'private', previewMedia = [], referenceExamples = [],
    themeSlugs = [], // 크리에이터 다중 테마 태그(글로벌 themes.slug 배열)
    sourceResultIdx, // 이 템플릿의 씨앗 creation(역링크 + 누적 좋아요 롤업용, 선택)
    targetImageUrl = null, // 생성 시 함께 보낼 레이아웃 타깃 이미지(admin, URL 또는 data URL)
  } = body;
  if (!name || !prompt) throw httpError(400, 'name과 prompt는 필수입니다.');
  if (!CATEGORIES.has(category)) throw httpError(400, '유효한 category가 필요합니다.');
  const t = TYPES.has(type) ? type : 'image';
  const vis = visibility === 'public' ? 'public' : 'private';

  // 공개 게시만 크리에이터 게이트 — 비공개 개인 저장은 마찰 없이 허용
  if (vis === 'public') {
    const u = await query('SELECT is_creator FROM users WHERE id = $1', [user.id]);
    if (!u.rows[0]?.is_creator) {
      throw httpError(403, '공개 게시는 먼저 크리에이터로 신청해 주세요.');
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
  const handle = '@' + String(user.email || 'creator').split('@')[0];
  const targetImg = targetImageUrl ? String(targetImageUrl).slice(0, 4_000_000) : null; // URL 또는 data URL(캡)

  const r = await query(
    `INSERT INTO marketplace_templates
       (creator_id, creator_handle, name, description, category, type, style, prompt, negative_prompt, tool, visibility, emoji, price_credits, use_price_credits, preview_media, reference_examples, target_image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17) RETURNING ${PUBLIC_COLS}`,
    [user.id, handle, String(name).slice(0, 120), desc, category, t, String(style).slice(0, 50),
     String(prompt).slice(0, 8000), String(negativePrompt).slice(0, 1000), resolvedTool, vis,
     String(emoji).slice(0, 8), price, usePrice, JSON.stringify(preview), JSON.stringify(refExamples), targetImg]
  );
  const created = r.rows[0];

  // 크리에이터는 자기 템플릿 자동 보유 → studio 픽커(mergeOwnedTemplates)에 떠서 테마 배치·사용 가능.
  await query(`INSERT INTO template_owns (user_id, template_id, source, price_paid) VALUES ($1,$2,'free',0) ON CONFLICT DO NOTHING`, [user.id, created.id]);

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
      [created.id, srcIdx, user.id]
    );
    const seedLikes = link.rows[0] ? (link.rows[0].likes_count || 0) : 0;
    if (seedLikes > 0) {
      await query('UPDATE marketplace_templates SET likes_count = likes_count + $2 WHERE id = $1', [created.id, seedLikes]);
      created.likes_count = (created.likes_count || 0) + seedLikes;
    }
  }
  created.themes = await setTemplateThemes(created.id, themeSlugs);
  return created;
}

/**
 * 내 템플릿 편집(이름·프롬프트·가격·공개·카테고리·네거티브).
 * 비공개→공개 전환은 크리에이터 게이트. 가격 0~100 클램프(0=무료). 부분 업데이트.
 */
async function updateTemplate(userId, id, body = {}) {
  const cur = await query(
    `SELECT id, visibility, from_creation_idx FROM marketplace_templates WHERE id = $1 AND creator_id = $2`,
    [id, userId]
  );
  if (!cur.rows[0]) throw httpError(404, '내 템플릿이 아니거나 없습니다.');

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
  if (typeof body.prompt === 'string' && body.prompt.trim()) {
    params.push(String(body.prompt).slice(0, 8000)); sets.push(`prompt = $${params.length}`);
  }
  if (body.negativePrompt !== undefined) {
    params.push(String(body.negativePrompt).slice(0, 1000)); sets.push(`negative_prompt = $${params.length}`);
  }
  if (body.targetImageUrl !== undefined) {
    const v = body.targetImageUrl ? String(body.targetImageUrl).slice(0, 4_000_000) : null;
    params.push(v); sets.push(`target_image_url = $${params.length}`);
  }
  if (body.visibility !== undefined) {
    const vis = body.visibility === 'public' ? 'public' : 'private';
    // 공개 전환만 게이트(이미 공개거나 비공개 전환은 자유)
    if (vis === 'public' && cur.rows[0].visibility !== 'public') {
      const u = await query('SELECT is_creator FROM users WHERE id = $1', [userId]);
      if (!u.rows[0]?.is_creator) {
        throw httpError(403, '공개 게시는 먼저 크리에이터로 신청해 주세요.');
      }
      // 🆕 선행조건(요구1/2): from_creation_idx가 있으면 그 creation이 공개(Private OFF)여야만 Explore Templates 공개 가능.
      if (cur.rows[0].from_creation_idx) {
        const cr = await query(
          `SELECT 1 FROM generation_results WHERE idx = $1 AND visibility = 'public' AND taken_down = false`,
          [cur.rows[0].from_creation_idx]
        );
        if (!cr.rows[0]) throw httpError(409, '원본 creation을 공개(Private Mode OFF)한 뒤에 Explore에 공개할 수 있습니다.');
      }
    }
    params.push(vis); sets.push(`visibility = $${params.length}`);
  }
  const hasThemes = body.themeSlugs !== undefined; // 테마만 바꾸는 것도 허용
  if (!sets.length && !hasThemes) throw httpError(400, '변경할 내용이 없습니다.');

  let row;
  if (sets.length) {
    params.push(id);
    const r = await query(
      `UPDATE marketplace_templates SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING ${PUBLIC_COLS}`,
      params
    );
    row = r.rows[0];
  } else {
    const r = await query(`SELECT ${PUBLIC_COLS} FROM marketplace_templates WHERE id = $1`, [id]);
    row = r.rows[0];
  }
  if (hasThemes) row.themes = await setTemplateThemes(id, body.themeSlugs);
  return row;
}

/** 내 템플릿 내리기 */
async function deleteTemplate(userId, id) {
  const r = await query(
    `DELETE FROM marketplace_templates WHERE id = $1 AND creator_id = $2 RETURNING id`,
    [id, userId]
  );
  if (r.rowCount === 0) throw httpError(404, '내 템플릿이 아니거나 없습니다.');
  return { id: r.rows[0].id };
}

/**
 * 사용 기록 + 보유 게이트. 스튜디오 적용용 파라미터(tool 포함) 반환.
 * 비공개는 본인 것만 사용 가능(타인 비공개 누수 방지).
 * @returns {{data:object, charged:number}}
 */
async function useTemplate(userId, id) {
  const r = await query(
    `SELECT ${PUBLIC_COLS} FROM marketplace_templates
      WHERE id = $1 AND status = 'active'
        AND (visibility = 'public' OR creator_id = $2
             OR EXISTS(SELECT 1 FROM template_owns o WHERE o.template_id = marketplace_templates.id AND o.user_id = $2))`,
    [id, userId]
  );
  const tpl = r.rows[0];
  if (!tpl) throw httpError(404, '템플릿을 찾을 수 없습니다.');

  // buy-to-own: 보유해야 사용. 유료 미보유 → 402(구매 필요). 무료 미보유 → 자동 보유(추가).
  if (!(await isOwned(userId, tpl))) {
    if (tpl.price_credits > 0) {
      throw httpError(402, '먼저 구매해야 사용할 수 있습니다.', { data: { needPurchase: true, price: tpl.price_credits } });
    }
    await query(
      `INSERT INTO template_owns (user_id, template_id, source, price_paid) VALUES ($1,$2,'free',0) ON CONFLICT DO NOTHING`,
      [userId, tpl.id]
    );
  }

  await query('UPDATE marketplace_templates SET usage_count = usage_count + 1 WHERE id = $1', [tpl.id]);
  return {
    data: {
      id: tpl.id, name: tpl.name, category: tpl.category, type: tpl.type, style: tpl.style,
      prompt: tpl.prompt, negativePrompt: tpl.negative_prompt || '', tool: tpl.tool || null, emoji: tpl.emoji,
      recipeId: tpl.recipe_id || null, // recipe-backed면 스튜디오가 리치 recipe를 로드
    },
    charged: 0, // 사용 시점엔 과금 없음(구매료=/acquire / 사용당 로열티=생성 시점)
  };
}

/**
 * 보유 획득. 무료=즉시 보유(추가). 유료=price_credits 1회 과금 + 크리에이터 70% 로열티 + 보유.
 * 이미 보유=멱등(무과금). 실패 시 과금은 환불.
 * @returns {{data:object, charged:number}}
 */
async function acquireTemplate(user, id) {
  let charge = null;
  try {
    const r = await query(
      `SELECT ${PUBLIC_COLS} FROM marketplace_templates
        WHERE id = $1 AND status = 'active'
          AND (visibility = 'public' OR creator_id = $2
               OR EXISTS(SELECT 1 FROM generation_results gr WHERE gr.idx = marketplace_templates.from_creation_idx AND gr.visibility = 'public' AND gr.taken_down = false))`,
      [id, user.id]
    );
    const tpl = r.rows[0];
    if (!tpl) throw httpError(404, '템플릿을 찾을 수 없습니다.');

    if (await isOwned(user.id, tpl)) {
      return { data: { id: tpl.id, owned: true, alreadyOwned: true }, charged: 0 };
    }

    // 점화 게이트: 비공식 유료 템플릿은 MARKETPLACE_PAID 전엔 가격 0 취급(무료 언락). 공식은 항상 과금.
    const effectivePrice = paidActive(tpl) ? tpl.price_credits : 0;
    let source = 'free', pricePaid = 0;
    if (effectivePrice > 0) {
      charge = await creditService.charge(user, effectivePrice, {
        type: 'template_purchase', description: `템플릿 구매: ${tpl.name}`, refId: tpl.id,
      });
      source = 'purchase';
      pricePaid = charge ? charge.amount : effectivePrice;
    }

    const ins = await query(
      `INSERT INTO template_owns (user_id, template_id, source, price_paid) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, template_id) DO NOTHING RETURNING user_id`,
      [user.id, tpl.id, source, pricePaid]
    );
    if (ins.rowCount === 0) { // 동시 획득 — 이미 보유. 과금했으면 환불.
      if (charge) await charge.refund();
      return { data: { id: tpl.id, owned: true, alreadyOwned: true }, charged: 0 };
    }
    // 구매 성공 후에만 로열티 분배(70%) → 크리에이터 포인트(현금성, credit 아님)
    if (charge && tpl.creator_id && effectivePrice > 0) {
      const royalty = Math.round(effectivePrice * CREATOR_SHARE);
      if (royalty > 0) await creditService.addPoints(tpl.creator_id, royalty, {
        type: 'royalty', description: `템플릿 판매: ${tpl.name}`, refId: tpl.id,
      }).catch(() => {});
    }
    return { data: { id: tpl.id, owned: true, source }, charged: pricePaid };
  } catch (err) {
    if (charge) await charge.refund();
    throw err;
  }
}

/** 내 템플릿(주로 auto 자동민팅)을 My templates에 추가(owns INSERT). 멱등. 내 것 전용. */
async function addToMyTemplates(userId, id) {
  const r = await query(
    `SELECT id FROM marketplace_templates WHERE id = $1 AND status = 'active' AND creator_id = $2`,
    [id, userId]
  );
  if (!r.rows[0]) throw httpError(404, '내 템플릿이 아니거나 없습니다.');
  await query(
    `INSERT INTO template_owns (user_id, template_id, source, price_paid) VALUES ($1,$2,'free',0) ON CONFLICT DO NOTHING`,
    [userId, id]
  );
  return { id, added: true };
}

/** 공개 템플릿 신고(중복 무시). 누적 시 자동 테이크다운. */
async function reportTemplate(userId, id, reasonRaw) {
  const reason = String(reasonRaw || 'other').slice(0, 40);
  const tpl = await query(`SELECT id, creator_id, status FROM marketplace_templates WHERE id = $1`, [id]);
  if (!tpl.rows[0]) throw httpError(404, '템플릿을 찾을 수 없습니다.');
  if (tpl.rows[0].creator_id === userId) throw httpError(400, '본인 템플릿은 신고할 수 없습니다.');

  await query(
    `INSERT INTO template_reports (template_id, reporter_id, reason) VALUES ($1,$2,$3)
     ON CONFLICT (template_id, reporter_id) DO NOTHING`,
    [id, userId, reason]
  );
  // 서로 다른 신고자 수 → 임계 초과 + 아직 active면 자동 비공개
  const cnt = await query(`SELECT COUNT(DISTINCT reporter_id)::int AS n FROM template_reports WHERE template_id = $1`, [id]);
  let takenDown = false;
  if (cnt.rows[0].n >= REPORT_THRESHOLD && tpl.rows[0].status === 'active') {
    await query(`UPDATE marketplace_templates SET status = 'taken_down' WHERE id = $1`, [id]);
    takenDown = true;
  }
  return { reported: true, takenDown };
}

/** 템플릿 저장(Saved). 공개 또는 내 것만. (멱등) */
async function bookmarkTemplate(userId, id) {
  const t = await query(
    `SELECT id FROM marketplace_templates WHERE id = $1 AND status = 'active' AND (visibility = 'public' OR creator_id = $2)`,
    [id, userId]
  );
  if (!t.rows[0]) throw httpError(404, '템플릿을 찾을 수 없습니다.');
  await query(
    `INSERT INTO template_bookmarks (user_id, template_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, id]
  );
  return { bookmarked: true };
}

/** 저장 해제 */
async function unbookmarkTemplate(userId, id) {
  await query(`DELETE FROM template_bookmarks WHERE user_id = $1 AND template_id = $2`, [userId, id]);
  return { bookmarked: false };
}

module.exports = {
  CATEGORIES,
  TYPES,
  CREATOR_SHARE,
  REPORT_THRESHOLD,
  PUBLIC_COLS,
  MT_COLS,
  UUID_RE,
  THEMES_SUBQ,
  httpError,
  toErrorBody,
  paidActive,
  setTemplateThemes,
  isOwned,
  listTemplates,
  getTemplate,
  getTemplateCreations,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  useTemplate,
  acquireTemplate,
  addToMyTemplates,
  reportTemplate,
  bookmarkTemplate,
  unbookmarkTemplate,
};
