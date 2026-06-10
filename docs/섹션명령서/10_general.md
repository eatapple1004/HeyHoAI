# 섹션 작업 명령서 — General / 기타 제품 (key: general)

> 이 브리프 하나로 General 섹션 착수 가능(self-contained). 작업 디렉터리 `~/HeyHoAI`, 브랜치 `feat/ux-monetization-v2`. 마스터: `/Users/jeon-yedam/HeyHoAI/docs/명령서_템플릿_발굴선별강화.md`.

---

## 1) 정체성
- **mode**: `product`
- **subject**: `type: product` · `reference_strategy: product_composite` · `min_refs: 1` (얼굴 없음, 제품 사진 1장으로 합성. 온모델/착용 없음 — 의류가 아니므로 `on_model_tryon`은 쓰지 않음)
- **한 줄 정의**: 7버티컬(fashion·beauty·jewelry·food·home·tech·pet) 어디에도 안 드는 **모든 제품의 catch-all 카탈로그** — 캔들·문구·보충제·F&B 패키지·플랜트·잡화 등 무엇이든 올리면 통하는 **범용 제품 컷 세트.** "내 제품이 어느 칸에도 안 맞을 때 여기로 온다."

## 2) 타깃 유저 & JTBD
- **누가**: 7버티컬에 정확히 안 맞는 셀러 — 캔들/디퓨저, 문구·굿즈, 보충제·비타민, F&B 선물세트·패키지 식품, 화분·플랜트, 생활잡화·소품, 텀블러·키링 같은 액세서리. (소규모 DTC·스마트스토어·에어비앤비 기프트·크라우드펀딩 셀러가 대부분.)
- **뭘 파나**: 작거나 정형화 안 된 단일 제품. 모델/착용이 불필요하고 **제품 자체가 주인공.**
- **어떤 컷이 매출에 필요한가**:
  - **PDP 대표컷**(클린 히어로) — 썸네일·상세 최상단. 없으면 상품 등록 자체가 안 됨.
  - **라이프스타일 맥락컷** — "내 책상/주방/욕실에 두면 이렇구나" 상상 유발 → 장바구니 전환.
  - **매크로 디테일** — 질감·마감·소재로 가격 정당화(특히 캔들 왁스·종이결·플랜트 잎맥).
  - **플랫레이/구성품** — 세트 구성·번들을 한눈에(F&B 기프트, 문구 묶음).
  - **패키징/언박싱** — 선물성·개봉 경험(편딩·기프트 셀러 핵심 전환 프레임).
  - **스케일 감 / before-after** — 실제 크기 짐작(잡화·소품 반품 방지), 사용 전후 변화(보충제·플랜트·디퓨저 효과 어필).
- 즉 General은 "제품 종류를 안 가려도 **상품 등록→피드→전환**의 표준 컷을 다 덮는 만능 키트"가 JTBD.

## 3) 현재 상태
- ✅ **완료(2026-06-10) — v2.1 시드 8개 확정·검증.** `recipes.general.v2.js` = Clean Hero·Lifestyle·Packaging🅣·Macro·Flat-Lay🅣·Any-Product Drop Reel·Universal 360 Spin **+ Large-Format Hero(v2.1 신규, 1m+ 대형)**. `config.guards[]` 6종 + 변형 2종(Macro engraving_relief·Lifestyle in_use_form) 적용. consolidate 11/11 OK·총 77개·중복0. **작업기록·만족도 감사·ENGINE 핸드오프 = `10_general_작업기록.md`.** (아래 §4~§6은 net-new 당시 설계근거 — 참조용 보존.)
- **net-new(이력)** — `recipes.general.v2.js` 기존 초안/v1 없음(시드 디렉터리에 `general*` 파일 부재 확인). 8버티컬 외 추가 카탈로그로 **처음부터 6~8개를 설계**했다.
- 컷 자체는 **기존 fashion/influencer v2 조합의 product_composite 변형 재사용**이라 제작 난이도 **낮음**. 단 catch-all 특성상 "어떤 제품에도 깨지지 않는 범용성"이 설계 핵심.
- 참고로 재사용할 베이스: fashion v2의 `Lifestyle Scene Pack`(◈2)·`Macro Texture Shots`·`Quick-Drop Teaser Reel`(2샷 ◈4)·`360 Product Spin`(◈6) 패턴이 거의 그대로 product 범용으로 전환 가능.

