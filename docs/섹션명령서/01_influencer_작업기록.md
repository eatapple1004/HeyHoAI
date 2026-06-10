# 01 Influencer — 워커 작업기록 (총지휘 수거용)

> 워커 세션이 작업할 때마다 여기에 바로 기록 → 총지휘가 `docs/섹션명령서/`에서 읽음.
> 공유 백본 정본 = `recipes.influencer.v2.js`(시드) + `_STATUS.md`(자동생성). 이 파일은 **시드에 안 들어가는 검증결과·분석·결정요청**을 남기는 곳.
> 규칙: 워커는 파일만 저장(commit/push 금지). 엔진·로스터 결정은 총지휘/Chief/개발자.

---

## 2026-06-10 · 死필드 `look.negative` → `look.extra_negative` 이관+정제 ✅ (명령서 `PROMPT_프롬프트정밀화_명령서.md` 수행)

- **임무:** resolver(L148)가 읽는 live 필드는 `look.extra_negative`. influencer 6개 템플릿 전부 네거티브를 死필드 `look.negative`에 보유 중 → 엔진에 안 닿음. 6/6 전수 이관 + SAFETY 중복 제거 + 섹션 특화 결함만 정제.
- **검증 게이트 통과:**
  - `grep -c '"negative":' recipes.influencer.v2.js` = **0** (死필드 잔여 0)
  - `grep -c '"extra_negative":'` = **6** (전수 이관)
  - `node scripts/consolidate_recipes.js` → influencer **OK 6**, 중복이름 0, 비용/스키마/이름 불변.
- **SAFETY 중복 제거 원칙** — `imagePrompt.builder.js`의 `SAFETY_NEGATIVE_PROMPT`가 전역 자동주입하는 토큰은 extra_negative에서 전부 삭제: `extra fingers / deformed / mutated hands / bad anatomy / extra limbs / watermark / text / logo / blurry / low quality` + minor/nsfw/violence군. → leak 검사 clean.
- **text_overlay 처리:** Product Haul Reel(`text_overlay:true`)의 extra_negative에 `text`/`logo` 토큰 없음(전역 SAFETY가 처리). extra_positive에 "clean uncluttered area reserved for a composited brand badge or caption" 자리확보 문구 추가.
- **불변 확인:** name·credit_cost·output_type·shots·guards·reel 미변경. extra_positive는 Product Haul 1건만 자리확보 문구 추가, 나머지 5개 unchanged(이미 🟢 풍부).

### 템플릿별 [바꾼 필드 / 근거]
| # | 이름 | 타입 | 이관 후 extra_negative 핵심(섹션 특화 결함) |
|---|---|---|---|
| 1 | Candid Photo Dump | 📷 image_set | warped/asymmetric face, plastic over-retouched skin, **studio-polished glamour finish**(캔디드 무드 역행 방지), airbrushed symmetry, stiff posed, oversaturation, identity drift |
| 2 | Fit Check On-Model | 📷 image_set | distorted body proportions, **melted/smeared garment texture·warped seams·color shift/mismatched print·stiff unnatural drape**(온모델 핵심), wardrobe inconsistency between shots, plastic skin, identity drift |
| 3 | Golden Hour Anywhere | 📷 image_set | harsh midday top-down shadows, blue cold cast, **overexposed clipped sky, double sun/duplicated flare**(골든아워 결함), muddy underexposed shadows, plastic skin, identity drift |
| 4 | GRWM Aurora Reel | 🎬 reel | asymmetric/mismatched eyes, plastic over-smoothed CGI skin, harsh flash, blown highlights, duplicate facial features, **mouth/tooth morph between frames**(릴 정합), patchy cakey makeup, identity drift |
| 5 | Day-in-Life Reel | 🎬 reel | plastic retouched skin, overly polished studio look, **flickering/inconsistent lighting within a single shot, mouth/tooth morph between frames**, identity drift |
| 6 | Product Haul Reel 🅣 | 🎬 reel | **missing/six fingers·fused or webbed digits·melted/fused fingers·floating disembodied hand·malformed grip**(손 리스크 — experimental 플래그), warped product shape, distorted label, harsh shadows, cluttered background, identity drift |

