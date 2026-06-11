# 04 jewelry — 프롬프트 정밀화 작업기록

> 워커 세션 산출(파일만 저장, commit/push 금지). 근거 명령서 = `PROMPT_프롬프트정밀화_명령서.md`.
> 대상 = `src/recipes/seeds/recipes.jewelry.v2.js` (8 템플릿). 브랜치 `feat/prompt-negatives`.

## 작업 (2026-06-10): 死필드 `look.negative` → `look.extra_negative` 이관 + 정제

### 임무
엔진(`recipeResolver.js` L148: `negative = preset.negative + look.extra_negative + SAFETY_NEGATIVE_PROMPT`)이 **`look.extra_negative`만** 소비. 기존 네거티브는 전부 死필드 `look.negative`에 있어 live 생성에 안 닿고 있었음 → 8/8 전부 이관.

### 정제 규칙 적용
- **SAFETY 전역 자동주입과 중복 제거**: `imagePrompt.builder.js`의 `SAFETY_NEGATIVE_PROMPT`가 이미 주입하는 항목(`watermark, text, logo, deformed, blurry, low quality, extra fingers, extra limbs, mutated hands, bad anatomy, nsfw …`)을 extra_negative에서 삭제. 구체적으로 `text artifacts`, `watermark`, `blurry edges`, `extra fingers beyond five` 등을 제거.
- **text_overlay 템플릿(Scale & Spec Overlay) text/logo 금지**: 해당 필드에 text/logo 미포함(전역 SAFETY가 처리). 대신 배지 영역 보호 결함(badge zone 가림)으로 보강. `meta.render_notes`에 이미 "DO NOT inject text/logo" 명시되어 있음(유지).
- **보석 특화 결함 보강**: 명령서 §3 예시(`warped facets, duplicated stone, fingerprints, dull lifeless reflections`) 톤 반영 → `dull lifeless reflections / metal`, `blown-out specular highlights`, `soft out-of-focus facet edges` 추가.
- **손 노출군 강화(명령서 §3 hand anatomy 규칙)**: Wrist & Hand · Jewelry Unbox ASMR는 generic `extra fingers`(SAFETY) 대신 구체값 `six fingers` + `fused, melted or webbed fingers`로 치환·유지.

### 템플릿별 [바꾼 필드 / 의도 / 검수플래그]
| # | 템플릿 | 타입 | 이관 후 extra_negative 핵심 | 비고 |
|---|---|---|---|---|
| 1 | Surface Macro | 📷 | 패싯/프롱/금속/luster 결함 + dull reflections, soft facet edges | text/watermark 제거 |
| 2 | Studio & Editorial | 📷 | velvet lint/dust, warped glass reflection, plastic sheen, dull metal | text/watermark 제거 |
| 3 | Scale & Spec Overlay 🅣 | 📷 | scale/ruler 왜곡, **badge zone 가림** | text/logo 미포함 유지(전역 SAFETY) |
| 4 | Wrist & Hand ⚠️ | 📷 | **six fingers / fused·webbed / 너클 관절 / 손목** + 보석 결함 | needs_human_review |
| 5 | Neck & Ear Try-On ⚠️ | 📷 | full face/two ears 초과, floating earring, chain/clasp 단절 | needs_human_review |
| 6 | Set & Stack Stylist | 📷 | instance identity 불일치, overcrowded, dull metal | flat-lay 저위험 |
| 7 | Lumen Reel | 🎬 | flicker/morph/jitter, color banding, motion smear, dull reflections | 영상 모션은 reel.per_shot_motion(별도) |
| 8 | Jewelry Unbox ASMR ⚠️ | 🎬 | **six fingers / fused·webbed**, box geometry, motion smear | needs_human_review (손 샷2) |

### 검증
- `grep -c '"negative":' src/recipes/seeds/recipes.jewelry.v2.js` = **0** ✓ (死필드 잔여 0, `look.positive`도 0)
- `grep -c '"extra_negative":'` = **8** ✓
- extra_negative 내 SAFETY 중복어 잔재 grep = **NONE** ✓
- `node scripts/consolidate_recipes.js` → **jewelry OK · 8개 · 중복 이름 없음** (비용/이름/스키마 불변). beauty 16·pet 12 이슈는 타 섹션 기존 건(무관).

---

## 작업 2 (2026-06-10): extra_positive 정밀화 + reel music_mood 구조화 + text_overlay overlay_spec

### 방법 (8개 전 템플릿)
워크플로우(에이전트 16 = 템플릿당 작성→적대적 검증)로 **구조화 제안만** 수집 → 워커가 단일 파일에 결정적 적용. 8/8 approved. 기존 풍부한 extra_positive는 **보존**, 명령서 §3 규칙대로 **타깃 보강만**(blind rewrite 아님).

