# 02 fashion — 프롬프트 정밀화 작업기록

> 워커 세션 산출(파일만 저장, commit/push 금지). 근거 명령서 = `PROMPT_프롬프트정밀화_명령서.md`.
> 대상 = `src/recipes/seeds/recipes.fashion.v2.js` (8 템플릿). 브랜치 `feat/prompt-negatives`.

## 작업 (2026-06-10): 死필드 `look.negative` → `look.extra_negative` 이관 + 정제

### 임무
엔진(`recipeResolver.js` L148: `negative = preset.negative + look.extra_negative + SAFETY_NEGATIVE_PROMPT`)이 **`look.extra_negative`만** 소비. fashion 8개 전부 네거티브를 死필드 `look.negative`에 보유 → live `/api/recipes` 생성에 안 닿고 있었음 → **8/8 전부 이관**.

### 정제 기준 (실측 검증, 추측 아님)
중복 제거 대상 = **자동 주입되는 2계층**을 소스 코드로 실측:
- **SAFETY 전역**(`imagePrompt.builder.js` L16-32, 모든 렌더 주입): `deformed, blurry, low quality, watermark, text, logo, extra limbs, extra fingers, mutated hands, bad anatomy` + 미성년/성적/폭력군 → extra_negative에서 삭제.
- **preset.negative**(DB `style_presets`, `migrate.js` L510-557, style_preset별 주입):
  - `Fashion`(T1·2·5·6·8): `casual, low quality, blurry fabric, bad proportions, amateur`
  - `Film`(T3): `digital, clean, sharp, HDR, oversaturated`
  - `Glamour`(T7): `casual, everyday, harsh shadows, unflattering angle`
  - `Macro`(T4): DB 미존재 → resolver fallback `{negative:''}` (SAFETY만 적용)

### 적용 규칙
- **SAFETY 중복 제거**: `watermark`, `extra fingers`, `distorted hands`(≈mutated hands), `duplicated limbs`(≈extra limbs) 등 삭제.
- **preset 중복 제거**: T3 `overprocessed HDR`(Film preset `HDR`), T7 `harsh shadows`(Glamour preset) 삭제.
- **`plastic skin` 제거(명령서 §1-a)**: 인물 피부 결함은 삭제. 단 제품/소재 결함 `plastic-looking material`(T4)은 §3 keep-예시("plastic CGI look") 근거로 유지.
- **손 노출군 강화(명령서 §3 hand anatomy)**: On-Model·Fit&Size·Outfit Transition·GRWM(손이 프레임에 등장)은 generic `extra fingers`(SAFETY) 대신 구체값 `six fingers, fused or webbed digits`로 치환.
- **text_overlay 템플릿(Fit & Size On-Body 🅣) text/logo 금지**: extra_negative에 text/logo 미포함(전역 SAFETY가 처리). `meta.render_notes`·`overlay_spec` 기존 명시 유지.
- **섹션 특화 결함 유지/보강**: garment fit·drape·morph·identity drift·turntable 결함 등 패션 특화만 남김.

### 템플릿별 [타입 / 이관 후 extra_negative 핵심 / 비고]
| # | 템플릿 | preset | extra_negative 핵심 | 비고 |
|---|---|---|---|---|
| 1 | On-Model Studio ⚠️ | Fashion | warped/melted garment, mismatched color/print, stiff drape, floating garment, mannequin, **six fingers/fused·webbed** | 손샷4 needs_human_review |
| 2 | Fit & Size On-Body 🅣⚠️ | Fashion | warped garment, color mismatch, loose ill-fit drape, floating garment, **six fingers/fused·webbed** | text/logo 미포함 유지(overlay) |
| 3 | Lifestyle Scene Pack | Film | warped garment, color mismatch, studio sterile catalog look, on-camera flash, duplicated objects, detail loss | HDR(preset) 제거 |
| 4 | Macro Texture Shots | Macro | warped texture, invented patterns, color shift, soft/missed focus, plastic material, oversharpen halos, dust/lint, fabric morph, dup stitches | preset 빈값→SAFETY만 |
| 5 | Quick-Drop Teaser Reel | Fashion | warped garment, color shift between shots, garment morph, jitter, busy bg | 🎬 모션=reel(별도) |
| 6 | Outfit Transition Reel ⚠️ | Fashion | morph during transition, print shift between looks, mismatched seams, **identity drift/flicker**, **six fingers/fused·webbed** | 최고 morph 리스크·needs_human_review |
| 7 | GRWM Drop Reel ⚠️ | Glamour | warped garment, color shift, garment morph, **identity drift/flicker**, **six fingers/fused·webbed** | harsh shadows(preset) 제거 |
| 8 | 360 Product Spin | Fashion | morphing garment, color shift in rotation, geometry distortion, wobbling spin, motion smear, bg flicker, dup product, **live model in frame** | 제품 전용(모델 금지) |

### 검증
- `grep -c '"negative":' src/recipes/seeds/recipes.fashion.v2.js` = **0** ✓ (死필드 잔여 0, `look.positive`도 0)
- `grep -c '"extra_negative":'` = **8** ✓
- extra_negative 내 SAFETY/preset 중복어 단어경계 검사 = **누수 0** ✓ ("text"는 `texture` 부분문자열 오탐 — 실제 단어 미존재)
- `node scripts/consolidate_recipes.js` → **fashion OK · 8개 · 중복 이름 없음** (비용공식·이름·스키마 불변). beauty 16·pet 12 이슈는 타 섹션 기존 건(무관).

