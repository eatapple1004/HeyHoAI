# 🛡️ Trust & Safety / QA 총지휘 — 세션 명령서

> 너는 **Trust & Safety / QA 도메인 총지휘(orchestrator) 세션**이다. 조건부·크로스컷 도메인 — 초기엔 🎨템플릿 총지휘·엔진 작업에 임베드되어 "정책 + 검수 훅"만 굳히고, 규모/리스크가 커지면 독립 운영한다.
> 작업 디렉터리 `~/HeyHoAI`, 브랜치 `feat/ux-monetization-v2`. 세션끼리 메모리 비공유 → **공유 백본 = 레포 파일시스템**(이 도메인의 보드 = `docs/섹션명령서/_TS_STATUS.md`).

## 0) 역할
Doppia가 생성·배포하는 모든 콘텐츠가 **법적·플랫폼·브랜드 안전(brand-safe)** 선을 넘지 않도록 **정책을 정의하고, 위험 템플릿을 식별/게이팅하고, 출력 검수 훅을 표준화**하는 도메인을 책임진다. 핵심 리스크는 (1) **AI 생성 위험 포맷**(딥페이크형 talking-head·lip-sync, 손/손가락 변형, 말하는 입 모핑, on-model 360 직물 모핑), (2) **IP·초상권**(타인 얼굴·음원 저작권·브랜드 로고·상업/광고 사용권), (3) **콘텐츠 모더레이션**(미성년·NSFW·폭력 — 엔진 `SAFETY_NEGATIVE_PROMPT`로 1차 차단되나 정책·UX 미정의), (4) **출력 검수**(`experimental`/`needs_human_review` 플래그가 시드에 흩어져 있으나 게시 게이트·검수 큐로 이어지지 않음). 지금 단계 산출은 **거대 시스템이 아니라**: 정책 원칙 문서 1개 + 검수 훅(플래그 → 게시 전 사람 검수 게이트) + "이 도메인이 언제 독립하나"의 활성 조건이다. 백엔드·모델 모더레이션 API는 미연결이므로 정책·플래그·UX 카피·검수 절차의 **mock/문서 레이어**까지가 범위.

## 1) 범위 & 책임 영역 (구체적)
근거 파일(이 세션 시작 시 반드시 읽을 것):
- `docs/감사_v3_doppia_재감사.md` — 신뢰 훼손 누수(가짜 50% 긴급 배너 = 허위 긴급, 뒤집힌 cancel `confirm()`, 결제 순간 한국어), Derek "광고사용권 미정의", 라이선스 카피 모순(Personal vs Commercial). **T&S는 "정직성·법적 클레임" 관점에서 이 항목들을 소유.**
- `docs/레시피_프롬프트_및_템플릿_최적화.md` §"🔧 구조/엔진 개선" — 고위험 5종(Talking-Head, Street Interview, Talking Pet, on-model 360, Wrist&Hand)에 `experimental / 게시 전 사람 검수` 표시, talking은 1~2문장+B롤 제한, lip-sync 음원 권리 takedown 리스크.
- `src/images/imagePrompt.builder.js:16` — 전역 `SAFETY_NEGATIVE_PROMPT`(미성년·NSFW·폭력·품질방어 `extra fingers`/`mutated hands`/`text`/`logo`) + `SAFETY_POSITIVE_ENFORCEMENT`('clearly adult, age 25+'). **모더레이션 1차 방어선이지만 정책 문서·예외 규칙 없음.**
- `src/recipes/recipeResolver.js:148` — `extra_negative` + `SAFETY_NEGATIVE` 결합 지점(템플릿별 옵트아웃 경로).
- `src/recipes/seeds/recipes.*.v2.js` — `meta.flags:['experimental','needs_human_review']`가 **흩어져 존재**(검증 결과: ugc 6, fashion 4, food 4, pet 3, beauty 3, jewelry 2, headshot 2, influencer 1; home·tech·general은 0). `text_overlay` = 10개 시드(텍스트/로고는 모델 생성 금지 → 결정론적 오버레이로 합성, IP/클레임 안전).
- `public/studio.html`·`gallery.html`·`billing.html`·`landing.html` — `watermark` 로직 4페이지(워터마크-프리 약속·제거 컨트롤 = 무료/유료 신뢰 경계). 업로드 reference(타인 얼굴) = 초상권 동의 미정의.
- 책임 **밖**: 엔진 모델 선택·프롬프트 품질(→템플릿 총지휘), 가격/수익화(→UX/수익화), 배포/PG(→그로스). T&S는 이들에 **게이트·카피·플래그로 크로스컷**할 뿐 소유하지 않는다.

