#!/usr/bin/env node
/**
 * NestJS 이관 parity 체크 — Nest(dist/main.js)와 레거시(src/index.js) 응답이 같은지 자동 비교.
 *
 * 이관 작업의 표준 검증(docs/NESTJS_이관.md §6)을 스크립트로 고정한 것.
 * 두 서버를 **직접 띄운 뒤** 같은 JWT로 같은 요청을 보내고 상태코드 + 본문을 비교한다.
 *
 * 사용법:
 *   # 1) 두 서버를 각각 띄운다(프레시 로컬 DB 권장 — createdb doppia_migtest && npm run migrate:dev)
 *   NODE_ENV=development node dist/main.js &                 # Nest   :3002
 *   NODE_ENV=development PORT=3003 node src/index.js &       # 레거시 :3003
 *   # 2) 토큰을 만들어 실행
 *   node scripts/nest_parity_check.js --token <JWT> [--admin-token <JWT>]
 *
 * 옵션:
 *   --nest <url>     기본 http://localhost:3002
 *   --legacy <url>   기본 http://localhost:3003
 *   --only <substr>  경로에 substr이 포함된 케이스만 실행
 *   --mutations      쓰기(POST/PATCH/DELETE) parity까지 실행 — 픽스처를 만들고 지운다
 *   --seed           비어 있는 픽스처를 만들어 SKIP을 줄인다(팀·프롬프트·결과물). 끝나면 되돌린다
 *   --verbose        SKIP 사유까지 출력
 *
 * 종료코드: 불일치가 하나라도 있으면 1. (SKIP은 실패가 아님)
 *
 * ── 동적 값을 다루는 방법 (세 가지) ─────────────────────────────────────────
 *  ① 플레이스홀더: 경로에 `{accountId}` 처럼 쓰면 RESOLVERS가 목록 API로 실제 값을 찾아 치환한다.
 *     두 서버가 **같은 DB**를 보므로 같은 id를 양쪽에 던질 수 있다. 못 찾으면 그 케이스는 SKIP.
 *  ② 정규화: 쓰기는 서버마다 다른 행이 생기므로(uuid·시각이 다름) normalize()로 마스킹 후 비교한다.
 *  ③ 픽스처: --mutations 는 각 서버에 자기 몫의 데이터를 만들고 비교한 뒤 cleanup 에서 지운다.
 */
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const flag = (name) => args.includes(`--${name}`);

/**
 * 토큰 정제 — `node -e "...signToken..."` 출력에는 dotenv 배너(◇ injecting env ...)가 섞이기 쉽다.
 * 마지막 줄만 취하고 JWT 형태(점 2개·ASCII)인지 검사해 **헤더 만들다 터지기 전에** 알려준다.
 */
function cleanToken(raw, label) {
  const t = String(raw || '').trim().split('\n').pop().trim();
  if (!t) return '';
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t)) {
    console.error(`❌ ${label} 값이 JWT 형태가 아닙니다: ${JSON.stringify(t.slice(0, 60))}...`);
    console.error('   dotenv 배너가 섞였을 수 있습니다. 이렇게 만드세요:');
    console.error('   TOKEN=$(NODE_ENV=development node -e "console.log(require(\'./src/auth/token\').signToken({id:\'<실제 uuid>\',role:\'user\'}))" 2>/dev/null | tail -1)');
    process.exit(2);
  }
  return t;
}

const NEST = opt('nest', 'http://localhost:3002');
const LEGACY = opt('legacy', 'http://localhost:3003');
const TOKEN = cleanToken(opt('token', process.env.PARITY_TOKEN || ''), '--token');
const ADMIN_TOKEN = cleanToken(opt('admin-token', process.env.PARITY_ADMIN_TOKEN || TOKEN), '--admin-token');
const ONLY = opt('only', '');
const RUN_MUTATIONS = flag('mutations');
const SEED = flag('seed');
const VERBOSE = flag('verbose');

if (!TOKEN) {
  console.error('토큰이 필요합니다: --token <JWT> (관리자 케이스는 --admin-token)');
  console.error('예) node -e "console.log(require(\'./src/auth/token\').signToken({id:\'<uuid>\',role:\'user\'}))"');
  process.exit(2);
}

