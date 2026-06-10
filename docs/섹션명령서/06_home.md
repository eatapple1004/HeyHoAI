# 섹션 작업 명령서 — 홈 & 리빙 (key: home)

> 이 브리프 하나로 home 카탈로그 작업을 착수할 수 있도록 작성됨(self-contained). 작업 디렉터리 `~/HeyHoAI`, 브랜치 `feat/ux-monetization-v2`. 표기: 📷=image_set · 🎬=reel · ◈=크레딧 · ⚠️=사람검수/실험 · 🅣=텍스트 오버레이 의존.

---

## 1) 정체성

- **mode**: `product`
- **subject**: `type: product` · `reference_strategy: product_composite` · `min_refs: 1` (제품 사진 1장 → 룸/디테일 합성)
- **상태**: **existing** — v2 초안 6개가 이미 `src/recipes/seeds/recipes.home.v2.js`에 존재 (전부 스키마 §끝 준수, node 로딩·비용공식 검증 통과). 이번 작업 = **검증·확정 + 산출물 스펙 마무리.**
- **한 줄 정의**: 가구·데코·홈웨어 셀러가 제품 사진 1장만 올리면 "세트 대여 없이" 동경할 만한 룸 씬·소재 매크로·실제 치수 증명·전후 변신을 AI로 만들어 주는, **9개 카탈로그 중 AI 난이도가 가장 낮은(손·얼굴·글자 없음) 정물 강자 세트.**

---

## 2) 타깃 유저 & JTBD

**누가 쓰나**: 인테리어 가구(소파·조명·테이블)·데코 소품(화병·러그·아트)·홈웨어(세라믹·니트·우드·린넨) 셀러. 스마트스토어/쿠팡/자사몰/인스타 운영, 스튜디오 촬영 예산 없음. "제품 컷은 있는데 '공간에 놓인 모습'이 없어서 안 팔린다"가 핵심 고통.

**뭘 팔고, 어떤 컷이 매출에 필요한가** (이 카탈로그 특유의 전환 프레임):

1. **룸 씬(공간 맥락)** — "내 방에 놓으면 이렇게 예쁘다"는 동경 컷. 가구/조명은 단독 컷으로는 절대 안 팔리고, **공간에 놓인 라이프스타일 컷이 add-to-cart의 1순위 트리거.**
2. **소재 매크로(재질 증명)** — 세라믹 유약·니트 직조·우드 그레인·린넨 텍스처. 홈웨어 가격 정당화 = "이 질감이 보여야 비싸 보인다."
3. **스케일/치수(방 안 크기)** — 가구 반품 #1 사유 = "생각보다 크/작았다." **"이게 우리 집에 들어올까?"** 불안 해소가 직접 전환·반품률 직결. → 치수는 AI로 글자 그리지 않고 **오버레이**.
4. **before/after 변신(위너)** — 빈 방 → 꾸민 방. 저장·공유율 최고, 피드 도달의 엔진. v1부터 확정된 위너 템플릿.
5. **감각 매크로 모션(ASMR)** — 슬로우 소재 클로즈업 릴. 프리미엄 무드·체류시간(watch-time) 확보, 럭셔리 톤.

---

## 3) 현재 상태 (existing — v2 초안 6개를 검증·확정)

`src/recipes/seeds/recipes.home.v2.js`에 실재하는 v2 초안 목록 (이름 · 타입 · 컷 · ◈ · 변경이력):

