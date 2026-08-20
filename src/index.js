const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { env } = require('./config');
const log = require('./lib/logger')('Server');
const characterRoutes = require('./characters/character.route');
const imageRoutes = require('./images/image.route');
const videoRoutes = require('./videos/video.route');
const publishingRoutes = require('./publishing/publishing.route');
const visualRoutes = require('./visuals/visual.route');
const generateRoutes = require('./generate/generate.route');
const accountRoutes = require('./publishing/account.route');
const authRoutes = require('./auth/auth.route');
const { requireAuth, requirePage, requireAdmin, requireAdminPage } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Cloudflare/nginx 등 리버스 프록시 뒤에서 req.protocol/secure가 X-Forwarded-Proto를 따르도록.
// (HTTPS 도메인에서 secure 쿠키, 결제 redirect/팀 초대 링크가 https로 정확히 생성됨)
app.set('trust proxy', 1);

// Lemon Squeezy webhook은 서명 검증을 위해 raw body가 필요 → express.json보다 먼저 마운트
const { webhookHandler } = require('./billing/billing.route');
app.post('/api/billing/webhook', express.raw({ type: '*/*' }), webhookHandler);

// Eximbay status_url(서버 알림)은 원본 쿼리스트링 본문이 필요 → express.json보다 먼저, 공개(인증 X)
app.post('/api/billing/eximbay/status', express.text({ type: '*/*' }), async (req, res) => {
  try {
    await require('./billing/eximbay.service').handleStatus(typeof req.body === 'string' ? req.body : '');
  } catch (e) {
    require('./lib/logger')('Eximbay').error('status handler:', e.message);
  }
  res.send('OK'); // Eximbay에 200 응답 (재전송 방지)
});

// PortOne V2 결제알림(웹훅) — raw body, 공개(인증 X). paymentId 추출 후 서버가 PortOne API로 재검증.
app.post('/api/billing/portone/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    await require('./billing/portone.service').handleWebhook(req.body);
  } catch (e) {
    require('./lib/logger')('PortOne').error('webhook handler:', e.message);
  }
  res.send('OK'); // PortOne에 200 응답 (재전송 방지)
});

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// 정적 파일 서빙
// /images: 스토리지-aware. 로컬 파일 우선 서빙(과거 파일·같은 프로세스 생성물 호환, Range 지원=영상 seek) →
//          없으면 오브젝트 스토리지(S3/R2)로 302 redirect → 둘 다 없으면 404. MEDIA_S3 미설정 시 순수 로컬.
const mediaStore = require('./storage/mediaStore');
const IMAGES_DIR = path.join(process.cwd(), 'tmp', 'images');
// /images 파일은 전부 UUID(콘텐츠 주소) = 불변 → 장기 immutable 캐시. 편집/버전전환마다 같은 영상을
//   다시 받지 않아 즉시 전환됨(프론트가 새 URL을 미리 로드하면 렌더가 브라우저 캐시에서 즉시 서빙). 파일명이 바뀌면 URL도 바뀌므로 스테일 없음.
const IMG_CACHE_MS = 1000 * 60 * 60 * 24 * 30; // 30일
app.get('/images/:file', async (req, res, next) => {
  const name = path.basename(req.params.file); // path traversal 방지
  const local = path.join(IMAGES_DIR, name);
  if (fs.existsSync(local)) return res.sendFile(local, { maxAge: IMG_CACHE_MS, immutable: true }); // sendFile은 Range 처리 → 영상 탐색 정상
  if (!mediaStore.isRemote()) return next(); // 로컬 전용 모드 → 404
  const remote = mediaStore.remoteUrl(name);
  if (remote) return res.redirect(302, remote); // 공개 CDN/버킷 설정 시 302 오프로드
  // 비공개 버킷: 앱이 프록시 스트리밍(동일출처). Range 전달 → 영상 seek 시 206.
  try {
    const obj = await mediaStore.getObject(name, req.headers.range);
    if (!obj || !obj.Body) return next(); // 404
    res.setHeader('Cache-Control', `public, max-age=${Math.floor(IMG_CACHE_MS / 1000)}, immutable`);
    if (obj.ContentType) res.setHeader('Content-Type', obj.ContentType);
    if (obj.ContentLength != null) res.setHeader('Content-Length', obj.ContentLength);
    res.setHeader('Accept-Ranges', 'bytes');
    if (obj.ContentRange) { res.status(206); res.setHeader('Content-Range', obj.ContentRange); }
    obj.Body.on('error', () => { if (!res.headersSent) res.status(502); res.end(); });
    return obj.Body.pipe(res);
  } catch (_) { return next(); }
});
app.use('/bgm', express.static(path.join(process.cwd(), 'tmp', 'bgm')));

