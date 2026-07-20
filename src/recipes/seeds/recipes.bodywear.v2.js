/**
 * Doppia recipe seed — Bodywear (Innerwear & Swim), product mode, v2.
 * 신규 오피셜 vertical "bodywear" — 속옷·란제리·수영복 통합 버킷. 2026-07-18.
 * 설계 정본: docs/apparel_bodywear_재편_설계_2026-07-18.md
 *
 * 기존 top-level `underwear`(recipes.underwear.v2.js)를 이 구조로 흡수·재편.
 *   - Apparel > Innerwear & Swim(스몰 카테고리) 밑 카드로 노출.
 *   - 품목(하의·브라·세트·수영복)은 카테고리 아니라 **in-template garment axis 파라미터**(중복0).
 *     · 품목 셀렉터 정의 = studio.html AXIS_DEFS.garment (형태 힌트 promptPhrase 주입).
 *     · 레시피 프롬프트는 **품목-중립**(the uploaded garment) — 형태는 axis가 주입.
 *
 * ── 범위 ──
 *  Set = 이미지 1장 전제(유저가 세트를 한 컷으로 촬영). 2피스 업로드는 후속.
 *
 * ── 패밀리 ──
 *  1. Bodywear Product Cut (◈2) — 사람 없는 정물. meta.axes=['garment','angle'].
 *     컷 3: Flat Lay / Ghost Mannequin / Fabric Macro (샷타입, 품목-중립).
 *  2. Bodywear Worn Cut (◈3) — 얼굴 없는 온바디 존 크롭. meta.axes=['garment','skin'].
 *  3. Bodywear On Model (◈5) — 로스터 얼굴 + faceswap. meta.picker='model'.
 *
 * ── 삭제 이력 ──
 *  · Packaging 컷 (2026-07-20) — 없는 색상·멀티팩을 날조하는 shots였다(상세페이지 허위표기 위험).
 *  · Bodywear Hero 패밀리 전체 = 부모 + 무드 8(Clean·Athletic·Noir·Lace·Silk·Boudoir·Beach·Poolside)
 *    (2026-07-20, 사용자 지시). ⚠️ 이로써 garment='swim'의 **무드 게이트 소비자가 사라졌다** —
 *    커밋 b838452가 축 개편을 기각하며 든 근거("swim은 Beach·Poolside·Athletic 무드 게이트라 잉여 아님")는
 *    더 이상 유효하지 않다. swim은 여전히 Product/Worn/On Model 3곳이 쓰므로 값 자체는 유지.
 *
 * 중첩 규약: 자식 config.parent_id=slug(부모). deepMerge, 자식은 look·shots만 오버라이드. 자식은 카드 제외.
 * 입력: 제품 이미지 1장. reference_strategy='product_composite'. 비용 image=ceil(count×0.5)=◈2.
 * ⚠️ bodywear는 PARAM_SECTIONS 등록.
 *
 * ── 안전 ── no-person이라 벤더 노출게이트 트리거 없음. extra_negative가 person/skin/body 차단(정물 유지).
 *   온바디(faceswap) 착지 시 미성년·노출 하드가드는 그 파이프라인에서(설계문서 참조).
 */
// 온바디 착용컷 공통 하드가드 (얼굴 배제 + 미성년·노출·선정성 차단). 전 Worn Cut 존에 재사용.
//   ⚠️ 미성년/노출 토큰은 전역 SAFETY_NEGATIVE에서 빠졌으므로(kids 로스터 충돌) 여기서 반드시 재주입.
const BODY_SAFETY_NEG = "face, head, chin, eyes, nose, lips, mouth, portrait, full head in frame, child, minor, teenager, teen, underage, youth, kid, nudity, nude, exposed genitals, genital outline, bulge emphasis, bare buttocks, sheer or see-through reveal, provocative or seductive pose, sexualized posing, distorted anatomy, extra limbs, extra fingers, plastic skin, harsh blown highlights, cluttered background, logos, text, watermark";

