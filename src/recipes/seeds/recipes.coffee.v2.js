/**
 * Doppia recipe seed — coffee / cafe (product mode), v2: 7 templates.
 * 통합 스키마 v1. recipes 테이블에 INSERT. (vertical key: "coffee")
 *
 * 정체성: 유저가 커피/음료 사진 1장 업로드 → 라떼아트 탑다운·코지 카페 무드·
 *         차가운 응결 매크로·메뉴 카드·푸어/스팀 릴스를 노스킬로 자동 생성.
 *         음료 리얼리즘(투명 잔·얼음·크레마·유체) + 따뜻/아늑/자연광 팔레트 중심.
 *
 * 레퍼런스 무드(유저 제공): 짧은 락스잔에 담긴 아이스 라떼, 가는 메탈 빨대,
 *   얼음 위로 에스프레소·우유 층이 스월링, 잔 표면 응결 물방울, 둥근 다크우드
 *   코스터가 펼친 책 위에, 뒤로 구겨진 화이트 린넨 침구, 부드러운 확산 창광,
 *   얕은 심도, 따뜻한 베이지/크림 톤, 슬로우리빙 무드. → 카탈로그 전체(특히 #2)에 반영.
 *
 * 가격 사다리(확정·위반 0): I2 I2 I2 I3 · R2 R4 R6
 *   - ◈2 사진 진입 ✓ (Latte Art Top-Down)
 *   - 싼 릴스 ◈2 ✓ (Single-Cup Pour Reel)
 *   - 미드 ◈3은 6컷 메뉴 카드에만 정직 부여(count×0.5)
 * 비용공식: image_set ◈ = round(count×0.5) · reel ◈ = shots×2.
 *
 * 음료 특유 리얼리즘 가드(negative): plastic-looking drink / warped or duplicated
 *   glass·cup / fake CGI steam / unnatural plastic ice / spilled mess / double straws /
 *   melted distorted foam / oversaturated. 제품 모드(사람 없음) → faces/heads, hands 배제.
 *
 * 🅣/⚠️ 노트:
 *   - #4 Signature Drink Menu Card = text_overlay (메뉴명·가격은 결정론적 오버레이,
 *     look.negative에 'text'/'logo' 넣지 않음 — 전역 SAFETY_NEGATIVE가 주입).
 *   - #6 Latte Pour & Crema Reel / #7 Cafe Steam & Crema ASMR = needs_human_review
 *     (유체·라떼아트 forming / 풀백 모핑 위험; 손·얼굴은 없음).
 */
