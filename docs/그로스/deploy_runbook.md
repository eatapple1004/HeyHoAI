# Doppia(HeyHoAI) 배포 런북 — doppia.ai

> 대상: `src/index.js` (Express 5/Node 20) + Postgres(pg) + ffmpeg.wasm 자가호스팅 + 업로드 스케줄러.
> 원칙: 이 문서는 **파일/설정 가이드**다. 실제 도메인 구매·DNS 변경·실배포는 **사용자 승인 후** 진행한다.
> 가격 숫자는 모두 **추정(estimated) placeholder** — 실제 COGS 확정 전이며 본 런북에서 새 숫자를 만들지 않는다.

관련 산출물 파일(절대경로):
- `/Users/jeon-yedam/HeyHoAI/Dockerfile`
- `/Users/jeon-yedam/HeyHoAI/.dockerignore`
- `/Users/jeon-yedam/HeyHoAI/render.yaml`
- 환경변수 단일 진실원본(SoT): `/Users/jeon-yedam/HeyHoAI/src/config/index.js`

---

## 1. 호스팅 선택 근거 (Render 기본 + Fly.io 대안)

**기본: Render.** 본 앱은 정적 사이트가 아니라 상시 구동 Express 서버(헬스체크 `/health`, 스케줄러 상주, pg 연결)다. Render는 Blueprint(`render.yaml`)로 Web Service(Docker) + Managed Postgres를 한 파일에 선언하고, `DATABASE_URL`을 DB 리소스에서 자동 주입(`fromDatabase`)하며, 헬스체크 경로·커스텀 도메인·자동 TLS를 GUI로 제공한다. 단일 인스턴스 상주 + 매니지드 DB라는 본 앱 형태에 운영 부담이 가장 낮다.

**대안: Fly.io.** 리전 분산·머신 단위 제어·더 저렴한 상시 구동이 필요해지면 Fly가 유리하다. 동일 `Dockerfile`을 재사용하고 `fly.toml`(internal_port=3000, `[[services.http_checks]] path="/health"`)로 전환하면 된다. 단, Postgres는 Fly Managed Postgres(또는 외부 매니지드)로 별도 구성해야 하고 스케줄러 중복 실행 방지를 위해 인스턴스를 1대로 고정해야 한다. 초기에는 Render로 가고, 비용/리전 요구가 커지면 Fly로 이전한다.

---

## 2. 환경변수 매핑표 (SoT = `src/config/index.js`)

> 주의: `.env.example` 과 `src/config/index.js` 사이에 **키 이름 드리프트**가 있다. 코드(zod 스키마)가 실제로 읽는 키가 진실이다. 아래 표는 코드 기준이며 드리프트는 비고에 명시.

| 키 | 필수 | 기본값(코드) | Render 설정 | 비고 |
|---|---|---|---|---|
| `PORT` | 코어 | 3000 | value `3000` | 플랫폼이 PORT 주입 시 그 값 우선 |
| `NODE_ENV` | 코어 | development | value `production` | |
| `DATABASE_URL` | 필수 | — | fromDatabase(doppia-db) | pg `ssl.rejectUnauthorized:false` 사용 중 |
| `JWT_SECRET` | 필수 | — | sync:false | 16자 이상 랜덤 |
| `JWT_EXPIRES_IN` | 코어 | 7d | value `7d` | |
| `COOKIE_SECURE` | 코어 | false | value `true` | 프로덕션 HTTPS 필수 |
| `ADMIN_EMAIL` | 코어 | admin@heyhoai.local | sync:false | 마이그레이션 시드 관리자 |
| `ADMIN_PASSWORD` | 코어 | changeme1234 | sync:false | 반드시 교체 |
| `ANTHROPIC_API_KEY` | 필수 | — | sync:false | 없으면 부팅 실패(zod min1) |
| `CLAUDE_MODEL` | 코어 | claude-sonnet-4-20250514 | value | |
| `STRIPE_SECRET_KEY` | 결제 | — | sync:false | **코드 미참조** — 결제 모듈 도입 전 placeholder. 가격 숫자 하드코딩 금지 |
| `STRIPE_PUBLISHABLE_KEY` | 결제 | — | sync:false | 〃 |
| `STRIPE_WEBHOOK_SECRET` | 결제 | — | sync:false | 〃 |
| `REPLICATE_API_TOKEN` | 이미지(택1) | — | sync:false | |
| `REPLICATE_MODEL` | 이미지 | black-forest-labs/flux-1.1-pro | value | |
| `FAL_API_KEY` | 이미지(택1) | — | sync:false | |
| `FAL_MODEL` | 이미지 | fal-ai/flux/dev | value | |
| `GEMINI_API_KEY` | 이미지(택1) | — | sync:false | **.env.example엔 없음** — 코드엔 존재 |
| `GEMINI_IMAGE_MODEL` | 이미지 | gemini-2.5-flash-image | value | 〃 |
| `OPENAI_API_KEY` | 이미지(택1) | — | sync:false | GPT Image |
| `RUNWAY_API_KEY` | 비디오(택1) | — | sync:false | |
| `RUNWAY_MODEL` | 비디오 | gen4_turbo | value | |
| `KLING_ACCESS_KEY` | 비디오(택1) | — | sync:false | **.env.example엔 `KLING_API_KEY`로 오기** — 코드는 ACCESS/SECRET 분리 |
| `KLING_SECRET_KEY` | 비디오(택1) | — | sync:false | 〃 |
| `KLING_MODEL` | 비디오 | kling-v3 | value | .env.example엔 `kling-v2`로 드리프트 |
| `MINIMAX_API_KEY` | 비디오(택1) | — | sync:false | |
| `MINIMAX_MODEL` | 비디오 | video-01 | value | |
| `ZERNIO_API_KEY` | 퍼블리싱 | — | sync:false | Instagram 발행 |

