# HeyHoAI Studio — UI 기능 설명서 (전체)

> 작성일: 2026-06-07 · 범위: `public/` 8개 SaaS 페이지 + 공유 디자인시스템 + 원가로깅 모듈
> 미리보기: `http://localhost:4173/landing.html` (launch.json의 `heyhoai-static`)

### 상태 표기
| 기호 | 의미 |
|---|---|
| ⚙️ **동작** | 지금 브라우저에서 실제로 작동(JS 클라이언트 로직). 백엔드 없이도 됨 |
| 🔸 **mock** | UI만 있고 실제 처리는 alert/플레이스홀더. `.env`+백엔드 연결 시 실동작 |
| 📄 **정적** | 표시 전용(클릭 동작 없음) |

### 페이지 지도
`landing`(마케팅) → `login`(가입/로그인) → **`studio`(생성)** · `gallery`(보관함) · `billing`(과금) · `marketplace`(마켓) · `affiliate`(추천) · `business`(B2B)

---

## 0. 공통 요소 (`css/theme.css`, 전 페이지 공유)

> ⚠️ 예외: `landing.html`만 자체 인라인 CSS 사용(독립). 나머지 7페이지는 theme.css 공유.

### 0.1 배경 레이어
- **메시 블롭** 📄 — 보라(좌상)·핑크(우상)·시안(하단) 원형 블러 3개가 `float` 애니메이션(18초)으로 천천히 떠다님. `position:fixed`라 스크롤해도 고정.
- **그레인 텍스처** 📄 — SVG 노이즈 오버레이(opacity 3%). 고급스러운 질감용.

### 0.2 상단 네비게이션 (`nav`)
- **브랜드 로고** ⚙️ — `● HeyHoAI` (그라데이션 점 + 그라데이션 텍스트). 클릭 시 `/landing.html`로 이동.
- **메뉴 링크** ⚙️ — Studio / Market / Gallery / Billing / Business. 현재 페이지는 `active`(흰색) 표시. **화면폭 760px 미만에서는 숨김**(모바일).
- **크레딧 칩** — `◈ 42 credits` + `+ Buy`. 코인(◈)은 골드색. `+ Buy` 클릭 시 `/billing.html` ⚙️. (studio만 잔액이 실시간 변동, 나머지는 표시값 고정 📄)
- sticky + 배경 블러(스크롤 시 상단 고정).

### 0.3 디자인 토큰
- **폰트**: 제목=Sora(800), 본문=Inter.
- **색**: 배경 `#07070c`, 포인트 보라 `#7c6cff`/`#a99bff`, 핑크 `#ff7eb6`, 시안 `#5ee0d6`, 골드 `#ffce7a`.
- **컴포넌트 클래스**: `.glass`(글래스 카드), `.btn-primary`(보라 그라데이션+글로우), `.btn-ghost`(외곽선), `.fade`(진입 시 아래→위 페이드, d1~d4 지연).
- **캐시버스트**: theme.css 링크에 `?v=2`. theme.css 수정 시 이 숫자를 올려야 반영됨.

---

## 1. `landing.html` — 마케팅 랜딩 (영어)

> 비로그인 방문자 첫 화면. 모든 CTA는 `/login.html`로 유도. 자체 CSS 독립 페이지.

