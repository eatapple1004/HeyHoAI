/**
 * Doppia recipe seed — headshot (influencer/face mode), 7 templates.
 * net-new v2 catalog (브리프: docs/섹션명령서/11_headshot.md). 통합 스키마 v1 (A2 layered + A5 shot-list).
 * 톤 = 전문가 스튜디오 헤드샷(인플루언서와 정반대): 클린 라이팅·중립 배경·신뢰 비즈니스 무드.
 * subject = face / identity_lock. 손 리스크 낮음(어깨 크롭). 릴은 미세 모션만(립싱크·큰 회전 금지).
 */
module.exports = [
  {
    "mode": "influencer",
    "category": "Corporate",
    "name": "LinkedIn Classic",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "링크드인 정석 프로필 — 회색 배경·정장·신뢰 미소 4컷. 헤드샷 카탈로그 ◈2 진입 앵커이자 시장 최대 수요(채용/팀페이지/영업).",
    "meta": { "change": "new" },
    "config": {
      "schema_version": 1,
      "mode": "influencer",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "face", "reference_strategy": "identity_lock", "min_refs": 1 },
      "look": {
        "style_preset": "Corporate",
        "wardrobe": "professional business attire — tailored dark blazer over a crisp shirt, clean minimal styling",
        "attributes": ["lighting:soft_clamshell_studio", "color:neutral_true", "texture:skin_natural", "context:grey_seamless_studio"],
        "extra_positive": "professional corporate headshot, clean light-grey seamless studio backdrop, soft clamshell key with a subtle hair light, 85mm at f4 flattering compression, shoulders-up crop, confident approachable expression, sharp catchlight eyes in focus, true-to-life skin, polished but natural retouch, identity preserved consistently across all four shots",
        "negative": "extra fingers, deformed hands, warped face, asymmetric eyes, plastic over-retouched skin, identity drift between shots, casual streetwear, harsh shadows, blown highlights, busy or colorful background, text artifacts, watermark, glasses glare distortion"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light-grey seamless studio, soft even clamshell key", "pose": "front-facing, gentle confident smile, squared shoulders", "composition": "closeup" },
        { "scene": "same studio, identical lighting", "pose": "front-facing neutral professional expression, chin slightly down", "composition": "closeup" },
        { "scene": "same studio, subtle key from camera-left", "pose": "slight three-quarter turn, soft smile, engaged eyes", "composition": "medium_shot" },
        { "scene": "same studio", "pose": "arms loosely crossed, relaxed authoritative stance", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },
  {
    "mode": "influencer",
    "category": "Corporate",
    "name": "Executive Authority",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "임원/저자/연사용 권위 톤 — 어두운 배경·측광·림라이트로 신뢰와 위엄. 흑백 변형 슬롯으로 에디토리얼 프로필까지 한 세트에 흡수.",
    "meta": { "change": "new", "style_variants": ["dark_color", "mono_bw"], "render_notes": "Shot 3 renders as a graded monochrome variant; keep the same identity and framing as the color shots." },
    "config": {
      "schema_version": 1,
      "mode": "influencer",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "face", "reference_strategy": "identity_lock", "min_refs": 1 },
      "look": {
        "style_preset": "Corporate",
        "wardrobe": "sharp dark suit with tie or structured blazer, executive styling",
        "attributes": ["lighting:directional_side_key_rim", "color:deep_charcoal_navy", "texture:skin_natural", "context:dark_gradient_backdrop"],
        "extra_positive": "high-end executive portrait, charcoal-to-deep-navy gradient backdrop, dramatic directional side key with a crisp rim light separating subject from background, 85mm at f2.8, shoulders-up authoritative framing, composed serious-but-warm expression, immaculate catchlights, magazine author-photo quality, identity preserved across every shot",
        "negative": "extra fingers, deformed hands, warped face, asymmetric eyes, identity drift between shots, plastic over-retouched skin, flat frontal flash, bright cheerful background, casual clothing, text artifacts, watermark, glasses glare distortion"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "dark charcoal gradient backdrop, single directional key camera-left, rim light camera-right", "pose": "front-facing, composed serious expression, strong steady gaze", "composition": "closeup" },
        { "scene": "same dark set, deeper side lighting and shadow falloff", "pose": "three-quarter turn into the key light, chin level, confident", "composition": "medium_shot" },
        { "scene": "same set rendered as refined high-contrast black & white", "pose": "front-facing, subtle resolute expression, editorial author mood", "composition": "closeup" },
        { "scene": "same dark set, slight low camera angle for stature", "pose": "shoulders squared, faint confident half-smile, hands out of frame", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },
  {
    "mode": "influencer",
    "category": "Personal Brand",
    "name": "Background & Wardrobe Swap",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 3,
    "rationale": "한 셀카로 채널마다 다른 배경·복장이 필요한 핵심 전환 JTBD — 회색/화이트/오피스/야외 4변형. 표정 변형(미소·무표정)도 같은 슬롯에서 커버.",
    "meta": { "change": "new", "render_notes": "All four variants must hold the same face identity; only background, wardrobe and expression change." },
    "config": {
      "schema_version": 1,
      "mode": "influencer",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "face", "reference_strategy": "identity_lock", "min_refs": 1 },
      "look": {
        "style_preset": "Corporate",
        "wardrobe": "rotating professional looks — dark blazer, crisp white shirt, smart blazer, soft knit",
        "attributes": ["lighting:soft_clamshell_studio", "color:neutral_true", "texture:skin_natural", "context:multi_background_swap"],
        "extra_positive": "one-face multi-look professional headshot set, four distinct background-and-wardrobe variations rendered with the exact same person, soft directional studio key blending into natural window light, 85mm at f4 flattering portrait compression held consistent across all four variants, shoulders-up crop, polished profile-ready expressions, identity locked and consistent across all variants",
        "negative": "extra fingers, deformed hands, warped face, identity drift between shots, mismatched face shape across variants, plastic over-retouched skin, harsh shadows, busy clutter, text artifacts, watermark, glasses glare distortion"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light-grey seamless studio", "pose": "front-facing in a dark blazer, confident gentle smile", "composition": "closeup" },
        { "scene": "clean white background", "pose": "crisp white shirt, neutral professional expression, slight three-quarter", "composition": "closeup" },
        { "scene": "softly blurred modern office, glass-wall bokeh", "pose": "smart blazer, approachable smile, relaxed shoulders", "composition": "medium_shot" },
        { "scene": "outdoor natural bokeh, soft daylight", "pose": "soft knit, warm casual smile, friendly tilt", "composition": "medium_shot" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },
  {
    "mode": "influencer",
    "category": "Team",
    "name": "Team Page Consistent",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 4,
    "rationale": "B2B/HR 차별 컷 — 동일 조명·배경·크롭 규격으로 여러 멤버가 같은 룩을 갖는 팀페이지 일관 세트. 경쟁사가 약한 'consistency' JTBD 직격.",
    "meta": { "change": "new", "render_notes": "Locked template spec (same key light, same backdrop tone, same shoulders-up crop) so multiple team members composited later share one consistent look." },
    "config": {
      "schema_version": 1,
      "mode": "influencer",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "face", "reference_strategy": "identity_lock", "min_refs": 1 },
      "look": {
        "style_preset": "Corporate",
        "wardrobe": "company-neutral professional attire, solid blazer or shirt, no loud patterns",
        "attributes": ["lighting:soft_even_frontal_key", "color:neutral_true", "texture:skin_natural", "context:uniform_soft_grey_backdrop"],
        "extra_positive": "standardized team-page headshot, fixed soft even frontal key, uniform mid-grey backdrop, consistent shoulders-up crop and eye-line, neutral friendly expression, repeatable look that matches across an entire team directory, true-to-life skin, identity preserved",
        "negative": "extra fingers, deformed hands, warped face, identity drift between shots, inconsistent lighting or backdrop tone, varying crop or eye-line, dramatic shadows, busy background, text artifacts, watermark, glasses glare distortion"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "uniform mid-grey backdrop, fixed soft frontal key", "pose": "front-facing, neutral friendly expression, level eye-line", "composition": "closeup" },
        { "scene": "same fixed setup", "pose": "front-facing, gentle closed-mouth smile, level eye-line", "composition": "closeup" },
        { "scene": "same fixed setup", "pose": "barely-there left micro-angle, same crop and eye-line", "composition": "closeup" },
        { "scene": "same fixed setup", "pose": "barely-there right micro-angle, same crop and eye-line", "composition": "closeup" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },
  {
    "mode": "influencer",
    "category": "Personal Brand",
    "name": "Approachable Brand",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 5,
    "rationale": "코치·강사·크리에이터용 따뜻한 퍼스널 브랜딩 톤 — 자연 창광·캐주얼 정장·친근 미소. LinkedIn Classic/Executive의 격식과 무드 분리.",
    "meta": { "change": "new" },
    "config": {
      "schema_version": 1,
      "mode": "influencer",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "face", "reference_strategy": "identity_lock", "min_refs": 1 },
      "look": {
        "style_preset": "Corporate",
        "wardrobe": "smart-casual — soft blazer or knit over a relaxed shirt, warm friendly styling",
        "attributes": ["lighting:warm_window_daylight", "color:warm_neutral", "texture:skin_natural", "context:bright_airy_interior_bokeh"],
        "extra_positive": "warm approachable personal-brand portrait, soft natural window light, bright airy interior with gentle bokeh, smart-casual wardrobe, genuine relaxed smile, 50-85mm flattering look, inviting coach-and-creator energy, true-to-life skin, identity preserved across shots",
        "negative": "extra fingers, deformed hands, warped face, identity drift between shots, plastic over-retouched skin, cold corporate flash, harsh shadows, cluttered background, stiff formal stiffness, text artifacts, watermark, glasses glare distortion"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "bright window-lit interior, soft daylight wrap", "pose": "front-facing by the window, warm genuine smile", "composition": "closeup" },
        { "scene": "same airy interior, gentle background bokeh", "pose": "slight three-quarter, light laugh, relaxed shoulders", "composition": "medium_shot" },
        { "scene": "tidy desk or plants softly blurred behind", "pose": "leaning in a touch, friendly engaged expression", "composition": "medium_shot" },
        { "scene": "same setting, closer natural-light framing", "pose": "calm warm closeup, soft confident smile", "composition": "closeup" }
      ],
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },
  {
    "mode": "influencer",
    "category": "Reel",
    "name": "Speaking Profile Reel",
    "output_type": "reel",
    "credit_cost": 2,
    "sort_order": 6,
    "rationale": "무빙 프로필 — 헤드샷을 미세하게 움직이는 1샷 인트로(눈 깜빡·미소). About/링크드인용 ◈2 최저가 릴(헤드샷의 릴 바닥은 ◈2로 타 카탈로그보다 낮음), 모션 최소로 안전.",
    "meta": { "change": "new", "flags": ["needs_human_review"], "render_notes": "Motion must stay micro (blink, faint smile, tiny nod) — no lip-sync, no head turn beyond a few degrees, to avoid identity morph. Review face stability on every frame." },
    "config": {
      "schema_version": 1,
      "mode": "influencer",
      "output": { "type": "reel", "count": 1, "aspect_ratio": "9:16" },
      "subject": { "type": "face", "reference_strategy": "identity_lock", "min_refs": 1 },
      "look": {
        "style_preset": "Corporate",
        "wardrobe": "tailored blazer over crisp shirt",
        "attributes": ["lighting:soft_clamshell_studio", "color:neutral_true", "texture:skin_natural", "context:grey_seamless_studio"],
        "extra_positive": "professional moving headshot intro, subtle lifelike micro-motion, clean grey studio, soft clamshell light, 85mm portrait look, confident warm expression, identity locked and stable across every frame",
        "negative": "extra fingers, deformed hands, warped face, identity drift, lip-sync mouth distortion, large head rotation, jittery unstable motion, plastic skin, glasses glare distortion, flickering lens reflection, text artifacts, watermark"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light-grey seamless studio, soft clamshell key", "pose": "front-facing professional, gentle smile holding gaze", "composition": "closeup" }
      ],
      "reel": {
        "per_shot_motion": ["micro motion only: slow natural blink, faint warming smile, barely perceptible nod, very slow push-in"],
        "duration_per_shot": 4,
        "transition": "cut",
        "music_mood": "calm professional ambient",
        "captions": "none"
      },
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  },
  {
    "mode": "influencer",
    "category": "Reel",
    "name": "About-Page Intro Reel",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 7,
    "rationale": "About/링크드인 무빙 프로필 — 정면→3/4 약한 회전 2샷. 살짝의 움직임으로 정적인 페이지에 생기. 회전은 ±15° 이내로 제한해 정체성 모핑 회피.",
    "meta": { "change": "new", "flags": ["needs_human_review"], "render_notes": "Keep rotation within ~±15° and motion gentle — no lip-sync, no large turns. Verify identity stays locked across both shots." },
    "config": {
      "schema_version": 1,
      "mode": "influencer",
      "output": { "type": "reel", "count": 2, "aspect_ratio": "9:16" },
      "subject": { "type": "face", "reference_strategy": "identity_lock", "min_refs": 1 },
      "look": {
        "style_preset": "Corporate",
        "wardrobe": "tailored blazer over crisp shirt",
        "attributes": ["lighting:soft_clamshell_studio", "color:neutral_true", "texture:skin_natural", "context:grey_seamless_studio"],
        "extra_positive": "moving about-page profile, two gentle beats from front to a soft three-quarter, clean grey studio, soft clamshell light, 85mm portrait compression, confident approachable expression, smooth stable motion, identity locked and consistent",
        "negative": "extra fingers, deformed hands, warped face, identity drift between shots, lip-sync mouth distortion, large or fast head rotation, jittery motion, plastic skin, glasses glare distortion, flickering lens reflection across the turn, text artifacts, watermark"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light-grey seamless studio, soft clamshell key", "pose": "front-facing professional, calm confident gaze", "composition": "closeup" },
        { "scene": "same studio, identical lighting", "pose": "gentle three-quarter turn within ~15 degrees, soft smile", "composition": "medium_shot" }
      ],
      "reel": {
        "per_shot_motion": ["front-facing with a barely-there micro drift and slow push-in", "very gentle settle into a soft three-quarter (within ~15 degrees), no full head turn"],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "calm professional ambient",
        "captions": "none"
      },
      "provider": { "image": "nano-banana", "video": "kling" }
    }
  }
];
