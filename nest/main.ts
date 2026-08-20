import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { AppModule } from './app.module';
import { LegacyErrorFilter } from './common/legacy-error.filter';

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
//   ⚠️ **더 이상 게이트가 아니다**(2026-08-11 프론트 이관). 이제 웹훅을 뺀 모든 요청이 Nest로 먼저 들어가고,
//      Nest가 못 잡은 것만 정적 → 레거시 순으로 흘러내린다(아래 bootstrap 참고).
//      배열은 "무엇을 Nest가 소유하는가"를 기록·로깅하는 원장으로 남긴다.
const NEST_PREFIXES = ['/nest', '/api/pricing', '/api/credits', '/api/billing', '/api/subscription', '/api/dashboard', '/api/brand-kit', '/api/teams', '/api/affiliate', '/api/recipes', '/api/studio', '/api/marketplace', '/api/characters', '/api/images', '/api/videos', '/api/visuals', '/api/template-data', '/api/admin/trials', '/api/trial', '/api/contents', '/api/publish-jobs', '/api/admin/creations', '/api/admin/stats', '/api/admin/proposal', '/api/admin/refine', '/api/admin/users', '/api/admin/business-meta', '/api/admin/business', '/api/auth', '/api/pack', '/api/accounts', '/api/generate', '/api/ad-studio'];
// /api/billing 접두사에 걸리지만 레거시로 남겨둘 경로 = 웹훅(raw body·무인증, index.js에 json 파싱 전 직접 마운트).
//   Nest로 넘기면 body가 json 파싱돼 서명검증이 깨지고 가드가 401을 냄 → 반드시 예외 처리.
const NEST_EXCLUDE = ['/api/billing/webhook', '/api/billing/eximbay/status', '/api/billing/portone/webhook'];

