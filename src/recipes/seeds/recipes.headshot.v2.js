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
    "rationale": "링크드인 정석 프로필 — 회색 배경·정장·신뢰 미소 4컷. 헤드샷 카탈로그 ◈2 진입 앵커이자 시장 최대 수요(채용/팀페이지/영업).",
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
        "wardrobe": "professional business attire — tailored dark blazer over a crisp shirt, clean minimal styling",
        "attributes": [
          "lighting:soft_clamshell_studio",
          "color:neutral_true",
          "texture:skin_natural",
          "context:grey_seamless_studio"
        ],
        "extra_positive": "professional corporate headshot, clean light-grey seamless studio backdrop, soft clamshell key with a subtle hair light, 85mm at f4 flattering compression, shoulders-to-chest crop, confident trustworthy expression, sharp catchlight eyes in focus, true-to-life skin, polished but natural retouch, identity preserved consistently across all four shots",
        "negative": "extra fingers, deformed hands, warped face, asymmetric eyes, plastic over-retouched skin, identity drift between shots, glasses glare distortion, harsh shadows, blown highlights, busy or colorful background, text artifacts, watermark, casual streetwear, film grain, golden hour glamour"
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
        "extra_positive": "high-end executive author portrait, charcoal-to-deep-navy gradient backdrop, dramatic directional side key light with a crisp rim light separating the subject from the dark background, 85mm at f4 flattering compression, shoulders-up authoritative framing, composed serious-but-warm expression, immaculate sharp catchlights in focus, true-to-life skin with polished but natural retouch, magazine author-photo gravitas, identity preserved consistently across all four shots",
        "negative": "extra fingers, deformed hands, warped face, asymmetric eyes, plastic over-retouched skin, identity drift between shots, glasses glare distortion, harsh shadows, busy background, blown highlights, flat frontal flash, casual streetwear, film grain, golden hour, bright cheerful background, casual clothing, text artifacts, watermark"
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
        "extra_positive": "professional corporate headshot of the same individual repeated across four shots with consistent facial identity, each shot using a different background and a different professional outfit, soft clamshell key with subtle hair light and clean window fill, 85mm at f4 flattering compression, sharp eyes in focus, confident and approachable expression, true-to-life skin with polished but natural retouch, neutral business mood, identity preserved across all four shots",
        "negative": "extra fingers, deformed hands, warped face, asymmetric eyes, plastic over-retouched skin, identity drift between shots, glasses glare distortion, harsh shadows, busy background, text artifacts, watermark, casual streetwear, film grain, golden hour glamour lighting, trendy filters, lens distortion, blown highlights"
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
        "extra_positive": "standardized team-page headshot, fixed soft even frontal key, uniform mid-grey seamless backdrop, consistent shoulders-up crop and level eye-line, 85mm at f4 flattering compression held identical across shots, neutral friendly expression, consistent lighting/background/crop across team members, uniform framing repeatable for an entire team directory, true-to-life skin, polished natural retouch, identity preserved across all four shots",
        "negative": "extra fingers, deformed hands, warped face, asymmetric eyes, plastic over-retouched skin, identity drift between shots, inconsistent lighting or backdrop tone, varying crop or eye-line, non-uniform framing, dramatic or harsh shadows, busy background, casual streetwear, film grain, golden hour, glasses glare distortion, text artifacts, watermark"
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
        "extra_positive": "warm approachable personal-brand headshot, soft natural window light wrapping the face, bright airy interior with gentle background bokeh, smart-casual soft blazer or fine knit, genuine friendly smile, 85mm at f4 flattering compression, shoulders-up crop, professional yet warm coach-and-creator energy, sharp catchlight eyes in focus, true-to-life skin, polished but natural retouch, identity preserved consistently across all four shots",
        "negative": "extra fingers, deformed hands, warped face, asymmetric eyes, plastic over-retouched skin, identity drift between shots, glasses glare distortion, harsh shadows, busy background, text artifacts, watermark, casual streetwear, film grain, cold corporate flash, blown highlights"
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
        "extra_positive": "professional corporate moving headshot, light-grey seamless studio backdrop, soft clamshell key with subtle hair light, 85mm at f4 flattering compression, shoulders-up closeup crop, front-facing confident approachable expression with a gentle smile holding the gaze, sharp eyes in focus, true-to-life skin, polished but natural retouch, trustworthy business mood, identity preserved and stable throughout",
        "negative": "extra fingers, deformed hands, warped face, asymmetric eyes, plastic over-retouched skin, identity drift between shots, glasses glare distortion, lens distortion, harsh shadows, blown highlights, busy background, text artifacts, watermark, casual streetwear, film grain, golden hour, trendy filter, lip-sync, large head rotation"
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
        "music_mood": "calm professional ambient",
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
        "extra_positive": "moving about-page profile reel, two gentle beats from a front-facing pose to a soft three-quarter within about fifteen degrees, clean light-grey seamless studio backdrop, soft clamshell key with subtle hair light, 85mm at f4 flattering portrait compression, shoulders-up crop, confident approachable professional expression, sharp catchlight eyes, true-to-life skin, smooth stable micro-motion, identity locked and consistent across both shots",
        "negative": "extra fingers, deformed hands, warped face, asymmetric eyes, plastic over-retouched skin, identity drift between shots, lip-sync mouth distortion, large or fast head rotation, full head turn, jittery unstable motion, glasses glare distortion, flickering lens reflection across the turn, harsh shadows, busy background, casual streetwear, film grain, golden hour, text artifacts, watermark"
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
        "music_mood": "calm professional ambient",
        "captions": "none"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  }
];
