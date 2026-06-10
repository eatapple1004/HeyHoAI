# 섹션 작업 명령서 — 주얼리 (key: jewelry)

> 이 브리프 하나로 주얼리 섹션 착수 가능(자기완결). 작업 디렉터리 `~/HeyHoAI`, 브랜치 `feat/ux-monetization-v2`.
> 표기: 📷=image_set(보통 4컷·4:5) · 🎬=reel(샷수=count·9:16) · ◈=크레딧 · ⚠️=사람검수/실험 · 🅣=텍스트 오버레이 의존.

---

## 1) 정체성
- **mode**: `product`
- **subject**: `type: product` · `reference_strategy: product_composite` (착용컷만 예외적으로 `on_model_tryon`) · `min_refs: 1`
- **한 줄 정의**: 제품 사진 1장(반지·목걸이·팔찌·시계 등)을 올리면, 패싯 디테일·실사이즈·착용·스파클·언박싱을 자동 생성하는 **파인주얼리/럭셔리 소품 전용** 양식 세트.

## 2) 타깃 유저 & JTBD
- **누가**: 파인/데미파인 주얼리 셀러(DTC·스마트스토어·인스타 공방), 럭셔리 소품 브랜드. 핸드모델·매크로 장비·스튜디오 예산이 없는 1인~소규모.
- **뭘 파나**: 단가 높고 반품·불안 민감한 소형 고가품. 화면에서 "진짜 이만큼 반짝이고, 이 정도 크기고, 손에 끼면 이렇구나"를 못 보여주면 결제 이탈.
- **매출에 필요한 컷(전환 JTBD)**:
  1. **패싯 매크로** — 컷·클래리티·세공을 폰으로 못 잡는 배율로 증명(품질 신뢰).
  2. **스케일/사이징** — *주얼리 구매 불안 1순위 = "실제로 얼마나 큰가?"* 동전·자 기준 + 측정 카드 오버레이로 확정.
  3. **착용(손/손목)** — 핸드모델 없이 실제 착용 스케일·핏 제시.
  4. **스파클 릴** — 이동광에 패싯이 불붙는 스크롤 정지용 영상(IG/TikTok 인게이지먼트).
  5. **언박싱** — 박스 오픈 = 선물 수요·고AOV 전환 트리거.
  - 보조: 벨벳 카탈로그 PDP 히어로 + 골든아워 에디토리얼(브랜딩).

## 3) 현재 상태 — **기존 v2(6개), "검증·확정 + 산출물 스펙 마무리"**
`src/recipes/seeds/recipes.jewelry.v2.js` 존재. 6개 전부 정의·로딩·비용공식 검증 통과. 이번 작업 = **재설계가 아니라 검증·확정 + 산출물 스펙(한/영) 최종 마감**.

| # | 이름 | 타입 | 컷 | ◈ | ◈근거 | 특이 |
|---|---|---|---|---|---|---|
| 1 | Facet Macro | 📷 | 4 | 2 | 4×0.5 | 다크필드 패싯 매크로 |
| 2 | Studio & Editorial | 📷 | 4 | 2 | 4×0.5 | v1 Velvet+Gilded 병합 |
| 3 | Scale & Sizing | 📷 | 4 | 2 | 4×0.5 | 🅣 측정 오버레이 (NEW) |
| 4 | Wrist & Hand | 📷 | 4 | 5 | on_model 4컷=◈5 | ⚠️ 손가락 부분크롭 |
| 5 | Light Play Reel | 🎬 | 3 | 6 | 3×2 | 스파클 릴 |
| 6 | Unbox ASMR Reel | 🎬 | 3 | 6 | 3×2 | ⚠️ 손 부분, 4→3샷 리프라이스 |

**확정된 v1→v2 결정(맹신 말고 검증):** Facet Macro ◈5→◈2 · Velvet+Gilded → Studio & Editorial 병합 · Scale & Sizing 신규(🅣) · Wrist & Hand ◈6→◈5 + 손가락 negative 강화 · Unbox 4→3샷 ◈8→◈6.
**가격 사다리(검증됨):** `I2 I2 I2 I5 · R6 R6`. ◈2 진입 ✓. **싼 릴스(◈2~4) 미보유 — 의도적**: 1샷 스파클 클립은 서사 약해 슬롯 가치 낮다고 판단, 기존 ◈6 릴 2개 유지.

## 4) ① 발굴 — 2026 주얼리 트렌드·플랫폼 포맷 + 빠진 전환 프레임 (후보 8~12)
현 6개를 검증하되, 아래 후보로 **빈 JTBD·가격 슬롯**을 점검(특히 "싼 릴스 미보유" 결정을 다시 시험).

