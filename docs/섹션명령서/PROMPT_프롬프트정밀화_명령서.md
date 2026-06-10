# 프롬프트 정밀화 — 세션 명령서 (per-template prompt authoring)

> 너는 **프롬프트 정밀화 워커 세션**이다. 🎨템플릿 총지휘 산하. 93개 템플릿(11섹션) 각각에 **엔진이 실제로 소비하는 프롬프트**를 정밀하게 작성·보강한다.
> 작업 디렉터리 `~/HeyHoAI`. 세션 메모리 비공유 → 공유 백본 = 레포 파일시스템. **파일만 저장, commit/push 금지.**
> 근거: 이 명령서는 resolver·시드 실측 검증(2026-06-10) 위에 작성됨. 추측 아님.

---

## 0) 역할 & 산출 한 줄
각 레시피(`src/recipes/seeds/recipes.<key>.v2.js`)의 `config.look.extra_positive` / `config.look.extra_negative` / `config.shots[]` / `config.reel.per_shot_motion[]`를 **엔진이 실제 읽는 필드에** 템플릿 특화로 채운다. 영어 프롬프트(AI 품질). 한국어는 카탈로그/작업기록에만.

---

## 1) ⚠️ 기술 척추 — 엔진이 실제로 읽는 필드 (검증됨, 가장 중요)

`src/recipes/recipeResolver.js`가 최종 provider 프롬프트를 조립한다. **이 필드들만 소비된다:**

**Positive 조립 순서 (resolver `buildPrompt`):**
```
subject → preset.prefix(style_preset 맵) → attributes[] 조각 → wardrobe
        → shot.pose → shot.scene → composition 조각
        → ★ look.extra_positive ★ (템플릿 커스텀 = 네가 쓰는 곳)
        → SAFETY_POSITIVE_ENFORCEMENT(인물 프레임 시) → preset.suffix → QUALITY_SUFFIX
```
**Negative 조립 (L148):**
```
negative = preset.negative + ★ look.extra_negative ★ + SAFETY_NEGATIVE_PROMPT
```

### ✅ 네가 써야 하는 필드 (이것만 엔진이 읽음)
| 필드 | 경로 | 비고 |
|---|---|---|
| **extra_positive** | `config.look.extra_positive` | resolver L142. **현재 93/93 채워짐(풍부)** → 정밀 개선 대상 |
| **extra_negative** | `config.look.extra_negative` | resolver L148(main 동일). **현재 main 0/93 — 전부 死필드 `look.negative`에 있음 → 93개 全 이관 필요** |
| shots[].scene/pose/composition | `config.shots[i]` | positive에 직접 합성. composition은 `closeup\|medium_shot\|full_body` 매핑값만 유효 |
| reel.per_shot_motion[] | `config.reel.per_shot_motion` | reel만. **프롬프트가 아니라 영상 모션 엔드포인트로 별도 전달**(shot_i ↔ motion_i) |

### ❌ 죽은 필드 — 엔진이 무시 (⚠️ 핵심 정정 2026-06-10)
- `config.look.negative` · `config.look.positive` — resolver 미파싱. **main 실측: 93개 템플릿(11섹션 全·beauty 포함)이 네거티브를 `look.negative`(死필드)에 보유 중 → 현재 live `/api/recipes`가 커스텀 네거티브 없이 생성 중.**
- 즉 진짜 임무 = **`look.negative` → `look.extra_negative`로 이관(migrate) + 정제**. "신규 작성"이 아니라 "이미 있는 좋은 네거티브를 살아있는 필드로 옮기고 다듬기".
- 이관 시 정제 필수: (a) SAFETY 중복(watermark/text/logo/extra fingers/plastic skin 등) 제거 (b) text_overlay 템플릿은 'text'/'logo' 제거 (c) 섹션 특화 결함 보강. **blind rename 금지**(text_overlay·SAFETY 중복 때문).

