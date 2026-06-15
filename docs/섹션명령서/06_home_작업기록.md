# 06 홈 & 리빙 — 작업기록 / 분석·결정 로그 (총지휘 read-surface)

> 목적: home 워커 세션의 **검증 결과·분석·제안**을 파일시스템 백본에 남겨 총지휘가 바로 읽게 함.
> 진실원천 = `src/recipes/seeds/recipes.home.v2.js`. 이 문서는 그 위의 **결정 기록**.
> 갱신일 **2026-06-10**. 작업단위: home v2 검증·확정 + 전수 커버리지 감사.

---

## 0) 현재 상태 (한눈에)

| 항목 | 상태 |
|---|---|
| 시드 `recipes.home.v2.js` | ✅ 7개(포트폴리오 §3안 반영). **프롬프트 정밀화 완료** — 네거티브 死필드 이관 + extra_positive identity + overlay_spec + flags 정합 (§5·§6·§7) |
| consolidate 검증 | ✅ home = OK (node 로딩·비용공식·전역 이름 고유 통과, 비용 불변) |
| 가격 사다리 | ✅ `I2 I3 I3 · R4 R6 R6` (◈2 진입 + 싼릴 R4) |
| 🅣 오버레이 규약 | ✅ Scale & Dimensions: `text_overlay:true` + extra_negative서 text/logo 제외 + render_notes + **meta.overlay_spec 신설**(§6) |
| **커버리지 감사 결과** | ⚠️ **현 6개로는 전 고객 미충족** (아래 §2) |
| **개선 제안** | 🔶 **PROPOSAL (미반영)** — 승인 시 시드 반영 (아래 §3) |

---

## 1) 확정된 6개 (KEEP) — 변경 없음

| # | 이름 | 타입 | 컷 | ◈ | 역할 |
|---|---|---|---|---|---|
| 1 | Room & Warmth Styled | 📷 | 6 | 3 | 동경 룸씬(아침~골든아워) — 병합(Quiet Luxe+Golden Hour) |
| 2 | Material Detail Suite | 📷 | 6 | 3 | 소재 매크로 3 + 톤 플랫레이 3 — 병합(Macro+Flatlay) |
| 3 | Scale & Dimensions Frame 🅣 | 📷 | 4 | 2 | 치수 오버레이(반품 방지) — ◈2 진입 |
| 4 | Quick Warmth Snap | 🎬 | 2 | 4 | 싼 감성 릴 — **약체(아래 §3 교체 대상)** |
| 5 | Empty-to-Styled Reveal | 🎬 | 3 | 6 | 빈방→꾸민방 변신 — 확정 위너 |
| 6 | Slow ASMR Detail | 🎬 | 3 | 6 | 슬로우 소재 매크로 모션 |

비용공식 정합(image=count×0.5, reel=shots×2) 전수 통과. 전역 이름 충돌 0(로드되는 v2 카탈로그 기준).

---

## 2) 전수 커버리지 감사 (현 6개 → 전 고객 만족 가능?) = **아니오**

home 제품 전수 ≈ **180품목 / 7축**(가구·조명·데코오브제·테이블웨어·텍스타일·그린향·수납소형가전). 8개 클러스터 만족도:

| 클러스터 | 만족도 | 최대 미충족 컷 |
|---|---|---|
| 그린·향 | 🟢 80% | 향초 점등(조명과 공유) |
| 테이블웨어·주방 | 🟡 65% | 흰배경 단독 히어로 |
| 멀티컬러 변형군 | 🟡 62% | 색상/옵션 비교 그리드 |
| 대형 가구 | 🟡 58% | 라이프스타일 사용 맥락 |
| 데코 소형 오브제 | 🟡 55% | 흰배경 PDP, 색상 그리드 |
| 텍스타일 | 🟡 55% | 컬러웨이 그리드 |
| **수납·생활** | 🟠 **40%** | **용량·기능 시연** |
| **조명** | 🔴 **25%** | **점등(ON)·야간 분위기** |

