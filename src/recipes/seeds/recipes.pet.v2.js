/**
 * Doppia recipe seed — pet (product mode), v2, 12 templates.
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list). recipes 테이블에 INSERT.
 *
 * v2 changelog vs v1:
 *  - ADD  : "Pet Product Hero" — clean still-life hero set (missing safe ◈2 entry in v1)
 *  - FIX  : "Macro Crunch" credit_cost 4→2 (4-shot image_set = 4×0.5 = ◈2 per pricing rule)
 *  - FLAG : "On-Pet Fit" marked experimental + needs_human_review; negative hardened
 *  - SCOPE: "Talking Pet Skit" scoped 3-shot→2-shot (◈8→◈4); B-roll beat added; flags added
 *  - DROP : "Pet POV Taste Test" (near-dup energy of Zoomies; treat JTBD covered by Hero+Macro)
 *  - TEXT_OVERLAY: no 'text'/'logo' in look.negative for any entry (global SAFETY_NEGATIVE handles it)
 *
 * v2 → v2.1 (sort_order 7-12 append + reworks):
 *  - REWORK: "Wait For The Zoomies" (5) 3샷◈6 → 2샷◈4; default=low-speed close reaction; sprint opt-in note; provisional
 *  - REWORK: "On-Pet Fit" (4) provisional=true added; render_notes extended re: full-body morph + spec sheet delegation
 *  - ADD 7 : "Single-Hero Sizzle Reel" — reel 1샷◈2, 제품 단독
 *  - ADD 8 : "Hands-On Pour & Unbox Reel" — reel 2샷◈4, ⚠needs_human_review, 손가락 리스크
 *  - ADD 9 : "Device UI Mockup Set" — image_set 4컷◈2, text_overlay, 펫테크 디바이스 UI
 *  - ADD 10: "In-Room Scale Set" — image_set 4컷◈2, text_overlay, 룸 스케일 컨텍스트
 *  - ADD 11: "Habitat Scene Set" — image_set 4컷◈2, 수조/비바리움/테라리움
 *  - ADD 12: "Pet Wearable Spec Sheet" — image_set 4컷◈2, text_overlay, 사이즈가이드/각인 매크로
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
   * 4. On-Pet Fit — REWORK: provisional=true; render_notes extended
   *    (full-body 1-shot = high morph risk; size/engraving → Pet Wearable Spec Sheet)
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
      "provisional": true,
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "High morph risk: AI may fuse product into fur or warp pet anatomy. Always human-review before publish. Regenerate if limb count is wrong or product floats off body. Full-body 1-shot (shot 1) carries the highest morph risk — treat it as optional and review first. Size callouts and engraving/ID-tag specs are now handled by the dedicated 'Pet Wearable Spec Sheet' template (sort_order 12); do NOT embed sizing text in this render."
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
   * 5. Wait For The Zoomies — REWORK: 3샷◈6 → 2샷◈4
   *    Default = low-speed close toy-interaction reaction (high-speed sprint = opt-in note)
   * ───────────────────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "pet",
    "category": "Reel",
    "name": "Wait For The Zoomies",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 5,
    "rationale": "DTC pet-toy sellers wanting a TikTok-native reel that shows the product triggering joyful play — the classic 'wait for it' payoff. Scoped to 2 shots (◈4) for better cost/coverage ratio: shot 1 teaser hold, shot 2 close-up toy-interaction reaction. High-speed full-sprint mode is an opt-in variant (see render_notes).",
    "meta": {
      "provisional": true,
      "flags": [],
      "render_notes": "Default mode = low-speed close reaction: shot 2 is a tight medium-shot of the pet pawing / nosing the product rather than a full-sprint zoomie. This avoids motion-blur smearing the product and reduces morph drift. OPT-IN variant: to upgrade shot 2 to a full-speed backyard sprint, operator must pass variant='high_speed_sprint' — that variant carries higher motion-blur and limb-deform risk and requires human review before publish."
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
          "lighting:bright_natural_daylight",
          "color:vibrant_punchy",
          "texture:fur_motion_detail",
          "context:home_or_backyard"
        ],
        "extra_positive": "playful pet-toy interaction reel; shot 1 builds anticipation showing the product as hero teaser; shot 2 is a close joyful reaction — pet actively engaging with the toy (pawing, nosing, biting gently) in tight medium-shot; bright airy daylight, handheld feel, crisp fur detail, product stays accurate in shape and color across every frame",
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
          "scene": "same living room floor, product placed down",
          "pose": "dog close-up joyfully interacting with the product — pawing, nosing or mouthing it, product clearly visible",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow tense push-in building anticipation",
          "gentle handheld hold on tight pet-toy interaction, slight drift in"
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
  },

  /* ─────────────────────────────────────────────────────────
   * 7. Single-Hero Sizzle Reel — NEW (reel 1샷◈2, 제품 단독, 펫 없음)
   * ───────────────────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "pet",
    "category": "Reel",
    "name": "Single-Hero Sizzle Reel",
    "output_type": "reel",
    "credit_cost": 2,
    "sort_order": 7,
    "rationale": "릴 최저가 진입(◈2). 제품 단독 1샷 즉시게시 릴 — 물 흐름·디스펜싱·버튼 누름 같은 단일 동작을 느린 클로즈업으로 포착. 펫 없음 = 합성 리스크 제로. 빠른 피드 캡처용.",
    "meta": {
      "provisional": true,
      "flags": []
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": {
        "type": "reel",
        "count": 1,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Editorial",
        "attributes": [
          "lighting:soft_studio_or_natural_diffused",
          "color:clean_neutral_to_warm",
          "texture:product_surface_crisp",
          "context:minimal_studio_surface"
        ],
        "extra_positive": "single cinematic close-up of the uploaded pet product performing one satisfying action — water flowing from a dispenser, treats dropping, a button click, lid opening; ultra-clean minimal backdrop, product perfectly accurate in shape and color, slow motion feel, ASMR-adjacent tactile quality, no pets in frame",
        "negative": "warped or melted product, altered product color, duplicated product, pet anatomy in frame, cluttered background, harsh reflections, oversaturated HDR, shaky motion"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "pure white or soft grey seamless studio surface, gentle soft-box side light",
          "pose": "product performing its key single action — dispensing, pouring, opening, or glowing — in tight close-up",
          "composition": "closeup"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "ultra-slow push-in following the product action, subtle rack focus on the action point"
        ],
        "duration_per_shot": 4,
        "transition": "none",
        "music_mood": "minimal clean ASMR ambient",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────────────────
   * 8. Hands-On Pour & Unbox Reel — NEW (reel 2샷◈4, ⚠needs_human_review)
   *    사람 손 시연 — 5손가락 negative + 부분 손 크롭
   * ───────────────────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "pet",
    "category": "Reel",
    "name": "Hands-On Pour & Unbox Reel",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 8,
    "rationale": "1회분 데모가 필요한 사료/사료보충제/간식 셀러 또는 언박싱/핸드툴 시연이 필요한 제품용. 사람 손이 제품을 직접 다루는 2샷 구성. 손가락 렌더링 리스크 → hardened negative(5손가락) + 부분 손 크롭으로 리스크 완화.",
    "meta": {
      "provisional": true,
      "flags": ["needs_human_review"],
      "render_notes": "Human hand morph risk: AI frequently renders extra or fused fingers. Negative hardened with 'extra fingers, fused fingers, wrong finger count, deformed hand' — always crop to partial hand (wrist to mid-finger) to keep the most error-prone finger tips out of frame. Human-review all shots before publish; regenerate if finger count is visibly wrong."
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
          "lighting:bright_natural_or_soft_box",
          "color:clean_warm_neutral",
          "texture:product_surface_and_hand_skin",
          "context:kitchen_counter_or_studio_surface"
        ],
        "extra_positive": "clean hands-on demo reel of the uploaded pet product; partial hand crop (wrist to mid-finger, fingertips cropped out of frame) pouring, scooping or unboxing the product; kitchen counter or minimal studio surface, bright natural light, product perfectly accurate in color and shape, satisfying tactile demo energy",
        "negative": "extra fingers, fused fingers, wrong finger count, deformed hand, full hand with all five fingers visible, pet anatomy in frame, warped or recolored product, duplicated product, cluttered messy background, harsh shadows, watermark"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean kitchen counter, bright natural window light, product package in background",
          "pose": "partial hand (cropped at mid-finger) opening or unboxing the product — lid lift or bag tear, product label facing camera",
          "composition": "closeup"
        },
        {
          "scene": "same counter, pet bowl in foreground",
          "pose": "partial hand (cropped at mid-finger) pouring or scooping the product into the bowl, satisfying single-serving action",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "gentle push-in following the hand unboxing action, product label staying sharp",
          "slow downward tilt following the pour or scoop into the bowl"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "clean upbeat lifestyle",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────────────────
   * 9. Device UI Mockup Set — NEW (image_set 4컷◈2, 🅣 text_overlay)
   *    펫 테크 디바이스 + 화면 UI — GPS/펫카메라/스마트칼라/자동급식
   * ───────────────────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "pet",
    "category": "Tech",
    "name": "Device UI Mockup Set",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 9,
    "rationale": "펫 테크 셀러(GPS 트래커·자동급식기·스마트칼라·펫카메라) 전용 UI 목업 세트. 디바이스 화면은 off 또는 text_overlay로 앱/지도/LCD 수치 합성. 렌더에서 UI 텍스트를 생성하지 않아 오탈자/할루시네이션 방지.",
    "meta": {
      "provisional": true,
      "flags": [],
      "render_notes": "text_overlay=true — device screens must be rendered blank/off or with a minimal glowing rectangle placeholder. All UI content (app screenshots, GPS maps, LCD readouts) must be composited in post via text_overlay pipeline. Do NOT generate readable screen text in the render prompt."
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
          "lighting:cool_tech_studio_soft_box",
          "color:clean_white_to_dark_tech",
          "texture:device_plastic_metal_glass",
          "context:minimal_tech_surface_or_desk"
        ],
        "extra_positive": "clean tech product photography of the uploaded pet device; device screen rendered as blank glowing rectangle placeholder for UI compositing; crisp soft-box lighting, cool-toned modern tech aesthetic, accurate device body shape and color, 50mm lens look, no pets in frame",
        "negative": "readable screen text generated by AI, garbled or hallucinated UI elements, warped device body, altered device color, duplicated device, pet anatomy in frame, dirty cluttered background, harsh reflections, plastic sheen"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "white seamless studio, soft-box top-front light",
          "pose": "device front view perfectly centered, screen facing camera as blank glow placeholder",
          "composition": "closeup"
        },
        {
          "scene": "dark matte surface, cool blue rim light",
          "pose": "device 3/4 angle showing top and front, screen at angle with blank glow",
          "composition": "medium_shot"
        },
        {
          "scene": "minimal desk surface with light grey backdrop",
          "pose": "device top-down flat-lay, screen blank centered",
          "composition": "closeup"
        },
        {
          "scene": "soft lifestyle surface — linen or wood — warm diffused light",
          "pose": "device side profile in hand-free stand or propped, screen visible as blank placeholder, natural mood",
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
   * 10. In-Room Scale Set — NEW (image_set 4컷◈2, 🅣 text_overlay)
   *     룸 컨텍스트 + 크기 레퍼런스 — 대용량백·캣타워·가구·대형매트
   * ───────────────────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "pet",
    "category": "Scale",
    "name": "In-Room Scale Set",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 10,
    "rationale": "대형 펫 제품(대용량 사료백·캣타워·가구·대형 매트) 셀러가 실제 생활공간 안에서 크기 감을 전달하는 4컷 세트. 치수 오버레이는 text_overlay 파이프라인으로 합성 — 렌더에 숫자를 넣지 않아 오탈자/왜곡 방지.",
    "meta": {
      "provisional": true,
      "flags": [],
      "render_notes": "text_overlay=true — all size callouts, dimension annotations, and scale cue labels must be composited in post. Render the product accurately sized relative to the room furniture; do NOT generate measurement text or dimension arrows inside the render prompt."
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
        "style_preset": "Lifestyle",
        "attributes": [
          "lighting:soft_interior_ambient",
          "color:warm_neutral_home_tone",
          "texture:product_and_room_material",
          "context:living_room_or_pet_corner"
        ],
        "extra_positive": "the uploaded pet product placed in a real living space at accurate scale relative to surrounding furniture; room environment provides natural size reference, product true-to-color and true-to-shape, warm interior ambient light, inviting home mood, no pets in frame unless product is pet furniture",
        "negative": "warped or shrunken product, altered product color, duplicated product, floating product, distorted room perspective, pet anatomy in frame (unless product is pet furniture), cluttered distracting background, harsh flash lighting, oversaturated HDR"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "living room corner, sofa and bookshelf visible as scale reference, soft ambient light",
          "pose": "product placed naturally on floor in corner, furniture providing scale context, product facing camera",
          "composition": "full_body"
        },
        {
          "scene": "open living room floor, TV unit in background as scale anchor",
          "pose": "product centered on floor, wide shot showing full room scale relationship",
          "composition": "full_body"
        },
        {
          "scene": "pet corner or laundry room wall, measuring-tape prop or door frame as scale hint",
          "pose": "product height comparison shot against door frame or wall, 3/4 angle",
          "composition": "medium_shot"
        },
        {
          "scene": "top-down overhead room view, floor grid visible",
          "pose": "product top-down flat showing footprint relative to floor tiles or rug pattern",
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
   * 11. Habitat Scene Set — NEW (image_set 4컷◈2)
   *     수조/비바리움/테라리움 서식지 무드
   * ───────────────────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "pet",
    "category": "Lifestyle",
    "name": "Habitat Scene Set",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 11,
    "rationale": "수생·파충류·양서류 전문 펫 셀러(수조 필터·히터·비바리움 조명·테라리움 데코)를 위한 서식지 무드 4컷. 제품 1종 기준 일관 렌더, 수중·습지 생태감을 살린 분위기 샷.",
    "meta": {
      "provisional": true,
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
        "style_preset": "Editorial",
        "attributes": [
          "lighting:aquatic_ambient_or_vivarium_glow",
          "color:cool_blue_green_or_earthy_terrarium",
          "texture:water_glass_moss_substrate",
          "context:aquarium_vivarium_terrarium_habitat"
        ],
        "extra_positive": "the uploaded product installed or placed naturally inside a beautifully lit aquarium, vivarium or terrarium; lush aquatic plants or earthy moss and rock substrate, atmospheric habitat mood, product accurate in shape and color, cinematic nature-documentary feel, no exaggerated CGI look, genuine ecosystem ambiance",
        "negative": "warped or recolored product, duplicated product, cartoonish oversaturated color, fake plastic vegetation, anachronistic objects, no animals generating morph risk unless essential and explicitly requested, cluttered ugly background, harsh flash lighting, broken glass distortion artifacts"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "freshwater planted aquarium, soft blue-green ambient light, lush aquatic plants background",
          "pose": "product installed in habitat — filter, heater or decoration placed naturally among plants, full habitat context",
          "composition": "medium_shot"
        },
        {
          "scene": "same aquarium, tight focus on product",
          "pose": "product close-up showing installation detail, blurred aquatic plants in bokeh background",
          "composition": "closeup"
        },
        {
          "scene": "terrarium or vivarium with earthy substrate, moss and wood decor, warm reptile lamp glow",
          "pose": "product placed in terrarium — lighting unit, hide or decor — warm earthy habitat mood",
          "composition": "medium_shot"
        },
        {
          "scene": "top-down overhead aquarium or terrarium view, habitat fully styled",
          "pose": "product top-down showing placement within the full habitat layout",
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
   * 12. Pet Wearable Spec Sheet — NEW (image_set 4컷◈2, 🅣 text_overlay)
   *     펫 미착용 사이즈가이드/각인 매크로 (하네스·할터·ID태그 듀얼)
   * ───────────────────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "pet",
    "category": "Spec",
    "name": "Pet Wearable Spec Sheet",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 12,
    "rationale": "하네스·할터·칼라·ID태그 셀러가 온-펫 합성 없이 사이즈 가이드와 각인 정보를 전달하는 스펙 시트 4컷. 치수 측정선·각인 텍스트·사이즈 테이블은 text_overlay로 합성 — 렌더 오탈자/왜곡 방지. On-Pet Fit 템플릿의 스펙 정보 위임처.",
    "meta": {
      "provisional": true,
      "flags": [],
      "render_notes": "text_overlay=true — all dimension callouts, engraving preview text, size-range tables, and measurement arrows must be composited in post. Render the product flat or on a neutral surface; do NOT generate measurement numbers or engraving text inside the render prompt. This template is the designated spec-info delegate for 'On-Pet Fit' (sort_order 4)."
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
          "lighting:flat_even_overhead_studio",
          "color:clean_white_or_light_grey",
          "texture:fabric_metal_leather_hardware_detail",
          "context:flat_lay_spec_studio"
        ],
        "extra_positive": "clean flat-lay spec photography of the uploaded pet wearable (harness, halter, collar or ID tag); product laid perfectly flat on white or light grey surface, all hardware buckles and adjustment points visible, product accurate in color and stitching, overhead even lighting, catalog-grade clarity, no pets in frame",
        "negative": "warped or stretched product, altered color or texture, duplicated product, pet anatomy in frame, wrinkled or bunched fabric obscuring hardware, harsh shadows creating ambiguity, uneven lighting, plastic sheen on metal hardware, cluttered background"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "pure white seamless flat surface, overhead even studio light",
          "pose": "product fully laid flat front view — all straps extended and hardware visible, symmetrical layout for dimension overlay",
          "composition": "full_body"
        },
        {
          "scene": "white surface, angled sidelight for texture depth",
          "pose": "product 3/4 close showing adjustment buckle and D-ring hardware detail",
          "composition": "closeup"
        },
        {
          "scene": "light grey surface, overhead even light",
          "pose": "product back view flat lay showing back-clip or spine detail, fully extended",
          "composition": "full_body"
        },
        {
          "scene": "white or soft marble surface, macro ring light",
          "pose": "extreme macro of the ID tag or engraving panel — surface texture and blank engraving zone clearly visible for text overlay compositing",
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
