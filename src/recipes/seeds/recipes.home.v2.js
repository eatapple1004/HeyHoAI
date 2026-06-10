/**
 * Doppia recipe seed — home (product mode), v2, 6 templates.
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list).
 * recipes 테이블에 INSERT.
 *
 * v2 변경 요약:
 *   - Quiet Luxe Room + Golden Hour Corner → MERGE → "Room & Warmth Styled" (◈3, 6-shot)
 *   - Macro Texture Pop + Tonal Flatlay Set → MERGE → "Material Detail Suite" (◈3, 6-shot)
 *   - "Scale & Dimensions Frame" 신규 추가 (◈2, text_overlay=true)
 *   - "Quick Warmth Snap" 릴 신규 추가 (◈4, 2-shot cheap reel)
 *   - Empty-to-Styled Reveal (◈6) KEEP
 *   - Slow ASMR Detail (◈6) KEEP
 *
 * AI-risk note: home 카탈로그는 손/얼굴/텍스트가 기본적으로 없어 AI 생성 위험 최저.
 * SAFETY_NEGATIVE가 'text'/'logo' 자동 주입 → Scale & Dimensions Frame은
 * look.negative 에서 text/logo 제외하고 text_overlay:true + meta.render_notes 로 처리.
 */
module.exports = [
  /* ─────────────────────────────────────────────────────────────────────
   * 1. Room & Warmth Styled  (◈3 mid-tier, 6-shot image_set)
   *    Merged from: Quiet Luxe Room + Golden Hour Corner
   *    JTBD: 인테리어/가구/데코 셀러 — aspirational room scene + golden warmth를
   *          한 세트에서 커버. 4컷→6컷으로 shot 다양성 확대, ◈2→◈3 repriced.
   * ─────────────────────────────────────────────────────────────────────*/
  {
    "mode": "product",
    "vertical": "home",
    "category": "Scene",
    "name": "Room & Warmth Styled",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 1,
    "rationale": "Interior, furniture, and decor sellers who need both a calm editorial room scene and a warm golden-hour lifestyle shot — without renting a set. Merges Quiet Luxe Room and Golden Hour Corner into one deeper 6-shot set covering morning light, golden hour, and full-room establishing angles.",
    "meta": {
      "merged_from": ["Quiet Luxe Room", "Golden Hour Corner"],
      "v2_change": "reprice ◈2→◈3, expand 4-shot→6-shot, absorb golden-hour into shot list"
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": {
        "type": "image_set",
        "count": 6,
        "aspect_ratio": "4:5"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Interior",
        "attributes": [
          "lighting:soft_window_diffuse_to_golden_hour",
          "color:warm_neutral_greige_amber",
          "texture:matte_plaster_linen_oak",
          "context:aspirational_apartment_room"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial real-estate and lifestyle magazine quality; limewash walls, oak floor, sheer linen curtains diffusing daylight; warm afternoon sun raking through window with long shadows and gentle lens flare, dust motes; one statement plant and a stack of art books for scale; product kept exact in shape/material/color as the styled hero; soft realistic contact shadows on the floor; range from calm minimalist morning light to cozy golden-hour warmth",
        "negative": "warped or duplicated product, distorted proportions, cluttered busy room, harsh flash, blown highlights, text artifacts, watermark, logos, fake reflections, floating furniture, melted edges, plastic CGI look, oversaturated colors, cold blue cast"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "minimalist living room corner with limewash wall and oak floor, soft morning diffuse light through sheer curtain",
          "pose": "product front view, centered as room hero",
          "composition": "full_body"
        },
        {
          "scene": "same room, soft window light from camera-left, art books and plant nearby for scale",
          "pose": "product 3/4 angle showing depth and side profile",
          "composition": "medium_shot"
        },
        {
          "scene": "cozy reading nook with neutral textiles and a warm floor lamp at dusk",
          "pose": "product styled in lived-in context with a throw and ceramic vase",
          "composition": "medium_shot"
        },
        {
          "scene": "wide pulled-back interior establishing the whole calm room",
          "pose": "product anchored in full room scene, negative space around it",
          "composition": "full_body"
        },
        {
          "scene": "windowsill corner at golden hour, long warm shadows and soft lens flare",
          "pose": "product front view bathed in low afternoon sun",
          "composition": "medium_shot"
        },
        {
          "scene": "sunlit shelf or side table with backlit plants and warm amber bokeh",
          "pose": "product as part of warm vignette, sun behind, shallow depth of field",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────────────────────────────
   * 2. Material Detail Suite  (◈3 mid-tier, 6-shot image_set)
   *    Merged from: Macro Texture Pop + Tonal Flatlay Set
   *    JTBD: 세라믹/니트/우드 소재 셀러 — 텍스처 증명 매크로 + 큐레이티드 플랫레이를
   *          한 세트로 제공. ◈3 유지, 4-shot→6-shot 확장.
   * ─────────────────────────────────────────────────────────────────────*/
  {
    "mode": "product",
    "vertical": "home",
    "category": "Detail",
    "name": "Material Detail Suite",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 2,
    "rationale": "Sellers of tactile goods (ceramics, knits, woodwork, textiles) who need both extreme texture macro shots proving material quality and tonal top-down flatlay spreads for catalog and feed. Merges Macro Texture Pop and Tonal Flatlay Set into one 6-shot suite.",
    "meta": {
      "merged_from": ["Macro Texture Pop", "Tonal Flatlay Set"],
      "v2_change": "expand 4-shot→6-shot, absorb flatlay shots, keep ◈3"
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": {
        "type": "image_set",
        "count": 6,
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
          "lighting:raking_grazing_to_soft_overhead",
          "color:true_to_material_tonal",
          "texture:hyper_detail_surface_and_layered_matte",
          "context:seamless_neutral_macro_and_styled_topdown"
        ],
        "extra_positive": "100mm macro lens at f/8 with focus stacking for texture shots; raking side light reveals weave/grain/glaze; ultra-fine surface detail with visible fibers/wood grain/ceramic crackle; true-to-life material color; AND 90-degree top-down flatlay on 50mm with soft even diffused overhead light, tonal color story props (linen, stone, dried botanicals, ceramic) all in the same palette family; product kept exact in shape/material/color as hero throughout; premium homeware magazine quality",
        "negative": "soft out-of-focus subject, warped or duplicated product, invented patterns, plastic CGI sheen, blown highlights crushing texture, text artifacts, watermark, logos, color shift away from real material, oversharpen halos, noise, distorted proportions, tilted flatlay angle, clashing colors, props overlapping the hero"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "neutral seamless macro surface, raking light from the left",
          "pose": "product surface detail extreme close-up showing weave/grain/glaze texture",
          "composition": "closeup"
        },
        {
          "scene": "soft graduated grey background, grazing top light",
          "pose": "edge/seam detail revealing material finish and join quality",
          "composition": "closeup"
        },
        {
          "scene": "clean studio macro set, focus-stacked sharpness",
          "pose": "signature texture feature filling the frame",
          "composition": "closeup"
        },
        {
          "scene": "neutral linen surface, perfect 90-degree top-down, soft even overhead light",
          "pose": "product centered hero with minimal tonal props around it",
          "composition": "medium_shot"
        },
        {
          "scene": "warm stone tabletop, top-down, generous negative space",
          "pose": "product off-center with rule-of-thirds prop balance",
          "composition": "medium_shot"
        },
        {
          "scene": "curated top-down surface with dried botanicals and ceramics in matching palette",
          "pose": "full styled spread, product as the focal anchor",
          "composition": "full_body"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────────────────────────────
   * 3. Scale & Dimensions Frame  (◈2 entry, 4-shot image_set)
   *    NEW — standardised info frame with measurement overlay
   *    JTBD: 가구/대형 소품 — 실제 크기 증명, 소비자 구매 확신 상승
   *    text_overlay:true  →  SAFETY_NEGATIVE 'text'/'logo' 자동 주입되므로
   *    look.negative 에서 text/logo 제외, render_notes에 overlay 지시 기록
   * ─────────────────────────────────────────────────────────────────────*/
  {
    "mode": "product",
    "vertical": "home",
    "category": "Info",
    "name": "Scale & Dimensions Frame",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 3,
    "rationale": "Furniture and large decor sellers whose #1 shopper concern is 'will this fit?'. Places the product in a real room context alongside familiar scale references (person silhouette placeholder, tape measure, standard sofa), then a post-render overlay adds dimension callouts. Standardised utility frame reduces returns and increases add-to-cart confidence.",
    "text_overlay": true,
    "meta": {
      "v2_change": "NEW template",
      "render_notes": "Post-render overlay pipeline injects dimension callouts (e.g. W120cm × D45cm × H75cm) with arrow annotations onto each image. DO NOT embed any text or numbers into the diffusion prompt — the overlay layer handles all typography. SAFETY_NEGATIVE auto-injects 'text,logo' which correctly suppresses model-generated glyphs; look.negative intentionally omits 'text'/'logo' to avoid double-injection conflicts."
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
        "style_preset": "Interior",
        "attributes": [
          "lighting:clean_even_studio_room",
          "color:neutral_white_greige",
          "texture:clean_matte_walls_floor",
          "context:scale_reference_room"
        ],
        "extra_positive": "product placed in a clean neutral room with clear spatial context, clean white or greige matte walls, light oak or concrete floor, soft even diffused light from overhead, room includes a standard two-seat sofa or known-size object nearby for spatial scale reference, product exact in shape/material/color, wide enough angle to see the full product and surrounding floor space, architectural interior product photography, zero clutter, precise clean edges, realistic contact shadow",
        "negative": "warped or duplicated product, distorted proportions, cluttered room, unknown floating objects, harsh flash, blown highlights, fake reflections, melted edges, plastic CGI look, oversaturated colors"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean neutral room, full-width view showing product and surrounding floor space with a standard sofa at the edge for scale",
          "pose": "product front view centered, full product visible, room floor visible around it",
          "composition": "full_body"
        },
        {
          "scene": "same room, side view showing product depth and wall clearance",
          "pose": "product direct side profile against the wall, showing depth",
          "composition": "full_body"
        },
        {
          "scene": "overhead slightly tilted view showing product footprint on the floor",
          "pose": "product from 45-degree high angle, floor footprint clearly visible",
          "composition": "full_body"
        },
        {
          "scene": "close crop on top surface or key dimension feature, clean light",
          "pose": "top or near-top view of the product showing width reference",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────────────────────────────
   * 4. Day-to-Night Lighting Reveal  (◈4 reel, 2-shot)
   *    REPLACES: Quick Warmth Snap (duplicated Room & Warmth mood, 2-shot
   *              proved nothing, ◈4 was false value)
   *    JTBD: 홈 조명 제품(램프/캔들/LED) — 낮→밤 점등 전/후 비교 릴.
   *          카탈로그의 "점등(lighting ON)" 갭 해소.
   *    ⚠️  ENGINE BLOCKER: product-emissive / night-glow render path 미구현
   *        → meta.provisional=true, meta.flags=['needs_human_review']
   * ─────────────────────────────────────────────────────────────────────*/
  {
    "mode": "product",
    "vertical": "home",
    "category": "Reel",
    "name": "Day-to-Night Lighting Reveal",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 4,
    "rationale": "Lighting product sellers (lamps, candles, LED strips, pendants) who need a compelling before/after reel showing the product OFF in ambient daylight and then ON emitting warm light at night. Closes the home catalog lighting-ON gap — the single most-requested shot type for home lighting SKUs. Two shots give maximum contrast: cool/neutral day ambient vs. warm glowing night scene with the product as the light source.",
    "meta": {
      "provisional": true,
      "flags": ["needs_human_review"],
      "v2_change": "REPLACES Quick Warmth Snap — QWS duplicated Room & Warmth mood, added no unique value at ◈4; Day-to-Night fills the lighting-ON catalog gap instead",
      "render_notes": "ENGINE BLOCKER: shot 2 requires the product to emit light (lamp glow, candle flame, LED strip illumination). The current nano-banana render pipeline does not have an emissive/night-glow path — the product must be the active light source in shot 2, not merely lit by ambient light. This template should be held in preview/manual-QA until an emissive render mode is available. Human review required before enabling for automated generation."
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
        "style_preset": "Interior",
        "attributes": [
          "lighting:daytime_ambient_off_to_night_product_emissive",
          "color:neutral_day_to_warm_amber_night",
          "texture:matte_home_surfaces_natural",
          "context:home_interior_lighting_reveal"
        ],
        "extra_positive": "two-shot day-to-night lighting reveal reel, 50mm lens at f/2.8; shot 1: soft cool neutral daylight ambient, product UNLIT/OFF — lamp shade or candle wick dark, room lit only by window light, product shape clearly visible but not glowing; shot 2: same scene at night, room dark, product turned ON and actively emitting warm amber light — visible glow halo, light cone or candleflame, warm pool of light spilling onto surrounding surfaces, product is the light source, aspirational cozy evening atmosphere; product kept exact in shape/material/color across both shots, consistent room geometry",
        "negative": "unlit lamp that should be glowing in night shot, dead black screen in night shot, candle wick dark when product should be lit, lamp shade with no light emission in night shot, harsh cold flash replacing product glow, warped or duplicated product, inconsistent room geometry between shots, blown highlights, text artifacts, watermark, logos, plastic CGI look, distorted proportions, flicker, morphing surfaces, day scene too dark, night scene too bright"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "home interior in soft neutral daylight — window light only, product in OFF/unlit state on side table or shelf",
          "pose": "product front view, unlit, ambient daylight environment establishing the before state",
          "composition": "medium_shot"
        },
        {
          "scene": "same home interior at night, room dark, product turned ON and emitting warm amber light — glow halo, light spilling onto surrounding surface",
          "pose": "product front view as active light source, warm glow emanating from it, cozy night atmosphere",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow gentle push-in toward the unlit product in daylight",
          "slow hold with subtle breathing motion as warm glow fills the frame at night"
        ],
        "duration_per_shot": 3,
        "transition": "fade",
        "music_mood": "calm ambient evening",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────────────────────────────
   * 5. Empty-to-Styled Reveal  (◈6 reel, 3-shot) — KEPT from v1
   *    Winner template — highest save/share; unique before/after JTBD
   * ─────────────────────────────────────────────────────────────────────*/
  {
    "mode": "product",
    "vertical": "home",
    "category": "Reel",
    "name": "Empty-to-Styled Reveal",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 5,
    "rationale": "Furniture and decor sellers wanting a satisfying before/after transformation reel that shows the product changing a space — high save/share rate.",
    "meta": {
      "v2_change": "KEPT unchanged from v1 — confirmed winner template"
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
        "style_preset": "Interior",
        "attributes": [
          "lighting:soft_window_diffuse",
          "color:warm_neutral_greige",
          "texture:matte_plaster_oak_linen",
          "context:apartment_makeover"
        ],
        "extra_positive": "cinematic interior reel, shot on 24mm wide lens at f/4, smooth gimbal movement, soft natural window light, an empty bare corner transforming into a warm fully-styled room, product kept exact in shape/material/color as the centerpiece of the reveal, aspirational home makeover mood, realistic shadows and consistent space across shots",
        "negative": "warped or duplicated product, room geometry changing between shots, jittery shaky motion, harsh flash, text artifacts, watermark, logos, plastic CGI look, distorted proportions, flickering, morphing walls, inconsistent lighting between cuts"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bare empty room corner with sheer-curtain daylight, nothing placed yet",
          "pose": "empty space establishing shot, product not present",
          "composition": "full_body"
        },
        {
          "scene": "same corner, product appears as the centerpiece being placed",
          "pose": "product front view dropping into the scene as hero",
          "composition": "medium_shot"
        },
        {
          "scene": "same corner now fully styled with rug, plant, books and warm lamp",
          "pose": "product 3/4 angle in the finished cozy room",
          "composition": "full_body"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow push-in across the empty corner",
          "match-cut settle as product lands in place",
          "gentle pull-back revealing the fully styled room"
        ],
        "duration_per_shot": 3,
        "transition": "whip",
        "music_mood": "warm uplifting lo-fi",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────────────────────────────
   * 6. Slow ASMR Detail  (◈6 reel, 3-shot) — KEPT from v1
   *    Premium sensory macro motion; strong watch-time, luxury tier
   * ─────────────────────────────────────────────────────────────────────*/
  {
    "mode": "product",
    "vertical": "home",
    "category": "Reel",
    "name": "Slow ASMR Detail",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 6,
    "rationale": "Premium homeware brands wanting slow, sensory macro motion reels that linger on texture and craftsmanship — strong watch-time and luxury feel.",
    "meta": {
      "v2_change": "KEPT unchanged from v1"
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
        "style_preset": "Macro",
        "attributes": [
          "lighting:soft_directional_key",
          "color:true_to_material_warm",
          "texture:tactile_surface_detail",
          "context:calm_neutral_macro_set"
        ],
        "extra_positive": "slow cinematic ASMR macro reel, shot on 100mm macro lens at f/4, ultra slow gliding camera over the product surface, soft directional key light revealing weave, grain and glaze, shallow rolling focus, dust-free pristine surfaces, true-to-life material color, calm meditative luxury mood, product kept exact in shape/material/color, buttery smooth slow motion",
        "negative": "fast or jerky motion, warped or duplicated product, invented surface patterns, plastic CGI sheen, blown highlights, text artifacts, watermark, logos, focus hunting, flicker, color shift away from real material, distorted proportions"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "calm neutral macro set, soft key light grazing the surface",
          "pose": "extreme close-up gliding along the product texture",
          "composition": "closeup"
        },
        {
          "scene": "same set, slow focus rolling across an edge or seam",
          "pose": "detail of join/finish with rolling rack focus",
          "composition": "closeup"
        },
        {
          "scene": "warm neutral backdrop, light catching the signature feature",
          "pose": "slow reveal of the product's hero detail",
          "composition": "closeup"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "ultra-slow lateral glide across the surface",
          "slow rack focus pull along the edge",
          "gentle slow tilt revealing the hero detail with a light sweep"
        ],
        "duration_per_shot": 3,
        "transition": "fade",
        "music_mood": "calm ambient ASMR",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────────────────────────────
   * 7. Variant Showcase Grid  (◈2 entry, 4-shot image_set)
   *    NEW — multi-color / multi-finish comparison grid
   *    JTBD: 55-60%의 홈 SKU가 멀티 배리언트 — 색상/마감 옵션을 한 프레임에서
   *          깔끔하게 비교. 발명된 색상 없이 실제 배리언트만 보존.
   * ─────────────────────────────────────────────────────────────────────*/
  {
    "mode": "product",
    "vertical": "home",
    "category": "Detail",
    "name": "Variant Showcase Grid",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 7,
    "rationale": "Home product sellers with multiple color or finish variants (55-60% of home SKUs) who need a clean comparison grid showing all options side-by-side. Each of the 4 shots renders the same product in one of its color/finish variants on a neutral background — buyers can see every option without clicking through individual PDPs. Variant integrity is preserved: no colors are invented, only the seller's actual options are rendered.",
    "meta": {
      "provisional": true,
      "v2_change": "NEW template — fills multi-variant comparison gap (55-60% of home SKUs)"
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
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
          "lighting:soft_even_diffused_overhead",
          "color:neutral_white_seamless_background",
          "texture:clean_matte_surface",
          "context:product_variant_comparison"
        ],
        "extra_positive": "clean product variant comparison grid, each shot one color or finish option of the same product, soft even diffused overhead studio light, pure white or light greige seamless background, product centered with generous negative space, consistent camera angle and distance across all 4 shots for easy comparison, true-to-material color accuracy — preserve exact variant color/finish as supplied, no invented colors, no color drift between shots, precise contact shadow, crisp clean edges, commercial catalog quality",
        "negative": "invented or fantasy colors not in the seller's actual variant range, color drift or shift from the real product finish, warped or duplicated product, mixed products in a single frame, cluttered background, inconsistent camera angle between shots, harsh shadows, blown highlights, text artifacts, watermark, logos, plastic CGI sheen, distorted proportions, props overlapping the product, multiple variants combined into a single image"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean neutral seamless studio, soft even overhead light",
          "pose": "product in variant 1 (first color/finish option), centered front view",
          "composition": "medium_shot"
        },
        {
          "scene": "identical clean neutral seamless studio setup",
          "pose": "product in variant 2 (second color/finish option), same angle as shot 1",
          "composition": "medium_shot"
        },
        {
          "scene": "identical clean neutral seamless studio setup",
          "pose": "product in variant 3 (third color/finish option), same angle as shot 1",
          "composition": "medium_shot"
        },
        {
          "scene": "identical clean neutral seamless studio setup",
          "pose": "product in variant 4 (fourth color/finish option), same angle as shot 1",
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