**핵심 진단**: 현 6개는 전부 *낮·밝은·정적 관찰 모드* → **점등 / 기능 / 색상비교** 3대 축이 비어 있음. 조명·수납이 blocker.

---

## 3) 개선 제안 (PROPOSAL — 미반영, 승인 후 시드 반영)

> 제안 에이전트 신규 2개(Day-to-Night, Lifestyle Furniture) 중 **Lifestyle Furniture는 적대검증 기각**(home 정체성=사람 없음 위반). 검증 반영한 최종안 = **카탈로그 6→7, 비대화 최소**.

### 약체 템플릿 (삭제·개편)
- 🔻 **Quick Warmth Snap (🎬2샷 ◈4)** — 카탈로그 최약체. Room & Warmth와 무드·라이팅 **중복**, 2샷으로 무증명, 짐벌+f/2.0는 사실상 ◈6 난이도(◈4 허위 가성비). → **교체.**

### 변경안 (net +1)
| 액션 | 템플릿 | 타입/◈ | 메우는 갭 |
|---|---|---|---|
| **교체** | Quick Warmth Snap → **Day-to-Night Lighting Reveal** | 🎬2샷 ◈4 | 조명 blocker(점등·야간). 순증 0, 싼릴 R4 유지. ⚠️엔진=제품 발광체 야간 렌더 필요 |
| **추가** | **Variant Showcase Grid** ★신규 | 📷4컷 ◈2 | 멀티컬러/마감 비교(제품 55~60%가 멀티-SKU). 적대검증이 유일하게 ADD 승인 |

### editable_slot으로 흡수 (신규 템플릿 ❌ — 안티-비대화)
시즌 리스타일 · 스타일 스왑 · 대형가구 구조 매크로 · 선반 스타일링 · 라이프스타일 스케일 · 화분 그리드 → Room & Warmth / Material Detail의 `editable_slot` 변형.

### 추가하지 말 것 (검증 근거)
| 후보 | 기각 사유 |
|---|---|
| Lifestyle Furniture (사람 사용) | home 정체성 위반 — 사람/실루엣도 신체 프롭(브리프가 Cozy Hands 자른 리스크) |
| Cozy Hands B-roll | 동일(손가락 리스크) |
| Single-Object Hero (흰배경 PDP) | 실제 니즈지만 **shopping 카탈로그 Studio Lookbook(◈2)이 이미 커버** → home은 "공간 맥락" 차별성 유지 |
| Functional Storage Reveal | 서랍 열기·정리에 손 필요 → 정체성 위반. 수납은 Scale+Material+Room 조합으로 |
| Shoppable Tour Pan | 다제품 모핑·공간 일관성 리스크 |

### 제안 적용 시 최종 사다리 (7개) — 재검증 ✓
```
📷 ◈2  Scale & Dimensions Frame 🅣
📷 ◈2  Variant Showcase Grid        ★신규
📷 ◈3  Room & Warmth Styled
📷 ◈3  Material Detail Suite
🎬 ◈4  Day-to-Night Lighting Reveal ★교체 (← Quick Warmth Snap)
🎬 ◈6  Empty-to-Styled Reveal
🎬 ◈6  Slow ASMR Detail
```
✓ ◈2 진입 2개 · ✓ 싼릴 R4 · ✓ 개수 7∈[6,8] · ✓ 비용공식 정합

---

## 4) 후속 (승인 대기)

- [ ] **승인 시** 시드 반영: Variant Showcase Grid 추가 + Quick Warmth→Day-to-Night 교체 → `node scripts/consolidate_recipes.js` 재검증 → 전역 이름 고유 확인
- [ ] 반영 후 `docs/템플릿_한국어_카탈로그.md`(home 섹션 6→7) + `docs/템플릿_v2_발굴선별강화_결과.md`(home keep/cut/add) 동기화
- [ ] 엔진 의존 노트: ① Scale 치수 오버레이(기존) ② **Day-to-Night 야간 발광 렌더**(신규) — `imagePrompt.builder.js`/렌더 파이프라인 확인 필요
- [ ] 현재까지 **시드 미변경** — 위 §3은 의사결정 대기 상태

