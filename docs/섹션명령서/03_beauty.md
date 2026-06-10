# 섹션 작업 명령서 — 뷰티 (key: beauty)

> 이 브리프 하나만 보고 뷰티 섹션 작업을 착수·완결할 수 있다. 작업 디렉터리 `~/HeyHoAI`, 브랜치 `feat/ux-monetization-v2`.
> 표기: 📷=image_set(사진세트) · 🎬=reel(릴스) · ◈=크레딧 · ⚠️=사람검수/실험 · 🅣=텍스트 오버레이 의존 · ◈n=예상 크레딧.

---

## 1) 정체성
- **mode:** `product` (제품 1장 업로드 → 마케팅 사진/릴스 자동 생성)
- **subject:** `type=product` · `reference_strategy=product_composite` · `min_refs=1`
  - 예외 2종(아래 ③에서 확정): On-Model Glow Drop · Before/After Result Reel은 모델 얼굴이 들어가 `type=face`로 전환됨(On-Model은 `on_model_tryon`, Before/After는 `identity_lock`). 나머지 6개는 순수 제품 합성.
- **한 줄 정의:** 스튜디오 없이 스킨케어·코스메틱 셀러가 PDP·광고·소셜에 바로 쓰는 **클린 프리미엄 뷰티 비주얼**(히어로·제형 스와치·온모델 광채·before/after·루틴·성분 카드)을 양식 선택만으로 생성.

## 2) 타깃 유저 & JTBD
- **누가:** 인디 스킨케어/코스메틱 DTC 셀러, 뷰티 크리에이터, 소형 브랜드 마케터. 촬영 스튜디오·모델 예산이 없고 PDP/광고 컷이 급한 사람.
- **뭘 파나:** 세럼·크림·앰플·토너 등 **제형(텍스처)과 결과(피부 변화)가 구매 결정을 좌우**하는 제품.
- **매출에 필요한 컷(JTBD 우선순위):**
  1. **Before/After (1순위 전환 포맷)** — 뷰티 광고 전환율 최강. 사용 전·후 동일 인물 피부 변화.
  2. **듀이 글래스 히어로** — PDP 메인·광고 썸네일용 클린 프리미엄 제품 컷.
  3. **제형 스와치 매크로** — 텍스처는 뷰티 #1 신뢰 신호(크림 피크·겔 투명도). 장바구니 전환.
  4. **온모델 광채** — "이 제품 쓰면 이렇게 된다"는 결과를 파는 어스피레이셔널 컷.
  5. **루틴(GRWM)** — 최고 의도 포맷, 단계별 사용 + 언박싱 오프닝.
  6. **성분/클레임 카드** — 교육형 신뢰 콘텐츠(센텔라·레티놀 등 + % 콜아웃).
  7. **싼 진입 릴스** — 스토리/숏폼/저예산 A·B 테스트용 ◈2 글로우 클립.

## 3) 현재 상태 — **기존(existing): v2 초안 8개 검증·확정**
이 테마는 **net-new가 아니다.** `recipes.beauty.v2.js`에 8개 템플릿이 이미 작성되어 있고 비용공식 검증을 통과했다(결과 문서에 반영됨). 임무는 **이 8개를 검증·확정하고 산출물 스펙을 마무리**하는 것이다. 현재 v2 목록(시드 실제 내용 그대로):

| # | 이름 | 타입 | 컷 | ◈ | 카테고리 | 비고 |
|---|---|---|---|---|---|---|
| 1 | Dewy Glass Hero | 📷 | 4 | 2 | Hero | KEEP — ◈2 히어로 앵커 |
| 2 | Macro Swatch Lab | 📷 | 4 | 2 | Texture | KEEP — 크레딧 fix ◈4→◈2 |
| 3 | On-Model Glow Drop | 📷 | 4 | 5 | OnModel | KEEP — ◈6→◈5, `subject=face/on_model_tryon` 정정 ⚠️ |
| 4 | Before/After Result Reel | 🎬 | 2 | 4 | Reel | NEW — 뷰티 1순위 전환 ⚠️🅣 |
| 5 | GRWM Routine Reel | 🎬 | 4 | 8 | Reel | KEEP+ASMR Unbox 흡수(3→4샷) ⚠️ |
| 6 | Quick Glow Snap | 🎬 | 1 | 2 | Reel | NEW — 1샷 ◈2 최저가 릴스 티어 |
| 7 | Aesthetic Shelfie | 📷 | 4 | 2 | Lifestyle | KEEP — ◈2 라이프스타일 앵커 |
| 8 | Ingredient Claim Card | 📷 | 4 | 2 | InfoCard | NEW — 🅣 텍스트 오버레이 |

