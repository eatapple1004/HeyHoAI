/**
 * Doppia recipe seed — influencer (influencer mode), 6 templates.
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list). recipes 테이블에 INSERT.
 * 자동 생성(레시피 프롬프트 워크플로). config.look.extra_positive/negative + shots[].scene/pose/composition 사용.
 */
module.exports = [
  {
    "mode": "influencer",
    "category": "Reels",
    "name": "GRWM Aurora Reel",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 1,
    "rationale": "Beauty/lifestyle creators filming a 'get ready with me' — three-beat vanity-to-reveal arc is the highest-saving reel format on Reels/TikTok.",
    "config": {
      "schema_version": 1,
      "mode": "influencer",
      "output": {
        "type": "reel",
        "count": 3,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "face",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Glamour",
        "wardrobe": "going-out satin slip top, dewy fresh face transitioning to full glam",
        "attributes": [
          "lighting:ring_light",
          "color:aurora_pastel_gradient",
          "texture:skin_dewy",
          "context:vanity_indoor"
        ],
        "extra_positive": "beauty influencer GRWM aesthetic, iridescent aurora pastel color wash (lilac-mint-peach) bouncing off the mirror, soft beauty-dish key with hair-light rim, shot on 50mm at f1.8, shallow depth of field, clean creamy bokeh, glossy reflective vanity surface",
        "negative": "extra fingers, deformed hands, warped face, asymmetric eyes, plastic skin, over-smoothed CGI look, harsh flash, blown highlights, text artifacts, watermark, duplicate features, identity drift between shots"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright vanity mirror framed by warm bulb lights, aurora pastel glow",
          "pose": "leaning toward mirror, fresh bare face, soft inviting eye contact",
          "composition": "closeup"
        },
        {
          "scene": "mid-routine at the vanity, brushes and palette in frame",
          "pose": "applying liquid blush with fingertip, eyes down in focus",
          "composition": "closeup"
        },
        {
          "scene": "full outfit-and-makeup reveal in a bedroom full-length mirror",
          "pose": "confident final turn, hand on hip, satisfied smile",
          "composition": "full_body"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow push-in toward the mirror reflection",
          "macro tilt following the brush across the cheek",
          "orbit reveal circling to the styled final look"
        ],
        "duration_per_shot": 3,
        "transition": "whip",
        "music_mood": "upbeat dreamy synth-pop",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },
  {
    "mode": "influencer",
    "category": "Feed",
    "name": "Candid Photo Dump",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "Creators posting a casual IG carousel 'dump' — four off-guard 35mm frames read as authentic, the bread-and-butter low-cost feed filler.",
    "config": {
      "schema_version": 1,
      "mode": "influencer",
      "output": {
        "type": "image_set",
        "count": 4,
        "aspect_ratio": "4:5"
      },
      "subject": {
        "type": "face",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Film",
        "wardrobe": "relaxed everyday streetwear, oversized tee and baggy jeans",
        "attributes": [
          "lighting:natural_soft",
          "color:film_fuji",
          "texture:grain_film",
          "context:street_urban"
        ],
        "extra_positive": "candid photo-dump aesthetic, shot on a 35mm point-and-shoot with faint on-camera flash, slightly imperfect framing, motion-blur edges, authentic unposed energy, Fuji film color science, subtle grain, true-to-life skin",
        "negative": "extra fingers, deformed hands, warped face, plastic over-retouched skin, studio polish, perfect symmetry, stiff posed look, text artifacts, watermark, oversaturation, identity drift"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "city sidewalk at midday, blurred passers-by behind",
          "pose": "mid-laugh glancing off-camera, hair caught in motion",
          "composition": "medium_shot"
        },
        {
          "scene": "diner booth with neon sign reflection",
          "pose": "candid bite of food, eyes down, relaxed",
          "composition": "closeup"
        },
        {
          "scene": "crosswalk with flash-lit night street",
          "pose": "walking toward camera, slight motion blur",
          "composition": "full_body"
        },
        {
          "scene": "thrift-store mirror selfie corner",
          "pose": "casual phone-up mirror selfie, soft smirk",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },
  {
    "mode": "influencer",
    "category": "Fashion",
    "name": "Fit Check On-Model",
    "output_type": "image_set",
    "credit_cost": 4,
    "sort_order": 3,
    "rationale": "Fashion creators doing an OOTD 'fit check' — four full-body editorial angles of one styled outfit, the go-to for outfit-of-the-day posts.",
    "config": {
      "schema_version": 1,
      "mode": "influencer",
      "output": {
        "type": "image_set",
        "count": 4,
        "aspect_ratio": "4:5"
      },
      "subject": {
        "type": "face",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Fashion",
        "wardrobe": "head-to-toe styled outfit: structured blazer, wide-leg trousers, statement boots and bag",
        "attributes": [
          "lighting:soft_daylight_window",
          "color:neutral_editorial",
          "texture:fabric_detail",
          "context:minimal_studio"
        ],
        "extra_positive": "OOTD fit-check editorial, full-length fashion photography, large soft north-facing window key with subtle bounce fill, 85mm at f4 for true fabric drape, crisp garment texture and seams, neutral concrete or seamless backdrop, magazine styling, accurate body proportions",
        "negative": "extra fingers, deformed hands, warped face, distorted body proportions, melted or smeared garment texture, wardrobe inconsistency between shots, plastic skin, text artifacts, watermark, identity drift"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "minimal seamless studio, soft window light",
          "pose": "straight-on confident stance, full outfit visible",
          "composition": "full_body"
        },
        {
          "scene": "concrete-wall studio corner",
          "pose": "3/4 turn showing the silhouette and bag",
          "composition": "full_body"
        },
        {
          "scene": "neutral backdrop, low angle",
          "pose": "mid-stride walking shot, coat in motion",
          "composition": "full_body"
        },
        {
          "scene": "studio detail vignette",
          "pose": "hands adjusting cuff, accessories in focus",
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
    "mode": "influencer",
    "category": "Reels",
    "name": "Trending Lip-Sync",
    "output_type": "reel",
    "credit_cost": 8,
    "sort_order": 4,
    "rationale": "Creators chasing a trending audio with a punchy lip-sync — four high-energy beats with expressive front-on framing, the most engagement-driving (and priciest) reel.",
    "config": {
      "schema_version": 1,
      "mode": "influencer",
      "output": {
        "type": "reel",
        "count": 4,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "face",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Glamour",
        "wardrobe": "trendy crop top and cargo pants, dynamic streetwear",
        "attributes": [
          "lighting:rgb_accent_mix",
          "color:vibrant_saturated",
          "texture:skin_smooth",
          "context:bedroom_creator"
        ],
        "extra_positive": "trending TikTok lip-sync reel, expressive mouth-shapes synced to a beat, punchy RGB accent lighting (magenta-cyan) over soft key, front-on phone-style framing at chest height, energetic gen-z creator vibe, crisp eyes, vibrant but natural skin",
        "negative": "extra fingers, deformed hands, warped or melting mouth, misaligned teeth, plastic skin, dead lifeless eyes, jittery face warp between frames, text artifacts, watermark, identity drift, uncanny smile"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "creator bedroom with RGB strip lighting, beat-drop intro",
          "pose": "wide-eyed hook expression, finger-point to camera",
          "composition": "closeup"
        },
        {
          "scene": "same room, mid-verse energy",
          "pose": "lip-syncing with animated hand gesture near face",
          "composition": "medium_shot"
        },
        {
          "scene": "quick angle change, side RGB wash",
          "pose": "head-tilt mouthing the lyric, playful smirk",
          "composition": "closeup"
        },
        {
          "scene": "chorus payoff, full RGB glow",
          "pose": "confident point-and-wink on the beat",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "snap zoom-in on the beat drop",
          "handheld sway following the gesture",
          "quick whip-tilt with the head movement",
          "punch-in on the wink for the chorus hit"
        ],
        "duration_per_shot": 3,
        "transition": "whip",
        "music_mood": "high-energy trending beat",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },
  {
    "mode": "influencer",
    "category": "Travel",
    "name": "Golden Hour Anywhere",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 5,
    "rationale": "Travel/lifestyle creators who want that universally-flattering sunset glow without a trip — four warm candid frames that perform on any feed.",
    "config": {
      "schema_version": 1,
      "mode": "influencer",
      "output": {
        "type": "image_set",
        "count": 4,
        "aspect_ratio": "4:5"
      },
      "subject": {
        "type": "face",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Film",
        "wardrobe": "flowy linen dress or relaxed linen shirt, light layers",
        "attributes": [
          "lighting:golden_hour",
          "color:film_kodak",
          "texture:grain_film",
          "context:outdoor_scenic"
        ],
        "extra_positive": "magic-hour travel mood, warm low-angle sun with golden backlit hair rim and gentle lens flare, long soft shadows, Kodak Portra warmth, dreamy wanderlust atmosphere, 50mm at f2, creamy bokeh, sun-kissed natural skin",
        "negative": "extra fingers, deformed hands, warped face, harsh midday shadows, blue cold cast, overexposed sky clipping, plastic skin, double sun, text artifacts, watermark, identity drift"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "open beach at golden hour, ocean waves and sun-flare",
          "pose": "walking barefoot along the shoreline, candid",
          "composition": "full_body"
        },
        {
          "scene": "rooftop terrace overlooking a city skyline at sunset",
          "pose": "leaning on railing, gazing at the horizon",
          "composition": "medium_shot"
        },
        {
          "scene": "field of tall grass backlit by the setting sun",
          "pose": "looking back over shoulder, hair in warm light",
          "composition": "medium_shot"
        },
        {
          "scene": "seaside cafe window catching the last light",
          "pose": "holding a drink, soft contented smile",
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
    "mode": "influencer",
    "category": "Story",
    "name": "Blurcore BTS Story",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 6,
    "rationale": "Creators dropping a 'blurcore' behind-the-scenes Story — three intentionally-blurry, motion-led vertical beats that feel raw and in-the-moment for Stories.",
    "config": {
      "schema_version": 1,
      "mode": "influencer",
      "output": {
        "type": "reel",
        "count": 3,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "face",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Film",
        "wardrobe": "casual hoodie or relaxed tee, off-duty creator look",
        "attributes": [
          "lighting:mixed_practical_neon",
          "color:moody_desaturated",
          "texture:motion_blur",
          "context:behind_the_scenes"
        ],
        "extra_positive": "blurcore behind-the-scenes Story aesthetic, intentional motion blur and soft focus, handheld phone-shot energy, mixed practical and neon ambient light, smeared highlight bokeh, grainy low-light film texture, raw in-the-moment candid feel, subject still recognizable through the blur",
        "negative": "extra fingers, deformed hands, fully unrecognizable face, tack-sharp studio polish, clean clinical look, plastic skin, oversaturation, text artifacts, watermark, identity drift, double-exposure ghosting of the face"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "backstage hallway with neon practical lights, blurred motion",
          "pose": "walking past camera, half-turned glance",
          "composition": "medium_shot"
        },
        {
          "scene": "dim set with equipment and string-light bokeh",
          "pose": "candid laugh mid-conversation, soft focus",
          "composition": "closeup"
        },
        {
          "scene": "car window night drive, streaking city lights",
          "pose": "leaning head on hand, looking out the window",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "handheld whip-pan following the walk-by",
          "soft rack-focus drifting onto the face",
          "slow drift with passing light streaks across the frame"
        ],
        "duration_per_shot": 3,
        "transition": "fade",
        "music_mood": "moody lo-fi ambient",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  }
];
