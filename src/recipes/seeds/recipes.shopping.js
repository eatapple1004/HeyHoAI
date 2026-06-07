/**
 * 쇼핑몰 모드 레시피 시드 (통합 스키마 v1)
 * 제품을 레퍼런스로 → 연출 씬 합성 / 착용샷. docs/TEMPLATE_STRUCTURE.md 참조.
 */
module.exports = [
  {
    mode: 'shopping', category: '화보', name: 'Studio Lookbook',
    output_type: 'image_set', credit_cost: 2, sort_order: 1,
    config: {
      schema_version: 1, mode: 'shopping',
      output: { type: 'image_set', count: 4, aspect_ratio: '4:5' },
      subject: { type: 'product', reference_strategy: 'product_composite', min_refs: 1 },
      look: {
        style_preset: 'Fashion',
        attributes: ['context:studio_white', 'lighting:studio_soft', 'texture:fabric_detail'],
        extra_positive: 'e-commerce product photography, clean catalog look',
      },
      shot_strategy: 'list',
      shots: [
        { scene: 'clean white studio background', pose: 'product centered, front view', composition: 'medium_shot' },
        { scene: 'white studio with soft shadow', pose: 'product 3/4 angle', composition: 'medium_shot' },
        { scene: 'minimal grey backdrop', pose: 'product detail close-up', composition: 'closeup' },
        { scene: 'white studio, styled flat', pose: 'product with props', composition: 'full_body' },
      ],
      editable_slots: [], parent_id: null,
      provider: { image: 'nano-banana', video: 'kling' },
    },
  },
  {
    mode: 'shopping', category: '감성', name: 'Lifestyle Mood Shot',
    output_type: 'image_set', credit_cost: 2, sort_order: 2,
    config: {
      schema_version: 1, mode: 'shopping',
      output: { type: 'image_set', count: 4, aspect_ratio: '4:5' },
      subject: { type: 'product', reference_strategy: 'product_composite', min_refs: 1 },
      look: {
        style_preset: 'Film',
        attributes: ['lighting:natural_soft', 'color:film_fuji', 'context:cafe_indoor'],
        extra_positive: 'lifestyle mood, product in real-life context, aspirational',
      },
      shot_strategy: 'list',
      shots: [
        { scene: 'sunlit wooden table by window', pose: 'product placed naturally with coffee', composition: 'medium_shot' },
        { scene: 'cozy linen bedsheet', pose: 'product styled on fabric', composition: 'closeup' },
        { scene: 'outdoor cafe table, greenery', pose: 'product in daily-use scene', composition: 'medium_shot' },
        { scene: 'minimal shelf with plants', pose: 'product as part of decor', composition: 'medium_shot' },
      ],
      editable_slots: [], parent_id: null,
      provider: { image: 'nano-banana', video: 'kling' },
    },
  },
  {
    mode: 'shopping', category: '착용', name: 'On-Model Wear (Beta)',
    output_type: 'image_set', credit_cost: 3, sort_order: 3,
    config: {
      schema_version: 1, mode: 'shopping',
      output: { type: 'image_set', count: 3, aspect_ratio: '4:5' },
      subject: { type: 'product', reference_strategy: 'on_model_tryon', min_refs: 1 },
      look: {
        style_preset: 'Natural',
        attributes: ['lighting:natural_soft', 'context:street_urban', 'composition:full_body'],
        extra_positive: 'realistic on-model fit, natural drape of the garment',
      },
      shot_strategy: 'list',
      shots: [
        { scene: 'modern urban street', pose: 'model walking, wearing the product', composition: 'full_body' },
        { scene: 'minimal studio', pose: 'model standing, front fit view', composition: 'full_body' },
        { scene: 'cafe interior', pose: 'model seated, casual fit', composition: 'medium_shot' },
      ],
      editable_slots: [], parent_id: null,
      provider: { image: 'nano-banana', video: 'kling' },
    },
  },
];
