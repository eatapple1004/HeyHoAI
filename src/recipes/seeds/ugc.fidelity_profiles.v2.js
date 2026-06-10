/**
 * UGC × 제품 버티컬 — 충실도 프로파일 (버티컬→UGC 브리지용 데이터 시드)
 * ------------------------------------------------------------------------
 * 배경(이 대화 결론): UGC를 제품 버티컬에 "병합"하지 않는다. 대신 UGC는 공용 광고-포맷
 *   라이브러리로 두고, 버티컬에서 [이 제품으로 UGC 광고] 로 건너올 때 **제품 레퍼런스 +
 *   해당 버티컬의 충실도 프로파일**만 얹어 합성한다(= 연결 단위 = 제품/버티컬, 템플릿 아님).
 *
 * 적용 규칙(resolver/bridge):
 *   bridgedLook = mergeUGC(
 *     baseUGCRecipe.look,                       // UGC 7포맷 중 선택(Demo/Testimonial/Hook+CTA…)
 *     COMMON.add_positive, COMMON.add_negative, // ① 동일 적용(모든 제품 공통)
 *     drop(COMMON.remove_negative),             // ② 동일 제거(반-인물 가드 해제)
 *     PROFILES[vertical]                         // ③ 버티컬별 차등(있으면)
 *   )
 *
 * 3분류:
 *   ① COMMON.add_*       = 8개 버티컬에 **동일하게** 적용(제품 보존 + 스포크스퍼슨/립싱크/손).
 *   ② COMMON.remove_*    = 8개 버티컬에서 **동일하게 제거**(제품 템플릿의 "no model/hands/faces"
 *                          가드는 UGC=사람이 주인공이라 반드시 해제).
 *   ③ PROFILES[vertical] = 버티컬마다 **다르게** 적용(제품 충실도 + 제품-상호작용 + 추가 리스크).
 *
 * 카탈로그 정독 출처: recipes.{fashion,beauty,jewelry,food,home,tech,pet,general}.v2.js (look.negative 추출).
 */
