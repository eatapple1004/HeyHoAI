# 08 펫 — 작업기록 / 분석·결정 로그 (총지휘 read-surface)

> 목적: pet 워커 세션의 **검증 결과·분석·제안**을 파일시스템 백본에 남겨 총지휘가 바로 읽게 함.
> 진실원천 = `src/recipes/seeds/recipes.pet.v2.js`. 이 문서는 그 위의 **결정 기록**.
> 갱신일 **2026-06-10**. 작업단위: pet v2 검증·확정 + 전수 포트폴리오 감사.

---

## 0) 현재 상태 (한눈에)

| 항목 | 상태 |
|---|---|
| 시드 `recipes.pet.v2.js` | ✅ 6개 확정, **변경 없음** (검증만 수행) |
| consolidate 검증 | ✅ pet = OK (node 로딩·비용공식·전역 이름 고유·중복0 통과) |
| 가격 사다리 | ✅ `I2 I2 I2 I5 · R6 R4` (◈2 진입 3개 + 싼 릴스 R4) |
| 🅣 오버레이 규약 | ✅ Pet Product Hero: `text_overlay:true` + negative서 text/logo 제외 |
| ⚠️ 모핑 플래그 | ✅ On-Pet Fit·Talking Pet Skit = `experimental`+`needs_human_review` |
| **커버리지 감사 결과** | ⚠️ **현 6개로는 전 고객 미충족** (~55–60%, 아래 §2) |
| **개선 제안** | 🔶 **PROPOSAL (미반영)** — 승인 시 시드 반영 (아래 §3) |

---

## 1) 확정된 6개 (KEEP) — 변경 없음

| # | 이름 | 타입 | 컷 | ◈ | 역할 |
|---|---|---|---|---|---|
| 1 | Pet Product Hero 🅣 | 📷 | 4 | 2 | 펫 없이 제품 단독 클린 히어로(합성위험0) — ◈2 진입 앵커·최광폭 |
| 2 | Cuddle Hour | 📷 | 4 | 2 | 제품+반려동물 옆 포근 라이프스타일(소프트굿즈·휴식) |
| 3 | Macro Crunch | 📷 | 4 | 2 | 먹이·입자질감 극접사(간식·사료·모래·바닥재) |
| 4 | On-Pet Fit ⚠️ | 📷 | 4 | 5 | 웨어러블 펫 착용 핏(`on_model_tryon`) — experimental·검수 |
| 5 | Wait For The Zoomies | 🎬 | 3 | 6 | 장난감 반응 고에너지 릴 |
| 6 | Talking Pet Skit ⚠️ | 🎬 | 2 | 4 | 토킹펫 코믹 UGC(샷1 B롤+샷2 토킹) — experimental·검수 |

비용공식 정합(image=count×0.5, on_model 4컷=◈5, reel=shots×2) 전수 통과. 전역 이름 충돌 0. **On-Pet Fit ◈5 = "+1"이 아니라 `on_model_tryon` 4컷=◈5 고정관례(전 섹션 동일)** — 정정 기록.

---

## 2) 전수 커버리지 감사 (현 6개 → 전 고객 만족?) = **아니오 (~55–60%)**

펫 제품 전수 ≈ **488품목 / 16카테고리 / 8동물군**(개·고양이·말/조랑말·미니피그·포켓펫·조류/가금·파충류/양서류·곤충/무척추·수생).

**만족도 양극화:**
- 정적 제품샷이 가치 전부인 SKU(식품·간식·소프트가구·번들) → **70–85%**
- 동작·기능화면·스케일·환경·전후증명이 전환을 좌우하는 SKU(테크/스마트11·종특화환경15·작동디바이스10) → **20–35%**

**4대 구조갭:**
1. 🔴 **사람손 일반 영상 UGC 전무** — 붓기 ASMR·언박싱·핸드툴 시연·1회분 데모. 펫 영상이 장난감반응(Zoomies)·토킹(Talking)뿐이라 커머스 최빈 포맷 "사람이 제품 쓰는 영상"을 누구도 못 만듦.
2. 🔴 **테크/계기 UI 합성 슬롯0** — `SAFETY_NEGATIVE`가 화면글자 차단 → GPS·펫카메라·스마트칼라·자동급식/화장실·온습도계·테스트키트의 "작동 화면·데이터"(전환 트리거) 불가.
3. 🟠 **스케일/면적감 부재** — Hero 고립단품은 5kg=20kg 동일하게 보임 → 대용량백·캣타워·가구·대형평면매트의 "내 공간에서의 크기" 못 줌.
4. 🟠 **서식지 환경연출 부재** — 수조·비바리움·테라리움을 건식 Hero로 찍으면 "빈 어항". Macro는 먹이 극접사 전용이라 수중·습지 생태감 불가.