## 4) ① 발굴 (Discover) — General 특화 후보 8~12개
2026 IG/TikTok/Shorts에서 제품(무모델) 콘텐츠로 잘 도는 포맷 + 빠진 전환 프레임 기준 브레인스톰:

| # | 이름 | 무엇을 / 왜 | 사진/영상 | 예상◈ |
|---|------|------------|-----------|-------|
| C1 | **Clean Hero Pack** | 무지 배경 PDP 대표컷 4앵글(정면·3/4·탑다운·디테일크롭). 모든 상품 등록 필수 베이스 | 📷 image_set 4 | ◈2 |
| C2 | **Lifestyle-in-Context** | 책상/주방/욕실/선반 등 실사용 공간에 자연 배치, "내 공간에 두면" 상상 | 📷 image_set 4 | ◈2 |
| C3 | **Macro Detail** | 왁스결·종이결·라벨·소재 질감 매크로 4컷, 프리미엄·가격 정당화 | 📷 image_set 4 | ◈3(focus-stack 업차지) |
| C4 | **Flat-Lay Grid** | 구성품/번들/세트를 위에서 정렬, 기프트·F&B·문구 묶음 한눈에 | 📷 image_set 4 | ◈2 |
| C5 | **Packaging & Unboxing** | 박스+리본+내용물 단계, 선물성·개봉경험. 펀딩·기프트 핵심 전환 | 📷 image_set 4 | ◈2 |
| C6 | **360 Product Spin** | 턴테이블 회전(제품 only)으로 전 각도, PDP 반품 방지 | 🎬 reel 3샷 | ◈6 |
| C7 | **Quick-Drop Teaser Reel** | 플랫레이→히어로 2샷 출시 예고, 당일 드롭/스토리용 싼 릴 | 🎬 reel 2샷 | ◈4 |
| C8 | **Universal Before/After** | 사용 전후 분할(보충제 루틴·플랜트 성장·디퓨저 빈공간→채워진 향공간), 변화 어필 | 📷 image_set 4(2pair) | ◈2 |
| C9 | **Scale & Size Cue** | 손/동전/머그 옆 배치로 실제 크기 짐작, 잡화 반품 방지 | 📷 image_set 4 | ◈2 |
| C10 | **In-Hand / In-Use** | 손에 들거나 사용 중 한 컷(향초 점화·펜 글씨·보충제 손바닥). 손가락 리스크 | 📷 image_set 4 | ◈2(experimental) |
| C11 | **ASMR Texture Reel** | 클로즈업 질감 모션(왁스 긁힘·포장 부스럭·물방울), TikTok ASMR 트렌드 | 🎬 reel 2샷 | ◈4 |
| C12 | **Gradient/Color-Pop Studio** | 컬러 배경 그라데이션 스튜디오 광고컷, 피드 스크롤 정지 | 📷 image_set 4 | ◈2 |

## 5) ② 선별 (Select) — 최종 7개 권장

4축(커버리지·트렌드·원가가치·AI난이도) 적용:

| 결정 | 템플릿 | sort | output | ◈ | 이유(한 줄) |
|------|--------|------|--------|----|------------|
| **add** | Clean Hero Pack | 1 | 📷4 | 2 | 진입 앵커·모든 제품 등록 필수, 커버리지 최우선 |
| **add** | Lifestyle-in-Context | 2 | 📷4 | 2 | 전환 핵심, 무모델 catch-all에 가장 통용 |
| **add** | Packaging & Unboxing | 3 | 📷4 | 2 | 기프트/펀딩 전환 프레임, 7버티컬에 없는 General 고유 가치 |
| **add** | Macro Detail | 4 | 📷4 | 3 | 프리미엄·가격 정당화, focus-stack 업차지 |
| **add** | Flat-Lay Grid | 5 | 📷4 | 2 | 번들/세트 커버리지(C8/C9 스케일·전후를 슬롯으로 흡수) |
| **add** | Quick-Drop Teaser Reel | 6 | 🎬2 | 4 | 싼 릴스 티어(◈4 바닥), 당일 드롭 |
| **add** | 360 Product Spin | 7 | 🎬3 | 6 | PDP 반품 방지, 제품 only로 360 리스크 회피 |