| 후보 | 무엇을 / 왜 | 사진/영상 | 예상◈ |
|---|---|---|---|
| Facet Macro *(현행)* | 패싯·클래리티·세공 매크로 증명 | 📷 4 | ◈2 |
| Scale & Sizing 🅣 *(현행)* | 동전·자 기준 실사이즈 + 측정 카드(불안1순위) | 📷 4 | ◈2 |
| Studio & Editorial *(현행)* | 벨벳 PDP + 골든 에디토리얼 | 📷 4 | ◈2 |
| Wrist & Hand ⚠️ *(현행)* | 착용 스케일·핏(부분크롭) | 📷 4 | ◈5 |
| Light Play Reel *(현행)* | 이동광 스파클·파이어 | 🎬 3 | ◈6 |
| Unbox ASMR Reel ⚠️ *(현행)* | 선물 언박싱(고AOV) | 🎬 3 | ◈6 |
| **Sparkle Snap (1샷)** | 1샷 슬로우 스파클 푸시인 = 스토리/숏폼 즉시 게시. "싼 릴스 없음" 결정 재시험용 ◈2 진입 영상 | 🎬 1 | ◈2 |
| **Stack & Layering** | 반지 스택·목걸이 레이어드 코디 제안(객단가↑, 세트 판매) | 📷 4 | ◈2 |
| **Gift-Ready Flatlay** | 선물 포장·카드·리본 플랫레이(시즌·발렌타인·기념일) | 📷 4 | ◈2 |
| **Spec / Material Card 🅣** | 금속 순도(14K/18K)·캐럿·중량 정보 카드(오버레이) | 📷 4 | ◈2 |
| **Reflection Hero (거울/수면)** | 거울·물·유리 반사 럭셔리 비주얼(피드 톤) | 📷 4 | ◈2 |
| **Turntable 360 Spin ⚠️** | 제품 전용 턴테이블 전각도(모핑 리스크 한정) | 🎬 3 | ◈6 |

## 5) ② 선별 — 4축 평가 + keep/cut/merge/add 가이드
**4축**: 커버리지(핵심 상업컷 다 덮나/근접중복 없나) · 트렌드(2026 IG/TikTok 적합) · 원가-가치(제작부하 대비) · AI난이도(손가락·텍스트·360 모핑 위험).

**권장 최종 = 현 6개 유지(검증·확정)**. 단, 슬롯 1~2개 한도 내에서 다음 판단:
- **keep(확정 검증)**: Facet Macro, Scale & Sizing, Studio & Editorial, Wrist & Hand, Light Play Reel, Unbox ASMR Reel — 5대 전환 JTBD(매크로·사이징·착용·스파클·언박싱)를 정확히 덮음.
- **재시험 1 (싼 릴스)**: **Sparkle Snap(🎬1·◈2)** 추가 검토 → 다른 8개 카탈로그는 ◈2~4 싼 릴스 보유, jewelry만 미보유. "Kai 리텐션 드립"용 최저가 영상 슬롯 가치를 다시 저울질하라. 추가 시 7개. **추가 안 하면 v2 결정문(286행) 그대로 "의도적 미보유" 사유를 명시 유지.**
- **add 후보 1 (커버리지 공백)**: **Stack & Layering** 또는 **Spec/Material Card 🅣** 중 1개 — 전자는 세트판매 객단가, 후자는 금속순도/캐럿 정보 불안 해소. 둘 다 ◈2.
- **cut/merge 신규 없음**: v1의 무광정물 3개 과잉은 이미 Studio & Editorial로 병합 완료. Turntable 360은 Light Play Reel과 스파클 무드 근접 → **add 금지(merge로 흡수)**.
- **가격 사다리(◈2 진입 + 싼 릴스 포함 권장)**: 현행 `I2×3 · I5 · R6×6`. ◈2 진입 OK. *권장*: Sparkle Snap(R2) 추가로 싼 릴스 공백 메우면 사다리 `I2 I2 I2 I5 · R2 R6 R6`로 정합성↑.

## 6) ③ 강화 — 템플릿별 산출물 스펙 + 레시피(스키마 §끝 준수)
**각 템플릿 = "무슨 사진/영상을 몇 컷, 각 컷 씬/구도/무드"를 사람이 예측 가능하게.** 영어 프롬프트(엔진) + 한국어 설명(사람) 2벌. 릴스는 샷별 모션 명시.