가격 사다리(검증 완료): `I2 I2 I2 I2 I5 · R2 R4 R8`. ◈2 진입 ✓, 싼 릴스 R2(Quick Glow Snap) ✓.
v1 대비 변경: ASMR Unbox Reel **삭제**(GRWM shot 1로 흡수) · Before/After·Quick Glow Snap·Ingredient Claim Card **신규** · Macro Swatch/On-Model **리프라이스**. 즉 **6개 → 8개**.

## 4) ① 발굴 (Discover) — 2026 뷰티 트렌드/포맷 + 후보 브레인스톰
현재 8개가 핵심 JTBD를 대부분 덮지만, 검증 과정에서 누락 프레임이 없는지 아래 후보 풀과 대조하라. **2026 IG Reels/TikTok/Shorts 뷰티 표준 포맷 + 전환 프레임:**

후보 8~12개(이름 · 무엇을/왜 · 📷/🎬 · 예상◈):
1. **Before/After Result Reel** · 사용 전·후 피부 변화(전환 1순위) · 🎬 2샷 · ◈4 — *이미 채택됨*
2. **Dewy Glass Hero** · 물방울·웻시트 프리미엄 히어로 · 📷 4 · ◈2 — *채택됨*
3. **Macro Swatch Lab** · 제형 발색 극접사(피크·스트링·겔 굴절) · 📷 4 · ◈2 — *채택됨*
4. **On-Model Glow Drop** · 모델 광채 도포 결과 · 📷 4 · ◈5 — *채택됨*
5. **GRWM Routine Reel** · 언박싱→바니티→도포→광채 루틴 · 🎬 4 · ◈8 — *채택됨*
6. **Ingredient Claim Card** · 성분 프롭 + 클레임 오버레이 · 📷 4 · ◈2 🅣 — *채택됨*
7. **Quick Glow Snap** · 1샷 슬로우 푸시인(스토리/숏폼 진입) · 🎬 1 · ◈2 — *채택됨*
8. **Aesthetic Shelfie** · 욕실 선반 감성 플랫레이(브랜드 세계관) · 📷 4 · ◈2 — *채택됨*
9. **Shade/Color Range Grid** · 립·쿠션 등 멀티 셰이드 스와치 그리드(컬러 제품 전환) · 📷 6 · ◈3(6컷 미드티어) — *후보: 셰이드 있는 색조 라인업에만. 현재 세트는 스킨케어 중심이라 보류 권장*
10. **Skin Texture Macro Loop** · 모델 볼 위 흡수·광택 매크로 루프 릴(ASMR 광채) · 🎬 2 · ◈4 — *후보: Quick Glow Snap·GRWM과 모션 근접 → cut 권장*
11. **"TikTok Made Me Buy It" POV** · 말 없는 표정 리액션 + 제품 클로즈업 · 🎬 1 · ◈2 — *후보: UGC 카탈로그와 중복(ugc·TikTok Discovery POV) → beauty에는 add 안 함*
12. **Application How-To Reel** · 도포 순서 단계 데모(손등→얼굴) · 🎬 3 · ◈6 — *후보: GRWM Routine과 강하게 중복 → merge 대상, 신규 슬롯 불필요*

→ 발굴 결론: **신규 추가 불필요.** 후보 9~12는 모두 (a) 현재 세트와 근접중복이거나 (b) 스킨케어 중심 카탈로그에 안 맞거나 (c) 다른 카탈로그가 이미 커버. 단 9번(Shade Grid)은 **색조 라인 확장 시 재검토**할 변형으로 메모만 남긴다.

## 5) ② 선별 (Select) — 4축 평가 + 최종 8개 확정
4축으로 현재 8개를 검증한다.