// ffmpeg.wasm self-host (Workers must be same-origin)
app.use('/vendor/ffmpeg', express.static(path.join(process.cwd(), 'node_modules/@ffmpeg/ffmpeg/dist/esm')));
app.use('/vendor/ffmpeg-util', express.static(path.join(process.cwd(), 'node_modules/@ffmpeg/util/dist/esm')));
app.use('/vendor/ffmpeg-core', express.static(path.join(process.cwd(), 'node_modules/@ffmpeg/core/dist/esm')));

// ─── 스토어 폐쇄 (2026-07-20) ───
// 진입점은 이미 뗐지만(js/rail.js 레일 항목 · studio.html SHOW_STORE=false) 클린 URL 라우트가
// public/store.html을 그대로 서빙하므로 북마크·외부 링크로는 계속 들어와졌다. 여기서 막는다.
// 404 대신 /studio 리다이렉트 — 옛 링크를 막다른 길이 아니라 앱 안으로 보낸다.
// ⚠️ 반드시 아래 클린 URL 라우트보다 '먼저' 와야 한다(`/store`가 store.html로 잡히기 전에 가로챈다).
//    `/store.html`은 클린 URL 라우트가 301 `/store`로 보내고 → 여기서 다시 /studio로 간다.
// ⚠️ /template(템플릿 상세)은 건드리지 않는다 — creation의 [View …]가 쓰는 살아있는 진입점이고,
//    보유/구매 CTA를 자체적으로 갖고 있어 스토어 없이도 자립한다.
// 롤백: 이 라우트 삭제 + js/rail.js 주석 복원 + studio.html SHOW_STORE=true.
app.get('/store', (_req, res) => res.redirect(302, '/studio'));

// ─── 클린 URL: 확장자 없이 path로 페이지 로드 ───
// `/studio` → public/studio.html 서빙, `/studio.html` → 301 `/studio` (쿼리스트링 보존).
// 단일 세그먼트 GET만 대상이며, 정적 자원(css/js, /css/* 등 다중 세그먼트·확장자)은 건드리지 않는다.
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.get(/^\/([a-z0-9-]+)(\.html)?$/i, (req, res, next) => {
  const name = req.params[0];
  if (req.params[1]) {
    // `.html`로 들어오면 확장자 없는 정규 URL로 영구 리다이렉트
    const q = req.originalUrl.indexOf('?');
    return res.redirect(301, `/${name}${q >= 0 ? req.originalUrl.slice(q) : ''}`);
  }
  const file = path.join(PUBLIC_DIR, `${name}.html`);
  if (fs.existsSync(file)) return res.sendFile(file);
  next();
});

// public 디렉터리의 공유 자원 (editor-core.css / editor-core.js 등)
// .html 등 페이지 자체는 위 클린 URL 라우트 / /heyhoai/* 라우트에서 sendFile로 서빙한다.
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false }));

// 메인페이지 — SaaS 랜딩
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'landing.html'));
});

// 추천 링크 — 클릭 기록 + 쿠키 60일 후 랜딩으로 (공개)
app.get('/r/:code', async (req, res) => {
  const affiliateService = require('./affiliate/affiliate.service');
  try {
    const ok = await affiliateService.recordClick(req.params.code);
    if (ok) {
      res.cookie(affiliateService.REF_COOKIE, req.params.code, {
        httpOnly: true, sameSite: 'lax', maxAge: affiliateService.REF_COOKIE_MAX_AGE, path: '/',
      });
    }
  } catch { /* 추적 실패해도 진행 */ }
  res.redirect('/');
});

// 공개 인증 페이지 (게이팅 없음)
app.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});
app.get('/signup', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'signup.html'));
});

// 페이지 라우팅 (모두 로그인 필요 — 미인증 시 /login 리다이렉트)
app.get('/heyhoai/image/generater/page', requirePage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});
app.get('/heyhoai/character/page', requirePage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'character.html'));
});
app.get('/heyhoai/templates/page', requirePage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'templates.html'));
});
app.get('/heyhoai/templates/birth-reel', requirePage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'birth-reel.html'));
});
app.get('/heyhoai/templates/baby-growth', requirePage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'baby-growth.html'));
});
app.get('/heyhoai/templates/:templateId', requirePage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'template-flow.html'));
});
app.get('/heyhoai/logs/page', requirePage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'logs.html'));
});
app.get('/heyhoai/accounts/page', requirePage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'accounts.html'));
});
app.get('/heyhoai/accounts/:id/manage', requirePage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'account-manage.html'));
});
app.get('/heyhoai/accounts/:id/analytics', requirePage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'account-analytics.html'));
});
app.get('/heyhoai/editor/page', requirePage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'editor.html'));
});
// 관리자 전용: 체험 계정 발급 페이지 (페이지 로드부터 admin 가드 · 비관리자 403)
app.get('/admin-trials', requireAdminPage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-trials.html'));
});

