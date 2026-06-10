# 섹션 작업 명령서 — UGC 광고 (key: ugc)

> 자기완결 브리프. 이 문서 하나로 UGC 광고 섹션의 **검증·확정 + 산출물 스펙 마무리**를 착수할 수 있다. 작업 디렉터리 `~/HeyHoAI`, 브랜치 `feat/ux-monetization-v2`.
> 표기: 📷 image_set · 🎬 reel · ◈ 크레딧 · ⚠️ 사람검수/실험 · 🅣 텍스트 오버레이 의존.

---

## 1) 정체성

- **mode**: `ugc`
- **subject**: `type: avatar` · `reference_strategy: identity_lock` · `min_refs: 1` — 유저가 올린 **얼굴 셀카 1장**으로 같은 인물(크리에이터/스포크스퍼슨)을 락. (v2 시드 7개 전부 `subject.type:"avatar"` + `identity_lock`. 테마 힌트의 `subject=avatar|face`는 동일 인물 락이라는 의미 — 엔진상 face 정체성 보존 전략과 같음.)
- **한 줄 정의**: 크리에이터 얼굴 1장을 **스포크스퍼슨 광고**(정적 포토광고·POV 디스커버리·훅+CTA·언박싱·문제→해결·토킹헤드·풀데모)로 자동 변환하는, **전환(DR) 최적화 UGC 카탈로그**. 노스킬 — 유저는 양식만 고르고 (말하는 컷은) 짧은 스크립트만 채운다.

## 2) 타깃 유저 & JTBD

- **누가**: DTC/이커머스 셀러, 앱 마케터, 솔로 파운더, 제휴(affiliate) 크리에이터, 퍼포먼스 광고 운영자. 실제 인플루언서 섭외·촬영 없이 **UGC 스타일 광고 소재**를 대량·저가로 뽑으려는 사람.
- **뭘 파나**: 제품/앱/구독 — Meta·TikTok·Shorts 피드 광고 및 오가닉 소셜 포스트용 **광고 크리에이티브**.
- **어떤 컷이 매출에 필요한가 (구체)**:
  - **정적 포토광고** — 가장 높은 레버리지. 립싱크 0, 즉시 A/B용 다수 변형. 헤드라인/CTA는 오버레이. (페이드 광고 본체)
  - **POV 디스커버리** (`#TikTokMadeMeBuyIt`) — 말 없이 표정·리액션만. 2026 TikTok Shop/Reels 최다 바이럴 진입 포맷, 생성 성공률 최고.
  - **훅+CTA 2컷** — 1초 스크롤스탑 훅 → 즉시 CTA. 퍼포먼스 광고 A/B 훅 테스트.
  - **언박싱 리액션** — '방금 도착' 에너지, PR패키지/신규드롭 욕망 자극.
  - **문제→해결** — DR 광고 전환율 최고 감정 아크(페인 → 제품 → 해소).
  - **토킹헤드 후기** — 솔로 파운더/affiliate의 신뢰 빌더(페이스캠 추천).
  - **풀 데모** — 회의적 시청자를 설득하는 핸즈온 사용 시연(구두 주장 + 온스크린 증거).
- **이 테마 특유의 매출 포인트**: 컷이 "예뻐서"가 아니라 **전환(클릭·구매)** 때문에 팔린다. 그래서 가격사다리 바닥(◈2 정적 + ◈2 POV)이 핵심 — 싸게 많이 돌려 위너를 찾는 구조.

## 3) 현재 상태 — **기존 테마 (v2 초안 7개 존재 → 검증·확정 + 산출물 스펙 마무리)**

`src/recipes/seeds/recipes.ugc.v2.js`에 7개가 이미 작성되어 있고 `node` 로딩·비용공식 검증 통과. **net-new가 아님.** 아래 목록을 그대로 검증·확정한다.