미봉: 듀얼니즈(착용+각인 ID태그·말 할터 네임플레이트), 사람착용 용품(트릿파우치·글러브·메모리얼 주얼리), 시즌 기후무드(쿨링베스트·말담요).

---

## 3) PROPOSAL — 6→12 (미반영 · 사용자 승인 시 시드 적용)

### 3-1) rework 2 (순수 cut 0 — 적대적 검증이 orphan으로 전부 반려)
| 템플릿 | 진단 | 조치 |
|---|---|---|
| Wait For The Zoomies | 최고원가 ◈6 × 장난감 단일카테고리 × 질주컷 모션블러 위험(원가·폭 비율 최악) | 3샷◈6 → **2샷◈4**, 고속질주 opt-in(기본=저속 근접반응), 펫-장난감 인터랙션 비트 보존 |
| On-Pet Fit | ◈5 × 신뢰도 최저(모핑高) × 웨어러블 1카테고리(위험대비 최취약) | 기본 4컷◈5 유지·**고위험 풀바디 1컷 옵션화**, 사이즈/각인은 신규 ◈2로 분산 |

### 3-2) 신규 6 (전부 적대적 검증 통과 · 비용공식 정합)
| 신규 | 타입·◈ | 산출물 | 메우는 갭 | 우선 |
|---|---|---|---|---|
| Single-Hero Sizzle Reel | 🎬1샷 ◈2 | 제품단독 1샷 즉시게시 릴(물흐름·디스펜싱 단일동작) | 릴 최저가 부재 | must |
| Hands-On Pour & Unbox Reel | 🎬2샷 ◈4 | 사람손 붓기·언박싱·핸드툴/1회분 데모 | 갭① | must |
| Device UI Mockup Set 🅣 | 📷4 ◈2 | 디바이스+화면UI 합성(앱·지도·LCD수치, 화면 오프/오버레이) | 갭② | must |
| In-Room Scale Set 🅣 | 📷4 ◈2 | 룸 컨텍스트+크기 레퍼런스(대용량백·캣타워·가구·매트) | 갭③ | strong |
| Habitat Scene Set | 📷4 ◈2 | 수조/비바리움/테라리움 서식지 무드(제품1종 기준 일관렌더) | 갭⑦ | strong |
| Pet Wearable Spec Sheet 🅣 | 📷4 ◈2 | 펫부재 사이즈가이드/각인 매크로(하네스·할터·ID태그 듀얼) | 갭④·On-Pet 위험분산 | strong |

> 개명: 원제안 'On-Pet Size & Spec Guide' → **Pet Wearable Spec Sheet**(펫 미착용인데 'On-Pet' 접두가 `On-Pet Fit`과 혼동). `Single-Hero Sizzle Reel`도 `Pet Product Hero`와 혼동 여지 → 등록 직전 재점검.

### 3-3) 반려 2 (적대적 검증 탈락)
- `Human Wear & Carry Set` — 사람 몸 착용은 `on_model_tryon=◈5`(jewelry `Wrist & Hand`·fashion `Fit & Size On-Body`·beauty `On-Model Glow Drop` 캐논). ◈2 product_composite 책정은 **비용공식 위반**. job(사람착용 펫용품·갭⑤)은 실재 → **◈5+experimental로 재제출** 시 가능.
- `Before & After Proof Set` — beauty `Before/After Result Reel`·home `Empty-to-Styled Reveal`·general `Flat-Lay Grid(before_after)`로 **이미 3중 커버** + 펫 외형 모핑리스크([08_pet.md §4] 'Before/After Grooming' 기각 이력). **general 변형으로 우회 권고**.

### 3-4) 결과 카탈로그 6→12 · 비용사다리 검산
- 📷 image_set ◈2 진입 앵커 7개(무위험 진입 충분).
- 🎬 릴 사다리: **◈2(Sizzle 신설)** · ◈4(Pour&Unbox) · ◈4(Zoomies rework) · ◈4(Talking) → **'싼 릴스 1샷◈2' 규칙 비로소 충족**(확장 전 최저 릴 = ◈4 Talking, experimental뿐이라 미충족이었음).
- on-model ◈5(On-Pet Fit) 보존, 임의가산 0건.

### 3-5) 잔존 한계 (확장 후에도)
사람-온모델 ◈5 슬롯(트릿파우치·메모리얼 주얼리) · before/after 효과증명 · 시즌 기후무드 · 대형동물(말/미니피그) 착용 신뢰샷 · 테크 "실제 작동영상" · 노스킬 12개 선택피로(추천 디폴트 큐레이션 필요).

