# 🖥️ 프론트/UX 총지휘 — 세션 명령서

> 작업 디렉터리 `~/HeyHoAI`, 브랜치 `feat/ux-monetization-v2`. 세션끼리 메모리는 공유되지 않으므로 **공유 백본 = 레포 파일시스템**(이 도메인의 `docs/세션조직/UX_STATUS.md` 보드를 너가 관리하고 Chief가 취합).
> 현 상태: 프론트/UX는 **mock 대부분 완료** → 이 도메인은 신규 구축이 아니라 **유지보수 + v3 감사 누수 개선** 모드다.

## 0) 역할
너는 Doppia의 **고객 대면 프론트엔드 9페이지 + 공유 UX 시스템**(플로우·전환/수익화 UI·반응형·i18n·디자인시스템)을 총괄한다. `docs/감사_v3_doppia_재감사.md`가 진단한 **3대 구조적 수익 누수 + 결제 순간 신뢰 훼손**을 워커에게 분배해 해소하고, `public/js/pricing.js`(가격 정본)·`public/js/hh.js`(공유 상태)·`public/css/theme.css`(디자인 토큰)의 정합을 지킨다. 백엔드·엔진은 미연결 상태(`docs/BACKEND_HANDOFF.md` 대기)이므로 너의 산출물은 **mock UI/카피/플로우 레벨**에 머문다 — 단, 백엔드가 그대로 연결할 수 있게 `recommendTier()`·`PRICING`·`hh_*` localStorage 계약을 깨지 않는다. 워커가 떨군 변경을 수거·검증하고 `UX_STATUS.md`로 진행을 추적, 자기 도메인 git을 관리한다(최종 머지는 Chief).

## 1) 범위 & 책임 영역
**소유 파일(9페이지 + 공유):**
- 마케팅 입구: `public/landing.html` · `public/index.html`
- 인증: `public/saas-login.html`(+ `public/login.html`·`public/signup.html` 잔존본), `public/auth-ui.js`
- 핵심 생성: `public/studio.html`(66KB, `recommendTier()` @714–748, `paywallModal` @304–312, `PLANS`/`showUpsell`)
- 갤러리: `public/gallery.html`
- 결제: `public/billing.html`(+ `public/earnings.html`)
- 마켓·어필리에이트: `public/marketplace.html` · `public/affiliate.html`
- B2B: `public/business.html`(API/Team/White-label/Private library/Schedule 5탭)
- 공유 시스템: `public/js/pricing.js`(가격 정본 `window.PRICING`) · `public/js/hh.js`(크레딧·plan·toast·firstSeen) · `public/css/theme.css`(디자인 토큰 `:root` --accent/--surface 등)

**기준 문서(읽고 근거 삼을 것):**
- `docs/감사_v3_doppia_재감사.md` — 우선순위 액션 15개의 단일 출처. 워커 작업은 여기 항목번호로 추적.
- `docs/기능_플로우_전체설명.md` — 페이지별 의도된 플로우(이걸 깨면 안 됨).
- `docs/감사_문제등록부.md` — 문제 원장(개별 이슈 ID).
- `docs/BACKEND_HANDOFF.md` — mock↔실데이터 경계. 카피/플로우만 손대고 이 계약은 유지.

**경계(이 도메인이 아닌 것):** 실제 이미지/영상 생성·Stripe·서버 원장·게이팅 강제(백엔드 도메인), 템플릿 레시피 시드(🎨템플릿 총지휘 = `docs/섹션명령서/`), 배포·PG가맹·리스팅(그로스).

