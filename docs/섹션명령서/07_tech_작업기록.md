# 07 테크 — 워커 작업기록 (총지휘 수거용)

> 워커 세션이 작업할 때마다 여기에 바로 기록 → 총지휘가 `docs/섹션명령서/`에서 읽음.
> 공유 백본 정본 = `recipes.tech.v2.js`(시드) + `_STATUS.md`(자동생성). 이 파일은 **시드에 안 들어가는 검증결과·분석·결정요청·보고**를 남기는 곳.
> 규칙: 워커는 파일만 저장(commit/push 금지). 로스터 스코프 변경은 총지휘/Chief 결정.

---

## 2026-06-13 · v2 7개 검증·확정 ✅ (브리프 `07_tech.md` 수행)
- **시드:** `src/recipes/seeds/recipes.tech.v2.js` — 7개. `node` 로딩 OK, `consolidate_recipes.js` 수거 OK(이슈 0, **중복 이름 0**).
- **비용공식 전수 통과(7/7):** `📷 I2 I2 I2 I2 · 🎬 R4 R6 R6` = 합 ◈24. (image=count×0.5, reel=shots×2, 임의가산 0)
- **이름 전역 고유화:** `Unbox ASMR Reel` → **`Tech Unbox ASMR`** (jewelry.v2와 충돌 → vertical 접두). consolidate 중복0 확인. → 총지휘 §3/§5가 지적한 tech측 충돌 **해소 완료**. (jewelry는 여전히 `Unbox ASMR Reel` 보유 — 현재 충돌 없음, 일관성 원하면 jewelry측도 접두 권고: jewelry 워커 소관)
- **안전 플래그 생존 확인:** Spec Callout Grid `text_overlay:true`+`meta.render_notes`+네거티브에서 text/logo 제외 / In-hand Quick Demo `meta.flags:['experimental']`+손가락 negative 강화. (※ 네거티브 필드는 이후 프롬프트 워커가 `look.negative`→`look.extra_negative`로 이관 — 아래 '프롬프트 정밀화 패스' 참조. text/logo 제외 규약은 이관 후에도 유지됨.)
- **Quick Hero Snap(🎬1 ◈2 add 후보) 보류:** In-hand(◈4)이 이미 싼 릴스 충족 → 강제 결손 아님(브리프 §5 권장 '7 keep' 채택).
- **동기화:** `docs/템플릿_v2_발굴선별강화_결과.md` 테크 섹션(리네임·보류 반영).
- 결론: **현재 7개 브리프대로 KEEP·확정.**

| # | 이름 | 타입 | 컷 | ◈ | 카테고리 |
|---|---|---|---|---|---|
| 1 | Void Hero Cut | 📷 | 4 | 2 | Hero |
| 2 | Spec Callout Grid 🅣 | 📷 | 4 | 2 | Feature |
| 3 | Macro Tactile Zoom | 📷 | 4 | 2 | Macro |
| 4 | Desk Setup Flatlay | 📷 | 4 | 2 | Lifestyle |
| 5 | In-hand Quick Demo ⚠️ | 🎬 | 2 | 4 | Reel |
| 6 | Tech Unbox ASMR | 🎬 | 3 | 6 | Reel |
| 7 | 360 Glow Spin | 🎬 | 3 | 6 | Reel |

---

## 2026-06-13 · 전수 커버리지 감사 (현 7개 → 전 고객 만족?) = **아니오** ⚠️ 결정요청
> 사용자 요청(멀티에이전트 ultracode). 제품 taxonomy 9클러스터 ≈180종 → 10렌즈 커버리지 감사 → 적대적 검증.

- **결론:** 현 7개로 **전 클러스터 충족 불가**(평균 만족도 ~4/10, 크로스컷 2.5/10). 7개가 '단일 유닛·전원OFF·클린 스튜디오·정적' 가정에 갇힘. Void·Spec·Macro 3대 정적 정당화 + 언박싱/360 모션만 안정 커버.
- **8대 blocker 갭(다클러스터 공통):** ①컬러웨이 라인업 ②앱/화면UI 연동 ③기능 ON 모션(점등·스핀·전개) ④실크기 스케일 ⑤온모델 착용 ⑥멀티팩 knolling ⑦방수/아웃도어 러기드 ⑧설치/장착 컨텍스트.

**개선 제안(PROPOSAL — 미반영, 승인 후 시드 반영):**

