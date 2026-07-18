# On Model + faceswap 파이프라인 — 정식 설계 (2026-07-18)

bodywear(Innerwear & Swim)의 마지막 패밀리 **On Model(◈5)** — 로스터 얼굴 있는 온바디 컷.
Worn Cut(faceless, 완료·라이브)과 달리 **벤더가 "모델 얼굴 레퍼 + 속옷" 조합을 거부**하므로
2-stage(프롬프트로 근사 생성 → 우리 AI 합성얼굴 faceswap)가 필요하다.

정본 진입점. 선행 스펙(낡은 전제 포함)=`docs/섹션명령서/14_underwear_작업기록.md` §5~8.

---

## §0. 정찰로 확정된 현실 — 14_underwear 스펙의 낡은 전제 교정

14 doc(및 CLAUDE.md)은 "mock 백엔드 + 그린필드 인프라"를 가정했으나 **실제는 다르다.** 설계는 실제 위에 세운다.

| 14 doc / CLAUDE.md 가정 | **실제 (2026-07-18 정찰)** | 설계 영향 |
|---|---|---|
| 백엔드 mock · 미연결 | **실 백엔드**: `generate.route.js`(1687줄) Gemini(2.5-flash-image / 3-pro-image)로 실생성. doppia.ai 라이브. | 실제 생성 경로에 후킹 |
| faceswap 인프라 미구축(그린필드) | **비동기 잡 인프라 이미 존재**: `video_jobs`(테이블+상태머신)·`startPoller()` 폴링 루프·`generationJob.repository.js`. `execFileP`로 ffmpeg CLI 셸아웃 선례. | faceswap는 **video_jobs 패턴 미러** — 처음부터 안 지음 |
| `~/facefusion` 로컬 설치 필요 | **이미 존재**(`~/facefusion/facefusion.py` 등). | 설치 불필요, CLI 호출만 |
| 오브젝트 스토리지 미구축(=워커 분리의 블로커) | **R2 이미 존재**: `src/storage/mediaStore.js`(S3호환·env-gated `MEDIA_S3_BUCKET`) + generate.route "로컬 tmp 우선, 없으면 R2 폴백". | **워커 분리 하드의존성 해결됨** — 워커가 R2에 put, 웹이 R2에서 서빙 |
| keyed-strip 엔진 변경 필수(§7) | **불필요**: Studio 제품 경로는 강제 `SAFETY_NEGATIVE_PROMPT` 주입 **안 함**. generate.route L133/161이 `req.body.negativePrompt`(레시피 extra_negative)를 그대로 `Avoid:`로 붙임. `SAFETY_NEGATIVE`는 persona(인플루언서) 경로 전용(imagePrompt.builder). | **keyed-strip 스코프에서 드롭.** 레시피 negative가 곧 최종 negative. (Worn Cut의 `relax_apparel_guards` 플래그도 이 경로엔 무의미 — 무해하니 유지) |
| — | 현재 On Model(studiomodel/accessories)은 로스터 **얼굴 PNG를 referenceImages로 첨부**(studio.html L4943). | bodywear On Model은 **여기서 분기**: 얼굴 미첨부 → 텍스트 주입 → stage-2 스왑 |
| — | `safeModelPath`(L34)가 현재 `kids/` 경로 **허용**. `modelMetaFor`가 isMinor 판정. | bodywear On Model에서 **kids 하드 거부** 추가 |

**결론: faceswap On Model = 대공사 아님. "기존 잡 인프라 미러 + stage-1 분기 + facefusion 셸아웃 워커" 중간 규모.**

---

## §1. 두 레인 (병렬 가능, 착지 순서는 §6)

| 레인 | 범위 | 소유·리스크 |
|---|---|---|
| **템플릿 레인** | On Model 레시피 패밀리 + studio 모달(garment+모델 픽커 결합·성별 필터·Kids 배제) | src/recipes + studio.html. 우리 소유, 배포 쉬움 |
| **엔진 레인** | stage-1 분기(얼굴 미첨부·텍스트 주입·KIDS 거부) + `faceswap_jobs` + `faceswapWorker.js`(facefusion) + R2 저장 | 백엔드. 기존 인프라 재사용 |

⚠️ **함정(14 doc §3.3)**: 엔진 없이 On Model 카드만 노출하면 "선언됐지만 안 돎"(faceswap 안 돌아 얼굴 있는 stage-1 = 벤더 게이트/품질 문제 그대로 라이브). → **엔진 착지 전엔 On Model 카드 비노출**(플래그 게이트).