module.exports = [
  /* ─────────────────────────────────────────────
     1. Latte Art Top-Down  |  image_set ◈2  |  category Studio  |  sort 1
     최저가 진입점 — 음료 표면 완벽 90° 탑다운(라떼아트·크레마·아이스 탑뷰)
     메뉴·배달앱 썸네일. 핫 + 아이스 표면을 4컷에 분배.
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "coffee",
    "category": "Studio",
    "name": "Latte Art Top-Down",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "카페·배달앱 메뉴 썸네일용 음료 표면 탑다운; 라떼아트·크레마·아이스 탑뷰를 작은 크기에서 즉시 인지시키는 가장 저렴한 ◈2 진입점.",
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
          "color:warm_neutral",
          "texture:liquid_crema_foam",
          "context:cafe_menu_flatlay"
        ],
        "extra_positive": "appetizing cafe beverage photography shot perpendicular from directly above, the exact drink from the uploaded reference kept identical in cup shape, color, layering and proportions with no invented or substituted drink, perfectly centered round cup or glass rim filling the frame, crisp focus on the liquid surface, for hot coffee: silky steamed-milk microfoam with clean rosetta or heart latte art and glossy crema ring, for iced coffee: clear glass viewed from straight above showing ice cubes, layered espresso-and-milk swirl and a single thin metal straw, even diffused overhead softbox with a large bounce card filling shadows, 50mm lens at f/8 for deep edge-to-edge focus, warm neutral beige tabletop, subtle minimal prop styling with generous negative space, commercial cafe-menu hero quality",
        "extra_negative": "tilted horizon, perspective distortion, harsh specular hotspots, blown highlights on foam, color cast, plastic-looking drink, warped or duplicated glass or cup, melted distorted foam, smeared or asymmetric broken latte art, unnatural plastic ice, double straws, spilled mess, dirty cup rim, oversaturated, fake CGI steam, stray hands in frame, faces or heads in frame"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "warm beige matte ceramic saucer on a cream surface, minimal styling, generous negative space",
          "pose": "perfect 90-degree top-down of a hot latte, clean rosetta latte art centered on glossy microfoam",
          "composition": "closeup"
        },
        {
          "scene": "round dark-wood coaster on a warm linen surface, soft diffused light",
          "pose": "perfect top-down of an iced latte in a clear glass, ice cubes and espresso-milk swirl visible, thin metal straw at the rim",
          "composition": "closeup"
        },
        {
          "scene": "light oak cafe table, soft overhead softbox, one small spoon as prop offset to thirds",
          "pose": "top-down of a hot cappuccino, heart latte art and crema ring, cup offset on rule-of-thirds",
          "composition": "medium_shot"
        },
        {
          "scene": "pale cream marble counter, bright airy styling with scattered coffee beans framing",
          "pose": "tighter top-down crop of an iced cold brew surface, condensation droplets and ice catching light",
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
     2. Cozy Cafe Moment  |  image_set ◈2  |  category Lifestyle  |  sort 2
     레퍼런스 무드 그 자체 — 펼친 책+린넨+우드 코스터+창광+식물/담요
     인스타 카페 슬로우리빙. 얕은 심도, 따뜻 뮤트 톤. 얼굴·손 없음.
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "coffee",
    "category": "Lifestyle",
    "name": "Cozy Cafe Moment",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "분위기를 파는 카페·홈카페 인스타 콘텐츠; 펼친 책·린넨·우드 코스터·부드러운 창광의 슬로우리빙 무드컷이 저장·공유와 리치를 견인하는 카탈로그의 시그니처 감성 세트.",
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
          "lighting:soft_diffused_window",
          "color:warm_muted_beige_cream",
          "texture:linen_wood_paper",
          "context:intimate_slow_living"
        ],
        "extra_positive": "warm cozy aesthetic Instagram cafe photography in an intimate slow-living mood, the drink rendered identical to the uploaded reference in cup or glass shape, color, layering and proportions, the beverage placed on a round dark-wood coaster resting on an open book, soft crinkled white linen bedding or a knit blanket behind, a trailing plant and a few scattered props framing the scene, natural soft diffused window light from the side, condensation beading on a cold glass or gentle steam from a hot cup, shot on a 50mm lens at f/2 for shallow depth of field and creamy bokeh, muted warm beige and cream tones, gentle film grain, lived-in intimate atmosphere, aspirational yet calm",
        "extra_negative": "faces or heads in frame, hands, harsh direct flash, cold blue color cast, clinical studio look, sterile empty background, overexposed window blowout, cluttered messy table, plastic-looking drink, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, spilled mess, double straws, fake CGI steam, oversaturated, HDR glow, oversharpening halos"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "open book with a round dark-wood coaster, crinkled white linen bedding behind, soft side window light (the reference mood)",
          "pose": "iced latte in a short rocks glass with a thin metal straw, condensation beading, espresso-milk swirl over ice, front 3/4 view",
          "composition": "medium_shot"
        },
        {
          "scene": "cozy window seat with a trailing plant and warm haze, knit blanket folded nearby",
          "pose": "drink staged in a relaxed slow-living vignette, soft long shadows, intimate framing",
          "composition": "medium_shot"
        },
        {
          "scene": "rustic warm-wood table by a sunlit window, a closed book and dried flowers as quiet props",
          "pose": "drink placed naturally with a paperback and small ceramic dish, gentle steam or sweat on the cup",
          "composition": "medium_shot"
        },
        {
          "scene": "soft linen and pale cream backdrop, shallow tabletop, diffused morning light",
          "pose": "tight intimate crop of the drink catching the soft window light, beaded condensation in sharp focus, background melting to bokeh",
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
     3. Iced Coffee Condensation Hero  |  image_set ◈2  |  category Macro  |  sort 3
     차가운 음료 매크로 — 응결 물방울·얼음·콜드브루/아이스라떼 층 푸어·시럽
     밝고 신선한 룩(다크 무디의 대비). 군침 트리거.
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "coffee",
    "category": "Macro",
    "name": "Iced Coffee Condensation Hero",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 3,
    "rationale": "차가운 시그니처 음료의 군침 클로즈업; 맺힌 응결·빛나는 얼음·우유 스월 푸어의 밝고 신선한 매크로가 전환율 높은 정지 이미지(#2 다크 무디와 룩 대비로 카탈로그 폭 확보).",
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
          "lighting:bright_fresh_backlight",
          "color:clean_bright_warm",
          "texture:icy_wet_condensation",
          "context:fresh_high_key"
        ],
        "extra_positive": "extreme macro cold-beverage photography with a bright fresh look, 100mm macro lens at f/4 with razor-thin depth of field, the iced drink identical to the uploaded reference in glass shape, color and layering, every detail drawn from the actual reference drink rather than a fabricated substitute, crisp backlight and bright fill catching beaded condensation running down the chilled glass, clear ice cubes refracting light, layered cold brew or iced latte milk swirling and blooming through the liquid, syrup settling in slow ribbons, mid-pour milk cascading over ice frozen in a clean sharp splash, fresh airy high-key background, mouth-watering tactile cold-drink detail",
        "extra_negative": "flat dull lighting, dark moody murk, warm muddy color cast, plastic-looking drink, plastic-looking unnatural ice, fake CGI splash, frozen unnatural droplets, warped or duplicated glass, melted distorted foam, double straws, spilled mess, motion blur on the glass itself, over-sharpened halos, noise grain, oversaturated neon clipping, dust spots, fake CGI steam, stray hands in frame, faces or heads in frame"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright high-key background, crisp backlight, chilled glass front and center",
          "pose": "macro of beaded condensation droplets running down the icy glass, ice cubes glowing with refracted light",
          "composition": "closeup"
        },
        {
          "scene": "clean fresh set, bright fill light, glass of iced coffee",
          "pose": "mid-pour milk cascading over ice cubes, swirling bloom through the espresso frozen in a clean splash",
          "composition": "closeup"
        },
        {
          "scene": "airy pale backdrop with soft daylight",
          "pose": "macro of layered cold brew — distinct espresso and milk strata with syrup ribbons settling at the bottom",
          "composition": "closeup"
        },
        {
          "scene": "bright tabletop with a few ice cubes and a metal straw beside the glass",
          "pose": "extreme texture macro of the iced drink surface — crema flecks, milk swirl and a single droplet sliding down the rim",
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
     4. Signature Drink Menu Card  |  image_set ◈3  |  category Menu  |  sort 4  🅣
     text_overlay 방식 — 음료 그리드 배경(여러 음료 배열, 라벨/가격 존)만 AI 생성.
     메뉴명·가격은 결정론적 오버레이. negative에 'text'/'logo' 미포함(전역 주입).
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "coffee",
    "category": "Menu",
    "name": "Signature Drink Menu Card",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 4,
    "rationale": "카페가 가장 자주 요청하는 메뉴판·시그니처 음료 가격 카드; 음료 그리드 배경만 AI로 만들고 메뉴명·가격은 오버레이로 합성해 SAFETY_NEGATIVE 텍스트 제약을 우회, 최대 16개 음료까지 확장.",
    "meta": {
      "render_notes": "AI 모델은 음료 그리드 배경 이미지(여러 음료가 정렬된 배열 + 라벨/가격용 여백 존)만 생성합니다. 음료명·가격·섹션 헤더·통화기호 등 모든 텍스트는 생성 후 결정론적 텍스트 오버레이 레이어(Doppia 렌더 파이프라인)가 합성합니다. 'text'/'logo'는 전역 SAFETY_NEGATIVE_PROMPT가 모든 렌더에 자동 주입하므로 look.negative(엔진이 읽는 live 필드)에 'text'와 'logo'를 다시 넣지 마십시오 — 중복 주입 시 배경의 음료 컵·잔까지 억제되어 그리드가 비어버립니다.",
      "text_overlay_fields": ["drink_name", "price", "section_header", "currency_symbol"],
      "max_items": 16
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
          "color:warm_neutral",
          "texture:liquid_crema_foam",
          "context:drink_menu_grid"
        ],
        "extra_positive": "clean commercial cafe menu card background, multiple beautifully styled beverages arranged in a symmetrical grid on a warm neutral surface, each drink faithful to the uploaded reference with no invented or altered beverage, a distinct drink per cell with no accidental cloned cup repeated across cells, mix of hot lattes with crema and iced drinks with clear glasses and ice, consistent even overhead softbox lighting across all drinks, top-down 50mm lens at f/8 for even edge-to-edge focus across the grid, generous negative space between items reserved for price and name label overlays, cohesive warm beige palette, appetizing professional cafe menu photography aesthetic",
        "extra_negative": "tilted horizon, inconsistent lighting across drinks, cluttered background, plastic-looking drink, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, harsh hotspots, color cast, messy uneven arrangement, identical cloned cups across grid cells, drinks overlapping into label zones, insufficient negative space for overlays, spilled mess, oversaturated, stray hands in frame, faces or heads in frame"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "warm neutral surface, overhead softbox, 4-drink grid (2×2) with generous margins",
          "pose": "top-down, drinks evenly spaced with empty label zones below each cell",
          "composition": "medium_shot"
        },
        {
          "scene": "same warm surface, grid mixing hot lattes and iced drinks in alternating cells",
          "pose": "top-down, alternating hot + iced grid, consistent hero framing across cells",
          "composition": "medium_shot"
        },
        {
          "scene": "light oak surface, 2-drink hero row — signature beverages only",
          "pose": "top-down, two hero drinks side-by-side with wide label space below",
          "composition": "medium_shot"
        },
        {
          "scene": "warm cream marble, single featured drink-of-the-day format",
          "pose": "top-down centered, large negative header zone above for a 'Signature' section overlay",
          "composition": "medium_shot"
        },
        {
          "scene": "pale beige surface, horizontal 3-drink row — seasonal / iced section",
          "pose": "top-down, three-across arrangement, footer zone reserved for a price row overlay",
          "composition": "medium_shot"
        },
        {
          "scene": "warm wood surface, 4-drink grid with a few coffee beans as quiet styling",
          "pose": "top-down grid, cohesive warm treatment, label zones intact between drinks",
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
     5. Single-Cup Pour Reel  |  reel ◈2  |  category Reel  |  sort 5
     최저가 1-shot 릴(◈2) — 단일 시그니처 음료, 슬로우 매크로 푸시인(스팀·푸어·광택)
     오늘의 음료 즉시 게시용.
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "coffee",
    "category": "Reel",
    "name": "Single-Cup Pour Reel",
    "output_type": "reel",
    "credit_cost": 2,
    "sort_order": 5,
    "rationale": "오늘의 음료·신메뉴 즉시 게시용 가장 저렴한 릴(◈2); 단일 시그니처 음료에 슬로우 매크로 푸시인으로 스팀·푸어·광택을 잡아 빠른 소셜 반응 확인에 최적인 데일리 드립.",
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
          "color:warm_inviting",
          "texture:liquid_crema_foam",
          "context:cozy_cafe"
        ],
        "extra_positive": "single hero beverage cinematic cafe moment, the exact drink from the uploaded reference kept identical and stable across the entire clip with no morphing into a different drink mid-motion, locked cup and glass geometry, 100mm macro lens at f/2.8 to f/4, warm directional key light with a soft rim catching gentle steam off a hot cup or beaded condensation on an iced glass, glistening crema, milk sheen and droplet sparkle, shallow depth of field, slow deliberate motion revealing texture, warm muted beige tones, premium appetite-trigger close-up, short punchy social reel energy",
        "extra_negative": "flat lighting, plastic-looking drink, fake CGI steam, plastic CGI look, unnatural plastic ice, jittery shaky framing, harsh blown highlights, frozen lifeless motion, warped or duplicated glass or cup, drink geometry morphing mid-clip, melted distorted foam, double straws, spilled mess, flickering, stutter, oversaturated, color banding, stray hands in frame, faces or heads in frame"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "cozy cafe set, single warm key light, freshly made signature drink on a wood coaster",
          "pose": "slow macro push-in from a side angle, gentle steam or condensation, crema and sheen glistening",
          "composition": "closeup"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow macro push-in catching steam, condensation and crema sheen in warm directional light"
        ],
        "duration_per_shot": 4,
        "transition": "none",
        "music_mood": "lo-fi cafe ASMR groove, 70-85 BPM, warm pour foley and soft kick with mellow Rhodes and muted upright bass, intimate low-energy slow-living ambience, reference Bonobo 'Kerala' texture",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────
     6. Latte Pour & Crema Reel  |  reel ◈4  |  category Reel  |  sort 6  ⚠️
     음료 시그니처 모션 갭필러 — 스팀밀크 푸어 라떼아트 형성 / 우유 얼음 캐스케이드 /
     시럽 드리즐. 밝은 하이키. needs_human_review(유체+라떼아트 forming 모핑 위험).
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "coffee",
    "category": "Reel",
    "name": "Latte Pour & Crema Reel",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 6,
    "rationale": "음료만의 시그니처 모션을 채우는 2샷 릴; 스팀밀크 푸어로 라떼아트가 형성되거나 우유가 얼음 위로 쏟아지는 밝은 하이키 컷이 카페 콘텐츠의 핵심 동력.",
    "meta": {
      "flags": ["needs_human_review"],
      "review_reason": "유체 푸어 + 라떼아트 forming 모션 — 프레임 간 라떼아트 모핑·크레마 불일치·CGI틱 가짜 유체 위험. 손·얼굴은 없으나 유체 일관성 보장을 위해 사람 검수 필요."
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
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
        "style_preset": "Cinematic",
        "attributes": [
          "lighting:bright_high_key",
          "color:clean_bright_warm",
          "texture:liquid_crema_foam",
          "context:fresh_high_key"
        ],
        "extra_positive": "bright high-key cafe pour cinematics, the drink and cup identical to the uploaded reference with locked geometry across both shots and no morphing into a different drink, 100mm macro lens at f/2.8, clean fresh fill light with a soft rim, shot 1: steamed-milk pour streaming into rich espresso and forming a clean symmetric rosetta latte art on the crema surface, the art settling smoothly and coherently frame to frame; shot 2: cold milk cascading over clear ice cubes blooming through the coffee, or a glossy syrup drizzle ribboning down, real natural fluid physics, fresh airy background, crisp appetizing detail",
        "extra_negative": "morphing or warping latte art, broken asymmetric or smeared rosetta, inconsistent crema between frames, fake CGI fluid, plastic-looking liquid, unnatural plastic ice, plastic-looking drink, warped or duplicated glass or cup, melted distorted foam, double straws, spilled mess, flat dull lighting, dark muddy color, jittery shaky framing, blown highlights, flickering, stutter, oversaturated, stray hands in frame, faces or heads in frame"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright high-key cafe set, fresh fill light, cup of espresso with crema ready",
          "pose": "steamed-milk pour streaming in and forming a clean rosetta latte art on the surface",
          "composition": "closeup"
        },
        {
          "scene": "fresh airy background, clear glass of iced coffee with ice cubes",
          "pose": "cold milk cascading over the ice and blooming through the coffee, or a syrup drizzle ribboning down",
          "composition": "closeup"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "steady macro hold as steamed milk pours in and the rosetta latte art forms coherently",
          "slow macro on milk cascading over ice and blooming, fluid settling naturally"
        ],
        "duration_per_shot": 4,
        "transition": "cut",
        "music_mood": "bright airy lo-fi cafe groove, 85-95 BPM, crisp pour and splash foley with light Rhodes and soft claps, fresh upbeat-but-calm energy, reference modern specialty-coffee brand spots",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────
     7. Cafe Steam & Crema ASMR  |  reel ◈6  |  category Reel  |  sort 7  ⚠️
     시네마틱 모션 히어로 3샷: ①스팀 매크로 홀드 ②크레마/폼 스월·밀크 블룸 측면 드리프트
     ③풀백 히어로 리빌. needs_human_review(풀백/모핑). 3s/shot, cut, warm ASMR.
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "coffee",
    "category": "Reel",
    "name": "Cafe Steam & Crema ASMR",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 7,
    "rationale": "알고리즘 쇼트폼을 노리는 카페 브랜드의 모션 히어로; 스팀·크레마 스월·풀백 리빌 3샷 ASMR 릴이 카탈로그의 시네마틱 정점이자 체류시간 확보용 콘텐츠.",
    "meta": {
      "flags": ["needs_human_review"],
      "review_reason": "풀백 리빌 + 유체/크레마 스월 모션 중 라떼아트·크레마·잔 geometry 모핑 위험. 프레임 간 음료 일관성 유지를 위해 사람 검수 필요(손·얼굴은 없음)."
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
          "color:warm_muted_beige_cream",
          "texture:liquid_crema_foam",
          "context:cozy_cafe"
        ],
        "extra_positive": "cinematic cafe ASMR, CRITICAL: same drink identity across all three shots, locked cup and glass geometry and latte-art pattern, no morph or drift, drink identical to the uploaded reference; macro 100mm lens at f/2.8, warm directional key with a soft rim, warm muted beige and cream tones; shot 1: macro hold on live gentle steam curling off the hot surface; shot 2: lateral drift across the crema and microfoam swirl or a milk bloom rippling through the liquid; shot 3: smooth pull-back hero reveal of the finished cup on its coaster, steam still rising and crema gleaming, consistent drink geometry throughout, intimate slow-build ASMR mood",
        "extra_negative": "morphing latte art or crema between shots, inconsistent drink geometry across frames, fake CGI steam, fake CGI fluid, plastic-looking drink, unnatural plastic ice, warped or duplicated glass or cup, melted distorted foam, double straws, spilled mess, flat lighting, jittery shaky framing, harsh blown highlights, frozen lifeless motion, flickering, stutter, oversaturated, color banding, stray hands in frame, faces or heads in frame"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "cozy dim cafe set, single warm key light, hot drink just made on a wood coaster",
          "pose": "macro hold on the surface with live gentle steam curling upward",
          "composition": "closeup"
        },
        {
          "scene": "warm low-key background, soft rim light on the liquid surface",
          "pose": "lateral drift across the crema and microfoam swirl, or a milk bloom rippling through the coffee",
          "composition": "closeup"
        },
        {
          "scene": "warm wood table with linen and a book, soft rim light, full cozy presentation",
          "pose": "pull-back reveal of the finished cup on its coaster, steam still rising, crema gleaming under the rim light",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow macro push-in on the rising steam",
          "slow lateral drift across the crema swirl or milk bloom, light raking the surface",
          "smooth pull-back dolly revealing the full cup on its coaster, crema gleaming"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "ambient cafe ASMR foley, 60 BPM, layered close-mic steam hiss and gentle pour over a warm low pad and soft sub hum, intimate slow-build energy, reference specialty-coffee and slow-living brand films",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  /* ─────────────────────────────────────────────
     8. Noir Marble Coffee  |  image_set ◈2  |  category Editorial  |  sort 8
     프리미엄 에디토리얼 누아르 — 다크 마블 + 브러시드 브라스 + 파인 포슬린,
     단일 드라마틱 측광(키아로스쿠로)·깊은 벨벳 그림자·크레마/림 글로우.
     업로드 커피 종류(핫/아이스 무관) 그대로 유지, 매거진급 럭셔리 정물. 어떤 커피든 적용.
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "coffee",
    "category": "Editorial",
    "name": "Noir Marble Coffee",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 8,
    "rationale": "카페·스페셜티 브랜드의 프리미엄 캠페인용 고급 정물; 다크 마블·브러시드 브라스·드라마틱 측광의 에디토리얼 누아르 룩으로 어떤 커피든 '비싸 보이게' 연출해 브랜드 격을 올리는 럭셔리 히어로 세트(코지 무드 세트와 룩 대비로 카탈로그 상단 포지셔닝).",
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
          "lighting:dramatic_single_source",
          "color:rich_warm_chiaroscuro",
          "texture:dark_marble_brass_porcelain",
          "context:luxury_editorial"
        ],
        "extra_positive": "luxury editorial coffee photography with an elevated high-end aesthetic, the uploaded coffee kept identical to the reference whatever its type whether hot or iced, espresso, latte, cappuccino, cold brew or any drink, preserving its exact cup or glass, color, layering, foam and proportions with no invented or substituted beverage, presented in refined surroundings on a polished dark marble or honed travertine surface with subtle brushed-brass and fine porcelain accents, a single dramatic directional light source carving rich chiaroscuro with deep velvety shadows and a soft glowing highlight skimming the crema, foam and rim, delicate steam catching the light on a hot cup or pristine condensation on chilled crystal, shot on an 85mm lens at f/2.8, sophisticated muted palette of espresso brown, warm charcoal and soft gold, immaculate minimal styling with generous negative space, gallery-grade magazine still life, premium specialty-coffee brand campaign quality, tasteful and expensive",
        "extra_negative": "cheap or amateur look, flat dull lighting, harsh on-camera flash, busy cluttered background, kitschy or tacky props, plastic-looking drink, plastic tableware, fake CGI steam, changed or substituted drink type, wrong cup or glass swapped in, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, spilled mess, double straws, garish oversaturated colors, color cast, faces or heads in frame, hands, oversharpening halos, HDR glow"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "polished dark marble surface, a single dramatic shaft of directional light from the side, deep velvety shadows, a hint of brushed brass in the background",
          "pose": "the drink as a refined hero, rim and crema catching a soft glowing highlight, delicate steam or pristine condensation, elegant three-quarter view",
          "composition": "medium_shot"
        },
        {
          "scene": "dark moody backdrop, controlled rim light skimming the surface of the drink",
          "pose": "intimate macro closeup of the crema or layered drink surface glowing against velvety shadow, expensive tactile detail",
          "composition": "closeup"
        },
        {
          "scene": "expansive honed dark travertine with a single fine porcelain saucer and a folded linen napkin, a soft controlled pool of light",
          "pose": "the drink placed with generous negative space, minimal magazine-cover composition, refined and quiet",
          "composition": "medium_shot"
        },
        {
          "scene": "dark marble with subtle soft-gold accents and a single sprig of greenery, dramatic side light and rich shadow",
          "pose": "a slightly elevated editorial view, the drink and premium props arranged with restrained luxury",
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
     9. Slow Morning Coffee  |  image_set ◈2  |  category Lifestyle  |  sort 9
     코지 레퍼런스 1:1 재현 — 펼친 책 위 우드 코스터에 놓인 음료, 뒤로 구겨진 화이트 린넨,
     부드러운 측면 창광. 업로드 커피 종류(핫/아이스·라떼/아메리카노/콜드브루 등) 그대로 유지.
     #2는 분위기 다양세트, 이건 이 한 컷 집중 · #8(Noir)과 룩 대비. 어떤 커피든 적용.
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "coffee",
    "category": "Lifestyle",
    "name": "Slow Morning Coffee",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 9,
    "rationale": "유저가 가진 어떤 커피 사진이든(핫·아이스, 라떼·아메리카노·콜드브루 등) 1장 올리면 레퍼런스 무드 그대로 — 펼친 책+우드 코스터+구겨진 린넨+측면 창광의 슬로우리빙 감성 한 컷으로 재현하는 시그니처 단일룩 세트. #2(분위기 다양 세트)와 달리 이 정확한 한 컷에 집중해 저장·공유 전환을 노린다.",
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
          "lighting:soft_diffused_window",
          "color:warm_muted_beige_cream",
          "texture:linen_wood_paper",
          "context:intimate_slow_living"
        ],
        "extra_positive": "dreamy slow-living coffee still life recreating one specific cozy reference mood, the uploaded coffee kept completely identical to the reference regardless of its type whether hot or iced, latte, cappuccino, americano, cold brew, mocha or any drink, preserving its exact cup or glass shape, drink color, layering, foam and proportions with no invented or substituted beverage, the cup or glass resting on a round dark-wood coaster placed on an open paperback book, soft crinkled white linen bedding filling the background, a thin metal straw only if the original drink already had one, gentle beaded condensation on a cold glass or soft natural steam from a hot cup, warm diffused window light raking softly from the side, shot on a 50mm lens at f/2 for shallow depth of field and creamy bokeh, muted warm beige and cream palette, delicate film grain, intimate aspirational slow-living morning mood, editorial Instagram cafe aesthetic",
        "extra_negative": "changed or substituted drink type, wrong cup or glass swapped in, faces or heads in frame, hands, harsh direct flash, cold blue color cast, clinical studio look, sterile empty background, overexposed window blowout, cluttered messy table, plastic-looking drink, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, spilled mess, double straws, fake CGI steam, oversaturated, HDR glow, oversharpening halos"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "an open paperback book with a round dark-wood coaster on it, crinkled white linen bedding filling the background, soft side window light (the reference mood)",
          "pose": "the uploaded coffee placed on the coaster exactly as in the reference, front 3/4 view, beaded condensation or gentle steam, thin metal straw only if the original had one",
          "composition": "medium_shot"
        },
        {
          "scene": "the same open book and dark-wood coaster on soft white linen, warm diffused morning light raking from the side",
          "pose": "a gentle 45-degree elevated view of the same drink on the coaster over the open book, the drink and surface in soft focus",
          "composition": "medium_shot"
        },
        {
          "scene": "crinkled white linen and warm beige tones, shallow tabletop, soft window glow",
          "pose": "tight intimate closeup of the drink catching the soft side light, beaded condensation or steam in sharp focus, background melting into creamy bokeh",
          "composition": "closeup"
        },
        {
          "scene": "open book and dark-wood coaster on soft white linen with a sprig of dried flowers and a second closed book as quiet props, warm hazy light",
          "pose": "the drink staged naturally in the slow-living vignette with generous breathing room, soft long shadows",
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
     10. Golden Hour Window  |  image_set ◈2  |  category Lifestyle  |  sort 10
     실사 골든아워 — 창가 역광, 35mm f/1.4, 따뜻한 앰버 림라이트·자연 플레어·긴 그림자.
     진짜 사진가가 풀프레임으로 찍은 듯한 photoreal. 어떤 커피든 적용.
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "coffee",
    "category": "Lifestyle",
    "name": "Golden Hour Window",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 10,
    "rationale": "따뜻한 골든아워 역광으로 '진짜 카메라로 찍은' 감성을 극대화하는 실사 룩; 35mm 단렌즈·자연 플레어·긴 그림자가 인스타 저장·공유를 견인하는 어센틱 에디토리얼 한 컷(스튜디오 룩과 대비).",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Lifestyle",
        "attributes": ["lighting:golden_hour_backlight", "color:warm_amber_sunlight", "texture:liquid_crema_foam", "context:sunlit_cafe_window"],
        "extra_positive": "authentic photograph of a coffee captured in warm golden-hour light, looking exactly like a real photo taken by a professional photographer on a full-frame mirrorless camera with a fast 35mm f/1.4 prime lens, the uploaded coffee kept identical to the reference whatever its type hot or iced with no invented or substituted drink, placed near a cafe window as low late-afternoon sun streams in from behind, warm amber backlight rimming the cup and igniting gentle steam or glinting off the iced glass, soft natural lens flare, long warm shadows stretching across the table, creamy natural bokeh, realistic film-like color science, subtle real-world imperfections and fine grain, shallow depth of field, true-to-life tactile detail, candid editorial coffee photography",
        "extra_negative": "flat artificial studio light, cold blue color cast, blown-out overexposed window clipping, CGI, 3D render, computer-generated, digital illustration, cartoon, AI-generated look, artificial plastic sheen, over-smoothed waxy surfaces, uncanny unreal texture, video-game render, oversharpening halos, plastic-looking drink, changed or substituted drink type, wrong cup or glass swapped in, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, fake CGI steam, double straws, spilled mess, oversaturated, faces or heads in frame, hands"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "wooden cafe table beside a bright window, low golden afternoon sun streaming from behind the cup", "pose": "the drink rim-lit by warm backlight, gentle steam or an iced-glass glint catching the sun, soft natural flare, front 3/4 view", "composition": "medium_shot" },
        { "scene": "warm sunlit window, glowing amber backlight", "pose": "tight closeup of steam curling through the golden light or condensation glowing on the glass, shallow focus", "composition": "closeup" },
        { "scene": "sunlit table with long warm shadows raking across the surface", "pose": "the drink casting a long natural shadow, amber highlights on the rim, relaxed candid framing", "composition": "medium_shot" },
        { "scene": "cozy sunlit cafe corner, warm haze and soft window bokeh behind", "pose": "the drink in its environment bathed in golden ambient glow, editorial composition", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },

  /* ─────────────────────────────────────────────
     11. Analog Film Cafe  |  image_set ◈2  |  category Lifestyle  |  sort 11
     실사 필름 — 35mm 아날로그(Portra 400 / CineStill 800T), 그레인·할레이션·뮤트 톤.
     랩 스캔한 진짜 필름 프레임 느낌. 어떤 커피든 적용.
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "coffee",
    "category": "Lifestyle",
    "name": "Analog Film Cafe",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 11,
    "rationale": "디지털 티를 지우고 '진짜 필름으로 찍은' 향수 어린 실사 룩; Portra/CineStill 톤·그레인·할레이션이 어센틱 카페 무드를 만들어 브랜드 감성을 차별화하는 아날로그 세트.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Lifestyle",
        "attributes": ["lighting:natural_available_light", "color:film_portra_warm", "texture:film_grain_halation", "context:analog_cafe"],
        "extra_positive": "authentic 35mm analog film photograph of a coffee, looking exactly like a real frame shot on a film camera and scanned at a lab, Kodak Portra 400 and CineStill 800T color palette, soft natural available light, organic film grain, gentle halation glowing softly around the highlights, slightly muted warm tones with true-to-film color shifts, the uploaded coffee kept identical to the reference whatever its type with no invented or substituted drink, a real lived-in cafe setting with natural imperfect styling, 50mm lens, shallow and slightly imperfect focus, nostalgic editorial film look, unmistakably photographed on film rather than rendered",
        "extra_negative": "clinical digital sharpness, sterile clean studio look, HDR, oversaturated digital color, CGI, 3D render, computer-generated, digital illustration, cartoon, AI-generated look, artificial plastic sheen, over-smoothed waxy surfaces, uncanny unreal texture, video-game render, oversharpening halos, plastic-looking drink, changed or substituted drink type, wrong cup or glass swapped in, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, fake CGI steam, double straws, spilled mess, faces or heads in frame, hands"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "a real cafe table in soft natural light with lived-in styling", "pose": "the drink centered with organic film grain and gentle halation on the highlights, Portra warmth", "composition": "medium_shot" },
        { "scene": "soft window light with muted film tones", "pose": "the drink with creamy film-grain bokeh, slightly imperfect focus and a CineStill glow", "composition": "medium_shot" },
        { "scene": "natural light, warm faded film palette", "pose": "closeup of the crema or iced surface with visible fine grain and soft halation, tactile analog detail", "composition": "closeup" },
        { "scene": "cozy cafe corner with a faded film vignette and warm cast", "pose": "the drink in a nostalgic candid film composition with natural shadows", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },

  /* ─────────────────────────────────────────────
     12. Roastery Counter  |  image_set ◈2  |  category Lifestyle  |  sort 12
     실사 다큐 — 스페셜티 로스터리 바 카운터, 에스프레소 머신 보케, 50mm f/1.8.
     실제 카페 현장을 사진가가 캔디드로 잡은 photoreal. 어떤 커피든 적용.
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "coffee",
    "category": "Lifestyle",
    "name": "Roastery Counter",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 12,
    "rationale": "'진짜 카페에서 찍은' 다큐멘터리 실사 룩; 우드·스테인리스 바와 에스프레소 머신 보케가 스페셜티 브랜드의 현장감·신뢰감을 주는 어센틱 환경 세트.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Lifestyle",
        "attributes": ["lighting:warm_ambient_indoor", "color:warm_neutral_industrial", "texture:steel_wood_ceramic", "context:specialty_coffee_bar"],
        "extra_positive": "authentic documentary-style photograph of a coffee on a specialty roastery bar counter, looking exactly like a real candid shot by a professional photographer on a full-frame camera with a 50mm f/1.8 lens, the uploaded coffee kept identical to the reference whatever its type with no invented or substituted drink, set on a real espresso bar counter of wood and stainless steel, a softly blurred professional espresso machine, grinder and shelves of cups as bokeh in the background, warm ambient indoor lighting mixed with soft daylight, genuine third-wave coffee shop atmosphere, realistic reflections and natural imperfections, shallow depth of field isolating the cup, crisp true-to-life detail, editorial documentary realism",
        "extra_negative": "fake studio backdrop, empty void background, flat lighting, cartoonish props, CGI, 3D render, computer-generated, digital illustration, cartoon, AI-generated look, artificial plastic sheen, over-smoothed waxy surfaces, uncanny unreal texture, video-game render, oversharpening halos, plastic-looking drink, changed or substituted drink type, wrong cup or glass swapped in, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, fake CGI steam, double straws, spilled mess, oversaturated, faces or heads in frame, hands"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "a wood-and-steel espresso bar counter with a blurred espresso machine glowing behind", "pose": "the drink as hero on the counter in warm ambient light, machine bokeh, 3/4 view", "composition": "medium_shot" },
        { "scene": "a specialty cafe bar with shelves of cups softly out of focus", "pose": "the drink sharp against creamy background bokeh of the coffee bar", "composition": "medium_shot" },
        { "scene": "a polished counter with subtle reflections under ambient warm light", "pose": "closeup of the cup with realistic surface reflections and gentle steam, documentary detail", "composition": "closeup" },
        { "scene": "a third-wave coffee shop counter scene with authentic gear around", "pose": "the drink in its real working-bar environment, candid editorial framing", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },

  /* ─────────────────────────────────────────────
     13. Daylight Brunch Flatlay  |  image_set ◈2  |  category Lifestyle  |  sort 13
     실사 플랫레이 — 자연광 90° 탑다운 브런치 상차림(크루아상·린넨·커틀러리), 35mm.
     푸드 포토그래퍼가 찍은 듯한 photoreal. 어떤 커피든 적용.
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "coffee",
    "category": "Lifestyle",
    "name": "Daylight Brunch Flatlay",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 13,
    "rationale": "'진짜 브런치 테이블을 위에서 찍은' 자연광 플랫레이 실사 룩; 페이스트리·린넨·커틀러리와 부드러운 창광이 카페·홈카페의 풍성한 라이프스타일을 파는 푸드 에디토리얼 세트.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Lifestyle",
        "attributes": ["lighting:bright_natural_daylight", "color:fresh_airy_natural", "texture:linen_ceramic_pastry", "context:brunch_table_flatlay"],
        "extra_positive": "authentic top-down flatlay photograph of a coffee as part of a real brunch table, looking exactly like a genuine overhead shot by a food photographer on a full-frame camera, the uploaded coffee kept identical to the reference whatever its type with no invented or substituted drink, arranged on a natural linen-and-wood table with real props such as a flaky croissant or pastry on a small plate, a folded linen napkin and cutlery, a few scattered crumbs and relaxed natural styling, bright soft natural daylight from a window with gentle real shadows, fresh airy editorial palette, a perfectly perpendicular 90-degree overhead angle, 35mm lens, realistic textures and true-to-life food detail, lifestyle food-blog quality",
        "extra_negative": "tilted horizon, perspective distortion, fake plastic food, chaotic cluttered mess, harsh on-camera flash, CGI, 3D render, computer-generated, digital illustration, cartoon, AI-generated look, artificial plastic sheen, over-smoothed waxy surfaces, uncanny unreal texture, video-game render, oversharpening halos, plastic-looking drink, changed or substituted drink type, wrong cup or glass swapped in, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, fake CGI steam, double straws, spilled mess, oversaturated, faces or heads in frame, hands"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "a linen-and-wood table with a croissant on a plate, a napkin and cutlery, in natural daylight", "pose": "a perfect 90-degree top-down of the drink within a styled brunch spread, soft real shadows", "composition": "medium_shot" },
        { "scene": "bright natural daylight with minimal brunch props framing the scene", "pose": "top-down with the drink as hero and a pastry and napkin offset to the thirds", "composition": "medium_shot" },
        { "scene": "a warm wood surface with a few crumbs and a spoon under soft daylight", "pose": "a tighter top-down crop of the drink beside one pastry, fresh airy styling", "composition": "closeup" },
        { "scene": "a generous brunch table with linen, flowers and pastries lit by window daylight", "pose": "a wide top-down lifestyle flatlay, the drink anchoring an inviting real breakfast scene", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },

  /* ─────────────────────────────────────────────
     14. Sunlit Terrace  |  image_set ◈2  |  category Lifestyle  |  sort 14
     실사 야외 — 카페 테라스, 그린포일·거리 보케, dappled 햇살, 50mm f/2.
     여행 사진가가 잡은 캔디드 photoreal. 어떤 커피든 적용.
  ───────────────────────────────────────────── */
  {
    "mode": "product",
    "vertical": "coffee",
    "category": "Lifestyle",
    "name": "Sunlit Terrace",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 14,
    "rationale": "'진짜 야외 테라스에서 찍은' 밝은 자연광 실사 룩; 초록 식물·거리 보케·dappled 햇살이 알프레스코 라이프스타일과 여행 감성을 파는 어센틱 아웃도어 세트.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Lifestyle",
        "attributes": ["lighting:bright_outdoor_daylight", "color:fresh_vivid_natural", "texture:wood_greenery_glass", "context:outdoor_cafe_terrace"],
        "extra_positive": "authentic outdoor photograph of a coffee on a cafe terrace, looking exactly like a real candid travel photo taken by a professional photographer on a full-frame camera with a 50mm f/2 lens, the uploaded coffee kept identical to the reference whatever its type with no invented or substituted drink, set on a small outdoor table with lush green foliage and a softly blurred street or garden in the background, bright natural daylight with gentle real sun and dappled leaf shadows, fresh vivid yet natural color, creamy bokeh, realistic depth and atmosphere, true-to-life detail, relaxed al-fresco lifestyle aesthetic, candid editorial realism",
        "extra_negative": "indoor studio backdrop, flat indoor light, fake plastic greenery, overcast dull flatness, CGI, 3D render, computer-generated, digital illustration, cartoon, AI-generated look, artificial plastic sheen, over-smoothed waxy surfaces, uncanny unreal texture, video-game render, oversharpening halos, plastic-looking drink, changed or substituted drink type, wrong cup or glass swapped in, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, fake CGI steam, double straws, spilled mess, oversaturated, faces or heads in frame, hands"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "a small outdoor cafe table with lush greenery and soft street bokeh behind, in dappled sunlight", "pose": "the drink as hero on the terrace table with natural sun and leaf shadows, 3/4 view", "composition": "medium_shot" },
        { "scene": "an outdoor table in dappled sun", "pose": "closeup of the drink with sunlight dappling the surface, condensation or steam, shallow focus", "composition": "closeup" },
        { "scene": "a cafe terrace with chairs and plants softly blurred under bright daylight", "pose": "the drink in its outdoor environment, airy relaxed composition with street bokeh", "composition": "medium_shot" },
        { "scene": "a terrace table with bright natural backlight and a greenery glow", "pose": "the drink backlit by daylight with a glowing rim and natural flare, candid framing", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },

  /* 15. Minimalist Negative Space | image_set ◈2 | Studio | sort 15
     실사 미니멀 — 심리스 배경에 음료만, 넓은 여백·부드러운 그라데이션 광. 가게 단서 0. */
  {
    "mode": "product", "vertical": "coffee", "category": "Studio", "name": "Minimalist Negative Space",
    "output_type": "image_set", "credit_cost": 2, "sort_order": 15,
    "rationale": "음료 하나만 넓은 여백의 심리스 배경에 띄운 파인아트 미니멀 실사; 가게 단서 없이 차분한 여백과 자연광 그림자로 감성과 프리미엄을 동시에 주는 절제형 세트.",
    "config": {
      "schema_version": 1, "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Studio",
        "attributes": ["lighting:soft_gradient_studio", "color:clean_muted_neutral", "texture:matte_seamless", "context:minimal_negative_space"],
        "extra_positive": "authentic minimalist photograph of a single coffee isolated on a clean seamless backdrop, looking exactly like a real photo by a professional still-life photographer on a medium-format camera, the uploaded coffee kept identical to the reference whatever its type with no invented or substituted drink, vast calm negative space, a soft gentle gradient of muted neutral tone behind, one soft directional light with a delicate natural shadow, fine real-world detail on the cup and liquid surface, shallow yet crisp focus, refined gallery still-life simplicity, true-to-life photographic texture, emotive quiet with breathing room and no environment",
        "extra_negative": "busy background, prop clutter, harsh multiple shadows, gradient banding, CGI, 3D render, computer-generated, digital illustration, cartoon, AI-generated look, artificial plastic sheen, over-smoothed waxy surfaces, uncanny unreal texture, video-game render, oversharpening halos, cafe interior background, storefront, shop signage, menu board, espresso machine, coffee shop counter, brand logos, other people in background, busy cluttered environment, plastic-looking drink, changed or substituted drink type, wrong cup or glass swapped in, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, fake CGI steam, double straws, spilled mess, oversaturated, faces or heads in frame, hands"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "a clean seamless muted-neutral backdrop with a soft gradient, vast negative space", "pose": "the drink centered low in frame with one soft directional light and a delicate natural shadow", "composition": "medium_shot" },
        { "scene": "a calm minimal backdrop, gentle light falloff", "pose": "the drink offset to the rule-of-thirds with generous empty space, refined and quiet", "composition": "medium_shot" },
        { "scene": "a soft seamless background, controlled studio light", "pose": "a tighter crisp crop of the cup and liquid surface, fine tactile detail", "composition": "closeup" },
        { "scene": "a pale seamless surface seen from above, soft shadow", "pose": "a minimal top-down of the drink with a long calm shadow and empty space", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },

  /* 16. Rainy Window Mood | image_set ◈2 | Lifestyle | sort 16
     실사 비오는 창 — 빗물 맺힌 유리·블러 빗방울 보케, 흐린 부드러운 광, 멜랑콜리. 가게 단서 0. */
  {
    "mode": "product", "vertical": "coffee", "category": "Lifestyle", "name": "Rainy Window Mood",
    "output_type": "image_set", "credit_cost": 2, "sort_order": 16,
    "rationale": "비 오는 날의 멜랑콜리 코지 실사; 빗물 유리·블러 빗방울 보케·은은한 스팀이 저장·공유되는 감성 무드를 만드는 세트(매장 디테일 없이 유리·비·빛만).",
    "config": {
      "schema_version": 1, "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Lifestyle",
        "attributes": ["lighting:overcast_soft_window", "color:cool_muted_moody", "texture:rain_glass_bokeh", "context:rainy_window"],
        "extra_positive": "authentic moody photograph of a coffee beside a rain-streaked window, looking exactly like a real candid photo on a full-frame camera with a 50mm lens, the uploaded coffee kept identical to the reference whatever its type with no invented or substituted drink, soft overcast daylight diffusing through glass beaded and streaked with rain, dreamy out-of-focus rain-droplet bokeh, gentle steam from a hot cup misting the cool air, calm melancholic intimate mood, muted cool-and-warm tones, shallow depth of field, realistic reflections and condensation, true-to-life film-like detail, only the window glass and rain as setting",
        "extra_negative": "bright sunny clear sky, harsh direct light, dry clear window, garish color, CGI, 3D render, computer-generated, digital illustration, cartoon, AI-generated look, artificial plastic sheen, over-smoothed waxy surfaces, uncanny unreal texture, video-game render, oversharpening halos, cafe interior background, storefront, shop signage, menu board, espresso machine, coffee shop counter, brand logos, other people in background, busy cluttered environment, plastic-looking drink, changed or substituted drink type, wrong cup or glass swapped in, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, fake CGI steam, double straws, spilled mess, oversaturated, faces or heads in frame, hands"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "a rain-streaked window with soft overcast daylight and blurred droplet bokeh", "pose": "the drink against the rainy glass, gentle steam rising into the cool air, front 3/4 view", "composition": "medium_shot" },
        { "scene": "soft grey window light, dreamy rain bokeh behind", "pose": "closeup of steam curling against the out-of-focus rain droplets, shallow focus", "composition": "closeup" },
        { "scene": "cool misty window glass with realistic reflections", "pose": "the cup and its soft reflection on the wet glass, melancholic muted tones", "composition": "medium_shot" },
        { "scene": "a quiet windowsill in overcast light, rain on the pane", "pose": "the drink in a calm rainy-day vignette with breathing room and soft shadow", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },

  /* 17. Monochrome Fine Art | image_set ◈2 | Editorial | sort 17
     실사 흑백 파인아트 — 드라마틱 측광·은염 그레인·타임리스. 가게 단서 0. */
  {
    "mode": "product", "vertical": "coffee", "category": "Editorial", "name": "Monochrome Fine Art",
    "output_type": "image_set", "credit_cost": 2, "sort_order": 17,
    "rationale": "색을 빼고 빛·톤·질감만 남긴 흑백 파인아트 실사; 드라마틱 측광과 은염 그레인이 타임리스한 격을 주는 갤러리형 세트(매장 단서 없음).",
    "config": {
      "schema_version": 1, "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Editorial",
        "attributes": ["lighting:dramatic_directional", "color:black_and_white", "texture:silver_film_grain", "context:fine_art_monochrome"],
        "extra_positive": "authentic fine-art black-and-white photograph of a coffee, looking exactly like a real darkroom print shot on a film camera, the uploaded coffee kept identical in shape and form to the reference whatever its type with no invented or substituted drink, rich monochrome tonal range from deep blacks to soft luminous whites, dramatic single-source directional light and gentle chiaroscuro, organic silver film grain, timeless emotive minimal composition, sharp tactile detail on crema, foam and glass, classic editorial still-life elegance, no color and no environment clutter",
        "extra_negative": "color, any color tint, oversaturated, flat muddy gray tones, HDR, clinical digital look, CGI, 3D render, computer-generated, digital illustration, cartoon, AI-generated look, artificial plastic sheen, over-smoothed waxy surfaces, uncanny unreal texture, video-game render, oversharpening halos, cafe interior background, storefront, shop signage, menu board, espresso machine, coffee shop counter, brand logos, other people in background, busy cluttered environment, plastic-looking drink, changed or substituted drink type, wrong cup or glass swapped in, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, fake CGI steam, double straws, spilled mess, faces or heads in frame, hands"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "a dark minimal backdrop with a single dramatic directional light", "pose": "the drink as a chiaroscuro hero, luminous highlight on the rim against deep black", "composition": "medium_shot" },
        { "scene": "a black background with backlight", "pose": "a silhouette of the cup with backlit steam glowing in monochrome, shallow focus", "composition": "closeup" },
        { "scene": "controlled raking light on the surface", "pose": "a macro of crema or foam texture in rich black-and-white grain", "composition": "closeup" },
        { "scene": "a soft luminous high-key monochrome field", "pose": "a minimal high-key black-and-white study of the drink with delicate tonal gradients", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },

  /* 18. Marble Linen Still Life | image_set ◈2 | Editorial | sort 18
     실사 마블+린넨 정물 — 노스윈도 광, Old-Masters 무드, 절제 럭셔리. 가게 단서 0. */
  {
    "mode": "product", "vertical": "coffee", "category": "Editorial", "name": "Marble Linen Still Life",
    "output_type": "image_set", "credit_cost": 2, "sort_order": 18,
    "rationale": "honed 마블+드레이프 린넨의 회화적 정물 실사; 부드러운 노스윈도 광과 절제된 스타일링이 조용한 럭셔리를 주는 테이블탑 세트(방·매장 안 보임).",
    "config": {
      "schema_version": 1, "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Editorial",
        "attributes": ["lighting:soft_north_window", "color:warm_neutral_stone", "texture:marble_linen_drape", "context:fine_art_tabletop"],
        "extra_positive": "authentic painterly still-life photograph of a coffee on honed marble with draped natural linen, looking exactly like a real photo by a professional still-life photographer on a medium-format camera, the uploaded coffee kept identical to the reference whatever its type with no invented or substituted drink, soft directional north-window daylight with gentle falloff into shadow, elegant folds of linen and a cool veined marble surface, refined minimal styling with generous negative space, an Old-Masters mood with natural color, realistic stone and fabric texture, shallow depth, emotive quiet luxury, only the tabletop vignette with no room or shop visible",
        "extra_negative": "plastic surfaces, busy patterned background, harsh flash, cheap look, CGI, 3D render, computer-generated, digital illustration, cartoon, AI-generated look, artificial plastic sheen, over-smoothed waxy surfaces, uncanny unreal texture, video-game render, oversharpening halos, cafe interior background, storefront, shop signage, menu board, espresso machine, coffee shop counter, brand logos, other people in background, busy cluttered environment, plastic-looking drink, changed or substituted drink type, wrong cup or glass swapped in, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, fake CGI steam, double straws, spilled mess, oversaturated, faces or heads in frame, hands"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "honed veined marble with soft draped linen, gentle north-window light", "pose": "the drink as a painterly hero with elegant linen folds, soft falloff to shadow, 3/4 view", "composition": "medium_shot" },
        { "scene": "cool marble surface, refined minimal styling and negative space", "pose": "the drink offset with quiet props and breathing room, Old-Masters mood", "composition": "medium_shot" },
        { "scene": "soft daylight on stone and fabric texture", "pose": "a closeup of the cup against marble veins and linen weave, realistic tactile detail", "composition": "closeup" },
        { "scene": "a calm marble-and-linen tabletop in directional daylight", "pose": "an elegant still-life arrangement of the drink with restrained luxury and soft shadow", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },

  /* 19. Shadow Play Sunlight | image_set ◈2 | Lifestyle | sort 19
     실사 빛/그림자 아트 — 블라인드·잎새 하드 햇살 그래픽 섀도, 강한 대비. 가게 단서 0. */
  {
    "mode": "product", "vertical": "coffee", "category": "Lifestyle", "name": "Shadow Play Sunlight",
    "output_type": "image_set", "credit_cost": 2, "sort_order": 19,
    "rationale": "하드 햇살이 만드는 블라인드·잎새 그래픽 그림자의 빛·그림자 아트 실사; 강한 대비와 추상 광이 현대적 아트디렉션 감성을 주는 세트(매장 배경 없음).",
    "config": {
      "schema_version": 1, "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Lifestyle",
        "attributes": ["lighting:hard_directional_sun", "color:warm_high_contrast", "texture:graphic_shadow", "context:light_and_shadow_study"],
        "extra_positive": "authentic photograph of a coffee in a striking play of light and shadow, looking exactly like a real photo on a full-frame camera, the uploaded coffee kept identical to the reference whatever its type with no invented or substituted drink, hard directional sunlight casting crisp graphic shadows of window blinds or leaves across the cup and a clean minimal surface, strong warm highlights and deep shadow shapes, bold emotive contrast, fine realistic detail and natural light falloff, shallow focus, contemporary art-direction aesthetic, an abstract pool of light with no store or environment, just the drink, the surface and the shadow pattern",
        "extra_negative": "flat even lighting, no shadows, busy background, muddy low contrast, CGI, 3D render, computer-generated, digital illustration, cartoon, AI-generated look, artificial plastic sheen, over-smoothed waxy surfaces, uncanny unreal texture, video-game render, oversharpening halos, cafe interior background, storefront, shop signage, menu board, espresso machine, coffee shop counter, brand logos, other people in background, busy cluttered environment, plastic-looking drink, changed or substituted drink type, wrong cup or glass swapped in, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, fake CGI steam, double straws, spilled mess, oversaturated, faces or heads in frame, hands"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "a clean minimal surface raked by hard sunlight through window blinds", "pose": "crisp striped blind shadows falling across the drink, strong warm contrast, 3/4 view", "composition": "medium_shot" },
        { "scene": "a bright surface with dappled leaf shadows from hard sun", "pose": "the drink amid graphic leaf-shadow shapes, bold highlights and deep shadow", "composition": "medium_shot" },
        { "scene": "a minimal wall and surface lit by a single hard shaft of light", "pose": "a closeup of the cup edge where light meets deep shadow, emotive contrast", "composition": "closeup" },
        { "scene": "a warm textured surface with a striking shadow pattern across it", "pose": "the drink as a small subject within an abstract field of light and shadow", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },

  /* 20. Botanical Coffee Beans | image_set ◈2 | Macro | sort 20
     실사 보태니컬 — 원두·드라이 식물·버랩/슬레이트 자연 스타일링 매크로. 가게 단서 0. */
  {
    "mode": "product", "vertical": "coffee", "category": "Macro", "name": "Botanical Coffee Beans",
    "output_type": "image_set", "credit_cost": 2, "sort_order": 20,
    "rationale": "원두·드라이 식물·러프한 자연 소재로 꾸민 어티즈널 실사 매크로; 흙빛 유기적 팔레트가 장인 감성·신선함을 주는 내추럴 스타일링 세트(매장 없이 클로즈 스타일링).",
    "config": {
      "schema_version": 1, "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Macro",
        "attributes": ["lighting:soft_natural", "color:earthy_warm_natural", "texture:beans_botanical_burlap", "context:botanical_styling"],
        "extra_positive": "authentic natural still-life photograph of a coffee styled with raw coffee elements, looking exactly like a real photo by a food stylist on a full-frame macro setup, the uploaded coffee kept identical to the reference whatever its type with no invented or substituted drink, scattered roasted coffee beans, a sprig of greenery or dried botanicals and a textured natural surface such as burlap, slate or raw wood, soft natural light, an earthy warm organic palette, realistic tactile detail on the beans and the liquid, shallow macro depth, emotive artisanal craft mood, intimate close styling with no shop or room in view",
        "extra_negative": "artificial plastic plants, neon color, sterile studio, chaotic clutter, CGI, 3D render, computer-generated, digital illustration, cartoon, AI-generated look, artificial plastic sheen, over-smoothed waxy surfaces, uncanny unreal texture, video-game render, oversharpening halos, cafe interior background, storefront, shop signage, menu board, espresso machine, coffee shop counter, brand logos, other people in background, busy cluttered environment, plastic-looking drink, changed or substituted drink type, wrong cup or glass swapped in, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, fake CGI steam, double straws, spilled mess, oversaturated, faces or heads in frame, hands"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "a raw burlap or slate surface with scattered roasted coffee beans, soft natural light", "pose": "the drink among the beans and a sprig of greenery, earthy organic styling, 3/4 view", "composition": "medium_shot" },
        { "scene": "raw wood with dried botanicals and a few beans", "pose": "the drink with natural elements framing it, warm earthy palette", "composition": "medium_shot" },
        { "scene": "soft natural light on textured beans", "pose": "a macro of roasted beans beside the crema or iced surface, tactile detail", "composition": "closeup" },
        { "scene": "an artisanal natural surface with botanical accents", "pose": "an intimate craft styling of the drink with beans and greenery, soft shadow", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },

  /* 21. Pastel Dream | image_set ◈2 | Studio | sort 21
     실사 파스텔 — 블러시·크림 파스텔, 밝고 에어리 디퓨즈드 광, 드리미. 가게 단서 0. */
  {
    "mode": "product", "vertical": "coffee", "category": "Studio", "name": "Pastel Dream",
    "output_type": "image_set", "credit_cost": 2, "sort_order": 21,
    "rationale": "블러시·크림 파스텔의 드리미 라이프스타일 실사; 밝고 에어리한 디퓨즈드 광이 부드럽고 사랑스러운 감성을 주는 코리안-카페 소프트 세트(매장 단서 없음).",
    "config": {
      "schema_version": 1, "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Studio",
        "attributes": ["lighting:bright_soft_diffused", "color:soft_pastel_blush_cream", "texture:smooth_matte", "context:dreamy_minimal"],
        "extra_positive": "authentic dreamy photograph of a coffee in a soft pastel aesthetic, looking exactly like a real photo by a lifestyle photographer on a full-frame camera, the uploaded coffee kept identical to the reference whatever its type with no invented or substituted drink, a gentle pastel palette of blush, cream and soft beige, bright airy diffused light with soft delicate shadows, a smooth minimal backdrop, a tender emotive mood, fine realistic detail with a soft natural glow, shallow depth and creamy bokeh, refined soft Korean-cafe aesthetic, a clean uncluttered scene with no shop interior or signage",
        "extra_negative": "dark moody tones, harsh shadows, garish saturated color, busy background, CGI, 3D render, computer-generated, digital illustration, cartoon, AI-generated look, artificial plastic sheen, over-smoothed waxy surfaces, uncanny unreal texture, video-game render, oversharpening halos, cafe interior background, storefront, shop signage, menu board, espresso machine, coffee shop counter, brand logos, other people in background, busy cluttered environment, plastic-looking drink, changed or substituted drink type, wrong cup or glass swapped in, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, fake CGI steam, double straws, spilled mess, oversaturated, faces or heads in frame, hands"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "a smooth pastel blush-and-cream backdrop with bright airy diffused light", "pose": "the drink centered with a soft natural glow and gentle delicate shadow, dreamy mood", "composition": "medium_shot" },
        { "scene": "a soft pastel minimal scene", "pose": "the drink offset with creamy bokeh and tender pastel tones", "composition": "medium_shot" },
        { "scene": "bright diffused light on a smooth surface", "pose": "a closeup of the cup with a soft glow and pastel reflections, fine detail", "composition": "closeup" },
        { "scene": "a pale dreamy pastel field", "pose": "a minimal airy composition of the drink with breathing room and soft shadow", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },

  /* 22. Vintage Heirloom | image_set ◈2 | Editorial | sort 22
     실사 빈티지 — 앤틱 포슬린·은수저·에이징 우드, 회화적 창광, 향수 정물. 가게 단서 0. */
  {
    "mode": "product", "vertical": "coffee", "category": "Editorial", "name": "Vintage Heirloom",
    "output_type": "image_set", "credit_cost": 2, "sort_order": 22,
    "rationale": "앤틱 포슬린·은수저·에이징 우드의 올드월드 정물 실사; 회화적 창광과 세월의 파티나가 향수와 타임리스 무드를 주는 클래식 세트(현대 매장 안 보임).",
    "config": {
      "schema_version": 1, "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Editorial",
        "attributes": ["lighting:painterly_window", "color:aged_warm_patina", "texture:antique_porcelain_wood", "context:old_world_still_life"],
        "extra_positive": "authentic vintage still-life photograph of a coffee with old-world charm, looking exactly like a real photo on a film camera, the uploaded coffee kept identical to the reference whatever its type with no invented or substituted drink, set beside an antique porcelain saucer or a tarnished silver spoon on an aged patinated wood surface, soft painterly window light in the manner of a classic Dutch still life, warm aged tones and gentle patina, organic film grain, realistic worn texture and natural shadow, emotive nostalgic timeless mood, an intimate tabletop vignette with no modern shop or interior visible",
        "extra_negative": "modern plastic, neon color, clinical digital sharpness, busy background, CGI, 3D render, computer-generated, digital illustration, cartoon, AI-generated look, artificial plastic sheen, over-smoothed waxy surfaces, uncanny unreal texture, video-game render, oversharpening halos, cafe interior background, storefront, shop signage, menu board, espresso machine, coffee shop counter, brand logos, other people in background, busy cluttered environment, plastic-looking drink, changed or substituted drink type, wrong cup or glass swapped in, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, fake CGI steam, double straws, spilled mess, oversaturated, faces or heads in frame, hands"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "an aged patinated wood surface with an antique porcelain saucer, soft painterly window light", "pose": "the drink with old-world props in a classic Dutch-still-life mood, warm patina, 3/4 view", "composition": "medium_shot" },
        { "scene": "a tarnished silver spoon and aged surface in directional window light", "pose": "the drink offset with nostalgic props and gentle film grain", "composition": "medium_shot" },
        { "scene": "soft window light on worn antique texture", "pose": "a closeup of the cup against aged porcelain and patinated wood, realistic worn detail", "composition": "closeup" },
        { "scene": "an intimate vintage tabletop vignette in painterly light", "pose": "a timeless still-life arrangement of the drink with warm aged tones and soft shadow", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },

  /* 23. Reflective Glass Surface | image_set ◈2 | Studio | sort 23
     실사 리플렉션 — 글로시/젖은 유리면의 우아한 반영, 컨트롤드 광, 무디 미니멀. 가게 단서 0. */
  {
    "mode": "product", "vertical": "coffee", "category": "Studio", "name": "Reflective Glass Surface",
    "output_type": "image_set", "credit_cost": 2, "sort_order": 23,
    "rationale": "글로시·젖은 유리면의 우아한 반영을 활용한 무디 미니멀 실사; 컨트롤드 스페큘러 광과 깔끔한 그라데이션이 현대적 에디토리얼 품격을 주는 세트(반영과 음료만, 매장 없음).",
    "config": {
      "schema_version": 1, "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Studio",
        "attributes": ["lighting:controlled_soft_specular", "color:moody_neutral", "texture:glossy_reflective", "context:reflection_study"],
        "extra_positive": "authentic photograph of a coffee on a glossy reflective surface, looking exactly like a real photo by a professional product photographer on a full-frame camera, the uploaded coffee kept identical to the reference whatever its type with no invented or substituted drink, a clean mirror-like or wet glass surface casting an elegant realistic reflection of the cup, soft controlled specular light with a gentle gradient background, a refined moody minimal mood, true-to-life reflections and tactile detail, shallow crisp focus, contemporary editorial elegance, no environment or shop, only the drink and its reflection",
        "extra_negative": "double straws, distorted or broken reflection, busy background, plastic look, CGI, 3D render, computer-generated, digital illustration, cartoon, AI-generated look, artificial plastic sheen, over-smoothed waxy surfaces, uncanny unreal texture, video-game render, oversharpening halos, cafe interior background, storefront, shop signage, menu board, espresso machine, coffee shop counter, brand logos, other people in background, busy cluttered environment, plastic-looking drink, changed or substituted drink type, wrong cup or glass swapped in, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, fake CGI steam, spilled mess, oversaturated, faces or heads in frame, hands"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "a glossy mirror-like surface with a soft gradient background and controlled specular light", "pose": "the drink with an elegant clean reflection beneath it, refined moody minimal, 3/4 view", "composition": "medium_shot" },
        { "scene": "a wet reflective surface, gentle highlight gradient", "pose": "the cup and its realistic reflection with soft specular sheen", "composition": "medium_shot" },
        { "scene": "controlled soft light on a glossy plane", "pose": "a closeup where the cup meets its mirror reflection, crisp tactile detail", "composition": "closeup" },
        { "scene": "a dark glossy surface with a subtle gradient", "pose": "a minimal moody composition of the drink floating above its reflection", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },

  /* 24. Steam and Light Macro | image_set ◈2 | Macro | sort 24
     실사 스팀/빛 매크로 — 100mm 매크로, 백라이트 스팀 위스프 vs 다크 그라데이션, 인티메이트. 가게 단서 0. */
  {
    "mode": "product", "vertical": "coffee", "category": "Macro", "name": "Steam and Light Macro",
    "output_type": "image_set", "credit_cost": 2, "sort_order": 24,
    "rationale": "백라이트로 피어오르는 스팀 위스프를 100mm로 잡는 인티메이트 매크로 실사; 다크 그라데이션과 림글로우가 감각적 정적 무드를 주는 추상 클로즈 세트(환경·매장 0).",
    "config": {
      "schema_version": 1, "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Macro",
        "attributes": ["lighting:backlit_dark_gradient", "color:warm_dark_intimate", "texture:steam_wisps_crema", "context:macro_steam_study"],
        "extra_positive": "authentic extreme macro photograph of a coffee focused on delicate rising steam, looking exactly like a real photo on a full-frame camera with a 100mm macro lens, the uploaded coffee kept identical to the reference whatever its type with no invented or substituted drink, fine wisps of real steam curling and backlit against a soft dark gradient, a glowing rim of warm light skimming the crema or iced surface, deep intimate shadow, razor-thin depth of field, true-to-life tactile liquid and vapor detail, an emotive quiet sensory mood, a pure abstract close study with no environment, surface clutter or shop in view",
        "extra_negative": "fake CGI steam, flat lighting, bright busy background, plastic look, CGI, 3D render, computer-generated, digital illustration, cartoon, AI-generated look, artificial plastic sheen, over-smoothed waxy surfaces, uncanny unreal texture, video-game render, oversharpening halos, cafe interior background, storefront, shop signage, menu board, espresso machine, coffee shop counter, brand logos, other people in background, busy cluttered environment, plastic-looking drink, changed or substituted drink type, wrong cup or glass swapped in, warped or duplicated glass or cup, melted distorted foam, unnatural plastic ice, double straws, spilled mess, oversaturated, faces or heads in frame, hands"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "a soft dark gradient with warm backlight catching rising steam", "pose": "fine wisps of steam curling and glowing against the dark, razor-thin focus", "composition": "closeup" },
        { "scene": "deep shadow with a glowing rim of warm light", "pose": "a macro of the crema or iced surface with a luminous rim and gentle vapor", "composition": "closeup" },
        { "scene": "an intimate dark field with delicate backlight", "pose": "steam vapor against black with a single soft highlight, sensory and quiet", "composition": "closeup" },
        { "scene": "warm dark gradient, controlled rim light", "pose": "an extreme macro of droplets, sheen or crema texture glowing in the dark", "composition": "closeup" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  }
];