> 분석 근거 원본: 본 세션 워크플로 3건(전수열거 / 커버리지감사 / 적대검증). 총지휘는 이 문서로 home 현황·제안을 즉시 파악 가능.

---

## 5) 프롬프트 정밀화 패스 — 네거티브 死필드 이관 (2026-06-10, prompt worker)

> 명령서 `PROMPT_프롬프트정밀화_명령서.md` 기준. **핵심 임무 = 죽은 필드 `look.negative` → 엔진이 읽는 `look.extra_negative`(resolver L148) 이관 + 정제.**
> 근거: resolver `buildPrompt`는 `look.extra_negative`만 negative에 합성(L148: `preset.negative + look.extra_negative + SAFETY_NEGATIVE_PROMPT`). `look.negative`는 미파싱 死필드 → 기존 네거티브가 live `/api/recipes` 생성에 안 닿고 있었음.

### 바꾼 것 (7개 전 템플릿)
- `"negative":` → `"extra_negative":` 키 이관 + 내용 정제. **이름/credit_cost/output_type/shots/스키마 불변** (카드계약·비용 불변).
- **SAFETY 전역 중복어 제거**: `imagePrompt.builder.js`의 `SAFETY_NEGATIVE_PROMPT`가 `text, watermark, logo, deformed, extra fingers, bad anatomy …`를 전역 자동주입 → 각 네거티브에서 공통 들어있던 `text artifacts, watermark, logos` 3종 제거(이중주입 방지). 섹션 특화 결함어는 전부 보존.
- **text_overlay**: Scale & Dimensions Frame(#3)은 원래부터 text/logo 미포함(의도적) → 그대로 이관. `meta.render_notes`의 `look.negative` 참조 → `look.extra_negative`로 정합 갱신.
- 파일 헤더 주석에 v2.1 이관 요약 + AI-risk note의 死필드 참조 갱신.

| # | 템플릿 | 이관 후 보존한 특화 결함(요지) | 제거(SAFETY중복) |
|---|---|---|---|
| 1 | Room & Warmth Styled | cluttered busy room, floating furniture, cold blue cast, melted edges … | text artifacts, watermark, logos |
| 2 | Material Detail Suite | soft out-of-focus, oversharpen halos, tilted flatlay, props overlapping hero … | text artifacts, watermark, logos |
| 3 | Scale & Dimensions Frame 🅣 | unknown floating objects, cluttered room, fake reflections … (text/logo 원래 없음) | — (이미 clean) |
| 4 | Day-to-Night Lighting Reveal | unlit/dead-black night shot, candle wick dark, glow 누락, day too dark/night too bright … | text artifacts, watermark, logos |
| 5 | Empty-to-Styled Reveal | room geometry change, jittery motion, morphing walls, inconsistent cut lighting … | text artifacts, watermark, logos |
| 6 | Slow ASMR Detail | fast/jerky motion, focus hunting, invented surface patterns, color shift … | text artifacts, watermark, logos |
| 7 | Variant Showcase Grid | invented/fantasy colors, color drift, mixed products, multiple variants in one frame … | text artifacts, watermark, logos |

### 검증 (DoD)
- ✅ `grep -c '"negative":' src/recipes/seeds/recipes.home.v2.js` = **0** (死필드 잔여 0).
- ✅ `grep -c '"extra_negative":'` = **7** (live 필드 전수).
- ✅ SAFETY 중복어(watermark/logo/text/extra fingers/deformed …) 잔존 0건 — 정규식 검사 clean.
- ✅ `node scripts/consolidate_recipes.js` → home = **OK**(7개), 중복 이름 없음, 비용공식/스키마 불변. (beauty/pet 이슈는 개수 관련·타 워커 담당, 본 변경과 무관.)
- extra_positive는 이번 패스 범위 외(死필드 이관에 집중). home은 손/얼굴/identity 노출 거의 없어(제품 모드) 정밀화 우선순위 낮음 — 기존 extra_positive 이미 풍부(렌즈/F값/라이팅/reference lock 포함).

### git/후속
- **파일만 저장. commit/push 안 함**(총지휘/Chief 수거·머지).
- 구조화 export(`export_recipe_prompts.js`)는 명령서상 "신설 예정"(총지휘 일괄) — 스크립트 미존재로 본 워커 미수행, 시드가 진실원천.

---

## 6) 프롬프트 정밀화 패스 2 — extra_positive / overlay_spec / flags (2026-06-10, prompt worker)

> 명령서 DoD 잔여 항목 처리: ① extra_positive identity 정밀화 ② text_overlay overlay_spec 신설 ③ provisional flags 정합. **이름/credit/output_type/shots/비용 불변**(카드계약 불변).

### 결정 근거 (정찰 기반)
- **music_mood 구조화는 의도적으로 미적용.** 11섹션 전수 grep 결과 어느 섹션도 `genre+bpm+instruments` verbose 포맷을 안 씀 — 전부 `"warm uplifting lo-fi"`류 짧은 하우스 스타일. home 3개 릴(`warm uplifting lo-fi`/`calm ambient evening`/`calm ambient ASMR`)도 이미 정합 → verbose 변환 시 **섹션 간 export 불일치** 유발하므로 현행 유지. (resolver L169: music_mood는 프롬프트가 아니라 reel 메타로 통과 → AI 품질 영향 0.)
- **hand/wardrobe 보강 미적용.** home은 제품 모드 — 손/얼굴/identity 노출 없음(파일 헤더 AI-risk note). 카메라 디테일(렌즈·F값·라이팅)은 기존 extra_positive에 이미 풍부 → 추가 정밀화 불요.
- 정밀화 레버 = **cross-frame product identity lock**(타 섹션의 실제 적용 패턴 `consistent locked facial identity across…`의 제품판 등가).

### 바꾼 것
| # | 템플릿 | 변경 | 근거 |
|---|---|---|---|
| 1 | Room & Warmth Styled | extra_positive: hero 뒤 `identical product identity held across all six shots` 보강(light) | 6컷 멀티샷 일관성 |
| 3 | Scale & Dimensions Frame 🅣 | **meta.overlay_spec 신설**(layer=post_render_dimension_overlay, W/D/H dimension_callout 3요소+arrow, font/SAFETY note) + extra_positive에 `reserved area for composited dimension callouts and measurement arrows` 자리확보 | DoD "text_overlay=overlay_spec 존재" 충족(general/ugc 패턴 정합). text/logo는 전역 SAFETY 처리(extra_negative 미포함 유지) |
| 4 | Day-to-Night Lighting Reveal | extra_positive 첫머리 prominent lock `SAME product in both shots — identical geometry/material/color, only lighting state changes, no morph or drift` | before/after 릴 = 제품 동일성이 결과물 핵심 |
| 5 | Empty-to-Styled Reveal | extra_positive 첫머리 `SAME product across all shots — locked geometry/material/color, consistent room geometry, no morph or drift` | before/after 변신 릴 동일성 |
| 6 | Slow ASMR Detail | extra_positive: `consistent identity across all reel frames` 보강(light) | 3컷 릴 매크로 일관성 |
| 7 | Variant Showcase Grid | extra_positive 첫머리 `SAME product silhouette/geometry across all 4 shots — only color/finish variant changes, never shape/angle/framing` + **meta.flags `["experimental"]`·render_notes 추가** | 변형 비교 = 실루엣 동일·색만 변경이 핵심. provisional+고난이도(recoloring) → 검수 롤업 노출(#4 needs_human_review[엔진 blocker]와 구분) |

(2·#2 Material Detail Suite는 기존 `product kept exact… as hero throughout`로 이미 일관성 명시 → 중복 보강 안 함.)

### 검증 (DoD)
- ✅ `grep -c '"negative":'` = **0** 유지(死필드 잔여 0).
- ✅ extra_positive 7 / extra_negative 7 / overlay_spec 1 / node 파싱 7개.
- ✅ extra_positive에 SAFETY 토큰(watermark/logo/deformed 등) 혼입 0. (#3 'callouts/arrows'는 빈 자리 확보 문구 — AI가 글자 그리라는 지시 아님, ugc 선례와 동일.)
- ✅ provisional 정합: Day-to-Night[needs_human_review] · Variant Grid[experimental].
- ✅ `node scripts/consolidate_recipes.js` → home **OK(7)**, 비용공식/스키마/중복 불변.
- 🔍 적대검증 워크플로 4축(SAFETY중복 / 엔진조립 / 기저보존(무회귀) / 하우스컨벤션) 실행 — 결과 §7.

---

## 7) 적대검증 결과 + 반영 (2026-06-10, 4-lens workflow)

독립 4-lens 적대검증(에이전트 4·tool 69회) 실행. **3축 PASS clean, 1축이 minor 2 + nit 2 제기:**

| Lens | 판정 | 요지 |
|---|---|---|
| SAFETY 중복 | ✅ PASS | extra_negative/positive 7개 전수 SAFETY 토큰 혼입 0. #3 text/logo 미포함·reserved-area 문구 정상. |
| 엔진 조립 정합 | ✅ PASS | 死필드 0, extra_*는 string·joinClean 정합, composition 28개 전부 유효값, 프롬프트 임계내용 meta에 안 둠. |
| 기저 보존(무회귀) | ✅ PASS | 7개 전수 SAFETY 3종만 삭제·섹션 특화 결함 전부 보존, identity lock은 additive(기존 내용 미삭제·미모순). |
| 하우스 컨벤션 | ⚠️ minor2+nit2 | 아래 처리. |

**처리:**
- ✅ **반영(minor)** — flags 정합: 하우스 지배 패턴 `["experimental","needs_human_review"]`(18×)에 맞춰 #4·#7 둘 다 combo로. 둘 다 NEW(experimental)+"validate before enabling for automated generation"(needs_human_review). 뉘앙스(엔진 emissive blocker vs variant fidelity 검증)는 각 render_notes 보유.
- ✅ **반영(nit)** — #1 `…as the styled hero, identical across all six shots`(중복 'product' 제거), #6 `…with locked identity across all reel frames`('consistent' 중복 제거).
- ❌ **미반영(minor, 근거 있음)** — overlay_spec object-배열 형태: 리뷰어는 "general은 string배열"이라 했으나 **ugc.v2.js가 이미 object-배열(per-element position) 사용** → 하우스 두 변형 공존, 치수 콜아웃(W/D/H 축별 화살표)엔 ugc형이 적합. 리뷰어도 "intentional, not an error" 인정. overlay_spec.note에 이유 명시 → 현행 유지.

**최종 재검증**: 死필드 grep=0 · provisional 2개 모두 `["experimental","needs_human_review"]` · `consolidate` home=OK(7)·중복0·비용불변.

---

## 8) Room & Warmth 형제 템플릿 브레인스톰 (2026-06-13, 5-lens workflow)

> 사용자 요청: "Room & Warmth Styled가 마음에 듦 → 비슷한 템플릿 더." 5개 렌즈(미학스타일·빛/시간·공간타입·시즌·포맷)로 20개 발산 → 중복통합·신규vs슬롯 분류·가치순. **시드 미변경(아이디어 기록만).**

**핵심 결론**: 20개 중 **18개 = Room & Warmth의 `editable_slot` 변형**(추가 비용 0, 카탈로그 비대화 X) · **신규 템플릿은 단 2개만 정당화**.

### editable_slot 변형 (Room & Warmth 1개에 variant_config로 흡수 — 가치순)
- **미학 스타일**: Minimalist/Scandi · Japandi · Mid-Century Modern · Bohemian · Industrial Loft
- **방 타입**: Bedroom Sanctuary · Kitchen & Dining Hero · Study Nook · Entryway/Balcony · Patio(◈2 4컷)
- **빛·날씨**: Dappled Garden(나뭇잎 그림자) · Blue Hour Serenity · Rainy Window/Morning Mist
- **시즌·이벤트**: Seasonal Palette(봄/여름/가을/겨울) · Holiday Festive(Q4) · Housewarming(집들이)
- **구도**: Styled Shelf Breakdown(선반 스타일링) · Domestic Macro Textiles(→Material Detail 슬롯, lived-in raking light)

### 신규 템플릿 후보 (진짜 다른 JTBD — 2개)
| 후보 | 타입/◈ | 왜 신규(슬롯 흡수 불가) |
|---|---|---|
| **Morning Light Study** | 📷6 ◈3 | WFH 홈오피스 "생산성+미" = '동경 거주'와 다른 JTBD. 골든아워 없이 *주광만*·쿨뉴트럴 톤 → Room & Warmth 무드와 상충 |
| **Twilight Corner Glow** | 📷6 ◈3 | 조명 *점등(ON) 정적 탐색*. Day-to-Night(릴=토글 데모)와 보완: 이건 "이미 켜진 저녁을 산다"는 무드 정물 |

**제안 우선순위(안티-비대화)**: Phase1 = 슬롯 18개를 Room & Warmth/Material Detail의 `variants[]` 메타로 점진 unlock(하드코드 X). 신규 2개는 가치 검증 후에만 별도 슬롯(추가 시 home 9개=32◈, 상한 내). → 사용자에겐 "1개 템플릿으로 20개 룩" 경험.

> 근거 원본: 본 세션 워크플로 `room-warmth-siblings`(5렌즈 생성 + 합성). 상세 아이디어/프롬프트 방향은 워크플로 산출물 참조.

---

## 9) ⚠️ 로컬 테스트 반영 — 형제 20종 시드 materialize (2026-06-14, EXPERIMENTAL)

> 사용자 요청("테스트해보게 싹 로컬에 반영, git 미터치")로 §8 형제 20종을 **풀 레시피로 시드에 임시 추가**해 studio에서 실제 확인. **이것은 영구 결정이 아니라 로컬 검증 상태다.** 정식 반영은 안티-비대화상 `variants[]` 슬롯 설계가 정답(§8).

**상태**: `recipes.home.v2.js` = **27개**(기존 7 + 형제 20). 신규 20개 전부 `meta.experimental:true`, `meta.sibling_of:"Room & Warmth Styled"`, `sort_order 100+`. image_set 18×◈3 + 2×◈2(Patio·Housewarming). 이름 전역 고유 0충돌.

**파이프라인 재생성(로컬)**: `consolidate_recipes.js`(_STATUS 총계) → `recipe_card_contract.js`(proposed.json, drift OK) → `export_recipe_cards.js`(recipes.generated.js). studio Shopping→Home 필터에 27카드 노출 확인(스크린샷). resolve 경로(`/api/recipes/:id/resolve`)도 6잡 프롬프트 정상 생성 검증.

**⚠️ consolidate 부작용**: home 6~8 규율 위반(27개 → draft 표기). 이는 의도된 로컬 실험 상태.

**되돌리기(git 미사용)**: 백업 디렉터리 `.siblings-test-backup/` 에 원본 5파일 보관 →
`recipes.home.v2.js · _STATUS.md · _CATALOG.json · _card_contract.proposed.json · recipes.generated.js` 를 복원하면 7개 정식 상태로 원복. (복원 후 `consolidate` 재실행 권장.)

**로컬 테스트 계정**(DB 생성): `sibtest@local.test` / `Test1234!` — studio 로그인용(로컬 전용, 정리 시 삭제 가능).
