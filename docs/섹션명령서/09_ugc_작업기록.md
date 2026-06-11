# 09 UGC — 워커 작업기록 (총지휘 수거용)

> 워커 세션이 작업할 때마다 여기에 바로 기록 → 총지휘가 `docs/섹션명령서/`에서 읽음.
> 공유 백본 정본 = `recipes.ugc.v2.js`(시드) + `_STATUS.md`(자동생성). 이 파일은 **시드에 안 들어가는 검증결과·분석·결정요청**을 남기는 곳.
> 규칙: 워커는 파일만 저장(commit/push 금지). 엔진·로스터 결정은 총지휘/Chief/개발자.

---

## 2026-06-10 · 死필드 `look.negative` → `look.extra_negative` 이관+정제 ✅ (명령서 `PROMPT_프롬프트정밀화_명령서.md` 수행)

- **임무:** resolver(L148 `negative = preset.negative + look.extra_negative + SAFETY_NEGATIVE_PROMPT`)가 읽는 live 필드는 `look.extra_negative`. ugc 7개 템플릿 전부 네거티브를 死필드 `look.negative`에 보유 중 → 엔진에 안 닿음. **7/7 전수 이관** + SAFETY 중복 제거 + UGC 특화 결함만 정제 + extra_positive identity/hand 보강.
- **검증 게이트 통과:**
  - `grep -c '"negative":' recipes.ugc.v2.js` = **0** (死필드 잔여 0 — DoD 충족)
  - `node -e require()` → templates 7, every look has extra_negative=**true**, any look.negative!==undefined=**false**
  - SAFETY-토큰 leak 스캔(extra_negative/positive 한정) = **clean**(매치는 헤더주석·rationale·render_notes 등 문서설명뿐, 엔진소비 필드엔 0)
  - `node scripts/consolidate_recipes.js` → ugc **OK 7**, 중복이름 0, 비용/스키마/이름 불변.
- **SAFETY 중복 제거 원칙** — `imagePrompt.builder.js`의 `SAFETY_NEGATIVE_PROMPT`가 전역 자동주입하는 토큰은 extra_negative에서 전부 삭제: `extra fingers / mutated hands / bad anatomy / extra limbs / deformed / blurry / low quality / watermark / text / logo` + minor/nsfw/violence군. `warped hands`·`mangled hands`·`melted hands`(SAFETY "mutated hands" 중복)는 SAFETY 미커버 손 결함 `six fingers / fused or webbed digits / malformed grip / floating disembodied hand`로 치환.
- **"no X" 접두 정정:** 기존 死필드 네거티브가 `no lip-sync desync, no tooth morph …` 처럼 `no ` 접두를 달고 있었음(네거티브 프롬프트에서 이중부정 → 의미 역전 위험). 이관 시 전부 평문 avoid-토큰(`lip-sync desync, mouth or tooth morph …`)으로 정정 — influencer/general 등 기이관 섹션 컨벤션과 정합.
- **text_overlay 처리:** Static UGC Photo Ad(`text_overlay:true`)의 extra_negative에 `text`/`logo` 토큰 **없음**(전역 SAFETY가 처리). extra_positive에 "clean uncluttered margins reserved for a composited headline and CTA caption" 자리확보 문구 추가. **`meta.overlay_spec` 신규 추가**(layer/elements/position + SAFETY 처리 명시) — DoD "text_overlay = overlay_spec 존재" 충족.
- **extra_positive 보강(identity/hand):** 멀티샷·멀티프레임 전 템플릿에 `consistent/locked facial identity (across N shots / throughout the clip)` 추가. 손 노출 템플릿(Static·POV·Hook+CTA·Unboxing·Demo·Testimonial)에 `single well-formed hand, exactly five natural fingers, anatomically correct grip` 추가(명령서 §3 손 규칙). 기존 extra_positive 본문은 보존(이미 🟢 풍부) — 끝에 절만 append.
- **불변 확인:** name·credit_cost·output_type·output.count·subject·shots·guards·reel·music_mood·meta.flags 미변경. (스키마/비용/카드계약 불변 → 카드 재export 불필요.)

