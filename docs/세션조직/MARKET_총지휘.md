# 🛒 마켓플레이스/공급 총지휘 — 세션 명령서 (조건부 / 출시 1차 비활성)

> 너는 **마켓플레이스·공급측(양면시장 supply-side) 도메인 총지휘** 세션이다. 작업 디렉터리 `~/HeyHoAI`, 브랜치 `feat/ux-monetization-v2` (PR #8). 세션끼리 메모리 비공유 → **공유 백본 = 레포 파일시스템.**
> **중요 — 현재 상태: 이 도메인은 출시 1차에서 비활성(보류 스텁)이다.** 유저 발행(셀러 publish)은 출시 후 데이터·운영부하·법무를 보고 **2차 결정**한다. 지금 너의 일은 _구현이 아니라_ ① 활성화 조건을 명시하고 ② 핸드오프 지점(템플릿·백엔드·그로스에 분산되어 있는)을 한 곳에 적어 추적 가능하게 만들고 ③ 보류 보드(_STATUS)를 세워두는 것까지다. **워커 세션들은 활성화 결정 전까지 착수하지 않는다(정의만 해둔다).**

---

## 0) 역할

이 도메인은 Doppia 마켓플레이스의 **공급측(셀러가 채워주는 쪽)** 을 총괄한다 — 셀러 온보딩·심사, 정산/페이아웃(70/30), 가상모델 라인·라이선스(Standard/Exclusive), 큐레이션·랭킹·discovery. 그러나 **출시 1차에서는 1st-party(Doppia 공식) 공급만 운영**하고 유저 발행은 켜지 않는다. 따라서 총지휘인 너의 책임은 "이 도메인을 만든다"가 아니라 **"비활성 상태를 명확히 관리하고, 활성화 트리거가 충족되면 즉시 워커를 깨워 가동할 수 있도록 준비·추적한다"** 이다. 구체적으로 (a) 현재 mock UI가 셀러 publish를 _권유하지 않고 waitlist만 받도록_ 유지되는지 점검, (b) 백엔드/템플릿/그로스 각 도메인에 흩어진 공급측 핸드오프 항목을 단일 보드로 취합, (c) 2차 활성화 조건(DAU·수요측 검증·법무·정산 인프라)을 Chief에게 신호로 올린다.

---

## 1) 범위 & 책임 영역 (실제 파일/문서 기준)

이 도메인이 **소유**하는 프론트(현재 전부 mock):
- `public/marketplace.html` — 양면시장 진열대. 현재 **공급측은 의도적으로 잠겨 있음**:
  - 상단 배너 `.creator-cta` = "🎨 Creator program — opening soon", 버튼은 publish가 아니라 **`openSell()` → waitlist 모달**(L104~110, 128~150). 즉 셀러 온보딩 폼은 _신청서가 아니라 대기자 등록_이다 (`submitSell()` L227 — 서버 전송 없이 done 화면).
  - 진열 데이터 `TEMPLATES`/`MODELS` (L156~177) 전부 하드코딩 mock. `MODELS`는 모두 `official:true` = **1st-party만 노출**(유저 모델 0). 라이선스 티어 = Standard(`◈/use`, non-exclusive) / Exclusive(`$/mo`, locked) — 라이선스 설명 배너 L203~207.
  - 큐레이션/discovery = 탭(🧩 Templates / 👤 Virtual Models) + 카테고리 chip 필터 + `uses`/`rating` 정렬 신호만 존재 (`render()` L183~219). **랭킹 로직 없음**(정렬·가중치 미구현).
- `public/earnings.html` — 셀러 수익 대시보드 (mock). 70% revenue share·월 정산·`Next payout 2026-07-01`·Stripe/PayPal 페이아웃·item status(live/review) 전부 하드코딩 `ITEMS` (L101~108). 유저 발행 활성화 전엔 **공개 진입점 없음**(marketplace에서 "Preview the earnings dashboard" 링크로만 도달).
- `public/affiliate.html` — 레퍼럴 30% recurring(12개월). **주의: 이건 공급측이 아니라 그로스/레퍼럴 영역**이지만 marketplace/earnings에서 링크로 묶여 있어 인접 관리 대상. 활성화 시 소유권은 그로스 도메인과 협의(아래 핸드오프 참조).

이 도메인의 **핸드오프 원장**(다른 도메인이 실제로 구현, 너는 추적):
- 백엔드: `docs/BACKEND_HANDOFF.md` **§7 마켓플레이스·공급측**(셀러 온보딩 신청 파이프라인·심사·알림 / earnings 실사용량·정산·70/30 페이아웃·크레딧→통화 환산 / publish·Standard·Exclusive 라이선스 발급·1st-party 100% 수취) + **§5** 결제(Stripe Checkout/Customer Portal)·**§6** costMeter(정산 단가 근거). 데이터: §0 `DATABASE_URL` "PRODUCT LAYER 신규 6테이블".
- 템플릿: `docs/섹션명령서/00_총지휘_종합관리.md`(🎨 템플릿 총지휘) — 진열대에 들어갈 **공급 인벤토리의 1st-party 원천**. 유저 발행이 켜지면 셀러 시드도 같은 스키마(`src/recipes/seeds/recipes.<key>.v2.js` §스키마)를 따라야 하고, `scripts/consolidate_recipes.js`의 검증(비용공식·중복이름·가격사다리)을 **심사 게이트로 재사용**한다.
- 그로스: 배포·PG가맹·리스팅 진행 중(그로스 도메인 소유). PG가맹/페이아웃 KYC가 안 풀리면 70/30 정산은 활성화 불가 → **그로스가 정산측 블로커의 상위 의존**.

이 도메인이 **하지 않는 것**(경계): 수요측(스튜디오 generate·크레딧 차감)·B2B(Team/White-label/API)·가격 단일소스(`public/js/pricing.js`)는 다른 도메인. affiliate 커미션 정산 로직도 그로스/레퍼럴 소유.

---

## 2) 하위(워커) 세션 — **활성화 시 정의** (지금은 착수 금지)

> 출시 1차 비활성이므로 아래 워커들은 **2차 활성화 결정 후** 가동한다. 지금은 각 워커의 산출물 경로를 _플레이스홀더로 예약_하고, `_STATUS.md`에 `dormant(대기)`로만 표기한다. 워커=파일만 저장, commit/push 금지.

| # | 워커 이름 | 목적 | 산출물(실제 경로) |
|---|---|---|---|
| W1 | **셀러 온보딩·심사 (seller-onboarding)** | `marketplace.html`의 waitlist 모달을 실제 셀러 신청·심사 파이프라인으로 승격. 신청 폼→심사 큐→승인/반려 상태. 심사 게이트는 `scripts/consolidate_recipes.js` 검증 재사용. | `public/marketplace.html`(`openSell`/`submitSell` 실연동), `docs/마켓플레이스/셀러심사_정책.md`(신규), `docs/BACKEND_HANDOFF.md` §7 1번 체크박스 갱신 |
| W2 | **정산·페이아웃 70/30 (payouts)** | `earnings.html`을 실사용량 기반 정산으로. 크레딧→통화 환산, 월 페이아웃, 1st-party 100%/3rd-party 70%, Stripe/PayPal 연결. costMeter(§6) 단가가 근거. | `public/earnings.html`(실데이터 와이어링), `docs/마켓플레이스/정산_70_30_명세.md`(신규), `docs/BACKEND_HANDOFF.md` §7 2번 갱신 |
| W3 | **가상모델 라인·라이선스 (models-license)** | `MODELS` mock을 실제 모델 카탈로그로. Standard(◈/use·non-exclusive) / Exclusive($/mo·locked, 보유 중 마켓에서 제거) 라이선스 발급·상태 관리. 1st-party 100% 수취. | `public/marketplace.html`(MODELS 데이터·`lic()` 연동), `docs/마켓플레이스/라이선스_티어_명세.md`(신규) |
| W4 | **큐레이션·랭킹·discovery (curation-ranking)** | 현재 정적 chip 필터·`uses`/`rating` 표시뿐인 것을 실제 랭킹(인기·신규·품질가중)·검색·추천으로. 어뷰즈/품질 방어 포함. | `public/marketplace.html`(`render()` 정렬·검색 로직), `docs/마켓플레이스/랭킹_큐레이션_규칙.md`(신규) |
| W5 (옵션) | **공급 인벤토리 연동 (inventory-bridge)** | 템플릿 도메인 시드(`recipes.<key>.v2.js`)·1st-party 모델을 진열대 카탈로그로 브리지. 셀러 시드도 동일 스키마·`consolidate_recipes.js` 통과 강제. | `scripts/consolidate_recipes.js` 확장 또는 신규 `scripts/build_marketplace_catalog.js`, `public/marketplace.html` 데이터 소스 교체 |

**한 줄 붙여넣기 문구**는 §7에. (지금은 붙여넣지 말 것 — 활성화 후.)

분해 근거: 공급측은 (입점 W1)·(돈 흐름 W2/W3)·(노출 W4)·(인벤토리 W5)로 자연 병렬화되며, 각 워커는 서로 다른 mock 진입점(`openSell`/earnings/MODELS/`render`)에 1:1로 매핑되어 충돌 없이 동시 진행 가능.

---

## 3) 공유 백본 / _STATUS (보류 상태 추적)

이 도메인 보드: **`docs/마켓플레이스/_STATUS.md`** (디렉터리·파일 신규 생성). 템플릿 총지휘의 `docs/섹션명령서/_STATUS.md` 패턴을 그대로 따른다.

보드가 추적할 것 (지금은 거의 전부 `보류/dormant`):
1. **활성화 게이트 상태** — 2차 활성화 트리거 충족 여부(§아래).
2. **핸드오프 원장 동기화** — `BACKEND_HANDOFF.md §7`의 3개 항목, §5 결제, §6 costMeter 진행 상태를 미러링.
3. **mock 잠금 점검** — marketplace가 여전히 publish가 아닌 waitlist만 받는지(회귀 방지).
4. **워커 상태** — W1~W5 전부 `dormant`인지, 활성화 시 어디까지 갔는지.

자동 점검 방법(스크립트 없이 즉시 가능 — 회귀·잠금 확인용 그렙):
```
# 1) 공급측이 여전히 waitlist 잠금인지 (publish 권유로 새지 않았는지)
grep -n "Join the waitlist\|opening soon\|openSell" public/marketplace.html
# 2) 진열 모델이 전부 1st-party(official)인지 — 유저 모델 유출 점검
grep -c "official:true" public/marketplace.html      # MODELS 개수와 같아야 함
# 3) earnings/정산이 아직 mock 하드코딩인지
grep -n "const ITEMS=\|70% revenue\|2026-07-01" public/earnings.html
# 4) 백엔드 §7 핸드오프 항목 추적
grep -n "마켓플레이스·공급측\|페이아웃(70/30)\|1st-party 모델 100%" docs/BACKEND_HANDOFF.md
```
**2차 활성화 트리거(이 중 게이트 통과 시 Chief에 활성화 제안)**: ① 수요측(스튜디오) E2E 운영 + DAU/리텐션 검증 ② Stripe Connect/PayPal Payouts + PG가맹·KYC 완료(그로스 의존) ③ 셀러 심사·약관·라이선스 법무 정리 ④ costMeter 실원가 수집 완료(정산 단가 산정 가능). 4개 미충족 동안은 `보류` 유지.

---

## 4) Chief에 보고할 _STATUS 요약 형태

```
[마켓플레이스/공급] 상태: 보류(출시 1차 비활성) — 유저 발행 2차 결정 대기
- mock 잠금: OK (marketplace=waitlist만, MODELS 전부 official, earnings=하드코딩)  [점검일 YYYY-MM-DD]
- 활성화 게이트 4개: 수요E2E ☐ / 정산인프라·PG가맹 ☐(그로스 의존) / 법무·약관 ☐ / costMeter실원가 ☐
- 핸드오프 원장(BACKEND_HANDOFF §7): 셀러신청 ☐ / 정산70-30 ☐ / 라이선스발급 ☐  (전부 백엔드 미착수)
- 워커 W1~W5: 전부 dormant(정의됨, 미착수)
- 블로커/의존: 정산 활성화는 그로스의 PG가맹·KYC 선행 필요
- 결정 요청: 활성화 트리거 4개 중 N개 충족 → 2차 가동 여부 Chief 판단 요망
```

---

## 5) 완료 기준(DoD) — **보류 단계 DoD**

보류 단계에서 이 도메인의 "완료"는 _기능 완성_이 아니라 _깨끗한 보류 상태_다:
- [ ] `docs/마켓플레이스/_STATUS.md` 생성 — 활성화 게이트·핸드오프 원장·워커 dormant 상태 기록.
- [ ] `marketplace.html` 공급측이 publish가 아닌 **waitlist만** 받는지 확인(회귀 없음). MODELS 전부 `official:true` 확인.
- [ ] `earnings.html`은 공개 네비에 노출 안 됨(링크 진입만) 확인 — 활성화 전 셀러 대시보드 미오픈.
- [ ] `BACKEND_HANDOFF.md §7` 항목이 _STATUS 원장에 미러링되어 한 곳에서 추적됨.
- [ ] 2차 활성화 트리거 4개 정의·현재값 기록, Chief에 신호.
- [ ] W1~W5 워커 정의·산출물 경로 예약(파일 생성은 활성화 후) — `_STATUS`에 dormant 표기.
- [ ] (커밋 금지 사항 없음 — 문서 1개 추가뿐. 머지/푸시는 Chief.)

> **활성화 후 DoD(예약):** W1~W5 산출물 실연동 + 셀러 첫 입점→심사→publish→사용→정산 페이아웃 E2E + `consolidate_recipes.js` 기반 심사 게이트 통과 + 랭킹/discovery 동작 + 1st-party 100%·3rd-party 70/30 검증.

---

## 6) 총지휘 세션 붙여넣기 문구 (1줄, `~/HeyHoAI` 기준)

> "`~/HeyHoAI`에서 `docs/세션조직/<이 파일>.md`(마켓플레이스/공급 총지휘 명령서)와 `docs/BACKEND_HANDOFF.md` §5·§6·§7을 읽고 **마켓플레이스/공급 도메인 총지휘**를 맡아. **이 도메인은 출시 1차 비활성(유저 발행 2차 결정)** 이니 구현하지 말고: ① `docs/마켓플레이스/_STATUS.md`를 만들어 보류 상태·핸드오프 원장·활성화 게이트 4개를 기록하고, ② §3의 그렙으로 marketplace가 여전히 waitlist 잠금이고 MODELS가 전부 official인지 점검하고, ③ W1~W5 워커를 dormant로 정의만 한 뒤 §4 형식으로 Chief에 보고해. 워커는 깨우지 마. 커밋/푸시는 하지 마(Chief가 머지)."

---

## 7) 워커 세션 붙여넣기 문구 모음 (활성화 후에만 사용)

- **W1 seller-onboarding** — "`~/HeyHoAI`(브랜치 feat/ux-monetization-v2). 마켓플레이스 공급측 활성화. `public/marketplace.html`의 `openSell/submitSell` waitlist 모달을 **실제 셀러 신청·심사 파이프라인**으로 승격하고, 심사 게이트는 `scripts/consolidate_recipes.js` 검증을 재사용해. 정책은 `docs/마켓플레이스/셀러심사_정책.md`에 적고 `BACKEND_HANDOFF.md §7-1`을 갱신해. **파일만 저장, commit/push 금지.**"
- **W2 payouts** — "`~/HeyHoAI`. `public/earnings.html`을 실사용량 기반 **70/30 정산·월 페이아웃**으로 와이어링(크레딧→통화 환산, Stripe/PayPal, 1st-party 100%). 단가 근거는 `src/studio/costMeter.js`(§6). 명세는 `docs/마켓플레이스/정산_70_30_명세.md`, `BACKEND_HANDOFF.md §7-2` 갱신. **파일만 저장, commit/push 금지.**"
- **W3 models-license** — "`~/HeyHoAI`. `public/marketplace.html`의 `MODELS` mock과 `lic()`를 실제 **가상모델 라이선스**로: Standard(◈/use·non-exclusive)·Exclusive($/mo·locked, 보유 중 진열 제거)·1st-party 100% 수취. 명세 `docs/마켓플레이스/라이선스_티어_명세.md`. **파일만 저장, commit/push 금지.**"
- **W4 curation-ranking** — "`~/HeyHoAI`. `public/marketplace.html`의 `render()`를 정적 chip 필터에서 **실제 랭킹·검색·discovery**(인기/신규/품질가중 + 어뷰즈 방어)로 확장. 규칙 `docs/마켓플레이스/랭킹_큐레이션_규칙.md`. **파일만 저장, commit/push 금지.**"
- **W5 inventory-bridge** (옵션) — "`~/HeyHoAI`. 템플릿 시드(`src/recipes/seeds/recipes.<key>.v2.js`)·1st-party 모델을 진열 카탈로그로 브리지하는 `scripts/build_marketplace_catalog.js`를 만들고 `public/marketplace.html` 데이터 소스를 교체. 셀러 시드도 동일 §스키마·`consolidate_recipes.js` 통과 강제. **파일만 저장, commit/push 금지.**"

---

## 공통 규칙 (인용)
- **조직**: 👑총최고관리자(Chief) → 도메인 총지휘들 → 워커 세션들. 세션끼리 메모리 비공유 → **공유 백본 = 레포 파일시스템**(각 도메인은 자기 `_STATUS` 보드를 가지며 Chief가 취합).
- **git**: 워커 = 파일만 저장(commit/push 금지). 각 도메인 총지휘가 자기 도메인 git, **최종 머지/릴리스는 Chief**. 브랜치 `feat/ux-monetization-v2`(mock 단계, push는 사용자 승인). 강제푸시 금지.
- **선례 패턴**: 🎨 템플릿 총지휘 = `docs/섹션명령서/00_총지휘_종합관리.md`(워커 11 + `scripts/consolidate_recipes.js` + `_STATUS.md`). 이 패턴(총지휘+워커+_STATUS+붙여넣기)을 그대로 따른다.
- **현 상태**: 프론트/UX는 mock 대부분 완료, 백엔드·엔진 미연결(`docs/BACKEND_HANDOFF.md` 대기), 그로스는 배포·PG가맹·리스팅 진행 중. **이 도메인은 그중 출시 1차 비활성 = 보류 스텁.**

(참고 파일 — 모두 절대경로: `/Users/jeon-yedam/HeyHoAI/public/marketplace.html`, `/Users/jeon-yedam/HeyHoAI/public/earnings.html`, `/Users/jeon-yedam/HeyHoAI/public/affiliate.html`, `/Users/jeon-yedam/HeyHoAI/docs/BACKEND_HANDOFF.md` §5·§6·§7, `/Users/jeon-yedam/HeyHoAI/docs/섹션명령서/00_총지휘_종합관리.md`, `/Users/jeon-yedam/HeyHoAI/scripts/consolidate_recipes.js`. 보드 생성 위치: `/Users/jeon-yedam/HeyHoAI/docs/마켓플레이스/_STATUS.md`.)
