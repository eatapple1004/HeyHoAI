# 섹션 작업 명령서 — 푸드 & 카페 (key: food)

> 이 브리프 하나로 food 섹션 착수 가능(self-contained). 작업 디렉터리 `~/HeyHoAI`, 브랜치 `feat/ux-monetization-v2`. 목적 = food 카탈로그 v2 **검증·확정 + 산출물 스펙 마무리**(엔진 미연결 → 프롬프트·샷리스트로 명세 확정).

---

## 1) 정체성
- **mode**: `product` (제품 모드 — 유저가 음식/음료 사진 1장 업로드)
- **subject**: `type: product` · `reference_strategy: product_composite` · `min_refs: 1` (얼굴 identity_lock 아님 — 음식 자체를 합성 기준으로)
- **한 줄 정의**: 카페·레스토랑 운영자가 **음식/음료 사진 한 장**으로 배달앱 썸네일·메뉴 카드·인스타 무드컷·지글 ASMR 릴스를 자동 생성하는, **음식 리얼리즘 + 식욕 자극(crave-trigger)** 중심 제품 카탈로그.

## 2) 타깃 유저 & JTBD
- **누가**: 독립 카페/브런치/레스토랑/길거리음식·디저트 사장(소규모 F&B), 배달앱 입점 셀러, F&B 마케터·소셜 운영자.
- **뭘 파나**: 단품 메뉴·음료·디저트·세트. 핵심은 "**맛있어 보임 → 클릭/주문**" + "분위기 → 방문 유도".
- **매출에 필요한 컷(JTBD)**:
  1. **배달앱·메뉴보드 탑다운 썸네일** — 작은 크기에서 즉시 인지(주문 전환 1순위).
  2. **드립/스팀 매크로(군침 트리거)** — 흐르는 소스·피어오르는 김·치즈풀 → 정지 이미지 전환율 최고.
  3. **노을 카페 무드** — "분위기를 파는" 공간 마케팅, 인스타 리치 견인.
  4. **서빙/테이블 인물 맥락** — 손이 접시를 놓는 "실제 순간" → 저장·공유율 최고, 인간적 온기.
  5. **메뉴/가격 카드** — F&B가 가장 자주 요청하는 정보 프레임(소셜 메뉴판).
  6. **지글 ASMR 릴스** — 알고리즘 쇼트폼 히어로(스팀·글레이즈·풀백).
  7. **싼 1샷 릴스** — 오늘의 메뉴/신메뉴 즉시 게시(리텐션 드립).

## 3) 현재 상태 — **(기존) v2 7개 검증·확정**
`recipes.food.v2.js`에 7개 존재(전부 `product_composite`). 진단 점수 4.5/10(최약)이었으나 v2에서 전환 JTBD 보강 완료. 아래 목록을 **그대로 검증·확정**하고 산출물 스펙만 마무리한다.

| # | 이름 | 타입 | 컷 | ◈ | 결정 | ◈/🅣 |
|---|---|---|---|---|---|---|
| 1 | Top-Down Hero | 📷 image_set | 4 | 2 | keep | — |
| 2 | Drip & Steam Macro | 📷 image_set | 4 | 2 | keep (◈4→◈2 재정가) | — |
| 3 | Golden-Hour Cafe Mood | 📷 image_set | 4 | 2 | keep (◈3→◈2 재정가) | — |
| 4 | Serving & Table Lifestyle | 📷 image_set | 4 | 2 | **NEW** | ⚠️(손) |
| 5 | Menu / Price Card | 📷 image_set | 6 | 3 | **NEW** | 🅣 |
| 6 | Single-Dish Sizzle | 🎬 reel | 1 | 2 | **NEW** | — |
| 7 | Sizzle & Steam ASMR | 🎬 reel | 3 | 6 | keep (360 Glaze Spin 흡수) | ⚠️(360 모핑) |