| # | 이름 | 타입 | 컷 | ◈ | category | 비고 |
|---|---|---|---|---|---|---|
| 1 | Static UGC Photo Ad 🅣 | 📷 image_set | 4 | 2 | Static | `text_overlay:true`, 립싱크 0, 최저가 진입 (신규 add) |
| 2 | TikTok Discovery POV | 🎬 reel | 1 | 2 | Discovery | 말 없음(리액션만), `captions:auto` (신규 add, 구 Street Interview 교체) |
| 3 | Hook + CTA Ad ⚠️ | 🎬 reel | 2 | 4 | Demo | 컷당 1문장 립싱크 (◈8→◈4, 4→2샷 리프라이스) |
| 4 | Unboxing Reaction ⚠️ | 🎬 reel | 2 | 4 | Reaction | Shot1 손 B롤(립싱크0) + Shot2 1문장 (◈8→◈4, 4→2샷) |
| 5 | Problem → Solution ⚠️ | 🎬 reel | 3 | 6 | Talking | 문제→소개→해결 감정 아크 (◈8→◈6, 4→3샷) |
| 6 | Talking-Head Testimonial ⚠️ | 🎬 reel | 3 | 6 | Talking | 구 토킹헤드 3개 → 1개 통합 (◈8→◈6, 4→3샷) |
| 7 | Product Demo ⚠️ | 🎬 reel | 4 | 8 | Demo | 유일하게 풀가 ◈8 정당화, Shot2 B롤 VO |

- **cut됨**: Street Interview(AI 신뢰도 최저) → TikTok Discovery POV로 교체. talking-head 중복 2개 → Testimonial 1개로 통합.
- **가격사다리**: `I2 · R2 R4 R4 R6 R6 R8` — ◈2 사진 진입 ✓, 싼 릴스 ◈2(POV) ✓. 위반 0.
- **확정 작업의 핵심 = 검증**: (a) 7개가 7개 JTBD를 중복 없이 덮는가, (b) 가격사다리·비용공식 정합, (c) 립싱크 5개의 negative/B롤 분리가 충분한가, (d) 🅣 Static의 text 오버레이 처리가 맞는가, (e) **산출물 스펙(아래 ⑥/⑦)을 한국어로 사람이 결과 예측 가능하게 마무리.**

## 4) ① 발굴 (이 테마 2026 트렌드·플랫폼 포맷 + 빠진 전환 프레임)

> 진단상 UGC는 v1에서 **4/10 최약**(6개 전부 ◈8 립싱크 릴, 정적·◈2 진입 없음, 토킹헤드 3중복)이었음. v2가 이를 풀었는지 검증하기 위해, 현 7개와 비교할 **후보 풀**을 폭넓게 브레인스톰한다. (★=v2에 이미 채택)

| 후보 | 무엇을 / 왜 | 사진/영상 | 예상◈ |
|---|---|---|---|
| Static UGC Photo Ad ★ | 크리에이터+제품 정적 광고 4컷, 헤드라인/CTA 오버레이. 립싱크0 최고 레버리지 | 📷4 | ◈2 |
| TikTok Discovery POV ★ | `#TikTokMadeMeBuyIt` 발견·집어듦 리액션, 말 없음 | 🎬1 | ◈2 |
| Hook + CTA Ad ★ | 스크롤스탑 훅 1문장 → CTA 1문장 | 🎬2 | ◈4 |
| Unboxing Reaction ★ | 손 B롤 개봉 + 얼굴 감탄 1문장 | 🎬2 | ◈4 |
| Problem → Solution ★ | 페인 → 제품 → 해소 감정 아크 | 🎬3 | ◈6 |
| Talking-Head Testimonial ★ | 페이스캠 후기(훅·혜택·추천+CTA) | 🎬3 | ◈6 |
| Product Demo ★ | 핸즈온 풀 시연(말+증거) | 🎬4 | ◈8 |
| "3 reasons / listicle" POV | 손가락 카운트 + 자막 3가지 이유, 빠른 컷. 말 최소(자막 중심) | 🎬2~3 | ◈4~6 |
| Text-Hook Static Carousel 🅣 | 4컷 전부 굵은 자막 훅("I was today years old…"), 얼굴 정적 | 📷4 | ◈2 |
| Duet/Reaction Split | 상단 "원본"·하단 크리에이터 반응(말 없음) — 합성 난이도↑ | 🎬1~2 | ◈4 |
| "Get Ready With Me + product" | GRWM 흐름에 제품 끼워넣기 — influencer GRWM과 중복 위험 | 🎬3 | ◈6 |
| Comparison / vs (A vs B) 🅣 | 두 제품/전후 비교, 오버레이 라벨 | 📷4 / 🎬2 | ◈2~4 |
| ASMR Product Whisper | 무음 ASMR(제품 만지기·바스락) — pet/beauty ASMR과 톤 중복 | 🎬2 | ◈4 |
| "Honest review" cut-heavy | 다컷 점프컷 솔직후기 — Testimonial과 근접중복 | 🎬3~4 | ◈6~8 |
| Founder Story / brand POV | 파운더 1인칭 브랜드 서사 — Testimonial 변형으로 흡수 가능 | 🎬3 | ◈6 |

