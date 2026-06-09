/**
 * Doppia recipe seed — influencer (influencer mode), v2, 6 templates.
 * 통합 스키마 v1. recipes 테이블에 INSERT.
 * v2 변경: Lip-Sync 제거, Blurcore BTS 제거 → Product Haul Reel + Day-in-Life Reel 신규 추가.
 * 가격 캐노니컬 수정: image_set count×0.5, reel shots×2.
 */
module.exports = [
  {
    "mode": "influencer",
    "category": "Feed",
    "name": "Candid Photo Dump",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "크리에이터의 IG 캐러셀 '덤프' — 자연스러운 35mm 스냅 4장, 가장 저렴한 피드 필러. 엔트리 티어 ◈2 앵커.",
    "meta": {
      "change": "keep",
      "render_notes": null
    },
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
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "OOTD 핏 체크 — 스타일드 아웃핏 4컷 에디토리얼. 패션 크리에이터 일상 피드의 핵심 포맷. ◈2 정가(4×0.5).",
    "meta": {
      "change": "repriced",
      "render_notes": null
    },
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
    "category": "Travel",
    "name": "Golden Hour Anywhere",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 3,
    "rationale": "여행/라이프스타일 크리에이터를 위한 골든아워 무드 4컷. 어디서든 석양 감성. ◈2 정가(4×0.5).",
    "meta": {
      "change": "repriced",
      "render_notes": null
    },
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
    "category": "Reels",
    "name": "GRWM Aurora Reel",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 4,
    "rationale": "뷰티/라이프스타일 크리에이터 GRWM — 바닐라 투 풀글램 3비트 아크, Reels/TikTok 저장율 최상위 포맷.",
    "meta": {
      "change": "keep",
      "render_notes": null
    },
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
    "category": "Reels",
    "name": "Day-in-Life Reel",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 5,
    "rationale": "브이로그 '하루 일과' — 2샷으로 아침~저녁 흐름을 담는 라이프스타일 Reel. ◈4 저가 릴 티어, 일상 팔로워 연결 JTBD.",
    "meta": {
      "change": "new",
      "render_notes": null
    },
    "config": {
      "schema_version": 1,
      "mode": "influencer",
      "output": {
        "type": "reel",
        "count": 2,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "face",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Film",
        "wardrobe": "casual transitional layers — morning: cozy knit; evening: relaxed blazer or going-out top",
        "attributes": [
          "lighting:natural_soft",
          "color:film_fuji",
          "texture:grain_film",
          "context:lifestyle_mixed"
        ],
        "extra_positive": "day-in-life vlog aesthetic, two-beat morning-to-evening arc, authentic candid energy, 35mm handheld framing, warm natural light morphing into ambient evening glow, true-to-life skin tones, unposed organic expressions",
        "negative": "extra fingers, deformed hands, warped face, plastic retouched skin, overly polished studio look, text artifacts, watermark, identity drift between shots, inconsistent lighting within a single shot"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "sun-lit kitchen or cafe in the morning, coffee cup in hand",
          "pose": "relaxed candid sip, soft morning eye contact with camera",
          "composition": "medium_shot"
        },
        {
          "scene": "evening — city street or rooftop with ambient warm lights",
          "pose": "mid-laugh candid, golden-hour or neon ambient wrap",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "gentle slow zoom-in, handheld warmth",
          "slow drift pull-back with bokeh city lights"
        ],
        "duration_per_shot": 4,
        "transition": "cut",
        "music_mood": "mellow lo-fi indie",
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
    "category": "Reels",
    "name": "Product Haul Reel",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 6,
    "rationale": "유료 협찬/어필리에이트 핵심 JTBD — 크리에이터가 제품을 들고 소개하는 3샷 haul reel. 제품은 두 번째 레퍼런스로 공급; 정체성 앵커는 셀피(identity_lock). 손/손가락 리스크 있음, experimental 플래그.",
    "meta": {
      "change": "new",
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Shot 2 features a hand holding the product close to face. Engine safety-negative already strips text/logo from product; if brand mark is required on-screen, post-process via deterministic text-overlay layer after render (config.text_overlay=true). Review hand anatomy on every output — reject if fingers are malformed."
    },
    "config": {
      "schema_version": 1,
      "mode": "influencer",
      "text_overlay": true,
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
        "style_preset": "Lifestyle",
        "wardrobe": "polished casual — fitted top or light jacket, clean minimal accessories",
        "attributes": [
          "lighting:soft_studio_key",
          "color:clean_neutral_warm",
          "texture:skin_natural",
          "context:lifestyle_indoor"
        ],
        "extra_positive": "influencer product haul reel, creator casually presenting and reacting to a product, authentic try-on and unboxing energy, clean bright key light (soft box), warm neutral background, direct-to-camera engagement, natural persuasive enthusiasm, 85mm portrait lens look",
        "negative": "extra fingers, deformed hands, single hand showing exactly five fingers, melted or fused fingers, floating disembodied hand, warped face, plastic skin, harsh shadows, cluttered background, identity drift between shots"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright minimal studio or clean home interior, product on surface in foreground",
          "pose": "direct-to-camera intro, gesturing toward product with open hand, enthusiastic expression",
          "composition": "medium_shot"
        },
        {
          "scene": "close-in on creator and product — holding it up at chest height near face",
          "pose": "one hand holds product toward camera, eyes wide with genuine reaction",
          "composition": "closeup"
        },
        {
          "scene": "same clean interior, product set aside — creator wrapping up with a smile",
          "pose": "relaxed CTA pose, thumbs-up or soft point to camera, warm close",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow push-in on creator and product",
          "gentle tilt down from face to product then back up",
          "slow pull-back ending on the creator's full expression"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "bright upbeat lifestyle",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  }
];
