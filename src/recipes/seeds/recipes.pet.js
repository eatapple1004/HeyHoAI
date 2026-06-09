/**
 * Doppia recipe seed — pet (product mode), 6 templates.
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list). recipes 테이블에 INSERT.
 * 자동 생성(레시피 프롬프트 워크플로). config.look.extra_positive/negative + shots[].scene/pose/composition 사용.
 */
module.exports = [
  {
    "mode": "product",
    "vertical": "pet",
    "category": "Lifestyle",
    "name": "Cuddle Hour",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "Pet brands and Etsy/Shopify sellers who need warm, scroll-stopping lifestyle shots of a toy or accessory next to a real cuddly pet without a photoshoot.",
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
        "style_preset": "Lifestyle",
        "attributes": [
          "lighting:window_soft_diffused",
          "color:warm_cozy_tone",
          "texture:fur_soft_detail",
          "context:cozy_home_interior"
        ],
        "extra_positive": "the uploaded pet product placed naturally beside a happy, photogenic dog or cat in a sunlit cozy home; soft golden window light, shallow depth of field, 50mm f/1.8 look, gentle bokeh, lived-in warm domestic mood, product remains crisp and true-to-shape with original colors and logo intact, heart-warming candid pet-and-product moment",
        "negative": "deformed or extra limbs on pet, fused paws, warped or melted product, altered product color or logo, duplicated product, text artifacts, watermark, plastic-looking fur, dead glassy eyes, oversaturated HDR, cluttered messy background, blurry product"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "sunlit living-room rug with soft throw blanket, warm afternoon window light",
          "pose": "product front view resting on rug, fluffy dog nuzzling beside it",
          "composition": "medium_shot"
        },
        {
          "scene": "cozy bed with linen sheets, soft diffused daylight",
          "pose": "product 3/4 angle, cat curled around it sleepily",
          "composition": "medium_shot"
        },
        {
          "scene": "wooden floor near a window with houseplant bokeh",
          "pose": "product styled centered, pet paw gently touching it",
          "composition": "closeup"
        },
        {
          "scene": "knit-blanket couch corner, golden hour glow",
          "pose": "product placed beside a content pet looking at camera",
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
    "vertical": "pet",
    "category": "Reel",
    "name": "Wait For The Zoomies",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 2,
    "rationale": "DTC pet-toy sellers wanting a high-energy, TikTok-native reel that shows the product triggering joyful play — the classic 'wait for it' payoff that drives shares.",
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
        "style_preset": "Lifestyle",
        "attributes": [
          "lighting:bright_natural_daylight",
          "color:vibrant_punchy",
          "texture:fur_motion_detail",
          "context:home_or_backyard"
        ],
        "extra_positive": "energetic playful pet content; the uploaded product shown then a dog exploding into zoomies around it; bright airy daylight, dynamic handheld-feel framing, crisp shutter freezing fur and motion, joyful chaotic fun energy, product stays accurate in shape, color and branding across every frame",
        "negative": "warped or stretched product, altered product logo or color, deformed pet anatomy, extra legs, motion-blur smearing the product into mush, text artifacts, watermark, choppy unnatural movement, dull flat lighting, plastic fur"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "tidy living room floor, bright morning daylight, dog sitting still and alert",
          "pose": "product held up front-and-center as the teaser hero, dog staring intently",
          "composition": "medium_shot"
        },
        {
          "scene": "same living room, product tossed onto the floor",
          "pose": "product 3/4 on floor as dog launches toward it",
          "composition": "full_body"
        },
        {
          "scene": "open backyard lawn, sunny",
          "pose": "dog mid-zoomies sprinting in a circle with the product, joyful chaos",
          "composition": "full_body"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow tense push-in building anticipation",
          "quick whip-tilt following the toss down to the floor",
          "fast tracking pan chasing the dog in a circle"
        ],
        "duration_per_shot": 3,
        "transition": "whip",
        "music_mood": "playful upbeat build-and-drop",
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
    "vertical": "pet",
    "category": "Reel",
    "name": "Pet POV Taste Test",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 3,
    "rationale": "Treat and pet-food brands needing an appetizing first-person 'my pet reacts' reel that proves taste appeal and earns saves from doting owners.",
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
        "style_preset": "Lifestyle",
        "attributes": [
          "lighting:soft_warm_kitchen",
          "color:appetizing_warm_tone",
          "texture:treat_crumb_detail",
          "context:home_kitchen_floor"
        ],
        "extra_positive": "POV-style pet taste test; owner's hand offering the uploaded treat product to an eager dog or cat; mouth-watering close framing on the treat, soft warm kitchen light, shallow depth of field, irresistible appetizing texture, genuine excited pet reaction, treat product stays true to real shape, color and packaging",
        "negative": "deformed pet mouth or teeth, extra tongues, warped or recolored treat, altered packaging or logo, unappetizing gray food, text artifacts, watermark, human face in frame, harsh flat lighting, plastic-looking treat"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "warm home kitchen floor, soft window light, pet sitting expectantly",
          "pose": "treat product detail held in hand toward camera, pet eyeing it",
          "composition": "closeup"
        },
        {
          "scene": "low POV at pet eye-level near food bowl",
          "pose": "product front view offered down, pet leaning in to sniff",
          "composition": "closeup"
        },
        {
          "scene": "kitchen floor, soft bokeh background",
          "pose": "pet happily taking and crunching the treat, tail-wag energy",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "gentle push-in on the treat in hand",
          "low POV glide-down toward the pet's nose",
          "soft handheld hold on the happy crunch reaction"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "cute warm playful",
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
    "vertical": "pet",
    "category": "Detail",
    "name": "Macro Crunch",
    "output_type": "image_set",
    "credit_cost": 4,
    "sort_order": 4,
    "rationale": "Premium treat and chew brands selling on quality cues — extreme macro that showcases texture, crunch and ingredients to justify a higher price point.",
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
          "lighting:hard_raking_sidelight",
          "color:rich_appetizing_tone",
          "texture:crunchy_surface_detail",
          "context:dark_food_studio"
        ],
        "extra_positive": "extreme macro food photography of the uploaded pet treat; 100mm macro lens, razor-sharp surface texture, visible crunchy grain and ingredient detail, raking sidelight carving out depth, crumbs and a clean splash of natural elements, dark moody studio backdrop, premium gourmet pet-treat presentation, true-to-life product color and form",
        "negative": "soft out-of-focus product, warped or recolored treat, altered shape, fake plastic texture, text artifacts, watermark, oversaturated cartoonish color, dust spots, busy background, duplicated product"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "dark slate surface, single hard sidelight",
          "pose": "product extreme macro front, surface texture filling frame",
          "composition": "closeup"
        },
        {
          "scene": "moody studio with shallow falloff",
          "pose": "product 3/4 detail, edge crunch and crumbs in focus",
          "composition": "closeup"
        },
        {
          "scene": "dark backdrop with a scatter of matching ingredients",
          "pose": "product detail surrounded by raw ingredient cues",
          "composition": "closeup"
        },
        {
          "scene": "clean dark table, top sidelight",
          "pose": "single treat broken to reveal interior texture",
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
    "vertical": "pet",
    "category": "OnPet",
    "name": "On-Pet Fit",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 5,
    "rationale": "Sellers of wearables — collars, harnesses, bandanas, apparel — who need realistic on-pet fit shots showing how the product looks worn, the pet equivalent of an on-model shot.",
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
        "style_preset": "Lifestyle",
        "attributes": [
          "lighting:soft_overcast_natural",
          "color:clean_neutral_tone",
          "texture:fur_and_fabric_detail",
          "context:outdoor_park_and_studio"
        ],
        "extra_positive": "realistic on-pet product worn by a well-groomed photogenic dog; the uploaded wearable (collar, harness, bandana or apparel) fitted naturally with correct drape, buckle and proportion; soft natural light, 85mm portrait look, clean catalog-ready styling, accurate product color, hardware and branding, believable contact with the fur",
        "negative": "product floating off the body, wrong scale or fit, warped buckles or straps, recolored or altered product, deformed pet anatomy, extra limbs, fused fabric into fur, text artifacts, watermark, harsh shadows, plastic fur"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean light-grey studio backdrop, soft key light",
          "pose": "product worn, pet standing front view full fit",
          "composition": "full_body"
        },
        {
          "scene": "minimal studio, soft side light",
          "pose": "product worn, pet 3/4 profile showing fit and hardware",
          "composition": "medium_shot"
        },
        {
          "scene": "outdoor park path, soft overcast daylight",
          "pose": "product worn, pet walking naturally",
          "composition": "full_body"
        },
        {
          "scene": "grassy lawn with bokeh",
          "pose": "detail of the worn product on neck/back, fit close-up",
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
    "vertical": "pet",
    "category": "UGC",
    "name": "Talking Pet Skit",
    "output_type": "reel",
    "credit_cost": 8,
    "sort_order": 6,
    "rationale": "Pet brands wanting viral UGC-style ads where the pet 'talks' to plug the product — the most shareable, highest-converting format, hence the premium slot.",
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
        "style_preset": "Lifestyle",
        "attributes": [
          "lighting:bright_friendly_indoor",
          "color:vivid_social_tone",
          "texture:fur_detail",
          "context:home_ugc_setting"
        ],
        "extra_positive": "funny UGC talking-pet skit ad; an expressive dog or cat with subtle animated mouth movement appears to speak to camera while presenting the uploaded product; bright friendly selfie-style indoor light, vlog framing, relatable home setting, charming meme-able comedic energy, product held or beside the pet stays accurate in shape, color and branding",
        "negative": "grotesque or uncanny mouth deformation, warped pet face, extra eyes or teeth, human hands distorting, warped or recolored product, altered logo, text artifacts, watermark, jittery flicker, dull lighting, plastic fur, lip-sync drift smearing the muzzle",
        "wardrobe": ""
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright cozy living room, friendly daylight, pet facing camera close",
          "pose": "pet talking to camera as hook, product front view just entering frame",
          "composition": "closeup"
        },
        {
          "scene": "same room, pet beside the product on a table",
          "pose": "pet 'explaining' the product, product 3/4 angle held up beside it",
          "composition": "medium_shot"
        },
        {
          "scene": "home setting with soft bokeh",
          "pose": "pet's satisfied reaction with the product, playful CTA beat",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "gentle push-in on the talking pet's face for the hook",
          "slight handheld sway as the product is raised and presented",
          "soft pull-back on the happy reaction for the CTA"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "quirky comedic upbeat",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  }
];
