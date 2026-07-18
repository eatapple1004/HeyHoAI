# 14 · 속옷(Underwear) — 작업기록 & 온바디 파이프라인 핸드오프

작성: 2026-07-18 세션. 신규 오피셜 vertical `underwear` 추가.
정본 시드: `src/recipes/seeds/recipes.underwear.v2.js` · 백본: 이 문서.

---

## §1. 요약 (TL;DR)

- **라이브(지금 완성)**: 사람 없는 2 패밀리 — **Product Cut(◈2)** + **Hero(◈2)**. 부모 2 + 자식 8 = FE 10카드.
  기존 파이프라인으로 그대로 생성됨(사람 없음 → 벤더 노출게이트 트리거 없음, reference 지배). **엔진 변경 0.**
- **보류(파이프라인 대기)**: 온바디 2 패밀리 — **Worn Cut / On Model**. 속옷 카테고리의 *진짜 차별점*이지만
  **faceswap 후처리 파이프라인**(엔진/백엔드 소유, 미구축)이 선행돼야 실효. 스펙은 §5·§6.
- 검증: `node scripts/consolidate_recipes.js` → `underwear OK 2` · 중복 0 · drift-guard 172/172 OK.

---

## §2. 라이브 산출물

| 항목 | 내용 |
|---|---|
| 시드 | `src/recipes/seeds/recipes.underwear.v2.js` (부모 2 + 자식 8) |
| 배선 | `recipeStore.js` SECTIONS · `consolidate_recipes.js` SECTIONS+PARAM_SECTIONS · `recipe_card_contract.js` VERTICALS(비-PRODUCT) · `export_recipe_cards.js` FE_VERTICALS |
| 재생성 | `_STATUS.md` · `_CATALOG.json` · `_card_contract.proposed.json` · `public/js/recipes.generated.js` (underwear:2) |

**Product Cut** 컷 4: Flat Lay / Ghost Mannequin / Packaging / Fabric Macro
**Hero** 스타일 4: Noir / Athletic / Natural Linen / Spotlight
(전 컷 `product_composite` · ◈2 · `needs_human_review` · 사람/피부 없음)

---

## §3. 설계 결정 로그

1. **독립 vertical `underwear`** (fashion 하위 카테고리 아님) — accessories 선례 미러. PARAM_SECTIONS 등록(부모만 카드).
2. **왜 productcut/producthero가 있는데 속옷 전용을 두나 (중복 판정 재검토 결과 = 정당)**
   - **UX**: Studio 브라우징 = **버티컬-칩 네비**(`#filterRow`/renderFilters/카테고리 스위처, `studio.html`). 속옷 셀러(ADAM)에게 "Underwear" 진입점(집)이 필요. 제네릭 productcut로 안내 = "속옷에도 먹힘"을 셀러가 알아야 하는 나쁜 플로우.
   - **특화(순수복사 아님)**: 제네릭 ghost-mannequin은 옷 무관 → 살색 내부가 뜰 수 있음. 여기 컷은 불투명 강제·살색 억제·허리밴드 로고·멀티팩. producthero 무드는 화장품(스플래시·이슬)이라 옷에 안 맞음 → 가먼트 히어로는 실제 갭.
3. **온바디는 라이브 시드에서 제외** — 파이프라인 없이 선언하면 "선언됐지만 안 돎" 함정. 카테고리는 파이프라인 착지 시 **완결 런칭**(product+hero+온바디).
4. **초안 4패밀리 → 라이브 2패밀리 트림** — 온바디 스펙은 이 문서로 이관(§6, 붙여넣기용 JSON).

---

## §4. 온바디의 근본 제약 (왜 "다른 프로세스"인가)

- 벤더(Gemini/nano-banana)가 **"모델 얼굴 레퍼런스 + 속옷"** 조합을 거부. → 얼굴 레퍼를 붙여 온모델 속옷을 못 만듦.
- **사용자 방법(검증됨)**: ① 얼굴 레퍼 **없이** 프롬프트로 목표 모델 특징을 근사 생성(stage-1) → ② 로컬 **`~/facefusion`**(FaceFusion CLI)로 원하는 **우리 AI 합성 모델** 얼굴로 교체(stage-2).
- 이미 절반은 있음: 로스터(`src/models/roster.v1.js`)가 모델을 **텍스트 서술**(descent/age/build/hair/skin)로 저장 → `generate.route.js:modelMetaFor()`가 프롬프트에 텍스트로 주입. stage-1은 이 서술 재사용(얼굴 이미지 미첨부).
- 기존 On Model(accessories/studiomodel)과 갈리는 지점: 걔넨 로스터 얼굴 이미지를 **생성 레퍼로 첨부**. 속옷은 **미첨부** + faceswap 후처리. 같은 `/img/models/<id>.png`가 "생성 입력"→"스왑 타깃"으로 역할만 바뀜.

---