// ─────────────────────────────────────────────────────────────────────────────
// 요청 헬퍼
// ─────────────────────────────────────────────────────────────────────────────
async function hit(base, method, path, o = {}) {
  const headers = {};
  if (!o.noAuth) headers.Authorization = `Bearer ${o.admin ? ADMIN_TOKEN : TOKEN}`;
  let body;
  if (o.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(o.body);
  }
  const res = await fetch(base + path, { method, headers, body });
  const ct = (res.headers.get('content-type') || '').split(';')[0];
  const text = ct.startsWith('audio/') || ct.startsWith('image/') || ct.startsWith('video/')
    ? `<binary ${ct}>` : await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: res.status, ct, body: text, json };
}

// ─────────────────────────────────────────────────────────────────────────────
// ① 플레이스홀더 해석 — 목록 API에서 실제 id/idx를 찾아 ctx에 채운다.
//    두 서버가 같은 DB를 보므로 **레거시 한쪽에서만** 조회하면 된다(읽기 전용).
//    못 찾으면 undefined → 해당 케이스는 SKIP 처리.
// ─────────────────────────────────────────────────────────────────────────────
const RESOLVERS = {
  accountId:   async (c) => (await pick('/api/accounts', (d) => d[0]?.id)),
  characterId: async (c) => (await pick('/api/characters', (d) => d[0]?.id)),
  teamId:      async (c) => (await pick('/api/teams', (d) => d[0]?.id)),
  templateId:  async (c) => (await pick('/api/marketplace/owned', (d) => d[0]?.id)),
  promptIdx:   async (c) => (await pick('/api/generate/prompts', (d) => d[0]?.idx)),
  resultIdx:   async (c) => (await pick('/api/generate/results', (d) => d[0]?.idx)),
  recipeId:    async (c) => (await pick('/api/recipes', (d) => d[0]?.id)),
  themeSlug:   async (c) => (await pick('/api/marketplace/themes', (d) => d[0]?.slug)),
  // 계정 하위 리소스 — 첫 계정에 데이터가 없을 수 있으므로 **계정들을 훑어** 실제로 있는 걸 찾는다.
  //   찾은 계정을 mediaAccountId/queueAccountId 로도 남겨 경로에 함께 쓸 수 있게 한다.
  mediaId:     (c) => scanAccounts(c, 'media', 'mediaAccountId'),
  queueId:     (c) => scanAccounts(c, 'post-queue', 'queueAccountId'),
  proposalId:  async (c) => (await pick('/api/admin/proposal/list', (d) => d[0]?.id, { admin: true, key: 'items' })),
};
const RESOLVE_ORDER = ['accountId', 'characterId', 'teamId', 'templateId', 'promptIdx', 'resultIdx', 'recipeId', 'themeSlug', 'mediaId', 'queueId', 'proposalId'];

/** 계정 목록을 훑어 하위 리소스(media·post-queue)가 있는 첫 계정을 찾는다. */
async function scanAccounts(ctx, sub, accountKey) {
  const r = await hit(LEGACY, 'GET', '/api/accounts');
  const accounts = (r.json && r.json.data) || [];
  for (const a of accounts.slice(0, 10)) {
    const sr = await hit(LEGACY, 'GET', `/api/accounts/${a.id}/${sub}`);
    const first = sr.json && Array.isArray(sr.json.data) ? sr.json.data[0] : null;
    if (first && first.id) { ctx[accountKey] = a.id; return first.id; }
  }
  return undefined;
}

async function pick(path, fn, { admin = false, key = 'data' } = {}) {
  const r = await hit(LEGACY, 'GET', path, { admin });
  if (r.status !== 200 || !r.json) return undefined;
  const arr = r.json[key];
  return Array.isArray(arr) ? fn(arr) : undefined;
}

function fill(path, ctx) {
  const missing = [];
  const out = path.replace(/\{(\w+)\}/g, (_, k) => {
    if (ctx[k] === undefined || ctx[k] === null) { missing.push(k); return `{${k}}`; }
    return String(ctx[k]);
  });
  return { path: out, missing };
}