- [ ] **배포 전 정합 작업(승인 후):** `.env.example`을 코드 SoT에 맞춰 갱신 — `KLING_API_KEY` → `KLING_ACCESS_KEY`/`KLING_SECRET_KEY`, `GEMINI_API_KEY`/`GEMINI_IMAGE_MODEL` 추가, `KLING_MODEL` `kling-v2`→`kling-v3`.
- [ ] 이미지 프로바이더 최소 1개, 비디오 프로바이더 최소 1개 키가 채워졌는지 확인.

---

## 3. 빌드 / 스타트

- 컨테이너 빌드: `Dockerfile` → `npm ci --omit=dev` (devDependencies 없음, `@ffmpeg/*`는 dependencies라 유지).
- 스타트: `CMD ["node","src/index.js"]` (= `npm start`). `process.cwd()` = `/app` 이라 `tmp/*` 및 `node_modules/@ffmpeg/*` 정적 경로가 정확히 해석됨.

- [ ] `npm ci`가 lockfile과 정합한지 확인(package-lock.json 동봉됨).
- [ ] **prune 금지 확인:** `@ffmpeg/core`·`@ffmpeg/util`·`@ffmpeg/ffmpeg` 의 `dist/esm`이 이미지 내 `node_modules`에 존재해야 함(아래 §6 동일출처 참고).
- [ ] (대안) Docker 미사용 시: `npm ci --omit=dev` → `npm start`.

---

## 4. 헬스체크

- 경로: `GET /health` → `{ status: "ok", timestamp }` (게이팅 없음, 공개).
- Render: `healthCheckPath: /health` (render.yaml 반영됨).

- [ ] 첫 배포 후 `/health`가 200으로 응답하는지 확인.

---

## 5. DB 마이그레이션 (순서 중요)

`npm run migrate` = `node src/db/migrate.js` (pg, `CREATE TABLE IF NOT EXISTS …` 멱등). 시드 관리자(`ADMIN_EMAIL`/`ADMIN_PASSWORD`) 생성 포함.

권장 순서:
- [ ] 1) Managed Postgres(doppia-db) 프로비저닝 완료 → `DATABASE_URL` 주입 확인.
- [ ] 2) `JWT_SECRET`/`ADMIN_*`/`ANTHROPIC_API_KEY` 등 필수 env 주입(없으면 부팅 자체가 zod에서 실패).
- [ ] 3) 마이그레이션 실행 `npm run migrate` (Render: Shell 또는 일회성 Job).
- [ ] 4) 그 다음 웹 서비스 기동 → `/health` 확인.
- [ ] 멱등성 확인: 재실행해도 안전(IF NOT EXISTS). 단 시드 관리자 비밀번호는 운영용으로 교체.

---

## 6. 정적자산 · /vendor/ffmpeg 동일출처 주의

`src/index.js`가 다음을 같은 오리진에서 서빙한다(ffmpeg.wasm Worker는 same-origin 필수):
- `/vendor/ffmpeg` → `node_modules/@ffmpeg/ffmpeg/dist/esm`
- `/vendor/ffmpeg-util` → `node_modules/@ffmpeg/util/dist/esm`
- `/vendor/ffmpeg-core` → `node_modules/@ffmpeg/core/dist/esm`
- `/images` → `tmp/images`, `/bgm` → `tmp/bgm`, `public/*` 정적.

- [ ] CDN/리버스프록시를 ffmpeg vendor 경로 앞에 두지 말 것(별도 오리진이 되면 Worker가 깨짐). 동일 도메인에서 서빙.
- [ ] `node_modules`를 빌드 후 제거/prune하지 말 것(위 dist 파일이 사라지면 릴스 생성 실패).
- [ ] `tmp/images`·`tmp/bgm` 디렉터리 존재 확인(Dockerfile에서 `mkdir -p`로 생성). 컨테이너 파일시스템은 휘발성이므로 산출물 영구 보관이 필요하면 별도 스토리지 검토(향후 과제).