### 엔진 실측 근거 (중복 회피)
- `Macro`·`Studio` preset = presetMap **부재**(migrate.js:510~ Natural/Fashion/Dynamic/Cinematic/Portrait/Street/Glamour/Film/3D/Anime만) → prefix/suffix 빈값 → extra_positive가 positive 전체 담당.
- `Portrait`(Wrist&Hand·Neck&Ear) = `85mm + studio lighting + soft bokeh` 자동주입 → extra_positive에서 중복 제거(85mm/bokeh 문구 삭제).
- on_model_tryon(Wrist&Hand·Neck&Ear) = personInFrame=true → `clearly adult, age 25+, fully clothed, SFW` 자동주입 → 다시 안 씀.
- `Cinematic`(Lumen Reel·Unbox ASMR) = `anamorphic + teal/orange grading + film grain + widescreen + shallow DoF` 자동주입 ⚠️ → 9:16 보석 릴에 **색캐스트·레터박스 충돌**(아래 ⚠️플래그).

### 템플릿별 보강
| # | 템플릿 | 보강 내용 |
|---|---|---|
| 1 | Surface Macro | single hero piece, focus-stack DoF, highlight rolloff, 단일 reference-lock 정리 |
| 2 | Studio & Editorial | softbox key+grazing kicker / 저각 골든윈도 방향광 명시, reference-lock 강화 |
| 3 | Scale & Spec Overlay 🅣 | 배지 negative-space 1회로 정리 + **`meta.overlay_spec`{layer/elements/position} 신설**(측정 OR 스펙/소재/인증 배지, lower-third/측면 여백). text/logo 미기재(전역 SAFETY) |
| 4 | Wrist & Hand ⚠️ | 손 bo일러플레이트 `single well-formed hand, exactly five natural fingers, anatomically correct grip, visible fingernail`. preset 85mm/bokeh 중복 제거. (negative 추가분은 기존 `six fingers`·`fused/webbed`와 중복이라 미적용) |
| 5 | Neck & Ear Try-On ⚠️ | wardrobe `minimal neutral off-white/nude top`(피부 색캐스트 방지), clasp/chain·ear-lobe 사실성, face-crop 강화 |
| 6 | Set & Stack Stylist | 첫머리 identity-lock `CRITICAL: every instance identical to the reference, no morph/drift` |
| 7 | Lumen Reel 🎬 | identity-lock 첫머리 + music_mood 구조화(genre/BPM/instruments/energy/ref) + Cinematic 색캐스트·레터박스 상쇄(positive) + extra_negative 상쇄어 |
| 8 | Jewelry Unbox ASMR 🎬⚠️ | identity-lock + 손 bo일러플레이트 + music_mood 구조화 + Cinematic 상쇄. preset 중복 `shallow depth of field` 제거 |

### music_mood 구조화 (감정어 → genre+BPM+instruments+energy+reference)
- Lumen Reel: `luxe ambient shimmer` → `luxury ambient electronica, 70-85 BPM, … reference FKJ x Tycho`.
- Unbox ASMR: `soft ASMR warmth with delicate chimes` → `soft ASMR ambient, 60-75 BPM, … reference … Brian Eno-style ambient`.

### ⚠️ 총지휘/엔진 핸드오프 플래그 (preset 충돌 — 프롬프트 데이터 범위 밖)
- **Cinematic preset가 보석 9:16 릴에 부적합**: `teal/orange grading + widescreen framing + film grain`이 금속/젬 컬러를 왜곡하고 세로 프레임을 레터박스화. 워커는 prompt 데이터로만 상쇄(extra_positive `true-to-reference color / vertical 9:16 edge-to-edge / no stylized grading` + extra_negative `color-grading cast / teal-orange tint / letterbox·widescreen bars / film grain`). **근본 해결(릴 2개 preset 재배정 또는 Cinematic suffix 조정)은 엔진/총지휘 결정 필요.**

### 검증
- `grep -c '"negative":'` = **0** ✓ / extra_positive 8·extra_negative 8·overlay_spec 1 ✓
- SAFETY 중복어 잔재 NONE ✓ · text_overlay extra_positive에 text/logo NONE ✓
- `node -e require(...)` 정상 로드(8개, 전부 extra_negative, 릴 2개 구조화 music_mood) ✓
- `node scripts/consolidate_recipes.js` → **jewelry OK · 8개 · 중복 없음**(비용/이름/스키마 불변) ✓

### 미처리(상위 수거 대상)
- §5.8 구조화 CSV/Excel export = 총지휘 `scripts/export_recipe_prompts.js`(미존재·신설 예정) 일괄 export로 통합 → 워커 범위 외 보류(임의 CSV 생성 시 포맷 분절 위험).
- 카탈로그(`docs/템플릿_한국어_카탈로그.md`) = 난이도/크레딧/overlay 플래그 **불변**(프롬프트 문구만 정밀화) → 사용자노출 필드 변동 없어 동기화 불필요.
- name/credit_cost/output_type/shots/composition/카드계약 = 불변(미수정).
