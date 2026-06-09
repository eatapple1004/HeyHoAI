# 섹션 작업 명령서 — 펫 (key: pet)

> 이 브리프 하나로 펫 섹션 착수 가능(self-contained). 작업 디렉터리 `~/HeyHoAI`, 브랜치 `feat/ux-monetization-v2`.
> 상태 = **기존(existing)**. v2 초안이 이미 있으므로 임무는 **재발굴이 아니라 "검증·확정 + 산출물 스펙 마무리"** 다.
> 표기: 📷=image_set(보통 4장·4:5) · 🎬=reel(샷수=count·9:16) · ◈=크레딧 · ⚠️=사람검수/실험 · 🅣=텍스트 오버레이 의존.

---

## 1) 정체성
- **mode**: `product`
- **subject**: `type = product` / `reference_strategy = product_composite` (제품 단독·라이프스타일·매크로 컷) — 단, 착용 컷은 `on_model_tryon`(=온펫, +1 가산), 토킹/줌이 릴스는 펫이 등장하나 업로드 레퍼런스는 여전히 제품.
- **한 줄 정의**: 펫 셀러(사료·간식·장난감·하네스/바난다/펫웨어·펫 액세서리)가 **제품 사진 1장**만 올리면, 합성 위험 0의 깨끗한 제품 히어로부터 반려동물 라이프스타일·간식 매크로·온펫 핏·줌이/토킹펫 릴스까지 **양식만 고르면** 마케팅 컷이 나오는 카탈로그.

---

## 2) 타깃 유저 & JTBD
- **누가**: Etsy/Shopify/Coupang/스마트스토어의 펫 DTC 셀러, 수제 간식·핸드메이드 액세서리 1인 브랜드, 펫 사료/장난감 브랜드 SNS 담당.
- **뭘 파나**: 간식·츄·사료(품질·식감으로 가격 정당화), 장난감(반응·재미가 구매 트리거), 하네스/칼라/바난다/펫웨어(핏·착용 모습이 구매 1순위 불안), 펫 가구·액세서리.
- **어떤 컷이 매출에 필요한가**:
  1. **신뢰 진입 히어로** — 펫 없이 제품만 깨끗하게(합성/모핑 위험 0). 상세페이지 첫 컷·썸네일. → `Pet Product Hero`
  2. **감성 라이프스타일** — 반려동물 옆 포근한 무드. 스크롤 멈춤·저장. → `Cuddle Hour`
  3. **품질 매크로** — 간식 식감/원료 극접사로 프리미엄 가격 정당화. → `Macro Crunch`
  4. **온펫 핏(펫판 온모델)** — 웨어러블이 실제로 착용됐을 때의 핏/하드웨어. 사이즈 불안 해소. → `On-Pet Fit`
  5. **고에너지 반응 릴** — 장난감이 즐거운 놀이를 트리거하는 'wait for it' 페이오프 → 공유 폭발. → `Wait For The Zoomies`
  6. **바이럴 UGC** — 펫이 '말하는' 코믹 광고로 도달 확대. → `Talking Pet Skit`

---

## 3) 현재 상태 — (기존) v2 초안 6개 [검증·확정 대상]

`src/recipes/seeds/recipes.pet.v2.js` 실제 로딩 확인. 카테고리·타입·◈는 시드 그대로:

| # | 이름 | 카테고리 | 타입 | 컷 | ◈ | 플래그 | v1→v2 결정 |
|---|---|---|---|---|---|---|---|
| 1 | Pet Product Hero 🅣 | Hero | 📷 | 4 | 2 | text_overlay | **ADD** (합성위험0 안전 ◈2 진입) |
| 2 | Cuddle Hour | Lifestyle | 📷 | 4 | 2 | — | **KEEP** |
| 3 | Macro Crunch | Detail | 📷 | 4 | 2 | — | **FIX** ◈4→◈2 (4×0.5) |
| 4 | On-Pet Fit ⚠️ | OnPet | 📷 | 4 | 5 | experimental·needs_human_review | **KEEP+FLAG** (on_model_tryon=◈5) |
| 5 | Wait For The Zoomies | Reel | 🎬 | 3 | 6 | — | **KEEP** |
| 6 | Talking Pet Skit ⚠️ | UGC | 🎬 | 2 | 4 | experimental·needs_human_review | **SCOPE** 3→2샷, ◈8→◈4 |
| (cut) | Pet POV Taste Test | — | — | — | — | — | **DROP** (Zoomies와 에너지 근접, Hero/Macro로 커버) |

