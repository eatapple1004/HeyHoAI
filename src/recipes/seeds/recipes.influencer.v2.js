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
        "extra_positive": "CRITICAL: same person across all frames, locked facial identity, consistent features, no morph or drift, candid photo-dump aesthetic, shot on a 35mm point-and-shoot with a fixed wide-ish prime around 28-35mm at f4-f5.6 for deep-ish casual focus, faint on-camera flash falloff with hard near-subject shadows, slightly imperfect off-kilter framing, mild handheld motion-blur edges, authentic unposed energy, Fuji film color science, subtle organic grain, true-to-life unretouched skin, single well-formed hand on the phone with exactly five natural fingers, anatomically correct grip and visible fingernails, nostalgic spontaneous mood",
        "extra_negative": "warped or asymmetric face, plastic over-retouched skin, studio-polished glamour finish, perfect airbrushed symmetry, stiff posed look, oversaturation, identity drift between shots, six fingers, fused or webbed digits, missing fingers, malformed grip"
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
        "extra_positive": "CRITICAL: same person across all frames, locked facial identity, consistent features, no morph or drift, identical wardrobe and styling across all four shots, OOTD fit-check editorial look, large soft window key with subtle bounce fill, 85mm at f4 for true fabric drape with shallow background separation, crisp garment texture and seams, magazine styling, accurate body proportions, on the cuff closeup a single well-formed hand with exactly five natural fingers, anatomically correct grip, visible fingernails",
        "extra_negative": "distorted body proportions, melted or smeared garment texture, warped seams, color shift or mismatched print on fabric, stiff unnatural drape, wardrobe inconsistency between shots, plastic skin, warped face, identity drift between shots, six fingers, fused or webbed digits, missing fingers, malformed grip"
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
        "extra_positive": "CRITICAL: same person across all frames, locked facial identity, consistent features, no morph or drift, magic-hour travel mood, warm low-angle sun with golden backlit hair rim and gentle lens flare, long soft shadows, Kodak Portra warmth, dreamy wanderlust atmosphere, 50mm prime at f2, shallow depth of field with creamy bokeh and sharp eye focus, sun-kissed natural skin, single well-formed hand with exactly five natural fingers and anatomically correct grip on the drink in the cafe shot, visible fingernails",
        "extra_negative": "harsh midday top-down shadows, blue cold color cast, overexposed clipped sky, double sun or duplicated lens flare, muddy underexposed shadows, plastic skin, warped face, identity drift between shots, six fingers, fused or webbed digits, malformed grip on the glass"
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
    "category": "Reel",
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
        "extra_positive": "CRITICAL: same person across all frames, locked facial identity, consistent features, no morph or drift, identical face geometry from bare-skin opener through full-glam reveal, beauty influencer GRWM aesthetic, iridescent aurora pastel color wash (lilac-mint-peach) bouncing off the mirror, soft beauty-dish key with hair-light rim, shot on 50mm at f1.8 with a macro pass for the fingertip blush moment, shallow depth of field, clean creamy bokeh, glossy reflective vanity surface, single well-formed hand, exactly five natural fingers, anatomically correct grip dabbing blush onto the cheek, visible fingernails, polished editorial mood",
        "extra_negative": "asymmetric or mismatched eyes, plastic over-smoothed CGI skin, harsh on-camera flash, blown-out highlights, duplicate facial features, mouth or tooth morph between frames, patchy cakey makeup, warped face, identity drift between shots, six fingers, fused or webbed digits, missing fingers, floating disembodied hand, malformed grip"
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
        "music_mood": "dreamy synth-pop, 110-122 bpm, airy analog synth pads with plucked arpeggios soft side-chained kick and shimmer hi-hats, bright uplifting build that swells on the final reveal, reference vibe early Dua Lipa meets glossy beauty-vlog intro",
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
    "category": "Reel",
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
        "extra_positive": "CRITICAL: same person across all frames, locked facial identity, consistent features, no morph or drift, day-in-life vlog aesthetic, two-beat morning-to-evening arc, authentic candid energy, 35mm handheld framing with shallow f/2 depth of field and soft falloff bokeh, warm natural light morphing into ambient evening glow, true-to-life skin tones, unposed organic expressions, single well-formed hand cradling the coffee cup, exactly five natural fingers, anatomically correct grip, visible fingernails",
        "extra_negative": "plastic retouched skin, overly polished studio look, flickering or inconsistent lighting within a single shot, warped face, mouth or tooth morph between frames, identity drift between shots, six fingers, fused or webbed digits, malformed grip on the cup"
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
        "music_mood": "mellow lo-fi indie, 70-85 bpm, warm Rhodes/electric piano, muted nylon guitar, soft vinyl-crackle drums and mellow upright bass, low-key intimate energy lifting slightly toward the evening beat, reference vibe early Tom Misch meets a cozy chillhop study mix",
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
    "category": "Reel",
    "name": "Product Haul Reel",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 6,
    "rationale": "유료 협찬/어필리에이트 핵심 JTBD — 크리에이터가 제품을 들고 소개하는 3샷 haul reel. 제품은 두 번째 레퍼런스로 공급; 정체성 앵커는 셀피(identity_lock). 손/손가락 리스크 있음, experimental 플래그.",
    "meta": {
      "change": "new",
      "flags": ["experimental", "needs_human_review"],
      "overlay_spec": {
        "layer": "composited_above_render",
        "position": "title badge upper-third, caption lower-third, both within reserved uncluttered safe zones clear of face and product-holding hand",
        "elements": [
          { "type": "brand_badge", "role": "logo/wordmark", "anchor": "top-right", "safe_margin_pct": 8, "appears_on_shots": [1, 2, 3], "note": "deterministic post-process glyph layer, not AI-rendered" },
          { "type": "caption", "role": "product name / hook text", "anchor": "bottom-center", "safe_margin_pct": 10, "max_lines": 2, "per_shot_text": ["intro hook", "reaction callout", "CTA"], "note": "deterministic post-process glyph layer, not AI-rendered" },
          { "type": "cta_chip", "role": "swipe/shop prompt", "anchor": "bottom-right", "appears_on_shots": [3], "note": "deterministic post-process glyph layer" }
        ]
      },
      "render_notes": "Shot 2 features a hand holding the product close to face. Engine safety-negative already strips text/logo from product; if brand mark is required on-screen, post-process via deterministic text-overlay layer after render (config.text_overlay=true). The AI does NOT draw glyphs — all badge/caption/CTA text is composited in the post-process overlay layer (overlay_spec), so standalone text/logo terms are intentionally kept OUT of extra_negative (global SAFETY_NEGATIVE handles them). extra_positive reserves clean uncluttered upper-third and lower-third zones for the composited badge and caption; verify these zones stay clear of the face and the product-holding hand on every frame. Review hand anatomy on every output — reject if fingers are malformed. Also verify product shape/label stays consistent across all three frames (secondary reference lock)."
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
        "extra_positive": "CRITICAL: same person across all frames, locked facial identity, consistent features, no morph or drift, identical product held consistently as secondary reference across shots, influencer product haul reel with authentic try-on and unboxing energy and natural persuasive enthusiasm, 85mm portrait lens look at f/2.0 with shallow depth of field keeping the creator's eyes and the product crisp while the background falls into soft creamy bokeh, slight push-in framing with subtle parallax, clean bright soft-box key with gentle fill and soft rim separation, warm neutral seamless background, direct-to-camera engagement and genuine wide-eyed reaction, single well-formed product-holding hand with exactly five natural fingers, anatomically correct grip and visible fingernails, undistorted product label held legibly toward camera, clean uncluttered upper-third and lower-third zones reserved for a composited brand badge and caption",
        "extra_negative": "missing fingers, six fingers, fused or webbed digits, melted or fused fingers, floating disembodied hand, malformed grip, warped product shape, distorted label, warped face, plastic skin, harsh shadows, cluttered distracting background, identity drift between shots, product shape inconsistency between frames"
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
        "music_mood": "upbeat lifestyle pop, 110-122 bpm, plucky clean electric guitar plus bright synth keys, claps and shaker percussion and a warm rounded sub-bass, energetic-but-friendly inviting energy that lifts on the shot-2 reaction beat, reference vibe of polished TikTok and Instagram unboxing creator content",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  }
];