### 템플릿별 [바꾼 필드 / 근거]
| # | 이름 | 타입 | ◈ | 이관 후 extra_negative 핵심(SAFETY 미커버 = UGC 특화 결함) |
|---|---|---|---|---|
| 1 | Static UGC Photo Ad 🅣 | 📷 image_set | 2 | studio overlit infomercial look, fake forced smile, floating disconnected product, distorted/warped product shape, **six fingers·fused/webbed digits·malformed grip**, duplicated person, plastic waxy skin, dead lifeless eyes, garish cluttered bg, overposed stiff model, **identity drift between the four shots** |
| 2 | TikTok Discovery POV | 🎬 reel | 2 | **talking mouth/lip movement suggesting speech·open-mouth talking pose**(무음 리액션 포맷 핵심), frozen blank expression, six/fused/webbed fingers, warped product, sterile studio setup, plastic waxy skin, posed stiffness, identity drift across the clip |
| 3 | Hook + CTA Ad | 🎬 reel | 4 | **lip-sync desync·mouth/tooth morph·warped mouth shape·identity drift**(립싱크 정합), low-energy flat delivery, frozen stiff mouth, six/fused/webbed fingers, warped product, plastic waxy skin, dim muddy lighting |
| 4 | Unboxing Reaction | 🎬 reel | 4 | lip-sync desync·tooth morph·identity drift, **warped/crushed packaging·smeared or warped packaging print**(언박싱 특화, 'text on box'→'packaging print'로 'text' 토큰 제거), six/fused/webbed·malformed grip·floating disembodied hand, fake exaggerated surprise, plastic skin |
| 5 | Problem → Solution | 🎬 reel | 6 | lip-sync desync·tooth morph·identity drift, **overacted theatrical fake emotion**(감정아크 오버액팅 방지), frozen stiff mouth, six/fused/webbed fingers, warped face, plastic skin, **soap-opera melodramatic lighting·inconsistent lighting within a single shot** |
| 6 | Talking-Head Testimonial | 🎬 reel | 6 | lip-sync desync·tooth morph·identity drift, stiff frozen mouth, **robotic unnatural delivery**, six/fused/webbed fingers, warped face, plastic waxy skin, dead lifeless eyes, studio overlit infomercial look, duplicated person |
| 7 | Product Demo | 🎬 reel | 8 | lip-sync desync·tooth morph·identity drift, warped product, **distorted/warped product label**('label text'→'label'로 'text' 제거), six/fused/webbed·melted-or-fused fingers·floating disembodied hand, floating disconnected product, plastic skin, **garbled glitchy on-screen graphics**('glitched UI text'→graphics) |

### 검수 플래그(영상군)
- **기존 `meta.flags:[experimental, needs_human_review]` 유지**(이관으로 손대지 않음): Hook+CTA·Unboxing·Problem→Solution·Talking-Head·Product Demo 5종(립싱크 의존). POV·Static은 무플래그(립싱크 리스크 없음) 유지.
- **립싱크 정합 토큰** = lip-sync desync / mouth or tooth morph / warped mouth shape / frozen stiff mouth + extra_positive `clean lip-sync`(Hook·Testimonial·Demo 등 기존) — SAFETY 미커버라 보존(blind strip 금지 대상).
- **손 해부 리스크** = six fingers / fused or webbed digits / malformed grip / floating disembodied hand / melted-or-fused fingers(Demo) — SAFETY 미커버 보존 + extra_positive 5손가락 정상그립 명시.
- **POV 무음 포맷 가드** = talking mouth / lip movement suggesting speech / open-mouth talking pose 보존(이 템플릿은 음성 없이 리액션+효과음만 — 말하는 입 생성 방지가 핵심).

### 검증(adversarial audit)
- 7개 템플릿 각각 독립 어드버서리얼 감사(SAFETY leak / 누락 결함 / text_overlay leak / section 부적합 / identity·hand 충분성) 실행 → **7/7 전부 `pass`**.
  - `safety_leak_tokens` = 전 템플릿 **[]**(extra_negative/positive에 전역주입 토큰 중복 0).
  - `dropped_meaningful_defects` = 전 템플릿 **[]**(의미있는 결함 누락 0). BEFORE에서 빠진 `glitched caption text`·`garbled captions`·`glitched text on box`·`glitched UI text`·`distorted label text`는 전부 SAFETY `text` 토큰이 커버 → 실손실 아님(감사 확인).
  - `text_overlay_leak` = false(Static 포함 전부). `identity_hand_adequate` = true(전부).