| # | 이름 | 타입 | 컷 | ◈ | v2 변경 | 비고 |
|---|---|---|---|---|---|---|
| 1 | Room & Warmth Styled | 📷 image_set | 6 | 3 | **merge** (Quiet Luxe Room + Golden Hour Corner) · 4→6컷 · ◈2→◈3 | mid-tier |
| 2 | Material Detail Suite | 📷 image_set | 6 | 3 | **merge** (Macro Texture Pop + Tonal Flatlay Set) · 4→6컷 · ◈3 유지 | mid-tier |
| 3 | Scale & Dimensions Frame 🅣 | 📷 image_set | 4 | 2 | **NEW** · `text_overlay:true` · ◈2 진입 | 치수 오버레이 |
| 4 | Quick Warmth Snap | 🎬 reel | 2 | 4 | **NEW** · 싼 릴스 | budget reel |
| 5 | Empty-to-Styled Reveal | 🎬 reel | 3 | 6 | **KEEP** (v1 무변경) | 확정 위너(전후 변신) |
| 6 | Slow ASMR Detail | 🎬 reel | 3 | 6 | **KEEP** (v1 무변경) | 감각 매크로 |

**가격 사다리(현 v2, 검증 완료·위반 0)**: `I2 I3 I3 · R4 R6 R6` — ◈2 진입 ✓ · 싼 릴스 R4 ✓ · 미드티어 ◈3 두 개(6컷 확장으로 정직하게 부여).

→ v1 4개 중복 정물(Quiet Luxe / Golden Hour / Macro Texture / Tonal Flatlay)을 2개 6컷 세트로 병합 완료. 이번 작업은 **이 6개의 산출물 스펙을 한국어로 확정하고, 시드의 프롬프트/샷리스트가 스펙과 정합하는지 검증·다듬는 것.**

---

## 4) ① 발굴 (Discover) — 2026 트렌드·포맷 + 빠진 전환 프레임

home 카탈로그에 특화된 후보를 폭넓게 브레인스톰(이름 + 무엇을 + 사진/영상 + 예상◈). 현 v2 6개로 이미 커버되는지/추가 가치 있는지 ②에서 판정.

| # | 후보 이름 | 무엇을 / 왜 | 사진/영상 | 예상◈ |
|---|---|---|---|---|
| C1 | Room & Warmth Styled | 미니멀 룸 씬 + 골든아워 통합 (동경 공간 컷) | 📷 6컷 | 3 |
| C2 | Material Detail Suite | 소재 매크로 + 톤 플랫레이 (재질·카탈로그 증명) | 📷 6컷 | 3 |
| C3 | Scale & Dimensions Frame 🅣 | 실제 크기 증명 + 치수 콜아웃 오버레이 (반품 방지) | 📷 4컷 | 2 |
| C4 | Empty-to-Styled Reveal | 빈 방→꾸민 방 before/after (저장·공유 위너) | 🎬 3샷 | 6 |
| C5 | Slow ASMR Detail | 슬로우 소재 클로즈업 (체류시간·럭셔리) | 🎬 3샷 | 6 |
| C6 | Quick Warmth Snap | 싼 감성 2샷 릴(디테일→풀백) (저비용 진입) | 🎬 2샷 | 4 |
| C7 | Seasonal Restyle Set | 동일 제품을 봄/여름/가을·겨울 데코로 재스타일링 — 계절 캠페인 재사용 (2026 트렌드: 시즌 리스타일) | 📷 4~6컷 | 2~3 |
| C8 | Day-to-Night Lighting | 같은 룸을 자연광 낮 → 따뜻한 조명 밤으로 (조명·무드 제품에 강함) | 🎬 2샷 | 4 |
| C9 | Styling Swap Carousel | 1제품을 미니멀/보헤미안/모던 3스타일로 다르게 연출 (인스타 캐러셀 저장 유도) | 📷 4컷 | 2 |
| C10 | Cozy Hands B-roll ⚠️ | 손이 쿠션/머그/담요를 매만지는 감각 B롤 (TikTok cozy ASMR) — **손가락 리스크** | 🎬 1~2샷 | 2~4 |
| C11 | Shoppable Tour Pan | 룸을 좌우 패닝하며 여러 제품 훑기 (룸 투어 포맷) | 🎬 2~3샷 | 4~6 |
| C12 | Single-Object Hero | 무배경/순색 PDP 히어로 4컷 (배경 클린 제품 단독) | 📷 4컷 | 2 |

