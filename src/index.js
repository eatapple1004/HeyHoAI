const express = require('express');
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
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

// 정적 파일 서빙
app.use('/images', express.static(path.join(process.cwd(), 'tmp', 'images')));

// 페이지 라우팅
app.get('/heyhoai/image/generater/page', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});
app.get('/heyhoai/character/page', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'character.html'));
});
app.get('/heyhoai/logs/page', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'logs.html'));
});
app.get('/heyhoai/accounts/page', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'accounts.html'));
});

// Routes
app.use('/api/characters', characterRoutes);
app.use('/api', imageRoutes);
app.use('/api', videoRoutes);
app.use('/api', publishingRoutes);
app.use('/api', visualRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/accounts', accountRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

app.listen(env.PORT, () => {
  log.info(`Running on port ${env.PORT}`);
});

module.exports = app;