**빠진 전환 프레임 점검**: 정적 광고(★해결), ◈2 진입(★해결), 말없는 POV(★해결), B롤 분리 언박싱(★해결). → **현 7개로 핵심 JTBD는 덮임.** 추가 검토 가치 있는 단 하나는 **Text-Hook Static Carousel** 또는 **Listicle POV**(아래 선별에서 판단).

## 5) ② 선별 (4축 평가 → 최종 권장 + keep/cut/merge/add + 가격사다리)

**4축 평가 (현 v2 7개):**

| 템플릿 | 커버리지 | 트렌드 | 원가-가치 | AI난이도 | 판정 |
|---|---|---|---|---|---|
| Static UGC Photo Ad | 정적 광고(고유) | 높음 | ◈2 최고 | 낮음(🅣만 주의) | **keep** |
| TikTok Discovery POV | 발견 POV(고유) | 매우 높음 | ◈2 | 낮음(말없음) | **keep** |
| Hook + CTA Ad | 퍼포먼스 훅(고유) | 높음 | ◈4 | 중(립싱크1문장) | **keep ⚠️** |
| Unboxing Reaction | 언박싱(고유) | 높음 | ◈4 | 중(B롤로 완화) | **keep ⚠️** |
| Problem → Solution | DR 아크(고유) | 높음 | ◈6 | 중상(3컷 립싱크) | **keep ⚠️** |
| Talking-Head Testimonial | 후기(고유) | 중상 | ◈6 | 중상(올토킹) | **keep ⚠️** |
| Product Demo | 풀데모(고유) | 중 | ◈8(풀가) | 상(4컷 립싱크) | **keep ⚠️** |

- **권장 최종 = 7개 유지** (테마 힌트의 7개 JTBD와 1:1 정합, 중복 0). 6~8 범위 내.
- **keep/cut/merge/add 가이드(확정 시 판단)**:
  - **cut**: 없음(이미 Street Interview·토킹헤드 2개 정리됨).
  - **merge**: 없음. (Founder Story는 Testimonial의 `editable_slots`/`parent_id` 변형으로 흡수 — 신규 슬롯 만들지 말 것.)
  - **add (옵션, 8개로 늘릴 경우만)**: **Text-Hook Static Carousel 🅣**(📷4 ◈2) — 얼굴+굵은 자막 훅, 정적 광고의 자막중심 변형. 단 Static UGC Photo Ad와 근접중복 위험 → **권장은 add보다 Static의 variant로 흡수.** 현 7개 유지를 1순위 권장.
- **가격사다리 (확정)**: `📷I2 · 🎬R2 R4 R4 R6 R6 R8`
  - ◈2 진입 ✓ (Static 사진)
  - 싼 릴스 ◈2 ✓ (POV 1샷) — "가장 싼 영상이 ◈6" 문제 해소.
  - 비용공식: image=count×0.5 → 4컷=◈2. reel=shots×2 → 1/2/3/4샷=◈2/4/6/8. **위반 0** (이미 검증).

## 6) ③ 강화 — 각 템플릿 산출물 스펙 + 레시피 + 테마 특유 주의

> **이 테마 특유의 AI 난이도**: ① **립싱크/말하는 입** — 5개(Hook·Unboxing·Problem→Solution·Talking-Head·Product Demo)에서 치아 모핑·입 비동기·정체성 드리프트 위험. 완화책 = **샷당 1~2문장 엄수 + B롤 컷 끼우기 + negative 강화 + `meta.flags:[experimental, needs_human_review]`**. ② **🅣 오버레이** — Static UGC Photo Ad의 헤드라인/CTA는 **AI로 글자를 그리지 말 것.** 전역 `SAFETY_NEGATIVE`가 모든 렌더에 `text`/`logo`를 주입하므로, 글자는 렌더 후 **결정적 오버레이 레이어**로 합성하고 해당 템플릿 `look.negative`에서는 text/logo를 **제외**(전역과 충돌 방지). ③ **손/손가락** — 언박싱·데모의 손 조작 컷에 "단일 손·정확히 5손가락" negative.

**산출물 스펙 (사람이 결과를 예측 가능하게):**