## 2) 하위(워커) 세션
각 워커는 **파일만 저장(commit/push 금지)**. 5개로 분해(병렬 가능).

1. **TS-W1 · 정책 원칙(Policy)** — 목적: Doppia 콘텐츠/생성 정책 원칙(허용·금지·조건부·검수 트리거)을 1차 문서로 정의. 산출물: `docs/trust_safety/POLICY.md`. 한 줄: "`docs/감사_v3_doppia_재감사.md`+`레시피..최적화.md`를 읽고 `docs/trust_safety/POLICY.md`에 콘텐츠 정책 원칙(미성년/NSFW/폭력=금지, 딥페이크/타인얼굴/음원=조건부+동의, 위험 5종=게시 전 사람 검수)을 작성해. 파일만 저장, commit 금지."

2. **TS-W2 · 위험 템플릿 인벤토리 & 플래그 정합** — 목적: 전 시드의 `experimental`/`needs_human_review`/`text_overlay` 플래그를 스캔해 위험 등급표로 정규화, 미플래그된 고위험(특히 talking/360/손) 탐지. 산출물: `docs/trust_safety/RISK_TEMPLATES.md` + 점검 스크립트 `scripts/ts_audit.js`. 한 줄: "`src/recipes/seeds/recipes.*.v2.js`를 스캔해 flags(experimental/needs_human_review/text_overlay)를 등급표로 만들고, 레시피_최적화 문서의 고위험 5종 대비 누락 플래그를 찾아 `docs/trust_safety/RISK_TEMPLATES.md`에 적어. 점검 스크립트 `scripts/ts_audit.js`도 작성. 파일만 저장."

3. **TS-W3 · IP / 초상권 / 라이선스** — 목적: 타인 얼굴 업로드 동의·음원 저작권(lip-sync)·브랜드 로고·상업/광고 사용권 규칙과 UX 카피 정의. 산출물: `docs/trust_safety/IP_CONSENT.md` (+ 적용 대상 카피 위치 목록). 한 줄: "감사 v3의 Derek '광고사용권 미정의'·라이선스 카피 모순과 레시피 문서의 lip-sync 음원 리스크를 근거로 `docs/trust_safety/IP_CONSENT.md`에 초상권 동의·음원·로고·상업/광고 사용권 정책과 적용할 UI 카피 위치를 정리해. 파일만 저장."

4. **TS-W4 · 출력 검수 훅 & 게이트(QA)** — 목적: `needs_human_review` 플래그 → 게시/다운로드 전 사람 검수 게이트(mock UI 훅·검수 큐 상태머신) 설계. 산출물: `docs/trust_safety/REVIEW_HOOKS.md` + `public/studio.html`·`gallery.html`의 검수 배너/게이트 mock 위치 명세. 한 줄: "`needs_human_review` 플래그가 붙은 출력에 대해 게시/다운로드 전 사람 검수 게이트(mock)를 `docs/trust_safety/REVIEW_HOOKS.md`에 설계하고, studio/gallery의 어느 지점에 배너·차단을 거는지 명세해. 코드 수정 없이 명세만, 파일 저장."

5. **TS-W5 · 신뢰·정직성 카피(Honesty QA)** — 목적: 감사 v3가 잡은 신뢰 파괴자(가짜 50% 상시 배너=허위 긴급, 뒤집힌 cancel `confirm()`, 워터마크 약속 위반)를 T&S 관점에서 등록·교정 명세. 산출물: `docs/trust_safety/HONESTY_QA.md`. 한 줄: "감사 v3의 신뢰 훼손 항목(가짜 50% 배너·뒤집힌 cancel confirm·워터마크 약속 위반·결제 순간 한국어)을 `docs/trust_safety/HONESTY_QA.md`에 정직성 위반 등록부로 정리하고 교정 기준을 적어. 파일만 저장."

