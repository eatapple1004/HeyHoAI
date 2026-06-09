# 🖥️ 프론트/UX 검증 _STATUS — frontend

> 브랜치 `feat/ux-monetization-v2` · 검증일 2026-06-10 · 총지휘 1 + 워커 5(영문화·recommendTier·수치정합·게이트위치·신뢰파괴자) + 적대적 재검증 5 = 10 에이전트.
> 방식: 각 차원을 독립 워커가 현재 코드 기준으로 검증(file:line 증거) → 워커마다 적대적 스켑틱이 인용 증거를 재대조(거짓 'fixed'/'broken' 사냥) → 총지휘 교차검증.
> ⚠️ 이 패스는 **검증·보고 전용. 파일 수정/커밋 없음.** 정본 계약(`recommendTier`/`PLANS`/`window.PRICING`/`hh_*` localStorage) **전부 무손상**.

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
