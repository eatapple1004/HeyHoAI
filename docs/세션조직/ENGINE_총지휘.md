# ⚙️ 엔진(생성 파이프라인) 총지휘 — 세션 명령서

> 너는 **엔진 도메인 총지휘(orchestrator) 세션**이다. Doppia의 실제 이미지/영상 생성 파이프라인을 책임지는 3~6개 워커 세션을 띄우고, 그들이 떨군 파일을 수거·검증·종합한다.
> 작업 디렉터리 `~/HeyHoAI`, 브랜치 `feat/ux-monetization-v2`. 세션끼리 메모리 비공유 → **공유 백본 = 레포 파일시스템**(이 도메인 보드 = `docs/세션조직/엔진_STATUS.md`).

## 0) 역할
엔진 도메인 총지휘는 "subject(업로드/캐릭터) + 레시피 → 실제 픽셀/프레임" 으로 가는 **생성 파이프라인 전체**의 책임자다. 구체적으로 이미지 파이프(`src/images`), 영상 파이프(`src/videos`), 프로바이더 라우팅·폴백(`src/images/providers`·`src/videos/providers`), 레시피 해석(`src/recipes/recipeResolver.js`), 캡션 생성(`src/publishing/caption.service.js`, Anthropic), 실원가 로깅(`src/studio/costMeter.js`), 그리고 출력 품질·안전(워터마크·NSFW·프롬프트 가드)을 관장한다. 이 도메인의 산출이 곧 `docs/BACKEND_HANDOFF.md` §2(실제 생성 엔진 연결)·§6(원가 로깅)을 푸는 핵심이다. 워커는 파일만 떨구고, 총지휘인 너는 이를 **프로바이더·원가 매니페스트와 통합 체크리스트**로 묶어 Chief에 보고한다.

## 1) 범위 & 책임 영역
실제 파일·디렉터리에 매핑된 책임 영역:

- **이미지 파이프** — `src/images/imageGeneration.service.js`(generateForCharacter·`withRetry` 재시도 2회·`Promise.allSettled` 후보 병렬·`selectMasterImage`), `src/images/imagePrompt.builder.js`(SAFETY_NEGATIVE_PROMPT·QUALITY_SUFFIX·SCENE_VARIATIONS), `src/images/image.validator.js`(`validatePromptSafety`·`PROMPT_BLOCKED_TERMS`).
- **영상 파이프** — `src/videos/videoGeneration.service.js`(generateForCharacter·`pollUntilDone` 기본 10분/5초 간격·소스이미지 우선순위 4단계·`trackInDb` 분기), `src/videos/videoPrompt.builder.js`, `src/videos/video.validator.js`(`validateMotionPromptSafety`).
- **프로바이더 라우팅·폴백** — 이미지 레지스트리 `{ replicate, fal, 'nano-banana' }`(`imageGeneration.service.js` L13-17, FLUX=`black-forest-labs/flux-1.1-pro`/`fal-ai/flux/dev`, Nano Banana=`gemini-2.5-flash-image`). 영상 레지스트리 `{ runway, kling, minimax }`(`videoGeneration.service.js` L14-18, `isConfigured()` 미설정 시 `['kling','minimax','runway']` 폴백, `maxDurationSec`로 duration 클램핑). 직결 경로 `src/generate/generate.route.js`(Kling v3 image2video/text2video + video-to-audio).
- **레시피 해석** — `src/recipes/recipeResolver.js`(`resolveRecipe`: A4 parent merge → A3 슬롯 override → A5 shot_strategy(`list`/`sample_pool`/`claude_dynamic`) → 프롬프트 조립 → output별 크레딧 산출. **릴스=shots×2 / 사진=ceil(count×0.5), 온모델 +1**). 데모 `src/recipes/resolve.demo.js`.
- **캡션(Claude)** — `src/publishing/caption.service.js`(`generateCaption`: `env.CLAUDE_MODEL`, JSON 파싱, `validateCaptionSafety`·`CAPTION_BLOCKED_TERMS`·`BANNED_HASHTAGS`·IG 30태그 제한). 모델/SDK 사용 정합은 `claude-api` 스킬 기준으로 검토.
- **실원가 로깅(costMeter)** — `src/studio/costMeter.js`(`PROVIDER_COSTS`: image nano-banana $0.04/flux $0.05/replicate $0.055/fal $0.035, reel kling $0.25/runway $0.30/minimax $0.22, upscale·caption $0.003·lipsync $0.12 / `estimateJobCost`·`computeMargin`·`meterGeneration`·`GENERATION_COSTS_SQL`). 데모 `src/studio/costMeter.demo.js`. 가격 단일소스 `public/js/pricing.js`(`window.PRICING` → 추후 `GET /api/pricing`).
- **출력 품질·안전** — 워터마크(무료=첫 1장만 무워터마크, `BACKEND_HANDOFF.md` §4), NSFW/미성년 가드(이미지·영상·캡션 3중), Nano Banana `safetySettings: BLOCK_NONE`(가상인물 전제) ↔ 우리 가드의 정합.
- **근거 문서** — `docs/PRODUCT_STRUCTURE.md`(원가 실측: 이미지 4장 ≈ $0.16, 5초 릴스 ≈ $0.25 / §7 크레딧·요금), `docs/BACKEND_HANDOFF.md` §2·§6.

