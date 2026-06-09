/**
 * Doppia recipe seed — fashion (product mode), v2 (7 templates).
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list). recipes 테이블에 INSERT.
 *
 * v2 변경 요약:
 *  - Editorial Lookbook → On-Model Studio 스타일 배리언트로 병합(슬롯 해제)
 *  - On-Model Studio 재가격 ◈6→◈5 (product_composite 4-shot 캐논 적용)
 *  - Fit & Size On-Body 신규 추가 (on_model_tryon ◈5; 최우선 전환 프레임)
 *  - Quick-Drop Teaser Reel 신규 추가 (2-shot ◈4; 저가 릴 요건 충족)
 *  - 360 Detail Spin 재가격 ◈8→◈6 + 범위 product turntable 한정 (AI 리스크 완화)
 *  - Macro Texture Shots 유지 ◈3 (품질 프리미엄 업차지)
 *  - Lifestyle Scene Pack 유지 ◈2 (≥1 ◈2 이미지 항목 요건 충족)
 *  - GRWM Drop Reel 유지 ◈6 (≤◈6 릴 요건 충족)
 *
 * 엔진 제약: SAFETY_NEGATIVE가 모든 렌더에 'text'/'logo' 주입 → look.negative에서 제외하고
 *   config.text_overlay=true + meta.render_notes로 결정론적 오버레이 레이어 처리.
 */
