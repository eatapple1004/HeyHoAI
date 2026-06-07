/**
 * 인플루언서 모드 레시피 시드 (통합 스키마 v1)
 * docs/TEMPLATE_STRUCTURE.md 참조. recipes 테이블에 INSERT 될 데이터.
 */
module.exports = [
  {
    mode: 'influencer', category: 'Style', name: 'Travel Mood — Golden Hour',
    output_type: 'image_set', credit_cost: 2, sort_order: 1,
    config: {
      schema_version: 1, mode: 'influencer',
      output: { type: 'image_set', count: 4, aspect_ratio: '4:5' },
      subject: { type: 'face', reference_strategy: 'identity_lock', min_refs: 1 },
      look: {
        style_preset: 'Film',
        attributes: ['lighting:golden_hour', 'color:film_kodak', 'texture:grain_film'],
        wardrobe: 'casual summer dress',
        extra_positive: 'candid travel vibe, wanderlust mood',
      },
      shot_strategy: 'list',
      shots: [
        { scene: 'sandy beach at golden hour, ocean waves', pose: 'walking casually, candid', composition: 'full_body' },
        { scene: 'rooftop terrace with city skyline at sunset', pose: 'leaning on railing, relaxed', composition: 'medium_shot' },
        { scene: 'seaside cafe by the window', pose: 'holding coffee, soft smile', composition: 'closeup' },
        { scene: 'boardwalk path at sunset', pose: 'looking back over shoulder', composition: 'full_body' },
      ],
      editable_slots: [
        { key: 'look.wardrobe', label: 'Outfit', options: ['summer dress', 'linen shirt', 'denim'] },
      ],
      parent_id: null,
      provider: { image: 'nano-banana', video: 'kling' },
    },
  },
  {
    mode: 'influencer', category: 'Style', name: 'Cozy Cafe Portrait',
    output_type: 'image_set', credit_cost: 2, sort_order: 2,
    config: {
      schema_version: 1, mode: 'influencer',
      output: { type: 'image_set', count: 4, aspect_ratio: '4:5' },
      subject: { type: 'face', reference_strategy: 'identity_lock', min_refs: 1 },
      look: {
        style_preset: 'Portrait',
        attributes: ['lighting:natural_soft', 'color:warm_tone', 'context:cafe_indoor', 'texture:skin_dewy'],
        wardrobe: 'cozy knit sweater',
        extra_positive: 'warm intimate atmosphere',
      },
      shot_strategy: 'list',
      shots: [
        { scene: 'cozy indoor cafe with warm lighting', pose: 'sitting at table, natural smile', composition: 'closeup' },
        { scene: 'cafe window seat, soft daylight', pose: 'holding mug with both hands', composition: 'medium_shot' },
        { scene: 'cafe corner with plants', pose: 'reading, candid side glance', composition: 'medium_shot' },
        { scene: 'bar counter, bokeh background', pose: 'laughing, looking away', composition: 'closeup' },
      ],
      editable_slots: [], parent_id: null,
      provider: { image: 'nano-banana', video: 'kling' },
    },
  },
  {
    mode: 'influencer', category: 'Trend', name: 'GRWM (Get Ready With Me)',
    output_type: 'reel', credit_cost: 6, sort_order: 3,
    config: {
      schema_version: 1, mode: 'influencer',
      output: { type: 'reel', count: 3, aspect_ratio: '9:16' },
      subject: { type: 'face', reference_strategy: 'identity_lock', min_refs: 1 },
      look: {
        style_preset: 'Glamour',
        attributes: ['lighting:ring_light', 'texture:skin_smooth', 'color:neutral_tone'],
        wardrobe: 'chic going-out outfit',
        extra_positive: 'beauty influencer aesthetic',
      },
      shot_strategy: 'list',
      shots: [
        { scene: 'bright vanity mirror, getting ready', pose: 'looking into mirror', composition: 'closeup' },
        { scene: 'applying makeup at vanity', pose: 'applying lipstick', composition: 'closeup' },
        { scene: 'full outfit reveal in bedroom mirror', pose: 'confident final pose', composition: 'full_body' },
      ],
      reel: {
        per_shot_motion: ['gentle push-in', 'slow pan across face', 'orbit reveal'],
        duration_per_shot: 3, transition: 'whip', music_mood: 'upbeat', captions: 'auto',
      },
      editable_slots: [], parent_id: null,
      provider: { image: 'nano-banana', video: 'kling' },
    },
  },
];
