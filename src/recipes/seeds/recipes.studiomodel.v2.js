/**
 * Doppia recipe seed — Model Cut (product mode), v2.
 * 오피셜 on-model 템플릿: 선택한 "우리 모델"이 업로드된 제품(의류)을 착용한 컷 생성.
 *   - 부모 카드 1장. 모달에 픽커 2개: ① 모델(로스터 80) ② 배경(Studio 기본 + 씬 40).
 *   - meta.picker='model' → Studio가 모델 그리드 + 배경 그리드 렌더.
 *   - 배경은 파라미터(축): 시드 프롬프트는 배경-중립. Studio가 선택 배경의 scene/light를
 *     프롬프트에 주입(기본 = Studio: 라이트그레이 무지 사이클로라마).
 *   - 모델 주입: 선택 모델 이미지(/img/models/<id>.jpg)를 정체성 레퍼런스로 첨부.
 *
 * 입력: 의류 이미지 1장(제품 레퍼런스). reference_strategy='product_composite'.
 * 과금: on-model 합성 → ◈5.
 */
module.exports = [
  {
    "mode": "product",
    "vertical": "studiomodel",
    "category": "OnModel",
    "name": "Model Cut",
    "output_type": "image_set",
    "credit_cost": 5,
    "sort_order": 1,
    "rationale": "Put your garment on a real-looking model in seconds. Upload one product photo, pick a house model and a background (clean studio or any lifestyle scene), and get e-commerce-ready on-model shots — no photoshoot, no casting. The exact garment is locked to the reference; the chosen model wears it.",
    "meta": {
      "picker": "model",
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "On-model composite: selected roster model image is passed as an identity reference alongside the uploaded garment; the chosen background (studio default or a scene) is injected into the prompt. Verify no garment morph and correct hands/anatomy before delivery."
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
          "lighting:studio_softbox",
          "color:neutral_true",
          "texture:fabric_weave"
        ],
        "extra_positive": "commercial e-commerce on-model photography, the selected model wearing the uploaded garment, the exact same garment locked to the reference — color, print, seams, hardware and neckline identical with no morph or drift, natural realistic fit and drape on the body, relaxed natural model pose and expression, clean catalog styling, flattering soft light, shot on 85mm f/4 full-frame, true-to-life fabric texture and visible stitching, a single well-formed pair of hands with exactly five natural fingers each",
        "extra_negative": "warped or melted garment, mismatched color or print, extra seams, garment distortion, deformed or extra fingers, malformed hands, distorted face, identity drift from the model reference, mannequin, floating garment, blown highlights, cluttered distracting background, logos, text, watermark"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "chosen setting", "pose": "model standing front-facing, relaxed natural pose, full outfit visible", "composition": "full_body" },
        { "scene": "chosen setting", "pose": "model at a slight three-quarter turn showing the garment drape", "composition": "full_body" },
        { "scene": "chosen setting", "pose": "waist-up framing showing neckline and upper garment detail", "composition": "medium_shot" },
        { "scene": "chosen setting", "pose": "model in a soft editorial stance, full silhouette centered", "composition": "full_body" }
      ]
    }
  }
];