| 우선 | 액션 | 템플릿 | 타입/◈ | 닫는 갭 |
|---|---|---|---|---|
| P0 | add | **Colorway Lineup Grid** | 📷4 ◈2 | 컬러/스위치 변형(10/10 클러스터 1순위) |
| P0 | add | **Function-On Action Reel** ⚠️🅣 | 🎬2 ◈4 | 점등·스핀·전개 모션(싼릴 R4) |
| P0 | add | **On-Model Wear Fit** ⚠️ | 📷4 ◈3 | 온모델 착용('온모델+1' 룰 실행 0개 모순 해소) |
| P1 | add | **Scale Reference Proof** ⚠️ | 📷4 ◈2 | 초소형 실크기 증명 |
| P1 | add | **App Screen Pairing** 🅣 | 📷4 ◈2 | 앱/화면 UI(웨어러블·IoT·AI가젯) |
| P1 | add | **Knolling Kit Layout** 🅣 | 📷4 ◈2 | 멀티팩/구성품 구성도 |
| P2 | add(미설계) | Rugged/Waterproof Proof | 📷4 ◈2 | 방수/아웃도어(갭⑦, 잔여) |
| P2 | add(미설계) | Install & Mount Context | 📷4 ◈2 | 설치/장착·온디바이스(갭⑧, 잔여) |
| — | reframe | In-hand Quick Demo(heavy=0) | 🎬2 ◈4 | '부분손 제스처 촉각감'으로 좁힘 |
| — | reframe | Desk Setup Flatlay | 📷4 ◈2 | '감성 실내 데스크' 단일목적 한정 |

- **하드 삭제 후보 0** — In-hand·Desk 통째 삭제 시 light 수요 고아. Void/Spec/Macro keep, Unbox/360 keep(◈6 릴 2종 다 light → Function-On 도입 후 사용률 재평가).
- **기각:** *In-Context Environment Pack*(kill — 방수+아웃도어+설치+폰결합 4개 혼재, 위험요소 분리 위반) → 갭⑦⑧을 Rugged/Install 2개로 분리 재제안(미설계).
- **⚠️ 총지휘/Chief 결정요청(정책 충돌):** 채택 시 tech 개수 **7 → 13(또는 +잔여2 = 15)** → "섹션당 6~8개" 정책 초과. 택1: ⓐtech 한정 예외 승인 / ⓑP0 3개(Colorway·Function-On·On-Model)만 우선 채택 / ⓒ전면 채택. 가격 사다리도 `I2×8~10·I3×1·R4×2·R6×2`로 재산정.
- **근거 원본:** 본 세션 워크플로 2건(제품 taxonomy 전수열거 / 10렌즈 커버리지감사+적대검증). **시드 미변경** — 의사결정 대기.

---

## 2026-06-13 · 보고 → 총지휘: Void Hero Cut 테스트 통과 ✅ + 적합 제품 정의
> 사용자(테스트 주체)가 Void Hero Cut을 테스트 → **통과 확인** 보고. tech 첫 검증 통과 템플릿. (워커=템플릿 적합성 사고 담당)

### 테스트 결과
- **Void Hero Cut ✅ PASS** — 사용자 확인. (※ 시각 산출 세부는 사용자 보유 — 워커는 통과 사실만 기록, 미관측분 추정 금지.)
- **워커 시드 재검증(병행):** 로딩 OK · 비용공식 **◈2(4컷×0.5)** OK · 스키마 필수필드 OK · output=image_set/4컷/4:5 · subject=product/product_composite/min_refs=1 · shots 4개·negative 존재 · **전역 이름 고유**(타 섹션 충돌 0).

