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

// ── 이관 원장(strangler ledger) ──
//   여기 나열된 접두사만 NestJS가 처리하고, 나머지 모든 경로는 레거시 Express로 폴백한다.
//   도메인을 Nest로 포팅할 때마다 이 배열에 그 경로를 추가(예: '/api/pricing').
//   Nest가 매칭 실패 시 자체 404를 내버려 레거시로 안 내려가는 문제를, "소유 경로 화이트리스트"로 명시 해결.
const NEST_PREFIXES = ['/nest', '/api/pricing'];

async function bootstrap() {
  // bodyParser:false — 레거시 Express가 자체적으로 body를 파싱하므로 이중 파싱 방지.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  const server = app.getHttpAdapter().getInstance();
  // 라우팅 스위치 — Nest 소유 경로면 Nest로 통과(next), 아니면 레거시 Express가 처리.
  //   Nest 라우트 등록(app.listen 내부 init)보다 먼저 걸리므로, 폴백이 확실히 동작.
  server.use((req: any, res: any, next: any) => {
    const p = req.path || req.url || '';
    const ownedByNest = NEST_PREFIXES.some((pre) => p === pre || p.startsWith(pre + '/'));
    if (ownedByNest) return next();      // → Nest 컨트롤러
    return legacyApp(req, res, next);    // → 레거시 Express(포팅 안 된 전부)
  });

  const port = Number(process.env.PORT) || 3002;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[NestJS] strangler up on :${port} — Nest owns [${NEST_PREFIXES.join(', ')}], rest → legacy Express`);

  // 레거시 백그라운드 초기화(레시피 로드·스케줄러·영상폴러)를 Nest 부팅 후 실행.
  if (typeof legacyApp.startBackground === 'function') legacyApp.startBackground();
}

bootstrap();
