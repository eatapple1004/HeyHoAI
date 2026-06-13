/**
 * Doppia recipe seed — beauty (product/brand mode), v2.1, 24 templates.
 *  - 16 base + hero family draft 8 (sort 17–24, 2026-06-13): provisional·미검증·자동 보류(held).
 *    실생성 통과는 Dewy Glass Hero 1개뿐 → 나머지는 1:1 테스트 통과 시 _pass_log 등재로 보류 해제.
 *    원본 리스크/플래그 = docs/섹션명령서/_beauty_hero_family_draft.json (meta.risk_notes로도 보존).
 * 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list). recipes 테이블에 INSERT.
 *
 * v2.1 변경 (2026-06-11, 프롬프트 정밀화 총지휘 직접 이관):
 *  - 死필드 look.negative → 엔진이 읽는 look.extra_negative 로 16/16 전 템플릿 이관(resolver L148 live).
 *  - SAFETY_NEGATIVE_PROMPT 전역 중복어 제거: watermark/lowres/text/logo/extra fingers/malformed hands 등.
 *  - text_overlay 4개(Before/After·Shade Range Grid·Region Result Reel·Teeth Shade Card)는 'baked-in text' 항목 제거(SAFETY 전역 차단).
 *  - 손 노출 템플릿은 SAFETY가 막는 generic 대신 섹션 특화 'six fingers / fused or webbed' 유지.
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
        "extra_negative": "warped or melted bottle, distorted label, gibberish typography, double product, extra caps, plastic-looking liquid, harsh blown highlights, muddy shadows, fingerprints, dust, cluttered background, oversaturated"
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
        "extra_negative": "flat lifeless texture, fake CGI gloss, color shift, off-tone swatch, dust, hair, lint, fingerprints, dirty surface, warped product label, hard ugly shadows, overexposed whites, plastic sheen"
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
        "extra_negative": "six fingers, fused or webbed fingers, plastic waxy skin, over-smoothed airbrushed face, warped product, distorted label, double product, uncanny eyes, harsh shadows, oily greasy shine, blemished retouch artifacts, oversaturated skin, inconsistent face across shots"
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
      "render_notes": "Before/After 레이블은 text_overlay 레이어로 합성. SAFETY_NEGATIVE가 'text'/'logo'를 전역 차단하므로 look.extra_negative에서 제외(이관 시 'baked-in before/after text' 항목 제거)."
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
        "extra_negative": "different person in before vs after, facial morph or identity drift between frames, skin tone change, face shape change, extreme unnatural skin smoothing, plastic airbrushed look, uncanny valley, harsh shadows, inconsistent lighting between shots"
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
        "extra_negative": "six fingers, fused or webbed fingers, plastic waxy skin, over-airbrushed face, warped product, distorted label, double product, uncanny mirror reflection mismatch, harsh shadows, dingy bathroom, clutter, morphing product between frames, inconsistent product between shots"
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
        "extra_negative": "warped product, distorted label, jittery shaky motion, harsh flash, cluttered background, morphing product"
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
        "extra_negative": "warped product, distorted label, double product, cluttered messy shelf, clashing colors, harsh midday light, plastic props, dust, fingerprints, tilted horizon, oversaturated"
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
      "render_notes": "성분명·클레임 텍스트를 이미지에 직접 굽지 않음. config.text_overlay=true → 렌더 후 overlay 파이프라인에서 텍스트·아이콘 레이어 합성. look.extra_negative에 'text'/'logo' 미포함(SAFETY가 전역 차단)(SAFETY_NEGATIVE와 중복 금지).",
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
        "extra_negative": "cluttered busy background, harsh shadows, fingerprints, dust, warped product, distorted packaging, double product, oversaturated, busy pattern behind product, colored gel lighting"
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
  },

  // ─────────────────────────────────────────────
  // 9. Shade Range Grid  (NEW — text_overlay 셰이드 라인업 ◈3)
  // ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Shade",
    "name": "Shade Range Grid",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 9,
    "rationale": "색조(립·파데·아이섀도) 셀러에게 셰이드 라인업은 구매 결정의 핵심 신호 — 6-shot 그리드로 전 컬러 라인업을 한 세트에 담아 PDP 캐러셀과 광고 셀에 바로 투입 가능. text_overlay로 셰이드명 삽입.",
    "meta": {
      "provisional": true,
      "render_notes": "각 컷의 셰이드명·번호는 text_overlay 레이어로 합성(이미지에 굽지 않음). 6컷은 각각 다른 셰이드 컬러를 렌더링하되 제품 폼팩터·조명·구도는 동일하게 유지. look.extra_negative에 'text'/'logo' 미포함(SAFETY가 전역 차단).",
      "text_overlay_fields": ["shade_name", "shade_number", "hex_swatch"]
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
      "text_overlay": true,
      "output": {
        "type": "image_set",
        "count": 6,
        "aspect_ratio": "1:1"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Studio Shade Grid",
        "attributes": [
          "lighting:soft_flat_diffused_overhead",
          "color:pure_white_neutral_backdrop",
          "texture:pigment_rich_true_to_tone",
          "context:seamless_studio_sweep"
        ],
        "extra_positive": "beauty shade range grid photography, single product unit per frame on a pure white seamless surface, each frame showcases a different shade variant with true-to-pigment color accuracy, consistent flat overhead softbox lighting across all 6 frames for color fidelity, product label squared to camera, slight perspective showing the shade swatch or bullet tip, neutral white-grey backdrop with subtle cast shadow beneath the product, clinical precision meets editorial elegance, shot on 100mm at f/8, consistent cropping and framing across all 6 shots for grid assembly",
        "extra_negative": "color shift or inaccurate pigment rendering, inconsistent lighting across frames, warped product, distorted label, double product, harsh shadows, busy background, props cluttering the frame, oversaturated"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "pure white seamless, product shade variant 1 — lightest tone in the range",
          "pose": "product upright front-facing, label to camera, shade tip or swatch visible",
          "composition": "medium_shot"
        },
        {
          "scene": "identical seamless setup, product shade variant 2",
          "pose": "same angle and crop as shot 1 for grid consistency",
          "composition": "medium_shot"
        },
        {
          "scene": "identical seamless setup, product shade variant 3",
          "pose": "same angle and crop as shot 1 for grid consistency",
          "composition": "medium_shot"
        },
        {
          "scene": "identical seamless setup, product shade variant 4",
          "pose": "same angle and crop as shot 1 for grid consistency",
          "composition": "medium_shot"
        },
        {
          "scene": "identical seamless setup, product shade variant 5",
          "pose": "same angle and crop as shot 1 for grid consistency",
          "composition": "medium_shot"
        },
        {
          "scene": "identical seamless setup, product shade variant 6 — deepest tone in the range",
          "pose": "same angle and crop as shot 1 for grid consistency",
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
  // 10. Region Result Reel  (NEW — 비얼굴 before→after reel 2-shot ◈4 ⚠ 🅣)
  // ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Reel",
    "name": "Region Result Reel",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 10,
    "rationale": "헤어·바디·네일·립 등 비얼굴 부위 before→after 결과 릴 — 얼굴 identity 리스크 없이 변화 효과를 시각적으로 증명. before/after 라벨은 text_overlay. 2-shot=◈4.",
    "meta": {
      "provisional": true,
      "flags": ["experimental", "needs_human_review"],
      "ai_risk": "동일 부위·동일 라이팅 일관성 유지 필수. 피부·모발 렌더 오류 및 부위 형태 왜곡 가능. 손가락 또는 발가락 포함 시 추가 오류 리스크. 퍼블리시 전 사람 검수 필수.",
      "render_notes": "before/after 텍스트 라벨은 text_overlay 레이어로 합성. look.extra_negative에 'text'/'logo' 미포함(SAFETY가 전역 차단). 비얼굴 부위(헤어·바디·네일·립)에 한정 — 얼굴 전체 컷은 Before/After Result Reel 템플릿 사용."
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
      "text_overlay": true,
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
        "style_preset": "Region Before/After",
        "attributes": [
          "lighting:consistent_soft_directional_across_both_shots",
          "color:neutral_true_to_body_tone",
          "texture:skin_or_hair_realistic",
          "context:clean_studio_or_minimal_neutral_backdrop"
        ],
        "extra_positive": "non-facial region before-and-after beauty reel, SAME body region (hair / body skin / nails / lips) in both frames with consistent framing, IDENTICAL soft directional lighting and neutral backdrop across both shots, before frame shows the natural untreated state, after frame shows visibly improved result after product application — realistic and believable improvement, true-to-life color and texture, tight crop on the target region only, product featured near the region in at least one frame",
        "extra_negative": "different body region between frames, inconsistent lighting or backdrop, extreme unnatural result, plastic airbrushed skin or hair, uncanny texture, malformed toes, fused or webbed digits, harsh shadows, background clutter, full face shot (use Before/After Result Reel for face)"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean neutral backdrop, consistent soft sidelight — BEFORE state of the target region",
          "pose": "tight crop on the target body region (hair / body skin / nails / lips), natural untreated appearance, product placed nearby",
          "composition": "closeup"
        },
        {
          "scene": "identical framing, identical lighting, identical backdrop — AFTER state of the target region",
          "pose": "same crop on the same region, visibly improved post-product result, same angle",
          "composition": "closeup"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow push-in on the before region with a gentle hold",
          "cut to after with a brief hold and subtle pull-back revealing the result"
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
  // 11. Gift Set Group Hero  (NEW — 세트/번들 그룹샷 ◈2)
  // ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Hero",
    "name": "Gift Set Group Hero",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 11,
    "rationale": "세트·번들·기프트 상품은 구성품을 한 컷에 배열해야 전환을 이끌 수 있음 — 여러 SKU를 정렬·구성 보존한 그룹 히어로 컷 4장으로 PDP·광고 슬롯에 즉시 투입.",
    "meta": {
      "provisional": true
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
        "min_refs": 2
      },
      "look": {
        "style_preset": "Studio Group Hero",
        "attributes": [
          "lighting:soft_box_overhead_plus_fill",
          "color:clean_white_neutral",
          "texture:premium_packaging_surface",
          "context:seamless_studio_sweep"
        ],
        "extra_positive": "beauty gift set group hero photography, all SKUs in the set arranged together in a clean composed layout on a pure white seamless surface, each product upright and evenly lit, matching labels all squared to camera or elegantly angled, soft overhead softbox plus fill for shadow control, generous negative space around the group, premium editorial beauty aesthetic, shot on 85mm at f/8 for full group sharpness, consistent color-accurate packaging rendering across all items, gift-worthy elegantly styled composition",
        "extra_negative": "missing or extra products, mismatched product count versus the actual set, warped products, distorted labels, double products, harsh ugly shadows, cluttered background, floating products, inconsistent scale between items, oversaturated"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "pure white seamless, all set products arranged in a symmetrical hero group, subtle cast shadows",
          "pose": "full group front-facing, labels toward camera, evenly spaced and height-aligned",
          "composition": "medium_shot"
        },
        {
          "scene": "white surface, products arranged in a staggered depth formation",
          "pose": "3/4 angle showing product depth and packaging volume, hero item forward",
          "composition": "medium_shot"
        },
        {
          "scene": "overhead flat-lay, all products arranged artfully from above",
          "pose": "top-down bird's eye, clean symmetrical grid layout",
          "composition": "medium_shot"
        },
        {
          "scene": "products nestled inside or beside premium gift box with satin ribbon and tissue",
          "pose": "lifestyle group shot with gift box context, products arranged inside the open box",
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
  // 12. Glide Stick Swipe  (NEW — 스틱 트위스트업 + 스와이프 ◈2)
  // ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Texture",
    "name": "Glide Stick Swipe",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 12,
    "rationale": "립스틱·밤·스틱파데 등 스틱 폼팩터는 트위스트업 실루엣과 스와이프 텍스처가 핵심 구매 신호 — 두 가지를 조합한 4-shot으로 PDP 텍스처 슬롯과 광고 캐러셀을 채움.",
    "meta": {
      "provisional": true
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
        "style_preset": "Stick Texture Studio",
        "attributes": [
          "lighting:raking_sidelight_plus_soft_fill",
          "color:neutral_true_to_pigment",
          "texture:creamy_buttery_stick_formula",
          "context:matte_acrylic_surface"
        ],
        "extra_positive": "beauty stick product photography showcasing twist-up silhouette and swipe texture, stick fully twisted up exposing the bullet at full height, creamy or waxy formula catching a raking sidelight to reveal texture and sheen, a clean swatch arc smeared beside the product on a smooth matte surface showing the true pigment and finish, true-to-color rendition of the formula, shot on 100mm macro at f/8, one shot with the cap off showing the bullet profile, one macro on the swatch alone for texture detail, premium editorial aesthetic",
        "extra_negative": "warped or melted stick bullet, twisted bullet too short or hidden, color-shifted swatch, dirty smear surface, fingerprints, lint, hair, harsh specular hot-spot, flat lifeless texture, fake CGI sheen, distorted product casing, double product"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "matte white acrylic surface, stick fully twisted up, cap placed beside it, raking sidelight carving the bullet profile",
          "pose": "product upright cap-off, bullet fully extended, slight 3/4 angle to show silhouette",
          "composition": "medium_shot"
        },
        {
          "scene": "matte surface, stick at an angle with a fresh swipe arc beside it",
          "pose": "stick resting at a diagonal beside its swatch, product label visible",
          "composition": "medium_shot"
        },
        {
          "scene": "macro on the swatch alone — thick pigment arc on matte tile with raking sidelight",
          "pose": "detail of swatch surface texture, sheen and pigment richness",
          "composition": "closeup"
        },
        {
          "scene": "overhead flat-lay, stick and swatch arranged together on the surface",
          "pose": "top-down view of stick with cap beside it and swatch below, clean composition",
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
  // 13. Compact Powder Pop  (NEW — 파우더/팩트/블러셔 콤팩트 ◈2)
  // ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Texture",
    "name": "Compact Powder Pop",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 13,
    "rationale": "파우더·팩트·블러셔는 열린 콤팩트 안의 분채 표면과 퍼프 디테일이 구매를 이끄는 시각 신호 — 4-shot으로 케이스 외관부터 분채 매크로까지 커버.",
    "meta": {
      "provisional": true
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
        "style_preset": "Compact Beauty Studio",
        "attributes": [
          "lighting:soft_overhead_plus_rim",
          "color:neutral_white_or_tonal_surface",
          "texture:silky_powder_pan_shimmer_or_matte",
          "context:studio_seamless_or_marble_tile"
        ],
        "extra_positive": "beauty compact powder product photography, compact open showing the powder pan surface in full detail — silky smooth pressed powder or blush with a subtle shimmer or matte velvet finish catching a soft overhead light with a thin rim to define the compact edge, powder puff or brush applicator resting in or beside the compact in at least one frame, outer case design shown closed in one frame, macro shot on the powder surface texture in one frame revealing pigment and finish, true-to-color powder shade rendering, shot on 100mm at f/8, premium editorial feel",
        "extra_negative": "powder pan surface invisible or in shadow, cracked or broken powder, dirty compact case, smudged mirror, harsh specular that wipes out texture, warped compact case, color-shifted powder, double product, lint or hair on powder, fingerprints"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "white seamless, compact open and facing camera, full pan visible under soft overhead light with a faint rim",
          "pose": "compact open hero, pan surface center-frame, label and case edge in view",
          "composition": "medium_shot"
        },
        {
          "scene": "marble or matte tile surface, compact open with puff or brush applicator resting on the pan",
          "pose": "styled shot with applicator in or beside compact, 3/4 angle",
          "composition": "medium_shot"
        },
        {
          "scene": "macro on the powder pan surface alone, raking sidelight carving fine shimmer particles or velvety texture",
          "pose": "extreme closeup on the powder surface texture",
          "composition": "closeup"
        },
        {
          "scene": "seamless, compact closed — outer case design shot",
          "pose": "compact closed, front face of case to camera showing packaging design",
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
  // 14. Mist Burst Reel  (NEW — 스프레이/미스트 분사 플룸 1-shot ◈2)
  // ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Reel",
    "name": "Mist Burst Reel",
    "output_type": "reel",
    "credit_cost": 2,
    "sort_order": 14,
    "rationale": "에어로졸·스프레이·미스트 제품(픽서·바디미스트·드라이샴푸)은 분사 플룸 순간이 가장 강력한 시각 신호 — 1-shot ◈2 릴로 즉각적인 분사 퍼포먼스 모션 클립을 생성.",
    "meta": {
      "provisional": true
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
        "style_preset": "Mist Studio",
        "attributes": [
          "lighting:backlit_rim_or_contre_jour",
          "color:clean_dark_or_gradient_backdrop",
          "texture:fine_mist_droplet_plume",
          "context:studio_backlit_mist_capture"
        ],
        "extra_positive": "beauty spray mist product reel, product bottle held upright with the nozzle pressed — a billowing fine mist plume erupting from the tip caught mid-air, backlit or contre-jour rim light making the mist droplets glow and scatter in a dramatic luminous cloud, dark gradient or neutral seamless backdrop for contrast, slow-motion feel, the product label clearly readable, premium editorial mist photography, cinematic frozen-moment aesthetic",
        "extra_negative": "no visible mist plume, weak or invisible spray, harsh front flash, background clutter, warped product bottle, distorted label, double product, muddy mist color, overly diffused no-detail cloud, jittery motion"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "dark seamless backdrop, product bottle held at mid-height with nozzle pressed, dramatic backlit mist plume erupting from the tip catching the rim light",
          "pose": "product upright in hand or on riser, nozzle pressed, full mist burst at peak bloom",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow cinematic push-in as the mist plume blooms, brief hold on peak burst, gentle settle"
        ],
        "duration_per_shot": 4,
        "transition": "fade",
        "music_mood": "fresh airy beauty ambient with a subtle swell",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─────────────────────────────────────────────
  // 15. On-Skin Patch Hero  (NEW — 패치/마스크 부착 컷 ◈2 ⚠)
  // ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "OnModel",
    "name": "On-Skin Patch Hero",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 15,
    "rationale": "시트마스크·하이드로콜로이드 패치·사쳇은 실제 피부에 부착된 장면이 가장 직접적인 사용 증거 — 얼굴 일부 또는 손등 부착 컷 4장으로 PDP 사용법 슬롯에 투입. 손가락 노출 시 렌더 리스크 있음.",
    "meta": {
      "provisional": true,
      "flags": ["needs_human_review"],
      "ai_risk": "손가락이 포함된 컷(손등 패치 접착 장면)은 손 렌더링 오류(추가 손가락·변형) 가능. 얼굴 일부 노출 시 부위별 왜곡 리스크. 퍼블리시 전 사람 검수 권장."
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
        "style_preset": "On-Skin Product Beauty",
        "attributes": [
          "lighting:soft_beauty_key_plus_fill",
          "color:neutral_skin_tone_accurate",
          "texture:patch_adhered_skin_interface",
          "context:clean_studio_or_minimal_neutral"
        ],
        "extra_positive": "beauty patch or sheet mask product photography, product adhered directly onto skin — either applied on the under-eye area or cheek (face-partial crop) or on the back of the hand, patch sitting flush against the skin with no lifting edges, soft beauty key light revealing the patch texture and skin surface, true-to-color patch appearance, one shot showing the product packaging beside the applied patch, clean minimal studio backdrop, fresh skincare editorial aesthetic, shot on 85mm at f/4",
        "extra_negative": "six fingers, fused or webbed fingers, lifting or wrinkled patch edges, patch not making contact with skin, uncanny skin texture, harsh shadows, background clutter, warped product packaging, distorted label, oversaturated skin tone"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean neutral backdrop, patch applied on the back of the hand skin surface, soft beauty key light",
          "pose": "hand dorsal view with patch adhered, product packaging placed beside the hand",
          "composition": "closeup"
        },
        {
          "scene": "minimal studio, patch applied on the under-eye or cheek area — face partial crop only",
          "pose": "tight crop on the skin region with patch, no full face — patch flush against skin",
          "composition": "closeup"
        },
        {
          "scene": "white or pale surface, product packaging front-facing beside a single detached patch",
          "pose": "product hero with the patch displayed flat beside it, showing patch texture",
          "composition": "medium_shot"
        },
        {
          "scene": "hand holding the patch by the tab before application, product packaging in background",
          "pose": "patch held by fingertips showing the hydrogel or sheet texture, product in soft focus behind",
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
  // 16. Teeth Shade Card  (NEW — 치아미백 셰이드 진행 text_overlay ◈2)
  // ─────────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Shade",
    "name": "Teeth Shade Card",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 16,
    "rationale": "치아미백 제품은 셰이드 진행 단계가 핵심 전환 신호 — 전·후 셰이드 단계 비교 카드 4장으로 결과를 시각화. 셰이드 가이드 텍스트는 text_overlay. 얼굴 노출 없이 치아·입술 부위만 크롭.",
    "meta": {
      "provisional": true,
      "render_notes": "셰이드 가이드 번호·텍스트(예: A1, B3)는 text_overlay 레이어로 합성. look.extra_negative에 'text'/'logo' 미포함(SAFETY가 전역 차단). 치아 렌더링 특성상 자연스러운 치아 형태·색조 정확도 확인 필수.",
      "text_overlay_fields": ["shade_code", "shade_label", "step_indicator"],
      "flags": ["needs_human_review"],
      "ai_risk": "치아 렌더링 시 비자연스러운 치아 형태·과도한 화이트닝 표현 가능. 셰이드 단계가 현실적이고 점진적으로 표현되는지 검수 필요."
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
        "style_preset": "Teeth Whitening Clinical",
        "attributes": [
          "lighting:soft_flat_clinical_overhead",
          "color:neutral_white_clinical_backdrop",
          "texture:natural_tooth_enamel_gradation",
          "context:clean_clinical_studio"
        ],
        "extra_positive": "teeth whitening shade card beauty photography, tight crop on the mouth/smile area only — no full face — showing natural teeth at a specific whitening shade stage, soft flat clinical overhead light for accurate color rendition, each of the 4 frames shows a progressively lighter shade stage from initial baseline to final bright result, realistic gradual whitening — not extreme bleached white — natural-looking enamel sheen, product packaging placed beside or below the smile crop in at least one frame, clean white clinical backdrop, shade step progression is clear and believable",
        "extra_negative": "unnaturally bleached chalky white teeth, fake CGI teeth, extreme over-whitening, unnatural tooth shape or size, visible full face (crop to mouth and smile only), harsh shadows, yellow cast, background clutter, warped product, distorted label"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clinical white backdrop, tight smile crop — baseline shade (before treatment, initial natural tooth color)",
          "pose": "neutral closed-lip smile revealing teeth, shade at starting point, product packaging below frame edge",
          "composition": "closeup"
        },
        {
          "scene": "same clinical setup — shade step 2 (early progress, subtle brightening)",
          "pose": "same smile crop, same framing, teeth one shade brighter than baseline",
          "composition": "closeup"
        },
        {
          "scene": "same clinical setup — shade step 3 (mid progress, noticeable brightening)",
          "pose": "same smile crop, teeth noticeably brighter, realistic gradation",
          "composition": "closeup"
        },
        {
          "scene": "same clinical setup — final shade result (post-treatment, target brightness achieved), product packaging beside the smile",
          "pose": "same smile crop at final shade, product label visible in the frame",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },
  // ───────────────────────────────────────────── beauty hero family draft (sort 17–24 · 미검증 · provisional · 자동 보류)
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Hero",
    "name": "Stone Plinth Luxe",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 17,
    "rationale": "트래버틴 단상 위 하드 디렉셔널 그림자로 콰이어트 럭셔리를 연출하는 히어로 템플릿으로, 더마·클린·미니멀 브랜드가 무광·불투명 자/튜브/병을 정적이고 조각적으로 보여줄 때 쓴다.",
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
          "lighting:hard_directional_single_source",
          "color:warm_neutral_stone",
          "texture:matte_opaque_sculptural",
          "context:travertine_concrete_plinth"
        ],
        "extra_positive": "premium beauty hero product photography, single product only, never duplicate or invent extra copies, packaging/label identical to the reference, do not fabricate lettering, one matte opaque product standing on a carved travertine and raw concrete plinth, quiet luxury still-life mood, hard directional single key light from camera-right casting a crisp sculptural shadow across the warm neutral stone, no water droplets and a completely dry surface, warm taupe and bone palette with soft sand undertones, gentle bounce fill to keep the matte packaging readable, shot on 100mm macro at f/8, tack-sharp label true to the reference, calm editorial high-end atmosphere, color-accurate brand packaging, fine stone grain and subtle tonal gradient on the seamless backdrop",
        "extra_negative": "warped or melted tube, dented or crushed packaging, distorted label, double product, extra caps, wet glossy water droplets, condensation, plastic-looking sheen, harsh blown highlights crushing the matte surface, muddy lost shadows, fingerprints, dust, cluttered background, oversaturated, cold blue cast, fake glassy reflection beneath an opaque form, hands, fingers, human presence"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "single product centered on a flat travertine plinth against a warm neutral stone sweep, hard directional key from camera-right throwing one clean sculptural shadow to the left",
          "pose": "upright and squared to camera, label facing front",
          "composition": "medium_shot"
        },
        {
          "scene": "product turned to a 3/4 hero angle on a stepped concrete block, raking warm light grazing the matte form to reveal its sculptural silhouette and edge",
          "pose": "rotated three-quarters, slightly elevated on a low riser",
          "composition": "medium_shot"
        },
        {
          "scene": "macro on the cap and the matte finish where surface texture meets the printed label, hard light skimming to show the fine matte grain and seam",
          "pose": "tight crop on the closure and signature detail, product stationary",
          "composition": "closeup"
        },
        {
          "scene": "styled quiet-luxury podium of layered stone slabs with a single sculptural pebble prop, soft sand backdrop and a long directional shadow anchoring the product",
          "pose": "standing on the tallest plinth tier with a subtle prop offset to one side",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    },
    "meta": {
      "provisional": true,
      "flags": [
        "needs_human_review"
      ],
      "ai_risk": "low",
      "risk_notes": [
        "hard_directional_light_may_clip_matte_detail",
        "ensure_opaque_form_has_no_fabricated_glassy_reflection"
      ]
    }
  },
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Hero",
    "name": "Liquid Splash Hero",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 18,
    "rationale": "수분 세럼·바디워시·클렌저처럼 신선함과 액티브함을 강조하고 싶은 뷰티 브랜드가 다이내믹한 고속촬영 스플래시 히어로 컷을 만들 때 사용한다. 제품 둘레로 물·밀크 크라운이 공중에 얼어붙은 프레시 무드를 살린다.",
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
          "lighting:high_speed_strobe_freeze_plus_rim",
          "color:cool_fresh_aqua_white",
          "texture:frozen_water_splash_crown_droplets",
          "context:floating_liquid_on_clean_studio_sweep"
        ],
        "extra_positive": "premium beauty hero product photography, single product only, never duplicate or invent extra copies, packaging/label identical to the reference, do not fabricate lettering, the product standing upright at the exact center while a dynamic crown of crystal-clear water and milky serum splash freezes mid-air around it, suspended droplets and beading mist captured at 1/8000 high-speed flash, fresh wet sheen on the bottle with a glossy reflection pooled beneath, cool aqua-white seamless gradient backdrop, large softbox key from camera-left with a crisp specular rim light from behind to define the glass edge and rim-light each flying droplet, shot on 100mm macro at f/9, tack-sharp label kept fully readable and unobscured, splash arcs framing but never covering the product front, airy luminous high-key mood, color-accurate brand packaging",
        "extra_negative": "splash covering or hiding the label, droplets blurring the product front, warped or melted bottle, distorted label, double product, extra caps, hands, people, plastic or gelatinous fake-looking liquid, motion-blurred mushy splash, harsh blown highlights, muddy shadows, dirty water, fingerprints, dust, cluttered background, oversaturated"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "centered front view on a cool aqua-white seamless sweep, a symmetrical water-and-milk splash crown frozen mid-air behind and to the sides of the bottle, fresh droplets suspended in the air",
          "pose": "product upright and squared to camera, label fully visible and unobscured by splash",
          "composition": "medium_shot"
        },
        {
          "scene": "dynamic 3/4 hero angle, an asymmetric ribbon of liquid arcs and wraps around the bottle with rim-lit flying droplets, condensation beading on the glass",
          "pose": "bottle rotated three-quarters showing depth, splash sweeping behind without crossing the front face",
          "composition": "medium_shot"
        },
        {
          "scene": "extreme macro on the signature detail (cap, neck, or embossed logo) with a fine spray of micro-droplets and a single crisp water bead catching the rim light",
          "pose": "tight crop on the hero detail, geometry locked and razor-sharp",
          "composition": "closeup"
        },
        {
          "scene": "styled hero on a wet glossy acrylic surface, a refined low splash erupting from the base with mirror reflection, soft aqua gradient backdrop and a few clean suspended droplets as accents",
          "pose": "product centered on the reflective podium, controlled splash blooming around the base, label kept clear",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    },
    "meta": {
      "provisional": true,
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "ai_risk": "medium",
      "risk_notes": [
        "liquid_synthesis_render_variance",
        "splash_may_occlude_label",
        "product_geometry_drift",
        "possible_duplicate_product"
      ]
    }
  },
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Hero",
    "name": "Botanical Dew",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 19,
    "rationale": "신선한 아침 정원광과 잎·이슬 무드로 보태니컬·오가닉·클린뷰티(시카, 녹차, 로즈) 브랜드가 내추럴 프레시 히어로 컷을 뽑을 때 쓴다. 그린·뉴트럴 팔레트로 제품의 자연 유래·산뜻함을 강조하면서 식물 소품은 보조에 머물러 제품이 또렷하게 주연이 되도록 설계했다.",
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
          "lighting:soft_morning_garden_backlight",
          "color:fresh_green_neutral_palette",
          "texture:dewy_droplets_on_leaves",
          "context:botanical_natural_setting"
        ],
        "extra_positive": "premium clean-beauty hero product photography, single product resting on smooth river stones among fresh dewy green leaves and a few soft petals, tiny morning dew droplets beading on the foliage and a light condensation sheen on the bottle, soft diffused morning garden backlight glowing through the leaves from behind with a gentle softbox fill from camera-left, airy bright daylight mood with delicate leaf bokeh, shot on 100mm macro at f/8, tack-sharp color-accurate label kept fully legible and unobstructed, natural green and neutral palette true to the reference, botanical props arranged subtly to frame and never crowd the product; single product only, never duplicate or invent extra copies, packaging and label identical to the reference, do not fabricate lettering, product-only with no people or hands",
        "extra_negative": "warped or melted bottle, distorted label, double product, extra caps, plastic-looking leaves, fake-looking petals, overgrown foliage covering the product, oversaturated neon green, harsh blown highlights, muddy shadows, fingerprints, dust, cluttered background, dead or wilted leaves, soil smudges on bottle, green color cast spilling onto the packaging"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "product centered on a flat mossy stone with a soft fan of fresh dewy leaves behind it, gentle morning backlight glowing through the foliage",
          "pose": "front view, label squared to camera and fully legible, bottle upright and crisp",
          "composition": "medium_shot"
        },
        {
          "scene": "product turned to a flattering hero angle, framed by a loose arc of dewy green leaves and a single soft petal, airy garden light with delicate leaf bokeh behind",
          "pose": "3/4 hero angle showing the front face and side profile of the packaging",
          "composition": "medium_shot"
        },
        {
          "scene": "extreme close detail on the bottle's signature texture and cap, with fresh dew droplets and condensation beading on the glass, a blurred dewy leaf just at the edge of frame",
          "pose": "macro on signature detail, product sharp and dominant, foliage softly out of focus",
          "composition": "closeup"
        },
        {
          "scene": "product styled on a low natural stone podium nestled in a bed of fresh leaves and scattered dew, soft morning sun rays streaming from behind for a luminous botanical mood",
          "pose": "styled hero presentation, bottle upright and clearly the focal point above the foliage",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    },
    "meta": {
      "provisional": true,
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "ai_risk": "medium",
      "risk_notes": [
        "foliage_may_crowd_or_occlude_product",
        "label_legibility_at_risk_behind_leaves",
        "plastic_or_fake_looking_botanical_props",
        "green_color_cast_spill_onto_packaging"
      ]
    }
  },
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Hero",
    "name": "Noir Gold Hero",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 20,
    "rationale": "럭셔리 안티에이징 세럼이나 골드/유리 패키징 향수를 파는 브랜드가 드라마틱한 오뜨 럭셔리 히어로 컷이 필요할 때 사용한다. 딥 차콜 배경과 골드 림라이트로 프리미엄·고급감을 강조하면서도 암부에서 라벨 디테일을 보존한다.",
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
          "lighting:warm_gold_rim_plus_low_key_fill",
          "color:dark_charcoal_black_with_gold",
          "texture:glossy_reflection_polished_glass",
          "context:dramatic_haute_luxury_dark_set"
        ],
        "extra_positive": "premium luxury beauty hero product photography, single product only, never duplicate or invent extra copies, packaging/label identical to the reference, do not fabricate lettering, single anti-aging serum or fragrance bottle on a black polished stone slab, deep charcoal-to-black gradient backdrop, dramatic haute couture mood, warm golden rim light raking from behind to trace the glass edge and gold cap, a soft controlled fill from camera-left lifting label detail out of the shadows, glossy mirror reflection pooled beneath the bottle, fine wisps of atmospheric haze catching the warm light, shot on 100mm macro at f/8, tack-sharp label, rich deep shadows with luminous warm highlights, color-accurate brand packaging true to the reference, opulent and editorial",
        "extra_negative": "warped or melted bottle, distorted label, double product, extra caps, blown-out gold highlights, crushed pure-black label losing detail, muddy lifted blacks, plastic-looking liquid, harsh specular hotspots, fingerprints, dust, color cast on white packaging, oversaturated gold, cluttered background"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "single product centered on a black polished stone slab against a deep charcoal-to-black gradient, warm gold rim light from behind and a soft controlled fill lifting the label, mirror reflection pooled beneath",
          "pose": "front view with the label squared to camera, fully legible despite the dark moody set",
          "composition": "medium_shot"
        },
        {
          "scene": "the bottle turned to a dramatic 3/4 hero angle on the dark set, golden rim light tracing the glass edge and cap, atmospheric haze catching the warm glow behind",
          "pose": "3/4 hero angle showing depth and dimensional form, gold cap catching a warm specular highlight",
          "composition": "medium_shot"
        },
        {
          "scene": "extreme macro on the signature detail of the packaging, the gold cap engraving or embossed glass and the label edge, raking warm light revealing fine texture out of deep shadow",
          "pose": "tight crop on the signature gold detail and label edge, true-to-reference finish",
          "composition": "closeup"
        },
        {
          "scene": "styled on a low dark podium with a single subtle luxury prop such as a smooth black river stone or a sheer drape of silk, deep shadows framing the product, opulent editorial mood",
          "pose": "product standing on the podium as the clear hero, prop placed subtly off to one side and out of focus",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    },
    "meta": {
      "provisional": true,
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "ai_risk": "medium",
      "risk_notes": [
        "dark_scene_label_legibility_risk",
        "gold_highlight_clipping_risk",
        "reflection_may_duplicate_product"
      ]
    }
  },
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Hero",
    "name": "Cryo Frost Hero",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 21,
    "rationale": "쿨링·진정·디퍼핑 라인(아이크림·세럼·미스트)을 운영하는 뷰티 브랜드가 아이시 블루 성에·콜드 베이퍼 무드로 청량·진정감을 강조한 히어로 컷이 필요할 때 사용한다. 결정 디테일과 차가운 색온도로 프레시한 효능 서사를 전달한다.",
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
          "lighting:cool_directional_key_plus_icy_rim",
          "color:icy_blue_cold_palette",
          "texture:frost_crystals_cold_vapor",
          "context:frozen_studio_sweep"
        ],
        "extra_positive": "premium beauty hero product photography, single product staged on a clear glass ice block with crisp frost crystals and delicate ice cube fragments, cold vapor and chilled fog drifting low around the base, fine condensation frost feathering on cold surfaces while the label stays clean and frost-free, icy blue cool palette with crystalline sparkle, soft gradient seamless backdrop in pale glacier blue, directional cool softbox key from camera-left paired with a crisp icy specular rim light from behind to define edges, shot on 100mm macro at f/8, label stays color-accurate and true-to-reference, fresh refreshing cooling mood, accurate cold color temperature, color-accurate brand packaging, single product only, never duplicate or invent extra copies, packaging/label identical to the reference, do not fabricate lettering",
        "extra_negative": "frost or ice obscuring the label, warm color cast, yellow tint, melted slushy mess, warped or melted bottle, distorted label, double product, extra caps, plastic-looking ice, fake cgi crystals, harsh blown highlights, muddy shadows, fingerprints, dust, cluttered background, oversaturated"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "product centered on a frosted glass ice block over a pale glacier-blue seamless sweep, cold vapor pooling low, icy crystalline sparkle catching the rim light, label squared to camera and kept frost-free",
          "pose": "front view, label squared to camera, single product only, packaging identical to reference",
          "composition": "medium_shot"
        },
        {
          "scene": "hero 3/4 angle on a clear ice block surrounded by scattered ice cube fragments and drifting cold fog, icy blue palette, directional cool key with crisp specular rim defining the edge",
          "pose": "rotated to a 3/4 hero angle, standing upright, single product only, no duplicates",
          "composition": "medium_shot"
        },
        {
          "scene": "extreme close on the signature detail with delicate frost crystals feathering on the cold surface beside it, fine condensation and crystalline sparkle, label area stays clean and legible",
          "pose": "static, signature detail filling the frame, single product only",
          "composition": "closeup"
        },
        {
          "scene": "styled on a chiseled ice-cube podium with a single ice shard prop and low chilled mist, glacier-blue gradient backdrop, airy refreshing cooling mood, cold color temperature preserved",
          "pose": "styled upright on the icy podium, single product only, packaging true to reference",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    },
    "meta": {
      "provisional": true,
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "ai_risk": "medium",
      "risk_notes": [
        "frost/ice may creep over and obscure the label — negatives and per-shot scene notes enforce a frost-free, legible label zone",
        "cold-vapor and translucent ice can render as plastic/CGI or introduce a warm cast — guarded via 'plastic-looking ice', 'fake cgi crystals', 'warm color cast', 'yellow tint' negatives",
        "ice fragments risk reading as duplicate products — single-product guard and 'double product' negative applied"
      ]
    }
  },
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Hero",
    "name": "Silk Drape Hero",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 22,
    "rationale": "럭셔리 세럼·크림·향수 브랜드가 흐르는 실크/새틴 주름 위에 제품을 올려 우아한 주얼톤 히어로 컷을 뽑을 때 사용한다. 직물 드레이프가 제품을 받치되 가리지 않아 고급스러운 광택과 색감을 그대로 살려준다.",
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
          "lighting:soft_directional_key_plus_satin_sheen",
          "color:jewel_tone_emerald_burgundy_blush",
          "texture:flowing_silk_satin_drape",
          "context:luxury_fabric_still_life"
        ],
        "extra_positive": "premium beauty hero product photography, single luxury product resting on flowing draped silk and satin with elegant rolling folds, rich jewel-tone palette of emerald, burgundy and soft blush catching gentle highlights, lustrous fabric sheen with smooth gradient ripples cradling but never covering the product, soft directional key light from camera-left with a delicate satin specular glow to model the folds, subtle warm reflection of the cloth on the glossy packaging, shot on 100mm macro at f/8, tack-sharp label, opulent refined mood, color-accurate brand packaging true to the reference, single product only, never duplicate or invent extra copies, packaging/label identical to the reference, do not fabricate lettering",
        "extra_negative": "fabric covering or obscuring the product, wrinkled messy cloth, cheap polyester look, warped or melted bottle, distorted label, double product, extra caps, plastic-looking sheen, harsh blown highlights on satin, muddy crushed shadows, lint, dust, fingerprints on glass, oversaturated jewel tones, cluttered background, human hands"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "product standing upright on smoothly draped emerald silk, soft folds fanning out behind it, refined luxury still life",
          "pose": "front view with label squared to camera",
          "composition": "medium_shot"
        },
        {
          "scene": "product set on a gentle rise of burgundy satin, rolling folds sweeping diagonally to add depth, opulent hero staging",
          "pose": "rotated to a flattering 3/4 hero angle",
          "composition": "medium_shot"
        },
        {
          "scene": "extreme close detail of the signature cap and label edge against blush satin sheen, fabric ripples softly out of focus",
          "pose": "macro framing on the signature detail with shallow depth",
          "composition": "closeup"
        },
        {
          "scene": "product styled on a low silk-draped podium with a single elegant prop such as a folded satin ribbon, jewel-tone palette, luminous luxury editorial",
          "pose": "elevated centered hero placement",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    },
    "meta": {
      "provisional": true,
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "ai_risk": "medium",
      "risk_notes": [
        "fabric_may_occlude_product",
        "satin_specular_blowout",
        "jewel_tone_oversaturation"
      ]
    }
  },
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Hero",
    "name": "Sunlit Pop",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 23,
    "rationale": "컬러풀한 색조 메이크업이나 SPF/선케어 브랜드의 마케터가 비비드하고 플레이풀한 모던 팝 무드의 히어로 컷이 필요할 때 쓰는 템플릿. 하드 햇살과 채도 높은 그라디언트 배경으로 영-비비드 감성을 살리면서도 라벨은 또렷하게 유지한다.",
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
          "lighting:hard_direct_sun_sharp_shadow",
          "color:vivid_saturated_gradient",
          "texture:clean_matte_pop",
          "context:colorful_paper_sweep"
        ],
        "extra_positive": "premium beauty hero product photography, single product only, never duplicate or invent extra copies, packaging and label identical to the reference, do not fabricate lettering, product-only with no people or hands in frame, the single product standing on a smooth colored paper sweep with a vivid saturated gradient backdrop blending sunny yellow into hot coral, hard direct sunlight raking from camera-right casting a single crisp graphic shadow with clean sharp edges, modern playful pop aesthetic, bright bold candy color palette kept clean and controlled, shot on 100mm macro at f/8, tack-sharp legible label true to reference, punchy high-contrast yet color-accurate brand packaging, glossy crisp specular highlight on the cap, airy summery editorial mood",
        "extra_negative": "warped or melted bottle, distorted label, double product, duplicate copies, extra caps, oversaturated neon clipping, blown-out highlights, muddy crushed shadows, dull flat lighting, soft blurry shadow, fingerprints, dust, cluttered background, washed-out colors, color banding, people, hands"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "vivid yellow-to-coral gradient paper sweep under hard direct sun, single crisp graphic shadow falling to camera-left",
          "pose": "product standing upright, front face and label squared to camera",
          "composition": "medium_shot"
        },
        {
          "scene": "saturated candy-color sweep with sharp summery sunlight, playful pop styling",
          "pose": "product turned to a 3/4 hero angle showing front and side, hard shadow anchoring it",
          "composition": "medium_shot"
        },
        {
          "scene": "tight frame on the signature cap and label detail, raking hard sun revealing crisp specular highlight and clean edge",
          "pose": "product centered, macro on the signature detail with the label fully legible",
          "composition": "closeup"
        },
        {
          "scene": "product on a small colored acrylic block riser against the bold gradient, one simple geometric prop and a bright cast shadow",
          "pose": "product staged on the podium, slight tilt, hero presentation",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    },
    "meta": {
      "provisional": true,
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "ai_risk": "medium",
      "risk_notes": [
        "hard_shadow_intentional_may_read_as_error",
        "oversaturation_risk_on_vivid_gradient",
        "label_legibility_under_high_contrast"
      ]
    }
  },
  {
    "mode": "product",
    "vertical": "beauty",
    "category": "Hero",
    "name": "Aqua Float",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 24,
    "rationale": "아쿠아젤·수분·하이드라 라인이나 미스트 브랜드가 청량한 수분감과 클린 블루 무드의 히어로 이미지가 필요할 때 쓴다. 잔물결 수면 위 반사·코스틱으로 순수 워터 컨셉을 강조하되 라벨 면은 수면 위로 띄워 굴절 왜곡을 방지한다.",
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
          "lighting:cool_top_key_plus_aqua_caustics",
          "color:clean_hydra_blue",
          "texture:rippling_water_surface_wet_sheen",
          "context:calm_pool_seamless_water"
        ],
        "extra_positive": "premium beauty hero product photography, single hydration product resting on a calm rippling water surface with its label face held above the waterline, crystal-clear shallow water with gentle concentric ripples, dancing caustic light patterns shimmering on the surface and base, dewy condensation and fine droplets beading on the upper bottle, pristine mirror-like reflection on the still water, soft cool gradient seamless backdrop in clean hydra blue, large softbox top key with a crisp specular rim to define the glass edge against the water, shot on 100mm macro at f/8, tack-sharp label, airy luminous high-key aquatic mood, refreshing pure-water freshness, color-accurate brand packaging, single product only, never duplicate or invent extra copies, packaging and label identical to the reference, do not fabricate lettering",
        "extra_negative": "warped or melted bottle, distorted label, refraction-warped lettering, underwater label blur, double product, extra caps, murky or dirty water, muddy turbid pool, plastic-looking liquid, harsh blown highlights, oversaturated cyan, chaotic foam and spray, muddy shadows, fingerprints, dust, cluttered background"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Product standing on a calm shallow water surface, label face squared to camera and held clearly above the waterline, gentle concentric ripples spreading out, soft caustic light on the water, clean hydra-blue seamless gradient behind",
          "pose": "front view, label squared to camera, upright and centered",
          "composition": "medium_shot"
        },
        {
          "scene": "Hero three-quarter angle of the bottle half-resting on rippling water, glass edge catching a crisp specular rim, mirror reflection pooled on the still surface, dancing caustics around the base",
          "pose": "rotated to a 3/4 hero angle, label still readable and above the waterline",
          "composition": "medium_shot"
        },
        {
          "scene": "Macro on the signature detail where the bottle meets the water, fresh droplets and condensation beading on the glass, fine surface ripples and shimmering caustic highlights, true-to-reference color",
          "pose": "tight crop on the cap and shoulder of the bottle at the waterline, no submersion of the label",
          "composition": "closeup"
        },
        {
          "scene": "Styled aquatic podium, product on a frosted acrylic riser barely emerging from a thin sheet of water with subtle ripples, a single smooth pebble or water lily leaf as a minimal prop, airy high-key clean-blue studio mood",
          "pose": "upright on the riser, label squared and lifted above the water",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    },
    "meta": {
      "provisional": true,
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "ai_risk": "medium",
      "risk_notes": [
        "half_submerged_refraction_label_distortion",
        "water_caustics_can_create_phantom_reflections_or_duplicate_product",
        "transparent_aqua_gel_may_render_as_plastic_or_lose_form"
      ]
    }
  }
];
