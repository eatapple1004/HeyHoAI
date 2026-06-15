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
 * look.extra_negative 에서 text/logo 제외하고 text_overlay:true + meta.render_notes 로 처리.
 *
 * v2.1 변경: 네거티브를 死필드 look.negative → 엔진이 읽는 look.extra_negative 로 전 템플릿 이관,
 *            SAFETY 전역 중복어(text/watermark/logo) 제거, 섹션 특화 결함만 보존.
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
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial real-estate and lifestyle magazine quality; limewash walls, oak floor, sheer linen curtains diffusing daylight; warm afternoon sun raking through window with long shadows and gentle lens flare, dust motes; one statement plant and a stack of art books for scale; product kept exact in shape/material/color as the styled hero, identical across all six shots; soft realistic contact shadows on the floor; range from calm minimalist morning light to cozy golden-hour warmth",
        "extra_negative": "warped or duplicated product, distorted proportions, cluttered busy room, harsh flash, blown highlights, fake reflections, floating furniture, melted edges, plastic CGI look, oversaturated colors, cold blue cast"
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
        "extra_negative": "soft out-of-focus subject, warped or duplicated product, invented patterns, plastic CGI sheen, blown highlights crushing texture, color shift away from real material, oversharpen halos, noise, distorted proportions, tilted flatlay angle, clashing colors, props overlapping the hero"
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
      "render_notes": "Post-render overlay pipeline injects dimension callouts (e.g. W120cm × D45cm × H75cm) with arrow annotations onto each image. DO NOT embed any text or numbers into the diffusion prompt — the overlay layer handles all typography. SAFETY_NEGATIVE auto-injects 'text,logo' which correctly suppresses model-generated glyphs; look.extra_negative intentionally omits 'text'/'logo' to avoid double-injection conflicts.",
      "overlay_spec": {
        "layer": "post_render_dimension_overlay",
        "elements": [
          { "type": "dimension_callout", "axis": "width", "position": "width_axis_arrow", "example": "W120cm" },
          { "type": "dimension_callout", "axis": "depth", "position": "depth_axis_arrow", "example": "D45cm" },
          { "type": "dimension_callout", "axis": "height", "position": "height_axis_arrow", "example": "H75cm" }
        ],
        "font": "system_sans",
        "note": "AI는 치수 글자·화살표를 그리지 않음 — SAFETY_NEGATIVE_PROMPT가 'text'/'logo'를 전역 차단. 측정 콜아웃·치수 화살표는 렌더 후 오버레이 레이어로 합성하며 extra_negative에 text/logo 미포함."
      }
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
        "extra_positive": "product placed in a clean neutral room with clear spatial context, clean white or greige matte walls, light oak or concrete floor, soft even diffused light from overhead, room includes a standard two-seat sofa or known-size object nearby for spatial scale reference, product exact in shape/material/color, wide enough angle to see the full product and surrounding floor space, architectural interior product photography, zero clutter, precise clean edges, realistic contact shadow, generous clean floor and wall margin kept uncluttered as a reserved area for composited dimension callouts and measurement arrows",
        "extra_negative": "warped or duplicated product, distorted proportions, cluttered room, unknown floating objects, harsh flash, blown highlights, fake reflections, melted edges, plastic CGI look, oversaturated colors"
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
      "flags": ["experimental", "needs_human_review"],
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
        "extra_positive": "SAME product in both shots — identical geometry, material and color, only its lighting state changes (off to on), no morph or drift between day and night; two-shot day-to-night lighting reveal reel, 50mm lens at f/2.8; shot 1: soft cool neutral daylight ambient, product UNLIT/OFF — lamp shade or candle wick dark, room lit only by window light, product shape clearly visible but not glowing; shot 2: same scene at night, room dark, product turned ON and actively emitting warm amber light — visible glow halo, light cone or candleflame, warm pool of light spilling onto surrounding surfaces, product is the light source, aspirational cozy evening atmosphere; product kept exact in shape/material/color across both shots, consistent room geometry",
        "extra_negative": "unlit lamp that should be glowing in night shot, dead black screen in night shot, candle wick dark when product should be lit, lamp shade with no light emission in night shot, harsh cold flash replacing product glow, warped or duplicated product, inconsistent room geometry between shots, blown highlights, plastic CGI look, distorted proportions, flicker, morphing surfaces, day scene too dark, night scene too bright"
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
        "extra_positive": "SAME product across all shots — locked geometry, material and color, consistent room geometry, no morph or drift; cinematic interior reel, shot on 24mm wide lens at f/4, smooth gimbal movement, soft natural window light, an empty bare corner transforming into a warm fully-styled room, product kept exact in shape/material/color as the centerpiece of the reveal, aspirational home makeover mood, realistic shadows and consistent space across shots",
        "extra_negative": "warped or duplicated product, room geometry changing between shots, jittery shaky motion, harsh flash, plastic CGI look, distorted proportions, flickering, morphing walls, inconsistent lighting between cuts"
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
        "extra_positive": "slow cinematic ASMR macro reel, shot on 100mm macro lens at f/4, ultra slow gliding camera over the product surface, soft directional key light revealing weave, grain and glaze, shallow rolling focus, dust-free pristine surfaces, true-to-life material color, calm meditative luxury mood, product kept exact in shape/material/color with locked identity across all reel frames, buttery smooth slow motion",
        "extra_negative": "fast or jerky motion, warped or duplicated product, invented surface patterns, plastic CGI sheen, blown highlights, focus hunting, flicker, color shift away from real material, distorted proportions"
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
      "flags": ["experimental", "needs_human_review"],
      "v2_change": "NEW template — fills multi-variant comparison gap (55-60% of home SKUs)",
      "render_notes": "High-difficulty: engine must re-render the SAME product in each of the seller's actual color/finish variants WITHOUT inventing colors or drifting the silhouette. Validate variant fidelity on sample SKUs before enabling for automated generation."
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
        "extra_positive": "SAME product silhouette and geometry across all 4 shots — only the color or finish variant changes, never the shape, angle or framing; clean product variant comparison grid, each shot one color or finish option of the same product, soft even diffused overhead studio light, pure white or light greige seamless background, product centered with generous negative space, consistent camera angle and distance across all 4 shots for easy comparison, true-to-material color accuracy — preserve exact variant color/finish as supplied, no invented colors, no color drift between shots, precise contact shadow, crisp clean edges, commercial catalog quality",
        "extra_negative": "invented or fantasy colors not in the seller's actual variant range, color drift or shift from the real product finish, warped or duplicated product, mixed products in a single frame, cluttered background, inconsistent camera angle between shots, harsh shadows, blown highlights, plastic CGI sheen, distorted proportions, props overlapping the product, multiple variants combined into a single image"
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
  },


  /* ───────────── EXPERIMENTAL: Room & Warmth 형제 20종 (로컬 테스트, 2026-06-14) ─────────────
   * meta.experimental=true · 백업: .siblings-test-backup/ · 되돌리기=백업 복원. 카드계약/export 재생성 필요.
   * ────────────────────────────────────────────────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "home",
    "category": "Scene",
    "name": "Minimalist Warmth Study",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 101,
    "rationale": "Interior and decor sellers seeking Scandinavian minimalist aesthetic where the product stands as the sole visual hero. Captures the same morning-to-golden-hour light journey as Room & Warmth Styled, but with deliberately pared negative space to maximize product visibility and emphasize design purity.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:soft_diffuse_to_golden_raking_sparse_shadows",
          "color:white_sage_neutral_with_warm_amber_accents",
          "texture:smooth_plaster_bare_oak_zero_ornament",
          "context:scandinavian_minimalist_gallery_room"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial lifestyle and Scandi interior magazine quality; clean white or soft sage walls with zero visible clutter, pristine bare light oak floor, absolutely minimal styling—no plants, no books, no textile layers, only the product as visual anchor; soft cool-toned morning light diffusing through a single frosted window creating gentle shadows that emphasize form and emptiness; product bathed in generous negative space with vast floor and wall margins left deliberately bare; transition through the set from cool morning diffuse to warm golden-hour raking light catching the product's edges and creating long architectural shadows; product kept exact in shape/material/color as the styled hero, identical across all six shots; soft realistic contact shadows grounding the product to the floor; architectural minimalist aesthetic emphasizing purity, silence, and singular focus",
        "extra_negative": "clutter, visible props, multiple objects competing for attention, warm or cozy styling contradicting minimalism, layered textiles or decor, plants or flowers, soft furnishings, busy wall treatments, colored paint, harsh studio flash, warm yellow morning cast conflicting with cool minimalist tone, floating product without ground shadow, color drift between shots, plastic CGI look, distorted proportions"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "serene white gallery room corner, soft diffuse morning light from frosted window, absolutely bare oak floor with subtle grain visible",
          "pose": "product centered front view as sole visual element, positioned in vast empty floor space",
          "composition": "full_body"
        },
        {
          "scene": "same minimalist room, soft light from camera-left, architectural shadows from the window frame emphasizing negative space",
          "pose": "product 3/4 angle showing silhouette and depth, casting a gentle shadow on the floor",
          "composition": "medium_shot"
        },
        {
          "scene": "wide pulled-back view of the entire stripped room—empty walls, bare floor, product a distant quiet focal point",
          "pose": "product small but precisely centered within the expansive void",
          "composition": "full_body"
        },
        {
          "scene": "close approach to product in early golden-hour light, warm amber sun beginning to rake the floor and wall behind",
          "pose": "product front view with developing long shadow stretching across the floor toward camera",
          "composition": "medium_shot"
        },
        {
          "scene": "late golden hour in the minimalist room, warm low sun creating dramatic raking shadows across the white wall",
          "pose": "product silhouetted or rim-lit against the backlit wall, sole warm glow in the frame",
          "composition": "medium_shot"
        },
        {
          "scene": "intimate closeup detail in final golden light, product surface catching warm amber, extreme negative space surrounding it",
          "pose": "product surface or edge detail in shallow depth of field, warm light revealing material quality",
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
    "vertical": "home",
    "category": "Scene",
    "name": "Japandi Warmth Nook",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 102,
    "rationale": "East Asian minimalist aesthetic for home sellers seeking aspirational Japandi interiors—hinoki wood warmth, celadon ceramics, and lived-in craft textures in soft chiaroscuro light. Delivers both morning serenity and golden-hour richness across one cohesive 6-shot set without studio rental.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:soft_filtered_morning_to_chiaroscuro_amber",
          "color:warm_natural_wood_celadon_cream",
          "texture:raw_hinoki_tatami_linen_crackle_glaze",
          "context:japandi_artisan_nook_lived_in"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial lifestyle magazine premium quality; hinoki wood wall panels and pale ash flooring, raw-linen sliding screens diffusing filtered light; soft chiaroscuro side-light raking through paper screens casting geometric shadows, gentle dust-mote atmosphere; one hand-thrown celadon pot and a scroll art piece for warmth and depth; product kept exact in shape/material/color as the styled hero, identical across all six shots; soft realistic contact shadows on the wood floor; range from contemplative minimalist morning calm to warm amber evening glow revealing the product's craftsmanship and integration into lived space",
        "extra_negative": "warped or duplicated product, distorted proportions, cluttered busy nook, harsh flash or cold overhead lighting, blown highlights flattening texture, fake reflections in wood finish, floating or levitating furniture, melted edges, plastic CGI veneer, oversaturated or artificial colors, blue-cast cool light, plastic sheen on ceramics"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "minimalist japandi corner with hinoki wood wall, pale ash floor, soft morning diffuse light through linen screen filtering the soft window glow",
          "pose": "product front view, centered as nook hero, morning serenity",
          "composition": "full_body"
        },
        {
          "scene": "same nook, warm side-light from camera-left, geometric shadows from screen lattice, hand-thrown celadon pot and scroll art nearby for context",
          "pose": "product 3/4 angle revealing depth and crafted profile",
          "composition": "medium_shot"
        },
        {
          "scene": "intimate low-light reading corner with tatami texture, soft flickering candlelight, raw linen cushion, product nestled in lived-in arrangement",
          "pose": "product styled as functional yet sculptural piece in intimate space",
          "composition": "medium_shot"
        },
        {
          "scene": "wide establishing shot of the full japandi room, hinoki panels, natural wood furniture, soft amber light pooling across floor",
          "pose": "product anchored as focal point in serene whole-room composition, negative space and silence",
          "composition": "full_body"
        },
        {
          "scene": "late-afternoon chiaroscuro windowsill, warm golden light slicing through shoji screen, casting bold shadow lines across hinoki wall and product",
          "pose": "product bathed in low angled sun, chiaroscuro half-light revealing material and craft detail",
          "composition": "medium_shot"
        },
        {
          "scene": "close tactile arrangement of celadon vessel, raw wood block, product and folded linen on pale surface, amber backlight from window",
          "pose": "product as part of quiet curated still life, shallow focus on glaze and wood grain",
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
    "vertical": "home",
    "category": "Scene",
    "name": "Mid-Century Modern Warmth Studio",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 103,
    "rationale": "Furniture and lighting sellers targeting mid-century modern buyers who want the product shown in a period-authentic room — clean credenza lines, walnut and brass finishes, geometric textiles — warmed by the same morning-to-golden-hour light as Room & Warmth Styled.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "color:olive_mustard_walnut_soft_grey",
          "texture:walnut_brass_wool_geometric",
          "context:mid_century_modern_living_room"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial interior and design magazine quality; mid-century modern living room with walnut credenza, tapered-leg furniture, brass accents, a geometric mid-tone wool rug and a period arc or globe pendant lamp; muted olive, mustard and soft-grey palette with warm walnut wood tones; soft morning daylight through a large window becoming warm golden-hour light raking across the brass and walnut finishes; period-correct ceramics and vintage-look books as restrained props, clean balanced geometric composition; product kept exact in shape/material/color as the styled hero, identical across all six shots; soft realistic contact shadows on the floor; heirloom mid-century mood emphasizing clean lines and warm patina",
        "extra_negative": "warped or duplicated product, distorted proportions, cluttered or maximalist room, anachronistic modern minimalism, harsh flash, blown highlights on brass, fake reflections, floating furniture, melted edges, plastic CGI look, oversaturated colors, cold blue cast, busy clashing patterns"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "mid-century living room with walnut credenza and soft morning diffuse light through a wide window",
          "pose": "product front view centered as room hero on or beside the credenza",
          "composition": "full_body"
        },
        {
          "scene": "same room, soft light from camera-left, geometric wool rug and tapered-leg chair nearby for scale and era context",
          "pose": "product 3/4 angle showing clean silhouette and depth",
          "composition": "medium_shot"
        },
        {
          "scene": "cozy reading corner with a period arc lamp, walnut shelf and vintage books at late afternoon",
          "pose": "product styled in lived-in mid-century context",
          "composition": "medium_shot"
        },
        {
          "scene": "wide pulled-back view establishing the whole balanced mid-century room",
          "pose": "product anchored in full room scene with clean negative space",
          "composition": "full_body"
        },
        {
          "scene": "windowsill or sideboard at golden hour, warm sun raking across brass and walnut surfaces",
          "pose": "product bathed in low golden light, warm patina on nearby metal and wood",
          "composition": "medium_shot"
        },
        {
          "scene": "sunlit shelf with period ceramics and warm amber bokeh behind",
          "pose": "product as part of warm mid-century vignette, shallow depth of field",
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
    "vertical": "home",
    "category": "Scene",
    "name": "Bohemian Warmth Alcove",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 104,
    "rationale": "Sellers of boho textiles, artisan goods, and global décor who need an editorial room scene showcasing layered textures and earth-toned craftsmanship. Merges the sensory richness of globally-inspired living with warm golden light to capture the 30% home-décor market seeking curated textiles and handmade goods.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:warm_golden_side_to_diffuse_afternoon",
          "color:saturated_earth_sienna_mustard_terracotta",
          "texture:layered_woven_macrame_kilim_rattan",
          "context:bohemian_artisan_alcove_global"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial lifestyle and global-living magazine quality; woven kilim rug, hanging macramé plant hanger, terracotta and mustard ceramics, layered linen textiles in rust/ochre, rattan side table or basket; warm golden afternoon sun filtering through warm-toned sheer curtain with soft shadows and gentle lens flare; globally-sourced ikat or batik throw draped on low seating; product kept exact in shape/material/color as the styled hero, identical across all six shots; soft realistic contact shadows on the floor; range from bright golden-hour directional light to cozy interior ambient, rich saturated earth-tone palette throughout, artisan craftsmanship and global textile story as the narrative anchor",
        "extra_negative": "dull or washed-out colors, flat lifeless textiles, plastic sheen on ceramics, missing weave detail in kilim or macramé, cold grey cast, harsh white flash, warped or duplicated product, floating furniture, melted edges, plastic CGI look, oversaturated neon colors, inventory-style flat styling, missing global narrative, clashing patterns with no cohesion"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Bohemian alcove corner with hanging macramé plant hanger above, kilim rug on the floor, warm golden hour light streaming through sheer curtain from camera-left",
          "pose": "product front view, centered as the artisan hero among draped global textiles",
          "composition": "full_body"
        },
        {
          "scene": "same alcove, soft afternoon diffuse light, rattan side table with stacked ceramics in terracotta and mustard nearby for context",
          "pose": "product 3/4 angle showing depth, styled among layered woven goods",
          "composition": "medium_shot"
        },
        {
          "scene": "cozy low seating nook with ikat or batik throw blanket, warm floor lamp creating ambient glow",
          "pose": "product nestled into lived-in textile composition with ceramics and candles",
          "composition": "medium_shot"
        },
        {
          "scene": "wide pulled-back establishing shot of the full bohemian corner — macramé, kilim rug, baskets, global textiles in warm golden light",
          "pose": "product anchored as focal point in the richly-layered room, surrounded by global artisan goods",
          "composition": "full_body"
        },
        {
          "scene": "windowsill or shelf at golden hour with backlit rattan and terracotta, warm lens flare and bokeh from afternoon sun",
          "pose": "product front view bathed in directional golden light, surrounded by woven baskets and earth-tone ceramics",
          "composition": "medium_shot"
        },
        {
          "scene": "intimate detail of the textile nest — macramé, draped kilim edge, layered linen, warm amber bokeh background",
          "pose": "product as part of the sensory close-up, touching or nestled among the woven narrative",
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
    "vertical": "home",
    "category": "Scene",
    "name": "Bedroom Sanctuary Styled",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 105,
    "rationale": "Bedding, pillow, and sleep-lighting sellers who need a serene bedroom scene with golden-hour morning light and sleep-ritual mood — without needing a bedroom set. Captures aspirational rest and comfort within a styled intimate space, covering morning wake-up light, layered bedding details, and nightstand vignettes.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:morning_golden_hour_soft_diffuse_to_dusk_warmth",
          "color:warm_ivory_taupe_linen_ochre",
          "texture:soft_linen_cotton_down_natural_fibers",
          "context:serene_bedroom_sanctuary_sleep_ritual"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial lifestyle bedroom magazine quality; soft white linen walls and warm wood bed frame, sheer linen curtains filtering golden morning or dusk light with gentle lens flare and dust motes; layered bedding with visible texture weave, plump pillows, a folded throw blanket, small ceramic vessel or reading lamp on nightstand for scale; product kept exact in shape/material/color as the bedroom hero, identical across all six shots; soft realistic contact shadows on the bed surface and floor; range from serene cool-toned morning wake-up light to warm amber dusk comfort mood, bed linens arranged for inviting lived-in comfort",
        "extra_negative": "warped or duplicated product, distorted bedding proportions, cluttered nightstand, harsh overhead flash, blown highlights crushing linen texture, fake reflections, melted pillow edges, plastic CGI sheen, oversaturated colors, cold cold-cast replacing warmth, tangled or matted fabric, pillow shapes that defy gravity"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "minimalist bedroom corner with soft morning light diffusing through sheer linen curtains, warm wood bed frame, white linen walls",
          "pose": "product front view centered on the bed as bedroom hero, layered with other pillows",
          "composition": "full_body"
        },
        {
          "scene": "same bedroom, soft window light from camera-left, nightstand with ceramic vessel and reading lamp nearby for scale",
          "pose": "product 3/4 angle nestled into folded throw blanket, showing texture and depth",
          "composition": "medium_shot"
        },
        {
          "scene": "cozy bedside composition at golden hour dusk, warm amber light raking across pillow and linen",
          "pose": "product hero with folded linen and small candle or lamp, intimate sleep ritual mood",
          "composition": "medium_shot"
        },
        {
          "scene": "wide pulled-back bedroom establishing the whole serene room with bed, curtains, and soft morning light",
          "pose": "product anchored in the center of the bed arrangement, negative space of calm bedroom around it",
          "composition": "full_body"
        },
        {
          "scene": "windowsill corner at golden dusk hour, long warm shadows and soft lens flare catching the linen texture",
          "pose": "product front view bathed in low afternoon-to-evening sun, linen weave backlit",
          "composition": "medium_shot"
        },
        {
          "scene": "intimate bedside macro composition with soft warm lamp light, pillow edge with visible stitch detail and soft down fill",
          "pose": "product hero detail with layered linen and shadow play, shallow depth of field, warm glow pooling",
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
    "vertical": "home",
    "category": "Scene",
    "name": "Kitchen & Dining Styled",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 106,
    "rationale": "Tableware, dining furniture, and meal-lighting sellers who need aspirational scenes showing products styled for morning coffee through evening dinner — capturing the full arc of dining moments. Complements Room & Warmth Styled by zooming into the table; demonstrates tableware, dining chairs, and ambient lighting in lived-in meal contexts across warm daylight and golden-hour service scenes.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:warm_morning_to_golden_hour_dinner",
          "color:warm_cream_terracotta_earth_tones",
          "texture:linen_ceramic_glazed_wood_organic",
          "context:styled_dining_table_meal_moments"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial tableware and lifestyle magazine quality; warm natural window light raking across a linen tablecloth, ceramic plates and glassware catching light, matte wood dining table with visible grain, soft afternoon sun creating long shadows and lens flare through diffused curtains; fresh bread, water pitcher, folded napkins, and a small potted herb as natural scene-setters; product kept exact in shape/material/color as the styled hero across all six shots — tableware maintains glaze finish, dining chairs keep their exact wood tone and upholstery, mood lighting holds consistent glow; soft realistic contact shadows pooling under dishes and furniture legs; progression from bright morning daylight (coffee setting) through warm golden hour (dinner service) with consistent table geometry",
        "extra_negative": "unlit or dead-black dining scene lacking warm glow, harsh cold fluorescent or blue cast, glassware with unrealistic CGI reflections or false highlights, warped or duplicated tableware, cluttered busy tablescape with mismatched dishware styles, blown-out window glare washing out product detail, plastic-looking ceramics, floating dishware or furniture, melted edges, oversaturated food styling props, chairs with distorted proportions or floating legs, flickering or inconsistent lighting between shots"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright morning dining room, soft diffuse window light from camera-left, simple place setting with coffee cup and pastry, white linen tablecloth",
          "pose": "tableware hero centered front view, coffee cup and plate as main focus",
          "composition": "medium_shot"
        },
        {
          "scene": "same table, side angle showing place setting depth and chair profile in soft morning light",
          "pose": "dining chair 3/4 view with place setting visible, showing seat height and wood tone",
          "composition": "full_body"
        },
        {
          "scene": "intimate close crop on place setting details, ceramic plate glaze and folded napkin catching soft directional light",
          "pose": "extreme close-up of tableware surface texture and ceramic detail",
          "composition": "closeup"
        },
        {
          "scene": "wide pulled-back establishing shot of the full styled dining table set for two, morning light streaming through curtains",
          "pose": "table as anchor with chairs visible on both sides, product ecosystem in context",
          "composition": "full_body"
        },
        {
          "scene": "golden hour light slanting across the table at late afternoon, warm amber tones on wood and linens, dinner place setting with glassware",
          "pose": "tableware and glasses catching warm sunset light, 3/4 view of the table setting",
          "composition": "medium_shot"
        },
        {
          "scene": "intimate golden-hour close-up, backlit glassware and plate edges glowing warm, subtle bokeh of outdoor garden light, candlelight suggestion",
          "pose": "glassware and ceramic catching low sun, luminous edges, product as warm light-catcher",
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
    "vertical": "home",
    "category": "Scene",
    "name": "Study Nook Focus",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 107,
    "rationale": "Work-from-home furniture and desk decor sellers who need both morning productivity focus shots and warm evening ambient WFH scenes — without needing a real office. Merges the functional workspace establishing shot with atmospheric reading/focus moments into one deeper 6-shot set covering natural daylight, task lighting, and full desk-setup angles.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:soft_morning_diffuse_to_warm_task_lamp",
          "color:warm_neutral_greige_cream",
          "texture:matte_wood_paper_ceramics",
          "context:productive_home_office_nook"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial workspace and lifestyle magazine quality; pale greige or soft cream walls, natural oak desk, soft linen desk chair, vintage task lamp with warm amber glass, stacked hardcover books and art books for scale and reference; soft morning diffuse light from left-side window with gentle lens flare and dust motes; workspace hero product kept exact in shape/material/color as the styled focal point, identical across all six shots; soft realistic contact shadows on desk surface and floor; range from crisp morning concentration light to cozy golden-hour evening workspace ambiance; desk accessories (ceramic pencil holder, wooden ruler, woven basket, potted plant) curated to match warm neutral palette",
        "extra_negative": "warped or duplicated product, distorted proportions, cluttered messy desk, harsh overhead flash, blown highlights on paper/wood, fake reflections, floating stationery, melted edges, plastic CGI look, oversaturated colors, cold blue cast, unlit dead-black corner, dull monitor glow, workspace too dim for work"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "minimalist home office corner with pale greige wall and natural oak desk, soft morning diffuse light through left-side window",
          "pose": "product front view, centered as desk hero on the work surface",
          "composition": "full_body"
        },
        {
          "scene": "same desk, soft window light raking from the left, open journal and ceramic pen holder nearby for scale",
          "pose": "product 3/4 angle showing depth and side profile on work surface",
          "composition": "medium_shot"
        },
        {
          "scene": "cozy evening workspace with warm amber task lamp creating focused pool of light on desk",
          "pose": "product styled in lived-in desk context with scattered books and stationery",
          "composition": "medium_shot"
        },
        {
          "scene": "wide pulled-back establishing shot of the whole calm home office with desk, chair, shelves, and window",
          "pose": "product anchored on the desk within full workspace scene, generous negative space around it",
          "composition": "full_body"
        },
        {
          "scene": "golden-hour late-afternoon sunlight streaming across the desk, long warm shadows and soft lens flare on the work surface",
          "pose": "product front view bathed in low angled window light, creating dramatic shadow play on desk",
          "composition": "medium_shot"
        },
        {
          "scene": "warm side-lit detail of desk corner with backlit plants and warm amber task lamp glow, shallow depth of field",
          "pose": "product as part of warm focused vignette, late-day light catching the materials and creating ambient texture",
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
    "vertical": "home",
    "category": "Scene",
    "name": "Dappled Shadows Studio",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 108,
    "rationale": "Home sellers and plant-forward brands seeking a distinctive light-as-texture aesthetic — afternoon dappled shadows cast by foliage create natural geometric patterns that become the visual hero, with the product anchored in this living, ever-shifting light geometry. Fills the shadow-patterning gap in home photography.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:dappled_afternoon_2to4pm_tree_shadow_geometry",
          "color:warm_terracotta_cream_cast_against_cool_shadow_geometry",
          "texture:matte_linen_ceramic_woven_with_shadow_texture_overlay",
          "context:plant_forward_living_room_with_natural_light_play"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial botanical lifestyle magazine quality; afternoon window light (2-4 PM) filtered through tree leaves and potted plants creating distinctive dappled shadow patterns across walls, floor and surfaces; shadow geometry rendered as compositional hero — intricate leaf-shadow lattice and moving light patches; warm terracotta or cream matte surfaces (plaster walls, ceramic vessels, woven textiles) contrasting cool blue-grey shadows; product kept exact in shape/material/color as the calm anchor within the dynamic shadow field, identical across all six shots; soft realistic contact shadows grounding product to the dappled floor; plants and trailing vines strategically placed to cast secondary shadow patterns; range from wide establishing shot capturing full shadow choreography to intimate close-ups of shadow texture dancing across product surface; aspirational plant-filled room with natural light design sensibility",
        "extra_negative": "flat harsh midday light without dapple, shadow patterns too thin or disappear entirely, burnt-out highlights destroying shadow geometry, muddy or indistinct shadow shapes, artificial or computer-generated shadow patterns, product overwhelmed or lost in shadow clutter, shadows too dark crushing detail, unnatural shadow colors (green or pink casts), product warped or duplicated, cluttered busy room, plastic CGI look, oversaturated colors, inconsistent shadow direction between shots, wilting or dead plants"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright living room wall with floor-to-ceiling window, tree foliage just outside, creating intricate dappled leaf shadows across the cream or terracotta wall and warm wood floor at 2-3 PM",
          "pose": "product front view centered on the floor within the shadow pattern field, casting its own soft shadow",
          "composition": "full_body"
        },
        {
          "scene": "same room, pulled back wide angle showing the entire choreography — full wall of moving shadow patterns, potted plants near window, the room geography establishing context",
          "pose": "product placed mid-room as calm anchor, dapples playing across its surface and surroundings",
          "composition": "full_body"
        },
        {
          "scene": "product on a warm wooden shelf or side table, shadow patterns raking across the shelf surface and product side profile, direct afternoon light edge-lighting foliage silhouettes",
          "pose": "product 3/4 angle, product edge crisp, shadow geometry dramatic on the shelf plane",
          "composition": "medium_shot"
        },
        {
          "scene": "close-up on product surface with refined dapple pattern cast directly across its top or front — shadow texture becomes tactile, leaf shapes just visible but soft, warm light pool adjacent",
          "pose": "product hero shot showing surface detail with shadow pattern as texture overlay, product material clearly visible beneath the light play",
          "composition": "closeup"
        },
        {
          "scene": "trailing plant or hanging vines positioned to cast secondary delicate shadow lattice across the wall behind product, product positioned lower in frame, airy generous negative space",
          "pose": "product 3/4 seated at table with layered linen and ceramic vessels nearby, shadow-lattice backdrop",
          "composition": "medium_shot"
        },
        {
          "scene": "detailed macro view of shadow edge meeting product corner — crystalline precision of leaf-shadow outline against matte product surface, warm-toned cloth nearby, minimal context",
          "pose": "extreme close-up of the shadow-product boundary, revealing the delicate geometry intersection",
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
    "vertical": "home",
    "category": "Scene",
    "name": "Industrial Warmth Loft",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 109,
    "rationale": "Urban loft and warehouse buyers seeking to place products in an aspirational converted-industrial space where hard architectural bones are softened by golden warm light—single 6-shot set that covers morning diffuse through golden hour reveals with dramatic steel, exposed brick, and polished concrete.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:morning_diffuse_to_golden_hour_raking_steel",
          "color:warm_amber_terracotta_concrete_cream",
          "texture:raw_brick_polished_concrete_steel_patina",
          "context:converted_loft_warehouse_industrial_warmth"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial real-estate and lifestyle magazine quality; exposed terracotta and cream brick walls with natural mortar variation, polished concrete floor catching warm light, raw steel beam shadows and structural details, Edison filament bulb on wire pendant or mounted on steel bracket, industrial wire shelving with soft styling; product as the hero anchor in the loft grid, golden afternoon sun raking through large factory windows creating dramatic long shadows and light pools across the concrete; warm amber and honey-colored light pools contrast the cool grey concrete and steel bones; authentic industrial patina and worn textures; product kept exact in shape/material/color as hero throughout all six shots—identical geometry, material fidelity, and color lock across entire set; soft realistic contact shadows on the concrete floor; range from calm morning diffuse establishing the raw industrial bones to cozy golden-hour warmth dramatizing the loft's conversion promise",
        "extra_negative": "warped or duplicated product, distorted proportions, sterile or over-polished loft losing industrial character, fake distressing or invented patina, harsh fluorescent cold light, blown highlights crushing texture on brick/steel, plastic CGI look, melted edges, cluttered busy space, floating furniture, oversaturated golden cast, mismatched period elements, modern office aesthetic instead of converted warehouse"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "raw exposed brick wall corner (warm cream and terracotta), polished concrete floor, morning diffuse light through large factory-style windows, industrial steel structural beam visible in shadow",
          "pose": "product front view centered on floor, establishing the loft's minimalist raw aesthetic",
          "composition": "full_body"
        },
        {
          "scene": "same loft space, side angle showing the brick texture and steel beam edge, soft directional morning light from camera-left window",
          "pose": "product 3/4 view showing depth and side profile against the brick",
          "composition": "medium_shot"
        },
        {
          "scene": "steel wire shelving unit with Edison bulb suspended above, warm afternoon light beginning to rake across the concrete and shelf edges",
          "pose": "product styled on the industrial shelf with minimal objects—a small pot, rolled fabric for scale",
          "composition": "medium_shot"
        },
        {
          "scene": "wide pulled-back establishing shot of the whole loft corner—high concrete ceiling, exposed brick back wall, polished floor, large warehouse window frame in distance",
          "pose": "product anchored in the center of the industrial grid, negative space of raw concrete around it",
          "composition": "full_body"
        },
        {
          "scene": "detail view of brick wall edge and floor junction at golden hour, dramatic warm raking light creating sharp shadow lines across textured surfaces",
          "pose": "product front view bathed in warm amber light, with brick texture and steel shadow frame beside it",
          "composition": "medium_shot"
        },
        {
          "scene": "closeup on polished concrete floor with product hero, golden light creating warm pool and dramatic contact shadow, concrete texture and light-catch detail visible",
          "pose": "product as part of the golden-hour detail vignette, shallow depth of field on the warm concrete surface",
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
    "vertical": "home",
    "category": "Scene",
    "name": "Seasonal Palette Studio",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 110,
    "rationale": "Home product sellers who need proof their single SKU works across all four seasons with seasonal color restyles — no product change, only the supporting palette shifts. Demonstrates versatile decor identity and year-round styling appeal without requiring variant assets.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:soft_diffuse_to_golden_with_seasonal_mood",
          "color:four_season_palette_spring_summer_autumn_winter",
          "texture:matte_plaster_linen_oak_with_seasonal_textiles",
          "context:styled_apartment_room_4season_versatility"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial real-estate and lifestyle magazine quality; same minimalist apartment room across all six shots — identical wall finish, oak floor, sheer curtain — but the supporting palette, throw textiles, and accent props shift seasonally; SPRING SHOTS (1-2): soft pastels, blush linen throw, eucalyptus branches, pale ceramic vessels, cool diffuse morning light; SUMMER SHOTS (3-4): warm neutrals and crisp whites, lightweight cotton textiles, bright daylight, airy zero-clutter aesthetic; AUTUMN SHOTS (5-6): warm terracotta, mustard linen, harvest-toned ceramics, golden afternoon light with long raking shadows; product kept exact in shape/material/color as the styled hero throughout all shots — identical product geometry and finish across all four seasonal renderings, never morphing or drifting; soft realistic contact shadows on the floor; seamless seasonal mood transitions",
        "extra_negative": "warped or duplicated product, inconsistent product silhouette across seasons, distorted proportions, cluttered busy room, harsh flash, blown highlights, fake reflections, floating furniture, melted edges, plastic CGI look, invented seasonal colors not matching the target palette, color shift in the product itself between shots, oversaturated overstyled aesthetic"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "spring palette — minimalist living room corner with limewash wall and oak floor, soft cool morning diffuse light through sheer curtain, blush linen throw draped over product side, pale eucalyptus branches in ceramic vase nearby",
          "pose": "product front view, centered as spring room hero, gentle cream and pale pink textiles surrounding",
          "composition": "full_body"
        },
        {
          "scene": "spring palette — same room, soft window light from camera-left, pale ceramic vessels and blush-toned art books nearby for scale, light natural textures",
          "pose": "product 3/4 angle showing depth and side profile in spring styling context",
          "composition": "medium_shot"
        },
        {
          "scene": "summer palette — bright clean daylight in the same room corner, lightweight white cotton throw, minimalist clear glass vessels, airy zero-clutter styling, crisp warm light",
          "pose": "product styled in bright summery context with light textiles and minimal props",
          "composition": "medium_shot"
        },
        {
          "scene": "summer palette — wide pulled-back interior establishing the whole bright airy room, clean white walls, oak floor in morning sun",
          "pose": "product anchored in full room scene with abundant natural light and negative space",
          "composition": "full_body"
        },
        {
          "scene": "autumn palette — same corner with golden afternoon light, mustard and terracotta linen throw, harvest-toned ceramic vessels, dried botanical branches, warm raking light creating long shadows",
          "pose": "product front view bathed in warm autumn light, earth-toned textiles surrounding it",
          "composition": "medium_shot"
        },
        {
          "scene": "autumn palette — sunlit shelf with golden-hour backlit warm bokeh, burnt orange throw folded nearby, warm amber light, product positioned as part of warm autumn vignette with shallow depth of field",
          "pose": "product as part of cozy autumn scene, sun from behind creating warm halo",
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
    "vertical": "home",
    "category": "Scene",
    "name": "Entryway Welcome Styled",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 111,
    "rationale": "Entry furniture and decor sellers who need a first-impression scene combining functional hallway styling with warm editorial lighting — shoe cabinets, mirrors, consoles, and welcome lighting positioned as the hero in an editorial entryway vignette, matching Room & Warmth's 35mm warm aesthetic but in the arrival context.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:soft_entry_diffuse_to_afternoon_glow",
          "color:warm_neutral_greige_amber",
          "texture:matte_plaster_mirror_brass",
          "context:aspirational_apartment_entryway"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial interior design magazine quality; limewash walls, white oak or light wood floor, round mirror or console as the hero piece anchoring the arrival zone; soft morning diffuse light from a window or skylight warming the entry, afternoon amber glow from a recessed sconce or pendant fixture casting subtle shadows; a pair of ceramic vessels, a narrow shoe rack or brass hooks for daily layers, fresh branch in a glass vase for life; product kept exact in shape/material/finish as the styled centerpiece, identical across all six shots; soft realistic contact shadow on the floor and wall; range from calm morning entry light to welcoming golden-hour glow perfect for opening the door",
        "extra_negative": "warped or duplicated product, distorted proportions, cluttered hallway with excessive shoes or coats, harsh flash washing out the entry, blown highlights, fake reflections on mirror, floating furniture not grounded to floor, melted edges, plastic CGI look, oversaturated colors, cold institutional lobby feel, people or hands in frame"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "minimalist entryway with limewash wall, light oak floor, white round mirror centered above a slender console",
          "pose": "product front view, positioned as the hero of the arrival zone",
          "composition": "full_body"
        },
        {
          "scene": "same entryway, soft morning window light from camera-left, casting warm shadows across the wall",
          "pose": "product 3/4 angle showing mirror depth and console profile",
          "composition": "medium_shot"
        },
        {
          "scene": "detail close-up of the mirror frame or console surface with ceramic vessels, fresh botanical, and soft raking light",
          "pose": "product surface detail with warm tactile styling props nearby",
          "composition": "closeup"
        },
        {
          "scene": "wide pulled-back view of the full entry wall establishing the calm minimalist arrival space",
          "pose": "product anchored as the centerpiece of the entry, negative space around it",
          "composition": "full_body"
        },
        {
          "scene": "entryway at golden hour, afternoon sun streaming in from a high window or pendant sconce glowing warm amber",
          "pose": "product front view bathed in warm directional light, casting a long shadow on the floor",
          "composition": "medium_shot"
        },
        {
          "scene": "corner detail with brass hook, glass vase with dried stems, and warm backlit amber bokeh from sconce or sunset through window",
          "pose": "product as part of a warm welcome vignette, subtle light halo, shallow depth of field",
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
    "vertical": "home",
    "category": "Scene",
    "name": "Holiday Warmth Styled",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 112,
    "rationale": "Seasonal home decor and entertaining sellers who need aspirational holiday entertaining vignettes with candles, garland, and gold accents styled in the same editorial room context — capturing the Q4 gifting and entertaining surge in one 6-shot set identical in structure and lighting to Room & Warmth Styled, but themed for November through December high-intent seasonal buyers.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:soft_window_diffuse_to_golden_hour_holiday",
          "color:warm_rich_gold_berry_cream",
          "texture:matte_plaster_linen_ceramic_velvet",
          "context:aspirational_festive_entertaining_room"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial real-estate and lifestyle magazine quality, same limewash walls and oak floor as Room & Warmth base; warm afternoon sun raking through window with long golden shadows, dust motes catching light; holiday props arranged with editorial restraint — cream pillar candles in glass holders, fresh garland with eucalyptus and dried citrus, gold-leaf ceramic vases and serving pieces, deep-red velvet ribbon accents, a styled coffee table with a festive but understated tablescape; product kept exact in shape/material/color as the styled hero, identical across all six shots; soft realistic contact shadows on floor and surfaces; range from calm minimalist morning light with early holiday styling through cozy golden-hour entertaining warmth; product is always the focal point anchor within the holiday scene, never overwhelmed by props",
        "extra_negative": "garish or oversaturated holiday colors, plastic fake garland, mass-market tacky decorations, product warped or duplicated, distorted proportions, cluttered chaotic tablescape, harsh flash, blown highlights crushing the gold-leaf detail, fake reflections, floating furniture, melted edges, plastic CGI look, cold blue cast, props completely obscuring the product hero, mismatched ceramic finishes, sad drooping garland"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "minimalist living room corner with limewash wall and oak floor, soft morning diffuse light through sheer curtain, early holiday styling — single cream candle and fresh green garland beginning to frame the space",
          "pose": "product front view, centered as room hero, candle or serving piece anchoring the scene",
          "composition": "full_body"
        },
        {
          "scene": "same room, soft window light from camera-left, product 3/4 angle showing depth, styled with gold-leaf ceramic nearby and a folded velvet ribbon for scale and color accent",
          "pose": "product 3/4 angle showing side profile and dimension",
          "composition": "medium_shot"
        },
        {
          "scene": "cozy entertaining nook at dusk, warm floor lamp, product as centerpiece of a styled holiday tablescape — gold candles, small ceramic vases, fresh garland, deep-red ribbon",
          "pose": "product styled in lived-in entertaining context, surrounded by holiday props in editorial arrangement",
          "composition": "medium_shot"
        },
        {
          "scene": "wide pulled-back interior establishing the whole calm room decorated for holiday entertaining, soft diffuse light",
          "pose": "product anchored in full room scene with negative space, holiday styling visible but not dominating the frame",
          "composition": "full_body"
        },
        {
          "scene": "windowsill at golden hour, long warm golden shadows, soft lens flare, product front view bathed in low afternoon sun, flanked by cream candles and fresh evergreen",
          "pose": "product front view as the golden-hour focal point, natural light making the product and candles glow",
          "composition": "medium_shot"
        },
        {
          "scene": "sunlit side table or console with backlit gold-leaf ceramics, product nestled within a festive but refined vignette, warm amber bokeh, product as part of the warm holiday glow",
          "pose": "product as part of warm glow vignette, sun behind catching the ceramic glaze and fabric texture",
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
    "vertical": "home",
    "category": "Scene",
    "name": "Morning Light Study",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 113,
    "rationale": "Home office and WFH furniture sellers who need both a calm working morning environment and lifestyle proof that desk, chair, task lighting, and accessories create real productivity and beauty. Separate from aspirational living rooms — this is functional workspace styling without sacrifice of editorial quality.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "new_template",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:cool_neutral_morning_diffuse_natural_only",
          "color:greige_off_white_warm_wood_neutral",
          "texture:matte_timber_fabric_paper_ceramic",
          "context:home_office_work_environment"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial workspace and home lifestyle magazine quality; clean minimalist home office with soft morning diffuse light through gauze curtain or privacy screen, cool-neutral natural window light ONLY (no golden hour, no evening glow, no warm sunset), pale greige or off-white walls, warm natural timber desk, task chair in neutral fabric, desk lamp on but daylight-dominant, stack of open books showing reading/work activity, ceramic mug, stationery (pen cup, notepad, ruler) artfully arranged as functional props, single potted plant for scale and calm, soft vertical shadow patterns from window mullions crossing the desk surface, product (desk/chair/lamp/accessory) kept exact in shape/material/color as the hero throughout all six shots, identical across all frames, soft realistic contact shadows on the desk and floor, range from wide establishing room shot down to intimate close-up of workspace detail, consistent cool-neutral editorial morning aesthetic throughout",
        "extra_negative": "golden hour glow or sunset warmth, harsh direct sunlight creating hot spots, unlit or dark spaces, cluttered messy desk, artificial overhead flash, blown highlights washing out the workspace, fake CGI plastic look, oversaturated colors, blue cast, flicker, warped or duplicated product, floating furniture, melted edges, distorted proportions, people hands faces silhouettes, window reflections blown out"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "wide home office corner with soft morning diffuse light through large window with gauze curtain, pale greige walls, warm timber desk with neutral fabric task chair",
          "pose": "full workspace establishing shot, product (desk or chair) centered as the hero, morning light illuminating the whole corner",
          "composition": "full_body"
        },
        {
          "scene": "same office, medium pull-in from the window side, cool morning light raking across the desk surface",
          "pose": "product 3/4 angle showing workspace depth and user positioning, light revealing material and form",
          "composition": "medium_shot"
        },
        {
          "scene": "desktop closeup showing arranged workspace: open book, ceramic mug, pen cup with stationery, product (lamp or accessory) lit by diffuse morning window light",
          "pose": "product as part of the functional styled desk scene, slightly off-center with rule-of-thirds prop balance",
          "composition": "medium_shot"
        },
        {
          "scene": "window-side detail shot at the workspace edge, vertical shadow line from window frame crossing over the product and desk surface",
          "pose": "product catching the cool morning side light with sharp shadow definition",
          "composition": "closeup"
        },
        {
          "scene": "wide rear view pulling back to show the full home office from across the room, complete view of desk setup with chair positioned at the workspace",
          "pose": "product visible in the full room context with generous negative space, morning light from the left",
          "composition": "full_body"
        },
        {
          "scene": "intimate overhead detail of the desk surface near the product, showing texture of timber, paper, and materials, cool diffuse light creating soft surface definition",
          "pose": "product detail from above with focus on material quality and workspace arrangement",
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
    "vertical": "home",
    "category": "Scene",
    "name": "Blue Hour Serenity",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 114,
    "rationale": "Evening and nighttime-focused home sellers who need aspirational blue-hour twilight scenes with the product as a cozy hero, complementing daytime Room & Warmth by showing the same room reimagined at dusk with 2-tone cool-periwinkle and warm-glow drama.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:blue_hour_twilight_meets_warm_lamp_glow",
          "color:cool_periwinkle_dusk_and_warm_amber_accent",
          "texture:soft_velvet_linen_glass_candlelight",
          "context:intimate_evening_room_candlelit_cozy"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial lifestyle magazine twilight hour; blue-hour dusk 6-7PM exterior light filtering through gauze curtains casting cool periwinkle tone across the room, warm table lamps and candles glowing amber in the foreground creating 2-tone dramatic contrast; product as the cozy hero catching both cool dusk light and warm intimate glow; room soft-lit with string lights or amber pendant lamps, cast shadows from candlelight dancing gently; product kept exact in shape/material/color as the styled hero, identical across all six shots; soft realistic contact shadows on surfaces; mood accessories (lit candles, warm ceramic vessels, folded throws) arranged naturally around the product; range from cool-lit wide establishing shot of twilight room to warm intimate close-up of candlelit detail",
        "extra_negative": "harsh overhead fluorescent light, blown highlights erasing candleglow, unlit candles in a candlelit scene, flat single-tone lighting, warped or duplicated product, distorted proportions, cluttered busy arrangement, fake plastic reflections, melted edges, CGI artificial look, oversaturated colors, dead or unlit props when product is about lighting or mood"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "wide room establishing at blue hour dusk, windows showing twilight periwinkle sky, interior lit only by warm table lamps and unlit candles scattered on surfaces",
          "pose": "product front view centered on low table or shelf, catching both cool dusk window light and warm lamp glow nearby",
          "composition": "full_body"
        },
        {
          "scene": "cozy reading corner at dusk, product framed by lit table lamp with warm amber glow, cool periwinkle light from window behind",
          "pose": "product 3/4 angle with lamp placed nearby, warm light spilling across surface",
          "composition": "medium_shot"
        },
        {
          "scene": "intimate close-up on product surrounded by lit candles and folded linen throw, candlelight casting warm dancing shadows",
          "pose": "product styled in a cozy vignette with mood accessories, shallow depth of field",
          "composition": "closeup"
        },
        {
          "scene": "nightfall view of the full room now dimmed except for warm glowing lamps and candles, cool periwinkle twilight fading outside the window",
          "pose": "product as part of a fully-lit intimate room scene, anchored in negative space",
          "composition": "full_body"
        },
        {
          "scene": "candlelit detail: product nestled among lit candles, warm amber glow dominant, cool dusk window light rim-lighting the scene",
          "pose": "product as the focal anchor of a warm-lit arrangement, candles flickering nearby",
          "composition": "medium_shot"
        },
        {
          "scene": "mood detail on product catching candlelight: soft warm glow on surface, deep shadows, intimate evening atmosphere, periwinkle-tinted ambient dusk light in background",
          "pose": "product surface detail illuminated by candlelight, romantic intimate mood",
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
    "vertical": "home",
    "category": "Scene",
    "name": "Rainy Window Styled",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 115,
    "rationale": "Creators of tea sets, candles, and cozy companion products who need both an introspective grey-day mood and a styled vignette showing the product as part of a rainy-weather ritual. Captures the slow, high-intent buyer in moments of calm contemplation — window light diffused by rain, cool palette, companion objects (tea, books, blankets) that position the product as the emotional anchor.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:soft_diffuse_rainy_overcast_window",
          "color:cool_grey_muted_white_charcoal",
          "texture:matte_ceramic_linen_wet_glass",
          "context:introspective_rainy_window_nook"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial lifestyle magazine quality; rain-streaked and fogged window panes, overcast grey daylight diffused through cloudy skies; ultra-soft shadowless ambient light with cool white balance, no harsh direction, moody grey interior; one ceramic mug or companion object, stacked art books, a linen throw blanket for tactile scale; product kept exact in shape/material/color as the styled hero, identical across all six shots; soft realistic contact shadows on the interior surface; range from contemplative window-gazing establishing shots to intimate vignette styling with tea, candles, and blankets; no direct sun — all light filtered through rain and clouds, cool introspective mood",
        "extra_negative": "sunny bright light, blown-out windows, clear skies, warm golden tones, cluttered busy scene, harsh shadows, warped or duplicated product, distorted proportions, fake reflections on glass, plastic CGI look, oversaturated colors, warm amber cast, melted edges"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "tall rain-streaked window with fogged glass, overcast grey sky visible outside, soft cool diffuse interior light",
          "pose": "product front view, centered as window-nook hero, cool north-light setting",
          "composition": "full_body"
        },
        {
          "scene": "same window corner, soft cool light from camera-left, linen throw blanket and ceramic companion object nearby for warmth contrast",
          "pose": "product 3/4 angle showing depth, positioned within intimate nook",
          "composition": "medium_shot"
        },
        {
          "scene": "rainy windowsill styled scene with product, stacked art books, a lit candle, and the corner of a blanket draped over nearby chair",
          "pose": "product as anchor in lived-in rainy-day vignette, surrounded by companion ritual objects",
          "composition": "medium_shot"
        },
        {
          "scene": "wide pulled-back view of the full grey rainy-day interior, cool diffuse light from the window filling the space",
          "pose": "product anchored in the full quiet nook, negative space of grey walls and furniture around it",
          "composition": "full_body"
        },
        {
          "scene": "windowsill at rain-time, window glass streaked with water droplets, muted grey afternoon light",
          "pose": "product front view positioned on the sill, rain and grey sky framed just outside the glass",
          "composition": "medium_shot"
        },
        {
          "scene": "intimate close study of the rain-covered window glass with subtle interior reflections, cool overcast daylight",
          "pose": "product in soft focus warmth just inside the glass, contrast between cold rain-streaked exterior and cozy interior",
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
    "vertical": "home",
    "category": "Scene",
    "name": "Patio Season Styled",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 116,
    "rationale": "Outdoor furniture, patio, and garden product sellers who need a warm lifestyle scene showing their hero in an aspirational outdoor living context — covering spring/summer daylight in a planted terrace setting. Same editorial 35mm warmth as Room & Warmth Styled, but outdoor.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:bright_diffuse_daylight_to_golden_afternoon",
          "color:warm_neutral_sage_terracotta_green",
          "texture:weathered_wood_cushion_planter_stone",
          "context:aspirational_patio_garden_space"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial outdoor lifestyle and garden magazine quality; generous planted patio with potted flora, weathered wood deck, natural stone pavers, linen and linen-look cushions, abundance of morning to afternoon daylight raking across the space with gentle shadows; product kept exact in shape/material/color as the styled hero, identical across all four shots; soft realistic contact shadows on the stone/wood floor; range from bright fresh morning light through warm golden-hour glow; relaxed seasoned outdoor furniture aesthetic; no people or hands in frame",
        "extra_negative": "warped or duplicated product, distorted proportions, cluttered chaotic patio, harsh direct flash, blown highlights, fake reflections, floating furniture, melted edges, plastic CGI look, oversaturated colors, cold blue cast, barren or empty patio, unnatural plant placement, visible people or hands in frame"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "lush planted patio corner with terracotta planters, natural stone pavers, and soft morning diffuse light through tree leaves overhead",
          "pose": "product front view, centered as patio hero among potted greenery",
          "composition": "full_body"
        },
        {
          "scene": "wooden deck seating area with neutral cushions and hanging plants, camera-left golden afternoon light",
          "pose": "product 3/4 angle showing depth and side profile on the deck",
          "composition": "medium_shot"
        },
        {
          "scene": "wide pulled-back view of the entire styled patio garden with multiple seating vignettes and abundant flora",
          "pose": "product anchored in full patio scene with generous negative space around the living area",
          "composition": "full_body"
        },
        {
          "scene": "golden-hour close view on a side table with potted succulents, warm sunlight casting long leaf shadows across the surface",
          "pose": "product as part of warm planted vignette, shallow depth of field, sun-dappled styling",
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
    "vertical": "home",
    "category": "Scene",
    "name": "Styled Shelf Discovery",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 117,
    "rationale": "Small decor and homeware sellers (candlesticks, vases, ceramics, bookends) who need to show their product styled into a curated shelf arrangement. Reveals how-to-style narrative: from full room establishing, to shelf focus, to close detail, then macro of the singular object as the hero — engagement driver for styling inspiration seekers.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:soft_window_diffuse_to_golden_raking_shelf",
          "color:warm_neutral_greige_with_saturated_ceramic_accent",
          "texture:matte_ceramic_linen_wood_grain_on_shelf",
          "context:styled_shelf_curation_editorial_sequence"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial real-estate and lifestyle magazine quality; warm daylight through sheer curtains diffusing soft light, afternoon sun raking across open shelving unit with wood frame and white-painted back; shelf contains stacked hardcover books, potted trailing plant, hand-thrown ceramic vase, brass candlestick, dried botanicals in glass vessel — all in warm neutral and earth-tone palette; product (vase, candlestick, ceramic, or bookend) kept exact in shape/material/color as the styled hero, identical across all six shots — locked geometry, never morphing or shifting; range from calm wide establishing of full room and bookcase, progressive framing to isolate the shelf unit, then tight focus on the product's position within the arrangement, then extreme macro of the product's surface texture and detail; soft realistic contact shadows on each shelf surface; aspirational curated lifestyle, how-to-style narrative arc, premium homeware editorial tone",
        "extra_negative": "warped or duplicated product, distorted proportions, unbalanced shelf arrangement that looks chaotic or cluttered, harsh flash or overblown highlights in close detail, fake reflections, floating objects, melted edges, plastic CGI look, oversaturated colors, dead flat lighting, books with visible unreadable spines, color shift away from real ceramic glaze or material finish, product blending into background, macro shot with blown focus or chromatic aberration"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "minimalist home interior with built-in open wooden bookcase against white-painted wall, soft window daylight from camera-left diffusing through sheer linen curtain",
          "pose": "wide pulled-back establishing shot showing the full room and entire bookcase unit with all shelf styling visible",
          "composition": "full_body"
        },
        {
          "scene": "same room, closer view isolating the bookcase unit with product visible on one of the middle shelves amid books, plant, ceramics",
          "pose": "bookcase front view, product 3/4 visible as one element in the styled arrangement",
          "composition": "full_body"
        },
        {
          "scene": "single shelf detail view, golden afternoon sun raking across the shelf edge creating warm light and shadow rhythm",
          "pose": "product positioned mid-shelf surrounded by coordinating decor — stacked books, vase, candlestick visible together",
          "composition": "medium_shot"
        },
        {
          "scene": "same shelf, light tightens around the product with books and ceramic pieces visible but slightly soft",
          "pose": "product takes visual priority within the shelf grouping, negative space around it increases",
          "composition": "medium_shot"
        },
        {
          "scene": "extreme close-up of the product on the shelf, warm afternoon sun grazing the ceramic or metal surface, soft bokeh of other shelf items behind",
          "pose": "product front view filling most of frame, shallow depth of field isolates the hero object",
          "composition": "closeup"
        },
        {
          "scene": "macro detail of the product's surface — glaze texture, hand-thrown marks, or brass patina — backlit golden light",
          "pose": "extreme magnification showing signature surface detail, weave or material finish",
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
    "vertical": "home",
    "category": "Detail",
    "name": "Textiles Raked Light",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 118,
    "rationale": "Textile and soft-goods sellers who need both macro weave texture proof and authentic lived-in domestic context. Combines extreme raking light detail shots with styled room vignettes showing textiles on furniture and floors in warm natural light.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:raking_grazing_directional_to_warm_ambient",
          "color:linen_cream_warm_stone_soft_earth",
          "texture:visible_weave_fiber_authentic_matte",
          "context:lived_in_domestic_textiles_on_furniture"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4 for establishing shots AND 100mm macro lens at f/5.6 for raking close-ups, editorial lifestyle textile photography; three shots show extreme detail: raking side light grazing the weave surface revealing every fiber of linen/wool/cotton, focus-stacked sharpness, hyper-detailed texture proof; three shots show the same textile in authentic domestic context — draped on cream linen sofa arm, folded throw on upholstered chair, rug layered on oak floor — all in a warm neutral room with limewash walls, soft daylight through sheer curtain, maybe a ceramic vase or wooden beam for scale; product kept exact in shape/material/color as styled hero throughout, identical across all six shots; soft realistic contact shadows; warm afternoon light with dust motes and gentle window glow creating aspirational cozy lived-in mood",
        "extra_negative": "warped or duplicated textile, distorted weave pattern, plastic shiny CGI finish, focus-hunting or soft blur on detail shots, harsh flash, blown highlights crushing texture, color shift away from true linen/wool tone, invented patterns, cluttered competing surfaces, cold blue cast, sterilized studio look, floating unsupported textiles, melted edges"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "close neutral raking setup, dramatic grazing side light from the left",
          "pose": "textile surface extreme macro close-up showing thread/weave structure under raking light",
          "composition": "closeup"
        },
        {
          "scene": "soft graduated grey macro backdrop, grazing top light at 45 degrees",
          "pose": "textile weave detail filling the frame, fiber texture crystalline sharp",
          "composition": "closeup"
        },
        {
          "scene": "warm domestic living room corner, limewash wall and oak floor, soft window light",
          "pose": "textile draped on cream linen sofa arm, raking afternoon light catching the weave",
          "composition": "medium_shot"
        },
        {
          "scene": "cozy upholstered chair with wooden frame, warm neutral room, daylight from camera-left",
          "pose": "folded throw textile on chair arm showing layered depth and fold detail, soft shadows",
          "composition": "medium_shot"
        },
        {
          "scene": "oak wood floor with warm afternoon light, neutral rug anchoring the space",
          "pose": "textile rug corner detail showing weave and fringe, product anchored in floor vignette",
          "composition": "medium_shot"
        },
        {
          "scene": "wide pulled-back domestic room establishing full styled vignette at golden hour",
          "pose": "multiple textiles visible as parts of warm composed interior — sofa, chair, floor — product family hero",
          "composition": "full_body"
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
    "vertical": "home",
    "category": "Scene",
    "name": "Housewarming Move-In Ready",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 119,
    "rationale": "Interior and furniture sellers targeting the high-intent housewarming spike — buyers in active move-in phase. Shows product transforming a bare new-home room from chaotic unpacking to fully styled golden-hour sanctuary, signaling readiness and new-life aspiration in one compact 4-shot narrative arc.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "editable_slot_of_room_warmth",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:soft_window_diffuse_to_golden_hour",
          "color:warm_neutral_greige_amber_against_bare_walls",
          "texture:matte_plaster_moving_boxes_linen_oak",
          "context:new_home_move_in_transformation"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial real-estate and lifestyle magazine quality; progression from empty neutral walls with kraft moving boxes stacked in corner through half-styled staging to full golden-hour warmth; limewash walls emerging, oak floor, sheer linen curtains filtering afternoon sun; warm raking light with long shadows and gentle lens flare, dust motes dancing; one statement plant and art books for scale introduced mid-sequence; product kept exact in shape/material/color as the styled hero transforming the space across all four shots, identical product identity maintained; soft realistic contact shadows on the floor; narrative arc from chaos→placement→comfort→golden-hour sanctuary; celebration of new home readiness",
        "extra_negative": "warped or duplicated product, distorted proportions, walls changing color or material between shots, product drifting position or scale, harsh flash, blown highlights, fake reflections, floating furniture, melted edges, plastic CGI look, oversaturated colors, cold blue cast, boxes disappearing too abruptly, room geometry shifting, inconsistent product styling between shots"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright empty room corner with stacked kraft moving boxes, neutral bare walls, soft window light through bare glass, floor bare or minimal matting",
          "pose": "room establishing shot, no product yet, moving boxes foreground-right, space feels new and bare",
          "composition": "full_body"
        },
        {
          "scene": "same room, moving boxes partially cleared, product placed center-stage in midst of unpacking, soft morning-to-midday diffuse light",
          "pose": "product front view as anchor point appearing in the chaos, half-styled with one art book and plant nearby starting to define the space",
          "composition": "medium_shot"
        },
        {
          "scene": "same corner now with boxes moved to edge or away, warm afternoon light raking through window, styled elements around product — throw, ceramic vase, floor lamp — room taking shape",
          "pose": "product 3/4 angle in evolving context, surrounded by warm-palette styling elements",
          "composition": "medium_shot"
        },
        {
          "scene": "same room at golden hour, fully styled reading nook or corner with rug, warm lamp, plant, linen-draped furniture, amber light spilling across floor with long shadows and gentle lens flare",
          "pose": "product front view bathed in golden afternoon sun as the hero of completed sanctuary",
          "composition": "full_body"
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
    "vertical": "home",
    "category": "Lighting",
    "name": "Twilight Corner Glow",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 120,
    "rationale": "Lighting sellers (lamps, pendants, sconces, candles) who need to prove how their product looks switched ON in a real evening room — the glow, light cones, reflections and warm pools that day-lit catalog shots can never show. A static 6-shot complement to the Day-to-Night reel for premium lighting buyers.",
    "meta": {
      "experimental": true,
      "sibling_of": "Room & Warmth Styled",
      "classification": "new_template",
      "source": "siblings-brainstorm-2026-06-14"
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
          "lighting:product_emissive_warm_twilight_glow",
          "color:deep_blue_twilight_with_warm_amber_pools",
          "texture:soft_glow_halo_reflective_surfaces",
          "context:lit_evening_living_room"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, editorial interior magazine quality; an aspirational evening living room at twilight (7-9 PM) with deep blue dusk light in the windows and the product as a switched-ON light source casting a warm amber glow; visible soft light cones, gentle halo bloom, warm pools of light on walls, floor and nearby surfaces, soft reflections on wood and ceramics; cozy intimate lived-in evening mood with the lit product as the unmistakable hero of the scene; product kept exact in shape/material/color and emitting a realistic warm glow, identical across all six shots; soft realistic contact shadows and believable falloff of light",
        "extra_negative": "unlit or dead-black product, dull lifeless glow, daylight or bright flat lighting contradicting the evening mood, blown-out overexposed bulbs with no detail, harsh flash, warped or duplicated product, distorted proportions, fake plastic glow, banding in the gradient, melted edges, plastic CGI look, cold sterile cast, double light sources that confuse the hero"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "evening living room corner at twilight, deep blue dusk in the window, the product switched on casting a warm amber glow",
          "pose": "product front view as the lit hero, warm light pooling around it",
          "composition": "full_body"
        },
        {
          "scene": "same room, camera-left, visible soft light cone and halo bloom from the product against the dim wall",
          "pose": "product 3/4 angle showing the shape of its emitted light",
          "composition": "medium_shot"
        },
        {
          "scene": "intimate seating nook lit only by the product and faint ambient dusk, warm reflections on a side table",
          "pose": "product styled in cozy lived-in evening context, glow on nearby surfaces",
          "composition": "medium_shot"
        },
        {
          "scene": "wide pulled-back view of the whole dim room with the product as the single warm light anchor",
          "pose": "product small but luminous, warm pool of light defining the space",
          "composition": "full_body"
        },
        {
          "scene": "close view of the product's warm light grazing a textured wall or shelf, deep shadow falloff",
          "pose": "product edge and its light cone in shallow depth of field",
          "composition": "medium_shot"
        },
        {
          "scene": "intimate closeup of the lit product, warm glow detail, soft amber bokeh of other small lights behind",
          "pose": "product surface and glow detail, shallow depth of field",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  }
];