가격 사다리(검증 완료): `I2 I2 I2 I5 · R4 R6` — ◈2 진입 ✓, 싼 릴스 R4(Talking Pet) ✓. 위반 0.
**임무**: 위 6개를 진단(6.5/10)·트렌드·AI난이도 기준으로 검증하고, 각 템플릿이 정확히 무슨 사진/영상을 만드는지 산출물 스펙을 확정하라. 아래 ④~⑥은 검증을 위한 작업 가이드.

---

## 4) ① 발굴 — 검증용 후보 풀 (이 6개로 충분한지 역검증)

**2026 펫 콘텐츠 트렌드/플랫폼 포맷**: ① "pet tax"·talking-pet 자막 밈(TikTok/Reels 펫 채널 1순위) ② #TikTokMadeMeBuyIt 펫 발견 POV ③ 첫 반응(first-try) 간식 ASMR 크런치 ④ before/after 그루밍·체중·털결 ⑤ "get ready with my dog"(GRWM 패러디) ⑥ 산책 브이로그 day-in-life ⑦ 사이즈 가이드(소형/중형/대형견 핏 비교) ⑧ 무지개다리/추모 등 감성(상업성 낮음).

빠진 전환 프레임 관점 후보 8~12개:

1. **Pet Product Hero** 📷 ◈2 — 제품 단독 에디토리얼 스틸(펫 없음). *채택됨.*
2. **Cuddle Hour** 📷 ◈2 — 반려동물 옆 포근 라이프스타일. *채택됨.*
3. **Macro Crunch** 📷 ◈2 — 간식 식감/원료 극접사. *채택됨.*
4. **On-Pet Fit** 📷 ◈5 — 웨어러블 온펫 착용. *채택됨(⚠️).*
5. **Wait For The Zoomies** 🎬 ◈6 — 장난감 줌이 반응 3샷. *채택됨.*
6. **Talking Pet Skit** 🎬 ◈4 — B롤+2문장 토킹펫. *채택됨(⚠️).*
7. ~~Pet POV Taste Test~~ 🎬 — 펫 1인칭 시식. **컷**(Zoomies와 고에너지 반응 근접중복, 입 모핑 리스크 중복).
8. **Size Guide / Fit Compare** 📷 ◈2 🅣 — 소·중·대형견 핏 비교 그리드 + 사이즈 오버레이. *후보(현재 미채택, §5 add 검토).*
9. **First-Try Reaction Reel** 🎬 ◈4 — 간식 첫 반응 2샷(B롤+리액션). *후보(현재 미채택).*
10. **Before/After Grooming** 📷 ◈2 — 그루밍/털결 전후. *후보(스코프 밖: 펫 외형 모핑 리스크↑, 상업 전환 약).*
11. **Walk Day-in-Life Reel** 🎬 ◈4 — 산책 브이로그. *후보(라이프스타일 중복).*
12. **Single-Hero Sizzle** 🎬 ◈2 — 1샷 제품 즉시 게시 릴. *후보(싼 릴스 더 내릴 여지, §5 검토).*

**역검증 결론**: 채택 6개가 깨끗히어로·라이프스타일·매크로·온펫·줌이·토킹 6개 핵심 JTBD를 덮음. 8(Size Guide)·12(1샷 ◈2 릴)는 슬롯 여유 시 강한 add 후보.

---

## 5) ② 선별 — 4축 검증 + keep/cut/merge/add

