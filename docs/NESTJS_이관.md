# NestJS 이관 (strangler) — 아키텍처 & 작업 규칙

> **왜**: 백엔드 코드를 Spring MVC 멘탈모델(@RestController/@Service/DI/가드)로 읽고 디버깅하기 위해 Express → NestJS로 **점진 이관**.
> **범위**: **dev(develop)만** NestJS로 부팅. staging/prod는 `node src/index.js` 그대로라 무영향.
> **현황(2026-08-09)**: 마운트된 API 라우트 **225/225 = 100%** Nest 소유. 레거시로 남긴 것은 결제 웹훅 3개 + 정적/페이지/백그라운드.

---

## 1. 구조

```
nest/                 TypeScript 소스 (rootDir)
  main.ts             NestFactory 부팅 + 라우팅 스위치 + 전역 설정
  app.module.ts       도메인 모듈 등록 (= Spring @ComponentScan 자리)
  common/             전역 예외 필터
  auth/               JwtAuthGuard · AdminGuard · auth 도메인
  <도메인>/            *.controller.ts · *.service.ts · *.module.ts
src/                  레거시 Express (도메인 로직·리포지토리·프로바이더)
dist/                 tsc 산출물 (outDir) — dev는 `node dist/main.js` 로 뜬다
```

- 빌드: `npm run build` (= `tsc -p tsconfig.json`)
- 실행: dev = `dist/main.js`, staging/prod = `src/index.js`
- `ecosystem.config.js`: `heyhoai-dev` 만 script=`dist/main.js`
- `deploy/deploy.sh`: `ENVN=dev` 일 때만 `npm run build` 단계 추가

### 레거시 앱을 감싸는 방식

`src/index.js`는 `app.listen`을 `require.main === module` 로 감싸고, 백그라운드 초기화(레시피 로드·스케줄러·영상 폴러)를 `startBackground()` 로 분리해 export 한다.
→ prod/staging은 그대로 단독 실행되고, dev에서는 `nest/main.ts` 가 그 앱을 **미들웨어로 마운트**한 뒤 `startBackground()` 를 직접 호출한다.

---

## 2. 라우팅 스위치 = 이관 원장

`nest/main.ts` 의 **`NEST_PREFIXES`** 배열에 나열된 접두사만 Nest가 처리하고, 나머지는 전부 레거시 Express로 폴백한다.

```ts
const ownedByNest = !excluded && NEST_PREFIXES.some((pre) => p === pre || p.startsWith(pre + '/'));
if (!ownedByNest) return legacyApp(req, res, next);
```

- 화이트리스트 방식인 이유: Nest가 매칭 실패 시 **자체 404**를 내버려 레거시로 안 내려갔기 때문.
- **`NEST_EXCLUDE`**: 접두사에 걸려도 레거시로 보낼 경로. **완전일치 비교**라 동적 경로(`:id`)에는 못 쓴다.
  현재 값 = 결제 웹훅 3개(`/api/billing/webhook`, `/api/billing/eximbay/status`, `/api/billing/portone/webhook`) — raw/text body 서명 검증이라 JSON 파싱되면 깨진다.
- Nest 경로에만 `cookie-parser` + `express.json` 을 태운다(레거시 경로는 레거시 자체 파서 사용 → 이중 파싱·limit 충돌 회피).

---

## 3. 포팅 방법 (도메인 1개씩)

1. 로직이 라우트/컨트롤러에 인라인이면 **먼저 `src/<도메인>/<도메인>.service.js`(또는 `.api.js`)로 추출** → 레거시 라우트는 얇게, Nest 서비스는 그걸 `require`. **로직을 두 벌로 만들지 않는다.**
2. `nest/<도메인>/` 에 controller/service/module 작성 → `app.module.ts` imports 등록
3. `NEST_PREFIXES` 에 경로 추가
4. 2서버 diff로 검증(아래 §6) → PR → develop 머지

| Spring | Nest |
|---|---|
| `@RestController` | `@Controller` |
| `@Service` | `@Injectable` |
| `@Autowired` | 생성자 주입 |
| `@PreAuthorize` / `hasRole('ADMIN')` | `@UseGuards(JwtAuthGuard)` / `AdminGuard` |
| `@ControllerAdvice` | `LegacyErrorFilter` (전역) |
| `application-{profile}.yml` | `.env.<env>` |

