/**
 * Doppia recipe seed — beauty (product mode), 6 templates.
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list). recipes 테이블에 INSERT.
 * 자동 생성(레시피 프롬프트 워크플로). config.look.extra_positive/negative + shots[].scene/pose/composition 사용.
 */
module.exports = [
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Hero",
    "name": "Dewy Glass Hero",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "Indie skincare/cosmetics sellers need a clean, premium hero shot for PDP and ads without a studio — this earns its slot as the default conversion image.",
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
        "style_preset": "Studio Beauty",
        "attributes": [
          "lighting:soft_box_key_plus_rim",
          "color:cool_clean_white",
          "texture:dewy_glass_wet_sheen",
          "context:seamless_studio_sweep"
        ],
        "extra_positive": "premium beauty hero product photography, single product on a frosted acrylic riser, fresh water droplets and condensation beading on the bottle, glossy wet reflection pooled beneath, soft gradient seamless backdrop, large softbox key from camera-left with a crisp specular rim light from behind to define the glass edge, shot on 100mm macro at f/8, tack-sharp label, airy luminous high-key mood, color-accurate brand packaging",
        "negative": "warped or melted bottle, distorted label text, gibberish typography, double product, extra caps, smudged logo, plastic-looking liquid, harsh blown highlights, muddy shadows, fingerprints, dust, cluttered background, watermark, lowres, oversaturated"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "frosted acrylic riser on a cool white seamless sweep, fine water droplets on the glass",
          "pose": "front view, label squared to camera, upright and centered",
          "composition": "medium_shot"
        },
        {
          "scene": "wet glossy surface with a soft mirror reflection, pale blue gradient backdrop",
          "pose": "3/4 hero angle showing cap and dropper bulb",
          "composition": "medium_shot"
        },
        {
          "scene": "macro on the dropper tip with a single suspended serum droplet, shallow depth",
          "pose": "detail crop on the pipette and a hanging drop",
          "composition": "closeup"
        },
        {
          "scene": "minimal white podium with a soft cast shadow, faint eucalyptus sprig out of focus",
          "pose": "styled hero with subtle prop, product dominant",
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
    "mode": "product",
    "vertical": "beauty",
    "category": "Texture",
    "name": "Macro Swatch Lab",
    "output_type": "image_set",
    "credit_cost": 4,
    "sort_order": 2,
    "rationale": "Texture is the No.1 trust signal in beauty — creators and sellers use these macro swatch shots to prove formula payoff (cream, gel, balm) that drives add-to-cart.",
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
        "style_preset": "Macro Texture",
        "attributes": [
          "lighting:raking_grazing_sidelight",
          "color:neutral_true_to_tone",
          "texture:creamy_emulsion_peaks_and_strings",
          "context:matte_acrylic_lab_surface"
        ],
        "extra_positive": "extreme macro beauty texture photography, generous swatch of the product smeared and dolloped on a smooth matte acrylic tile, glistening creamy emulsion with soft peaks and elastic strings being pulled, low raking sidelight to carve out every ridge and bubble, true-to-life color rendition, shot on 100mm macro lens at f/11 with focus stacking, clinical yet luxurious lab aesthetic, the product bottle softly out of focus behind the swatch",
        "negative": "flat lifeless texture, fake CGI gloss, color shift, off-tone swatch, dust, hair, lint, fingerprints, dirty surface, warped product label, hard ugly shadows, overexposed whites, watermark, lowres, plastic sheen"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "smooth matte white acrylic tile with a thick dollop of cream",
          "pose": "detail of a single creamy peak with elastic strings pulled upward",
          "composition": "closeup"
        },
        {
          "scene": "neutral grey lab surface, swatch smeared in a long arc",
          "pose": "macro along the smear showing soft sheen and ridges",
          "composition": "closeup"
        },
        {
          "scene": "glass slide with a translucent gel drop, raking light through it",
          "pose": "detail on light refracting through the gel bead",
          "composition": "closeup"
        },
        {
          "scene": "matte tile with the swatch beside the softly defocused product bottle",
          "pose": "styled detail, swatch sharp and product as backdrop",
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
    "mode": "product",
    "vertical": "beauty",
    "category": "OnModel",
    "name": "On-Model Glow Drop",
    "output_type": "image_set",
    "credit_cost": 6,
    "sort_order": 3,
    "rationale": "Aspirational on-skin context sells the result, not just the jar — sellers use these to show the product applied on a glowing model for hero ads and PDP lifestyle slots.",
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
        "style_preset": "On-Model Beauty",
        "attributes": [
          "lighting:large_soft_beauty_dish",
          "color:warm_skin_natural",
          "texture:skin_dewy_luminous",
          "context:on_model_studio"
        ],
        "extra_positive": "on-model beauty editorial, fresh-faced model with luminous dewy skin and natural glowing makeup holding and applying the product near the face, large beauty dish softbox key for clean wraparound light with a faint catchlight, soft gradient warm-neutral backdrop, shot on 85mm at f/2.8 for a flattering crop, realistic pores and subtle highlight on cheekbones, product held label-forward and color-accurate, aspirational clean-girl aesthetic",
        "negative": "extra fingers, malformed hands, six fingers, plastic waxy skin, over-smoothed airbrushed face, warped product, distorted label text, double product, uncanny eyes, harsh shadows, oily greasy shine, blemished retouch artifacts, watermark, lowres, oversaturated skin"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "warm-neutral studio gradient, soft wraparound beauty light",
          "pose": "model holding the product beside the cheek, label to camera, soft gaze",
          "composition": "closeup"
        },
        {
          "scene": "clean studio, gentle daylight feel",
          "pose": "model dispensing a drop onto fingertip, product visible",
          "composition": "closeup"
        },
        {
          "scene": "soft pastel backdrop",
          "pose": "model patting product onto cheek, dewy glow catching the light",
          "composition": "closeup"
        },
        {
          "scene": "minimal studio with subtle bokeh",
          "pose": "model presenting the product toward camera at shoulder height",
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
    "mode": "product",
    "vertical": "beauty",
    "category": "Reel",
    "name": "ASMR Unbox Reel",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 4,
    "rationale": "ASMR unboxing is a top-performing TikTok/Reels beauty format — sellers use it for satisfying, scroll-stopping product reveals that double as social proof.",
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
        "style_preset": "ASMR Beauty",
        "attributes": [
          "lighting:soft_top_diffused",
          "color:warm_cozy_neutral",
          "texture:matte_box_satin_tissue",
          "context:tactile_tabletop"
        ],
        "extra_positive": "tactile ASMR unboxing beauty reel, premium matte box being opened on a soft satin-tissue-lined tabletop, manicured hands lifting the lid and peeling protective film, close intimate framing on the product nestled in foam, soft diffused top light, warm cozy neutral palette, shallow depth of field, every detail crisp and satisfying, color-accurate packaging",
        "negative": "extra fingers, malformed hands, warped product, distorted logo or label text, jittery shaky motion, double product, plastic fake packaging, harsh flash, cluttered messy background, watermark, lowres, morphing objects between frames",
        "wardrobe": ""
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "closed premium matte box centered on satin tissue, sealed wrap catching soft light",
          "pose": "hands resting on the lid about to open, box front-facing",
          "composition": "closeup"
        },
        {
          "scene": "lid lifting to reveal the product seated in foam insert, tissue parting",
          "pose": "detail of the reveal, product emerging label-forward",
          "composition": "closeup"
        },
        {
          "scene": "product lifted out and held upright over the open box",
          "pose": "hero hold, slow rotate showing the front face",
          "composition": "closeup"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow push-in toward the sealed box",
          "lid lift reveal with a gentle tilt down into the box",
          "smooth lift-out and slow product rotate"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "soft ASMR ambient with tactile foley",
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
    "vertical": "beauty",
    "category": "Reel",
    "name": "GRWM Routine Reel",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 5,
    "rationale": "GRWM routine reels show the product in a real step-by-step ritual — the highest-intent beauty format for converting browsers into buyers via aspirational daily use.",
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
        "style_preset": "GRWM Beauty",
        "attributes": [
          "lighting:ring_light_plus_window",
          "color:bright_clean_warm",
          "texture:skin_fresh_dewy",
          "context:bathroom_vanity_mirror"
        ],
        "extra_positive": "morning skincare GRWM routine reel, fresh-faced model at a bright vanity mirror with soft window light and a subtle ring-light catchlight, product placed on the marble counter and used in sequence, dewy luminous skin, clean-girl aesthetic, vertical phone-shot social feel but crisp, product label always color-accurate and readable, airy bright bathroom setting with greenery",
        "negative": "extra fingers, malformed hands, plastic waxy skin, over-airbrushed face, warped product, distorted label text, double product, uncanny mirror reflection mismatch, harsh shadows, dingy bathroom, clutter, watermark, lowres, morphing product between frames"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright marble vanity with greenery, product standing on the counter",
          "pose": "product front view on counter as the routine opens, hand reaching in",
          "composition": "medium_shot"
        },
        {
          "scene": "at the mirror dispensing the product onto fingertips",
          "pose": "detail of pump or drop being dispensed, product label visible",
          "composition": "closeup"
        },
        {
          "scene": "model patting product into glowing skin, mirror catchlight",
          "pose": "closeup on dewy cheek with the finished glow, product held beside face",
          "composition": "closeup"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "gentle push-in on the counter product",
          "slow pan following the dispense onto fingertips",
          "soft tilt-up to the glowing face then settle on the held product"
        ],
        "duration_per_shot": 3,
        "transition": "whip",
        "music_mood": "upbeat clean-girl morning pop",
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
    "vertical": "beauty",
    "category": "Lifestyle",
    "name": "Aesthetic Shelfie",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 6,
    "rationale": "The styled bathroom shelf flat-lay is the signature beauty lifestyle slot — cheap, fast, and on-trend for Instagram grids and PDP context shots that build brand world.",
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
        "style_preset": "Lifestyle Flatlay",
        "attributes": [
          "lighting:soft_morning_window",
          "color:warm_tonal_beige_cream",
          "texture:travertine_linen_ceramic",
          "context:bathroom_shelf_vignette"
        ],
        "extra_positive": "aesthetic shelfie lifestyle flat-lay, product styled on a travertine or oak bathroom shelf among curated tonal props — a ceramic tray, a small vase with dried pampas, folded linen, an unlit candle, soft morning window light raking from the side casting gentle long shadows, warm beige-cream palette, calm slow-living mood, shot on 50mm at f/4, product is the clear focal point and color-accurate, shallow tasteful clutter",
        "negative": "warped product, distorted label text, double product, cluttered messy shelf, clashing colors, harsh midday light, plastic props, dust, fingerprints, tilted horizon, watermark, lowres, oversaturated"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "travertine shelf with ceramic tray and dried pampas in soft window light",
          "pose": "product front-facing as the hero of the vignette",
          "composition": "medium_shot"
        },
        {
          "scene": "oak shelf with folded linen and an unlit candle",
          "pose": "product 3/4 angle nestled among tonal props",
          "composition": "medium_shot"
        },
        {
          "scene": "flat overhead of the shelf surface with props arranged around it",
          "pose": "top-down styled flat-lay, product centered",
          "composition": "medium_shot"
        },
        {
          "scene": "shelf edge with morning light and soft shadow play, vase out of focus",
          "pose": "detail crop on the product with bokeh props behind",
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