---

## 4) 교차섹션 ACTION (총지휘 처리)
- **[pet→general]** 펫 before/after는 펫 전용 신설 대신 general `Flat-Lay Grid`의 `before_after` 변형(image_set) 노출로 우회 → general 워커와 조율.
- **[캐논]** 사람착용(on_model) 슬롯은 ◈5+experimental로 통일(`Wrist & Hand` 등) — 펫 'Human Wear & Carry Set' 재제출 시 정합 확인.
- **[적용 전]** 신규 6개 이름 **77개 전수 exact-match grep** + 위 개명 확정 선행.

## 5) 다음 (사용자 승인 대기)
- **A)** 신규 6개 풀 스펙(영어 프롬프트+샷리스트+negative) 작성 + 시드 append
- **B)** rework 2개(Zoomies 2샷·On-Pet 풀바디 옵션화) 시드 반영
- **C)** must 3개만 최소확장(9개)
적용 시 §3-4 비용사다리·77개 이름 grep 재검증 후 `_결과.md`·`_카탈로그.md`·`_overview.html` 동기화 + consolidate 재실행.

---

## 6) 프롬프트 정밀화 — 死필드 negative 이관 (2026-06-10, prompt-negatives 워커)

> 명령서: `docs/섹션명령서/PROMPT_프롬프트정밀화_명령서.md`. 작업단위 = pet 12개 전부.
> 진실원천 `recipes.pet.v2.js` 수정. **파일만 저장(commit/push 금지).**

### 의도
`look.negative`(死필드, resolver 미파싱 → 엔진에 안 닿음) 12/12개를 `look.extra_negative`(resolver L148 live 필드)로 **이관 + 정제**. 이관 전에는 live `/api/recipes`가 커스텀 네거티브 없이(SAFETY만) 생성 중이었음.

### 바꾼 필드 (템플릿별)
| # | 템플릿 | 핵심 정제 |
|---|---|---|
| 1 | Pet Product Hero | SAFETY `blurry` 제거; `distorted packaging/wrong proportions/blown highlights` 보강 |
| 2 | Cuddle Hour | SAFETY `watermark/blurry/deformed/extra limbs` 제거 → 펫특화 `extra or missing legs/fused paws/unnatural fur` |
| 3 | Macro Crunch | `watermark` 제거; 음식특화 `over-sharpened halos/unappetizing dull color/blown specular` 보강 |
| 4 | On-Pet Fit | **negative에 잘못 섞인 긍정문 제거**(`no warped muzzle`·`correct limb count`·`natural fur no melting`); SAFETY `deformed/extra limbs/watermark` 제거 → `distorted pet anatomy/warped muzzle/fabric fused or melting into fur` |
| 5 | Wait For The Zoomies | `watermark/deformed` 제거; 릴 identity `product drifting or morphing between frames` 추가 |
| 6 | Talking Pet Skit | **긍정문 4건 제거**(`no warped muzzle`·`correct limb count`·`natural fur no melting`·`no human-like mouth morph`); `lip-sync desync/tooth morph/pet identity drift` 정렬 |
| 7 | Single-Hero Sizzle Reel | SAFETY 중복 없음; `product morphing mid-action` 보강 |
| 8 | Hands-On Pour & Unbox Reel | SAFETY `extra fingers/deformed hand/watermark` 제거 → 명령서 §3 손가락 가드 `six or more fingers, fused or webbed fingers` |
| 9 | Device UI Mockup Set 🅣 | `text` 포함 `readable screen text` 제거(전역 SAFETY 처리) → `screen showing rendered content instead of blank placeholder` |
| 10 | In-Room Scale Set 🅣 | SAFETY 중복 없음; `incorrect scale relative to surrounding furniture` 보강 |
| 11 | Habitat Scene Set | negative 속 지시문 정리(`no animals…` → `unrequested live animals introducing morph risk`); `murky dirty water` 추가 |
| 12 | Pet Wearable Spec Sheet 🅣 | SAFETY 중복 없음; `warped buckles or D-ring hardware` 보강 |