// ─────────────────────────────────────────────────────────────────────────────
// ② 정규화 — 쓰기 비교용. 서버마다 달라지는 값(uuid·시각·잔여초·자동증가 id)을 마스킹.
// ─────────────────────────────────────────────────────────────────────────────
function normalize(text) {
  return String(text)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, '<ts>')
    .replace(/"(idx|id|sort_order|sortOrder|secondsLeft|expiresAt|createdAt|created_at|updated_at)":\s*("?[^",}]*"?)/g, '"$1":<masked>')
    .replace(/"name":"(parity|PARITY)[^"]*"/g, '"name":"<fixture>"')
    .replace(/code=[A-Za-z0-9_-]+/g, 'code=<code>');
}

// ─────────────────────────────────────────────────────────────────────────────
// 읽기 케이스 — [method, path, opts]. path에 {placeholder} 사용 가능.
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_CASES = [
  // 프론트 서빙 — 페이지·클린URL·정적. 인증 없이(noAuth) 레거시와 바이트 동일해야 한다.
  ['GET', '/', { noAuth: true }],
  ['GET', '/login', { noAuth: true }],
  ['GET', '/signup', { noAuth: true }],
  ['GET', '/studio', { noAuth: true }],          // 클린 URL → public/studio.html
  ['GET', '/studio.html', { noAuth: true }],     // → 301 /studio (정규 URL)
  ['GET', '/store', { noAuth: true }],           // → 302 /studio (스토어 폐쇄)
  ['GET', '/store.html', { noAuth: true }],
  ['GET', '/landing', { noAuth: true }],
  ['GET', '/billing', { noAuth: true }],
  ['GET', '/marketplace', { noAuth: true }],
  ['GET', '/nonexistent-page', { noAuth: true }],// 미매칭 → 레거시 폴백 404
  ['GET', '/heyhoai/editor/page', { noAuth: true }],   // 비로그인 → /login?next=
  ['GET', '/heyhoai/templates/birth-reel', { noAuth: true }],
  ['GET', '/r/BADCODE', { noAuth: true }],       // 추천코드 무효 → 쿠키 없이 / 로
  ['GET', '/js/pricing.js', { noAuth: true }],   // 정적(public)
  ['GET', '/auth-ui.js', { noAuth: true }],
  ['GET', '/css', { noAuth: true }],             // 디렉터리 → 301 /css/
  ['GET', '/images/nope.png', { noAuth: true }], // 미디어 미존재 → 404
  ['GET', '/health', { noAuth: true }],
];