module.exports = [
  // ─── 1. On-Model Studio ──────────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "fashion",
    "category": "OnModel",
    "name": "On-Model Studio",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 1,
    "rationale": "DTC apparel sellers who can't afford a model+photographer: turns one flat-lay into believable on-body catalog shots that lift PDP conversion. Style variants cover both clean-catalog and editorial mood within one template.",
    "meta": {
      "style_variants": ["clean_catalog", "editorial_mood"],
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Hands-adjusting-garment shot (shot 4) is high AI-risk — queue for human QA before delivery. Editorial variant uses dramatic_directional lighting preset."
    },
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
        "reference_strategy": "on_model_tryon",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Fashion",
        "attributes": [
          "lighting:studio_softbox",
          "color:neutral_true",
          "texture:fabric_weave",
          "context:seamless_studio"
        ],
        "extra_positive": "uploaded garment worn by a natural-looking model, garment fit and proportions identical to reference (same color, print, seams, hardware, neckline), commercial e-commerce on-model photography, large octabox key light camera-left with a fill scrim camera-right and a soft hair light, light grey seamless cyclorama, shot on 85mm f/4 full-frame, true-to-life fabric drape and stitching, relaxed natural model expression, clean catalog styling; editorial variant: single hard directional source raking across set, desaturated muted palette, confident editorial posing, architectural negative space",
        "negative": "warped or melted garment, mismatched color or print, extra seams, distorted hands, extra fingers, fused fingers, plastic skin, mannequin look, harsh shadows, blown highlights, duplicated limbs, garment floating off body, watermark"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "light grey seamless studio cyclorama, soft even key",
          "pose": "front-facing, garment squared to camera, arms relaxed at sides",
          "composition": "full_body"
        },
        {
          "scene": "same studio, subtle floor shadow",
          "pose": "three-quarter turn showing garment side and drape",
          "composition": "full_body"
        },
        {
          "scene": "neutral studio, slightly tighter framing",
          "pose": "model mid-stride walking toward camera, natural movement",
          "composition": "medium_shot"
        },
        {
          "scene": "clean studio, focused on fabric and fit",
          "pose": "detail crop of collar/cuff/hem on body, hands lightly adjusting garment — natural hands, five fingers, no fused digits",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 2. Fit & Size On-Body ───────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "fashion",
    "category": "OnModel",
    "name": "Fit & Size On-Body",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 2,
    "rationale": "E-commerce brands suffering high return rates due to size uncertainty: shows the garment worn at multiple angles and key measurement zones so shoppers can self-gauge fit without a size chart page.",
    "meta": {
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "This template uses on_model_tryon (identity_lock not required; engine composites garment onto neutral model). Size measurement card is injected as a deterministic overlay layer — do NOT include 'text' or 'logo' in look.negative as SAFETY_NEGATIVE already handles that; overlay layer appends callout lines and cm/inch values post-render.",
      "overlay_spec": {
        "layer": "text_overlay",
        "elements": ["measurement_callouts", "size_label"],
        "font": "system_sans",
        "position": "edge_margin"
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
        "reference_strategy": "on_model_tryon",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Fashion",
        "attributes": [
          "lighting:studio_softbox",
          "color:neutral_true",
          "texture:fabric_weave",
          "context:seamless_studio"
        ],
        "extra_positive": "uploaded garment worn by a natural proportioned model showing true fit, identical color/print/seams/hardware to reference, even studio light for maximum garment clarity, poses emphasize how garment sits on body at chest/waist/hip/hem, real fabric drape showing relaxed and fitted zones",
        "negative": "warped garment, color mismatch, extra fingers, fused fingers, distorted hands, plastic skin, loose ill-fitting drape, garment floating off body, mannequin look, harsh shadows, blown highlights, duplicated limbs, watermark"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "light grey seamless studio, even flat key",
          "pose": "front-facing full stance, arms slightly out showing chest and waist fit",
          "composition": "full_body"
        },
        {
          "scene": "same studio",
          "pose": "three-quarter rear turn showing back yoke, seat and hem length",
          "composition": "full_body"
        },
        {
          "scene": "same studio, tighter frame",
          "pose": "side profile showing silhouette, shoulder seam, torso and hip fit",
          "composition": "medium_shot"
        },
        {
          "scene": "same studio, macro zone",
          "pose": "closeup of waistband or neckline on body showing seam placement and fabric hug — natural hands, five fingers",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 3. Lifestyle Scene Pack ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "fashion",
    "category": "Lifestyle",
    "name": "Lifestyle Scene Pack",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 3,
    "rationale": "Social-first sellers who need scroll-stopping feed content: places the product in aspirational real-world scenes that feel like UGC, not catalog.",
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
        "extra_positive": "uploaded garment worn in candid real-life lifestyle moments, golden natural light, lived-in aspirational scenes, film color grade with gentle grain, shot on 35mm full-frame at f/2.0, authentic relaxed body language, shallow depth of field with soft bokeh, garment color/print/details kept identical to reference",
        "negative": "warped garment, color mismatch, extra fingers, distorted hands, plastic skin, studio sterile look, harsh on-camera flash, watermark, overprocessed HDR, duplicated objects, garment detail loss"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "sunlit city sidewalk with soft bokeh storefronts",
          "pose": "walking candidly, mid-stride, looking off-frame",
          "composition": "full_body"
        },
        {
          "scene": "cozy cafe by a bright window, warm tones",
          "pose": "seated at table with coffee, relaxed natural posture",
          "composition": "medium_shot"
        },
        {
          "scene": "leafy park path at golden hour",
          "pose": "standing, hands in pockets, soft genuine smile",
          "composition": "full_body"
        },
        {
          "scene": "minimalist sunlit apartment, linen and plants",
          "pose": "leaning by window, garment detail catching light",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 4. Macro Texture Shots ──────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "fashion",
    "category": "Detail",
    "name": "Macro Texture Shots",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 4,
    "rationale": "Premium and craft brands justifying price: extreme close-ups of weave, stitching and hardware that communicate quality and material on the PDP. ◈3 premium upcharge over base 4-shot rate reflects focus-stack processing overhead.",
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
          "texture:macro_fiber",
          "context:dark_seamless"
        ],
        "extra_positive": "extreme macro detail shots of the uploaded garment, raking side light to reveal weave and surface relief, 100mm macro lens at f/8 with focus stacking sharpness, true-to-material color, visible fiber, stitch and hardware texture, premium tactile feel, garment material and color identical to reference",
        "negative": "warped texture, invented patterns not on reference, color shift, blurry soft focus, plastic look, watermark, oversharpening halos, dust noise, fabric morphing, duplicated stitches"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "dark seamless surface, hard raking side light",
          "pose": "macro of fabric weave and surface grain",
          "composition": "closeup"
        },
        {
          "scene": "soft directional light on neutral backdrop",
          "pose": "macro of seam and topstitching detail",
          "composition": "closeup"
        },
        {
          "scene": "focused spotlight on hardware",
          "pose": "macro of buttons/zipper/hardware finish",
          "composition": "closeup"
        },
        {
          "scene": "low-angle grazing light",
          "pose": "macro of hem, edge finish and material drape fold",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 5. Quick-Drop Teaser Reel ───────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "fashion",
    "category": "Reel",
    "name": "Quick-Drop Teaser Reel",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 5,
    "rationale": "Brands needing a same-day drop announcement with zero shoot time: a punchy 2-shot reveal reel that works as an Instagram/TikTok Story teaser or pre-launch hype clip at entry-level cost.",
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
        "style_preset": "Fashion",
        "attributes": [
          "lighting:studio_softbox",
          "color:neutral_true",
          "texture:fabric_weave",
          "context:seamless_studio"
        ],
        "extra_positive": "crisp product drop teaser, clean white/light grey studio, garment color and details identical to reference, bold confident framing, minimal aesthetic, vertical 9:16 social format",
        "negative": "warped garment, color shift between shots, extra fingers, distorted hands, plastic skin, watermark, jittery unstable motion, garment morphing, harsh shadows, busy background"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean white studio floor, garment flat-lay from directly above",
          "pose": "product overhead flat-lay, perfectly centered, accessories arranged",
          "composition": "medium_shot"
        },
        {
          "scene": "same studio standing, full reveal",
          "pose": "garment worn front-on, arms relaxed, final reveal moment",
          "composition": "full_body"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow overhead push-in from wide to medium on the flat-lay",
          "fast cut reveal with subtle zoom-out on full-body worn look"
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

  // ─── 6. GRWM Drop Reel ───────────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "fashion",
    "category": "Reel",
    "name": "GRWM Drop Reel",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 6,
    "rationale": "Creators and DTC brands launching a drop: a get-ready-with-me styling reel that rides TikTok/Reels trends to announce new product without a shoot.",
    "meta": {
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Shot 1 hands-entering-frame has moderate finger-distortion risk — queue for human QA. Shot 3 180-degree orbit is moderate morph-risk; prefer cut transition if orbit artifacts detected."
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
        "style_preset": "Glamour",
        "attributes": [
          "lighting:ring_light",
          "color:warm_vibrant",
          "texture:fabric_detail",
          "context:bedroom_vanity"
        ],
        "extra_positive": "get-ready-with-me styling reel featuring the uploaded garment, bright airy creator-bedroom aesthetic, vertical social-first framing, glossy upbeat mood, garment color and details preserved exactly across every shot, natural model with on-trend energy",
        "negative": "warped garment, color shift between shots, extra fingers, fused fingers, distorted hands, plastic skin, flickering identity, watermark, jittery unstable motion, garment morphing, harsh shadows"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright bedroom, garment laid out flat on bed beside accessories",
          "pose": "product flat-lay front view, hands entering frame to pick it up — natural hands, five fingers",
          "composition": "medium_shot"
        },
        {
          "scene": "in front of full-length mirror, soft ring-light glow",
          "pose": "garment held up to body, styled three-quarter angle",
          "composition": "full_body"
        },
        {
          "scene": "tidy room, confident outfit-complete moment",
          "pose": "final styled reveal, garment worn front-on with a turn — no warped fabric during turn",
          "composition": "full_body"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow top-down push-in on the flat-lay",
          "smooth tilt-up from hem to neckline as garment is held to body",
          "playful 180-degree orbit reveal of the full styled look"
        ],
        "duration_per_shot": 3,
        "transition": "whip",
        "music_mood": "upbeat",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 7. 360 Product Spin ─────────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "fashion",
    "category": "Reel",
    "name": "360 Product Spin",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 7,
    "rationale": "E-commerce sellers reducing returns: a clean rotating product turntable reel (garment only — not on-model) that shows drape and construction from every angle on the PDP. Scoped to product turntable to avoid on-model 360 morph risk.",
    "meta": {
      "flags": ["experimental"],
      "render_notes": "Turntable must be product-only (no model) to avoid on-model 360 morph artifacts. If morph artifacts appear between shots 2→3 prefer cut transition over smooth orbit. Do NOT use orbit motion on a live model."
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
        "style_preset": "Fashion",
        "attributes": [
          "lighting:studio_360_even",
          "color:neutral_true",
          "texture:fabric_weave",
          "context:turntable_studio"
        ],
        "extra_positive": "smooth 360-degree rotation of the uploaded garment on a turntable (product only — no model), e-commerce turntable product video, perfectly even wraparound studio lighting, light grey seamless background, garment color/print/seams/hardware identical to reference at every angle, crisp true-to-life fabric texture, stable centered framing, no warped fabric in turntable",
        "negative": "warped or morphing garment, color shift during rotation, geometry distortion, extra seams, watermark, wobbling unstable spin, motion blur smearing detail, background color flicker, duplicated product, live model in frame"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "grey seamless turntable studio, even soft light",
          "pose": "product front view, centered, squared to camera",
          "composition": "full_body"
        },
        {
          "scene": "same studio, rotation continues",
          "pose": "product 3/4 front angle, drape and side seam visible",
          "composition": "full_body"
        },
        {
          "scene": "same studio, midway through spin",
          "pose": "product profile/side and back view showing silhouette and construction",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow clockwise turntable rotation, front to 3/4",
          "continuous smooth orbit, 3/4 to side",
          "steady rotation, side through to back, settling on construction detail"
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
