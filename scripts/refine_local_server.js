/**
 * refine_local_server.js — 로컬 미리보기 서버 (관리자 인증 없이 auto-refine 기능만)
 *
 *   node scripts/refine_local_server.js   →  http://localhost:5177
 *
 * ⚠️ 로컬 테스트 전용. 메인 서버(src/index.js)의 /admin-refine 는 requireAdmin 가드가 붙어 있음.
 *    이 서버는 인증을 우회하므로 로컬에서만 사용할 것.
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const { handler, applyHandler } = require('../src/admin/adminRefine.route');

const app = express();
app.use(express.json({ limit: '50mb' }));

app.get('/', (_req, res) => res.sendFile(path.join(process.cwd(), 'public', 'admin-refine.html')));
app.get('/admin-refine', (_req, res) => res.sendFile(path.join(process.cwd(), 'public', 'admin-refine.html')));
app.get('/admin-templates', (_req, res) => res.sendFile(path.join(process.cwd(), 'public', 'admin-templates.html'))); // UI 미리보기(CRUD API는 실서버 필요)
app.post('/api/admin/refine', handler); // 인증 우회(로컬 전용)
app.post('/api/admin/refine/apply', applyHandler);

const PORT = process.env.REFINE_PORT || 5177;
app.listen(PORT, () => {
  const has = (k) => (process.env[k] ? '✓' : '✗ (없음)');
  console.log(`\n▶ 로컬 미리보기 서버: http://localhost:${PORT}`);
  console.log(`   GEMINI_API_KEY ${has('GEMINI_API_KEY')} · ANTHROPIC_API_KEY ${has('ANTHROPIC_API_KEY')}`);
  console.log(`   생성=${process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview'}`);
  console.log('   (종료: Ctrl+C)\n');
});