const CASES = [
  // 공통·과금
  ['GET', '/api/pricing'],
  ['GET', '/api/credits'],
  ['GET', '/api/credits/ledger?limit=5'],
  ['GET', '/api/subscription'],
  ['GET', '/api/dashboard/overview'],
  ['GET', '/api/dashboard/calendar'],
  ['GET', '/api/brand-kit'],
  ['GET', '/api/billing/packs'],
  // 팀·추천
  ['GET', '/api/teams'],
  ['GET', '/api/teams/context'],
  ['GET', '/api/teams/{teamId}'],
  ['GET', '/api/teams/{teamId}/credits/ledger?limit=5'],
  ['GET', '/api/affiliate'],
  // 템플릿·스튜디오·마켓
  ['GET', '/api/recipes'],
  ['GET', '/api/recipes?mode=product'],
  ['GET', '/api/studio/themes'],
  ['GET', '/api/marketplace/templates'],
  ['GET', '/api/marketplace/templates?feed=1'],
  ['GET', '/api/marketplace/templates?theme={themeSlug}'],
  ['GET', '/api/marketplace/templates/{templateId}'],
  ['GET', '/api/marketplace/templates/{templateId}/creations'],
  ['GET', '/api/marketplace/themes'],
  ['GET', '/api/marketplace/me'],
  ['GET', '/api/marketplace/earnings'],
  ['GET', '/api/marketplace/bookmarks'],
  ['GET', '/api/marketplace/owned'],
  ['GET', '/api/marketplace/recipe-gates'],
  ['GET', '/api/marketplace/default-officials'],
  ['GET', '/api/template-data'],
  // 캐릭터·미디어
  ['GET', '/api/characters'],
  ['GET', '/api/characters/{characterId}'],
  ['GET', '/api/characters/{characterId}/images'],
  ['GET', '/api/characters/{characterId}/images/jobs'],
  ['GET', '/api/characters/{characterId}/videos'],
  ['GET', '/api/characters/{characterId}/videos/jobs'],
  ['GET', '/api/characters/{characterId}/visual-presets'],
  ['GET', '/api/characters/{characterId}/contents'],
  ['GET', '/api/characters/{characterId}/publish-jobs'],
  ['GET', '/api/visuals/categories'],
  ['GET', '/api/visuals/attributes'],
  // 생성 엔진(조회)
  ['GET', '/api/generate/tools'],
  ['GET', '/api/generate/styles'],
  ['GET', '/api/generate/prompts'],
  ['GET', '/api/generate/prompts/{promptIdx}'],
  ['GET', '/api/generate/results'],
  ['GET', '/api/generate/results?type=reel'],
  ['GET', '/api/generate/community'],
  ['GET', '/api/generate/creations/{resultIdx}'],
  ['GET', '/api/generate/creator-overview'],
  ['GET', '/api/generate/reviews'],
  ['GET', '/api/generate/video/jobs'],
  ['GET', '/api/generate/ugc/jobs'],
  ['GET', '/api/generate/ugc/jobs/by-result/{resultIdx}'],
  ['GET', '/api/generate/bgm/list'],
  ['GET', '/api/generate/images'],
  ['GET', '/api/generate/logs/files'],
  ['GET', '/api/generate/ugc/voice-preview'],   // 비결정적 — 상태/타입만
  // 계정
  ['GET', '/api/accounts'],
  ['GET', '/api/accounts/{accountId}'],
  ['GET', '/api/accounts/{accountId}/base-photo'],
  ['GET', '/api/accounts/{accountId}/reel-templates'],
  ['GET', '/api/accounts/{accountId}/outfit-prompts'],
  ['GET', '/api/accounts/{accountId}/post-queue'],
  ['GET', '/api/accounts/{accountId}/post-queue?status=pending'],
  ['GET', '/api/accounts/{accountId}/media'],
  ['GET', '/api/accounts/{accountId}/media?limit=1'],
  ['GET', '/api/accounts/{mediaAccountId}/media'],        // 미디어가 실제로 있는 계정
  ['GET', '/api/accounts/{queueAccountId}/post-queue'],   // 큐 항목이 실제로 있는 계정
  // 체험·관리자
  ['GET', '/api/trial/me'],
  ['GET', '/api/admin/trials', { admin: true }],
  ['GET', '/api/admin/stats', { admin: true }],
  ['GET', '/api/admin/creations?limit=5', { admin: true }],
  ['GET', '/api/admin/proposal/list', { admin: true }],
  ['GET', '/api/admin/proposal/results?limit=3', { admin: true }],
  ['GET', '/api/admin/proposal/saved/{proposalId}', { admin: true }],
  ['GET', '/api/admin/refine/runs', { admin: true }],
  // 에러 경로 — 형식·상태코드가 갈리기 쉬운 곳
  ['GET', '/api/generate/prompts/999999'],
  ['GET', '/api/generate/video/jobs/00000000-0000-0000-0000-000000000000'],
  ['GET', '/api/generate/faceswap/jobs/00000000-0000-0000-0000-000000000000'],
  ['GET', '/api/generate/ugc/jobs/00000000-0000-0000-0000-000000000000'],
  ['GET', '/api/generate/ugc/jobs/by-result/999999'],
  ['GET', '/api/marketplace/templates/not-a-uuid'],
  ['GET', '/api/marketplace/templates/00000000-0000-0000-0000-000000000000'],
  ['GET', '/api/marketplace/creators/nobody-xyz'],
  ['GET', '/api/teams/00000000-0000-0000-0000-000000000000'],
  ['GET', '/api/teams/invites/NOPE'],
  ['GET', '/api/template-data/00000000-0000-0000-0000-000000000000'],
  ['GET', '/api/characters/00000000-0000-0000-0000-000000000000'],
  ['GET', '/api/pack/999999'],                    // {error} 봉투(다른 도메인과 다름)
  ['GET', '/api/pack/nonexistent-share'],
  ['GET', '/api/accounts/00000000-0000-0000-0000-000000000000'],
  ['GET', '/api/admin/proposal/saved/00000000-0000-0000-0000-000000000000', { admin: true }],
  ['GET', '/api/admin/refine/runs/00000000-0000-0000-0000-000000000000', { admin: true }],
  // 인증·권한
  ['GET', '/api/credits', { noAuth: true }],
  ['GET', '/api/generate/tools', { noAuth: true }],
  ['GET', '/api/admin/stats'],                    // 일반 유저 → 403
  ['GET', '/api/admin/refine/runs'],              // 일반 유저 → 403
];