1. **Static UGC Photo Ad 🅣** — 같은 크리에이터의 **정적 광고 사진 4컷(4:5)**: ①거실 미디엄(제품 가슴높이·정면 미소) ②테이블 클로즈업(양손 제품·라벨 정면) ③화장대/욕실 라이프스타일 클로즈업 ④거실 미디엄(제품 얼굴 옆·고개 기울임). 헤드라인은 Shot1 상단, CTA는 Shot4 하단에 **오버레이 합성**. 립싱크 0.
   - 레시피 핵심: `style_preset:Natural`, `lighting:soft_window_key`, `color:warm_neutral`, `texture:skin_natural_pores`, `context:home_interior_bokeh`. extra_positive="authentic iPhone-shot UGC still, creator holding product naturally, product label sharp, shallow DOF bokeh, organic social post feel". negative=`studio overlit, fake smile, floating product, extra fingers, warped hands, plastic waxy skin, dead eyes` **(text/logo 미포함)**. `text_overlay:true`.

2. **TikTok Discovery POV** — **1샷 리액션 릴(9:16, 4초)**: 테이블 위 제품으로 손을 뻗어 집어 들고, 눈 크게 뜨고 감탄하는 표정. **말 없음**(효과음+트렌딩 BGM). 상단 자막 "POV: TikTok made me buy it 🛒".
   - 모션: "handheld push-in following the hand reach, slight zoom as product lifts, hold on delighted reaction". negative=`talking mouth forming words, lip movement suggesting speech, frozen blank expression, extra fingers, warped product`. `music_mood:playful_viral_trending`, `captions:auto`.

3. **Hook + CTA Ad ⚠️** — **2샷 릴(9:16, 샷3초)**: Shot1 손가락 카메라 지목 훅 1문장("stop scrolling if you…"), Shot2 제품 얼굴 옆 들고 CTA 1문장("tap the link now")+바이오 지목. 펀치 라이팅, whip 전환.
   - 모션: ["fast snap zoom-in, lips synced to single sentence", "quick push-in as product lifts, lip-synced CTA"]. negative=`lip-sync desync, tooth morph, warped mouth, identity drift, low energy, frozen mouth`. `flags:[experimental, needs_human_review]`.

4. **Unboxing Reaction ⚠️** — **2샷 릴**: Shot1 탑다운 손 B롤(박스 개봉, **얼굴 없음·말 없음**), Shot2 얼굴 감탄 리액션 1문장+바이오 지목. 립싱크 의존도 최소(Shot1=무음 B롤).
   - 모션: ["top-down push-in as box opens, music+SFX only", "quick zoom on gasp, short 1-sentence lip-synced line"]. negative=`lip-sync desync, warped packaging, distorted product, extra fingers, mangled hands, glitched text on box`. **렌더노트: 립싱크 오류 시 Shot2를 무음 리액션으로 대체 가능.**

5. **Problem → Solution ⚠️** — **3샷 릴**: Shot1 좌절 표정+쿨 디새추레이트 라이팅(문제 1문장), Shot2 회의적-호기심 제품 소개+전환 라이팅(피벗 1문장 "so I tried this"), Shot3 안도·행복+따뜻한 골든 라이팅(해소+CTA 1문장). 감정 전환은 **표정·조명**으로, 대사는 최소.
   - `lighting:moody_to_bright_shift`, `color:cool_then_warm`. negative=`lip-sync desync, overacted fake emotion, theatrical soap-opera lighting, frozen mouth`. `transition:fade`, `music_mood:tense_then_uplifting`.

6. **Talking-Head Testimonial ⚠️** — **3샷 페이스캠 릴**: Shot1 공감 훅(오픈 핸드 제스처), Shot2 제품 얼굴 옆 들고 핵심 혜택, Shot3 자신감 끄덕임 추천+바이오 지목. 컷당 1~2문장. 셀프 아이폰 프론트캠 룩.
   - 모션: ["slow push-in on hook", "static handheld micro-sway, product in frame", "slow pull-back on CTA nod"]. negative=`stiff frozen mouth, robotic delivery, identity drift, studio overlit infomercial look, duplicated person`. **B롤 컷 없으므로 표정·제스처로 단조로움 방지, 립싱크 오류 시 자막 우선.**

7. **Product Demo ⚠️** — **4샷 풀 데모 릴(◈8 풀가)**: Shot1 제품 소개(페이스, 1문장), Shot2 **오버더숄더 손 B롤**(조작, 얼굴 없음·VO만), Shot3 사용/도포 클로즈업(결과 나레이션 1문장), Shot4 완성 결과 제시+CTA 1문장. 구두 주장+온스크린 증거 결합.
   - negative=`lip-sync desync, warped product, distorted label text, extra fingers, melted hands, floating product, glitched UI text`. **렌더노트: Shot2를 얼굴 없는 B롤+VO로 처리해 오류 위험 감소.**

## 7) 산출물

