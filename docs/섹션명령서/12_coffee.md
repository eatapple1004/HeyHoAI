# 섹션 작업 명령서 — 카페 & 커피 (key: coffee)

> 이 브리프 하나로 coffee 섹션 착수 가능(self-contained). 작업 디렉터리 `~/HeyHoAI`, 브랜치 `feat/ux-monetization-v2`. 표기: 📷=image_set · 🎬=reel · ◈=크레딧 · ⚠️=사람검수 · 🅣=텍스트 오버레이.

---

## 1) 정체성
- **mode**: `product` (제품 모드 — 유저가 커피/음료 사진 1장 업로드)
- **subject**: `type: product` · `reference_strategy: product_composite` · `min_refs: 1` (음료 자체를 합성 기준으로, 얼굴 identity_lock 아님)
- **한 줄 정의**: 카페·홈카페·음료 셀러가 **음료 사진 한 장**으로 메뉴 썸네일·코지 카페 무드컷·아이스 응결 매크로·메뉴 카드·푸어/스팀 릴스를 자동 생성하는, **음료 리얼리즘(투명 잔·얼음·크레마·유체) + 따뜻/아늑/자연광 팔레트** 중심 제품 카탈로그.
- **레퍼런스 무드(유저 제공)**: 짧은 락스잔 아이스 라떼·메탈 빨대·에스프레소/우유 층 스월·잔 응결·다크우드 코스터·펼친 책·화이트 린넨·부드러운 창광·얕은 심도·따뜻 베이지/크림 톤·슬로우리빙. → 카탈로그 전체(특히 #2 Cozy Cafe Moment)에 반영.

## 2) 타깃 유저 & JTBD
- **누가**: 독립 카페·스페셜티/로스터리·홈카페 크리에이터·디저트카페·음료 셀러(배달앱 입점). F&B 마케터·소셜 운영자.
- **뭘 파나**: 시그니처 음료(라떼·콜드브루·아이스 음료)·시즌 드링크·세트. 핵심 = "맛있어/예뻐 보임 → 주문" + "분위기 → 방문·팔로우".
- **매출에 필요한 컷(JTBD)**:
  1. **음료 표면 탑다운 썸네일** — 라떼아트·아이스 탑뷰, 메뉴·배달앱 작은 크기 즉시 인지(주문 1순위).
  2. **코지 카페 무드(분위기 판매)** — 책·린넨·창광 슬로우리빙, 인스타 저장·공유·리치 견인.
  3. **아이스 응결 매크로(군침 트리거)** — 응결·얼음·우유 푸어, 밝고 신선, 전환율 최고 정지컷.
  4. **메뉴/가격 카드** — 카페가 가장 자주 요청하는 정보 프레임(소셜 메뉴판).
  5. **싼 1샷 릴스** — 오늘의 음료·신메뉴 즉시 게시(리텐션 드립).
  6. **푸어/라떼아트 모션** — 음료 고유 시그니처 모션(스팀밀크 푸어·캐스케이드).
  7. **스팀·크레마 ASMR** — 알고리즘 쇼트폼 히어로(체류시간).

## 3) 현재 상태 — v2 7개 신규 확정
`recipes.coffee.v2.js` 신규 7개(전부 `coffee` · `product_composite`). 음료 특유 리얼리즘 가드 반영.

| # | 이름 | 타입 | 컷/샷 | ◈ | category | ◈/🅣 |
|---|---|---|---|---|---|---|
| 1 | Latte Art Top-Down | 📷 image_set | 4 | 2 | Studio | — |
| 2 | Cozy Cafe Moment | 📷 image_set | 4 | 2 | Lifestyle | — |
| 3 | Iced Coffee Condensation Hero | 📷 image_set | 4 | 2 | Macro | — |
| 4 | Signature Drink Menu Card | 📷 image_set | 6 | 3 | Menu | 🅣 |
| 5 | Single-Cup Pour Reel | 🎬 reel | 1 | 2 | Reel | — |
| 6 | Latte Pour & Crema Reel | 🎬 reel | 2 | 4 | Reel | ⚠️ |
| 7 | Cafe Steam & Crema ASMR | 🎬 reel | 3 | 6 | Reel | ⚠️ |

- **이름 전역 고유 확인 ✓**(기존 19개 음료/카페 후보명과 비충돌).
- 음료는 온모델 없음 → 비용공식 그대로(image=round(count×0.5), reel=shots×2).

## 4) 가격 사다리
**`I2 I2 I2 I3 · R2 R4 R6`** (위반 0)
- ◈2 사진 진입(Latte Art Top-Down) ✓ — 노스킬 무료체험감.
- 싼 릴스(Single-Cup Pour Reel R2) ✓ — "가장 싼 영상이 ◈6" 문제 해소.
- 미드티어 ◈3은 임의 가산이 아니라 **6컷 확장으로 정직하게**(Menu Card) 부여.
- food 카탈로그와 다른 점: 음료 모션 갭(라떼아트 푸어)을 위해 **중간 R4 릴**(Latte Pour & Crema)을 추가 → `R2 R4 R6` 3단 릴 사다리.

## 5) AI 난이도 · 플래그 (필독)
- **음료 리얼리즘**: 모든 템플릿 negative에 `plastic-looking drink / warped or duplicated glass or cup / melted distorted foam / unnatural plastic ice / spilled mess / double straws / oversaturated` 유지.
- **CGI 스팀/유체 함정**: `fake CGI steam / fake CGI fluid` negative 필수, 실제 응결·증기·크레마 질감 강조.
- **사람 없음(제품 모드)**: 전 템플릿 `faces or heads in frame, hands` 배제(손가락 리스크 원천 차단 → food의 Serving 같은 ⚠️ 손 템플릿 없음).
- **🅣 텍스트(#4 Menu Card)**: 전역 `SAFETY_NEGATIVE`가 'text','logo'를 모든 렌더에 주입 → **이 템플릿 `extra_negative`에 text/logo 넣지 말 것**(중복 주입 시 그리드 음료 컵까지 억제). 글자는 오버레이 레이어로(`text_overlay:true` + `meta.render_notes` + `text_overlay_fields:[drink_name,price,section_header,currency_symbol]` + `max_items:16`).
- **⚠️ 유체·라떼아트 모핑(#6·#7)**: 푸어 중 라떼아트 forming / 풀백 중 크레마·잔 geometry 모핑 위험 → `meta.flags:["needs_human_review"]`. negative에 `morphing latte art / inconsistent crema between frames / fake CGI fluid` 방어. **손·얼굴은 없음**.

## 6) 산출물 (Deliverables)
1. **`src/recipes/seeds/recipes.coffee.v2.js`** (절대경로: `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.coffee.v2.js`) — 신규 7개. `node -e "require('./src/recipes/seeds/recipes.coffee.v2.js')"` 로딩 + 비용공식 재검증.
2. **한국어 산출물 스펙** — `docs/템플릿_한국어_카탈로그.md`에 ☕ 카페 & 커피 섹션 추가. 영어 프롬프트는 시드 `extra_positive`/`extra_negative`(엔진용) 2벌 유지.
3. **`public/_overview.html` DATA** — 신규 행 추가(아래 overview_row).
4. **`scripts/consolidate_recipes.js`** — coffee 섹션을 `SECTIONS` 배열에 등록해야 자동 집계됨(현재 11섹션 → 12섹션). 등록 후 재실행으로 `_STATUS.md`·`_CATALOG.json` 갱신.
5. **엔진 의존 노트**: #4 Signature Drink Menu Card `text_overlay:true` 1개 — 템플릿별 negative 분리 + 오버레이 합성 레이어 구현 필요(food/home의 🅣와 동일 파이프라인 재사용).

## 7) 착수 커맨드 (붙여넣기용)
> `~/HeyHoAI`에서 이 브리프와 `src/recipes/seeds/recipes.coffee.v2.js`·`recipes.food.v2.js`(스타일 미러)를 읽고, coffee 카탈로그 v2 7종을 검증·확정하라. 비용공식(image=round(count×0.5), reel=shots×2)·가격사다리(I2 I2 I2 I3 · R2 R4 R6)·이름 전역 고유를 재검증하고, #4 Menu Card는 `text_overlay:true` + negative에 text/logo 제외 + render_notes 유지를, #6·#7은 `meta.flags:["needs_human_review"]`를 점검하라. `node`로 로딩 후 `scripts/consolidate_recipes.js`의 SECTIONS에 coffee를 등록하고 재실행해 _STATUS를 갱신하라.