**플랫폼 포맷 메모(2026)**: cozy/소재 ASMR·룸 투어·시즌 리스타일·"이 코너 이렇게 바꿨어요" before/after·POV 데코 셋업이 home에서 잘 됨. talking-head/립싱크는 home에 부적합(제품 모드·사람 없음).

---

## 5) ② 선별 (Select) — 4축 평가 → 최종 6개 확정

**4축**: 커버리지(핵심 상업 컷 다 덮나/중복 없나) · 트렌드(2026 통하나) · 원가-가치(비용·부하·가치 정합, ◈2 진입 있나) · AI 난이도(현 모델로 실현 가능).

**권장 결정**: 현 v2 6개(C1~C6)를 **그대로 최종 확정**. 추가 후보(C7~C12)는 아래 사유로 keep/cut/merge/add 판정.

| 후보 | 결정 | 4축 이유 |
|---|---|---|
| C1 Room & Warmth | **keep** | 커버리지: 동경 룸 씬 핵심. 트렌드 ✓. 원가: 6컷=◈3 미드 정직. 난이도 최저(글자·손 없음). |
| C2 Material Detail | **keep** | 재질 증명 = 홈웨어 가격 정당화 필수. 매크로+플랫레이 통합으로 중복 제거. 난이도 최저. |
| C3 Scale & Dimensions 🅣 | **keep** | 반품 방지 = home 고유 전환 프레임. 단 치수는 **오버레이 필수**(AI 글자 금지). ◈2 진입 앵커. |
| C4 Empty-to-Styled | **keep** | 확정 위너(저장·공유 최고). before/after JTBD 유일. ◈6 정합. |
| C5 Slow ASMR Detail | **keep** | 감각 JTBD 별도. 체류시간·럭셔리. ◈6 정합. |
| C6 Quick Warmth Snap | **keep** | 싼 릴스 티어(R4) 충족 — "가장 싼 영상이 ◈6" 문제 해소. |
| C7 Seasonal Restyle | **cut→merge 후보** | 매력적이나 C1 룸씬과 무드 근접. 출시 후 `editable_slots`(계절 변형)로 흡수 권장, 신규 슬롯 X. |
| C8 Day-to-Night | **cut** | C6 Quick Warmth(따뜻한 조명)와 무드 중복. 조명 제품 강세지만 슬롯 가치 낮음. |
| C9 Styling Swap | **cut→merge 후보** | C1을 `parent_id` 변형으로 흡수 가능. 단독 슬롯 불필요. |
| C10 Cozy Hands B-roll ⚠️ | **cut(보류)** | home의 최대 강점=손 없음(난이도 최저)인데 손가락 리스크 유입 → 카탈로그 정체성 훼손. 출시 후 ⚠️ 실험 슬롯으로만. |
| C11 Shoppable Tour | **cut** | 다제품 룸 패닝은 모핑·공간 일관성 리스크. 현 모델 난이도↑, 후순위. |
| C12 Single-Object Hero | **cut** | tech Void Hero와 역할 겹치고 home은 "공간 맥락"이 차별점 → 무배경 히어로는 약함. |

**keep/cut/merge/add 가이드 요약**: 추가 슬롯 없이 6개 확정. 미래 확장은 **신규 템플릿이 아니라 `editable_slots`/`parent_id` 변형**(Seasonal·Styling Swap)으로 흡수 — 카탈로그 비대화 방지 + home의 "안전·정물 강자" 정체성 유지.

**가격 사다리(확정)**: `📷 I2(Scale) · I3(Room) · I3(Material) · 🎬 R4(Quick) · R6(Empty) · R6(ASMR)`
- ◈2 진입(Scale & Dimensions) ✓ — 노스킬 무료체험감.
- 싼 릴스(Quick Warmth R4) ✓ — Kai 리텐션 드립 가능.
- 미드티어 ◈3 두 개는 **임의 가산이 아니라 6컷 확장으로 정직하게** 부여(비용공식 정합).

---