**이 테마 특유의 AI 난이도 / 🅣 주의(반드시 반영):**
- **손가락(Wrist & Hand · Unbox 샷2~3)**: 손은 최고 위험. **부분 크롭 전략**(손목/너클 레벨, 2~3손가락만, 손끝만) + negative에 *"단일 손·정확히 5손가락·융합/추가/물갈퀴/떠다니는 손가락 금지·너클 관절 자연"* 강화. `meta.flags:["experimental","needs_human_review"]` + QA 검수(5손가락 확인, 불량 시 재생성).
- **🅣 Scale & Sizing(텍스트 오버레이)**: 전역 `SAFETY_NEGATIVE`가 모든 렌더에 `text`/`logo` 주입 → **AI로 글자를 그리면 깨짐**. 처리 3종: ① `config.text_overlay:true` ② 이 템플릿 `look.negative`에서 `text`/`logo` **제외**(전역과 충돌 방지) ③ `meta.render_notes`에 결정적 오버레이 명세 — 측정 배지(예 `"18mm diameter · 2.1g"`)를 렌더 후 합성. **깨끗한 배경으로 생성해 오버레이가 깔끔히 얹히게.** (Spec/Material Card 추가 시 동일 처리.)
- **스파클 릴 모핑**: 패싯/금속이 회전·이동광 중 모핑/플리커 금지(negative). Turntable 추가 시 "회전 중 패싯 모핑 금지".

**산출물 스펙 확정(현 6개 — 검증·문구 마감):**
1. **Facet Macro** 📷4·◈2 — 다크필드 핀스폿 라킹광, 100mm 매크로 f/8 포커스스택. 4컷=중앙석 탑다운/크라운3·4앵글/밴드 측면(각인·홀마크)/정면 전체. 무드=젬스톤 내부 파이어·면 에지 샤프. negative=패싯비대칭·프롱왜곡·금속녹음·지문·먼지.
2. **Studio & Editorial** 📷4·◈2 — 벨벳 PDP 2컷(에메랄드 벨벳 소프트박스 히어로/디스플레이 프롭 3·4) + 골든 에디토리얼 2컷(마블+샴페인 실크 창광, 플랫레이 매거진 크롭). 100mm f/8–11 → 85mm f/4 전환.
3. **Scale & Sizing** 📷4·🅣·◈2 — 매트 화이트 오버헤드 확산광 100mm f/11. 4컷=동전(쿼터/유로) 2cm 옆 탑다운/자 에지 측정/단독 정면 비율/측면 두께+동전. negative=비율왜곡·자 휨·기준물누락(*text/logo 금지어 넣지 말 것*). 오버레이=측정 배지.
4. **Wrist & Hand** 📷4·⚠️·◈5 — 85mm f/2.8 북창광+실버바운스. 4컷 전부 **부분크롭**: 반지 너클 타이트(2~3손가락)/팔찌 손목레벨/실크 위 손바닥(미드팜 컷)/팔찌·시계 손목 수평(손 프레임아웃). negative 손가락 강화.
5. **Light Play Reel** 🎬3·◈6 — 다크 반사 스테이지 단일 이동광. 샷=중앙석 정면 매크로/3·4앵글 패싯 점화/풀백 글래머 리빌. 모션=하이라이트 스윕→광 오빗→풀백 돌리. 전환 fade, music="luxe ambient shimmer", captions auto.
6. **Unbox ASMR Reel** 🎬3·⚠️·◈6 — 85mm f/2.8 웜키+캔들 글로우. 샷=닫힌 박스 정적(손無)/손끝만 뚜껑 리프트(손끝 한정)/쿠션 속 히어로 매크로(손無). 모션=푸시인→틸트 리프트→랙포커스 줌. 전환 cut, music="soft ASMR + chimes". 손 샷2 QA 필수.

**(추가 채택 시)**
- **Sparkle Snap** 🎬1·◈2 — 다크 스테이지 1샷 슬로우 푸시인, 패싯에 하이라이트 한 줄 통과. 모션=느린 줌인+스파클 정착. 9:16, 즉시 게시용.
- **Stack & Layering** 📷4·◈2 — 중성 톤 손모델 없이 벨벳/평면 위 반지 스택·목걸이 레이어 조합 4컷(세트 코디 제안).
- **Spec/Material Card** 📷4·🅣·◈2 — Facet Macro와 유사 깨끗한 매크로 4컷 + 오버레이(14K/18K·캐럿·중량). text/logo negative 제외 + text_overlay:true.

