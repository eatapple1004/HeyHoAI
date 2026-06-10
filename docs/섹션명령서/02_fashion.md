# 섹션 작업 명령서 — 패션 (key: fashion)

> 이 브리프 하나로 패션 섹션 착수 가능(self-contained). 작업 디렉터리 `~/HeyHoAI`. 상태 = **기존(existing)** — v2 7개 초안이 이미 `src/recipes/seeds/recipes.fashion.v2.js`에 존재. **임무 = 재도출이 아니라 검증·확정 + 산출물 스펙 마무리.**

---

## 1) 정체성

- **mode**: `product` (제품 사진 1장 업로드 → AI가 착장/정물/릴스 생성. 얼굴 셀카 아님)
- **subject**: `type: product` · `reference_strategy`는 **두 갈래** —
  - 정물·라이프스타일·릴스 = `product_composite` (업로드 의류를 씬에 합성)
  - 온모델 착용 = `on_model_tryon` (업로드 의류를 중립 모델에 입힘, +1 가산 → ◈5)
  - `min_refs: 1`
- **한 줄 정의**: 의류/슈즈/액세서리 셀러가 **플랫레이 한 장으로** 온모델 카탈로그·핏/사이즈 온바디·라이프스타일·드롭 릴스·360 정물을 노스킬로 뽑는 카탈로그.

## 2) 타깃 유저 & JTBD

- **누가**: 모델·포토그래퍼를 못 쓰는 DTC 의류·슈즈·액세서리 셀러, 쇼피파이/스마트스토어 PDP 운영자, 드롭형 스트리트/캐주얼 브랜드, IG·TikTok 피드 우선 셀러.
- **뭘 파나**: 의류(상·하의·아우터), 슈즈, 가방·액세서리.
- **매출에 필요한 컷(JTBD 우선순위)**:
  1. **핏/사이즈 온바디** — 패션 단일 최고 전환·반품률 직격(사이즈 불안 해소). **최우선.**
  2. **온모델 카탈로그** — PDP 본체. 플랫레이로는 입었을 때를 못 보여줌.
  3. **라이프스타일/UGC 감성** — 피드 스크롤 정지, 진정성 신호(◈2 진입).
  4. **드롭 릴스(Quick-Drop/GRWM)** — 신상 출시 알림, 같은 날 게시.
  5. **매크로 텍스처** — 프리미엄/원단 품질 증명(직조·스티치·하드웨어).
  6. **360 정물 스핀** — 드레이프·구성 전 각도 증명 → 반품 감소.

## 3) 현재 상태 — (기존) v2 초안 7개 [검증·확정 대상]

`recipes.fashion.v2.js`에 이미 구현됨. 표기 📷=image_set · 🎬=reel · ◈=크레딧 · ⚠️=사람검수/실험 · 🅣=텍스트 오버레이.

| # | 이름 | 타입 | 컷 | ◈ | reference_strategy | 플래그 |
|---|---|---|---|---|---|---|
| 1 | On-Model Studio | 📷 | 4 | 5 | on_model_tryon | ⚠️ (style_variants: clean_catalog/editorial_mood) |
| 2 | Fit & Size On-Body | 📷 | 4 | 5 | on_model_tryon | ⚠️🅣 (measurement 오버레이) |
| 3 | Lifestyle Scene Pack | 📷 | 4 | 2 | product_composite | — |
| 4 | Macro Texture Shots | 📷 | 4 | 2 | product_composite | — |
| 5 | Quick-Drop Teaser Reel | 🎬 | 2 | 4 | product_composite | — |
| 6 | GRWM Drop Reel | 🎬 | 3 | 6 | product_composite | ⚠️ |
| 7 | 360 Product Spin | 🎬 | 3 | 6 | product_composite | ⚠️ (제품 전용 턴테이블) |

가격 사다리: `I2 I2 I5 I5 · R4 R6 R6` — ◈2 진입 ✓, 싼 릴스 R4 ✓. 비용공식 위반 0(검증 완료).
**v1→v2 결정 이력**: Editorial Lookbook→On-Model Studio로 병합(style_variant 흡수), Fit&Size·Quick-Drop 신규 add, 360 reprice ◈8→◈6+제품한정, Macro reprice ◈3→◈2.

→ **임무: 위 7개를 "정답"으로 단정하지 말고 §4·§5로 한 번 더 발굴/선별 검증한 뒤, §6에서 7개(또는 선별 후 6~8개)의 산출물 스펙·레시피를 확정·마무리.**

---

## 4) ① 발굴 (Discover) — 패션 2026 트렌드·포맷 + 빠진 전환 프레임

