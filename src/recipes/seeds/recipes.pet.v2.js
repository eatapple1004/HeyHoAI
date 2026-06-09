/**
 * Doppia recipe seed — pet (product mode), v2, 6 templates.
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list). recipes 테이블에 INSERT.
 *
 * v2 changelog vs v1:
 *  - ADD  : "Pet Product Hero" — clean still-life hero set (missing safe ◈2 entry in v1)
 *  - FIX  : "Macro Crunch" credit_cost 4→2 (4-shot image_set = 4×0.5 = ◈2 per pricing rule)
 *  - FLAG : "On-Pet Fit" marked experimental + needs_human_review; negative hardened
 *  - SCOPE: "Talking Pet Skit" scoped 3-shot→2-shot (◈8→◈4); B-roll beat added; flags added
 *  - DROP : "Pet POV Taste Test" (near-dup energy of Zoomies; treat JTBD covered by Hero+Macro)
 *  - TEXT_OVERLAY: no 'text'/'logo' in look.negative for any entry (global SAFETY_NEGATIVE handles it)
 */
module.exports = [
  /* ─────────────────────────────────────────────────────────
   * 1. Pet Product Hero — ADD (clean still-life, no pet morph risk)
   * ───────────────────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "pet",
    "category": "Hero",
    "name": "Pet Product Hero",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "The missing safe ◈2 entry: a clean editorial still-life of the pet product alone — packaging, treat, collar, toy. Gives every seller a trust-building hero image without any pet compositing or morph risk.",
    "meta": {
      "render_notes": "text_overlay=true — any sizing / spec text must be composited in post; do NOT embed in the render prompt",
      "flags": []
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
        "style_preset": "Editorial",
        "attributes": [
          "lighting:soft_box_beauty_dish",
          "color:clean_neutral_white_to_warm",
          "texture:product_surface_crisp",
          "context:minimal_studio_or_lifestyle_surface"
        ],
        "extra_positive": "clean editorial product hero shot of the uploaded pet product; pure white or soft linen backdrop, soft-box beauty-dish lighting, 50mm or 100mm lens look, shadow-caster below the product, packaging and branding crisp and fully readable, magazine-level product photography, no pets in frame, pure product star",
        "negative": "blurry product, warped or melted product shape, altered product color, duplicated product, pet anatomy in frame, dirty or cluttered background, harsh reflections, oversaturated HDR, plastic sheen"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "pure white seamless studio, large soft-box left key light",
          "pose": "product front view perfectly centered, clean shadow below",
          "composition": "closeup"
        },
        {
          "scene": "soft linen surface, warm diffused window light",
          "pose": "product 3/4 angle showing top and front, natural warm shadow",
          "composition": "medium_shot"
        },
        {
          "scene": "light grey backdrop, rim light for edge definition",
          "pose": "product top-down flat-lay, perfect symmetry",
          "composition": "closeup"
        },
        {
          "scene": "minimal wooden table surface, soft bokeh background, morning light",
          "pose": "product side profile with a single natural prop hint (leaf or ribbon, no text)",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────────────────
   * 2. Cuddle Hour — KEEP (lifestyle ◈2, product + pet mood)
   * ───────────────────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "pet",
    "category": "Lifestyle",
    "name": "Cuddle Hour",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "Pet brands and Etsy/Shopify sellers who need warm, scroll-stopping lifestyle shots of a toy or accessory next to a real cuddly pet without a photoshoot.",
    "meta": {
      "flags": []
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
        "style_preset": "Lifestyle",
        "attributes": [
          "lighting:window_soft_diffused",
          "color:warm_cozy_tone",
          "texture:fur_soft_detail",
          "context:cozy_home_interior"
        ],
        "extra_positive": "the uploaded pet product placed naturally beside a happy, photogenic dog or cat in a sunlit cozy home; soft golden window light, shallow depth of field, 50mm f/1.8 look, gentle bokeh, lived-in warm domestic mood, product remains crisp and true-to-shape with original colors intact, heart-warming candid pet-and-product moment",
        "negative": "deformed or extra limbs on pet, fused paws, warped or melted product, altered product color, duplicated product, watermark, plastic-looking fur, dead glassy eyes, oversaturated HDR, cluttered messy background, blurry product"
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

  /* ─────────────────────────────────────────────────────────
   * 3. Macro Crunch — FIX credit_cost 4→2 (4-shot image_set = ◈2)
   * ───────────────────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "pet",
    "category": "Detail",
    "name": "Macro Crunch",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 3,
    "rationale": "Premium treat and chew brands selling on quality cues — extreme macro that showcases texture, crunch and ingredients to justify a higher price point. (credit_cost corrected v1→v2: 4-shot × ◈0.5 = ◈2)",
    "meta": {
      "flags": []
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
        "style_preset": "Macro",
        "attributes": [
          "lighting:hard_raking_sidelight",
          "color:rich_appetizing_tone",
          "texture:crunchy_surface_detail",
          "context:dark_food_studio"
        ],
        "extra_positive": "extreme macro food photography of the uploaded pet treat; 100mm macro lens, razor-sharp surface texture, visible crunchy grain and ingredient detail, raking sidelight carving out depth, crumbs and a clean splash of natural elements, dark moody studio backdrop, premium gourmet pet-treat presentation, true-to-life product color and form",
        "negative": "soft out-of-focus product, warped or recolored treat, altered shape, fake plastic texture, watermark, oversaturated cartoonish color, dust spots, busy background, duplicated product"
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

  /* ─────────────────────────────────────────────────────────
   * 4. On-Pet Fit — KEEP + FLAG (experimental, morph risk)
   * ───────────────────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "pet",
    "category": "OnPet",
    "name": "On-Pet Fit",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 4,
    "rationale": "Sellers of wearables — collars, harnesses, bandanas, apparel — who need realistic on-pet fit shots showing how the product looks worn, the pet equivalent of an on-model shot. Flagged experimental due to on-pet composite morph risk.",
    "meta": {
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "High morph risk: AI may fuse product into fur or warp pet anatomy. Always human-review before publish. Regenerate if limb count is wrong or product floats off body."
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
        "style_preset": "Lifestyle",
        "attributes": [
          "lighting:soft_overcast_natural",
          "color:clean_neutral_tone",
          "texture:fur_and_fabric_detail",
          "context:outdoor_park_and_studio"
        ],
        "extra_positive": "realistic on-pet product worn by a well-groomed photogenic dog; the uploaded wearable (collar, harness, bandana or apparel) fitted naturally with correct drape, buckle and proportion; soft natural light, 85mm portrait look, clean catalog-ready styling, accurate product color and hardware, believable contact with the fur, correct limb count, natural fur flow",
        "negative": "product floating off the body, wrong scale or fit, warped buckles or straps, recolored or altered product, deformed pet anatomy, extra or missing limbs, fused fabric into fur, no warped muzzle, correct limb count, natural fur no melting, watermark, harsh shadows, plastic fur"
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

  /* ─────────────────────────────────────────────────────────
   * 5. Wait For The Zoomies — KEEP (◈6 reel, high-energy toy)
   * ───────────────────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "pet",
    "category": "Reel",
    "name": "Wait For The Zoomies",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 5,
    "rationale": "DTC pet-toy sellers wanting a high-energy, TikTok-native reel that shows the product triggering joyful play — the classic 'wait for it' payoff that drives shares.",
    "meta": {
      "flags": []
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
        "style_preset": "Lifestyle",
        "attributes": [
          "lighting:bright_natural_daylight",
          "color:vibrant_punchy",
          "texture:fur_motion_detail",
          "context:home_or_backyard"
        ],
        "extra_positive": "energetic playful pet content; the uploaded product shown then a dog exploding into zoomies around it; bright airy daylight, dynamic handheld-feel framing, crisp shutter freezing fur and motion, joyful chaotic fun energy, product stays accurate in shape and color across every frame",
        "negative": "warped or stretched product, altered product color, deformed pet anatomy, extra legs, motion-blur smearing the product into mush, watermark, choppy unnatural movement, dull flat lighting, plastic fur"
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

  /* ─────────────────────────────────────────────────────────
   * 6. Talking Pet Skit — SCOPE-DOWN 3→2 shots (◈8→◈4) + FLAG
   *    Shot 1: B-roll product reveal; Shot 2: talking pet (max 2 sentences)
   * ───────────────────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "pet",
    "category": "UGC",
    "name": "Talking Pet Skit",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 6,
    "rationale": "Pet brands wanting viral UGC-style ads where the pet 'talks' to plug the product — limited to a B-roll product hook + max 2-sentence talking beat to minimize morph drift. Flagged experimental: talking-pet animation carries heavy muzzle-warp risk; human review required before publish.",
    "meta": {
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Talking-pet morph risk: AI may warp muzzle, generate extra teeth, or cause lip-sync drift. Limit mouth animation to subtle 2-sentence delivery. Shot 1 is a safe B-roll product reveal (no mouth animation) to give the engine a clean anchor frame. Always human-review before publish."
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
        "style_preset": "Lifestyle",
        "attributes": [
          "lighting:bright_friendly_indoor",
          "color:vivid_social_tone",
          "texture:fur_detail",
          "context:home_ugc_setting"
        ],
        "extra_positive": "funny UGC talking-pet skit ad; shot 1 is a clean product B-roll reveal establishing the item; shot 2 shows an expressive dog or cat with subtle minimal mouth movement appearing to speak ONE or TWO short sentences to camera; bright friendly selfie-style indoor light, vlog framing, relatable home setting, charming comedic energy, product stays accurate in shape and color across both frames",
        "negative": "grotesque or uncanny mouth deformation, no warped muzzle, correct limb count, natural fur no melting, no human-like mouth morph, extra eyes or teeth, warped or recolored product, watermark, jittery flicker, dull lighting, plastic fur, lip-sync drift smearing the muzzle"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright cozy living room table, friendly daylight, product centered as hero prop",
          "pose": "product 3/4 hero B-roll — no pet talking, pet noses into frame at end as hook",
          "composition": "medium_shot"
        },
        {
          "scene": "same room low angle, pet face-to-camera close, product held beside it",
          "pose": "pet delivering max 2-sentence talking CTA, minimal mouth movement, product visible at side",
          "composition": "closeup"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "gentle push-in on product B-roll, pet nose entering frame at end",
          "soft handheld hold on talking pet face, barely perceptible sway"
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