4축으로 현재 6개 점검:

| 템플릿 | 커버리지 | 트렌드 적합 | 원가-가치 | AI 난이도 | 판정 |
|---|---|---|---|---|---|
| Pet Product Hero | 신뢰 진입(유일 무위험) | 상세페이지 표준 | ◈2 정직 | **낮음(펫 없음)** | **keep** |
| Cuddle Hour | 감성 라이프스타일 | 펫 SNS 핵심 | ◈2 | 중(펫 합성·사지 negative 필요) | **keep** |
| Macro Crunch | 품질·식감 | ASMR 크런치 적합 | ◈2 | 낮음(제품만) | **keep** |
| On-Pet Fit | 웨어러블 핏(전환1순위) | 사이즈 가이드 수요 | ◈5(온모델+1 정합) | **높음**(털-제품 융합·muzzle 왜곡) | **keep + ⚠️ 유지** |
| Wait For The Zoomies | 장난감 반응 | TikTok 'wait for it' | ◈6(3샷×2) | 중(모션블러 제품 뭉개짐) | **keep** |
| Talking Pet Skit | 바이럴 UGC | talking-pet 밈 1순위 | ◈4(2샷) | **높음**(입 모핑·치아·립싱크) | **keep + 스코프 유지(⚠️)** |

- **cut 확정**: Pet POV Taste Test (근접중복 + 입 모핑 리스크가 Talking Pet과 중복).
- **merge**: 없음(6개 무중복).
- **add 권고(선택, 슬롯 7로 확장 시)**: **Size Guide / Fit Compare 📷 ◈2 🅣** — 소·중·대 핏 비교 + 사이즈 오버레이. 온펫 사이즈 불안을 ◈5 모핑 위험 없이 ◈2로 보강하는 강한 전환 프레임. 펫 없이 제품+더미 스케일 기준으로도 가능해 위험 낮음. (현 6개 확정 우선, 여유 시 추가.)
- **가격 사다리(현행 유지·검증 완료)**: 사진 `I2 I2 I2 I5` · 릴스 `R4 R6`. **◈2 진입 = Pet Product Hero/Cuddle Hour/Macro Crunch 3개 ✓**. **싼 릴스 = Talking Pet Skit R4 ✓**. 더 싼 1샷 ◈2 릴스가 필요하면 후보 12(Single-Hero Sizzle, count:1 → shots×2=◈2)를 add. on_model_tryon 4컷=◈5 공식 정합 ✓. 임의 가산 0.

---

## 6) ③ 강화 — 산출물 스펙 + 레시피 검증 포인트

각 템플릿 "정확히 무슨 사진/영상" 산출물 스펙. 시드 레시피는 이미 작성됨(아래 핵심만 검증, 부족분 보강).

**1. Pet Product Hero 📷 ◈2 🅣**
산출물: 펫 없이 **제품 단독** 에디토리얼 스틸 4컷. 컷=① 순백 심리스 정면(소프트박스 키, 하단 그림자) ② 소프트 리넨+창광 3/4 ③ 라이트그레이 림라이트 탑다운 플랫레이 ④ 우드 표면 측면+소품 힌트(리프/리본, 글자 없음). 라이팅 soft-box beauty-dish, 50/100mm, 포장 선명. negative: warped/melted product, **pet anatomy in frame**(펫 유입 차단), HDR. **🅣 주의**: 사이즈/스펙 글자는 렌더 금지 → 오버레이 레이어. `text_overlay:true`, negative에서 text/logo 제외(전역 SAFETY_NEGATIVE 처리).

**2. Cuddle Hour 📷 ◈2**
산출물: 제품이 행복한 반려동물 옆에 자연스럽게 놓인 포근 라이프스타일 4컷(거실 러그·창광·강아지 코비비기 / 리넨 침대·고양이 / 창가 우드플로어·앞발 터치 / 골든아워 소파). 50mm f/1.8, 얕은 심도. **AI 난이도**: 펫 합성 → negative에 deformed/extra limbs, fused paws, dead glassy eyes, plastic-looking fur 강화(이미 반영). 제품 색·형태 보존 명시.