## §5. faceswap 파이프라인 아키텍처 (엔진/백엔드 핸드오프)

**결정: 처음부터 비동기 잡 + 자가호스팅 워커 풀** (사용자: "곧 다중 사용자"). 인라인 동기는 스케일에서 무너짐(뮤텍스 병목·HTTP 점유·단일머신 천장).

```
POST /generate (속옷 On Model)
  → 검증(크레딧 차지 + KIDS 하드거부) → jobs 테이블 enqueue → 즉시 {jobId, status:'queued'} 반환

워커 풀 (GPU 박스마다 facefusion 설치, jobs SKIP LOCKED 폴링):
  → 잡 클레임
  → stage-1: 벤더 생성(Gemini) — 옷 레퍼만, 얼굴 레퍼 없음, 로스터 서술 텍스트 주입
  → stage-2: faceswap — 워커 로컬 facefusion CLI 호출(블랙박스, 코드 미수정)
        ~/facefusion/venv/bin/python facefusion.py headless-run \
          --processors face_swapper --source-paths <로스터얼굴> \
          --target-path <stage1> --output-path <out>
        → facefusion 자체 nsfw(nsfw_1.onnx) + age(fairface.onnx) 게이트 작동
  → 저장(mediaStore+resultRepo) + needs_human_review → 잡 done (실패→환불: 기존 부분실패 환불 재사용)

FE: GET /jobs/:id 폴링(or SSE) → 준비되면 결과 표시
```

**수평 확장 = 워커 추가.** ⚠️ 스케일 시 **3rd-party 스왑 API 금지** — 로컬 facefusion을 고른 이유(벤더 콘텐츠게이트 회피 + 프라이버시)를 무너뜨림. 자가호스팅 GPU 워커로 확장.

### 후킹 지점 (전부 엔진/백엔드 — src/recipes 밖)
| 무엇 | 파일 | 비고 |
|---|---|---|
| jobs 큐 | 신규 `jobs` 테이블 (Postgres SKIP LOCKED) | `src/images/generationJob.repository.js` 확장 가능성 먼저 검토. Redis 불필요(나중에 승격) |
| 워커 | 신규 `src/workers/generationWorker.js` | 웹과 분리, GPU 머신. facefusion CUDA |
| faceswap 래퍼 | 신규 `src/images/faceswap.service.js` | facefusion CLI shell-out. **facefusion 코드 미수정** |
| KIDS 하드거부 | `src/generate/generate.route.js:34` `safeModelPath` | 정규식이 현재 `kids/` **허용** → 속옷 경로에선 거부 + `isMinor` 차단 |
| keyed-strip | `src/images/imagePrompt.builder.js` | §7 표. 속옷 style_preset 스코프 |

### 자기청소(anti-zombie) 래퍼 규약 — 사용자 요구("좀비파일 안 생기게")
1. 작업별 격리 temp `tmp/faceswap/<genId>/` (source·target·output 전부 여기).
2. `spawn`(shell 아님)+인자배열. `detached`로 프로세스 그룹 kill 가능.
3. 하드 타임아웃(이미지당 예 120s) → `kill(-pid)` 그룹 몰살 → 실패.
4. `finally`에서 **무조건** temp dir `rm -rf` + child 종료 확인.
5. 전역/워커당 동시성 캡 → facefusion 무더기 방지(맥/워커 자원 보호).
6. 스왑 **성공 버퍼만** 저장 → 반쪽 산출물 원천봉쇄.
7. 부팅 시 `tmp/faceswap/*` 청소(기존 tmp cleanup cron 패턴).

---

## §6. 안전 모델 — 4중 (온바디 완화의 전제)

| 층 | 통제 |
|---|---|
| 1. 아동 | **물리 배제** — 속옷 픽커에서 kids 로스터 제외 + `safeModelPath` `kids/` 거부 + `isMinor` 스왑타깃 불가. 절대선. |
| 2. stage-1 하드가드 | keyed-strip이 남기는 것(§7 유지열): nude/naked/nsfw/explicit/sexual/erotic/fetish + exposed genitals/genital outline/bare buttocks/nudity + child/minor/teen. 착용컷(얼굴X, 로스터 미사용)은 프롬프트에 "clearly adult man 25+" 명시. |
| 3. facefusion 게이트 | 스왑 단계 자체의 nsfw(`nsfw_1.onnx`)+age(`fairface.onnx`) — 우리가 통제 안 하는 독립 층. OpenRAIL-AS 라이선스. |
| 4. 사람검수 | 온바디 전 컷 `needs_human_review` — 자동발행 금지. |

**faceswap 타깃 = 우리 AI 합성 모델 한정.** 실존 인물 얼굴 금지(비동의 딥페이크). Doppia AUP도 deepfakes/비동의 실인물/성적 콘텐츠 금지(진실원장 §255) — 정합.

---

## §7. keyed-strip 스펙 (엔진 — `imagePrompt.builder.js`, 속옷 스코프)