**keep/cut/merge/add 가이드**
- **add(7)**: 위 표.
- **cut**: C12 Gradient/Color-Pop(C1 Clean Hero와 near-dup, 컷) · C11 ASMR Reel(트렌디하나 Quick-Drop+360과 릴 슬롯 중복 → 1차 제외, 2차 검토).
- **merge**: C8 Before/After·C9 Scale·C10 In-Hand → **단독 템플릿 신설 대신 Flat-Lay Grid의 `editable_slots`/`style_variants`로 흡수** 가능(범용 제품 특성상 변형으로 충분). C9 Scale은 Clean Hero shot4에 "scale-cue" 변형으로 넣어도 됨.
- **AI난이도 메모**: C10 In-Hand만 손가락 리스크로 보류(experimental). 나머지는 무모델 product_composite라 난이도 낮음 — General이 catch-all로 안전한 이유.

**가격 사다리(◈2 진입 + 싼 릴스 포함)**
- ◈2 진입: Clean Hero / Lifestyle / Packaging / Flat-Lay (4개, 4×0.5)
- ◈3: Macro Detail (품질 프리미엄 업차지)
- ◈4: Quick-Drop Teaser Reel (2샷×2, **가장 싼 영상 티어**)
- ◈6: 360 Product Spin (3샷×2)
- 온모델 착용 항목 없음(무모델 카탈로그) → +1 룰 미적용.

## 6) ③ 강화 (Enhance) — 산출물 스펙 + 레시피

### General 특유의 AI 난이도 / 🅣 오버레이 주의
- **🅣 패키징 글자 = 전부 오버레이.** Packaging·Flat-Lay에서 라벨/브랜드명/문구가 필요해도 **AI로 글자를 그리지 말 것** — 전역 `SAFETY_NEGATIVE`가 모든 렌더에 `'text','logo'`를 주입하므로 AI가 그린 글자는 깨진다. `config.text_overlay=true` + `meta.overlay_spec`으로 렌더 후 결정론적 오버레이 레이어에서 라벨·번들 캡션을 얹는다. 따라서 해당 템플릿의 `look.negative`에는 'text'/'logo'를 **넣지 않는다**(이중처리 방지, fashion v2 Fit&Size 패턴과 동일).
- **catch-all 범용성 주의**: 제품 형태가 미지(병/박스/식물/소품)이므로 프롬프트는 특정 형태(예: 의류 drape)를 가정하지 말고 "uploaded product, identical to reference in shape/color/material/finish"로 형태 보존을 강하게 잠근다. negative에 `invented product, shape morphing, added parts not in reference`를 공통으로.
- **저위험**: 무모델이라 손가락/말하는입/온모델360 리스크 없음 → experimental 플래그 거의 불필요(In-Hand 변형만 예외). 360은 제품 only로 스코프해 morph 리스크 회피.

### 산출물 스펙 (각 템플릿이 정확히 무엇을 만드는가)

