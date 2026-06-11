# 11 Headshot — 워커 작업기록 (총지휘 수거용)

> 워커 세션이 작업할 때마다 여기에 바로 기록 → 총지휘가 `docs/섹션명령서/`에서 읽음.
> 공유 백본 정본 = `recipes.headshot.v2.js`(시드) + `_STATUS.md`(자동생성). 이 파일은 **시드에 안 들어가는 검증결과·분석·결정요청**을 남기는 곳.
> 규칙: 워커는 파일만 저장(commit/push 금지). 엔진·로스터 결정은 총지휘/Chief/개발자.

---

## 2026-06-10 · 死필드 `look.negative` → `look.extra_negative` 이관+정제 ✅ (명령서 `PROMPT_프롬프트정밀화_명령서.md` 수행)

- **임무:** resolver(L148 `negative = preset.negative + look.extra_negative + SAFETY_NEGATIVE_PROMPT`)가 읽는 live 필드는 `look.extra_negative`. headshot 7개 템플릿 전부 네거티브를 死필드 `look.negative`에 보유 중 → 엔진에 안 닿음(live `/api/recipes`가 커스텀 네거티브 없이 생성). 7/7 전수 이관 + SAFETY 중복 제거 + 섹션 특화 결함만 정제.
- **검증 게이트 통과:**
  - `grep -c '"negative":' recipes.headshot.v2.js` = **0** (死필드 잔여 0)
  - `grep -c '"extra_negative":'` = **7** (전수 이관)
  - leak 스캔(extra_negative에 SAFETY 토큰 잔존 검사) = **clean**
  - `node scripts/consolidate_recipes.js` → headshot **OK 7**, 중복이름 0, 비용/스키마/이름 불변. (beauty 16·pet 12 개수이슈는 기존·타섹션, 본 변경과 무관.)
- **SAFETY 중복 제거 원칙** — `imagePrompt.builder.js`의 `SAFETY_NEGATIVE_PROMPT`가 전역 자동주입하는 토큰은 extra_negative에서 전부 삭제. headshot 死필드에서 실제 제거한 SAFETY 중복: **`extra fingers`(전 템플릿) / `deformed hands`(deformed·mutated hands·bad anatomy가 커버) / `text artifacts`(=SAFETY `text`) / `watermark`** 7개 전 템플릿 공통.
- **유지(SAFETY 미커버 = 섹션 특화 결함):** `warped face`, `asymmetric eyes`, **`plastic over-retouched skin`**(헤드샷 1순위 실패모드 — SAFETY 미포함이라 보존; influencer.v2 이관본도 동일 유지), `identity drift between shots`(여러 컷 동일인물), `glasses glare distortion`(안경 반사), 라이팅/구도 결함(harsh shadows·blown highlights·busy background·flat/cold flash·golden hour glamour·film grain·casual streetwear=인플루언서 톤 역행 방지).
- **text_overlay:** headshot 7개 중 `text_overlay:true` 없음(브리프 §5에서 Podcast/Thumbnail 컷은 cut·보류). → text/logo 제외 규칙 해당사항 없음(전역 SAFETY가 처리).
- **불변 확인:** name·credit_cost·output_type·shots·reel·meta 미변경. extra_positive 미변경(이미 🟢 풍부, 명령서 현황 93/93). 본 작업 = 네거티브 이관+정제 only.

