/**
 * Doppia recipe seed — Underwear (product mode), v2.
 * 신규 오피셜 vertical "underwear" · 사람 없는 2 패밀리(각 부모 1 + 파라미터형 자식).
 *   설계: 2026-07-18 세션. accessories.v2.js(파라미터-중첩) 미러링.
 *   범위(v1): 남성 속옷(브리프·트렁크·복서·언더셔츠·베이스레이어). ADAM 실사용.
 *
 * ── 이 파일은 "라이브"다: 사람 없는 컷만 ──────────────────────────────────
 *  1. Underwear Product Cut (◈2) — 정물 카탈로그. 컷 4: Flat Lay / Ghost Mannequin / Packaging / Fabric Macro.
 *  2. Underwear Hero (◈2) — 브랜드 무드(가먼트=히어로). 스타일 4: Noir / Athletic / Natural Linen / Spotlight.
 *  둘 다 사람/피부 없음 → 벤더 노출게이트 트리거 없음, reference(product_composite)가 지배해 기존
 *  파이프라인으로 그대로 생성됨. 엔진 변경 불필요.
 *
 * ── 온바디(Worn Cut / On Model)는 이 파일에 없음 — 의도적 ────────────────────
 *  속옷 온바디는 벤더가 "모델레퍼+속옷"을 거부 → **faceswap 후처리 파이프라인**(로컬 ~/facefusion)이
 *  선행돼야 실효한다. 그 파이프라인(비동기 잡+워커, keyed-strip, kids 하드거부, faceswap 인라인 호출)은
 *  엔진/백엔드 소유이고 아직 미구축. 안 도는 카드를 라이브로 선언하지 않는다(= "선언됐지만 안 돎" 함정 회피).
 *  온바디 2패밀리 전체 스펙(레시피 JSON·안전모델·파이프라인 아키텍처)은:
 *      docs/섹션명령서/14_underwear_작업기록.md
 *  파이프라인 착지 시 그 스펙을 이 파일에 합류시키면 카테고리가 "완결된 속옷 스튜디오"로 런칭된다.
 *
 * ── 왜 productcut/producthero가 있는데 속옷 전용을 두나(중복 아님) ──────────────
 *  · UX: Studio 브라우징 = 버티컬-칩 네비. 속옷 셀러(ADAM)에게 "Underwear" 진입점(집)이 필요.
 *    제네릭 productcut로 안내하는 건 "속옷에도 먹힘"을 셀러가 알아야 하는 나쁜 플로우.
 *  · 특화: 제네릭 ghost-mannequin은 옷 무관이라 살색 내부가 뜰 수 있음. 여기 컷은 속옷 특화 —
 *    불투명 강제·살색 억제·허리밴드 로고·멀티팩. 순수 복사가 아니다.
 *  · producthero는 무드가 화장품(스플래시·이슬·프로스트)이라 옷에 안 맞음 → 가먼트 히어로는 실제 갭.
 *
 * 중첩 규약(accessories와 동일): 자식 config.parent_id = slug(부모 name). deepMerge(parent→child) —
 *   자식은 look·shots만 오버라이드, output/subject 상속. 자식은 카드/list()에서 제외(진입점=부모).
 * 예시 이미지: /img/underwear/<id>.png (없으면 FE 그라디언트 폴백).
 * 입력: 속옷 이미지 1장. reference_strategy='product_composite'. 비용: image=ceil(count×0.5)=◈2.
 * ⚠️ underwear는 PARAM_SECTIONS 등록(부모만 카드·개수/가격사다리 휴리스틱 면제).
 *
 * ── 잔여(엔진 참고, 본 시드 밖) ──────────────────────────────────────────────
 *  전역 SAFETY_NEGATIVE에 'underwear'/'lingerie'/'see-through'가 있어 소프트 억제하나 reference가
 *  지배해 정물엔 무해(오히려 see-through 억제는 정물에 도움). 온바디용 keyed-strip 스펙은 위 문서 참조.
 */
