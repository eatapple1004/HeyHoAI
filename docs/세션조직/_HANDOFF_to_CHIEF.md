# Chief 인수인계 패킷 (이 한 장 + 01_CHIEF.md = 무손실 인계)

> Chief 세션이 **가장 먼저** 읽을 것. 01_CHIEF.md는 "역할/구조", 이 문서는 "지금 실제 상태·제약·미해결". 둘 다 읽으면 이 빌더 세션을 닫아도 무손실.

## A. 지금 상태 스냅샷 (2026-06-10)
- 브랜치 **`feat/ux-monetization-v2`**, working tree **clean**, origin과 동일(미푸시 0). 최신 커밋 `a867991`(studio에 general 버티컬+headshot 모드 와이어링).
- **PR #8 OPEN**: head=`feat/ux-monetization-v2` → base=`feat/saas-studio-monetization`(개발자 브랜치). **`main` 아님.** main 머지는 소유자 타이밍.
- gh 계정=`qwertty979`. 협업자=`eatapple1004`(개발자 — auth·멀티테넌시·쿠키 등 백엔드 담당, 우리와 별개 작업).

## B. ⚠️ 가장 중요 — 라이브 배포 불일치 (운영 리스크)
- **doppia.ai 라이브 = 옛/부분 배포로, 우리 PR #8 작업이 거의 반영 안 됨.** 확인된 증거: `earnings.html` 404, business는 옛 단일 화이트라벨($499·Private library 탭 없음), 랜딩 3티어(Creator 200/Brand 1,000)+`heyhoai.com` 잔존, billing 한국어 토스트 — **우리가 F1~F6·리브랜딩·Pro티어로 고친 게 라이브엔 없음.** (단 `js/pricing.js`만 새 버전 = 파일 일부만 수동 업로드된 뒤섞인 상태.)
- **원인 = 브랜치 통째 배포가 아니라 파일 일부만 손으로 올림.** 호스팅 방식 **미확인**(Netlify 드래그앤드롭 vs git 연동 — 사용자에게 물어봤으나 답 못 받음).
- **Chief 할 일**: 사용자에게 호스팅 방식 확인 → **`feat/ux-monetization-v2`의 `public/` 폴더를 통째로 재배포**(파일 하나씩 X). 그래야 라이브 = 우리 검토본. (카드사/PG·유저가 지금 보는 건 수정 전 버전이라 시급.)

## C. 결정·제약 (반드시 준수)
- **push = 사용자 명시 승인 시만.** **강제푸시 절대 금지**(개발자 auth 날아감). **main 직접 푸시 X**(기능브랜치→PR).
- **개발자 소유/레거시 파일 손대지 말 것**: `login/signup/index/account-*` + 레거시앱(`baby-growth/birth-reel/character/editor/logs/templates`). **우리 소유** = `studio·landing·billing·gallery·marketplace·affiliate·business·earnings·saas-login` + `js/{hh,pricing}` + `src/recipes`·`docs`·`scripts`.
- **시크릿 커밋 금지**(과거 business.html 데모 `sk_live_…`가 푸시보호 걸려 데모키로 치환한 이력 — 푸시 전 시크릿 스캔).
- **가격 = 추정 placeholder**(Free10/Creator$19·250/Pro$39·600/Brand$79·1,400/팩 $0.10→0.063/Team$199). 엔진 costMeter 실원가 확정 전까지 확정 금지. 단일소스=`js/pricing.js`→백엔드 시 `/api/pricing`.

## D. 도메인 현황 (Chief 롤업 시작점)
- 🎨 **템플릿 = 사실상 완료** — `node scripts/consolidate_recipes.js` → **11/11 OK·76개**, general+headshot `studio.html` 와이어링됨. (검증만 하면 됨.)
- 🖥️ **프론트 = mock 완료 + 감사 F1~F6 적용·리뷰 통과**(결제 영문화·recommendTier 신호재배선·교차페이지 수치정합·게이트 위치·랜딩 Pro+상업rung·가짜배너/뒤집힌 confirm 제거). 남음: 시각증거(업로드 FileReader echo), i18n(영어우선 보류).
- 🔌 **백엔드·⚙️엔진 = 미연결.** `docs/BACKEND_HANDOFF.md`가 단일 체크리스트(.env·크레딧원장·실생성·Stripe·게이팅강제·/api/pricing·costMeter).
- 📈 **그로스** = ①라이브 재배포(B) ②PG/카드사 가맹(설명문 `판매 상품 설명` 작성됨) ③가격확정(엔진 대기) ④스토어/Shopify 리스팅.
- 🛒마켓/🛡️T&S = **보류**(코어5 E2E 후 활성, 유저 발행은 출시 2차로 결정됨).

## E. 미해결 — 사용자에게 물어 닫을 결정
1. **$79 미만 신규 상업 SKU**(Seller ~$29-39 신설 vs Creator +$10/월 상업 add-on) — 가격정책 결정 대기.
2. **라이브 재배포 방식**(호스팅 확인) — B 참조.
3. **main 머지 타이밍**(소유자/개발자와 조율).

## F. Chief 첫 액션 (추천 순서)
1. `_CHIEF_DASHBOARD.md` 생성 — 7도메인 `_STATUS_*` 롤업(없으면 미착수). 템플릿은 consolidate로 자동.
2. **라이브 배포 불일치(B)** 사용자에 보고 + 재배포 방식 확정 — 최우선.
3. 그로스·프론트 활성(지금 일할 수 있음). 엔진·백엔드는 개발자 합류 대기.
4. $79 SKU 결정 요청.

## G. 앵커 문서 (Chief 상시 참조)
`docs/세션조직/01_CHIEF.md`·`00_조직도.md`, `docs/BACKEND_HANDOFF.md`, `docs/기능_플로우_전체설명.md`, `docs/감사_v3_doppia_재감사.md`, `docs/섹션명령서/00_총지휘_종합관리.md`, 사용자 메모리 `heyhoai_studio.md`.