### 1.1 네비게이션
- 메뉴 ⚙️: **How it works**(#how), **For creators & brands**(#modes), **Pricing**(#pricing) — 같은 페이지 내 부드러운 스크롤. **Gallery** → `/gallery.html`.
- 우측 ⚙️: **Log in**(외곽선) · **Start free**(보라) — 둘 다 `/login.html`.

### 1.2 히어로
- **라이브 뱃지** 📄 — `● No prompt engineering. Ever.` 시안 점이 깜빡임(pulse).
- **헤드라인** 📄 — "Your face. Any look. / **Content on autopilot.**" (둘째 줄 그라데이션).
- **리드 문구** 📄 — 셀카/제품 1장 → 템플릿 → 스튜디오급 사진·릴스, 정체성 일관 유지.
- **듀얼 CTA** ⚙️ — **Create your first post →**(→login) · **See how it works**(#how 스크롤).
- **마이크로카피** 📄 — "✨ 10 free credits on sign-up · No credit card required".

### 1.3 쇼케이스 (브라우저 목업)
- 📄 맥 브라우저 창(신호등 3색 + `heyhoai.com/studio` URL) 안에 **결과물 타일 8개** 그리드.
- 각 타일: 그라데이션 썸네일 + `▶ REEL`/`▦ PHOTO` 뱃지 + 라벨(Travel·Golden Hour, Editorial Glam, GRWM, Cozy Cafe, Studio Lookbook, Outfit Transition, Lifestyle Mood, Street Style). 호버 시 살짝 떠오름 ⚙️.

### 1.4 로고 스트립
- 📄 "Powered by best-in-class models" + **Nano Banana · FLUX · Runway · Kling · Claude**.

### 1.5 How it works (#how)
- 📄 "Three steps. Zero prompts." + 카드 3개:
  1. **Add your subject** — 셀카(크리에이터)/제품(브랜드) 1장, 정체성 고정.
  2. **Pick a template** — 큐레이션 룩·트렌드 릴스 포맷, 프롬프트/설정 불필요.
  3. **Generate & post** — 수초 내 세트/릴스, 다운로드 또는 인스타 게시.

### 1.6 모드 소개 (#modes)
- 📄 "Built for creators & brands" + 카드 2개:
  - **😎 For Influencers** — 셀카 1장으로 무한 피드. 정체성 고정 / 주간 트렌드 릴스 / 사진+릴스 원클릭.
  - **🛍️ For Shopping & Brands** — 제품샷 → 룩북·라이프스타일·온모델. 배경 자동 제거 / 상업 라이선스 포함.

### 1.7 스탯 바
- 📄 `~20s`(한 포스트까지) · `40+`(큐레이션 템플릿) · `1`(시작 사진) · `0`(작성 프롬프트).

### 1.8 가격 (#pricing)
- 📄 3카드(CTA만 ⚙️→login):
  - **Free $0/mo** — ◈10 체험, 양쪽 모드/표준 화질/워터마크.
  - **Creator $19/mo** (MOST POPULAR 리본) — ◈200/월, 워터마크 없음/릴스/우선 큐/HD.
  - **Brand $79/mo** — ◈1,000/월, 상업 라이선스/온모델/대량 생성.

### 1.9 CTA 밴드 & 푸터
- 📄 "Your next 30 posts are one selfie away." + Start free(→login).
- 📄 푸터: 브랜드+태그라인 / Product·Company·Legal 링크 컬럼 / © 2026.

---

## 2. `login.html` — 로그인 / 회원가입

> 중앙 글래스 카드. 로그인↔가입 한 카드에서 전환.

- **브랜드** ⚙️ — 클릭 시 landing.
- **탭** ⚙️ — `Log in` / `Sign up`. 선택 탭 보라 강조.
- **가입 보너스 배너** ⚙️ — "🎁 Sign up & get 10 free credits". **가입 탭에서만** 표시.
- **입력 필드**:
  - Name 📄(가입 탭에서만 표시 ⚙️)
  - Email ⚙️(필수)
  - Password ⚙️(필수)
  - Confirm password 📄(가입 탭에서만)
- **약관 동의** ⚙️ — 체크박스 "내 얼굴/콘텐츠임을 확인 + Terms·Privacy 동의" (가입 탭에서만). 미체크로 가입 시 경고 alert.
- **제출 버튼** ⚙️ — 텍스트가 탭 따라 `Log in`/`Create account`로 변경. 성공 시 alert 후 `/studio.html` 이동 🔸(실제 인증 없음).
- **Google 로그인** 🔸 — "Continue with Google" → alert(OAuth 미연결).
- **하단 토글** ⚙️ — "New here? Create an account" ↔ "Already have an account? Log in".

---

## 3. `studio.html` — 콘텐츠 생성 (핵심 화면)

> 가입 후 매일 쓰는 작업대. **3모드 × 단계별 위저드 + 하단 고정 생성바**. 크레딧 잔액은 실시간 변동(시작 ◈48).

### 3.1 상단 바
- **모드 토글** ⚙️ — `😎 Influencer` / `🛍️ Shopping` / `📢 UGC Ads`. 전환 시 단계 구성·데이터·번호가 모드에 맞게 재배치.
- **🎨 Brand kit 버튼** ⚙️ — 브랜드킷 모달 열기. 저장하면 버튼에 `ON` 뱃지 표시.

### 3.2 Step 1 — 주체(Subject) 추가
- 제목/힌트가 모드별로 바뀜:
  - Influencer: "Add your face / 셀카 업로드"
  - Shopping: "Add your product / 제품 업로드, 배경 자동 제거"
  - UGC: "Add your spokesperson / 내 얼굴 또는 AI 스포크스퍼슨"
- **업로드 박스** ⚙️ — `＋ Upload selfie/product/face`. 클릭 시 mock 카드 1장 추가 🔸(실제 파일 업로드 아님).
- **주체 카드** ⚙️ — 그라데이션 썸네일 + 이모지 + 이름. 클릭 선택(보라 테두리 + ✓). 모드별 기본 제공: Influencer=My Face / Shopping=White Dress·Sneakers / UGC=My Face·Spokesperson Mia·Leo.

### 3.3 Step 2 — 스크립트 작성 (**UGC 모드 전용**)
- **스크립트 textarea** ⚙️ — 아바타가 말할 대사 입력.
- **톤 선택** ⚙️ — ⚡Energetic / 🤝Trustworthy / 😊Casual / 💎Luxury.
- **✨ AI write script** ⚙️ — 선택한 톤에 맞는 예시 대사 자동 입력 🔸(고정 mock 문장, 실제 Claude 호출 아님).

### 3.4 Step 3 — 템플릿 / 광고 포맷 선택
- **필터 칩** ⚙️ — 모드별 카테고리(예: All/Style/Trend, 화보/감성/착용, Talking/Demo/Reaction).
- **레시피 카드** ⚙️ — 그라데이션 미리보기 + `▦ Photo`/`▶ Reel` 뱃지 + 이름 + `◈ 크레딧`. 클릭 선택.
- 모드별 제공: Influencer 8종(2~6크레딧) / Shopping 6종(2~6, 착용샷 3) / UGC 6종(전부 릴스 8크레딧: Talking-Head·Product Demo·Problem→Solution·Unboxing·Street Interview·Hook+CTA).

### 3.5 생성바 (하단 고정, 2행)
**① 애드온 행**
- **A/B 변형** ⚙️ (**UGC 전용**) — `1 / ×3 / ×5`. 같은 광고를 N개 변형으로 생성, 비용 N배.
- **Quality** ⚙️ — `Standard(+0)` / `HD(+1)` / `4K(+2)`. 결과물에 화질 뱃지 표시.
- **🚫 Remove watermark (+1)** ⚙️ — 워터마크 제거 애드온.
- **⚡ Priority (+1)** ⚙️ — 패스트레인(큐 건너뛰기). 켜면 로딩이 "~6s priority lane"으로 단축.
- **📝 Caption + hashtags (+1)** ⚙️ — 켜면 언어 셀렉트(en/ko/ja/es/pt/zh) 노출. 결과 하단에 다국어 캡션+해시태그 블록 생성 🔸(고정 mock 텍스트).

**② 메인 행**
- **요약** ⚙️ — `템플릿명 → 4 photos/1 reel/N ad variants · cost ◈ 합계 (base + add-ons 내역)`. 선택 안 됐을 땐 안내.
- **Generate ✨** ⚙️ — 주체+템플릿 선택해야 활성화.

### 3.6 생성 동작 & 결과(Step 3 "Your content")
- **비용 계산** ⚙️ — `총액 = 레시피비용 × 변형수 + 애드온합`. 잔액 부족 시 402 경고 🔸, 충분하면 잔액 차감.
- **로딩** ⚙️ — 스피너 + "~20s"(일반) / "⚡ ~6s"(Priority).
- **결과 카드** ⚙️ — 이미지/릴스 카드 N장. 화질 뱃지(HD/4K) / `Variant A·B·C`(A/B시) / `🎨 Brand`(브랜드킷 ON시) 표시. 호버 시 **⬇ Download** · **↗ Post** 🔸(alert).
- **캡션 블록** ⚙️ — 캡션 애드온 ON시 선택 언어로 본문+해시태그+Copy 버튼 🔸.
- **결과 요약** ⚙️ — "N photos/reels · ◈ 합계 used".

### 3.7 브랜드킷 모달
- **로고 업로드** 🔸(alert) · **브랜드 컬러 스와치 5종** ⚙️(선택) · **브랜드 폰트 셀렉트** 📄.
- **Save & apply to all outputs** ⚙️ — 닫고 Brand kit 버튼에 ON 표시 → 이후 결과물에 `🎨 Brand` 뱃지.

---

## 4. `gallery.html` — 결과물 보관함

- **헤더** 📄 — "Your Gallery" + 부제 + `X creations` 카운트(필터 결과 수와 연동 ⚙️).
- **필터 칩** ⚙️ — `All / Photos / Reels / Influencer / Shopping`. 클릭 시 그리드 재구성.
- **결과 카드**(mock 10개) — 그라데이션 썸네일+이모지, `▦ Photo`/`▶ Reel` 뱃지, 릴스엔 중앙 **▶ 재생 오버레이** 📄, 하단 정보(이름 · 날짜 · 모드).
  - 호버 액션 🔸 — **⬇**(다운로드) · **↗**(인스타 게시) · **🗑**(삭제, 빨강) — 전부 alert.
- **빈 상태** ⚙️ — 필터 결과가 0이면 "Nothing here yet" + **Open Studio →** 표시.

---

## 5. `billing.html` — 구독 & 크레딧

- **현재 플랜 배너** 📄 — Current plan: **Creator**, Renews 2026-07-06 · 200 credits/month, `◈ 42 credits left`.
- **월/연 토글** ⚙️ — `Monthly` / `Annual (SAVE 20%)`. 연간 선택 시 가격 스왑: Creator $19→**$15/mo**(+"$182 billed yearly · save $46"), Brand $79→**$63/mo**(+save $190). Free는 $0 고정.
- **구독 플랜 3카드** 📄(버튼만 동작):
  - **Free $0** — 10크레딧(일회성), 양쪽 모드/**Watermarked output**/Standard queue · `Downgrade` 🔸.
  - **Creator $19** (CURRENT 리본) — 200/월, No watermark/Reels/**Priority queue**/HD download · `Your plan`(비활성).
  - **Brand $79** — 1,000/월, **Commercial license**/Shopping+on-model/Bulk generation/Team seats(soon) · `Upgrade` 🔸(checkout alert).
- **크레딧 팩(일회성)** 🔸 — `◈50 $5` / `◈220(200+20보너스) $18` / `◈580(500+80보너스) $40`, 각 `Buy`. 단가 표기($0.10→$0.069로 체감).
- **요금 안내** 📄 — 1 photo set(4)=◈2 · 1 reel(5s)=◈6 · Stripe 보안.
- **Wallet automation — 자동 충전** ⚙️ — 토글. 켜면 설정 활성화: "When below `[20/50/100 credits]` → auto-buy `[50/220/580 팩]`". 끄면 설정 흐려짐. 🔸(실제 결제 미연결)
- **Manage subscription — 해지 대신 일시정지** ⚙️ —
  - **⏸ Pause subscription** → "Subscription paused" 안내 박스 표시.
  - **Cancel** → 확인창에서 **pause를 먼저 권유**(이탈 방어). 확인=일시정지, 취소=해지 진행 alert 🔸.

---

## 6. `marketplace.html` — 마켓플레이스

- **크리에이터 배너** 📄 — "🎨 Sell your templates & models", **70% revenue share** 강조 · `Become a creator` 🔸.
- **탭** ⚙️ — `🧩 Templates` / `👤 Virtual Models`.

### 6.1 Templates 탭
- **필터 칩** ⚙️ — All / Influencer / Shopping / UGC.
- **템플릿 카드**(8개) 📄 — 썸네일+타입 뱃지(Photo/Reel/Ad), 이름, `by @크리에이터`, `⭐평점 · 사용수`, `◈가격 /use`, **Use** 버튼 🔸(alert: 스튜디오 적용+크리에이터 수익분배).

### 6.2 Virtual Models 탭
- 필터 숨김. **모델 카드**(6개) 📄 — `STANDARD`(◈3/use) 또는 `EXCLUSIVE`(골드 뱃지, $49/mo), 이름, `⭐ · licensed 수`, **License** 버튼 🔸.

- **하단** ⚙️ — "Join the affiliate program →" → `/affiliate.html`.

---

## 7. `affiliate.html` — 추천(어필리에이트) 프로그램

- **헤더** 📄 — "Affiliate program" + "30% recurring 12개월".
- **추천 링크 박스** — `heyhoai.com/r/yedam` + **⧉ Copy link** ⚙️(클립보드 복사 시도 + alert).
- **실적 스탯 4개** 📄 — 128 Clicks / 34 Sign-ups / 19 Active subs / **$412 Earned**(골드).
- **How it works** 📄 — 3단계: ①Share your link(60일 추적) ②They subscribe ③You earn 30%(12개월).
- **지급 정보 바** 📄 — Next payout 2026-07-01 / Pending $86 / Lifetime earned $1,240 / Payout: Stripe·PayPal.

---

## 8. `business.html` — B2B (팀 & 브랜드)

- **헤더** 📄 — "For teams & brands".
- **탭** ⚙️ — `🔌 API & Shopify` / `👥 Team` / `🏷️ White-label` / `📅 Schedule & Analytics`.

### 8.1 API & Shopify
- **API access 카드** — `Brand plan` 뱃지, **API 키**(`sk_live_••••3f9a`) + **Reveal** ⚙️(마스킹 토글)/**Regenerate** 🔸, **코드 예제**(POST /v1/render, 신택스 하이라이트) 📄, **사용량 미터** `3,810/10,000 calls` 📄.
- **Shopify 앱 카드** 🔸 — 카탈로그 → 룩북/온모델/릴스 대량생성, 신상품 자동 동기화. `Install on Shopify`(alert).

### 8.2 Team
- **멤버 목록** 📄 — You(**Owner** 골드 뱃지) / Mina Park(Editor) / Dan Lee(Editor) / Sora Kim(Viewer). `+ Invite member` 🔸.
- **공유 크레딧 풀** 📄 — `◈ 1,000 / month`, 오너가 충전·한도 관리.

### 8.3 White-label (에이전시)
- 📄 5기능: 커스텀 도메인+로고/컬러 테마 · 클라이언트 워크스페이스 분리 · 크레딧/플랜 마크업 · 통합 청구+클라이언트별 리포트 · 우선 지원/온보딩.
- `From $499/mo + usage` · `Request white-label` 🔸.

### 8.4 Schedule & Analytics
- **성과 스탯 4개** 📄 — 214 Posts(▲18%) / 1.2M Reach(▲24%) / 6.8% Engagement(▲1.3pt) / 3.1k Link clicks(▲9%).
- **참여도 막대 차트** 📄 — 최근 7일(요일별 막대).
- **콘텐츠 캘린더** 📄 — 주간 그리드 + 예약 포스트 칩(Reel·Photo·UGC ad·Carousel + 시간). `+ Schedule post` 🔸.

---

## 9. 참고 — 백엔드 모듈 (UI 아님)

- **`src/studio/costMeter.js`** — 생성당 원가/마진 계산(순수 함수). `estimateJobCost`·`computeMargin`·`meterGeneration`·`GENERATION_COSTS_SQL`·`logCost`. `node src/studio/costMeter.demo.js`로 검증 가능(SKU별 마진·적자 감지).

---

## 부록 A — 크레딧 / 요금 한눈에

| 항목 | 크레딧/가격 |
|---|---|
| 사진 세트(4장) | ◈2 |
| 릴스(5초) | ◈6 |
| UGC 광고(릴스, 립싱크) | ◈8 |
| 애드온 | HD +1 · 4K +2 · 워터마크제거 +1 · Priority +1 · 캡션 +1 |
| A/B 변형 | 비용 × 변형수(×3/×5) |
| 플랜 | Free $0(◈10) · Creator $19(◈200) · Brand $79(◈1,000) |
| 연간 | 20% 할인 (Creator $15/mo · Brand $63/mo) |
| 크레딧 팩 | ◈50 $5 · ◈220 $18 · ◈580 $40 |

## 부록 B — mock → 실제 연결에 필요한 것

| 영역 | 지금(mock) | 실동작 조건 |
|---|---|---|
| 로그인/가입 | alert 후 이동 | auth API + JWT, `.env` |
| 생성(Generate) | setTimeout + 그라데이션 | 엔진(images/videos) 연결 + costMeter 적재 |
| 결제/구독/팩/자동충전 | alert | Stripe 키 + billing API |
| 캡션/번역 | 고정 문장 | Claude 호출(ANTHROPIC_API_KEY) |
| 파일 업로드 | mock 카드 | multer + 스토리지 |
| 마켓/affiliate/팀/API키 | 표시·alert | DB + 각 도메인 API |

> 전부 로컬, git **커밋/푸시 안 함**(개발 중 규칙). 백엔드 연결은 "UI-first → 백엔드 끼우기" 순서로 진행.