module.exports = [
  // ════════════════════════════════════════════════════════════════════════
  // 패밀리 1 · Underwear Product Cut (제품컷) — 사람 없는 클린 카탈로그
  // ════════════════════════════════════════════════════════════════════════
  {
    "mode": "product",
    "vertical": "underwear",
    "category": "Product Cut",
    "name": "Underwear Product Cut",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "One underwear photo into clean, catalog-ready product shots — no model, no skin. Sellers pick a cut (flat lay, ghost mannequin, packaging or fabric macro) and get PDP-ready images with the exact garment locked to the reference. The default cut is a clean ghost-mannequin studio packshot.",
    "meta": {
      "cuts": ["underwear-flat-lay", "underwear-ghost-mannequin", "underwear-packaging", "underwear-fabric-macro"],
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Parent = shared base + default clean ghost-mannequin studio. Cut children inherit output/subject and override shots + look. No person, no skin — extra_negative blocks body/skin so a hollow-form shot never reads as bare skin. Verify color, print, waistband logo and stitching match the reference with no morph."
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Studio Beauty",
        "attributes": ["context:seamless_studio", "lighting:studio_softbox", "color:neutral_true", "texture:fabric_weave"],
        "extra_positive": "premium e-commerce product photography of the uploaded garment, the exact same piece locked across all shots — fabric color, print, waistband logo, seams and trims identical to the reference with no morph or drift, shown as a clean hollow invisible-body ghost-mannequin form with a believable three-dimensional worn shape and no person, on a light grey seamless studio background, soft even commercial product light, tack-sharp catalog packshot",
        "extra_negative": "person, model, human, skin, body, torso, mannequin face, warped silhouette, collapsed or asymmetric waistband, invented print, color shift, fabric morphing, harsh blown highlights, cluttered background, watermark"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light grey seamless studio, soft even product light", "pose": "front ghost-mannequin form, waistband logo aligned, full garment silhouette", "composition": "full_body" },
        { "scene": "same studio, subtle floor shadow", "pose": "three-quarter showing 3D volume, side seam and leg opening drape", "composition": "full_body" },
        { "scene": "same studio", "pose": "back ghost form showing rear panel seam and waistband back", "composition": "medium_shot" },
        { "scene": "same studio, tighter frame", "pose": "waistband detail crop — elastic band, logo and stitching, fabric only", "composition": "closeup" }
      ]
    }
  },

  // ─── 자식 1-1 · Flat Lay (바닥 평면 · 가장 보수적) ────────────────────────
  {
    "mode": "product",
    "vertical": "underwear",
    "category": "Product Cut",
    "name": "Underwear Flat Lay",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "The garment laid flat and shot top-down on a clean surface — the tidiest, most conservative catalog cut, pure still life with no body.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "underwear-product-cut",
      "look": {
        "extra_positive": "flat lay product photography, the garment neatly styled flat on a light grey seamless surface, crisp top-down overhead angle, clean folds, symmetric arrangement, faint natural contact shadow, soft even light, color, print and waistband logo identical to the reference, tack-sharp catalog detail, no body",
        "extra_negative": "person, model, skin, body, hands, perspective distortion, tilted horizon, wrinkled messy styling, harsh shadow, cluttered props, invented print, color shift, fabric morphing"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light grey seamless surface, overhead top-down", "pose": "garment laid flat and squared to camera, folded neat", "composition": "medium_shot" },
        { "scene": "same surface, faint contact shadow", "pose": "fully unfolded flat showing the full cut and pattern", "composition": "full_body" },
        { "scene": "neutral grey surface, tight overhead crop", "pose": "folded edge with waistband logo aligned", "composition": "closeup" },
        { "scene": "same surface, raking light", "pose": "fabric surface grain emphasized flat", "composition": "closeup" }
      ]
    }
  },

  // ─── 자식 1-2 · Ghost Mannequin (고스트 · 이커머스 표준) ───────────────────
  {
    "mode": "product",
    "vertical": "underwear",
    "category": "Product Cut",
    "name": "Underwear Ghost Mannequin",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 3,
    "rationale": "Hollow invisible-body worn shape — shows the garment's real 3D fit with no skin and no person. The brand-safe e-commerce PDP hero for an underwear SKU.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "underwear-product-cut",
      "look": {
        "extra_positive": "ghost-mannequin product photography, the garment shown as a hollow invisible-body form with a believable three-dimensional worn shape, fabric only, no skin and no person and no mannequin face, waistband logo, seams and trims identical to the reference, clean light grey seamless studio, soft even commercial light, e-commerce PDP hero packshot",
        "extra_negative": "visible skin, exposed body, person, model, torso, mannequin face, warped silhouette, collapsed or asymmetric waistband, color or print mismatch, fabric morphing, harsh shadows"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light grey seamless studio, soft even light", "pose": "front hollow form, waistband logo aligned, full silhouette", "composition": "full_body" },
        { "scene": "same studio, subtle floor shadow", "pose": "three-quarter showing 3D volume and side seam", "composition": "full_body" },
        { "scene": "same studio", "pose": "back hollow form showing rear panel and yoke seam", "composition": "medium_shot" },
        { "scene": "same studio, tighter frame", "pose": "waistband band and logo detail, fabric only", "composition": "closeup" }
      ]
    }
  },

  // ─── 자식 1-3 · Packaging (패키지·멀티팩) ─────────────────────────────────
  {
    "mode": "product",
    "vertical": "underwear",
    "category": "Product Cut",
    "name": "Underwear Packaging",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 4,
    "rationale": "Retail pack and multipack shots — the folded garment with its box or band, and colorway lineups that drive pack and color selection. Conversion-focused still life.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "underwear-product-cut",
      "look": {
        "extra_positive": "retail packaging product photography, the folded garment presented with a clean premium pack band or box, and colorway multipack lineups arranged in an evenly spaced row, each unit color-accurate to the reference, plain seamless background, tidy commerce styling, tack-sharp, no body",
        "extra_negative": "person, model, skin, body, duplicated item, miscount, color shift between units, uneven spacing, gibberish pack text, cluttered background, fabric morphing"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "plain seamless background", "pose": "single folded piece with a clean pack band, front hero", "composition": "medium_shot" },
        { "scene": "same background, top-down", "pose": "three to five colorways in an evenly spaced flat-lay row", "composition": "full_body" },
        { "scene": "same background", "pose": "multipack stack of folded pieces with band colors showing", "composition": "medium_shot" },
        { "scene": "same background, tighter", "pose": "single representative colorway close for true tone", "composition": "closeup" }
      ]
    }
  },

  // ─── 자식 1-4 · Fabric Macro (원단 매크로) ────────────────────────────────
  {
    "mode": "product",
    "vertical": "underwear",
    "category": "Product Cut",
    "name": "Underwear Fabric Macro",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 5,
    "rationale": "Extreme close-ups of the weave, stretch waistband, stitching and logo band — proof-of-quality detail that justifies price for premium or technical fabrics.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "underwear-product-cut",
      "look": {
        "extra_positive": "extreme macro fabric photography, ultra close-up of the fabric weave and breathable mesh structure, stretch waistband logo texture, flatlock and overlock stitch lines, hem and trim finish, raking side light revealing surface relief, true-to-material color, garment fabric only, shot on 100mm macro at f/8",
        "extra_negative": "skin macro, body part, person, model, invented weave, oversharpen halo, fabric morphing, color shift, dust, harsh blown highlights"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "dark seamless surface, hard raking side light", "pose": "macro of fabric weave and breathable mesh structure", "composition": "closeup" },
        { "scene": "soft directional light", "pose": "macro of stretch waistband logo texture", "composition": "closeup" },
        { "scene": "neutral backdrop", "pose": "macro of flatlock / overlock stitch line", "composition": "closeup" },
        { "scene": "low grazing light", "pose": "macro of hem / trim finish and stretch grain", "composition": "closeup" }
      ]
    }
  },

  // ════════════════════════════════════════════════════════════════════════
  // 패밀리 2 · Underwear Hero (히어로) — 사람 없는 브랜드 무드(가먼트=히어로)
  // ════════════════════════════════════════════════════════════════════════
  {
    "mode": "product",
    "vertical": "underwear",
    "category": "Hero",
    "name": "Underwear Hero",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 6,
    "rationale": "One underwear photo into a premium brand hero for your PDP and ads — no model, no studio shoot. Pick a mood style (noir, athletic, natural linen, spotlight). The garment is the hero, locked to your reference. The default style is Noir.",
    "meta": {
      "cuts": ["underwear-noir", "underwear-athletic", "underwear-natural-linen", "underwear-spotlight"],
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Parent = shared base + default Noir. Style children override look + shots. No person — the garment (flat or ghost form) is the hero. Verify color, waistband logo and fabric match the reference across every mood."
    },
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Editorial",
        "attributes": ["lighting:dramatic_key_plus_rim", "color:neutral_true", "texture:fabric_weave", "context:editorial_set"],
        "extra_positive": "premium editorial brand hero photography, the uploaded garment as the dramatic centerpiece shown as a clean flat or hollow ghost form with no person, exact piece locked to the reference — color, print, waistband logo and fabric identical with no morph, cinematic directional lighting revealing fabric texture and the band, rich premium mood, tack-sharp, elegant negative space",
        "extra_negative": "person, model, human, skin, body, warped silhouette, color or print mismatch, gibberish logo, flat lifeless lighting, plastic look, harsh blown highlights, cluttered background, watermark"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "editorial set, dramatic key + rim", "pose": "garment hero-centered, front, flat or ghost form", "composition": "medium_shot" },
        { "scene": "same set, deeper shadow", "pose": "three-quarter angle emphasizing fabric texture and band", "composition": "medium_shot" },
        { "scene": "moody backdrop, tight crop", "pose": "macro on the waistband logo in dramatic light", "composition": "closeup" },
        { "scene": "editorial set, wide", "pose": "full garment with generous negative space", "composition": "full_body" }
      ]
    }
  },

  // ─── 자식 2-1 · Noir (딥 섀도우 무드) ─────────────────────────────────────
  {
    "mode": "product",
    "vertical": "underwear",
    "category": "Hero",
    "name": "Underwear Noir",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 7,
    "rationale": "Deep-shadow noir mood — the garment glows against darkness with dramatic directional light.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "underwear-hero",
      "look": {
        "extra_positive": "noir brand hero, the garment on a deep matte black surface with dramatic directional light, chiaroscuro shadow, crisp rim revealing fabric texture and the waistband band, opulent premium mood, no person, tack-sharp",
        "extra_negative": "person, model, skin, body, flat lighting, washed-out background, plastic look, color mismatch, cluttered props, harsh blown highlights"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "matte black surface, warm key + rim", "pose": "garment hero-centered glowing in the dark, ghost form", "composition": "medium_shot" },
        { "scene": "black backdrop, side light", "pose": "three-quarter angle, deep shadow, band emphasized", "composition": "medium_shot" },
        { "scene": "black surface, tight crop", "pose": "macro of waistband logo with dramatic highlights", "composition": "closeup" },
        { "scene": "noir set, wide", "pose": "full garment with black negative space", "composition": "full_body" }
      ]
    }
  },

  // ─── 자식 2-2 · Athletic (스포츠 에너지) ──────────────────────────────────
  {
    "mode": "product",
    "vertical": "underwear",
    "category": "Hero",
    "name": "Underwear Athletic",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 8,
    "rationale": "Clean, dynamic athletic energy — crisp light and bold color for a performance-fabric brand hero.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "underwear-hero",
      "look": {
        "extra_positive": "dynamic athletic brand hero, the garment as a clean ghost form with crisp bright directional light and bold graphic energy, performance-fabric mood, subtle motion feel, saturated true color, no person, tack-sharp",
        "extra_negative": "person, model, skin, body, dull flat light, muddy color, plastic look, color mismatch, cluttered background, harsh blown highlights"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "bright graphic backdrop, crisp light", "pose": "garment hero-centered, energetic ghost form", "composition": "medium_shot" },
        { "scene": "bold color sweep", "pose": "three-quarter dynamic angle emphasizing the band", "composition": "medium_shot" },
        { "scene": "clean backdrop, tight crop", "pose": "macro of stretch waistband and mesh in crisp light", "composition": "closeup" },
        { "scene": "graphic set, wide", "pose": "full garment with bold negative space", "composition": "full_body" }
      ]
    }
  },

  // ─── 자식 2-3 · Natural Linen (소프트 데이라이트) ─────────────────────────
  {
    "mode": "product",
    "vertical": "underwear",
    "category": "Hero",
    "name": "Underwear Natural Linen",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 9,
    "rationale": "Soft daylight on natural linen and neutral tones — a calm, organic, premium-comfort mood.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "underwear-hero",
      "look": {
        "extra_positive": "natural brand hero, the garment resting on soft draped linen and warm neutral tones, gentle diffuse daylight, calm organic premium-comfort mood, soft shadow, no person, tack-sharp fabric detail",
        "extra_negative": "person, model, skin, body, garish color, hard artificial light, plastic look, color mismatch, cluttered background, harsh shadow"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "soft linen drape, diffuse daylight", "pose": "garment resting hero-centered, folded neat", "composition": "medium_shot" },
        { "scene": "warm neutral surface, gentle shadow", "pose": "three-quarter angle on the folds and band", "composition": "medium_shot" },
        { "scene": "linen texture, tight crop", "pose": "macro of the fabric against the linen weave", "composition": "closeup" },
        { "scene": "natural set, wide", "pose": "full garment with soft airy negative space", "composition": "full_body" }
      ]
    }
  },

  // ─── 자식 2-4 · Spotlight (스포트라이트) ──────────────────────────────────
  {
    "mode": "product",
    "vertical": "underwear",
    "category": "Hero",
    "name": "Underwear Spotlight",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 10,
    "rationale": "A single dramatic spotlight on a dark stage — pure focus and drama on the garment.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "parent_id": "underwear-hero",
      "look": {
        "extra_positive": "dramatic spotlight brand hero, a single hard beam of light on the garment against a dark stage, crisp pool of light with soft falloff revealing fabric texture and the band, theatrical premium mood, no person, tack-sharp ghost form",
        "extra_negative": "person, model, skin, body, flat even lighting, bright background, washed out, color mismatch, plastic look, cluttered props"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "dark stage, single spotlight", "pose": "garment hero-centered in the beam, ghost form", "composition": "medium_shot" },
        { "scene": "dark set, hard side beam", "pose": "three-quarter with dramatic falloff, band emphasized", "composition": "medium_shot" },
        { "scene": "spotlight pool, tight crop", "pose": "macro of the waistband logo in the beam", "composition": "closeup" },
        { "scene": "dark stage, wide", "pose": "full garment in a pool of light, black surround", "composition": "full_body" }
      ]
    }
  }
];