// On Model(◈5) 하드가드 — 얼굴이 있는 온모델 컷(stage-1 생성 후 faceswap). 얼굴은 유지하되 미성년·노출·선정성 차단.
//   ⚠️ face/head 미배제(온모델은 얼굴 노출) + identity drift/distorted face로 스왑 품질 방어.
const ONMODEL_SAFETY_NEG = "child, minor, teenager, teen, underage, youth, kid, nudity, nude, topless, exposed genitals, genital outline, bare buttocks, sheer or see-through reveal, provocative or seductive pose, sexualized posing, cleavage emphasis, full-length crotch focus, identity drift, distorted face, deformed hands, extra limbs, extra fingers, plastic skin, warped garment, color or print mismatch, cluttered background, logos, text, watermark";

module.exports = [
  // ════════════════════════════════════════════════════════════════════════
  // 패밀리 1 · Bodywear Product Cut — 사람 없는 정물 (품목 = garment axis)
  // ════════════════════════════════════════════════════════════════════════
  {
    "mode": "product", "vertical": "bodywear", "category": "Product Cut",
    "name": "Bodywear Product Cut", "output_type": "image_set", "credit_cost": 2, "sort_order": 1,
    "rationale": "One innerwear or swimwear photo into clean, catalog-ready product shots — no model, no skin. Pick your garment type (bottoms, bra, set or swimwear) and a cut (flat lay, ghost mannequin or fabric macro); the exact piece is locked to your reference. Default cut is a clean ghost-mannequin packshot.",
    "meta": {
      "axes": ["garment", "angle"],
      "cuts": ["bodywear-flat-lay", "bodywear-ghost-mannequin", "bodywear-fabric-macro"],
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "No person/skin. garment axis (studio AXIS_DEFS.garment) injects the shape hint (bottoms→waistband, bra→cup form, set→coordinated, swim→swimwear). angle axis는 **컷 조건부**(studio CUT_AXES.angle) — 고스트 마네킹을 골랐을 때만 칩이 뜬다. flat-lay는 top-down이 정의고 fabric-macro는 매크로라 각도 선택이 자기 shots와 싸운다. Cut children inherit output/subject and override shots+look. Verify color, print, trims lock to the reference with no morph; ghost form must not read as bare skin."
    },
    "config": {
      "schema_version": 1, "mode": "product",
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Studio Beauty",
        "attributes": ["context:seamless_studio", "lighting:studio_softbox", "color:neutral_true", "texture:fabric_weave"],
        "extra_positive": "premium e-commerce product photography of the uploaded garment, the exact same piece locked across all shots — fabric color, print, trims and hardware identical to the reference with no morph or drift, shown as a clean hollow invisible-body ghost-mannequin form with a believable three-dimensional worn shape and no person, light grey seamless studio, soft even commercial product light, tack-sharp catalog packshot",
        "extra_negative": "person, model, human, skin, body, torso, mannequin face, warped silhouette, invented print, color shift, fabric morphing, harsh blown highlights, cluttered background, watermark"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light grey seamless studio, soft even product light", "pose": "front ghost-mannequin form, logo/trim aligned, full silhouette", "composition": "full_body" },
        { "scene": "same studio, subtle floor shadow", "pose": "three-quarter showing 3D volume and side seam", "composition": "full_body" },
        { "scene": "same studio", "pose": "back hollow form showing rear panel and seams", "composition": "medium_shot" },
        { "scene": "same studio, tighter frame", "pose": "band / trim detail crop, fabric only", "composition": "closeup" }
      ]
    }
  },
  // ─── 자식 1-1 · Flat Lay ───────────────────────────────────────────────
  {
    "mode": "product", "vertical": "bodywear", "category": "Product Cut",
    "name": "Bodywear Flat Lay", "output_type": "image_set", "credit_cost": 2, "sort_order": 2,
    "rationale": "The garment laid flat top-down on a clean surface — the tidiest catalog cut, pure still life.",
    "config": {
      "schema_version": 1, "mode": "product", "parent_id": "bodywear-product-cut",
      "look": {
        "extra_positive": "flat lay product photography, the garment neatly styled flat on a light grey seamless surface, crisp top-down overhead angle, clean folds, symmetric arrangement, faint contact shadow, soft even light, color and trims identical to the reference, tack-sharp, no body",
        "extra_negative": "person, model, skin, body, hands, perspective distortion, wrinkled messy styling, harsh shadow, cluttered props, color shift, fabric morphing"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light grey seamless surface, overhead top-down", "pose": "garment laid flat, squared to camera, folded neat", "composition": "medium_shot" },
        { "scene": "same surface, faint contact shadow", "pose": "fully unfolded flat showing the full cut", "composition": "full_body" },
        { "scene": "neutral grey surface, tight overhead crop", "pose": "folded edge with logo/trim aligned", "composition": "closeup" },
        { "scene": "same surface, raking light", "pose": "fabric surface grain emphasized flat", "composition": "closeup" }
      ]
    }
  },
  // ─── 자식 1-2 · Ghost Mannequin ────────────────────────────────────────
  {
    "mode": "product", "vertical": "bodywear", "category": "Product Cut",
    "name": "Bodywear Ghost Mannequin", "output_type": "image_set", "credit_cost": 2, "sort_order": 3,
    "rationale": "Hollow invisible-body worn shape — shows the garment's real 3D fit with no skin, no person. The brand-safe PDP hero.",
    "config": {
      "schema_version": 1, "mode": "product", "parent_id": "bodywear-product-cut",
      "look": {
        "extra_positive": "ghost-mannequin product photography, the garment shown as a hollow invisible-body form with a believable three-dimensional worn shape, fabric only, no skin and no person and no mannequin face, logo and trims identical to the reference, clean light grey seamless studio, soft even commercial light, e-commerce PDP hero packshot",
        "extra_negative": "visible skin, exposed body, person, model, torso, mannequin face, warped silhouette, color or print mismatch, fabric morphing, harsh shadows"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "light grey seamless studio, soft even light", "pose": "front hollow form, logo/trim aligned, full silhouette", "composition": "full_body" },
        { "scene": "same studio, subtle floor shadow", "pose": "three-quarter showing 3D volume and side seam", "composition": "full_body" },
        { "scene": "same studio", "pose": "back hollow form showing rear panel and seams", "composition": "medium_shot" },
        { "scene": "same studio, tighter frame", "pose": "band / trim detail, fabric only", "composition": "closeup" }
      ]
    }
  },
  // ─── 자식 1-4 · Fabric Macro ───────────────────────────────────────────
  {
    "mode": "product", "vertical": "bodywear", "category": "Product Cut",
    "name": "Bodywear Fabric Macro", "output_type": "image_set", "credit_cost": 2, "sort_order": 5,
    "rationale": "Extreme close-ups of weave, lace, stretch band, stitching and trims — proof-of-quality detail for premium fabrics.",
    "config": {
      "schema_version": 1, "mode": "product", "parent_id": "bodywear-product-cut",
      "look": {
        "extra_positive": "extreme macro fabric photography, ultra close-up of the fabric weave, lace or breathable mesh, stretch band and logo texture, flatlock and overlock stitch lines, hem and trim finish, raking side light revealing surface relief, true-to-material color, garment fabric only, shot on 100mm macro at f/8",
        "extra_negative": "skin macro, body part, person, model, invented weave, oversharpen halo, fabric morphing, color shift, dust, harsh blown highlights"
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "dark seamless surface, hard raking side light", "pose": "macro of fabric weave / lace / mesh structure", "composition": "closeup" },
        { "scene": "soft directional light", "pose": "macro of stretch band and logo texture", "composition": "closeup" },
        { "scene": "neutral backdrop", "pose": "macro of flatlock / overlock stitch line", "composition": "closeup" },
        { "scene": "low grazing light", "pose": "macro of hem / trim finish and stretch grain", "composition": "closeup" }
      ]
    }
  },

  // ════════════════════════════════════════════════════════════════════════
  // 패밀리 3 · Bodywear Worn Cut — 얼굴 없는 성인 부위 크롭 (몸 생성 · faceswap 불필요)
  //   품목=garment axis(존 조건부 필터 + 성별 함의) · 피부톤=skin axis. age 축 의도적 제외(미성년 인접 리스크).
  //   성별(설계 §3): bra·set 존→여성 함의, bottoms·swim→남녀 중립. 전 존 faceless·adult 25+·needs_human_review.
  //   ⚠️ On Model(로스터 얼굴+faceswap)은 별개 패밀리로 파이프라인 착지 시 합류(14_underwear_작업기록.md).
  // ════════════════════════════════════════════════════════════════════════
  {
    "mode": "product", "vertical": "bodywear", "category": "Worn Cut",
    "name": "Bodywear Worn Cut", "output_type": "image_set", "credit_cost": 3, "sort_order": 15,
    "rationale": "Show your innerwear or swimwear worn on the body — no photoshoot, no model booking. Pick your garment type (bottoms, bra, set or swimwear) and a body-zone crop; every shot is faceless by design and the exact piece stays locked to your reference. A model-face version is on the way. The default zone is a clean front crop.",
    "meta": {
      "axes": ["garment", "skin", "body"],
      "auto_body": true,
      "cuts": ["bodywear-front-crop", "bodywear-side-profile", "bodywear-back-crop", "bodywear-waistband-detail", "bodywear-bust-fit"],
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "Faceless on-body composite: an adult body (25+) is generated wearing the uploaded garment, no model, no face in frame. meta.axes = studio chip selectors — garment (drives which zones show + implied gender: bra/set→female, bottoms/swim→neutral) and skin tone, injected into the prompt at generate time. Zone children carry meta.garment so the studio filters the zone list by the selected garment (same conditional pattern as Hero moods). config.relax_apparel_guards flags the future engine keyed-strip to run off THIS flag, not the shared preset name (leak-safe). High risk zone — verify no face in frame, clearly adult, opaque fit and no morph before delivery. (Face variant with model picker = 'Bodywear On Model', pipeline pending.)"
    },
    "config": {
      "schema_version": 1, "mode": "product", "relax_apparel_guards": true,
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Fashion",
        "attributes": ["lighting:soft_box_key_plus_rim", "color:neutral_true", "texture:natural_skin"],
        "extra_positive": "premium on-body innerwear and swimwear photography, the exact uploaded garment worn naturally on a realistic well-groomed adult body, clearly an adult aged 25 or older, cropped tightly to the worn body zone with the head and face out of frame, the piece locked to the reference — color, print, trims and fabric identical with no morph or drift, opaque fabric with a believable natural fit, true-to-life skin under soft flattering editorial light, tasteful and non-sexualized, shallow depth of field keeping the garment tack-sharp, clean neutral studio background",
        "extra_negative": "full-body with face, model face, mannequin, warped silhouette, color or print mismatch, fabric morphing, "
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "clean neutral studio, soft key + rim", "pose": "adult body wearing the piece, front, face out of frame, cropped to the garment zone", "composition": "medium_shot" },
        { "scene": "same studio, gentle shadow", "pose": "three-quarter showing the fit, no face", "composition": "medium_shot" },
        { "scene": "neutral backdrop", "pose": "back or side of the worn piece, face out of frame", "composition": "medium_shot" },
        { "scene": "same studio, tighter frame", "pose": "detail crop of the band / trim on the body", "composition": "closeup" }
      ]
    }
  },
  // ─── 자식 3-1 · Front Crop [all] (기본) ─────────────────────────────────
  {
    "mode": "product", "vertical": "bodywear", "category": "Worn Cut",
    "name": "Bodywear Front Crop", "output_type": "image_set", "credit_cost": 3, "sort_order": 16,
    "meta": { "garment": ["bottoms", "bra", "set", "swim"], "flags": ["experimental", "needs_human_review"], "render_notes": "Faceless front crop, any garment. Verify head/face fully out of frame and clearly adult before delivery." },
    "rationale": "The piece worn on the body, front-on and cropped to the garment zone — the clean default, no face.",
    "config": { "schema_version": 1, "mode": "product", "parent_id": "bodywear-worn-cut",
      "look": {
        "extra_positive": "faceless front on-body crop, the uploaded garment worn on an adult body seen straight from the front, the framing cropped to the garment's body zone with the head and face out of frame, natural relaxed stance, the piece locked to the reference with an opaque believable fit, soft flattering editorial light, true-to-life skin, tasteful and non-sexualized, clean neutral studio, shallow depth of field keeping the garment tack-sharp",
        "extra_negative": BODY_SAFETY_NEG },
      "shot_strategy": "list", "shots": [
        { "scene": "clean neutral studio, soft key light", "pose": "front-on, adult body, face out of frame, garment centered", "composition": "medium_shot" },
        { "scene": "same studio, gentle contact shadow", "pose": "slight weight shift, front, no face", "composition": "medium_shot" },
        { "scene": "neutral backdrop, tighter", "pose": "front crop on the garment's fit, no face", "composition": "closeup" },
        { "scene": "same studio, detail", "pose": "front trim / logo on the body", "composition": "macro" } ] }
  },
  // ─── 자식 3-2 · Side Profile [all] ──────────────────────────────────────
  {
    "mode": "product", "vertical": "bodywear", "category": "Worn Cut",
    "name": "Bodywear Side Profile", "output_type": "image_set", "credit_cost": 3, "sort_order": 17,
    "meta": { "garment": ["bottoms", "bra", "set", "swim"], "flags": ["experimental", "needs_human_review"], "render_notes": "Faceless three-quarter/side crop. Verify head/face out of frame and clearly adult." },
    "rationale": "A three-quarter side angle showing the real fit and silhouette — faceless.",
    "config": { "schema_version": 1, "mode": "product", "parent_id": "bodywear-worn-cut",
      "look": {
        "extra_positive": "faceless side-profile on-body crop, the uploaded garment worn on an adult body seen from a three-quarter side angle to reveal the natural fit and silhouette, the head and face out of frame, the piece locked to the reference with an opaque fit, soft flattering editorial light, true skin texture, tasteful and non-sexualized, clean neutral studio, shallow depth of field",
        "extra_negative": BODY_SAFETY_NEG },
      "shot_strategy": "list", "shots": [
        { "scene": "clean neutral studio, soft side light", "pose": "three-quarter turn, adult body, face out of frame", "composition": "medium_shot" },
        { "scene": "same studio, rim light", "pose": "full side profile of the fit, no face", "composition": "medium_shot" },
        { "scene": "neutral backdrop, tighter", "pose": "side crop on the garment's edge and fit, no face", "composition": "closeup" },
        { "scene": "same studio, detail", "pose": "side seam / trim on the body", "composition": "macro" } ] }
  },
  // ─── 자식 3-3 · Back Crop [all] ─────────────────────────────────────────
  {
    "mode": "product", "vertical": "bodywear", "category": "Worn Cut",
    "name": "Bodywear Back Crop", "output_type": "image_set", "credit_cost": 3, "sort_order": 18,
    "meta": { "garment": ["bottoms", "bra", "set", "swim"], "flags": ["experimental", "needs_human_review"], "render_notes": "Faceless rear crop — brief back / bikini bottom / one-piece back / bra band and clasp. Verify head out of frame, adult, no bare buttocks exposure." },
    "rationale": "The piece from behind — rear panel, band or clasp — cropped and faceless.",
    "config": { "schema_version": 1, "mode": "product", "parent_id": "bodywear-worn-cut",
      "look": {
        "extra_positive": "faceless back on-body crop, the uploaded garment worn on an adult body seen from behind, the framing cropped to the garment's body zone with the head and face out of frame, showing the rear panel, band or clasp, the piece locked to the reference with an opaque fit that covers, soft flattering editorial light, true skin texture, tasteful and non-sexualized, clean neutral studio, shallow depth of field",
        "extra_negative": BODY_SAFETY_NEG },
      "shot_strategy": "list", "shots": [
        { "scene": "clean neutral studio, soft key", "pose": "back-on, adult body, face out of frame, rear panel centered", "composition": "medium_shot" },
        { "scene": "same studio, gentle shadow", "pose": "three-quarter rear showing band and fit, no face", "composition": "medium_shot" },
        { "scene": "neutral backdrop, tighter", "pose": "back crop on the band / clasp, no face", "composition": "closeup" },
        { "scene": "same studio, detail", "pose": "rear seam / logo on the body", "composition": "macro" } ] }
  },
  // ─── 자식 3-4 · Waistband Detail [bottoms, swim] ────────────────────────
  {
    "mode": "product", "vertical": "bodywear", "category": "Worn Cut",
    "name": "Bodywear Waistband Detail", "output_type": "image_set", "credit_cost": 3, "sort_order": 19,
    "meta": { "garment": ["bottoms", "swim"], "flags": ["experimental", "needs_human_review"], "render_notes": "Faceless macro of the worn waistband/logo band (men's underwear & swim-trunk signature). Verify no bulge emphasis, adult, head far out of frame." },
    "rationale": "Macro of the elastic waistband and logo worn on the body — the underwear brand signature.",
    "config": { "schema_version": 1, "mode": "product", "parent_id": "bodywear-worn-cut",
      "look": {
        "extra_positive": "faceless macro of the worn waistband, the uploaded bottoms or swim trunks with the elastic waistband and logo band shown on an adult waist and hip, tightly cropped to the band with the face far out of frame, the band and logo locked to the reference, crisp raking light revealing the fabric and stitch, true skin texture, tasteful and non-sexualized, clean neutral studio",
        "extra_negative": BODY_SAFETY_NEG },
      "shot_strategy": "list", "shots": [
        { "scene": "clean neutral studio, raking light", "pose": "front waistband on the waist, band and logo forward, no face", "composition": "closeup" },
        { "scene": "same studio, side raking light", "pose": "side of the waistband showing the band width on the hip", "composition": "closeup" },
        { "scene": "neutral backdrop, extreme close", "pose": "macro of the logo band lettering and stitch on the body", "composition": "macro" },
        { "scene": "same studio, low grazing light", "pose": "macro of the elastic band grain against the skin", "composition": "macro" } ] }
  },
  // ─── 자식 3-5 · Bust Fit [bra, set] (여성 · 테이스트풀) ──────────────────
  {
    "mode": "product", "vertical": "bodywear", "category": "Worn Cut",
    "name": "Bodywear Bust Fit", "output_type": "image_set", "credit_cost": 3, "sort_order": 20,
    "meta": { "garment": ["bra", "set"], "flags": ["experimental", "needs_human_review"], "render_notes": "Faceless bust-fit crop on an adult woman's upper torso (bra/set only). Keep strictly tasteful, editorial and non-sexualized; verify head out of frame, adult, opaque supportive fit, no exposure." },
    "rationale": "How the bra or set sits — cup, strap and band fit on the upper torso, faceless and tasteful.",
    "config": { "schema_version": 1, "mode": "product", "parent_id": "bodywear-worn-cut",
      "look": {
        "extra_positive": "faceless bust-fit crop, the uploaded bra or lingerie set worn on an adult woman's upper torso showing the natural cup, strap and band fit, tightly cropped to the garment with the head and face out of frame and the framing kept tasteful and editorial, the piece locked to the reference with an opaque supportive fit, soft flattering diffuse light, true skin texture, elegant and non-sexualized, clean neutral studio, shallow depth of field",
        "extra_negative": BODY_SAFETY_NEG + ", cleavage emphasis, nipple, areola, deep plunge exposure" },
      "shot_strategy": "list", "shots": [
        { "scene": "clean neutral studio, soft diffuse light", "pose": "front bust fit, adult woman, face out of frame, cups and band centered", "composition": "medium_shot" },
        { "scene": "same studio, gentle shadow", "pose": "three-quarter showing strap and side band fit, no face", "composition": "closeup" },
        { "scene": "neutral backdrop, tighter", "pose": "crop on the cup edge and underband fit, no face", "composition": "closeup" },
        { "scene": "same studio, detail", "pose": "macro of the strap adjuster / trim on the body", "composition": "macro" } ] }
  },

  // ════════════════════════════════════════════════════════════════════════
  // 패밀리 4 · Bodywear On Model — 로스터 얼굴 O (stage-1 생성 → faceswap stage-2)
  //   ⚠️ 엔진(faceswap 파이프라인) 착지·검증 전까지 DEFAULT_OFFICIAL_RECIPES 미등록 = 카드 비노출(게이트).
  //   설계: docs/onmodel_faceswap_설계_2026-07-18.md · 파이프라인: docs/섹션명령서/14_underwear_작업기록.md §5.
  //   성별(설계 §3): garment→로스터 성별 필터(bra·set→여성, bottoms·swim→남녀). Kids 픽커 하드배제.
  // ════════════════════════════════════════════════════════════════════════
  {
    "mode": "product", "vertical": "bodywear", "category": "On Model",
    "name": "Bodywear On Model", "output_type": "image_set", "credit_cost": 5, "sort_order": 21,
    "rationale": "Your innerwear or swimwear worn by a chosen model — no shoot, no casting. Pick your garment type, a model and a cut; every shot is reviewed before delivery. For a faceless body crop instead, use Bodywear Worn Cut.",
    "meta": {
      "axes": ["garment"],
      "picker": "model",
      "post": ["faceswap"],
      "cuts": ["bodywear-on-model-front", "bodywear-on-model-three-quarter", "bodywear-on-model-editorial"],
      "flags": ["experimental", "needs_human_review"],
      "render_notes": "TWO-STAGE (engine): stage-1 generates the garment worn by an approximate model WITHOUT attaching the roster face image (vendor rejects face-ref + underwear) — the roster's TEXT description (descent/age/build/hair/skin) is injected instead (generate.route modelMetaFor). stage-2 = faceswapWorker swaps the chosen roster's own AI face onto stage-1 (faceswap_jobs queue → facefusion). meta.picker='model' = swap-target selection; Kids roster HARD-excluded for bodywear; garment drives roster gender filter (bra/set→female). meta.post=['faceswap'] signals the engine. config.relax_apparel_guards flags future keyed-strip off the flag, not the shared preset. Every cut needs_human_review — never auto-publish. Verify: clearly adult, no minor, opaque tasteful fit, no identity drift."
    },
    "config": {
      "schema_version": 1, "mode": "product", "relax_apparel_guards": true,
      "output": { "type": "image_set", "count": 4, "aspect_ratio": "4:5" },
      "subject": { "type": "product", "reference_strategy": "product_composite", "min_refs": 1 },
      "look": {
        "style_preset": "Editorial",
        "attributes": ["lighting:soft_box_key_plus_rim", "color:neutral_true", "texture:natural_skin", "context:editorial_set"],
        "extra_positive": "premium editorial on-model campaign photography, the selected model wearing the uploaded innerwear or swimwear, clearly an adult aged 25 or older, upper-body to torso framing, the garment locked to the reference — color, print, trims and fabric identical with no morph or drift, opaque fabric with a believable natural fit, confident relaxed editorial pose, soft flattering campaign light, tasteful and non-sexualized, tack-sharp, clean premium studio or set",
        "extra_negative": ONMODEL_SAFETY_NEG
      },
      "shot_strategy": "list",
      "shots": [
        { "scene": "clean premium studio, soft campaign light", "pose": "adult model facing camera wearing the piece, upper-body to torso, confident relaxed pose", "composition": "medium_shot" },
        { "scene": "same set, gentle shadow", "pose": "three-quarter editorial angle showing the fit", "composition": "medium_shot" },
        { "scene": "editorial set, tighter", "pose": "torso crop on the garment fit, tasteful", "composition": "closeup" },
        { "scene": "premium set, wider", "pose": "confident campaign stance, generous negative space", "composition": "medium_shot" }
      ]
    }
  },
  // ─── 자식 4-1 · On Model Front ──────────────────────────────────────────
  {
    "mode": "product", "vertical": "bodywear", "category": "On Model",
    "name": "Bodywear On Model Front", "output_type": "image_set", "credit_cost": 5, "sort_order": 22,
    "meta": { "flags": ["experimental", "needs_human_review"], "render_notes": "Front on-model campaign shot. Stage-1 no face-ref + faceswap. Verify clearly adult, opaque tasteful fit, no identity drift." },
    "rationale": "The model facing camera wearing the piece — the clean campaign front, upper-body to torso.",
    "config": { "schema_version": 1, "mode": "product", "parent_id": "bodywear-on-model",
      "look": {
        "extra_positive": "editorial on-model front campaign shot, the adult model facing the camera wearing the uploaded piece, upper-body to torso framing, confident relaxed pose, the garment locked to the reference with an opaque believable fit, soft flattering campaign light, tasteful and non-sexualized, clean premium studio backdrop, tack-sharp",
        "extra_negative": ONMODEL_SAFETY_NEG },
      "shot_strategy": "list", "shots": [
        { "scene": "clean premium studio, soft key light", "pose": "adult model front-on, wearing the piece, upper-body to torso", "composition": "medium_shot" },
        { "scene": "same studio, gentle shadow", "pose": "slight weight shift, front, confident", "composition": "medium_shot" },
        { "scene": "premium backdrop, tighter", "pose": "torso crop on the front fit, tasteful", "composition": "closeup" },
        { "scene": "studio, wider", "pose": "full front campaign stance, negative space", "composition": "medium_shot" } ] }
  },
  // ─── 자식 4-2 · On Model Three-Quarter ──────────────────────────────────
  {
    "mode": "product", "vertical": "bodywear", "category": "On Model",
    "name": "Bodywear On Model Three-Quarter", "output_type": "image_set", "credit_cost": 5, "sort_order": 23,
    "meta": { "flags": ["experimental", "needs_human_review"], "render_notes": "Three-quarter on-model angle. Stage-1 no face-ref + faceswap. Verify adult, tasteful, no identity drift." },
    "rationale": "A three-quarter editorial angle on the model — shows the fit and silhouette with campaign energy.",
    "config": { "schema_version": 1, "mode": "product", "parent_id": "bodywear-on-model",
      "look": {
        "extra_positive": "editorial on-model three-quarter campaign shot, the adult model at a three-quarter angle wearing the uploaded piece, upper-body to torso framing revealing the fit and silhouette, confident editorial pose, the garment locked to the reference with an opaque fit, soft flattering campaign light, tasteful and non-sexualized, premium set, tack-sharp",
        "extra_negative": ONMODEL_SAFETY_NEG },
      "shot_strategy": "list", "shots": [
        { "scene": "premium set, soft side light", "pose": "adult model three-quarter, wearing the piece", "composition": "medium_shot" },
        { "scene": "same set, rim light", "pose": "turn showing the side fit and silhouette", "composition": "medium_shot" },
        { "scene": "set, tighter", "pose": "three-quarter torso crop on the fit, tasteful", "composition": "closeup" },
        { "scene": "editorial set, wider", "pose": "three-quarter campaign stance, negative space", "composition": "medium_shot" } ] }
  },
  // ─── 자식 4-3 · On Model Editorial ──────────────────────────────────────
  {
    "mode": "product", "vertical": "bodywear", "category": "On Model",
    "name": "Bodywear On Model Editorial", "output_type": "image_set", "credit_cost": 5, "sort_order": 24,
    "meta": { "flags": ["experimental", "needs_human_review"], "render_notes": "Wider editorial campaign mood. Stage-1 no face-ref + faceswap. Verify adult, tasteful, no identity drift." },
    "rationale": "A wider campaign-mood editorial frame — the model and piece in a premium set with brand atmosphere.",
    "config": { "schema_version": 1, "mode": "product", "parent_id": "bodywear-on-model",
      "look": {
        "extra_positive": "premium editorial campaign frame, the adult model wearing the uploaded piece in a styled premium set with rich brand atmosphere, upper-body to torso framing, confident relaxed editorial pose, cinematic flattering light, the garment locked to the reference with an opaque fit, tasteful and non-sexualized, elegant negative space, tack-sharp",
        "extra_negative": ONMODEL_SAFETY_NEG },
      "shot_strategy": "list", "shots": [
        { "scene": "styled premium set, cinematic light", "pose": "adult model in campaign mood wearing the piece", "composition": "medium_shot" },
        { "scene": "same set, deeper mood", "pose": "editorial three-quarter with atmosphere", "composition": "medium_shot" },
        { "scene": "set, tighter", "pose": "torso crop with brand mood, tasteful", "composition": "closeup" },
        { "scene": "wide editorial set", "pose": "campaign stance, generous premium negative space", "composition": "medium_shot" } ] }
  }
];