## 6) ③ 강화 (Enhance) — 산출물 스펙 + 레시피 핵심

각 템플릿이 "정확히 무슨 사진/영상을 만드는지"를 사람이 결과를 예측 가능하게 정의. 현 시드의 영어 프롬프트(라이팅/렌즈/씬/무드/구도 + negative + 샷리스트)는 이미 작성됨 — 아래 산출물 스펙과 정합하는지 확인·미세조정.

### 1. Room & Warmth Styled 📷 6컷 ◈3
**산출물**: 동경할 만한 아파트 룸에 제품을 히어로로 놓은 6컷. **아침 디퓨즈광 → 골든아워 따뜻함** 스펙트럼을 한 세트로. 컷별 씬: ①라임워시 벽·오크 바닥 거실 코너(아침 디퓨즈, 정면 full) ②3/4 측면 깊이(아트북·식물로 스케일, medium) ③해질녘 리딩누크+플로어 램프(라이브드인, medium) ④풀백 와이드 전체 방(여백, full) ⑤골든아워 창가(긴 그림자·렌즈 플레어, medium) ⑥백라이트 선반·앰버 보케(얕은심도, closeup).
**레시피 핵심**: 35mm full-frame, 35mm @ f/4, editorial real-estate/lifestyle 매거진 품질. soft window diffuse→golden hour, warm neutral greige/amber, matte plaster·linen·oak. 제품 shape/material/color 정확 유지, 바닥 contact shadow 사실적.
**negative**: warped/duplicated product, distorted proportions, cluttered room, harsh flash, blown highlights, fake reflections, floating furniture, melted edges, plastic CGI, oversaturated, cold blue cast.

### 2. Material Detail Suite 📷 6컷 ◈3
**산출물**: 재질을 증명하는 극접사 3컷 + 톤 플랫레이 3컷. ①raking light 표면 디테일(직조/그레인/유약, closeup) ②엣지·심 마감(closeup) ③시그니처 텍스처 풀프레임(closeup) ④린넨 위 90° 탑다운 히어로(미니멀 톤 프롭, medium) ⑤스톤 탑다운 off-center 여백(rule-of-thirds, medium) ⑥드라이보태니컬·세라믹 큐레이티드 플랫레이(full).
**레시피 핵심**: 텍스처샷=100mm macro @ f/8 focus-stacking, raking 측면광으로 fiber/grain/crackle 노출, true-to-material color. 플랫레이=50mm 90° 탑다운, soft even overhead, 동일 팔레트 프롭(linen/stone/botanical/ceramic).
**negative**: soft OOF subject, warped/duplicated, invented patterns, plastic CGI sheen, blown highlights crushing texture, color shift, oversharpen halos, noise, tilted flatlay, clashing colors, props overlapping hero.

### 3. Scale & Dimensions Frame 📷 4컷 ◈2 🅣
**산출물**: 제품을 클린 중립 룸에 놓고 **친숙한 스케일 레퍼런스(2인 소파 등)**와 함께 4앵글로 찍어, 렌더 후 오버레이로 치수 콜아웃(예 W120 × D45 × H75cm) 부착. ①정면 풀폭(주변 바닥 보임, full) ②측면 깊이·벽 간격(full) ③45° 하이앵글 바닥 풋프린트(full) ④상단/폭 레퍼런스 클로즈(medium).
**🅣 오버레이 주의 (이 테마 핵심 난이도)**: **프롬프트에 숫자·글자 절대 넣지 말 것.** `config.text_overlay:true`, `look.negative`에서 `text`/`logo` **제외**(전역 SAFETY_NEGATIVE가 자동 주입하므로 중복 충돌 방지), `meta.render_notes`에 결정적 오버레이 파이프라인(화살표 주석·치수 텍스트는 렌더 후 합성) 명시. → **현 시드에 이미 정확히 구현됨**, 검증만.
**negative**(시드대로): warped/duplicated, distorted proportions, cluttered room, floating objects, harsh flash, blown highlights, fake reflections, melted edges, plastic CGI, oversaturated. (text/logo 의도적 제외)