## 7) 산출물 (Deliverables)
1. **`src/recipes/seeds/recipes.jewelry.v2.js`** (절대경로 `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.jewelry.v2.js`) — 현행 6개 검증·확정. 슬롯 추가 결정 시에만 갱신(스키마 §끝 준수, `node` 로딩 + 비용공식 검증 통과).
2. **한국어 산출물 스펙** — 위 ③의 "무슨 사진/영상 몇 컷·각 컷 씬/구도/무드"를 사람용으로(영어 프롬프트와 2벌).
3. **keep/cut/add 표** (아래 — 추가 결정 반영해 최종화):

| 결정 | 템플릿 | 이유 |
|---|---|---|
| keep | Facet Macro / Studio & Editorial / Scale & Sizing / Wrist & Hand / Light Play Reel / Unbox ASMR Reel | 5대 전환 JTBD 덮음, 가격공식 정합 |
| add(검토) | Sparkle Snap 🎬1·◈2 | 싼 릴스 공백(jewelry만 미보유) 재시험 |
| add(검토) | Stack & Layering 또는 Spec/Material Card 🅣 | 세트판매 객단가 / 금속순도 정보 불안 |
| cut/merge 신규 | 없음 | 무광정물 3→1 병합·Turntable 흡수 이미 반영 |

> 갱신 시 동기화 대상(있으면): `docs/템플릿_한국어_카탈로그.md`(주얼리 섹션), `public/_overview.html`(주얼리). 변경 시 §3 표(276행 가격사다리)와 §4 AI 위험 등록부(손가락군)도 동기화.

## 8) 착수 커맨드 (붙여넣기용)
`~/HeyHoAI에서 docs/명령서_템플릿_발굴선별강화.md와 src/recipes/seeds/recipes.jewelry.v2.js, docs/템플릿_v2_발굴선별강화_결과.md(주얼리 섹션)를 읽고, 주얼리(product/product_composite) v2 6개를 4축으로 검증·확정하라 — 싼 릴스 미보유(Sparkle Snap 🎬1·◈2 추가 여부)와 커버리지 공백(Stack&Layering / Spec Card) 두 결정을 시험하고, Scale&Sizing의 🅣 오버레이·Wrist&Hand/Unbox의 손가락 부분크롭+negative를 점검한 뒤, 각 템플릿 산출물 스펙(한/영)과 keep/cut/add 표를 마감하고 필요 시 recipes.jewelry.v2.js를 스키마 준수로 갱신(node 로딩·비용공식 검증)하라.`

---

## 공통 규칙 (모든 섹션 동일 — 요약)
- **철학**: 노스킬(유저는 프롬프트 안 씀, 양식만 고름). 출력 2종 — 📷 image_set(보통 4장·4:5) / 🎬 reel(샷수=count·9:16).
- **레시피 스키마 v1(A2 look + A5 shots)**: `{ mode, category, name, output_type, credit_cost, rationale, config:{ output{type,count,aspect_ratio}, subject{type:face|product|avatar, reference_strategy:identity_lock(face)|product_composite(product), min_refs}, look{style_preset, attributes[], wardrobe?, extra_positive, negative}, shot_strategy:'list', shots[{scene,pose,composition}], reel?{per_shot_motion[],duration_per_shot,transition,music_mood,captions}, provider{image:'nano-banana',video:'kling'} } }`
- **비용**: image_set=count×0.5 · reel=shots×2 · 온모델 착용 +1. (4장=◈2, 3샷릴=◈6, 온모델4장=◈5.) 카탈로그마다 ◈2 진입 + 싼 릴스(1~2샷 ◈2~4) 두기.
- **⚠️ 엔진**: 전역 `SAFETY_NEGATIVE`가 모든 렌더에 `text`/`logo` 주입 → 글자/브랜드 템플릿(🅣)은 AI로 글자 그리지 말고 오버레이 레이어로(+해당 negative에서 text/logo 제외). 손가락/말하는입/360 온모델은 negative 강화 + 사람검수.
- 영어 프롬프트(엔진용) + 한국어 산출물 설명(사람용) 2벌. 마켓 전략 = 공식 우선(이 세트가 출시 카탈로그 본체).
- **참고 파일**: 마스터 `/Users/jeon-yedam/HeyHoAI/docs/명령서_템플릿_발굴선별강화.md` · v2 결과 `/Users/jeon-yedam/HeyHoAI/docs/템플릿_v2_발굴선별강화_결과.md` · v2 시드 `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.jewelry.v2.js`