---

## §2. 템플릿 레인 설계

### 2.1 On Model 레시피 패밀리 (`recipes.bodywear.v2.js` 패밀리 4)
- 부모 `Bodywear On Model`(category `"On Model"`, ◈5=credit_cost 5, mode product).
  - `meta.axes:["garment","skin"]` + **`meta.picker:"model"`**(스왑 타깃 선택) + **`meta.post:["faceswap"]`**(엔진 stage-2 트리거 신호) + flags `[experimental, needs_human_review]`.
  - `config.relax_apparel_guards:true`(Worn Cut과 동일 — 이 경로엔 무의미하나 일관성 유지).
- 자식 컷(품목별 프레이밍): On Model Front / On Model Three-Quarter / On Model Editorial. 각 `meta.garment` 조건부.
  - stage-1 프롬프트: 얼굴 레퍼 미첨부 전제 + 로스터 텍스트 주입 + 상반신/토르소 + 불투명 + 에디토리얼 캠페인 톤.
  - extra_negative = `BODY_SAFETY_NEG`(Worn Cut 재사용) + "full-length crotch focus, identity drift, distorted face".
- 배선 5지점: Worn Cut과 동일(recipes.generated·themes 2곳·studio C.bodywear 자동·?v). category "On Model"은 taxonomy Innerwear&Swim(vertical 매칭)에 자동 포함.

### 2.2 studio 모달 — garment 축 + 모델 픽커 **결합** (신규 로직)
현재 모달: `renderModalAxes`(axes 있을 때) + `renderModalModels`(picker=='model'일 때)를 **각각** 렌더 → 구조상 **둘 다 있는 레시피는 둘 다 렌더됨**(문제 없음). 신규로 필요한 3가지:
1. **garment → 로스터 성별 필터**(설계 §3, 확정 매핑): garment 선택 시 모델 그리드를 성별로 제약.
   - `bra`·`set` → 여성만(`modelsFor('female')`), `bottoms`·`swim` → 남녀(현행 필터칩 유지). garment 변경 시 모델 그리드 재렌더 + 부적합 선택 해제.
2. **Kids 탭 하드 배제**: `renderModalModels`의 adult/kids 탭에서 bodywear On Model일 때 **kids 탭 미렌더**(플래그/vertical 게이트). 공유 픽커 누수 금지 — 프리셋 이름 아닌 `recipe.vertical==='bodywear'` 또는 `recipe.post.includes('faceswap')`로 트리거.
3. **성별 함의 UI**: bra/set 선택 시 여성 로스터만 보이므로 별도 안내 불필요(자연 제약).

### 2.3 안전(템플릿 레인)
- 전 컷 `needs_human_review`(자동발행 금지). 여성 란제리/수영복 On Model = 특히 테이스트풀 강제(프롬프트 문구).
- Kids 물리 배제(2.2-2) = 안전 4중의 1층(§4).

---

## §3. 엔진 레인 설계

### 3.1 Stage-1 분기 (generate.route.js · imageGeneration.service.js)
현재 On Model 흐름: FE가 로스터 얼굴 PNG를 `referenceImages`로 첨부(studio L4943) → Gemini에 레퍼로 전달.
**bodywear On Model 분기:**
- **FE(studio L4943)**: `recipe.post.includes('faceswap')`이면 **얼굴 PNG를 referenceImages에 넣지 않음.** 대신 `modelId`만 서버로 전달(스왑 타깃 지정용).
- **서버(generate.route)**: `modelMetaFor(rosterPath)`의 텍스트 서술(descent/age/build/hair/skin — 이미 구현됨)을 프롬프트에 주입해 stage-1 생성(얼굴 있는 근사 모델, 옷 착용). 벤더는 "얼굴 레퍼+속옷"이 아니라 "텍스트+속옷"이므로 게이트 회피.
- **KIDS 거부**: bodywear On Model 경로에서 `safeModelPath`가 `kids/`면 **거부**(400) + `modelMetaFor().isMinor`면 차단. (전역 safeModelPath는 kids 허용 유지 — 다른 기능용. bodywear 경로에서만 좁힘.)