1. **Clean Hero Pack** — 무지(흰/연회색) 배경 PDP 대표 4장: 정면 / 3/4 / 탑다운 / 디테일 크롭. 부드러운 소프트박스 키 + 미세 그림자. → 상품 썸네일·상세 최상단용.
2. **Lifestyle-in-Context** — 실사용 공간 4장: 책상·주방 카운터·욕실 선반·창가. 자연광·필름 톤. → "내 공간에 두면" 전환컷.
3. **Packaging & Unboxing** — 개봉 단계 4장: 닫힌 박스 / 리본·뚜껑 열림 / 내용물 노출 / 손에 든 선물 무드. 🅣 오버레이로 브랜드/메시지. → 기프트·펀딩 전환.
4. **Macro Detail** — 질감 매크로 4장: 표면결 / 마감·소재 / 디테일 포인트 / 엣지·접합부. 레이킹 사이드라이트 + focus-stack. → 프리미엄 가격 정당화.
5. **Flat-Lay Grid** — 상단 정렬 4장: 단품 센터 / 구성품 펼침(번들) / 소품 스타일링 / 스케일 큐(손·동전 옆). 🅣 오버레이로 구성 캡션. → 세트/번들·크기.
6. **Quick-Drop Teaser Reel** — 2샷 9:16: 플랫레이 푸시인 → 히어로 리빌. ◈4 당일 드롭/스토리.
7. **360 Product Spin** — 3샷 9:16: 턴테이블 회전(제품 only), 정면→3/4→측·후면. ◈6 PDP 반품 방지.

### 레시피 (스키마 v1 — 영어 프롬프트 = 엔진용, `recipes.general.v2.js`에 배열로)