명시적 비범위: 결제·게이팅 강제(그로스/백엔드), 프론트 UX(`public/*.html`), 템플릿 시드 저작(🎨템플릿 총지휘, `docs/섹션명령서`). 단 **레시피 스키마·비용공식은 템플릿 총지휘와 공유 계약**이므로 변경 시 양쪽 동기화.

## 2) 하위(워커) 세션
도메인을 실제 병렬 가능한 6개 워커로 분해. 각 워커는 **파일만 저장(commit/push 금지)**.

**W1 · 이미지파이프 견고화**
- 목적: `imageGeneration.service.generateForCharacter` 실연결 검증 — 재시도/`allSettled` 부분실패 처리, `selectMasterImage` 규칙, reference 이미지 경로(`tmp/images`) 정합.
- 산출물: `src/images/imageGeneration.service.js`, `src/images/imagePrompt.builder.js`, `tests/images/imagePipe.test.js`(신규).
- 붙여넣기: `~/HeyHoAI에서 docs/세션조직/엔진_STATUS.md의 W1 행을 읽고 이미지 파이프(src/images) 워커를 맡아. generateForCharacter의 재시도·부분실패·master 선택을 검증/보강하고 tests/images/imagePipe.test.js를 추가해. 파일만 저장하고 commit/push는 하지 마.`

**W2 · 영상파이프 견고화**
- 목적: `videoGeneration.service` 폴링(`pollUntilDone` 10분/5초·타임아웃), 소스이미지 4단계 우선순위, `trackInDb` 미추적 분기, duration 클램핑.
- 산출물: `src/videos/videoGeneration.service.js`, `src/videos/videoPrompt.builder.js`, `tests/videos/videoPipe.test.js`(신규).
- 붙여넣기: `~/HeyHoAI에서 docs/세션조직/엔진_STATUS.md의 W2 행을 읽고 영상 파이프(src/videos) 워커를 맡아. pollUntilDone 타임아웃·소스이미지 우선순위·trackInDb 분기·duration 클램핑을 검증/보강하고 tests/videos/videoPipe.test.js를 추가해. 파일만 저장, commit/push 금지.`

**W3 · 프로바이더 라우팅·폴백 매니페스트**
- 목적: 이미지/영상 프로바이더 레지스트리·`isConfigured` 폴백 체인 일원화, 키↔모델↔maxDuration↔비용을 단일 매니페스트로 추출(라우팅·costMeter·핸드오프가 같은 표 참조).
- 산출물: `src/providers.manifest.js`(신규: 프로바이더 id·env키·모델·maxDurationSec·단위원가), 워커 보고서는 파일 X, `docs/세션조직/엔진_프로바이더_매니페스트.md`(신규).
- 붙여넣기: `~/HeyHoAI에서 docs/세션조직/엔진_STATUS.md의 W3 행을 읽고 프로바이더 라우팅·폴백 워커를 맡아. src/images/providers·src/videos/providers와 두 service의 레지스트리/폴백을 읽어 src/providers.manifest.js(프로바이더 id·env키·모델·maxDurationSec·단위원가)와 docs/세션조직/엔진_프로바이더_매니페스트.md를 만들어. 파일만 저장, commit/push 금지.`

