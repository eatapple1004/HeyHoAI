/**
 * Doppia recipe seed — jewelry (product mode), 8 templates — v2.1.
 * 통합 스키마 v1. recipes 테이블에 INSERT.
 *
 * v2.1 changelog vs v2 (커버리지 감사 결과 — 4대 구조 공백 해소):
 *  - Facet Macro → "Surface Macro": 패싯 전용 매크로를 표면 적응형으로 일반화
 *      (패싯 스톤=다크필드 파이어 / 진주·옥·호박·우드·레진·에나멜=luster·orient·grain).
 *      → 비(非)패싯 ~120–150종의 J1 품질증명 공백 해소.
 *  - Scale & Sizing → "Scale & Spec Overlay": 🅣 오버레이를 사이즈 전용 → 사이즈 OR
 *      스펙/소재/인증(14K/18K·캐럿·GIA/IGI·홀마크)으로 일반화. → S7 해소.
 *  - NEW "Neck & Ear Try-On" (on_model_tryon ◈5): 손 外 착용 — 목/데콜테 + 귓불(드롭·후프).
 *      귀걸이·목걸이(최대 손실군) J3 복원. 얼굴/피어싱/연골/헤어/발은 v3 보류. experimental.
 *  - NEW "Set & Stack Stylist" (◈2): 멀티피스 코디 플랫레이(반지 스택·레이어드 목걸이·
 *      뱅글 스택·파뤼르). → S8(객단가) 해소. 해부 없음 = 저위험.
 *  - Sparkle Snap + Light Play Reel → "Lumen Reel"(2샷 ◈4)로 병합: 표면 적응형 스파클/luster
 *      릴 하나(패싯 파이어 OR luster 롤). J4 중복 제거 + 무광/유기 모션 공백 해소. ≤◈4 유지.
 *      NOTE: 프리미엄 3샷 ◈6 티어는 8개 상한 때문에 접음 — 엔진 `shots`(1/2/3) 파라미터 생기면 복원.
 *  - 유지(무변경): Studio & Editorial(◈2) · Wrist & Hand(◈5) · Jewelry Unbox ASMR(◈6).
 *
 * 가격 사다리: I2 I2 I2 I5 I5 I2 · R4 R6  (◈2 진입 ✓ · 싼 릴스 ◈4 ✓ · 8개 ✓).
 *
 * v3 백로그(현 AI 신뢰도 미달): 얼굴/피어싱 부위 착용, 헤어/티아라, 발/발찌, 맨귀 스터드 정합,
 *  전통 풀파뤼르 동시착용.
 */