사용자 합의: 넓은 소프트 키워드 다수 → 좁은 하드가드 소수 + 사람검수. 이 레포 2026-07-17 결론("부분문자열 말고 구조화 판정")과 동방향.

⚠️ **키잉 주의(중요 — leak 방지)**: strip 트리거를 **style_preset 이름으로 걸면 안 됨.** 속옷 컷은 공유 프리셋(`Studio Beauty`/`Fashion`/`Editorial`)을 재사용하므로, 프리셋 이름으로 걸면 fashion·beauty·generic productcut에도 완화가 새어든다. 트리거는 **속옷 고유 신호**여야 함 — 권장: `config`에 명시 플래그(기존 `allow_text` 패턴처럼 `config.relax_apparel_guards:true`)를 **온바디 속옷 레시피에만** 세팅하고 resolver가 그 플래그로만 strip. 또는 `vertical==='underwear'`를 ctx로 전달해 그것으로만. **공유 프리셋·vertical 미전달 상태에서 preset 이름 키잉 금지.**

| 토큰 | 결정 | 근거 |
|---|---|---|
| `underwear`, `lingerie` | **제거** | 제품 자체를 막음(정당 광고 불가 원인) |
| `fully clothed` (positive 강제) | **제거** | 속옷 착용과 충돌 (단 product_composite 경로는 원래 미주입) |
| `see-through` | **제거** | 메시/시스루가 제품 성질(소재 강조 속옷). 노출은 아래 해부 가드가 백스톱 |
| `provocative/seductive/suggestive` | **제거** | 에디토리얼 포즈·표현 다양성 (선정성은 아래 유지열이 차단) |
| `nude/naked/nsfw/explicit/sexual/erotic/fetish` | **유지** | 선정성 |
| `exposed genitals/genital outline/bare buttocks/nudity` | **유지·강화** | see-through 완화의 실질 백스톱 |
| child/minor/teenager/underage | **유지·강화** | 전역이 2026-07-17 미성년 제거함 → 속옷은 반드시 재주입 |

⚠️ 라이브 Product/Hero는 keyed-strip **불필요**(사람 없음, reference 지배로 소프트 억제 무해). keyed-strip은 온바디 see-through/불투명 제품용 + 품질 개선.

---

## §8. 온바디 레시피 (붙여넣기용 — 파이프라인 착지 시 시드 합류)

파이프라인(§5)·keyed-strip(§7) 착지 후, 아래를 `recipes.underwear.v2.js`에 합류시키면 카테고리 완결.
공통: `subject.reference_strategy='product_composite'`(얼굴 레퍼 미첨부) · `meta.flags:['experimental','needs_human_review']`.

### 패밀리 3 · Worn Cut (◈3) — 얼굴 없는 성인 남성 부위 크롭 (faceswap 불필요)
- 부모 `Underwear Worn Cut` · 컷: Waistband Front / Side Profile / Back Crop / Undershirt Torso.
- `look.style_preset:'Fashion'`. extra_positive에 "fit clearly adult man (age 25+)…face excluded". 
- extra_negative 하드가드(BODY_SAFETY_NEG): `child, minor, teenager, teen, underage, youth, nudity, exposed genitals, genital outline, bulge emphasis, bare buttocks, sheer or see-through reveal, provocative or seductive pose, sexualized posing` + "full-body, face in frame".
- 얼굴이 없으므로 stage-2(faceswap) 없음 — stage-1 + keyed-strip + 사람검수만.

### 패밀리 4 · On Model (◈5) — 로스터 얼굴 O, faceswap 2-stage
- 부모 `Underwear On Model` · 컷: On Model Briefs / On Model Undershirt / On Model Loungewear.
- `meta.picker:'model'` (= **스왑 타깃 선택**, kids 제외) · **`meta.post:['faceswap']`** (엔진이 stage-2 트리거).
- stage-1: 얼굴 레퍼 미첨부, 로스터 텍스트 서술 주입, 에디토리얼 캠페인 톤, 상반신/토르소, 불투명.
- extra_negative: BODY_SAFETY_NEG + "full-length crotch focus, identity drift, distorted face".
- (초안 원문 프롬프트는 git 히스토리 `recipes.underwear.v2.js` 4패밀리판 또는 본 세션 참조.)

---

## §9. 소유권 / 남은 일

- **템플릿 레인(완료)**: 라이브 Product/Hero + 본 문서. 온바디 시드의 `meta.post` 선언은 파이프라인 착지 시.
- **엔진/백엔드 레인(미착수, 사용자 승인·조율 필요)**: §5 잡큐·워커·faceswap 래퍼, §7 keyed-strip, §6 KIDS 거부. facefusion 코드는 **미수정**(CLI 호출만).
- push 금지(사용자 명시 승인 시만). 현재 worktree `feat/underwear-templates` (upstream/main 기반), 미커밋.