```js
/**
 * Doppia recipe seed — general (product mode), v2 (7 templates). NET-NEW.
 * Catch-all for products outside the 7 verticals (candles·stationery·supplements·F&B·plants·misc).
 * 통합 스키마 v1 (A2 look + A5 shots). subject=product/product_composite, 무모델.
 * 비용: image_set=count×0.5, reel=shots×2. 🅣(Packaging/Flat-Lay) = text_overlay 레이어, look.negative에 text/logo 미포함.
 */
module.exports = [
  // 1. Clean Hero Pack ─ ◈2 진입 앵커
  { mode:"product", vertical:"general", category:"Hero", name:"Clean Hero Pack",
    output_type:"image_set", credit_cost:2, sort_order:1,
    rationale:"어떤 제품이든 PDP 대표컷이 없으면 등록 불가 — 무지 배경 4앵글 베이스. catch-all 진입 ◈2 앵커.",
    config:{ schema_version:1, mode:"product",
      output:{type:"image_set",count:4,aspect_ratio:"4:5"},
      subject:{type:"product",reference_strategy:"product_composite",min_refs:1},
      look:{ style_preset:"Studio",
        attributes:["lighting:studio_softbox","color:neutral_true","texture:true_to_material","context:seamless_studio"],
        extra_positive:"uploaded product on a clean light-grey/white seamless background, identical shape/color/material/finish to reference, commercial e-commerce hero product photography, large soft octabox key with gentle fill and subtle contact shadow, 100mm at f/8 crisp edge-to-edge, true-to-life material, centered catalog framing",
        negative:"invented product, shape morphing, added parts not in reference, color shift, warped geometry, plastic fake look, harsh shadows, blown highlights, duplicated product, cluttered background, reflections of crew" },
      shot_strategy:"list",
      shots:[
        {scene:"light-grey seamless studio, soft even key",pose:"product front view, squared to camera, centered",composition:"medium_shot"},
        {scene:"same studio, slight floor shadow",pose:"product 3/4 angle showing depth and side",composition:"medium_shot"},
        {scene:"same studio, overhead rig",pose:"product top-down flat orientation, centered",composition:"medium_shot"},
        {scene:"same studio, tighter frame",pose:"detail crop of the product's key feature/finish",composition:"closeup"} ],
      provider:{image:"nano-banana",video:"kling"} } },

  // 2. Lifestyle-in-Context ─ ◈2 전환
  { mode:"product", vertical:"general", category:"Lifestyle", name:"Lifestyle-in-Context",
    output_type:"image_set", credit_cost:2, sort_order:2,
    rationale:"무모델 제품을 실사용 공간에 배치 — '내 책상/주방/선반에 두면' 상상 유발 전환컷. 범용성 최강.",
    config:{ schema_version:1, mode:"product",
      output:{type:"image_set",count:4,aspect_ratio:"4:5"},
      subject:{type:"product",reference_strategy:"product_composite",min_refs:1},
      look:{ style_preset:"Film",
        attributes:["lighting:natural_window","color:film_warm","texture:grain_film","context:lifestyle_real"],
        extra_positive:"uploaded product styled in candid real-life settings, warm natural window light, lived-in aspirational interiors, film color grade with gentle grain, 35mm at f/2.0, shallow depth with soft bokeh, product shape/color/material identical to reference, props complement but never obscure the product",
        negative:"invented product, shape morphing, added parts not in reference, color shift, sterile studio look, harsh flash, overprocessed HDR, duplicated objects, product detail loss, busy distracting clutter, watermark" },
      shot_strategy:"list",
      shots:[
        {scene:"sunlit wooden desk by a bright window, minimal props",pose:"product placed naturally beside a notebook and mug",composition:"medium_shot"},
        {scene:"clean kitchen counter, morning light",pose:"product on counter with soft-focus plant behind",composition:"medium_shot"},
        {scene:"styled shelf with neutral linen and ceramics",pose:"product on shelf as a lived-in accent",composition:"medium_shot"},
        {scene:"cozy sofa-side table, warm ambient glow",pose:"product close, soft bokeh living room behind",composition:"closeup"} ],
      provider:{image:"nano-banana",video:"kling"} } },

  // 3. Packaging & Unboxing ─ ◈2 · 🅣 오버레이
  { mode:"product", vertical:"general", category:"Packaging", name:"Packaging & Unboxing",
    output_type:"image_set", credit_cost:2, sort_order:3,
    rationale:"기프트/펀딩 셀러 전환 핵심 — 박스→리본→내용물 개봉 단계. 7버티컬에 없는 General 고유 가치. 라벨/브랜드는 오버레이.",
    meta:{ flags:["text_overlay"],
      render_notes:"브랜드명/메시지/리본 텍스트는 AI로 그리지 말 것 — SAFETY_NEGATIVE가 text/logo를 이미 제거. 렌더 후 text_overlay 레이어로 라벨·캡션 합성. look.negative에 text/logo 미포함.",
      overlay_spec:{layer:"text_overlay",elements:["brand_label","gift_message"],font:"system_sans",position:"product_face"} },
    config:{ schema_version:1, mode:"product", text_overlay:true,
      output:{type:"image_set",count:4,aspect_ratio:"4:5"},
      subject:{type:"product",reference_strategy:"product_composite",min_refs:1},
      look:{ style_preset:"Lifestyle",
        attributes:["lighting:soft_diffused","color:clean_neutral_warm","texture:paper_box_material","context:gifting_tabletop"],
        extra_positive:"premium unboxing sequence of the uploaded product, clean tabletop, soft diffused daylight, tasteful kraft/box/ribbon packaging, gifting aesthetic, product identical to reference, label area left blank for overlay, 50mm at f/4, inviting warm mood",
        negative:"invented product, shape morphing, color shift, messy crumpled packaging, plastic fake look, harsh shadows, duplicated items, cluttered background, garbled fake lettering" },
      shot_strategy:"list",
      shots:[
        {scene:"clean tabletop, soft daylight",pose:"closed gift box with ribbon, product hidden inside",composition:"medium_shot"},
        {scene:"same tabletop, lid lifting",pose:"box half-open revealing tissue and product edge",composition:"medium_shot"},
        {scene:"same tabletop",pose:"product fully revealed beside open box and packaging",composition:"medium_shot"},
        {scene:"warm close framing",pose:"hands-free product held-up gifting hero (no fingers in frame)",composition:"closeup"} ],
      provider:{image:"nano-banana",video:"kling"} } },

  // 4. Macro Detail ─ ◈3 프리미엄
  { mode:"product", vertical:"general", category:"Detail", name:"Macro Detail",
    output_type:"image_set", credit_cost:3, sort_order:4,
    rationale:"질감·마감 매크로로 가격 정당화(왁스결·종이결·소재). ◈3 = base 4-shot 위 focus-stack 처리 업차지.",
    config:{ schema_version:1, mode:"product",
      output:{type:"image_set",count:4,aspect_ratio:"4:5"},
      subject:{type:"product",reference_strategy:"product_composite",min_refs:1},
      look:{ style_preset:"Macro",
        attributes:["lighting:raking_side","color:true_to_material","texture:macro_surface","context:dark_seamless"],
        extra_positive:"extreme macro detail of the uploaded product, raking side light revealing surface relief and material grain, 100mm macro at f/8 with focus-stack sharpness, true-to-material color, premium tactile feel, surface/finish/material identical to reference",
        negative:"invented texture not on reference, shape morphing, color shift, blurry soft focus, plastic look, oversharpening halos, dust noise, material morphing, duplicated features, watermark" },
      shot_strategy:"list",
      shots:[
        {scene:"dark seamless surface, hard raking side light",pose:"macro of primary surface texture/grain",composition:"closeup"},
        {scene:"soft directional light, neutral backdrop",pose:"macro of finish/coating or seam edge",composition:"closeup"},
        {scene:"focused spotlight",pose:"macro of key feature/hardware/detail point",composition:"closeup"},
        {scene:"low-angle grazing light",pose:"macro of edge/joint/material transition",composition:"closeup"} ],
      provider:{image:"nano-banana",video:"kling"} } },

  // 5. Flat-Lay Grid ─ ◈2 · 🅣 오버레이 · 번들/스케일 슬롯 흡수
  { mode:"product", vertical:"general", category:"FlatLay", name:"Flat-Lay Grid",
    output_type:"image_set", credit_cost:2, sort_order:5,
    rationale:"번들/세트/구성품을 위에서 한눈에 + 스케일 큐. before/after·scale·in-hand 변형을 editable_slots로 흡수. 캡션은 오버레이.",
    meta:{ flags:["text_overlay"],
      style_variants:["bundle_grid","scale_cue","before_after"],
      render_notes:"구성 라벨/수량 캡션은 text_overlay 레이어. look.negative에 text/logo 미포함. scale_cue 변형은 손/동전을 넣을 경우 손가락 검수.",
      overlay_spec:{layer:"text_overlay",elements:["item_labels","set_count"],font:"system_sans",position:"edge_margin"},
      editable_slots:["scene_props","item_count"] },
    config:{ schema_version:1, mode:"product", text_overlay:true,
      output:{type:"image_set",count:4,aspect_ratio:"4:5"},
      subject:{type:"product",reference_strategy:"product_composite",min_refs:1},
      look:{ style_preset:"Studio",
        attributes:["lighting:soft_even_top","color:neutral_true","texture:true_to_material","context:flatlay_surface"],
        extra_positive:"top-down flat-lay of the uploaded product, clean styled surface (linen/wood/paper), soft even top light, knolling-style arrangement, product and any set components identical to reference, balanced negative space for overlay captions, 50mm equiv at f/8 sharp throughout",
        negative:"invented product or components, shape morphing, color shift, tilted perspective drift, harsh shadows, plastic look, duplicated items, cluttered overlap, garbled fake lettering, watermark" },
      shot_strategy:"list",
      shots:[
        {scene:"neutral linen surface, soft top light",pose:"single product centered flat-lay",composition:"medium_shot"},
        {scene:"same surface",pose:"full set/bundle components arranged knolling-style",composition:"medium_shot"},
        {scene:"styled surface with minimal props",pose:"product with complementary props for context",composition:"medium_shot"},
        {scene:"same surface, scale reference beside product",pose:"product next to a common-size object (coin/hand-no-fingers/mug) for size cue",composition:"medium_shot"} ],
      provider:{image:"nano-banana",video:"kling"} } },

  // 6. Quick-Drop Teaser Reel ─ ◈4 싼 릴 티어
  { mode:"product", vertical:"general", category:"Reel", name:"Quick-Drop Teaser Reel",
    output_type:"reel", credit_cost:4, sort_order:6,
    rationale:"제로 촬영 당일 드롭 예고 — 2샷 9:16 릴. 가장 싼 영상 진입 ◈4(2샷×2).",
    config:{ schema_version:1, mode:"product",
      output:{type:"reel",count:2,aspect_ratio:"9:16"},
      subject:{type:"product",reference_strategy:"product_composite",min_refs:1},
      look:{ style_preset:"Studio",
        attributes:["lighting:studio_softbox","color:neutral_true","texture:true_to_material","context:seamless_studio"],
        extra_positive:"crisp product-drop teaser, clean white/light-grey studio, product identical to reference, bold confident framing, minimal aesthetic, vertical 9:16 social format",
        negative:"invented product, shape morphing, color shift between shots, plastic look, jittery unstable motion, product morphing, harsh shadows, busy background, watermark" },
      shot_strategy:"list",
      shots:[
        {scene:"clean studio surface, product flat-lay from above",pose:"overhead flat-lay, centered, props arranged",composition:"medium_shot"},
        {scene:"same studio, hero standing/upright",pose:"product hero front-on, final reveal moment",composition:"medium_shot"} ],
      reel:{ per_shot_motion:["slow overhead push-in from wide to medium on the flat-lay","fast cut reveal with subtle zoom-out on the hero product"],
        duration_per_shot:3, transition:"cut", music_mood:"upbeat", captions:"auto" },
      provider:{image:"nano-banana",video:"kling"} } },

  // 7. 360 Product Spin ─ ◈6 · 제품 only
  { mode:"product", vertical:"general", category:"Reel", name:"360 Product Spin",
    output_type:"reel", credit_cost:6, sort_order:7,
    rationale:"PDP 반품 방지 — 턴테이블 회전(제품 only)으로 전 각도. 무모델이라 360 morph 리스크 낮음.",
    meta:{ flags:["experimental"],
      render_notes:"제품 only 턴테이블(모델 없음). shots 2→3 사이 morph 아티팩트 시 smooth orbit 대신 cut. 라이브 모델 금지." },
    config:{ schema_version:1, mode:"product",
      output:{type:"reel",count:3,aspect_ratio:"9:16"},
      subject:{type:"product",reference_strategy:"product_composite",min_refs:1},
      look:{ style_preset:"Studio",
        attributes:["lighting:studio_360_even","color:neutral_true","texture:true_to_material","context:turntable_studio"],
        extra_positive:"smooth 360-degree rotation of the uploaded product on a turntable (product only — no model/hands), e-commerce turntable product video, perfectly even wraparound lighting, light-grey seamless background, product shape/color/material identical to reference at every angle, stable centered framing, no morphing during spin",
        negative:"invented product, morphing or warping product, color shift during rotation, geometry distortion, added parts not in reference, wobbling unstable spin, motion blur smearing detail, background flicker, duplicated product, model or hands in frame, watermark" },
      shot_strategy:"list",
      shots:[
        {scene:"grey seamless turntable studio, even soft light",pose:"product front view, centered, squared to camera",composition:"medium_shot"},
        {scene:"same studio, rotation continues",pose:"product 3/4 angle, depth and side visible",composition:"medium_shot"},
        {scene:"same studio, midway through spin",pose:"product profile/side through to back showing construction",composition:"medium_shot"} ],
      reel:{ per_shot_motion:["slow clockwise turntable rotation, front to 3/4","continuous smooth orbit, 3/4 to side","steady rotation, side through to back, settling on a detail"],
        duration_per_shot:3, transition:"cut", music_mood:"minimal_clean", captions:"auto" },
      provider:{image:"nano-banana",video:"kling"} } }
];
```