**확인된 사실(워커 브리핑에 그대로 사용):**
- 한글 잔존(결제 순간 신뢰 누수, v3 액션 #1): `studio.html` 755자 · `billing.html` 51자 · `gallery.html` 8자. **landing/business/affiliate/marketplace/earnings/saas-login은 이미 0자.** → i18n 워커의 실제 타깃은 사실상 **studio.html + billing.html**.
- `recommendTier()`는 이미 신호기반으로 재배선됨(task #16 완료)이나 v3 본문은 모드기반 시절 진단 — 워커는 현재 코드 기준 재검증.
- `pricing.js`에 Pro $39(`cr:600`)·packs·team·firstMonthOff 모두 정본화 완료. 화면은 `data-dp` 속성 + `applyDP()`로 채움 → **DOM에 숫자 하드코딩 금지**.

## 2) 하위(워커) 세션
도메인을 병렬화 가능한 6개 워커로 분해. 각 워커는 **파일만 저장(commit/push 금지)**.

**W1 · 온보딩/랜딩**
- 목적: 입구 동선 + 게이트 위치 교정(v3 #4) + 랜딩에 Pro $39 카드·$79 미만 상업 rung(v3 #5) + 실세계 비용 앵커(v3 #12) + 첫방문 스트릭 게이팅(v3 #9).
- 산출물: `public/landing.html`, `public/index.html`, `public/saas-login.html`, `public/auth-ui.js`
- 붙여넣기: `~/HeyHoAI에서 docs/세션조직/UX_총지휘_세션명령서.md의 W1을 읽고 landing/index/saas-login만 담당. v3 액션 #4·#5·#9·#12를 적용하되 모든 가격은 data-dp로만, CTA는 /studio.html 직행 유지. 커밋 금지, 끝나면 UX_STATUS.md의 W1 행만 갱신.`

**W2 · 스튜디오 (핵심)**
- 목적: `recommendTier()`/`showUpsell` 신호 라우팅 재검증(v3 #2), 워터마크 사전고지+Remove 컨트롤 노출(v3 #7), 페이월 $5 primary 승격(v3 #13), 시각증거(업로드 FileReader echo, v3 #8), 스트릭 모달 게이팅(v3 #9), add-on 상태기억+Pro always-on 넛지(v3 #11).
- 산출물: `public/studio.html`
- 붙여넣기: `~/HeyHoAI에서 docs/세션조직/UX_총지휘_세션명령서.md의 W2를 읽고 studio.html만 담당. v3 액션 #2·#7·#8·#9·#11·#13 적용. recommendTier()/PLANS/hh_* localStorage 계약과 BACKEND_HANDOFF의 mock 경계는 유지. 커밋 금지, UX_STATUS.md의 W2 행 갱신.`

**W3 · 빌링·전환 신뢰**
- 목적: 교차페이지 수치/라이선스 정합(v3 #3, 정본=`pricing.js`), 신뢰 파괴자 제거(가짜 50% 배너 정직화·cancel confirm 정상화·윈백, v3 #6), 대형팩 단가 재검토(v3 비평), 자동충전/Pause 카피.
- 산출물: `public/billing.html`, `public/earnings.html`, (필요시 `public/js/pricing.js` 값 조정은 W6과 조율)
- 붙여넣기: `~/HeyHoAI에서 docs/세션조직/UX_총지휘_세션명령서.md의 W3을 읽고 billing/earnings 담당. v3 액션 #3·#6 + 대형팩 단가 비평 적용. 모든 숫자는 pricing.js 정본에서 data-dp로만 표기. 커밋 금지, UX_STATUS.md의 W3 행 갱신.`

**W4 · 마켓·어필리에이트 (공급측)**
- 목적: 일급 공급 입구 'Sell on Doppia'(v3 #15), 크레딧→달러 환산·노출/가격 레버, Standard/Exclusive 라이선스 계층 카피, 독점/단건 상한 SKU 검토(v3 비평 Aria).
- 산출물: `public/marketplace.html`, `public/affiliate.html`
- 붙여넣기: `~/HeyHoAI에서 docs/세션조직/UX_총지휘_세션명령서.md의 W4를 읽고 marketplace/affiliate 담당. v3 액션 #15 + Aria 독점SKU 비평 적용. 70/30·라이선스 계층 카피는 기능_플로우_전체설명.md 6·8절과 일치시킬 것. 커밋 금지, UX_STATUS.md의 W4 행 갱신.`

**W5 · 비즈니스(B2B)**
- 목적: Team 구매 가능화 + 화이트라벨 진입로 노출(API 탭 탈출·Talk-to-sales dead-end 제거, v3 #10), 마진 시뮬레이터 신뢰성, 광고사용권 카피 명시(v3 비평 Derek).
- 산출물: `public/business.html`
- 붙여넣기: `~/HeyHoAI에서 docs/세션조직/UX_총지휘_세션명령서.md의 W5를 읽고 business.html만 담당. v3 액션 #10 + Derek 광고사용권 카피 적용. 5탭(API/Team/White-label/Private/Schedule) 구조 유지. 커밋 금지, UX_STATUS.md의 W5 행 갱신.`

**W6 · 디자인시스템·i18n**
- 목적: 결제/업셀/토스트/확인 문구 전부 영어화(v3 #1, 최고 ROI) — **실타깃 studio.html(755자)·billing.html(51자)·gallery.html(8자)**; 잔존 'heyhoai' 문자열 제거·가격사다리 단일화(v3 비평); `theme.css` 토큰 일관·반응형(모바일 ⚙ Options 접힘) 점검; 언어 스위처(navigator.language, 영어 기본, task #14 완료분 검수).
- 산출물: `public/css/theme.css`, 전 페이지의 한글→영어 카피 패스, (옵션) `public/js/i18n.js`
- 붙여넣기: `~/HeyHoAI에서 docs/세션조직/UX_총지휘_세션명령서.md의 W6을 읽고 디자인시스템·i18n 담당. v3 액션 #1을 studio/billing/gallery 한글 잔존에 집중 적용(영어 기본), heyhoai 잔존문자열·중복 가격사다리 제거, theme.css 토큰·반응형 점검. 다른 워커가 동시에 같은 파일을 만지므로 카피 교체는 텍스트만, 구조 변경 금지. 커밋 금지, UX_STATUS.md의 W6 행 갱신.`

> 충돌 규칙: W2·W6이 모두 `studio.html`을 만진다 → **W2=로직/구조, W6=카피(텍스트 노드)만**. W3·W6이 `billing.html` 충돌 시 동일 분담. 총지휘가 머지 시 해소.

## 3) 공유 백본 / _STATUS
- **보드 파일: `docs/세션조직/UX_STATUS.md`** (이 디렉터리는 이미 존재, 비어 있음 → 너가 생성). 🎨템플릿 패턴(`docs/섹션명령서/_STATUS.md`)을 그대로 따른다: 워커 행 × 상태(pending/wip/done) × v3 액션번호 × 산출 파일 × 이슈.
- **자동 점검 스크립트(권장 신설): `scripts/ux_audit.js`** — 정적 grep 기반, 백엔드 불필요:
  - 한글 잔존: 페이지별 `[가-힣]` 카운트(기대값 0; 현재 studio 755·billing 51·gallery 8 → 0으로 수렴).
  - 잔존 'heyhoai' 문자열(대소문자 무시) 검출(기대 0).
  - 하드코딩 가격 누수: `\$(19|39|79|199)` 가 `data-dp` 없이 박혀 있는지(정본 `pricing.js` 우회 탐지).
  - `recommendTier()`·`PLANS`·`window.PRICING`·`hh_credits/hh_plan/hh_first_seen` 심볼 존재(계약 깨짐 방지).
  - 출력: 콘솔 대시보드 + `docs/세션조직/UX_STATUS.md` 자동 갱신, exit 0=클린/1=이슈.
- 스크립트 신설 전 임시 수동 점검(즉시 실행 가능):
  - `for f in studio billing gallery landing business affiliate marketplace earnings saas-login; do printf '%s: ' $f; grep -oP '[가-힣]' public/$f.html | wc -l; done`
  - `grep -rin heyhoai public/`
- 시각 검수가 필요하면 로컬 서버(`python3 -m http.server`)로 9페이지 + 모바일 폭 스냅샷.

## 4) Chief에 보고할 _STATUS 요약 형태
```
[UX] feat/ux-monetization-v2 — 6 workers
W1 온보딩/랜딩      done  v3#4,5,9,12  landing/index/saas-login
W2 스튜디오         wip   v3#2,7,8,9,11,13  studio.html (시각증거 #8 미완)
W3 빌링·신뢰        done  v3#3,6  billing/earnings
W4 마켓·어필리       wip   v3#15,Aria  marketplace/affiliate
W5 비즈니스         done  v3#10,Derek  business.html
W6 디자인·i18n      wip   v3#1  한글잔존 studio 755→0✅ billing 51→0✅ gallery 8→0 진행
점검: node scripts/ux_audit.js → 한글0 / heyhoai0 / 하드가격0 / 계약OK = exit 0
블로커: 없음 (백엔드 미연결은 설계상 정상 — BACKEND_HANDOFF 대기)
```

## 5) 완료 기준(DoD) 체크리스트
- [ ] `node scripts/ux_audit.js` → exit 0 (한글 잔존 0 · 'heyhoai' 0 · `data-dp` 우회 하드가격 0 · 계약 심볼 모두 존재).
- [ ] v3 우선순위 액션 1~15 + 비평 5항이 각 워커 행에 적용/의도적 보류로 명시 기록.
- [ ] 3대 구조 누수 해소 검증: ① `recommendTier()` 신호기반 ② 교차페이지 수치(Creator 250 / Pro 600 / Brand 1,400)가 landing·billing·studio에서 `pricing.js` 단일 출처로 일치 ③ 랜딩 Pro $39 카드 + $79 미만 상업 rung 존재.
- [ ] 신뢰 파괴자 0: 가짜 상시 50% 배너 → 24h 정직 카운트다운, cancel confirm 정상화.
- [ ] 반응형: studio 모바일 ⚙ Options 접힘 + 9페이지 모바일폭 깨짐 없음.
- [ ] `BACKEND_HANDOFF.md`의 mock 경계·`hh_*` localStorage·`window.PRICING` 계약 무손상.
- [ ] `UX_STATUS.md` 최신화 → Chief 취합 → (사용자 승인 후) 도메인 git 커밋. 최종 머지/릴리스는 Chief.

## 6) 총지휘 세션 붙여넣기 문구
`~/HeyHoAI에서 docs/세션조직/UX_총지휘_세션명령서.md를 읽고 프론트/UX 총지휘를 맡아. docs/감사_v3_doppia_재감사.md와 기능_플로우_전체설명.md를 근거로 6개 워커(온보딩/랜딩·스튜디오·빌링·마켓/어필리·비즈니스·디자인/i18n)에 v3 액션을 분배하고, scripts/ux_audit.js(없으면 신설)로 docs/세션조직/UX_STATUS.md 보드를 관리해. pricing.js 가격 정본·hh.js 상태계약·BACKEND_HANDOFF mock 경계는 유지. 워커는 파일만 저장하니 너가 수거·검증·도메인 git 관리하고, 최종 머지는 Chief에 넘겨. push는 사용자 승인 전까지 금지.`

## 7) 워커 세션 붙여넣기 문구 모음
- **W1 온보딩/랜딩**: `~/HeyHoAI에서 docs/세션조직/UX_총지휘_세션명령서.md의 W1을 읽고 landing/index/saas-login만 담당. v3 #4·#5·#9·#12 적용, 가격은 data-dp로만, CTA는 /studio.html 직행 유지. 커밋 금지, UX_STATUS.md의 W1 행 갱신.`
- **W2 스튜디오**: `~/HeyHoAI에서 docs/세션조직/UX_총지휘_세션명령서.md의 W2를 읽고 studio.html만 담당. v3 #2·#7·#8·#9·#11·#13 적용, recommendTier/PLANS/hh_* 계약·mock 경계 유지. 커밋 금지, UX_STATUS.md의 W2 행 갱신.`
- **W3 빌링·신뢰**: `~/HeyHoAI에서 docs/세션조직/UX_총지휘_세션명령서.md의 W3을 읽고 billing/earnings 담당. v3 #3·#6 + 대형팩 단가 비평 적용, 숫자는 pricing.js 정본 data-dp로만. 커밋 금지, UX_STATUS.md의 W3 행 갱신.`
- **W4 마켓·어필리**: `~/HeyHoAI에서 docs/세션조직/UX_총지휘_세션명령서.md의 W4를 읽고 marketplace/affiliate 담당. v3 #15 + Aria 독점SKU 비평 적용, 70/30·라이선스 계층 카피는 기능_플로우_전체설명.md와 일치. 커밋 금지, UX_STATUS.md의 W4 행 갱신.`
- **W5 비즈니스**: `~/HeyHoAI에서 docs/세션조직/UX_총지휘_세션명령서.md의 W5를 읽고 business.html만 담당. v3 #10 + Derek 광고사용권 카피 적용, 5탭 구조 유지. 커밋 금지, UX_STATUS.md의 W5 행 갱신.`
- **W6 디자인·i18n**: `~/HeyHoAI에서 docs/세션조직/UX_총지휘_세션명령서.md의 W6을 읽고 디자인시스템·i18n 담당. v3 #1을 studio(755)/billing(51)/gallery(8) 한글 잔존에 집중(영어 기본), heyhoai 잔존·중복 가격사다리 제거, theme.css 토큰·반응형 점검. studio/billing은 카피(텍스트)만 손대고 구조는 W2/W3 소관. 커밋 금지, UX_STATUS.md의 W6 행 갱신.`

---
## 공통 규칙
- **조직**: 👑총최고관리자(Chief) → 도메인 총지휘들 → 워커 세션들. 세션끼리 메모리 비공유 → **공유 백본 = 레포 파일시스템**(각 도메인은 자기 _STATUS 보드를 갖고 Chief가 취합).
- **git**: 워커 = 파일만 저장(commit/push 금지). 각 도메인 총지휘가 자기 도메인 git, **최종 머지/릴리스는 Chief**. 브랜치 `feat/ux-monetization-v2`(mock 단계, push는 사용자 승인). 강제푸시 금지.
- **선례 패턴**: 🎨템플릿 총지휘 = `docs/섹션명령서/00_총지휘_종합관리.md`(워커 11 + `scripts/consolidate_recipes.js` + `_STATUS.md`). 이 총지휘+워커+_STATUS+붙여넣기 패턴을 그대로 따른다.
- **현 상태**: 프론트/UX는 mock 대부분 완료, 백엔드·엔진 미연결(`docs/BACKEND_HANDOFF.md` 대기), 그로스는 배포·PG가맹·리스팅 진행 중.
