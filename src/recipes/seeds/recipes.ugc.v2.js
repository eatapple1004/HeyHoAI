/**
 * Doppia recipe seed — ugc (ugc mode), 7 templates — v2.
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list). recipes 테이블에 INSERT.
 *
 * v2 변경 요약:
 * - Street Interview 제거 (AI 신뢰도 최하 / lip-sync 위험 대비 효용 낮음)
 * - 중복 talking-head 3개 → 1개로 통합 강화 (Talking-Head Testimonial)
 * - 신규 추가: "Static UGC Photo Ad" [image_set ◈2] — 최저가 진입, zero lip-sync risk
 * - 신규 추가: "TikTok Discovery POV" [1-shot reel ◈2] — 2026년 #1 UGC 광고 포맷
 * - 크레딧 전체 재조정: ◈2 / ◈2 / ◈4 / ◈4 / ◈6 / ◈8 사다리 완성
 * - lip-sync 위험 레시피에 meta.flags + 강화된 negative 적용
 * - text_overlay 정적 광고에 적용 (SAFETY_NEGATIVE 'text'/'logo' 충돌 방지)
 *
 * v2 검증·확정 (2026-06-10) — 4축 검증 통과, 7개 그대로 확정:
 * - (a) 커버리지: 7개 ↔ 7개 JTBD 1:1 정합, 중복 0 (Static·POV·Hook+CTA·Unboxing·Problem→Solution·Talking-Head·Demo).
 * - (b) 가격사다리/비용공식: I2 · R2 R4 R4 R6 R6 R8 — image=count×0.5, reel=shots×2 전수 일치, ◈2 진입+◈2 릴 충족, 위반 0.
 * - (c) lip-sync 5종: 전부 flags:[experimental, needs_human_review] + anti-desync negative.
 *       Unboxing Shot1 / Product Demo Shot2 는 얼굴없는 무음 B-roll 로 분리하여 립싱크 의존도↓.
 * - (d) 🅣 Static: text_overlay:true, look.negative 에 'text'/'logo' 미포함 — imagePrompt.builder.js
 *       SAFETY_NEGATIVE_PROMPT 가 'text'/'logo' 를 전역 주입하므로 중복/충돌 방지 (검증 완료).
 * - 이름 전역 고유: 7개 모두 전 v2 시드(59개 이름) 대비 충돌 없음.
 * - keep 7 / cut 0 / merge 0 / add 0 (Text-Hook Static Carousel 은 Static 의 variant 로 흡수 권장).
 */