module.exports = [
  // ─── 1. SURFACE MACRO (generalized Facet Macro: facet OR luster) ─────────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Macro",
    "name": "Surface Macro",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "Surface-adaptive macro quality-proof. For faceted stones it rakes a pin-spot across the facets to ignite fire; for pearls, jade, amber, wood, resin and enamel it uses soft directional light to reveal luster, orient and grain — so non-faceted pieces (which the old facet-only macro couldn't serve) finally get a zoom-level proof shot at ◈2.",
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
          "lighting:surface_adaptive_facet_or_luster",
          "color:neutral_jewel_tone",
          "texture:polished_metal_or_pearl_organic_micro",
          "context:reflective_neutral_riser"
        ],
        "extra_positive": "extreme macro product photography, single hero piece, 100mm macro lens at f/8 focus-stacked for edge-to-edge tack-sharp depth, lighting adapts to the surface of the uploaded piece — for faceted gemstones a dark-field pin spotlight rakes across the facets to ignite crisp internal fire and dispersion with razor-sharp facet edges and clean specular highlights; for pearls, cabochons, jade, amber, opal, wood, resin and enamel a soft raking directional grazing light reveals luster, orient, chatoyance and natural grain without blowing out the surface, controlled highlight rolloff preserving full surface detail; fine engraving, prongs and hallmarks tack sharp, micro-reflections on polished metal, seamless reflective base, identical to the reference — every facet, stone luster, color and engraving true to the reference with exact proportions",
        "extra_negative": "warped or duplicated stone, distorted prongs, melted or pitted metal, asymmetric facets, over-glossed plastic look on matte or organic surfaces, fake mirror sheen on pearls, lost luster, dull lifeless reflections, fingerprints, dust specks, blown-out specular highlights, extra gems, color shift on metal, soft out-of-focus facet edges"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "reflective neutral riser, surface-adaptive key light",
          "pose": "detail macro of the hero stone or pearl, top-down into the table facet or onto the luster crown",
          "composition": "closeup"
        },
        {
          "scene": "gradient backdrop with single raking light",
          "pose": "3/4 angle showing crown facets or orient and the setting / drill hole",
          "composition": "closeup"
        },
        {
          "scene": "neutral base with faint reflection",
          "pose": "side profile of the band or body, engraving, hallmark or grain visible",
          "composition": "closeup"
        },
        {
          "scene": "macro set, controlled key light",
          "pose": "front macro, full piece centered showing brilliance or luster",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 2. STUDIO & EDITORIAL (unchanged) ──────────────────────────────────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Studio",
    "name": "Studio & Editorial",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "Combines the catalog workhorse (velvet PDP shot) and the mood-forward editorial still-life into one cohesive 4-shot set — covers both pure e-commerce and brand-building use cases at the lowest price point.",
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
          "lighting:soft_diffused_studio_to_golden_window",
          "color:jewel_tone_velvet_to_champagne_gold",
          "texture:velvet_plush_marble_silk",
          "context:velvet_display_and_luxury_still_life"
        ],
        "extra_positive": "premium jewelry studio and editorial photography, 100mm lens at f/8–f/11 for catalog shots transitioning to 85mm f/4 editorial warmth, shots move from clean velvet display catalog hero to a warm directional golden-hour window still-life vignette, large overhead softbox key with a tight grazing kicker rim to define facets and metal edges in the studio catalog frames, soft low-angle golden-hour window light raking in from frame-left as the directional key for the editorial frames, rich deep-emerald velvet surface, then champagne palette with marble veneer and draped silk props, controlled reflections, long elegant shadows in editorial shots, the product rendered identical to the reference in every frame with exact proportions, color and stones preserved, luxury lookbook mood",
        "extra_negative": "distorted product, duplicated piece, lint or hair on velvet, dust specks, blown specular highlights, harsh color cast, gaudy props, cluttered composition, warped reflections in glass, plastic sheen, missing stones, dull lifeless metal"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "deep emerald velvet pad, soft gradient backdrop, large softbox key",
          "pose": "front view, product perfectly centered, clean catalog hero",
          "composition": "medium_shot"
        },
        {
          "scene": "velvet ring pillow or bust display, diffused kicker light",
          "pose": "product on display prop, 3/4 angle showing dimension",
          "composition": "medium_shot"
        },
        {
          "scene": "marble surface with draped champagne silk, golden window light from the left",
          "pose": "piece as editorial hero on silk with elegant negative space, long shadow",
          "composition": "medium_shot"
        },
        {
          "scene": "linen and marble flat composition, soft top light, minimal brass prop",
          "pose": "styled flat-lay, piece at center with curated props, magazine crop",
          "composition": "full_body"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 3. SCALE & SPEC OVERLAY (generalized Scale & Sizing: size OR spec/cert) ──
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Sizing",
    "name": "Scale & Spec Overlay",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 3,
    "rationale": "Answers the two trust questions in one set: 'how big is it?' (coin/ruler + measurement badge) AND 'what is it?' (metal purity 14K/18K, carat, GIA/IGI cert no., hallmark). Generalizes the old size-only overlay so spec/material/cert sellers — the highest-AOV, most-regulated categories — finally get a deterministic info card.",
    "text_overlay": true,
    "meta": {
      "render_notes": "DO NOT inject 'text' or 'logo' into look.negative — SAFETY_NEGATIVE handles that globally. Generate a CLEAN piece on a clean background, then composite ONE badge per image via the platform text-overlay pipeline. Badge content is per-piece: either a measurement badge (e.g. '18mm diameter · 2.1g') OR a spec/material/cert badge (e.g. '18K Gold · 0.50ct · GIA 2185…' / 'Sterling .925' / 'Hallmark 750'). Keep the composition uncluttered so the badge composites cleanly.",
      "overlay_spec": {
        "layer": "composited overlay applied after generation via the platform text-overlay pipeline (not AI-drawn)",
        "elements": [
          "one badge per image: EITHER a measurement badge (e.g. dimension in mm + weight in grams) OR a spec/material/cert badge (e.g. metal karat, carat weight, certification reference, sterling/hallmark stamp)",
          "single rounded pill or rectangular badge with subtle drop shadow for legibility against the matte white surface",
          "optional thin divider or middot separating value pairs within the badge"
        ],
        "position": "lower-third centered OR clean right side margin, aligned to the reserved empty negative-space zone away from the piece and any scale reference"
      }
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
        "style_preset": "Studio",
        "attributes": [
          "lighting:soft_diffused_overhead",
          "color:clean_white_neutral",
          "texture:matte_white_surface",
          "context:size_and_spec_reference_tabletop"
        ],
        "extra_positive": "clean catalog product photography for size and spec reference, 100mm macro lens at f/11, flat soft overhead diffused light with no harsh shadows, piece placed beside a universally recognizable coin or precision ruler edge for scale OR isolated on clean negative space reserved for a composited spec/material badge or caption, matte white seamless surface, the jewelry piece rendered identical to the reference in exact proportions with true-to-reference metal color, finish, stone count, cut and hallmark detail, clinical accuracy, e-commerce info-card feel, balanced framing that offsets the piece to keep a generous lower-third margin of clean uncluttered negative space empty and unobstructed for one composited badge or caption",
        "extra_negative": "distorted scale of product, stretched or compressed proportions, warped ruler, missing coin or reference object when scale is shown, harsh shadows obscuring edges, reflections hiding the size or the reserved badge area, cluttered background crowding the badge zone, misleading crop, plastic sheen, color shift on metal, extra gems, duplicated piece"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "matte white seamless surface, soft overhead diffused light",
          "pose": "piece laid flat beside a coin (quarter-size) with 2 cm gap, top-down orthographic angle",
          "composition": "medium_shot"
        },
        {
          "scene": "white surface, ruler edge entering from the left of frame",
          "pose": "piece resting against the ruler, diameter or length measurable from shot",
          "composition": "closeup"
        },
        {
          "scene": "clean light grey surface, generous negative space at the bottom",
          "pose": "piece centered high in frame, lower third kept clean for a spec/material/cert badge",
          "composition": "medium_shot"
        },
        {
          "scene": "white surface, shallow sidelight for gentle edge definition",
          "pose": "piece slightly angled to show depth/thickness, clean side margin for a badge",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 4. WRIST & HAND (on_model_tryon, unchanged) ────────────────────────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModel",
    "name": "Wrist & Hand",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 4,
    "rationale": "Lets a seller show real-world scale and how a ring, bracelet or watch sits on skin without booking a hand model. Repriced to ◈5 (on_model_tryon flat rate). Framing kept tight/partial to minimize finger artifact risk.",
    "meta": {
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Hands/fingers are high AI-risk. Prefer wrist-level or partial-hand crops (bracelet cuff, ring at knuckle) over full spread-finger shots. QA reviewer must confirm: correct finger count (5 per hand), no fused/floating fingers, natural knuckle joints. Reject and re-run if malformed."
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
        "reference_strategy": "on_model_tryon",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Portrait",
        "attributes": [
          "lighting:soft_window_daylight",
          "color:warm_skin_neutral",
          "texture:skin_natural_realistic",
          "context:elegant_neutral_interior"
        ],
        "extra_positive": "elegant on-model hand and wrist jewelry photography at f/2.8, soft north-facing window light with a subtle silver bounce fill, well-manicured natural hand with realistic skin texture and pores, single well-formed hand, exactly five natural fingers, anatomically correct grip, visible fingernail, fingers clearly separated and naturally curved, the jewelry piece worn correctly and rendered identical to the reference with exact proportions, color, metal finish and stones preserved, shallow rolling depth of field, refined editorial styling, neutral silk or marble surfaces in background",
        "extra_negative": "six fingers, incorrect finger count, missing fingers, fused, melted or webbed fingers, floating fingers detached from hand, claw-like or talon fingers, warped knuckle joints, two hands unless intentional, malformed wrist, plastic skin texture, oversharpened skin, distorted jewelry, wrong number of stones, duplicated piece, harsh shadows obscuring the piece"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "soft daylight by window, neutral linen background",
          "pose": "ring worn on finger, tight crop at knuckle level — fingers gently curved, only 2–3 fingers visible in clean partial-hand crop",
          "composition": "closeup"
        },
        {
          "scene": "warm interior with creamy bokeh",
          "pose": "wrist raised showing bracelet — wrist-level crop, hand softly cupped just entering frame from below",
          "composition": "closeup"
        },
        {
          "scene": "silk fabric surface, diffused light",
          "pose": "hand resting palm-down on silk, ring visible on one finger, relaxed natural pose — crop stops at mid-palm",
          "composition": "closeup"
        },
        {
          "scene": "minimal beige studio, gentle shadow",
          "pose": "wrist-level horizontal shot of bracelet or watch on wrist only — hand cropped out below frame",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 5. NECK & EAR TRY-ON (NEW, on_model_tryon — off-hand try-on) ────────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModel",
    "name": "Neck & Ear Try-On",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 5,
    "rationale": "Recovers the worn shot for the two biggest forms the hand/wrist try-on can't show: necklaces (neck/décolletage) and earrings (ear lobe — drops & hoops). Off-hand try-on is the #1 missing conversion frame for these sellers. Priced ◈5 to match the on_model_tryon canon. Framing is jaw-down / ear-level to keep identity low and artifact risk down.",
    "meta": {
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Ship scope = neck/décolletage drape + ear-LOBE drops/hoops only. Crop the face OUT by default (jaw-down for neck; ear+jaw profile for ear, no full face). DEFER to v3: bare ear studs (tiny-feature registration), cartilage/helix stacks, nose/septum/lip/navel piercing sites, hair/tiara, foot/ankle. QA must confirm: at most two ears and only when both intended in frame, no duplicated/floating earring, clasp/chain continuity on necklaces, no face distortion, natural skin. Reject and re-run if malformed."
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
        "reference_strategy": "on_model_tryon",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Portrait",
        "attributes": [
          "lighting:soft_window_daylight",
          "color:warm_skin_neutral",
          "texture:skin_natural_realistic",
          "context:elegant_neutral_interior"
        ],
        "extra_positive": "elegant on-model neck and ear jewelry photography, soft north-facing window light with a subtle silver bounce fill, well-groomed model with realistic skin texture, wardrobe: minimal neutral off-white/nude top to avoid color cast on the skin, the necklace draped naturally on the décolletage with a correctly seated clasp and an unbroken evenly-tapering chain, or the earring worn correctly on a realistic ear lobe with natural attachment, the jewelry piece rendered identical to the reference with exact proportions, metal color and stones, refined editorial styling, framing crops the face out — jaw-down for neck shots and an ear-and-jaw profile for ear shots, no eyes or full face in frame",
        "extra_negative": "full face in frame, distorted or asymmetric face, more than two ears, extra or duplicated earrings, floating earring detached from the lobe, malformed ear, broken or duplicated necklace chain, distorted clasp, melted or plastic skin, distorted jewelry, wrong number of stones, duplicated piece, harsh shadows, oversharpened skin"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "soft daylight by window, neutral top worn low",
          "pose": "necklace draped on the décolletage, jaw-down crop — face out of frame, chain and pendant sitting naturally",
          "composition": "medium_shot"
        },
        {
          "scene": "warm interior with creamy bokeh",
          "pose": "pendant resting at the sternum, close neck-level crop showing drape and clasp",
          "composition": "closeup"
        },
        {
          "scene": "soft side light, hair tucked back",
          "pose": "drop earring on the ear lobe, ear-and-jaw profile crop — only the ear region, no full face",
          "composition": "closeup"
        },
        {
          "scene": "neutral studio, gentle shadow",
          "pose": "hoop or huggie on the lobe, tight profile crop of a single ear",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 6. SET & STACK STYLIST (NEW, multi-piece coordination flat-lay) ─────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Styling",
    "name": "Set & Stack Stylist",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 6,
    "rationale": "The AOV lever: composes the uploaded piece into a coordinated multi-piece look — ring stacks, layered-necklace cascades, bangle stacks, matched parure — so stacking/layering and bridal-set sellers can sell the whole look, not one item. Flat-lay / prop-based (no anatomy) keeps it low-risk at ◈2.",
    "meta": {
      "render_notes": "Arranges MULTIPLE instances / complementary variations of the SINGLE uploaded piece into a coordinated composition (no human model — use flat-lay, velvet, ring cones, neck busts/forms as props). Identity-lock every instance to the reference. Cap piece count for believability (≈3–5 per stack). Engine must support replicating the one uploaded reference; if only literal single-piece is supported, fall back to one hero + styled complementary props."
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
        "style_preset": "Studio",
        "attributes": [
          "lighting:soft_diffused_studio",
          "color:neutral_luxe_tone",
          "texture:velvet_marble_silk_props",
          "context:coordinated_flatlay_styling"
        ],
        "extra_positive": "CRITICAL: every instance identical to the reference, locked product identity, no morph or drift across pieces, premium jewelry styling flat-lay, 100mm lens at f/8, soft diffused studio light, the uploaded piece coordinated into a curated multi-piece look — a ring stack on a velvet riser, layered necklaces cascading on a marble flat or neck form, a bangle or bracelet stack, or a matched parure laid out together — keep exact proportions, color, metal finish and stones on every piece, elegant negative space, lookbook styling mood, tasteful complementary props",
        "extra_negative": "inconsistent piece identity across instances, mismatched or warped duplicates, distorted product, cluttered overcrowded composition, too many pieces, lint or hair on velvet, dust specks, blown specular highlights, gaudy props, warped reflections, plastic sheen, missing stones, dull lifeless metal"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "velvet riser, soft key light",
          "pose": "ring stack — 3 to 5 coordinated rings nested together, hero ring to front",
          "composition": "closeup"
        },
        {
          "scene": "marble flat or neck form, diffused light",
          "pose": "layered necklaces cascading at staggered lengths, coordinated set",
          "composition": "medium_shot"
        },
        {
          "scene": "neutral surface with silk accent",
          "pose": "bangle or bracelet stack arranged in a row, shallow depth of field on the hero",
          "composition": "closeup"
        },
        {
          "scene": "linen flat-lay with minimal props",
          "pose": "full coordinated parure laid out together (e.g. necklace + earrings + ring), magazine crop",
          "composition": "full_body"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 7. LUMEN REEL (MERGE Sparkle Snap + Light Play Reel: facet OR luster) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Reel",
    "name": "Lumen Reel",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 7,
    "rationale": "Surface-adaptive sparkle/luster reel that merges the old Sparkle Snap (◈2) and Light Play Reel (◈6) — one moving-light clip that ignites facet fire on faceted pieces OR rolls luster/orient across pearls, cabochons and metal on non-faceted ones. Removes the redundant J4 pair and finally gives matte/organic goods a scroll-stopping motion clip. 2 shots = ◈4 keeps it within the cheap-reel rule.",
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
          "lighting:single_moving_facet_or_luster_light",
          "color:warm_gold_sparkle_or_soft_luster",
          "texture:facet_fire_or_pearl_orient",
          "context:dark_reflective_stage"
        ],
        "extra_positive": "CRITICAL: same product across all frames, locked identity, no morph or drift, cinematic jewelry motion reel, 100mm macro look, a single controlled light bar travels across the piece — igniting rainbow facet fire and dispersion on faceted stones, or rolling soft luster, orient and chatoyance across pearls, cabochons, jade and polished metal on non-faceted pieces — deep dark reflective stage with soft falloff, the stone luster and metal finish identical to the reference with true-to-reference metal and stone color and accurate white balance, clean macro clarity, vertical 9:16 social framing edge-to-edge with no letterbox or widescreen bars, neutral natural color free of stylized teal-and-orange grading, hypnotic luxury mood, ready-to-post vertical short",
        "extra_negative": "flickering product, warped or morphing stone, jittery motion, duplicated piece, blown specular highlights, color banding, distorted metal, fake mirror sheen on pearls, lost luster, dull lifeless reflections, plastic look, motion smearing on edges, color-grading cast, teal and orange color tint, letterbox or widescreen bars, heavy film grain, color shift on metal, inaccurate stone color"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "dark reflective stage, single moving spotlight",
          "pose": "front macro as the light bar sweeps across to ignite facets or roll luster",
          "composition": "closeup"
        },
        {
          "scene": "reflective base with soft falloff",
          "pose": "slow pull-back, full-piece glamour reveal as sparkle or luster settles",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow specular highlight / luster sweep across the surface",
          "slow pull-back dolly with sparkle or luster settling"
        ],
        "duration_per_shot": 3,
        "transition": "fade",
        "music_mood": "luxury ambient electronica, 70-85 BPM, shimmering synth pads with glassy bell plucks, sub-bass swells and soft vinyl-style textures, slow hypnotic build with restrained energy, reference FKJ x Tycho luxe-boutique ambient",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 8. JEWELRY UNBOX ASMR (3 shots = ◈6, unchanged) ────────────────────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Reel",
    "name": "Jewelry Unbox ASMR",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 8,
    "rationale": "The high-conversion gifting reel: the tactile box-open moment drives high-AOV purchases. Cut from 4→3 shots to reprice ◈8→◈6 while keeping the core narrative: closed box → reveal → hero piece. Renamed from 'Unbox ASMR Reel' to keep names globally unique (tech catalog owns that name). Hands-in-frame carries same finger AI-risk as Wrist & Hand — flag for QA.",
    "meta": {
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Shots 2–3 include hands. QA must verify: correct finger count, no fused fingers, natural knuckle joints. Prefer gloved-hand or finger-tip-only framing where possible to reduce artifact risk."
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
          "lighting:warm_soft_key",
          "color:warm_luxe_cream",
          "texture:leatherette_box_satin",
          "context:gift_unboxing_table"
        ],
        "extra_positive": "CRITICAL: same product across all frames, locked identity, no morph or drift, premium ASMR jewelry unboxing reel, 85mm macro look at f/2.8, warm soft key with practical candle-glow fill, hands with realistic skin gently opening a luxury leatherette box revealing satin lining, intimate tactile mood, the jewelry piece identical to the reference resting in the box with exact proportions, color and stones preserved, clean surfaces, aspirational gifting atmosphere, single well-formed hand, exactly five natural fingers naturally separated, anatomically correct grip, visible fingernail, natural knuckle joints, neutral true-to-life white balance with faithful metal and gemstone color, no teal-orange color cast, full vertical 9:16 framing edge to edge with no letterbox bars",
        "extra_negative": "six fingers, missing fingers, fused, melted or webbed fingers, claw-like fingers, malformed wrist, plastic skin, warped product, duplicated piece, jittery motion, distorted box geometry, harsh light, melted metal, missing stones, motion smearing, teal and orange color grading, color cast, letterbox or black bars, widescreen crop, heavy film grain, heavy vignette"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "warm-lit table, closed luxury leatherette box with ribbon, no hands yet",
          "pose": "static beauty shot of the closed box, anticipation",
          "composition": "medium_shot"
        },
        {
          "scene": "soft key light, satin-lined interior revealed",
          "pose": "fingertips only lifting the lid — tight crop shows lid edge and satin lining opening",
          "composition": "closeup"
        },
        {
          "scene": "box interior glowing, piece nested in satin cushion",
          "pose": "detail macro of the piece settled in the cushion, final hero reveal — no hands",
          "composition": "closeup"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow push-in on the closed box",
          "top-down tilt as the lid lifts, fingertips entering at the edge",
          "gentle rack focus onto the nested piece, slow zoom in"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "soft ASMR ambient, 60-75 BPM, delicate glass chimes, soft felt mallets, warm sub-pad and faint vinyl-crackle texture, low intimate energy with a gentle build, reference tactile unboxing ASMR with airy Brian Eno-style ambient warmth",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  }
];