### 🛡️ SAFETY 자동주입 (중복 금지)
- `SAFETY_NEGATIVE_PROMPT`가 **전역 자동 주입**: `child/minor/nsfw/explicit/violence/weapon/deformed/watermark/text/logo/extra fingers/bad anatomy …`. → **extra_negative에 이것들 다시 적지 말 것.**
- `SAFETY_POSITIVE_ENFORCEMENT`(="clearly adult, age 25+, fully clothed, SFW")는 **인물 프레임일 때 자동** 주입. 다시 적지 말 것.

### 🅣 text_overlay=true 템플릿 (5개 + 텍스트의존군)
- 글자는 **AI가 그리지 않고** 렌더 후 오버레이로 합성. SAFETY가 'text/logo'를 전역 차단하므로:
  - **extra_negative에 'text'/'logo'를 넣지 말 것**(전역이 처리). 다른 결함만.
  - `meta.overlay_spec`(layer/elements/position) + `meta.render_notes`에 "SAFETY_NEGATIVE가 text/logo 처리"를 명시.
  - extra_positive에 "clean uncluttered area reserved for composited badge/caption" 같은 자리 확보 문구.

### 🔒 guards & motion (프롬프트 아님)
- `config.guards[]`(form_lock·label_lock·single_sku·count_lock·scale_cue·reflection_control·emissive_render) = **렌더 후처리 메타데이터.** 프롬프트 텍스트 아님. 단, extra_positive에 keyword 힌트("identical to reference", "keep exact label/proportions", "exactly N units")로 보강.
- `reel.per_shot_motion[]` = 영상 모션(별도 전달). positive/negative에 모션 적지 말 것.

---

## 2) 현황 진단 (시드 실측 2026-06-10)

| 필드 | 채움(실측 파싱) | 판정 |
|---|---|---|
| extra_positive (live) | 93/93 (전부, 100-250단어) | 🟢 풍부 → 정밀화 |
| **extra_negative (live)** | **0/93** (main 실측) | 🔴 11섹션 全 이관 대상 |
| **look.negative (死필드)** | **93/93** (11섹션 全) | 🔴 **네거티브가 엔진에 안 닿음 → extra_negative로 이관** |
| shots scene/pose | 100% 구체 | 🟢 |
| shots composition | 3값만(각도 없음) | 🟡 camera 디테일은 extra_positive로 |
| reel music_mood | 감정어만(BPM/악기 없음) | 🟡 구조화 |
| beauty on-model wardrobe | 3개 누락 | 🟡 |
| provisional 18개(beauty8·home2·pet8) | 프롬프트 미검증 | 🔴 우선 |

---

## 3) 프롬프트 작성 방법론

### extra_positive 구조 (검증된 우수 패턴)
```
[기법: 렌즈·F값·focus] + [라이팅: key/fill/rim 구체] + [주제 특화 디테일]
+ [reference lock: "identical to reference, keep exact proportions/label"]
+ [무드/톤] + (인물 시) [identity/hand 보강]
```
**검증된 예시(그대로 톤 차용):**
- 온모델: `garment fit IDENTICAL to reference (same color/print/seams/neckline), large octabox key camera-left + fill scrim, 85mm f4, true fabric drape, relaxed model`
- 매크로: `extreme macro, 100mm f8 focus-stacking, raking sidelight to reveal texture, seamless deep-black backdrop, every detail identical to reference`
- ASMR: `slow cinematic ASMR, 100mm f4, ultra-slow gliding camera, shallow rolling focus, dust-free pristine surface, buttery smooth slow motion`
- 전환프레임: before/after `same person same lighting side-by-side`, in-hand `partial hand crop + product scale visible`

