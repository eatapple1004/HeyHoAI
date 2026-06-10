/**
 * Doppia recipe seed — ugc (ugc mode), 6 templates.
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list). recipes 테이블에 INSERT.
 * 자동 생성(레시피 프롬프트 워크플로). config.look.extra_positive/negative + shots[].scene/pose/composition 사용.
 */
module.exports = [
  {
    "mode": "ugc",
    "category": "Talking",
    "name": "Talking-Head Testimonial",
    "output_type": "reel",
    "credit_cost": 8,
    "sort_order": 1,
    "rationale": "Solo founders & affiliate creators turn one written line into a credible face-to-camera review reel — the default trust-builder of any UGC ad account.",
    "config": {
      "schema_version": 1,
      "mode": "ugc",
      "output": {
        "type": "reel",
        "count": 4,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "avatar",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Natural",
        "attributes": [
          "lighting:soft_window_key",
          "color:warm_neutral",
          "texture:skin_natural_pores",
          "context:home_interior_bokeh"
        ],
        "extra_positive": "authentic self-shot iPhone front-camera UGC look, spokesperson speaking directly to camera, natural eye contact and micro-expressions, hand gestures while talking; script_strategy: open with a relatable confession hook, deliver one clear benefit, close with a soft personal recommendation in a trustworthy conversational tone; perfectly synced mouth shapes to the spoken line, clean lip-sync, subtle head nods and blinks",
        "negative": "stiff frozen mouth, mismatched lip-sync, robotic delivery, extra fingers, warped face, plastic waxy skin, dead eyes, on-screen watermark, garbled caption text, studio overlit infomercial look, duplicated person"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright living room, soft sofa and plants blurred behind, large window key light camera-left",
          "pose": "seated facing camera, leaning in slightly, talking with open hand gesture",
          "composition": "closeup"
        },
        {
          "scene": "same living room, warm lamp fill, shallow depth bokeh",
          "pose": "natural shoulders-up delivery, light head tilt for emphasis",
          "composition": "medium_shot"
        },
        {
          "scene": "kitchen counter corner, morning daylight, cozy out-of-focus background",
          "pose": "holding the product up beside face mid-sentence, genuine smile",
          "composition": "closeup"
        },
        {
          "scene": "living room, golden afternoon light, relaxed setting",
          "pose": "wrapping up with a confident nod, pointing toward link/bio",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow push-in on face during hook line, lips synced",
          "static handheld micro-sway, talking with natural blinks",
          "gentle tilt up as product lifts into frame, lip-synced",
          "slow pull-back on CTA nod and point gesture"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "warm_lofi_confident",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },
  {
    "mode": "ugc",
    "category": "Demo",
    "name": "Product Demo",
    "output_type": "reel",
    "credit_cost": 8,
    "sort_order": 2,
    "rationale": "DTC brands & app marketers who need a creator to actually show the product in use — converts skeptics by pairing spoken claims with on-screen proof.",
    "config": {
      "schema_version": 1,
      "mode": "ugc",
      "output": {
        "type": "reel",
        "count": 4,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "avatar",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Natural",
        "attributes": [
          "lighting:bright_daylight_diffused",
          "color:clean_crisp",
          "texture:skin_natural_pores",
          "context:bright_desk_or_bathroom"
        ],
        "extra_positive": "hands-on UGC demonstration, spokesperson talks while physically using the product, alternating between face-to-camera lines and over-the-shoulder demo angles; script_strategy: state what it does in plain words, narrate each step as it happens on screen, end on the visible result; tight lip-sync on talking shots, natural step-by-step hand motion, real product interaction",
        "negative": "warped product, distorted label text, extra fingers, melted hands, floating disconnected product, mismatched lip-sync, frozen mouth, plastic skin, watermark, glitched UI text"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean bright desk by window, soft diffused daylight, minimal props",
          "pose": "facing camera introducing the product held in one hand, talking",
          "composition": "medium_shot"
        },
        {
          "scene": "close over-the-shoulder onto hands operating the product on the desk",
          "pose": "demonstrating step one, fingers interacting with product",
          "composition": "closeup"
        },
        {
          "scene": "bright bathroom or counter, crisp daylight, tiled background blurred",
          "pose": "applying or using product on self mid-demo",
          "composition": "closeup"
        },
        {
          "scene": "back at the desk, result shown to camera, bright airy mood",
          "pose": "presenting finished result with satisfied talking expression",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "static talking shot, slight push-in, lips synced",
          "top-down focus rack onto hands as they operate the product",
          "handheld follow of the application motion, lip-synced narration",
          "slow push-in on the visible result with confident talking"
        ],
        "duration_per_shot": 3,
        "transition": "whip",
        "music_mood": "upbeat_clean_energetic",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },
  {
    "mode": "ugc",
    "category": "Talking",
    "name": "Problem → Solution",
    "output_type": "reel",
    "credit_cost": 8,
    "sort_order": 3,
    "rationale": "Performance marketers running direct-response ads — the highest-converting UGC structure, leading with a pain point the viewer feels before revealing the fix.",
    "config": {
      "schema_version": 1,
      "mode": "ugc",
      "output": {
        "type": "reel",
        "count": 4,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "avatar",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Natural",
        "attributes": [
          "lighting:moody_to_bright_shift",
          "color:cool_then_warm",
          "texture:skin_natural_pores",
          "context:home_interior_realistic"
        ],
        "extra_positive": "two-act UGC ad, opens frustrated/relatable then turns relieved and upbeat once the product appears; spokesperson talking straight to camera with emotional shift; script_strategy: dramatize the problem in the first line ('if you also struggle with...'), pivot with 'so I tried this', land the payoff; lip-sync matched to each line, expressive face acting, believable emotional arc",
        "negative": "overacted fake emotion, mismatched lip-sync, frozen mouth, extra fingers, warped face, plastic skin, watermark, garbled captions, theatrical soap-opera lighting"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "dim cluttered room, cool flat overcast light, slightly desaturated",
          "pose": "frustrated face, hand on forehead, sighing while talking about the problem",
          "composition": "closeup"
        },
        {
          "scene": "same room, light beginning to warm as she reaches for the product",
          "pose": "skeptical-but-curious, holding product and reading it aloud",
          "composition": "medium_shot"
        },
        {
          "scene": "tidier brighter version of the room, warm window light",
          "pose": "using the product, expression shifting to relief, talking",
          "composition": "closeup"
        },
        {
          "scene": "bright cheerful living room, warm golden light",
          "pose": "happy and energized, recommending it with a smile and gesture",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "static slightly shaky handheld, heavy sigh, lips synced to the problem line",
          "slow push-in as she inspects the product, talking",
          "lighting brightens with gentle tilt up, relieved lip-synced delivery",
          "slow pull-back on upbeat CTA, confident talking and gesture"
        ],
        "duration_per_shot": 3,
        "transition": "fade",
        "music_mood": "tense_then_uplifting",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },
  {
    "mode": "ugc",
    "category": "Reaction",
    "name": "Unboxing Reaction",
    "output_type": "reel",
    "credit_cost": 8,
    "sort_order": 4,
    "rationale": "E-commerce sellers & PR-package brands — the candid 'just arrived' energy that makes a new drop feel desirable and real on TikTok/Reels.",
    "config": {
      "schema_version": 1,
      "mode": "ugc",
      "output": {
        "type": "reel",
        "count": 4,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "avatar",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Natural",
        "attributes": [
          "lighting:soft_natural_daylight",
          "color:warm_inviting",
          "texture:cardboard_and_skin_detail",
          "context:home_floor_or_table"
        ],
        "wardrobe": "casual loungewear",
        "extra_positive": "genuine first-look unboxing UGC, spokesperson reacting in real time while opening the package, mixing excited talking with gasps and close inspection; script_strategy: narrate the anticipation, react out loud to each reveal, finish with a verdict and link mention; lip-sync on spoken lines, authentic surprised facial reactions, real hands peeling tape and lifting items",
        "negative": "warped packaging, distorted product, extra fingers, mangled hands, fake-looking surprise, mismatched lip-sync, frozen mouth, plastic skin, watermark, glitched text on box"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "cozy floor or low table by a window, soft daylight, parcel in lap",
          "pose": "holding the sealed box, excited anticipation, talking to camera",
          "composition": "medium_shot"
        },
        {
          "scene": "top-down over the package as tape is peeled and flaps open",
          "pose": "hands opening the box, peeking inside",
          "composition": "closeup"
        },
        {
          "scene": "same setting, item lifted up into the light",
          "pose": "wide-eyed gasp reaction holding the product up, talking",
          "composition": "closeup"
        },
        {
          "scene": "warm living room, product placed beside her",
          "pose": "giving an enthusiastic verdict with a smile, pointing to bio",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "handheld sway with anticipation, lips synced to intro",
          "top-down push-in as the box opens, hands moving",
          "quick zoom on gasp reaction as product lifts, lip-synced",
          "slow pull-back on the talking verdict and CTA point"
        ],
        "duration_per_shot": 3,
        "transition": "whip",
        "music_mood": "playful_excited_pop",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },
  {
    "mode": "ugc",
    "category": "Talking",
    "name": "Street Interview",
    "output_type": "reel",
    "credit_cost": 8,
    "sort_order": 5,
    "rationale": "Brands wanting social-proof-at-scale — the vox-pop format that reads as unpaid, unscripted public opinion and lends instant third-party credibility.",
    "config": {
      "schema_version": 1,
      "mode": "ugc",
      "output": {
        "type": "reel",
        "count": 4,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "avatar",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Natural",
        "attributes": [
          "lighting:overcast_outdoor_even",
          "color:true_to_life",
          "texture:skin_natural_pores",
          "context:busy_city_street_bokeh"
        ],
        "extra_positive": "candid man-on-the-street interview, spokesperson answering an off-camera interviewer, held mic or phone just in frame, passersby blurred behind, slightly off-center framing like a real street clip; script_strategy: pose the question as a caption, deliver a casual unscripted-sounding answer, end on a punchy endorsement; lip-sync to the answer, natural conversational pauses, eyes flicking toward the off-camera interviewer",
        "negative": "overly polished studio look, mismatched lip-sync, frozen mouth, extra fingers, warped mic, distorted background faces, plastic skin, watermark, garbled captions, posed model stiffness"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "busy downtown sidewalk, soft overcast daylight, blurred pedestrians and storefronts",
          "pose": "looking slightly off-camera at interviewer, mid-answer with a laugh",
          "composition": "medium_shot"
        },
        {
          "scene": "same street corner, foam-tip mic edging into frame",
          "pose": "gesturing while making a point, animated talking",
          "composition": "closeup"
        },
        {
          "scene": "crosswalk or plaza background, natural city light",
          "pose": "holding the product up to show the interviewer, talking",
          "composition": "medium_shot"
        },
        {
          "scene": "street setting, framing recenters",
          "pose": "nodding with a final confident endorsement to camera",
          "composition": "closeup"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "handheld documentary sway, lips synced to opening answer",
          "slight reframe push-in, animated talking and gesture",
          "tilt to follow product lifting into frame, lip-synced",
          "static handheld on the closing endorsement nod"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "neutral_ambient_street",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },
  {
    "mode": "ugc",
    "category": "Demo",
    "name": "Hook + CTA Ad",
    "output_type": "reel",
    "credit_cost": 8,
    "sort_order": 6,
    "rationale": "Paid-ads buyers optimizing for scroll-stop and clicks — a tight punchy structure built around a 1-second hook and a hard call-to-action close.",
    "config": {
      "schema_version": 1,
      "mode": "ugc",
      "output": {
        "type": "reel",
        "count": 4,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "avatar",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Natural",
        "attributes": [
          "lighting:punchy_bright_key",
          "color:vivid_high_contrast",
          "texture:skin_natural_pores",
          "context:clean_modern_interior"
        ],
        "extra_positive": "high-energy direct-response UGC ad, spokesperson delivers a pattern-interrupt hook in the first shot then drives to a clear call-to-action; fast pacing, big expressions, product hero moment in the middle; script_strategy: lead with a scroll-stopping hook line ('stop scrolling if you...'), stack two quick benefits, end with a direct CTA ('tap the link now'); crisp lip-sync on every line, energetic delivery, emphatic hand gestures",
        "negative": "low energy flat delivery, mismatched lip-sync, frozen mouth, extra fingers, warped product, plastic skin, watermark, glitched caption text, dim muddy lighting"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean modern room, bright punchy key light, bold simple background",
          "pose": "pointing finger at camera delivering the hook, wide eyes, talking",
          "composition": "closeup"
        },
        {
          "scene": "same setup, product raised to face level",
          "pose": "presenting product as the hero, talking benefit one",
          "composition": "medium_shot"
        },
        {
          "scene": "tight on the product in hands, crisp highlight",
          "pose": "product turned toward camera while narrating benefit two",
          "composition": "closeup"
        },
        {
          "scene": "back on spokesperson, bright energetic mood",
          "pose": "emphatic point toward link/bio, big smile, CTA delivery",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "fast snap zoom-in on the hook line, lips synced",
          "quick push-in as product lifts to frame, lip-synced",
          "rack focus onto product in hands, talking",
          "snappy pull-back on the CTA point gesture, lip-synced"
        ],
        "duration_per_shot": 3,
        "transition": "whip",
        "music_mood": "high_energy_trap_pop",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  }
];