현재 7개를 깔고, 빠진 칸을 메우는 후보를 풍부하게 브레인스톰. (이름 + 무엇을/왜 + 사진/영상 + 예상◈)

**A. 트렌드·플랫폼 포맷 (2026 IG Reels/TikTok/Shorts)**
- **Outfit Transition Reel** — 손가락 스냅/스핀으로 룩 A→룩 B 즉시 전환(틱톡 표준). 🎬 2샷 ◈4. (진단의 "아웃핏 전환 릴스" 명시 권고)
- **Styling Multi-Way** — 한 아이템 3가지 스타일링(레이어/벨트/슈즈 교체). 📷 4컷 ◈2 또는 🎬 3샷 ◈6.
- **Try-On Haul POV** — 거울 앞 POV로 여러 룩 연속 착용(GRWM의 사촌). 🎬 3샷 ◈6.
- **Flat-Lay Build Reel (ASMR)** — 아이템을 하나씩 놓아 코디 완성. 🎬 1~2샷 ◈2~4.
- **Drop Countdown Teaser** — 디테일 클로즈업 컷 → 풀룩 리빌, 출시 카운트다운. 🎬 1샷 ◈2 (현 Quick-Drop의 더 싼 버전).

**B. 구매 JTBD 빠진 전환 프레임**
- **Fit & Size On-Body** 🅣 — (이미 v2에 있음) 핏 각도 + cm/inch 콜아웃. **최우선 유지.**
- **Detail Construction Pack** — 안감·라벨·봉제·지퍼 등 "잘 만든 증거". Macro와 구분되는 "신뢰" 컷. 📷 4컷 ◈2.
- **Color/Variant Lineup** — 같은 아이템 컬러웨이 나란히(셀렉 유도). 📷 4컷 ◈2.
- **Scale on Body / Model Stats Card** 🅣 — 모델 키·착용 사이즈 텍스트 오버레이("178cm, M 착용"). 📷 4컷 ◈2.
- **Shoe/Bag On-Foot·On-Body** — 슈즈·가방 특화 착용샷(발·어깨걸이). 📷 4컷 ◈5(on_model_tryon).

**C. 정물·카탈로그 표준 컷**
- **On-Model Studio** (clean + editorial 변형) — PDP 본체. 📷 4컷 ◈5. (v2 유지)
- **Ghost Mannequin / Invisible Body** — 의류만 입체감 있게 떠 보이는 PDP 표준 컷. 📷 4컷 ◈2~5. (셀러 친숙도 높음 — 후보)
- **Macro Texture Shots** — 직조·스티치·하드웨어. 📷 4컷 ◈2. (v2 유지)
- **Lifestyle Scene Pack** — UGC 감성. 📷 4컷 ◈2. (v2 유지)
- **360 Product Spin** — 제품 전용 턴테이블. 🎬 3샷 ◈6. (v2 유지)

## 5) ② 선별 (Select) — 4축 평가 + 최종 권장

4축 = **커버리지 / 트렌드 / 원가-가치 / AI난이도**. 현 7개는 6.5/10 진단을 잘 반영하므로 **기본 7개 유지**, 단 아래 교체 1건을 적극 검토.

**축별 점검**
- **커버리지**: 온모델·핏/사이즈·라이프스타일·매크로·드롭릴·360 = 핵심 상업 컷 거의 덮음. **빠진 칸 = "아웃핏 전환"(틱톡 1순위 패션 포맷)**. GRWM Drop Reel이 일부 대체하나 transition 포맷은 별개.
- **트렌드**: GRWM·Quick-Drop은 2026 적합. 360은 정물 한정이라 안전.
- **원가-가치**: ◈2 진입 2종(Lifestyle·Macro) + 싼 릴스 R4(Quick-Drop) 존재 → 합격. 온모델 2개가 둘 다 ◈5라 미드(◈3) 공백 → 필요 시 한 개를 6컷 확장으로 ◈3화 검토(임의 가산 금지).
- **AI난이도**: 온모델 직물 모핑·손 보정(On-Model shot4, GRWM shot1·3)·360 회전 모핑이 위험군. 전부 ⚠️ 플래그·negative 강화·사람검수 이미 반영됨.