### 3.2 `faceswap_jobs` (video_jobs 미러)
- 신규 테이블(또는 `generation_jobs` 확장): `id, user_id, team_id, stage1_key(R2), source_face_path(/img/models/<id>.png), gen_context(jsonb), status, result_key, charge_amount, created_at, updated_at`.
- 상태머신: `queued → processing → succeeded/failed`(video_jobs 미러). 크래시 회수(5분+ 갇힘 → 재큐), 실패 환불(기존 부분실패 환불 재사용).
- stage-1 candidate 생성 직후 웹이 enqueue → 즉시 `{jobId, status:'queued'}` 반환. FE는 폴링(기존 결과 폴링 재사용).

### 3.3 `faceswapWorker.js` (facefusion CLI · 자기청소 — 14 doc §5 규약)
- video 폴러(`startPoller`)와 동일 패턴이나 **facefusion이 있는 박스에서 실행**(§5 워커 배치 결정).
- 잡 클레임(SKIP LOCKED) → facefusion 셸아웃(`execFileP`, video의 ffmpeg 선례와 동일):
  ```
  ~/facefusion/venv/bin/python facefusion.py headless-run \
    --processors face_swapper --source-paths <로스터얼굴> \
    --target-path <stage1> --output-path <out>
  ```
  facefusion 자체 nsfw(`nsfw_1.onnx`)+age(`fairface.onnx`) 게이트 작동(우리가 통제 안 하는 독립 층).
- **자기청소(좀비 방지)**: 작업별 격리 `tmp/faceswap/<jobId>/`, `spawn` 인자배열, `detached` 그룹 kill, 하드 타임아웃 → `kill(-pid)`, `finally` 무조건 `rm -rf`, 동시성 캡, **성공 버퍼만 저장**, 부팅 시 tmp 청소.
- 결과 → `mediaStore.put()`(R2) + `resultRepo.insert` + `reviewRepo`(needs_human_review) → 잡 done.

### 3.4 저장 (기존 R2 재사용)
- stage-1·결과 모두 `mediaStore`(R2, `MEDIA_S3_BUCKET` env). 워커(별도 박스)가 put → 웹이 `getObject`/`remoteUrl`로 서빙. **크로스박스 문제 이미 해결.**
- ⚠️ 전제: prod에 `MEDIA_S3_*` env 설정돼 있어야(R2 실제 활성). 정찰 미확인 → 배포 전 확인.

---

## §4. 안전 4중 (실제 후킹 지점 반영)
| 층 | 통제 | 실제 위치 |
|---|---|---|
| 1. 아동 물리배제 | 픽커 kids 탭 미렌더 + `safeModelPath` bodywear경로 kids 거부 + isMinor 스왑타깃 불가 | §2.2-2, §3.1 |
| 2. stage-1 프롬프트 가드 | 레시피 extra_negative(BODY_SAFETY_NEG)가 곧 최종 negative(강제주입 없음) + "clearly adult 25+" positive | §2.1 |
| 3. facefusion 게이트 | 스왑 단계 nsfw+age(독립 층, OpenRAIL-AS) | §3.3 |
| 4. 사람검수 | 전 컷 needs_human_review — 자동발행 금지 | reviewRepo |
**스왑 타깃 = 우리 AI 합성 로스터 한정**(실존 인물 금지 — 비동의 딥페이크·AUP 위반). Doppia AUP와 정합.

---

## §5. 확정 필요 결정 (사용자)

**D1 · 워커 배치** (가장 중요 — 운영 형태 결정)
- **A. prod in-process**: prod 서버에 facefusion 설치, video 폴러처럼 웹 프로세스 내 폴링. 별도 박스·Mac 의존 없음. CPU면 느림(이미지당 수십초)이나 experimental·저볼륨엔 무방. **자기완결.**
- **B. 이 Mac을 워커로**: facefusion 이미 여기 있음. Mac이 prod DB 폴링 + R2 put. **Mac 상시 온 필요**(꺼지면 On Model 정지). local-prod 격리 주의.
- **C. GPU 클라우드 워커**: 확장성 최고, 설치·비용 최다. v1엔 과함.

**D2 · v1 범위**
- **완전 자동 async**(권장, 인프라 이미 있음): enqueue→워커→R2, FE 폴링. 
- **반자동**: stage-1만 생성, 사람이 facefusion 수동 실행·재업로드. 개념검증엔 최소 엔진이나 UX 조악.

**D3 · keyed-strip 드롭 확정?**
- 정찰상 Studio 경로에 강제 SAFETY_NEGATIVE 없음 → keyed-strip 불필요. **드롭 확정** 여부. (드롭해도 레시피 negative가 안전 담당)

**D4 · MEDIA_S3 env 확인**
- prod에 R2 활성(`MEDIA_S3_BUCKET` 등) 여부 — 워커 분리 전제. 미설정이면 설정 선행.

