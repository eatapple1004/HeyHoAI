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

---

## 2026-06-13 · ➕ #8 Ingredient Callout 신설 + 🔧 엔진 `allow_text` 플래그
**요청**: 음식 사진 → 그릇에 담긴 + 손글씨 재료 라벨/화살표. 재료명은 유저가 추가 프롬프트에 나열.

**신규 템플릿**: `Ingredient Callout` (📷 image_set · 4컷 · ◈2 · category Callout · sort 8 · ⚠️ needs_human_review). food 7→8(6~8 norm 유지). 이름 전역 고유 ✓. extra_negative에 text/logo **미포함**(라벨을 그려야 하므로). `meta.user_prompt_hint`로 재료 나열 안내. studio `extraPromptText()`가 유저 재료명을 프롬프트에 append → 라벨로 렌더.

**🔧 엔진 변경(공용 — `src/recipes/recipeResolver.js`)**: `config.allow_text:true`면 주입 SAFETY_NEGATIVE에서 **'text'/'logo'만 제외**(나머지 안전토큰 유지). 전역 SAFETY가 모든 렌더에 'text' 주입 → 평소엔 AI 글자 억제되는데, 이 플래그로 텍스트 렌더 템플릿만 해제. **하위호환**: 플래그 없으면 동작 불변. (구현: `const SAFETY = cfg.allow_text ? SAFETY_NEGATIVE_PROMPT에서 text/logo 제거 : 원본` → line 104·161에서 사용.) → **다른 텍스트-렌더 템플릿도 이 플래그 재사용 가능.**

**검증**:
- ✅ food 8개 로딩 · Ingredient Callout ◈2(4×0.5) · allow_text:true.
- ✅ **allow_text 스코프 정확**: resolve 결과 Callout negative엔 text/logo **없음**, Top-Down Hero negative엔 **그대로 있음**(불변) · Callout에 child 등 안전토큰 **유지**.
- ✅ 파이프라인 drift-guard 173 OK(food:8) · `pm2 restart` 후 서버 HTTP 200 · `getById("ingredient-callout")` OK(런타임 사용성).
- ⚠️ **라벨 화질(철자·화살표 정확도)은 실제 생성으로만 확인** — nano-banana(Gemini)가 짧은 단어는 잘 그리나 AI 글자 한계 → needs_human_review. studio에서 음식 사진 업로드 + 재료명 입력 후 Generate로 최종 확인 권장.

**제약 메모**: recipeResolver.js = 엔진 도메인 공용 파일. 변경은 하위호환이지만 **엔진/총지휘 비준 권장**. 파일만 저장(commit/push 없음).

## 2026-06-13 · 🎯 T3 정밀 주석(비전검출+오버레이) — 코어 빌드+로컬 검증 통과
**요청(사용자 선택)**: 재료 라벨이 "AI가 각 재료를 판단해 정확히 가리키게". 방식 **T3**(비전검출+sharp 오버레이), 진행=내가 빌드+로컬검증.
**신규 서비스**: `src/images/ingredientAnnotate.service.js` — ① Gemini 비전(`gemini-2.5-flash`)이 음식 이미지+재료명 → 각 재료 중심좌표(0~1000) 검출 ② `sharp`가 손글씨풍 흰 라벨(검은 외곽 가독)+곡선 화살표를 그 좌표에 결정론적 합성. **글자=결정론(깨짐 0), 화살표=검출좌표(정확).** `annotate(buffer, [names]) → {buffer, detections}`.
**검증 하니스**: `scripts/annotate_test.js`(사용자 승인 로컬검증 도구). nano-banana로 깨끗한 샌드위치 생성 → annotate.
**결과**: 7/7 재료 검출·라벨링 **통과** — mozzarella→흰치즈, mortadella→핑크햄, sun-dried tomato→빨강, olive→트레이 올리브 등 **각 화살표가 실제 재료를 정확히 지목**(tmp/images/annotated_7of7.png). 가독성 OK(흰 cursive+검은 외곽).
**상태**: 코어 동작 확인. 의존성 = `sharp`(설치됨)·`@google/genai`. 비전 모델 = `GEMINI_VISION_MODEL || gemini-2.5-flash`.
**✅ 스튜디오 배선 완료 (3파일, feat only · commit/push 없음)**:
- ① **템플릿**: 콜아웃을 '깨끗한 음식 생성'으로 전환(AI 글자 off — allow_text 제거, extra_negative에 text/letters/labels 억제) + `config.annotate_ingredients:true`.
- ② **`generate.route.js`**: 루프 전 `recipeStore.getById(slug(templateName)).config.annotate_ingredients` + `req.body.ingredients`로 판정 → 각 생성 이미지에 `ingredientAnnotate.annotate()` 적용(워터마크·저장 전). 비콜아웃 템플릿엔 무영향(플래그 false).
- ③ **`studio.html`**: generateImages가 `ingredients:extraPromptText()` 전달.
- 검증: node --check route/service OK · food 8 · getById("ingredient-callout").annotate_ingredients=true · drift 173 OK · pm2 재시작 후 HTTP 200.
- ⚠️ **끝단(인앱 생성)은 인증벽으로 로컬 완전검증 불가** — 서비스 단(annotate)은 실이미지로 검증됨(annotated_7of7.png). studio에서 로그인→콜아웃 선택→음식 업로드→추가프롬프트에 재료명→Generate로 최종 확인 필요.
- **신규 파일**: `src/images/ingredientAnnotate.service.js`(엔진), `scripts/annotate_test.js`(검증 하니스). **엔진/FE 도메인 변경 = 총지휘 비준 권장.**