/** 본문이 매 호출 달라지는 경로 — 상태코드·Content-Type만 비교 */
// 매 요청 값이 달라지는 응답 — 상태/Content-Type만 비교한다.
const NONDETERMINISTIC = ['/api/generate/ugc/voice-preview', '/health'];

/**
 * **의도적 차이** — 이식하며 고친 것들. 실패로 세지 않고 별도로 보고한다.
 *   여기 없는 차이가 나면 그건 회귀다.
 */
const INTENTIONAL_DIFFS = [
  {
    path: '/api/admin/business/** · /admin-business',
    why: 'Nest에만 있는 신규 도메인(레거시에 대응 라우트 자체가 없다) → parity 비교 대상이 아니다. '
       + 'CASES에 넣으면 레거시 404 vs Nest 200으로 항상 실패한다. 신규 기능은 parity가 아니라 직접 스모크로 검증할 것.',
  },
  {
    path: '/admin-*',
    why: '레거시는 클린URL 라우트(/^\\/([a-z0-9-]+)$/)가 먼저 매칭돼 requireAdminPage가 실행되지 않았다 '
       + '→ 비로그인도 관리자 페이지 셸이 200으로 서빙됨. Nest는 AdminPageGuard가 실제로 걸려 302 /login(또는 403).',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ③ 쓰기 parity (--mutations) — 서버별로 자기 픽스처를 만들고, 정규화 비교 후 지운다.
//    run(base) 은 { status, body } 를 돌려주고, cleanup(base, state) 이 뒷정리한다.
// ─────────────────────────────────────────────────────────────────────────────
const MUTATIONS = [
  {
    name: 'POST /api/teams → 생성 후 삭제',
    async run(base, tag) {
      const r = await hit(base, 'POST', '/api/teams', { body: { name: `parity-${tag}` } });
      return { r, state: r.json?.data?.id };
    },
    cleanup: (base, id) => id && hit(base, 'DELETE', `/api/teams/${id}`),
  },
  {
    name: 'POST /api/teams 이름 누락 → 400',
    run: (base) => hit(base, 'POST', '/api/teams', { body: { name: '  ' } }).then((r) => ({ r })),
  },
  {
    name: 'POST /api/studio/themes → 생성 후 삭제',
    async run(base, tag) {
      const r = await hit(base, 'POST', '/api/studio/themes', { body: { name: `parity-${tag}`, group: 'Shopping' } });
      return { r, state: r.json?.data?.id };
    },
    cleanup: (base, id) => id && hit(base, 'DELETE', `/api/studio/themes/${id}`),
  },
  {
    name: 'PATCH /api/studio/themes/:id 변경내용 없음 → 400',
    run: (base) => hit(base, 'PATCH', '/api/studio/themes/00000000-0000-0000-0000-000000000000', { body: {} }).then((r) => ({ r })),
  },
  {
    name: 'POST /api/template-data → 생성 후 삭제',
    async run(base, tag) {
      const r = await hit(base, 'POST', '/api/template-data', { body: { templateType: 'studio', name: `parity-${tag}`, data: { a: 1 } } });
      return { r, state: r.json?.data?.id };
    },
    cleanup: (base, id) => id && hit(base, 'DELETE', `/api/template-data/${id}`),
  },
  {
    name: 'POST /api/template-data 필수값 누락 → 400',
    run: (base) => hit(base, 'POST', '/api/template-data', { body: { name: 'x' } }).then((r) => ({ r })),
  },
  {
    name: 'POST /api/subscription/offer/start (멱등)',
    run: (base) => hit(base, 'POST', '/api/subscription/offer/start').then((r) => ({ r })),
  },
  {
    // ⚠️ 성공 경로(free→pro)는 parity로 못 돌린다 — **상태를 바꾸는 데다 누적**된다.
    //    먼저 호출한 서버가 플랜을 올려버려서, 두 번째 서버는 "연장(extended)"으로 시작한다
    //    → 항상 불일치로 보인다(실측: Nest upgraded:true / Legacy extended:true).
    //    2026-08-11 dev에서 **양쪽 모두 plan=free로 리셋한 뒤** 각각 호출해 응답이 완전히 같음을 확인했다.
    //    여기서는 상태를 바꾸지 않는 검증 경로만 비교한다.
    name: 'POST /api/subscription/upgrade 잘못된 플랜 → 400',
    run: (base) => hit(base, 'POST', '/api/subscription/upgrade', { body: { plan: 'no-such-plan' } }).then((r) => ({ r })),
  },
  {
    name: 'PATCH /api/brand-kit (색상 변경, 멱등)',
    run: (base) => hit(base, 'PATCH', '/api/brand-kit', { body: { primaryColor: '#123456' } }).then((r) => ({ r })),
  },
  {
    name: 'POST /api/generate 필수값 누락 → 400',
    run: (base) => hit(base, 'POST', '/api/generate', { body: {} }).then((r) => ({ r })),
  },
  {
    name: 'POST /api/marketplace/templates 필수값 누락 → 400',
    run: (base) => hit(base, 'POST', '/api/marketplace/templates', { body: { name: 'x' } }).then((r) => ({ r })),
  },
  {
    name: 'POST /api/accounts/{accountId}/base-photo mediaId 누락 → 400',
    needs: ['accountId'],
    run: (base, tag, ctx) => hit(base, 'POST', `/api/accounts/${ctx.accountId}/base-photo`, { body: {} }).then((r) => ({ r })),
  },
  {
    name: 'PATCH /api/accounts/{accountId}/status 잘못된 값 → 400',
    needs: ['accountId'],
    run: (base, tag, ctx) => hit(base, 'PATCH', `/api/accounts/${ctx.accountId}/status`, { body: { status: 'nope' } }).then((r) => ({ r })),
  },
  {
    name: 'POST /api/marketplace/templates/{templateId}/bookmark → 해제 (멱등)',
    needs: ['templateId'],
    async run(base, tag, ctx) {
      const r = await hit(base, 'POST', `/api/marketplace/templates/${ctx.templateId}/bookmark`);
      await hit(base, 'DELETE', `/api/marketplace/templates/${ctx.templateId}/bookmark`);
      return { r };
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ③ 시드(--seed) — 비어 있어서 SKIP 되는 픽스처를 만든다. 만든 것만 되돌린다.
//    팀은 API로, 프롬프트/결과물은 외부 생성 API 없이 만들 수 없어 DB에 직접 넣는다(테스트 전용).
// ─────────────────────────────────────────────────────────────────────────────
async function seed() {
  const created = { teamId: null, promptIdx: null, userId: null };
  // 팀 — 목록이 비어 있을 때만
  const teams = await hit(LEGACY, 'GET', '/api/teams');
  if (teams.json && Array.isArray(teams.json.data) && teams.json.data.length === 0) {
    const r = await hit(LEGACY, 'POST', '/api/teams', { body: { name: 'parity-seed' } });
    created.teamId = r.json?.data?.id || null;
  }
  // 프롬프트 + 결과물 — 생성 API는 외부 프로바이더가 필요하므로 리포지토리로 직접 삽입
  const results = await hit(LEGACY, 'GET', '/api/generate/results');
  if (results.json && Array.isArray(results.json.data) && results.json.data.length === 0) {
    try {
      const { verifyToken } = require('../src/auth/token');
      const payload = verifyToken(TOKEN);
      const promptRepo = require('../src/generate/prompt.repository');
      const resultRepo = require('../src/generate/result.repository');
      const prompt = await promptRepo.insert({ userId: payload.id, promptText: 'parity-seed prompt', model: 'parity' });
      await resultRepo.insert({
        promptIdx: prompt.idx, filePath: 'tmp/images/parity-seed.png',
        width: 1, height: 1, model: 'parity', metadata: { parity: true },
      });
      created.promptIdx = prompt.idx;
      created.userId = payload.id;
    } catch (e) {
      console.log(`   (시드 경고: 프롬프트/결과물 생성 실패 — ${e.message})`);
    }
  }
  return created;
}

async function unseed(created) {
  if (created.teamId) await hit(LEGACY, 'DELETE', `/api/teams/${created.teamId}`);
  if (created.promptIdx) {
    try {
      const { query } = require('../src/db/client');
      await query('DELETE FROM generation_results WHERE prompt_idx = $1', [created.promptIdx]);
      await query('DELETE FROM prompts WHERE idx = $1', [created.promptIdx]);
    } catch (_) {}
  }
}

/** 두 서버가 응답할 때까지 대기. 안 뜨면 원인을 알려주고 종료(전 케이스가 줄줄이 실패하는 것 방지). */
async function preflight() {
  const targets = [['Nest', NEST], ['레거시', LEGACY]];
  for (const [label, base] of targets) {
    let ok = false, waited = false;
    for (let i = 0; i < 30; i++) {
      try { await fetch(base + '/health'); ok = true; break; } catch (_) {}
      if (i === 0) process.stdout.write(`${label}(${base}) 기다리는 중`);
      process.stdout.write('.');
      waited = true;
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!ok) {
      console.error(`\n❌ ${label} 서버(${base})가 응답하지 않습니다.`);
      console.error('   비교용 레거시는 부팅에 10~15초 걸립니다 — 띄운 뒤 잠시 기다렸다 실행하세요.');
      console.error(`   확인: curl -s -o /dev/null -w '%{http_code}\\n' ${base}/health`);
      process.exit(2);
    }
    if (waited) process.stdout.write(' 준비됨\n');
  }
  // 토큰이 실제로 통하는지(=해당 유저가 존재하는지) 확인 — 401이면 케이스가 전부 401로 "일치"해 무의미해진다.
  const probe = await hit(LEGACY, 'GET', '/api/credits');
  if (probe.status === 401) {
    console.error('❌ 토큰이 거부됩니다(401). JWT_SECRET이 이 서버 것과 같은지, id가 실제 유저 uuid인지 확인하세요.');
    console.error("   유저 확인: NODE_ENV=development node -e \"require('./src/db/client').query('SELECT id,email,role FROM users LIMIT 5').then(r=>{console.table(r.rows);process.exit(0)})\" 2>/dev/null");
    process.exit(2);
  }
  if (probe.status >= 500) {
    console.error(`⚠️  토큰 사용자로 조회 시 ${probe.status} — id가 실제 uuid가 아닐 수 있습니다: ${probe.body.slice(0, 120)}`);
    process.exit(2);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  await preflight();
  let seeded = null;
  if (SEED) {
    seeded = await seed();
    const made = Object.entries(seeded).filter(([k, v]) => v && k !== 'userId').map(([k]) => k);
    console.log(`시드: ${made.length ? made.join(', ') + ' 생성' : '추가 생성 없음(이미 데이터 있음)'}`);
  }

  // ① 컨텍스트 해석
  const ctx = {};
  for (const key of RESOLVE_ORDER) {
    try { ctx[key] = await RESOLVERS[key](ctx); } catch (_) { ctx[key] = undefined; }
  }
  // 파생 키(mediaAccountId 등)는 스캔 과정에서 ctx에 함께 들어가므로 분모와 따로 센다.
  const resolved = Object.entries(ctx).filter(([, v]) => v !== undefined && v !== null);
  const core = RESOLVE_ORDER.filter((k) => ctx[k] !== undefined && ctx[k] !== null).length;
  console.log(`컨텍스트 해석: ${core}/${RESOLVE_ORDER.length}${resolved.length > core ? ` (+파생 ${resolved.length - core})` : ''}`
    + (VERBOSE ? '\n' + resolved.map(([k, v]) => `   ${k} = ${v}`).join('\n') : ''));
  const unresolved = RESOLVE_ORDER.filter((k) => ctx[k] === undefined || ctx[k] === null);
  if (unresolved.length) console.log(`   (미해석 → 관련 케이스 SKIP: ${unresolved.join(', ')})`);

  let pass = 0, skip = 0;
  const fails = [];

  // 읽기 케이스
  console.log('\n── 읽기 parity ──');
  for (const [method, rawPath, o = {}] of [...CASES, ...PAGE_CASES]) {
    const { path, missing } = fill(rawPath, ctx);
    if (ONLY && !rawPath.includes(ONLY)) continue;
    if (missing.length) {
      skip++;
      if (VERBOSE) console.log(`  - ${method} ${rawPath}  (SKIP: ${missing.join(',')} 없음)`);
      continue;
    }
    let n, l;
    try {
      [n, l] = await Promise.all([hit(NEST, method, path, o), hit(LEGACY, method, path, o)]);
    } catch (e) {
      fails.push({ path: `${method} ${path}`, why: `요청 실패: ${e.message} (두 서버가 떠 있는지 확인)` });
      continue;
    }
    const nondet = NONDETERMINISTIC.some((p) => rawPath.startsWith(p));
    const same = nondet
      ? n.status === l.status && n.ct === l.ct
      : n.status === l.status && n.body === l.body;
    if (same) { pass++; console.log(`  ✓ ${method} ${path}${nondet ? ' (상태/타입만)' : ''}`); }
    else {
      fails.push({
        path: `${method} ${path}`,
        why: n.status !== l.status ? `상태코드 Nest=${n.status} vs 레거시=${l.status}` : '본문 불일치',
        nest: n.body.slice(0, 300), legacy: l.body.slice(0, 300),
      });
      console.log(`  ✗ ${method} ${path}`);
    }
  }

  // 쓰기 케이스
  if (RUN_MUTATIONS) {
    console.log('\n── 쓰기 parity (정규화 비교) ──');
    for (const m of MUTATIONS) {
      if (ONLY && !m.name.includes(ONLY)) continue;
      if (m.needs && m.needs.some((k) => ctx[k] === undefined || ctx[k] === null)) {
        skip++;
        if (VERBOSE) console.log(`  - ${m.name}  (SKIP: ${m.needs.join(',')} 없음)`);
        continue;
      }
      let a, b;
      try {
        a = await m.run(NEST, 'nest', ctx);
        b = await m.run(LEGACY, 'legacy', ctx);
      } catch (e) {
        fails.push({ path: m.name, why: `실행 실패: ${e.message}` });
        continue;
      }
      const same = a.r.status === b.r.status && normalize(a.r.body) === normalize(b.r.body);
      if (same) { pass++; console.log(`  ✓ ${m.name}`); }
      else {
        fails.push({
          path: m.name,
          why: a.r.status !== b.r.status ? `상태코드 Nest=${a.r.status} vs 레거시=${b.r.status}` : '정규화 본문 불일치',
          nest: normalize(a.r.body).slice(0, 300), legacy: normalize(b.r.body).slice(0, 300),
        });
        console.log(`  ✗ ${m.name}`);
      }
      // ③ cleanup — 만든 픽스처 제거(각 서버가 만든 것 각각)
      if (m.cleanup) {
        try { await m.cleanup(NEST, a.state); await m.cleanup(LEGACY, b.state); } catch (_) {}
      }
    }
  } else {
    console.log('\n(쓰기 parity는 --mutations 로 실행 — 픽스처를 만들고 지웁니다)');
  }

  if (seeded) { await unseed(seeded); console.log('\n시드 정리 완료'); }

  console.log(`\n── parity ${pass} 통과 / ${fails.length} 실패 / ${skip} 건너뜀 ──`);
  if (INTENTIONAL_DIFFS.length) {
    console.log('\n의도적 차이(회귀 아님):');
    for (const d of INTENTIONAL_DIFFS) console.log(`  · ${d.path} — ${d.why}`);
  }
  if (fails.length) {
    console.log('\n실패 상세:');
    for (const f of fails) {
      console.log(`\n● ${f.path}\n   ${f.why}`);
      if (f.nest !== undefined) {
        console.log(`   Nest  : ${f.nest}`);
        console.log(`   Legacy: ${f.legacy}`);
      }
    }
    process.exit(1);
  }
})();
