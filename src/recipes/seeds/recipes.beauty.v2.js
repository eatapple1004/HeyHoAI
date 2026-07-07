/* ⚠️ 2026-07-08: Hero 카테고리 10종 제거 — Product Hero 파라미터형 템플릿(recipes.producthero.v2.js)으로 이관.
 *   단독 노출 중복 + producthero 자식과 id 충돌(stone-plinth-luxe 등) 해소. beauty 24→14.
 */
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
      "flags": [
        "experimental",
        "needs_human_review"
      ],
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
      "flags": [
        "experimental",
        "needs_human_review"
      ],
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
      "flags": [
        "needs_human_review"
      ],
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
      "text_overlay_fields": [
        "ingredient_name",
        "claim_headline",
        "percentage_callout",
        "brand_logo_position"
      ]
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
      "text_overlay_fields": [
        "shade_name",
        "shade_number",
        "hex_swatch"
      ]
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
      "flags": [
        "experimental",
        "needs_human_review"
      ],
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
      "flags": [
        "needs_human_review"
      ],
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
      "text_overlay_fields": [
        "shade_code",
        "shade_label",
        "step_indicator"
      ],
      "flags": [
        "needs_human_review"
      ],
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
  }
];
