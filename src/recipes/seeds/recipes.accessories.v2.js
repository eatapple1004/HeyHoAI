/**
 * Doppia recipe seed — Accessories (product mode), v2.
 * 신규 오피셜 vertical "accessories" · 3 템플릿 패밀리(각 부모 1 + 파라미터형 자식).
 *   설계: 2026-07-08 세션(taxonomy accessories 빈 카테고리 → 주얼리 v1 큐레이션).
 *   결정: ① v1 범위 = 주얼리만(반지·목걸이·귀걸이·팔찌). ② 착용컷 = B안 부위 파라미터 컷.
 *
 * 패밀리(부모=진입점 카드 1장씩, category=콘텐츠타입 라벨):
 *   1. Jewelry Product Cut (category "Product Cut", ◈2) — 모델없는 카탈로그 컷.
 *      컷 4종: Flat Lay / Floating / Pedestal / Macro Detail.
 *   2. Jewelry Worn Cut (category "Worn Cut", ◈3) — 부위별 착용 크롭(모델 로스터 없음, 부위 생성).
 *      컷 4종: On Hand(반지·팔찌) / On Neck(목걸이) / On Ears(귀걸이) / On Wrist(팔찌·뱅글).
 *      ⚠️ 손·해부학 고위험 → 전 컷 needs_human_review.
 *   3. Jewelry On Model (category "On Model", ◈5) — 로스터 모델 착용 뷰티 포트레이트.
 *      컷 4종: Earrings / Necklace / Ring / Bracelet(착용 부위를 고정해 종류 오인을 막는다).
 *
 * ── 폐기 이력 ──
 *  · Jewelry Hero 패밀리 전체 = 부모 + 무드 5(Noir Gold·Marble Plinth·Silk Drape·Spotlight·
 *    Floating Luxe). 2026-07-20 사용자 지시로 폐기 — **컨셉은 좋으나 결과물 품질이 미달**.
 *    🔖 **되살릴 때: `git show c06bf9f:src/recipes/seeds/recipes.accessories.v2.js`** 의
 *       "패밀리 3" 블록(6레코드)을 그대로 되붙이면 된다. 같이 되돌릴 곳 = themes.js 2곳
 *       (DEFAULT_OFFICIAL_RECIPES·OFFICIAL_THEME_MAP) · studio.html _NO_TOP_PREVIEW ·
 *       marketplace_templates DB 행(scripts/audit_official_templates.js --apply) ·
 *       랜딩 타일(landing.html·ko.html의 shots.tile.5) · 카드 파이프라인 3스크립트 재실행.
 *    ⚠️ 되살리기 전 검토할 것 — Product Cut과 겹치는 무드가 있었다:
 *       jewelry-floating vs jewelry-floating-luxe(둘 다 공중부양) ·
 *       jewelry-pedestal vs jewelry-marble-plinth(둘 다 받침대, 조명 키만 다름).
 *       concept 축에도 marble·noir·golden이 이미 값으로 있다(Worn Cut). 가격도 Product Cut과
 *       같은 ◈2라 "프리미엄" 신호가 없었고, sort_order가 On Model과 충돌했다(11~15 중복).
 *
 * 중첩 규약(productcut/producthero와 동일):
 *   - 자식마다 config.parent_id = slug(부모 name). 예: 'jewelry-product-cut'.
 *     recipeResolver deepMerge(parent→child) — 자식은 look·shots만 오버라이드, output/subject 상속.
 *   - 자식 숨김 신호 = config.parent_id 존재. 카드/컨트랙트/list()에서 제외, getById만 반환(컷 선택 시 resolve).
 *   - 진입점 = 부모 카드 3장. 패밀리 내 균일 과금.
 *   - ⚠️ 이름 전부 "Jewelry " 프리픽스 → 기존 productcut/producthero/jewelry 슬러그와 충돌 없음(검증됨).
 *
 * 예시 이미지: 컨벤션 경로 /img/accessories/<id>.png(cut은 <cutId>.png). 파일 없으면 그라디언트 폴백.
 * 입력: 주얼리 이미지 1장(레퍼런스). reference_strategy='product_composite'.
 * 비용공식(시드 캐논): image product_composite=ceil(count×0.5). 4컷 → ◈2. 착용컷=on-body +◈1 → ◈3.
 *
 * ⚠️ 자식(parent_id 보유)은 consolidate/contract가 REQ_CFG·개수·가격사다리 검증에서 제외해야 함.
 *    accessories는 PARAM_SECTIONS에 등록(부모만 카드·output/subject는 부모 상속).
 */