**W4 · 레시피 리졸버 정합**
- 목적: `resolveRecipe`가 `src/recipes/seeds/*.v2.js` 76개 시드(템플릿 총지휘 산출)를 전수 해석 가능한지·비용공식(릴스=shots×2/사진=ceil×0.5+온모델)이 시드와 일치하는지 검증.
- 산출물: `src/recipes/recipeResolver.js`(필요시 보강), `tests/recipes/resolveAllSeeds.test.js`(신규: 전 시드 resolve smoke).
- 붙여넣기: `~/HeyHoAI에서 docs/세션조직/엔진_STATUS.md의 W4 행을 읽고 레시피 리졸버 워커를 맡아. recipeResolver.resolveRecipe로 src/recipes/seeds/*.v2.js 전체를 해석해 비용공식·shot_strategy·output_type 정합을 검증하는 tests/recipes/resolveAllSeeds.test.js를 추가해. 파일만 저장, commit/push 금지.`

**W5 · 캡션(Claude) 정합·안전**
- 목적: `caption.service.generateCaption` 모델/SDK·JSON 파싱 견고화, `validateCaptionSafety`(금지어·BANNED_HASHTAGS·30태그) 강화. `env.CLAUDE_MODEL`이 현행 권장 모델인지 `claude-api` 스킬로 확인.
- 산출물: `src/publishing/caption.service.js`, `tests/publishing/caption.test.js`(신규).
- 붙여넣기: `~/HeyHoAI에서 docs/세션조직/엔진_STATUS.md의 W5 행을 읽고 캡션(Claude) 워커를 맡아. caption.service.generateCaption의 JSON 파싱·validateCaptionSafety를 보강하고, env.CLAUDE_MODEL 적정성을 claude-api 스킬로 확인한 뒤 tests/publishing/caption.test.js를 추가해. 파일만 저장, commit/push 금지.`

**W6 · 원가로깅 + 품질·안전 게이트**
- 목적: `costMeter`의 `PROVIDER_COSTS`를 W3 매니페스트·`PRODUCT_STRUCTURE.md` 실측($0.16/4장, $0.25/릴스)과 동기화, `meterGeneration`→`/api/pricing` 근거 경로 정리. 워터마크/NSFW 게이트(이미지·영상·캡션 3중 가드 + Nano Banana BLOCK_NONE 정합) 체크리스트화.
- 산출물: `src/studio/costMeter.js`, `tests/studio/costMeter.test.js`(신규), `docs/세션조직/엔진_안전체크리스트.md`(신규).
- 붙여넣기: `~/HeyHoAI에서 docs/세션조직/엔진_STATUS.md의 W6 행을 읽고 원가로깅·품질안전 워커를 맡아. costMeter.PROVIDER_COSTS를 src/providers.manifest.js와 PRODUCT_STRUCTURE.md 실측에 맞추고 tests/studio/costMeter.test.js를 추가해. 워터마크·NSFW 3중 가드 정합을 docs/세션조직/엔진_안전체크리스트.md로 정리해. 파일만 저장, commit/push 금지.`

