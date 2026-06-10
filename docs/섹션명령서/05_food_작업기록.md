# 05 푸드 & 카페 — 워커 작업기록 (총지휘 수거용)

> 워커 세션이 작업할 때마다 여기에 바로 기록 → 총지휘가 `docs/섹션명령서/`에서 읽음.
> 공유 백본 정본 = `recipes.food.v2.js`(시드) + `_STATUS.md`(자동생성). 이 파일은 **시드에 안 들어가는 검증결과·분석·결정요청**을 남기는 곳.
> 규칙: 워커는 파일만 저장(commit/push 금지). 이름·credit·카드계약 불변(프롬프트만 손댐).

---

## 2026-06-10 · 死필드 negative 7/7 → extra_negative 이관 완료 ✅ (브리프 `PROMPT_프롬프트정밀화_명령서.md` 수행)

**핵심 임무 = 죽은 필드 `config.look.negative`(resolver 미파싱) → live 필드 `config.look.extra_negative`(resolver L148이 읽는 곳)로 이관 + SAFETY 중복 제거 + 섹션 특화 결함 다듬기.** 7개 전부 이관.

### 근거 (실측 재확인)
- `recipeResolver.js:148` → `negative = joinClean([preset.negative, look.extra_negative, SAFETY_NEGATIVE_PROMPT])`. **`look.negative`는 어디서도 안 읽힘 = 死.** 이관 전 7개 네거티브가 전부 엔진에 안 닿고 있었음.
- `SAFETY_NEGATIVE_PROMPT`(`imagePrompt.builder.js:16`) 전역 자동주입 = `child/minor/…nsfw/explicit/…violence/weapon/…deformed/blurry/low quality/watermark/text/logo/extra limbs/extra fingers/mutated hands/bad anatomy`. → 이관 시 이 토큰들 **중복 제거**.

### 템플릿별 변경 (바꾼 필드 = `look.negative`→`look.extra_negative`)

| # | 이름 | 타입 ◈ | 제거한 SAFETY 중복 | 섹션 특화 보강 |
|---|---|---|---|---|
| 1 | Top-Down Hero | 📷 ◈2 | `text artifacts, watermark, logo` | plastic CGI-looking food·unappetizing dull color·smudged plate edge. `fingers in frame`→`stray fingers or hands in frame`(스코프) |
| 2 | Drip & Steam Macro | 📷 ◈2 | `text, watermark` | plastic-looking droplets·frozen unnatural splash. `extra hands`→`stray hands in frame`(스코프) |
| 3 | Golden-Hour Cafe Mood | 📷 ◈2 | `text overlays, watermark` | plastic CGI food·unappetizing dull color. `people's faces, hands`→`...in frame`(스코프 명확화) |
| 4 | Serving & Table Lifestyle ⚠️ | 📷 ◈2 | `text artifacts, watermark, logo` | **손 노출 템플릿** — `six fingers, fused or webbed digits` 추가(§99). hand-quality(unmanicured/dirty nails) 유지. **extra_positive에 손 보강**: "single well-formed hand, exactly five natural fingers, anatomically correct grip, neatly manicured fingernails" |
| 5 | Menu / Price Card 🅣 | 📷 ◈3 | `extra hands`→스코프 | **text_overlay=true** — extra_negative에 text/logo **無**(확인). `insufficient negative space for overlays`·`dishes overlapping into label zones` 추가. render_notes를 `look.extra_negative` 기준으로 갱신(SAFETY가 text/logo 처리 명시) |
| 6 | Single-Dish Sizzle | 🎬 ◈2 | `text artifacts, watermark` | fake plastic CGI steam·unappetizing color. `extra hands`→스코프 |
| 7 | Sizzle & Steam ASMR ⚠️ | 🎬 ◈6 | `text artifacts, watermark` | morphing toppings/facets·inconsistent dish geometry(프레임 일관성) 유지. `extra hands`→스코프 |

