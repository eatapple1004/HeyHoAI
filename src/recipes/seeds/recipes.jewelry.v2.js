/**
 * Doppia recipe seed — jewelry (product mode), 6 templates — v2.
 * 통합 스키마 v1. recipes 테이블에 INSERT.
 *
 * v2 changelog vs v1:
 *  - Facet Macro: repriced ◈5 → ◈2 (4-shot image_set = 4×0.5).
 *  - Velvet Studio Set + Gilded Editorial merged → "Studio & Editorial" (◈2).
 *  - Scale & Sizing added (NEW): text_overlay card for size anxiety, ◈2.
 *  - Wrist & Hand: repriced ◈6 → ◈5 (on_model_tryon 4-shot special);
 *      AI-risk flags + hardened finger negative + cropped-hand framing note.
 *  - Light Play Reel: kept at ◈6 (3-shot reel, pricing already correct).
 *  - Unbox ASMR Reel: cut from 4 → 3 shots to reprice ◈8 → ◈6.
 */
module.exports = [
  // ─── 1. FACET MACRO ──────────────────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Macro",
    "name": "Facet Macro",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "Fine-jewelry sellers who live or die on stone detail use this to prove cut, clarity and craftsmanship at zoom levels a phone can't reach. Four macro angles at ◈2 make it the go-to quality-proof entry.",
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
          "lighting:dark_field_spotlight",
          "color:neutral_jewel_tone",
          "texture:polished_metal_micro",
          "context:black_acrylic_riser"
        ],
        "extra_positive": "extreme macro product photography, 100mm macro lens at f/8 focus-stacked, dark-field gemological lighting with a single pin spotlight raking across the surface, crisp internal fire and dispersion inside the stone, razor-sharp facet edges, fine engraving and prong detail tack sharp, micro-reflections on polished metal, seamless deep-black reflective acrylic base, every facet stone and engraving identical to the reference",
        "negative": "warped or duplicated stone, distorted prongs, melted metal, asymmetric facets, fingerprints, dust specks, blown-out highlights, blurry edges, plastic look, text artifacts, watermark, extra gems, color shift on metal"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "deep-black reflective acrylic riser, dark-field lighting",
          "pose": "detail macro of the center stone, top-down into the table facet",
          "composition": "closeup"
        },
        {
          "scene": "matte black gradient backdrop with single pin spotlight",
          "pose": "3/4 angle showing crown facets and prong setting",
          "composition": "closeup"
        },
        {
          "scene": "black acrylic base with faint reflection",
          "pose": "side profile detail of the band, engraving and hallmark visible",
          "composition": "closeup"
        },
        {
          "scene": "dark-field set, raking key light",
          "pose": "front macro, full piece centered showing brilliance and sparkle",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 2. STUDIO & EDITORIAL (merged Velvet Studio Set + Gilded Editorial) ─────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Studio",
    "name": "Studio & Editorial",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "Combines the catalog workhorse (velvet PDP shot) and the mood-forward editorial still-life into one cohesive 4-shot set — covers both pure e-commerce and brand-building use cases at the lowest price point.",
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
          "lighting:soft_diffused_studio_to_golden_window",
          "color:jewel_tone_velvet_to_champagne_gold",
          "texture:velvet_plush_marble_silk",
          "context:velvet_display_and_luxury_still_life"
        ],
        "extra_positive": "premium jewelry studio and editorial photography, 100mm lens at f/8–f/11 for catalog shots transitioning to 85mm f/4 editorial warmth, shots move from clean velvet display catalog hero to a warm directional golden-hour window still-life vignette, rich deep-emerald velvet surface, then champagne palette with marble veneer and draped silk props, controlled reflections, long elegant shadows in editorial shots, the product rendered identical to the reference in every frame, luxury lookbook mood",
        "negative": "distorted product, duplicated piece, lint or hair on velvet, dust, blown highlights, harsh color cast, gaudy props, cluttered composition, warped reflections in glass, text artifacts, watermark, plastic sheen, missing stones"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "deep emerald velvet pad, soft gradient backdrop, large softbox key",
          "pose": "front view, product perfectly centered, clean catalog hero",
          "composition": "medium_shot"
        },
        {
          "scene": "velvet ring pillow or bust display, diffused kicker light",
          "pose": "product on display prop, 3/4 angle showing dimension",
          "composition": "medium_shot"
        },
        {
          "scene": "marble surface with draped champagne silk, golden window light from the left",
          "pose": "piece as editorial hero on silk with elegant negative space, long shadow",
          "composition": "medium_shot"
        },
        {
          "scene": "linen and marble flat composition, soft top light, minimal brass prop",
          "pose": "styled flat-lay, piece at center with curated props, magazine crop",
          "composition": "full_body"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 3. SCALE & SIZING ───────────────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Sizing",
    "name": "Scale & Sizing",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 3,
    "rationale": "The #1 jewelry purchase anxiety is 'how big is this actually?' — this set shows the piece next to universally understood size references (coin, ruler edge, finger), and a post-render measurement card overlay answers it definitively.",
    "text_overlay": true,
    "meta": {
      "render_notes": "DO NOT inject 'text' or 'logo' into look.negative — SAFETY_NEGATIVE already handles that globally. After generation, overlay a measurement card (e.g. '18mm diameter · 2.1g') in white sans-serif on a semi-transparent dark pill badge at the bottom of each image using the platform text-overlay pipeline. The rendered image must be clean so the overlay composites cleanly."
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
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Studio",
        "attributes": [
          "lighting:soft_diffused_overhead",
          "color:clean_white_neutral",
          "texture:matte_white_surface",
          "context:size_reference_tabletop"
        ],
        "extra_positive": "clean catalog product photography for size reference, 100mm macro lens at f/11, flat soft overhead diffused light with no harsh shadows, piece placed beside a universally recognizable coin (quarter or 1-euro size) or next to a precision ruler edge, matte white seamless surface, the jewelry piece rendered identical to the reference in exact proportions, every dimension trustworthy and undistorted, clinical accuracy, e-commerce sizing card feel",
        "negative": "distorted scale of product, stretched or compressed proportions, warped ruler, missing coin or reference object, harsh shadows obscuring edges, reflections hiding size, blurry edges, misleading crop, plastic sheen, color shift on metal, extra gems, duplicated piece"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "matte white seamless surface, soft overhead diffused light",
          "pose": "piece laid flat beside a coin (quarter-size) with 2 cm gap, top-down orthographic angle",
          "composition": "medium_shot"
        },
        {
          "scene": "white surface, ruler edge entering from the left of frame",
          "pose": "piece resting against the ruler, diameter or length measurable from shot",
          "composition": "closeup"
        },
        {
          "scene": "neutral light grey surface, minimal props",
          "pose": "ring or pendant alone, front view, perfectly centered, full-piece proportions visible",
          "composition": "medium_shot"
        },
        {
          "scene": "white surface, shallow sidelight for gentle edge definition",
          "pose": "piece slightly angled to show depth/thickness alongside coin reference",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 4. WRIST & HAND (on_model_tryon, AI-risk flagged) ───────────────────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModel",
    "name": "Wrist & Hand",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 4,
    "rationale": "Lets a seller show real-world scale and how a ring, bracelet or watch sits on skin without booking a hand model. Repriced to ◈5 (on_model_tryon flat rate). Framing kept tight/partial to minimize finger artifact risk.",
    "meta": {
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Hands/fingers are high AI-risk. Prefer wrist-level or partial-hand crops (bracelet cuff, ring at knuckle) over full spread-finger shots. QA reviewer must confirm: correct finger count (5 per hand), no fused/floating fingers, natural knuckle joints. Reject and re-run if malformed."
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
        "style_preset": "Portrait",
        "attributes": [
          "lighting:soft_window_daylight",
          "color:warm_skin_neutral",
          "texture:skin_natural_realistic",
          "context:elegant_neutral_interior"
        ],
        "extra_positive": "elegant on-model hand and wrist jewelry photography, 85mm portrait lens at f/2.8, soft north-facing window light with a subtle silver bounce fill, well-manicured natural hand with realistic skin texture and natural anatomy, single hand in frame with exactly five fingers clearly separated and naturally curved, the jewelry piece worn correctly and rendered identical to the reference, shallow depth of field with creamy bokeh, refined editorial styling, neutral silk or marble surfaces in background",
        "negative": "single hand with incorrect finger count, extra fingers beyond five, missing fingers, fused or melted fingers, webbed fingers, floating fingers detached from hand, claw-like or talon fingers, warped knuckle joints, two hands unless intentional, malformed wrist, plastic skin texture, distorted jewelry, wrong number of stones, duplicated piece, harsh shadows, oversharpened skin, watermark"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "soft daylight by window, neutral linen background",
          "pose": "ring worn on finger, tight crop at knuckle level — fingers gently curved, only 2–3 fingers visible in clean partial-hand crop",
          "composition": "closeup"
        },
        {
          "scene": "warm interior with creamy bokeh",
          "pose": "wrist raised showing bracelet — wrist-level crop, hand softly cupped just entering frame from below",
          "composition": "closeup"
        },
        {
          "scene": "silk fabric surface, diffused light",
          "pose": "hand resting palm-down on silk, ring visible on one finger, relaxed natural pose — crop stops at mid-palm",
          "composition": "closeup"
        },
        {
          "scene": "minimal beige studio, gentle shadow",
          "pose": "wrist-level horizontal shot of bracelet or watch on wrist only — hand cropped out below frame",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 5. LIGHT PLAY REEL (3 shots = ◈6) ──────────────────────────────────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Reel",
    "name": "Light Play Reel",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 5,
    "rationale": "A scroll-stopping sparkle reel for IG and TikTok that sells the fire and brilliance of a stone better than any still can. 3 shots at ◈6 is the sweet spot for social engagement vs cost.",
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
        "style_preset": "Cinematic",
        "attributes": [
          "lighting:moving_specular_highlight",
          "color:warm_gold_sparkle",
          "texture:facet_fire_dispersion",
          "context:dark_reflective_stage"
        ],
        "extra_positive": "cinematic jewelry sparkle reel, 100mm macro look, slow controlled specular highlights traveling across facets to ignite rainbow fire and dispersion, deep dark reflective stage with soft falloff, dramatic single moving key light, every facet and the metal finish identical to the reference, luxury hypnotic mood",
        "negative": "flickering product, warped or morphing stone, jittery motion, duplicated piece, blown highlights, color banding, distorted metal, text artifacts, watermark, plastic look, motion smearing on edges"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "dark reflective stage, single moving spotlight",
          "pose": "front macro of center stone catching the light",
          "composition": "closeup"
        },
        {
          "scene": "black gradient set with slow rotating light source",
          "pose": "3/4 angle, facets igniting one by one",
          "composition": "closeup"
        },
        {
          "scene": "reflective base with soft falloff",
          "pose": "full piece pull-back, final glamour reveal",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow specular highlight sweep across the stone",
          "gentle orbit as light travels facet to facet",
          "slow pull-back dolly with sparkle settling"
        ],
        "duration_per_shot": 3,
        "transition": "fade",
        "music_mood": "luxe ambient shimmer",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 6. UNBOX ASMR REEL (3 shots = ◈6, down from 4-shot ◈8) ─────────────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Reel",
    "name": "Unbox ASMR Reel",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 6,
    "rationale": "The high-conversion gifting reel: the tactile box-open moment drives high-AOV purchases. Cut from 4→3 shots to reprice ◈8→◈6 while keeping the core narrative: closed box → reveal → hero piece. Hands-in-frame carries same finger AI-risk as Wrist & Hand — flag for QA.",
    "meta": {
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Shots 2–3 include hands. QA must verify: correct finger count, no fused fingers, natural knuckle joints. Prefer gloved-hand or finger-tip-only framing where possible to reduce artifact risk."
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
        "style_preset": "Cinematic",
        "attributes": [
          "lighting:warm_soft_key",
          "color:warm_luxe_cream",
          "texture:leatherette_box_satin",
          "context:gift_unboxing_table"
        ],
        "extra_positive": "premium ASMR jewelry unboxing reel, 85mm macro look at f/2.8, warm soft key with practical candle-glow fill, hands with realistic skin gently opening a luxury leatherette box revealing satin lining, intimate tactile mood, shallow depth of field, the jewelry piece identical to the reference resting in the box, clean surfaces, aspirational gifting atmosphere, single hand with exactly five naturally separated fingers, natural knuckle joints",
        "negative": "extra fingers beyond five per hand, missing fingers, fused or melted fingers, claw-like fingers, malformed wrist, plastic skin, warped product, duplicated piece, jittery motion, distorted box geometry, harsh light, text artifacts, watermark, melted metal, missing stones, motion smearing"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "warm-lit table, closed luxury leatherette box with ribbon, no hands yet",
          "pose": "static beauty shot of the closed box, anticipation",
          "composition": "medium_shot"
        },
        {
          "scene": "soft key light, satin-lined interior revealed",
          "pose": "fingertips only lifting the lid — tight crop shows lid edge and satin lining opening",
          "composition": "closeup"
        },
        {
          "scene": "box interior glowing, piece nested in satin cushion",
          "pose": "detail macro of the piece settled in the cushion, final hero reveal — no hands",
          "composition": "closeup"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow push-in on the closed box",
          "top-down tilt as the lid lifts, fingertips entering at the edge",
          "gentle rack focus onto the nested piece, slow zoom in"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "soft ASMR warmth with delicate chimes",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  }
];