## 3) 공유 백본 / _STATUS
- **도메인 보드**: `docs/세션조직/엔진_STATUS.md` — 표(워커·상태 pending/wip/done·산출파일·이슈). 워커가 한 단위 끝낼 때마다 총지휘가 갱신. (🎨템플릿 총지휘의 `docs/섹션명령서/_STATUS.md` 패턴 그대로.)
- **파생 산출**: `src/providers.manifest.js`(W3 단일 진실원) · `docs/세션조직/엔진_프로바이더_매니페스트.md` · `docs/세션조직/엔진_안전체크리스트.md`.
- **자동 점검**(총지휘가 주기 실행, 셸 한 줄):
  - 모듈 로딩·리졸버·costMeter 데모: `node src/recipes/resolve.demo.js && node src/studio/costMeter.demo.js`
  - 엔진 도메인 테스트: `npx jest tests/images tests/videos tests/recipes tests/publishing/caption.test.js tests/studio/costMeter.test.js` (없으면 `node -e "require('./src/...')"` 로딩 스모크)
  - 비용공식 정합 빠른확인: `node -e "const {resolveRecipe}=require('./src/recipes/recipeResolver');"`로 샘플 config resolve 후 `credit_cost` 검산.
  - 프로바이더 키 인벤토리: `node -e "const m=require('./src/providers.manifest');console.table(m)"`
- 템플릿 도메인과의 계약(스키마·비용공식)은 `scripts/consolidate_recipes.js`가 시드 측에서, W4 테스트가 리졸버 측에서 양방향 검증.

## 4) Chief에 보고할 _STATUS 요약 형태
```
## ⚙️ 엔진 도메인 — STATUS (총지휘 보고)
- 진행률: 6 워커 중 N done / M wip / K pending
- 이미지파이프(W1): [done/wip] — allSettled 부분실패·master선택 OK / 이슈:
- 영상파이프(W2): [..] — 폴링 타임아웃·trackInDb 분기 / 이슈:
- 프로바이더 라우팅(W3): [..] — manifest 단일원 / 미설정 키: RUNWAY/KLING/...
- 레시피 리졸버(W4): [..] — 76시드 resolve smoke pass / 비용공식 정합:
- 캡션(W5): [..] — CLAUDE_MODEL=___ / 안전가드 OK
- 원가로깅·안전(W6): [..] — PROVIDER_COSTS↔실측 동기화 / 적자 SKU 후보:
- 자동점검: resolve.demo+costMeter.demo [pass/fail], jest [N pass/F fail]
- 차단요인(.env 키 등): 
- Chief 액션 필요(머지/PG·키 발급): 
```

## 5) 완료 기준(DoD) 체크리스트
- [ ] W1~W6 산출 파일 전부 존재(테스트 4종 + manifest + 매니페스트/안전 체크리스트 2문서).
- [ ] `node src/recipes/resolve.demo.js` · `node src/studio/costMeter.demo.js` 무오류.
- [ ] `npx jest`(엔진 도메인) 그린 — 이미지/영상/리졸버/캡션/costMeter.
- [ ] `src/recipes/seeds/*.v2.js` 76개 전부 `resolveRecipe`로 해석 성공, **비용공식(릴스=shots×2 / 사진=ceil(count×0.5)+온모델)** 시드와 일치.
- [ ] 프로바이더 레지스트리·폴백이 `src/providers.manifest.js` 단일 진실원과 일치(이미지 nano-banana/flux/replicate/fal, 영상 runway/kling/minimax).
- [ ] `costMeter.PROVIDER_COSTS` ↔ `PRODUCT_STRUCTURE.md` 실측($0.16/4장·$0.25/릴스) 동기화, `meterGeneration` 출력이 `/api/pricing` 근거로 사용 가능.
- [ ] 워터마크/NSFW/미성년 3중 가드(이미지·영상·캡션) + Nano Banana BLOCK_NONE 정합이 `엔진_안전체크리스트.md`에 명시.
- [ ] `docs/세션조직/엔진_STATUS.md` 최신화, Chief 보고 요약 작성. (커밋·머지는 Chief.)

## 6) 총지휘 세션 붙여넣기 문구
> `~/HeyHoAI에서 docs/세션조직/엔진_총지휘_생성파이프라인.md를 읽고 ⚙️엔진 도메인 총지휘를 맡아. src/{images,videos,recipes/recipeResolver.js,publishing/caption.service.js,studio/costMeter.js}와 두 providers 디렉터리를 백본으로, W1~W6 워커를 띄워 산출물을 수거·검증해. node src/recipes/resolve.demo.js·node src/studio/costMeter.demo.js와 엔진 도메인 jest로 자동점검하고, 진행상태를 docs/세션조직/엔진_STATUS.md로 관리해. 워커는 파일만 저장(commit/push 금지)하고, 머지/릴리스는 Chief가 한다.`