### 근거
- dedup 대상 = **SAFETY_NEGATIVE_PROMPT 뿐**: pet 시드가 쓰는 style_preset(`Editorial/Lifestyle/Macro`)이 DB `style_presets` 시드에 부재 → resolver L100에서 preset = 빈 기본값(`preset.negative=''`). 즉 합성 negative = `'' + extra_negative + SAFETY`.
- text_overlay 4개(#1·9·10·12): extra_negative에서 text/logo 제외 + 각 `render_notes`에 "SAFETY_NEGATIVE가 text/logo 전역 처리" 명시(명령서 §🅣).

### 검증 (DoD)
- `grep -c '"negative":' recipes.pet.v2.js` = **0** ✅ (extra_negative=12, 死 look.positive=0)
- extra_negative 값 내 SAFETY 중복 스캔(watermark/text/logo/deformed/blurry/extra fingers/…) = **0건** ✅
- `node scripts/consolidate_recipes.js` = pet **중복0·이름고유·node로딩 통과**. 잔존 "이슈"는 개수 12(권장 6~8) **사전 권고뿐**(승인대기 포트폴리오, 내 변경과 무관·이름/비용/스키마 불변).
- `git diff` = negative/extra_negative·render_notes·헤더 changelog만. 카드계약(name/credit_cost/output_type/count/style_preset) **불변**.

### ⚠️ 총지휘 인계(후속, 이번 스코프 외)
- **[엔진/시드 정합]** pet의 `style_preset` 값 `Editorial/Lifestyle/Macro`가 DB `style_presets`에 미존재(시드는 Natural/Fashion/Cinematic/Portrait/… 만). 현재 preset.prefix/suffix/negative가 전부 공백으로 적용됨 — **pet 한정 아닌 전 섹션 가능성**. 엔진/시드 총지휘 확인 필요.
- **[품질갭 task #2/#3]** extra_positive 정밀화(릴/토킹 identity 첫머리 `CRITICAL: same product/pet…`, #8 손 긍정 `single well-formed hand, exactly five natural fingers`)와 text_overlay `meta.overlay_spec` 추가는 이번 negative 이관 스코프 밖 — 미반영.
- **[export]** 명령서 §5.8 구조화 CSV/Excel export는 `scripts/export_recipe_prompts.js`(신설 예정) 일괄 처리 대기 — 단독 생성 안 함.

### 적대적 리뷰 (3렌즈) + 보정
3개 독립 리뷰어(SAFETY중복 / 긍정문·text·logo누출 / 섹션완전성)로 적대적 검증 후 반영:
- ✅ **긍정문 누출 0건**(#4·#6 정제 확인) · **text_overlay text/logo 누출 0건**.
- 🔧 **SAFETY 중복 제거**: #2·#4·#5의 `extra or missing legs/paws` → SAFETY `extra limbs`와 중복이라 제거(각 항목의 `(warped/distorted) pet anatomy` 캐치올이 결손 커버).
- 🔧 **identity 가드 추가**: #5 Zoomies에 `pet identity drift between frames` 추가(#6 패턴 정합, 2샷 연속성) · #8에 `hand features changing between frames` 추가.
- 🟡 **기각(근거 있음)**: #8 손가락 가드(`six or more fingers, fused or webbed fingers, wrong finger count`)는 리뷰어가 SAFETY 중복으로 지적했으나 **명령서 §3이 손 노출 템플릿에 대해 `six fingers, fused/webbed digits`를 extra_negative에 넣도록 명시적으로 지시** → 손 렌더 고위험 보강 의도로 **유지**(명령서 직접 지시 > 일반 dedup).
- 재검증: `grep '"negative":'`=0 · SAFETY중복 스캔 0 · node 12개 로딩 · consolidate 통과.

---

## 7) 프롬프트 정밀화 — extra_positive + overlay_spec (2026-06-10, 동일 워커)

> 명령서 task #2/#3(품질갭). negative 이관(§6)에 이어 진행. 진실원천 `recipes.pet.v2.js`. **파일만 저장.**

### 바꾼 것
- **extra_positive 12/12 정밀화** — 하우스 톤(fashion On-Model 골드스탠다드) 정합: lens+F-stop, key/fill/rim 라이팅, reference lock("identical to reference … shape/color/proportions/label/hardware") 명시.
- **identity 보강** — 멀티프레임 #4·5·6·8 첫머리 `CRITICAL: same product/pet across all frames, no morph/drift`.
- **손 긍정** — #8 `single well-formed hand, exactly five natural fingers, anatomically correct grip`(손톱 문구는 fingertip-crop과 모순이라 제외 — 아래 검증 참조).
- **text_overlay 4개(#1·9·10·12)** — extra_positive에 합성영역 확보 문구 + `meta.overlay_spec`(fashion/general 형태 `layer/elements/font/position`) 추가.

### 판단으로 보류한 것 (근거)
- **music_mood 구조화(bpm/악기)**: 명령서 §3 🟡 nice-to-have이나 **11섹션 어디도 미적용**(전부 짧은 감정 디스크립터) + 다운스트림 태그 정합 위험 → 하우스 일관성 우선으로 **보류**. 현행 pet music_mood는 이미 동일 스타일.

### 적대적 리뷰(3렌즈: 모순/방법론/품질) + 보정
- 🔧 **#8 모순(HIGH)**: `visible fingernails` ↔ `fingertips out of frame` 직접 모순 → 손톱 문구 제거 + `50mm f/5.6` 보강.
- 🔧 **#5·#6 lens/f-stop 누락(HIGH)**: `50mm f/2.8`(#5), `35mm f/2.8`(#6) + 라이팅 key/fill 보강.
- 🔧 **#6 비대칭(MED)**: negative의 lip-sync/tooth morph(프레임간) 대응 → positive에 `consistent mouth and tooth shape across both frames` 추가. 이후 97단어 → 필러 트리밍.
- 🔧 **#11 방어갭(MED)**: live animals positive 미명시 → `plants and static substrate only, no live animals in frame` 추가.
- 🔧 **#10 f-stop(LOW)**: `at f/8` 추가.
- 🟡 **기각**: quality렌즈 "CRITICAL이 문장 중간에 묻힘"은 **사실오류**(#4·5·6·8 전부 `CRITICAL:`로 시작) · 펫 해부학 명시 "중복 제거"는 morph 방지 의도라 유지 · #2 rim light 강제는 자연광 씬에 부자연이라 보류.

### 검증
- node 로딩 12개 · 死필드 0 · identity 프리픽스 #4·5·6·8 ✅ · overlay_spec 4/4 ✅
- `grep '"negative":'`=**0** 유지 · extra_positive 최대 단어수 ≤90(하우스 norm) · `consolidate` 통과(중복0, pet "이슈"=개수12 권고뿐)
- 카드계약(name/credit_cost/output_type/count) 불변.

---

## 8) 보고 — Pet Product Hero 테스트 통과 + 어울리는 제품 (2026-06-10, pet 워커 → 총지휘)

### Pet Product Hero (#1) — 검증/QA 전 항목 PASS
| 체크 | 결과 |
|---|---|
| node 로딩 | ✅ PASS |
| output | image_set 4컷 4:5 |
| 비용공식 ◈2 (count×0.5) | ✅ PASS |
| shots수 = count (4/4) | ✅ PASS |
| 死필드 `negative` 제거 + live `extra_negative` 이관(§6) | ✅ PASS |
| 🅣 `text_overlay:true` + extra_negative text/logo 누출 0 | ✅ PASS |
| extra_positive 정밀화 + `overlay_spec`(§7) | ✅ PASS |
| consolidate 개별 이슈 | ✅ 0 (섹션 `draft(이슈)`는 **개수 12>8 권고**일 뿐 이 템플릿과 무관) |

### 어울리는 제품 (best-fit) — *"펫·사람 없이 제품만 깨끗하게 보여줘도 사고 싶은 것"*
펫 488품목 중 **절반 이상**을 커버하는 최광폭 ◈2 진입 템플릿. 포장·형태·브랜딩이 셀링포인트인 **비착용 하드굿즈** 전반:
- 📦 **포장 소모재** — 사료백·습식캔·파우치, 간식·츄 패키지, 곤충젤리·발효매트
- 🧴 **보틀·튜브** — 영양제·서플먼트, 샴푸·세정제, 페로몬 디퓨저, 탈취제
- 🍽 **급여·급수 기구** — 식기·급수기·정수기·자동급식기·헤이넷
- 🏠 **가구·하우징** — 캣타워·스크래처·하우스·크레이트·케이지·펜스
- 🚗 **이동·여행** — 캐리어·이동장·유모차·카시트
- ✂️ **그루밍 기기** — 브러시·발톱깎이·드라이어·이발기
- 📟 **테크 외형** — GPS·펫카메라·스마트칼라·자동화장실 (기기 외형만)
- 🦎 **사육 기자재** — 파충류 사육장·히터·UVB, 아쿠아 수조·여과기
- 🎁 **기프트·DIY** — 구독박스·기프트셋·DIY 원료/키트·메모리얼 굿즈·ID태그 각인 클로즈

### 경계 (Hero보다 다른 템플릿 권장)
간식 식감→`Macro Crunch` · 착용 핏→`On-Pet Fit` · 펫 동반 감성→`Cuddle Hour` · 크기감(대용량백·캣타워)→`In-Room Scale Set` · 작동 화면(테크)→`Device UI Mockup Set` · 수조 서식지 무드→`Habitat Scene Set`.

> 🅣 사이즈/스펙 글자는 AI 미생성 → `overlay_spec` 레이어로 합성.
