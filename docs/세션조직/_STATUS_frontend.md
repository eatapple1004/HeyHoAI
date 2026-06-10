# 🖥️ 프론트/UX _STATUS — frontend

> 브랜치 `feat/ux-monetization-v2` · 작업일 2026-06-10 · 프론트 UX 총지휘.
> 두 패스 수록: **(I) 카드 가시화 핸드오프 A4+B 구현**(아래) · **(II) v3 5차원 검증**(하단).
> ⚠️ 워커=파일만 저장 — **커밋/푸시 없음.** 정본 계약(`recommendTier`/`PLANS`/`window.PRICING`/`hh_*` localStorage) **무손상**.

---
# (I) 카드 가시화 — Chief 핸드오프 A4 + B 구현 ✅ (2026-06-10)

> 근거: `docs/프론트_핸드오프_게이트.md`(A4·B) + `_CHIEF_DASHBOARD.md §9`. 목표: 카드 계약을 studio 화면에 데이터드리븐으로 띄우고 재export 시 자동 갱신.
> 📌 카탈로그 78→**93** 확장됨(로스터 승인). 자동갱신 설계대로 `node scripts/export_recipe_cards.js` 재실행만으로 93 반영 확인(드리프트가드 93=93=93=93 OK).

---
## ⚡ provisional 필드 후속 (Chief 추가 발주) ✅ 2026-06-10
**갭:** `export_recipe_cards.js`(FE 브리지)가 카드 매핑 때 계약의 per-card `provisional`을 누락 → generated.js에 필드 없음(0) → studio가 확장 18카드를 잠정 구분 못 함(무결성 규칙 미충족). 데이터(이름·개수·비용)는 이미 갭0 — provisional 표기만 누락이었음.
**고친 것:**
- `scripts/export_recipe_cards.js`: 카드 매핑에 `provisional: r.provisional === true` 1줄 추가 + `provisional_verticals`를 **하드코딩 제거하고 계약 per-card에서 파생**(provVerts) + `provisional_count` 방출. 재실행 → generated.js 각 카드에 provisional 실림.
- `studio.html` 소비:
  - **per-card `⚗️ Beta` 칩**(정확) — 버티컬 전체가 아니라 **계약이 표시한 카드만**. 예: home은 7장 중 **2장만** Beta(안정 5장 미표기), pet 12장 중 8장.
  - 확장 고지 노트를 **카운트 기반·정확**으로 교체("⚗️ N new looks here are in preview (beta)…", 보장 아님).
  - 페이로드 envelope `_provisional.provisional` 플래그 추가(다운스트림 마케팅/공유가 영구카피 금지 판단).
  - **딥링크 영구화 금지 게이트:** `?recipe=<beta-id>` → 선택은 되되 "Beta look (preview) — still being finalized" 경고 토스트(퍼머링크/영구 취급 X).
- 가드/UGC 카피는 계속 '프리뷰/의도'만 — 엔진 `resolver L148` 미착지(보장 금지) 유지.