### 이 템플릿에 어울리는 제품 (적합성 정의)
- **적합 조건:** ①단일 히어로 유닛 ②다크·메탈·글래스·글로시 마감(검정 보이드에서 림라이트·글로시 하이라이트가 살림) ③빌드퀄이 프리미엄 정당화인 카테고리.
- **⭐ 최적(4컷 다 빛남):** 이어버드 케이스+버드 · 헤드폰 · DAC/앰프 · 마이크 · 스마트워치(블랙/스틸) · 미러리스/컴팩트 카메라 · 액션캠 · 드론 · 기계식 키보드 · 게이밍 마우스 · 라우터/NAS/미니PC · 외장SSD · 파워뱅크 · GaN충전기(메탈) · 게임패드/콘솔 · e리더 · 베이프 · 알루미늄 손전등 · 스마트 스피커.
- **◎ 차선:** 무광/플라스틱이라도 형상이 또렷한 단일 가젯(밝은 색만 아니면 정면·3-4컷은 무난).
- **△ 부적합(다른 템플릿으로 라우팅):**
  - 흰·파스텔·밝은 색(흰 이어버드/화이트 스마트홈) → 보이드에 묻힘 → **Colorway Grid 라이트 스윕**
  - 색 변형 SKU → **Colorway Lineup Grid**
  - 초소형(스마트링·태그) → 크기 단서 0 → **Scale Reference Proof**
  - 착용형(안경·이어버드 핏·워치) → **On-Model Wear Fit**
  - 멀티팩/구성품 → **Knolling Kit Layout**
  - 라이프스타일·아웃도어 맥락 → **Desk Flatlay / (제안)Rugged·Install**
- **세트 운용:** 보통 **Void(전체 드라마) + Macro(질감) + Spec(사양)** 3종을 한 묶음으로 사용.

### 총지휘 액션 제안
- Void Hero Cut = **검증 통과 → 출시 후보 확정 가능.** 위 적합 제품 매칭표를 PDP 추천 로직/온보딩 라우팅에 반영 검토.
- 부적합(흰색·색변형·초소형·착용·멀티팩) 제품은 위 형제 템플릿으로 라우팅 — 단 그 형제 중 5종(Colorway·Scale·On-Model·App·Knolling)은 **위 §커버리지감사 PROPOSAL 상태(미시드화)** → 승인 시 라우팅 완성.

---

## 프롬프트 정밀화 패스 (프롬프트 워커 — 구 인라인 §9에서 이관, 별도 세션)
> 아래 2건은 프롬프트 정밀화 워커가 `07_tech.md`의 (구버전) 인라인 §9에 남긴 기록. 정본 단일화를 위해 여기로 이관(내용 verbatim 보존). 현재 시드 상태와 정합 확인: 死필드 `look.negative`=0 · `look.extra_negative`=7 · Spec extra_negative에 text/logo 제외 OK · 릴 music_mood 구조화 완료.

### 2026-06-10 · 프롬프트 정밀화(extra_positive + reel music_mood) — ✅ 완료(시드 반영)
- **의도:** §3 품질 갭 — 7개 extra_positive에 (1)reference-lock (2)제품 identity/no-morph lock (멀티샷·릴) (3)카메라 디테일(렌즈·F·focus) (4)구조화된 lighting·mood 보강. 릴 3개 music_mood를 감정어 → 구조화(genre+BPM+instruments+energy+reference). negative는 이미 이관 완료라 미접촉.
- **바꾼 필드:** 7개 `config.look.extra_positive` 전부 갱신 + 릴 3개 `config.reel.music_mood` 구조화. name·credit_cost·output_type·shots·flags·attributes **불변**.
- **방법(품질 보증):** draft → 적대적 verify 워크플로우(14 에이전트, 7템플릿×2단계). 각 verify가 8개 제약 감사 — reference-lock 존재, identity-lock(360은 emphatic), QUALITY_SUFFIX 단어 미중복(8k/sharp focus/professional photography/natural lighting/Instagram), 인물안전문구 미주입(product모드 personInFrame=false→엔진이 'brand-safe, SFW' 자동), Spec Grid는 빈 콜아웃 존만 확보·텍스트 렌더 지시 금지, In-hand은 부분손 설계 유지(풀5손가락 요청 금지), 영어·55~95단어, 릴 music_mood 구조화. 7개 全 approved(주로 bloat 트림).
- **엔진 정합 근거:** `recipeResolver.js` L132-148(positive 조립순 + extra_positive 소비 + product모드 'brand-safe, SFW'), `imagePrompt.builder.js` L16-33(QUALITY_SUFFIX 항상 append → 중복 회피). Studio/Macro/Lifestyle 프리셋은 DB(migrate.js) 미정의→빈 prefix/suffix, Cinematic(Unbox)만 anamorphic/grade 주입→중복 회피.
- **템플릿별 핵심 변경:** Void=4샷 일관성+ref-lock 선두 · Spec Grid=콜아웃 존 확보 문구 강화+ref-lock(텍스트/로고 렌더 지시 無) · Macro=ref-lock(anodizing/grain direction)+focus-stacking 표현 정제 · Desk=f2.8 명시+ref-lock+props 종속화 · In-hand=부분손 설계 유지하며 ref-lock+양샷 제품 일관성, music_mood=lo-fi house 95-110BPM · Unbox=50mm/f2.0+rack-focus+ref-lock, music_mood=ambient ASMR foley 70-85BPM · 360=**최강 no-morph lock**(every frame)+85mm f8+ref-lock, music_mood=tech-house 110-120BPM.
- **검증:** `node -e require` 7개 로드·전 필드 present ✓ · extra_positive 87~95단어·全 ref-lock+CRITICAL idLock ✓ · `grep -c '"negative":'`=**0 유지** ✓ · QUALITY_SUFFIX/인물안전 중복 scan clean ✓ · Spec Grid 텍스트렌더 지시 無 ✓ · `consolidate_recipes.js` **tech OK 7·중복0·비용공식 통과** ✓. 파일만 저장(commit/push 안 함).
- **🔔 총지휘 인계:** music_mood 구조화 포맷(genre/BPM/instruments/energy/reference)을 tech 릴 3개에 선적용 — 타 섹션 릴도 동일 포맷 통일 권고. 구조화 prompt export(§5.8)는 여전히 미신설(이전 로그 인계분 유효).

