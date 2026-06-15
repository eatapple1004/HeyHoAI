/**
 * Doppia recipe seed — jewelry (product mode), 10 templates — v2.2.
 * 통합 스키마 v1. recipes 테이블에 INSERT.
 *
 * v2.2 changelog vs v2.1 (on-model try-on 분리·프롬프트 하드닝):
 *  - 구조적 수정: on_model_tryon은 업로드된 '단일 제품'을 4컷 전부에 합성한다. 따라서
 *      혼합형(목+귀 / 반지+손목) 템플릿은 단일 업로드 시 절반 샷이 부적합(목걸이를 귀에).
 *      → 제품유형별 4개 변형으로 분리:
 *  - "Wrist & Hand" → "Ring on Finger"(손가락 크롭) + "Wrist Wear"(손 크롭아웃, 최저위험).
 *  - "Neck & Ear Try-On" → "Necklace on Neck"(목/데콜테, 클라스프·체인 연속성) +
 *      "Earring on Ear"(단일 귓불, 레퍼런스 락·타입무관 — 4샷이 4가지 귀걸이 종류를
 *      강제해 엔진이 업로드 안 한 귀걸이를 발명하던 버그 수정).
 *  - 4종 전부 프롬프트 하드닝(초안→적대적 비평→하드닝): finger crop-conditional 규칙,
 *      금속 반사 얼굴누설 차단, 레퍼런스 restyle 방지, 3D 밴드/접촉그림자 등.
 *  - 8→10개. on_model ◈5 캐논 유지. 상세 프롬프트/QA: docs/섹션명령서/04_jewelry_tryon_업그레이드.md.
 *  - 유지(무변경): Surface Macro·Studio & Editorial·Scale & Spec Overlay·Set & Stack Stylist·Lumen Reel·Jewelry Unbox ASMR.
 *
 * 가격 사다리: I2 I2 I2 I5 I5 I5 I5 I2 · R4 R6  (◈2 진입 ✓ · 싼 릴스 ◈4 ✓ · 10개 — 6~8 권장 초과는 의도, 엔진 제품유형 라우팅 전제).
 *
 * v3 백로그(현 AI 신뢰도 미달): 얼굴/피어싱 부위 착용, 헤어/티아라, 발/발찌, 맨귀 스터드 정합, 전통 풀파뤼르 동시착용.
 */
