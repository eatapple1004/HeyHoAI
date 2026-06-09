/**
 * Doppia recipe seed — beauty (product/brand mode), v2, 6 templates.
 * 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list). recipes 테이블에 INSERT.
 *
 * v2 변경 사항:
 *  - ASMR Unbox Reel 제거 (GRWM와 중복). GRWM을 4-shot으로 확장하여 언박싱 오프닝 흡수.
 *  - Before/After Result Reel 신규 추가 (beauty #1 전환 포맷; 동일 얼굴 identity 유지 필수).
 *  - Quick Glow Snap Reel 신규 추가 (1-shot ◈2 최저가 reel 티어).
 *  - Ingredient Claim Card 신규 추가 (text_overlay=true; SAFETY_NEGATIVE 'text'/'logo' 비포함).
 *  - 크레딧 오류 수정: image_set count×0.5 기준 재산정.
 *  - On-Model Glow Drop → on_model_tryon 4-shot=◈5 정가 적용.
 */
module.exports = [
  // ─────────────────────────────────────────────
  // 1. Dewy Glass Hero  (KEEP — ◈2 hero 앵커)
  // ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Hero",
    "name": "Dewy Glass Hero",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "인디 스킨케어·화장품 셀러가 스튜디오 없이 PDP·광고용 클린 프리미엄 히어로 컷을 얻을 수 있는 기본 전환 이미지.",
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

  // ─────────────────────────────────────────────
  // 2. Macro Swatch Lab  (KEEP — credit fix ◈4→◈2, count 4)
  // ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Texture",
    "name": "Macro Swatch Lab",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "텍스처는 뷰티의 #1 신뢰 신호 — 크리에이터·셀러가 포뮬러 발색(크림·겔·밤)을 증명해 장바구니 전환을 높이는 매크로 스와치 컷.",
    "meta": {
      "pricing_note": "v1 credit_cost 4는 오기입. image_set count=4 → 4×0.5=◈2 정가로 수정."
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

  // ─────────────────────────────────────────────
  // 3. On-Model Glow Drop  (KEEP — credit fix ◈6→◈5, on_model_tryon 4-shot)
  // ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "OnModel",
    "name": "On-Model Glow Drop",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 3,
    "rationale": "제품을 바른 글로우 모델 컷은 결과를 팔아 PDP 히어로 광고 슬롯에서 높은 전환을 만들어냄. on_model_tryon 4-shot 정가 ◈5.",
    "meta": {
      "pricing_note": "on_model_tryon 4-shot 정가 ◈5. v1 ◈6는 오기입.",
      "flags": ["experimental", "needs_human_review"],
      "ai_risk": "손 포즈·피부 렌더링 오류 가능. 얼굴 identity는 제품 옆 얼굴이므로 단일 세션 내 일관성 필수."
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
        "type": "face",
        "reference_strategy": "on_model_tryon",
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
        "negative": "extra fingers, malformed hands, six fingers, plastic waxy skin, over-smoothed airbrushed face, warped product, distorted label text, double product, uncanny eyes, harsh shadows, oily greasy shine, blemished retouch artifacts, watermark, lowres, oversaturated skin, inconsistent face across shots"
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

  // ─────────────────────────────────────────────
  // 4. Before/After Result Reel  (NEW — beauty #1 전환 포맷)
  // ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Reel",
    "name": "Before/After Result Reel",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 4,
    "rationale": "Before/After는 뷰티 광고 전환율 #1 포맷 — 사용 전·후 동일 인물의 피부 변화를 보여주어 구매 결정을 직접 자극함. 2-shot=◈4.",
    "meta": {
      "flags": ["experimental", "needs_human_review"],
      "ai_risk": "SAME face identity across before/after shots is critical. Engine must lock subject identity between frames. Risk: subtle facial morph, skin tone drift. Human review required before publishing.",
      "render_notes": "Before/After 레이블은 text_overlay 레이어로 삽입. SAFETY_NEGATIVE의 'text'/'logo' 제거 필요 없음(look.negative에 미포함)."
    },
    "text_overlay": true,
    "config": {
      "schema_version": 1,
      "mode": "product",
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
        "style_preset": "Before/After Beauty",
        "attributes": [
          "lighting:consistent_soft_beauty_key_across_both_shots",
          "color:neutral_true_skin_tone",
          "texture:skin_realistic_pores",
          "context:clean_studio_neutral_backdrop"
        ],
        "extra_positive": "split-narrative before-and-after beauty reel, SAME person in both frames with locked facial identity, consistent neutral studio lighting and backdrop across both shots, before frame shows natural bare skin with visible texture, after frame shows visibly smoother more luminous skin with a healthy dewy glow after product use, subtle realistic improvement — not extreme — believable skin transformation, true-to-life color rendition, head-and-shoulders framing",
        "negative": "different person in before vs after, facial morph or identity drift between frames, skin tone change, face shape change, extreme unnatural skin smoothing, plastic airbrushed look, uncanny valley, harsh shadows, inconsistent lighting between shots, extra fingers, malformed hands, watermark, lowres, before/after text baked into the image"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean neutral studio, consistent soft beauty key light — BEFORE state",
          "pose": "same model, natural bare skin, slight texture visible, direct gaze, relaxed expression",
          "composition": "closeup"
        },
        {
          "scene": "identical setup — same light, same backdrop, same framing — AFTER state",
          "pose": "same model, same angle, visibly smoother and more luminous skin post-product, same expression",
          "composition": "closeup"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "subtle slow push-in on the before face",
          "cut to after with a brief hold and slow pull-back revealing the glow"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "clean optimistic beauty ambient",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─────────────────────────────────────────────
  // 5. GRWM Routine Reel  (KEEP + ASMR Unbox 흡수 → 4-shot ◈8)
  // ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Reel",
    "name": "GRWM Routine Reel",
    "output_type": "reel",
    "credit_cost": 8,
    "sort_order": 5,
    "rationale": "단계별 루틴 + 오프닝 언박싱을 하나의 리얼 루틴 릴로 통합. ASMR Unbox를 shot 1로 흡수해 슬롯을 절약하면서 가장 높은 의도의 뷰티 포맷을 완성. 4-shot=◈8.",
    "meta": {
      "merge_note": "ASMR Unbox Reel(v1 sort_order 4)을 shot 1(언박싱 오프닝)으로 통합. 별도 ASMR 슬롯 제거.",
      "flags": ["needs_human_review"],
      "ai_risk": "손 포즈(디스펜싱·터치)는 렌더 오류 빈도 높음. 손 negative 강화."
    },
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
        "style_preset": "GRWM Beauty",
        "attributes": [
          "lighting:ring_light_plus_window",
          "color:bright_clean_warm",
          "texture:skin_fresh_dewy",
          "context:bathroom_vanity_mirror"
        ],
        "extra_positive": "morning skincare GRWM routine reel with an unboxing opening, fresh premium matte box reveal on the counter leading into the full routine, fresh-faced model at a bright vanity mirror with soft window light and a subtle ring-light catchlight, product used in sequence step by step, dewy luminous skin, clean-girl aesthetic, vertical phone-shot social feel but crisp, product label always color-accurate and readable, airy bright bathroom setting with greenery",
        "negative": "extra fingers, malformed hands, six fingers, plastic waxy skin, over-airbrushed face, warped product, distorted label text, double product, uncanny mirror reflection mismatch, harsh shadows, dingy bathroom, clutter, watermark, lowres, morphing product between frames, inconsistent product between shots"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "premium matte product box opening on the marble vanity counter, satin tissue, soft top diffused light — ASMR unbox opening",
          "pose": "manicured hands lifting the lid to reveal the product seated in foam, product emerging label-forward",
          "composition": "closeup"
        },
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
          "slow push-in on the sealed box, lid lift reveal with gentle tilt",
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

  // ─────────────────────────────────────────────
  // 6. Quick Glow Snap  (NEW — 1-shot ◈2 최저가 reel 티어)
  // ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Reel",
    "name": "Quick Glow Snap",
    "output_type": "reel",
    "credit_cost": 2,
    "sort_order": 6,
    "rationale": "1-shot ◈2 최저가 reel 티어 — 스토리·숏폼 광고용 즉각적인 글로우 클로즈업 모션 클립. 빠른 A/B 테스트와 저예산 캠페인을 위한 진입점.",
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
        "style_preset": "Studio Beauty",
        "attributes": [
          "lighting:soft_box_key_plus_rim",
          "color:cool_clean_luminous",
          "texture:dewy_glass_wet_sheen",
          "context:seamless_studio_sweep"
        ],
        "extra_positive": "single-shot beauty reel, hero product on a frosted riser with water droplets catching a crisp rim light, slow cinematic push-in revealing the full product with a final soft lens flare, premium beauty editorial motion, tack-sharp packaging, high-key luminous mood",
        "negative": "warped product, distorted label text, jittery shaky motion, harsh flash, cluttered background, watermark, lowres, morphing product"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "frosted acrylic riser on a cool white seamless sweep, water droplets on the bottle, soft rim light creating a lens flare on the edge",
          "pose": "product centered upright, label squared to camera, full-body product reveal",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow cinematic push-in from mid to close, ending with a soft lens flare bloom on the bottle edge"
        ],
        "duration_per_shot": 4,
        "transition": "fade",
        "music_mood": "clean beauty ambient with a subtle swell",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─────────────────────────────────────────────
  // 7. Aesthetic Shelfie  (KEEP — ◈2 lifestyle 앵커)
  // ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Lifestyle",
    "name": "Aesthetic Shelfie",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 7,
    "rationale": "스타일링된 욕실 선반 플랫레이는 인스타그램 그리드·PDP 라이프스타일 슬롯에서 브랜드 세계관을 구축하는 저비용·고효율 포맷.",
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
  },

  // ─────────────────────────────────────────────
  // 8. Ingredient Claim Card  (NEW — text_overlay info frame)
  // ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "InfoCard",
    "name": "Ingredient Claim Card",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 8,
    "rationale": "성분·클레임 카드는 교육형 콘텐츠로 PDPage와 광고 캐러셀 슬롯에서 신뢰도를 높이는 필수 포맷. 텍스트는 overlay 레이어로 삽입 — ENGINE SAFETY_NEGATIVE 충돌 없음.",
    "meta": {
      "render_notes": "성분명·클레임 텍스트를 이미지에 직접 굽지 않음. config.text_overlay=true → 렌더 후 overlay 파이프라인에서 텍스트·아이콘 레이어 합성. look.negative에 'text'/'logo' 미포함(SAFETY_NEGATIVE와 중복 금지).",
      "text_overlay_fields": ["ingredient_name", "claim_headline", "percentage_callout", "brand_logo_position"]
    },
    "text_overlay": true,
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
        "style_preset": "Clean Editorial",
        "attributes": [
          "lighting:soft_diffused_flat",
          "color:minimal_white_or_pale_tonal",
          "texture:ingredient_botanical_or_molecular_detail",
          "context:clean_studio_with_ingredient_prop"
        ],
        "extra_positive": "clean beauty ingredient editorial, product centered on a pure white or very pale tonal surface, a single key ingredient prop nearby — a fresh botanical sprig, a small glass vial of serum, or a magnified molecular texture inset — soft diffused flat light for maximum clarity and color accuracy, clinical-yet-luxurious aesthetic with generous negative space reserved for overlay text layers, no baked-in text or labels beyond the product packaging itself",
        "negative": "cluttered busy background, harsh shadows, fingerprints, dust, warped product, distorted packaging, double product, oversaturated, lowres, watermark, busy pattern behind product, colored gel lighting"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "pure white surface, product front-facing with ample blank space on the right side for text overlay",
          "pose": "product centered-left, generous right-side negative space for ingredient claim block",
          "composition": "medium_shot"
        },
        {
          "scene": "pale cream surface, fresh botanical ingredient (e.g., centella leaf, retinol crystal vial) beside the product",
          "pose": "product and ingredient prop side by side, product dominant, prop soft-focus",
          "composition": "medium_shot"
        },
        {
          "scene": "white background, extreme macro inset feel — ingredient texture fills the background out of focus",
          "pose": "product sharp in foreground, ingredient texture bokeh behind",
          "composition": "closeup"
        },
        {
          "scene": "minimal flat-lay, product top-down on white with a single dried botanical at the edge",
          "pose": "overhead product label facing camera, clean minimal composition",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  }
];