- **커버리지:** 히어로·텍스처·온모델·before/after·루틴·라이프스타일·성분카드·싼릴스 = 뷰티 핵심 상업 컷 전부 덮음. **near-duplicate 없음**(ASMR Unbox는 이미 GRWM에 흡수됨).
- **트렌드 적합:** before/after·GRWM·1샷 글로우 클립 = 2026 플랫폼 적합. 구식 립싱크·과장 ASMR 언박싱 단독 슬롯 제거 완료.
- **원가-가치:** ◈2 진입(사진 4개·릴스 1개) + ◈5 온모델(핏/QA 가산) + ◈8 풀 루틴. 임의 가산 0(공식 고정).
- **AI 난이도:** 손/얼굴/before-after 정체성이 위험군 → ⚠️ 플래그 + negative 강화로 범위 제한(아래 ③).

**keep/cut/merge/add 가이드(확정):**
- **keep(전부 8):** 위 표 그대로 — 추가 cut 불필요.
- **merge(완료):** ASMR Unbox Reel → GRWM Routine shot 1로 흡수 완료. 추가 병합 없음.
- **add(없음):** §4 결론대로 신규 추가 불필요. (Shade Grid는 색조 라인 확장 시점에만.)
- **cut(없음):** 8개 모두 가치 검증 통과.

**가격 사다리(확정):**
`📷 I2 I2 I2 I2 · I5(온모델) · 🎬 R2 R4 R8`
- ◈2 진입: Dewy Glass Hero / Macro Swatch Lab / Aesthetic Shelfie / Ingredient Claim Card (4개) ✓
- 싼 릴스: **Quick Glow Snap ◈2(1샷)** ✓ — "가장 싼 영상 ◈6" 문제 해소.
- 미드 릴스 ◈4: Before/After. 풀가 릴스 ◈8: GRWM Routine.

## 6) ③ 강화 (Enhance) — 산출물 스펙 + 레시피 확정
각 템플릿이 **정확히 무슨 사진/영상을 만드는지** 정의하고 스키마대로 레시피를 검증한다. 시드에 이미 영어 프롬프트/샷리스트/negative/모션이 작성되어 있다(`recipes.beauty.v2.js`). **확정 작업 = 아래 산출물 스펙과 시드 내용 일치 여부 점검 + 빈 항목 채움.**

**1. Dewy Glass Hero** 📷 4컷 ◈2
- 산출물: 물방울·웻시트 광택 프리미엄 히어로 4컷(정면 / 3-4 캡·드로퍼 / 드로퍼 끝 매크로 점적 / 화이트 포디엄 스타일). 4:5.
- 라이팅/렌즈: 좌측 소프트박스 key + 후면 specular rim, 100mm 매크로 f/8. 무드: high-key 루미너스. 컨텍스트: 쿨 화이트 seamless.
- negative: 병 변형/라벨 텍스트 깨짐/이중 제품/플라스틱 액체/블론 하이라이트/지문/먼지/워터마크.

**2. Macro Swatch Lab** 📷 4컷 ◈2
- 산출물: 제형 스와치 극접사 4컷(크림 피크+스트링 / 긴 스미어 sheen / 유리슬라이드 겔 굴절 / 스와치+디포커스 병). 4:5.
- 라이팅/렌즈: low raking 사이드라이트로 ridge 강조, 100mm 매크로 f/11 focus-stacking. true-to-tone 발색 필수.
- negative: 죽은 텍스처/CGI 가짜 광택/컬러 시프트/머리카락·린트/하드 섀도/플라스틱 sheen.

**3. On-Model Glow Drop** 📷 4컷 ◈5 ⚠️
- 산출물: 모델이 제품을 얼굴 옆에 들고 도포하는 광채 결과 컷 4(볼 옆 제시 / 손끝 디스펜스 / 볼 패팅 광채 / 어깨 높이 제시). `subject=face` / `on_model_tryon`.
- 라이팅/렌즈: 대형 뷰티디시 wraparound + catchlight, 85mm f/2.8. clean-girl 어스피레이셔널.
- **AI 난이도:** 손 포즈·피부 렌더 오류 가능 → `flags:[experimental, needs_human_review]`. **얼굴은 제품 옆 단일 세션 내 일관성 필수**(샷 간 정체성 드리프트 금지). negative: 여섯 손가락/기형 손/왁스 피부/과보정/uncanny 눈.