**3. Macro Crunch 📷 ◈2**
산출물: 간식 극접사 4컷(슬레이트·하드 사이드라이트 / 엣지 크런치 크럼 / 원료 흩뿌림 / 단면 파괴 내부 질감). 100mm 매크로, raking sidelight. 위험 낮음(제품만). negative: soft OOF, recolored treat, plastic texture.

**4. On-Pet Fit 📷 ◈5 ⚠️**
산출물: 웨어러블(칼라·하네스·바난다·펫웨어)을 잘 그루밍된 강아지가 착용한 핏 4컷(라이트그레이 스튜디오 정면 풀핏 / 3/4 하드웨어 / 야외 산책 / 넥/백 디테일 클로즈업). 85mm, 정확한 드레이프·버클·비율. **AI 난이도(최고)**: 제품이 털에 융합/부유, 사지 수 오류, 버클 왜곡. negative 강화 유지("product floating off body, wrong scale/fit, fused fabric into fur, correct limb count, natural fur no melting"). **검수 게이트 필수** — 사지 수·제품 접지 확인 후 게시, 오류 시 재생성. `meta.flags:[experimental, needs_human_review]`.

**5. Wait For The Zoomies 🎬 ◈6**
산출물: 3샷 9:16 고에너지 릴 — ① 거실 바닥 제품 들어올린 티저 히어로(강아지 응시), per_shot_motion=slow tense push-in / ② 제품 던져짐, whip-tilt 따라감 / ③ 뒷마당 줌이 질주, fast tracking pan. duration 3s/샷, transition=whip, music=playful upbeat build-and-drop, captions=auto. **AI 난이도**: 모션블러로 제품 뭉개짐 → negative "motion-blur smearing the product into mush, deformed pet anatomy, extra legs". 프레임 전반 제품 형태·색 일관 명시.

**6. Talking Pet Skit 🎬 ◈4 ⚠️**
산출물: 2샷 9:16 코믹 UGC — **샷1 = 안전 B롤 제품 리빌**(입 애니메이션 0, 끝에 펫 코만 프레임 진입=훅, gentle push-in) / **샷2 = 펫 얼굴 클로즈, 최대 2문장 토킹**(미세 입 움직임, 제품 측면 노출, soft handheld). duration 3s/샷, transition=cut, music=quirky comedic. **AI 난이도(최고 — 펫 얼굴/입 모핑)**: 샷1을 깨끗한 앵커 프레임으로 두어 모핑 드리프트 최소화. negative "grotesque/uncanny mouth deformation, no warped muzzle, no human-like mouth morph, extra teeth, lip-sync drift smearing muzzle, correct limb count". 입 애니메이션은 2문장으로 제한. **검수 게이트 필수**. `meta.flags:[experimental, needs_human_review]`.

**이 테마 특유 주의**:
- **펫 모핑 위험군** = On-Pet Fit(털-제품 융합·사지) + Talking Pet Skit(입/muzzle·치아·립싱크). 두 개만 ⚠️, 나머지 4개는 안전.
- **🅣 오버레이** = Pet Product Hero 1개(선택적 사이즈/스펙). 글자를 AI로 그리지 말고 오버레이 레이어로.
- Cuddle Hour/Zoomies는 펫이 등장하나 모핑보다는 사지/털 negative로 충분(⚠️ 비대상). 단 실렌더 QA에서 펫 사지 수 스팟체크 권장.

---

