#!/usr/bin/env node
/**
 * NestJS 이관 parity 체크 — Nest(dist/main.js)와 레거시(src/index.js) 응답이 같은지 자동 비교.
 *
 * 이관 작업의 표준 검증(docs/NESTJS_이관.md §6)을 스크립트로 고정한 것.
 * 두 서버를 **직접 띄운 뒤** 같은 JWT로 같은 요청을 보내고, 상태코드 + 본문을 바이트 비교한다.
 *
 * 사용법:
 *   # 1) 두 서버를 각각 띄운다(프레시 로컬 DB 권장 — createdb doppia_migtest && npm run migrate:dev)
 *   NODE_ENV=development node dist/main.js &                 # Nest   :3002
 *   NODE_ENV=development PORT=3003 node src/index.js &       # 레거시 :3003
 *   # 2) 토큰을 만들어 실행
 *   node scripts/nest_parity_check.js --token <JWT> [--admin-token <JWT>]
 *
 * 옵션:
 *   --nest <url>    기본 http://localhost:3002
 *   --legacy <url>  기본 http://localhost:3003
 *   --only <substr> 경로에 substr이 포함된 케이스만 실행
 *
 * 종료코드: 불일치가 하나라도 있으면 1.
 *
 * ⚠️ 비결정적 응답(생성 오디오·랜덤 id 등)은 NONDETERMINISTIC에 넣어 상태코드/Content-Type만 비교한다.
 */
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};

const NEST = opt('nest', 'http://localhost:3002');
const LEGACY = opt('legacy', 'http://localhost:3003');
const TOKEN = opt('token', process.env.PARITY_TOKEN || '');
const ADMIN_TOKEN = opt('admin-token', process.env.PARITY_ADMIN_TOKEN || TOKEN);
const ONLY = opt('only', '');

if (!TOKEN) {
  console.error('토큰이 필요합니다: --token <JWT> (관리자 케이스는 --admin-token)');
  console.error('예) node -e "console.log(require(\'./src/auth/token\').signToken({id:\'<uuid>\',role:\'user\'}))"');
  process.exit(2);
}

/** 케이스: [method, path, {admin?, query?, body?}] — GET/조회 위주(부수효과 없는 것만) */
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
  ['GET', '/api/affiliate'],
  // 템플릿·스튜디오·마켓
  ['GET', '/api/recipes'],
  ['GET', '/api/recipes?mode=product'],
  ['GET', '/api/studio/themes'],
  ['GET', '/api/marketplace/templates'],
  ['GET', '/api/marketplace/templates?feed=1'],
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
  ['GET', '/api/visuals/categories'],
  ['GET', '/api/visuals/attributes'],
  // 생성 엔진(조회)
  ['GET', '/api/generate/tools'],
  ['GET', '/api/generate/styles'],
  ['GET', '/api/generate/prompts'],
  ['GET', '/api/generate/results'],
  ['GET', '/api/generate/results?type=reel'],
  ['GET', '/api/generate/community'],
  ['GET', '/api/generate/creator-overview'],
  ['GET', '/api/generate/reviews'],
  ['GET', '/api/generate/video/jobs'],
  ['GET', '/api/generate/ugc/jobs'],
  ['GET', '/api/generate/bgm/list'],
  ['GET', '/api/generate/images'],
  ['GET', '/api/generate/logs/files'],
  // 계정(조회)
  ['GET', '/api/accounts'],
  // 체험·관리자
  ['GET', '/api/trial/me'],
  ['GET', '/api/admin/trials', { admin: true }],
  ['GET', '/api/admin/stats', { admin: true }],
  ['GET', '/api/admin/creations?limit=5', { admin: true }],
  ['GET', '/api/admin/proposal/list', { admin: true }],
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
  // 인증·권한 — 토큰 없이/일반 유저로
  ['GET', '/api/credits', { noAuth: true }],
  ['GET', '/api/generate/tools', { noAuth: true }],
  ['GET', '/api/admin/stats'],                    // 일반 유저 → 403
  ['GET', '/api/admin/refine/runs'],              // 일반 유저 → 403
];

/** 본문이 매 호출 달라지는 경로 — 상태코드·Content-Type만 비교 */
const NONDETERMINISTIC = ['/api/generate/ugc/voice-preview'];

async function hit(base, method, path, o = {}) {
  const headers = {};
  if (!o.noAuth) headers.Authorization = `Bearer ${o.admin ? ADMIN_TOKEN : TOKEN}`;
  const res = await fetch(base + path, { method, headers });
  const ct = res.headers.get('content-type') || '';
  const body = ct.startsWith('audio/') || ct.startsWith('image/') || ct.startsWith('video/')
    ? `<binary ${ct}>` : await res.text();
  return { status: res.status, ct: ct.split(';')[0], body };
}

(async () => {
  const cases = CASES.filter(([, p]) => !ONLY || p.includes(ONLY));
  let pass = 0;
  const fails = [];

  for (const [method, path, o = {}] of cases) {
    let n, l;
    try {
      [n, l] = await Promise.all([hit(NEST, method, path, o), hit(LEGACY, method, path, o)]);
    } catch (e) {
      fails.push({ path, why: `요청 실패: ${e.message} (두 서버가 떠 있는지 확인)` });
      continue;
    }
    const nondet = NONDETERMINISTIC.some((p) => path.startsWith(p));
    const same = nondet
      ? n.status === l.status && n.ct === l.ct
      : n.status === l.status && n.body === l.body;
    if (same) {
      pass++;
      process.stdout.write(`  ✓ ${method} ${path}${nondet ? ' (상태/타입만)' : ''}\n`);
    } else {
      fails.push({
        path: `${method} ${path}`,
        why: n.status !== l.status
          ? `상태코드 Nest=${n.status} vs 레거시=${l.status}`
          : '본문 불일치',
        nest: n.body.slice(0, 300),
        legacy: l.body.slice(0, 300),
      });
      process.stdout.write(`  ✗ ${method} ${path}\n`);
    }
  }

  console.log(`\n── parity ${pass}/${cases.length} 통과 ──`);
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