---

## §6. 단계별 구현 계획 (D1~D4 확정 후)
1. **템플릿 레인**(엔진과 무관·먼저 가능하나 **비노출 게이트**): On Model 레시피 + studio 모달(garment+picker+성별필터+Kids배제). 카드는 `post:['faceswap']` 플래그로 엔진 착지 전까지 숨김.
2. **엔진 레인**: 
   a. stage-1 분기(FE 얼굴 미첨부 + 서버 텍스트주입 + KIDS 거부).
   b. `faceswap_jobs` 테이블(migrate) + repo.
   c. `faceswapWorker.js`(facefusion 셸아웃 + 자기청소) + 폴러 부트(배치=D1).
   d. enqueue 후킹(generate.route) + FE 폴링.
3. **검증**: 로컬 워커로 end-to-end 1건(로스터 얼굴 스왑 확인·좀비파일 0·needs_human_review) → 배포.
4. **노출 해제**: 엔진 검증 후 On Model 카드 게이트 오픈 + 배포(push + 서버 배포).

⚠️ push=사용자 승인만 · 단계별 커밋·검증 · studio.html 동시작업(Ad Video) fetch 확인.

---

## §7. 구현 현황 (2026-07-18 세션 — 코드 완성·로컬 검증, 카드 게이트 유지)

**✅ 완성·검증됨 (로컬)**
- **facefusion 스왑 품질** — 로스터 얼굴→바디 스왑, CPU 2.2~4.2초, 프로덕션급(시각 확인). 모델 캐시됨(inswapper_128).
- **`src/images/faceswap.service.js`** — facefusion CLI 래퍼, 실스왑 검증 + 자기청소(temp 제거·프로세스그룹 kill·타임아웃·동시성캡·부팅청소).
- **`src/images/faceswapJob.repository.js`** — insert/claimNext(SKIP LOCKED)/markSucceeded/markFailed/reapStuck. **doppia_local에서 전 SQL 검증.**
- **`src/workers/faceswapWorker.js`** — 폴링 루프(claim→stage-1 로드(로컬/R2)→swap→mediaStore.put→resultRepo+reviewRepo→mark). 실행=`node src/workers/faceswapWorker.js`.
- **`src/db/migrate.js`** — `faceswap_jobs` 테이블(video_jobs 미러). **doppia_local 적용 검증.**
- **`src/config/index.js`** — FACEFUSION_*·FACESWAP_* env 키.
- **`src/generate/generate.route.js`** — 3개 게이트 편집(require·faceswap감지+KIDS거부+텍스트주입·candidate 저장 게이트→enqueue). **기존 생성 무영향**(faceswap 미전송 시 스킵).
- **`recipes.bodywear.v2.js`** — On Model 패밀리(부모+3컷, picker+post:faceswap+axes). contract·export에 `post` 전파 추가.
- **`public/studio.html`** — 5편집: C.bodywear picker·post 전달 / L4943 얼굴 미첨부 분기(modelImage+faceswap+garment) / renderModalModels Kids 하드배제+garment 성별필터 / setModalAxis 성별 재렌더 / queued 결과 처리. **인라인 JS 문법 OK.**
- **게이트 유지**: On Model 카드 `held:true`, themes.js DEFAULT_OFFICIAL·OFFICIAL_THEME_MAP **미등록 → 비노출**.

**⏳ 남음 (prod 필요 — 사용자 실행)**
1. 코드 배포(push→auto-deploy) + **prod `npm run migrate`**(faceswap_jobs 생성).
2. **MEDIA_S3 env 확인**(prod R2 활성 — 워커/웹 크로스박스 전제. 미설정이면 워커=웹 동일박스만 동작).
3. **워커 기동**(이 Mac): `DATABASE_URL=<prod> node src/workers/faceswapWorker.js` (prod DB·R2 자격 필요).
4. **노출 해제**(엔진 확인 후): themes.js DEFAULT_OFFICIAL_RECIPES+OFFICIAL_THEME_MAP에 `bodywear-on-model` 추가 + studio ?v 갱신.
5. **e2e 검증**: On Model 1건 생성 → 스왑 결과 Library 삽입·needs_human_review·좀비파일 0 확인.

**미결정/후속**: FE 실시간 폴링(현재는 "Library에 곧 표시" 토스트) · 워커 prod 이전(D1 확장) · facefusion nsfw 게이트 튜닝(속옷 오버블록 여부 실측).