### 4. Quick Warmth Snap 🎬 2샷 ◈4
**산출물**: 저비용 감성 릴. 샷1 따뜻한 창가/우드 사이드테이블 제품 클로즈(closeup) → 샷2 풀백으로 린넨 스로·식물과 함께 스타일된 전체 제품(medium).
**레시피 핵심**: 50mm @ f/2.0, golden hour soft window, creamy bokeh, warm amber/greige, soft grain. **샷별 모션**: ①warm 디테일로 slow gentle push-in ②styled 룸으로 smooth pull-back. duration 3s/shot, transition fade, music "warm lo-fi chill", captions auto.
**negative**: fast jerky motion, warped/duplicated, harsh flash, cold blue cast, blown window, plastic CGI, flicker, morphing surfaces.

### 5. Empty-to-Styled Reveal 🎬 3샷 ◈6 (위너 KEEP)
**산출물**: 빈 코너 → 제품 등장 → 완성된 방 before/after 변신. ①sheer 커튼 채광 빈 코너(제품 없음, full) ②제품이 히어로로 놓이는 순간(medium) ③러그·식물·책·램프로 완성된 코지룸(3/4, full).
**레시피 핵심**: 24mm wide @ f/4, smooth gimbal, soft natural window light, 동경 메이크오버 무드, **샷 간 공간·조명 일관성 필수**. **샷별 모션**: ①빈 코너 slow push-in ②제품 안착 match-cut ③완성룸 gentle pull-back. duration 3s, transition whip, music "warm uplifting lo-fi".
**negative**: room geometry changing between shots, warped/duplicated, jittery, harsh flash, plastic CGI, flickering, morphing walls, inconsistent lighting between cuts.

### 6. Slow ASMR Detail 🎬 3샷 ◈6 (KEEP)
**산출물**: 텍스처·장인정신에 머무는 슬로우 감각 매크로 릴. ①소재 표면 글라이딩(closeup) ②엣지/심 롤링 포커스(closeup) ③시그니처 디테일 슬로우 리빌(closeup).
**레시피 핵심**: 100mm macro @ f/4, ultra-slow gliding, soft directional key, shallow rolling focus, dust-free, true-to-material color, calm meditative luxury. **샷별 모션**: ①표면 ultra-slow lateral glide ②엣지 slow rack focus pull ③light sweep로 hero gentle slow tilt. duration 3s, transition fade, music "calm ambient ASMR".
**negative**: fast/jerky motion, warped/duplicated, invented patterns, plastic CGI sheen, blown highlights, focus hunting, flicker, color shift, distorted proportions.

**이 테마 특유 AI 난이도 메모**: home은 **9개 카탈로그 중 가장 안전**(손가락·얼굴·말하는입·360 온모델 전혀 없음) → ⚠️ 사람검수 플래그 불필요. **유일한 난이도 = Scale & Dimensions의 🅣 치수 오버레이**(AI로 글자 그리면 깨짐 → 반드시 오버레이 레이어). 부차 리스크: Empty-to-Styled의 샷 간 공간 일관성, ASMR/매크로의 표면 모핑(negative로 방어).

---

## 7) 산출물 (Deliverables)

1. **`src/recipes/seeds/recipes.home.v2.js`** (절대경로: `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.home.v2.js`) — 이미 6개 존재. 산출물 스펙과 정합 검증 후 필요 시 프롬프트/샷리스트 미세조정. node 로딩 + 비용공식(image=count×0.5, reel=shots×2) 재검증.
2. **한국어 산출물 스펙** — §6 그대로(각 템플릿 무슨 컷을 몇 개, 씬/구도/무드). `docs/템플릿_한국어_카탈로그.md`·`public/_overview.html`의 home 섹션 동기화.
3. **keep / cut / add 표**:

