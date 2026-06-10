/**
 * Doppia recipe seed — fashion (product mode), 6 templates.
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list). recipes 테이블에 INSERT.
 * 자동 생성(레시피 프롬프트 워크플로). config.look.extra_positive/negative + shots[].scene/pose/composition 사용.
 */
module.exports = [
  {
    "mode": "product",
    "vertical": "fashion",
    "category": "OnModel",
    "name": "On-Model Studio",
    "output_type": "image_set",
    "credit_cost": 6,
    "sort_order": 1,
    "rationale": "DTC apparel sellers who can't afford a model+photographer: turns one flat-lay into believable on-body catalog shots that lift PDP conversion.",
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
        "style_preset": "Fashion",
        "attributes": [
          "lighting:studio_softbox",
          "color:neutral_true",
          "texture:fabric_weave",
          "context:seamless_studio"
        ],
        "extra_positive": "uploaded garment worn by a natural-looking model, garment fit and proportions identical to reference (same color, print, seams, hardware, neckline), commercial e-commerce on-model photography, large octabox key light camera-left with a fill scrim camera-right and a soft hair light, light grey seamless cyclorama, shot on 85mm f/4 full-frame, true-to-life fabric drape and stitching, relaxed natural model expression, clean catalog styling",
        "negative": "warped or melted garment, mismatched color or print, extra seams, distorted hands, extra fingers, fused fingers, plastic skin, mannequin look, logo or text artifacts, watermark, harsh shadows, blown highlights, duplicated limbs, garment floating off body"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "light grey seamless studio cyclorama, soft even key",
          "pose": "front-facing, garment squared to camera, arms relaxed at sides",
          "composition": "full_body"
        },
        {
          "scene": "same studio, subtle floor shadow",
          "pose": "three-quarter turn showing garment side and drape",
          "composition": "full_body"
        },
        {
          "scene": "neutral studio, slightly tighter framing",
          "pose": "model mid-stride walking toward camera, natural movement",
          "composition": "medium_shot"
        },
        {
          "scene": "clean studio, focused on fabric and fit",
          "pose": "detail crop of collar/cuff/hem on body, hands lightly adjusting garment",
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
    "vertical": "fashion",
    "category": "Lookbook",
    "name": "Editorial Lookbook",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "Boutique brands building a seasonal lookbook: high-fashion editorial mood that makes a small drop read as a designer campaign for landing pages and IG.",
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
          "lighting:dramatic_directional",
          "color:muted_editorial",
          "texture:matte_paper",
          "context:concrete_minimal"
        ],
        "extra_positive": "uploaded garment styled in a high-fashion editorial spread, fashion-magazine aesthetic, single hard directional source raking across the set for sculpted shadow, desaturated muted palette with deep blacks, shot on 50mm full-frame at f/2.8, confident editorial posing, architectural negative space, garment color and detail preserved exactly from reference",
        "negative": "warped garment, color shift, extra fingers, distorted anatomy, plastic skin, busy cluttered background, text or logo artifacts, watermark, oversaturated colors, flat lifeless lighting, double exposure errors"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "minimal raw-concrete interior, single hard window light",
          "pose": "full-length editorial stance, weight on one hip, chin lifted",
          "composition": "full_body"
        },
        {
          "scene": "draped neutral fabric backdrop, dramatic side light",
          "pose": "seated on the floor, elongated relaxed editorial pose",
          "composition": "medium_shot"
        },
        {
          "scene": "shadowed studio corner, hard rim light",
          "pose": "profile turn, garment silhouette emphasized against shadow",
          "composition": "medium_shot"
        },
        {
          "scene": "bright minimalist wall, low contrast",
          "pose": "close editorial portrait, hand near collar of garment",
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
    "vertical": "fashion",
    "category": "Lifestyle",
    "name": "Lifestyle Scene Pack",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 3,
    "rationale": "Social-first sellers who need scroll-stopping feed content: places the product in aspirational real-world scenes that feel like UGC, not catalog.",
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
          "lighting:natural_window",
          "color:film_warm",
          "texture:grain_film",
          "context:lifestyle_real"
        ],
        "extra_positive": "uploaded garment worn in candid real-life lifestyle moments, golden natural light, lived-in aspirational scenes, film color grade with gentle grain, shot on 35mm full-frame at f/2.0, authentic relaxed body language, shallow depth of field with soft bokeh, garment color/print/details kept identical to reference",
        "negative": "warped garment, color mismatch, extra fingers, distorted hands, plastic skin, studio sterile look, harsh on-camera flash, text or logo artifacts, watermark, overprocessed HDR, duplicated objects, garment detail loss"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "sunlit city sidewalk with soft bokeh storefronts",
          "pose": "walking candidly, mid-stride, looking off-frame",
          "composition": "full_body"
        },
        {
          "scene": "cozy cafe by a bright window, warm tones",
          "pose": "seated at table with coffee, relaxed natural posture",
          "composition": "medium_shot"
        },
        {
          "scene": "leafy park path at golden hour",
          "pose": "standing, hands in pockets, soft genuine smile",
          "composition": "full_body"
        },
        {
          "scene": "minimalist sunlit apartment, linen and plants",
          "pose": "leaning by window, garment detail catching light",
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
    "vertical": "fashion",
    "category": "Reel",
    "name": "GRWM Drop Reel",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 4,
    "rationale": "Creators and DTC brands launching a drop: a get-ready-with-me styling reel that rides TikTok/Reels trends to announce new product without a shoot.",
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
        "style_preset": "Glamour",
        "attributes": [
          "lighting:ring_light",
          "color:warm_vibrant",
          "texture:fabric_detail",
          "context:bedroom_vanity"
        ],
        "extra_positive": "get-ready-with-me styling reel featuring the uploaded garment, bright airy creator-bedroom aesthetic, vertical social-first framing, glossy upbeat mood, garment color and details preserved exactly across every shot, natural model with on-trend energy",
        "negative": "warped garment, color shift between shots, extra fingers, distorted hands, plastic skin, flickering identity, text or logo artifacts, watermark, jittery unstable motion, garment morphing, harsh shadows"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright bedroom, garment laid out flat on bed beside accessories",
          "pose": "product flat-lay front view, hands entering frame to pick it up",
          "composition": "medium_shot"
        },
        {
          "scene": "in front of full-length mirror, soft ring-light glow",
          "pose": "garment held up to body, styled three-quarter angle",
          "composition": "full_body"
        },
        {
          "scene": "tidy room, confident outfit-complete moment",
          "pose": "final styled reveal, garment worn front-on with a turn",
          "composition": "full_body"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow top-down push-in on the flat-lay",
          "smooth tilt-up from hem to neckline as garment is held to body",
          "playful 180-degree orbit reveal of the full styled look"
        ],
        "duration_per_shot": 3,
        "transition": "whip",
        "music_mood": "upbeat",
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
    "vertical": "fashion",
    "category": "Reel",
    "name": "360 Detail Spin",
    "output_type": "reel",
    "credit_cost": 8,
    "sort_order": 5,
    "rationale": "E-commerce sellers reducing returns: a clean rotating product reel that shows fit, drape and construction from every angle on the PDP.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": {
        "type": "reel",
        "count": 4,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Fashion",
        "attributes": [
          "lighting:studio_360_even",
          "color:neutral_true",
          "texture:fabric_weave",
          "context:turntable_studio"
        ],
        "extra_positive": "smooth 360-degree rotation of the uploaded garment, e-commerce turntable product video, perfectly even wraparound studio lighting, light grey seamless background, garment color/print/seams/hardware identical to reference at every angle, crisp true-to-life fabric texture, stable centered framing",
        "negative": "warped or morphing garment, color shift during rotation, geometry distortion, extra seams, text or logo artifacts, watermark, wobbling unstable spin, motion blur smearing detail, background color flicker, duplicated product"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "grey seamless turntable studio, even soft light",
          "pose": "product front view, centered, squared to camera",
          "composition": "full_body"
        },
        {
          "scene": "same studio, rotation continues",
          "pose": "product 3/4 front angle, drape and side seam visible",
          "composition": "full_body"
        },
        {
          "scene": "same studio, midway through spin",
          "pose": "product profile/side view showing silhouette",
          "composition": "medium_shot"
        },
        {
          "scene": "same studio, tighter framing",
          "pose": "product back-detail close-up, stitching and label",
          "composition": "closeup"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow clockwise turntable rotation, front to 3/4",
          "continuous smooth orbit, 3/4 to side",
          "steady rotation, side to back",
          "gentle push-in macro on back construction detail"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "minimal_clean",
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
    "vertical": "fashion",
    "category": "Detail",
    "name": "Macro Texture Shots",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 6,
    "rationale": "Premium and craft brands justifying price: extreme close-ups of weave, stitching and hardware that communicate quality and material on the PDP.",
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
          "lighting:raking_side",
          "color:true_to_material",
          "texture:macro_fiber",
          "context:dark_seamless"
        ],
        "extra_positive": "extreme macro detail shots of the uploaded garment, raking side light to reveal weave and surface relief, 100mm macro lens at f/8 with focus stacking sharpness, true-to-material color, visible fiber, stitch and hardware texture, premium tactile feel, garment material and color identical to reference",
        "negative": "warped texture, invented patterns not on reference, color shift, blurry soft focus, plastic look, text or logo artifacts, watermark, oversharpening halos, dust noise, fabric morphing, duplicated stitches"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "dark seamless surface, hard raking side light",
          "pose": "macro of fabric weave and surface grain",
          "composition": "closeup"
        },
        {
          "scene": "soft directional light on neutral backdrop",
          "pose": "macro of seam and topstitching detail",
          "composition": "closeup"
        },
        {
          "scene": "focused spotlight on hardware",
          "pose": "macro of buttons/zipper/hardware finish",
          "composition": "closeup"
        },
        {
          "scene": "low-angle grazing light",
          "pose": "macro of hem, edge finish and material drape fold",
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