### 템플릿별 [바꾼 필드 / 근거]
| # | 이름 | 타입 | 이관 후 extra_negative 핵심(섹션 특화 결함) |
|---|---|---|---|
| 1 | LinkedIn Classic | 📷 image_set | warped face, asymmetric eyes, plastic over-retouched skin, **identity drift / glasses glare distortion**, harsh shadows, blown highlights, busy or colorful background, **casual streetwear·film grain·golden hour glamour**(헤드샷↔인플루언서 톤 분리) |
| 2 | Executive Authority | 📷 image_set | warped face, asymmetric eyes, plastic over-retouched skin, identity drift, glasses glare, flat frontal flash, blown highlights, **muddy crushed shadows losing facial detail**(드라마틱 측광 의도와 충돌 없게 "harsh shadows"→크러시 디테일손실로 정제), busy or bright cheerful background, casual streetwear or casual clothing(내부 중복 병합), golden hour glamour |
| 3 | Background & Wardrobe Swap | 📷 image_set | warped face, asymmetric eyes, plastic over-retouched skin, identity drift, **face inconsistency across the different backgrounds**(동일얼굴/다배경 JTBD 강화 추가), glasses glare, harsh shadows, busy background, lens distortion, trendy filters, casual streetwear, film grain, golden hour glamour lighting, blown highlights |
| 4 | Team Page Consistent | 📷 image_set | warped face, asymmetric eyes, plastic over-retouched skin, identity drift, **inconsistent lighting or backdrop tone·varying crop or eye-line·non-uniform framing**(팀 일관성 핵심 결함), dramatic or harsh shadows, busy background, glasses glare, casual streetwear, film grain, golden hour |
| 5 | Approachable Brand | 📷 image_set | warped face, asymmetric eyes, plastic over-retouched skin, identity drift, glasses glare, harsh shadows, busy background, **cold corporate flash**(따뜻 톤 역행 방지), blown highlights, casual streetwear, film grain |
| 6 | Speaking Profile Reel | 🎬 reel | warped face, asymmetric eyes, plastic over-retouched skin, identity drift, **lip-sync mouth desync·mouth or tooth morph between frames·large head rotation·jittery unstable motion·frame-to-frame flicker**(릴 정합 — 명령서 인물릴 키퍼로 보강), glasses glare, lens distortion, harsh shadows, blown highlights, busy background, casual streetwear, film grain, golden hour, trendy filter |
| 7 | About-Page Intro Reel | 🎬 reel | warped face, asymmetric eyes, plastic over-retouched skin, identity drift, **lip-sync mouth distortion·mouth or tooth morph between frames·large or fast head rotation·full head turn·jittery unstable motion·flickering lens reflection across the turn**(±15° 약회전 정합), glasses glare, harsh shadows, busy background, casual streetwear, film grain, golden hour |

### 검수 플래그(영상군)
- **Speaking Profile Reel·About-Page Intro Reel** = 기존 `meta.flags:[needs_human_review]` 유지. 릴 morph 리스크 강화: extra_negative에 SAFETY 미커버 릴 결함(lip-sync desync·mouth/tooth morph·large/fast rotation·full head turn·jitter·flicker) 보존·보강. 모션 자체는 `reel.per_shot_motion`(미세 모션)·`render_notes`로 별도 제어(프롬프트 아님) — 미변경.
- #6은 기존 死필드의 빈약한 릴 토큰(lip-sync·large head rotation 2개)을 #7 수준의 정합 세트로 보강.

### 미결/총지휘 결정요청
- 없음. 7/7 이관 완료, 게이트 전수 통과. 비용·카드계약 불변이라 카드 재export 불필요.
- (참고) `plastic over-retouched skin`은 명령서 §1 예시에 SAFETY 중복으로 언급되나 실측 `SAFETY_NEGATIVE_PROMPT`에 미포함 → 엔진 진실 기준 보존(influencer.v2 이관본과 일관). 헤드샷 1순위 실패모드라 삭제 시 품질 저하.
- (참고) §5.8 구조화 export(CSV/Excel)는 총지휘가 `scripts/export_recipe_prompts.js` 일괄 export로 통합 예정 — 워커단 개별 생성 보류.

---

## 2026-06-10 · `extra_positive` 정밀화 + 릴 `music_mood` 구조화 ✅ (명령서 §3 강화규칙)