// 관리자 전용: 프롬프트 자동 정밀화 페이지 (페이지 로드부터 admin 가드)
app.get('/admin-refine', requireAdminPage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-refine.html'));
});

// 관리자 전용: 템플릿 관리(생성·수정·삭제) 페이지
app.get('/admin-templates', requireAdminPage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-templates.html'));
});

// 관리자 전용: 전체 크리에이션(비공개 포함) 뷰어
app.get('/admin-creations', requireAdminPage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-creations.html'));
});

// 관리자 전용: 기본 통계 대시보드
app.get('/admin-stats', requireAdminPage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-stats.html'));
});

// 관리자 전용: 회사 맞춤 제안서(before/after 소개 페이지) 빌더
app.get('/admin-proposal', requireAdminPage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-proposal.html'));
});

// 관리자 전용: 사업체 인스타그램 관리(목록 → 상세)
//   ⚠️ API(/api/admin/business)는 Nest 소유다 — 레거시 단독 기동(staging/prod)에서는 페이지만 뜨고
//   데이터는 안 붙는다. dev(NestJS)에서 동작하며, 이관 완료 시 그대로 살아난다.
app.get('/admin-business', requireAdminPage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-business.html'));
});
app.get('/admin-users', requireAdminPage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-users.html'));
});
app.get('/admin-users/:id', requireAdminPage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-user-detail.html'));
});
// Meta 직결 — META_DIRECT_ENABLED 가 꺼져 있으면 없는 페이지로 넘긴다(next() → 404)
app.get('/admin-business-meta', requireAdminPage, (_req, res, next) => {
  if (!env.META_DIRECT_ENABLED) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-business-meta.html'));
});
// Meta 섹션의 사업체 상세 — 별도 화면(계정 목록·즉시 발행이 직결 전용)
app.get('/admin-business-meta/:id', requireAdminPage, (_req, res, next) => {
  if (!env.META_DIRECT_ENABLED) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-business-meta-detail.html'));
});
app.get('/admin-business/:id', requireAdminPage, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-business-detail.html'));
});

// 인증 라우트 (공개)
app.use('/api/auth', authRoutes);

// 가격 단일 소스 (공개 — landing 등 비로그인 페이지도 사용)
app.use('/api/pricing', require('./pricing/pricing.route'));