- **감사 nit 1건(Product Demo):** `melted or fused fingers`가 `fused or webbed digits`와 일부 중복 → 감사관은 cleanliness 차원 제거 권고. **유지 결정** — influencer 자매섹션 손중점 릴(Product Haul Reel) 시드가 동일 문구(`fused or webbed digits, melted or fused fingers`)를 채택 중이라, 4컷 hands-on 데모(손 최다 노출)에서 동일 컨벤션 유지가 통합 카탈로그 정합에 유리. SAFETY 미커버('melted' 없음)라 leak도 아님.

### 미결/총지휘 결정요청
- 없음. 7/7 이관 완료, 게이트 전수 통과. 비용·카드계약 불변이라 카드 재export 불필요.
- `music_mood` 구조화 → **2차 패스에서 완료**(아래 §2 참조).
- (참고) §5.8 구조화 export(CSV/Excel)는 총지휘가 `scripts/export_recipe_prompts.js` 일괄 export로 통합 예정 — 워커단 개별 생성 보류(influencer 워크로그와 동일 처리).

---

## 2026-06-10 (2차) · `extra_positive` 정밀화 + `music_mood` 구조화 ✅ (명령서 §3 품질갭)

- **임무:** 이관(1차) 위에 명령서 §3 구조 `[기법 렌즈·F·focus] + [라이팅 key/fill/rim] + [주제 디테일] + [reference-lock] + [무드] + [identity/hand]`로 7개 extra_positive 정밀화 + 6개 reel `music_mood` 구조화.
- **방법(워크플로):** 템플릿별 draft→adversarial verify 파이프라인(7×2 에이전트). 검증관이 studio-contradiction / §3 누락 / shot-scene 모순 / product·identity lock 누락 / bloat를 적발·수정 → 7/7 `fixed`(예: Problem→Solution 초안 'two-act'→'three-shot' 구조 오류 적발, Demo identity-lock을 talking-shot로 한정).
- **UGC 정체성 가드(최우선):** 카메라 기법 = **폰카 idiom**(`phone main camera ~26mm equiv f1.8` / Testimonial `~24mm front-camera selfie at arm's length`, `natural HDR`, `autofocus snap`, `slight handheld sway`). **스튜디오/DSLR 금지**(85mm·octabox·seamless studio 등 0건 — grep 검증). 라이팅은 practical/자연광(window key + bounce fill)만.
- **신규 reference-lock(제품):** 7/7 전부 `product identical to the reference — exact shape, label, colorway and proportions, no relabeling or warping` 추가(제품광고 핵심, 기존 약했던 부분). 기존 creator identity-lock·5손가락 hand cue는 보존.
- **resolver 아키텍처 반영(통합자 판정):** `look.extra_positive`는 resolver(L134)가 **모든 shot에 공통 합성**(shot.scene은 이미 per-shot 주입됨). 따라서 **Static**은 원본이 global이었으므로 검증관의 S1–S4 per-shot 라이팅 열거를 **채택하지 않고 global 유지**(shot마다 타 shot 라이팅 주입 방지). 나머지 6개는 원본부터 per-shot 서사를 extra_positive에 담는 설계라 그대로 유지.
- **music_mood 구조화:** snake_case enum어 → 카탈로그 컨벤션(짧은 서술구, influencer/food 스타일)으로. resolver L169 free-text passthrough라 안전(enum/asset map 키 아님 — grep 확인).
  | 템플릿 | before | after |
  |---|---|---|
  | POV | `playful_viral_trending` | `playful viral trending pop` |
  | Hook + CTA | `high_energy_trap_pop` | `high-energy punchy trap-pop` |
  | Unboxing | `playful_excited_pop` | `playful excited pop` |
  | Problem→Solution | `tense_then_uplifting` | `tense build, uplifting release` |
  | Testimonial | `warm_lofi_confident` | `warm confident lo-fi` |
  | Demo | `upbeat_clean_energetic` | `upbeat clean energetic pop` |
- **검증 게이트:** require 로드 OK / 死필드 0 유지 / extra_positive·extra_negative 7/7 / **§3 요소 전수(cam·prodlock·identity·hand = Y, studio-leak 0)** / snake_case music_mood 0 / `consolidate_recipes.js` ugc **OK 7**·중복 0·비용·이름·스키마 불변.
- **불변 확인:** name·credit_cost·output_type·output.count·subject·shots(scene/pose/composition)·reel(transition/duration/captions)·meta.flags 미변경. extra_positive 본문 대체 + product-lock 추가, music_mood 표현만 변경.