> 임베드 모드(현 단계): TS-W2/W4가 핵심. TS-W1/W3/W5는 문서 1패스로 충분. 독립 모드(활성 조건 충족 시)에 워커를 풀가동.

## 3) 공유 백본 / _TS_STATUS
- 보드: **`docs/섹션명령서/_TS_STATUS.md`** (이 도메인 단일 진행판; 🎨템플릿의 `_STATUS.md` 패턴 차용).
- 자동 점검: **`node scripts/ts_audit.js`** (TS-W2 산출). 동작 — `src/recipes/seeds/recipes.*.v2.js` 전수 스캔 → 템플릿별 `flags`/`text_overlay` 집계, 레시피 최적화 문서의 고위험 5종(talking-head·street interview·talking pet·on-model 360·wrist&hand) 키워드 매칭 후 **플래그 누락 탐지**, `text_overlay:true`인데 negative에 `text`/`logo`가 남은 모순 탐지 → 콘솔 대시보드 + `docs/섹션명령서/_TS_STATUS.md` 자동 갱신. exit 0=클린, 1=이슈.
- 수동 보조(스크립트 전): 아래로 현황 산출 가능.
  ```
  grep -c "needs_human_review" src/recipes/seeds/recipes.*.v2.js
  grep -rln "text_overlay" src/recipes/seeds/
  grep -rln "watermark" public/*.html public/js/hh.js
  ```
  (현 기준선: needs_human_review = ugc6·fashion4·food4·pet3·beauty3·jewelry2·headshot2·influencer1, home/tech/general 0; text_overlay 10개 시드; watermark 4페이지.)
- 정책/IP/검수/정직성 4문서는 `docs/trust_safety/` 아래. 워커가 채우면 총지휘가 `_TS_STATUS.md` 표에 링크·상태 반영.

## 4) Chief에 보고할 _TS_STATUS 요약 형태
```
## 🛡️ Trust & Safety / QA — _TS_STATUS (YYYY-MM-DD)
모드: 임베드 | 독립        활성조건 충족: N/Y
정책:     POLICY.md ____ / IP_CONSENT.md ____ / HONESTY_QA.md ____
검수 훅:  REVIEW_HOOKS.md ____ · needs_human_review 게이트 mock: ____
위험 인벤: ts_audit.js ____ · 미플래그 고위험 ___건 · text_overlay 모순 ___건
신뢰자:   가짜배너 □ / cancel confirm □ / 워터마크 약속 □ / 결제 한국어 □
블로커(백엔드 대기): 모더레이션 API · 검수 큐 저장소 (BACKEND_HANDOFF.md)
다음 1보: ________
```

## 5) 완료 기준(DoD) 체크리스트
- [ ] `docs/trust_safety/POLICY.md` — 금지/조건부/검수 트리거 원칙 정의.
- [ ] `docs/trust_safety/RISK_TEMPLATES.md` + `scripts/ts_audit.js` — 위험 등급표 + 자동 점검, **미플래그 고위험 0건**(또는 의도 예외 기록).
- [ ] `docs/trust_safety/IP_CONSENT.md` — 초상권 동의·음원·로고·상업/광고 사용권 + 카피 위치.
- [ ] `docs/trust_safety/REVIEW_HOOKS.md` — `needs_human_review` → 게시 전 사람 검수 게이트 mock 명세.
- [ ] `docs/trust_safety/HONESTY_QA.md` — 신뢰 파괴자 등록·교정 기준(감사 v3와 교차).
- [ ] `node scripts/ts_audit.js` → 이슈 0, `docs/섹션명령서/_TS_STATUS.md` 갱신.
- [ ] **활성 조건 명시**: 독립 운영 트리거 = (a) 실모델 출력 시작(mock→real), (b) 타인 얼굴 업로드/딥페이크형 release, (c) 상업/광고 라이선스 판매 개시, (d) 외부 신고/takedown 1건 — 중 하나라도 충족 시 임베드→독립. `_TS_STATUS.md` 상단에 기록.
- [ ] 도메인 git 처리(총지휘) → 최종 머지는 Chief.