- v1 대비: `360 Glaze Spin` cut(→ #7 흡수), `Full Menu Pack ◈8` cut→replace(→ #5 Menu/Price Card), 신규 3종(#4·#5·#6) 추가.
- **가격 사다리(확정·위반 0)**: `I2 I2 I2 I2 I3 · R2 R6` — ◈2 진입 ✓, 싼 릴스 R2 ✓.
- **확정 시 점검할 항목**(아래 ②③에서): 시드 #4·#7 메타에 ⚠️ 플래그(`needs_human_review`)가 누락 → 추가 필요. #5 메타의 text_overlay 노트는 양호.

## 4) ① 발굴 — food 2026 트렌드·포맷 브레인스톰(후보 8~12)
2026 IG Reels/TikTok/Shorts F&B 포맷 + 빠진 전환 프레임 기준 후보. (★=v2 채택분, ☆=대안/풀)

| 후보 | 무엇을 / 왜 | 사진/영상 | 예상◈ |
|---|---|---|---|
| ★Top-Down Hero | 탑다운 플랫레이, 배달앱 썸네일 인지 1순위 | 📷 4 | ◈2 |
| ★Drip & Steam Macro | 흐르는 소스·김 매크로, 군침 트리거(전환 최고) | 📷 4 | ◈2 |
| ★Golden-Hour Cafe Mood | 노을빛 카페 무드, 분위기 판매 | 📷 4 | ◈2 |
| ★Serving & Table Lifestyle | 손이 서빙하는 순간, 저장·공유율 최고 | 📷 4 | ◈2 |
| ★Menu / Price Card 🅣 | 그리드 배경 + 메뉴/가격 오버레이 | 📷 6 | ◈3 |
| ★Single-Dish Sizzle | 1샷 식욕 모션, 오늘의 메뉴 즉시 게시 | 🎬 1 | ◈2 |
| ★Sizzle & Steam ASMR | 스팀·글레이즈·풀백 3샷 알고리즘 히어로 | 🎬 3 | ◈6 |
| ☆Pour / Latte-Art Reel | 라떼 스팀밀크 푸어·라떼아트·시럽 드리즐 클로즈업(음료 카페 핵심) | 🎬 1~2 | ◈2~4 |
| ☆Ingredient Fresh Cut | 재료 신선함 증명(생야채·과일 단면·향신료 비산) — 클린/프리미엄 클레임 | 📷 4 | ◈2 |
| ☆Before/After Cook | 생재료→완성 플레이팅 변신(2샷 트랜스폼) | 🎬 2 | ◈4 |
| ☆Combo / Set Spread | 세트·플래터 풀스프레드 탑다운(객단가 업셀) | 📷 4 | ◈2 |
| ☆Hand-Held Street Bite | 손에 든 길거리음식 한입(치즈풀·베어샷), 인물 맥락 | 📷/🎬 | ◈2~4 |
| ☆Seasonal / Promo Card 🅣 | 시즌·프로모 배너(텍스트 오버레이), 신메뉴 출시 | 📷 4 | ◈2 |

→ 발굴 결론: v2 7종이 ①탑다운 ②매크로 ③무드 ④인물맥락 ⑤정보카드 ⑥싼릴스 ⑦ASMR로 핵심을 커버. **빈 자리는 "음료 전용 라떼아트/푸어 컷"**(현재 매크로·ASMR이 음료를 일부 흡수하나 카페 비중 큰 유저엔 약함) — ②선별에서 keep/add 판단.

## 5) ② 선별 — 4축 평가 + keep/cut/merge/add
**커버리지 / 트렌드 / 원가-가치 / AI난이도** 4축으로 v2 7종 검증.

| 템플릿 | 커버리지 | 트렌드 | 원가-가치 | AI난이도 | 판정 |
|---|---|---|---|---|---|
| Top-Down Hero | 배달앱 썸네일(필수) | ◎ 상시 | ◎ ◈2 진입 | 낮음(글자 없음) | **keep** |
| Drip & Steam Macro | 군침 정지컷(전환핵) | ◎ | ◎ ◈2 | 중(CGI스팀·왜곡 주의) | **keep** |
| Golden-Hour Cafe Mood | 분위기/리치 | ◎ | ◎ ◈2 | 중(인물 얼굴 배제) | **keep** |
| Serving & Table Lifestyle | 인물맥락(저장핵) | ◎ | ◎ ◈2 | **높음(손)** | **keep + ⚠️ 플래그 추가** |
| Menu / Price Card | 정보 프레임 | ○ | ○ ◈3 | **높음(텍스트)** | **keep(🅣 오버레이 유지)** |
| Single-Dish Sizzle | 싼 릴스 진입 | ◎ | ◎ ◈2 | 중(모션) | **keep** |
| Sizzle & Steam ASMR | 모션 히어로 | ◎ | ◎ ◈6 | **높음(360 모핑)** | **keep + ⚠️ 플래그 추가** |

- **keep 7** (구조 변경 없음 — 진단이 지목한 응집·과대가격·텍스트 한계 모두 v2에서 해소됨).
- **cut/merge**: 추가 cut 불필요. (v1에서 이미 360 Glaze Spin→#7 흡수, Full Menu Pack→#5 교체 완료.)
- **add 판단**: `Pour / Latte-Art Reel`(음료 카페용 1~2샷)을 **선택적 8번째 후보**로 보류 권장 — 현재 7종으로 6±기준 충족, 음료는 Drip&Steam·Single-Dish가 일부 커버. 카페 비중이 큰 시장 데이터 확인 후 4→확장 시 추가.
- **가격 사다리(◈2 진입 + 싼 릴스 포함, 확정)**: `I2 I2 I2 I2 · I3 · R2 · R6`. ◈2 진입 4종 / 싼 릴스 R2(Single-Dish Sizzle) / 미드 ◈3은 컷 수 6으로 정직 부여(Menu Card). ✅ 위반 0.

## 6) ③ 강화 — 산출물 스펙 + 레시피(스키마 §끝 준수)
각 템플릿 "정확히 무슨 사진/영상을 만드는가" + 핵심 라이팅/렌즈/씬/무드/구도 + negative + 샷리스트. 영어 프롬프트는 시드(`recipes.food.v2.js`)에 이미 있으므로 **검증 포인트**와 **한국어 산출물 정의**를 명시. (시드 본문은 그대로 확정, 메타 보정만 추가.)

**🅣/⚠️ food 특유 주의(필독):**
- **음식 리얼리즘**: AI가 음식을 "플라스틱·왜곡·녹은·중복 접시"로 그리기 쉬움 → 모든 음식 템플릿 negative에 `plastic-looking food / warped or melted food / duplicated dishes / soggy wilted garnish` 유지.
- **CGI 스팀 함정**: 김·스팀은 `fake CGI steam / plastic droplets` negative 필수, 매크로는 실제 응결·증기 질감 강조.
- **🅣 텍스트(Menu/Price Card)**: 전역 `SAFETY_NEGATIVE`가 'text','logo'를 모든 렌더에 주입 → **이 템플릿 negative에 text/logo 넣지 말 것**(중복 주입 시 그리드 플레이트까지 억제됨). 글자는 AI로 그리지 말고 **결정론적 오버레이 레이어**로(menu_item_name·price·section_header·currency, 최대 16개). `text_overlay: true` + `meta.render_notes` 유지.
- **⚠️ 손(#4 Serving)**: "단일 손·정확히 5손가락·융합/추가 손가락 금지" + `faces or heads in frame` 배제(제품 모드는 얼굴 노출 금지). → `meta.flags: [needs_human_review]` 추가 필요.
- **⚠️ 360 모핑(#7 ASMR)**: 풀백/오빗 중 "토핑·패싯·dish geometry 모핑 금지"(시드 negative에 이미 반영). → `meta.flags: [needs_human_review]` 추가 필요.

**산출물 스펙(한국어, 사람이 결과 예측 가능하게):**

1. **Top-Down Hero** 📷4·◈2 — 완벽 90° 탑다운 플랫레이 4컷. 라이팅=overhead softbox+바운스, 50mm 룩. 씬=라이트그레이 세라믹/오크목+린넨/슬레이트+생재료/화이트 마블(타이트 크롭). 배달앱·메뉴보드 썸네일. *negative: 기운 수평·원근왜곡·하이라이트 번짐.*
2. **Drip & Steam Macro** 📷4·◈2 — 100mm 매크로 f/4, 백라이트 림. 4컷=피어오르는 김/공중 소스드립/차가운 잔 응결/치즈풀·프로스팅. 다크 무디. 전환율 최고 군침 정지컷. *negative: flat light·dry food·fake CGI steam.*
3. **Golden-Hour Cafe Mood** 📷4·◈2 — 35mm 필름룩, 골든아워 창가 역광·소프트 헤이즈. 4컷=창가 테이블/마블 바+에스프레소머신 보케/창가석+책·식물/테라스 선플레어. 분위기 판매. *negative: cold blue cast·clinical studio·people's faces·hands.*
4. **Serving & Table Lifestyle** 📷4·◈2 ⚠️ — 따뜻한 창측 지향광, 손이 접시를 놓는/내미는 4컷(얼굴 없음, 손만). 린넨·글라스 보케. 에디토리얼 푸드매거진. *negative: faces/heads·ugly hands·dirty nails·6손가락.* → **flags 추가.**
5. **Menu / Price Card** 📷6·◈3 🅣 — 요리 그리드 배경 6컷(2×2 그리드/음료 열/2히어로/디너 슬레이트/오늘의특선/디저트 3열), 항목 사이 여백(라벨 존). **AI는 배경만, 메뉴명·가격은 오버레이.** *negative에 text/logo 금지 유지.*
6. **Single-Dish Sizzle** 🎬1샷·◈2 — 1샷 4초, 다크 무디 단일 키라이트, 측면 슬로우 매크로 푸시인(김·소스 광택). 모션=`slow macro push-in catching steam and glaze`, transition none, music=warm ASMR sizzle. 오늘의 메뉴 즉시 게시.
7. **Sizzle & Steam ASMR** 🎬3샷·◈6 ⚠️ — 시네마틱 ASMR 3비트: ①김 매크로 홀드 ②버블 소스·글레이즈 sheen 측면 드리프트 ③풀백 히어로 리빌(오빗). 샷당 3초, cut, warm ASMR. *negative: morphing toppings/facets·inconsistent dish geometry across frames.* → **flags 추가.**

## 7) 산출물 (Deliverables)
1. **`src/recipes/seeds/recipes.food.v2.js` 갱신** — 7개 유지·확정. 보정만: #4 Serving·#7 ASMR에 `meta.flags: ["needs_human_review"]` 추가(시드 본문 프롬프트/샷/비용은 변경 없음). `node -e "require('./src/recipes/seeds/recipes.food.v2.js')"`로 로딩 + 비용공식(image=count×0.5, reel=shots×2) 재검증.
2. **한국어 산출물 스펙** — 위 ③의 7줄(사람용), 영어 프롬프트는 시드 내 `extra_positive`/`negative`(엔진용) 2벌 유지.
3. **keep/cut/add 표**:

| 결정 | 템플릿 | 이유 |
|---|---|---|
| keep | Top-Down Hero | ◈2 배달앱 썸네일 진입 |
| keep(reprice) | Drip & Steam Macro | 4컷=◈2 공식 정합 |
| keep(reprice) | Golden-Hour Cafe Mood | 4컷=◈2 공식 정합 |
| keep(add·v2) | Serving & Table Lifestyle ⚠️ | 인물맥락 저장·공유 핵심 |
| keep(add·v2 🅣) | Menu / Price Card | 메뉴/가격 오버레이(◈3) |
| keep(add·v2) | Single-Dish Sizzle | 1샷 ◈2 싼 릴스 진입 |
| keep(absorb) | Sizzle & Steam ASMR ⚠️ | 360 Glaze Spin 흡수, 모션 히어로 |
| cut | 360 Glaze Spin (v1) | Sizzle ASMR과 근접중복 → 흡수 완료 |
| cut→replace | Full Menu Pack ◈8 (v1) | 8컷=◈4인데 ◈8 과대 + 텍스트 한계 → Menu/Price Card로 |
| add(보류) | Pour / Latte-Art Reel | 음료 카페 비중 데이터 확인 후 8번째로 |

4. (후속) `docs/템플릿_한국어_카탈로그.md`·`public/_overview.html` food 섹션 v2 동기화.

## 8) 착수 커맨드 (붙여넣기용)
> `~/HeyHoAI`에서 `docs/명령서_템플릿_발굴선별강화.md`(마스터)·`docs/템플릿_v2_발굴선별강화_결과.md`(§푸드)·`src/recipes/seeds/recipes.food.v2.js`를 읽고, food 카탈로그 v2 7종을 검증·확정해. 4축(커버리지·트렌드·원가가치·AI난이도)으로 keep을 재확인하고, #4 Serving·#7 ASMR에 `meta.flags:["needs_human_review"]`를 추가하며, #5 Menu/Price Card의 🅣 오버레이(negative에 text/logo 금지) 처리를 점검해. 각 템플릿 한국어 산출물 스펙을 확정하고 `node`로 로딩+비용공식(image=count×0.5, reel=shots×2)을 재검증한 뒤 변경 요약을 내라.

---

## 공통 규칙 (§ 인용 — food에도 동일 적용)
- **철학**: 노스킬 — 유저는 프롬프트 안 쓰고 양식만 고름. 출력 2종: 📷 image_set(보통 4장·4:5) / 🎬 reel(샷수=count·9:16).
- **레시피 스키마 v1** (A2 look + A5 shots): `{ mode, category, name, output_type, credit_cost, rationale, config:{ output{type,count,aspect_ratio}, subject{type:face|product|avatar, reference_strategy:identity_lock|product_composite, min_refs}, look{style_preset, attributes[], wardrobe?, extra_positive, negative}, shot_strategy:'list', shots[{scene,pose,composition}], reel?{per_shot_motion[],duration_per_shot,transition,music_mood,captions}, provider{image:'nano-banana',video:'kling'} } }`. food는 전부 `subject.type:product` · `product_composite`.
- **비용 규칙**: image_set=count×0.5, reel=shots×2, 온모델 착용 +1. (4장=◈2, 3샷릴=◈6). food는 온모델 없음 → 모두 공식 그대로. 각 카탈로그 ◈2 진입 + 싼 릴스(1샷 ◈2) 필수 → food 충족.
- **⚠️ 엔진**: 전역 SAFETY_NEGATIVE가 모든 렌더에 'text','logo' 주입 → 🅣 템플릿(Menu/Price Card)은 글자를 AI로 그리지 말고 오버레이 레이어로(해당 negative에서 text/logo 제외). 손(Serving)·360(ASMR)은 negative 강화 + 사람검수 플래그.
- **2벌 출력**: 영어 프롬프트(엔진용, 시드) + 한국어 산출물 설명(사람용). 마켓 전략=공식 우선(이 7종이 출시 food 카탈로그 본체).

참고 파일: 마스터 `/Users/jeon-yedam/HeyHoAI/docs/명령서_템플릿_발굴선별강화.md` · v2 결과 `/Users/jeon-yedam/HeyHoAI/docs/템플릿_v2_발굴선별강화_결과.md`(§푸드 138–161행) · v2 시드 `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.food.v2.js`(7개).

---

## 9) 작업 기록 (Work Log) — 총지휘 읽기용

> 워커가 food 작업할 때마다 여기 즉시 누적. 총지휘는 이 절 + `_STATUS.md`로 food 현황 파악. 자동 현황(개수·비용·이름)은 `node scripts/consolidate_recipes.js` 재실행으로 갱신.

### 2026-06-10 · v2 검증·확정 + 커버리지 진단
**✅ 완료(시드 반영됨 — `recipes.food.v2.js`):**
- v2 7종 검증·확정. 구조/프롬프트/샷/비용 변경 없음.
- `#4 Serving & Table Lifestyle`·`#7 Sizzle & Steam ASMR`에 `meta.flags:["needs_human_review"]` + `review_reason` 추가(손 / 360 모핑 검수).
- 스테일 ◈ 주석 헤더·changelog 정정(실제 가격사다리 `I2 I2 I2 I2 I3 · R2 R6`에 일치).
- 검증: `node` 로딩 OK · 비용공식(image=count×0.5, reel=shots×2) 7종 전부 정합 · `#5 Menu/Price Card` negative에 text/logo 미포함(🅣 오버레이) 확인 · 이름 전역 고유 확인.

**🔍 분석 — "7종으로 전 고객 만족 가능?" → 불가(구조적 hot/plated 편향):**
- gap 6건: **(High)** 포장/패키지 식품, **(High)** 음료 고유 모션(라떼아트·푸어), **(Med)** 세트·플래터 풀스프레드, **(Med)** 시즌/프로모 배너, **(Med)** 길거리 핸드헬드, **(Low)** 신선재료 증명. + partial 7건(차가운/생식·파인다이닝·주류 등 룩 편향).
- **빈약 템플릿 삭제 = 없음.** 7종 전부 고유 JTBD 단독 담당 또는 출력 타입 상이 → 실질 중복 없음(4축 평가 keep 이상). 슬림화 강제 시에만 Single-Dish→ASMR 1샷 머지 후보(진입점 손실로 비권장).

**💡 제안 — 신규 템플릿 (⏳ 승인 대기, 시드 미반영):**

| 우선 | 이름 | 출력 | 컷/샷 | ◈ | 충전 갭 | 플래그 |
|---|---|---|---|---|---|---|
| P0-1 | **Latte Pour & Crema Reel** | 🎬 reel | 2샷(+1샷옵션) | ◈4 (1샷 ◈2) | 음료 모션(High) | — (no human review) |
| P0-2 | **Combo & Platter Spread** | 📷 image_set | 4컷 | ◈2 | 세트·콤보(Med) | — |
| P0-3 | **Retail Pack Front Hero** | 📷 image_set | 4컷 | ◈2 | 패키지(High) | 🅣 +엔진 negative 예외 의존 |
| P1 | (시즌/프로모) → **Menu/Price Card 'Promo' 배리언트 흡수** 권장 | 📷 | 6컷 | ◈3 | 프로모(Med) | 🅣 |
| P2 | Fresh-Cut Ingredient Spread (보류) | 📷 image_set | 4컷 | ◈2 | 신선재료(Low) | — |

- 신규 3종 이름 전역 고유 확인 ✓ · 비용공식 검산 ✓.
- 채택 시 카탈로그 **7→10**(image_set 7 + reel 3). 가격사다리 `I2 I2 I2 I2 I2 I3 · R2 R4 R6`. ⚠️ 개수 10은 6~8 norm 상한 초과 — 상한 엄수 시 Single-Dish 머지(−1)/P0-3 후속 보류(−1)로 8 압축 가능(갭 손실 트레이드오프).
- **🔧 의존성:** `Retail Pack Front Hero`는 엔진 측 전역 `SAFETY_NEGATIVE`의 text/logo 억제 예외(이 템플릿 한정)가 구현돼야 가치 실현 → 엔진 총지휘에 별도 에스컬레이션 필요.

### 2026-06-13 · ✅ #1 Top-Down Hero 테스트 통과 (QA pass)
**상태:** `#1 Top-Down Hero` (📷 image_set · 4컷 · ◈2) **생성/QA 테스트 통과** — food 카탈로그 첫 템플릿 QA 통과. 시드 변경 없음(보고만).

**제품 적합성 (이 템플릿에 어울리는 제품):**
완벽 90° 탑다운 플랫레이 + overhead softbox + 50mm. JTBD = 배달앱·메뉴보드 썸네일(작은 크기 즉시 인지). **"위에서 봤을 때 전체 구성이 읽히는" 평평/그릇·접시 담음**이 핵심 판별.

- **◎ 최적:**
  - 보울류 — 포케볼·그레인볼·비빔밥·덮밥·샐러드볼·라멘/국밥(내용물이 위에서 보임)
  - 플레이팅 단품 — 파스타·리조또·카레·플레이트 메인
  - 평면 음식 — 피자·플랫브레드·단층 팬케이크
  - 배열형 — 김밥·롤·스시 플래터·디저트 플레이트·마카롱/쿠키/도넛 배열
  - 브런치 플레이트(계란·토스트·사이드)
  - 음료 탑샷 — 라떼 표면(라떼아트 위에서)·아이스 음료 위에서 본 컷
- **△ 보통(높이/3D가 핵심이면 손실 → 다른 템플릿 권장):**
  - 키 큰 버거·타워·팬케이크 스택(높이 눌림 → 45°/측면)
  - 스팀 강조 뜨거운 국물(측면 백라이트 → `Drip & Steam Macro`)
  - 디테일 텍스처 클로즈업(→ `Drip & Steam Macro`)
- **✕ 비권장:**
  - 키 큰 음료 형태·측면 라떼아트·푸어 모션(→ `Golden-Hour` / 제안 `Latte Pour & Crema Reel`)
  - 패키지·병·캔 정면 라벨(위에선 뚜껑만 → 제안 `Retail Pack Front Hero`)
  - 아이스크림 콘 등 수직 형태
