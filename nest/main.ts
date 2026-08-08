import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { AppModule } from './app.module';

// ── Strangler: NestJS가 기존 Express 앱을 감싸 마운트 ──
//   레거시 Express(기존 전체 라우트) = ../src/index.js.
//   dist/main.js 기준 __dirname=<repo>/dist → ../src/index.js = <repo>/src/index.js.
//   index.js는 require.main!==module이라 스스로 listen하지 않음(포트는 Nest가 소유).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacyApp: any = require(path.join(__dirname, '..', 'src', 'index.js'));
// Nest 경로 전용 파서(쿠키/JSON) — 레거시 미들웨어는 Nest 경로에 안 타므로 여기서 붙인다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require('cookie-parser');

// ── 이관 원장(strangler ledger) ──
//   여기 나열된 접두사만 NestJS가 처리하고, 나머지 모든 경로는 레거시 Express로 폴백한다.
//   도메인을 Nest로 포팅할 때마다 이 배열에 그 경로를 추가(예: '/api/pricing').
//   Nest가 매칭 실패 시 자체 404를 내버려 레거시로 안 내려가는 문제를, "소유 경로 화이트리스트"로 명시 해결.
const NEST_PREFIXES = ['/nest', '/api/pricing', '/api/credits', '/api/billing', '/api/subscription', '/api/dashboard', '/api/brand-kit'];
// /api/billing 접두사에 걸리지만 레거시로 남겨둘 경로 = 웹훅(raw body·무인증, index.js에 json 파싱 전 직접 마운트).
//   Nest로 넘기면 body가 json 파싱돼 서명검증이 깨지고 가드가 401을 냄 → 반드시 예외 처리.
const NEST_EXCLUDE = ['/api/billing/webhook', '/api/billing/eximbay/status', '/api/billing/portone/webhook'];

async function bootstrap() {
  // bodyParser:false — 레거시 Express가 자체적으로 body를 파싱하므로 이중 파싱 방지.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  const server = app.getHttpAdapter().getInstance();
  // 라우팅 스위치 — Nest 소유 경로면 Nest로, 아니면 레거시 Express가 처리.
  //   Nest 라우트 등록(app.listen 내부 init)보다 먼저 걸리므로 폴백이 확실히 동작.
  //   ⚠️ 파싱은 Nest 경로에만 적용 — 레거시 경로는 레거시 자체 파서가 처리(이중파싱/limit 충돌 회피).
  const cookieMw = cookieParser();
  const jsonMw = express.json({ limit: '10mb' });
  server.use((req: any, res: any, next: any) => {
    const p = req.path || req.url || '';
    const excluded = NEST_EXCLUDE.some((e) => p === e);   // 웹훅 등은 접두사 매칭돼도 레거시 유지
    const ownedByNest = !excluded && NEST_PREFIXES.some((pre) => p === pre || p.startsWith(pre + '/'));
    if (!ownedByNest) return legacyApp(req, res, next);   // → 레거시 Express(포팅 안 된 전부 + 웹훅)
    // Nest 경로: 쿠키 → JSON 파싱 후 Nest 컨트롤러로(가드가 req.cookies/req.body를 읽음)
    cookieMw(req, res, (e1: any) => (e1 ? next(e1) : jsonMw(req, res, next)));
  });

  const port = Number(process.env.PORT) || 3002;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[NestJS] strangler up on :${port} — Nest owns [${NEST_PREFIXES.join(', ')}], rest → legacy Express`);

  // 레거시 백그라운드 초기화(레시피 로드·스케줄러·영상폴러)를 Nest 부팅 후 실행.
  if (typeof legacyApp.startBackground === 'function') legacyApp.startBackground();
}

bootstrap();