### 2026-06-13 (2) · 🐞 라벨 중복 핫픽스 (스튜디오 실테스트 결과)
**증상**(스튜디오 버거): 라벨이 **중복**(빵 빵·치즈 치즈·소고기 패티 ×2·토양상추 깨짐), 위치 어긋남.
**원인**: 유저 재료명이 **이미지 생성 프롬프트에도 append**돼서(resolvePromptFor) Gemini-3-pro가 **라벨을 직접 그림** + 내 오버레이도 그림 → 2중. (T1 잔재: 재료명이 positive에 있으면 강한 모델은 라벨로 렌더.)
**수정(4파일)**: `annotate_ingredients` 플래그를 카드까지 전파(`recipe_card_contract.js`·`export_recipe_cards.js` 카드필드 추가) → `studio.html` `mk()`가 카드에서 읽고, `resolvePromptFor`가 **콜아웃이면 재료명을 프롬프트에 append 안 함**(ingredients로만 전달). → AI는 깨끗한 음식만, 라벨은 오버레이 단일소스.
**검증**: generated.js 카드 `ingredient-callout.annotate_ingredients=true` · drift 173 OK · pm2 재시작 HTTP 200. 끝단(인앱)은 인증벽이라 유저 하드리프레시 후 재테스트 필요.
**남은 튜닝(필요 시)**: 비전 검출 정확도(비슷한 재료·다중 인스턴스) — 재테스트 후 어긋나면 detect 프롬프트 강화. 라벨 디자인(폰트·화살표).

### 2026-06-13 (3) · ⏪ T3 전체 롤백 → T1(allow_text) 복귀 (사용자 결정)
**사유**: T3(비전검출+오버레이)는 인앱 끝단(인증벽) 완전검증이 어렵고, 실스튜디오에서 AI라벨+오버레이 **2중 중복**이 났음. 사용자 판단 "이 영역은 어려움 → 맨 처음 텍스트 추가 버전으로".
**롤백 내용**:
- `recipes.food.v2.js` Ingredient Callout → **T1 복구**(`allow_text:true` + AI가 손글씨 라벨/화살표 직접 렌더, 프롬프트/네거티브 T1 원복). ◈2·food 8 불변.
- **삭제**: `src/images/ingredientAnnotate.service.js`, `scripts/annotate_test.js`.
- **원복**: `generate.route.js`(annotate 후처리 제거) · `recipe_card_contract.js`·`export_recipe_cards.js`(annotate_ingredients 카드필드 제거) · `studio.html`(mk/resolvePromptFor/ingredients 원복).
- **유지**: `recipeResolver.js`의 `allow_text` 플래그 = T1이 쓰는 엔진 기능이라 보존.
- 검증: 코드 잔재 0 · callout allow_text=true · drift 173 OK · pm2 재시작 HTTP 200.
**현 상태 = T1**: 콜아웃은 AI가 라벨을 그림(유저가 추가프롬프트에 재료명 나열). "잘 만들어지나 화살표 정확도/글자 무보장"이 알려진 한계. 정밀 주석(T3)은 엔진 도메인 별도 과제로 보류.
