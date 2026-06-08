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

// Lemon Squeezy webhook은 서명 검증을 위해 raw body가 필요 → express.json보다 먼저 마운트
const { webhookHandler } = require('./billing/billing.route');
app.post('/api/billing/webhook', express.raw({ type: '*/*' }), webhookHandler);

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
app.use('/api/brand-kit', requireAuth, require('./brandkit/brandkit.route').router);

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
});

module.exports = app;