---

## 7. /api/pricing 공개 라우트 노출 확인

- [ ] **현재 `src/index.js`에 `/api/pricing` 라우트가 없음**(공개 가격 페이지는 `public/js/pricing.js` 정적값을 사용). 가격을 서버에서 단일 공급하려면 공개(게이팅 없는) `GET /api/pricing` 추가가 선행 과제 — 본 배포 작업 범위 밖이며 별도 승인 필요.
- [ ] 만약 추가한다면: `requireAuth` **앞**에 마운트해 공개로 노출하고, 응답 숫자는 `public/js/pricing.js`의 추정 placeholder와 동일하게 유지(새 숫자 발명 금지).

---

## 8. 로깅

- 앱 로거: `src/lib/logger.js` (stdout). 플랫폼 로그 수집기(Render Logs)로 자동 집계.
- `NODE_ENV=production`에서는 쿼리 디버그 로그 비활성(클라이언트가 development에서만 debug 출력).

- [ ] 배포 직후 로그에서 `Running on port 3000` + 스케줄러 시작 메시지 확인.
- [ ] 시크릿이 로그에 찍히지 않는지 점검(키 값 평문 출력 없음).

---

## 9. 롤백

- [ ] Render: 대시보드 → Deploys → 직전 정상 배포로 **Rollback**(이미지/커밋 단위).
- [ ] DB 스키마는 멱등(IF NOT EXISTS)이라 코드 롤백만으로 대체로 안전. 단, 마이그레이션이 파괴적 변경을 도입한 배포라면 코드 롤백 전 데이터 영향 확인.
- [ ] 롤백 후 `/health`·`/api/pricing`(존재 시) 스모크 재확인.

---

## 10. 무중단 / 스케줄러 (중복 실행 주의)

`src/index.js`의 `app.listen` 콜백에서 `startScheduler()`가 호출된다. **인스턴스마다 스케줄러가 각각 돌기 때문에** 다중 인스턴스/롤링 배포 시 자동 업로드가 중복 발사될 수 있다.

- [ ] **인스턴스 1대 고정**(render.yaml/Fly 모두 단일 인스턴스 권장)으로 중복 발행 방지.
- [ ] 무중단(롤링) 배포로 신·구 인스턴스가 잠깐 공존하면 그 윈도우에 스케줄러가 겹칠 수 있음 → 발행 잡에 멱등 가드(이미 publish된 항목 skip)가 있는지 확인하거나, 배포 시 스케줄러 영향 적은 시간대 선택.
- [ ] (향후) 스케줄러를 웹 프로세스에서 분리(별도 worker/cron)하는 리팩터 검토.

---

## 11. 배포 전후 스모크 테스트

- [ ] `curl -fsS https://doppia.ai/health` → `{"status":"ok",...}` 200.
- [ ] `curl -fsS https://doppia.ai/api/pricing` → 200 + 가격 JSON (라우트 추가 후에만 유효; 미추가면 본 항목 N/A로 기록).
- [ ] `curl -I https://doppia.ai/vendor/ffmpeg-core/` 류로 vendor 정적 자산이 동일 오리진에서 200으로 내려오는지 확인.
- [ ] `/login` 공개 페이지 200, 보호 페이지(`/heyhoai/*`)는 미인증 시 `/login` 리다이렉트 확인.
- [ ] 로그인 → 이미지/릴스 생성 1건 e2e 스모크(프로바이더 키 정상 동작 확인).

---

## 12. 도메인 / DNS / TLS (doppia.ai) — 외부 의존, 사용자 승인 후

> 아래는 실제 등록기관/DNS 변경·실배포를 수반하므로 **승인 전까지 실행 금지**.

- [ ] 도메인 `doppia.ai` 소유/구매 확인 (외부 등록기관, 사용자 승인 필요).
- [ ] 호스팅(Render) 서비스 생성 및 커스텀 도메인 추가 (실배포, 사용자 승인 필요).
- [ ] DNS 레코드 설정 (사용자 승인 필요):
  - apex `doppia.ai` → 플랫폼 지정 ALIAS/ANAME 또는 A 레코드(Render가 제공하는 값).
  - `www.doppia.ai` → CNAME → 플랫폼 호스트명.
- [ ] TLS 인증서 자동 발급(Let's Encrypt) 활성화 및 HTTPS 강제 리다이렉트 확인.
- [ ] `COOKIE_SECURE=true` 전제 하에 HTTPS에서 로그인 쿠키 정상 동작 확인.
- [ ] DNS 전파 후 §11 스모크 테스트 재실행.

---

### 부록 — 빠른 체크 순서 요약
1. DB 프로비저닝 → 2. 필수 env 주입 → 3. `npm run migrate` → 4. 웹 기동 → 5. `/health` → 6. 도메인/TLS(승인 후) → 7. 스모크.