### 검수 플래그(영상군)
- **Product Haul Reel** = 기존 `meta.flags:[experimental, needs_human_review]` 유지. 손 해부 리스크 강화: extra_positive에 5손가락 정상그립 명시(기존) + extra_negative에 SAFETY 미커버 손 결함(six/fused/webbed/floating/missing) 보존(blind strip 금지 대상).
- GRWM·Day-in-Life = 멀티프레임 identity/mouth morph 정합 항목 포함.

### 미결/총지휘 결정요청
- 없음. 6/6 이관 완료, 게이트 전수 통과. 비용·카드계약 불변이라 카드 재export 불필요.
- (참고) §5.8 구조화 export(CSV/Excel)는 총지휘가 `scripts/export_recipe_prompts.js` 일괄 export로 통합 예정 — 워커단 개별 생성 보류.

---

## 2026-06-10 · extra_positive 정밀화 + music_mood 구조화 + overlay_spec ✅ (멀티에이전트 author→verify)

- **방식:** 템플릿별 author 에이전트 6 → 적대적 verifier 6 (SAFETY 중복·카드계약·메서드론 커버리지 반증). 5/6 clean 통과. Fit Check 1건은 verifier가 over-strip(렌즈/라이팅까지 삭제) → 메서드론 정본 예시(`large octabox key... 85mm f4, true fabric drape`)가 on-model 기법층을 권장하므로 **총지휘(나) 판단으로 기법층 보존 + 샷 scene/pose 중복만 제거한 균형본** 적용.
- **바꾼 필드(불변 외):** `extra_positive`(6/6), `extra_negative`(6/6 — 손 결함 보강), `reel.music_mood`(3/3 구조화), Product Haul `meta.overlay_spec`+`render_notes`. name·credit·output·shots·guards·per_shot_motion **불변**.

### 적용 내역
- **identity lock**: 멀티프레임 6개 전부 extra_positive 첫머리에 `CRITICAL: same person across all frames, locked facial identity, no morph or drift` 프리펜드. GRWM은 bare→glam face-geometry 연속 cue, Product Haul은 제품 secondary reference 연속성 cue 추가.
- **hand anatomy**: 손 노출 샷(Candid 셀피·On-Model 커프·Golden 음료·GRWM 핑거팁·Day 컵·Haul 제품) extra_positive에 `single well-formed hand, five natural fingers, correct grip, visible fingernails` + extra_negative에 `six fingers, fused/webbed digits, malformed grip`(SAFETY 미커버 → 허용).
- **camera 디테일**: composition이 3값(closeup/medium/full)만 매핑 → 렌즈·F·DoF를 extra_positive로 (28-35mm f4-5.6 / 85mm f4 / 50mm f2 / 50mm f1.8 macro pass / 35mm f2 / 85mm f2 push-in).
- **music_mood 구조화(3 reel)**: 감정어 → `genre + bpm + instruments + energy + reference`. GRWM=dreamy synth-pop 110-122bpm, Day-in-Life=lo-fi indie 70-85bpm, Product Haul=lifestyle pop 110-122bpm.
- **text_overlay(Product Haul)**: `meta.overlay_spec{layer,position,elements[brand_badge/caption/cta_chip]}` 신설(post-process glyph layer, safe-zone·per-shot text 매핑). extra_negative에 text/logo 토큰 없음 확인. render_notes에 "SAFETY가 text/logo 처리·AI 미작성·제품 일관성 검수" 명시.

### 게이트 (전수 통과)
- `node -e require()` 파싱 OK · 6 템플릿 · extra_positive 6 / extra_negative 6 / music_mood 3 / overlay_spec 1
- `grep -c '"negative":'` = **0** (死필드 잔여 0 유지)
- extra_negative SAFETY 중복 leak = **clean** · text/logo 토큰 = **clean**
- `node scripts/consolidate_recipes.js` → influencer **OK 6**, 중복이름 0, 비용/스키마 불변.

### 검수 플래그
- Product Haul Reel = `experimental, needs_human_review` 유지. overlay_spec의 per_shot_text/safe-zone은 placeholder(브랜드별 실값은 런타임 주입). 손 해부 + 제품 일관성 매 출력 검수(render_notes 명시).
- 영상 3종(GRWM/Day/Haul) = music_mood 구조화값이 음악 엔드포인트 입력으로 적합한지 총지휘 샘플 검토 권장.

### 미결/결정요청
- 없음. influencer DoD: 死필드이관·extra_positive정밀화·music_mood구조화·overlay_spec 완료. provisional 18개는 타섹션(beauty/home/pet)이라 N/A.
