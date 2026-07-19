# On Model faceswap — 화질 개선 (다음 세션 진입점)

작성 2026-07-19. 이전 세션에서 **On Model + faceswap 파이프라인을 end-to-end 완성·라이브**시킴.
다음 세션 목표 = **facefusion 스왑으로 인한 얼굴 화질 저하 보완 탐색**.

---

## 🟢 최신 상태 (2026-07-19 오후) — 여기부터 읽기
- **현재 라이브 스왑 = "B+경계"**: `inswapper_128 + pixel-boost 512 + face-mask-blur 0.6 + occlusion 마스크` (인핸서·gain·combo 전부 OFF). env(`~/HeyHoAI-launch/.env`)의 `FACEFUSION_MASK_BLUR=0.6`·`FACEFUSION_MASK_TYPES="box occlusion"`가 이걸 활성화. 코드 default는 boost만(마스크는 env로).
- **핵심 교훈**: 인핸서(gpen/codeformer)·gain 증폭 = **"지어낸 디테일" → AI 티**. 정직한 스왑(inswapper+boost)이 자연스러움. 요구 = ①안 뭉개짐 ②안 이질적. 얼굴만 확대 말고 **몸에 얹힌 합성 상태**로 판정할 것.
- **env로 켤 수 있는 실험 기능(전부 기본 OFF, 코드에 배선됨)**: `FACEFUSION_FACE_ENHANCER`(단일패스 인핸서) · `FACEFUSION_COMBO=1`(2패스 B톤+D디테일 주파수합성, `scripts/freq_combine.py`) + `FACEFUSION_COMBO_ENHANCER/BLEND/GAIN/RADIUS/DETAIL_SWAPPER`. combo·detail-swapper는 실측상 선명하나 AI 티 → 보류.
- **🔴 남은 미해결 = "밝은 피부 얼굴이 너무 매끈(AI 티)"**. 원인 = **로스터 소스 얼굴(밝은 피부)이 원래 에어브러시**(옛 프롬프트 "smooth even complexion"+옛 모델 2.5-flash). 스왑엔진 아니라 **입력(소스 얼굴)** 문제. 검증: 자연-질감 소스 얼굴로 스왑하면 결과도 자연스러워짐(로컬 확인 완료).
  - **해결 방향**: 로스터에 **아이돌급 미모 + 자연 글래스스킨** 얼굴 **추가**(기존 40개 무손상). 프롬프트 골격 검증됨(gemini-3-pro-image + "visible pores/film grain/NOT airbrushed", "smooth even complexion" 제거). 규칙: **생성 전 테스트·미리보기 필수**, 추가는 prod 배포 필요(로스터=prod 픽커+stage-1).
- ⚠️ **커밋 상태**: 위 엔진 변경은 커밋/푸시됨(서버 테스트 편의). **방식 확정 아님**(B+경계는 잠정 최적). 로스터 추가 작업은 미착수.

---

## ✅ 완료 (2026-07-19) — 화질 개선 배선·실측 끝
- **CLI 비교(로컬)로 조합 선정**: A baseline(inswapper_128)=🔴소프트/왁스 → **D = inswapper_128 + `--face-swapper-pixel-boost 512x512` + 인핸서(blend 80)**.
- **인핸서 2차 비교(다음 티어 모델 다운로드 후)**: gfpgan/codeformer/gpen_bfr_1024/simswap_512/hyperswap 비교 →
  - boost 768·1024 = 512 대비 개선 없음(시간만↑) → **512 최적**. blend 60~100 = 선명도 아닌 취향(80 무난).
  - codeformer ≈ gfpgan. **gpen_bfr_1024 = 피부결(모공) realism 한 단계 위 + 정체성 보존, +1.5s(~10.6s)** → **최종 채택**.
  - simswap_512·hyperswap = 네이티브 샤프하나 정체성 드리프트 → 로스터 부적합, 기각.
  - ~~최종 기본 = inswapper_128 + boost512 + gpen_bfr_1024(blend80)~~ ← **번복(2026-07-19 오후)**.
- **⚠️ 재판정(합성 어우러짐 기준) — 최종 = B: inswapper_128 + boost512 + 인핸서 OFF**:
  - 실제 온모델 결과(idx=11090)를 사용자가 보고 지적: gpen80은 **얼굴이 밝고 매끈해져 몸에서 "뜬다"**(톤·질감 어긋남). baseline은 자연스러웠으나 뭉갬.
  - 실제 온모델 타겟에 baseline/boost만/gpen50/gpen80 스왑해 **합성 어우러짐** 비교 → **boost만(B)이 선명+자연 둘 다** = 정답. 인핸서(gpen/gfpgan)는 얼굴만 확대 땐 좋지만 합성에선 밝기·매끈함이 몸과 어긋남.
  - **교훈: 얼굴 화질은 "얼굴만 확대"가 아니라 "몸에 얹힌 합성 상태"로 판정할 것.** 근본 개선(선명+어우러짐)은 인핸서가 아니라 **톤/조명 color-transfer** 레버.
  - 다음 후보(원하면): boost + gpen 아주 약하게(blend 30) / facefusion 스킨-톤 매칭 / 소스 얼굴을 자연광·웜톤 세트로.
- **엔진 배선**: `src/config/index.js`에 env 4개 추가(`FACEFUSION_PIXEL_BOOST=512x512`·`FACEFUSION_FACE_ENHANCER=gpen_bfr_1024`·`FACEFUSION_FACE_ENHANCER_BLEND=80`·`FACEFUSION_OUTPUT_QUALITY=100`, 전부 기본 ON, 빈값=끔). `src/images/faceswap.service.js`가 args에 조건부 주입 + 성공 로그에 `[모델 boost= enh=]` 표기.
- **워커 반영**: `pm2 restart faceswap-worker` 완료(새 코드 가동 중). → **신규 On Model 잡은 지금부터 D조합으로 처리됨**(엔진 변경이라 레시피/migrate/배포 무관).
- **실측**: `swapFace()` 격리 호출(prod DB/크레딧/R2 무관)로 baseline↔D 비교 — 눈·홍채·속눈썹·피부결 뚜렷 개선, 소스 정체성 보존 확인. 산출물 `scratchpad/faceswap-quality/COMPARE_*.png`.
- ⚠️ **미커밋**: 위 편집은 워크트리에 있고 워커엔 반영됐으나 **git 커밋/푸시는 안 함(사용자 승인 대기)**. 튜닝 조절은 `~/HeyHoAI-launch/.env`에 `FACEFUSION_*` 넣고 `pm2 restart faceswap-worker`.
- 남은 옵션(선택): 인핸서 blend 하향(60~70)으로 뷰티파이 완화 · 다른 인종/남성 로스터 일반화 확인 · 출력 PNG 무손실(저장비용↑ 트레이드오프) · GPU(`FACEFUSION_PROVIDERS=coreml/cuda`)로 속도.

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
