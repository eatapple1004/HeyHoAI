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
 *
 * v2.1 → prompt-negatives (死필드 이관, 2026-06-10):
 *  - MIGRATE: every template negative moved from dead field look.negative → look.extra_negative
 *             (the only negative field resolver L148 actually reads; look.negative was unparsed = not reaching the engine).
 *  - REFINE : stripped SAFETY_NEGATIVE_PROMPT duplicates (deformed/blurry/watermark/text/logo/extra fingers/bad anatomy);
 *             removed stray positive phrasings that had leaked into the negative list (e.g. "correct limb count",
 *             "no warped muzzle", "natural fur no melting"); kept only pet/section-specific defects.
 *  - HARDEN: identity-drift guards on reels (product/pet morph between frames); hand-anatomy guards on the hands-on reel
 *             (six+ fingers, fused/webbed); text_overlay templates leave text/logo to global SAFETY (noted in render_notes).
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
      "render_notes": "text_overlay=true — any sizing / spec text must be composited in post; do NOT embed in the render prompt. SAFETY_NEGATIVE_PROMPT globally blocks text/logo, so they are intentionally omitted from extra_negative.",
      "flags": [],
      "overlay_spec": {
        "layer": "text_overlay",
        "elements": ["size_badge", "spec_callouts"],
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
        "extra_positive": "uploaded pet product as the hero, identical to reference (same shape, color, label, proportions, material finish); clean editorial product photography on a pure white or soft linen backdrop, soft-box beauty-dish key light with a fill scrim and a subtle rim for edge separation, shot on 100mm f/8 for full front-to-back sharpness, a soft contact shadow grounding the product, packaging and branding crisp and fully readable, magazine-grade still life, no pets in frame, pure product star; keep a clean uncluttered margin reserved for a composited spec or size badge",
        "extra_negative": "warped or melted product shape, distorted packaging, wrong proportions, altered product color, duplicated product, pet anatomy in frame, dirty or cluttered background, harsh blown specular reflections, oversaturated HDR, plastic sheen, blown highlights"
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
        "extra_positive": "uploaded pet product, identical to reference (same shape, color, proportions), placed naturally beside a happy, photogenic dog or cat in a sunlit cozy home; soft golden window key light with gentle fill, shallow depth of field on 50mm f/1.8, creamy bokeh, lived-in warm domestic mood, the pet naturally proportioned with correct limb and paw count and soft realistic fur, heart-warming candid pet-and-product moment, product staying crisp and true-to-shape with original colors intact",
        "extra_negative": "warped or distorted pet anatomy, fused paws, unnatural stiff fur flow, plastic-looking fur, dead glassy eyes, warped or melted product, altered product color, duplicated product, cluttered messy background, oversaturated HDR"
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
        "extra_positive": "extreme macro food photography of the uploaded pet treat, identical to reference in shape and color; 100mm macro lens at f/8 with focus-stacking for razor-sharp front-to-back surface detail, raking hard sidelight carving out crunchy grain and ingredient texture, a clean scatter of matching crumbs and natural ingredient cues, dark moody studio backdrop with deep falloff, premium gourmet pet-treat presentation, appetizing true-to-life color and form",
        "extra_negative": "missed focus on the key surface texture, warped or recolored treat, altered shape, fake plastic CGI texture, over-sharpened halos, oversaturated cartoonish color, unappetizing dull color, dust spots, busy distracting background, duplicated product, blown specular highlights"
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
        "extra_positive": "CRITICAL: the worn product stays identical to reference (same color, hardware, proportions) and the same well-formed dog across every shot, no morph or drift; realistic on-pet wearable (collar, harness, bandana or apparel) on a well-groomed photogenic dog, fitted naturally with correct drape, buckle and proportion; soft natural light, 85mm portrait look at f/4, clean catalog-ready styling, accurate product color and hardware, believable contact with the fur, the dog anatomically correct with four legs, correct paw count and a single natural muzzle, natural fur flow",
        "extra_negative": "product floating off the body, wrong scale or fit, warped or stretched buckles and straps, recolored or altered product, distorted pet anatomy, warped muzzle, fabric fused or melting into fur, plastic-looking fur, harsh unflattering shadows"
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
        "extra_positive": "CRITICAL: the same dog and the same product, identical to reference in shape and color, across both frames — locked pet identity, no morph or drift; playful pet-toy interaction reel, shot 1 builds anticipation with the product as hero teaser, shot 2 is a close joyful reaction as the pet paws, noses and gently mouths the toy in tight medium-shot; bright natural daylight key with soft fill, handheld energy, shot on 50mm f/2.8, crisp realistic fur, the dog naturally proportioned with correct limb count",
        "extra_negative": "warped or stretched product, altered product color, product drifting or morphing between frames, pet identity drift between frames, distorted pet anatomy, motion-blur smearing the product into mush, choppy unnatural movement, dull flat lighting, plastic-looking fur"
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
        "extra_positive": "CRITICAL: the same pet and the same product, identical to reference in shape and color, across both frames — locked pet identity, no morph or drift; UGC talking-pet skit, shot 1 a clean product B-roll reveal, shot 2 an expressive dog or cat with subtle minimal mouth movement appearing to speak ONE or TWO short sentences to camera; bright friendly selfie-style indoor light with soft fill, shot on 35mm f/2.8, vlog framing, the pet keeping a single natural muzzle with consistent mouth and tooth shape across both frames",
        "extra_negative": "grotesque uncanny mouth or muzzle warping, human-like mouth morph, extra eyes or teeth, tooth morph, lip-sync desync smearing the muzzle, pet identity drift between frames, melting or plastic-looking fur, warped or recolored product, jittery flicker, dull flat lighting"
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
        "extra_positive": "single cinematic close-up of the uploaded pet product, identical to reference in shape and color, performing one satisfying action — water flowing from a dispenser, treats dropping, a button click, a lid opening; ultra-clean minimal backdrop, soft directional studio light with a gentle rim, shot on 100mm f/4 with a slow rack focus onto the action point, slow-motion feel, ASMR-adjacent tactile quality, no pets in frame",
        "extra_negative": "warped or melted product, altered product color, duplicated product, product morphing mid-action, pet anatomy in frame, cluttered background, harsh blown reflections, oversaturated HDR, shaky or stuttering motion"
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
        "extra_positive": "CRITICAL: the same product, identical to reference in shape and color, across both frames; clean hands-on demo reel where a single well-formed hand — exactly five natural fingers, anatomically correct grip — is cropped partially (wrist to mid-finger, fingertips out of frame) pouring, scooping or unboxing the product; kitchen counter or minimal studio surface, bright natural light, shot on 50mm f/5.6, satisfying tactile demo energy, product staying perfectly accurate in color and shape",
        "extra_negative": "six or more fingers, fused or webbed fingers, wrong finger count, all fingertips fully visible in frame, hand features changing between frames, pet anatomy in frame, warped or recolored product, duplicated product, cluttered messy background, harsh shadows"
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
      "render_notes": "text_overlay=true — device screens must be rendered blank/off or with a minimal glowing rectangle placeholder. All UI content (app screenshots, GPS maps, LCD readouts) must be composited in post via text_overlay pipeline. Do NOT generate readable screen text in the render prompt. SAFETY_NEGATIVE_PROMPT globally blocks text/logo, so they are intentionally omitted from extra_negative.",
      "overlay_spec": {
        "layer": "text_overlay",
        "elements": ["app_ui_screenshot", "screen_readout"],
        "font": "system_sans",
        "position": "device_screen"
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
        "extra_positive": "clean tech product photography of the uploaded pet device, identical to reference (same body shape, color, ports, proportions); device screen rendered as a blank glowing rectangle placeholder with a clean uncluttered area reserved for composited UI, crisp cool-toned soft-box key light with a subtle blue rim, shot on 50mm f/8, modern minimalist tech aesthetic, no pets in frame",
        "extra_negative": "screen showing rendered content instead of a blank glowing placeholder, garbled hallucinated on-screen graphics, warped device body, altered device color, duplicated device, distorted device proportions, pet anatomy in frame, dirty cluttered background, harsh blown reflections, plastic sheen"
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
      "render_notes": "text_overlay=true — all size callouts, dimension annotations, and scale cue labels must be composited in post. Render the product accurately sized relative to the room furniture; do NOT generate measurement text or dimension arrows inside the render prompt. SAFETY_NEGATIVE_PROMPT globally blocks text/logo, so they are intentionally omitted from extra_negative.",
      "overlay_spec": {
        "layer": "text_overlay",
        "elements": ["dimension_callouts", "scale_label"],
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
        "extra_positive": "uploaded pet product, identical to reference in shape and color, placed in a real living space at accurate scale relative to the surrounding furniture; the room environment provides a natural size reference, shot on a 28-35mm wide lens at f/8 for honest spatial proportion, warm interior ambient light, inviting home mood, clean edge margins reserved for composited dimension callouts, no pets in frame unless the product is pet furniture",
        "extra_negative": "warped or shrunken product, incorrect scale relative to surrounding furniture, altered product color, duplicated product, floating product, distorted room perspective, pet anatomy in frame (unless product is pet furniture), cluttered distracting background, harsh flash lighting, oversaturated HDR"
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
        "extra_positive": "uploaded product, identical to reference in shape and color, installed or placed naturally inside a beautifully lit aquarium, vivarium or terrarium; lush aquatic plants or earthy moss and rock substrate, atmospheric backlit habitat glow with soft ambient fill, shot on 60mm macro at f/5.6 with clean water clarity, cinematic nature-documentary feel, genuine ecosystem ambiance, plants and static substrate only with no live animals in frame, photoreal lighting without exaggerated CGI",
        "extra_negative": "warped or recolored product, duplicated product, cartoonish oversaturated color, fake plastic-looking vegetation, anachronistic out-of-place objects, unrequested live animals introducing morph risk, murky dirty water, cluttered ugly background, harsh flash lighting, broken glass distortion artifacts"
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
      "render_notes": "text_overlay=true — all dimension callouts, engraving preview text, size-range tables, and measurement arrows must be composited in post. Render the product flat or on a neutral surface; do NOT generate measurement numbers or engraving text inside the render prompt. SAFETY_NEGATIVE_PROMPT globally blocks text/logo, so they are intentionally omitted from extra_negative. This template is the designated spec-info delegate for 'On-Pet Fit' (sort_order 4).",
      "overlay_spec": {
        "layer": "text_overlay",
        "elements": ["measurement_callouts", "size_table", "engraving_preview"],
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
        "extra_positive": "clean flat-lay spec photography of the uploaded pet wearable (harness, halter, collar or ID tag), identical to reference (same color, stitching, hardware, proportions); product laid perfectly flat on a white or light grey surface, all buckles and adjustment points clearly visible, even overhead key light with a soft fill to keep hardware legible, shot on 50mm f/8 top-down, catalog-grade clarity, clean margins reserved for composited dimension lines and engraving callouts, no pets in frame",
        "extra_negative": "warped or stretched product, altered color or texture, duplicated product, warped buckles or D-ring hardware, pet anatomy in frame, wrinkled or bunched fabric obscuring hardware, harsh shadows creating ambiguity, uneven lighting, plastic sheen on metal hardware, cluttered background"
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