**스코프 vs SAFETY 구분(검증):** bare `hands`/`faces in frame`은 SAFETY가 막지 않음(SAFETY는 anatomy 품질 `extra fingers/mutated hands`만 차단) → 제품 단독 컷에서 "손/얼굴이 끼어들지 마라"는 **유효한 섹션 특화 스코프 결함**이라 유지. `six fingers, fused/webbed digits`(템플릿4)는 SAFETY 일반항보다 **구체적 보강**이라 §99 지침대로 유지.

### 검증 (DoD)
- ✅ `grep -c '"negative":' src/recipes/seeds/recipes.food.v2.js` = **0** (死필드 잔여 0).
- ✅ 7/7 `look.extra_negative` 비어있지 않음 · `'negative' in look` = false (node 로딩 확인).
- ✅ SAFETY 중복 누수 스캔(`watermark|logo|text|extra fingers|…`) = clean(extra_negative 라인 0건).
- ✅ text_overlay #5 = extra_negative에 text/logo 無.
- ✅ `node scripts/consolidate_recipes.js` → **food OK, 7개, 이슈 0, 중복이름 0**(beauty16·pet12 카운트 이슈는 기존·타섹션).
- ✅ 카드계약 불변: git diff = 9 insert/9 delete(7 negative rename + 1 extra_positive[#4 손] + 1 render_notes[#5]). name·credit_cost·output_type·shots·reel **미변경**.

### 산출
- **수정 파일**: `src/recipes/seeds/recipes.food.v2.js` (look 필드만 + #5 meta.render_notes).
- **자동 갱신**: `_STATUS.md`·`_CATALOG.json`(consolidate 재실행 산출).
- **git**: 파일만 저장. commit/push 안 함(총지휘 수거 대기).

### 미적용/판단
- extra_positive는 #4(손 보강)만 손댐. 나머지 6개는 이미 🟢 풍부(카메라·라이팅·reference lock 갖춤)라 negative 이관 임무에 집중, 과편집 회피.
- music_mood 구조화(◈ reel 2개)는 본 임무(死필드 이관) 범위 밖 — 품질갭 후속으로 보류. 필요 시 총지휘 지시.

### 적대적 검증 패스 (멀티에이전트 3렌즈 · ultracode)
이관 후 3개 독립 렌즈(SAFETY-dedup / food-completeness / special-case)로 적대적 리뷰. **결과: 구조적 정합 ✅, high/medium 0건, SAFETY 누수 0, special-case(text_overlay·손) 전부 clean.** low 4건 중 3건 채택·1건 기각:
- ✅ **#5 Menu/Price Card**: 그리드 특화 결함 `duplicated identical dishes across grid cells` 추가(셀마다 동일 접시 반복 방지 — 흡수된 옛 Full Menu Pack 결함 복원).
- ✅ **#6 Single-Dish Sizzle(reel)**: 형제 #7엔 있던 모션 안정 가드 부재 → `food geometry morphing mid-clip, toppings shifting during motion, flickering, stutter` 추가(Kling 클립 내 모핑/플리커 실결함).
- ✅ **#7 Sizzle & Steam ASMR(reel)**: 오빗/풀백 모션 시간축 결함 `flickering, stutter` 복원(흡수된 360 Glaze Spin 유산).
- ❌ **#4 손 `six fingers / fused or webbed digits`(SAFETY 의미중복 의심)** = **기각·유지.** 명령서 §99가 손 노출 템플릿에 정확히 이 토큰을 보강하라 명시 + special 렌즈도 "SAFETY 'extra fingers'와 구별됨, 부당중복 아님"으로 결론. 스펙 지시 우선.

재검증(추가 편집 후): 死필드 0 · SAFETY 누수 0(전 7개) · T5 text/logo 無 · `consolidate` food OK 7 · 중복이름 0 — **전 통과**.

---

## 2026-06-10 · extra_positive 정밀화 + reel music_mood 구조화 ✅ (품질갭 패스, 명령서 §3·우선순위 #3)

死필드 이관(필수임무) 완료 후, DoD #2 `extra_positive 정밀화`(identity/hand/camera/reference-lock) + §3 강화규칙 `music_mood 구조화` 수행. **방법 = refine→adversarial judge 파이프라인(멀티에이전트 14, ultracode).** 기존 🟢 풍부 프롬프트를 **rewrite 아닌 enhancement**로 보강(7/7 judge 승인).

### 닫은 갭 (전 7개 공통: reference-lock + camera)
- **reference-lock(최대 갭)**: 7개 전부 누락이던 "업로드 레퍼런스 접시와 동일(재료·플레이팅·가니시·색·비율), 다른 음식으로 대체·발명 금지" 추가. food=product_composite → 업로드 사진이 정본인데 이전엔 충실도 지시 無였음. → **7/7 추가.**
- **camera f값**: 카메라 디테일 누락분 보강(#1 50mm→f/8, #3 35mm→f/2, #4 50mm f/2.8 신규, #5 50mm top-down f/8, #6 100mm f/2.8–4, #7 100mm f/2.8). 7/7 명시 f값 확보.

### 템플릿별 특화 보강
| # | 이름 | 추가 |
|---|---|---|
| 1 | Top-Down Hero | reference-lock·f/8(deep DoF) |
| 2 | Drip & Steam Macro | reference-lock(실제 레퍼런스 음식의 매크로, 발명 substitute 금지) — 이미 100mm f/4라 minimal |
| 3 | Golden-Hour Cafe Mood | reference-lock·35mm f/2(bokeh 정합) |
| 4 | Serving & Table | reference-lock·50mm f/2.8. **§99 손 보강문 verbatim 유지**(judge 확인) |
| 5 | Menu / Price Card 🅣 | **per-cell reference-lock + multi-cell identity**(셀별 distinct·중복 클론 금지)·top-down 50mm f/8. positive에서 'text overlay'→'label overlays'로 교체(🅣 text 렌더 위험↓) |
| 6 | Single-Dish Sizzle 🎬 | reference-lock(클립 내 안정·mid-motion 모핑 금지)·100mm f/2.8–4. **music_mood 구조화** |
| 7 | Sizzle & Steam ASMR 🎬 | **§98 cross-frame identity 전면배치**("CRITICAL: same dish identity across all three shots, locked geometry/plating, no morph/drift")·reference-lock·100mm f/2.8. **music_mood 구조화** |

### music_mood 구조화 (감정어 → genre+BPM+instruments+energy+reference)
- #6: `warm ASMR sizzle, low ambient` → `lo-fi culinary ASMR groove, 70-85 BPM, warm sizzle foley and soft kick with mellow Rhodes and muted upright bass, intimate low-energy appetizing ambience, reference Bonobo 'Kerala' texture`
- #7: → `ambient ASMR foley, 60 BPM, layered close-mic sizzle and gentle crackle over warm low pad and soft sub hum, intimate slow-build energy, reference Samsung 'Sizzle' food spots and Bon Appetit kitchen ASMR`

### 검증
- ✅ reference-lock 7/7 · 명시 f값 7/7 · QUALITY_SUFFIX/SAFETY-positive 중복(8k/professional photography/sharp focus/natural lighting/brand-safe/clearly adult) **0**(전역 auto-inject라 미중복 확인) · reel music_mood 2/2 BPM 구조화.
- ✅ 死필드 여전히 0 · extra_negative 7/7 유지 · `consolidate` food OK 7 · 중복이름 0.
- ✅ **카드계약 불변**: git diff 변경키 = `extra_positive(14)·extra_negative(7→0)·music_mood(4)·render_notes(2)`만. `name·credit_cost·output_type·per_shot_motion·duration_per_shot·sort_order` **0 변경**(grep 확인). per_shot_motion(영상 모션 엔드포인트)·shots 미변경.

**남은 품질갭(선택·총지휘 판단):** shots composition은 여전히 3값(closeup/medium_shot)뿐이나 각도/카메라 디테일은 extra_positive로 흡수 완료라 추가 불요. provisional 미검증분 = food엔 없음(beauty/home/pet 소관).