// 비즈니스 API (모두 로그인 필요)
app.use('/api/characters', requireAuth, characterRoutes);
app.use('/api', requireAuth, imageRoutes);
app.use('/api', requireAuth, videoRoutes);
app.use('/api', requireAuth, publishingRoutes);
app.use('/api', requireAuth, visualRoutes);
app.use('/api/generate', requireAuth, generateRoutes);
app.use('/api/template-data', requireAuth, require('./generate/template.route'));
app.use('/api/accounts', requireAuth, accountRoutes);
app.use('/api/credits', requireAuth, require('./credits/credit.route'));
app.use('/api/billing', requireAuth, require('./billing/billing.route').router);
app.use('/api/billing/eximbay', requireAuth, require('./billing/eximbay.route').router);
app.use('/api/billing/portone', requireAuth, require('./billing/portone.route').router);
app.use('/api/brand-kit', requireAuth, require('./brandkit/brandkit.route').router);
app.use('/api/marketplace', requireAuth, require('./marketplace/marketplace.route').router);
app.use('/api/studio', requireAuth, require('./studio/studioThemes.route').router);
app.use('/api/affiliate', requireAuth, require('./affiliate/affiliate.route').router);
app.use('/api/teams', requireAuth, require('./teams/team.route').router);
app.use('/api/dashboard', requireAuth, require('./dashboard/dashboard.route').router);
app.use('/api/subscription', requireAuth, require('./subscription/subscription.route').router);
app.use('/api/recipes', requireAuth, require('./recipes/recipe.route'));
app.use('/api/pack', requireAuth, require('./pack/pack.route'));
// 체험 계정 (라우트 내부에서 requireAdmin/requireAuth 자체 가드)
app.use('/api', require('./trial/trial.route'));
app.use('/api', require('./admin/adminRefine.route'));
app.use('/api', require('./admin/adminData.route')); // 관리자: 전체 크리에이션(비공개 포함) + 통계
app.use('/api/admin/proposal', requireAuth, requireAdmin, require('./admin/proposal.route').router);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// 서버 부팅 후 백그라운드 초기화(레시피 로드·스케줄러·영상폴러·UGC 리퍼).
//   listen 콜백에서 분리 — NestJS(strangler)가 이 Express 앱을 마운트할 때도 동일 초기화를 호출할 수 있게 함.
function startBackground() {
  // 레시피 정본을 DB(recipes 테이블)에서 메모리로 로드. 실패/0행이면 시드 JS 폴백.
  const { pool } = require('./db/client');
  require('./recipes/recipeStore').init(pool)
    .then((r) => log.info(`Recipes loaded from ${r.source} (${r.count})${r.error ? ' — ' + r.error : ''}`))
    .catch((e) => log.warn('Recipe init failed, using seed fallback:', e.message));

  // 자동 업로드 스케줄러 시작
  const { startScheduler } = require('./publishing/scheduler');
  startScheduler();

  // 구독 정기청구 스케줄러 — **실제 돈이 빠지므로 기본 꺼짐**(off-by-default).
  //   BILLING_SCHEDULER=on 인 프로세스에서만 돈다. 여러 환경이 같은 DB를 보는 구성에서
  //   둘 다 켜면 이중 청구 위험이 있으므로, 켜는 곳은 **한 곳뿐**이어야 한다.
  //   (멱등 인덱스가 최종 방어선이지만, 애초에 두 번 시도하지 않는 게 맞다.)
  if (String(env.BILLING_SCHEDULER || '').trim().toLowerCase() === 'on') {
    require('./billing/subscriptionScheduler').start();
  } else {
    log.info('Subscription billing scheduler off (BILLING_SCHEDULER≠on)');
  }

  // 비동기 릴스 생성 폴러 시작 — 로컬(prod DB에 붙는 :3001)에선 DISABLE_VIDEO_POLLER=true로 꺼서
  //   prod 폴러와의 이중 폴링(같은 잡 중복 finalize·attempts 부풀림) 방지. 기본 실행(prod 무변경).
  if (env.DISABLE_VIDEO_POLLER) {
    log.warn('Video job poller disabled (DISABLE_VIDEO_POLLER=true) — 로컬 전용');
  } else {
    require('./generate/videoJob.service').startPoller();
    // UGC 완성본 캐시 백스톱 — 크래시로 방치된 잡의 비활성 컴포지트 정리(고아 파일 회수).
    //   폴러와 동일 게이트라 prod에서만 실행(로컬 :3001은 prod DB에 붙으므로 sweep 금지). 시작 90s 후 1회 + 6h 간격.
    const ugc = require('./ugc/ugcVideo.service');
    if (ugc.sweepStaleComposites) {
      setTimeout(() => ugc.sweepStaleComposites().catch((e) => log.warn('UGC composite sweep failed: ' + e.message)), 90 * 1000);
      setInterval(() => ugc.sweepStaleComposites().catch(() => {}), 6 * 60 * 60 * 1000).unref();
    }
    // 최초 렌더가 크래시·재배포로 죽은 잡 회수 = failed + 환불. **부팅 시 1회만**(인터벌 없음).
    //   reapStaleProcessing은 `script IS NOT NULL` 조건이라 최초 렌더(렌더 중 script=NULL)를 못 잡아,
    //   유저가 선차감된 채 잡도 영상도 못 받는 구멍이 있었다.
    //   나이로 판단하지 않는 이유: runPipeline이 중간에 updateJob을 안 불러 렌더 내내 updated_at이
    //   INSERT 시각에 멈춰 있다 → 살아있는 렌더를 failed+환불로 죽여 돈이 두 번 나간다.
    //   파이프라인은 프로세스 메모리에만 살고 pm2 instances:1 + fork(겹침 없음)라
    //   "새 프로세스가 떴다 = 이전 파이프라인 100% 사망"이 확정. 그래서 부팅 1회로 충분하고 안전하다.
    if (ugc.reapCrashedRenders) {
      setTimeout(() => ugc.reapCrashedRenders().catch((e) => log.warn('UGC crashed-render reap failed: ' + e.message)), 8000).unref();
    }
    // #9: 크래시/재배포로 status='processing'에 갇힌 ugc_jobs 회수(폴러와 동일 게이트=prod only). 시작 60s 후 + 5분 간격.
    if (ugc.reapStaleProcessing) {
      setTimeout(() => ugc.reapStaleProcessing().catch((e) => log.warn('UGC processing reap failed: ' + e.message)), 60 * 1000);
      setInterval(() => ugc.reapStaleProcessing().catch(() => {}), 5 * 60 * 1000).unref();
    }
  }
}

// 직접 실행(node src/index.js — prod/staging의 pm2가 이 파일을 스크립트로 구동)일 때만 리슨.
//   NestJS 등이 require로 이 앱을 마운트할 땐 리슨하지 않음(포트는 상위 Nest 앱이 소유).
//   → prod/staging 동작 완전 동일. dev만 nest/main.ts가 이 앱을 감싸 startBackground()를 호출.
if (require.main === module) {
  app.listen(env.PORT, () => {
    log.info(`Running on port ${env.PORT}`);
    startBackground();
  });
}

module.exports = app;
module.exports.startBackground = startBackground;
