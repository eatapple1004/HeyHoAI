/**
 * Doppia recipe seed — jewelry (product mode), 6 templates.
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list). recipes 테이블에 INSERT.
 * 자동 생성(레시피 프롬프트 워크플로). config.look.extra_positive/negative + shots[].scene/pose/composition 사용.
 */
module.exports = [
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Macro",
    "name": "Facet Macro",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 1,
    "rationale": "Fine-jewelry sellers who live or die on stone detail use this to prove cut, clarity and craftsmanship at zoom levels a phone can't reach.",
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
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModel",
    "name": "Wrist & Hand",
    "output_type": "image_set",
    "credit_cost": 6,
    "sort_order": 2,
    "rationale": "Lets a seller show scale and how a ring, bracelet or watch actually sits on skin without booking a hand model or studio.",
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
        "style_preset": "Portrait",
        "attributes": [
          "lighting:soft_window_daylight",
          "color:warm_skin_neutral",
          "texture:skin_natural_realistic",
          "context:elegant_neutral_interior"
        ],
        "extra_positive": "elegant on-model hand and wrist photography, 85mm portrait lens at f/2.8, soft north-facing window light with a subtle silver bounce fill, well-manicured hand with realistic skin texture and natural anatomy, the jewelry piece worn correctly and rendered identical to the reference, shallow depth of field, refined editorial styling, neutral silk or marble surfaces in soft bokeh",
        "negative": "extra fingers, missing fingers, fused or warped fingers, malformed hand, plastic skin, distorted jewelry, wrong number of stones, duplicated piece, harsh shadows, oversharpened skin, text artifacts, watermark, claw-like nails"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "soft daylight by a window, neutral linen background",
          "pose": "ring worn, hand relaxed resting on a marble edge, fingers gently curved",
          "composition": "closeup"
        },
        {
          "scene": "warm interior with creamy bokeh",
          "pose": "wrist raised showing bracelet or watch, hand softly cupped",
          "composition": "medium_shot"
        },
        {
          "scene": "silk fabric surface, diffused light",
          "pose": "hand to collarbone showing necklace and ring together, elegant gesture",
          "composition": "medium_shot"
        },
        {
          "scene": "minimal beige studio, gentle shadow",
          "pose": "both hands clasped, detail on the worn piece, catalog clarity",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Studio",
    "name": "Velvet Studio Set",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 3,
    "rationale": "The everyday workhorse: clean, repeatable catalog and PDP shots on jewel-tone velvet that any store needs for every SKU.",
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
          "lighting:soft_diffused_studio",
          "color:jewel_tone_velvet",
          "texture:velvet_plush_nap",
          "context:velvet_display_set"
        ],
        "extra_positive": "premium e-commerce jewelry studio photography, 100mm lens at f/11, large softbox key with gradient fill and a low-angle kicker for sparkle, rich deep-emerald and midnight-blue velvet display surface with soft plush nap, controlled clean reflections, gentle natural drop shadow, product perfectly centered and color-accurate to the reference, luxury catalog look",
        "negative": "distorted product, duplicated piece, lint or hair on velvet, dust, blown highlights, color cast, harsh reflections, cluttered background, text artifacts, watermark, plastic sheen, warped metal, missing stones"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "deep emerald velvet pad, soft gradient backdrop",
          "pose": "front view, product centered, hero catalog shot",
          "composition": "medium_shot"
        },
        {
          "scene": "midnight-blue velvet with subtle vignette",
          "pose": "3/4 angle showing dimension and setting",
          "composition": "medium_shot"
        },
        {
          "scene": "velvet ring pillow or bust display",
          "pose": "product on display prop, styled presentation",
          "composition": "medium_shot"
        },
        {
          "scene": "plush velvet surface, raking kicker light",
          "pose": "close detail on clasp, prongs or dial face",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Reel",
    "name": "Light Play Reel",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 4,
    "rationale": "A scroll-stopping sparkle reel for IG and TikTok that sells the fire and brilliance of a stone better than any still can.",
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
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Reel",
    "name": "Unbox ASMR Reel",
    "output_type": "reel",
    "credit_cost": 8,
    "sort_order": 5,
    "rationale": "The premium-tier conversion reel: the tactile box-open moment that drives gifting and high-AOV purchases for jewelry brands.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": {
        "type": "reel",
        "count": 4,
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
        "extra_positive": "premium ASMR jewelry unboxing reel, 50mm and 85mm macro look at f/2.8, warm soft key with practical candle-glow fill, hands with realistic skin gently opening a luxury leatherette box revealing satin lining, intimate tactile mood, shallow depth of field, the jewelry piece identical to the reference resting in the box, condensation-free clean surfaces, aspirational gifting atmosphere",
        "negative": "extra fingers, malformed hands, plastic skin, warped product, duplicated piece, jittery motion, distorted box geometry, harsh light, text artifacts, watermark, melted metal, missing stones, motion smearing"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "warm-lit table, closed luxury leatherette box with ribbon",
          "pose": "hands resting on the closed box, anticipation",
          "composition": "medium_shot"
        },
        {
          "scene": "soft key light, satin-lined interior revealed",
          "pose": "hands slowly lifting the lid, box opening",
          "composition": "closeup"
        },
        {
          "scene": "box interior glowing, piece nested in satin",
          "pose": "detail macro of the piece settled in the cushion",
          "composition": "closeup"
        },
        {
          "scene": "hands lifting the piece toward warm light",
          "pose": "piece raised, final hero presentation",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow push-in on the closed box",
          "top-down tilt as the lid lifts open",
          "gentle rack focus onto the nested piece",
          "slow rise following the piece toward the light"
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
  },
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Editorial",
    "name": "Gilded Editorial",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 6,
    "rationale": "Mood-forward campaign and lookbook imagery for brands building an aspirational identity beyond plain catalog shots.",
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
        "style_preset": "Editorial",
        "attributes": [
          "lighting:golden_hour_window_glow",
          "color:champagne_gold_warm",
          "texture:marble_silk_glass",
          "context:luxury_still_life_table"
        ],
        "extra_positive": "high-end editorial jewelry still life, 85mm lens at f/4, warm directional golden-hour window light with long elegant shadows, champagne and gold palette, luxury props of marble veneer aged brass coupe glasses and draped silk, the jewelry piece as hero rendered identical to the reference, refined negative space, magazine campaign mood, tactile premium materials",
        "negative": "distorted product, duplicated piece, cluttered composition, gaudy props, color cast on metal, blown highlights, plastic look, warped reflections in glass, text artifacts, watermark, missing stones, dust"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "marble surface with draped champagne silk, golden window light",
          "pose": "piece as hero on silk with elegant negative space",
          "composition": "medium_shot"
        },
        {
          "scene": "brass tray beside a coupe glass, warm long shadows",
          "pose": "piece styled in a luxury still-life vignette",
          "composition": "medium_shot"
        },
        {
          "scene": "aged mirror and soft sunbeam",
          "pose": "detail with reflection, intimate editorial crop",
          "composition": "closeup"
        },
        {
          "scene": "linen and marble flat composition, top light",
          "pose": "styled flat-lay with curated props around the piece",
          "composition": "full_body"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  }
];