### extra_negative = look.negative 死필드 이관+정제 (93개 — 핵심 임무, 11섹션 全·beauty 포함)
- **방법**: 각 템플릿의 기존 `look.negative` 내용을 `look.extra_negative`로 옮기고 → SAFETY 중복(text/logo/watermark/extra fingers/nsfw 등) 제거 → 섹션 특화 결함만 남기고 다듬는다. (내용은 이미 풍부하니 from-scratch 아님.)
- **남길 것 = 템플릿 특화 결함만** (SAFETY가 막는 건 제외):
  - 온모델: `warped or melted garment, color shift, mismatched print, stiff unnatural drape`
  - 정물/제품: `plastic CGI look, blown specular highlights, duplicated product, distorted label, wrong proportions`
  - 음식: `fake CGI steam, plastic-looking droplets, over-sharpened halos, unappetizing color`
  - 보석: `warped facets, duplicated stone, fingerprints, dull lifeless reflections`
  - 인물 릴/토킹헤드: `lip-sync desync, mouth/tooth morph, identity drift between frames`

### 강화 규칙 (갭 기반)
- **identity 보강**: before/after·multi-shot·talking-head는 extra_positive 첫머리에 `CRITICAL: same person/product across all frames, locked facial identity, no morph/drift`.
- **hand anatomy**: 손 노출 템플릿(Haul·Demo·Testimonial·On-Model)은 extra_positive에 `single well-formed hand, exactly five natural fingers, anatomically correct grip, visible fingernail` + extra_negative에 `six fingers, fused/webbed digits`.
- **beauty on-model wardrobe**: On-Model Glow Drop·Before/After·On-Skin Patch에 `wardrobe: minimal neutral off-white/nude top to avoid color cast on skin`.
- **music_mood 구조화(reel)**: 감정어 대신 `genre + bpm범위 + instruments + energy + reference`로.

---

## 4) 우선순위 (이 순서로)
> main 기준 **11섹션 93개 全이 死필드**(beauty 16 포함). 우리 로컬 beauty 이관본은 옛 브랜치 `b08fbe0` 참고용(main 미반영).
1. **死필드 이관(93개) — 최대 ROI·최우선.** `look.negative` → `look.extra_negative` 이관 + SAFETY 중복 제거 + text_overlay 'text/logo' 제거. 이게 안 되면 네거티브가 엔진에 안 닿아 live 생성 품질 저하.
2. **provisional 미검증분**(beauty 8·home 2·pet 8) — extra_positive 정밀 + 이관 + (영상군) 샘플 검토 플래그.
3. **품질 갭** — identity/hand/wardrobe 보강, music_mood 구조화, scene 형용사 강화, extra_positive 정밀화.
4. **text_overlay 템플릿** — 이관 시 extra_negative에서 text/logo 제외 + overlay_spec 확인.

---

## 5) 산출 규약 (워커)
1. **수정 파일**: `src/recipes/seeds/recipes.<key>.v2.js` — `config.look.extra_positive`/`extra_negative`, `config.shots[]`, `config.reel`. (스키마 다른 필드·name·credit_cost·output_type은 건드리지 말 것 = 카드계약·비용 불변.)
2. **언어**: 프롬프트 영어 only. 한국어는 ②.
3. **작업기록**: `docs/섹션명령서/<NN_key>_작업기록.md`에 템플릿별 [의도 / 바꾼 필드 / 근거 / (영상군)검수플래그]. 한국어 OK.
4. **검증**: 매 수정 후 `node scripts/consolidate_recipes.js` → 이슈0·중복0 확인(비용/이름/스키마 깨지면 안 됨).
5. **동기화**: 의미 변동 시 `docs/템플릿_한국어_카탈로그.md` 갱신(난이도·overlay 변동 반영).
6. **git**: 파일만 저장. **commit/push 금지**(총지휘/Chief가 수거·머지). 이름·credit·카드계약 불변이라 카드 재export 불필요(프롬프트는 generated.js에 노출 안 됨).
7. **🌿 작업 브랜치 = `feat/prompt-negatives`(= origin/main 기준)**. main이 빠르게 전진하니 **시작 전 `git fetch` + origin/main 충돌 확인**(CLAUDE.md 규칙). main의 live `/api/recipes`가 이 시드를 직접 읽으므로 이관 즉시 생성 품질에 반영됨.
8. **📊 구조화 export 동시(DB 적재용·필수 규칙)**: 시드 수정과 함께 프롬프트 데이터(section·id·name·type·cost·extra_positive·extra_negative·shots·flags)를 **CSV/Excel로 별도 저장**. 총지휘가 `scripts/export_recipe_prompts.js`(신설 예정) 일괄 export로 통합. 시드 변경 시 export도 갱신.