**라이브 검증(preview):** `window.RECIPES.provisional_count`=**18** · beauty 16카드/**8 Beta**, home 7/**2 Beta**, pet 12/**8 Beta**, jewelry 8/**0**(노트 없음) · 페이로드 `_provisional.provisional`=true · 딥링크 beta 게이트 토스트 동작 · 브레이스 306/306 OK · 계약심볼 무손상.
**Chief 재검증 훅:** `node -e` 로 generated.js 카드 합산 → provisional=true **18** (beauty8·home2·pet8) 확인 완료. 게이트 닫아도 됨.
**산출(커밋 금지):** 수정 `scripts/export_recipe_cards.js`·`public/studio.html`, 재생성 `public/js/recipes.generated.js`. 데이터(이름·개수·비용) **미변경**.

---

## Chief 보고 요약
```
[UX] 카드 가시화 — A4(소비 메커니즘 동결) + B(global 어포던스) DONE · 라이브 검증 통과
A4 데이터드리븐:  studio MOCK(v1-stale) 제거 → window.RECIPES(계약) 소비. 78카드/11버티컬 렌더 OK.
  파이프라인:    시드 →(템플릿)recipe_card_contract.js→ _card_contract.proposed.json →(FE)export_recipe_cards.js→ public/js/recipes.generated.js → studio
  자동갱신:      78→~93 재export = `node scripts/export_recipe_cards.js`만 재실행(드리프트가드 OK ✓)
  cost 단일원:   카드 credit_cost가 generate바·차감·페이월·week-set 구동 (pricing.js 아님, 검증됨)
B 어포던스(mock): 🅣 text_overlay 배지 · 🛡 가드 PREVIEW칩 · UGC브리지(2축 7×8) · 대형포맷 토글+정직 하드블록 · 페이로드 envelope · 딥링크 ?recipe= mock
무결성:          확장(beauty/home/pet)·가드/UGC = '프리뷰/의도' 카피만, '보장' 0건 (엔진 resolver L148 미착지 존중)
라이브검증:      stale recipe 0 · 11버티컬 78 정확 · week-set 7일 OK · 콘솔 studio-origin 에러 0 · 계약심볼 무손상
블로커: 없음. 게이트 대기: A1(로스터 승인) A2c(emoji/grad 정본) A2d(가드엔진) A5(/api shape·딥링크 동결)
```

## 무엇을 했나
**A4 — 소비 메커니즘 동결 (데이터드리븐):**
- 신설 `scripts/export_recipe_cards.js`: 카드 계약 JSON → `public/js/recipes.generated.js`(`window.RECIPES`) 변환. emoji/grad는 **FE 결정론 파생**(id djb2 해시→grad, name/cat 키워드→emoji) — A2c 소스 of record 부재를 round-trip 안정 방식으로 우회. 드리프트가드: 계약 total ↔ `_CATALOG.json` 합 ↔ `_STATUS.md` 헤더 (현재 78=78=78 OK ✓).
- `studio.html` 재배선: v1-stale 하드코딩 레시피(influencer 6 + product 8버티컬 + headshot + ugc) **전부 제거** → `RC(k)=window.RECIPES.cards[k]`로 소비. 삭제됐던 `lipsync-trend`/`blurcore-bts` 노출 제거, 신규 43개·cost drift 해소.
- **도메인 경계 준수:** 템플릿이 seeds→계약JSON 소유, FE가 계약JSON→generated.js 소유. FE는 `src/recipes` 내부(죽은 가드데이터·emoji/grad 부재)에 의존 안 함.

**B — global 어포던스 (mock, 게이트 무관):**
- 🅣 `text_overlay`(top-level, A5 규약) → 카드 코너 배지 + meta 칩.
- 🛡 per-card `guards` → PREVIEW 칩(툴팁 "Fidelity protections in progress (preview): …") — **'보장' 아님**.
- `experimental`/`needs_human_review` → "Preview" 칩, `oversize` → "Large-format" 칩.
- **UGC 브리지(2축):** product 모드 토글 → 모달에서 UGC포맷(7) × 소스버티컬(8) 선택 → `state.ugcBridge={ugc_format_id, source_vertical}` PROVISIONAL 페이로드 (mergeUGC가 둘 다 필요).
- **대형포맷 토글:** oversize 카드 선택 시 gen-bar에 노출 → aspect/print-size/editable_slots. **>1m = 정직한 하드블록**(가짜 해상도 약속 금지, apply 비활성).
- **페이로드 envelope** `buildPayload()`: `{subject,recipe_id,credit_cost,variants,quality,addons,_provisional:{text_overlay,guards,ugc_bridge,large_format}}` — provisional 키 명시, generate 시 `window.__lastPayload` 스태시(검수용).
- **딥링크 `?recipe=<id>`:** `selectRecipeById()` 로컬 RECIPES 조회 mock (백엔드 /api/recipes 동결 전).

## 라이브 검증 (preview, /studio.html)
| 검증 | 결과 |
|---|---|
| `window.RECIPES.total` / 버티컬 | 78 / 11 ✓ |
| 버티컬별 렌더 카운트 | influencer6·fashion8·beauty8·jewelry8·food7·home6·tech7·pet6·ugc7·general8·headshot7 = **78** ✓ |
| stale recipe(lipsync-trend/blurcore-bts) | 0 ✓ |
| cost 단일원(genSummary·payload) | GRWM Aurora Reel ◈6 = 계약값 ✓ |
| week-set 회귀 | 7일 생성 OK ✓ |
| UGC 브리지 2축 | 포맷 7 × 버티컬 8, confirm→ugc모드+payload ✓ |
| 대형포맷 하드블록 | 2–4m 차단+apply비활성 / ≤1m 활성 ✓ |
| 딥링크 ?recipe=surface-macro | product/jewelry 전환+선택 ✓ |
| 확장버티컬(beauty) 프리뷰 노트 | 표시 ✓ |
| over-claim 카피('보장' 류) | 0건 / preview·provisional 프레이밍 26곳 ✓ |
| 계약심볼·studio 콘솔에러 | 무손상 / studio-origin 0 (legacy index.html /api 폴링 에러는 별건) ✓ |

## Mock/Provisional 경계 (§5 — 거짓약속 방지)
- 가드/UGC/확장(beauty·home·pet) 카피 = **'프리뷰/의도'만.** 엔진 `resolver L148`·`config.guards[]` 소비·`mergeUGC`·oversize 라우팅 **미착지** → UI는 mock, 동작은 보장 안 함. 착지 시 Chief 승격 신호로 'preview'→실효 카피 전환.
- emoji/grad는 FE 임시 정본(A2c 미결) — 디자인/썸네일 자산 결정 시 교체 가능(id 기준 안정).

## 게이트 대기(미착수 = 설계상 정상)
- **A1** 오픈로스터 3종(beauty 8→16·home 6→7·pet 6→12) user 승인 → 카드 ~93 동결. 승인 후 템플릿 재export → `node scripts/export_recipe_cards.js` 한 번이면 studio 자동 반영(이미 그렇게 만들어둠).
- **A2c** emoji/grad 정본/썸네일 자산 · **A2d** 가드 실엔진 · **A5** `/api/recipes` shape + 딥링크 + auth/credits 계약 동결(backend).

## 산출 파일 (커밋 금지 — 파일만 저장)
- 신설: `scripts/export_recipe_cards.js`, `public/js/recipes.generated.js`(자동생성), `.claude/launch.json`(프리뷰용)
- 수정: `public/studio.html`(데이터 재배선 + B 어포던스 + 딥링크)

---
# (II) v3 5차원 검증 (2026-06-10)

> 총지휘 1 + 워커 5(영문화·recommendTier·수치정합·게이트위치·신뢰파괴자) + 적대적 재검증 5 = 10 에이전트. 검증·보고 전용(파일 수정 없음).

## 0) Chief 보고 요약
```
[UX] feat/ux-monetization-v2 — frontend verify (5 dimensions, 10 agents)
영문화/i18n      PARTIAL  v3#1     Doppia 결제경로 한글 0 ✅ / login·signup·index 레거시 한글 잔존 + 언어스위처 부재
recommendTier   PARTIAL  v3#2     신호기반 재배선 ✅ / Brand 트리거가 '변형≥10' 볼륨프록시 (명시적 상업CTA 아님)
수치정합        PASS     v3#3     stale 200/1000 = 0, 정본(pricing.js) 일치, 라이선스행 존재
게이트위치      PASS     v3#4·#9  입구 무마찰(→/studio.html), 게이트 생성후, 스트릭 firstDone 게이팅 ✅
신뢰파괴자      PASS     v3#6     50%배너 정직카운트다운화, cancel confirm 정상화, 윈백 존재
계약무결성: recommendTier/PLANS/window.PRICING/hh_credits·hh_plan·hh_first_seen 전부 OK
블로커: 없음 (login/signup/index는 Doppia 동선에서 미링크 = 라이브 영향 낮음; 나머지는 백엔드 대기)
```

## 1) 차원별 검증 보드
| 차원 | v3 | 판정 | 정본계약 | 핵심 결과 | 잔여 |
|---|---|---|---|---|---|
| 영문화 / i18n | #1 | 🟡 PARTIAL | OK | Doppia 결제·결정면(페이월·티어피치·업셀·토스트·약관·가입성공) **사용자노출 한글 0, heyhoai 0** | login/signup(100% 한글·HeyHoAI), index(레거시 엔진, 한글 에러토스트), **언어스위처 미구현** |
| recommendTier 신호재배선 | #2 | 🟡 PARTIAL | OK | 진짜 신호기반(모드분기 제거), Pro 5신호 전부 도달→캡션 인플루언서 Pro$39 노출, 2단계 업셀 존재 | Brand 1차 트리거가 `curVariants()>=10` 볼륨프록시 — v3가 요구한 '명시적 상업 다운로드/게시/라이선스 CTA' 아님 |
| 수치정합 | #3 | 🟢 PASS | OK | stale 200/1000 **0개**, landing=data-dp / billing=syncBillingPricing 재렌더 / studio 모달버튼=PLANS 덮어씀(inert), 라이선스행·"Everything in Pro" 존재 | (저)studio 업셀칩/팩버튼·business 화이트라벨 SKU는 정본일치 라이브하드코드, billing Free카드 라이선스행 누락 |
| 게이트 위치 | #4·#9 | 🟢 PASS | OK | landing 전 CTA→/studio.html(Log in·Brand만 예외), 생성전 벽 0(크레딧 페이월만), 게이트 생성후·소프트, 스트릭 `hh_firstDone` 게이팅 | (저)#4 문자 그대로의 '소프트 계정프롬프트'는 다운로드/게시에 미배선(현재 mock 토스트) — 의도는 충족 |
| 신뢰 파괴자 | #6 | 🟢 PASS | OK | 50%배너 `display:none`+`offerHoursLeft()>0`만 노출(24h 자가만료), `confirm()` 0개·cancel 정상(Cancel anyway→실취소), 윈백 존재 | (저)50% 라벨이 코스메틱 카피 — `firstMonthOff:50`이 체크아웃 계산에 미연동 |

판정 종합: **3 PASS · 2 PARTIAL · 블로커 0.** 모든 차원에서 정본 계약 무손상.

---

## 2) 차원 상세

### W-i18n · 영문화 (v3 #1) — 🟡 PARTIAL
**결론:** v3 최상위 리스크였던 "결제 순간 한국어"는 **Doppia 고객 동선(landing→saas-login→studio→billing→gallery)에서 사실상 해소**. 페이월 모달·`TIER_PITCH`/`ONCE_PITCH`·업셀 배너·전 `HH.toast()` 문자열·약관/프라이버시·가입성공 alert 모두 영어. → v3 본문의 "studio/billing 결제문구 ~100% 한국어"는 **현재 코드 기준 STALE/거짓**.
- **숫자 함정 주의:** `grep [가-힣]` 카운트(studio 755 / billing 51 / gallery 8)는 오해소지. 분류 결과:
  - studio 755 = JS/CSS/HTML **주석**(24행) + **다국어 캡션 데이터셋 `ko:`**(496–544, en/ko/ja/es/pt/zh) + 언어선택기 `한국어` 옵션(491). 사용자에게 해로운 한글 = **0**. → "studio 755→0" 목표를 글자 그대로 추구하면 **다국어 캡션 기능(Pro 가치)을 삭제**하게 됨. 추구 금지.
  - billing 51 = JS 주석 2행(275·296)뿐. gallery 8 = JS 주석 1행(212)뿐. **사용자노출 0**.
- **진짜 잔여(이 태스크가 명시한 인스코프 페이지):**
  - 🔴 `public/login.html` — `lang="ko"`, title `로그인 · HeyHoAI`, brand `HeyHoAI`, 라벨/버튼/foot/에러 전부 한글. (high)
  - 🔴 `public/signup.html` — 동일(`회원가입 · HeyHoAI`, `8자 이상 입력하세요` 등). (high)
  - 🟠 `public/index.html` — 레거시 엔진 페이지: title/h1 `HeyHoAI`, showToast로 노출되는 한글 에러 4종(994–997: `[Kling 제출 실패]`/`[Kling 생성 실패]`/`[타임아웃] 5분 초과`/`[서버 에러]`). (medium)
  - **완화:** landing은 `/saas-login.html`만 링크(영어 완성본). login/signup/index는 **Doppia 동선에서 미링크** → 라이브 바이어 영향 낮음. 적대적 재검증도 JS가 이 한글을 덮어쓰지 않아 "라이브, inert 아님" 확정.
- 🟠 **v3 #1 후반(언어 스위처) 미구현:** `navigator.language`/`data-i18n`/`langSwitch` 어디에도 없음, 전 페이지 `<html lang="en">` 하드코딩. 비영어권(Yuki) 갭 잔존 — 영어 기본 폴백 사전 필요.
- **heyhoai 잔존:** 레포 전체 16파일(전부 레거시/엔진: account-*, baby-growth, birth-reel, character, editor*, index, login, signup, logs, templates*, business.html(1), css/theme.css(1), editor-core.js(1)). **Doppia 고객 5페이지 = 0.** 가시 최악: index/login/signup의 title·brand.

### W-recommendTier · 신호 재배선 (v3 #2) — 🟡 PARTIAL
**결론:** `recommendTier()`(studio.html:753–759)는 **진짜 신호기반**. v3가 인용한 "714–718 모드기반"은 **STALE**(현재 714–718은 generate() 렌더루프, 함수 본문에 `state.mode` 참조 0).
- ✅ Pro 경로(757) = `4k || brandOn || captionOn || variants≥3 || streak≥3` — 5신호 전부 도달. **매일 캡션 쓰는 인플루언서가 Pro $39를 봄** → v3 '양방향 손실' 닫힘.
- ✅ `isCommercialMode()`(748)는 **2차 컨텍스트 칩만**(796–797) 추가, 1차 라우트 강제 안 함 → v3 'mode가 Brand 강요 금지' 충족.
- ✅ Pro→Brand 2단계 업셀 존재(788 + 797). PLANS는 `window.PRICING`에서(739–740, 폴백 숫자도 정본 일치). 콜러(openPaywall 764/paywallSub 773/showUpsell 777) 일관.
- 🔴 **핵심 잔여(high):** Brand **1차 트리거가 `curVariants()>=10`**(754) — **볼륨 프록시**. v3 #2는 Brand 승격을 "명시적 상업 다운로드/게시/라이선스 CTA에서만"으로 명시. **변형 10개 만드는 솔로 셀러가 여전히 $79로 자동 라우팅** = 감사가 지적한 과잉라우팅이 부분적으로만 닫힘. 현재 그런 상업 CTA 자체가 없음(Download/Post=727 mock 토스트, 라이선스 미배선).
  - 권고: `≥10` 트리거를 Brand **컨텍스트 칩으로 강등**하고 1차는 Pro 유지; 진짜 상업 CTA(게시/라이선스)가 생기면 거기서 Brand 승격. CTA 훅 자체는 프론트 가능, 실제 publish/license intent 추적은 `[defer:backend]`.

### W-수치정합 (v3 #3) — 🟢 PASS
**결론:** 교차페이지 크레딧/라이선스 모순 **완전 해소**. stale 200/1000 **0개**(grep clean).
- landing(331/337/343) = `data-dp`로 250/600/1,400 렌더(pricing.js 로드 374). billing = `syncBillingPricing()`(276, 호출 295)가 카드·상태줄·팩·data-m/y 전부 정본 재렌더 → 정적 숫자는 inert 폴백. studio 페이월/업셀 **모달** 버튼(313/322/327)은 `openPaywall`(765)·`openTierUpsell`(814/817)이 PLANS로 **덮어씀 → inert**(증거: 모달은 768·819에서만 open, 그 전에 textContent 세팅).
- ✅ 라이선스 행: landing 4/4, billing 3/4. Brand = "Everything in Pro + Commercial license"(landing 344 / billing 173) — v3 'Brand가 Pro상속기능 침묵누락' 해소.
- **라이브 하드코드(전부 정본 일치 = 모순 아님, 저순위 위생):**
  - studio 업셀칩 `$79`/`$39`(784/788, innerHTML 라이브) → `PLANS.brand.price`/`PLANS.pro.price` 보간 권장.
  - studio 페이월 팩버튼 `◈50—$5`/`◈220…$18`(311/312, 덮어쓰지 않음) → `window.PRICING.packs` 구동 권장.
  - business 화이트라벨 SKU `$199/$499/$999/$1,999`(192/204/217/229) — pricing.js에 없는 별도 SKU(‘Agency Lite’ $199≠team.price 199). `[defer:backend]` 정본화 후 data-dp.
  - earnings `$79`(106)=샘플 매출, index `$0.05/$0.21`=이미지당 원가 — 둘 다 플랜가 아님, OK.
- 🟢 (저) billing **Free 카드에 'Personal license' 항목 누락**(landing Free엔 있음) — 패리티 위해 1줄 추가 권장.
- 적대적 재검증 정정 1건(판정 무관): `dataDpCount_billing`은 2가 아니라 **4**(team band 185–186) — 메트릭 오기, 전부 정본 일치.

### W-게이트 위치 (v3 #4 + #9) — 🟢 PASS
**결론:** 입구 **무마찰**. landing 전 CTA가 `/studio.html` 직행(hero 216, nav 200, 가격카드 327/333/339, 버티컬칩 301, CTA밴드 356, 푸터 367). 예외=‘Log in’(199→saas-login)·Brand 카드(345→billing, 의도적).
- ✅ `generate()`(702–) **생성 전 계정/가입 벽 0** — 유일한 생성전 게이트는 `credits<cost`일 때만 뜨는 크레딧 페이월. 무료 유저가 워터마크 결과를 먼저 만든 뒤에야 모든 전환압이 옴.
- ✅ 진짜 게이트(워터마크 제거·브랜드킷·4K·상업권)는 **전부 생성 후** `showUpsell`/`upsellOnce`/`upscaleAction`. 페이월·업셀 모달 둘 다 ✕·백드롭 닫기 = **소프트/dismissible**.
- ✅ #9 스트릭/데일리 모달 `hh_firstDone` 게이팅(905) — 첫 방문 aha 안 끊음. showUpsell도 동일 플래그 재확인(776).
- 🟢 (저) v3 #4 문자 그대로의 "다운로드/게시에 소프트 **계정** 프롬프트"는 미배선(Download/Post=727 mock 토스트). 의도(입구 벽X, 가치추출 지점 게이트)는 충족. 원하면 'Save your work — 무료계정?' 시트 클라이언트 추가 가능, 실제 auth는 `[defer:backend]`.

### W-신뢰 파괴자 (v3 #6) — 🟢 PASS
**결론:** v3 #6 두 파괴자 **모두 해소**.
- ✅ **가짜 50% 상시배너 → 정직 카운트다운:** `offerBanner`(135) `style="display:none"` 출하, `HH.offerHoursLeft()>0`일 때만 노출(298–299), 라벨 "First 24h — Nh left". `offerHoursLeft()=(firstSeen+24h-now)/3600000`(hh.js:51) → **24h 후 자가 만료**. 상시 X.
- ✅ **뒤집힌 cancel confirm 제거:** 파일 내 `window.confirm()` **0개**. `cancelFlow()`(267) 인페이지 모달, 1차 'Pause instead(recommended)'=opt-in, **'Cancel anyway'→`reallyCancel()`(269)가 실제 취소**. 역논리 트랩 없음.
- ✅ **윈백/가치재강조** 존재(237–238 잃는것/지키는것 대비 + pause 윈백).
- ✅ 추가 다크패턴 0: auto top-up 토글 **기본 OFF**(223, `checked` 없음), 가짜 스카시티 0, 숨은수수료 0.
- 🟢 (저) 50% 라벨이 **코스메틱 카피** — `firstMonthOff:50`(pricing.js:32)이 어디서도 참조 안 됨, checkout(270–273)은 라벨 토스트만. 가격 미청구 mock이라 금전 기만은 아니나, 근거 없는 주장. 권장: `pro.price*(1-firstMonthOff/100)` 계산해 표기.

---

## 3) 우선순위 잔여 액션 (검증 결과 도출, 미적용)
| # | 차원 | 심각도 | 액션 | 파일:line | 백엔드 |
|---|---|---|---|---|---|
| A1 | recommendTier | **high** | Brand 1차 트리거 `curVariants()>=10`를 컨텍스트 칩으로 강등; 진짜 상업 게시/라이선스 CTA에서만 Brand 승격 | studio.html:754 (+727) | 의도추적 일부 defer |
| A2 | i18n | high | login.html·signup.html 영어화+Doppia 리브랜드 (또는 saas-login으로 일원화 후 폐기) | login/signup.html | — |
| A3 | i18n | medium | index.html showToast 한글 에러 4종 영어화 + title/h1 리브랜드 | index.html:994–997,6,323 | 에러코드 의미 defer |
| A4 | i18n | medium | 언어 스위처(navigator.language, 영어 기본 폴백) 신설 — v3 #1 후반 | 전 Doppia 페이지 | 통화현지화 일부 defer |
| A5 | 수치정합 | low | studio 업셀칩 $79/$39·팩버튼 $5/$18을 PLANS/PRICING.packs 보간 | studio.html:784,788,311,312 | — |
| A6 | 수치정합 | low | billing Free 카드에 'Personal license' 행 추가(landing 패리티) | billing.html:148 | — |
| A7 | 게이트 | low | (선택) 다운로드/게시에 소프트 계정 프롬프트 시트 | studio.html:727 | 실 auth defer |
| A8 | 신뢰 | low | 50% 라벨을 `firstMonthOff` 계산값으로 근거화 | billing.html:136 | 실 쿠폰 defer |
| A9 | i18n | low | 레거시/엔진 16파일 heyhoai 리브랜드(가시: index/login/signup 우선), studio/billing/gallery 주석 한글은 위생 차원(선택) | repo-wide | — |

## 4) DoD 체크리스트 (현 상태)
- [x] stale 200/1000 = 0 · 정본 일치(Creator 250 / Pro 600 / Brand 1,400) landing·billing·studio
- [x] recommendTier 신호기반 (단, Brand 트리거 보강 = A1)
- [x] 랜딩 Pro $39 카드 존재 + Brand 상업권 = "Everything in Pro" 명시
- [x] 신뢰 파괴자 0: 50%배너 정직화 + cancel confirm 정상화 + 윈백
- [x] 게이트 위치: 입구 무마찰 → /studio.html, 진짜 게이트 생성후, 스트릭 firstDone 게이팅
- [x] BACKEND_HANDOFF mock 경계·`hh_*` localStorage·`window.PRICING` 계약 무손상
- [ ] **Doppia 결제경로 한글 0** ✅ — 단 **레거시 login/signup/index 한글 잔존**(A2/A3) + **언어 스위처 미구현**(A4) → i18n PARTIAL
- [ ] **Brand 라우팅이 '명시적 상업 CTA' 기반**(A1) → recommendTier PARTIAL

## 5) 정적 메트릭 (2026-06-10)
```
[가-힣] 카운트(원시):  studio 755 / billing 51 / gallery 8 / index 107 / login 43 / signup 54
  └ 사용자노출 한글:   Doppia 5페이지(landing/studio/billing/gallery/saas-login) = 0
  └ studio 755 = 주석24행 + 다국어캡션 ko: 데이터셋(기능) + 언어선택기 옵션  → 해로운 한글 0
  └ login/signup/index = 레거시(미링크), 한글 라이브
heyhoai 잔존:          16파일(전부 레거시/엔진) / Doppia 고객 5페이지 = 0
data-dp 우회 하드코드:  라이브 6(전부 정본 일치, 모순 0) + inert 6(JS가 PLANS로 덮어씀)
window.confirm():      신뢰파괴 cancel 경로 = 0
계약 심볼:             recommendTier ✅ PLANS ✅ window.PRICING ✅ hh_credits/hh_plan/hh_first_seen ✅
```

## 6) 검증 메타 / v3 본문 정오표
- 적대적 재검증 5건 중 4건 `agree:true`(반박 0), 1건(수치정합) `agree:false`이나 **메트릭 오기 1건뿐**(billing data-dp 2→4), 판정 PASS 유지.
- **v3 STALE 정정:** ① recommendTier "714–718 모드기반"=현재 753–759 신호기반. ② "결제/확인문구 ~100% 한국어"=Doppia 경로 영어 완성. ③ "가입성공·약관 한국어"=saas-login 영어(58·88). → v3는 2026-06-08 진단이며 이후 코드가 다수 해소됨, 보고는 **현재 코드 기준**.
- 산출물 정책: 본 패스는 검증·보고 전용 — **소스 미수정, 미커밋**. 잔여 액션(§3)은 W2/W3/W6 워커에 분배 가능(W2=A1·A5·A7 로직, W6=A2·A3·A4·A9 카피, W3=A6·A8 빌링). 최종 머지는 Chief.