- **`src/recipes/seeds/recipes.ugc.v2.js`** — **이미 존재(7개, 검증 통과). 확정 시 갱신만**: (a) 7개 검증 후 그대로 확정, (b) 산출물 스펙(⑥)이 시드 `meta`/`rationale`에 충분히 반영됐는지 점검, (c) 8개로 늘릴 경우에만 Text-Hook 변형을 `parent_id`로 추가(권장은 7개 유지).
- **한국어 산출물 스펙** — ⑥의 7개 스펙을 `docs/템플릿_한국어_카탈로그.md`(v2)와 `public/_overview.html`(v2)에 동기화. (마스터 결과 문서 §1 UGC 표 라인 255~263과 정합 유지.)
- **keep/cut/add 표 (확정본)**:

| 항목 | 내용 |
|---|---|
| keep | 7개 전부 (Static·POV·Hook+CTA·Unboxing·Problem→Solution·Talking-Head·Product Demo) |
| cut | 없음 (Street Interview·토킹헤드 2개는 v2에서 이미 정리) |
| merge | 없음 (Founder Story 등은 Testimonial의 variant로 흡수) |
| add | 권장 0 (옵션: Text-Hook Static Carousel 🅣 — 단 Static과 근접중복, variant 흡수 권장) |

- **메모**: 🅣 1개(Static UGC Photo Ad — 헤드라인·CTA 오버레이). ⚠️ 5개(립싱크). 엔진 작업 필요: `text_overlay` 플래그 소비 + 템플릿별 negative 분리 + 오버레이 합성(`src/images/imagePrompt.builder.js`). 게시 전 립싱크 5개 사람검수 게이트.

## 8) 착수 커맨드 (붙여넣기용)

`~/HeyHoAI에서 docs/명령서_템플릿_발굴선별강화.md와 docs/템플릿_v2_발굴선별강화_결과.md(§1 UGC 표)와 src/recipes/seeds/recipes.ugc.v2.js를 읽고, UGC 광고 7개 템플릿을 4축(커버리지·트렌드·원가가치·AI난이도)으로 검증·확정한 뒤, 각 템플릿 산출물 스펙(한/영)을 마무리하고 docs/템플릿_한국어_카탈로그.md·public/_overview.html을 v2로 동기화해. 립싱크 5개 negative/B롤 분리와 Static UGC Photo Ad의 text_overlay(전역 SAFETY_NEGATIVE 충돌 회피)를 반드시 점검하고, 7개 유지를 기본으로 8개 확장은 parent_id 변형으로만 검토해.`

---

## 공통 규칙 (모든 섹션 동일 — 요약 인용)

- **노스킬**: 유저는 프롬프트 안 씀, 양식만 고름(말하는 UGC 컷은 짧은 스크립트만). 출력 2종 — 📷 image_set(보통 4장, 4:5) / 🎬 reel(샷수=count, 9:16).
- **스키마 v1 (A2 look + A5 shots)**: `{ mode, category, name, output_type, credit_cost, rationale, config:{ output{type,count,aspect_ratio}, subject{type:avatar, reference_strategy:identity_lock, min_refs}, look{style_preset, attributes[], wardrobe?, extra_positive, negative}, shot_strategy:'list', shots[{scene,pose,composition}], reel?{per_shot_motion[],duration_per_shot,transition,music_mood,captions}, provider{image:'nano-banana',video:'kling'} } }`
- **비용 규칙**: image_set=count×0.5, reel=shots×2, 온모델 착용 +1. (4장=◈2, 3샷릴=◈6, 4샷릴=◈8). 각 카탈로그에 ◈2 진입 + 싼 릴스(1~2샷 ◈2~4). → UGC는 Static ◈2 진입 + POV ◈2 릴로 충족.
- **⚠️ 엔진**: 전역 `SAFETY_NEGATIVE`가 모든 렌더에 `text`/`logo` 주입 → 글자/브랜드(🅣)는 AI로 그리지 말고 오버레이 레이어로(해당 template `negative`에서 text/logo 제외). 손가락/말하는입/360은 negative 강화+사람검수.
- **2벌 산출**: 영어 프롬프트(엔진용) + 한국어 설명(사람용). 마켓 전략=공식 우선(이 세트가 출시 카탈로그 본체).
- **참고 파일**: 마스터 `/Users/jeon-yedam/HeyHoAI/docs/명령서_템플릿_발굴선별강화.md` · v2 결과 `/Users/jeon-yedam/HeyHoAI/docs/템플릿_v2_발굴선별강화_결과.md` · v2 시드 `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.ugc.v2.js`