## 7) 산출물 (Deliverables)
1. **`src/recipes/seeds/recipes.pet.v2.js`** (절대경로: `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.pet.v2.js`) — 이미 6개 작성·로딩 검증 완료. 검증 후 미세보강만(스키마 §끝 준수, `node` 로딩·비용공식 재확인). add 채택 시 7번째 항목 append.
2. **한국어 산출물 스펙** — §6 내용을 `docs/템플릿_v2_발굴선별강화_결과.md`(절대경로: `/Users/jeon-yedam/HeyHoAI/docs/템플릿_v2_발굴선별강화_결과.md`)의 🐾 펫 섹션(현 217~237행)과 동기화. `docs/템플릿_한국어_카탈로그.md`·`public/_overview.html`도 v2 반영.
3. **keep/cut/add 표**:

| 결정 | 템플릿 | 이유 |
|---|---|---|
| keep | Pet Product Hero, Cuddle Hour, Macro Crunch, On-Pet Fit, Wait For The Zoomies, Talking Pet Skit | 6개 핵심 JTBD 무중복 커버 |
| fix | Macro Crunch ◈4→◈2 / Talking Pet 3→2샷·◈8→◈4 | 비용 공식 정합·모핑 스코프 축소 |
| cut | Pet POV Taste Test | Zoomies 에너지 근접중복 + 입 모핑 리스크 중복 |
| add(선택) | Size Guide/Fit Compare 📷◈2🅣, Single-Hero Sizzle 🎬◈2 | 사이즈 전환 보강·1샷 최저 릴스 진입(슬롯 여유 시) |

---

## 8) 착수 커맨드 (붙여넣기용)
> "`~/HeyHoAI`에서 이 펫 명령서대로, `src/recipes/seeds/recipes.pet.v2.js`의 6개 템플릿(Pet Product Hero·Cuddle Hour·Macro Crunch·On-Pet Fit·Wait For The Zoomies·Talking Pet Skit)을 4축으로 검증·확정하고 각 산출물 스펙을 마무리해. 펫 입/털 모핑(On-Pet Fit·Talking Pet)과 🅣 오버레이(Pet Product Hero) 주의, 비용공식·노스킬 준수, `node` 로딩 재검증 후 `docs/템플릿_v2_발굴선별강화_결과.md` 펫 섹션과 동기화해줘."

---

## 공통 규칙 (모든 섹션 동일)
- **철학**: 노스킬 — 유저는 프롬프트 안 씀, 양식만 고름. 출력 2종: 📷 image_set(보통 4장·4:5) / 🎬 reel(샷수=count·9:16).
- **레시피 스키마 v1**(A2 look + A5 shots): `{ mode, category, name, output_type, credit_cost, rationale, config:{ output{type,count,aspect_ratio}, subject{type:face|product|avatar, reference_strategy:identity_lock(face)|product_composite(product), min_refs}, look{style_preset, attributes[], wardrobe?, extra_positive, negative}, shot_strategy:'list', shots[{scene,pose,composition}], reel?{per_shot_motion[],duration_per_shot,transition,music_mood,captions}, provider{image:'nano-banana',video:'kling'} } }`.
- **비용 규칙**: image_set=count×0.5, reel=shots×2, 온모델 착용 +1. (4장=◈2 / 3샷릴=◈6 / 온모델4장=◈5). 카탈로그마다 ◈2 진입 + 싼 릴스(1~2샷 ◈2~4) 두기.
- **⚠️ 엔진**: 전역 `SAFETY_NEGATIVE`가 모든 렌더에 'text','logo' 주입 → 글자/브랜드 템플릿(🅣)은 글자를 AI로 그리지 말고 오버레이 레이어로(`text_overlay:true` + 그 템플릿 negative에서 text/logo 제외). 손가락/말하는입/360 온모델은 negative 강화 + 사람검수.
- **2벌 산출**: 영어 프롬프트(엔진용) + 한국어 산출물 설명(사람용). 마켓 전략=공식 우선(이 세트가 출시 카탈로그 본체).
- **참고 파일**: 마스터 `/Users/jeon-yedam/HeyHoAI/docs/명령서_템플릿_발굴선별강화.md` · v2 결과 `/Users/jeon-yedam/HeyHoAI/docs/템플릿_v2_발굴선별강화_결과.md` · v2 시드 `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.pet.v2.js`.