## 7) 산출물 (Deliverables)
- **신규 생성**: `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.general.v2.js` (위 7개 배열, 스키마 v1 준수).
- **한국어 산출물 스펙**: §6 "산출물 스펙" 7항목 — 각 템플릿이 정확히 무슨 사진/영상을 몇 컷, 어떤 씬/구도/무드로 만드는지.
- **동기화 대상**: `public/_overview.html`·`docs/템플릿_한국어_카탈로그.md`에 General 카탈로그(8번째) 추가 + `public/studio.html`의 MOCK_RECIPES/VERTICALS에 `general` 버티컬 등록.
- **keep/cut/add 표**:

| change | 템플릿 | output | ◈ | 비고 |
|--------|--------|--------|----|------|
| add | Clean Hero Pack | 📷4 | 2 | 진입 앵커 |
| add | Lifestyle-in-Context | 📷4 | 2 | 전환 |
| add | Packaging & Unboxing | 📷4 | 2 | 🅣 오버레이 |
| add | Macro Detail | 📷4 | 3 | 프리미엄 업차지 |
| add | Flat-Lay Grid | 📷4 | 2 | 🅣 + before/after·scale·in-hand 슬롯 흡수 |
| add | Quick-Drop Teaser Reel | 🎬2 | 4 | 싼 릴 티어 |
| add | 360 Product Spin | 🎬3 | 6 | 제품 only, experimental |
| cut | Gradient/Color-Pop Studio | — | — | Clean Hero와 near-dup |
| cut | ASMR Texture Reel | — | — | 릴 슬롯 중복, 2차 검토 |
| merge | Before/After·Scale·In-Hand | — | — | Flat-Lay editable_slots/variants로 흡수 |