async function bootstrap() {
  const server = express();
  const adapter = new ExpressAdapter(server);
  // ⚠️ Nest 기본 404 핸들러를 끈다.
  //   Nest는 init 시 catch-all 미들웨어를 붙여 미매칭 요청에 JSON 404를 내는데, 그게 있으면
  //   그 뒤에 등록한 **정적 서빙·레거시 폴백이 영원히 실행되지 않는다**(실측: 모든 정적 파일 404).
  //   미매칭 요청은 정적 → 레거시 순으로 흘러야 하므로 no-op으로 만든다.
  adapter.setNotFoundHandler = () => undefined;

  // bodyParser:false — 파서는 아래에서 직접 붙인다(레거시와 동일한 50mb 상한).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, adapter, {
    bodyParser: false,
  });

  // 전역 예외 필터 — Nest 기본 {statusCode,message} 대신 레거시 errorHandler 형식({success,error})으로 통일.
  app.useGlobalFilters(new LegacyErrorFilter());

  // 프론트 정적 자원 — 등록은 아래 app.listen() **이후**(=Nest 라우트 뒤)에 한다. 이유는 그쪽 주석 참고.
  const PUBLIC_DIR = path.join(__dirname, '..', 'public');
  // 레거시 app과 동일한 Express 설정 — Nest는 **자체 Express 인스턴스**라 src/index.js의 설정이 적용되지 않는다.
  //   trust proxy: nginx/Cloudflare 뒤에서 req.protocol/ip를 X-Forwarded-*로 판단.
  //   미설정 시 https 요청이 http로 보여 팀 초대 링크·OAuth redirect_uri·결제 리턴 URL이 http로 생성된다(실측).
  server.set('trust proxy', 1);
  // 라우팅 스위치 — Nest 소유 경로면 Nest로, 아니면 레거시 Express가 처리.
  //   Nest 라우트 등록(app.listen 내부 init)보다 먼저 걸리므로 폴백이 확실히 동작.
  //   ⚠️ 파싱은 Nest 경로에만 적용 — 레거시 경로는 레거시 자체 파서가 처리(이중파싱/limit 충돌 회피).
  const cookieMw = cookieParser();
  // 바디 상한도 레거시(src/index.js)와 동일하게 50mb — 10mb였을 때 제안서 저장 등 큰 data URL 요청이 413으로 깨졌다(실측).
  const jsonMw = express.json({ limit: '50mb' });
  server.use((req: any, res: any, next: any) => {
    const p = req.path || req.url || '';
    // 웹훅만 레거시로 직행한다 — **파싱하기 전에** 넘겨야 raw body 서명검증이 살아 있다.
    if (NEST_EXCLUDE.some((e) => p === e)) return legacyApp(req, res, next);
    // 나머지는 전부 Nest로. 쿠키 → JSON 파싱(가드가 req.cookies/req.body를 읽는다).
    //   두 파서 모두 이미 파싱된 요청은 건너뛰므로, 뒤에서 레거시로 흘러가도 이중 파싱되지 않는다.
    cookieMw(req, res, (e1: any) => (e1 ? next(e1) : jsonMw(req, res, next)));
  });

  // 폴백 3002는 dev 전용 값이었다 — Nest를 staging/prod로 확대하면서 그대로 두면 PORT 누락 시
  //   prod가 3002에 붙어 nginx(→3000)와 어긋난다. 반대로 일괄 3000으로 바꾸면 이번엔 dev가
  //   PORT 없을 때 prod 포트를 물어 충돌한다. 그래서 폴백을 환경별로 나눈다.
  //   실제 포트는 언제나 .env.<NODE_ENV>의 PORT가 결정하고, 이건 그게 비었을 때의 안전망일 뿐이다.
  const DEFAULT_PORT: Record<string, number> = { production: 3000, staging: 3001, development: 3002 };
  const port = Number(process.env.PORT) || DEFAULT_PORT[process.env.NODE_ENV || ''] || 3000;
  await app.listen(port);

  // ── Nest 라우트가 잡지 못한 요청의 흐름 ──
  //   listen() 시점에 Nest 라우터가 미들웨어로 등록되고, 매칭 실패 시 next()로 흘려보낸다.
  //   따라서 **listen 이후에** 붙이는 이 미들웨어들은 "Nest가 처리하지 않은 요청"만 받는다.
  //   순서(레거시 src/index.js와 동일한 의미): 페이지 컨트롤러 → 정적 → 레거시.
  //   ⚠️ 정적을 컨트롤러보다 먼저 두면 `/studio.html`이 그대로 서빙돼 클린 URL 301이 사라진다.
  app.useStaticAssets(PUBLIC_DIR, { index: false });
  app.useStaticAssets(path.join(process.cwd(), 'tmp', 'bgm'), { prefix: '/bgm' });
  // ffmpeg.wasm 자체 호스팅 — Worker는 동일 출처여야 로드된다.
  app.useStaticAssets(path.join(process.cwd(), 'node_modules/@ffmpeg/ffmpeg/dist/esm'), { prefix: '/vendor/ffmpeg' });
  app.useStaticAssets(path.join(process.cwd(), 'node_modules/@ffmpeg/util/dist/esm'), { prefix: '/vendor/ffmpeg-util' });
  app.useStaticAssets(path.join(process.cwd(), 'node_modules/@ffmpeg/core/dist/esm'), { prefix: '/vendor/ffmpeg-core' });

  // 최종 폴백 — 여기까지 온 요청은 Nest도 정적도 처리하지 못한 것. 레거시 Express가 마지막으로 받는다.
  //   ⚠️ API 경로가 여기 도달하면 Nest에 그 라우트가 없다는 뜻이므로 경고를 남긴다(조용한 회귀 방지).
  server.use((req: any, res: any, next: any) => {
    const p = req.path || req.url || '';
    if (p.startsWith('/api/')) {
      // eslint-disable-next-line no-console
      console.warn(`[NestJS] fallback→legacy: ${req.method} ${p} (Nest에 라우트 없음)`);
    }
    return legacyApp(req, res, next);
  });

  // eslint-disable-next-line no-console
  console.log(`[NestJS] strangler up on :${port} — Nest owns API[${NEST_PREFIXES.length}] + 페이지·정적, 미매칭만 → legacy Express`);

  // 레거시 백그라운드 초기화(레시피 로드·스케줄러·영상폴러)를 Nest 부팅 후 실행.
  if (typeof legacyApp.startBackground === 'function') legacyApp.startBackground();
}

bootstrap();
