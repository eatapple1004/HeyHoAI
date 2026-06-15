/**
 * Doppia recipe seed — food (product mode), v2: 7 templates.
 * 통합 스키마 v1. recipes 테이블에 INSERT.
 *
 * v1→v2 변경 내역:
 *  - 360 Glaze Spin 제거 (Sizzle & Steam ASMR와 근접 중복)
 *  - Full Menu Pack ◈8 cut→replace → Menu / Price Card ◈3 (count 6; 정직 재정가, 12–16 메뉴 확장 시 ◈4+)
 *  - ADD: Menu / Price Card (text_overlay 레이어 방식, 텍스트 SAFETY_NEGATIVE 우회)
 *  - ADD: Serving & Table Lifestyle (인물 손·테이블 맥락, 소셜 콘텐츠용)
 *  - ADD: Single-Dish Sizzle (◈2 1-shot 최저가 릴)
 */
module.exports = [
  /* ─────────────────────────────────────────────
     1. Top-Down Hero  |  image_set ◈2  |  KEEP
     최저가 진입점 — 메뉴보드·배달앱 플랫레이 썸네일
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "food",
    "category": "Studio",
    "name": "Top-Down Hero",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "카페·레스토랑 메뉴보드·배달앱 썸네일용 플랫레이; 가장 저렴한 ◈2 진입점으로 썸네일 크기에서 즉각 인지 가능.",
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
        "style_preset": "Studio",
        "attributes": [
          "lighting:overhead_softbox",
          "color:neutral_clean",
          "texture:food_fresh",
          "context:tabletop_flatlay"
        ],
        "extra_positive": "appetizing food photography shot perpendicular from directly above, the plated dish identical to the uploaded reference with the same ingredients, plating, garnish, color and proportions, never inventing or substituting different food, 50mm lens at f/8 for deep depth of field, even diffused overhead softbox with a large bounce card filling shadows, garnish crisp and freshly plated, subtle natural prop styling (linen napkin, single utensil, scattered ingredients) arranged with negative space, sharp edge-to-edge focus, commercial menu-hero quality",
        "extra_negative": "tilted horizon, perspective distortion, harsh specular hotspots, blown highlights, color cast, warped or melted food, duplicated dishes, plastic CGI-looking food, soggy wilted garnish, unappetizing dull color, stray fingers or hands in frame, dirty plate rim, smudged plate edge, messy stray crumbs"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "matte light-grey ceramic surface, minimal styling, generous negative space",
          "pose": "perfect 90-degree top-down, dish centered, front-facing garnish up",
          "composition": "medium_shot"
        },
        {
          "scene": "warm oak wood tabletop with a folded linen napkin and one fork",
          "pose": "top-down, dish offset to thirds with prop balance",
          "composition": "medium_shot"
        },
        {
          "scene": "dark slate board with scattered raw ingredients (herbs, citrus, spices) framing the dish",
          "pose": "top-down flat-lay, ingredients radiating outward",
          "composition": "medium_shot"
        },
        {
          "scene": "clean white marble counter, bright airy styling",
          "pose": "tighter top-down crop showing plating detail and texture",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────
     2. Drip & Steam Macro  |  image_set ◈2  |  KEEP (◈4→◈2 재정가)
     음료·디저트 식욕 자극 클로즈업 — 전환율 최고 정지 이미지
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "food",
    "category": "Macro",
    "name": "Drip & Steam Macro",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "음료·디저트 브랜드의 핵심 식욕 클로즈업; 흘러내리는 소스·피어오르는 스팀 매크로는 전환율이 가장 높은 정지 이미지 포맷.",
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
          "lighting:hard_rim_backlight",
          "color:rich_saturated",
          "texture:glossy_wet",
          "context:dark_moody"
        ],
        "extra_positive": "extreme macro food photography, 100mm macro lens at f/4 with razor-thin depth of field, the dish identical to the uploaded reference in texture, ingredients and color, every macro detail drawn from the actual reference food rather than a fabricated substitute, dramatic side and back rim light catching translucent steam and glistening condensation, slow-motion sauce or chocolate dripping mid-air, frozen splash droplets, melting cheese pull or glaze sheen, deep moody background falloff, mouth-watering tactile detail",
        "extra_negative": "flat even lighting, dull matte surface, dry lifeless food, fake CGI steam, plastic-looking droplets, frozen unnatural splash, motion blur on the dish itself, over-sharpened halos, noise grain in shadows, warped product, oversaturated neon color clipping, dust spots, stray hands in frame"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "dark charcoal backdrop, single hard rim light from behind",
          "pose": "detail macro of rising steam curling off a hot drink or dish surface",
          "composition": "closeup"
        },
        {
          "scene": "moody low-key set, spotlit",
          "pose": "mid-pour sauce/glaze/syrup drip caught mid-air over the food",
          "composition": "closeup"
        },
        {
          "scene": "cold-toned background with backlight",
          "pose": "macro of beaded condensation running down a chilled glass or icy surface",
          "composition": "closeup"
        },
        {
          "scene": "warm dark wood, dramatic chiaroscuro",
          "pose": "extreme texture macro — cheese pull, crumb, or glossy frosting peak",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────
     3. Golden-Hour Cafe Mood  |  image_set ◈2  |  KEEP (◈3→◈2 재정가)
     분위기 판매형 카페·브런치 라이프스타일 세트
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "food",
    "category": "Lifestyle",
    "name": "Golden-Hour Cafe Mood",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 3,
    "rationale": "분위기를 파는 독립 카페·브런치 공간; 따뜻한 골든아워 라이프스타일 신이 인스타그램 리치를 견인.",
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
          "lighting:golden_hour",
          "color:film_fuji_warm",
          "texture:soft_haze",
          "context:cafe_indoor"
        ],
        "extra_positive": "cozy lifestyle cafe photography, the dish rendered identical to the uploaded reference with the exact same color, plating, garnish and proportions, late-afternoon golden sunlight raking through a window casting long warm shadows and soft lens haze, 35mm film look at f/2 with gentle grain and creamy bokeh, product placed naturally in a lived-in cafe scene with steam and warm ambiance, shallow depth of field, inviting aspirational mood",
        "extra_negative": "cold blue color cast, flat overcast light, clinical studio look, harsh flash, sterile empty background, overexposed window blowout, plastic CGI food, warped or melted food, unappetizing dull color, cluttered messy table, people's faces in frame, hands in frame, oversharpening halos, HDR glow"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "rustic wooden cafe table beside a sunlit window, golden light streaming in",
          "pose": "product placed naturally with soft shadow, front 3/4 view",
          "composition": "medium_shot"
        },
        {
          "scene": "marble bar counter with espresso machine bokeh behind",
          "pose": "product staged on a saucer with a small dessert prop",
          "composition": "medium_shot"
        },
        {
          "scene": "cozy window seat with a book and trailing plant, warm haze",
          "pose": "product in a relaxed everyday-use vignette",
          "composition": "medium_shot"
        },
        {
          "scene": "outdoor cafe terrace, sun flare and greenery",
          "pose": "tight intimate crop of the product catching the golden light",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────
     4. Serving & Table Lifestyle  |  image_set ◈2  |  NEW ⚠️(손·needs_human_review)
     손·테이블 맥락 라이프스타일 — 현대 레스토랑 소셜 콘텐츠 핵심 JTBD
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "food",
    "category": "Lifestyle",
    "name": "Serving & Table Lifestyle",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 4,
    "rationale": "레스토랑·카페 소셜에서 '실제 서빙 순간'이 가장 저장·공유율이 높음; 손·테이블·주변 맥락을 더해 인간적 온기와 현장감을 전달.",
    "meta": {
      "flags": ["needs_human_review"],
      "review_reason": "손(hand) 렌더링 — 융합·추가 손가락·기형 손 위험. 단일 손·정확히 5손가락·얼굴 미노출(제품 모드) 보장을 위해 사람 검수 필요."
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
          "lighting:warm_directional",
          "color:natural_warm",
          "texture:food_fresh",
          "context:restaurant_table"
        ],
        "extra_positive": "modern restaurant table lifestyle photography, hands gracefully placing or serving the dish on a beautifully set table, the served dish identical to the uploaded reference with the same food, plating, color and proportions, a single well-formed hand with exactly five natural fingers and an anatomically correct grip, neatly manicured fingernails, soft warm directional window light, linen napkins, wine glasses or water glasses in the background bokeh, casual elegant dining atmosphere, shot on a 50mm lens at f/2.8, shallow depth of field, genuine human moment, fresh vibrant food, editorial food magazine quality",
        "extra_negative": "faces or heads in frame, ugly or unmanicured hands, dirty fingernails, six fingers, fused or webbed digits, awkward stiff hand grip, flat lighting, sterile studio look, warped or melted food, plastic CGI food, unappetizing color, cluttered foreground, oversharpening, harsh flash shadows, empty soulless table"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "elegant restaurant table with linen and glassware, warm window light",
          "pose": "two hands placing the plated dish onto the table from above, confident serving motion",
          "composition": "medium_shot"
        },
        {
          "scene": "rustic wooden bistro table, casual dining setup",
          "pose": "one hand reaching in from the side to present the dish, natural moment",
          "composition": "medium_shot"
        },
        {
          "scene": "outdoor terrace table with greenery bokeh, golden afternoon light",
          "pose": "dish freshly set on the table, a hand withdrawing gracefully, steam rising",
          "composition": "medium_shot"
        },
        {
          "scene": "intimate table for two, candle and glassware in soft bokeh",
          "pose": "tight over-table crop of the hero dish surrounded by a full table setting",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────
     5. Menu / Price Card  |  image_set ◈3  |  NEW 🅣(text_overlay)
     텍스트 오버레이 방식 — SAFETY_NEGATIVE 'text'/'logo' 미포함
     모델은 요리 그리드 배경만 생성; 메뉴명·가격 텍스트는 결정론적 오버레이 레이어
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "food",
    "category": "Menu",
    "name": "Menu / Price Card",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 5,
    "rationale": "레스토랑·카페가 가장 자주 요청하는 메뉴판·가격표 소셜 카드; 텍스트 오버레이 파이프라인으로 SAFETY_NEGATIVE 제약 우회, 12 메뉴 항목까지 확장 가능.",
    "meta": {
      "render_notes": "AI 모델은 요리 그리드 배경 이미지(빈 플레이트/음식 배열)만 생성합니다. 메뉴명·가격·섹션 헤더 등 모든 텍스트는 생성 후 결정론적 텍스트 오버레이 레이어(Doppia 렌더 파이프라인)가 합성합니다. 'text'/'logo'는 SAFETY_NEGATIVE_PROMPT가 전역 자동 주입으로 이미 처리하므로 look.extra_negative(엔진이 읽는 live 필드)에 'text' 및 'logo'를 다시 넣지 마십시오 — 중복 주입 시 배경 이미지에서 메뉴 아이템 플레이트까지 억제됩니다.",
      "text_overlay_fields": ["menu_item_name", "price", "section_header", "currency_symbol"],
      "max_menu_items": 16
    },
    "text_overlay": true,
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": {
        "type": "image_set",
        "count": 6,
        "aspect_ratio": "4:5"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Studio",
        "attributes": [
          "lighting:overhead_softbox",
          "color:neutral_clean",
          "texture:food_fresh",
          "context:menu_grid_layout"
        ],
        "extra_positive": "clean commercial menu card background, multiple beautifully plated dishes arranged in a symmetrical grid layout on a neutral surface, each dish faithful to its uploaded reference photo with no invented or altered food, distinct dish per cell with no accidental duplicate or cloned plate repeated across cells, consistent even overhead softbox lighting across all dishes, top-down 50mm lens at f/8 for even edge-to-edge focus across the grid, generous negative space between items reserved for price and name label overlays, each dish appetizing, cohesive color palette, professional restaurant menu photography aesthetic",
        "extra_negative": "tilted horizon, inconsistent lighting across dishes, cluttered background, warped or melted food, plastic CGI food, wilted garnish, harsh hotspots, color cast, messy uneven arrangement, duplicated identical dishes across grid cells, dishes overlapping into label zones, insufficient negative space for overlays, unappetizing color, stray hands in frame, dirty plates"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "light grey neutral surface, overhead softbox, 4-dish grid (2×2) with generous margins",
          "pose": "top-down, dishes evenly spaced with empty label zones below each",
          "composition": "medium_shot"
        },
        {
          "scene": "same neutral surface, 4-dish grid featuring drinks column alongside mains",
          "pose": "top-down, alternating dish + drink grid, consistent hero framing",
          "composition": "medium_shot"
        },
        {
          "scene": "warm oak surface, 2-dish hero row — signature items only",
          "pose": "top-down, two hero dishes side-by-side with wide label space below",
          "composition": "medium_shot"
        },
        {
          "scene": "dark slate surface, 4-dish grid — evening/dinner section mood",
          "pose": "top-down grid with candle-warmth color treatment, label zones intact",
          "composition": "medium_shot"
        },
        {
          "scene": "clean white marble, single featured dish of the day format",
          "pose": "top-down centered, large negative header zone above for 'Today's Special' overlay",
          "composition": "medium_shot"
        },
        {
          "scene": "neutral surface, horizontal 3-dish row — dessert / drinks section",
          "pose": "top-down, three-across arrangement, footer zone for price row overlay",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────
     6. Single-Dish Sizzle  |  reel ◈2  |  NEW
     최저가 1-shot 릴 — 단일 시그니처 메뉴 즉각 공유용
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "food",
    "category": "Reel",
    "name": "Single-Dish Sizzle",
    "output_type": "reel",
    "credit_cost": 2,
    "sort_order": 6,
    "rationale": "오늘의 메뉴·신메뉴 출시 즉각 게시용 가장 저렴한 릴(◈2); 1-shot 단일 식욕 자극 모션으로 빠른 소셜 반응 확인에 최적.",
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
        "style_preset": "Cinematic",
        "attributes": [
          "lighting:warm_directional",
          "color:rich_saturated",
          "texture:glossy_wet",
          "context:dark_moody"
        ],
        "extra_positive": "single hero dish cinematic food moment, the exact dish from the uploaded reference photo kept identical and stable across the entire clip with no morphing into a different food mid-motion, 100mm macro lens at f/2.8-f/4, warm key light with soft rim catching steam and sheen, glistening sauce or glaze, shallow depth of field, slow deliberate motion revealing texture, premium appetite-trigger close-up, short punchy social reel energy",
        "extra_negative": "flat lighting, dry dull food, fake plastic CGI steam, plastic CGI look, jittery shaky framing, harsh blown highlights, frozen lifeless motion, warped product, food geometry morphing mid-clip, toppings shifting during motion, flickering, stutter, unappetizing color, color banding, oversaturated clipping, stray hands in frame"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "dark moody set, single warm key light, freshly plated hero dish",
          "pose": "slow macro push-in from side angle, steam rising, sauce glistening",
          "composition": "closeup"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow macro push-in catching steam and glaze in warm light"
        ],
        "duration_per_shot": 4,
        "transition": "none",
        "music_mood": "lo-fi culinary ASMR groove, 70-85 BPM, warm sizzle foley and soft kick with mellow Rhodes and muted upright bass, intimate low-energy appetizing ambience, reference Bonobo 'Kerala' texture",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────
     7. Sizzle & Steam ASMR  |  reel ◈6  |  KEEP (360 Glaze 흡수) ⚠️(360 모핑·needs_human_review)
     3-shot 시네마틱 릴 — 알고리즘 히어로 ASMR
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "food",
    "category": "Reel",
    "name": "Sizzle & Steam ASMR",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 7,
    "rationale": "알고리즘 쇼트폼을 노리는 레스토랑·길거리음식 브랜드; 스팀·글레이즈·풀백 3-shot ASMR 릴이 카탈로그 모션 히어로. 360 Glaze Spin(중복)을 흡수해 통합.",
    "meta": {
      "flags": ["needs_human_review"],
      "review_reason": "풀백/오빗 모션 중 토핑·패싯·dish geometry 모핑 위험. 프레임 간 일관성 유지를 위해 사람 검수 필요."
    },
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
        "style_preset": "Cinematic",
        "attributes": [
          "lighting:warm_directional",
          "color:rich_saturated",
          "texture:glossy_wet",
          "context:dark_moody"
        ],
        "extra_positive": "cinematic food ASMR, CRITICAL: same dish identity across all three shots, locked geometry and plating, no morph or drift, dish identical to the uploaded reference; macro 100mm lens at f/2.8, warm directional key with a soft rim, live rising steam and audible-looking sizzle, glistening juices and bubbling surfaces, shallow depth of field with creamy falloff, slow deliberate reveal of texture, premium close-up appetite trigger; third shot: pull-back hero reveal showing glaze sheen sweeping across the dish surface as camera orbits, consistent dish geometry throughout",
        "extra_negative": "flat lighting, dry dull food, fake plastic CGI steam, plastic CGI look, jittery shaky framing, harsh blown highlights, frozen lifeless motion, warped product, morphing toppings or facets between shots, inconsistent dish geometry across frames, flickering, stutter, unappetizing color, color banding, oversaturated clipping, stray hands in frame"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "dark moody set, single warm key light, hot dish just plated",
          "pose": "macro hold on the sizzling surface with rising steam",
          "composition": "closeup"
        },
        {
          "scene": "low-key background with spotlight on the food",
          "pose": "detail of bubbling sauce / melting glaze / juices pooling, glaze sheen sweeping across as light rakes",
          "composition": "closeup"
        },
        {
          "scene": "warm wooden table, soft rim light, full hero presentation",
          "pose": "pull-back reveal of the finished dish, steam still rising, glaze gleaming under the rim light",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow macro push-in on the steam",
          "slow lateral drift across the bubbling surface, light raking the glaze",
          "smooth pull-back dolly revealing the full dish, glaze sheen peaking"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "ambient ASMR foley, 60 BPM, layered close-mic sizzle and gentle crackle over warm low pad and soft sub hum, intimate slow-build energy, reference Samsung 'Sizzle' food spots and Bon Appetit kitchen ASMR",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────
     8. Ingredient Callout  |  image_set ◈2  |  NEW (allow_text · ⚠️ needs_human_review)
     음식 + 손글씨 재료 라벨/화살표(디컨스트럭트 콜아웃). 유저가 추가 프롬프트에
     재료명만 나열 → AI가 각 재료에 라벨을 그림. config.allow_text=true 로 이 템플릿만
     전역 SAFETY의 'text'/'logo' 억제를 해제(리졸버 분기). 글자=AI 렌더라 사람검수.
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "food",
    "category": "Callout",
    "name": "Ingredient Callout",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 8,
    "rationale": "재료 구성을 손글씨 라벨+화살표로 소개하는 디컨스트럭트 콜아웃; 유저가 추가 프롬프트에 재료명만 나열하면 각 재료에 라벨이 달려 메뉴 투명성·교육·바이럴 저장 콘텐츠로 강함.",
    "meta": {
      "flags": ["needs_human_review"],
      "review_reason": "AI가 손글씨 텍스트 라벨을 직접 렌더 → 철자/배치 오류 가능. 재료명 정확성·화살표 위치 사람 검수 필요.",
      "user_prompt_hint": "추가 프롬프트에 재료 이름만 콤마로 나열. 예: ciabatta, mortadella, mozzarella, sun-dried tomato, basil pesto, rucola, olive"
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
      "allow_text": true,
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
        "style_preset": "Studio",
        "attributes": [
          "lighting:soft_even_daylight",
          "color:neutral_clean",
          "texture:food_fresh",
          "context:annotated_callout"
        ],
        "extra_positive": "appetizing food photographed on a plain plate or brushed oval metal tray against a clean light-grey seamless background, soft even daylight, slightly elevated 30 to 45 degree angle showing the dish and its components clearly, the food kept identical to the uploaded reference in shape, color and ingredients, a few loose components placed beside the dish on the tray for clarity, delicate hand-written WHITE cursive ingredient labels neatly placed in the empty background around the dish, each label connected by a thin hand-drawn curved arrow pointing precisely to the matching ingredient in the food, the labels spell exactly the ingredient names provided by the user, clean editorial deconstructed-ingredient annotation style, legible accurate spelling, balanced uncrowded label layout with generous negative space",
        "extra_negative": "plastic-looking food, warped or melted food, duplicated dishes, soggy wilted garnish, fake CGI steam, cluttered or busy patterned background, gibberish or misspelled labels, illegible scribbles, overlapping crowded labels, arrows pointing at nothing, typed or printed computer font, neon glowing letters, oversaturated, harsh flash, faces or heads in frame, hands"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "brushed stainless oval tray on a light-grey seamless background, a few loose ingredients placed beside the dish",
          "pose": "30 to 45 degree elevated view, white cursive labels in the background with thin curved arrows pointing to each ingredient",
          "composition": "medium_shot"
        },
        {
          "scene": "matte light-grey ceramic plate, clean negative space all around",
          "pose": "near top-down, handwritten white labels arranged around the rim with delicate arrows to each component",
          "composition": "medium_shot"
        },
        {
          "scene": "warm oak serving board on a pale neutral background, scattered loose components for clarity",
          "pose": "45 degree view, white cursive callouts with thin hand-drawn arrows to each ingredient",
          "composition": "medium_shot"
        },
        {
          "scene": "clean white marble surface, minimal styling, soft daylight",
          "pose": "elevated three-quarter view, neat handwritten ingredient labels and thin pointing arrows",
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