---

## 6) 완료 기준 (DoD)
- [ ] 담당 섹션 전 템플릿 네거티브가 **`look.extra_negative`(live)**에 있음 — `look.negative`(死) 비움(이관 완료, SAFETY 중복 없이, 섹션 특화).
- [ ] `extra_positive` 정밀화(identity/hand/wardrobe/카메라 디테일 반영).
- [ ] provisional 18개 프롬프트 완성 + 영상·고난이도군 `meta.flags` 정합.
- [ ] text_overlay 5개 = extra_negative에 text/logo 없음 + overlay_spec 존재.
- [ ] `node scripts/consolidate_recipes.js` 이슈0·중복0·비용공식 통과(불변).
- [ ] `<key>_작업기록.md` 기록 + 카탈로그 동기화.
- [ ] 죽은 필드 `look.negative`/`positive`에 잔여 내용 0 (전부 `extra_negative`로 이관됨) — `grep -c '"negative":' src/recipes/seeds/recipes.<key>.v2.js` = 0 확인.

---

## 7) 착수 커맨드 (붙여넣기)

**옵션 A — 섹션별 워커 1개씩(권장, 11세션):**
```
~/HeyHoAI에서 docs/섹션명령서/PROMPT_프롬프트정밀화_명령서.md를 읽고 프롬프트 정밀화 워커를 맡아.
담당 섹션 = <influencer|fashion|beauty|jewelry|food|home|tech|pet|ugc|general|headshot> 중 하나. (beauty 포함 — main 기준 死필드 16)
핵심 임무: src/recipes/seeds/recipes.<key>.v2.js의 각 템플릿 네거티브가 죽은 필드 look.negative에 있음
 → look.extra_negative(엔진이 읽는 live 필드)로 이관 + SAFETY 중복(text/logo/extra fingers 등) 제거
 + text_overlay 템플릿은 text/logo 제외 + 섹션 특화 결함 다듬기. extra_positive는 identity/hand/wardrobe 정밀화.
영어 프롬프트. node scripts/consolidate_recipes.js로 이슈0 확인, grep '"negative":' 로 死필드 0 확인, <NN_key>_작업기록.md 기록.
파일만 저장, commit/push 금지.
```

**옵션 B — 단일 세션이 93개 전부:** 위에서 "담당 섹션 = 전체 11섹션, provisional→extra_negative→품질갭 순"으로.

**총지휘 수거**: 🎨템플릿 총지휘가 `consolidate_recipes.js`로 검증·롤업하고 `_STATUS.md` 갱신, Chief에 보고.

---

## 공통 규칙
- 조직: 👑Chief → 🎨템플릿 총지휘 → 이 워커. 백본 = 레포 파일.
- 카드계약·비용·이름 **불변**(프롬프트만 손댐) → FE/마켓 영향 0, 카드 재export 불필요.
- 엔진(resolver)·개발자 영역 코드 수정 금지. 프롬프트 데이터(시드)만.
- 죽은 필드 금지, SAFETY 중복 금지, text_overlay는 text/logo 제외.
- 참고: resolver = `src/recipes/recipeResolver.js`(L142·L148), 안전 = `src/images/imagePrompt.builder.js`, 가드 = `src/recipes/seeds/product.guards.v2.js`, 기존 프롬프트 = `docs/템플릿_프롬프트_읽기쉬운.md`(참조용·갱신X).