### 인증
- `nest/auth/jwt-auth.guard.ts` — 레거시 `extractToken`+`verifyToken` 재사용, `req.user = {id, role}`, 실패 401
- `nest/auth/admin.guard.ts` — 미인증 401 / 비관리자 403 (레거시 `requireAdmin` 과 동일 문구)

### 에러 형식
`nest/common/legacy-error.filter.ts` 가 레거시 `src/middleware/errorHandler.js` 에 위임 → `statusCode` 에러 / Zod 400 / 500 응답이 레거시와 동일한 `{success, error}` 형태로 나간다.
⚠️ 402처럼 **부가 `data`를 실어야 하는 에러**는 errorHandler가 버리므로, 컨트롤러에서 `toErrorBody(err)` 로 직접 `HttpException` 을 만든다(marketplace `use` 사례).

---

## 4. 함정 6가지 (전부 실제로 겪음)

| # | 함정 | 대응 |
|---|---|---|
| ① | **라우트 선언 순서** — `:id` 가 고정 경로를 잡아먹음 | `/context`·`/register`·`jobs` 같은 고정 경로를 `:id` 보다 **먼저** 선언. 모듈 `controllers` 배열도 구체 경로 컨트롤러를 먼저 |
| ② | **POST 기본 201** — 레거시 `res.json()` 은 200 | 포팅한 POST에 `@HttpCode(200)`. `@Res()` 위임 라우트에도 **똑같이 적용됨**(실측: `generate/bgm/upload` 201) |
| ③ | **접두사 충돌** — `app.use('/api', ...)` 로 마운트된 레거시 라우터와 같은 접두사를 Nest가 가져가면 미포팅 경로가 Nest 404 | 접두사 추가 전 `grep -oE "router\.(get\|post)\('[^']*'" <대상라우터>` 로 경로 충돌 확인. 실제 사고: `/api/characters/:id/contents` (PR#185 → #187에서 복구) |
| ④ | **`router.param()` 훅 소실** — Express 라우터 레벨 훅은 Nest에 없다 | 컨트롤러가 직접 호출. accounts의 계정 소유권 검증 `assertAccountOwned` 20곳 |
| ⑤ | **Nest는 자체 Express 인스턴스** — `src/index.js` 의 `app.set/use` 가 안 따라옴 | `nest/main.ts` 에도 반영. 현재 `trust proxy: 1`(미설정 시 `req.protocol`=http → 초대 링크·OAuth redirect_uri·결제 리턴 URL이 http), `express.json({limit:'50mb'})`(10mb였을 때 큰 data URL 요청 413) |
| ⑥ | **큰 도메인은 메서드로 못 나눔** — 스위치가 경로 접두사 기반 | **경로 서브트리 단위**로 분할. marketplace = `/templates/**` 먼저(PR#183) → 나머지 후 `/api/marketplace` 로 확장(PR#184) |

---

## 5. 두 가지 포팅 스타일

### (A) 서비스 추출형 — 기본
로직을 `src/` 서비스로 뽑고 레거시 라우트와 Nest 컨트롤러가 **같은 함수**를 호출.
적용: pricing · credits · billing · subscription · dashboard · brand-kit · teams · affiliate · recipes · studio · marketplace · characters/미디어 · template-data · trial · publishing · admin(data·proposal) · auth

### (B) `@Res()` 위임형 — 예외 (거의 해소됨)
아래가 얽혀 응답 형태·타이밍을 그대로 보존해야 하는 도메인은 **라우팅·가드만** Nest가 가져가고 핸들러는 레거시 함수를 그대로 호출한다.
- NDJSON **스트리밍**(admin refine)
- **202 응답 후 `setImmediate` 백그라운드 작업**(pack·accounts·generate)
- 크레딧 차감/환불 정산, 외부 API(Zernio·Gemini·Kling)
- 응답 봉투가 `{success,data}` 가 아님(`{...}` / `{error}`)

방법: 레거시 라우터 파일에서 인라인 핸들러를 **이름 있는 핸들러로 분리** → `module.exports.handlers` 로 노출 → Nest 컨트롤러가 `@Res()`로 호출. 멀티파트는 레거시와 **동일한 multer 설정**을 `FileInterceptor`/`FilesInterceptor`/`FileFieldsInterceptor` 에 넘긴다.
**2026-08-09 해소**: 응답 수집 어댑터(`asOps`)를 도입해 위임 **67 → 5**로 줄였다.
```js
// 레거시 라우터 파일 안
function asOps(handler) {          // Express 핸들러 → 데이터 반환 함수
  return async (req) => {
    let status = 200, body;
    const res = { status(c){status=c; return this;}, json(o){body=o; return this;} };
    let failed; await handler(req, res, (e) => { failed = e; });
    if (failed) throw failed;
    return { status, body };        // ← Nest가 이걸 받아 응답을 만든다
  };
}
```
핸들러 본문·미들웨어 순서·`setImmediate` 백그라운드 등록은 **그대로 두고** 응답 소유권만 Nest로 가져온다.
컨트롤러는 `send()` 헬퍼로 4xx/5xx는 `HttpException`(전역 필터), 202 같은 비200 성공만 passthrough로 상태 지정.

**남은 `@Res()` 5개는 전부 정당한 사유** — 되돌리지 말 것:
| 위치 | 왜 필요한가 |
|---|---|
| `auth` google · google/callback (2) | 302 **리다이렉트** |
| `admin` refine · refine/apply (2) | **NDJSON 스트리밍**(res.write) |
| `generate` ugc/voice-preview (1) | **mp3 바이너리** + Content-Type 헤더 |

⚠️ 실제로 `voice-preview`를 어댑터로 감쌌다가 parity가 잡아냈다(`res.setHeader`/`res.send`는 수집 불가). **응답을 직접 쓰는 핸들러는 감싸면 안 된다.**

> (B)는 최종 형태가 아니라 중간 단계다. 여유가 생기면 순수 데이터 핸들러부터 (A)로 옮긴다.
>
> **전환 방법(PR#196·#197에서 사용)**: 레거시 라우터 파일 안에 `reads` 객체를 만들어 **데이터만 반환**(404는 `statusCode` 에러 throw) → 레거시 라우트는 `sendRead` 얇은 어댑터로 기존 응답 유지 → Nest 컨트롤러는 `@Res()` 없이 반환값 방식. 헬퍼가 라우터 파일에 몰려 있어 파일을 쪼개지 않고 같은 모듈에 두는 게 안전하다.
> 진행: generate 조회 13 · accounts 조회 9 · pack `getPack` 1 전환 완료(잔여 위임 = generate 31 · accounts 23 · pack 10 · refine 2).

---

## 6. 검증 방법 — 2서버 diff (가장 강력)

```bash
createdb doppia_migtest && npm run migrate:dev        # 프레시 로컬 DB
# 임시 .env.development — 결제·외부 키는 빈값으로 덮어 prod 키 유출/실호출 방지
NODE_ENV=development node dist/main.js &              # Nest  :3002
NODE_ENV=development PORT=3003 node src/index.js &    # 레거시 :3003
diff <(curl -s :3002/api/... -H "$JWT") <(curl -s :3003/api/... -H "$JWT")
```
정상 응답뿐 아니라 **에러 응답·상태코드**까지 바이트 동일한지 본다. 변경 시퀀스는 양쪽에서 각각 돌려 비교.
검증 후 `.env.development` 삭제 + 서버 kill.

### 자동화 — `scripts/nest_parity_check.js`
위 diff를 케이스 목록으로 고정한 스크립트. 두 서버를 띄운 뒤:
```bash
node scripts/nest_parity_check.js --token <user JWT> --admin-token <admin JWT> --mutations --seed
# --only /api/generate  일부만 · --verbose  SKIP 사유 · 불일치 있으면 종료코드 1
```
조회·에러 경로·권한(401/403)을 상태코드 + 본문 **바이트** 비교. 비결정적 응답(`ugc/voice-preview` 생성 오디오)은 상태·Content-Type만 본다.
**도메인을 새로 포팅하거나 위임을 네이티브로 바꿀 때마다 `CASES`/`MUTATIONS`에 케이스를 추가할 것.**

#### 동적 값(계정 id·프롬프트 idx 등)을 다루는 3가지 장치
| 장치 | 설명 |
|---|---|
| **① 플레이스홀더 + 런타임 해석** | 경로에 `{accountId}`·`{templateId}`·`{resultIdx}` 처럼 쓰면 `RESOLVERS`가 목록 API로 실제 값을 찾아 치환. **두 서버가 같은 DB**를 보므로 같은 id를 양쪽에 던질 수 있다. 못 찾으면 FAIL이 아니라 **SKIP**. 계정 하위(media·post-queue)는 `scanAccounts`가 데이터가 실제로 있는 계정을 찾아 `{mediaAccountId}` 같은 파생 키까지 채운다 |
| **② 정규화 비교(`normalize`)** | 쓰기는 서버마다 **다른 행**이 생기므로(uuid·시각·`secondsLeft`·초대 code) 마스킹 후 비교. `--mutations` 케이스에 적용 |
| **③ 픽스처 seed/cleanup** | `--seed` 는 비어 있어 SKIP되는 것(팀·프롬프트·결과물)을 만든다. 팀은 API로, 프롬프트/결과물은 외부 생성 API가 필요해 리포지토리로 직접 삽입하고 **끝나면 되돌린다**. `--mutations` 케이스도 각자 만든 것을 `cleanup` 에서 지운다 |

실측: 시드 없이 **92 통과 / 5 SKIP**, `--mutations --seed` 로 **111 통과 / 0 SKIP**.

#### 흔한 실수 (스크립트가 미리 잡아준다)
- **토큰에 dotenv 배너가 섞임** — `node -e "…signToken…"` 은 `◇ injecting env …` 를 stdout에 같이 뱉는다.
  반드시 `2>/dev/null | tail -1` 로 마지막 줄만 취할 것. 안 그러면 `Authorization` 헤더 생성 단계에서 전 케이스가 터진다.
- **`<uuid>` 자리표시자를 그대로 사용** — 실제 유저 uuid를 넣어야 한다.
  `NODE_ENV=development node -e "require('./src/db/client').query('SELECT id,email,role FROM users LIMIT 5').then(r=>{console.table(r.rows);process.exit(0)})" 2>/dev/null`
- **비교용 레거시를 띄우자마자 실행** — 부팅에 10~15초 걸린다. 스크립트가 `/health` 로 최대 30초 대기한다.

#### EC2(dev)에서 돌릴 때
dev는 서버 3개·DB 3개 구성(§7 아래 표)이라, **dev DB를 보는 레거시 비교군**을 임시 포트로 하나 더 띄운다.
```bash
cd ~/HeyHoAI-dev
NODE_ENV=development PORT=3009 node src/index.js > /tmp/legacy-cmp.log 2>&1 &
TOKEN=$(NODE_ENV=development node -e "console.log(require('./src/auth/token').signToken({id:'<실제 uuid>',role:'user'}))" 2>/dev/null | tail -1)
node scripts/nest_parity_check.js --nest http://localhost:3002 --legacy http://localhost:3009 --token "$TOKEN"
kill %1
```
⚠️ EC2에서는 **`--mutations`·`--seed` 금지** — 실제 dev DB에 쓰기가 발생한다.

---

## 7. 실환경 구성 (EC2 1대 · 서버 3개 · DB 3개)

| 브랜치 | 환경 | PM2 앱 | 실행 | 포트 | DB | 클론 |
|---|---|---|---|---|---|---|
| `main` | prod | `heyhoai` | `src/index.js` (레거시) | 3000 | 현행 | `~/HeyHoAI` |
| `staging` | stg | `heyhoai-staging` | `src/index.js` (레거시) | 3001 | `doppia_staging` | `~/HeyHoAI-staging` |
| `develop` | dev | `heyhoai-dev` | **`dist/main.js` (NestJS)** | 3002 | `doppia_dev` | `~/HeyHoAI-dev` |

- **Nest로 도는 것은 dev 하나뿐** — staging/prod는 코드·DB 모두 무영향.
- 배포: `npm run deploy:dev` (= `git pull` → `npm ci` → **`npm run build`(tsc)** → `migrate` → `pm2 restart heyhoai-dev`)
- 부팅 확인: `grep -a "strangler" ~/.pm2/logs/heyhoai-dev-out.log | tail -3`
  또는 `curl -s -o /dev/null -w '%{http_code}' localhost:3002/api/pricing`(200=Nest) · `/health`(200=레거시 폴백)

## 8. 레거시에 남는 것 (설계상 정상)

- **결제 웹훅 3개** — raw/text body 서명 검증 (`NEST_EXCLUDE`)
- **정적·미디어** — `/images/:file`(로컬 우선 → R2 302, Range 지원), `/bgm`, `/vendor/ffmpeg*`, `public/`
- **페이지 라우트 22개** — `/`, `/login`, `/signup`, `/r/:code`, `/heyhoai/**`, `/admin-*` (HTML 서빙·`requirePage` 리다이렉트)
- **`/health`**
- **백그라운드** — 레시피 로드·스케줄러·영상 폴러 (`startBackground()`, Nest 부팅 후 호출)

## 9. DTO / VO 컨벤션

NestJS에 **DTO는 1급 개념**(공식 문서 권장)이지만 **VO는 프레임워크 개념이 아니다**(DDD 용어). 그래서 이 프로젝트는 둘을 이렇게 나눠 쓴다.

| | 무엇 | 위치 | 형태 | 표기 |
|---|---|---|---|---|
| **VO** | **DB 행 스냅샷** — repository/서비스가 다루는 내부 표현 | `nest/<도메인>/vo/*.vo.ts` | `interface` + `readonly` | **snake_case 유지** |
| **DTO** | **API 경계 객체** — 요청/응답 계약 | `nest/<도메인>/dto/*.dto.ts` | 응답=`interface`, 요청=`class` | camelCase(응답에 VO가 그대로 나가면 예외) |

- **왜 VO는 snake_case인가**: 응답 JSON에 DB 컬럼명이 그대로 나가고 **프론트가 그 이름을 읽는다**(`logo_url`·`price_credits`·`my_role`). 이름을 바꾸면 프론트가 깨진다. VO는 "지금 실제로 나가는 모양"을 고정하는 안전장치다.
- **왜 요청 DTO만 class인가**: TS `interface`는 컴파일 후 사라져 런타임 메타데이터가 없다. 나중에 `class-validator` 데코레이터(`@IsUUID()` 등)와 `ValidationPipe`를 붙이려면 class여야 한다. 지금은 **타입 전용**(런타임 동작 변화 0).
- 공통 계약: `nest/common/dto/api-response.dto.ts` — `ApiResponse<T>`(`{success,data}`) · `ApiOk` · `ApiError` · `ApiPaginated<T>` · `ApiWithTotal<T>` · `ApiWithHasMore<T>`. 공용 VO는 `nest/common/vo/`(예: `LedgerEntryVo`).

**Spring 대응**: `ApiResponse<T>`=공통 응답 래퍼 · 요청 DTO=`@Valid @RequestBody` 대상 · VO=JPA 엔티티 자리(단 우리는 ORM 없이 raw row).

**적용 현황: 전 도메인 완료** — 타입 파일 33개 / 1,504줄. **모든 컨트롤러의 네이티브 라우트에 반환 타입이 붙어 있다**(미부착 0, 스크립트로 확인).
`common`(응답봉투·원장) · `subscription` · `dashboard` · `credits` · `brand-kit` · `teams` · `marketplace`(VO9/DTO20) · `publishing` · `characters` · `media` · `studio` · `accounts` · `admin` · `trial` · `template-data` · `recipes` · `affiliate` · `auth` · `billing` · `generate`(조회) · `pricing` · `health`

> `@Res()` 위임 라우트(generate 31 · accounts 23 · pack 10 · refine 3)는 응답을 핸들러가 직접 쓰므로 반환 타입이 없다 — 네이티브로 전환할 때 함께 붙인다.
효과 실측 — 타입을 붙이자마자 `teams` 이체에서 `parseInt(number)` 타입 오류가 컴파일에서 잡혔다(런타임은 정상이었지만 계약이 모호했던 지점).

**타입이 잡아낸 실제 오류 2건**(둘 다 런타임은 정상이었지만 계약이 틀렸던 곳):
1. `teams` 이체 — `parseInt(number)` : JSON 바디가 숫자/문자 둘 다 가능한데 코드가 암묵적으로 넘기고 있었다 → DTO를 `number | string`으로 정확히 표현.
2. `billing/packs` — 응답을 `{success, ...packs}`로 **잘못 가정**하고 타입을 썼더니 컴파일 실패. 실제는 `{success, data:{packs, configured}}` 표준 봉투였다 → 추측이 즉시 걸러진 사례.

**응답 봉투 예외도 타입으로 고정한다**: 표준은 `ApiResponse<T>`지만 실제로는 최상위 필드가 더 붙는 곳이 있다 —
`ApiWithCharged<T>`(marketplace use/acquire의 `charged`) · `ApiPaginated<T>`(characters·contents) · `ApiWithTotal<T>`(accounts media) · `ApiWithHasMore<T>`(admin creations) · pack은 봉투 없이 객체 그대로.
새 도메인에 타입을 붙일 땐 **먼저 실제 응답을 확인**하고 맞는 봉투 타입을 고를 것(추측 금지).

## 10. 레거시 완전 제거 로드맵 (진행 중)

**목표**: dev에서 `src/` 레거시 없이 Nest만으로 동작.

### 규모 (실측)
```
src/ 전체        182파일 · 48,783줄
  ├ recipes/     17,998줄  ← 시드 데이터(코드 아님)
  ├ models/       7,451줄  ← 로스터 데이터(자동생성)
  └ 실제 코드    ~23,300줄
       ├ *.route.js      5,604줄  ← 진짜 "레거시 Express"
       ├ *.service.js    7,872줄
       ├ *.repository.js 1,928줄 (20개)
       └ 프로바이더·엔진 등
```

### 단계
| 단계 | 내용 | 상태 |
|---|---|---|
| ① 라우트 이관 | 225 라우트 → Nest | ✅ |
| ② 응답 소유권 회수 | `@Res()` 위임 67 → 5 | ✅ |
| ③ DTO/VO 계약 | 33파일 · 1,504줄 | ✅ |
| ④ **리포지토리·서비스 이식** | `nest/<도메인>/*.repository.ts` + `*.service.ts` | ✅ 이식 대상 0 |

**④ 진행 현황** — `scripts/nest_port_progress.js` 로 **자동 측정**한다(사람이 세지 않는다):

```
node scripts/nest_port_progress.js          # 요약
node scripts/nest_port_progress.js --list   # 남은 항목 파일별로
```

`nest/`의 모든 `require(src/...)`를 세 갈래로 분류해, **①이 0이 되면 ⑤단계(레거시 제거) 가능**이다.

| 갈래 | 뜻 | 목표 |
|---|---|---|
| ① 이식 대상 | 도메인 로직·SQL 리포지토리 | **0** |
| ② 단일소스 | 가격표·환경설정·시드 — 복제하면 값이 갈린다 | 유지 |
| ③ 엔진/외부 | PG·Gemini·Kling·팩 파이프라인 | 유지 |

현재: **① 0건** — ④단계 완료. `nest/`가 참조하는 `src/`는 전부 **의도적으로 남긴** 단일소스(16) + 엔진/외부(18)뿐이다.
도메인 22개 중 7개(`brandkit·dashboard·health·studio·teams·template-data·trial`)는 그 둘조차 없다.

**⚠️ 이식하면 안 되는 것 — 단일소스 유지**
| 대상 | 왜 |
|---|---|
| **크레딧 가격표**(`IMG_CREDIT`·`VIDEO_CREDIT`·`COSTS`) | 값을 복제하면 한쪽만 바뀌었을 때 **청구액이 갈린다**(매출 사고). `docs/생성원가_마진_분석_*.md` 근거로 산정된 표라 코드가 아니라 **설정**이다 |
| **레시피 시드**(`src/recipes/`, 17,998줄) · **로스터**(`src/models/`, 7,451줄) | 데이터. `nest/`에서 import만 하면 된다 |
| **생성 엔진**(Gemini·Kling·UGC·pack 컴포지터) | 외부 API 호출 덩어리 — TS 재작성 이득 < 리스크. 로컬에서 성공 경로 검증도 불가 |

**공용 인프라 이식 완료**(여러 도메인의 의존을 한 번에 없애는 것부터):
| 이식본 | 대체한 것 | 쓰는 곳 |
|---|---|---|
| `nest/db/db.service.ts` (전역 `DbModule`) | `src/db/client.js` | 모든 리포지토리 |
| `nest/common/security/ownership.service.ts` (전역 `SecurityModule`) | `src/middleware/ownership.js` | 소유권 검증 7종 |
| `nest/common/security/token.service.ts` | `src/auth/token.js` + `extractToken` | `JwtAuthGuard`·`AdminGuard` |
| `nest/common/security/cookie.service.ts` | `src/auth/cookie.js` | 로그인·소셜로그인·로그아웃 |
| `nest/common/legacy-error.filter.ts` (자체 구현) | `src/middleware/errorHandler.js` | 전역 예외 |
| `nest/credits/wallet.module.ts` (전역 `WalletModule`) | — | 개인 크레딧 + 팀 풀 |
| `nest/teams/team-credit.repository.ts`·`team-credit.service.ts` | `src/teams/team.credit.js` | 컨텍스트 인지 과금(개인/팀) |
| `nest/media/media.repository.ts` | `imageAsset`·`videoAsset`·`generationJob`·`videoGenerationJob`·`visualAttribute` 리포지토리 5종 | 미디어 전체 |
| `nest/auth/{user.repository,password.service}.ts` | `src/auth/{user.repository,password,auth.service,auth.api}.js` | 가입·로그인·프로필 |
| `nest/trial/trial.repository.ts` | `src/trial/trial.service.js` | 체험 계정 |
| `nest/publishing/publishing.repository.ts` | `content`·`publishJob` 리포지토리 + 두 서비스 + `publishing.api` | 콘텐츠·발행 |
| `nest/admin/{admin,proposal}.repository.ts` | `admin/{adminData,proposal}.service.js` | 관리자 통계·제안서 |
| `nest/marketplace/marketplace.repository.ts` + 서비스 재작성 | `marketplace/marketplace.service.js`(851줄) | 템플릿 판매·로열티·라이브러리 |
| `nest/accounts/accounts.repository.ts` + 서비스 재작성 | `publishing/account.route.js`의 CRUD 전부 + 리포지토리 5종 | 소셜 계정 워크플로 |
| `DbService.ensureSchema()` | `src/db/ensureSchema.js` | 지연 테이블 생성 |

⚠️ `TokenService.sign`의 payload는 `{sub, role}`, `verify` 결과는 `{id, role}` — **레거시와 동일해야 기존 토큰이 안 깨진다**.
⚠️ `DbService`는 커넥션 풀을 새로 만들지 않고 `src/db/client.js` 풀을 재사용한다(풀 이중 생성 = 커넥션 2배).
⚠️ **여러 도메인이 쓰는 프로바이더는 전역 모듈로** 둔다. 모듈마다 `providers`에 복사하면 하나 빠뜨렸을 때
   컴파일은 통과하고 **부팅 시점 DI 에러**로만 드러난다(`WalletModule` 만들기 전 실제로 겪음).
⚠️ 크레딧은 `CreditsService`(개인) ↔ `TeamCreditService`(팀)가 서로를 필요로 한다 —
   **서비스끼리 주입하면 순환**이므로 `CreditsService`는 `TeamCreditRepository`(리포지토리)를 주입받는다.
| ⑤ `src/` 라우터 제거 + stg/prd 전환 | | ⬜ |

### ④ 방법 (characters가 본보기)
1. **`nest/db/db.service.ts`** — `@Injectable` DB 프로바이더(전역 `DbModule`). 커넥션 풀은 `src/db/client.js` 단일소스를 그대로 재사용(풀을 두 개 만들면 커넥션이 두 배).
2. **`nest/<도메인>/<X>.repository.ts`** — `@Injectable`, `DbService` 주입, SQL은 여기 밖으로 안 샌다. 반환 타입은 이미 만들어둔 VO.
3. **`nest/<도메인>/<X>.service.ts`** — `@Injectable`, 리포지토리 주입. 아직 이식 안 한 엔진/공용 모듈만 `require`로 남기고 **주석으로 이식 대상 표시**.
4. 도메인 모듈에 `providers: [Service, Repository]` 등록.
5. **부팅 확인** — `npm run build && PORT=3999 node dist/main.js`. DI 오류는 **컴파일이 아니라 부팅**에서 난다.
6. **parity로 검증** — `src/`는 기준선이므로 ⑤ 전까지 지우지 않는다.

⚠️ `AppModule` imports 순서: `MediaModule`(`:characterId/**`)이 `CharactersModule`(`:id`)보다 **먼저**. 안 그러면 `:id`가 하위 경로를 잡아챈다.

## 10-b. 프론트 서빙 이관 (2026-08-11, PR#218)

페이지·정적 서빙까지 Nest가 소유한다. **요청 파이프라인이 바뀌었으니 이 절을 먼저 읽을 것.**

### 파이프라인 (main.ts)
```
요청
 ├ 웹훅 3개  → 레거시 직행 (파싱 전에 넘겨야 raw body 서명검증이 산다)
 └ 그 외
    ├ cookie-parser + express.json(50mb)
    ├ Nest 라우트  (API 컨트롤러 → PagesController → AssetsController)
    ├ 정적         (public · /bgm · /vendor/ffmpeg*)     ← app.listen() **이후** 등록
    └ 레거시 폴백  (여기 오면 Nest에 라우트가 없다는 뜻 — /api/* 는 경고 로그)
```

⚠️ **`adapter.setNotFoundHandler`를 no-op으로 만든다.** Nest는 init 때 catch-all 404 미들웨어를 붙이는데,
그게 있으면 **뒤에 등록한 정적·폴백이 영원히 실행되지 않는다**(실측: 모든 정적 파일이 404).

⚠️ **정적은 반드시 페이지 컨트롤러 뒤.** 앞에 두면 `/studio.html`이 그대로 서빙돼 클린 URL 301이 사라진다.

⚠️ **`PagesModule`은 AppModule imports의 맨 마지막.** 클린 URL `:name`이 단일 세그먼트를 전부 잡는다.

### 구성
| 파일 | 역할 |
|---|---|
| `nest/pages/pages.controller.ts` | `/` · `/login` · `/signup` · `/store` · `/r/:code` · `/health` · `/heyhoai/**`(11) · `/admin-*`(6) · 클린 URL `:name` |
| `nest/pages/assets.controller.ts` | `/images/:file` — 로컬 우선 → R2(공개 302 / 비공개 프록시 스트리밍, Range 전달) |
| `nest/pages/page-auth.guard.ts` | `PageGuard`(→ `/login?next=`) · `AdminPageGuard`(→ 403 화면) |
| `nest/pages/page-exception.filter.ts` | 위 예외를 화면 응답으로. **가드가 res를 직접 쓰면 "headers already sent"** |

페이지 컨트롤러의 `@Res()`는 정상이다 — 파일 전송·리다이렉트가 목적이라 응답 객체가 필요하다.

### ⚠️ 의도적 동작 변경 — 관리자 페이지 게이트가 이제 **실제로 걸린다**
레거시는 클린 URL 라우트(`/^\/([a-z0-9-]+)$/`, index.js:101)가 `/admin-stats` 같은 경로를 **먼저** 잡아
아래 `requireAdminPage`(index.js:199~)가 **한 번도 실행되지 않았다**. 비로그인도 관리자 페이지 셸이 200으로 서빙됐다
(데이터는 API가 AdminGuard로 막고 있어 유출은 아니었다). Nest는 선언 순서상 가드가 먼저라 302 `/login` 또는 403이 나간다.
= 레거시 코드의 **원래 의도대로** 동작.

## 11. 남은 과제

1. dev에서 충분히 검증 후 staging/prod도 `dist/main.js` 로 전환(ecosystem·deploy.sh)
2. 위임형(B) 4개 도메인을 순수 데이터 핸들러부터 서비스 추출형(A)으로 전환
3. DTO + class-validator 도입(현재는 레거시 zod 스키마 재사용)

## 부록 — 이관 PR 목록

`#173` 파일럿 · `#174` pricing · `#175` credits · `#176` billing · `#177` subscription · `#178` dashboard · `#179` brand-kit · `#180` teams+전역 에러 필터 · `#181` affiliate·recipes · `#182` studio · `#183`·`#184` marketplace · `#185` characters+미디어 · `#186` template-data·trial+AdminGuard · `#187` publishing(회귀 수정) · `#188` admin data·proposal · `#189` auth · `#190` admin refine · `#191` pack · `#192` accounts · `#193` generate+상태코드 보정 · `#194` Express 설정 정합(trust proxy·50mb) · `#195`~`#208` DTO/VO 도입 · `#209` 공용 보안(ownership·token) · `#211` teams · `#212` credits · `#213` subscription·팀크레딧·쿠키·에러필터 + 진행률 측정 스크립트 · `#214` media·auth·trial 네이티브화 · `#215` publishing·admin 네이티브화 · `#216` marketplace 네이티브화 · `#217` accounts 네이티브화(④단계 완료) · `#218` 프론트(페이지·정적) 서빙 이관
