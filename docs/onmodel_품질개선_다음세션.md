# On Model faceswap — 화질 개선 (다음 세션 진입점)

작성 2026-07-19. 이전 세션에서 **On Model + faceswap 파이프라인을 end-to-end 완성·라이브**시킴.
다음 세션 목표 = **facefusion 스왑으로 인한 얼굴 화질 저하 보완 탐색**.

---

## §0. 지금 상태 (라이브·작동 확인됨)
- **On Model** 카드 = doppia.ai Studio > Apparel > Innerwear & Swim. 실측 성공(남/여, 복서·란제리 온모델).
- **2-stage**: stage-1(Gemini, 얼굴 미첨부 + 로스터 텍스트 주입) → `faceswap_jobs` 큐 → **워커(이 Mac)** facefusion 스왑 → R2 저장 → FE 폴링 자동표시.
- **정본 문서**: 설계=`docs/onmodel_faceswap_설계_2026-07-18.md` · 운영/배포=`docs/faceswap_worker_운영.md` · 로스터=`docs/bodywear_온바디_핸드오프_다음세션.md`.
- **메모리**: `doppia_underwear`(라이브 상태·배포함정), `doppia_media_storage_bug`(R2 활성).

## §1. 워커 (이 Mac에서 상시 가동)
- pm2 프로세스 `faceswap-worker` (`pm2 list`로 확인). 실행기=`scripts/run-faceswap-worker.sh`.
- env: `~/.doppia-r2.env`(R2 creds + `MEDIA_S3_REGION=auto`) + `~/HeyHoAI-launch/.env`(prod DB·config 재사용).
- 코드 고치면 `pm2 restart faceswap-worker`로 즉시 반영(prod 배포 불필요 — 워커는 로컬).
- facefusion 설치=`~/facefusion`(venv=`~/facefusion/venv/bin/python`, 모델 `.assets/models`).

## §2. ⚠️ 배포 대기 (다음 세션 시작 시 확인)
아래 커밋들이 upstream/main에 있으나 **prod 배포(git pull + pm2 restart heyhoai + CF Purge) 됐는지 curl로 확인**:
- 로스터 서술 강화(`db4a7ad`) · Skin tone 칩 제거(`9df074f`) · 폴링 타이머 수정(`dc40b4a`).
- 확인: `curl -s "https://doppia.ai/js/recipes.generated.js?v=23" | grep -c bodywear-on-model` (>0면 최신 배포됨).

## §3. 🎯 다음 세션 목표 = facefusion 화질 저하 보완

### 원인
현재 `inswapper_128`은 **얼굴을 128×128로 스왑** 후 블렌드 → 고해상(928×1152) 이미지에서 얼굴 영역만 소프트/저디테일(몸·배경은 샤프). 전형적 "스왑 얼굴이 살짝 흐릿/플라스틱" 현상.

### 튜닝 위치 = `src/images/faceswap.service.js` (`runFacefusion`의 args 배열)
현재: `--processors face_swapper --face-swapper-model inswapper_128 --execution-providers <cpu>`.

### 개선 레버 (탐색 대상)
1. **`--face-swapper-pixel-boost 512x512`** (또는 768/1024) — 스왑을 고픽셀로 재처리 → 얼굴 샤프. 느려짐.
2. **face_enhancer 프로세서 추가** (가장 임팩트): `--processors face_swapper face_enhancer --face-enhancer-model gfpgan_1.4`(또는 codeformer) + `--face-enhancer-blend 70~90`(강도). 스왑 후 얼굴 디테일 복원. ⚠️모델 다운로드(1회) + 추론시간↑, 강도 높으면 정체성 미세변형 → blend 튜닝.
3. **스왑 모델 교체**: `simswap_unofficial_512`·`hyperswap_1a/1b/1c_256`·`uniface_256` (inswapper보다 높은 네이티브 해상) — 단 정체성 충실도는 모델별 상이, 비교 필요. inswapper_128은 가장 견고한 베이스라인.
4. **출력**: `--output-image-quality 100`.

### env로 노출 (config/index.js에 이미 FACEFUSION_* 있음)
`FACEFUSION_PIXEL_BOOST`, `FACEFUSION_FACE_ENHANCER`, `FACEFUSION_FACE_ENHANCER_BLEND` 추가 → service가 args에 조건부 주입.

### 테스트 방법 (로컬, prod 무관)
- 직접 CLI 비교: `~/facefusion/venv/bin/python facefusion.py headless-run` 에 옵션 바꿔가며 같은 source/target로 결과 비교.
- 샘플: 로스터 얼굴 `~/doppia-underwear/public/img/models/f-*.jpg`, 타겟=아무 온모델 stage-1(또는 로스터 포트레이트).
- 워커 반영: service 고치고 `pm2 restart faceswap-worker` → On Model 1건 생성해 실측.

### 트레이드오프
- pixel_boost 512 + face_enhancer → CPU에서 스왑 ~5-7s가 ~15-25s로. 품질 vs 속도. 확장 시 GPU(`FACEFUSION_PROVIDERS=cuda`)로 상쇄.
- needs_human_review라 즉시성 덜 중요 → 품질 우선 여지 큼.

## §4. 하드 제약
- push=사용자 명시 승인만. main 강제푸시 금지. 워커=이 Mac(상시 온).
- 🔴 **레시피 변경 배포엔 `npm run migrate`(seedRecipes) 필수** + pm2 restart(recipeStore DB 리로드). 화질개선은 service(엔진)만이라 레시피 무관 → 워커 restart면 됨.
- studio.html은 Ad Video 세션과 겹침 — fetch로 충돌 확인.