## 8) 착수 커맨드 (붙여넣기용)
`~/HeyHoAI에서 docs/명령서_템플릿_발굴선별강화.md와 본 General 브리프를 읽고, recipes.fashion.v2.js의 product_composite 패턴을 베이스로 recipes.general.v2.js를 net-new로 생성하라 — Clean Hero·Lifestyle·Packaging(🅣)·Macro·Flat-Lay(🅣)·Quick-Drop Reel·360 Spin 7개, 스키마 v1·비용룰(image×0.5/reel×2)·무모델 product_composite 준수, 패키지 글자는 text_overlay 레이어로 처리하고 look.negative에서 text/logo 제외, _overview.html·studio.html·한국어 카탈로그에 general 버티컬 동기화.`

---

## 공통 규칙 (모든 섹션 동일 — 인용)
- **철학**: 노스킬 — 유저는 프롬프트 안 쓰고 양식만 고른다. 출력 2종: 📷 image_set(보통 4장, 4:5) / 🎬 reel(샷수=count, 9:16).
- **스키마 v1**(A2 look + A5 shots): `{ mode, category, name, output_type, credit_cost, rationale, config:{ output{type,count,aspect_ratio}, subject{type:face|product|avatar, reference_strategy:identity_lock(face)|product_composite(product), min_refs}, look{style_preset, attributes[], wardrobe?, extra_positive, negative}, shot_strategy:'list', shots[{scene,pose,composition}], reel?{per_shot_motion[],duration_per_shot,transition,music_mood,captions}, provider{image:'nano-banana',video:'kling'} } }`
- **비용 규칙**: image_set = count×0.5, reel = shots×2, 온모델 착용 +1. (4장=◈2, 3샷릴=◈6, 온모델4장=◈5). 각 카탈로그에 ◈2 진입 + 싼 릴스(1~2샷 ◈2~4).
- **⚠️ 엔진**: 전역 SAFETY_NEGATIVE가 모든 렌더에 `'text','logo'` 주입 → 글자/브랜드(🅣) 템플릿은 글자를 AI로 그리지 말고 오버레이 레이어로(`config.text_overlay=true`, look.negative에 text/logo 미포함). 손가락/말하는입/360 온모델은 negative 강화 + 사람검수.
- **2벌 산출**: 영어 프롬프트(엔진용) + 한국어 산출물 설명(사람용). 마켓 전략 = 공식 우선(이 세트가 출시 카탈로그 본체).
- **참고 파일**: 마스터 `/Users/jeon-yedam/HeyHoAI/docs/명령서_템플릿_발굴선별강화.md` · v2 결과 `/Users/jeon-yedam/HeyHoAI/docs/템플릿_v2_발굴선별강화_결과.md` · 신규 시드 `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.general.v2.js`.
