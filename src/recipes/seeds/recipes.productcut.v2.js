/**
 * Doppia recipe seed — Product Cut (product mode), v2.
 * 새 오피셜 테마 "productcut" · 부모 1 템플릿 + 컷 2종 자식(파라미터형 중첩).
 * 설계 결정: docs/제품컷_중첩템플릿_설계결정_2026-07-05.md
 *   - 컷 2종(바닥/고스트) = 테마 X · 2템플릿 X → "제품컷" 부모의 세부옵션.
 *     (2026-07-08 옷걸이·오브제·디테일 컷 제거 — 배경색 지정 지원 컷만 유지.)
 *   - 데이터: 자식마다 config.parent_id='product-cut' → recipeResolver deepMerge(parent→child).
 *     자식은 shots·look만 오버라이드하고 output/subject 등 공통은 부모 상속(배열은 통째 교체됨).
 *   - 자식 숨김 신호 = config.parent_id 존재(별도 hidden 플래그 없음). 카드 리스트/컨트랙트/list()에서
 *     parent_id 있는 레시피는 제외. getById만 반환(Studio 컷 선택 시 resolve). 다단 중첩에도 그대로 적용.
 *   - 진입점 = 부모 "Product Cut" 카드 1장. 균일 과금(전 컷 count=4 → resolver ceil(4×0.5)=◈2).
 *
 * 확정 스코프(2026-07-05 Chief): 컷 유형만(효과 축2 나중) · 신규 slug productcut ·
 *   단건 선택(배치 나중) · 균일 과금.
 *
 * 예시 이미지: 시드에 하드코딩하지 않음. Studio가 컨벤션 경로 /img/productcut/<id>.png를 시도 —
 *   파일 있으면 부모=카드 썸네일·자식=모달 미리보기로 표시, 없으면 다른 카드와 동일한 그라디언트/placeholder로 폴백.
 *   (명시 override 필요 시 레시피에 top-level "preview" 추가하면 우선.) 안내=public/img/productcut/README.md.
 *
 * 입력: 의류 이미지 1장(레퍼런스). 모델 없음 → reference_strategy='product_composite'.
 * 비용공식(시드 캐논): image product_composite=ceil(count×0.5). 4컷 → ◈2.
 *
 * ⚠️ 자식(parent_id 보유)은 consolidate/contract가 REQ_CFG·개수·가격사다리 검증에서 제외해야 함
 *   (부모만 카드·output/subject는 부모 상속이라 자체엔 없음). 미대응 시 "config.output 누락" 등 오탐 발생.
 */
module.exports = [
  // ─── 부모(진입점 카드) · Product Cut ─────────────────────────────────────
  {
    "mode": "product",
    "vertical": "productcut",
    "category": "ProductCut",
    "name": "Product Cut",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "One flat garment photo into a clean e-commerce product cut. Sellers pick a cut type (flat lay or ghost mannequin) and get catalog-ready shots with no model or studio. The default cut is a neutral floor flat lay; the cut selector swaps in a specialized child recipe.",
    "meta": {
      "cuts": ["flat-lay-cut", "ghost-mannequin-cut"],
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Parent = shared base + default flat-lay. Cut children inherit output/subject and override shots + look. Ghost mannequin (hollow-body) is high AI-risk — queue for human QA."
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
          "context:seamless_studio",
          "lighting:studio_softbox",
          "color:neutral_true",
          "texture:fabric_weave"
        ],
        "extra_positive": "e-commerce product photography of the uploaded garment, the exact same garment locked across all shots — color, print, seams, hardware and neckline identical to the reference with no morph or drift, clean catalog styling, true-to-life fabric drape and visible stitching, light grey seamless background, soft even studio light, shot on 85mm f/8 full-frame",
        "extra_negative": "warped or melted garment, mismatched color or print, extra seams, mannequin face, visible model, human skin, blown highlights, harsh shadows, cluttered background"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light grey seamless surface, flat top-down layout", "pose": "garment laid flat and squared to camera, sleeves relaxed", "composition": "medium_shot" },
        { "scene": "same seamless surface, subtle contact shadow", "pose": "garment flat at a slight three-quarter angle showing drape", "composition": "medium_shot" },
        { "scene": "neutral grey surface, tighter crop", "pose": "garment flat with collar and neckline detail forward", "composition": "closeup" },
        { "scene": "light grey seamless surface", "pose": "garment flat, full silhouette centered with even margins", "composition": "full_body" }
      ]
    }
  },

  // ─── 자식 1 · 바닥컷 (Flat Lay) ─────────────────────────────────────────
  {
    "mode": "product",
    "vertical": "productcut",
    "category": "ProductCut",
    "name": "Flat Lay Cut",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "Garment laid flat and shot top-down on a clean surface — the default catalog cut.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "product-cut",
      "look": {
        "extra_positive": "flat lay product photography, garment laid perfectly flat on a light grey seamless surface, crisp top-down overhead angle, symmetric arrangement, sleeves and hem styled neatly, soft even light with a faint natural contact shadow, true fabric texture and stitching",
        "extra_negative": "wrinkled bunching, perspective distortion, tilted horizon, visible model, mannequin, hanger, harsh shadow"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light grey seamless surface, overhead top-down", "pose": "garment laid flat and squared to camera, sleeves relaxed at sides", "composition": "medium_shot" },
        { "scene": "same surface, faint contact shadow", "pose": "garment flat with sleeves crossed for a styled look", "composition": "medium_shot" },
        { "scene": "neutral grey surface, tight overhead crop", "pose": "collar and neckline flat detail forward", "composition": "closeup" },
        { "scene": "light grey seamless surface, wide overhead", "pose": "full garment silhouette centered with even margins", "composition": "full_body" }
      ]
    }
  },

  // ─── 자식 2 · 고스트컷 (Ghost Mannequin) ────────────────────────────────
  {
    "mode": "product",
    "vertical": "productcut",
    "category": "ProductCut",
    "name": "Ghost Mannequin Cut",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 3,
    "meta": { "flags": ["experimental", "needs_human_review"], "render_notes": "Hollow-body invisible-mannequin effect is high AI-risk — verify no phantom body parts before delivery." },
    "rationale": "Invisible-mannequin (hollow body) effect — garment holds its 3D shape with no visible model.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "product-cut",
      "look": {
        "extra_positive": "ghost mannequin invisible-mannequin product photography, the garment holds a natural three-dimensional worn shape with a hollow interior showing the inside collar and back neckline, no visible person or mannequin, front-facing on a light grey seamless backdrop, soft even studio light, crisp true-to-life fabric structure and stitching",
        "extra_negative": "visible mannequin, human skin, face, arms, legs, phantom limbs, flat lifeless garment, warped silhouette, extra collar, harsh shadow"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light grey seamless backdrop", "pose": "garment in hollow 3D worn shape, front view, hollow neckline visible", "composition": "full_body" },
        { "scene": "same backdrop, subtle floor shadow", "pose": "hollow garment at three-quarter turn showing dimensional drape", "composition": "full_body" },
        { "scene": "neutral grey backdrop", "pose": "back view of hollow garment showing inside back neckline", "composition": "full_body" },
        { "scene": "light grey backdrop, tighter crop", "pose": "collar and shoulder structure of the hollow form", "composition": "medium_shot" }
      ]
    }
  }
];