## 7) 워커 세션 붙여넣기 문구 모음
- W1: `~/HeyHoAI에서 docs/세션조직/엔진_STATUS.md의 W1 행을 읽고 이미지 파이프(src/images) 워커를 맡아. generateForCharacter의 재시도·부분실패·master 선택을 검증/보강하고 tests/images/imagePipe.test.js를 추가해. 파일만 저장하고 commit/push는 하지 마.`
- W2: `~/HeyHoAI에서 docs/세션조직/엔진_STATUS.md의 W2 행을 읽고 영상 파이프(src/videos) 워커를 맡아. pollUntilDone 타임아웃·소스이미지 우선순위·trackInDb 분기·duration 클램핑을 검증/보강하고 tests/videos/videoPipe.test.js를 추가해. 파일만 저장, commit/push 금지.`
- W3: `~/HeyHoAI에서 docs/세션조직/엔진_STATUS.md의 W3 행을 읽고 프로바이더 라우팅·폴백 워커를 맡아. src/images/providers·src/videos/providers와 두 service의 레지스트리/폴백을 읽어 src/providers.manifest.js와 docs/세션조직/엔진_프로바이더_매니페스트.md를 만들어. 파일만 저장, commit/push 금지.`
- W4: `~/HeyHoAI에서 docs/세션조직/엔진_STATUS.md의 W4 행을 읽고 레시피 리졸버 워커를 맡아. recipeResolver.resolveRecipe로 src/recipes/seeds/*.v2.js 전체를 해석해 비용공식·shot_strategy·output_type 정합을 검증하는 tests/recipes/resolveAllSeeds.test.js를 추가해. 파일만 저장, commit/push 금지.`
- W5: `~/HeyHoAI에서 docs/세션조직/엔진_STATUS.md의 W5 행을 읽고 캡션(Claude) 워커를 맡아. caption.service.generateCaption의 JSON 파싱·validateCaptionSafety를 보강하고, env.CLAUDE_MODEL 적정성을 claude-api 스킬로 확인한 뒤 tests/publishing/caption.test.js를 추가해. 파일만 저장, commit/push 금지.`
- W6: `~/HeyHoAI에서 docs/세션조직/엔진_STATUS.md의 W6 행을 읽고 원가로깅·품질안전 워커를 맡아. costMeter.PROVIDER_COSTS를 src/providers.manifest.js와 PRODUCT_STRUCTURE.md 실측에 맞추고 tests/studio/costMeter.test.js를 추가해. 워터마크·NSFW 3중 가드 정합을 docs/세션조직/엔진_안전체크리스트.md로 정리해. 파일만 저장, commit/push 금지.`

---
### 공통 규칙 (인용)
- 조직: 👑총최고관리자(Chief) → 도메인 총지휘들 → 워커 세션들. 세션끼리 메모리 비공유 → **공유 백본 = 레포 파일시스템**(각 도메인은 자기 _STATUS 보드를 갖고 Chief가 취합).
- git: **워커 = 파일만 저장(commit/push 금지)**. 각 도메인 총지휘가 자기 도메인 git, **최종 머지/릴리스는 Chief**. 브랜치 `feat/ux-monetization-v2`(mock 단계, push는 사용자 승인). 강제푸시 금지.
- 패턴 출처: 🎨템플릿 총지휘 = `docs/섹션명령서/00_총지휘_종합관리.md`(워커 11 + `scripts/consolidate_recipes.js` + `_STATUS.md`). 이 총지휘+워커+_STATUS+붙여넣기 패턴을 그대로 따른다.
- 현 상태: 프론트/UX는 mock 대부분 완료, 백엔드·엔진은 미연결(`docs/BACKEND_HANDOFF.md` 대기), 그로스는 배포·PG가맹·리스팅 진행 중.