| 결정 | 항목 |
|---|---|
| **keep (확정)** | Room & Warmth Styled, Material Detail Suite, Scale & Dimensions Frame 🅣, Quick Warmth Snap, Empty-to-Styled Reveal, Slow ASMR Detail |
| **merge (완료)** | Quiet Luxe Room + Golden Hour Corner → Room & Warmth · Macro Texture Pop + Tonal Flatlay → Material Detail |
| **cut** | Seasonal Restyle/Styling Swap(→`editable_slots` 변형 흡수), Day-to-Night, Cozy Hands B-roll⚠️, Shoppable Tour, Single-Object Hero |
| **add** | (없음 — 6개로 충분, 후속 확장은 변형 슬롯으로) |

4. **엔진 의존 노트**: Scale & Dimensions Frame `text_overlay:true` 1개 — `src/images/imagePrompt.builder.js`에 템플릿별 negative 분리 + 오버레이 합성 레이어 구현 필요.

---

## 8) 착수 커맨드 (붙여넣기용)

> `~/HeyHoAI`에서 `docs/명령서_템플릿_발굴선별강화.md`와 이 브리프, 그리고 `src/recipes/seeds/recipes.home.v2.js`·`docs/템플릿_v2_발굴선별강화_결과.md`를 읽고, home(홈 & 리빙) 카탈로그 v2 6개(Room & Warmth Styled / Material Detail Suite / Scale & Dimensions Frame🅣 / Quick Warmth Snap / Empty-to-Styled Reveal / Slow ASMR Detail)를 **검증·확정**하라. 각 템플릿의 한국어 산출물 스펙을 확정하고, 시드의 프롬프트/샷리스트가 스펙과 정합하는지·비용공식(image=count×0.5, reel=shots×2)·가격사다리(I2 I3 I3 · R4 R6 R6)를 재검증하라. Scale & Dimensions는 `text_overlay:true` + negative에서 text/logo 제외 + render_notes 오버레이 명세가 유지되는지 확인하고, 글자/숫자를 프롬프트에 넣지 마라(오버레이 레이어 전담).

---

## 공통 규칙 (모든 섹션 동일 — 참고용 짧은 인용)

- **철학**: 노스킬 — 유저는 프롬프트 안 쓰고 양식만 고름. 출력 2종: 📷 image_set(보통 4장, 4:5) / 🎬 reel(샷수=count, 9:16).
- **스키마 v1 (A2 look + A5 shots)**: `{ mode, category, name, output_type, credit_cost, rationale, config:{ output{type,count,aspect_ratio}, subject{type:face|product|avatar, reference_strategy:identity_lock(face)|product_composite(product), min_refs}, look{style_preset, attributes[], wardrobe?, extra_positive, negative}, shot_strategy:'list', shots[{scene,pose,composition}], reel?{per_shot_motion[],duration_per_shot,transition,music_mood,captions}, provider{image:'nano-banana',video:'kling'} } }`
- **비용**: image_set=count×0.5, reel=shots×2, 온모델 착용 +1. (4장=◈2, 6장=◈3, 2샷릴=◈4, 3샷릴=◈6). 각 카탈로그에 ◈2 진입 + 싼 릴스 두기.
- **⚠️ 엔진**: 전역 SAFETY_NEGATIVE가 모든 렌더에 'text','logo' 주입 → 글자/브랜드 템플릿(🅣)은 AI로 글자 그리지 말고 오버레이 레이어로(해당 템플릿 negative에서 text/logo 제외). home은 손/얼굴/360 온모델 없음 → 추가 사람검수 negative 불필요.
- **2벌**: 영어 프롬프트(엔진용) + 한국어 산출물 설명(사람용). 마켓 전략=공식 우선(이 세트가 출시 카탈로그 본체).
- **참고 파일**: 마스터 `/Users/jeon-yedam/HeyHoAI/docs/명령서_템플릿_발굴선별강화.md` · v2 결과 `/Users/jeon-yedam/HeyHoAI/docs/템플릿_v2_발굴선별강화_결과.md` · v2 시드 `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.home.v2.js`
