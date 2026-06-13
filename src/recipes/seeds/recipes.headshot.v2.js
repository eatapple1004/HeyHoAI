/**
 * Doppia recipe seed — headshot / personal-branding (influencer face mode), v2, 7 templates.
 * 통합 스키마 v1. recipes 테이블에 INSERT.
 * net-new 카탈로그 — "AI 헤드샷" 시장 정조준. 엔진은 influencer와 공유하나 톤은 정반대:
 *   클린 라이팅·중립 배경·정장/스튜디오·신뢰 비즈니스 무드 (인플루언서 = 필름그레인/캐주얼/골든아워).
 * subject 전부 type:face · identity_lock · min_refs:1. 온모델 착용 없음 → 가격 +1 미적용.
 * 가격 캐논: image_set count×0.5 (4컷=◈2), reel shots×2 (1샷=◈2, 2샷=◈4).
 * 안전: 텍스트/로고는 AI로 그리지 않음(엔진 SAFETY_NEGATIVE). 릴은 미세 모션만(립싱크·큰 회전 금지) + needs_human_review.
 * 사진 5(LinkedIn Classic·Executive Authority·Background & Wardrobe Swap·Team Page Consistent·Approachable Brand) + 릴 2(Speaking Profile·About-Page Intro).
 */
module.exports = [
  {
    "mode": "influencer",
    "category": "Headshot",
    "name": "LinkedIn Classic",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "대한민국 표준 증명사진 — 참조 인물과 동일 얼굴 유지, 정장·연하늘 배경, 2x2인치 4컷 인화 시트.",
    "meta": {
      "change": "new",
      "render_notes": null
    },
    "config": {
      "prompt_override": "업로드한 참조 인물 사진과 '동일 인물'을 최우선으로 엄격히 유지한 대한민국 표준 증명사진을 만든다. 최종 출력은 2x2인치(약 5x5cm) 증명사진 4장을 2x2 배열로 배치한 '증명사진 인화 시트' 1장이다.\n\n[최우선 규칙: 동일 인물 고정(절대)] 참조 사진과 100% 동일 인물로만 생성한다. 얼굴이 달라지면 실패다. 얼굴 기하(landmarks)와 비율을 절대 바꾸지 않는다: 얼굴형, 이마/광대/턱선, 눈 사이 거리, 눈매/눈꼬리 각도, 눈 크기, 코 길이/폭/콧대, 입술 두께/입매, 귀 형태, 눈썹 형태, 인중 길이, 볼살, 주름/특징점, 안경 유무, 점/흉터/자국 등 고유 특징을 그대로 보존한다. 미화/성형/재해석/새 얼굴 생성을 절대 금지한다. 특히 눈 크게·턱 깎기·코 높이기·얼굴 축소·V라인·광대 축소·과도한 미백·피부를 플라스틱처럼 매끈하게·이목구비 위치 이동·얼굴 비율 재조정·젊게 만들기를 금지한다.\n\n[허용 편집: 증명사진 수준의 최소 보정만] 헤어는 참조의 구조(가르마/길이/앞머리 유무/결 방향)를 100% 유지한 채 잔머리·부스스함·삐져나온 가닥만 자연스럽게 정리한다(앞머리 스타일 변경·직모↔웨이브 전환·길이 큰 변경·묶음/풀림 전환 금지). 피부는 잡티·트러블·번들거림·다크서클·홍조를 아주 약하게만 완화하되 모공·잔주름·결 등 피부 질감을 유지한다(과한 블러/필터/미백/윤곽 보정 금지).\n\n[대한민국 증명사진 스타일] 정면, 시선 정면, 고개 기울임 최소, 어깨 수평, 머리·어깨 중심 정렬. 무표정 또는 아주 약한 미소(치아 보이지 않게). 균일한 스튜디오 조명, 그림자 최소, 디테일 선명, 색 왜곡 최소. 배경은 연한 하늘색 단색(완전 평면 — 그라데이션/패턴/소품/텍스트/장식/그림자 효과 금지).\n\n[의상] 깔끔한 정장(검정/네이비/차콜 재킷 + 흰색 또는 연한 톤 셔츠/블라우스, 무늬·큰 로고·과한 장식 금지). 남성은 단색 넥타이(검정/네이비/차콜 계열, 무늬 없음) 필수, 여성은 넥타이 없이 단정한 셔츠/블라우스. 단, 의상보다 얼굴 동일성 유지가 우선이다.\n\n[크롭/규격] 각 사진은 2x2인치 정방형 비율로 크롭. 머리 위 여백 5~10%, 얼굴이 너무 작거나 꽉 차지 않게. 어깨선 포함, 가슴 윗부분까지 보이는 전형적 증명사진 프레이밍.\n\n[레이아웃] 한 장의 캔버스에 동일한 증명사진 4장을 2열 x 2행으로 균일한 간격·정확한 정렬로 배치. 글자/워터마크/로고/날짜/QR/스탬프 등 모든 텍스트 요소 절대 금지.\n\n[출력] 고해상도, 인쇄해도 선명한 품질. 2x2 증명사진 4장이 2x2 배열로 들어간 인화 시트 이미지 1장만 출력.",
      "schema_version": 1,
      "mode": "influencer",
      "output": {
        "type": "image_set",
        "count": 1,
        "aspect_ratio": "4:5"
      },
      "subject": {
        "type": "face",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Corporate",
        "wardrobe": "professional business attire — tailored dark blazer over a crisp shirt, clean minimal styling",
        "attributes": [
          "lighting:soft_clamshell_studio",
          "color:neutral_true",
          "texture:skin_natural",
          "context:grey_seamless_studio"
        ],
        "extra_positive": "CRITICAL: the exact same individual in every shot, locked facial identity and bone structure, no face morph or identity drift between shots, professional corporate headshot, clean evenly-lit light-grey seamless studio backdrop, soft flattering clamshell key with a subtle separating hair light, 85mm at f4 flattering portrait compression, eye-level shoulders-to-chest crop, confident trustworthy expression, crisp catchlight eyes sharp and in focus, true-to-life skin tones, polished but natural retouch, clean corporate mood",
        "extra_negative": "warped face, asymmetric eyes, plastic over-retouched skin, identity drift between shots, glasses glare distortion, harsh shadows, blown highlights, busy or colorful background, casual streetwear, film grain, golden hour glamour"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "light-grey seamless studio, soft even clamshell key",
          "pose": "front-facing, gentle confident smile, squared shoulders",
          "composition": "closeup"
        },
        {
          "scene": "same studio, identical clamshell lighting",
          "pose": "front-facing neutral professional expression, chin slightly down",
          "composition": "closeup"
        },
        {
          "scene": "same studio, subtle key from camera-left",
          "pose": "slight three-quarter turn, soft smile, engaged eyes",
          "composition": "medium_shot"
        },
        {
          "scene": "same studio, even clamshell key",
          "pose": "arms loosely crossed, relaxed authoritative stance",
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
    "category": "Headshot",
    "name": "Executive Authority",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "어두운 측광 권위 컷 — 차콜/딥블루 배경·측면 키+림라이트로 임원/저자/키노트 톤. 흑백 변형 1컷을 흡수해 에디토리얼 프로필까지 한 세트로 톤 차별화 커버.",
    "meta": {
      "change": "new",
      "render_notes": "Shot 3 renders as a graded high-contrast monochrome variant; keep the exact same face identity and framing as the color shots."
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
        "style_preset": "Corporate",
        "wardrobe": "sharp dark suit with a dark tie or a fine dark knit, executive author styling",
        "attributes": [
          "lighting:directional_side_key_rim",
          "color:deep_charcoal_navy",
          "texture:skin_natural",
          "context:dark_gradient_backdrop"
        ],
        "extra_positive": "CRITICAL: the exact same individual in every shot, locked facial identity and bone structure, no face morph or identity drift between shots, high-end executive author portrait, smooth charcoal-to-deep-navy gradient backdrop, dramatic directional side key light camera-left with a crisp controlled rim light camera-right cleanly separating the subject from the dark background, balanced shadow falloff that retains full facial detail in the shadow side, 85mm at f4 flattering compression, shoulders-up authoritative framing with a subtle low camera angle for added stature, composed serious-but-warm expression with a strong steady gaze, immaculate sharp catchlights, sharp eyes in focus, true-to-life skin with polished but natural retouch, refined editorial magazine author-photo gravitas, dark moody corporate tone",
        "extra_negative": "warped face, asymmetric eyes, plastic over-retouched skin, identity drift between shots, glasses glare distortion, flat frontal flash, blown highlights, muddy crushed shadows losing facial detail, busy or bright cheerful background, casual streetwear or casual clothing, film grain, golden hour glamour"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "deep charcoal gradient backdrop, single directional key camera-left with a rim light camera-right",
          "pose": "front-facing, composed serious expression, strong steady gaze",
          "composition": "closeup"
        },
        {
          "scene": "same dark set, deeper three-quarter side lighting and dramatic shadow falloff",
          "pose": "three-quarter turn into the key light, chin level, confident authoritative bearing",
          "composition": "medium_shot"
        },
        {
          "scene": "same set rendered as refined high-contrast black and white monochrome",
          "pose": "front-facing, subtle resolute serious expression, editorial author mood",
          "composition": "closeup"
        },
        {
          "scene": "same dark set, slight low camera angle for added stature",
          "pose": "shoulders squared, faint confident composure, hands out of frame",
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
    "category": "Headshot",
    "name": "Background & Wardrobe Swap",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 3,
    "rationale": "한 얼굴로 배경·복장이 모두 다른 전문가 헤드샷 4가지 변형을 동시 생성. 채널별로 다른 배경이 필요하다는 JTBD를 직격하고, identity_lock으로 동일 인물을 유지해 전환 레버리지를 극대화.",
    "meta": {
      "change": "new",
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
        "style_preset": "Corporate",
        "wardrobe": "rotating professional wardrobe across shots: tailored dark suit, open-collar dress shirt, structured blazer, refined knit sweater",
        "attributes": [
          "lighting:soft clamshell and clean window light, balanced and flattering",
          "color:neutral true-to-life palette, controlled contrast",
          "texture:natural skin texture, polished but realistic retouch",
          "context:multi-background professional headshot set, same person across all shots"
        ],
        "extra_positive": "CRITICAL: the exact same individual in every shot, locked facial identity and bone structure, no face morph or identity drift between shots, professional corporate headshot set, each shot pairing a clearly different professional background with a different tailored outfit while the face stays identical, soft clamshell key with a subtle hair light and clean window fill, 85mm at f4 flattering compression, shoulders-to-chest crop with a flattering near-eye-level camera angle, sharp catchlight eyes in focus, confident and approachable expression, true-to-life skin with polished but natural retouch, clean neutral business mood",
        "extra_negative": "warped face, asymmetric eyes, plastic over-retouched skin, identity drift between shots, face inconsistency across the different backgrounds, glasses glare distortion, harsh shadows, busy background, lens distortion, trendy filters, casual streetwear, film grain, golden hour glamour lighting, blown highlights"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean light-grey seamless studio backdrop",
          "pose": "shoulders-up, slight turn toward camera with a warm confident smile, wearing a tailored dark suit",
          "composition": "closeup"
        },
        {
          "scene": "bright white seamless background",
          "pose": "front-facing, neutral composed professional expression, wearing an open-collar dress shirt",
          "composition": "closeup"
        },
        {
          "scene": "softly blurred modern office with glass walls and gentle bokeh",
          "pose": "relaxed standing posture angled slightly off-axis, calm assured look, wearing a structured blazer",
          "composition": "medium_shot"
        },
        {
          "scene": "outdoor natural setting with soft green foliage bokeh",
          "pose": "easy three-quarter stance, friendly approachable smile, wearing a refined knit sweater",
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
    "category": "Headshot",
    "name": "Team Page Consistent",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 4,
    "rationale": "B2B/HR 차별 컷 — 동일 조명·배경·크롭 규격으로 여러 멤버가 같은 룩을 갖는 팀페이지 일관 세트. 경쟁사가 약한 'consistency' JTBD 직격.",
    "meta": {
      "change": "new",
      "render_notes": "Locked template spec (same key light, same backdrop tone, same shoulders-up crop and eye-line) so multiple team members composited later share one consistent look."
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
        "style_preset": "Corporate",
        "wardrobe": "company-neutral professional attire, solid blazer or shirt, no loud patterns",
        "attributes": [
          "lighting:soft_even_frontal_key",
          "color:neutral_true",
          "texture:skin_natural",
          "context:uniform_soft_grey_backdrop"
        ],
        "extra_positive": "CRITICAL: the exact same individual in every shot, locked facial identity and bone structure, no face morph or identity drift, standardized team-page headshot, fixed soft even frontal key light with gentle wraparound fill and no harsh shadows, uniform mid-grey seamless backdrop evenly lit corner to corner, consistent shoulders-up crop and level eye-line shot at eye level, 85mm at f4 flattering compression held identical across shots, neutral friendly expression, consistent lighting/background/crop across team members, uniform framing repeatable for an entire team directory, clean corporate trustworthy finish, sharp catchlight eyes, true-to-life skin, polished natural retouch",
        "extra_negative": "warped face, asymmetric eyes, plastic over-retouched skin, identity drift between shots, inconsistent lighting or backdrop tone, varying crop or eye-line, non-uniform framing, dramatic or harsh shadows, busy background, glasses glare distortion, casual streetwear, film grain, golden hour"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "uniform mid-grey seamless backdrop, fixed soft even frontal key",
          "pose": "front-facing, neutral friendly expression, level eye-line, squared shoulders",
          "composition": "closeup"
        },
        {
          "scene": "same fixed setup, identical lighting and backdrop",
          "pose": "front-facing, gentle closed-mouth smile, same crop and level eye-line",
          "composition": "closeup"
        },
        {
          "scene": "same fixed setup, identical lighting and backdrop",
          "pose": "barely-there left three-quarter micro-angle, same crop and eye-line, neutral expression",
          "composition": "closeup"
        },
        {
          "scene": "same fixed setup, identical lighting and backdrop",
          "pose": "barely-there right three-quarter micro-angle, same crop and eye-line, neutral expression",
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
    "category": "Headshot",
    "name": "Approachable Brand",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 5,
    "rationale": "따뜻한 자연 창광·캐주얼 블레이저/니트·친근 미소의 친근 브랜드 컷 4장 — 코치/크리에이터/컨설턴트용, 1·2번(LinkedIn Classic/Executive)의 격식 톤과 무드 분리.",
    "meta": {
      "change": "new",
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
        "style_preset": "Lifestyle",
        "wardrobe": "soft casual blazer or fine knit, relaxed but polished smart-casual styling",
        "attributes": [
          "lighting:warm_window_daylight",
          "color:warm_neutral",
          "texture:skin_natural",
          "context:bright_airy_interior_bokeh"
        ],
        "extra_positive": "CRITICAL: the exact same individual in every shot, locked facial identity and bone structure, no face morph or identity drift between shots, warm approachable personal-brand headshot, soft natural window light gently wrapping the face, bright airy interior with a clean creamy background bokeh, smart-casual soft blazer or fine knit, genuine friendly smile, 85mm at f4 flattering compression, shoulders-up crop at a natural eye-level angle, professional yet warm coach-and-creator energy, sharp catchlight eyes in focus, true-to-life skin, polished but natural retouch",
        "extra_negative": "warped face, asymmetric eyes, plastic over-retouched skin, identity drift between shots, glasses glare distortion, harsh shadows, busy background, cold corporate flash, blown highlights, casual streetwear, film grain"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright window-lit interior, soft warm daylight wrap, gentle bokeh",
          "pose": "front-facing by the window, warm genuine smile, relaxed shoulders",
          "composition": "closeup"
        },
        {
          "scene": "same airy interior, soft natural light, gentle background bokeh",
          "pose": "slight three-quarter turn, light easy smile, engaged friendly eyes",
          "composition": "medium_shot"
        },
        {
          "scene": "tidy desk with softly blurred plants behind for in-context lifestyle feel",
          "pose": "leaning in a touch at the desk, approachable engaged expression",
          "composition": "medium_shot"
        },
        {
          "scene": "closer natural-light framing near the window, soft daylight on the face",
          "pose": "calm warm closeup, soft confident smile",
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
    "name": "Speaking Profile Reel",
    "output_type": "reel",
    "credit_cost": 2,
    "sort_order": 6,
    "rationale": "About 페이지/링크드인용 무빙 프로필 인트로 — 헤드샷이 살아 움직이는 ◈2 최저가 릴, 미세 모션(눈 깜빡임/은은한 미소/끄덕임/슬로우 푸시인)만으로 안전하게 동일 인물 유지.",
    "meta": {
      "change": "new",
      "flags": [
        "needs_human_review"
      ],
      "render_notes": "Motion must stay micro only: slow natural blink, faint warming smile, barely perceptible nod, and a very slow push-in. No lip-sync, no head turn beyond a few degrees, no large rotation, to avoid identity morph. Review face stability on every frame."
    },
    "config": {
      "schema_version": 1,
      "mode": "influencer",
      "output": {
        "type": "reel",
        "count": 1,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "face",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Corporate",
        "wardrobe": "tailored business blazer over a plain shirt",
        "attributes": [
          "lighting:soft clamshell key with subtle hair light, clean and even",
          "color:neutral cool-grey palette, true-to-life skin tones",
          "texture:natural skin micro-texture, polished but not plastic",
          "context:professional studio headshot intro for About page / LinkedIn"
        ],
        "extra_positive": "CRITICAL: the exact same individual in every frame, locked facial identity and bone structure, no face morph or identity drift, professional corporate moving headshot, clean light-grey seamless studio backdrop, soft clamshell key with a subtle hair light, 85mm at f4 flattering compression, shoulders-up closeup crop framed straight-on at eye level, front-facing confident approachable expression with a gentle warming smile holding the gaze, sharp catchlight eyes in focus, true-to-life skin, polished but natural retouch, trustworthy corporate mood, smooth stable micro-motion with a slow natural blink and a very slow gentle push-in, head held steady and unchanged throughout",
        "extra_negative": "warped face, asymmetric eyes, plastic over-retouched skin, identity drift between shots, lip-sync mouth desync, mouth or tooth morph between frames, large head rotation, jittery unstable motion, frame-to-frame flicker, glasses glare distortion, lens distortion, harsh shadows, blown highlights, busy background, casual streetwear, film grain, golden hour, trendy filter"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "light-grey seamless studio backdrop with soft clamshell lighting",
          "pose": "front-facing professional gentle smile holding the gaze",
          "composition": "closeup"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "micro motion only: slow natural blink, faint warming smile, barely perceptible nod, very slow push-in"
        ],
        "duration_per_shot": 4,
        "transition": "cut",
        "music_mood": "ambient corporate underscore, 70-85 BPM, felt piano + warm synth pads + soft low strings, low-energy confident and unobtrusive, reference: LinkedIn brand-film intro score",
        "captions": "none"
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
    "name": "About-Page Intro Reel",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 7,
    "rationale": "About/링크드인 무빙 프로필 2샷 — 정면 젠틀 스마일 클로즈업 → 약한 3/4 회전(±15° 이하) 미디엄샷, cut 전환. 약한 회전이라 저위험. ◈4.",
    "meta": {
      "change": "new",
      "flags": [
        "needs_human_review"
      ],
      "render_notes": "Keep head rotation within ~±15 degrees only — no full head turn, no lip-sync, no large or fast motion. Use micro motion (slow blink, faint smile, very slow push-in, gentle settle into a soft three-quarter). Verify identity stays locked and stable across both shots on every frame to avoid identity morph."
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
        "style_preset": "Corporate",
        "wardrobe": "tailored blazer over a crisp shirt, clean professional styling",
        "attributes": [
          "lighting:soft_clamshell_studio",
          "color:neutral_true",
          "texture:skin_natural",
          "context:grey_seamless_studio"
        ],
        "extra_positive": "CRITICAL: the exact same individual in both shots, locked facial identity and bone structure, no face morph or identity drift across any frame, moving about-page profile reel, two gentle beats cutting from a steady front-facing pose into a soft three-quarter held within about fifteen degrees, clean light-grey seamless studio backdrop, soft clamshell key with a subtle hair light, 85mm at f4 flattering portrait compression, shoulders-up crop tightening from closeup to a calm medium framing, confident approachable professional expression, sharp catchlight eyes in focus, true-to-life skin with polished but natural retouch, smooth stable micro-motion only with a slow natural blink and faint warming smile, corporate clean and trustworthy mood",
        "extra_negative": "warped face, asymmetric eyes, plastic over-retouched skin, identity drift between shots, lip-sync mouth distortion, mouth or tooth morph between frames, large or fast head rotation, full head turn, jittery unstable motion, flickering lens reflection across the turn, glasses glare distortion, harsh shadows, busy background, casual streetwear, film grain, golden hour"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "light-grey seamless studio, soft clamshell key with subtle hair light",
          "pose": "front-facing professional, gentle confident smile holding gaze, squared shoulders",
          "composition": "closeup"
        },
        {
          "scene": "same studio, identical clamshell lighting",
          "pose": "gentle three-quarter turn within ~15 degrees, holding gaze, soft confident expression",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "front-facing micro drift only — slow natural blink, faint warming smile, very slow push-in",
          "very gentle settle into a soft three-quarter within ~±15 degrees only — no full head turn, micro motion only"
        ],
        "duration_per_shot": 4,
        "transition": "cut",
        "music_mood": "ambient corporate underscore, 70-85 BPM, felt piano + warm synth pads + soft low strings, low-energy confident, reference: LinkedIn brand-film score",
        "captions": "none"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  }
];
