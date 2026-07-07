/**
 * Doppia recipe seed — Studio Model Cut (product mode), v2.
 * 오피셜 on-model 템플릿: 스튜디오에서 "우리 모델"이 업로드된 제품(의류)을 착용한 컷 생성.
 *   - 부모 카드 1장. 컷(자식) 없음 — 대신 모달에서 **모델 픽커**로 로스터(80명) 중 선택.
 *   - meta.picker='model' → contract가 card.picker로 패스스루 → Studio가 컷 대신 모델 그리드 렌더.
 *   - 배경 선택 없음(스튜디오 고정). 배경 로스터는 별도(추후 다른 템플릿에서 사용).
 *   - 모델 주입: Studio가 선택 모델 이미지(/img/models/<id>.jpg)를 레퍼런스로 첨부 +
 *     프롬프트가 "제공된 모델 레퍼런스의 인물"로 지시(백엔드 다중 레퍼런스 슬롯 사용).
 *
 * 입력: 의류 이미지 1장(제품 레퍼런스). reference_strategy='product_composite'.
 * 과금: on-model 합성 → ◈5(가치 반영, beauty on-model과 동일선).
 */
module.exports = [
  {
    "mode": "product",
    "vertical": "studiomodel",
    "category": "OnModel",
    "name": "Studio Model Cut",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 1,
    "rationale": "Put your garment on a real-looking studio model in seconds. Upload one product photo, pick a house model, and get clean e-commerce on-model shots on a light grey studio backdrop — no photoshoot, no casting. The exact garment is locked to the reference; the chosen model wears it.",
    "meta": {
      "picker": "model",
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "On-model composite: selected roster model image is passed as an identity reference alongside the uploaded garment. Verify no garment morph and correct hands/anatomy before delivery."
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
        "extra_positive": "commercial e-commerce on-model studio photography, the selected model wearing the uploaded garment, the exact same garment locked to the reference — color, print, seams, hardware and neckline identical with no morph or drift, natural realistic fit and drape on the body, light grey seamless studio cyclorama, soft even softbox key light with a fill, relaxed natural model pose and expression, clean catalog styling, shot on 85mm f/4 full-frame, true-to-life fabric texture and visible stitching, a single well-formed pair of hands with exactly five natural fingers each",
        "extra_negative": "warped or melted garment, mismatched color or print, extra seams, garment distortion, deformed or extra fingers, malformed hands, distorted face, identity drift from the model reference, mannequin, floating garment, blown highlights, harsh shadows, cluttered background, logos, text, watermark"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light grey seamless studio cyclorama", "pose": "model standing front-facing, relaxed natural pose, full outfit visible", "composition": "full_body" },
        { "scene": "same seamless studio, subtle floor shadow", "pose": "model at a slight three-quarter turn showing the garment drape", "composition": "full_body" },
        { "scene": "neutral grey studio, tighter crop", "pose": "waist-up framing showing neckline and upper garment detail", "composition": "medium_shot" },
        { "scene": "light grey seamless studio", "pose": "model in a soft editorial stance, full silhouette centered", "composition": "full_body" }
      ]
    }
  }
];