### 2026-06-10 · 죽은 필드 네거티브 이관(look.negative → look.extra_negative) — ✅ 완료(시드 반영)
- **의도:** resolver(`recipeResolver.js` L148)는 네거티브를 `look.extra_negative`에서만 읽는데 tech 7개 전부 死필드 `look.negative`에 보유 → 커스텀 네거티브가 엔진에 안 닿던 상태. 7개 全 살아있는 필드로 이관 + 정제.
- **바꾼 필드:** 7개 템플릿 `config.look.negative` → `config.look.extra_negative` (rename + 정제). extra_positive·shots·name·credit_cost·output_type·flags **불변**(카드계약·비용·디자인 불변).
- **정제 근거(SAFETY 중복 제거):** `imagePrompt.builder.js` L27 `SAFETY_NEGATIVE_PROMPT`가 전역 주입하는 `watermark/text/logo/deformed/blurry/low quality/extra limbs/extra fingers/mutated hands/bad anatomy` + minor/nsfw/violence군을 각 네거티브에서 제거. 대신 SAFETY가 못 막는 제품 특화 결함 보강(distorted brand label, wrong proportions, blown specular highlights, duplicated reflection, inconsistent product between frames 등).
- **🅣 Spec Callout Grid:** text_overlay=true → extra_negative에 `text`/`logo` **미포함 유지**(전역 SAFETY가 처리). callout-zone 특화 결함만. `meta.render_notes`의 "look.negative" 문구도 `look.extra_negative`로 갱신(파일 자기정합).
- **⚠️ In-hand Quick Demo:** 부분 손 크롭 설계 유지 — 손 특화 네거티브 보존(six fingers, fused/webbed digits, floating hand, melting fingers)하되 SAFETY 정확중복(`extra limbs`, `natural hand deformity`)만 제거. experimental·검수 권고 유지.
- **검증:** `grep -c '"negative":' recipes.tech.v2.js`=**0** ✓ · `"extra_negative":`=7 ✓ · `node -e require` 7개 ✓ · `consolidate_recipes.js` → **tech OK 7·중복0·비용공식 통과** ✓. 파일만 저장.
- **🔔 총지휘 인계:** (1) 다른 섹션도 `look.negative` 死필드 보유 시 동일 이관 필요. (2) §5.8 구조화 prompt export(`scripts/export_recipe_prompts.js`)는 미신설 → 총지휘 일괄 export 시 tech 반영 요망.

---

## 다음 액션 (대기 — 총지휘/사용자 지시 필요)
- [ ] 커버리지 PROPOSAL 채택 여부(7→13/15, 정책예외 or P0 3개 우선) → 승인 시 시드화 + `consolidate_recipes.js` 재검증 + 전역 이름 고유 확인.
- [ ] 승인 시 백본 동기화: `docs/템플릿_v2_발굴선별강화_결과.md`(tech keep/cut/add·가격사다리) + `docs/템플릿_한국어_카탈로그.md` + `public/_overview.html` + 구조화 export(시드 변경 시 동시).
- [ ] 미승인 시 현행 7개 유지(이미 확정·검증 완료, Void Hero Cut 테스트 통과).