**keep / cut / merge / add 가이드 (확정 권장)**
- **keep (6)**: On-Model Studio · Fit & Size On-Body · Lifestyle Scene Pack · Macro Texture Shots · Quick-Drop Teaser Reel · 360 Product Spin.
- **검토 1 (replace 후보)**: **GRWM Drop Reel → Outfit Transition Reel** 교체 가능. GRWM은 얼굴/손 의존이 크고 influencer 카탈로그 GRWM과 무드 중복. 아웃핏 전환은 패션 고유·전환 직결. → **결정 옵션**: (a) GRWM 유지 + Transition을 8번째로 add(7→8개), (b) GRWM을 Transition으로 swap(7개 유지). **권장 = (a) add로 8개**(가격 사다리 여유 있음, R4 한 칸 더 추가 가능).
- **merge**: 추가 병합 불필요(Editorial은 이미 On-Model의 style_variant로 흡수됨).

**가격 사다리 (확정)**: ◈2 진입(Lifestyle/Macro) + 싼 릴스 R4(Quick-Drop) 필수 유지. 8개 확장 시 → `I2 I2 I5 I5 · R4 R4 R6 R6` 권장.

---

## 6) ③ 강화 (Enhance) — 산출물 스펙 + 레시피 (스키마 §끝 준수)

각 템플릿 "정확히 무슨 사진/영상을 만드는지" 확정. v2 시드 7개는 프롬프트가 이미 작성됨 → **검증·미세조정**. 신규 add 건만 스키마대로 신규 작성.

**패션 특유 AI 난이도 / 🅣 오버레이 주의 (필수 반영)**
- **온모델 직물 모핑**: 모델에 입힐 때 색/프린트/솔기/넥라인이 레퍼런스와 동일해야 함. `extra_positive`에 "garment color/print/seams/hardware identical to reference" 못박고, `negative`에 `warped/melted garment, mismatched color or print, extra seams, garment floating off body, mannequin look` 필수.
- **손 보정**: 의류 조정·들기 샷은 손가락 왜곡 위험 → `negative`에 `distorted hands, extra fingers, fused fingers` + 샷 지시에 "natural hands, five fingers" + `needs_human_review`.
- **360 모핑**: **반드시 제품 전용 턴테이블(모델 금지)**. negative `live model in frame, morphing garment during rotation, color shift during rotation`. shots 2→3에서 아티팩트 시 transition을 `smooth orbit`→`cut`으로 폴백.
- **🅣 사이즈 텍스트 = AI로 그리지 말 것**: Fit & Size On-Body의 사이즈/측정 콜아웃은 **오버레이 레이어**로만. `config.text_overlay: true`, `look.negative`에서 `text`/`logo` **제외**(전역 SAFETY_NEGATIVE와 충돌 방지), `meta.overlay_spec`에 `measurement_callouts`·`size_label` 명세. (현 v2 시드에 이미 올바르게 구현됨 — 검증만.)
- **신규 add(Outfit Transition / Model Stats Card)** 작성 시: Transition은 직물 모핑 위험 최상위 → 샷별 모션에 "no garment warp during transition" 명시 + ⚠️; Model Stats Card는 🅣 오버레이("178cm, M 착용")로 처리.

**산출물 스펙 요약 (검증·확정 대상, 한국어)**
| 이름 | 만드는 것(예측 가능하게) |
|---|---|
| On-Model Studio ⚠️ | 플랫레이→온모델 4컷: 정면 전신 / 3-4 측면 드레이프 / 미드워킹 / 디테일 크롭. clean_catalog·editorial 2변형. shot4 손 = QA. |
| Fit & Size On-Body ⚠️🅣 | 핏 강조 온모델 4컷: 정면(가슴·허리) / 3-4 후면(요크·밑단) / 측면 실루엣 / 허리·넥 매크로. + cm/inch·사이즈 라벨 오버레이. |
| Lifestyle Scene Pack | UGC 감성 35mm 필름 4컷: 거리 워킹 / 카페 / 골든아워 공원 / 창가 디테일. ◈2 진입. |
| Macro Texture Shots | 극접사 4컷: 직조 / 스티치 / 하드웨어 / 밑단·드레이프. raking light, 100mm macro. |
| Quick-Drop Teaser Reel | 2샷 9:16: 오버헤드 플랫레이 푸시인 → 착용 풀룩 리빌(cut, upbeat). ◈4. |
| GRWM Drop Reel ⚠️ | 3샷 9:16: 침대 플랫레이(손 진입) → 거울 앞 홀딩 → 풀룩 리빌(180° orbit, whip). 손·턴 QA. |
| 360 Product Spin ⚠️ | 3샷 9:16 제품 전용 턴테이블: 정면 → 3/4 → 측/후. even wraparound light, cut 폴백. |
| (add) Outfit Transition ⚠️ | 2샷 9:16: 룩 A → 스냅 전환 → 룩 B. 직물 모핑 negative 강화. ◈4. |

