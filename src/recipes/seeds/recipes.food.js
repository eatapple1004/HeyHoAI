/**
 * Doppia recipe seed — food (product mode), 6 templates.
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list). recipes 테이블에 INSERT.
 * 자동 생성(레시피 프롬프트 워크플로). config.look.extra_positive/negative + shots[].scene/pose/composition 사용.
 */
module.exports = [
  {
    "mode": "product",
    "vertical": "food",
    "category": "Studio",
    "name": "Top-Down Hero",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "Cafes & restaurants needing clean menu-board / delivery-app hero shots; flat-lay knolling reads instantly at thumbnail size and is the cheapest entry into the catalog.",
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
          "lighting:overhead_softbox",
          "color:neutral_clean",
          "texture:food_fresh",
          "context:tabletop_flatlay"
        ],
        "extra_positive": "appetizing food photography shot perpendicular from directly above, 50mm lens look, even diffused overhead softbox with a large bounce card filling shadows, garnish crisp and freshly plated, subtle natural prop styling (linen napkin, single utensil, scattered ingredients) arranged with negative space, sharp edge-to-edge focus, commercial menu-hero quality",
        "negative": "tilted horizon, perspective distortion, harsh specular hotspots, blown highlights, color cast, warped or melted food, duplicated dishes, plastic-looking food, soggy wilted garnish, text artifacts, watermark, logo, fingers in frame, dirty plate rim, messy crumbs"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "matte light-grey ceramic surface, minimal styling, generous negative space",
          "pose": "perfect 90-degree top-down, dish centered, front-facing garnish up",
          "composition": "medium_shot"
        },
        {
          "scene": "warm oak wood tabletop with a folded linen napkin and one fork",
          "pose": "top-down, dish offset to thirds with prop balance",
          "composition": "medium_shot"
        },
        {
          "scene": "dark slate board with scattered raw ingredients (herbs, citrus, spices) framing the dish",
          "pose": "top-down flat-lay, ingredients radiating outward",
          "composition": "medium_shot"
        },
        {
          "scene": "clean white marble counter, bright airy styling",
          "pose": "tighter top-down crop showing plating detail and texture",
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
    "vertical": "food",
    "category": "Macro",
    "name": "Drip & Steam Macro",
    "output_type": "image_set",
    "credit_cost": 4,
    "sort_order": 2,
    "rationale": "Drink & dessert sellers who live on the crave-factor close-up; the dripping-sauce / rising-steam macro is the highest-converting still and justifies its premium cost with fine detail work.",
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
          "lighting:hard_rim_backlight",
          "color:rich_saturated",
          "texture:glossy_wet",
          "context:dark_moody"
        ],
        "extra_positive": "extreme macro food photography, 100mm macro lens at f/4 with razor-thin depth of field, dramatic side and back rim light catching translucent steam and glistening condensation, slow-motion sauce or chocolate dripping mid-air, frozen splash droplets, melting cheese pull or glaze sheen, deep moody background falloff, mouth-watering tactile detail",
        "negative": "flat even lighting, dull matte surface, dry lifeless food, fake CGI steam, plastic droplets, motion blur on the dish itself, over-sharpened halos, noise grain in shadows, warped product, extra hands, text, watermark, oversaturated neon color clipping, dust spots"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "dark charcoal backdrop, single hard rim light from behind",
          "pose": "detail macro of rising steam curling off a hot drink or dish surface",
          "composition": "closeup"
        },
        {
          "scene": "moody low-key set, spotlit",
          "pose": "mid-pour sauce/glaze/syrup drip caught mid-air over the food",
          "composition": "closeup"
        },
        {
          "scene": "cold-toned background with backlight",
          "pose": "macro of beaded condensation running down a chilled glass or icy surface",
          "composition": "closeup"
        },
        {
          "scene": "warm dark wood, dramatic chiaroscuro",
          "pose": "extreme texture macro — cheese pull, crumb, or glossy frosting peak",
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
    "vertical": "food",
    "category": "Lifestyle",
    "name": "Golden-Hour Cafe Mood",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 3,
    "rationale": "Independent cafes selling atmosphere as much as the cup; warm golden-hour lifestyle scenes drive the aspirational 'find your new favorite corner cafe' feed posts and Instagram reach.",
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
          "lighting:golden_hour",
          "color:film_fuji_warm",
          "texture:soft_haze",
          "context:cafe_indoor"
        ],
        "extra_positive": "cozy lifestyle cafe photography, late-afternoon golden sunlight raking through a window casting long warm shadows and soft lens haze, 35mm film look with gentle grain and creamy bokeh, product placed naturally in a lived-in cafe scene with steam and warm ambiance, shallow depth of field, inviting aspirational mood",
        "negative": "cold blue cast, flat overcast light, clinical studio look, harsh flash, sterile empty background, overexposed window blowout, plastic food, warped product, cluttered messy table, text overlays, watermark, people's faces, hands, oversharpening, HDR halos"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "rustic wooden cafe table beside a sunlit window, golden light streaming in",
          "pose": "product placed naturally with soft shadow, front 3/4 view",
          "composition": "medium_shot"
        },
        {
          "scene": "marble bar counter with espresso machine bokeh behind",
          "pose": "product staged on a saucer with a small dessert prop",
          "composition": "medium_shot"
        },
        {
          "scene": "cozy window seat with a book and trailing plant, warm haze",
          "pose": "product in a relaxed everyday-use vignette",
          "composition": "medium_shot"
        },
        {
          "scene": "outdoor cafe terrace, sun flare and greenery",
          "pose": "tight intimate crop of the product catching the golden light",
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
    "vertical": "food",
    "category": "Reel",
    "name": "Sizzle & Steam ASMR",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 4,
    "rationale": "Restaurants and street-food vendors chasing the algorithm with sensory short-form; the sizzle/steam ASMR reel is the catalog's appetite-trigger hero and the 'new' badge magnet.",
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
          "lighting:warm_directional",
          "color:rich_saturated",
          "texture:glossy_wet",
          "context:dark_moody"
        ],
        "extra_positive": "cinematic food ASMR, macro 100mm lens, warm directional key with a soft rim, live rising steam and audible-looking sizzle, glistening juices and bubbling surfaces, shallow depth of field with creamy falloff, slow deliberate reveal of texture, premium close-up appetite trigger",
        "negative": "flat lighting, dry dull food, fake plastic steam, CGI look, jittery shaky framing, harsh blown highlights, frozen lifeless motion, warped product, extra hands, text artifacts, watermark, color banding, oversaturated clipping"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "dark moody set, single warm key light, hot dish just plated",
          "pose": "macro hold on the sizzling surface with rising steam",
          "composition": "closeup"
        },
        {
          "scene": "low-key background with spotlight on the food",
          "pose": "detail of bubbling sauce / melting glaze / juices pooling",
          "composition": "closeup"
        },
        {
          "scene": "warm wooden table, soft rim light, full hero presentation",
          "pose": "pull-back reveal of the finished dish, steam still rising",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow macro push-in on the steam",
          "slow lateral drift across the bubbling surface",
          "smooth pull-back dolly revealing the full dish"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "warm ASMR sizzle, low ambient",
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
    "vertical": "food",
    "category": "Reel",
    "name": "360 Glaze Spin",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 5,
    "rationale": "Bakeries and dessert/drink shops showing off a finished signature item; the orbiting glaze spin gives a turntable-commercial feel that screams premium and loops cleanly on feed.",
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
          "lighting:gradient_studio",
          "color:rich_saturated",
          "texture:glossy_wet",
          "context:seamless_backdrop"
        ],
        "extra_positive": "premium product turntable commercial, glossy glaze and sheen catching a sweeping highlight as the dish rotates, clean seamless gradient backdrop, soft key with a controlled specular rim defining edges, 50mm lens, consistent product geometry across the spin, mouth-watering high-end advertising look",
        "negative": "morphing or warping product mid-spin, inconsistent shape between frames, flickering, jelly wobble, matte dull surface, dry food, harsh shadows, cluttered background, text, watermark, extra hands, color banding, plastic CGI look, stutter"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "seamless dark gradient backdrop, soft top key with edge rim",
          "pose": "front hero angle, glaze glistening, beginning of rotation",
          "composition": "medium_shot"
        },
        {
          "scene": "same seamless set, light sweeping across surface",
          "pose": "3/4 profile mid-rotation showing depth and topping detail",
          "composition": "medium_shot"
        },
        {
          "scene": "seamless set, highlight peaking on the glaze",
          "pose": "completing the orbit back toward front, glossy sheen peak",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "smooth 120-degree orbit around the dish",
          "continuous orbit, light raking over the glaze",
          "final orbit settling to a clean front hero, glaze gleaming"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "sleek upbeat minimal",
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
    "vertical": "food",
    "category": "Bundle",
    "name": "Full Menu Pack",
    "output_type": "image_set",
    "credit_cost": 8,
    "sort_order": 6,
    "rationale": "New cafes/restaurants onboarding their whole menu at once; the 8-shot consistent-look bundle is the high-value catalog anchor that fills a delivery-app menu or website in one generation.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": {
        "type": "image_set",
        "count": 8,
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
          "lighting:overhead_softbox",
          "color:neutral_clean",
          "texture:food_fresh",
          "context:tabletop_consistent"
        ],
        "extra_positive": "cohesive menu photography pack with a single consistent lighting setup, surface, white balance and styling language across every shot, 50mm lens, clean appetizing commercial look suitable for a delivery-app menu grid, freshly plated, even diffused softbox with fill, repeatable hero framing per item",
        "negative": "inconsistent lighting between shots, mismatched backgrounds, color shifts across the set, tilted angles, warped or melted food, duplicated identical dishes, plastic food, wilted garnish, harsh hotspots, text artifacts, watermark, fingers, dirty plate rims, cluttered props"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "neutral light-grey surface, consistent softbox key",
          "pose": "top-down hero of the main dish, centered",
          "composition": "medium_shot"
        },
        {
          "scene": "same neutral surface and lighting",
          "pose": "45-degree three-quarter angle of the same dish, appetite view",
          "composition": "medium_shot"
        },
        {
          "scene": "same set, slight prop (utensil + napkin)",
          "pose": "front eye-level hero showing height and layers",
          "composition": "medium_shot"
        },
        {
          "scene": "same set, tight styling",
          "pose": "detail closeup of texture and garnish",
          "composition": "closeup"
        },
        {
          "scene": "same neutral surface, paired styling",
          "pose": "top-down of a side / drink companion item",
          "composition": "medium_shot"
        },
        {
          "scene": "same set, consistent light",
          "pose": "3/4 angle of the companion item matching the hero look",
          "composition": "medium_shot"
        },
        {
          "scene": "same surface, scattered fresh ingredients framing",
          "pose": "top-down ingredient-context flat-lay of a signature item",
          "composition": "medium_shot"
        },
        {
          "scene": "same set, clean negative space for menu text overlay",
          "pose": "front 3/4 brand-hero of the flagship item with breathing room",
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