module.exports = [
  // ════════════════════════════════════════════════════════════════════════
  // 패밀리 1 · Jewelry Product Cut (제품컷) — 모델없는 클린 카탈로그
  // ════════════════════════════════════════════════════════════════════════
  {
    "mode": "product",
    "vertical": "accessories",
    "category": "Product Cut",
    "name": "Jewelry Product Cut",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "One jewelry photo into clean, catalog-ready product shots — no model, no studio. Sellers pick a cut (flat lay, floating, pedestal or macro detail) and get PDP-ready images with the exact piece locked to the reference. The default cut is a clean floating studio shot.",
    "meta": {
      "axes": ["jewelry"],
      "cuts": ["jewelry-flat-lay", "jewelry-floating", "jewelry-pedestal", "jewelry-macro-detail"],
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Parent = shared base + default clean floating studio. Cut children inherit output/subject and override shots + look. jewelry axis(studio AXIS_DEFS.jewelry) = 종류 힌트 — 컷 프롬프트가 전부 'the piece' 단수·종류중립이라 ①귀걸이가 한 짝만 나오고 ②'upright on the riser'가 목걸이·팔찌에 불가능했다. 축이 pair·drape만 짧게 보탠다(형태는 사진이 이긴다). Verify metal color, gemstones, engraving and clasp match the reference with no morph."
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
        "style_preset": "Studio Beauty",
        "attributes": [
          "context:seamless_studio",
          "lighting:soft_box_key_plus_rim",
          "color:neutral_true",
          "texture:polished_metal_gemstone"
        ],
        "extra_positive": "premium e-commerce jewelry product photography of the uploaded piece, the exact same piece locked across all shots — metal color and finish, gemstones, engraving, prongs and clasp identical to the reference with no morph or drift, tack-sharp macro focus on a light grey seamless gradient background, large softbox key with a crisp specular rim to reveal facets and polish, true-to-life reflections and sparkle, shot on 100mm macro at f/8",
        "extra_negative": "warped or melted metal, mismatched stone color or cut, missing prongs, extra gemstones, gibberish engraving, doubled piece, visible model, human skin, hands, mannequin, fingerprints, dust, harsh blown highlights, cluttered background, logos, text, watermark"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light grey seamless gradient, floating with soft reflection", "pose": "piece front-facing, centered, hero angle", "composition": "closeup" },
        { "scene": "same seamless background, subtle contact shadow", "pose": "piece at a three-quarter angle showing depth and profile", "composition": "closeup" },
        { "scene": "neutral grey surface, tighter crop", "pose": "detail on the setting, gemstone and clasp", "composition": "macro" },
        { "scene": "light grey seamless background", "pose": "full piece silhouette centered with even margins", "composition": "medium_shot" }
      ]
    }
  },

  // ─── 자식 1-1 · Flat Lay (바닥 평면) ─────────────────────────────────────
  {
    "mode": "product",
    "vertical": "accessories",
    "category": "Product Cut",
    "name": "Jewelry Flat Lay",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "Jewelry laid flat and shot top-down on a clean styled surface — the tidy catalog cut.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "jewelry-product-cut",
      "look": {
        "extra_positive": "flat lay jewelry product photography, the piece laid perfectly flat on a light grey seamless surface, crisp top-down overhead angle, symmetric arrangement, faint natural contact shadow, soft even light revealing polish and facets, tack-sharp macro detail",
        "extra_negative": "perspective distortion, tilted horizon, visible model, hands, harsh shadow, cluttered props, fingerprints"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light grey seamless surface, overhead top-down", "pose": "piece laid flat and squared to camera", "composition": "closeup" },
        { "scene": "same surface, faint contact shadow", "pose": "piece flat at a subtle diagonal for styled rhythm", "composition": "closeup" },
        { "scene": "neutral grey surface, tight overhead crop", "pose": "gemstone and setting detail flat, forward", "composition": "macro" },
        { "scene": "light grey seamless surface, wide overhead", "pose": "full piece centered with even margins", "composition": "medium_shot" }
      ]
    }
  },

  // ─── 자식 1-2 · Floating (부양) ──────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "accessories",
    "category": "Product Cut",
    "name": "Jewelry Floating",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 3,
    "rationale": "Levitation shot — the piece floats against a clean gradient with a soft mirror reflection, no visible support.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "jewelry-product-cut",
      "look": {
        "extra_positive": "levitation jewelry product photography, the piece floating in mid-air against a smooth light grey gradient, no visible stand or string, soft mirror reflection pooled beneath, crisp specular rim light revealing every facet and the metal edge, weightless premium mood, tack-sharp macro focus",
        "extra_negative": "visible stand, wire, string, prop, hand, tilted drop, motion blur, harsh blown highlights, cluttered background"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light grey gradient, floating centered", "pose": "piece front-facing, hovering with soft reflection below", "composition": "closeup" },
        { "scene": "same gradient, off-center float", "pose": "piece at a three-quarter turn, weightless", "composition": "closeup" },
        { "scene": "darker vignette gradient", "pose": "profile float emphasizing depth and sparkle", "composition": "macro" },
        { "scene": "light grey gradient, wide", "pose": "full piece floating, generous negative space", "composition": "medium_shot" }
      ]
    }
  },

  // ─── 자식 1-3 · Pedestal (받침대) ────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "accessories",
    "category": "Product Cut",
    "name": "Jewelry Pedestal",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 4,
    "rationale": "Piece elevated on a clean acrylic or stone riser — a poised, boutique display look.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "jewelry-product-cut",
      "look": {
        "extra_positive": "boutique display jewelry photography, the piece resting on a smooth frosted acrylic and pale stone riser, soft gradient seamless backdrop, large softbox key with a gentle rim, elegant elevated composition, tack-sharp macro detail with true reflections",
        "extra_negative": "cluttered props, busy background, visible model, hands, harsh shadow, tilted riser, fingerprints, dust"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "acrylic riser on light gradient", "pose": "piece upright on the riser, front hero angle", "composition": "closeup" },
        { "scene": "pale stone plinth, soft shadow", "pose": "piece at three-quarter on the plinth", "composition": "closeup" },
        { "scene": "low riser, tight crop", "pose": "setting and gemstone detail against the stone", "composition": "macro" },
        { "scene": "riser on seamless backdrop, wide", "pose": "full piece displayed with even margins", "composition": "medium_shot" }
      ]
    }
  },

  // ─── 자식 1-4 · Macro Detail (매크로) ────────────────────────────────────
  {
    "mode": "product",
    "vertical": "accessories",
    "category": "Product Cut",
    "name": "Jewelry Macro Detail",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 5,
    "rationale": "Extreme macro on the gemstone, engraving and clasp — proof-of-quality detail shots.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "jewelry-product-cut",
      "look": {
        "extra_positive": "extreme macro jewelry photography, ultra close-up on the gemstone facets, prong setting, engraving and clasp, razor-sharp focus stacking, tiny highlights sparkling across the cut stone, true metal reflections, soft gradient backdrop, shot on 100mm macro at f/11",
        "extra_negative": "soft focus, motion blur, mismatched stone, gibberish engraving, dust, fingerprints, harsh blown highlights, visible hands, cluttered background"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "gradient backdrop, extreme close", "pose": "gemstone facets filling the frame", "composition": "macro" },
        { "scene": "same, side light", "pose": "prong setting and stone girdle detail", "composition": "macro" },
        { "scene": "neutral backdrop", "pose": "clasp or closure mechanism close-up", "composition": "macro" },
        { "scene": "soft gradient", "pose": "engraving or hallmark surface detail", "composition": "macro" }
      ]
    }
  },

  // ════════════════════════════════════════════════════════════════════════
  // 패밀리 2 · Jewelry Worn Cut (착용컷) — 부위별 파라미터 컷 (B안)
  //   부위(손/목/귀/손목)를 생성해 착용. 모델 로스터 없음. 손·해부학 고위험.
  // ════════════════════════════════════════════════════════════════════════
  {
    "mode": "product",
    "vertical": "accessories",
    "category": "Worn Cut",
    "name": "Jewelry Worn Cut",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 6,
    "rationale": "Show your jewelry being worn — no photoshoot, no face. Pick the body zone that fits your piece (hand, neck, ears or wrist) and get natural on-body crops with the exact piece locked to the reference. Faceless by design; for a shot with a chosen model's face use 'Jewelry On Model'. The default zone is on-hand.",
    "meta": {
      "cuts": ["jewelry-on-hand", "jewelry-on-neck", "jewelry-on-ears", "jewelry-on-wrist"],
      "axes": ["skin", "age", "concept"],
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Faceless on-body composite: the chosen body zone is generated wearing the uploaded piece (no model, no face). meta.axes = studio chip selectors (skin tone / age / concept) injected into the prompt at generate time (no seed variants). High AI-risk on hands/anatomy — verify correct fingers, ears and skin, no face in frame, and that the piece did not morph, before delivery. (Face variant with model picker = 'Jewelry On Model'.)"
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
        "style_preset": "Fashion",
        "attributes": [
          "lighting:soft_box_key_plus_rim",
          "color:neutral_true",
          "texture:natural_skin"
        ],
        "extra_positive": "premium on-body jewelry photography, the exact uploaded piece worn naturally on a realistic well-groomed body part, cropped tightly to the body zone with no face in frame, the piece locked to the reference — metal, gemstones and setting identical with no morph or drift, natural true-to-life skin with soft flattering light, elegant relaxed pose, shallow depth of field keeping the jewelry tack-sharp, clean neutral background",
        "extra_negative": "face, eyes, nose, lips, mouth, portrait, full head, warped or melted metal, mismatched stone, deformed or extra fingers, malformed hands, fused earlobes, distorted anatomy, plastic skin, blemishes, floating jewelry, doubled piece, harsh blown highlights, cluttered background, logos, text, watermark"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "clean neutral background, soft light", "pose": "body part presenting the worn piece, front hero angle", "composition": "closeup" },
        { "scene": "same setting, gentle shadow", "pose": "three-quarter angle showing the piece in wear", "composition": "closeup" },
        { "scene": "soft-focus lifestyle backdrop", "pose": "relaxed natural gesture featuring the piece", "composition": "medium_shot" },
        { "scene": "neutral background, tight crop", "pose": "close detail of the piece on the skin", "composition": "macro" }
      ]
    }
  },

  // ─── 자식 2-1 · On Hand (손 — 반지·팔찌) ─────────────────────────────────
  {
    "mode": "product",
    "vertical": "accessories",
    "category": "Worn Cut",
    "name": "Jewelry On Hand",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 7,
    "meta": { "flags": ["experimental", "needs_human_review"], "render_notes": "Hands are the highest AI-risk zone — verify exactly five natural fingers, correct nails and no ring morph before delivery." },
    "rationale": "Ring or bracelet worn on an elegant, well-manicured hand.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "jewelry-worn-cut",
      "look": {
        "extra_positive": "elegant on-hand jewelry photography, the uploaded ring or bracelet worn on a single well-groomed hand with a single well-formed set of exactly five natural fingers and neat manicured nails, graceful relaxed hand pose, soft flattering light, the jewelry tack-sharp and locked to the reference, clean neutral background with shallow depth of field",
        "extra_negative": "deformed or extra fingers, six fingers, fused or missing fingers, malformed hand, double hand, claw pose, chipped nails, warped ring, mismatched stone, plastic skin, blown highlights, cluttered background"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "clean neutral background, soft key light", "pose": "relaxed hand angled to feature the ring on the finger", "composition": "closeup" },
        { "scene": "soft gradient, gentle shadow", "pose": "hand draped elegantly showing the piece in profile", "composition": "closeup" },
        { "scene": "soft-focus lifestyle backdrop", "pose": "hand resting naturally, jewelry catching light", "composition": "medium_shot" },
        { "scene": "neutral background, tight crop", "pose": "macro of the piece against the skin between fingers", "composition": "macro" }
      ]
    }
  },

  // ─── 자식 2-2 · On Neck (목 — 목걸이) ────────────────────────────────────
  {
    "mode": "product",
    "vertical": "accessories",
    "category": "Worn Cut",
    "name": "Jewelry On Neck",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 8,
    "meta": { "flags": ["experimental", "needs_human_review"], "render_notes": "Faceless — framing on the neck and collarbone only, chin and face cropped out. Verify natural collarbone/décolletage anatomy and that the chain drapes correctly without morphing the pendant. (Face variant = 'Jewelry On Model'.)" },
    "rationale": "Necklace or pendant worn on the neckline — cropped to the neck, no face shown.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "jewelry-worn-cut",
      "look": {
        "extra_positive": "elegant on-neck jewelry photography, the uploaded necklace or pendant draped naturally on a smooth neckline and collarbone, framing cropped to the neck and décolletage with the chin and face out of frame, the chain following the collarbone with the pendant centered and tack-sharp, locked to the reference, soft flattering light, true skin texture, clean minimal styling, shallow depth of field",
        "extra_negative": "face, chin, jaw, eyes, nose, lips, mouth, portrait, full head, distorted neck anatomy, floating necklace, broken or morphed chain, doubled pendant, mismatched stone, plastic skin, harsh shadow, cluttered background",
        "notes": "framing on the neck and collarbone only — chin and face cropped out of frame"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "clean neutral background, soft light", "pose": "neckline front-on, chain draped, pendant centered, no face", "composition": "closeup" },
        { "scene": "soft gradient, gentle shadow", "pose": "slight turn showing chain flow across the collarbone", "composition": "closeup" },
        { "scene": "neutral backdrop, neck-only crop", "pose": "décolletage featuring the necklace, cropped below the chin", "composition": "closeup" },
        { "scene": "neutral background, tight crop", "pose": "macro of the pendant resting on the skin", "composition": "macro" }
      ]
    }
  },

  // ─── 자식 2-3 · On Ears (귀 — 귀걸이) ────────────────────────────────────
  {
    "mode": "product",
    "vertical": "accessories",
    "category": "Worn Cut",
    "name": "Jewelry On Ears",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 9,
    "meta": { "flags": ["experimental", "needs_human_review"], "render_notes": "Faceless — tight crop on the ear only, no face in frame. Verify natural single earlobe anatomy and that the earring is not duplicated or fused to the ear. (Face variant = 'Jewelry On Model'.)" },
    "rationale": "Earrings worn on the ear — tight crop, no face shown.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "jewelry-worn-cut",
      "look": {
        "extra_positive": "elegant on-ear jewelry photography, the uploaded earring worn on a natural well-formed earlobe, framed as an extreme tight crop on the ear only with no face in the frame, hair softly tucked back to reveal the ear, the earring tack-sharp and locked to the reference, soft flattering light, true skin texture, clean neutral background, shallow depth of field",
        "extra_negative": "face, eyes, nose, lips, mouth, cheek, chin, portrait, full head, deformed ear, fused earlobe, doubled earring, extra piercings, morphed metal, mismatched stone, plastic skin, hair covering the earring, harsh shadow, cluttered background",
        "notes": "extreme tight crop on the ear and earlobe only — no face visible in frame"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "clean neutral background, soft key light", "pose": "tight crop of the ear presenting the earring, no face", "composition": "closeup" },
        { "scene": "soft gradient, gentle shadow", "pose": "slight turn showing the earring drop, cropped to the ear", "composition": "closeup" },
        { "scene": "neutral backdrop, ear-only crop", "pose": "earring movement detail against the lobe", "composition": "closeup" },
        { "scene": "neutral background, tight crop", "pose": "macro of the earring on the lobe", "composition": "macro" }
      ]
    }
  },

  // ─── 자식 2-4 · On Wrist (손목 — 팔찌·뱅글) ──────────────────────────────
  {
    "mode": "product",
    "vertical": "accessories",
    "category": "Worn Cut",
    "name": "Jewelry On Wrist",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 10,
    "meta": { "flags": ["experimental", "needs_human_review"], "render_notes": "Verify natural wrist and hand anatomy and that the bracelet/bangle wraps correctly without morphing." },
    "rationale": "Bracelet or bangle worn on the wrist.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "jewelry-worn-cut",
      "look": {
        "extra_positive": "elegant on-wrist jewelry photography, the uploaded bracelet or bangle worn wrapping naturally around a slender well-groomed wrist, the piece tack-sharp and locked to the reference, graceful relaxed hand and wrist pose, soft flattering light, true skin texture, clean neutral background, shallow depth of field",
        "extra_negative": "deformed wrist, malformed hand, extra fingers, morphed or broken bracelet, doubled piece, mismatched stone, plastic skin, harsh shadow, cluttered background"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "clean neutral background, soft key light", "pose": "relaxed wrist angled to feature the bracelet", "composition": "closeup" },
        { "scene": "soft gradient, gentle shadow", "pose": "wrist turned showing the piece wrapping around", "composition": "closeup" },
        { "scene": "soft-focus lifestyle backdrop", "pose": "hand resting naturally, bracelet catching light", "composition": "medium_shot" },
        { "scene": "neutral background, tight crop", "pose": "macro of the bracelet on the wrist", "composition": "macro" }
      ]
    }
  },

  // ════════════════════════════════════════════════════════════════════════
  // 패밀리 2b · Jewelry On Model (모델 착용컷) — 얼굴 O, 모델 픽커 + 악세서리 종류 컷
  //   meta.picker='model' → Studio가 모델 로스터(80) + 배경 픽커 렌더(선택 모델 얼굴 O).
  //   + cuts 4종(악세서리 종류) → 모달에 종류 선택 그리드 동시 렌더. 컷이 착용 부위를 명시해
  //     오인식(귀걸이→반지) 제거. 전 컷 상반신 뷰티 포트레이트 고정(전신 제외, 주얼리 크게 보이게).
  //   과금 = full 모델(얼굴) 합성 → ◈5(studiomodel과 동일). 컷+picker 공존은 studio 검증됨.
  // ════════════════════════════════════════════════════════════════════════
  {
    "mode": "product",
    "vertical": "accessories",
    "category": "On Model",
    "name": "Jewelry On Model",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 11,
    "rationale": "Put your jewelry on a real-looking model — face and all. Pick your accessory type (earrings, necklace, ring or bracelet), a house model and a background, and get aspirational upper-body beauty-portrait shots with the model wearing your piece where it belongs. The exact piece is locked to the reference; the chosen model's face is shown. Default type is earrings. For a faceless body-part crop use 'Jewelry Worn Cut' instead.",
    "meta": {
      "picker": "model",
      "cuts": ["jewelry-on-model-earrings", "jewelry-on-model-necklace", "jewelry-on-model-ring", "jewelry-on-model-bracelet"],
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "On-model composite with face + accessory-type cut. The selected roster model image is passed as an identity reference alongside the uploaded jewelry; the chosen background is injected. The cut fixes WHERE the piece is worn (earrings→ears, necklace→neckline, ring→hand near face, bracelet→wrist) so it is never mistaken for another type. All framings are waist-up upper-body portraits — never full body. Verify no jewelry morph, correct anatomy (hands/ears) and no identity drift before delivery."
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
        "style_preset": "Fashion",
        "attributes": [
          "lighting:soft_box_key_plus_rim",
          "color:neutral_true",
          "texture:natural_skin"
        ],
        "extra_positive": "premium on-model beauty jewelry photography, the selected model wearing the uploaded jewelry, waist-up upper-body beauty portrait framing that keeps the jewelry large and clearly visible, the exact same piece locked to the reference — metal, gemstones and setting identical with no morph or drift, relaxed natural model pose and soft expression, flattering beauty light, the jewelry tack-sharp with shallow depth of field, true-to-life skin, clean editorial styling, a single well-formed pair of hands with exactly five natural fingers each when hands are shown",
        "extra_negative": "full body, full-length shot, legs, feet, distant wide shot with tiny jewelry, wrong jewelry type, warped or melted metal, mismatched stone, doubled piece, deformed or extra fingers, malformed hands, fused or deformed ears, distorted face, identity drift from the model reference, plastic skin, floating jewelry, blown highlights, cluttered distracting background, logos, text, watermark"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "chosen setting", "pose": "model waist-up beauty portrait front-facing, relaxed, featuring the worn jewelry", "composition": "medium_shot" },
        { "scene": "chosen setting", "pose": "model upper-body at a slight three-quarter turn showing the piece in wear", "composition": "medium_shot" },
        { "scene": "chosen setting", "pose": "tighter beauty crop on the worn area with the model's expression", "composition": "closeup" },
        { "scene": "chosen setting", "pose": "upper-body editorial portrait stance featuring the jewelry", "composition": "medium_shot" }
      ]
    }
  },

  // ─── 자식 2b-1 · On Model Earrings (귀걸이) ──────────────────────────────
  {
    "mode": "product",
    "vertical": "accessories",
    "category": "On Model",
    "name": "Jewelry On Model Earrings",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 12,
    "meta": { "flags": ["experimental", "needs_human_review"], "render_notes": "Model wears EARRINGS on the ears — waist-up beauty portrait. Verify the piece reads as earrings (not a ring/necklace), natural ears, no full body." },
    "rationale": "Model wearing your earrings — upper-body beauty portrait beside the face.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "jewelry-on-model",
      "look": {
        "extra_positive": "premium on-model beauty jewelry photography, the selected model wearing the uploaded earrings on both ears, waist-up upper-body beauty portrait framing the face and ears so the earrings are clearly featured beside the jawline, hair softly styled back to reveal the ears, the earrings tack-sharp and locked to the reference, relaxed natural expression, flattering beauty light, true skin, clean editorial styling",
        "extra_negative": "full body, legs, feet, ring, necklace, bracelet, worn on the wrong body part, wrong jewelry type, doubled earring, deformed or fused ears, distorted face, plastic skin, cluttered background"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "chosen setting", "pose": "waist-up front beauty portrait, earrings featured beside the face", "composition": "medium_shot" },
        { "scene": "chosen setting", "pose": "slight three-quarter turn highlighting one earring's drop", "composition": "medium_shot" },
        { "scene": "chosen setting", "pose": "tight beauty crop on the ear and earring with the model's expression", "composition": "closeup" },
        { "scene": "chosen setting", "pose": "upper-body editorial stance, hair back, both earrings visible", "composition": "medium_shot" }
      ]
    }
  },

  // ─── 자식 2b-2 · On Model Necklace (목걸이) ──────────────────────────────
  {
    "mode": "product",
    "vertical": "accessories",
    "category": "On Model",
    "name": "Jewelry On Model Necklace",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 13,
    "meta": { "flags": ["experimental", "needs_human_review"], "render_notes": "Model wears a NECKLACE on the neckline — waist-up portrait. Verify the piece reads as a necklace (not earrings/ring), natural neckline, no full body." },
    "rationale": "Model wearing your necklace — upper-body portrait on the neckline.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "jewelry-on-model",
      "look": {
        "extra_positive": "premium on-model beauty jewelry photography, the selected model wearing the uploaded necklace on the neckline and décolletage, waist-up upper-body beauty portrait framing the neck and chest so the necklace is clearly featured, the necklace tack-sharp and locked to the reference, chain draping naturally along the collarbone, relaxed natural expression, flattering beauty light, true skin, clean editorial styling",
        "extra_negative": "full body, legs, feet, earrings as the focus, ring, bracelet, worn on the wrong body part, wrong jewelry type, doubled pendant, broken or morphed chain, distorted neck, plastic skin, cluttered background"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "chosen setting", "pose": "waist-up front portrait, necklace centered on the neckline", "composition": "medium_shot" },
        { "scene": "chosen setting", "pose": "slight three-quarter turn showing the chain drape", "composition": "medium_shot" },
        { "scene": "chosen setting", "pose": "closer crop on the neckline and pendant with the model's expression", "composition": "closeup" },
        { "scene": "chosen setting", "pose": "upper-body editorial stance featuring the necklace", "composition": "medium_shot" }
      ]
    }
  },

  // ─── 자식 2b-3 · On Model Ring (반지) ────────────────────────────────────
  {
    "mode": "product",
    "vertical": "accessories",
    "category": "On Model",
    "name": "Jewelry On Model Ring",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 14,
    "meta": { "flags": ["experimental", "needs_human_review"], "render_notes": "Model wears a RING on a finger, hand raised near the face — waist-up portrait. Verify five natural fingers, the piece reads as a ring, no full body." },
    "rationale": "Model wearing your ring — upper-body portrait with the hand raised near the face.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "jewelry-on-model",
      "look": {
        "extra_positive": "premium on-model beauty jewelry photography, the selected model wearing the uploaded ring on a finger, waist-up upper-body beauty portrait with one hand raised gracefully near the face or chin so the ring is clearly featured, a single well-formed hand with exactly five natural fingers and neat nails, the ring tack-sharp and locked to the reference, relaxed natural expression, flattering beauty light, true skin, clean editorial styling",
        "extra_negative": "full body, legs, feet, earrings, necklace as the focus, bracelet, worn on the wrong body part, wrong jewelry type, deformed or extra fingers, six fingers, malformed hand, warped ring, plastic skin, cluttered background"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "chosen setting", "pose": "waist-up portrait, hand raised near the cheek featuring the ring", "composition": "medium_shot" },
        { "scene": "chosen setting", "pose": "hand resting under the chin, ring toward camera", "composition": "medium_shot" },
        { "scene": "chosen setting", "pose": "tight crop on the hand and ring near the face", "composition": "closeup" },
        { "scene": "chosen setting", "pose": "upper-body editorial stance, hand elegantly framing the face", "composition": "medium_shot" }
      ]
    }
  },

  // ─── 자식 2b-4 · On Model Bracelet (팔찌) ────────────────────────────────
  {
    "mode": "product",
    "vertical": "accessories",
    "category": "On Model",
    "name": "Jewelry On Model Bracelet",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 15,
    "meta": { "flags": ["experimental", "needs_human_review"], "render_notes": "Model wears a BRACELET on the wrist, hand raised near the shoulder/face — waist-up portrait. Verify natural wrist/hand, the piece reads as a bracelet, no full body." },
    "rationale": "Model wearing your bracelet — upper-body portrait with the wrist raised.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "jewelry-on-model",
      "look": {
        "extra_positive": "premium on-model beauty jewelry photography, the selected model wearing the uploaded bracelet on the wrist, waist-up upper-body beauty portrait with the hand and wrist raised gracefully near the shoulder or face so the bracelet is clearly featured wrapping the wrist, a single well-formed hand with exactly five natural fingers, the bracelet tack-sharp and locked to the reference, relaxed natural expression, flattering beauty light, true skin, clean editorial styling",
        "extra_negative": "full body, legs, feet, earrings, necklace as the focus, ring as the focus, worn on the wrong body part, wrong jewelry type, deformed wrist, extra fingers, malformed hand, morphed or broken bracelet, plastic skin, cluttered background"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "chosen setting", "pose": "waist-up portrait, wrist raised near the shoulder featuring the bracelet", "composition": "medium_shot" },
        { "scene": "chosen setting", "pose": "hand near the collarbone, bracelet wrapping the wrist toward camera", "composition": "medium_shot" },
        { "scene": "chosen setting", "pose": "tight crop on the wrist and bracelet", "composition": "closeup" },
        { "scene": "chosen setting", "pose": "upper-body editorial stance, wrist elegantly featured", "composition": "medium_shot" }
      ]
    }
  }
];
