/**
 * Doppia recipe seed — general (product mode), v2 (7 templates). NET-NEW.
 *
 * 8번째 버티컬 = 7버티컬(fashion·beauty·jewelry·food·home·tech·pet) 어디에도 안 드는
 * 모든 제품의 catch-all 카탈로그. 캔들·디퓨저·문구·굿즈·보충제·F&B 패키지·플랜트·생활잡화·
 * 텀블러/키링 등 형태가 미지(병/박스/식물/소품)인 단일 제품을 "상품 등록→피드→전환"의
 * 표준 컷으로 다 덮는 만능 키트. 전부 무모델(product_composite, 제품 사진 1장 합성).
 *
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered look + A5 shot-list). recipes 테이블에 INSERT.
 * 비용 규칙: image_set = count×0.5, reel = shots×2, 온모델 +1(이 카탈로그는 무모델이라 미적용).
 *   → ◈2 진입 5개(Clean Hero/Lifestyle/Packaging/Flat-Lay/Macro, 전부 4컷×0.5=◈2)
 *     + 싼 릴 ◈4(2샷) + 360 ◈6(3샷). (리졸버는 count×0.5만 인정 — focus-stack 업차지 미존재.)
 *
 * 전역 고유 이름(IMPORTANT): 기존 fashion v2에 "Quick-Drop Teaser Reel"·"360 Product Spin"이
 *   이미 존재해 충돌 → General에서는 "Any-Product Drop Reel"·"Universal 360 Spin"으로 개명해
 *   8버티컬 전역 name 중복을 제거. 나머지 5개는 기존 시드와 exact-match 중복 없음(확인 완료).
 *
 * 엔진 제약: SAFETY_NEGATIVE_PROMPT가 모든 렌더에 'text'/'logo' 주입(src/images/imagePrompt.builder.js)
 *   → 🅣(Packaging·Flat-Lay) 템플릿은 라벨/브랜드/캡션 글자를 AI로 그리지 말 것.
 *     config.text_overlay=true + meta.overlay_spec로 렌더 후 결정론적 오버레이 레이어에서 합성하고,
 *     look.negative에는 'text'/'logo'를 넣지 않는다(이중처리 방지, fashion v2 Fit&Size 패턴과 동일).
 *
 * catch-all 형태보존: 제품 형태가 미지이므로 특정 형태(예: 의류 drape)를 가정하지 말고
 *   "uploaded product, identical to reference in shape/color/material/finish"로 형태를 강하게 잠그고,
 *   negative에 "invented product, shape morphing, added parts not in reference"를 공통 주입한다.
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
    "rationale": "어떤 제품이든 PDP 대표컷이 없으면 상품 등록 자체가 안 된다: 무지(흰/연회색) 배경 4앵글(정면·3/4·탑다운·디테일 크롭) 베이스. 모든 제품에 통하는 catch-all 진입 ◈2 앵커.",
    "config": {
      "schema_version": 1,
      "mode": "product",
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
        "extra_positive": "uploaded product on a clean light-grey/white seamless background, identical shape/color/material/finish to reference, commercial e-commerce hero product photography, large soft octabox key with gentle fill and a subtle contact shadow, 100mm at f/8 crisp edge-to-edge, true-to-life material, centered catalog framing",
        "negative": "invented product, shape morphing, added parts not in reference, color shift, warped geometry, plastic fake look, harsh shadows, blown highlights, duplicated product, cluttered background, reflections of crew"
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
    "rationale": "무모델 제품을 실사용 공간(책상·주방·욕실·선반)에 자연스럽게 배치 — '내 공간에 두면 이렇구나' 상상을 유발해 장바구니 전환을 만든다. 제품 종류를 안 가리는 catch-all 범용성이 가장 강한 컷.",
    "config": {
      "schema_version": 1,
      "mode": "product",
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
        "extra_positive": "uploaded product styled in candid real-life settings, warm natural window light, lived-in aspirational interiors, film color grade with gentle grain, 35mm at f/2.0, shallow depth with soft bokeh, product shape/color/material identical to reference, props complement but never obscure the product",
        "negative": "invented product, shape morphing, added parts not in reference, color shift, sterile studio look, harsh flash, overprocessed HDR, duplicated objects, product detail loss, busy distracting clutter, watermark"
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
    "rationale": "기프트/크라우드펀딩 셀러의 핵심 전환 프레임 — 닫힌 박스→리본 개봉→내용물 노출→선물 무드 4단계. 7버티컬에 없는 General 고유 가치. 라벨/브랜드/메시지는 AI가 아니라 오버레이 레이어로 얹는다.",
    "meta": {
      "flags": ["text_overlay"],
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
        "extra_positive": "premium unboxing sequence of the uploaded product, clean tabletop, soft diffused daylight, tasteful kraft/box/ribbon packaging, gifting aesthetic, product identical to reference, label area left blank for overlay, 50mm at f/4, inviting warm mood",
        "negative": "invented product, shape morphing, added parts not in reference, color shift, messy crumpled packaging, plastic fake look, harsh shadows, duplicated items, cluttered background, garbled fake lettering"
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

  // ─── 4. Macro Detail ─────────────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "general",
    "category": "Detail",
    "name": "Macro Detail",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 4,
    "rationale": "질감·마감·소재 매크로(왁스결·종이결·라벨엠보·엣지/접합부)로 프리미엄과 신뢰를 만든다. 4컷×0.5=◈2 base rate(엔진 리졸버 공식 정합 — fashion 'Macro Texture Shots'와 동일 가격).",
    "config": {
      "schema_version": 1,
      "mode": "product",
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
        "extra_positive": "extreme macro detail of the uploaded product, raking side light revealing surface relief and material grain, 100mm macro at f/8 with focus-stack sharpness, true-to-material color, premium tactile feel, surface/finish/material identical to reference",
        "negative": "invented texture not on reference, shape morphing, added parts not in reference, color shift, blurry soft focus, plastic look, oversharpening halos, dust noise, material morphing, duplicated features, watermark"
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
          "scene": "focused spotlight",
          "pose": "macro of a key feature/hardware/detail point",
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
    "rationale": "구성품/번들/세트를 위에서 한눈에 정렬(기프트·F&B·문구 묶음) + 스케일 큐로 실제 크기 짐작. before/after·scale·in-hand 변형을 style_variants/editable_slots로 흡수해 단독 템플릿 신설을 절약. 구성 라벨/수량 캡션은 오버레이.",
    "meta": {
      "flags": ["text_overlay"],
      "style_variants": ["bundle_grid", "scale_cue", "before_after"],
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
        "extra_positive": "top-down flat-lay of the uploaded product, clean styled surface (linen/wood/paper), soft even top light, knolling-style arrangement, product and any set components identical to reference, balanced negative space for overlay captions, 50mm equivalent at f/8 sharp throughout",
        "negative": "invented product or components, shape morphing, added parts not in reference, color shift, tilted perspective drift, harsh shadows, plastic look, duplicated items, cluttered overlap, garbled fake lettering, watermark"
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
          "pose": "full set/bundle components arranged knolling-style",
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
    "config": {
      "schema_version": 1,
      "mode": "product",
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
        "extra_positive": "crisp product-drop teaser, clean white/light-grey studio, product identical to reference, bold confident framing, minimal aesthetic, vertical 9:16 social format",
        "negative": "invented product, shape morphing, added parts not in reference, color shift between shots, plastic look, jittery unstable motion, product morphing, harsh shadows, busy background, watermark"
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
    "rationale": "PDP 반품 방지 — 턴테이블 회전(제품 only, 모델 없음)으로 전 각도 3샷 9:16. 무모델이라 on-model 360 morph 리스크가 낮아 General catch-all에 안전. (이름은 fashion v2의 360 Product Spin과 전역 중복을 피해 General 전용으로 명명.)",
    "meta": {
      "flags": ["experimental"],
      "render_notes": "제품 only 턴테이블(모델/손 금지). shots 2→3 사이 morph 아티팩트 발생 시 smooth orbit 대신 cut 전환 사용. 라이브 모델에 orbit 모션 적용 금지."
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
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
        "negative": "invented product, morphing or warping product, color shift during rotation, geometry distortion, added parts not in reference, wobbling unstable spin, motion blur smearing detail, background flicker, duplicated product, model or hands in frame, watermark"
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
  }
];
