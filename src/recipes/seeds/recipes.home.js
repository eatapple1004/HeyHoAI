/**
 * Doppia recipe seed — home (product mode), 6 templates.
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list). recipes 테이블에 INSERT.
 * 자동 생성(레시피 프롬프트 워크플로). config.look.extra_positive/negative + shots[].scene/pose/composition 사용.
 */
module.exports = [
  {
    "mode": "product",
    "vertical": "home",
    "category": "Scene",
    "name": "Quiet Luxe Room",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "Interior/furniture sellers who need an aspirational lived-in room scene without renting a set or styling a photoshoot.",
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
          "lighting:soft_window_diffuse",
          "color:warm_neutral_greige",
          "texture:matte_plaster_linen_oak",
          "context:quiet_luxe_apartment"
        ],
        "extra_positive": "shot on 35mm full-frame, 35mm lens at f/4, eye-level interior photography, calm minimalist apartment with limewash walls, oak floor, sheer linen curtains diffusing daylight, one statement plant and a stack of art books for scale, product kept exact in shape/material/color and placed as the styled hero of the room, editorial real-estate magazine quality, soft realistic contact shadows on the floor",
        "negative": "warped or duplicated product, distorted proportions, cluttered busy room, harsh flash, blown highlights, text artifacts, watermark, logos, fake reflections, floating furniture, melted edges, plastic CGI look, oversaturated colors"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "minimalist living room corner with limewash wall and oak floor, sheer curtain daylight",
          "pose": "product front view, centered as room hero",
          "composition": "full_body"
        },
        {
          "scene": "same room, soft window light from camera-left, art books and plant nearby for scale",
          "pose": "product 3/4 angle showing depth and side profile",
          "composition": "medium_shot"
        },
        {
          "scene": "cozy reading nook with neutral textiles and a warm floor lamp",
          "pose": "product styled in lived-in context with a throw and ceramic vase",
          "composition": "medium_shot"
        },
        {
          "scene": "wide pulled-back interior establishing the whole calm room",
          "pose": "product anchored in full room scene, negative space around it",
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
    "category": "Lifestyle",
    "name": "Golden Hour Corner",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "Decor and homeware shops wanting warm, scroll-stopping lifestyle shots that make a product feel like a cozy home moment.",
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
          "lighting:golden_hour_low_sun",
          "color:warm_amber_film",
          "texture:soft_grain_fuji",
          "context:sunlit_home_corner"
        ],
        "extra_positive": "shot on 50mm lens at f/2.0, low afternoon sun raking through a window casting long warm shadows and gentle lens flare, dust motes in the light beam, dreamy aspirational home corner, linen and natural wood surfaces, product kept exact in shape/material/color, shallow depth of field with creamy bokeh, lifestyle interiors film aesthetic, cozy golden mood",
        "negative": "cold blue cast, flat midday lighting, warped or duplicated product, blown-out window, harsh shadows on product face, text artifacts, watermark, logos, plastic CGI look, oversharpened halos, distorted proportions, messy background clutter"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "windowsill home corner at golden hour, long warm shadows and soft flare",
          "pose": "product front view bathed in low sun",
          "composition": "medium_shot"
        },
        {
          "scene": "wooden side table catching raking sunlight, sheer curtain edge",
          "pose": "product 3/4 angle with warm rim light on its edge",
          "composition": "closeup"
        },
        {
          "scene": "cozy floor nook with a knit throw and warm lamp glow at dusk",
          "pose": "product styled in inviting daily-use context",
          "composition": "medium_shot"
        },
        {
          "scene": "sunlit shelf with backlit plants and amber bokeh",
          "pose": "product as part of a warm vignette, sun behind",
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
    "name": "Macro Texture Pop",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 3,
    "rationale": "Sellers of tactile goods (ceramics, knits, woodwork) who need extreme detail shots that prove material quality and craftsmanship.",
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
          "lighting:raking_grazing_light",
          "color:true_to_material",
          "texture:hyper_detail_surface",
          "context:seamless_neutral_macro"
        ],
        "extra_positive": "shot on 100mm macro lens at f/8 with focus stacking, raking side light to reveal weave, grain and glaze texture, ultra-fine surface detail with visible fibers/wood grain/ceramic crackle, true-to-life material color, crisp tactile micro-contrast, clean neutral seamless background, professional product macro photography, accurate stitching and edges",
        "negative": "soft out-of-focus subject, warped or duplicated product, invented patterns not on the real product, plastic CGI sheen, blown highlights crushing texture, text artifacts, watermark, color shift away from real material, oversharpen halos, noise, distorted proportions"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "neutral seamless macro surface, raking light from the left",
          "pose": "product surface detail extreme close-up showing texture",
          "composition": "closeup"
        },
        {
          "scene": "soft graduated grey background, grazing top light",
          "pose": "edge/seam detail revealing material finish and join",
          "composition": "closeup"
        },
        {
          "scene": "warm neutral backdrop, single key light",
          "pose": "corner or handle detail with shallow depth gradient",
          "composition": "closeup"
        },
        {
          "scene": "clean studio macro set, focus-stacked sharpness",
          "pose": "signature texture feature filling the frame",
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
    "category": "Flatlay",
    "name": "Tonal Flatlay Set",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 4,
    "rationale": "Homeware and decor brands building a cohesive tonal feed; top-down styled flatlays that look like a curated catalog spread.",
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
        "style_preset": "Flatlay",
        "attributes": [
          "lighting:soft_even_overhead",
          "color:tonal_monochrome_palette",
          "texture:layered_matte_surfaces",
          "context:styled_topdown_surface"
        ],
        "extra_positive": "perfect 90-degree top-down flatlay shot on 50mm lens, soft even diffused overhead light with gentle soft shadows, tonal color story styled props (linen, stone, dried botanicals, ceramic) all in the same palette family, balanced negative space and rule-of-thirds composition, product kept exact in shape/material/color as the hero, clean editorial catalog styling, premium homeware magazine look",
        "negative": "tilted or off-axis angle, harsh directional shadows, clashing colors breaking the tonal palette, warped or duplicated product, overcrowded frame, text artifacts, watermark, logos, plastic CGI look, distorted proportions, props overlapping and hiding the hero product"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "neutral linen surface, top-down, soft overhead light",
          "pose": "product centered hero with minimal tonal props around it",
          "composition": "medium_shot"
        },
        {
          "scene": "warm stone tabletop, top-down, generous negative space",
          "pose": "product off-center with rule-of-thirds prop balance",
          "composition": "medium_shot"
        },
        {
          "scene": "tonal textile background, top-down macro crop",
          "pose": "tight flatlay detail of product among matching textures",
          "composition": "closeup"
        },
        {
          "scene": "curated surface with dried botanicals and ceramics, top-down",
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
  {
    "mode": "product",
    "vertical": "home",
    "category": "Reel",
    "name": "Empty-to-Styled Reveal",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 5,
    "rationale": "Furniture and decor sellers wanting a satisfying before/after transformation reel that shows the product changing a space — high save/share rate.",
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
  {
    "mode": "product",
    "vertical": "home",
    "category": "Reel",
    "name": "Slow ASMR Detail",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 6,
    "rationale": "Premium homeware brands wanting slow, sensory macro motion reels that linger on texture and craftsmanship — strong watch-time and luxury feel.",
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
  }
];