**레시피 작성 형식** = §끝 스키마 v1(A2 look + A5 shots) 그대로. 영어 프롬프트(엔진용) + 위 한국어 스펙(사람용) 2벌. 비용공식 준수.

## 7) 산출물 (Deliverables)

1. **`src/recipes/seeds/recipes.fashion.v2.js`** (절대경로 `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.fashion.v2.js`) — 7개 검증·확정. add 결정 시 8개로 갱신. `node`로 로딩·비용공식 검증 통과 필수.
2. **한국어 산출물 스펙** — §6 표를 확정본으로(각 컷이 무슨 사진/영상인지). `docs/템플릿_v2_발굴선별강화_결과.md`(절대경로 `/Users/jeon-yedam/HeyHoAI/docs/템플릿_v2_발굴선별강화_결과.md`)의 패션 섹션과 동기화.
3. **keep/cut/add 표** — §5 결정표 확정.
4. (동기화 권장) `docs/템플릿_한국어_카탈로그.md`, `public/_overview.html`의 패션 항목.

**keep / cut / add 표 (확정안)**

| 결정 | 항목 | 이유 |
|---|---|---|
| keep×6 | On-Model Studio, Fit&Size, Lifestyle, Macro, Quick-Drop, 360 | 핵심 상업 컷 커버·가격 정합·트렌드 적합 |
| keep/swap | GRWM Drop Reel | 유지하되 Outfit Transition과 무드 중복 여부 점검 |
| add(권장) | Outfit Transition Reel ⚠️ (🎬 2샷 ◈4) | 틱톡 1순위 패션 포맷·전환 직결, 현 세트 공백 |
| cut | (없음) | Editorial은 이미 On-Model style_variant로 흡수 완료 |

## 8) 착수 커맨드 (붙여넣기용)

`~/HeyHoAI에서 docs/명령서_템플릿_발굴선별강화.md와 docs/템플릿_v2_발굴선별강화_결과.md(패션 섹션)와 src/recipes/seeds/recipes.fashion.v2.js를 읽고, 이 패션 브리프의 ①발굴 ②선별 ③강화를 수행해. 기존 7개 v2(On-Model Studio·Fit&Size On-Body·Lifestyle·Macro·Quick-Drop·GRWM·360)를 4축으로 검증·확정하고, Outfit Transition Reel(2샷 ◈4) add 여부를 결정해 recipes.fashion.v2.js를 갱신(node 로딩·비용공식 검증)하고, 각 템플릿 한국어 산출물 스펙과 keep/cut/add 표를 확정해줘. 온모델 직물 모핑·손·360 모핑 negative와 Fit&Size 사이즈 텍스트=오버레이(🅣) 처리를 반드시 반영.`

---

## 공통 규칙 (인용)

- **노스킬**: 유저는 프롬프트 안 씀, 양식만 고름. 출력 2종 — 📷 image_set(보통 4장, 4:5) / 🎬 reel(샷수=count, 9:16).
- **스키마 v1** (A2 look + A5 shots): `{ mode, category, name, output_type, credit_cost, rationale, config:{ output{type,count,aspect_ratio}, subject{type:face|product|avatar, reference_strategy:identity_lock(face)|product_composite/on_model_tryon(product), min_refs}, look{style_preset, attributes[], wardrobe?, extra_positive, negative}, shot_strategy:'list', shots[{scene,pose,composition}], reel?{per_shot_motion[],duration_per_shot,transition,music_mood,captions}, provider{image:'nano-banana',video:'kling'} } }`
- **비용**: image_set=count×0.5 · reel=shots×2 · 온모델 착용 +1. (4장=◈2, 3샷릴=◈6, 온모델4장=◈5). 각 카탈로그에 ◈2 진입 + 싼 릴스(1~2샷 ◈2~4).
- **⚠️ 엔진**: 전역 SAFETY_NEGATIVE가 모든 렌더에 `text`/`logo` 주입 → 🅣(글자/브랜드) 템플릿은 글자를 AI로 그리지 말고 오버레이 레이어로(해당 negative에서 text/logo 제외 + `text_overlay:true`). 손가락/말하는입/360 온모델은 negative 강화 + 사람검수.
- **2벌**: 영어 프롬프트(엔진용) + 한국어 설명(사람용). 마켓 전략 = 공식 우선(이 세트가 출시 카탈로그 본체).

**참고 파일(절대경로)**: 마스터 `/Users/jeon-yedam/HeyHoAI/docs/명령서_템플릿_발굴선별강화.md` · v2 결과 `/Users/jeon-yedam/HeyHoAI/docs/템플릿_v2_발굴선별강화_결과.md` · v2 시드 `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.fashion.v2.js`