module.exports = {
  schema_version: 1,
  kind: 'ugc_fidelity_profiles',

  // ── ① 동일 적용 + ② 동일 제거 (모든 제품 버티컬 공통) ──────────────────────
  COMMON: {
    applies_to: ['fashion', 'beauty', 'jewelry', 'food', 'home', 'tech', 'pet', 'general'],

    // ① 동일 적용 — 제품 보존(어떤 제품이든 같은 문장)
    add_positive:
      'the featured product stays identical to the uploaded reference in shape, color, material, finish, proportions and any branding; the same physical object appears in every shot and angle while the spokesperson presents it',
    add_negative:
      'invented product, shape morphing, added or missing parts not in reference, color shift, warped geometry, duplicated product, product detail loss, material morphing',

    // ① 동일 적용 — 스포크스퍼슨/말하기 하드닝(UGC는 항상 말하는 인물이므로 공통)
    spokesperson_negative:
      'lip-sync desync, mouth or tooth morph, identity drift between shots, extra fingers, deformed or fused fingers, warped hands, plastic over-retouched skin, jittery unstable motion, watermark',
    flags: ['experimental', 'needs_human_review'],
    talking_limit: '1-2 sentences per shot + B-roll cutaways',

    // ② 동일 제거 — 제품 템플릿의 "반-인물 가드". UGC는 사람이 주인공이라 전 버티컬에서 해제.
    //   (예: food='hands','faces or heads in frame','people\'s faces' / general='model or hands in frame'
    //        / fashion 360='live model in frame'. 이 토큰들이 base look.negative에 있으면 제거.)
    remove_negative: [
      'no model', 'live model in frame', 'model or hands in frame',
      'hands', 'extra hands', 'fingers in frame',
      'faces or heads in frame', "people's faces", 'people', 'person in frame', 'human'
    ],
    remove_note:
      '제거는 정확히 "인물 자체를 금지"하는 토큰에만 적용. "extra fingers / malformed hands" 같은 ' +
      '품질 가드는 유지(오히려 spokesperson_negative로 강화).'
  },

  // ── ③ 버티컬별 차등 적용 ────────────────────────────────────────────────
  // bespoke: low = COMMON 거의 그대로 / high = 고유 충실도·상호작용·리스크 필수.
  // has_onmodel_seed: 사람이 제품을 착용/사용하는 템플릿이 이미 시드로 존재(재사용 소스).
  PROFILES: {
    // ▼ 동일 적용 그룹(저-bespoke): 사람-제품 시드 없음 → COMMON으로 거의 균일 적용
    general: {
      bespoke: 'low', has_onmodel_seed: false,
      fidelity_negative: '',                       // COMMON으로 충분(general=catch-all=공통 그 자체)
      interaction: 'spokesperson holds the product up to camera, generic handling',
      framing: 'medium_shot', extra_flags: []
    },
    home: {
      bespoke: 'low', has_onmodel_seed: false,
      fidelity_negative:
        'distorted proportions, wrong scale in the room, floating furniture, melted edges, morphing surfaces, invented surface patterns, room geometry changing between shots',
      interaction: 'spokesperson presents/gestures toward the product placed in a real room (not held close)',
      framing: 'medium_shot', extra_flags: []
    },
    tech: {
      bespoke: 'medium', has_onmodel_seed: false,
      fidelity_negative:
        'warped geometry, duplicated ports, extra buttons, fake or gibberish logos, gibberish UI or screen text, device changing shape between frames',
      interaction: 'spokesperson operates the device in hand, partial-hand framing only',
      framing: 'closeup', extra_flags: ['finger_risk'],
      finger_negative: 'six fingers, fused digits, floating disconnected hand, melting fingers, full hand splayed unnaturally'
    },

    // ▼ 차등 적용 그룹(고-bespoke): 사람-제품 시드(on_model_tryon) 이미 존재 → 고유 충실도/리스크 재사용
    fashion: {
      bespoke: 'high', has_onmodel_seed: true,
      fidelity_negative:
        'warped or melted garment, mismatched color or print, extra seams, loose ill-fitting drape, garment floating off body, fabric morphing, invented patterns not on reference, duplicated stitches',
      interaction: 'spokesperson wears the garment and shows fit and movement (on_model_tryon)',
      framing: 'full_body', extra_flags: ['fit_risk']
    },
    beauty: {
      bespoke: 'high', has_onmodel_seed: true,
      fidelity_negative:
        'distorted label text, gibberish typography, smudged logo, off-tone or color-shifted shade, plastic-looking liquid; on skin: plastic waxy over-smoothed face, inconsistent face across shots, skin-tone or face-shape change',
      interaction: 'spokesperson applies/uses the product on their own face or hand, true-to-shade',
      framing: 'closeup', extra_flags: ['identity_consistency', 'text_overlay'],
      note: '클레임/성분/before-after 문구는 AI로 그리지 말고 text_overlay. before/after는 동일 인물 락 필수.'
    },
    jewelry: {
      bespoke: 'high', has_onmodel_seed: true,
      fidelity_negative:
        'warped or duplicated stone, distorted prongs, melted metal, asymmetric facets, missing or extra stones, wrong number of stones',
      interaction: 'spokesperson wears the piece (wrist/neck/hand) and shows it in tight framing',
      framing: 'closeup', extra_flags: ['finger_risk_high'],
      finger_negative:
        'single hand with incorrect finger count, extra fingers beyond five, missing or fused or webbed or claw fingers, warped knuckle joints, malformed wrist',
      note: '소형 제품 + 손목 착용 = 손가락 리스크 최고. 부분 손 크롭 권장.'
    },
    pet: {
      bespoke: 'high', has_onmodel_seed: true,
      fidelity_negative:
        'warped or recolored product, product floating off the body, wrong scale or fit, warped buckles or straps',
      interaction: 'spokesperson shows the product on/with a pet (product is the hero, pet secondary)',
      framing: 'medium_shot', extra_flags: ['pet_morph_risk'],
      pet_negative:
        'deformed pet anatomy, extra or missing limbs, fused paws, warped muzzle, human-like mouth morph, fused fabric into fur, plastic melting fur',
      note: '토킹펫 결합 시 muzzle/lip-sync drift 추가 검수.'
    },

    // ▼ 특수: food — 사람-제품 시드 없음 + "반-인물 가드 제거"가 가장 강하게 필요(가드 인버전)
    food: {
      bespoke: 'high', has_onmodel_seed: false,
      fidelity_negative:
        'warped or melted food, plastic-looking food, soggy wilted garnish, fake CGI steam, morphing toppings, inconsistent dish geometry between shots',
      interaction: 'spokesperson eats / holds / serves the dish and reacts to camera',
      framing: 'medium_shot', extra_flags: ['guard_inversion'],
      inversion_note:
        '⚠ food 제품 템플릿은 "hands / faces or heads / people\'s faces in frame"을 금지하지만, ' +
        'UGC food = 사람이 먹는 영상이므로 그 금지를 반드시 해제(COMMON.remove_negative). ' +
        '단 "clean manicured hands, no awkward stiff pose, appetizing true-to-dish"는 유지.'
    }
  }
};
