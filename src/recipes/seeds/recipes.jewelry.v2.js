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
  }
];
