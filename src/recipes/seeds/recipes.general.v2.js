/**
 * Doppia recipe seed — general (product mode), v2.1 (8 templates). NET-NEW + 만족가드.
 *
 * 8번째 버티컬 = 7버티컬(fashion·beauty·jewelry·food·home·tech·pet) 어디에도 안 드는
 * 모든 제품의 catch-all 카탈로그. 캔들·디퓨저·문구·굿즈·보충제·F&B 패키지·플랜트·생활잡화·
 * 텀블러/키링 등 형태가 미지(병/박스/식물/소품)인 단일 제품을 "상품 등록→피드→전환"의
 * 표준 컷으로 다 덮는 만능 키트. 전부 무모델(product_composite, 제품 사진 1장 합성).
 *
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered look + A5 shot-list). recipes 테이블에 INSERT.
 * 비용 규칙: image_set = count×0.5, reel = shots×2, 온모델 +1(이 카탈로그는 무모델이라 미적용).
 *   → ◈2 진입 6개(Clean Hero/Lifestyle/Packaging/Flat-Lay/Macro/Large-Format, 전부 4컷×0.5=◈2)
 *     + 싼 릴 ◈4(2샷) + 360 ◈6(3샷). (리졸버는 count×0.5만 인정 — focus-stack 업차지 미존재.)
 *
 * 전역 고유 이름(IMPORTANT): 기존 fashion v2에 "Quick-Drop Teaser Reel"·"360 Product Spin"이
 *   이미 존재해 충돌 → General에서는 "Any-Product Drop Reel"·"Universal 360 Spin"으로 개명해
 *   8버티컬 전역 name 중복을 제거. 나머지 6개(Large-Format Hero 포함)는 exact-match 중복 없음(확인 완료).
 *
 * 엔진 제약: SAFETY_NEGATIVE_PROMPT가 모든 렌더에 'text'/'logo' 주입(src/images/imagePrompt.builder.js)
 *   → 🅣(Packaging·Flat-Lay) 템플릿은 라벨/브랜드/캡션 글자를 AI로 그리지 말 것.
 *     config.text_overlay=true + meta.overlay_spec로 렌더 후 결정론적 오버레이 레이어에서 합성하고,
 *     look.extra_negative에는 'text'/'logo'를 넣지 않는다(이중처리 방지, fashion v2 Fit&Size 패턴과 동일).
 *
 * catch-all 형태보존: 제품 형태가 미지이므로 특정 형태(예: 의류 drape)를 가정하지 말고
 *   "uploaded product, identical to reference in shape/color/material/finish"로 형태를 강하게 잠그고,
 *   extra_negative에 "invented product, shape morphing, added parts not in reference"를 공통 주입한다.
 *
 * ── 만족 가드(Satisfaction Guards) 규약 (v2.1, "구멍 18종 → 대다수 만족권 진입" 설계 반영) ──
 * 각 템플릿 config.guards[]에 선언. 노스킬 셀러가 손대지 않아도 디폴트 ON이어야 함.
 *   - label_lock         : 업로드 실물의 라벨/인쇄/각인 픽셀을 보존, AI로 글자를 재생성하지 않음.
 *                          새 캡션은 text_overlay 레이어로만. (한방식품·각인·시상·농자재·사이니지의 '글자=제품가치' 치명 구멍 차단)
 *   - single_sku         : 업로드 1장 = 단일 SKU. 번들/복제/추가 사본 invent 금지. (잔·디캔터 1→번들 환각 차단)
 *   - count_lock         : 레퍼런스 구성/부품 개수를 정확히 보존(추가·복제·누락 금지). (번들·다부품 본체)
 *   - scale_cue          : 글자/손가락 없는 크기 기준(동전·카드·실측 그래픽 overlay) 주입 → 크기 오인 방지.
 *   - reflection_control : 투명/정반사(유리·금속·아크릴)는 매트·반사억제 라이팅 + 360 smooth-orbit 금지(cut).
 *   - form_lock          : 형태/색/소재/마감을 레퍼런스에 강하게 잠금(공통 negative와 동치, 다부품 본체에 특히).
 *
 * ⚠️ 엔진 구현 필요(seed 단독으로는 선언만 — 실효는 엔진 작업 후):
 *   ① label_lock 픽셀 마스킹(레퍼런스 라벨 영역 보존)  ② 1m+ 본체 자동 라우팅 → Large-Format Hero 또는 '미지원' 정직 반환(거짓 PARTIAL 금지)
 *   ③ scale_cue overlay 합성  ④ 멀티/추가 업로드 모드(다면 라벨·착용 before/after)  ⑤ 사이니지·악기 '디자인 면' 한정 SAFETY text/logo 네거티브 예외
 *   ⑥ config.guards[] 소비.  (seed는 prompt-space 최선 + 가드 선언으로 준비해 둠.)
 *
 * ✅ 리졸버 정합(이관 완료 2026-06-10): recipeResolver.js는 negative를 look.extra_negative에서 읽는다(라인 148).
 *   본 시드 8개 템플릿 全부 死필드 look.negative → live 필드 look.extra_negative로 이관 완료(look.negative 비움).
 *   이관 시 SAFETY 중복 제거: text/logo/watermark/extra fingers/nsfw/deformed 등은 SAFETY_NEGATIVE_PROMPT가
 *   전역 자동 주입하므로(src/images/imagePrompt.builder.js) extra_negative에는 섹션 특화 결함만 남김.
 *   text_overlay 템플릿(Packaging·Flat-Lay)은 'text'/'logo'/'lettering' 미포함(오버레이가 처리).
 */