### 미처리(상위 수거 대상)
- §5.8 구조화 CSV/Excel export = 총지휘 `scripts/export_recipe_prompts.js`(신설 예정) 일괄 export로 통합 예정 → 워커 범위 외, 보류.
- name/credit_cost/output_type/shots/카드계약 = 불변(미수정).

---

## 작업 2 (2026-06-10): `extra_positive` 정밀화 + reel `music_mood` 구조화

### 임무
명령서 §3·§6 DoD의 남은 항목 = extra_positive 정밀화(identity-lock / hand-anatomy / 렌즈·라이팅 디테일) + reel music_mood 구조화. **시드 실측으로 엔진 자동주입을 먼저 확정 후** 중복 없이 보강.

### 엔진 자동주입 실측 (positive 측 — 중복 금지 기준)
resolver `buildPrompt`(L132~) 조립: `subj → preset.prefix → attrFrags → wardrobe → pose → scene → composition → ★extra_positive★ → (SAFETY_POSITIVE if personInFrame else 'brand-safe, SFW') → preset.suffix → QUALITY_SUFFIX`.
- `QUALITY_SUFFIX`(자동) = `professional photography, 8k uhd, sharp focus, natural lighting` → extra_positive에 재기술 금지.
- `SAFETY_POSITIVE_ENFORCEMENT`(자동, **personInFrame일 때만**) = `clearly adult, age 25+, mature face, fully clothed, brand-safe, SFW`. **personInFrame = `subject.type==='face' || strategy==='on_model_tryon'` → fashion은 T1·T2(on_model_tryon)만 주입**, T3~T8(product_composite)은 미주입.
- `COMPOSITION_FRAGMENT`가 closeup/medium/full 프레이밍 주입 → extra_positive엔 **카메라 렌즈·각도**만(프레이밍 재기술 금지). composition은 3값 매핑만 유효라 각도 디테일은 여기로.
- `music_mood`는 enum/검증 없는 free-text(resolver L169 passthrough). 형제 v2(jewelry/pet/tech/food.v2)도 서술형 사용 → bare `"upbeat"`만 구식이라 구조화.

### 적용 (§3 강화 규칙)
- **identity-lock**: 멀티샷·전환 7종은 첫머리 `CRITICAL: same garment/model across all frames, locked, no morph/drift`. (**Macro는 독립 매크로 크롭 4컷 = 멀티프레임 동일성 무관 → 의도적 제외**, 대신 `identical to reference, no invented texture`로 충족.)
- **hand-anatomy**: 손 등장 4종(On-Model·Fit&Size·Outfit Transition·GRWM) extra_positive에 `single well-formed hand, exactly five natural fingers, anatomically correct grip, visible fingernails`. 제품전용 360은 손/모델 미언급(`no model or hands in frame` 명시).
- **렌즈·라이팅 보강**: 누락분에 렌즈·F값(예: Fit&Size `50mm f/5.6`, Quick-Drop `50mm f/4`, 360 `50mm f/8`)·key/fill/rim 구체화. Macro는 빈 preset이라 풀 기술부하 유지.
- **text_overlay(Fit&Size 🅣)**: extra_positive에 `clean margins reserved for composited measurement callouts/size label (text added post-render, not drawn)` 추가 — AI가 글자 그리지 않음 명시.
- **music_mood 구조화(4 릴)**: `장르 + BPM범위 + 악기 + 에너지 + 레퍼런스` (예: Outfit Transition = `high-energy hip-hop/pop, 125-135 BPM, hard 808 bass + crisp hi-hats + vocal chop, snap hit on the A→B beat, viral TikTok transition energy`).

### 적대적 검증 (Workflow, 16 에이전트 = 8템플릿 × 2렌즈)
- 렌즈 A(중복·스코프): QUALITY/SAFETY/preset/composition/subject 재기술·릴 모션 누수·영어/스코프 — **8/8 pass, 이슈 0**.
- 렌즈 B(방법론 완전성): identity-lock·hand-anatomy·렌즈·라이팅·reference-lock·overlay·music 구조화 — **8/8 pass, 이슈 0**.
- **총 16/16 통과, blocker 0**. (검증 후 Quick-Drop만 일관성 절을 선두 CRITICAL로 승격 — 형제 릴 정합.)

### 검증
- `grep -c '"negative":'` = **0** 유지 ✓ · extra_positive 8 · extra_negative 8 · 죽은필드 0.
- positive 자동주입 중복 단어경계 검사(8k/sharp focus/adult/clothed) = **누수 0** ✓ · 릴 모션 누수(push-in/whip/orbit/zoom) = **0** ✓.
- identity-lock(CRITICAL 선두) **7/8** (Macro 의도적 제외) · 손규칙 **4/4** · 360 손·모델 미언급 ✓.
- reel music_mood 구조화(BPM 포함) **4/4** ✓.
- `node scripts/consolidate_recipes.js` → **fashion OK · 8개 · 중복 이름 없음 · 비용공식 불변**. beauty/pet 이슈는 타 섹션 기존 건(무관).

### 불변 확인
- name·credit_cost(◈5·5·2·2·4·4·6·6)·output_type·shots 개수·composition 값·guards·per_shot_motion **전부 미수정** → 카드계약·비용·FE 영향 0.
- §5.8 CSV/Excel export = 총지휘 일괄 export 대기(워커 범위 외).
