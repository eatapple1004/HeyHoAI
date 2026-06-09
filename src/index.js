const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
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
const { requireAuth, requirePage } = require('./middleware/auth');
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

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// 정적 파일 서빙
app.use('/images', express.static(path.join(process.cwd(), 'tmp', 'images')));
app.use('/bgm', express.static(path.join(process.cwd(), 'tmp', 'bgm')));

// ffmpeg.wasm self-host (Workers must be same-origin)
app.use('/vendor/ffmpeg', express.static(path.join(process.cwd(), 'node_modules/@ffmpeg/ffmpeg/dist/esm')));
app.use('/vendor/ffmpeg-util', express.static(path.join(process.cwd(), 'node_modules/@ffmpeg/util/dist/esm')));
app.use('/vendor/ffmpeg-core', express.static(path.join(process.cwd(), 'node_modules/@ffmpeg/core/dist/esm')));

// public 디렉터리의 공유 자원 (editor-core.css / editor-core.js 등)
// .html 등 페이지 자체는 /heyhoai/* 라우트에서 sendFile로 서빙하므로
// 일반 진입 경로와는 겹치지 않는다.
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

// 인증 라우트 (공개)
app.use('/api/auth', authRoutes);

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
app.use('/api/brand-kit', requireAuth, require('./brandkit/brandkit.route').router);
app.use('/api/marketplace', requireAuth, require('./marketplace/marketplace.route').router);
app.use('/api/affiliate', requireAuth, require('./affiliate/affiliate.route').router);
app.use('/api/teams', requireAuth, require('./teams/team.route').router);
app.use('/api/dashboard', requireAuth, require('./dashboard/dashboard.route').router);
app.use('/api/subscription', requireAuth, require('./subscription/subscription.route').router);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

app.listen(env.PORT, () => {
  log.info(`Running on port ${env.PORT}`);

  // 자동 업로드 스케줄러 시작
  const { startScheduler } = require('./publishing/scheduler');
  startScheduler();

  // 비동기 릴스 생성 폴러 시작
  require('./generate/videoJob.service').startPoller();
});

module.exports = app;