module.exports = [
  // ─────────────────────────────────────────────
  // 1. STATIC UGC PHOTO AD  [image_set · ◈2]
  //    최저가 진입 / zero lip-sync risk / headline text_overlay 사용
  // ─────────────────────────────────────────────
  {
    "mode": "ugc",
    "category": "Static",
    "name": "Static UGC Photo Ad",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "가장 저렴한 UGC 진입 포맷. 립싱크 리스크 없이 creator 얼굴+제품을 4컷 정적 광고세트로 생성. 헤드라인/CTA 텍스트는 text_overlay 레이어로 합성하므로 negative에 'text'/'logo' 불포함.",
    "meta": {
      "render_notes": "text_overlay=true: Shot 1 상단에 headline(예: 'obsessed with this'), Shot 4 하단에 CTA(예: 'link in bio →') 를 렌더 후 합성 레이어로 추가. SAFETY_NEGATIVE의 'text'/'logo' 가 이미지 생성 단계에서 인젝션되므로 look.negative에는 해당 토큰 제외."
    },
    "config": {
      "schema_version": 1,
      "mode": "ugc",
      "text_overlay": true,
      "output": {
        "type": "image_set",
        "count": 4,
        "aspect_ratio": "4:5"
      },
      "subject": {
        "type": "avatar",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Natural",
        "attributes": [
          "lighting:soft_window_key",
          "color:warm_neutral",
          "texture:skin_natural_pores",
          "context:home_interior_bokeh"
        ],
        "wardrobe": "casual everyday outfit matching the product category",
        "extra_positive": "authentic iPhone-shot UGC still, creator holding product naturally, genuine micro-expression (soft smile or focused look), product label visible and sharp, shallow depth-of-field background bokeh, photo feels like an organic social post not a studio shoot",
        "negative": "studio overlit look, fake smile, floating disconnected product, distorted product shape, extra fingers, warped hands, duplicate person, plastic waxy skin, dead eyes, garish background, overposed model stiffness"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright living room, large window key light camera-left, soft plants bokeh",
          "pose": "holding product at chest level, looking directly at camera with a warm genuine smile",
          "composition": "medium_shot"
        },
        {
          "scene": "close on hands and product on a clean table surface, warm daylight side-light",
          "pose": "both hands cradling or examining the product, product label facing camera",
          "composition": "closeup"
        },
        {
          "scene": "bedroom or bathroom vanity, soft natural light, clean tidy background",
          "pose": "product integrated into a lifestyle moment (holding near face / in use context), relaxed expression",
          "composition": "closeup"
        },
        {
          "scene": "same living room as shot 1, cozy warm afternoon light",
          "pose": "product raised beside face, slight head tilt, inviting look toward camera",
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
  // 2. TIKTOK DISCOVERY POV  [1-shot reel · ◈2]
  //    2026년 #1 UGC 광고 스타일 / low cost / no full talking
  // ─────────────────────────────────────────────
  {
    "mode": "ugc",
    "category": "Discovery",
    "name": "TikTok Discovery POV",
    "output_type": "reel",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "2026년 TikTok Shop·Reels 최다 바이럴 포맷. '#TikTokMadeMeBuyIt' 에너지 — creator가 제품을 발견·집어드는 1컷 POV 리액션 클립. 립싱크 없음(리액션+효과음만), 생성 성공률 최고.",
    "meta": {
      "render_notes": "captions='auto': Shot 1 상단 자막으로 'POV: TikTok made me buy it 🛒' 스타일 텍스트 오버레이 삽입. 음성 없이 효과음+BGM만 사용하므로 lip-sync 렌더 불필요."
    },
    "config": {
      "schema_version": 1,
      "mode": "ugc",
      "output": {
        "type": "reel",
        "count": 1,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "avatar",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Natural",
        "attributes": [
          "lighting:soft_natural_daylight",
          "color:warm_inviting",
          "texture:skin_natural_pores",
          "context:home_table_or_desk_casual"
        ],
        "wardrobe": "casual everyday outfit",
        "extra_positive": "POV discovery moment — creator reaches toward the product sitting on a surface, picks it up with genuine curiosity, turns it to inspect and reacts with a delighted or surprised expression; no speaking, all reaction expressed through face and body; wide eyes, open mouth of surprise or delight, light head tilt; handheld documentary feel",
        "negative": "talking mouth forming words, lip movement suggesting speech, open-mouth talking pose, frozen blank expression, extra fingers, warped product, studio setup, plastic skin, watermark, posed model stiffness"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "casual home surface (table/counter/bed), product placed in front, soft daylight from the side",
          "pose": "reaching toward product with genuine curiosity, picking it up, inspecting with wide eyes and a delighted gasp expression",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "handheld push-in following the hand reach, slight zoom as product lifts, hold on the delighted reaction face"
        ],
        "duration_per_shot": 4,
        "transition": "cut",
        "music_mood": "playful_viral_trending",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─────────────────────────────────────────────
  // 3. HOOK + CTA AD  [2-shot reel · ◈4]
  //    스크롤스탑 훅 + CTA 2컷 / paid-ads 최적화
  // ─────────────────────────────────────────────
  {
    "mode": "ugc",
    "category": "Demo",
    "name": "Hook + CTA Ad",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 3,
    "rationale": "퍼포먼스 광고 구매자를 위한 타이트한 2컷 구조. 1초 훅으로 스크롤 정지 후 즉각적인 CTA로 마감. 저비용으로 A/B 훅 테스트에 최적.",
    "meta": {
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "lip-sync 2컷 — 각 컷 1–2문장 이하로 제한. 검수 후 릴리즈 권장."
    },
    "config": {
      "schema_version": 1,
      "mode": "ugc",
      "output": {
        "type": "reel",
        "count": 2,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "avatar",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Natural",
        "attributes": [
          "lighting:punchy_bright_key",
          "color:vivid_high_contrast",
          "texture:skin_natural_pores",
          "context:clean_modern_interior"
        ],
        "extra_positive": "high-energy direct-response UGC ad, spokesperson delivers a single scroll-stopping hook line in shot 1, then drives hard CTA in shot 2 while holding product; maximum 1–2 sentences per shot; crisp lip-sync on each short line, energetic delivery, emphatic hand gestures, product clearly visible in shot 2",
        "negative": "no lip-sync desync, no tooth morph, no warped mouth, no identity drift, low energy flat delivery, frozen mouth, extra fingers, warped product, plastic skin, watermark, glitched caption text, dim muddy lighting"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean modern room, bright punchy key light, bold simple background",
          "pose": "pointing finger at camera delivering the hook ('stop scrolling if you…'), wide eyes, 1 sentence, talking",
          "composition": "closeup"
        },
        {
          "scene": "same setup, product raised beside face",
          "pose": "product as hero, delivering direct CTA ('tap the link now'), big smile and point to bio, 1 sentence",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "fast snap zoom-in on the hook line, lips synced to single sentence",
          "quick push-in as product lifts to frame, lip-synced CTA delivery"
        ],
        "duration_per_shot": 3,
        "transition": "whip",
        "music_mood": "high_energy_trap_pop",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─────────────────────────────────────────────
  // 4. UNBOXING REACTION  [2-shot reel · ◈4]
  //    언박싱 리액션 2컷 — 개봉 B-roll + 반응 클로즈업
  // ─────────────────────────────────────────────
  {
    "mode": "ugc",
    "category": "Reaction",
    "name": "Unboxing Reaction",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 4,
    "rationale": "e커머스 셀러·PR패키지 브랜드용. '방금 도착함' 에너지로 신규 드롭을 TikTok/Reels에서 탐나 보이게. 2컷: B-roll 개봉 + 얼굴 리액션으로 립싱크 의존도를 최소화.",
    "meta": {
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Shot 1은 top-down 손 B-roll (립싱크 없음). Shot 2만 짧은 감탄 리액션 — 1문장 이하. 립싱크 합성 오류 시 Shot 2를 무음 리액션으로 대체 가능."
    },
    "config": {
      "schema_version": 1,
      "mode": "ugc",
      "output": {
        "type": "reel",
        "count": 2,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "avatar",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Natural",
        "attributes": [
          "lighting:soft_natural_daylight",
          "color:warm_inviting",
          "texture:cardboard_and_skin_detail",
          "context:home_floor_or_table"
        ],
        "wardrobe": "casual loungewear",
        "extra_positive": "genuine first-look unboxing UGC, shot 1 is top-down B-roll of hands opening the package (no face, no talking), shot 2 is face reaction with wide-eyed gasp and maximum 1-sentence verbal reaction; authentic surprised facial expressions, real hands peeling tape and lifting items out, product clearly visible",
        "negative": "no lip-sync desync, no tooth morph, no warped mouth, no identity drift, warped packaging, distorted product, extra fingers, mangled hands, fake-looking surprise, frozen mouth, plastic skin, watermark, glitched text on box"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "top-down over the package on a cozy floor/table, soft daylight, tape being peeled and flaps opening — NO face in frame",
          "pose": "hands opening the box, lifting item out, product label facing up — pure B-roll, no talking",
          "composition": "closeup"
        },
        {
          "scene": "same setting, creator face now in frame, item held up in the light",
          "pose": "wide-eyed gasp reaction holding the product up, maximum 1 sentence of enthusiastic verbal reaction, then pointing to bio",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "top-down push-in as the box opens and item lifts, no voice — music and sound effects only",
          "quick zoom on gasp reaction as product lifts, short 1-sentence lip-synced line then smile"
        ],
        "duration_per_shot": 4,
        "transition": "whip",
        "music_mood": "playful_excited_pop",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─────────────────────────────────────────────
  // 5. PROBLEM → SOLUTION  [3-shot reel · ◈6]
  //    문제→해결 감정 아크 / DR 광고 최고 전환 구조
  // ─────────────────────────────────────────────
  {
    "mode": "ugc",
    "category": "Talking",
    "name": "Problem → Solution",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 5,
    "rationale": "다이렉트-리스폰스 광고에서 전환율 최고인 UGC 구조. 시청자가 느끼는 페인포인트로 시작해 제품으로 해결하는 감정 아크. 3컷으로 원고 여유 확보.",
    "meta": {
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "각 컷 1–2문장 엄수. Shot 1(문제) → Shot 2(중립/제품) → Shot 3(해결/CTA) 구조. 감정 전환은 표정·조명으로 표현하고 대사는 최소화. 립싱크 오류 시 자막만으로 의미 전달 가능하도록 원고 작성."
    },
    "config": {
      "schema_version": 1,
      "mode": "ugc",
      "output": {
        "type": "reel",
        "count": 3,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "avatar",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Natural",
        "attributes": [
          "lighting:moody_to_bright_shift",
          "color:cool_then_warm",
          "texture:skin_natural_pores",
          "context:home_interior_realistic"
        ],
        "extra_positive": "two-act UGC ad with clear emotional shift; shot 1: frustrated/relatable face, cool desaturated light, 1-sentence problem statement; shot 2: curious/skeptical holding product, transitional warm light, 1-sentence pivot ('so I tried this'); shot 3: relieved/happy, bright warm light, 1-sentence payoff + CTA; maximum 1–2 sentences per shot, believable emotional arc expressed through expression and lighting, not overacting",
        "negative": "no lip-sync desync, no tooth morph, no warped mouth, no identity drift, overacted fake emotion, frozen mouth, extra fingers, warped face, plastic skin, watermark, garbled captions, theatrical soap-opera lighting"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "dim slightly cluttered room, cool flat overcast light, desaturated tones",
          "pose": "frustrated face, hand on forehead, 1-sentence problem statement ('if you also struggle with…'), sighing delivery",
          "composition": "closeup"
        },
        {
          "scene": "same room, light beginning to warm, product introduced",
          "pose": "skeptical-but-curious, holding product and reading it aloud — 1-sentence pivot line ('so I actually tried this')",
          "composition": "medium_shot"
        },
        {
          "scene": "bright cheerful living room, warm golden light",
          "pose": "relieved and happy, holding product, 1-sentence payoff + gesture toward link/bio",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "static slightly shaky handheld, heavy sigh, lips synced to 1-sentence problem line",
          "slow push-in as she inspects the product, lips synced to short pivot line",
          "slow pull-back on upbeat CTA, confident talking and gesture"
        ],
        "duration_per_shot": 3,
        "transition": "fade",
        "music_mood": "tense_then_uplifting",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─────────────────────────────────────────────
  // 6. TALKING-HEAD TESTIMONIAL  [3-shot reel · ◈6]
  //    (구 4컷 ◈8 → 3컷 ◈6 로 통합 강화)
  //    핵심 신뢰 빌더 / 얼굴+구두 추천
  // ─────────────────────────────────────────────
  {
    "mode": "ugc",
    "category": "Talking",
    "name": "Talking-Head Testimonial",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 6,
    "rationale": "솔로 파운더·제휴 크리에이터가 한 줄 원고를 신뢰도 높은 페이스캠 리뷰 릴로 전환하는 기본 신뢰 빌더. 3컷으로 정리해 립싱크 리스크 대비 효용 최적화.",
    "meta": {
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "컷당 최대 1–2문장. Hook(1컷) → 핵심 혜택(2컷) → 추천+CTA(3컷). 중간 B-roll 컷 없으므로 각 컷 표정·제스처로 단조로움 방지. 립싱크 오류 시 자막 우선 의존."
    },
    "config": {
      "schema_version": 1,
      "mode": "ugc",
      "output": {
        "type": "reel",
        "count": 3,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "avatar",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Natural",
        "attributes": [
          "lighting:soft_window_key",
          "color:warm_neutral",
          "texture:skin_natural_pores",
          "context:home_interior_bokeh"
        ],
        "extra_positive": "authentic self-shot iPhone front-camera UGC look, spokesperson speaking directly to camera, natural eye contact and micro-expressions, hand gestures while talking; maximum 1–2 sentences per shot; shot 1: relatable confession hook with open hand gesture; shot 2: product held beside face, core benefit delivery; shot 3: confident soft recommendation nod pointing toward link/bio; perfectly synced mouth shapes to the spoken line, clean lip-sync, subtle head nods and blinks",
        "negative": "no lip-sync desync, no tooth morph, no warped mouth, no identity drift, stiff frozen mouth, robotic delivery, extra fingers, warped face, plastic waxy skin, dead eyes, on-screen watermark, garbled caption text, studio overlit infomercial look, duplicated person"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright living room, soft sofa and plants blurred behind, large window key light camera-left",
          "pose": "seated facing camera, leaning in slightly, delivering 1-sentence relatable hook with open hand gesture",
          "composition": "closeup"
        },
        {
          "scene": "same living room, warm lamp fill, shallow depth bokeh",
          "pose": "holding the product beside face, delivering 1-sentence core benefit — genuine smile",
          "composition": "medium_shot"
        },
        {
          "scene": "same living room, golden afternoon light, relaxed setting",
          "pose": "wrapping up with a confident nod, 1-sentence soft recommendation, pointing toward link/bio",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow push-in on face during hook line, lips synced to 1-sentence hook",
          "static handheld micro-sway, talking with natural blinks, product in frame",
          "slow pull-back on CTA nod and point gesture"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "warm_lofi_confident",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─────────────────────────────────────────────
  // 7. PRODUCT DEMO  [4-shot reel · ◈8]
  //    실물 사용 시연 / 최고급 티어 유지
  // ─────────────────────────────────────────────
  {
    "mode": "ugc",
    "category": "Demo",
    "name": "Product Demo",
    "output_type": "reel",
    "credit_cost": 8,
    "sort_order": 7,
    "rationale": "DTC 브랜드·앱 마케터가 크리에이터로 하여금 제품을 실제로 사용하게 보여주는 4컷 풀 데모. 구두 주장과 온스크린 증거를 결합해 회의적인 시청자를 설득.",
    "meta": {
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "4컷 전체 립싱크. Shot 2(B-roll 손 데모)에는 나레이션 VO만 사용하고 얼굴 클로즈업 없이 처리하면 오류 위험 감소. 각 컷 1–2문장 엄수."
    },
    "config": {
      "schema_version": 1,
      "mode": "ugc",
      "output": {
        "type": "reel",
        "count": 4,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "avatar",
        "reference_strategy": "identity_lock",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Natural",
        "attributes": [
          "lighting:bright_daylight_diffused",
          "color:clean_crisp",
          "texture:skin_natural_pores",
          "context:bright_desk_or_bathroom"
        ],
        "extra_positive": "hands-on UGC demonstration, spokesperson talks while physically using the product, alternating between face-to-camera lines and over-the-shoulder demo angles; maximum 1–2 sentences per talking shot; tight lip-sync on talking shots, natural step-by-step hand motion, real product interaction, product label visible and sharp",
        "negative": "no lip-sync desync, no tooth morph, no warped mouth, no identity drift, warped product, distorted label text, extra fingers, melted hands, floating disconnected product, frozen mouth, plastic skin, watermark, glitched UI text"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "clean bright desk by window, soft diffused daylight, minimal props",
          "pose": "facing camera introducing the product held in one hand, 1-sentence intro talking",
          "composition": "medium_shot"
        },
        {
          "scene": "close over-the-shoulder onto hands operating the product on the desk — no face visible",
          "pose": "demonstrating step one, fingers interacting with product — B-roll with VO narration, no lip-sync",
          "composition": "closeup"
        },
        {
          "scene": "bright bathroom or counter, crisp daylight, tiled background blurred",
          "pose": "applying or using product on self, 1-sentence narration of the result mid-demo",
          "composition": "closeup"
        },
        {
          "scene": "back at the desk, result shown to camera, bright airy mood",
          "pose": "presenting finished result with satisfied expression, 1-sentence verdict + CTA",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "static talking shot, slight push-in, lips synced to 1-sentence intro",
          "top-down focus rack onto hands as they operate the product — no face, VO only",
          "handheld follow of the application motion, lip-synced 1-sentence narration",
          "slow push-in on the visible result with confident 1-sentence talking"
        ],
        "duration_per_shot": 3,
        "transition": "whip",
        "music_mood": "upbeat_clean_energetic",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  }
];