**4. Before/After Result Reel** 🎬 2샷 ◈4 ⚠️🅣
- 산출물: 동일 인물·동일 조명·동일 배경 head-and-shoulders 2프레임(before=맨피부 텍스처 보임 / after=매끈·광채). `identity_lock`.
- 모션: shot1 before 얼굴 slow push-in → cut → shot2 after hold 후 slow pull-back로 광채 공개. 샷당 3초, transition=cut, music=clean optimistic ambient, captions=auto.
- **🅣 오버레이:** "Before"/"After" 레이블은 **AI로 굽지 않고 오버레이 레이어**로 삽입(`text_overlay:true`, `look.negative`에 text/logo 미포함). 변화는 **subtle·믿을 수 있게**(과장 금지, 광고 컴플라이언스).
- **AI 난이도(이 테마 특유):** before/after **동일 인물 락이 생명** — 얼굴 morph·피부톤 드리프트·얼굴형 변화 금지. negative에 "different person / facial morph / identity drift between frames" 명시. 게시 전 사람 검수 필수.

**5. GRWM Routine Reel** 🎬 4샷 ◈8 ⚠️
- 산출물: 아침 스킨케어 루틴 4샷(① 매트 박스 언박싱 오프닝[ASMR Unbox 흡수] / ② 카운터 제품 정면 / ③ 손끝 디스펜스 매크로 / ④ 볼 패팅 광채 + 제품 옆). `subject=product`. 욕실 바니티 미러, ring light + window.
- 모션: 박스 push-in→lid 리빌 → 카운터 push-in → 디스펜스 따라가는 slow pan → 광채 얼굴 tilt-up. 샷당 3초, transition=whip, music=upbeat clean-girl pop.
- **AI 난이도:** 손 포즈(디스펜싱·터치) 렌더 오류 빈도 높음 → 손 negative 강화 + `needs_human_review`. 미러 반사 mismatch / 프레임 간 제품 morph 금지.

**6. Quick Glow Snap** 🎬 1샷 ◈2
- 산출물: 히어로 제품 1샷 시네마틱 릴(frosted riser + 물방울, slow push-in, 마지막 soft lens flare). 스토리·숏폼·저예산 A/B 진입.
- 모션: mid→close slow cinematic push-in, 병 엣지 soft lens flare bloom으로 종료. 4초, transition=fade, music=clean ambient swell.
- negative: 제품 변형/라벨 깨짐/흔들리는 모션/하드 플래시.

**7. Aesthetic Shelfie** 📷 4컷 ◈2
- 산출물: 욕실 선반 스타일링 플랫레이 4컷(트래버틴 선반 + 세라믹 트레이·드라이 팜파스 / 오크 선반 + 린넨·캔들 / 탑다운 / 디테일 보케). 4:5.
- 라이팅/렌즈: 아침 창광 raking, 50mm f/4. 웜 베이지-크림, slow-living 무드.
- negative: 제품 변형/지저분한 선반/충돌 색/한낮 하드광/기운 수평선.

**8. Ingredient Claim Card** 📷 4컷 ◈2 🅣
- 산출물: 성분·클레임 정보 카드 배경 4컷(우측 여백 확보 / 성분 프롭[센텔라 잎·레티놀 바이알] 병치 / 성분 텍스처 보케 / 탑다운 미니멀). 오버레이 텍스트용 **여백(negative space) 확보**가 핵심.
- 라이팅/렌즈: soft diffused flat, 최대 선명도·발색. clinical-yet-luxurious.
- **🅣 오버레이:** 성분명·클레임 헤드라인·% 콜아웃·브랜드 로고 위치는 **렌더 후 오버레이 파이프라인에서 합성**(`text_overlay:true`, `text_overlay_fields` 정의됨). `look.negative`에 text/logo 미포함(전역 SAFETY_NEGATIVE와 중복 금지). 제품 패키징 외 글자를 AI가 그리지 않게.

**이 테마 특유의 AI 난이도/🅣 주의 (요약):**
- 🅣 2개(Before/After 라벨, Ingredient Claim Card)는 글자를 **오버레이로만** — AI가 라벨/성분 텍스트를 그리면 SAFETY_NEGATIVE 충돌로 깨짐.
- ⚠️ 3개(On-Model·Before/After·GRWM): 손가락 렌더 + before/after **동일 인물 락**이 핵심 리스크. negative 강화 + 게시 전 사람 검수 게이트.