- **임무:** 死필드 이관(위) 완료 후, 명령서 §3·§4 #3 품질갭 — resolver L142가 읽는 `look.extra_positive`를 정밀화. headshot 7개 = 전부 multi-shot/reel face(identity_lock)이므로 **identity 보강(첫머리 front-load)** + 릴 2개 **music_mood 구조화** + 카메라/라이팅 디테일 보강이 갭.
- **방법(멀티에이전트 워크플로):** template당 `refine → adversarial verify` 파이프라인(14 에이전트). verify가 (A)SAFETY/QUALITY 자동주입 중복 (B)positive↔negative 충돌 (C)intent 이탈·기존 기술디테일 손실 (D)identity 중복 (E)포맷을 적대적 검증 → **7/7 approved, issues 0**. 검증된 final값만 시드에 반영.
- **검증 게이트 통과:**
  - 7/7 extra_positive가 `CRITICAL: …same individual…no morph/drift`로 **첫머리 front-load** (꼬리의 약한 `identity preserved…` 중복 제거).
  - SAFETY/QUALITY 자동주입(`clearly adult/age 25/fully clothed/SFW/8k/uhd/Instagram aesthetic/professional photography/sharp focus`) 중복 스캔 = **clean**. ("sharp catchlight eyes in focus" = 주제특화, QUALITY boilerplate 아님 → 유지.)
  - 릴 2개 music_mood = 감정어 1줄 → **genre+BPM(70-85)+instruments(felt piano/synth pads/low strings)+energy+reference** 구조화. bare 잔존 0.
  - `node scripts/consolidate_recipes.js` → headshot **OK 7**, 중복이름 0, 비용/이름/스키마 불변. 死 `look.negative` 0 유지(이관 게이트 회귀 없음).
- **불변 확인:** name·credit_cost·output_type·shots·reel.per_shot_motion·guards·meta 미변경. extra_negative(위 이관본) 미변경. 카드계약·비용 불변 → 카드 재export 불필요.

### 템플릿별 [정밀화 요지]
| # | 이름 | extra_positive 보강 핵심 |
|---|---|---|
| 1 | LinkedIn Classic | CRITICAL identity front-load + "evenly-lit/eye-level/crisp catchlight" 디테일, 꼬리 identity 중복 제거 |
| 2 | Executive Authority | CRITICAL front-load + 측광 카메라 방향(key camera-left/rim camera-right) + **"balanced shadow falloff that retains full facial detail in the shadow side"**(드라마틱↔디테일 양립, negative "muddy crushed shadows"와 정합) + low-angle stature |
| 3 | Background & Wardrobe Swap | CRITICAL front-load + "different background ↔ different outfit while face stays identical"(동일얼굴/다배경 JTBD 강화) + near-eye-level 각도 |
| 4 | Team Page Consistent | CRITICAL front-load + "evenly lit corner to corner / shot at eye level / no harsh shadows"(팀 일관 규격 강화) *(외부 세션/린터가 동일 final값으로 선반영 — end-state 정합 확인)* |
| 5 | Approachable Brand | CRITICAL front-load + "gently wrapping / creamy bokeh / natural eye-level"(따뜻 라이프스타일 톤 유지) |
| 6 | Speaking Profile Reel | CRITICAL(every frame) front-load + "straight-on at eye level" + 미세모션·head-steady 안정 문구, music_mood 구조화 |
| 7 | About-Page Intro Reel | CRITICAL(both shots) front-load + "tightening from closeup to calm medium" 2비트 프레이밍, music_mood 구조화 |

### DoD 갱신
- [x] 死 negative → extra_negative 7/7 이관(이전 패스) · [x] **extra_positive 정밀화(identity front-load·카메라/라이팅 디테일·music_mood 구조화)** · [x] consolidate OK·중복0·비용불변.
- headshot은 provisional/text_overlay 해당 없음(브리프 §5에서 cut). 카탈로그(난이도·overlay) 의미변동 없음 → `docs/템플릿_한국어_카탈로그.md` 갱신 불필요(프롬프트 내부 정밀화는 카드계약 불변).