module.exports = [
  // ─── 1. SURFACE MACRO (surface-adaptive: facet OR luster) ───────────────────
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

  // ─── 2. STUDIO & EDITORIAL ──────────────────────────────────────────────────
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

  // ─── 3. SCALE & SPEC OVERLAY (size OR spec/cert overlay) ────────────────────
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

  // ─── 4. RING ON FINGER (on_model split — finger anatomy budget) ─────────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModel",
    "name": "Ring on Finger",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 4,
    "rationale": "Focused single-ring try-on — all 4 shots are knuckle-level partial-hand crops so the whole anatomy budget defends finger count/joints and ring fit. Split from Wrist & Hand because on_model_tryon composites ONE uploaded piece into every shot.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "QA priority order: (1) on_model_tryon FIT — confirm the band hugs the finger with proportional diameter, neither sliding loose nor biting into bulging skin, and sits just BELOW the knuckle, not on top of it. (2) CLOSED LOOP — band reads as one continuous outer surface; reject any C-shape, seam, visible inner edge, or single band that splits into two stacked rings/grooves. (3) JOINT COUNT — on the bent-finger shot (shot 2) verify exactly one bend at one knuckle, normal phalange count, no reverse-bend or added segment. (4) EDGE FINGERS — verify exact per-shot count (2/2/3/1 full finger) with NO sliced, stub, or blur-fading finger at any boundary; the macro shot keeps its finger fully complete in frame. (5) STONE — oriented upward, facing camera as in reference, prongs on skin, not rotated or sunk. (6) SET CONSISTENCY — same worn finger, same hand identity, skin tone and lighting across all four; reject if it looks like different hands. (7) NAILS — flat/gently convex, growing straight forward, no sideways/spoon/curl-over. (8) No thumb in any frame. Reference lock: stone count, cut, metal color and proportions must match the seller's single uploaded piece exactly. Flag for human review on any borderline joint or band-closure call."
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
          "context:single_finger_crop"
        ],
        "extra_positive": "elegant on-model ring photography, the same single ring worn correctly on one consistent finger in every shot with consistent hand identity, skin tone, hand size and lighting throughout the set, well-manicured natural hand with realistic fine skin texture, soft pores and subtle knuckle creases, fingers clearly separated with real air gaps visible between them, each finger individually shaped with a natural firm taper to a clean rounded fingertip, anatomically correct joints with exactly the normal number of phalanges, when a finger bends it bends at a single knuckle only with all other joints relaxed and straight, one neatly shaped fingernail per visible finger with a flat to gently convex surface growing straight forward along the finger and ending cleanly at the fingertip with a natural nail bed and cuticle, the thumb relaxed and kept out of frame, the ring band sized to fit this finger snugly and naturally with its diameter proportional to the finger and resting just below the knuckle, the band a fully closed continuous loop encircling the finger with only its outer surface visible and no inner edge, seam or open end showing, the metal meeting the skin convincingly with a soft natural contact shadow and the skin gently compressing where the band sits, the stone and setting oriented exactly as in the reference and facing upward toward the camera with prongs resting cleanly on the skin, soft north-facing window light with a subtle silver bounce fill, refined editorial styling on neutral silk or marble surfaces, the jewelry piece rendered identical to the reference in proportions, metal color and finish, and stone count, cut and setting",
        "extra_negative": "six fingers, four fingers on one hand, incorrect finger count, extra knuckle segments, extra phalange, finger with too many or too few joints, missing fingertip, half-rendered sliced or cut-off finger at the frame edge, finger fading or blending into the background or into blur, stub or amputated finger, floating finger detached from the hand, bent-backwards or reverse-bend finger, finger bending at more than one joint, claw or talon fingers, hooked or rubbery boneless fingers, warped doubled or dislocated knuckle joints, sausage or plump rubbery fingers, uneven finger thickness, fused melted webbed or merged fingers, fingers blending into each other with no gap, second hand or stray fingers entering frame, thumb in frame, extra thumb, thumb bending unnaturally, two different hands, left and right hand mixed, missing fingernail, double fingernail, nail on the wrong place, nail pointing sideways or backward, concave spoon-shaped or curled-over nail wrapping around the fingertip, nail growing into the skin, ring sliding off or hanging loose, oversized band too large for the finger, ring too tight biting into the finger with skin bulging over the band, open-ended or C-shaped band, gap in the band, unclosed ring, inside of the band visible where the outer surface should be, band showing its inner edge or a seam, single band rendered as two stacked bands or doubled grooves, doubled or duplicated ring, ring on two fingers at once, ring duplicated on a neighboring finger, ring floating above the skin, gap between band and skin, band passing through or clipping into the finger, ring resting on top of the knuckle joint, distorted or warped band, stone rotated tilted off-axis or facing the wrong way, setting or prongs clipping into the skin, gem sinking into the finger, wrong stone count, extra or missing gems, metal color shift, plastic waxy oversharpened or over-smoothed skin, smeared knuckle creases, harsh shadows obscuring the ring"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "soft north-facing window light, neutral silk surface, creamy shallow background",
          "pose": "the ring-bearing finger relaxed and nearly straight, angled slightly toward camera with the stone facing up, ring resting just below the knuckle, exactly two fingers fully in frame and clearly separated by an air gap, no partial third finger at any edge, thumb out of frame",
          "composition": "closeup"
        },
        {
          "scene": "neutral marble surface, diffused even light, soft silver bounce fill",
          "pose": "the ring finger with a single gentle bend at one knuckle only and all other joints straight, viewed at a slight three-quarter angle so the closed outer band is fully visible wrapping the finger, exactly two adjacent fingers in frame with a clear gap, fingertips and one nail each visible, thumb excluded",
          "composition": "closeup"
        },
        {
          "scene": "warm beige studio backdrop, gentle directional light, creamy bokeh",
          "pose": "exactly three fingers loosely fanned and clearly separated, the ring on the same single middle finger as the other shots, each finger fully resolved with one flat forward-growing nail, all fingers anatomically complete, no fourth or partial finger and no thumb entering frame",
          "composition": "closeup"
        },
        {
          "scene": "minimal neutral linen backdrop, soft grazing light to model the band",
          "pose": "near-macro of just the ring on the same single relaxed finger viewed slightly from the front, band-to-skin contact shadow and one knuckle crease visible, the closed outer band and the upward-facing stone clearly readable, the whole finger anatomically complete within frame with no edge finger and no thumb",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 5. WRIST WEAR (on_model split — hand cropped out, lowest risk) ─────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModel",
    "name": "Wrist Wear",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 5,
    "rationale": "Bracelet, cuff or watch on the wrist with the hand cropped OUT of frame — the lowest-risk on-model template (no fingers to malform). Split from Wrist & Hand.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "QA every render against the seller's reference before approval. PIECE-TYPE LOCK: if the reference is NOT a watch, reject any rendered dial, numerals, hands or subdials; never approve an added/converted watch. SINGLE-PIECE LOCK: count pieces — reject any extra bangle/stack beyond the one reference piece; verify link pattern, charm count and stone count match exactly. CROP: confirm the crop sits at mid-forearm and NO hand anatomy (fingertip, nail, thumb-web, thenar bulge, palm) leaks at the bottom, top, or side edges; the lower third should read as empty background. CONSISTENCY: all four shots must show one left wrist, same skin tone and hair density; reject mixed left/right wrists or a clearly different arm across the set. CONTACT: band should rest with a soft contact shadow — reject skin bulging/pinching over the band, band sinking into flesh, or a floating band. CLASP: single clasp on the underside; reject duplicated or front-facing clasp. OCCLUSION: only the front strap face should show; reject a fabricated/teleporting back-of-strap. BACKGROUND: reject any blurred finger/limb ghosts in the bokeh. Flag borderline crops for human review rather than auto-approving."
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
          "context:wrist_only_crop"
        ],
        "extra_positive": "elegant on-model wrist jewelry photography at f/2.8, soft north-facing window light with a subtle silver bounce fill, one consistent adult forearm shared identically across all four images — same person, same neutral medium skin tone, same minimal fine vellus hair, the LEFT wrist throughout, realistic living skin with fine pores, faint wrist creases, soft natural tendon and a gentle ulnar styloid bump, believable subsurface warmth and an even skin-tone gradient, framing isolated to the mid-forearm and wrist with a generous empty margin below the piece so the crop line falls at MID-FOREARM well above the wrist and the entire hand — fingers, thumb, knuckles, palm and nails — stays completely outside the frame, the lower third of the frame is clean empty background, the seller's piece rendered EXACTLY as the reference with identical piece type, proportions, link pattern, charm count, stone count, metal color and finish — the single reference piece only, no added bracelets, do not invent or convert to a watch and no watch dial appears unless the reference itself is a watch, the band rests lightly around the wrist with a soft contact shadow and the skin undisturbed and uncompressed, an even consistent gap, the single clasp seated on the underside of the wrist, only the front-facing portion of any strap or chain shown with the rear naturally out of view behind the wrist, shallow rolling depth of field with the piece tack sharp, refined editorial styling, plain unblurred neutral silk, linen or marble surface in a soft clean background",
        "extra_negative": "any visible fingers, thumb, hand, palm, knuckles or fingernails in frame, fingertips or nails intruding at the bottom edge, thumb base, thenar eminence or palm-muscle bulge entering the lower frame, hand or fingers appearing at the top frame edge, second hand, second forearm or arm, two wrists, mirrored or duplicated forearm in the background bokeh, blurred ghost fingers or limb shapes in the background, malformed boneless or rubbery wrist, broken dislocated or unnaturally bent wrist joint, extra or missing forearm, elbow crease mistaken for wrist, fused or merged arm and band, skin growing over or absorbing the band, skin bulging or pinching over the band edge, band sinking or indenting into the skin, floating band hovering off the wrist, inconsistent gap around the wrist, doubled or duplicated clasp, clasp on the front face of the wrist, broken discontinuous or teleporting strap or chain, strap reappearing at wrong width or angle on the far side, twisted or kinked band, extra bangle or multiplied bracelet, more pieces than the reference, watch dial, watch face numerals, watch hands, subdials or date window invented when the reference has no watch, piece type changed from the reference, distorted or duplicated piece, wrong link pattern, wrong charm or stone count, melted smeared or color-shifted metal, plastic waxy oversharpened or airbrushed skin, smooth featureless mannequin arm, veins as raised wormlike ridges, skin blotches or mottled discoloration mistaken for stones, harsh shadows obscuring the piece"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "soft daylight by a window, plain neutral linen background, clean soft focus",
          "pose": "left forearm raised vertically with the wrist near frame center, bracelet or cuff sitting naturally around the wrist with a soft contact shadow, forearm tapering upward with the ELBOW direction exiting the top of frame, crop line at mid-forearm so the wrist is the lowest visible point and the hand stays fully out of frame below",
          "composition": "closeup"
        },
        {
          "scene": "minimal beige studio, gentle directional shadow, plain surface",
          "pose": "horizontal mid-forearm view, left forearm running across the frame and exiting cleanly off the side edge with margin, the piece on the dorsal wrist, only the front face of any strap shown and the rear naturally hidden behind the wrist, hand cropped fully off the side beyond the frame",
          "composition": "medium_shot"
        },
        {
          "scene": "plain neutral silk surface, soft diffused overhead light",
          "pose": "left forearm laid on its side along the silk with the wrist as the lowest visible point, bracelet draping naturally to the lower curve of the wrist resting lightly with the skin undisturbed, crop at mid-forearm with empty silk filling the lower third and the hand entirely out of frame",
          "composition": "closeup"
        },
        {
          "scene": "warm interior with a plain marble ledge, shallow depth of field",
          "pose": "left forearm laid along a marble ledge with the wrist as the lowest visible point and everything below mid-forearm out of frame, the single reference piece catching window light on the wrist, gentle three-quarter wrist view, no fingers or hand on the ledge",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 6. NECKLACE ON NECK (on_model split — clasp/chain continuity) ──────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModel",
    "name": "Necklace on Neck",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 6,
    "rationale": "Necklace or pendant on the neck/décolletage, jaw-down, no face — the whole budget defends clasp seating and unbroken evenly-tapering chain continuity. Split from Neck & Ear.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "Top anatomy-risk template — reject and re-roll on any failure. Verify: (1) exactly ONE chain, no layered/second/choker strand; (2) continuous even-gauge chain, no break/gap/duplication/gauge-drift, none fused into fabric or skin; (3) NO visible clasp or hardware on front shots (1,2,4) — clasp appears only on Shot 3 at the nape; (4) centerpiece matches the reference exactly in count/type/topology — a plain reference chain must have NO added pendant/bail/charm, and no added jump-ring at macro on Shot 2; (5) metal hue unchanged vs reference (no silver/cool/rose/white shift from fill light); (6) neck anatomy clean — single normal-length neck, two symmetric clavicles, one sternum, no skin fold reading as a chain; (7) one consistent skin tone neck-to-chest, no pasted-neck seam; (8) NO face, lips, eyes, or reflected face (matte props only) on any shot; (9) Shot 3 shows nape only — no ear, jaw, or cheek; (10) on Shot 4 the pendant hangs vertical by gravity, on skin, not clipping the breast/arm. Flag for human review."
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
          "context:decolletage_no_face"
        ],
        "extra_positive": "elegant on-model necklace try-on photography, 85mm at f/4 with soft rolling depth of field, soft north-window daylight from frame-left with a neutral-to-warm bounce fill (never a cool silver fill) so the reference metal hue is preserved exactly — warm yellow gold stays warm gold, white metal stays neutral; well-groomed model, realistic poreful skin; anatomy lock: a single natural neck contour of normal length, two symmetric collarbones, one smooth sternum, skin folds and shadows must never read as chain links; chest, neck and jaw share one consistent skin tone, texture and age with no seam between regions; wardrobe: a minimal scoop or off-shoulder neutral off-white/nude top worn low and entirely clear of the chain, hair pulled back off the décolletage; reference lock: render the necklace IDENTICAL to the seller's reference — exact link style, gauge, metal color, finish, stone count and centerpiece topology; reproduce the reference exactly — if it is a plain chain show only the chain with NO added pendant/charm/bail, if it has a fixed pendant or stations show that piece exactly, never add, remove, relocate or re-thread a centerpiece; chain rendering: ONE continuous unbroken strand of even uniform link gauge from end to end, no thickening or thinning, forming a smooth symmetric drape that rests flush on bare skin with soft natural contact-shadow; the clasp sits hidden at the nape — front and décolletage views show ONLY continuous chain with no visible clasp, hardware or jump-ring; the full chain (and centerpiece if present) sits entirely on bare skin above the neckline with visible skin all around it, no part passing under, behind or into fabric; any pendant hangs vertically toward the ground by gravity regardless of torso rotation, resting on skin; matte non-reflective background and props (no mirrors/glossy surfaces); refined editorial styling, calm neutral interior; framing crops the face out — jaw-down at most, no chin past the tip, no mouth, no lips, no eyes, no full face",
        "extra_negative": "full face, mouth, lips, eyes, jaw-up crop, swan neck, unnaturally long throat, twisted or doubled neck contour, neck wider than head, asymmetric or uneven collarbones, third clavicle line, doubled sternum groove, skin fold or crease read as a chain, mismatched skin tone between neck and chest, pasted-on neck seam, plastic mannequin chest, melted or waxy or oversharpened skin, reflected face, eyes or face in a mirror or glossy surface, necklace or face reflection, layered necklace, second necklace, choker, extra shorter chain above the main chain, stacked necklaces, broken chain, severed or interrupted chain, gap in the chain, chain discontinuity, frayed chain end, duplicated or doubled or ghosted chain, parallel phantom strand, chain splitting into two, tangled knotted twisted kinked chain, chain gauge drift, inconsistent link size, warped melted fused links, twisted flat links, link orientation flip, chain printed flat on skin, hair strand mistaken for a chain, stray hair crossing or merging the chain, chain disappearing behind or fusing into the neckline fabric, chain cut off by the garment edge, chain floating off the skin, chain clipping into or sinking through skin, chain merging into the collarbone, visible clasp at the front, clasp on the collarbone, front-facing hardware or jump-ring, missing or distorted or open or duplicated clasp, two clasps, spurious pendant on a plain chain, invented charm, added bail or jump-ring, floating or detached or duplicated or extra pendant, pendant not threaded on the chain, pendant tilted or sideways against gravity, pendant clipping into breast or cleavage, pendant occluded by the arm, pendant on fabric instead of skin, pendant fused to skin, wrong stone count, doubled stones, extra prongs, changed stone shape or color, reflection-doubled stone, metal tint shift toward silver, gold turning white or rose, cooled or desaturated metal cast, distorted jewelry, earlobe or back of ear in frame, harsh shadows obscuring the chain"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "soft north-window daylight from frame-left, neutral-to-warm bounce fill, matte off-white interior, neutral scoop top worn low and fully clear of the neckline, hair pulled back off the décolletage",
          "pose": "chest-and-throat crop kept below the chin (face fully out, no lip risk), upright relaxed posture, complete necklace drape visible from both shoulders to the centerpiece, ONE continuous unbroken chain of even gauge resting flush on bare skin, no front clasp or hardware, render exactly the reference centerpiece topology (plain chain shows no pendant)",
          "composition": "medium_shot"
        },
        {
          "scene": "matte warm interior with soft non-reflective bokeh, gentle frame-left key light",
          "pose": "tight macro crop on the centerpiece seated at the sternum on bare skin, reproduce the reference piece exactly with correct stone count and setting and no added bail or jump-ring, hanging plumb vertical with even chain tension on both sides, continuous even chain entering and leaving frame",
          "composition": "closeup"
        },
        {
          "scene": "soft daylight, matte plain background, hair gathered up and away to expose only the nape",
          "pose": "pure nape patch from hairline-down to upper back, no ear and no jaw and no cheek in frame, the closed clasp seated at the nape with both chain ends joining cleanly at one hardware point and even link gauge running away down both sides",
          "composition": "closeup"
        },
        {
          "scene": "neutral matte studio, soft top light with low neutral-to-warm fill, gentle natural contact-shadow",
          "pose": "gentle three-quarter turn of the décolletage (small turn angle), jaw-down face out, chain following the clavicle line on bare skin, any centerpiece hanging vertically toward the ground on visible sternum skin, not pinched by the arm or shoulder, single continuous even chain, no front clasp",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 7. EARRING ON EAR (on_model split — single ear, reference-locked) ──────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModel",
    "name": "Earring on Ear",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 7,
    "rationale": "One earring on a single ear lobe, strict side profile, no face. Reference-locked and type-agnostic — fixes the old bug where 4 shots prescribed 4 different earring families and made the engine invent earrings the seller never uploaded. Split from Neck & Ear.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "All four shots render the SINGLE uploaded reference earring on ONE ear — no shot may invent a different earring family (no forcing a stud to 'hang' or a drop to 'encircle'); poses change camera angle only, the piece is constant. Identity safety is hard: crop just in front of the tragus, zero facial features. Every render is closeup (no medium_shot) to suppress second-ear and face leakage; Shot 4's rear-profile is the top regression risk — verify the far ear and all face parts stay out of frame and that no matching earring appears on a second ear. Reference fidelity (metal color, stone count/cut, setting, silhouette) outranks skin micro-texture; reject any stray sparkle on skin. Flags: experimental + needs_human_review — every batch needs a human pass for second-ear, second-piercing and earring-identity drift before it ships."
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
          "context:single_ear_profile"
        ],
        "extra_positive": "elegant on-model single-ear earring try-on, f/2.8–f/4, soft north-window light raking from frame-front with a faint silver bounce fill modeling the lobe; ONE well-groomed model in pure side or rear-profile; hair pulled fully back as one smooth clean mass with zero loose strands crossing the ear or lobe; only ONE ear exists in this image — the rest of the head, the opposite side and the second ear are entirely outside the frame; crop is an ear-and-jaw profile with the frame cutting vertically just in front of the tragus so no facial feature appears — no eye, eyebrow, nose, lips or full face; exactly ONE anatomically correct human ear (natural helix, antihelix, tragus, one soft fleshy lobe) with true skin and a clean lobe-to-jaw transition; exactly ONE earring — the SAME earpiece as the uploaded reference, its type, shape, length, silhouette, metal color and finish, stone count, cut and setting taken EXACTLY from the reference, never substituted for a different style; the earring seated on the soft fleshy LOWER lobe (never on the upper cartilage or helix), worn through ONE clean pierced hole via a pierced post or hook, no clip-on mechanism, backing implied behind the lobe and not visible from the front, with a single soft contact shadow and slight skin compression only at that piercing point; any hanging element falls perfectly vertical to true gravity, hanging free in air clear of the jaw and neck; gemstone count/cut/color and metal finish match the reference and take priority over skin micro-texture; no sparkle or gems anywhere except on the earring itself; shallow depth of field, neutral off-white or soft-grey background, calm luxury catalog mood, true neutral white balance with faithful metal and gemstone color",
        "extra_negative": "two ears, second ear visible, far ear behind the head, blurred ear behind hair, matching earring added to the other ear, more than one earring, duplicated mirrored or repeated earpiece, second earring floating in empty space, reflected or ghost earring in the bounce, earring substituted for a different style than the reference, morphed earpiece drifting from reference, color shift on metal, wrong number of stones, added or missing gems, warped stone or setting, stray sparkles or gems scattered on the skin, gems embedded in the lobe; earring on the helix or upper cartilage instead of the lobe, earring on cheek jaw or hair, floating earring with no attachment point, post passing through empty air, tilted post protruding out the front of the lobe; extra piercing on the helix, cartilage stud, second lobe hole, multiple piercing holes, stacked or multiple earrings on one ear; clip-on backing or butterfly earnut visible in front of the lobe, backing clamping the lobe; broken open doubled or self-intersecting hoop, figure-eight hoop, hoop through two holes, hoop floating in front of the lobe; kinked drop chain, drop resting on the jaw, dangle fused to the neck or skin; malformed deformed or fused lobe, two lobes, missing lobe, webbed skin between lobe and jaw or neck, ear merging into jaw, stretched lobe, plug, gauge, torn lobe; eye eyebrow eyelash nose-tip cheekbone or lips in frame, full face, distorted or asymmetric face; second person, background model, mannequin head, reflected face; melted plastic or waxy oversharpened skin, harsh shadows obscuring the earring, blown specular highlights on metal"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "soft north-window daylight, hair pulled fully back, neutral off-white background, single soft contact shadow at the piercing",
          "pose": "clean left-side profile, the reference earring worn on the one soft lower lobe through a single pierced hole, backing behind the lobe, ear-and-jaw crop cutting just in front of the tragus — no facial feature in frame",
          "composition": "closeup"
        },
        {
          "scene": "warm interior with creamy neutral bokeh, gentle silver bounce fill, no reflected duplicate",
          "pose": "the SAME reference earring on the one lobe seen slightly more frontal to read its full silhouette; any hanging element falls perfectly vertical clear of the jaw and neck; tight single-ear profile, only one ear in frame",
          "composition": "closeup"
        },
        {
          "scene": "neutral studio, soft directional side light, faithful metal and gemstone color",
          "pose": "the reference earring on the one lobe with its setting, stone count and attachment clearly legible; pierced post/hook through one hole, upper cartilage and helix left bare with no second piercing; tight single-ear crop",
          "composition": "closeup"
        },
        {
          "scene": "soft daylight, straight rear-profile with hair off the shoulder, opposite side of the head fully out of frame",
          "pose": "the same reference earring on the one lobe seen from directly behind the ear showing the natural lobe attachment and backing implied behind; jaw-down-and-back crop, far ear and all facial features outside the frame",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 8. SET & STACK STYLIST (coordinated multi-piece flat-lay) ──────────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Styling",
    "name": "Set & Stack Stylist",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 8,
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

  // ─── 9. LUMEN REEL (surface-adaptive sparkle/luster, merged) ────────────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Reel",
    "name": "Lumen Reel",
    "output_type": "reel",
    "credit_cost": 4,
    "sort_order": 9,
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

  // ─── 10. JEWELRY UNBOX ASMR (gift unboxing reel) ────────────────────────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "Reel",
    "name": "Jewelry Unbox ASMR",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 10,
    "rationale": "The high-conversion gifting reel: the tactile box-open moment drives high-AOV purchases. Cut from 4→3 shots to reprice ◈8→◈6 while keeping the core narrative: closed box → reveal → hero piece. Renamed from 'Unbox ASMR Reel' to keep names globally unique (tech catalog owns that name). Hands-in-frame carries same finger AI-risk as Wrist & Hand — flag for QA.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
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
  },

  // ─── 11. RING EDITORIAL CAMPAIGN (on_model editorial tier) ───────────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Ring Editorial Campaign",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 11,
    "rationale": "Editorial/campaign-tier on-model try-on (Hermès aesthetic) — the seller's piece worn in a styled, art-directed scene with luxe wardrobe, mood lighting and an elegant pose, the face kept identity-safe (jaw-down/turned/soft). The aspirational counterpart to the clean PDP-crop try-on.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "Generate as a 4:5 vertical image_set; treat the four shots as ONE coherent campaign with a single wearer, not four independent renders. Through-line is warm neutrals plus a single black (frame 1 black silk / frame 2 oat cashmere / frame 3 cream silk / frame 4 bare shoulder on warm seamless). Each frame carries a SIGNATURE light (1 hard warm edge / 2 soft north-window / 3 golden-hour pool / 4 crisp specular kicker) so the set reads campaign, not catalog. Keep all four compositions TIGHT (closeup/medium_shot only) — never pull back; the moment more body appears, the head re-enters and anatomy/identity risk spikes. The reference ring is the only specular event in every frame: skin and fabric stay matte. This tier is experimental and needs_human_review — do not auto-publish. Review every frame against the qaChecklist before approval; reject and re-roll any frame that fails a reference-lock, second-hand, bare-wrist, or face-crop check rather than retouching, since those failures usually co-occur with subtler anatomy drift."
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
          "lighting:warm_directional_editorial",
          "color:editorial_warm_neutral_range",
          "texture:skin_silk_cashmere_blazer",
          "context:campaign_hand_hero"
        ],
        "extra_positive": "Hermès-grade fine-jewelry campaign editorial, photoreal. REFERENCE LOCK first: the seller's ONE uploaded ring is composited onto the model and kept IDENTICAL to the reference — same metal color and finish, same band width and proportions, same stone count, cut, setting and orientation; never restyle, recolor, resize, duplicate or invent the piece. Exactly ONE ring on exactly one finger; the band wraps fully around the finger and sits flush in contact with the skin, never floating, hovering, gapped or clipping; the stone and setting render exactly as the reference with no added sparkle, halo or extra facets — the only specular highlight is the true reflection off the reference metal and stone. FACE MANAGED by construction in every frame: cropped at the jaw, turned away over the shoulder, or dropped into soft defocus and shadow above the jaw — never a sharp frontal identity face, never eyes to camera; the face is simply not the subject. CONSISTENT WEARER across all four shots: the SAME single hand wears the ring on the SAME single finger (the ring finger), with the SAME manicure (short bare or sheer-nude buffed nails, no bright polish, no long or acrylic tips), identical luminous skin tone and minimal warm makeup, identical relaxed softly-fanned fingers with no tension or claw shape; only ONE hand is ever visible in any frame and the opposite arm stays entirely out of frame; both wrists completely bare except for the one reference ring. The look: warm directional light, generous art-directed negative space, rule-of-thirds with the ring on a power point, shallow depth of field with the ring tack-sharp, the ring the only specular hero of an aspirational calm luxury frame. Hand anatomy correct wherever shown: exactly five fingers, natural separated joints, realistic nails.",
        "extra_negative": "second ring, multiple rings, rings on other fingers, duplicated ring, mismatched ring, restyled or recolored metal, wrong metal finish, altered band width, changed or extra gemstones, wrong stone cut or setting, invented jewelry, added gemstone halo, extra stones, sparkle burst, glowing stone, lens flare on stone, cartoon sparkle, invented facets, second setting, floating ring, ring hovering above finger, ring not touching finger, gap between ring and skin, ring clipping through finger, ring on two fingers, ring sliding off, ring around the wrong finger, ring on thumb, finger merging into ring, second hand, two hands, both hands visible, second arm, other hand in frame, duplicate hand, mirrored hand, added bracelet, added watch, wristwatch, smartwatch, watch face, watch strap, watch band, bangle, cuff, bracelet stack, anklet, any jewelry on the wrist, deformed hand, malformed fingers, six fingers, seven fingers, extra fingers, too many fingers, missing finger, extra thumb, double thumb, fused fingers, merged fingers, webbed fingers, floating disconnected fingers, double knuckle, bent-backward finger, broken or unnatural joints, twisted wrist, mangled nails, long acrylic nails, bright nail polish, gripping or claw-like hand, stiff flat display hand, sharp frontal identity face, full face in frame, full head in frame, sharp head, eyes to camera, direct gaze, eyes visible, eyebrow, lips, mouth, nose, cheek, chin in sharp focus, partial face, profile facial features, recognizable detailed face, recognizable person, flat shadowless clinical lighting, harsh on-camera flash, blown-out highlights, plastic waxy skin, oversaturated garish color, cluttered busy background, dead-center specimen composition, low resolution, blurry ring, out-of-focus jewelry, jpeg artifacts, oversharpening halos, extra limbs, disfigured"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Evening-luxe nighttime set — a bared luminous shoulder above a draped black silk slip, fabric and skin kept matte, deep near-black negative space filling the upper-right two-thirds of the frame. ONE hard warm tungsten edge-light rakes low from frame-left across the shoulder and the ring, dramatic chiaroscuro falloff into the black.",
          "pose": "Hand drawn gracefully up to rest against the SAME-side collarbone and bared shoulder, hand entering low from frame-left; the ringed finger rolled slightly toward the key light so the metal catches one clean specular and the stone reads true, fingers long, separated, relaxed, no tension. The opposite arm is fully out of frame; only this one hand is visible — exactly five fingers, the reference ring on the ring finger only, no ring on any other finger, no second hand in frame. Face cropped clean at the jaw, neck-down, no full face, no eyes to camera.",
          "composition": "closeup"
        },
        {
          "scene": "North-window daylight — soft cool-leaning directional light from a large window camera-left with a faint cool fill, oat cashmere knit with the bare collarbone above, calm premium set, generous negative space held empty on the right.",
          "pose": "Knuckles cradling the jawline in profile, the reference ring nearest the camera and catching a soft window catch-light; wrist soft and natural, fingers gently curled with no claw shape. Head turned in profile and dropped into soft defocus above the jaw — identity-safe, no eyes to camera, no facial features in sharp focus. The other arm is fully out of frame; only this one hand is visible — exactly five fingers, the reference ring on the ring finger only, no ring on any other finger, no second hand in frame.",
          "composition": "closeup"
        },
        {
          "scene": "Warm low golden-hour pool — cream silk lapel slipped softly over a bare collarbone, long warm shadows and a refined warm palette, intentional negative space upper-left, shallow depth of field. Hand enters from frame-right, lower-left two-thirds held in soft shadow.",
          "pose": "Relaxed hand laid FLAT and at rest against the cream silk lapel, fingers softly fanned with no tension; the ringed finger rolled slightly toward the warm key so the setting catches a single edge-light and reads in full — not lifted or clawed. Head turned away over the shoulder, face out of frame above the jaw. The opposite arm is fully out of frame; only this one hand is visible — exactly five fingers, the reference ring on the ring finger only, no ring on any other finger, no second hand in frame.",
          "composition": "medium_shot"
        },
        {
          "scene": "Graphic high-fashion minimalism — a bare shoulder and forearm against a warm seamless backdrop, two-thirds of the frame intentional negative space upper-right. One crisp directional beam from upper-left skims the hand with a bright specular kicker on the metal only, faint warm bounce keeping skin luminous; the wrist is bare.",
          "pose": "Forearm rising on a clean diagonal from frame-left, fingers softly fanned away from a softly-defocused chin, wrist softly broken and completely bare (no watch, no bracelet); the ringed finger sitting highest and most forward — anatomically natural in this raised pose — to catch one crisp specular glint and a single true stone reflection. Chin and everything above dropped into soft focus and shadow, no sharp identity face, no eyes to camera. The other arm is fully out of frame; only this one hand is visible — exactly five fingers, the reference ring on the ring finger only, no ring on any other finger, no second hand in frame.",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 12. BRACELET EDITORIAL CAMPAIGN (on_model editorial tier) ───────
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Bracelet Editorial Campaign",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 12,
    "rationale": "Editorial/campaign-tier on-model try-on (Hermès aesthetic) — the seller's piece worn in a styled, art-directed scene with luxe wardrobe, mood lighting and an elegant pose, the face kept identity-safe (jaw-down/turned/soft). The aspirational counterpart to the clean PDP-crop try-on.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "experimental + needs_human_review — do NOT auto-release; a human must clear every box below on all 4 shots before delivery. SAFETY_NEGATIVE already covers text/logo/watermark, so none of the negative budget is spent there — it is spent on the second-hand, restyle, metal-recolor, contact, and face-crop locks. Highest residual risks at this exposure level: (1) the supporting hand at the shoulder/collarbone in shots 1 and 4 — inspect for a duplicated bracelet, an invented watch/ring, or a fused/malformed second hand; reject if present. (2) Cross-shot drift — confirm the SAME wrist wears the piece in all four, and that skin tone, wrist size, and nail length/finish do not change shot-to-shot. (3) Restyle under magnification — shot 4 is a closeup, the most likely place the engine hallucinates extra facets or \"cleans up\" the setting; compare stone count and setting against the reference pixel-for-pixel. (4) Metal recolor — the warm golden key in shots 1 and 4 can cast gold onto a silver/white-metal reference; verify the base metal hue still matches the reference, warm highlight only. (5) Face leak in the wider medium shots (1-3) — face management is now AND not OR (crop FIRST, then turned + soft); reject any sharp or frontal face even with averted eyes. Regenerate per-shot rather than the whole set when only one shot fails, to preserve wearer consistency on the passing shots."
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
          "lighting:warm_directional_editorial",
          "color:editorial_warm_neutral_range",
          "texture:skin_silk_cashmere_blazer",
          "context:campaign_wrist_hero"
        ],
        "extra_positive": "Hermès-grade luxury jewelry campaign: editorial on-model try-on of ONE bracelet worn on a SINGLE wrist, composited from the seller's one uploaded reference. REFERENCE-LOCK (highest priority): render the bracelet EXACTLY as in the reference — same metal color and finish, same form and silhouette WHATEVER its type (chain, flexible band, tennis line, bangle, or cuff), same width, drape and link structure, same stone count, cut, and setting. Preserve the reference's flexibility: if it is a chain or soft band it drapes and conforms to the wrist; do not convert it into a rigid cuff or bangle, and do not stiffen, recolor, resize, complete, idealize, or invent any part of it. The bracelet reads clearly because the directional light finds it, NOT because the wrist is angled or presented toward the lens — it is caught incidentally inside a real human gesture, never posed to camera. METAL + STONE LOCK: match the reference metal temperature exactly — if silver, white-gold or platinum keep it cool-neutral; if yellow or rose gold keep its precise tone; the warm key may lay a warm highlight on the surface but must NOT recolor the metal. Keep every stone legible with controlled highlights, full original stone count visible, never blown out into glare. CONTACT LOCK: the bracelet rests flush against the wrist, band conforming to the arm in solid contact at the natural break of the wrist bone, casting a soft contact shadow with believable weight — no floating, no gap, no hover, no fabric or skin passing through the metal. SINGLE-PIECE + SECOND-ARM LOCK: exactly ONE bracelet on ONE wrist, worn on the SAME wrist in all four shots (never switched arms); the worn hand carries no second bracelet, no watch, no ring. If a supporting arm or hand enters frame it is entirely BARE — no bracelet, watch, ring, or any jewelry — and it shows exactly five correct, individually visible fingers or is cropped out cleanly; never a half-hidden fused supporting hand. WEARER LOCK: one identical wearer across all four shots — same warm skin tone, same wrist size, same smooth unmarked forearm, same short sheer-nude manicure of equal nail length; no shot-to-shot drift in skin, nails, or body. FACE SAFETY BY CROP FIRST: the frame cuts at or below the jawline so the upper face is OUT of frame; any remaining face fragment is turned away AND soft/out of the focal plane on the shadow side of the falloff — never a sharp face, never frontal, never both eyes in frame, no eyes to camera. ANATOMY: hands relaxed with fingers gently apart and individually countable, exactly five distinct fingers with natural joints and proportions, wrist naturally broken not stiff. CAMPAIGN CRAFT: warm restrained expensive mood photographed on medium format with a fast prime, shallow focus keeping the bracelet tack-sharp while shoulder and set dissolve; one warm palette family MODULATED across the set (evening gold, cool diffuse north-window daylight, neutral warm-bone) so the four-up has tonal range; editorial wardrobe — black silk evening top with bare shoulder, blush tailored blazer off the shoulder over bare décolletage, warm-bone draped silk against a styled sculptural shoulder; negative space carries material quality — a soft tonal gradient, a falling shadow edge, or a blurred fold of wardrobe fabric, never a flat dead cutout void; metal as the brightest most resolved point so the eye lands on it; luminous low-contrast highlights, rich shadow falloff, fine skin texture, $40k campaign finish, true-to-reference jewelry.",
        "extra_negative": "second bracelet, two bracelets, multiple bracelets, stacked bracelets, duplicated cuff on other arm, mirrored bracelet, bracelet on the supporting hand, jewelry on the second hand, watch on either wrist, added wristwatch, rings on the bracelet hand, necklace competing in frame, earrings, extra invented jewelry, restyled bracelet, reinterpreted bracelet, recolored metal, gold cast on silver, warm tint recoloring metal, metal hue shift, changed metal finish, rigid cuff from a chain reference, stiffened flexible band, converted bangle, altered stones, wrong stone count, reduced stone count, added gemstones, missing stones, lost stones in glare, blown specular hiding stones, hallucinated facets, invented setting detail, completed pattern, idealized jewelry, cleaned-up setting, resized bracelet, distorted bracelet shape, floating bracelet, gap between bracelet and wrist, bracelet clipping into skin, band merged with fabric, band passing through wrist, hovering jewelry, detached bracelet, bracelet not on wrist, two wrists wearing it, bracelet angled or presented to camera, sharp full-frontal face, three-quarter sharp face, recognizable identity face, recognizable features, averted-eye portrait, in-focus face, cheekbones and nose sharp, both eyes in frame, eyes to camera, direct gaze, full face in frame, six fingers, extra fingers, missing fingers, fused fingers, webbed fingers, floating fingers, partially hidden fused hand, indistinct finger mass, hand merging into fabric, hand merging into shoulder, extra hand, second deformed hand, malformed supporting hand, deformed hand, broken stiff wrist, mangled fingers, claw hand, splayed stiff fingers, distorted anatomy, mutated limbs, clinical product shot, white seamless PDP crop, flat ring-light lighting, harsh on-axis flash, overexposed blown highlights, plastic skin, waxy skin, nude beauty stock, oversaturated, garish color, cluttered background, busy props, flat dead backdrop, cutout void, low quality, blurry subject, jpeg artifacts, amputated hand, knuckle-only crop"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Evening-luxe after-dark hero frame in warm golden tone: black silk evening top with one shoulder left bare, fabric matte-to-liquid, a fold of draped dark silk reading just behind. Single warm golden key from upper right, low like a lamp, rapid falloff into near-black on the far side; the dark negative space carries a soft tonal gradient and a whisper of the silk fold, not a flat void.",
          "pose": "The worn wrist is lifted gracefully so the hand settles just below the opposite bare shoulder, subject weighted to the UPPER-LEFT third with quiet space falling to the lower-right. The bracelet is caught incidentally inside the gesture — not angled toward the lens; the light finds it. Band rests flush at the wrist break with a soft contact shadow and believable weight. Worn hand relaxed, fingers gently apart and individually countable, exactly five, natural joints; nails short sheer-nude. If the lifting motion brings the supporting forearm into frame it is entirely bare — no bracelet, watch or ring — and shows five clear fingers or is cropped out. Frame cuts at the jawline; the face is out of frame, what little remains turned over the shoulder into the shadow side, soft, no eyes to camera.",
          "composition": "medium_shot"
        },
        {
          "scene": "Cool tonal counter-note — soft diffuse north-window daylight in an airy apartment: blush-pink tailored blazer off the shoulder over bare décolletage, sleeve pushed to mid-forearm so the worn wrist reads clean, oat-cream camisole at the neckline. Large window camera-left gives breathable daylight with cool blue-grey shadow; warm bounce from a cream wall only as a faint accent.",
          "pose": "Departure from the lifted gesture: the worn forearm rests along the styled surface / draped blazer with the wrist relaxed and the palm turned down, the bracelet caught in natural profile by the side light — never rotated to present its face. Subject sits LOW in the lower third with airy headroom above. Wrist gently broken, band flush against the arm with a soft contact shadow. Hand relaxed, fingers gently apart and individually countable, exactly five, natural joints, sheer-nude nails. Any supporting hand is bare and shows five clear fingers or is cropped out. Jaw-down crop, head turned away, upper face out of frame, no eyes to camera.",
          "composition": "medium_shot"
        },
        {
          "scene": "Graphic high-fashion minimalism on a neutral warm-bone backdrop, styled NOT bare-stock: a sculptural element anchors the couture read — a starched warm-bone silk collar falling off the deltoid (or a strong architectural shadow band across the shoulder); the skin is lit and styled like sculpture, not a beauty headshot. Soft neutral warm-bone key from upper right, gentle falloff into shadow left; negative space is lit with graduated falloff, never blank.",
          "pose": "A long languid diagonal: the worn arm extends AWAY from the body, reaching, the wrist relaxed at the end of the sweep with the bracelet rendered exactly as the reference from the angle naturally shown — rotated only slightly as the light grazes it, nothing redrawn, completed or invented. Subject pushed to the HARD RIGHT with a long empty left sweep of graduated bone. Band flush at the wrist break, soft contact shadow. Hand relaxed, fingers gently apart and individually countable, exactly five, natural joints, sheer-nude nails. Frame cuts above the upper lip — only jaw, neck and shoulder present, no eyes, identity-safe by crop.",
          "composition": "medium_shot"
        },
        {
          "scene": "Warm evening gold again to bookend shot 1, intimate resolved hero detail: the worn forearm laid across a fold of draped warm-bone silk on a tabletop, shoulder dissolving into shallow-focus blur behind, the blurred fold giving the negative space material texture. Single warm directional key, luminous low-contrast highlights grazing the metal to resolve stones without hot blowout; metal the brightest most resolved point.",
          "pose": "Tight and centered with shallow blur all around: the worn hand comes up to frame the jaw / lightly touch the neck so the wrist breaks naturally near the cropped face, the bracelet caught at the wrist by the grazing light — rendered EXACTLY as the reference from the angle shown, same stone count and setting, not rotated to display its face to the lens. Band flush against the wrist with a soft contact shadow, tack-sharp, believable weight, no fabric passing through it. Hand relaxed, fingers gently apart and individually countable, exactly five, natural joints, sheer-nude nails. Head soft and out of the focal plane beyond the jawline, turned away, upper face out of frame, no sharp frontal features, no eyes to camera.",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 13. RING GOLDEN HOUR (editorial) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Ring Golden Hour",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 13,
    "rationale": "Editorial/campaign on-model try-on (golden-hour theme) — the seller's piece worn in a styled art-directed golden-hour scene, face identity-safe, piece reference-locked. Aspirational counterpart to the clean PDP-crop try-on.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "One coherent GOLDEN HOUR SKIN campaign: identical warm late-afternoon light language, the same sun-kissed wearer with the same short sheer-nude manicure, and the ring identical to the reference and flush to skin across all four 4:5 frames. The four shots rotate gesture (forearm extended into light, hand curled in lower third, palm resting on warm linen, forearm raised against amber sky) and crop (medium/closeup) so the worn ring reads fresh each time. Key hardening vs the draft: Shots 1 and 4 were rescoped so the hand NEVER goes to the shoulder/neck/brow — the head, jaw, eyes and lips are now constructed fully OUT of frame in every shot rather than merely softened, killing the strongest face-identity and second-arm leakage paths. The linen 'cuff' was disambiguated to 'shirt sleeve / cloth' so the model cannot read it as a wrist cuff and invent jewelry. Golden-hour-specific ref-drift is locked: the warm cast must not recolor the metal (white/platinum stays cool, yellow stays its tone) or tint the stone amber, and backlight must not blow the band into a glowing silhouette or melt the setting — facets, prongs and form stay legible. REF-LOCK: exactly one ring, one finger, no resize/recolor/duplicate, no stacked/eternity band, no second jewelry, no invented watch/bracelet, no added halo of stones. ONE wearer, one visible hand/forearm per frame, opposite arm out of frame, ringed wrist bare. ANATOMY: five separated fingers, natural joints, no mirrored/duplicate hand, no reflection read as a second hand. JEWELRY-ONLY SPECULAR: matte skin and fabric, no blown sun, no sun disc, no hard sunbeam streak or flare on the stone, no invented sparkle/halo/bokeh on the gem. Composition art-directed with the ring on rule-of-thirds power points and warm negative space genuinely held empty; shadows fall away from the stone, never across it. Negative budget spent only on real failure modes (face/head leak, second arm/torso, anatomy, ref drift, warm-cast recolor, blown setting, cuff-as-jewelry, prop occlusion, dead-center placement) — text/logo/watermark left to global SAFETY_NEGATIVE. Flags: experimental + needs_human_review."
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
          "lighting:editorial_golden_hour",
          "color:editorial_theme_palette",
          "texture:skin_fabric_editorial",
          "context:campaign_hand_hero"
        ],
        "extra_positive": "Warm-cast color integrity locked: under the amber light the ring's metal keeps its exact reference tone (a yellow band stays the same yellow, a white/platinum band stays cool-white and is NOT tinted gold by the sunlight) and the stone keeps its true reference color and clarity — a colorless stone reads colorless with only a warm highlight, never recolored amber or yellow. The setting, prongs, and stone facets stay crisp and fully legible even in backlight — the band is never blown into a featureless glowing silhouette; warm light grazes the metal as a clean specular edge while the form, girdle, and prong count remain readable. Sun-kissed skin is matte-luminous and softly textured, never plastic, never oily. Wardrobe is fabric only — an unbuttoned linen shirt sleeve (cloth, a garment sleeve, NOT a wrist cuff or bracelet) and a silk slip strap glimpsed at the very top of frame; only one bare shoulder or upper-arm plane suggested, the torso and chest mostly out of frame. The single visible hand and forearm are the entire subject; the head, face, jaw, eyes, lips, and hair stay fully outside the frame in every shot by construction. Generous warm amber negative space genuinely held empty on the named side. Soft long shadows fall away from the ring, never crossing or obscuring the stone. Quiet-luxury Hermes-grade restraint, intimate and expensive, 4:5 vertical.",
        "extra_negative": "eyes, eyebrows, forehead, brow, eyelashes, lips, mouth, nose, chin, jawline, cheek, ear, hair, hairline, any part of the face or head in frame, hand touching the face, hand at the brow, hand shading eyes, second forearm, elbow of a second arm, torso, chest, cleavage, both shoulders, full upper body, metal recolored by sunlight, white gold tinted gold, platinum tinted amber, colorless stone turned yellow, stone color shifted by warm light, band blown into glowing silhouette, setting detail lost to backlight, prongs melted by glare, stone washed out by sun, linen cuff read as bracelet, fabric cuff mistaken for jewelry, wrist cuff, sleeve turned into a bangle, second ring on adjacent finger, stacked rings, eternity band added, gemstone multiplied, halo of extra stones added around the stone, reflection of the hand read as a second hand, mirrored arm, glassware, candle, flowers, foliage occluding the ring, prop overlapping the stone, sun disc in frame, hard sunbeam streak across the stone."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Sunlit terrace, late afternoon; warm low sun rakes from frame-left across a bare sun-kissed forearm and hand resting near an unbuttoned linen shirt sleeve (cloth only). Amber rim-light traces the finger edges; head fully out of frame at top, generous warm empty space to the right.",
          "pose": "Forearm laid diagonally across frame with the hand relaxed and open, the ringed finger softly extended toward the warm light so the band and stone catch one clean specular; five fingers gently separated, wrist loose and bare; ring on the upper-right power point.",
          "composition": "medium_shot"
        },
        {
          "scene": "Warm-toned interior, low golden window backlight behind the hand creating gentle halation; a silk slip strap glimpsed at the very top edge of frame on one bare shoulder plane. No face — jaw and everything above it cropped out.",
          "pose": "Single hand lifted in the lower-right third with fingers curling loosely inward, the ringed finger forward and the band flush to the skin; only this one hand and a short length of bare wrist visible.",
          "composition": "closeup"
        },
        {
          "scene": "Golden-hour light pooling on warm linen fabric; the hand resting palm-down on the sunlit cloth, long soft amber shadows stretching away from the ring into open negative space at lower-left frame.",
          "pose": "Fingers gracefully splayed and resting on the warm surface, the ringed finger slightly raised so the band and stone catch a single clean warm specular; five fingers clearly separated with natural joints, wrist bare.",
          "composition": "closeup"
        },
        {
          "scene": "Terrace edge against a warm amber gradient sky at golden hour; a bare sun-kissed forearm and hand raised into the soft directional light from above-left, gentle halation in the air, head and face entirely out of frame.",
          "pose": "Forearm lifted with the hand turned three-quarter and fingers relaxed and slightly curled, the ringed finger curving outward into open warm space so the ring sits on the upper-thirds power point; relaxed elegant gesture, wrist bare, only this one arm in frame.",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 14. BRACELET GOLDEN HOUR (editorial) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Bracelet Golden Hour",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 14,
    "rationale": "Editorial/campaign on-model try-on (golden-hour theme) — the seller's piece worn in a styled art-directed golden-hour scene, face identity-safe, piece reference-locked. Aspirational counterpart to the clean PDP-crop try-on.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "Single coherent theme world = AMBER TERRACE GOLDEN HOUR, distinct from prior evening/daylight/golden-graphic/studio templates by committing fully to sun-kissed sensual warmth — low raking amber light, skin halation, linen/silk-slip intimacy and long honey shadows rather than crisp studio light. All four shots vary gesture (wrist turned to light / arm across décolletage / forearm laid on surface / hand grazing shoulder), angle and crop while staying inside one amber campaign. HARDENING beyond the draft: (1) REFERENCE-LOCK tightened to also pin link/band width and forbid widening/narrowing the band and reorienting the stone, so the model cannot silently rescale the piece. (2) FACE-MANAGED reinforced with \"never resolved\" plus negatives on full face / defined eyebrows to kill identity leak even in the medium shots. (3) ANTI-DUPLICATION strengthened — explicit one-arm-per-frame in every shot scene, negatives for third arm, disembodied hand, mirrored bracelet. (4) NEW prop-occlusion guard: every scene states the negative space is prop-free near the wrist and negatives block petals/leaves/glass/fabric/hair overlapping or mimicking the bracelet (closing the \"theme prop occludes or imitates jewelry\" loophole). (5) ANATOMY made explicit per-shot — five separated fingers named in each pose so curled/draped hands don't fuse. (6) FLUSH-FIT hardened with both floating AND sinking/sliding-off negatives. (7) SPECULAR discipline kept: metal is the sole specular accent, sun flare across jewelry and blown highlights blocked, skin/fabric matte. Crops stay tight (closeup/medium_shot) to suppress head/anatomy risk. Negative budget spent only on real failure modes (watch/stack/duplication, type drift, float/clip/sink, frontal face, anatomy, fake sparkle, blown sun, prop occlusion, cold/clinical looks) — never on text/logo/watermark already covered by SAFETY_NEGATIVE. Flags: experimental + needs_human_review."
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
          "lighting:editorial_golden_hour",
          "color:editorial_theme_palette",
          "texture:skin_fabric_editorial",
          "context:campaign_wrist_hero"
        ],
        "extra_positive": "EDITORIAL CAMPAIGN, golden-hour fine-jewelry try-on, Hermes-grade beauty, one sun-kissed woman partially framed wearing exactly ONE bracelet on ONE wrist as the sole hero. The bracelet is IDENTICAL to the uploaded reference — same metal color and finish, same proportions and link/band width, same bracelet TYPE preserved (chain stays a chain, cuff stays a cuff, never stiffened or loosened), same stone count, cut, setting and orientation — resting on bare skin with believable weight, flush to the wrist, anchored by a soft warm contact shadow. Late-afternoon amber sun rakes low through a gauzy curtain across warm plaster and linen; a clean golden rim-light traces the forearm while skin holds a gentle halation glow and long languid shadows fall behind. Warm minimal wardrobe — an oatmeal linen shirt slipping off one shoulder or a champagne silk slip strap, bare décolletage, sun-warmed honeyed skin. One consistent wearer across all four frames: same warm honeyed skin tone, same slender wrist and hand, same short sheer-nude manicure. Only ONE arm visible per frame, the worn wrist otherwise completely bare, the opposite arm fully out of frame. The face is never the subject — cropped at the jaw, turned away into the light, or melting into soft warm defocus above the jawline, never frontal, never resolved. The polished metal of the bracelet is the only specular accent against soft matte skin and matte fabric. Art-directed rule-of-thirds composition, the named warm negative space genuinely held empty and prop-free near the wrist. Amber and honey palette, creamy filmic grain, shallow depth of field, soft directional window light, refined and expensive, the bracelet worn naturally as the centerpiece, 4:5 campaign crop.",
        "extra_negative": "two bracelets, double bracelet, stacked bracelets, second bangle, bracelet on both wrists, mirrored bracelet, added watch, watch dial, watch numerals, watch face, watch hands, wristwatch, invented timepiece, added ring, added necklace, added anklet, added earring, extra jewelry, charm dangle invented, recolored metal, mixed metal tones, restyled bracelet, resized bracelet, widened band, narrowed band, duplicated bracelet, chain turned into cuff, cuff turned into chain, bangle turned into chain, floating bracelet, gap between bracelet and wrist, bracelet hovering above skin, bracelet clipping through skin, bracelet sinking into skin, sliding off the hand, invented gemstones, extra stones, missing stones, wrong stone count, wrong stone cut, changed setting, reoriented stone, sharp frontal face, full face, eye contact, eyes to camera, direct gaze, identity portrait, sharp facial features, defined eyebrows, both arms in frame, two hands, second hand, duplicate hand, mirrored hand, extra arm, third arm, disembodied hand, six fingers, four fingers, extra fingers, missing fingers, fused fingers, webbed fingers, clawed fingers, bent-back fingers, floating fingers, extra knuckle, deformed wrist, broken wrist, twisted wrist, glossy plastic skin, oily skin, sweaty skin, waxy skin, airbrushed mannequin skin, sparkle halo, lens flare on stone, starburst glint, fake bokeh sparkle, sun flare across jewelry, blown-out sun, overexposed highlights, clipped whites, harsh shadow on jewelry, flower petals on wrist, leaves over bracelet, prop overlapping bracelet, glass or cup occluding wrist, fabric covering bracelet, hair over bracelet, cluttered background, busy props, cold blue tones, gray flat lighting, midday flat light, centered specimen shot, clinical PDP crop, product-only on white"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Sunlit warm-toned terrace, late-afternoon amber light raking low through a gauzy curtain, soft long shadows across pale plaster, the upper-left third held as clean empty warm negative space with no props near the wrist.",
          "pose": "One forearm raised and relaxed, hand draped softly with five naturally separated fingers gently curled, wrist turned slightly outward so the single bracelet faces the warm light and catches one clean specular highlight; the opposite arm fully out of frame, the worn wrist otherwise completely bare.",
          "composition": "closeup"
        },
        {
          "scene": "Warm interior, low golden window backlight forming a soft rim around a bare shoulder and an oatmeal linen shirt slipping off it, gentle halation glow, honey palette, the right third held as empty warm space, no objects crossing the wrist.",
          "pose": "The single worn arm crossed loosely so the braceleted wrist rests against the opposite collarbone with the hand relaxed and five separated fingers visible, face turned away over the shoulder into the light and softly out of focus above the jaw; bracelet placed on a rule-of-thirds point, wrist bare apart from the one bracelet.",
          "composition": "medium_shot"
        },
        {
          "scene": "Sun-warmed room, amber light pooling on a bare linen surface, the long soft shadow of the forearm cast across it, creamy filmic grain, generous empty warm negative space below the wrist with nothing overlapping the bracelet.",
          "pose": "Forearm laid languidly along the surface, hand relaxed and open with five naturally separated fingers and short sheer-nude nails, wrist rolled so the bracelet sits flush with believable weight and a soft contact shadow; head cropped above the jaw, single arm only.",
          "composition": "closeup"
        },
        {
          "scene": "Golden-hour terrace, warm low sun behind the figure giving a soft glowing rim-light along the forearm, gentle halation on sun-kissed skin, a champagne silk slip strap on a bare shoulder, the warm amber background fully defocused and uncluttered.",
          "pose": "Hand lifted to lightly graze the edge of the bare shoulder with fingers softly separated, the braceleted wrist gracefully bent so the piece reads as the clear hero against skin, only jaw and chin entering frame and turned away from camera; a single arm visible, the wrist carrying only the one bracelet.",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 15. RING MONOCHROME NOIR (editorial) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Ring Monochrome Noir",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 15,
    "rationale": "Editorial/campaign on-model try-on (monochrome-noir theme) — the seller's piece worn in a styled art-directed monochrome-noir scene, face identity-safe, piece reference-locked. Aspirational counterpart to the clean PDP-crop try-on.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "Theme = MONOCHROME NOIR (classic-Vogue B&W, ONE hard side/rake key, deep chiaroscuro, generous held-empty negative space, full silver-gelatin tonal range). The four shots vary only gesture/angle/crop within one coherent campaign: (1) inward fist at collarbone, head out of frame; (2) hand over bare shoulder, head turned fully away; (3) fingertips at lip/chin, face in deep defocus; (4) three-quarter near-profile hand emerging from shadow, jaw/neck in defocus. CRITICAL B&W reliability fix: because gemstone color is not a usable check, reference-lock is enforced on STRUCTURE — silhouette, band width/curvature, setting height, prong/bezel style, stone count, cut outline, facet pattern, and metal-finish reading (polished stays polished) must all match the reference; the ring's size relative to the finger is unchanged. Two noir-specific beauty failure modes are explicitly suppressed in both directions: the ring being SWALLOWED by crushed black (loses the hero) and the band BLOWING OUT into a featureless white blob (loses structure) — every frame must keep the ring legible with one crisp band specular plus facet/edge-light. Muddy low-contrast/milky mids and harsh blotchy hand-shadow are negated to protect the expensive look. Face managed by construction in all four (out of frame, turned away, or deep defocus above the jaw — never frontal, never eyes to camera); shot 3 is the highest face-leak risk and gets reinforced defocus. Props are the noir trap (cigarette/holder/smoke, wine/champagne glass, flowers near the lip/chin and three-quarter gestures) — all forbidden because they occlude or mimic the ring. ONE consistent wearer, single hand/arm per frame with the opposite arm out of frame, ringed wrist bare (no watch — including no invented dial/numerals — no bracelet/bangle/second ring/other-finger ring), perfect five-finger anatomy. Jewelry is the ONLY specular hero (matte velvety skin, no invented sparkle/halo/lens-flare/bokeh balls). Crops kept tight (2 closeup, 2 medium_shot) to suppress head/anatomy risk. No negative budget spent on text/logo/watermark (SAFETY_NEGATIVE covers it). Flags: experimental + needs_human_review."
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
          "lighting:editorial_monochrome_noir",
          "color:editorial_theme_palette",
          "texture:skin_fabric_editorial",
          "context:campaign_hand_hero"
        ],
        "extra_positive": "Elevated monochrome-noir hardening, layered on top of the draft POSITIVE: this is a single coherent classic-Vogue black-and-white campaign world, photographed like a $40k silver-gelatin editorial — every one of the four shots lives in the same charcoal-to-graphite studio, lit by one hard directional rake. WARDROBE & STYLING for grace: a sliver of impeccable matte-black couture (a bare shoulder, a sharp tailored cuff edge, or a fluid silk strap) reads at the frame edge as luxe context, never competing with the hand; the model is partially shown and elegantly art-directed, the gracefully posed hand the only stage. REFERENCE-LOCK recast for B&W as a STRUCTURE lock: the single worn ring stays IDENTICAL to the uploaded reference in silhouette, band width and curvature, head/setting height and style, stone count, cut outline, facet pattern, and prong/bezel geometry — the metal finish reads as the SAME finish (polished vs brushed unchanged); the ring's overall size relative to the finger is unchanged. The piece must stay legible as the hero in every frame: even inside deep chiaroscuro the ring is never swallowed by black — its band always catches one crisp clean specular and its stone always holds facet structure through tonal contrast and crisp edge-light, while never blowing out into a featureless white blob. TONALITY for beauty: a full rich tonal range from deep elegant blacks through luminous velvety mid-grays to clean controlled highlights — museum silver-gelatin depth, fine-grain film, no muddy crushed mids; the skin matte and softly modeled in graphite grays, the shadow on the hand sculptural and flattering (never harsh, blotchy, or grimy). Generous, intentional negative space held genuinely empty, the ring placed on a rule-of-thirds power point. Refined, architectural, restrained, expensive.",
        "extra_negative": "color, color cast, colored gemstone, saturated hue, sepia, sepia tone, duotone, split-tone, teal tint, blue tint, warm tint, hand-tinted, flat even lighting, low contrast, washed out, hazy, foggy, gray muddy mids, milky low-contrast, crushed blacks hiding the ring, ring lost in shadow, ring swallowed by black, blown-out white band blob, overexposed clipped highlight on stone, ring underexposed and unreadable, restyled ring, altered band width, changed setting height, different prong style, swapped finish, brushed-to-polished change, resized ring, enlarged stone, shrunk stone, extra facets, fewer facets, restyled setting, frontal identity face, eyes to camera, sharp in-focus face, recognizable face, model staring at lens, two rings, ring on multiple fingers, stacked rings, second ring, mirrored ring, floating ring, gap between band and finger, ring clipping into skin, watch, wristwatch, watch dial, bracelet, bangle, second bracelet, cigarette, cigarette holder, smoke, wine glass, champagne flute, flower, rose, prop in hand, object occluding the ring, prop mimicking the ring, six fingers, extra finger, missing finger, fused fingers, webbed fingers, clawed fingers, bent unnatural finger, mirrored hand, duplicate hand, second hand, second arm in frame, two arms, broken wrist, dislocated thumb, glossy plastic skin, oily skin specular, waxy skin, plastic mannequin hand, harsh blotchy hand shadow, grimy dirty shadow, invented sparkle, glowing halo on stone, lens flare, bokeh sparkle balls, busy background, cluttered set, patterned backdrop, clinical product crop, packshot, dead-center specimen framing, full frontal head, full body, group of hands."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Seamless charcoal-to-graphite studio backdrop; one hard side key rakes from frame-left carving deep elegant chiaroscuro, vast intentional negative space held empty to the right. Fine-grain silver-gelatin monochrome, full tonal range from deep black to luminous mid-gray, never muddy. A whisper of matte-black couture at the lower frame edge for luxe context only.",
          "pose": "One hand curls softly inward toward the collarbone in a relaxed fist, the single ringed finger gently extended forward so the ring sits cleanly on a left-third power point, band flush to the skin with a soft contact shadow; the polished band catches one crisp clean specular and the stone's facets read through tonal contrast — never lost in shadow, never blown white. Exactly five naturally separated fingers, wrist bare, no watch or bracelet. Opposite arm fully out of frame; head not in frame.",
          "composition": "closeup"
        },
        {
          "scene": "Same noir studio world; the rake light skims low across the back of the hand so knuckles and band edge catch a bright clean rim against deep shadow, generous dark negative space held empty above. Museum silver-gelatin tonality, sculptural flattering shadow on the skin.",
          "pose": "The hand laid gracefully over the angle of a bare shoulder, fingers long and softly separated and draped downward, the single ring forward-facing and clearly legible on the worn finger; the head is turned fully away over that shoulder so only the jawline and a sliver of cheek read in soft shadow above the jaw — no frontal face, no eyes to camera. One hand and one arm only, ringed wrist bare, no second ring or other-finger ring.",
          "composition": "medium_shot"
        },
        {
          "scene": "Tight noir vignette, the key light focused like a controlled spotlight on the hand alone, surroundings falling to elegant near-black but the ring kept legible; a thin clean specular line traces the polished band. High-contrast classic-Vogue, no muddy mids, no harsh ugly under-shadow.",
          "pose": "Fingertips rest lightly near the lower lip and chin line in a poised contemplative gesture, the ringed finger uppermost and clearly presented at a rule-of-thirds point, exactly five fingers naturally separated with relaxed joints, band flush with contact shadow; the face dissolves into deep soft defocus and shadow above the jaw — no sharp face, no eyes, no identity. No cigarette, glass, or any prop. Bare wrist, single hand only.",
          "composition": "closeup"
        },
        {
          "scene": "Same campaign; the hand emerges from deep shadow into a single hard shaft of directional light against a graphite gradient, sculptural high contrast with generous dark negative space surrounding. Fine-grain monochrome, the ring catching crisp specular and edge-light so its structure stays fully readable out of the black.",
          "pose": "The hand lifted and turned three-quarters with fingers gently fanned and slightly arched, the single ring presented in near-profile so its setting height, band thickness, and facet structure read through edge-light against shadow; only the underside of the jaw and neck are visible in soft defocus at the frame edge — no eyes, no frontal face. Exactly five separated fingers, one hand and one arm, ringed wrist bare, no watch or second bracelet or extra ring.",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 16. BRACELET MONOCHROME NOIR (editorial) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Bracelet Monochrome Noir",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 16,
    "rationale": "Editorial/campaign on-model try-on (monochrome-noir theme) — the seller's piece worn in a styled art-directed monochrome-noir scene, face identity-safe, piece reference-locked. Aspirational counterpart to the clean PDP-crop try-on.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "One coherent MONOCHROME NOIR world: true neutral silver-gelatin black-and-white, a single hard raking key, fine analog grain, deep velvety blacks and controlled luminous highlights, generous restrained negative space — unified across all 4 shots while pose/angle/crop vary (raised forearm, top-down wrist study, over-the-shoulder near-light, reclined diagonal still-life). Three hardening passes layered onto the draft: (1) B&W integrity — explicitly forbid color/sepia/duotone/split-tone/selective-color leaks, and forbid both failure extremes of high-contrast B&W (skin blown to white, blacks crushed so the bracelet is lost); the bracelet is mandated to stay FULLY inside the lit zone in every frame so the hero never disappears into shadow. (2) Reference-lock reframed for monochrome onto FORM not color — identical link/cuff architecture, link/stone count and rhythm, clasp/setting geometry, width, and the metal's finish CHARACTER (polish-vs-satin reading preserved), with type-drift (chain↔cuff) and finish-drift (matte↔glossy) explicitly negated since color cues are unavailable. (3) Anatomy/identity loophole closure — the over-the-shoulder shot (highest risk) is rewritten so the lifted wrist stays a clear hand's-width OFF the face (no fingertip-to-cheek fusion) and the face is sunk into defocus/shadow with reflected-face-in-metal and second-face explicitly negated; silk/fabric is kept clear of the wrist in every frame so folds can't occlude or mimic links; one wearer, one arm per frame, braceleted wrist otherwise bare, no invented watch/second bracelet/ring, flush contact shadow (no float/gap/clip). Negative budget spent only on B&W-specific and on-model risks; no text/logo/watermark terms (handled by global SAFETY_NEGATIVE). Flags: experimental + needs_human_review."
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
          "lighting:editorial_monochrome_noir",
          "color:editorial_theme_palette",
          "texture:skin_fabric_editorial",
          "context:campaign_wrist_hero"
        ],
        "extra_positive": "Silver-gelatin black-and-white only — a true neutral grayscale with no color anywhere, deep velvety blacks and clean luminous highlights on a fine analog grain, classic-Vogue chiaroscuro. The single reference bracelet is the unmistakable hero and is always kept fully inside the lit zone — never swallowed by shadow — its polished metal catching one crisp specular ridge of highlight while its links/setting and stone facets read sculpturally through tonal contrast and micro-shadow. Reference-lock in monochrome is enforced on FORM: identical link/cuff architecture, count and rhythm of links or stones, clasp and setting geometry, bracelet width and the metal's finish character (the same polish-vs-satin reading as the reference) — never restyled, recolored to a different finish, resized, or duplicated; the bracelet TYPE is preserved exactly (a supple chain stays a fluid draping chain, a rigid cuff stays a solid cuff). The piece sits flush on the wrist with believable weight and one soft grounded contact shadow, never floating, gapping, or biting into the skin. ONE consistent wearer in every frame: the same warm mid-tone skin rendered as a continuous mid-gray, the same short sheer-nude near-bare manicure, the same single bare forearm and wrist; the braceleted wrist carries ONLY this one bracelet and is otherwise bare. Wardrobe is matte and unbusy — black silk, charcoal cashmere, a dark sheer slip — kept clear of the wrist so fabric folds never overlap, occlude, or mimic the bracelet's links. Skin matte with soft sculpted falloff (no oily glare), face always controlled by construction. Expensive, restrained, Hermes-grade; generous quiet negative space, 4:5 portrait.",
        "extra_negative": "color, any color, color cast, tinted, warm tone, cool tone, sepia, sepia tone, brown tone, duotone, split-tone, gold tint, partial color, selective color, colorized, skin blown to pure white, crushed black losing the bracelet, bracelet lost in shadow, bracelet hidden in darkness, underexposed jewelry, finish changed, satin turned glossy, polished turned matte, brushed metal restyled, fabric folds mimicking links, silk drape overlapping bracelet, fabric occluding bracelet, cloth crossing the wrist, fingers fused to face, fingertip merging into cheek, hand melting into jaw, finger sunk into skin, reflected face in metal, face mirrored in jewelry, second face, profile face sharpening into identity, eye contact, three hands, ghost hand, extra arm in shadow, duplicate forearm, mirrored forearm, knuckle on wrong side, bent-back thumb, extra knuckle."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Frame is a deep black void on the left two-thirds; one hard key light rakes in from the right and skims a single bare forearm and the cut edge of a charcoal silk sleeve, the fabric kept well clear of the wrist. The face is entirely out of frame above the jaw — only the soft curve of jaw and neck implied in the falloff. The reference bracelet sits flush on the wrist at the right-third power point, fully inside the lit zone, its polished metal catching the lone crisp specular while the skin stays matte and the links read in clean tonal contrast.",
          "pose": "Forearm raised and relaxed near an unseen collarbone, wrist gently broken so the bracelet drapes naturally with its own weight; exactly five fingers, softly curled and clearly separated at the joints, short sheer-nude nails, the opposite arm entirely out of frame and the wrist otherwise bare.",
          "composition": "medium_shot"
        },
        {
          "scene": "Tight top-down study of the wrist against deep graduated shadow, classic-Vogue chiaroscuro; the bracelet's link/cuff architecture, clasp and stone facets read purely through neutral-gray tonal contrast and micro-shadow, the metal holding one bright clean highlight ridge. Background is a smooth grey-to-black gradient with generous empty space in the upper-left. No face anywhere in frame; no fabric touching the wrist.",
          "pose": "Single hand turned palm-down and slightly tilted, fingers long and naturally separated, wrist gently arched so the bracelet's contact shadow falls softly on the skin and the piece sits flush with no gap; five clean fingers, sheer-nude nails, only the one arm present.",
          "composition": "closeup"
        },
        {
          "scene": "Model seen from behind over one bare shoulder; the face is dropped well into soft defocus and deep shadow above the jaw so absolutely no identity, eyes, or reflected face reads. A single shaft of hard directional light catches the shoulder blade, the décolletage edge, and the braceleted wrist lifted into the light a clear hand's-width away from the shadowed head — fingertips NOT touching the face. Vast dark negative space fills one side.",
          "pose": "Worn wrist lifted into the light near but not contacting the obscured head, the hand open and relaxed with five distinctly separated fingers held clear of the skin of the face; the bracelet sits flush at the upper-right third catching its single highlight, the other arm unseen, the lifted wrist otherwise bare.",
          "composition": "medium_shot"
        },
        {
          "scene": "Low-key still-life of a single forearm laid diagonally across a swath of matte black silk, hard side-light grazing the bracelet so its polished surface flares one crisp clean highlight while the skin and silk sink to velvety neutral black; the bracelet stays fully lit and unmistakable, the silk pooled below and beside the wrist but never folding over or across the metal. The face is cropped completely out below the jaw.",
          "pose": "Forearm reclined diagonally and at rest, wrist relaxed and slightly supinated so the bracelet falls naturally with its own weight and sits flush against the skin; fingers loosely open and clearly five, naturally separated, single hand only, the bracelet placed on the lower-right power point.",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 17. RING CAFÉ CANDID (editorial) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Ring Café Candid",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 17,
    "rationale": "Editorial/campaign on-model try-on (lifestyle-object theme) — the seller's piece worn in a styled art-directed lifestyle-object scene, face identity-safe, piece reference-locked. Aspirational counterpart to the clean PDP-crop try-on.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "THEME WORLD: \"Café Candid — caught in a quiet morning luxury moment.\" One coherent warm soft-daylight interior/café campaign; the four shots rotate the four single objects (ceramic cup, hardcover page, quilted leather handbag, coupe stem) so each frame varies gesture/angle/crop while staying one world. HARDENING vs the draft: (1) Anti-occlusion — the two highest-risk \"cupping/gripping\" gestures were rewritten to fingers RESTING/SEPARATED, not wrapped, with the ringed finger lifted forward and the band rotated toward the light, so curled fingers can't hide or fuse over the ring. (2) Reflection trap closed — the coupe and ceramic/metal surfaces invited a second mirrored hand or a reflected ring; negatives now kill reflected/mirrored hand and reflected ring in glass/metal. (3) Prop-as-jewelry confusion closed — handbag quilting and any sleeve cuff could read as a bracelet/strap on the wrist; explicit \"quilting stays a surface, never wraps the wrist\" plus negatives for strap/cuff/sleeve-as-jewelry. (4) Wardrobe added for campaign read — a defocused ivory silk / cream cashmere sleeve ending SHORT of a bare wrist gives editorial luxe without introducing a wrist accessory. (5) Beauty push — explicit warm low-contrast directional daylight, cream/honey/amber color story, film grain, creamy bokeh, medium-format 85mm macro intimacy to defeat the flat/clinical/stock failure mode; negatives now also suppress grey clinical light, white seamless, cold cast and stock sterility. (6) Face managed by a DIFFERENT construction each frame (crop above wrist / head out of frame / crop at wrist / turned-away defocus); never frontal, never eyes to camera. (7) Object kept strictly ONE and clear of the stone, with duplicate-in-bokeh negated. Did NOT spend negative budget on text/logo/watermark — covered by global SAFETY_NEGATIVE. Flags: experimental + needs_human_review."
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
          "lighting:editorial_lifestyle_object",
          "color:editorial_theme_palette",
          "texture:skin_fabric_editorial",
          "context:campaign_hand_hero"
        ],
        "extra_positive": "Warm editorial lifestyle campaign with cinematic intimacy — one elegant hand worn naturally as the hero, the ring kept perfectly identical to the reference in metal color, finish, proportions, stone count, cut, setting and orientation, seated flush on a single finger with the band rotated toward the light and fully visible. A whisper of luxe wardrobe anchors the frame: the soft edge of a cream cashmere or ivory silk sleeve falling just short of a bare wrist, fabric matte and out of focus. Skin is warm fair with a fine natural sheen, short sheer-nude manicure, slender relaxed fingers with clearly separated natural joints. The single styling object is rendered realistically and kept clear of the stone so it frames rather than covers the ring. Light is soft directional late-morning daylight from a window, warm and low-contrast, raking gently across the metal to make the ring the sole specular point. Color story of cream, honey, warm taupe, pale amber and oat. Shallow depth of field with creamy organic bokeh, fine editorial film grain, unhurried candid mood, expensive restraint, generous breathing negative space art-directed around the hand. Medium-format look, 85mm-equivalent macro intimacy, Hermès-grade beauty and $40k campaign polish.",
        "extra_negative": "ring wrapped or hidden behind curled fingers, band rotated away from light, finger curled so the ring is occluded, styling object overlapping the ring, two cups, two glasses, two books, two handbags, duplicate object in the bokeh, reflected hand in the glass, reflected ring in glass or metal surface, mirrored hand in a reflective surface, handbag strap or quilting read as a bracelet on the wrist, sleeve cuff mistaken for a bracelet or watch, fabric band around the wrist, watch, watch dial, numerals, bangle, cuff, second bracelet, charm, anklet, second ring on the same hand or other hand, ring sliding off, ring too large or too small for the finger, cold blue cast, grey clinical studio light, flat catalog lighting, white seamless backdrop, stock-photo sterility, posed stiff hand, splayed claw fingers, knuckles bent unnaturally, plastic skin, waxy retouch, HDR halo, glittering star sparkles on the stone, rainbow fire on the stone, glowing aura around the ring."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Sunlit café corner, warm oak table, a single matte cream ceramic cup catching soft morning window light; the ivory silk sleeve falls just short of a bare wrist; airy empty negative space holds the upper-left quadrant.",
          "pose": "Fingertips of one hand rest lightly against the curve of the cup, fingers softly separated and NOT wrapped around it, the ringed finger held forward and slightly lifted so the band faces the light and the ring sits unobstructed on the lower-right rule-of-thirds power point; opposite arm fully out of frame; the wrist bare except for the single ring on its finger; face cropped out above the wrist.",
          "composition": "closeup"
        },
        {
          "scene": "Styled apartment reading nook, a linen-bound hardcover lying open on a travertine surface, soft directional daylight, pale taupe negative space banked along the right edge, gentle bokeh beyond the page.",
          "pose": "One relaxed hand mid-gesture lifting a single page, fingers gently separated with the ringed finger raised clear above the paper so the ring reads cleanly against the open space; the page edge frames the hand but never crosses the ring; only this one hand and a hint of forearm visible, wrist bare, single ring only; head out of frame.",
          "composition": "medium_shot"
        },
        {
          "scene": "Warm-toned interior, a quilted tan leather handbag resting on a honey-oak bench, creamy out-of-focus bokeh behind, generous empty space held open along the lower edge.",
          "pose": "Hand resting at ease on top of the bag, fingers softly extended flat along the quilted leather rather than gripping, the ringed finger foremost with the band turned up toward the light; the quilting stays a surface beneath the hand and never wraps the wrist; face managed by cropping at the wrist with no face in frame; bare wrist, single ring only, opposite arm out of frame.",
          "composition": "closeup"
        },
        {
          "scene": "Late-morning table setting, a slim crystal coupe holding pale amber light, cream linen and soft diffuse window glow, airy negative space across the top and right, no second reflection cast by the glass.",
          "pose": "Fingertips poised lightly at the slender stem of the coupe, the ringed finger extended along the stem and catching one clean controlled highlight on the band; fingers separated and natural, no reflected or mirrored hand appearing in the glass; head turned fully away and dropped into soft defocus high in the frame, never frontal, never eyes to camera; only one hand and forearm shown, wrist bare, single ring.",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 18. BRACELET CAFÉ CANDID (editorial) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Bracelet Café Candid",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 18,
    "rationale": "Editorial/campaign on-model try-on (lifestyle-object theme) — the seller's piece worn in a styled art-directed lifestyle-object scene, face identity-safe, piece reference-locked. Aspirational counterpart to the clean PDP-crop try-on.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "Theme world = 'café hours' lifestyle candid: four distinct framing objects (matte ceramic cup, open hardcover book, quilted handbag, coupe glass) give four elegant gestures inside one coherent honeyed-daylight café-apartment, varying pose/angle/crop within the single theme without reproducing the existing evening/daylight/golden/graphic-studio rotation. Hardening vs the draft: (1) Shot 3 was rewritten to REMOVE the 'bare shoulder and decolletage' invitation — that re-introduced head/neck/second-shoulder identity-and-anatomy risk on a medium shot; it is now a tight closeup cropped at mid-forearm and fully below the jaw, and pulled to a left-of-center power point. (2) Crops are now 3 closeup / 1 medium (was 2/2) to further suppress head and anatomy risk per the tight-crop principle. (3) Every prop is explicitly forced MATTE and non-reflective (ceramic unglazed, glass dull/clear, leather soft-matte) so no prop can steal 'only specular hero' status or rim-glint into a fake second metal object. (4) The quilted-handbag rhyme risk (quilting reading as a duplicate chain) is countered in both extra_negative ('bracelet pattern repeated in leather', 'second metal object') and the shot note (texture kept soft so it cannot mimic a second chain), with the bracelet resting clearly in FRONT of the bag. (5) Book and coupe-glass shots explicitly forbid a second/hidden hand ('no second hand on the book', 'no hand or fingers visible behind the glass') to kill the duplicate-hand and 6th-finger hallucinations those poses invite. (6) The invented-watch trap is doubly reinforced because café/coffee context strongly priors a wristwatch. Reference-lock front-loaded as the top line of extra_positive and given override priority. Negative budget spent entirely on real failure modes (duplication, recolor, type-swap, invented watch, second hand/arm, anatomy, float/clip, prop occlusion/duplication/mimicry, invented sparkle/halo) and NOT on text/logo/watermark since SAFETY_NEGATIVE already covers those. Flag experimental + needs_human_review."
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
          "lighting:editorial_lifestyle_object",
          "color:editorial_theme_palette",
          "texture:skin_fabric_editorial",
          "context:campaign_wrist_hero"
        ],
        "extra_positive": "REFERENCE LOCK (highest priority, overrides everything): render exactly ONE bracelet, and it must be IDENTICAL to the single uploaded reference piece — same metal color and finish, same bracelet TYPE (a chain stays a chain, a cuff stays a cuff, never converted), same link shape and count, same clasp, same proportions, same stone count, cut, setting and orientation. Do not restyle, recolor, resize, duplicate, mirror, extend or invent any part of it. The bracelet sits flush on the wrist with believable metal weight and a soft contact shadow where it meets the skin — never floating, never gapped, never clipping through skin.\n\nONE single coherent theme world: 'café hours', a candid luxury moment in a warm sunlit café-apartment, honeyed late-morning daylight raking low through a nearby window. ONE consistent wearer across all four shots — the same warm even-toned skin, the same short sheer-nude natural manicure, the same single slender wrist. Only ONE hand and forearm visible per frame; the opposite arm fully out of frame; the braceleted wrist otherwise completely bare with no watch, no ring, no second bracelet.\n\nIn each shot the hand interacts with exactly ONE tasteful, realistic, matte object that FRAMES the bracelet and never covers it — the object is small, simple and singular, held or rested beside the wrist so the full bracelet stays unobstructed and clearly in focus. The bracelet is the ONLY specular highlight in the entire frame; the object, the skin and the fabric all stay matte and non-reflective so nothing competes with or mimics the metal.\n\nWardrobe of soft linen and cashmere in muted ivory, oat and caramel, held in gentle defocus. Honeyed directional warmth, fine natural film grain, shallow depth of field with creamy bokeh, generous held-empty negative space, an unhurried intimate candid-not-posed mood. The face is never the subject and never sharp — cropped above the jaw, turned away over the shoulder, or dissolved into soft shadow and defocus, never frontal, never eyes to camera. Art-directed framing with the bracelet on a rule-of-thirds power point, the polish of a forty-thousand-dollar print campaign.",
        "extra_negative": "duplicated bracelet, two bracelets, second bracelet, bangle stack, layered bracelets, chain extending into the background, bracelet pattern repeated in fabric or leather, added watch, watch, wristwatch, watch dial, watch face, watch numerals, watch strap, added ring, second ring, recolored metal, wrong metal color, restyled clasp, invented clasp, chain turned into cuff, cuff turned into chain, changed bracelet type, resized stones, invented stones, extra stones, missing stones, rearranged stones, floating bracelet, gap between bracelet and wrist, bracelet clipping through skin, loose oversized bracelet sliding off, two hands, second hand, third hand, second arm, duplicate arm, mirrored hand, extra arm entering frame, both arms visible, extra fingers, sixth finger, missing fingers, fused fingers, webbed fingers, clawed fingers, bent broken fingers, deformed wrist, broken wrist, double wrist, sharp frontal face, in-focus face, eyes to camera, identity portrait, model staring at lens, full face visible, bare shoulder, decolletage, neck and collarbone in frame, two coffee cups, two glasses, two books, two handbags, duplicated object, object covering the bracelet, object occluding the wrist, hand hidden behind object, shiny reflective cup, glossy glass rim glinting, metallic prop, mirrored prop reflection mimicking jewelry, second metal object, extra sparkle on stone, glowing halo around stone, lens flare, bloom on the metal, specular skin, sweaty oily skin, glossy oily fabric, plastic skin, harsh studio flatness, flat clinical product crop, dead-center specimen framing, cluttered tabletop, busy background, multiple props"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Warm café-apartment, honeyed late-morning daylight raking low across a pale marble bistro table; muted ivory-and-caramel palette, creamy bokeh behind, generous empty negative space to the upper left. A single matte unglazed ceramic coffee cup, no shine.",
          "pose": "One hand cradles the matte ceramic cup loosely from the side, five clearly separated relaxed fingers softly curved against the warm porcelain, thumb naturally placed; the braceleted wrist angled up and turned outward so the full bracelet faces the window light at the wrist's natural turn, the entire piece unobstructed by the cup. Wrist bare except the one bracelet. Face entirely out of frame, cropped well above the jaw. Bracelet on the lower-right rule-of-thirds power point as the only specular highlight.",
          "composition": "closeup"
        },
        {
          "scene": "Same sunlit apartment, a single hardcover book resting open on a linen-draped lap, soft directional warmth, gentle film grain, shallow depth of field; calm empty negative space across the open page.",
          "pose": "The one braceleted hand rests lightly on the open book with fingertips just grazing the page corner, forearm relaxed so the bracelet settles against the wrist bone with a believable contact shadow; exactly one arm in frame, five natural separated fingers, opposite arm fully out of frame, no second hand on the book. The whole bracelet stays visible above the page, never covered by paper. Head turned away over the shoulder and dropped into soft defocus, no face features sharp, no eyes to camera.",
          "composition": "medium_shot"
        },
        {
          "scene": "Styled apartment side-table at golden hour, a single quilted leather handbag resting closed; warm caramel daylight, creamy bokeh, abundant calm negative space to the right.",
          "pose": "The braceleted wrist drapes gently over the rolled top edge of the quilted handbag, hand relaxed with five fingers softly fanned, the full bracelet sitting on the upper face of the wrist and fully visible, resting in front of the bag and never sinking into or hidden by the leather; sheer-nude manicure, wrist otherwise bare. Only this one hand and forearm in frame, no shoulder, no neck, no face — cropped at the mid-forearm and below the jaw entirely. Bracelet on a left-of-center power point, the quilted texture kept soft and matte so it cannot mimic a second chain.",
          "composition": "closeup"
        },
        {
          "scene": "Warm café corner at golden hour, a single coupe glass on a small marble table, low raking light glinting once off the bracelet metal only; smoky-amber bokeh, abundant negative space behind, the glass matte and non-reflective.",
          "pose": "Fingertips of one hand lightly steady the slender stem of the coupe glass from the front, five clearly separated fingers, no hand or fingers visible behind the glass; the forearm lifted and rotated so the bracelet faces the lens at its most flattering angle, the metal weight reading naturally as it slides toward the wrist. The bracelet is the sole specular highlight; the glass stays dull and clear so it never glints like metal. Only one hand and forearm shown, wrist otherwise bare. Face cropped at the jaw, never frontal, never in focus.",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 19. RING IN BLOOM (editorial) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Ring In Bloom",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 19,
    "rationale": "Editorial/campaign on-model try-on (in-bloom theme) — the seller's piece worn in a styled art-directed in-bloom scene, face identity-safe, piece reference-locked. Aspirational counterpart to the clean PDP-crop try-on.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "Single coherent theme world across all 4 shots (peonies, blush garden roses, apple blossom, dewy diffused morning light, pastel-and-green palette, held negative space) — distinct from existing evening/daylight/golden/graphic-studio templates. Poses vary WITHIN the theme: (1) hand draped over an open peony, (2) lifting a blossom by the stem, (3) hand resting on petal-scattered linen, (4) hand curved near the turned-away face. FACE managed by construction in every frame: shots 1-2 crop it out entirely, shot 3 drops it into soft defocus/shadow above the jaw, shot 4 turns it away over the shoulder cropped at the jaw — never frontal, never eyes to camera. ONE consistent wearer (warm fair matte skin, short sheer-nude manicure, one bare wrist); one hand/forearm per frame; opposite arm always out of frame; ringed wrist bare of any bracelet/watch/second ring. Reference-lock is front-loaded AND declared to override the scene so the diffusion model can't recolor the metal to flatter the warm light. Crops kept tight (2 closeup + 2 medium_shot) to suppress head/anatomy re-entry. Two new failure modes specific to this theme are closed in shot scenes AND the negative: a petal/leaf occluding the stone, and a botanical prop MIMICKING the jewelry (dewdrop-as-gemstone, bud-as-ring, stem-as-band) — every frame names the ring as the single sharpest/most-resolved object and keeps props soft-focus and matte so they can't steal specular or read as part of the piece. Pose grace and wardrobe pushed for the $40k-campaign read (bridal-adjacent silk/organza glimpsed at edges, painterly bokeh, one reserved specular kiss on metal). Flags: experimental + needs_human_review. Did not spend negative budget on text/logo/watermark (SAFETY_NEGATIVE covers it)."
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
          "lighting:editorial_in_bloom",
          "color:editorial_theme_palette",
          "texture:skin_fabric_editorial",
          "context:campaign_hand_hero"
        ],
        "extra_positive": "Reinforce: the ring is rendered at the highest resolution and sharpest focus of anything in the frame so a viewer's eye lands on it first; the metal keeps its true reference color independent of the warm ambient light; one soft directional highlight travels across the band and stone while every botanical element stays matte and demoted to supporting bokeh; the single hand is posed with relaxed editorial grace (loose curl, graceful extension, weightless drape) rather than a stiff catalog presentation; wardrobe and skin stay tonal and quiet so nothing competes with the hero.",
        "extra_negative": "stem overlapping the band, leaf reading as a bangle, petal reading as a ring, multiple rings of light, color fringing on the band, reflection of flowers in the stone, second wrist entering frame, arm crossing into frame from the opposite side, ring sharpness lost to bloom, flat even frontal lighting, stocky hand model crop, clinical PDP fragment, patterned busy wardrobe, dense flower wall blocking negative space"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Soft-focus blush peonies and apple-blossom branches fill the lower-left quadrant in painterly bokeh; dewy diffused morning light rakes from the upper left; airy cream negative space held genuinely empty across the upper-right third where the ring sits on a rule-of-thirds power point as the single sharpest object.",
          "pose": "One hand drapes forward and rests featherlight over the cupped face of an open peony, fingers gently relaxed and slightly curled so the ringed finger is highest, most forward, and fully resolved while the petals fall away into soft focus behind it; the band catches the one specular kiss; wrist bare; face entirely out of frame; opposite arm out of frame.",
          "composition": "closeup"
        },
        {
          "scene": "A cluster of blush garden roses and fresh green leaves dissolves into tender backlit bokeh behind; soft rim light grazes the petal edges; pastel negative space held along the left edge; the ring is the only crisply-resolved element.",
          "pose": "The hand lifts a single blossom by its stem between thumb and forefinger, the ringed finger extended gracefully alongside the stem and angled so the ring face reads to camera at a clean three-quarter view, well separated from the stem so the stem never overlaps or mimics the band; only one forearm in frame, wrist otherwise bare; face cropped above the jaw and out of frame.",
          "composition": "medium_shot"
        },
        {
          "scene": "Loose petals scattered on a pale cream linen surface with one large peony soft-focus at the far edge; gentle diffused overhead light; quiet empty cream space held across the lower third; the ring stays the sharpest, most in-focus object on the surface.",
          "pose": "The hand lies relaxed on its side over the linen, fingers loosely fanned and clearly separated with five distinct fingertips, the ringed finger resting forward on a rule-of-thirds power point with the band flush to the skin and a soft contact shadow beneath; no petal touches or covers the stone; the face is dropped far into soft defocus and shadow above the jaw at the very top edge, unresolved.",
          "composition": "closeup"
        },
        {
          "scene": "A few apple-blossom branches arc through a misty pastel-green bokeh background; gentle directional light grazes the hand and reserves its one highlight for the metal; generous negative space held to the upper right.",
          "pose": "The forearm rises and the wrist curves softly so the hand floats loosely near the cheek, the head turned away over the shoulder and cropped at the jaw so no facial features resolve; the ringed finger lightly grazes a single soft-focus petal while staying the crisp hero; wrist bare, only one arm in frame, opposite arm out of frame.",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 20. BRACELET IN BLOOM (editorial) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Bracelet In Bloom",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 20,
    "rationale": "Editorial/campaign on-model try-on (in-bloom theme) — the seller's piece worn in a styled art-directed in-bloom scene, face identity-safe, piece reference-locked. Aspirational counterpart to the clean PDP-crop try-on.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "Single coherent theme world (IN BLOOM / BOTANICAL ROMANCE): all four shots share the dewy peony/garden-rose/blossom campaign and pastel-and-green palette; only pose, angle and crop vary (forearm over blooms, lifting a peony, draped over an urn, crossing the décolletage). Beauty pushed past a flat stocky crop via raking directional morning light, painterly bokeh on the flowers, deep negative space placed on a named side, and graceful gravity-soft hand poses — the bracelet always parked on a rule-of-thirds power point, never centered specimen-style. Key reliability hardening beyond the draft: (1) FLOWER-OCCLUSION loophole closed hard — flowers are explicitly background/bokeh only, a clear in-focus strip of skin separates every petal from the metal, and negative bars petals fused to metal, flower wrapping the wrist, leaf/stem crossing the bracelet, petal-mistaken-for-gemstone, and dewdrop-mistaken-for-stone (the theme prop must never mimic or occlude the hero). (2) DUPLICATION/WRAP loophole closed — 'encircling the wrist once with no doubling-back' in positive plus 'bracelet wrapped twice / doubled-back chain' in negative, so a chain isn't multiplied into a stack. (3) TYPE-SWAP locked both directions (chain follows the wrist's curve / cuff stays rigid) in positive and negative. (4) INVENTED-WATCH suite expanded (dial, face, hands, numerals, smartwatch, fitness band). (5) Face managed by construction in every frame — cropped far above wrist, turned away into defocus over the shoulder, cropped at forearm, cropped at jaw — and 'in-focus face / second face' added to negative. (6) Anatomy reinforced (webbed fingers, double thumb, seven fingers added). (7) Float/clip both named: 'gap between bracelet and skin' and 'clipping or sinking into wrist' plus positive 'band sits flush' with a true contact shadow. (8) Specular discipline: bracelet the only specular element, plus negative on bokeh-balls-on-metal and blown-out-highlight-swallowing-the-bracelet so the hero never gets eaten by glow or floral bokeh. Did NOT spend negative budget on text/logo/watermark — handled by global SAFETY_NEGATIVE. Engine nano-banana, 4-shot image_set, 4:5, on_model_tryon reference strategy. Flags: experimental + needs_human_review. Distinct from the prior evening/daylight/golden/graphic-studio templates — a soft romantic botanical world."
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
          "lighting:editorial_in_bloom",
          "color:editorial_theme_palette",
          "texture:skin_fabric_editorial",
          "context:campaign_wrist_hero"
        ],
        "extra_positive": "Fine-jewelry house campaign, botanical romance lookbook — a soft-focus garden of full-blown peonies, blush garden roses and pale blossom branches surrounds ONE bare wrist where a single bracelet is the crisp protagonist. The flowers are rendered in luxurious painterly bokeh — they are pure atmosphere, drifting in the background and foreground planes, and they NEVER touch, wrap, drape over or overlap the bracelet; a clear band of in-focus skin always separates petal from metal. Dewy diffused morning light, tender bridal-adjacent glow, a refined pastel-and-green palette of blush, cream, ivory and muted sage. The bracelet is held tack-sharp at the focal plane with believable jeweller's weight, a soft true contact shadow where each link or the cuff edge meets the skin, the metal catching one clean directional highlight — the ONLY specular element in an otherwise matte frame of luminous-but-matte skin and quiet matte ivory fabric. Reference lock, absolute: the bracelet is rendered EXACTLY as the uploaded reference — identical metal color and finish, identical proportions, identical stone count, cut, setting and orientation, identical clasp and link pattern, and the SAME bracelet type (a chain reads unmistakably as a supple chain following the wrist's curve; a cuff reads as a rigid cuff; the two are never interchanged). Exactly ONE bracelet, on ONE wrist, encircling the wrist once with no doubling-back. One consistent wearer throughout: warm-fair skin, short sheer-nude almond manicure, the same slender wrist and hand, five naturally separated fingers with soft individual joints. Only ONE arm and hand enter any frame; the worn wrist carries the single bracelet and nothing else — no watch, no ring, no second bracelet, no anklet-as-bracelet. Art-directed to a forty-thousand-dollar floral campaign: the bracelet seated on a rule-of-thirds power point, the named negative space genuinely held empty, never a centered specimen. Medium-format capture, shallow depth of field, museum-grade color, gentle film grain, 4:5.",
        "extra_negative": "second bracelet, double bracelet, two bracelets, stacked bracelets, layered bracelets, bangle, bangle stack, bracelet wrapped twice, doubled-back chain, anklet, added ring on any finger, watch, wristwatch, watch dial, watch face, watch hands, watch numerals, clock face, smartwatch, fitness band, chain restyled as cuff, cuff restyled as chain, chain stiffened into a rigid band, cuff softened into a chain, restyled jewelry, recolored jewelry, resized jewelry, altered clasp, changed link pattern, extra links, duplicated bracelet, mirrored bracelet, invented jewelry, extra gemstones, added charm, added pendant, invented sparkle, glitter, bokeh balls on the metal, lens flare, halo, glow or bloom on the stone, blown-out highlight swallowing the bracelet, petals fused to the metal, petal mistaken for a gemstone, flower wrapped around the wrist, flowers covering or occluding the bracelet, leaf or stem crossing the bracelet, dewdrop mistaken for a stone, sharp frontal face, eyes to camera, in-focus face, identifiable portrait, second face, both arms in frame, two wrists, second hand, duplicate hand, mirrored hand or arm, extra arm, opposite arm visible, floating bracelet, gap between bracelet and skin, bracelet hovering above wrist, bracelet clipping or sinking into the wrist, bracelet merged with skin, six fingers, seven fingers, extra fingers, missing fingers, fused fingers, webbed fingers, clawed or bent-wrong fingers, double thumb, broken or twisted wrist, rubber skin, plastic skin, oily skin, waxy skin, garish saturated colors, neon, oversaturated flowers, cluttered busy background, harsh flat on-camera flash, dead-center specimen framing, clinical PDP crop."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "A bare forearm and wrist laid over a low cloud of soft-focus peonies and blush garden roses; the blooms melt into painterly bokeh and stay strictly behind the arm, a clear strip of in-focus skin separating every petal from the metal. Dewy diffused morning light rakes across the wrist. Generous negative space of pale out-of-focus petals opens to the upper left where the frame breathes empty. The single bracelet is the tack-sharp hero, seated with believable weight, a soft true contact shadow where it meets the skin; the wrist is otherwise completely bare.",
          "pose": "Forearm laid gently across the blossoms, hand relaxed and softly curled with five clearly separated fingers, the short sheer-nude almond manicure visible, wrist rotated to present the bracelet's face squarely to the directional light. Face entirely out of frame far above the wrist crop. Only this one arm and hand in the frame; the opposite arm out of frame.",
          "composition": "closeup"
        },
        {
          "scene": "The same wearer's hand lifting a single peony toward a hint of bare shoulder and the soft underside of the jaw; the head is turned away over the shoulder and dropped into gentle defocus, blossom branches blurred behind. Tender bridal-adjacent glow, pastel-and-green palette. The braceleted wrist is held forward at the sharp focal plane as the only specular note against matte skin; the lifted flower is kept well clear of the bracelet so petal never overlaps metal.",
          "pose": "Hand raised to cradle one bloom near the collarbone, fingers naturally separated, the braceleted wrist angled forward into the directional light; face turned away over the shoulder and softly out of focus, never toward camera, no eyes visible. One arm only, the worn wrist bearing only the single bracelet, the other arm out of frame.",
          "composition": "medium_shot"
        },
        {
          "scene": "The bare wrist draped languidly over the lip of a pale stone urn spilling garden roses and trailing blossom; petals drift through the deliberately held-empty negative space at right while the flowers melt into bokeh well behind the metal. Soft romantic side light models the bracelet, which sits crisp and weighted on the rule-of-thirds power point; a believable contact shadow anchors it to the skin with no gap and no clipping.",
          "pose": "Forearm hanging relaxed over the urn's edge, hand loose and gravity-soft with five clearly separated fingers, wrist rotated so the bracelet's detail and clasp read cleanly and the band sits flush. No face in frame — cropped at the forearm. A single arm and hand visible; the wrist carries only the one bracelet.",
          "composition": "closeup"
        },
        {
          "scene": "The wearer's bare forearm crossing softly in front of the décolletage among a gentle fall of pale petals; the jaw is cropped just at the lower edge of frame so the face is fully managed by the crop, ivory wardrobe matte and quiet. Dewy diffused light keeps the bracelet the lone crisp hero amid soft-focus blooms, with ample held-empty negative space above. Petals drift past the arm but never settle on or cross the metal.",
          "pose": "Forearm drawn gently across the upper chest, fingertips resting near the opposite collarbone with five separated fingers, the braceleted wrist turned to catch the light and the band flush to the skin; everything above the jaw cropped out so no face shows. Only one arm and hand in frame, the wrist bare except for the single bracelet.",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 21. RING COLORBLOCK (editorial · ref-driven) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Ring Colorblock",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 21,
    "rationale": "Editorial on-model try-on (colorblock direction, from Hermès references) — bold art-directed worn campaign; piece reference-locked, anatomy hardened. Test-pool variant (consolidate winners into mood-param later).",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "ONE coherent gallery world: GRAPHIC COLORBLOCK and SCULPTURE, committed to a single rich TERRACOTTA hue distilled from the Hermès dark-hand / cream-orange sculptural-form reference. Face deliberately CROPPED across all 4 shots — this is a hand+color+form subject, so the face rule resolves to no-face (no identity question, no frontal-stare risk; the allowed-face update simply does not apply here). One consistent wearer carried via identical nude manicure and warm skin tone across shots. Biggest reliability risk for THIS direction is the curved/orange prop mimicking or occluding the ring: hardened in three layers — (1) props specified matte chalk-cream/bone/clay-orange and explicitly non-specular so only the RING is the hero highlight; (2) every shot keeps the ringed finger forward/extended past the prop into open color with a visible skin gap so band and stone are never tucked, embedded, clipped, or looped by the form; (3) negatives ban prop-as-band mimicry, prop loop around finger, ring inside/behind prop, ring clipping/embedded, finger fused to prop, and any secondary sculpture glint. Single-wearer hardening: shot 4 (the cradle, classic two-hand temptation) is locked to ONE hand that is the ringed hand, with second-ringed-hand and mirrored-hand explicitly negated. Composition labels corrected — shot 4 changed from full_body to medium_shot since it is a forearm+hand crop, not a figure (avoids the model pulling in a torso/face). Color discipline hardened against the common terracotta failure modes (muddy brown, salmon pink, banding, glossy seamless, two-block clutter) and against stock-photo flatness so it reads bold and editorial, not clinical. Reference-lock baked into positive (identical metal/finish/band-width/stone/cut/setting, exactly one ring, one finger, flush, bare wrist/forearm) and negative (second/extra/stacked/restyled/recolored/resized ring, invented stone, wrong metal, bracelet/watch/bangle invention). SAFETY_NEGATIVE NOT duplicated — zero text/logo/watermark spend. Flags: experimental + needs_human_review (bold new register). Distinct from all built quiet themes — no evening-luxe / soft-daylight / golden-hour-skin / monochrome-noir / café / in-bloom."
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
          "lighting:editorial_colorblock",
          "color:editorial_bold_palette",
          "texture:skin_fabric_editorial",
          "context:campaign_hand_hero"
        ],
        "extra_positive": "Bold Hermès-grade gallery campaign, single-hue TERRACOTTA discipline pushed to a rich burnt-clay saturation — deep, warm, expensive, never muddy or washed. The seamless is perfectly matte and even edge to edge, a true color field with real negative space, no gradient banding. ONE sculptural prop per frame in a restrained off-palette (matte chalk-cream, soft bone, or muted clay-orange ceramic/plaster) that color-blocks elegantly against the terracotta WITHOUT introducing a competing second color field — the prop is a calm form, the terracotta still rules the frame. Light is soft directional studio key with a gentle warm fill: it wraps the skin so the hand reads dimensional and alive (visible warm undertone, fine skin texture, soft tendon and knuckle definition, no plastic or waxy sheen), and it rakes the matte sculpture so its form reads without ever throwing a bright specular that could rival the ring. The gesture is deliberate and editorial — an elegant relaxed hand with a confident line from wrist through fingertip, neutral bare or sheer-nude manicure, fingers softly tapered and intentionally placed, never stiff or stocky. The RING sits flush on exactly ONE finger of ONE hand, fully presented to camera and to the key light, kept IDENTICAL to the reference in metal color and finish, band width, stone count, cut and setting and proportion. It is the SINGLE specular hero in the frame: one clean crisp highlight on metal, controlled honest sparkle on any stone, tack-sharp at catalog clarity. The ringed hand's wrist and forearm are completely bare — no bracelet, no watch, no second ring, no added jewelry anywhere. Refined warm editorial color grade, sophisticated, sculptural, color-confident, modern art gallery still life with a living hand. 4:5 vertical, ring and finger in sharpest focus.",
        "extra_negative": "two hands both wearing a ring, second ringed hand, mirrored ringed hand, the sculptural prop forming a ring-like loop around the finger, prop arc reading as a band, prop edge mimicking the ring profile, ring tucked behind or inside the prop, prop or its shadow covering the stone or band, ring half-hidden where hand meets sculpture, ring clipping into the prop surface, ring embedded in plaster, finger merging into the sculpture, hand fused to the prop, ring floating off the finger, gap between band and skin, ring tilted off-axis hiding the stone; prop throwing a bright glint, glossy ceramic hotspot competing with the metal, secondary sparkle on the sculpture; terracotta turning brown muddy or pink salmon, two strong colors splitting the frame, prop color bleeding into a second background block, patterned or textured backdrop, reflective or glossy seamless, gradient banding, vignette grime; stiff claw hand, stocky sausage fingers, gnarled knuckles, doll-stiff posing, tense unnatural gesture, hand cut awkwardly at the wrist seam; clinical stock-photo flatness, harsh flat frontal flash, dull lifeless skin, grey dead color; clutter of multiple props, competing geometric shapes; full-body figure, torso, frontal staring face, eyes locked to camera."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Rich matte terracotta seamless floods the full 4:5 frame as one unbroken color field; a smooth matte chalk-cream curved sculptural arc rises through the right third as the single graphic prop, lit so its form reads soft and shadowed but never glossy.",
          "pose": "One elegant hand reaches in from the left and grips the OUTER front face of the arc, fingers wrapping over its top edge while the ringed finger lies extended and proud along the near front surface — the ring fully forward to camera and key light, never tucked between hand and prop; bare wrist and forearm, exactly five naturally separated fingers, a clean gap of skin kept visible between the band and the sculpture so nothing occludes the ring.",
          "composition": "medium_shot"
        },
        {
          "scene": "Tight study on the terracotta ground; the rounded top of a pale bone-ceramic column enters low, matte and softly raked by warm directional light, a delicate contact shadow grounding the hand on its surface.",
          "pose": "Fingertips of the ringed hand rest lightly on the crown of the column, hand gently arched with a graceful wrist line, the ringed finger angled up toward the key so the single specular highlight lands clean on the metal; other fingers softly tapered, ring fully clear of the column edge, wrist bare, no second hand in frame.",
          "composition": "closeup"
        },
        {
          "scene": "A bold expanse of empty terracotta negative space fills the upper two-thirds; a single rounded matte clay-orange stone form sits low in the bottom third as the only prop, color-blocking quietly without splitting the frame into two backgrounds.",
          "pose": "The ringed hand drapes from above and lays over the stone's curve, fingers cascading down its side with the ringed finger riding the highest point of the form so the ring sits at the apex catching light, unobscured and forward; clean separated joints, natural wrist, hand isolated and floating in the color field, second hand absent.",
          "composition": "medium_shot"
        },
        {
          "scene": "The chalk-cream arc and a sliver of pale column meet in one color-blocked lower corner against the dominant terracotta, gallery-still and graphic, generous empty color space above.",
          "pose": "The forearm and one ringed hand enter low; the hand cradles the inner hollow of the arc with the palm, while the ringed finger extends OUT past the arc's inner lip into open terracotta space so the ring is the clear focal jewel held between hand and sculpture, never swallowed by the hollow; bare wrist, exactly five fingers, only one hand present and it is the ringed hand.",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 22. BRACELET COLORBLOCK (editorial · ref-driven) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Bracelet Colorblock",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 22,
    "rationale": "Editorial on-model try-on (colorblock direction, from Hermès references) — bold art-directed worn campaign; piece reference-locked, anatomy hardened. Test-pool variant (consolidate winners into mood-param later).",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "ONE bold coherent world: GRAPHIC COLORBLOCK & SCULPTURE locked to a single committed TERRACOTTA hue with a matte cream plaster prop (arc / column / slab) for warm-cream-on-burnt-orange color-blocking, distinct from every quiet-neutral template (no evening-luxe, soft-daylight, golden-hour-skin, monochrome-noir, cafe, in-bloom). Face cropped out of frame in all four shots per the face rule for colorblock/hand-focused worlds, so the hand plus color plus form are the entire subject. The four shots vary pose/angle/crop inside the one world: (1) fingers resting over a curved arc, (2) forearm beside a vertical column with the bracelet face-on, (3) closeup into bold empty negative color space, (4) overhead flat-lay on a plaster slab. Hardening baked in: REFERENCE LOCK on the seller's single uploaded bracelet, kept identical in metal color/finish/links/width/clasp/stones, never restyled/recolored/resized/retyped (chain stays chain, no link-to-cuff). Exactly ONE bracelet on ONE wrist, flush with a soft contact shadow, never floating/clipping/sunk; NO invented watch/smartwatch, NO added bangle/stack/cuff/ring/charm. One consistent wearer across all four, same warm medium skin tone, same neat bare short manicure, the worn wrist otherwise bare and no second jeweled hand anywhere. Anatomy guard: exactly five separated fingers per visible hand, clean joints and thumb, natural unbroken wrist, no duplicate/mirrored/ghost hand. The plaster props are explicitly behind or beneath the arm and never wrap, occlude, touch, or mimic the bracelet (no arc reading as a cuff). The bracelet is the only specular hero against a fully matte non-reflective backdrop and prop, no invented sparkle/halo/flare/glow. Rule-of-thirds with real negative terracotta space, crops tight enough to control hand anatomy. Global SAFETY_NEGATIVE handles text/logo/watermark, so none of the negative budget is spent there. Engine nano-banana, 4:5, 4-shot image_set, reference_strategy on_model_tryon. Flags: experimental + needs_human_review."
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
          "lighting:editorial_colorblock",
          "color:editorial_bold_palette",
          "texture:skin_fabric_editorial",
          "context:campaign_wrist_hero"
        ],
        "extra_positive": "Bold Hermès-grade graphic campaign with confident maison color-direction: a single committed terracotta hue saturated and rich like burnt-clay pigment, lit so the seamless reads as deep velvety matte paper with a clean directional gradient and no sheen. The matte cream plaster sculptural prop is chalky and unpolished, color-blocking warm bone-cream against burnt orange in crisp graphic planes with hard editorial intent, never glossy and never reflective. The forearm is posed with sculptural grace and intentional line, wrist gently broken at a flattering angle, fingers long and relaxed with quiet tension, never stiff or stocky or clinical-catalog. The single uploaded BRACELET is the lone luminous hero, reproduced EXACTLY to the reference in metal color, finish, links/band geometry, width, clasp and any stones (count, cut, setting all identical), sitting flush against the wrist with believable metal weight and a soft true contact shadow where it meets skin. Premium beauty retouch with genuine living skin: visible pores, fine knuckle creases, soft natural fingertip highlights, warm even medium skin tone consistent across all four shots, the same neat bare clean-cut short manicure throughout. Light is a soft directional studio key with a gentle wrap fill, sculpting the forearm and making the bracelet metal sing as the only specular accent. Rich gallery-campaign mood, modern luxury maison art-direction, bold negative terracotta space, 4:5 vertical, crisp and intentional.",
        "extra_negative": "two bracelets, stacked bracelets, bangle next to bracelet, cuff added beside the bracelet, wristwatch, smartwatch, watch face, watch dial, watch strap, ring on any finger, multiple rings, anklet, necklace, earrings on a cropped ear, second wrist wearing the bracelet, both wrists jeweled, mirrored second hand wearing the piece, bracelet duplicated in reflection, bracelet recolored, bracelet metal hue shifted, silver turned gold or gold turned silver, bracelet resized too large or too small for the wrist, bracelet type changed, chain rebuilt as solid cuff, links merged into bangle, invented gemstones, added charms or dangles, extra clasp, bracelet floating off the skin, gap between bracelet and wrist, bracelet clipping through skin, bracelet sunk into the arm, sparkle burst, lens flare, bloom halo, fake glint, metal glowing beyond natural reflection, glossy backdrop, lacquered seamless, reflective floor, shiny wet plaster, mirror prop, plaster prop polished, prop wrapped around the wrist, prop occluding the bracelet, prop shaped like a bracelet, arc mimicking a cuff on the arm, six fingers, seven fingers, four fingers, three fingers, extra finger, missing finger, stub finger, fused fingers, webbed fingers, conjoined knuckles, floating detached finger, clawed bent fingers, hyperextended fingers, double thumb, two thumbs, broken wrist, snapped wrist, twisted forearm, dislocated wrist, rubbery bent forearm, duplicate hand, mirrored hand artifact, ghost hand, extra arm, melted skin, plastic skin, wax skin, mannequin hand, doll hand, second backdrop color, two-tone gradient backdrop, patterned backdrop, textured wallpaper, busy background, clutter, props piled, harsh blown highlights, crushed muddy shadows, low resolution, soft out-of-focus bracelet, motion blur on the hand."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Saturated burnt-clay terracotta seamless studio, deep matte paper sweep; a chalky matte cream plaster curved arc rises into frame at the left third as the sole sculptural prop, color-blocking bone-cream against burnt orange; soft directional key from upper right, generous negative terracotta space at right.",
          "pose": "The braceleted wrist and forearm angle in from the right with sculptural line, the wrist gently broken, fingers long and relaxed curling over the top edge of the cream arc to rest on it (not gripping behind it, the arc never crossing the wrist), the single bracelet sitting flush at the wrist with a soft contact shadow and catching the key light as the lone specular hero; exactly five naturally separated fingers, clean thumb, no other jewelry.",
          "composition": "medium_shot"
        },
        {
          "scene": "Same terracotta seamless, a smooth chalky cream plaster column standing vertically behind the arm; crisp color-block of bone-cream against burnt orange, clean gallery key light.",
          "pose": "The forearm raised vertically beside the column with elegant tension, back of the hand toward camera, fingers softly relaxed and slightly separated, the wrist turned so the bracelet faces the lens and reads fully end to end (clasp and links clear); the column stays behind the arm and never wraps it, the wrist otherwise bare, exactly five fingers, no watch and no ring.",
          "composition": "medium_shot"
        },
        {
          "scene": "Pure terracotta seamless with no prop, vast saturated burnt-orange negative color space, one soft studio key for a minimal graphic field.",
          "pose": "The hand and wrist enter from the lower-left third, fingers gracefully extended and gently parted into the empty terracotta, palm rolled to present the inner wrist so the bracelet sits against bold open color; the bracelet flush with a soft contact shadow, exactly five separated fingers, natural wrist, no second hand in frame.",
          "composition": "closeup"
        },
        {
          "scene": "Overhead top-down view onto a raw matte cream plaster slab laid flat on the terracotta sweep, crisp clean color-blocked planes, even top light.",
          "pose": "The forearm rests diagonally across the slab from corner toward center, hand softly open and relaxed with five naturally separated fingers laid on the plaster, the single bracelet settled flush against the wrist with a soft contact shadow, the slab a flat surface beneath (never wrapping or touching the bracelet), wrist bare apart from the one bracelet, no other hand and no other jewelry.",
          "composition": "full_body"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 23. RING COLOR POP (editorial · ref-driven) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Ring Color Pop",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 23,
    "rationale": "Editorial on-model try-on (color-pop-fabric direction, from Hermès references) — bold art-directed worn campaign; piece reference-locked, anatomy hardened. Test-pool variant (consolidate winners into mood-param later).",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "ONE direction world = SATURATED COLOR-BLOCK, every render committed to a SINGLE bold hue held identically across all 4 shots (positive names hot-pink suede as default with cobalt/scarlet/emerald as whole-set swaps, but a render must pick ONE and never mix). Face cropped on all 4 shots per the color-pop face rule, so the worn RING plus the single color block are the dual hero. Critical fixes vs draft: (1) draft shot 4 used composition full_body on a hand-only crop, which invites the engine to render a whole figure or second model — changed to medium_shot and the scene/negative now explicitly cap framing at hand-and-forearm, no face/torso/second person. (2) Hardened the fingertip-press pose so the suede dimples AROUND the fingers, never over the band — added negatives for fabric bulging over / swallowing / mimicking the ring and folds covering the stone. (3) Shot 2's lifted profile finger now reads as resting/anchored on the cloth, not floating — paired with floating-ring negatives. (4) REFERENCE LOCK and exactly-one-ring-on-one-finger-flush enforced in positive and negative, including setting-rotation and stone add/remove. (5) Anatomy guard heavily weighted (five separated fingers, no fusion/webbing/extra/missing/clawed, no duplicated/mirrored hand) since hand-only crops live or die on finger anatomy. (6) Single-hue lock reinforced with negatives against second background color, gradient-to-second-color, multicolor and patterned cloth, so the alternate-hue list can't bleed into one frame. (7) Fabric forced dead-matte (suede/silk/velvet/satin all kept matte) so the ring is the only specular hero — no invented sparkle/halo/flare/double-catchlight. (8) Garment-surface cue (\"suede skirt\" register) absorbed as the color-block ground only, with body/seam-as-anatomy negatives so it never spawns a torso. Poses rotate the ring through four angles within one world — palm-down forward, side-profile present, fingertip-press apex, half-open cross. SAFETY_NEGATIVE owns text/logo/watermark; none of the negative budget spent there. Distinct from built quiet themes (evening-luxe, daylight, golden-hour, noir, cafe, in-bloom) as a single saturated color-block statement, not a neutral environment. Flags: experimental + needs_human_review (bold register, hand-only anatomy-critical crops)."
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
          "lighting:editorial_color_pop_fabric",
          "color:editorial_bold_palette",
          "texture:skin_fabric_editorial",
          "context:campaign_hand_hero"
        ],
        "extra_positive": "Push to true Hermès-grade campaign saturation: commit each render to ONE single bold hue (default a vivid hot-pink suede; cobalt silk, scarlet velvet, or emerald satin are equally valid swaps) and let that one color OWN the entire frame edge to edge with intentional editorial tonal grading — a subtle deepening of the color into the shadow side and a soft warm bloom where the raking daylight grazes the nap, so the ground reads as a luxury fashion still-life and never a flat clinical swatch. The fabric carries visible directional texture (suede nap / silk weave / velvet pile / satin grain) raked by soft window-quality daylight so it feels tactile and expensive while staying completely matte. The hand is styled with intent, not just laid down: long elegant relaxed fingers, graceful wrist line, confident editorial gesture, a manicured but minimal bare or sheer-glaze nail, warm even consistent skin. The SELLER'S ONE uploaded RING is the single jewel-as-accent on the color block, composited on exactly ONE finger of ONE hand, seated flush against the skin with a tight believable contact shadow and a single honest catchlight on metal and stone. REFERENCE LOCK is absolute: preserve the reference ring's metal color and finish, band width and proportions, stone count, cut, and setting EXACTLY — do not recolor, resize, restyle, rotate the setting, duplicate, or invent any element. Crisp clean reflections live only on the ring; the fabric stays dead-matte so nothing competes with the jewel. Generous pure-color negative space, rule-of-thirds placement, refined tactile contact where skin meets cloth. 4:5 vertical, premium fashion-editorial finish, true-to-life saturated color, controlled tight crops that keep hand and finger anatomy fully governed.",
        "extra_negative": "two hands wearing rings, a second ringed hand entering frame, both hands ringed; ring duplicated, ring mirrored, second ring, stacked rings, ring on more than one finger, ring on the wrong finger, ring drifting off the finger, ring floating above the skin, visible gap between band and finger, fabric pile bulging over or swallowing or hiding the band, suede nap occluding the ring, fold of cloth covering the stone, fabric deforming into a ring-like ridge, cloth mimicking metal or stone; ring restyled, ring recolored, ring resized, band proportions changed, setting rotated or altered, stones added or removed, cut changed, metal hue shifted; bracelet, watch, bangle, anklet, second piece of jewelry, added gem, charm; two or more different background colors in one frame, color-blocking with competing hues, gradient into a second color, multicolor fabric, patterned or printed cloth, busy texture, clutter, stray props; glossy fabric, shiny satin glare, wet-look cloth, mirror-reflective ground, sheen on the fabric rivaling the ring; invented sparkle, fake stone glow, halo, bloom, lens flare, glitter, double catchlight on the stone; full body, full figure, torso, shoulders, neck, chin, lips, face, eyes, second person, second model, model's body, garment seams reading as anatomy; six fingers, four fingers, extra finger, missing finger, fused or webbed fingers, stub finger, clawed or hyperextended fingers, broken or twisted wrist, double wrist, floating disembodied hand, duplicated hand artifact, melted knuckles, plastic mannequin skin, inconsistent skin tone between shots; muddy desaturated color, washed-out hue, unnatural color cast greening or graying the skin; blurry, low-res, oversharpened, HDR halos, color banding."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Full-bleed single vivid hot-pink suede ground filling the frame with editorial tonal grading, soft window-daylight raking across the nap so the pile reads tactile and matte; the ringed hand rests palm-down and serene in the lower-right third with broad pure-color negative space sweeping up and left.",
          "pose": "Hand laid flat and relaxed on the suede, five fingers clearly separated and gently fanned with believable joint creases and natural nail shape, the ONE ringed finger eased slightly forward so the ring catches its single clean catchlight, fingertips lightly grazing the nap; the ringed hand's wrist bare and unadorned.",
          "composition": "medium_shot"
        },
        {
          "scene": "Same single hot-pink suede world, camera dropped low and raking so the color stretches into deep saturated negative space; the hand enters cleanly from the right edge, the ring sitting near a rule-of-thirds intersection, fabric staying fully matte.",
          "pose": "Hand poised gently on its side resting on the cloth so the ring is anchored and never floating, fingers softly curled with the single ringed finger extended to present the ring in clean profile flush to the skin, elegant tension in the knuckles, five distinct fingers; wrist bare.",
          "composition": "closeup"
        },
        {
          "scene": "Same single-hue suede expanse, one soft sculptural fold of the hot-pink fabric rising at the left edge for depth, even matte daylight, the color flooding the rest of the frame; tight controlled crop on hand and ring only.",
          "pose": "Fingertips pressing delicately into the nap so the pile dimples softly AROUND the fingers while the band and stone stay fully visible and uncovered, hand arched gracefully with the ringed finger as the apex, all five fingers separated with natural joints; wrist bare.",
          "composition": "closeup"
        },
        {
          "scene": "Pull back slightly on the same single hot-pink suede expanse for generous editorial negative space, the hand placed off-center against pure unbroken color, consistent soft matte daylight, framing cropped to the hand and forearm only with no face or body in frame.",
          "pose": "Hand resting gracefully half-open on the suede, long relaxed fingers with a gentle inward curve and clear separation, the one ringed finger crossing slightly toward its neighbors to feature the ring, a tight contact shadow grounding the hand to the cloth; wrist bare.",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 24. BRACELET COLOR POP (editorial · ref-driven) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Bracelet Color Pop",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 24,
    "rationale": "Editorial on-model try-on (color-pop-fabric direction, from Hermès references) — bold art-directed worn campaign; piece reference-locked, anatomy hardened. Test-pool variant (consolidate winners into mood-param later).",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "on_model_tryon: composite the seller's ONE uploaded bracelet onto the forearm and lock it to the reference — metal hue/finish, band width/profile, link or cuff or bangle geometry, clasp presence, stone count/cut/setting all identical; never recolor, resize, restyle, duplicate, or invent a clasp/stone. The model's forearm/hand is generated (not the seller's identity); faces are CROPPED throughout, correct for the color-pop register, so the only cross-shot consistency burden is ONE shared skin tone + hand + tonal manicure. Each shot is ONE saturated matte fabric as an edge-to-edge field (hot-pink suede / cobalt silk / scarlet velvet / emerald satin) — the fabric is the world, the bracelet the single jewel-accent and the ONLY specular hero; fabric must stay matte and must never glint, mimic metal, or fold into a band shape. Shot 4 is deliberately framed as a medium_shot of an extended forearm, NOT a full figure — never render a whole body or a second limb. Hard guarantees: exactly ONE closed bracelet on ONE bare wrist with a soft contact shadow and convincing weight (no float, no clip, no sinking into cloth), the far arc of the band reads as the same single circlet (not a second band), exactly five separated fingers per visible hand, no second adorned hand, no invented watch/stack/charm. Vary crops closeup-to-extended-diagonal for pose/angle range while staying tight enough to fully control anatomy. SAFETY_NEGATIVE owns text/logo/watermark — no negative budget spent there. Flag experimental + needs_human_review."
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
          "lighting:editorial_color_pop_fabric",
          "color:editorial_bold_palette",
          "texture:skin_fabric_editorial",
          "context:campaign_wrist_hero"
        ],
        "extra_positive": "One uncompromising saturated color governs each frame edge-to-edge — the fabric is the world, the bracelet is the lone jewel struck across it. Treat the colored textile as a pure matte field: it absorbs light and renders its own nap, weave or pile (suede tooth, silk slub, velvet pile, satin drape) WITHOUT any metallic glint, so the bracelet remains the single specular event in the picture. Composite the seller's one uploaded bracelet so it sits PHYSICALLY ON the skin with real contact: a soft directional contact shadow where band meets wrist, a faint indentation/weight where it rests, correct occlusion of fabric behind the arm — never pasted-on, floating a hair above the skin, or sinking translucently into the cloth. Render it as ONE continuous closed circlet around a single wrist: the visible front arc plus the foreshortened far side read as the SAME one band curving around, never as two stacked bands. Keep every reference attribute exact — metal hue and finish, band width and profile, link/cuff/bangle geometry, any clasp or stone in identical count, cut and setting — and if the reference shows no clasp, invent none. Art-direct like a Hermès color study: a single confident gesture, the wrist placed on a rule-of-thirds line with a wide calm plane of pure color as negative space, the forearm entering on a graceful diagonal, the manicure a quiet tonal neutral. Cool clean highlights ride the metal against the warm or jewel-toned ground for deliberate color tension. One consistent wearer throughout — same skin tone, same hand, same nails — lit by soft raking daylight that keeps skin luminous and matte, never greasy or blown.",
        "extra_negative": "full body, full figure, whole person in frame, second forearm entering frame, second hand, two adorned wrists, both wrists bracketed, mirrored or duplicated arm, bracelet appearing twice, stacked twin bands reading as two bracelets, far side of band drawn as a separate bracelet, second band behind the wrist, fabric fold curling into a band shape around the wrist, velvet pile or suede nap rendered as shiny metal, satin or silk sheen competing with the bracelet highlight, specular hotspot on the fabric, bracelet hovering above the skin, no contact shadow, gap between band and wrist, bracelet sinking into or printed onto the cloth, translucent ghosted band, invented clasp where reference has none, watch crown or lugs, smartwatch, fitness band, charm dangling beyond reference, seventh finger, knuckle without a fingertip, fingertip without a nail, webbed or fused finger bases, bent-backward thumb, double wrist crease, two color fields splitting the frame, gradient or ombre fabric, patterned or printed fabric, wrinkled chaotic cloth hiding the wrist, hard shadow swallowing the metal, plastic doll skin, waxy fingers."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "A single forearm laid on a long diagonal across deep hot-pink suede that fills the entire frame as one unbroken saturated color field; soft daylight rakes the suede nap from the upper left so the matte tooth of the fabric reads while the bracelet stays the lone bright jewel on the pink.",
          "pose": "wrist relaxed and gently arched, the five fingers loosely curled and resting on the suede with clear separation between each, the one bracelet rolled to present its most flattering face toward the light, this wrist bare apart from the bracelet and no other hand in frame.",
          "composition": "medium_shot"
        },
        {
          "scene": "The same wearer's wrist set against cobalt-blue silk gathered into soft matte folds behind it, a saturated jewel-tone ground with no sheen competing for the eye, gentle window light; the cool metal of the single bracelet pops against the blue.",
          "pose": "forearm held vertical with the wrist turned three-quarters so the band's full continuous circumference reads as one closed circlet, the five fingers elegant and individually separated, palm angled softly inward, only this one wrist present.",
          "composition": "closeup"
        },
        {
          "scene": "Wrist and lower forearm resting on a fold of scarlet velvet, the deep matte red occupying most of the frame with a generous calm plane of color as negative space, warm soft light grazing the velvet pile without any metallic glint on the cloth.",
          "pose": "the hand draped over the lip of the velvet fold, all five fingers gently extended and slightly apart, the wrist relaxed downward so the single bracelet settles with believable weight and a soft contact shadow against the skin, no second hand anywhere.",
          "composition": "closeup"
        },
        {
          "scene": "A single forearm sweeping across emerald satin that drapes in long matte diagonals, the green filling the field as the sole color statement; directional daylight defines the satin's quiet sheen on the cloth while the bracelet remains the only specular highlight in the frame.",
          "pose": "the arm extended on a graceful diagonal with the hand open and the five fingers softly fanned and clearly separated, the wrist gently rotated to present the one bracelet broadside to camera, the limb otherwise bare and no other limb entering the frame.",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 25. RING SCARF PORTRAIT (editorial · ref-driven) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Ring Scarf Portrait",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 25,
    "rationale": "Editorial on-model try-on (scarf-portrait direction, from Hermès references) — bold art-directed worn campaign; piece reference-locked, anatomy hardened. Test-pool variant (consolidate winners into mood-param later).",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "Direction world = SILK SCARF PORTRAIT (face-visible Hermès register), hardened for both beauty and reliability. ONE coherent world: tonally-graded warm terracotta/marigold/burnt-orange ground + saturated large-scale-print heavy silk twill (hand-rolled edges, matte sheen) styled up near hair/cheek/shoulders. ONE consistent generated model in genuine soft-profile / three-quarter-away across all 4 shots — identity lock (nose/lip/brow/jaw/skin-tone/hair) and eye-render hardening (no third/extra/misaligned eye, no frontal stare, symmetric-natural) baked into both positive and negative; face is a generated face, not seller identity, so visibility is allowed. BEAUTY push: tonal gradient on the ground to avoid flat/clinical, couture carriage (elongated neck, sculptural hand, alive poise), real-skin texture vs. plastic-filter look, single specular hero. The 4 shots traverse one world by crop/angle: medium hand-to-jaw, tight face+hand closeup, medium hand-at-hairline with scarf swept up, full-body seated pulled-back. RING REFERENCE LOCK: exactly ONE ring on ONE finger of ONE raised hand, flush, identical to reference (metal/finish/proportions/stone count/cut/setting); stone turned face-on, no rotate-away/hide/float/clip/wrong-finger; no added bracelet/watch/bangle/second-jewel. Biggest closed loopholes for THIS direction: (1) scarf/fabric occluding, wrapping, touching, or mimicking the ring — explicit no-contact rule, fabric never crosses the ring finger; (2) second ringed hand from a 'hand adjusting scarf' read — single worn hand locked, shot-4 second hand bare/clean, only one ring in any frame; (3) full-body shot-4 anatomy/duplicate-jewel risk hardened. ANATOMY: five separated fingers, natural wrist, no fusion/web/extra/missing/floating/clawed, no mirrored/duplicate hand. Did NOT spend negative budget on text/logo/watermark (global SAFETY_NEGATIVE covers it). Distinct from already-built quiet themes (evening-luxe, soft daylight, golden-hour-skin, monochrome-noir, café, in-bloom): bolder, face-forward, saturated-warm, scarf-led. Engine flags: experimental + needs_human_review."
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
          "lighting:editorial_scarf_portrait",
          "color:editorial_bold_palette",
          "texture:skin_fabric_editorial",
          "context:campaign_hand_hero"
        ],
        "extra_positive": "Couture Hermès-register silk-scarf beauty portrait, art-directed not stocky: a single luxe color-graded world of terracotta, marigold and burnt-orange with subtle tonal gradient across the seamless (warmer near the light, deepening to amber-shadow opposite) so the ground reads sculpted, never flat or clinical. The printed silk is real heavy twill with hand-rolled edges, a confident large-scale equestrian-adjacent abstract print in saturated orange-and-cream, draped with editorial intention (clean folds, deliberate knot, soft sheen that stays MATTE relative to the jewel). ONE consistent model, locked identity across all four frames: same warm-bronze complexion, same dark hair, same brow and lip shape, same bare hands and short natural neutral manicure. Carriage is high-fashion: elongated neck, lengthened jaw line, lifted collarbones, a long graceful wrist and sculptural relaxed fingers — magazine-cover poise, alive and breathing, not a passport pose. Face kept in genuine SOFT PROFILE or three-quarter-away, lids softly lowered or gaze drifting off-frame, expression serene and self-possessed; skin luminous and real with fine pores and soft directional key-light wrapping the cheekbone, eyes and lips cleanly rendered and symmetrical-natural. The reference RING is the single specular hero on ONE finger of the ONE raised hand, flush to the skin, the band and stone catching one crisp warm highlight; everything else — silk, hair, skin — is soft, matte, secondary. Generous warm negative space, rule-of-thirds, intimate skin-forward editorial warmth, painterly daylight, true-to-reference jewelry, premium fashion-house campaign finish, photoreal.",
        "extra_negative": "scarf or fabric covering wrapping or touching the ring, silk fold passing over the ring finger, fabric knot or print motif shaped like a ring or stone, scarf occluding or mimicking the jewelry; ring rotated so the stone faces away or hides behind a finger, ring tilted off-axis, ring band gapping or floating above the skin, ring sliding to the wrong finger or knuckle, ring clipping into the jaw cheek hair or scarf; a second hand adjusting the scarf that also wears a ring, two ringed hands, mirrored or duplicated hand near the face, an extra arm or floating disembodied hand; identity drift between frames, different nose lips brow or jawline shot to shot, age or skin-tone shift, hair changing length or color; third eye, extra or missing or misaligned eye, asymmetric warped iris, lazy or crossed gaze locked to lens, melted cheek, distorted ear, warped teeth, plastic waxy airbrushed skin, beauty-filter sheen; stiff mannequin pose, tense claw hand, broken or doubled wrist, fingers fused or webbed, fingernails on the wrong fingers; second ring earring or pendant competing as a focal jewel, added bracelet bangle or watch on the worn wrist; flat dead-even ground with no tonal depth, muddy brown cast, cold blue or green color contamination, blown-out overexposed highlights crushing the print; glossy specular silk out-shining the stone, invented sparkle bloom halo or lens-flare on the gem; costume-y theatrical headwrap, cluttered styling, snapshot flash look, deformed amateur hands."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Warm golden-amber seamless with a soft tonal gradient deepening to one side; heavy orange-and-cream silk twill draped over both shoulders and styled up beside the cheek, the print glowing in soft directional window light.",
          "pose": "Elegant soft profile, face turned three-quarter away with lids lowered; the single ringed hand raised so fingertips rest lightly along the jaw, fingers gracefully separated, the reference ring turned face-on to catch one crisp warm highlight close to the cheek, wrist long and bare.",
          "composition": "medium_shot"
        },
        {
          "scene": "Tight on face-and-hand against the same amber ground, the twill scarf knotted softly at the throat with one clean fold rising toward the temple, print reading large and matte.",
          "pose": "Three-quarter-away beauty crop, chin gently dipped, gaze off-frame; the ringed hand grazes the air just beside the scarf near the temple WITHOUT the fabric touching it, fingers spread so the one ring on one finger reads cleanly and the stone faces the lens.",
          "composition": "closeup"
        },
        {
          "scene": "Sunlit orange-gold ground, the silk swept up over the crown of the hair with hand-rolled ends trailing past one bare shoulder.",
          "pose": "Soft profile, head turned away with the neck elongated and serene; the same ringed hand lifted near the hairline as if having just placed the scarf, fingers relaxed and separated, wrist bare, the single ring glinting near the top third of the frame, no fabric crossing the ring.",
          "composition": "medium_shot"
        },
        {
          "scene": "Pulled-back editorial portrait on the warm seamless with generous negative space to one side; the twill scarf cascading from the shoulders, full print on display, light wrapping the profile.",
          "pose": "Seated and angled three-quarter-away, gaze drifting down and off-camera, spine long and poised; one ringed hand resting at the collarbone framing the scarf with the ring as the clear focal jewel, the OTHER hand relaxed in the lap and completely bare and clean, only one ring in the entire frame.",
          "composition": "full_body"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 26. BRACELET SCARF PORTRAIT (editorial · ref-driven) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Bracelet Scarf Portrait",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 26,
    "rationale": "Editorial on-model try-on (scarf-portrait direction, from Hermès references) — bold art-directed worn campaign; piece reference-locked, anatomy hardened. Test-pool variant (consolidate winners into mood-param later).",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "Direction world: HERMÈS FOULARD SCARF PROFILE PORTRAIT for a BRACELET — bold, saturated, face-forward register distilled from the seller's Hermès scarf-styling reference, deliberately distinct from the already-built quiet themes (evening-luxe, soft daylight, golden-hour-skin, monochrome-noir, café, in-bloom). ONE coherent world: warm terracotta-to-amber seamless, golden-hour studio key + amber rim light, ONE printed rust/ochre/ivory foulard silk twill scarf, and ONE consistent generated model (warm olive-tan skin, dark swept-back hair, high cheekbones, serene off-frame gaze) held identical across all 4 shots. Face rule for this direction: face shown as elegant soft profile / three-quarter-AWAY with eyes carried off-camera and lashes lowered — never a flat frontal stare, never both eyes to lens; shots 1, 2, 4 face-visible, shot 3 cropped at the jaw for a tighter jewelry-forward beat. Because on_model_tryon composites only the PRODUCT, the face is generated and is NOT an identity leak. Shots vary pose/angle/crop within the one world: medium three-quarter at the cheek, soft profile at the collarbone, tight wrist-to-face closeup, wider full portrait framing the upper face. REFERENCE LOCK hardened: bracelet identical to reference in metal color/finish, link or cuff proportions, and any stone count/cut/setting; never restyle/recolor/resize/duplicate; keep reference TYPE (chain stays chain, cuff stays cuff); exactly ONE bracelet on ONE wrist, flush with contact shadow, NEVER invent a watch, no second bracelet, no bangle/cuff stack, worn wrist otherwise bare. New holes closed vs. draft: (1) shot 4's supporting hand is now explicitly bare, empty, and watch/ring/bracelet-free to kill the most likely second-piece leak; (2) sleeves pushed clear of the wrist so a cuff/sleeve can't cover or clip the bracelet; (3) hair and silk explicitly must not occlude the bracelet at the wrist-to-jaw poses; (4) added negatives against invented necklace/earrings/brooch/rings near the face since a face-forward portrait invites competing jewelry; (5) reinforced that scarf knots/folds must not mimic a bracelet at the wrist; (6) full_body bracelet kept large enough to read so it isn't lost in the wide frame. Anatomy guards: five separated fingers per visible hand, natural wrist, no fused/extra/missing/floating/clawed/webbed/duplicated/mirrored hands, no doubled wrist. Jewelry is the ONLY specular hero — matte silk + matte backdrop, no invented sparkle/halo/flare/bloom on the metal. Did NOT spend negative budget on text/logo/watermark (global SAFETY_NEGATIVE covers that). Engine flags: experimental + needs_human_review (face-visible try-on). 4:5 vertical, on_model_tryon, nano-banana, image_set of 4, ◈5."
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
          "lighting:editorial_scarf_portrait",
          "color:editorial_bold_palette",
          "texture:skin_fabric_editorial",
          "context:campaign_wrist_hero"
        ],
        "extra_positive": "Couture maison foulard-portrait register: the printed silk is a true Hermès-grade equestrian/cavalry foulard twill — fluid saturated motif in rust, burnt ochre, ivory and a thread of cobalt, with a defined scarf border catching a liquid sheen as it drapes. The single consistent model has a luminous warm olive-tan complexion, fine natural skin texture with visible pores and soft peach-fuzz down (never airbrushed plastic), high cheekbones, dark brows, and dark hair swept back off the face the same way in every frame. Her expression is serene and self-possessed, lips relaxed, lashes lowered, gaze carried gently off-frame to the side or down — the poise of a fragrance campaign, not a catalog stand. Cinematic golden-hour studio lighting: a warm directional key skimming across the cheekbone and jaw, a soft amber rim/edge light separating her profile and hair from the seamless, gentle falloff into a rich terracotta shadow side, color grade warm and filmic with creamy highlight roll-off. The braceleted wrist is lifted with deliberate grace so the forearm makes a clean elongated line and the bracelet sits in the foreground plane right beside her face, in crisp focus, the metal reading as real weight with believable specular highlights, micro-reflections of the warm set, and a soft contact shadow against the skin — the one true sparkle in the frame. Elegant tapered fingers, immaculate bare-or-nude manicure, graceful relaxed wrist. Editorial 4:5 vertical, generous breathing negative space, rule-of-thirds placement of face and wrist, shallow-to-medium depth so the bracelet stays sharp; Vogue/Hermès campaign finish, gallery-grade art direction.",
        "extra_negative": "second bracelet on the other wrist, bracelet on the bare supporting hand, mirrored bracelet, twin matching bracelets, invented wristwatch or smartwatch on either wrist, cuff added beside the bracelet, anklet, invented necklace choker or pendant competing near the face, invented earrings or ear cuff, brooch pinned to the scarf, rings added to fingers, scarf knot or twist or fabric fold shaped like a bracelet at the wrist, sleeve cuff or sweater cuff covering or clipping the bracelet, hair strand or silk fold occluding the bracelet, bracelet sliding off or hovering off the wrist, doubled wrist, two left hands, two right hands, mannequin pose, stiff catalog stance, vacant model, smiling toothy grin, model facing camera straight on, both eyes locked to lens, three-quarter-toward instead of away, glassy lifeless eyes, waxy CGI skin, over-smoothed retouched skin, different woman in each shot, hair restyled between shots, complexion shifting lighter or darker between shots, scarf print changing pattern or color between shots, oversaturated clipping orange, flat dull grey lighting, muddy underexposed shadows hiding the bracelet, neon plastic backdrop, bokeh sparkle confetti, lens flare or glow bloom on the metal, shrunken illegible bracelet lost in a wide frame, cropped-off feet or awkward leg proportions, gangly elongated limbs, dislocated thumb, webbed fingers."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Warm terracotta-to-amber gradient seamless under golden-hour studio light, soft amber rim light edging her profile; the printed rust-ochre-ivory Hermès foulard silk twill drawn up beside her cheek and swept-back dark hair, its sheen catching the key light, the matte seamless behind.",
          "pose": "The one consistent olive-tan model in a graceful three-quarter-away view, face turned into the light with lashes lowered and gaze carried off-frame; the bracelet-wearing forearm lifted in a clean elongated line so the hand settles lightly at her jaw, fingertips just grazing the silk without covering the wrist, the single bracelet sitting flush at the wrist in the sharp foreground plane right beside her face, catching the warm key as the only specular accent.",
          "composition": "medium_shot"
        },
        {
          "scene": "Same model, same warm amber ground, same foulard scarf now looped softly over one bare shoulder near the collarbone; warm key skims silk and skin, gentle terracotta shadow on the far side.",
          "pose": "Clean soft profile, chin dipped slightly, gaze off-frame; she draws the scarf edge upward with the braceleted wrist raised near her collarbone, forearm elegant and elongated, exactly five clearly separated relaxed fingers, the supporting region bare, the single bracelet flush to the skin with a soft contact shadow and crisp believable metal reflections as the hero — silk never folding into a bracelet shape at the wrist.",
          "composition": "medium_shot"
        },
        {
          "scene": "Tighter warm-lit beat, terracotta ground softly blurred, only the foulard silk folds and a sliver of cheekbone and lowered lashes in frame so the wrist-to-face geometry is the subject.",
          "pose": "Cropped at the jaw, three-quarter-away, the raised hand and wrist brought close to the face so the bracelet anchors the sharp foreground; natural relaxed fingers resting against the silk, no hair or fabric crossing the bracelet, every link/stone/finish detail crisp and identical to the reference, the warm light catching only the metal.",
          "composition": "closeup"
        },
        {
          "scene": "Wider editorial portrait on the amber gradient seamless, full foulard scarf styling visible up around her hair and shoulders, generous negative space to one side, warm rim light tracing her silhouette.",
          "pose": "The same model seated tall in elegant soft profile, one arm lifted to arrange the scarf near her temple so the braceleted wrist frames the upper face and the bracelet stays large enough to read clearly; the other, supporting hand rests bare and anatomically clean and visibly empty — no bracelet, no watch, no ring — only that one wrist wears the piece; posture composed and statuesque, sleeves pushed clear of the wrist.",
          "composition": "full_body"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 27. RING INTIMATE (editorial · ref-driven) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Ring Intimate",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 27,
    "rationale": "Editorial on-model try-on (intimate-touch direction, from Hermès references) — bold art-directed worn campaign; piece reference-locked, anatomy hardened. Test-pool variant (consolidate winners into mood-param later).",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "DO NOT spend negative budget on text/logo/watermark — global SAFETY_NEGATIVE covers it. DIRECTION = INTIMATE TOUCH: a warm, sensual, skin-forward ring try-on distilled from the warm-skin Hermès refs (terracotta/amber ground, golden-gradient skin, sensual touch), deliberately distinct from the six built quiet themes (evening-luxe/Editorial Campaign, soft daylight, golden-hour-skin, monochrome-noir, café, in-bloom) and from the neutral Ring on Finger split. The whole frame reads warm and skin-toned but MUST stay matte so the ring is the sole specular hero; the terracotta ground is a deliberate color-block with sculpted key+deep-warm-shadow modeling — reject flat, evenly-lit, low-contrast or muddy-desaturated renders as off-brief (beauty failure), not just anatomy. FACE RULE for THIS direction: face cropped at/below the jaw on all 4 shots (intimate/skin-forward = NO visible-face exception; that exception is reserved for the scarf-portrait template). Verify no eyes/lips/nose/mouth/full face anywhere, including no defocused eye or lip leaking at a frame edge, and no face reflected in the metal/stone. QA priority order: (1) SHOT 4 LANDMINE — the two-hand clasp is the single highest regression risk: confirm exactly ONE ringed hand and that the OTHER hand is fully bare with NO band on any finger (especially its own ring finger), the two hands are opposite-handed and the SAME wearer (same skin tone + manicure), both wrists bare, no third/helper/ghost hand. (2) REFERENCE LOCK — band identical to the seller's piece (metal color/finish, width/proportions, stone count/cut/setting/orientation); reject any restyle/recolor/resize (the tryon compositor tends to solitaire→halo, prong→bezel, rose→yellow); confirm the band is a closed 3D loop (thickness + contact shadow, outer surface only) — reject C-shape, seam, visible inner edge, or single→double band. (3) METAL-HUE PRESERVATION under warm light — verify the amber ambient did NOT cool/silver/desaturate the metal; neutral-to-warm fill only. (4) PER-SHOT EDGE-FINGER COUNT — Shot1=2, Shot2=2, Shot3=1 fully-complete finger, Shot4=both hands fully separated; any extra/partial/blur-fading finger at an edge is an auto-reject; single-knuckle bends only. (5) SINGLE-WEARER CONSISTENCY across all 4 (skin tone, bare manicure, hand identity, warm light direction) — reject if it reads as different hands. (6) SPECULAR DISCIPLINE — ring is the ONLY sparkle; skin and ground matte, no invented halo/flare/glint, no glossy/oily skin sheen, no blotchy speckle reading as gemstones. (7) BARE-LIMB CHECK — the touched forearm/collarbone/shoulder and the worn wrist carry no other jewelry; no invented bracelet/watch. (8) TOUCH PHYSICS — skin-on-skin is weightless and undisturbed; reject flesh-pinch/compression where the hand presses, and reject the band biting/floating. Flags: experimental, needs_human_review — route every batch to a human pass before publishing."
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
          "lighting:editorial_intimate_touch",
          "color:editorial_bold_palette",
          "texture:skin_fabric_editorial",
          "context:campaign_hand_hero"
        ],
        "extra_positive": "elegant on-model ring try-on in an INTIMATE-TOUCH register — a warm, sensual, skin-forward Hermès-grade campaign of one ring worn during a tender close gesture; shot at 85mm f/2.8 with soft rolling shallow depth of field and the ring held tack-sharp. ONE consistent wearer across all four images: the same warm golden-amber skin tone, the same bare short natural manicure (buffed nude, no bright polish, no long or acrylic tips), the same hand identity and the same warm light direction throughout, reading unmistakably as one single person, not four. The register is a tender close touch where the ringed hand rests gently on the wearer's OWN bare skin — the opposite bare forearm, a bare collarbone or a bare shoulder — the touch soft and weightless with the skin undisturbed and uncompressed, quiet emotion, intimacy without strain. ART DIRECTION (bold, not generic): a deliberate warm color story — a saturated terracotta-to-amber seamless ground treated as a single matte color-block so the warm skin sits as the subject against intentional warm negative space, rule-of-thirds with the ring on a power point; one sculpted directional warm window key grazing low across the skin to model form, falling into a soft deep-warm shadow on the opposite side for tonal depth and editorial drama (never flat, never evenly-lit stock). LIGHTING/COLOR LOCK: a neutral-to-warm bounce fill (never a cool silver fill) so the reference metal hue is preserved EXACTLY — warm yellow gold stays warm gold, white metal stays neutral, rose gold stays rose, with no silver/cool drift induced by the amber ambient. SKIN: bare living skin with fine pores, soft peach-fuzz, subtle subsurface warmth and a gentle even tone, matte and never plastic, waxy, airbrushed or doll-like, and never blotchy or mottled in a way that could read as gemstones. ANATOMY of the ringed hand: ONE single natural well-formed hand; only the fingers actually inside the crop are shown, each a fully separate distinct digit with a clean visible gap of skin to its neighbor, naturally tapered with a relaxed believable curve, smooth continuous unbroken contours, intact knuckle joints that bend the natural way at a SINGLE knuckle only with all other joints relaxed, one short clean nail per visible fingertip sitting flat on the dorsal side and growing straight forward; the thumb relaxed and kept out of frame unless a relaxed clasp naturally shows it. THE RING (reference lock): exactly ONE ring on exactly ONE finger, seated snugly just below the knuckle as a real three-dimensional metal band with genuine thickness, a visible outer surface and a soft contact shadow on the skin, the finger keeping its natural shape with no pinch and no bulge; the band is a fully closed continuous loop showing ONLY its outer surface with no inner edge, seam or open end; the stone and setting oriented exactly as in the reference facing the camera with prongs resting cleanly on the skin. THE PIECE IS IDENTICAL TO THE UPLOADED REFERENCE — same metal color and finish, same band width and proportions, same stone count, cut, setting and orientation — never restyled, recolored, resized, duplicated or invented. The ringed hand's own wrist and the touched limb (forearm, collarbone, shoulder) are otherwise COMPLETELY BARE, carrying no other jewelry; no second ring on any neighboring finger. WHERE TWO HANDS GENTLY CLASP OR OVERLAP: only ONE hand wears the single ring on its single finger, and the other hand is ENTIRELY bare — its own ring finger and every finger bare of any band — anatomically clean, clearly a second relaxed hand of the SAME wearer with the same skin tone and manicure, the two hands of opposite handedness fitting together naturally, all fingers of both hands separated by clear skin gaps. The ring is the ONLY specular hero and the only source of sparkle anywhere in the frame; the warm skin and warm ground stay soft and matte with no competing glints, no invented sparkle, halo, flare or glint on the skin or the background. The wearer's face is kept fully out of frame — cropped at or below the jaw — with no eyes, no lips, no mouth, no nose and no full face anywhere, even where skin is softly defocused near a frame edge. True-to-life warm skin and metal white balance, refined editorial campaign finish, natural professional retouching that keeps the skin real.",
        "extra_negative": "six fingers, four fingers on one hand, extra finger entering frame, partial or sliced finger at the crop edge, third finger intruding at an edge, stub or amputated finger, finger fading or blending into blur or background, floating finger detached from the hand, missing fingertip, extra knuckle segment, extra phalange, finger with too many or too few joints, finger bending at more than one joint, reverse-bend or backwards finger, claw or talon fingers, hooked rubbery boneless fingers, sausage or plump rubbery fingers, uneven finger thickness, warped doubled or dislocated knuckle, fused melted webbed or merged fingers, fingers blending together with no skin gap, mitten fingers, second ringed hand, ring on both hands, two hands each wearing a ring, a band on the bare hand's ring finger, duplicate or mirrored ghost hand, third hand, helper hand holding the piece, phantom extra arm or forearm, two hands of the same handedness clasped, mismatched skin tone between the two clasped hands, stray fingers from nowhere, thumb bending unnaturally, extra thumb, missing fingernail, double fingernail, nail on the wrong side or on a knuckle, nail pointing sideways or backward, spoon-shaped or curled-over nail wrapping the fingertip, talon-length nails, two rings, extra ring on a neighboring finger, ring duplicated on the other hand, second band, stacked rings where one is shown, single band split into two stacked bands or doubled grooves, open-ended or C-shaped band, gap in the band, unclosed ring, inner edge or seam of the band visible, painted-on flat ring, ring as a 2D stripe, band with no thickness, doubled or ghost band, ring sliding loose or hanging off, oversized loose band, ring biting in with skin bulging over the band, muffin-top flesh around the band, ring floating above the skin, gap between band and skin, band clipping through or sinking into the finger, ring resting on top of the knuckle, restyled setting, added or removed halo, changed prong or bezel type, invented engraving, gemstone color changed from reference, gemstone shape or cut changed, wrong stone count, missing or extra stones, metal color shift, gold turning white silver or rose, cooled or desaturated metal cast from the warm light, distorted or warped jewelry, duplicated piece, invented bracelet watch or second piece on the bare wrist, any extra jewelry on the touched forearm collarbone or shoulder, full face, eyes, eyes to camera, lips, mouth, nose, chin past the crop, full or frontal face, defocused eye or lip leaking at the frame edge, reflected face in the metal or stone, invented sparkle halo flare or glint on the skin or background, competing speculars or sheen off the skin, glossy oily skin, harsh shadows obscuring the ring, flat evenly-lit lighting with no shadow modeling, washed-out low-contrast frame, plastic waxy oversharpened airbrushed or mannequin skin, doll hand, blotchy mottled skin read as stones, gemstone-like speckle on the skin, bulging wormlike veins, knuckle hair tufts, mismatched skin tone across the set, inconsistent nail state across the set, dull muddy desaturated terracotta, cluttered props, sculptural prop or fabric mimicking or occluding the ring, stray jewelry on the skin or surface"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "saturated terracotta-to-amber matte seamless treated as a single warm color-block, one low grazing window key raking across the skin from frame-left into a soft deep-warm shadow on the right for editorial tonal depth, neutral-to-warm bounce fill so the metal hue stays true, softly defocused ground — the ringed hand laid tenderly across the wearer's own bare opposite forearm, fingertips relaxed and weightless on warm skin with a soft contact shadow, generous warm negative space held on the right, sightline kept well below the jaw with no face in frame",
          "pose": "ringed hand laid gently over the bare opposite forearm on a power point of the thirds grid, the ringed finger nearly straight and angled slightly toward camera so the stone faces up and catches the one clean specular, exactly two fingers of the ringed hand fully in frame and clearly separated by a skin gap, the band sitting just below the knuckle, thumb out of frame, the touched forearm completely bare and carrying no jewelry",
          "composition": "closeup"
        },
        {
          "scene": "warm amber interior with creamy shallow bokeh, golden window light raking low across bare skin into soft warm falloff, matte terracotta-toned ambient with intentional empty warm space upper-frame — the ringed hand raised to rest at the wearer's own bare collarbone, skin-on-skin and weightless, the face hard-cropped above the jaw so no eyes, lips, nose or mouth read even in soft defocus",
          "pose": "ringed hand resting gracefully at the bare collarbone, fingers long relaxed and separated with one finger gently bent at a single knuckle only and all other joints relaxed, viewed at a slight three-quarter so the closed outer band wraps the finger and reads as a 3D ring with a contact shadow, exactly two adjacent fingers in frame with a clear gap, bare neck and shoulder otherwise completely unadorned",
          "composition": "medium_shot"
        },
        {
          "scene": "near-macro on warm bare skin, soft directional golden light grazing to sculpt the band against a deep-warm shadow side, terracotta-toned shallow background — an intimate tight crop of just the single ring on the relaxed ringed finger pressed lightly to the bare shoulder, the ring the only specular hero in a soft matte warm field with no competing skin sheen",
          "pose": "the one ringed finger relaxed and laid against bare shoulder skin viewed slightly from the front, the closed outer band and the upward-facing stone clearly readable with a soft band-to-skin contact shadow and one natural knuckle crease, the whole finger anatomically complete within frame with no edge finger and no thumb, the shoulder bare of any jewelry",
          "composition": "closeup"
        },
        {
          "scene": "warm soft daylight on a matte warm surface, an intimate two-hand clasp resting near a terracotta-amber ambient with shallow depth — a tender soft clasp where ONLY one hand wears the single ring and the other hand is entirely bare and anatomically clean, the quiet emotion of overlapping hands of the same wearer, face fully out of frame, the ring catching the warm key as the sole sparkle",
          "pose": "the ringed hand and the bare opposite hand of the same wearer gently overlapping and clasped on the surface, the two hands of opposite handedness fitting together naturally; only the ringed hand carries exactly one ring on one finger seated just below the knuckle, the bare hand clearly a separate relaxed clean hand with five natural separated fingers and NO band on any finger including its own ring finger, every finger of both hands separated by visible skin gaps, both wrists bare, the ring the only catch of light",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 28. BRACELET INTIMATE (editorial · ref-driven) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Bracelet Intimate",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 28,
    "rationale": "Editorial on-model try-on (intimate-touch direction, from Hermès references) — bold art-directed worn campaign; piece reference-locked, anatomy hardened. Test-pool variant (consolidate winners into mood-param later).",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "Engine nano-banana, on_model_tryon: composite the seller's ONE uploaded bracelet onto a generated model, kept IDENTICAL to the reference (metal color/finish, width, link/cuff/chain construction, single clasp, stone count/cut/setting, reference TYPE preserved — chain stays chain, solid stays solid). 4-shot image_set, 4:5, ◈5. Flag experimental + needs_human_review.\n\nDIRECTION = INTIMATE TOUCH in the BOLD Hermès register, deliberately distinct from the six built quiet themes (evening-luxe, soft daylight, golden-hour-skin, monochrome-noir, café, in-bloom): it goes skin-forward and warm-SATURATED — one deep terracotta/honey-amber/ember ground per frame as color-blocked editorial statement, not neutral. Color is pushed (lacquered/suede matte saturated ground vs glowing bare skin) so it reads campaign, not stock/clinical.\n\nFACE RULE (intimate/hand-focused direction): face cropped at the jaw or dissolved softly out of focus in ALL four shots — never frontal, no eyes to camera. No identity exposure needed here, so we lean fully into hands + skin.\n\nComposition note: the widest shot (shoulder curve) is intentionally a tight skin-forward crop, NOT a full figure — set to medium_shot because the schema enum lacks a tighter wide option; render notes pin it as shoulder-and-hand only.\n\nTHE TWO-HAND CLASP (shot 3) is the highest-risk frame — guard it hardest: ONLY the lower wrist wears the bracelet, the upper hand is fully bare (no bracelet/ring/watch/charm), two distinct correctly-oriented hands, ten fingers total accounted for, no third hand, no mirrored/duplicated hand.\n\nReliability: negative budget spent only on real failure modes for this direction — duplicate/stacked bracelet, invented watch, recolor/restyle/resize/type-conversion, clasp/stone tampering, floating/clipping/no-contact-shadow, hand & finger anatomy, sleeve/fabric/glove occluding the wrist, prop mimicking the piece, frontal stare, inconsistent faces/skin across shots, invented sparkle/halo, plastic/waxy skin. SAFETY_NEGATIVE handles text/logo/watermark — none spent here. Metal is the sole specular hero on matte warm grounds; no second competing light source or glossy background."
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
          "lighting:editorial_intimate_touch",
          "color:editorial_bold_palette",
          "texture:skin_fabric_editorial",
          "context:campaign_wrist_hero"
        ],
        "extra_positive": "HERMÈS-GRADE INTIMATE TOUCH, skin-forward campaign. Color is the whole statement: ONE deep saturated warm ground per frame — true terracotta, honey-amber, or soft ember clay — rendered as a clean lacquered editorial seamless or matte suede, color-blocked against glowing bare skin so the wearer reads as a sculpture of warm tones. Cinematic low-key raking light grazes smooth bare skin at a shallow angle, sculpting the forearm, collarbone and shoulder with a soft falloff into rich warm shadow and generous negative space. Shallow depth of field, the braceleted wrist in crisp focus while jaw/shoulder melt softly out of focus. Quiet sensual emotion, a held breath of stillness, tactile intimacy.\n\nREFERENCE-LOCKED PIECE: exactly ONE bracelet, IDENTICAL to the uploaded reference — same metal color and finish (gold stays gold, silver stays silver, never recolored), same width, link/cuff/chain construction, same single real clasp, same stone count, cut and setting. It is the ONLY specular hero on the matte warm ground, with crisp faithful metal reflections and accurate facets. Believable weight: it settles, drapes and tilts naturally with gravity against one wrist, sitting FLUSH to living skin with a soft true contact shadow at every point of contact, no gap, no float, no clip-through. The reference TYPE is preserved exactly (a chain stays an open chain, a solid cuff stays solid — never converted).\n\nONE consistent wearer across all four shots: same warm even skin tone, same fine pores and natural skin grain, same minimal bare or nude-neutral manicure, same forearm and hand. Every visible hand has exactly five natural, separated, correctly jointed fingers and one thumb on a natural untwisted wrist. The braceleted wrist is otherwise completely bare — no watch, no second bracelet, no bangle, no stacked piece. Any opposite or touching limb is bare skin only: no sleeve, no cuff, no fabric, no jewelry of any kind. Face cropped at the jaw or dissolved softly out of focus in every frame — never a frontal eyes-to-camera stare. Refined film tonality, true-to-life luminous skin, rule-of-thirds with real negative space, framing tight enough to keep all anatomy controlled. 4:5. The jewelry is the hero, flush against warm living skin.",
        "extra_negative": "two bracelets, bracelet on both wrists, second braceleted wrist in frame, stacked bracelets, added bangle, layered cuff, bracelet duplicated or mirrored, any bracelet or ring or jewelry on the bare or touching hand, jewelry on the upper hand in the two-hand clasp; invented wristwatch, watch face, watch dial, watch strap, smartwatch; invented charm, pendant, extra link, extra clasp, second clasp; recolored metal, restyled metal, resized metal, finish altered, gold turned to silver, silver turned to gold, matte turned glossy; stones added, stones removed, stones recut, setting changed, clasp altered or relocated; chain converted to solid cuff, solid cuff converted to chain, open bracelet closed or closed bracelet opened; floating bracelet, hovering bracelet, gap between bracelet and skin, bracelet clipping through skin, no contact shadow, bracelet melting into skin; sleeve, fabric cuff, glove, fabric or hand or finger occluding or hiding the bracelet, prop or strap mimicking or doubling the bracelet; six fingers, seven fingers, four fingers, fused fingers, webbed fingers, extra thumb, two thumbs, missing finger, missing thumb, floating detached fingers, clawed fingers, bent-backward fingers, broken or twisted wrist, double wrist, duplicated hand, mirrored hand, third hand, melted or smeared knuckles; frontal face, eyes to camera, direct stare, two different faces across the four shots, inconsistent skin tone across shots, uncanny distorted asymmetric or melted face; invented sparkle, starburst, halo, bloom, lens flare or glow on the metal or stone; harsh flat frontal lighting, plastic skin, waxy oversmoothed skin, blown-out highlights on skin, busy patterned or glossy competing background, second light source competing with the metal highlight."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Deep terracotta lacquered seamless glowing behind bare skin, color-blocked editorial register; soft ember light rakes low across the skin with rich warm shadow falling into negative space on the left, shallow depth. The braceleted forearm crosses the frame diagonally and the hand rests tenderly on the OPPOSITE bare forearm, fingertips just grazing skin — the opposite forearm is bare skin only, no sleeve, no jewelry.",
          "pose": "Braceleted wrist angled three-quarters to camera so the bracelet's face, links and single clasp read clearly and sit FLUSH with a visible contact shadow where the band meets the wrist; fingers softly curved, separated, exactly five with one natural thumb, resting lightly on the bare forearm; the opposite forearm carries no bracelet, no watch, no ring.",
          "composition": "medium_shot"
        },
        {
          "scene": "Honey-amber low-key ground, single saturated tone, deep warm shadow falling off to generous negative space above; intimate close register on the wrist meeting a bare collarbone, skin luminous and matte, jaw cropped out of frame.",
          "pose": "Hand raised to cup gently at the bare collarbone, braceleted wrist gracefully bent so the bracelet drapes naturally with gravity and catches a single clean specular highlight — it wraps the curved wrist flush with no gap and no clip-through; exactly five separated fingers and one thumb, wrist otherwise bare, no second band.",
          "composition": "closeup"
        },
        {
          "scene": "Soft ember-clay gradient on bare skin, jaw and shoulder dissolving softly out of focus; tender two-hand register where the hands overlap on warm skin. ONLY the LOWER hand's wrist wears the bracelet; the UPPER hand is completely bare — no bracelet, no ring, no watch, no charm.",
          "pose": "Two hands gently clasped and overlapping on warm skin, the LOWER braceleted wrist resting underneath flush to skin with a soft contact shadow, the single clasp visible; the UPPER bare hand laid softly over it with zero jewelry; both hands each show exactly five separated fingers and one thumb, natural joints, no fused or mirrored fingers, two distinct correctly-oriented hands only.",
          "composition": "closeup"
        },
        {
          "scene": "Warm honey light wraps a bare shoulder and the inner forearm against a single saturated ember ground, real negative space above the shoulder line; the most skin-forward, sensual and still frame, tightly cropped to the shoulder and raised hand, not a full figure.",
          "pose": "Braceleted hand curved over the bare shoulder, forearm near-vertical so the bracelet's full silhouette, weight and clasp read against the shoulder line, draping flush to the curved skin with a true contact shadow and no float; jaw softly out of focus at the top edge with no eyes to camera; wrist bare except the ONE bracelet, shoulder bare skin with no strap or fabric.",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 29. EARRING CAMPAIGN (editorial earring) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Earring Campaign",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 29,
    "rationale": "Editorial earring on-model try-on (Campaign) — face/profile-forward campaign, single ear, type-agnostic reference-lock (renders the uploaded earring across all 4 shots). Aspirational counterpart to the clinical Earring on Ear PDP crop. Test-pool variant.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "Engine nano-banana, 4:5, image_set of 4, reference_strategy=on_model_tryon — composite the seller's ONE uploaded earring and keep it byte-for-byte identical (type, length, silhouette, metal, stones, setting) across all 4 shots; ONLY camera angle/crop/gesture vary. The model's face is GENERATED (not an identity leak) but must be ONE consistent woman across all 4 frames — same face, skin tone, hair. ◈5. Global SAFETY_NEGATIVE already covers text/logo/watermark — none added here. Hardening focus this pass: (1) TYPE-AGNOSTIC ref-lock restated in extra_positive AND implied in every shot (no shot names stud/hoop/drop); extra_negative blocks every per-shot restyle and the morph loophole. (2) ONE ear / ONE earring enforced positively AND via the second-ear-by-reflection/mirror loophole now explicitly killed. (3) Earring-to-lobe ATTACHMENT hardened — post seated in the single hole, not floating/fused/gapped; drop hangs plumb. (4) Lobe integrity — no stretched/gauged lobe, no double hole. (5) Hands now excluded POSITIVELY ('hands out of frame') in every shot and in negatives (no hand/fingers/ring near ear). (6) Face consistency locked as 'same woman, rendered identically frame to frame' with twin/two-faces negatives. (7) Shot 4 'full_body' reframed as a tight seated neck-and-shoulder profile cropped at the shoulder so the schema's full_body slot cannot pull the camera back into a speck-earring wide shot inviting a second ear/torso/hands; negative 'wide shot losing the earring' backstops it. Flags: experimental + needs_human_review (face rendering + reference fidelity must be human-checked before publish)."
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
          "lighting:editorial_earring_campaign",
          "color:editorial_profile_palette",
          "texture:skin_hair_editorial",
          "context:campaign_ear_hero"
        ],
        "extra_positive": "FLAGSHIP QUIET-LUXURY EARRING CAMPAIGN, Hermès-grade editorial beauty: one single uploaded EARRING worn on-model, the earring the clear and only jewel of the story. ONE CONSISTENT GENERATED MODEL across all 4 frames — the SAME face, same warm fair complexion, same softly defined brow and lip, same dark hair swept back and tucked behind the visible ear — rendered identically frame to frame, never a different woman per shot. She is presented only in elegant SOFT PROFILE or THREE-QUARTER-AWAY registers that reveal exactly ONE ear cleanly; gaze always soft and off-lens toward the horizon or gently downcast, never a flat frontal stare, never both eyes locked to camera. REFERENCE LOCK, TYPE-AGNOSTIC: composite the ONE uploaded earring and keep it ABSOLUTELY IDENTICAL in every shot — same type, shape, length, silhouette, drop or stud profile, metal color and finish, same stone count, cut, color and setting — the ONLY thing that changes between shots is camera angle, crop and gesture. Whatever the reference earring is, all four shots show THAT exact earring, never reinterpreted. ONE EAR, ONE EARRING: exactly one earring on one natural ear lobe, secured through one single natural pierced hole with the backing implied behind the lobe, the metal post or hook seated cleanly INTO the piercing — not floating in front of the lobe, not fused into the flesh, not clipped on unless the reference is a clip. If the earring is a drop or hoop it hangs plumb to gravity, swinging free and fully clear of the jaw, neck and hair. EAR + FACE ANATOMY: one anatomically correct natural ear with clean helix, antihelix, tragus and a soft un-stretched lobe, smooth lobe-to-jaw transition; a natural, symmetric, beautifully rendered profile face with realistic editorial skin, fine pores, no plastic sheen. The earring is the SINGLE specular hero catching a soft directional key with a precise true-to-life metal-and-stone reflection; skin, hair and any fabric stay matte and non-competing — no invented sparkle, no halo, no second light source on the stone. Cinematic high-jewelry lighting: a soft directional key with a gentle wraparound fill and a whisper of rim to separate the lobe from the hair, creamy seamless studio-to-warm tones, luminous editorial skin, medium-format depth, fine grain, gallery-grade color grading, genuinely aspirational rather than clinical. Refined negative space and rule-of-thirds composition with the earring landing on a power point in every frame.",
        "extra_negative": "second earring, matching pair of earrings, earring on both ears, earring on the far ear, two ears visible, both ears in frame, second ear showing, ear reflected in a mirror, ear shown in a reflection, mirror image of the face, extra piercing, multiple piercings, cartilage piercing, helix piercing, conch piercing, tragus piercing, industrial piercing, second hole in the lobe, double lobe piercing, stacked earrings, ear cuff, stretched lobe, gauged ear, plug, tunnel, earring type changed, swapped silhouette, restyled stones, reinterpreted earring, invented gemstone, added stone, removed stone, altered metal color, altered finish, hoop changed to stud, stud changed to drop, drop changed to hoop, different earring in each shot, inconsistent earring between frames, earring morphing, extra sparkle, fake sparkle, lens-flare glint, glowing stone, halo around the stone, bloom on the jewel, invented gem on the skin, stray gems on the cheek, gem on the jaw, necklace, choker, jewelry on the neck, ring on a finger, bracelet, multiple models, different woman per shot, two faces, twin, inconsistent face, face changes between frames, changed skin tone, changed hairstyle, uncanny face, melted face, waxy skin, plastic skin, asymmetric eyes, crossed eyes, distorted features, extra eye, flat frontal dead stare, eyes locked to camera, both eyes wide to the lens, staring into camera, malformed ear, fused ear, webbed ear, extra ear, deformed lobe, lobe fused to jaw, earring floating off the lobe, earring fused into the flesh, post not in the hole, gap between earring and lobe, clip-on when reference is pierced, hair covering the earring, hair strand crossing the stone, scarf occluding the earring, collar hiding the lobe, prop in front of the earring, fabric mimicking the earring shape, hand near the ear, fingers touching the ear, hand in frame, extra hand, malformed fingers, two faces in frame, blurry earring, soft-focus jewelry, motion blur on the earring, harsh specular blowout on the skin, oversharpened, HDR halos, cluttered background, busy props, distracting set, full body crowding, wide shot losing the earring."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Clean seamless studio in soft cream light, generous refined negative space to camera-left, a hush of warm rim separating the lobe from the dark hair — the campaign hero frame.",
          "pose": "Elegant soft profile facing camera-left, chin level and serene, dark hair smoothly swept back and tucked behind the visible near ear so the single earring on that one lobe reads cleanly and hangs free of the jaw; gaze soft toward the horizon, never to the lens, hands out of frame.",
          "composition": "medium_shot"
        },
        {
          "scene": "Warm low-key editorial set with a gentle amber key and creamy fall-off, intimate quiet-luxury mood, smooth gradient backdrop.",
          "pose": "Three-quarter angle turned away from camera, face rotating toward camera-right with eyes gently downcast and away, hair lifted and pinned high off the neck to expose only the one ear; the single uploaded earring catches the warm key as the lone jewel, hanging plumb and clear, no hands in frame.",
          "composition": "medium_shot"
        },
        {
          "scene": "Tight luminous detail of one ear and the jawline against a soft seamless tone, the earring sitting on a rule-of-thirds power point and catching a crisp directional key with a true reflection.",
          "pose": "Close profile crop on the single near ear and jawline, head tilted a few degrees so the one earring swings plumb and fully free of jaw and neck, a few wisps of hair softly framing the face but never crossing the stone; the post seated cleanly in the single piercing.",
          "composition": "closeup"
        },
        {
          "scene": "Graceful neck-and-shoulder profile against a calm soft gradient, airy editorial negative space above the head, the lit neckline as a clean matte stage for the jewel.",
          "pose": "Seated-tall profile cropped at the shoulder, neck elongated and shoulder dropped away from camera, head in a soft three-quarter-away turn with hair swept fully off the near shoulder to bare the single ear; the one earring hangs clean against the lit neckline as the only specular hero, no second ear and no hands in view.",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 30. EARRING GOLDEN HOUR (editorial earring) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Earring Golden Hour",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 30,
    "rationale": "Editorial earring on-model try-on (Golden Hour) — face/profile-forward campaign, single ear, type-agnostic reference-lock (renders the uploaded earring across all 4 shots). Aspirational counterpart to the clinical Earring on Ear PDP crop. Test-pool variant.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "GOLDEN HOUR direction kept fully inside the editorial earring tier; nano-banana, 4:5, on_model_tryon compositing the seller's ONE uploaded earring. Hardening vs. the draft: (1) Type-agnostic ref-lock is now repeated and the shot text was scrubbed of any type words — the old \"the drop or stud hanging…\" was neutralized to \"exactly as the reference dictates,\" and \"if the reference drops/glows translucently\" is phrased as a pure conditional so the engine never reads it as an instruction to make a drop. Negative bans every morph direction (stud↔hoop↔drop), resize, recolor, and per-shot variance. (2) One-ear/one-earring discipline enforced positively (one lobe, one natural hole, backing implied, believable contact/weight) and negatively (no second/mirrored ear, no pair, no cartilage/helix/tragus/conch, no second hole, no cuff/stack). (3) Face-consistency upgraded from a claim to a lock — same identity/bone-structure/skin-tone/hairline/hair/makeup across all four, with explicit bans on face drift and model swap; eyes always downcast/off-frame, never frontal. (4) Earring physical attachment hardened: no floating, clipping, sinking, or fusing; hanging styles plumb and free of jaw/neck/hair. (5) Hands de-risked globally — the only hand (shot 3) is specified as five natural fingers, no rings/bracelets, and placed at the collarbone far from the ear; negatives ban mutated/extra/fused fingers and competing jewelry everywhere. (6) Shot 3's required full_body composition is the main residual risk for an earring tier; I bound it to an intimate head/shoulders/collarbone crop with the earring \"large and legible\" and added a negative against \"full-figure long shot with a tiny illegible earring\" so the engine cannot pull wide and shrink the hero. Golden-hour risks closed: sun must not silhouette, bleach, or recolor; only-specular rule keeps hair/skin/fabric matte; no invented sparkle/halo/starburst; no prop/hair/scarf mimicry or occlusion. Global SAFETY_NEGATIVE owns text/logo/watermark — none spent here. Flags: experimental + needs_human_review (verify ref-lock fidelity and single-ear count on every generation)."
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
          "lighting:editorial_earring_golden_hour",
          "color:editorial_profile_palette",
          "texture:skin_hair_editorial",
          "context:campaign_ear_hero"
        ],
        "extra_positive": "EDITORIAL GOLDEN-HOUR EARRING CAMPAIGN, Hermès-grade fine-jewelry on-model try-on, perfume-ad warmth rather than a clinical product crop. REFERENCE LOCK (type-agnostic): the ONE uploaded earring is composited onto the model and rendered EXACTLY as the reference image dictates — its exact type and category, its exact shape, length and silhouette, its exact metal color and finish, its exact stone count, cut, color and setting — and is held byte-for-byte IDENTICAL across all four frames; only camera angle, crop and gesture change. Whatever the reference earring actually is, that one same earring is the hero in every shot — no alternate styles, no invented variants, no morphing of the form between frames. ONE elegant model with the SAME generated identity in all four shots: the same face, the same bone structure, the same skin tone and complexion, the same hairline, the same hair color and styling, the same soft natural makeup — a single consistent person photographed four ways. She is shown in a soft side profile or a three-quarter-away angle that presents exactly ONE ear cleanly; her eyes are always softly downcast or cast off-frame, never locked to the lens, never a flat frontal stare. Hair is swept back, tucked, or artfully half-lifted so the ear and earring read with total clarity and nothing crosses or veils the lobe. Exactly ONE earring on ONE lobe through ONE natural pierced hole, the backing implied behind the lobe; the earring rests against or hangs from the lobe with believable contact and weight, never floating, never sinking into the skin. Warm late-afternoon sun or a low amber window backlight, gentle halation, sun-kissed luminous skin, a thin rim of honey light along the jaw and hairline. The earring catches ONE warm, clean, controlled specular highlight and, only if the reference is a hanging style, glows softly translucent where the light passes through — yet its metal color and stone color stay perfectly true, never recolored, never bleached, never crushed into silhouette by the sun. The earring is the ONLY specular hero; hair, skin and any fabric stay soft and matte. Real photographic depth of field, fine editorial grain, a honeyed amber-and-gold color grade, romantic sensual restraint. Rule-of-thirds composition with genuine negative space and the earring placed precisely on a power point. Flawless ear anatomy — natural helix, antihelix, tragus and soft lobe with a clean lobe-to-jaw transition — and a natural, symmetric, beautifully rendered face. Aspirational, tactile, museum-grade. 4:5 vertical, campaign lighting.",
        "extra_negative": "second earring, matching earring on the other ear, a pair of earrings, two ears visible, two ears with earrings, second visible ear in frame, mirrored ear, extra piercings, cartilage piercing, helix piercing, tragus piercing, conch piercing, industrial piercing, multiple holes in one lobe, second lobe hole, double hole, stacked earrings, ear cuff, invented earring style, different earring per shot, changing the earring between frames, earring morphing, stud turning into hoop, hoop turning into drop, drop turning into stud, altered earring length, altered silhouette, resized earring, recolored metal, wrong metal finish, gold turning silver, silver turning gold, added stones, removed stones, changed stone cut, changed stone color, changed setting, invented sparkle, fake bokeh sparkle on the stone, fake halo, glowing aura, lens-flare starburst on the stone, sunburst glint, sun blowing the earring into a black silhouette, sun bleaching the earring white, color-shifted metal, blown-out featureless highlight on the metal, stray gems on skin, glitter on cheek, rhinestones on face, earring floating off the lobe, earring detached from the ear, earring clipping through the lobe, earring sunk into the skin, earring fused to the lobe, drop earring fused to jaw or neck or hair, drop not hanging plumb, drop swinging sideways unnaturally, clip-on look on a pierced reference, hair strand crossing as a fake chain, scarf or fabric mimicking the earring, prop echoing the earring shape, hair covering the ear, hair veiling the lobe, scarf occluding the earring, hand covering the ear, flat frontal dead-stare, eyes locked to camera, direct frontal face, both eyes facing lens, inconsistent face across shots, different model between frames, face drift, changed bone structure, changed skin tone between shots, changed hair between shots, changed makeup between shots, malformed ear, fused ear, webbed ear, melted ear, extra ear, lopsided ear, uncanny face, asymmetric face, distorted features, crossed eyes, plastic skin, waxy skin, doll skin, deformed jaw, broken neck angle, extra fingers, missing fingers, fused fingers, mutated hands, claw hand, ring on the finger, bracelet, extra jewelry, necklace competing for attention, harsh overhead studio light, clinical white seamless, flat even lighting, oversaturated HDR, cool blue cast, garish neon, full-figure long shot with a tiny illegible earring."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Late-afternoon sun rakes low through a sheer-curtained window; warm honey light wraps a soft profile against a deep amber-shadowed background, gentle halation glowing along the hairline. Rule-of-thirds with the lit ear on the right power point and open warm negative space to the left.",
          "pose": "Clean side profile turned three-quarters away from camera, chin lifted slightly, gaze cast down and off-frame; hair swept fully back and tucked so the single near ear is bare and the one reference earring catches a single warm clean specular as the sun grazes it — no second ear in view, no hair crossing the lobe.",
          "composition": "medium_shot"
        },
        {
          "scene": "Backlit golden hour, the low sun directly behind the lobe so the reference earring, if it is a hanging style, glows softly translucent and warm; amber bokeh, sun-kissed skin, a thin rim of light tracing the jaw. The earring sits on the lower-third power point, its metal and stone color staying true and never silhouetted.",
          "pose": "Three-quarter-away tilt with the head inclined gently toward the shoulder, eyes softly closed, neck long and exposed; one ear forward presenting the single earring exactly as the reference dictates, hanging plumb and free of jaw, neck and hair if it hangs — no second ear or earring anywhere in frame.",
          "composition": "closeup"
        },
        {
          "scene": "Warm window light from camera-left, romantic halation and an amber grade; an intimate three-quarter framing of the head, shoulders and collarbone only, with real warm negative space above and a fine editorial grain. Hair half-swept, a few loose strands kept clear of the ear.",
          "pose": "Soft profile, face angled away and slightly down, one relaxed hand rising to graze the collarbone well below and away from the ear — five natural fingers, no rings or bracelets; the bare ear and its single earring stay the only specular hero, the same model face, skin and hair as the other frames, the earring large and legible in the crop.",
          "composition": "medium_shot"
        },
        {
          "scene": "Intimate sun-kissed crop at the end of golden hour, low warm key with deep soft amber shadow falling away behind the neck; gentle bloom on the skin, the earring on the upper-third power point catching a single controlled warm highlight.",
          "pose": "Near-back three-quarter view over the shoulder, head turned just enough to present one ear and the reference earring, lashes lowered, lips relaxed; hair lifted and tucked back so nothing occludes the lobe, the earring hanging or sitting exactly as the reference dictates, identical in form to the other three frames.",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 31. EARRING MONOCHROME (editorial earring) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Earring Monochrome",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 31,
    "rationale": "Editorial earring on-model try-on (Monochrome) — face/profile-forward campaign, single ear, type-agnostic reference-lock (renders the uploaded earring across all 4 shots). Aspirational counterpart to the clinical Earring on Ear PDP crop. Test-pool variant.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "Engine=nano-banana, 4:5, image_set of 4, reference_strategy=on_model_tryon (composite the ONE uploaded earring, kept IDENTICAL to the reference; the model's face is a GENERATED face, not the seller's identity, so showing the face is not an identity leak). Flags: experimental + needs_human_review. Tier: EDITORIAL/CAMPAIGN Monochrome Noir, the aspirational counterpart to the clinical PDP \"Earring on Ear\" crop. ◈5.\n\nDIRECTION-LOCKED to MONOCHROME NOIR: pure neutral silver-gelatin black-and-white, NO color anywhere — negative bans color/tint/sepia/duotone/split-tone/partial-color explicitly because in B&W the gem color cannot carry identity, so reference-lock rides on SHAPE / length / setting / metal-finish reading via tonal contrast plus one crisp specular. Hardened the tonal grammar (full scale, velvet shadow, no grey wash, no blown highlight) so it reads Hermes/Avedon-grade rather than flat.\n\nREFERENCE-LOCK is TYPE-AGNOSTIC AND INVARIANT — the single biggest reliability fix. Every shot says \"the seller's reference rendered exactly, identical in type and length to every other frame\"; the extra_positive forbids deciding a type and forbids changing type/length/silhouette/element-count between frames, killing the classic failure where the engine renders a stud in one shot and a drop in another. Gravity is made CONDITIONAL (\"if and only if it hangs\") so a stud is never forced to dangle and a drop is never forced flush.\n\nONE-EAR / ONE-EARRING / ONE-HOLE enforced positive-and-negative. Closed the second-earring loophole (the #1 failure on neck/jaw-visible frames): far ear is explicitly out-of-frame-or-shadowed-and-bare in shots 1 and 2, unseen in 4. Shot 3 (backlit rim-light on the ear edge) is the highest risk for an invented helix/cartilage piercing because the whole outer ear is lit — so it explicitly calls a \"smooth bare helix, NO piercing on it.\" Banned all extra/double-lobe/cartilage/helix/conch/tragus/daith/industrial/orbital piercings and any stud invented beside the reference.\n\nEAR + FACE ANATOMY hardened: no malformed/fused/webbed/melted/doubled ear, no missing/distorted lobe, earring neither floating off nor clipping through the lobe. FACE-CONSISTENCY hardened to a hard lock — \"same individual, identical bone structure\" stated every shot, with a negative banning a different woman per frame / drifting face / mismatched skin or hair. Discipline preserved: soft profile or three-quarter-AWAY only, gaze always off-lens, no dead frontal stare, no eyes-to-lens.\n\nHANDS fully removed: the draft's \"hand rests low / hands in lap\" invited a botched hand. Now every shot states no hands in frame and the negative bans visible hands/fingers/nails/rings/bracelets — eliminates bad-finger and second-jewelry failures.\n\nEARRING AS SOLE SPECULAR HERO: single key per frame, only faint shadow-detail fill, no second highlight, no invented sparkle/halo/bloom/flare/starburst, no stray gems, matte skin/hair/fabric. The 4 shots traverse the one direction by ANGLE/CROP only: (1) medium near-full profile, (2) closeup beauty crop with conditional-gravity drop, (3) backlit rim-light reading the silhouette with a bare helix, (4) wide full-body campaign poster on the power point. Rule-of-thirds + real (pure-shadow) negative space called out each frame.\n\nSAFETY_NEGATIVE covers text/logo/watermark/signature globally — deliberately NOT duplicated here so budget isn't spent on it. No reference files existed to read (confirmed: searched ~/Downloads and ~/HeyHoAI, none) — pure prompt-design hardening task."
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
          "lighting:editorial_earring_noir",
          "color:editorial_profile_palette",
          "texture:skin_hair_editorial",
          "context:campaign_ear_hero"
        ],
        "extra_positive": "HERMES-GRADE MONOCHROME LOCK: a true silver-gelatin black-and-white beauty campaign in the lineage of classic-Vogue cover portraiture — Avedon/Penn-grade restraint, deep charcoal seamless, a full luminous tonal scale from specular white on the jewel down to velvet near-black shadow with NO muddy mid-grey wash and NO crushed-flat zones; pure neutral monochrome, zero color information anywhere. SINGLE SCULPTED KEY per frame (one hard or soft-edged directional source, optional faint fill only as shadow detail, never a second highlight) so chiaroscuro carves the cheekbone, jaw, brow and the rim of the ONE visible ear. Editorial skin: luminous, poreless-but-real, matte-to-satin — never oily, glassy, plastic, doll-like or wax. Couture hair finish: dark hair lacquered and sculpted into one clean swept-back mass, fully off the face and tucked decisively behind the visible ear so the entire lobe, earline and the earring read crisp and unobstructed — not a single loose strand crossing the lobe or the jewel.\n\nONE CONSISTENT MODEL — the SAME individual in all four frames: identical generated face, identical bone structure, identical brow/nose/lip shape, identical skin tone, identical hairline and hair styling; a single believable person photographed four ways, never four different women, never a morphing or drifting face. Natural realistic well-rendered features, gentle asymmetry of a real face, calm and expensive; eyes ALWAYS cast off-lens and softly downcast or closed-to-low, lids relaxed — presented in soft true-profile or three-quarter-AWAY only.\n\nREFERENCE-LOCK, TYPE-AGNOSTIC AND INVARIANT: render the seller's ONE uploaded earring EXACTLY and IDENTICALLY in all four frames — its exact type (whatever it is: stud, drop, hoop, huggie, threader, climber, chandelier — DO NOT decide, simply mirror the reference), its exact silhouette, length, profile, metal finish, stone count, cut and setting — changing ONLY the camera angle frame to frame. The earring's type and length are the SAME in shot 1, 2, 3 and 4; it never grows, shrinks, swaps form, or gains/loses elements. GRAVITY IS CONDITIONAL: if and only if the reference earring is a hanging/drop style does it hang plumb straight down under gravity, free and clear of the jaw, neck, cheek and hair; a stud or close-set earring sits flush on the lobe and does NOT dangle. EXACTLY ONE earring on ONE lobe through ONE existing natural pierced hole; the backing sits implied behind the lobe.\n\nThe earring is the SOLE specular hero — the single brightest, sharpest, most in-focus accent in the frame; skin, hair, fabric, backdrop all matte by comparison; one precise catch of light defines its shape and setting. Real negative space (pure shadow) and rule-of-thirds composition with the ear-and-earring on a power point. Fine analog film grain, medium-format clarity, gallery silver print quality.",
        "extra_negative": "two earrings, a matching pair, a second earring of any kind, an earring on the far/second ear, a visible second ear wearing jewelry, mirrored earrings on both lobes; the far ear rendered with any piercing, stud, hoop or hole; extra piercings of any kind, second or third lobe holes, double-pierced lobe, stacked earrings on one lobe, cartilage / helix / conch / tragus / daith / industrial / orbital piercings, an invented small stud beside the reference earring; the earring CHANGING TYPE OR LENGTH between the four shots, a stud in one frame and a drop or hoop in another, the earring growing longer or shorter, swapping silhouette, gaining a charm or dangle the reference lacks, losing an element the reference has, the metal finish or stone count differing across shots, inventing an earring the seller never uploaded; a stud forced to dangle, a non-hanging earring stretched into a drop; a hanging earring fused to / resting on / pressed into the jaw, neck, cheek or shoulder, the drop swinging into the hair, hair strands or a loose lock crossing or veiling the earring, the lobe or earline occluded by hair, scarf, collar, hand or shadow, clip-on backing when the reference is a pierced post; malformed / fused / webbed / melted / doubled / extra ear, missing or distorted earlobe, deformed ear cartilage, the earring floating off the lobe, the post clipping through or fused into the lobe, the earring detached and hovering; asymmetric warped or melted facial features, uncanny waxy plastic or doll-like face, the face CHANGING between shots, a different woman per frame, drifting bone structure, mismatched skin tone or hair across frames, two different models; crossed or divergent eyes, dead flat frontal stare, eyes locked to the lens, both eyes and a full frontal face squared to camera; visible hands, fingers in frame, a hand near the face or earring, deformed hands, extra or fused fingers, fingernails, a ring or bracelet or any second piece of jewelry in frame; color, any color, color cast, tint, hue, sepia, brown tone, blue tone, gold tone, duotone, split-tone, saturated tones, partial color, hand-colored accent (this is pure neutral black-and-white only); a second specular highlight competing with the earring, a bright reflection elsewhere stealing focus, invented sparkle, halo, bloom, glint-burst, lens flare or starburst on the stone, glitter or stray loose gems scattered on skin or backdrop, shiny oily glassy skin, glossy fabric mimicking metal; flat even lighting that kills the chiaroscuro, ring-flash flat front light, blown-out highlights crushing the earring's shape into white, milky low-contrast grey wash, muddy shadows swallowing the ear and earline; busy cluttered or textured background, props competing with the jewel, blurry soft or out-of-focus earring, low detail, plastic skin."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Pure neutral black-and-white classic-Vogue cover portrait. Seamless deep charcoal-to-near-black studio sweep. A single hard key light rakes from high camera-left, carving the cheekbone and the rim of the one visible ear into a crisp ribbon of highlight against velvet shadow; only a faint shadow-detail fill, never a second highlight. Hair lacquered and swept fully back, tucked decisively behind the visible ear so lobe and earline are completely clean and unobstructed. The earring — the seller's reference rendered exactly, identical in type and length to every other frame — is the single brightest, sharpest specular accent, its silhouette reading sharply against the shadowed neck behind it. Generous dark negative space upper-right; ear-and-earring on the lower-left power point. The far ear stays out of frame or buried in shadow and bare.",
          "pose": "Near-full soft profile, the one visible ear turned cleanly toward camera; head lifted on a long aloof neckline, chin level, gaze cast off-camera into the distance and slightly down, lids low, lips relaxed and closed. Shoulders dropped and angled away, no hands anywhere in frame. Still, sculptural, composed, alert — not asleep.",
          "composition": "medium_shot"
        },
        {
          "scene": "Same model, same individual, same charcoal backdrop, same neutral B&W chiaroscuro world. The single key now skims lower and more frontal-oblique so a soft luminous gradient wraps the jaw while the far plane of the face falls into deep shadow; one clean catch of light lands precisely on the earring's setting, making it the sharpest specular in frame. Tight beauty crop centred on the lower face, jaw, lobe and earring; hair a matte dark mass framing the highlit ear, not one strand crossing the lobe. Pure-shadow negative space to the right. Far ear unseen.",
          "pose": "Three-quarter-AWAY angle, face turned roughly 30 degrees off camera so only the one near ear presents cleanly; eyes lowered and cast away off-lens, lashes catching a thread of light, lips softly closed in repose. A whisper of head-tilt; if the reference earring hangs it falls plumb and free, clear of jaw and neck, if it is a stud it sits flush on the lobe. No hands in frame.",
          "composition": "closeup"
        },
        {
          "scene": "Same model, same individual, same neutral B&W direction. Light from high behind-camera-right rims the back edge of the cheek and the outer curve of the ear with one bright contour line while the front plane holds a gentle mid-tone — a sculptural backlit profile. The earring's silhouette is thrown into crisp relief, its full length and form legible as a clean specular shape against the dark falloff of the neck. The lit ear edge is a smooth bare helix with NO piercing or stud on it — only the single reference earring on the lobe. Tall vertical pure-shadow negative space fills the left third.",
          "pose": "Soft profile from the back-three-quarter, nape and swept-back hairline visible, head turned away so we read the elegant line from jaw to ear to neck; gaze fully off-frame, serene and remote, lids low. Both hands kept entirely out of frame so nothing approaches or occludes the earring; no fingers, no second jewelry visible.",
          "composition": "medium_shot"
        },
        {
          "scene": "Same model, same individual, same neutral monochrome studio. A wider, airier campaign frame: the model set low-left against an expanse of smooth graphite-to-black gradient, a single soft-edged key sculpting the face and igniting one precise specular on the earring so it stays the hero even at scale. The full elegant line of profile, throat and one bare shoulder reads as a sculpted form; the earring is the one sharp bright punctuation, identical in type and length to the other three frames. Vast quiet negative space upper-right; ear-and-earring on the lower-left power point — couture poster composition.",
          "pose": "Elegant three-quarter-AWAY seated lean, spine long, one shoulder dropped and turned from camera, the single visible ear cleanly forward; chin slightly raised, eyes closed-to-low and cast far off-lens, expression of restrained calm. Hair fully off the face and lacquered behind the ear; hands resting unseen in the lap, never entering frame or nearing the earring.",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 32. EARRING SCARF PORTRAIT (editorial earring) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Earring Scarf Portrait",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 32,
    "rationale": "Editorial earring on-model try-on (Scarf Portrait) — face/profile-forward campaign, single ear, type-agnostic reference-lock (renders the uploaded earring across all 4 shots). Aspirational counterpart to the clinical Earring on Ear PDP crop. Test-pool variant.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "Direction world: EARRING ATELIER DU FOULARD (Hermes-signature scarf portrait), one coherent warm golden-hour editorial ground with a printed silk twill carre styled in hair / knotted at nape / draped on shoulder, the scarf framing the face but always held off the lobe with a clear skin air-gap. All four shots are profile-forward presenting ONE ear with the earring, varying only profile angle, crop and gesture: (1) medium soft three-quarter-away portrait, (2) clean pure-profile closeup on a power point, (3) full-body backward lean with a single bare hand at the collarbone, (4) intimate near-macro on the ear. Engine nano-banana, 4:5, on_model_tryon, image_set of 4, budget-5.\n\nHardening baked into every field. TYPE-AGNOSTIC REFERENCE-LOCK: extra_positive pins the uploaded earring's type/length/silhouette/component-count/metal/finish/stone-count/cut/setting as immutable and varies ONLY camera angle; negatives ban inventing or swapping type, changing length/size, adding or removing stones/charms/tiers, altering metal color or finish, and specifically ban the closeups (shots 2 and 4) from embellishing or enlarging the piece — the engine's strongest urge to 'improve' the hero lives in macro. ONE EAR / ONE EARRING / ONE HOLE: positives state one lobe, one natural hole, backing implied as a tiny rear finding only; negatives kill a second/matching/twin/reflected/shadow earring, the far ear carrying anything, extra/second-hole/cartilage/helix/conch/tragus piercings, ear cuffs, and a backing blooming as a second front element. EAR + FACE ANATOMY: correct helix/antihelix/tragus/soft lobe, clean lobe-to-jaw, no malformed/fused/webbed/floating ear, no earring fused into or floating off the lobe or clipping through the ear. CONSISTENT GENERATED MODEL across all four (same face geometry, skin tone, hair, brows, lashes) with an explicit ban on a different model per shot or a changed identity. FACE SHOWN DELIBERATELY but disciplined: soft three-quarter-away or clean profile, gaze off-frame/downcast, never a flat frontal dead-stare or eyes-to-camera; skin kept matte with real pore texture, banning plastic/waxy/doll/CGI faces and the uncanny-asymmetry set (lazy/crossed/misaligned eyes, melted features). SPECULAR DISCIPLINE: the earring is the sole specular hero, one clean catchlight on metal and stones, skin/hair/silk matte; negatives kill stray/floating gems, invented sparkle, lens-flare halo, glow ring, double catchlight, glossy/oily/sweaty skin, specular peach fuzz and glittering hair. OCCLUSION: scarf/hair/silk/collar/shoulder never cover the lobe or earring; drop physics hang plumb and legible. HAND RISK (shot 3, the single highest-variance frame): one relaxed bare hand at the collarbone, five correct separated fingers, natural nails, NO ring/bracelet/watch, never touching the ear or earring — negatives cover extra/fused/six fingers, claw hand, and any competing hand jewelry. Global SAFETY_NEGATIVE already covers text/logo/watermark, so zero budget is spent on those here. Flags: experimental + needs_human_review — genuine on-model rendering of ear anatomy plus a hand frame is the high-variance surface; the macro (shot 4) and the hand (shot 3) are the two frames a reviewer should scrutinize first for type-morph, a phantom twin, a malformed ear, or bad fingers."
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
          "lighting:editorial_earring_scarf",
          "color:editorial_profile_palette",
          "texture:skin_hair_editorial",
          "context:campaign_ear_hero"
        ],
        "extra_positive": "REFERENCE LOCK (type-agnostic, all 4 frames): the ONE uploaded earring is the immutable hero. Whatever it is — stud, huggie, hoop, drop, dangle, chandelier, ear-climber, threader — render THAT exact piece and only that piece: identical type, overall length and silhouette, the same number of components and how they connect, identical metal color and finish (yellow/white/rose gold, platinum, silver — do not shift warm to cool or polished to matte), identical stone count, cut, size, color and setting style. Across the four shots ONLY the camera angle, crop and the model's gesture change; the earring's geometry, proportion and material never change between frames and never drift larger, longer, more ornate or more sparkly in the closeups. If the reference is small and minimal, keep it small and minimal; do not embellish.\n\nONE EAR / ONE EARRING / ONE HOLE: exactly one earring, on one lobe, through one single natural pierced hole, with the backing/finding implied behind the lobe (a tiny rear post or hook tail only, never a second decorative element blooming on the front of the lobe). The opposite ear, if any sliver shows, is bare and unpierced. No matching pair, no reflected or shadowed twin earring in the backdrop.\n\nCONSISTENT GENERATED MODEL: one and the same elegant generated woman in all four frames — identical face geometry, identical skin tone and warm undertone, identical swept-back hairstyle, hair color and hairline, identical brow and lash character. She is the same person shot four ways, never a new face per frame, never aged or reproportioned.\n\nEDITORIAL FACE & POSE (face shown deliberately; it is a generated face, not the seller): a serene soft three-quarter-away or clean side profile, head turned so one ear and the earring read with jewel-like clarity; chin level or fractionally lowered, lids relaxed, gaze drifting softly off-frame or downcast — composed and unhurried, never a flat frontal stare, never eyes locked to camera, never a startled or vacant expression. Believable couture-model bone structure: sculpted cheekbone, clean jawline, natural lip volume, fine realistic brows and individually separated lashes; pores and fine skin texture preserved, matte velvety finish, no airbrushed plastic.\n\nTHE SIGNATURE SCARF: a printed silk twill carre, its painterly motif crisp and luxurious, styled into the swept hair, knotted softly at the nape and falling over one shoulder. The silk frames the face and warms the ground but is kept entirely off the lobe and the earring — a clear air-gap of skin always separates silk from jewel.\n\nLIGHT & GROUND (Hermes-grade): a single soft honeyed key from a large window, golden-hour warmth, one clean controlled catchlight on metal and one on each faceted stone — the earring is the ONLY specular accent. A gentle warm rim grazes the cheekbone and jaw to sculpt the profile; skin, hair and silk stay matte with soft falloff into a creamy caramel-to-blush out-of-focus backdrop. Generous real negative space, rule-of-thirds with the earring landing on a power point. Medium-format film rendering, fine natural grain, burnished warm color grade, gentle highlight roll-off, true blacks held soft. Aspirational, intimate, couture restraint.\n\nDROP/DANGLE PHYSICS (only if the reference dangles): it hangs plumb to gravity, swinging free and fully legible, never resting on or tangling into the jaw, neck, shoulder, hair or scarf.\n\nHAND DISCIPLINE (shot 3 only): if a hand appears it is a single relaxed hand resting at the collarbone, far below and clear of the earring — five correct separated fingers, natural length and knuckles, soft natural nails, and BARE: no rings, no bracelet, no second jewelry competing with the earring.",
        "extra_negative": "second earring, matching pair, twin earring, earring on the opposite ear, earring on the far ear, two earrings, two ears wearing jewelry, second pierced ear, far lobe carrying an earring, reflected earring, mirrored earring, duplicate earring in backdrop, shadow earring; extra piercing, second hole in the lobe, double piercing, stacked earrings, cartilage piercing, helix piercing, conch piercing, tragus piercing, industrial bar, ear cuff added, nose ring, lip ring; invented earring, earring type changed, stud turned into hoop, hoop turned into drop, drop turned into stud, threader turned into dangle, length changed, longer earring, shorter earring, larger earring, smaller earring, added charms, added stones, removed stones, added dangle, extra tier added, ornamentation added, metal color changed, gold turned silver, silver turned gold, polished turned matte, finish altered, setting restyled, clip-on when reference is pierced, costume swap, embellished closeup, fancier earring in macro; backing shown on the front of the lobe, screw-back on the front, second stud on the lobe, double-front element, jacket added behind the lobe;\n\nmalformed ear, fused ear, webbed ear, melted lobe, extra lobe, two lobes, third ear, deformed cartilage, missing tragus, missing helix, collapsed ear, ear merged into jaw, ear fused to neck, ear fused to hair, floating ear, earlobe missing, swollen lobe, earring fused into the lobe, earring sunk into skin, earring clipping through the ear, earring detached from the lobe, earring floating off the ear, earring at the wrong point on the lobe;\n\ninconsistent face between shots, different model per shot, new face, changed identity, changed skin tone, changed hair, aged face, reproportioned face; flat frontal stare, dead-eyed gaze, eyes locked to camera, staring at viewer, vacant expression, startled look, frontal symmetric face dead-center; uncanny face, asymmetric face, lopsided face, crooked features, melted features, distorted features, drooping eye, lazy eye, crossed eyes, misaligned eyes, doubled iris, extra eyebrow, fused eyebrows, mangled lashes, extra teeth, malformed nose, twisted lips, plastic skin, waxy skin, over-airbrushed skin, blurred-out skin texture, mannequin face, doll face, CGI face;\n\nhair covering the ear, hair over the earring, stray hairs across the lobe, hair tangled in the earring, scarf covering the lobe, scarf draped across the ear, silk over the earring, silk touching the jewel, fabric occluding the earring, fabric mimicking the earring, scarf fringe over the lobe, collar or shoulder hiding the earring;\n\ndeformed hand, extra fingers, six fingers, missing finger, fused fingers, mangled fingers, twisted thumb, claw hand, extra hand, ring on finger, stacked rings, bracelet, watch, wrist jewelry, second jewelry on the hand, hand touching the earring, hand covering the ear, finger over the lobe;\n\nstray gems on skin, floating gems, loose stones on the cheek, invented sparkle, fake glitter, lens-flare halo on the stone, starburst on the jewel, fake bloom, glow ring around the earring, double catchlight on one stone; second specular highlight competing with the earring, glossy oily skin, shiny sweaty skin, wet-look skin, specular peach fuzz, glittering hair;\n\ncluttered background, busy backdrop, distracting props, harsh shadows, hard flash, blown highlights, crushed shadows, clinical white seamless, flat product-shot lighting, cold blue cast, green cast; cropped earring, earring cut by the frame edge, earring half out of frame, earring out of focus, soft mushy earring, blurry earring while skin is sharp; cheap costume jewelry, plastic-looking metal, dull lifeless metal, low detail, low resolution, banding, oversharpened halos."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Warm honeyed golden-hour studio against a creamy caramel-to-blush out-of-focus backdrop. A printed silk twill carre is woven into swept-back hair and knotted softly at the nape, falling over the far shoulder, the painterly motif crisp but held entirely off the ear. A single soft window key sculpts the cheekbone with a warm rim along the jaw; the one composited reference earring catches one clean controlled highlight in a clear air-gap of skin just below the lobe.",
          "pose": "Serene soft three-quarter-away profile, head turned gently from camera so exactly one ear and the earring read with jewel-like clarity, chin level, lids relaxed, gaze drifting softly off-frame and a touch downcast, hair fully swept back to expose the whole lobe; the one reference earring rendered identically in type, length, metal and stones, the only specular element, untouched by hair or silk.",
          "composition": "medium_shot"
        },
        {
          "scene": "Same model, same scarf, same warm honeyed ground; a clean pure-profile silhouette against the creamy backdrop, the silk knotted at the nape behind the dropped shoulder, hair tucked smoothly back, the earring isolated on a rule-of-thirds power point with generous warm negative space to one side and a soft rim defining the jawline.",
          "pose": "Clean pure side profile, the single ear and the one reference earring squarely and crisply presented at identical proportion to the reference, neck long, shoulders dropped well away from the lobe, gaze travelling straight off the frame edge with no eyes to camera; if the piece dangles it hangs plumb to gravity free of jaw, neck, hair and silk, the sharp specular hero against matte skin.",
          "composition": "closeup"
        },
        {
          "scene": "Same model and same scarf in golden editorial light, leaning back slightly so the silk drapes over one shoulder and the nape knot reads; a single relaxed bare hand rests at the collarbone, well below and entirely clear of the lobe, never touching the earring, the warm backdrop falling softly out of focus.",
          "pose": "Three-quarter-away profile with a gentle backward tilt presenting exactly one ear, one bare hand with five correct separated fingers and natural soft nails resting softly at the collarbone far below the earring and wearing no ring or bracelet, gaze cast down and away; the one reference earring kept exactly as uploaded, swinging clear of hair, scarf, jaw and hand, the single specular hero.",
          "composition": "medium_shot"
        },
        {
          "scene": "Same model, same scarf, same warm honeyed ground; an intimate near-macro on one ear and an elegant slice of jaw, neck and swept hairline, a soft edge of silk framing the face but stopping short of the lobe, a single soft key gleaming on the jewel while skin and silk stay matte and velvety.",
          "pose": "Tight crop on one ear in soft profile, jaw and neckline angled away, the whole lobe exposed with only a tiny rear finding implied behind it and nothing decorative on the front beyond the earring itself, the one reference earring rendered identically — same type, length, metal, stone count and cut, not embellished or enlarged for the closeup — catching one controlled highlight; exactly one ear, one earring, one natural pierced hole, no second hole, no cartilage piercing, no twin.",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 33. EARRING COLOR POP (editorial earring) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Earring Color Pop",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 33,
    "rationale": "Editorial earring on-model try-on (Color Pop) — face/profile-forward campaign, single ear, type-agnostic reference-lock (renders the uploaded earring across all 4 shots). Aspirational counterpart to the clinical Earring on Ear PDP crop. Test-pool variant.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "Engine=nano-banana, reference_strategy=on_model_tryon, 4-shot image_set, 4:5, cost ◈5. DIRECTION = EARRING COLOR POP committed to ONE color: deep cobalt seamless paper, edge-to-edge matte, even and bandless, generous saturated negative space, the earring the lone bright specular jewel on the bold ground. One coherent world; the 4 shots vary ONLY profile angle, crop and minimal gesture — pure side profile (medium) / tight ear-jaw beauty closeup / three-quarter-back over-shoulder with a nape-near hand that never touches the earring / full-body campaign. All four are profile-forward presenting exactly ONE ear; gaze always off-frame, never a frontal stare. Hardening baked in: (1) type-agnostic REFERENCE LOCK — earring rendered exactly as uploaded, identical across all 4, only the camera moves, NO stud/hoop/drop prescription that would force invented jewelry; conditional 'if it hangs, it hangs plumb' covers drops without dictating type. (2) one ear / one earring / one pierced lobe hole, backing implied, no pair, no second ear, no extra cartilage/helix/tragus piercings, earring seated flush with a tiny contact shadow so it neither floats nor fuses, drop free of jaw/neck/hair. (3) correct ear + natural symmetric non-uncanny face anatomy, real skin micro-texture. (4) ONE consistent generated model (same warm medium skin, same bone structure, same dark swept-back hair) across all shots — generated face, NOT a seller identity leak, so showing the face is safe. (5) earring is the ONLY specular hero — skin luminous-matte, hair/backdrop matte, single directional key, no second specular, no invented halo/sparkle; hair and the one gesture never occlude the earring. (6) the over-shoulder hand and full-body hands explicitly bare with five correct fingers and NO ring/bracelet so hands never spawn bad anatomy or a competing jewel. Text/logo/watermark left entirely to global SAFETY_NEGATIVE — not duplicated here, so budget stays on earring-fidelity + anatomy + model-consistency + hand hardening. Flags: experimental + needs_human_review. Genuinely editorial (Hermès-grade campaign), not a clinical PDP crop."
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
          "lighting:editorial_earring_color_pop",
          "color:editorial_profile_palette",
          "texture:skin_hair_editorial",
          "context:campaign_ear_hero"
        ],
        "extra_positive": "EDITORIAL CAMPAIGN, Hermès-grade try-on for ONE earring, DIRECTION = EARRING COLOR POP committed to a single deep cobalt blue. The backdrop is one continuous seamless paper field of saturated cobalt, edge to edge, perfectly even and matte with no second hue, no gradient, no banding, no vignette seam — pure confident color as negative space. Lighting is editorial fashion-campaign quality: a crisp single directional studio key raking across the one presented ear so the seller's exact earring is the ONLY specular note, struck with one clean controlled highlight true to the reference, while a soft fill keeps skin luminous-matte and the jaw, neck and hair fall into gentle graphic shadow; no second specular source anywhere. ONE consistent generated model across all four shots — the same warm medium skin tone, the same calm refined bone structure, the same dark hair swept fully back, glossed flat and tucked cleanly behind the visible ear so the lobe and earring read with zero occlusion. She is presented in a soft side or three-quarter-AWAY profile that opens exactly ONE ear to camera; serene, poised, quietly confident; gaze always drifting off-frame into the color, never toward the lens. The face is beautifully, naturally rendered — real skin micro-texture, symmetric believable features, soft natural eyelashes and brow, a relaxed mouth — never waxy, never doll-like. REFERENCE LOCK, type-agnostic: render the ONE seller-uploaded earring EXACTLY as supplied — whatever its true type, shape, length, drop, silhouette, metal color, finish, stone count, cut and setting — held IDENTICAL in every shot; only the camera angle moves and the engine invents nothing about the jewelry. Exactly ONE ear, ONE earring, ONE natural pierced lobe hole, backing implied behind the lobe; the earring sits flush and physically seated in the piercing, casting its own tiny contact shadow on the lobe. If the reference hangs, it hangs plumb to gravity, swinging free and fully clear of jaw, neck, shoulder and hair. Art-directed composition: true rule-of-thirds, generous breathing cobalt negative space, the ear and earring landing on a power point. Fine film-grade clarity, luxury beauty-magazine finish, aspirational, modern, restrained. 4:5.",
        "extra_negative": "second earring, matching pair, earring on the other ear, two ears wearing jewelry, mirrored earring, extra earring floating near the head, stud-then-hoop-then-drop variation, earring type changing between shots, restyled or redesigned jewelry, altered metal color or finish, altered stone count or cut, altered earring length or silhouette, costume jewelry not in the reference, invented earring, extra gems or rhinestones on skin cheek neck or shoulder, invented halo, glow, aura or bloom around the stone, fake added sparkle, lens flare on the jewel; extra piercings, cartilage piercing, helix piercing, tragus piercing, conch piercing, second lobe hole, double piercing, multiple pierced holes, visible piercing gun marks; earring floating off the lobe, earring detached from the ear, earring clipping through the lobe, earring fused or melted into the skin, gap between earring and ear, earring hanging from hair or jaw, drop earring resting on jaw neck or shoulder, earring tangled in hair, earring not hanging plumb, tilted or stuck-out earring defying gravity; malformed ear, fused ear, webbed ear, melted ear, extra ear, third ear, missing ear, missing lobe, deformed cartilage, double helix, lumpy antihelix, ear in wrong place; flat frontal face, dead frontal stare, eyes locked to camera, direct eye contact, pupils to lens, cross-eyed, lazy eye, asymmetric eyes, uneven eyes, extra eye, distorted face, deformed jaw, crooked jaw, fused jaw to neck, melted features, uncanny valley, plastic skin, waxy skin, airbrushed-flat skin, doll face, mannequin face, mask face; inconsistent model, different face between shots, face morphing, changing skin tone, changing hairstyle, changing hair color, different person per shot; hair covering the ear, hair occluding the earring, flyaway strands over the lobe, scarf or collar over the earring, prop blocking the earring, hand covering the ear or earring; hand with six fingers, extra fingers, missing fingers, fused fingers, mangled hand, claw hand, twisted wrist, ring on finger, bracelet, visible nail polish competing for attention, manicure as second hero; gradient background, ombre backdrop, two-tone backdrop, second color, color spill on skin, busy or patterned backdrop, props clutter, seamless paper seam line, sweep crease, color banding, posterization, muddy or desaturated cobalt, grey-blue washout; glossy oily skin, sweaty highlights, shiny specular skin competing with the earring, specular glossy hair, shiny fabric highlight, multiple competing speculars, blown-out hotspot on skin; harsh double shadow, conflicting light directions, flat shadowless lighting; lowres, blurry, soft focus on the earring, jpeg artifacts, oversharpened halos, harsh clipping, overexposed blowout, crushed blacks, noise."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Pure lateral side profile against the unbroken deep cobalt seamless field, the model framed on the right third so a wide calm wall of saturated cobalt negative space fills the left two-thirds. A single crisp directional studio key rakes across the one presented ear, making the seller's exact earring the only point of specular light on an otherwise matte profile; jaw, neck and swept-back hair fall into soft graphic shadow, no competing highlight anywhere.",
          "pose": "Clean true side profile, chin level and serene, gaze drifting off-frame to the left into the color, never toward the lens; dark hair swept fully back and tucked behind the single visible ear so the lobe and the one earring read with zero occlusion; shoulders angled away from camera, neck long and relaxed; the earring seated flush in one pierced lobe hole, hanging plumb and free if it is a drop.",
          "composition": "medium_shot"
        },
        {
          "scene": "Tight beauty crop on the one ear, jaw and a soft slice of cheek and neck against the cobalt ground, the bold color pressing close around an intimate margin of negative space. The exact uploaded earring fills the power point, its true metal finish and stones catching the lone key as the only specular note; skin stays luminous-matte with visible natural micro-texture, backdrop stays flat matte cobalt.",
          "pose": "Gentle three-quarter-AWAY tilt of the head that keeps the single ear fully open to camera, the earring seated in one lobe hole and hanging free and plumb, fully clear of jaw and neck; eyes lowered and turned away, expression calm and unposed; hairline tucked back cleanly off the lobe with no stray strands crossing the earring.",
          "composition": "closeup"
        },
        {
          "scene": "Soft three-quarter-back profile, the model turned mostly away into the cobalt seamless so the saturated color dominates roughly two-thirds of the frame and the lit ear emerges from shadow on a thirds line. One directional highlight finds only the earring; the rest of the silhouette stays graphic, matte and unbroken against the saturated wall, no second specular.",
          "pose": "Head turned away over the shoulder in a three-quarter-back angle presenting exactly one ear; one elegant hand with five correct natural fingers, bare and unadorned, rests near the nape WITHOUT touching, covering or shadowing the earring; gaze cast off-frame; hair gathered to the far side so the near lobe and its single earring stay fully exposed and unoccluded.",
          "composition": "medium_shot"
        },
        {
          "scene": "Full editorial campaign frame, the elegant model standing in soft side profile against an expansive flat cobalt backdrop with sweeping color negative space above and beside her, magazine-cover scale and confidence. The presented ear sits on an upper power point; the seller's exact earring is the single bright jewel and only specular accent on the whole matte, color-saturated composition.",
          "pose": "Upright graceful side-profile stance, weight settled on one hip, chin lifted slightly with the gaze cast off-frame into the color; hair swept entirely back so the one ear and its single earring stay crisp and unoccluded; arms relaxed at the sides, hands bare with natural correct fingers and no rings or bracelets, the silhouette reading clean and graphic against the bold cobalt ground.",
          "composition": "medium_shot"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },

  // ─── 34. EARRING INTIMATE (editorial earring) ───
  {
    "mode": "product",
    "vertical": "jewelry",
    "category": "OnModelEditorial",
    "name": "Earring Intimate",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 34,
    "rationale": "Editorial earring on-model try-on (Intimate) — face/profile-forward campaign, single ear, type-agnostic reference-lock (renders the uploaded earring across all 4 shots). Aspirational counterpart to the clinical Earring on Ear PDP crop. Test-pool variant.",
    "meta": {
      "flags": [
        "experimental",
        "needs_human_review"
      ],
      "render_notes": "HeyHoAI Doppia — EARRING INTIMATE editorial tier. engine=nano-banana, aspect=4:5, reference_strategy=on_model_tryon, budget=◈5, flags: experimental + needs_human_review. Composite the seller's ONE uploaded earring onto a GENERATED model (generated face = no seller-identity leak, so showing the face is permitted). The face is shown ONLY in soft profile / three-quarter-away with downcast or away gaze — never frontal, never eyes-to-camera. Global SAFETY_NEGATIVE owns text/logo/watermark/signature; only a light reinforcement is carried in extra_negative — spend no budget there. Type-agnostic reference lock is the top priority: nothing in positive or shot copy names a specific earring type, so the engine cannot invent a stud/hoop/drop; it must render whatever single earring the seller uploaded, identical across all 4 frames, varying only camera/crop/gesture. The revealing HAND is the highest-risk element of this direction — anatomy and ring-free, lobe-clearing rules are hardened in both positive and negative. needs_human_review: confirm (1) the earring type matches the upload and is identical in all 4 shots, (2) exactly one ear / one earring / one hole, (3) the hand never overlaps the earring, (4) the same face appears in all 4 shots."
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
          "lighting:editorial_earring_intimate",
          "color:editorial_profile_palette",
          "texture:skin_hair_editorial",
          "context:campaign_ear_hero"
        ],
        "extra_positive": "EDITORIAL EARRING CAMPAIGN — INTIMATE direction, Hermès-grade beauty for ONE single fine-jewelry earring presented on a model. on_model_tryon: composite the seller's ONE uploaded earring onto the model EXACTLY as in the reference — reproduce its true type, overall shape, length, drop or silhouette, metal color and finish, and every stone's count, cut, and setting IDENTICALLY in all four frames. Only the camera angle, crop, and the model's hand gesture change between shots; the earring itself never changes. Whatever the reference earring is — stud, drop, huggie, hoop, threader, chandelier; do not assume or default to any one type — all four frames show THAT same earring, the identical object, never a substitute, never an invented variant, never restyled.\n\nONE consistent elegant model across all four shots: the SAME generated woman — same face, same apparent age, same bone structure, same warm even luminous-but-matte skin tone, same dark hair swept softly back and tucked behind the near ear so the lobe and earring read with absolute clarity. She is shown in a tender soft PROFILE or three-quarter-turned-away angle presenting exactly ONE clean ear to the light — never a flat frontal stare, never both eyes squared to camera, never eyes locked on the lens; gaze lowered, downcast, or drifting away, lashes soft, lips relaxed and closed, expression quiet, composed, and emotional. A natural, beautifully rendered human face: symmetric realistic features, true-to-life proportion, a clean lobe-to-jaw transition, ONE anatomically correct ear (helix, antihelix, tragus, soft natural lobe of normal size), with exactly ONE earring on that ONE lobe through ONE natural pierced hole, the backing implied behind the lobe, the lobe undistorted and not stretched.\n\nThe intimate gesture is the soul of this direction and must REVEAL the earring: the model's own hand gently sweeps a single strand of hair back from the ear, or bare relaxed fingertips rest lightly at the jaw, cheekbone, or side of the neck — always framing and presenting the earring, the fingers kept clear of the lobe so they never overlap, touch, cover, or cross in front of the earring's silhouette. Any visible hand is anatomically flawless: ONE slender natural hand, exactly five fingers with correct joints and proportion, soft relaxed knuckles, neat short clean nails, the skin completely bare of ANY rings, bands, bracelets, watch, or other jewelry, matte and unadorned.\n\nLight and mood: soft warm directional window light, golden-hour glow, gentle falloff across the cheek and neck, a whisper of clean rim light tracing the curve of the ear so the earring catches ONE true, honest specular highlight. Shallow depth of field, creamy melting bokeh in muted warm neutrals — bone, oatmeal, soft camel, dusk rose, warm taupe. The EARRING is the SINGLE specular hero catching the light; skin reads as soft luminous satin without oily sheen or hotspots, and hair, lashes, lips, and any fabric stay quiet and matte by contrast so nothing competes with the stone. Editorial color grade, fine-grain film texture, restrained luxury campaign mood, refined and tender. Rule-of-thirds composition with real, breathing negative space; the earring placed on a power point. 4:5 vertical, magazine-grade fine-jewelry editorial.",
        "extra_negative": "two earrings, a pair of earrings, matching earring on the opposite ear, opposite ear visible wearing an earring, second ear shown with jewelry, second earring of any kind anywhere in frame, mismatched earrings, a different earring than the reference, invented earring, substituted earring style, restyled earring, changing the earring between shots, earring type morphing, stud becoming a hoop, hoop becoming a drop, drop becoming a stud, altered earring length or shape or silhouette, wrong metal color, changed metal finish, added or removed stones, changed stone cut or setting, changed stone color, extra gemstones, stray gems or crystals on the skin or cheek or neck or hair, invented sparkle, fake halo or bloom around the stone, glow ring on the gem, lens-flare starburst on the gem, duplicated earring in a reflection;\n\nextra ear piercings, multiple piercings, cartilage piercing, helix piercing, tragus piercing, conch piercing, two holes in one lobe, double piercing, stacked earrings, ear cuff, clip-on when the reference is a pierced post, earring floating off the lobe, earring detached from the ear, earring not through a hole, earring fused or melted into the lobe, earring embedded in the skin, stretched lobe, gauged lobe, tunnel, torn lobe, drop earring stuck to the jaw or neck or cheek or hair, drop earring resting flat against skin, drop earring not hanging plumb to gravity, hoop not passing cleanly through the hole;\n\nmalformed ear, fused ear, webbed ear, melted ear, extra ear, third ear, missing ear, oversized ear, distorted ear cartilage, blurred ear, asymmetric face, distorted face, melted face, warped face, uncanny valley face, plastic skin, waxy skin, oily skin, greasy hotspot, sweaty sheen, deformed jaw, double chin merge, crossed eyes, wall-eyed, dead eyes, glassy stare, eyes staring into the camera, flat frontal dead-stare, both eyes facing lens, lifeless expression, open mouth, gritted teeth, different woman in another shot, inconsistent face across shots, aged or younger in another shot;\n\ndeformed hand, extra fingers, six fingers, missing fingers, fused fingers, webbed fingers, mangled hand, extra hand, second hand, claw hand, bent or broken finger, rings on fingers, ring, band, bracelet, watch, additional jewelry, nail polish art, long claw nails, dirty nails, hand covering the ear, fingers over the lobe, hand hiding the earring, fingertip touching the earring, finger crossing in front of the stone, hair covering the earring, hair strand across the stone, hair tangled in the earring, scarf or collar occluding the earring, prop or accessory mimicking the earring shape;\n\ntext, watermark, logo, signature, caption, brand name, second model, twins, duplicated face, cloned features, mirror reflection of the model, harsh flat lighting, clinical studio crop, overexposed highlights, blown-out whites, oversaturated, HDR, cluttered background, busy background, distracting props, low resolution, jpeg artifacts, oversharpened halos, cartoon, anime, illustration, painting, 3D render, CGI plastic look, doll-like."
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "Soft warm window light in a quiet luxury interior, creamy bone-and-camel bokeh melting behind her; the model in tender soft profile turned away from camera so a single clean ear is the stage, dark hair swept back and tucked, the reference earring catching one honest sparkle of golden light. Generous negative space to the left; the ear and earring sit on the upper-right power point.",
          "pose": "Soft profile, gaze lowered and away, chin level and serene; her own bare hand rises to gently sweep a single strand of hair back from behind the ear, fingertips clearing well past the lobe so the earring is fully revealed and unobscured — one natural hand, exactly five fingers, neat short nails, no rings or jewelry.",
          "composition": "medium_shot"
        },
        {
          "scene": "Same woman, same reference earring rendered identically, same warm golden-hour glow with oatmeal bokeh; tighter intimate register on the ear, jaw, and slope of the neck. Shallow depth so the background dissolves to cream; a whisper of clean rim light traces the ear edge and the earring is the only specular hero.",
          "pose": "Three-quarter-turned-away angle, head tilted slightly down, eyes softly downcast or closed, lips relaxed; bare fingertips rest lightly at the jawline a clear distance below the ear, framing the earring without touching, crossing, or covering it — relaxed hand, five fingers, no jewelry.",
          "composition": "closeup"
        },
        {
          "scene": "Same consistent woman and the identical reference earring, soft dusk-rose and warm camel light, gentle falloff across the cheek; an elegant slice of face, ear, neck and bare shoulder line, hair swept entirely to the far side so the near ear and earring read with total clarity. Real breathing negative space upper-left.",
          "pose": "Soft profile turned away, serene downcast gaze, neck gracefully elongated; her hand rests softly at the side of the neck below and clear of the ear, fingertips curved away from the earring so a drop hangs free and plumb with a clean air gap to the skin — one natural hand, bare of rings.",
          "composition": "medium_shot"
        },
        {
          "scene": "Same woman, same earring rendered identically, warm honey light with creamy neutral bokeh; the most tender frame — extreme intimate crop on the lobe and the earring itself with a soft sliver of jaw and dark hair, the stone catching a single true honest highlight. Earring on the central-right power point with breathing negative space around it.",
          "pose": "Near-profile, face mostly out of the frame edge with only the cheekbone, jaw and ear sharp, gaze implied away; a single fingertip lifts one wisp of hair clear of the lobe to present the earring, the fingertip kept beside and clear of the stone — clean bare fingertip, neat nail, earring entirely unobscured.",
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