## 6) 총지휘 세션 붙여넣기 문구
> "`~/HeyHoAI`에서 Trust & Safety / QA 도메인 총지휘를 맡아. `docs/감사_v3_doppia_재감사.md`·`docs/레시피_프롬프트_및_템플릿_최적화.md`·`src/images/imagePrompt.builder.js`를 먼저 읽고, `docs/trust_safety/` 아래 정책·위험인벤·IP·검수훅·정직성 5문서와 `scripts/ts_audit.js`를 워커로 분해해. `docs/섹션명령서/_TS_STATUS.md`로 현황을 관리하고 미플래그 고위험·text_overlay 모순을 0으로 만든 뒤, 임베드/독립 활성조건을 보드에 명시해. 워커는 파일만 저장, 머지는 Chief."

## 7) 워커 세션 붙여넣기 문구 모음
- **TS-W1**: "`~/HeyHoAI`에서 `docs/감사_v3_doppia_재감사.md`·`docs/레시피_프롬프트_및_템플릿_최적화.md`·`src/images/imagePrompt.builder.js`를 읽고 `docs/trust_safety/POLICY.md`에 콘텐츠 정책 원칙(미성년/NSFW/폭력=금지, 딥페이크/타인얼굴/음원=조건부+동의, 위험 5종=게시 전 사람 검수)을 작성. 파일만 저장, commit 금지."
- **TS-W2**: "`~/HeyHoAI`에서 `src/recipes/seeds/recipes.*.v2.js`를 전수 스캔해 flags(experimental/needs_human_review/text_overlay) 등급표를 `docs/trust_safety/RISK_TEMPLATES.md`에 만들고, `docs/레시피_프롬프트_및_템플릿_최적화.md`의 고위험 5종 대비 누락 플래그·text_overlay와 negative의 text/logo 모순을 탐지하는 `scripts/ts_audit.js`를 작성(결과를 `docs/섹션명령서/_TS_STATUS.md`에 기록). 파일만 저장."
- **TS-W3**: "`~/HeyHoAI`에서 감사 v3의 Derek '광고사용권 미정의'·라이선스 카피 모순과 레시피 문서의 lip-sync 음원 takedown 리스크를 근거로 `docs/trust_safety/IP_CONSENT.md`에 초상권 동의·음원 저작권·브랜드 로고·상업/광고 사용권 정책과 적용할 UI 카피 위치(studio/billing/marketplace)를 정리. 파일만 저장."
- **TS-W4**: "`~/HeyHoAI`에서 `needs_human_review` 플래그 출력에 대해 게시/다운로드 전 사람 검수 게이트(mock)와 검수 큐 상태머신을 `docs/trust_safety/REVIEW_HOOKS.md`에 설계하고, `public/studio.html`·`public/gallery.html`의 어느 지점에 검수 배너·차단을 거는지 명세. 코드는 수정하지 말고 명세만, 파일 저장."
- **TS-W5**: "`~/HeyHoAI`에서 `docs/감사_v3_doppia_재감사.md`의 신뢰 훼손 항목(가짜 50% 상시 배너·뒤집힌 cancel confirm·워터마크 약속 위반·결제 순간 한국어)을 `docs/trust_safety/HONESTY_QA.md`에 정직성 위반 등록부로 정리하고 교정 기준을 작성. 파일만 저장."

---
### 공통 규칙
- 조직: 👑총최고관리자(Chief) → 도메인 총지휘들 → 워커 세션들. 세션끼리 메모리 비공유 → **공유 백본 = 레포 파일시스템**(각 도메인은 자기 _STATUS 보드를 가지며 Chief가 취합).
- git: **워커 = 파일만 저장(commit/push 금지)**. 도메인 총지휘가 자기 도메인 git, **최종 머지/릴리스는 Chief**. 브랜치 `feat/ux-monetization-v2`(mock 단계, push는 사용자 승인). 강제푸시 금지.
- 패턴 출처: 🎨템플릿 총지휘 = `docs/섹션명령서/00_총지휘_종합관리.md`(워커 11 + `scripts/consolidate_recipes.js` + `_STATUS.md`). 본 도메인은 동일 패턴(총지휘+워커+`_TS_STATUS`+붙여넣기)을 따른다.
- 현 상태: 프론트/UX mock 대부분 완료, 백엔드·엔진 미연결(`docs/BACKEND_HANDOFF.md` 대기 — 모더레이션 API·검수 큐 저장소가 여기 의존), 그로스는 배포·PG가맹·리스팅 진행 중.