module.exports = [
  // ─── 1. Clean Hero Pack ──────────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "general",
    "category": "Hero",
    "name": "Clean Hero Pack",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "어떤 제품이든 PDP 대표컷이 없으면 상품 등록 자체가 안 된다: 무지(흰/연회색) 배경 4앵글(정면·3/4·탑다운·디테일 크롭) 베이스. 모든 제품에 통하는 catch-all 진입 ◈2 앵커. 가드: single_sku(복제 환각 차단)+label_lock(라벨 보존)+scale_cue(소품 크기 오인 방지).",
    "meta": {
      "guards_note": "단일 SKU 보존, 업로드 라벨/각인 글자 재생성 금지(보존), 손바닥 이하 소품은 무생물 scale_cue 주입."
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
      "guards": ["single_sku", "label_lock", "scale_cue", "form_lock"],
      "output": {
        "type": "image_set",
        "count": 4,
        "aspect_ratio": "4:5"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Studio",
        "attributes": [
          "lighting:studio_softbox",
          "color:neutral_true",
          "texture:true_to_material",
          "context:seamless_studio"
        ],
        "extra_positive": "uploaded product on a clean light-grey/white seamless background, identical shape/color/material/finish to reference, single product only (never duplicate or invent extra copies), keep any printed label/marking/engraving exactly as in the reference and do not fabricate lettering, commercial e-commerce hero product photography, large soft octabox key with gentle fill and a subtle contact shadow, 100mm at f/8 crisp edge-to-edge, true-to-life material, centered catalog framing",
        "extra_negative": "invented product, shape morphing, added parts not in reference, color shift, warped geometry, plastic fake look, harsh shadows, blown highlights, duplicated product, distorted or warped label, cluttered background, reflections of crew"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "light-grey seamless studio, soft even key",
          "pose": "product front view, squared to camera, centered",
          "composition": "medium_shot"
        },
        {
          "scene": "same studio, slight floor shadow",
          "pose": "product 3/4 angle showing depth and side",
          "composition": "medium_shot"
        },
        {
          "scene": "same studio, overhead rig",
          "pose": "product top-down flat orientation, centered",
          "composition": "medium_shot"
        },
        {
          "scene": "same studio, tighter frame",
          "pose": "detail crop of the product's key feature/finish",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 2. Lifestyle-in-Context ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "general",
    "category": "Lifestyle",
    "name": "Lifestyle-in-Context",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "무모델 제품을 실사용 공간(책상·주방·욕실·선반)에 자연스럽게 배치 — '내 공간에 두면 이렇구나' 상상을 유발해 장바구니 전환을 만든다. 제품 종류를 안 가리는 catch-all 범용성이 가장 강한 컷. in_use_form 변형으로 '얼굴 없는 마네킹/부분 착용' 사용맥락컷을 손가락·얼굴 리스크 없이 제공(가발·네일·속눈썹·지팡이 등).",
    "meta": {
      "style_variants": ["in_use_form", "faceless_mannequin"],
      "guards_note": "in_use_form/faceless_mannequin 변형은 얼굴·손가락 없이 마네킹·실루엣·중립 사용맥락으로 착용/사용 전환컷을 대체(엔진 변형 게이트 필요). 단일 SKU·라벨 보존 유지.",
      "render_notes": "변형 활성 시 사람 얼굴/손가락을 프레임에 넣지 말 것 — 두상 마네킹·부분 폼·중립 배경으로만. 의류 아님이므로 on_model_tryon 미사용(+1 미적용)."
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
      "guards": ["single_sku", "label_lock", "form_lock"],
      "output": {
        "type": "image_set",
        "count": 4,
        "aspect_ratio": "4:5"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Film",
        "attributes": [
          "lighting:natural_window",
          "color:film_warm",
          "texture:grain_film",
          "context:lifestyle_real"
        ],
        "extra_positive": "uploaded product styled in candid real-life settings, warm natural window light, lived-in aspirational interiors, film color grade with gentle grain, 35mm at f/2.0, shallow depth with soft bokeh, product shape/color/material identical to reference, single product (no invented duplicates), label kept identical to reference, props complement but never obscure the product",
        "extra_negative": "invented product, shape morphing, added parts not in reference, color shift, sterile studio look, harsh flash, overprocessed HDR, duplicated objects, product detail loss, busy distracting clutter, human face or fingers in frame"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "sunlit wooden desk by a bright window, minimal props",
          "pose": "product placed naturally beside a notebook and mug",
          "composition": "medium_shot"
        },
        {
          "scene": "clean kitchen counter, morning light",
          "pose": "product on counter with a soft-focus plant behind",
          "composition": "medium_shot"
        },
        {
          "scene": "styled shelf with neutral linen and ceramics",
          "pose": "product on shelf as a lived-in accent",
          "composition": "medium_shot"
        },
        {
          "scene": "cozy sofa-side table, warm ambient glow",
          "pose": "product close, soft bokeh living room behind",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 3. Packaging & Unboxing (🅣 text_overlay) ───────────────────────────
  {
    "mode": "product",
    "vertical": "general",
    "category": "Packaging",
    "name": "Packaging & Unboxing",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 3,
    "rationale": "기프트/크라우드펀딩 셀러의 핵심 전환 프레임 — 닫힌 박스→리본 개봉→내용물 노출→선물 무드 4단계. 7버티컬에 없는 General 고유 가치. 라벨/브랜드/메시지는 AI가 아니라 오버레이 레이어로 얹는다. 가드: label_lock+single_sku로 박스/내용물 라벨 깨짐·복제 차단.",
    "meta": {
      "flags": ["text_overlay"],
      "guards_note": "박스/리본/내용물의 인쇄 글자는 AI 생성 금지(label_lock) — 실물 보존 또는 빈 면 + overlay. 단일 SKU.",
      "render_notes": "브랜드명/메시지/리본 텍스트는 AI로 그리지 말 것 — SAFETY_NEGATIVE가 text/logo를 이미 제거하므로 AI 글자는 깨진다. 렌더 후 text_overlay 레이어로 라벨·기프트 캡션을 합성한다. look.negative에 'text'/'logo' 미포함(이중처리 방지).",
      "overlay_spec": {
        "layer": "text_overlay",
        "elements": ["brand_label", "gift_message"],
        "font": "system_sans",
        "position": "product_face"
      }
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
      "text_overlay": true,
      "guards": ["label_lock", "single_sku", "form_lock"],
      "output": {
        "type": "image_set",
        "count": 4,
        "aspect_ratio": "4:5"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Lifestyle",
        "attributes": [
          "lighting:soft_diffused",
          "color:clean_neutral_warm",
          "texture:paper_box_material",
          "context:gifting_tabletop"
        ],
        "extra_positive": "premium unboxing sequence of the uploaded product, clean tabletop, soft diffused daylight, tasteful kraft/box/ribbon packaging, gifting aesthetic, product identical to reference, single product set, label area left blank for overlay or kept exactly as reference, 50mm at f/4, inviting warm mood",
        "extra_negative": "invented product, shape morphing, added parts not in reference, color shift, messy crumpled packaging, dented or damaged box, plastic fake look, harsh shadows, duplicated items, cluttered background"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean tabletop, soft daylight",
          "pose": "closed gift box with ribbon, product hidden inside",
          "composition": "medium_shot"
        },
        {
          "scene": "same tabletop, lid lifting",
          "pose": "box half-open revealing tissue and product edge",
          "composition": "medium_shot"
        },
        {
          "scene": "same tabletop",
          "pose": "product fully revealed beside the open box and packaging",
          "composition": "medium_shot"
        },
        {
          "scene": "warm close framing",
          "pose": "hands-free product held-up gifting hero, no fingers in frame",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 4. Macro Detail (+ engraving_relief 변형) ───────────────────────────
  {
    "mode": "product",
    "vertical": "general",
    "category": "Detail",
    "name": "Macro Detail",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 4,
    "rationale": "질감·마감·소재 매크로(왁스결·종이결·라벨엠보·엣지/접합부)로 프리미엄과 신뢰를 만든다. 4컷×0.5=◈2 base rate(엔진 리졸버 공식 정합 — fashion 'Macro Texture Shots'와 동일 가격). engraving_relief 변형이 트로피/도장/명패의 '각인 디테일컷'을 label_lock으로 복원 — overlay 평면텍스트로 대체 불가한 그 한 컷.",
    "meta": {
      "style_variants": ["surface_grain", "engraving_relief"],
      "guards_note": "engraving_relief 변형: 음각·금색·깊이를 살린 '실물 각인/엠보/인쇄 마크'를 label_lock으로 보존(재생성 금지). 투명/금속은 reflection_control(매트·반사억제).",
      "render_notes": "각인/인쇄 글자는 새로 그리지 말고 레퍼런스 형상을 그대로 보존. 금속·유리 매크로는 crew reflection·blown highlight 억제."
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
      "guards": ["label_lock", "count_lock", "reflection_control", "form_lock"],
      "output": {
        "type": "image_set",
        "count": 4,
        "aspect_ratio": "4:5"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Macro",
        "attributes": [
          "lighting:raking_side",
          "color:true_to_material",
          "texture:macro_surface",
          "context:dark_seamless"
        ],
        "extra_positive": "extreme macro detail of the uploaded product, raking side light revealing surface relief and material grain, 100mm macro at f/8 with focus-stack sharpness, true-to-material color, premium tactile feel, surface/finish/material identical to reference, preserve any engraved/embossed/printed mark exactly as in the reference (do not redraw lettering), reflection-controlled matte lighting for metal and glass",
        "extra_negative": "invented texture not on reference, shape morphing, added parts not in reference, color shift, soft missed focus, plastic look, oversharpening halos, dust noise, material morphing, duplicated features, blown specular highlights, reflections of crew or equipment"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "dark seamless surface, hard raking side light",
          "pose": "macro of the primary surface texture/grain",
          "composition": "closeup"
        },
        {
          "scene": "soft directional light, neutral backdrop",
          "pose": "macro of the finish/coating or a seam edge",
          "composition": "closeup"
        },
        {
          "scene": "focused spotlight, reflection-controlled",
          "pose": "macro of a key feature/hardware/engraved or embossed mark, preserved exactly from reference",
          "composition": "closeup"
        },
        {
          "scene": "low-angle grazing light",
          "pose": "macro of an edge/joint/material transition",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 5. Flat-Lay Grid (🅣 text_overlay · 번들/스케일/전후 슬롯 흡수) ────────
  {
    "mode": "product",
    "vertical": "general",
    "category": "FlatLay",
    "name": "Flat-Lay Grid",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 5,
    "rationale": "구성품/번들/세트를 위에서 한눈에 정렬(기프트·F&B·문구 묶음) + 스케일 큐로 실제 크기 짐작. before/after·scale·in-hand 변형을 style_variants/editable_slots로 흡수해 단독 템플릿 신설을 절약. 구성 라벨/수량 캡션은 오버레이. 가드: count_lock(번들 개수 보존)+scale_cue+label_lock.",
    "meta": {
      "flags": ["text_overlay"],
      "style_variants": ["bundle_grid", "scale_cue", "before_after"],
      "guards_note": "번들 구성 개수는 count_lock으로 정확히 보존(추가/누락 금지). 크기 기준은 동전/머그 등 무생물만(손 미포함). 캡션은 text_overlay.",
      "render_notes": "구성 라벨/수량 캡션은 text_overlay 레이어로 합성, look.negative에 'text'/'logo' 미포함. scale_cue는 동전/머그 등 무생물 크기 기준만 사용(손 미포함)으로 손가락 아티팩트 자체를 회피.",
      "overlay_spec": {
        "layer": "text_overlay",
        "elements": ["item_labels", "set_count"],
        "font": "system_sans",
        "position": "edge_margin"
      },
      "editable_slots": ["scene_props", "item_count"]
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
      "text_overlay": true,
      "guards": ["count_lock", "scale_cue", "label_lock", "form_lock"],
      "output": {
        "type": "image_set",
        "count": 4,
        "aspect_ratio": "4:5"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Studio",
        "attributes": [
          "lighting:soft_even_top",
          "color:neutral_true",
          "texture:true_to_material",
          "context:flatlay_surface"
        ],
        "extra_positive": "top-down flat-lay of the uploaded product, clean styled surface (linen/wood/paper), soft even top light, knolling-style arrangement, product and any set components identical to reference with the exact same component count (no added or missing items), balanced negative space for overlay captions, 50mm equivalent at f/8 sharp throughout",
        "extra_negative": "invented product or components, shape morphing, added parts not in reference, color shift, tilted perspective drift, harsh shadows, plastic look, duplicated items, missing components, cluttered overlap"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "neutral linen surface, soft top light",
          "pose": "single product centered flat-lay",
          "composition": "medium_shot"
        },
        {
          "scene": "same surface",
          "pose": "full set/bundle components arranged knolling-style, exact reference count preserved",
          "composition": "medium_shot"
        },
        {
          "scene": "styled surface with minimal props",
          "pose": "product with complementary props for context",
          "composition": "medium_shot"
        },
        {
          "scene": "same surface, scale reference beside product",
          "pose": "product beside a coin and a mug as a clear size reference, no hands in frame",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 6. Any-Product Drop Reel (전역고유 개명: fashion "Quick-Drop Teaser Reel" 충돌 회피) ─
  {
    "mode": "product",
    "vertical": "general",
    "category": "Reel",
    "name": "Any-Product Drop Reel",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 6,
    "rationale": "제로 촬영 당일 드롭 예고 — 플랫레이 푸시인→히어로 리빌 2샷 9:16. 가장 싼 영상 진입 티어 ◈4(2샷×2). 스토리/사전 하이프용. (이름은 fashion v2의 Quick-Drop Teaser Reel과 전역 중복을 피해 General 전용으로 명명.)",
    "meta": {
      "guards_note": "샷 간 제품 동일성 유지(single_sku·form_lock). 투명/금속은 reflection_control."
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
      "guards": ["single_sku", "form_lock", "reflection_control"],
      "output": {
        "type": "reel",
        "count": 2,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Studio",
        "attributes": [
          "lighting:studio_softbox",
          "color:neutral_true",
          "texture:true_to_material",
          "context:seamless_studio"
        ],
        "extra_positive": "crisp product-drop teaser, clean white/light-grey studio, product identical to reference and consistent across both shots, bold confident framing, minimal aesthetic, vertical 9:16 social format",
        "extra_negative": "invented product, shape morphing, added parts not in reference, color shift between shots, plastic look, jittery unstable motion, product morphing between shots, flickering between frames, harsh shadows, busy background"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean studio surface, product flat-lay from above",
          "pose": "overhead flat-lay, centered, props arranged",
          "composition": "medium_shot"
        },
        {
          "scene": "same studio, hero standing/upright",
          "pose": "product hero front-on, final reveal moment",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow overhead push-in from wide to medium on the flat-lay",
          "fast cut reveal with a subtle zoom-out on the hero product"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "upbeat",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 7. Universal 360 Spin (전역고유 개명: fashion "360 Product Spin" 충돌 회피) ──────
  {
    "mode": "product",
    "vertical": "general",
    "category": "Reel",
    "name": "Universal 360 Spin",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 7,
    "rationale": "PDP 반품 방지 — 턴테이블 회전(제품 only, 모델 없음)으로 전 각도 3샷 9:16. 무모델이라 on-model 360 morph 리스크가 낮아 General catch-all에 안전. (이름은 fashion v2의 360 Product Spin과 전역 중복을 피해 General 전용으로 명명.) reflection_control: 투명/정반사·다부품은 smooth orbit 대신 cut.",
    "meta": {
      "flags": ["experimental"],
      "guards_note": "투명/정반사/다부품(유리잔·디캔터·다현 악기 등)은 reflection_control 발동 → orbit 금지, cut 전환. single_sku·form_lock 유지.",
      "render_notes": "제품 only 턴테이블(모델/손 금지). shots 2→3 사이 morph 아티팩트 또는 투명/정반사 굴절 발생 시 smooth orbit 대신 cut 전환 사용. 라이브 모델에 orbit 모션 적용 금지."
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
      "guards": ["single_sku", "form_lock", "reflection_control"],
      "output": {
        "type": "reel",
        "count": 3,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Studio",
        "attributes": [
          "lighting:studio_360_even",
          "color:neutral_true",
          "texture:true_to_material",
          "context:turntable_studio"
        ],
        "extra_positive": "smooth 360-degree rotation of the uploaded product on a turntable (product only — no model/hands), e-commerce turntable product video, perfectly even wraparound lighting, light-grey seamless background, product shape/color/material identical to reference at every angle, stable centered framing, no morphing during the spin",
        "extra_negative": "invented product, morphing or warping product, color shift during rotation, geometry distortion, added parts not in reference, wobbling unstable spin, motion blur smearing detail, background flicker, duplicated product, model or hands in frame, refraction glare on transparent or metallic surfaces"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "grey seamless turntable studio, even soft light",
          "pose": "product front view, centered, squared to camera",
          "composition": "medium_shot"
        },
        {
          "scene": "same studio, rotation continues",
          "pose": "product 3/4 angle, depth and side visible",
          "composition": "medium_shot"
        },
        {
          "scene": "same studio, midway through spin",
          "pose": "product profile/side through to back showing construction",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow clockwise turntable rotation, front to 3/4",
          "continuous smooth orbit, 3/4 to side",
          "steady rotation, side through to back, settling on a detail"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "minimal_clean",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 8. Large-Format Hero (NEW · 1m+ 대형 단독 본체 전용) ──────────────────
  {
    "mode": "product",
    "vertical": "general",
    "category": "Hero",
    "name": "Large-Format Hero",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 8,
    "rationale": "7개 소형 정물 템플릿(360·플랫레이·매크로·언박싱)으로는 못 담는 1m+ 대형 단독 본체 — 자전거·대형 어쿠스틱 악기·유모차/카시트·수동휠체어/보행기·여행 캐리어·대형 레저장비·롤업배너 등 — 을 공간 배치 + 강제 scale_cue + 다부품 form/count-lock으로 처리하는 keystone. '구멍 18종' 중 대형 본체 클러스터(가장 큰 불만족군)를 만족권으로 끌어올린다. 4컷×0.5=◈2(무모델).",
    "meta": {
      "flags": ["experimental", "needs_human_review", "oversize"],
      "style_variants": ["studio_sweep", "in_situ_context"],
      "guards_note": "scale_cue 강제(글자·손 없는 실측 기준물 또는 사물 비교)·count_lock(바퀴/현/다리/접이관절 개수 보존)·form_lock·label_lock. 360/언박싱 비활성.",
      "render_notes": "1m+ 본체 전용. 라우터가 대형 감지 시 이 템플릿으로 보낼 것(엔진 작업 ②). 제품을 책상 위 소품 크기로 정규화(축소)하지 말 것 — 전체 본체가 잘림 없이 프레임에 들어가고 실제 크기가 읽혀야 함. 2~4m 초대형(카약·서핑보드·드럼셋)·실측 불가 품목은 in_situ_context 컷 위주로 폴백하거나, 그래도 불가하면 '미지원' 정직 반환(거짓 PARTIAL 금지). aspect_ratio는 editable_slot으로 본체 방향(가로/세로)에 맞춰 엔진/유저가 오버라이드.",
      "overlay_spec": {
        "layer": "text_overlay",
        "elements": ["dimension_callout"],
        "font": "system_sans",
        "position": "edge_margin"
      },
      "editable_slots": [
        { "key": "output.aspect_ratio", "label": "orientation", "default": "1:1" }
      ]
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
      "guards": ["scale_cue", "count_lock", "form_lock", "label_lock", "reflection_control"],
      "output": {
        "type": "image_set",
        "count": 4,
        "aspect_ratio": "1:1"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Studio",
        "attributes": [
          "lighting:studio_softbox",
          "color:neutral_true",
          "texture:true_to_material",
          "context:spacious_studio"
        ],
        "extra_positive": "the complete large single product photographed in full within a clean spacious studio sweep, entire body fully in frame with generous margin and never cropped, true real-world scale conveyed by an unobtrusive size reference, multi-part structure (frame, wheels, strings, legs, joints, folds) preserved exactly from the reference with the correct counts and no missing or invented parts, shape/color/material/finish identical to reference, any printed label or marking kept exactly as reference, matte reflection-controlled lighting, commercial product photography",
        "extra_negative": "scale normalization, shrunk to a small tabletop prop, cropped or cut-off product, partial product out of frame, invented parts, missing components, duplicated wheels/strings/legs, morphing multi-part geometry, warped frame, added parts not in reference, distorted or warped label, plastic fake look, busy distracting background, blown highlights, reflections of crew"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean spacious studio sweep, soft even key, ample headroom",
          "pose": "full product front/side establishing hero, entire body in frame with margin, beside a subtle real-scale reference",
          "composition": "full_body"
        },
        {
          "scene": "same spacious studio",
          "pose": "product 3/4 angle showing full depth and construction, complete body in frame",
          "composition": "full_body"
        },
        {
          "scene": "true-to-use environment (room/garage/stage/sidewalk) at correct scale",
          "pose": "product in situ so its real size reads naturally against the surroundings",
          "composition": "full_body"
        },
        {
          "scene": "tighter contextual framing, reflection-controlled",
          "pose": "detail of a key junction/control/finish (handle, saddle, headstock, wheel, joint) preserved exactly from reference",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  }
];
