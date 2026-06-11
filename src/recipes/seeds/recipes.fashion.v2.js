/**
 * Doppia recipe seed — fashion (product mode), v2 (8 templates).
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list). recipes 테이블에 INSERT.
 *
 * 가격 사다리(확정): I2 I2 I5 I5 · R4 R4 R6 R6
 *   = Lifestyle◈2 · Macro◈2 · On-Model Studio◈5 · Fit&Size◈5
 *   · Quick-Drop◈4 · Outfit Transition◈4 · GRWM◈6 · 360◈6
 * 비용공식(시드 캐논): image product_composite=ceil(count×0.5) · image on_model_tryon=count+1
 *   · reel=shots×2.  (4컷 composite=◈2, 온모델4컷=◈5, 2샷릴=◈4, 3샷릴=◈6 — 위반 0)
 *
 * v2 발굴·선별·강화 결정 이력:
 *  - Editorial Lookbook → On-Model Studio 스타일 배리언트로 병합(슬롯 해제)
 *  - On-Model Studio 재가격 ◈6→◈5 (on_model_tryon 4-shot 캐논)
 *  - Fit & Size On-Body 신규 (on_model_tryon ◈5; 최우선 전환 프레임)
 *  - Quick-Drop Teaser Reel 신규 (2-shot ◈4; 저가 릴 요건 충족)
 *  - Outfit Transition Reel 신규 add (2-shot ◈4; 틱톡 1순위 패션 포맷·전환 직결, 세트 공백 메움)
 *  - 360 Product Spin 재가격 ◈8→◈6 + product turntable 한정 (온모델 360 모핑 리스크 차단)
 *  - Macro Texture Shots 재가격 ◈3→◈2 (base 4-shot 레이트로 정렬; ◈2 진입 1종 추가)
 *  - Lifestyle Scene Pack 유지 ◈2 (≥1 ◈2 이미지 항목 요건 충족)
 *  - GRWM Drop Reel 유지 ◈6 (keep; Outfit Transition과 무드 일부 중복하나 얼굴/손 GRWM 무드는 별개)
 *
 * 엔진 제약: SAFETY_NEGATIVE가 모든 렌더에 'text'/'logo' 주입 → 🅣(글자/사이즈 콜아웃) 템플릿은
 *   글자를 AI로 그리지 말고 look.negative에서 text/logo 제외 + config.text_overlay=true +
 *   meta.overlay_spec로 결정론적 오버레이 레이어 처리(Fit & Size On-Body).
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
        "extra_positive": "CRITICAL: the exact same garment and the same model across all four shots — garment fit, color, print, seams, hardware and neckline locked identical to the reference, no morph or drift between shots. Uploaded garment worn by a natural-looking model, commercial e-commerce on-model photography, large octabox key light camera-left with a fill scrim camera-right and a soft hair/rim light, light grey seamless cyclorama, shot on 85mm f/4 full-frame, true-to-life fabric drape and visible stitching, relaxed natural model expression, clean catalog styling; on the detail/adjusting shot keep a single well-formed hand with exactly five natural fingers, anatomically correct grip and visible fingernails; editorial variant: single hard directional source raking across set, desaturated muted palette, confident editorial posing, architectural negative space",
        "extra_negative": "warped or melted garment, mismatched color or print, extra seams, stiff unnatural drape, garment floating off body, mannequin look, blown highlights, harsh shadows, six fingers, fused or webbed digits"
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
        "extra_positive": "CRITICAL: the exact same garment and same model across all four shots, color/print/seams/hardware locked identical to the reference, no fit or proportion drift between shots. Uploaded garment worn by a natural proportioned model showing true real-world fit, broad even softbox key with a low fill ratio for flat shadow-free garment clarity, shot on 50mm f/5.6 full-frame for honest undistorted proportions, poses emphasize how the garment sits on the body at chest, waist, hip and hem, real fabric drape revealing relaxed and fitted zones; keep clean uncluttered margins along the frame edges reserved for the composited measurement callouts and size label (text added post-render, not drawn); on the closeup keep a single well-formed hand with exactly five natural fingers and visible fingernails",
        "extra_negative": "warped garment, color mismatch, loose ill-fitting drape, garment floating off body, mannequin look, blown highlights, harsh shadows, six fingers, fused or webbed digits"
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
        "extra_positive": "CRITICAL: the exact same garment across all four scenes — color, print and construction details locked identical to the reference, no garment morph or detail loss between shots. Uploaded garment worn in candid real-life lifestyle moments, soft golden-hour window light as key with open-shade fill, lived-in aspirational scenes, shot on 35mm full-frame at f/2.0 with shallow depth of field and soft natural bokeh, authentic relaxed body language, true-to-reference garment color and print throughout",
        "extra_negative": "warped garment, color mismatch, studio sterile catalog look, harsh on-camera flash, duplicated objects, garment detail loss"
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
    "rationale": "Premium and craft brands justifying price: extreme close-ups of weave, stitching and hardware that communicate quality and material on the PDP. Priced at the base 4-shot rate (◈2) to keep a low-cost entry image item in the catalog.",
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
        "extra_positive": "extreme macro detail of the uploaded garment, hard raking sidelight grazing across the surface to reveal weave, nap and surface relief, 100mm macro lens at f/8 with focus stacking for edge-to-edge sharpness, true-to-material color, visible individual fibers, stitch tension and hardware finish, premium tactile feel, clean seamless backdrop with controlled falloff, material weave, color and pattern identical to the reference with no invented texture",
        "extra_negative": "warped texture, invented patterns not on the reference, color shift, soft or missed focus, plastic-looking material, oversharpening halos, dust and lint specks, fabric morphing, duplicated stitches"
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
        "extra_positive": "CRITICAL: the exact same garment in both the overhead flat-lay and the worn reveal — color, print and details locked identical to the reference, no change between shots. Crisp product-drop teaser, clean white/light-grey studio with a large soft key and gentle gradient falloff, shot on 50mm f/4 for honest proportions, bold confident centered framing, minimal premium aesthetic, vertical 9:16 social format with clean negative space for captions",
        "extra_negative": "warped garment, color shift between shots, garment morphing, jittery unstable motion, harsh shadows, busy cluttered background"
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
        "music_mood": "punchy modern pop/hip-hop, 120-128 BPM, tight kick + clap + bright synth hook, high anticipation building to the reveal, TikTok product-drop energy",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 6. Outfit Transition Reel ───────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "fashion",
    "category": "Reel",
    "name": "Outfit Transition Reel",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 6,
    "rationale": "Fashion sellers chasing the #1 TikTok/Reels fashion format: a snap-transition reel that flips Look A to Look B in two beats — feed-native conversion energy that fills the one gap (outfit transition) the rest of the catalog leaves open.",
    "meta": {
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Snap transition is the highest garment-morph risk in the set: garment color/print/seams/hardware must stay identical to reference across BOTH looks AND through the transition frame (no garment warp during transition). Hands-snap gesture risks finger distortion — queue for human QA. If morph artifacts appear at the A→B beat, fall back from whip to a hard cut."
    },
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
        "extra_positive": "CRITICAL: the same person and the same hero garment held identical through the entire A-to-B transition — color, print, seams and hardware locked to the reference, no garment warp or identity drift across the swap frame. Two-look outfit transition reel, uploaded garment featured as the hero Look, soft broad key with subtle rim separation, shot on 35mm f/4 vertical 9:16, energetic feed-native styling, confident natural model, clean light-grey studio or minimal lifestyle backdrop; on the finger-snap keep a single well-formed hand with exactly five natural fingers and an anatomically correct gesture",
        "extra_negative": "warped or morphing garment during the transition, color or print shift between looks, mismatched seams, garment floating off body, identity drift or flicker between looks, jittery unstable motion, harsh shadows, six fingers, fused or webbed digits"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean light grey studio or minimal backdrop, Look A established",
          "pose": "front-on in first styling (Look A), arm raised mid finger-snap to trigger the swap — natural hands, five fingers",
          "composition": "full_body"
        },
        {
          "scene": "identical framing, Look B revealed after the snap",
          "pose": "front-on in second styling (Look B), confident settled stance — garment color/print unchanged, no warp",
          "composition": "full_body"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "hold on Look A then a fast whip-pan blur as the hand crosses frame on the snap",
          "whip resolves onto Look B with a subtle settle, garment crisp and stable"
        ],
        "duration_per_shot": 3,
        "transition": "whip",
        "music_mood": "high-energy hip-hop/pop, 125-135 BPM, hard 808 bass + crisp hi-hats + vocal chop, snap hit landing on the A-to-B transition beat, viral TikTok transition energy",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 7. GRWM Drop Reel ───────────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "fashion",
    "category": "Reel",
    "name": "GRWM Drop Reel",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 7,
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
        "extra_positive": "CRITICAL: the same creator/model and the same garment across all three shots — color and details locked identical to the reference, no morph or identity drift between shots. Get-ready-with-me styling reel featuring the uploaded garment, bright airy creator-bedroom aesthetic, soft ring-light key with warm ambient fill, shot on 35mm f/2.8 vertical social-first framing, upbeat on-trend energy; on the pick-up shot keep a single well-formed hand with exactly five natural fingers and visible fingernails",
        "extra_negative": "warped garment, color shift between shots, garment morphing, identity drift or flicker between shots, jittery unstable motion, six fingers, fused or webbed digits"
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
        "music_mood": "bright bubbly pop, 110-120 BPM, plucky synth + finger-snaps + airy vocal, feel-good get-ready energy, GRWM creator-vlog vibe",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 8. 360 Product Spin ─────────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "fashion",
    "category": "Reel",
    "name": "360 Product Spin",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 8,
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
        "extra_positive": "CRITICAL: the exact same garment geometry, color, print, seams and hardware locked identical to the reference at every rotation angle — no morph, stretch or detail drift between angles. Smooth 360-degree e-commerce turntable presentation of the uploaded garment, product only with no model or hands in frame, perfectly even wraparound softbox lighting with no hot spots, light-grey seamless background, shot on 50mm f/8 for low distortion, crisp true-to-life fabric texture and accurate silhouette, stable perfectly centered framing",
        "extra_negative": "warped or morphing garment, color shift during rotation, geometry distortion, extra seams, wobbling unstable spin, motion blur smearing detail, background color flicker, duplicated product, live model in frame"
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
        "music_mood": "sleek minimal electronic, 100-110 BPM, soft pad + subtle pulse + light percussion, calm premium product-showcase energy, clean e-commerce reference vibe",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  }
];