## 7) 산출물 (Deliverables)
1. **`/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.beauty.v2.js`** — 이미 존재(8개). 검증·확정만, 스키마 §끝 준수 재확인(전 항목 `node` 로딩 + 비용공식 검증). 누락 필드 있으면 보강.
2. **한국어 산출물 스펙** — 위 ③의 8개 스펙(무슨 사진/영상·컷수·씬/구도/무드) + 영어 프롬프트(시드 내) 2벌.
3. **keep/cut/add 표 (확정):**

| 이름 | 결정 | 이유 |
|---|---|---|
| Dewy Glass Hero | keep | ◈2 히어로 앵커 |
| Macro Swatch Lab | keep(repriced) | 4컷=◈2 공식 |
| On-Model Glow Drop | keep(repriced+fix) | ◈5 / face·on_model_tryon 정정 |
| Before/After Result Reel | add(NEW) | 뷰티 1순위 전환, 동일인물 락 |
| GRWM Routine Reel | keep(+merge) | ASMR Unbox 흡수, 4샷 ◈8 |
| Quick Glow Snap | add(NEW) | 1샷 ◈2 싼 릴스 진입 |
| Aesthetic Shelfie | keep | ◈2 라이프스타일 |
| Ingredient Claim Card | add(NEW) 🅣 | 성분/클레임 오버레이 |
| ASMR Unbox Reel | **cut→merge** | GRWM shot 1로 흡수 |
| Shade/Color Range Grid | (보류) | 색조 라인 확장 시 재검토 |

4. 동기화 권장: `docs/템플릿_한국어_카탈로그.md`(v2), `public/_overview.html`(v2)에 뷰티 8개 반영.

## 8) 착수 커맨드 (붙여넣기용)
> `~/HeyHoAI`에서 `src/recipes/seeds/recipes.beauty.v2.js`(8개)·`docs/명령서_템플릿_발굴선별강화.md`·`docs/템플릿_v2_발굴선별강화_결과.md`를 읽고, 뷰티 섹션 v2 8개(Dewy Glass Hero·Macro Swatch Lab·On-Model Glow Drop·Before/After·GRWM Routine·Quick Glow Snap·Aesthetic Shelfie·Ingredient Claim Card)를 4축으로 검증·확정하고, 각 템플릿 산출물 스펙(한/영)·🅣 오버레이 2개·⚠️ 정체성/손 리스크를 마무리한 뒤 시드를 `node` 로딩+비용공식으로 재검증해줘.

---

## 공통 규칙 (모든 섹션 동일 — 참고)
- **철학:** 노스킬(유저는 프롬프트 안 씀, 양식만 고름). 출력 2종: 📷 image_set(보통 4장, 4:5) / 🎬 reel(샷수=count, 9:16).
- **레시피 스키마 v1(A2 look + A5 shots):** `{ mode, category, name, output_type, credit_cost, rationale, config:{ output{type,count,aspect_ratio}, subject{type:face|product|avatar, reference_strategy:identity_lock(face)|product_composite(product), min_refs}, look{style_preset, attributes[], wardrobe?, extra_positive, negative}, shot_strategy:'list', shots[{scene,pose,composition}], reel?{per_shot_motion[],duration_per_shot,transition,music_mood,captions}, provider{image:'nano-banana',video:'kling'} } }`
- **비용 규칙:** image_set=count×0.5, reel=shots×2, 온모델 착용 +1. (4장=◈2, 3샷릴=◈6, 온모델4장=◈5). 각 카탈로그에 ◈2 진입 + 싼 릴스(1~2샷 ◈2~4).
- **⚠️ 엔진:** 전역 SAFETY_NEGATIVE가 모든 렌더에 'text','logo' 주입 → 글자/브랜드 템플릿(🅣)은 글자를 AI로 그리지 말고 오버레이 레이어로(`text_overlay:true` + 해당 `look.negative`에서 text/logo 제외). 손가락/말하는입/360 온모델은 negative 강화 + 사람검수.
- **언어:** 영어 프롬프트(엔진용) + 한국어 산출물 설명(사람용) 2벌. 마켓 전략 = 공식 우선(이 세트가 출시 카탈로그 본체).
- **참고 파일:** 마스터 `/Users/jeon-yedam/HeyHoAI/docs/명령서_템플릿_발굴선별강화.md` · v2 결과 `/Users/jeon-yedam/HeyHoAI/docs/템플릿_v2_발굴선별강화_결과.md` · v2 시드 `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.beauty.v2.js`
