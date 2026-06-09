# 📈 그로스/GTM 총지휘 — 세션 명령서

> 너는 **그로스/GTM 도메인 총지휘(orchestrator) 세션**이다. 마케팅·SEO·가격전략·결제가맹·리스팅·인플루언서 시딩·라이프사이클(이메일)을 책임지는 3~6개 워커 세션을 **수거·검증·종합·관리**한다.
> 제품 = **Doppia**(셀카/제품 1장 → 템플릿 → 스튜디오급 사진·릴스 SaaS, 도메인 `doppia.ai`). 작업 디렉터리 `~/HeyHoAI`, 브랜치 `feat/ux-monetization-v2`(PR #8). 세션끼리 메모리 비공유 → **공유 백본 = 레포 파일시스템.** 이 패턴은 이미 가동 중인 🎨템플릿 총지휘(`docs/섹션명령서/00_총지휘_종합관리.md` + `scripts/consolidate_recipes.js` + `_STATUS.md`)를 그대로 따른다.

---

## 0) 역할 (한 문단)

획득(SEO·콘텐츠·퍼포먼스광고)부터 **전환·추출(가격·패키징)**, **결제 인프라(PG·카드사 가맹·App Store/Shopify 리스팅)**, **확장(인플루언서 시딩·파트너십)**, **라이프사이클(이메일·CRM)**까지 Doppia의 시장진입 전 과정을 총괄한다. 핵심 책임은 두 가지다. (1) **운영가 확정** — 엔진의 `src/studio/costMeter.js`가 뱉는 건당 실원가(COGS)를 받아 목표 마진으로 크레딧 단가·플랜가를 정하고, 단일 소스 `public/js/pricing.js`(향후 `GET /api/pricing`) **한 곳만** 갱신해 landing·billing·studio 전 페이지에 일관 반영한다. (2) **런칭·가맹 체크리스트 종료** — 배포(Netlify/도메인), Stripe(또는 국내 PG)·카드사 가맹, App Store/Shopify 앱 리스팅, 인플루언서 시딩, 이메일 라이프사이클을 진행상태 보드(`docs/그로스/_STATUS.md`)로 추적해 Chief에 보고한다. 현재 프론트/UX는 mock 대부분 완료, 백엔드·엔진은 미연결(`docs/BACKEND_HANDOFF.md` 대기), 그로스는 **배포·PG가맹·리스팅 진행 중**이다.

---

## 1) 범위 & 책임 영역 (실제 파일/디렉터리 인용)

- **가격 단일 소스**: `public/js/pricing.js`의 `window.PRICING`. 현재 값은 전부 **추정 placeholder**(`docs/BACKEND_HANDOFF.md` §3): Free $0/◈10, Creator $19/◈250, Pro $39/◈600(featured), Brand $79/◈1,400(Commercial). 팩 $5/◈50($0.10) → $110/◈1,500+250($0.063, best). Team $199/3seat/◈2,000풀/+$15석. `firstMonthOff:50`(24h 첫 결제). **DOM에 숫자 박지 말고** `<span data-dp="creator.cr" data-fmt="1">` + `applyDP()`로 채운다 — 이 규약을 깨면 단일 소스가 무너진다.
- **원가 근거 엔진**: `src/studio/costMeter.js`(순수모듈 — `estimateJobCost`·`computeMargin`·`PROVIDER_COSTS`·`CREDIT_USD=0.10`·`GENERATION_COSTS_SQL`). 현 단가표: image nano-banana $0.04/장, reel kling $0.25, 4K +$0.03, caption(claude) $0.003, UGC 립싱크 +$0.12. **운영가 확정 = 실제 프로바이더 청구를 `PROVIDER_COSTS`에 넣고 → `computeMargin`으로 SKU별 마진 → `PRICING` 세팅**(구독 단가 < 팩 단가 유지 = 카니발 방지).
- **현 SKU 가격(UI 확정)**: photo=◈2, reel=◈6, UGC=◈8, +4K/HD/캡션/워터마크제거 애드온(`docs/BACKEND_HANDOFF.md` §2). 게이팅: 무료=첫 1개만 워터마크 無, 상업 라이선스=Brand, 브랜드킷·4K·다국어캡션 always-on=Pro+.
- **랜딩/카피(SEO·메시징)**: `public/landing.html` — `<title>Doppia — Your face. Any look. Auto content.</title>`, H1 `Your face. Any look. / Content on autopilot.`, 3-페르소나 스위처(creators/brands/business, line 377~386), 가격 섹션(line 318~). **누락: meta description·og:·canonical·JSON-LD·sitemap·robots** → SEO 워커 핵심 작업.
- **결제·체크아웃 mock**: `public/billing.html`(`checkout()`·team band·auto top-up), `studio.html`(`paywallTopup`/`paywallTopupSmall`/`paywallSub`, 24h 50%, ◈2 부족 시 $5 소액). 전부 `HH.toast` mock → Stripe Checkout/Customer Portal 연결 대기.
- **리스팅·파트너십 면**: `public/business.html`(API & Shopify 탭 — `POST https://api.doppia.ai/v1/render`, "Install on Shopify" mock / Team / White-label 4티어), `public/marketplace.html`(셀러 온보딩·가상모델 라이선스 Standard/Exclusive·70% 수익분배 waitlist), `public/affiliate.html`(30% recurring 12개월), `public/earnings.html`(70/30 정산).
- **라이프사이클 신호원**: `public/js/hh.js` — `hh_first_seen`(24h 오퍼 윈도우), `hh_credits`/`hh_plan`. 이메일 트리거(가입·첫결과·잔액소진·24h만료·구독전환)는 이 신호에 매핑.
- **수익 진단 백본**: `docs/감사_v2_수익분석.md`(14페르소나 LTV·MRR ~$505·Top무브) + `docs/감사_v3_doppia_재감사.md`. **최대 누수 = "전환은 되나 right-tier 추출·글로벌·B2B·마켓공급에서 샘"** → GTM 우선순위의 근거.

---

## 2) 하위(워커) 세션

각 워커 = **파일만 저장(commit/push 금지)**. 총지휘가 git·머지 담당. 도메인을 병렬화 가능한 5개로 분해한다.

### W1 · SEO/콘텐츠
- **목적**: landing의 메타/구조화데이터/카피 SEO 최적화 + 검색·블로그 콘텐츠 자산 설계.
- **산출물**: `public/landing.html`(meta description·og:·twitter:·canonical·JSON-LD SoftwareApplication 주입), `public/sitemap.xml`, `public/robots.txt`, `docs/그로스/seo_keyword_content_plan.md`(타깃 키워드·페르소나별 LP·블로그 캘린더).
- **붙여넣기**: `~/HeyHoAI에서 docs/그로스/01_seo_content.md를 읽고 SEO/콘텐츠 워커를 맡아. public/landing.html에 meta description·og:·canonical·JSON-LD를 주입하고 sitemap.xml·robots.txt를 만들고, 키워드·콘텐츠 플랜을 docs/그로스/seo_keyword_content_plan.md에 저장해. 가격 카피는 절대 하드코딩 말고 data-dp 규약 유지. 커밋·push 금지, 파일만 저장.`

### W2 · 퍼포먼스 광고
- **목적**: Meta/TikTok/Google 광고 세트·크리에이티브 앵글·전환추적 설계(획득). 24h 50% 오퍼와 정합.
- **산출물**: `docs/그로스/performance_ads_plan.md`(채널별 예산·CAC목표·페르소나 앵글·UTM 규약), `public/js/analytics.js`(GA4/Pixel/conversion 이벤트 스텁 — `signup`/`first_render`/`checkout`).
- **붙여넣기**: `~/HeyHoAI에서 docs/그로스/02_performance_ads.md를 읽고 퍼포먼스광고 워커를 맡아. 채널별 광고플랜을 docs/그로스/performance_ads_plan.md에, 전환추적 이벤트 스텁을 public/js/analytics.js에 작성해. 이벤트 명세는 hh.js의 hh_first_seen·hh_plan 신호와 정합. 커밋·push 금지, 파일만 저장.`

### W3 · 파트너십 (PG·카드사·Shopify·App Store)
- **목적**: 결제 가맹·앱 리스팅·임베드 파트너 **체크리스트와 신청 메타데이터** 완성(가맹 진행).
- **산출물**: `docs/그로스/launch_merchant_checklist.md`(Stripe/국내PG 가맹서류·카드사 승인·세금·환불정책·Customer Portal), `docs/그로스/listing_shopify_appstore.md`(Shopify App Store·iOS/Android 리스팅 카피·스크린샷·심사 가이드라인 대응), `public/business.html`의 Shopify/API 카피 검수.
- **붙여넣기**: `~/HeyHoAI에서 docs/그로스/03_partnership.md를 읽고 파트너십 워커를 맡아. PG·카드사 가맹 체크리스트를 docs/그로스/launch_merchant_checklist.md에, Shopify/App Store 리스팅 메타·심사대응을 docs/그로스/listing_shopify_appstore.md에 작성해. public/business.html의 API·Shopify 카피와 정합 확인. 커밋·push 금지, 파일만 저장.`

### W4 · 가격·패키징 GTM
- **목적**: **costMeter 실원가 → 운영가 확정**. 마진 모델·플랜/팩/팀 가격·카니발 방지·게이팅 정합.
- **산출물**: `public/js/pricing.js`(`PRICING` 운영가로 갱신 — placeholder 대체), `docs/그로스/pricing_margin_model.md`(SKU별 COGS·마진표·민감도, costMeter 출력 인용), `scripts/check_pricing.js`(아래 §3 자동점검 스크립트).
- **붙여넣기**: `~/HeyHoAI에서 docs/그로스/04_pricing_gtm.md를 읽고 가격·패키징 워커를 맡아. src/studio/costMeter.js의 estimateJobCost·computeMargin으로 SKU별 마진을 산출해 docs/그로스/pricing_margin_model.md에 정리하고, 그 결과로 public/js/pricing.js의 PRICING을 운영가로 확정해. 구독단가<팩단가(카니발 방지)·게이팅 정합 유지. scripts/check_pricing.js도 작성. 커밋·push 금지, 파일만 저장.`

### W5 · 라이프사이클·CRM (이메일)
- **목적**: 트랜잭셔널+라이프사이클 이메일 시퀀스(전환·리텐션·확장). 어필리에이트/정산 알림 포함.
- **산출물**: `docs/그로스/lifecycle_email_sequences.md`(트리거→메시지 매트릭스: 가입웰컴·첫결과·잔액소진·24h만료·구독전환·right-tier업셀·affiliate payout), `src/lifecycle/email.templates.js`(이벤트별 제목·본문 템플릿 스텁, ANTHROPIC_API_KEY로 다국어 캡션 패턴 재사용 가능).
- **붙여넣기**: `~/HeyHoAI에서 docs/그로스/05_lifecycle_crm.md를 읽고 라이프사이클·CRM 워커를 맡아. 트리거기반 이메일 시퀀스를 docs/그로스/lifecycle_email_sequences.md에, 템플릿 스텁을 src/lifecycle/email.templates.js에 작성해. 트리거는 hh.js 신호(hh_first_seen 24h·hh_plan)와 감사_v2_수익분석.md의 right-tier 업셀에 매핑. 커밋·push 금지, 파일만 저장.`

---

## 3) 공유 백본 / _STATUS

- **보드 파일**: `docs/그로스/_STATUS.md` — 워커 5개 산출 현황표 + 가맹·리스팅 체크리스트 + 이슈. 🎨템플릿의 `_STATUS.md`와 동형.
- **자동 점검 스크립트**: `scripts/check_gtm.js`(총지휘가 만들거나 W4가 보조). 다음을 자동 스캔해 콘솔 대시보드 + `docs/그로스/_STATUS.md`를 생성한다(exit 0=클린, 1=이슈):
  1. **산출물 존재** — 위 §2의 각 파일 경로 존재 여부.
  2. **가격 단일 소스 무결성** — `grep`로 `landing.html`/`billing.html`/`studio.html`에 **하드코딩 가격($19/$39/$79/◈250 등) 누수** 검출(반드시 `data-dp` 경유여야 함).
  3. **카니발 방지** — `PRICING`에서 *구독 환산 크레딧단가 < 팩 최저단가($0.063)* 검증, 게이팅(상업=Brand·4K/브랜드킷=Pro+) 라벨 정합.
  4. **마진 가드** — `node -e "require('./src/studio/costMeter.js')"`로 SKU별 `computeMargin` 호출, 적자(marginPct<0) SKU 경고.
  5. **런칭 체크리스트** — `launch_merchant_checklist.md`·`listing_shopify_appstore.md`의 `- [ ]`/`- [x]` 카운트로 진행률(%) 산출.
- **수동 점검(스크립트 전까지)**: `grep -rnE '\$(19|39|79|199)|◈\s?(250|600|1,?400)' public/*.html` 로 가격 하드코딩 누수 확인. `node scripts/consolidate_recipes.js`는 템플릿 도메인용이니 그쪽 _STATUS는 건드리지 않는다.
- **갱신 루틴**: 워커가 산출 떨굴 때마다 `node scripts/check_gtm.js` 재실행 → `_STATUS.md`로 진행률·이슈 즉시 파악 → 이슈는 해당 워커에 피드백(파일이 1차, 실시간은 `mcp__ccd_session_mgmt__send_message`).

---

## 4) Chief에 보고할 _STATUS 요약 형태

```
## 📈 그로스/GTM — _STATUS (자동: node scripts/check_gtm.js)
워커 4/5 OK · 운영가 확정: 진행중 · 가맹: 60% · 리스팅: 40%
| 워커 | 상태 | 산출물 | 비고 |
|---|---|---|---|
| W1 SEO/콘텐츠      | OK   | landing meta·JSON-LD·sitemap | description 주입 완료 |
| W2 퍼포먼스광고    | OK   | performance_ads_plan·analytics.js | UTM 규약 확정 |
| W3 파트너십        | 진행 | merchant_checklist 60%·listing 40% | 카드사 승인 대기 |
| W4 가격·패키징     | OK   | pricing.js 운영가·margin_model | 적자 SKU 0 |
| W5 라이프사이클    | OK   | email_sequences·templates | 8 트리거 |
이슈: 카드사 가맹 승인 대기 · App Store 스크린샷 미제작
블로커(Chief): /api/pricing 백엔드 연동 = BACKEND_HANDOFF §3 대기
```

---

## 5) 완료 기준 (DoD) 체크리스트

- [ ] `node scripts/check_gtm.js` → 이슈/가격 하드코딩 누수/적자 SKU 0 (또는 의도된 예외 승인 기록).
- [ ] **운영가 확정**: `public/js/pricing.js`가 costMeter 실원가 기반 운영가로 갱신(placeholder 제거), `docs/그로스/pricing_margin_model.md`에 근거 기록. 구독 < 팩 단가 유지.
- [ ] **SEO**: `landing.html`에 meta description·og:·canonical·JSON-LD, `sitemap.xml`·`robots.txt` 배치.
- [ ] **퍼포먼스**: 채널 플랜 + `public/js/analytics.js` 전환이벤트(signup/first_render/checkout) 스텁.
- [ ] **가맹/리스팅**: `launch_merchant_checklist.md`·`listing_shopify_appstore.md` 체크리스트 100%(또는 외부 승인대기 항목 명시).
- [ ] **라이프사이클**: 트리거 매트릭스 + `src/lifecycle/email.templates.js` 스텁.
- [ ] 모든 가격이 `data-dp` 경유(하드코딩 0), 게이팅(상업=Brand·4K/브랜드킷=Pro+) 정합.
- [ ] 도메인 git: 워커 산출 정리·도메인 단위 커밋. **최종 머지/릴리스는 Chief**(push는 사용자 승인 후, 강제푸시 금지).

---

## 6) 총지휘 세션 붙여넣기 문구 (1줄)

> `~/HeyHoAI에서 docs/그로스/00_총지휘_GTM.md를 읽고 그로스/GTM 도메인 총지휘를 맡아. W1~W5 워커 산출(SEO·퍼포먼스·파트너십·가격·라이프사이클)을 scripts/check_gtm.js로 수거·검증해 docs/그로스/_STATUS.md로 관리하고, src/studio/costMeter.js 실원가로 public/js/pricing.js 운영가를 확정한 뒤, 가맹·리스팅 체크리스트까지 종료하고 도메인 단위로 커밋해(머지·push는 Chief/사용자 승인).`

---

## 7) 워커 세션 붙여넣기 문구 모음

- **W1 SEO/콘텐츠** — `~/HeyHoAI에서 docs/그로스/01_seo_content.md를 읽고 SEO/콘텐츠 워커를 맡아. public/landing.html에 meta description·og:·canonical·JSON-LD 주입, sitemap.xml·robots.txt 생성, 키워드/콘텐츠 플랜을 docs/그로스/seo_keyword_content_plan.md에 저장. 가격은 data-dp 규약 유지(하드코딩 금지). 커밋·push 금지, 파일만 저장.`
- **W2 퍼포먼스광고** — `~/HeyHoAI에서 docs/그로스/02_performance_ads.md를 읽고 퍼포먼스광고 워커를 맡아. docs/그로스/performance_ads_plan.md(채널·예산·CAC·UTM)와 public/js/analytics.js(signup/first_render/checkout 이벤트 스텁)를 작성. hh.js 신호와 정합. 커밋·push 금지, 파일만 저장.`
- **W3 파트너십** — `~/HeyHoAI에서 docs/그로스/03_partnership.md를 읽고 파트너십 워커를 맡아. PG·카드사 가맹 체크리스트(docs/그로스/launch_merchant_checklist.md), Shopify/App Store 리스팅·심사대응(docs/그로스/listing_shopify_appstore.md) 작성. public/business.html 카피와 정합. 커밋·push 금지, 파일만 저장.`
- **W4 가격·패키징** — `~/HeyHoAI에서 docs/그로스/04_pricing_gtm.md를 읽고 가격·패키징 워커를 맡아. src/studio/costMeter.js로 SKU 마진 산출(docs/그로스/pricing_margin_model.md), public/js/pricing.js를 운영가로 확정(구독<팩, 게이팅 정합), scripts/check_pricing.js 작성. 커밋·push 금지, 파일만 저장.`
- **W5 라이프사이클·CRM** — `~/HeyHoAI에서 docs/그로스/05_lifecycle_crm.md를 읽고 라이프사이클·CRM 워커를 맡아. 트리거 이메일 시퀀스(docs/그로스/lifecycle_email_sequences.md)와 src/lifecycle/email.templates.js 스텁 작성. 트리거는 hh.js(24h·plan)·감사_v2 right-tier 업셀에 매핑. 커밋·push 금지, 파일만 저장.`

---

## 공통 규칙
- **조직**: 👑총최고관리자(Chief) → 도메인 총지휘들 → 워커 세션들. 세션끼리 메모리 비공유 → **공유 백본 = 레포 파일시스템**(각 도메인은 자기 `_STATUS` 보드를 갖고 Chief가 취합).
- **git**: 워커 = 파일만 저장(commit/push 금지). 도메인 총지휘가 자기 도메인 git, **최종 머지/릴리스는 Chief**. 브랜치 `feat/ux-monetization-v2`(mock 단계, push는 사용자 승인). 강제푸시 금지.
- **패턴 출처**: 🎨템플릿 총지휘 = `docs/섹션명령서/00_총지휘_종합관리.md`(워커 11 + `scripts/consolidate_recipes.js` + `_STATUS.md`). 이 총지휘+워커+_STATUS+붙여넣기 패턴을 그대로 따른다.
- **현 상태**: 프론트/UX는 mock 대부분 완료, 백엔드·엔진 미연결(`docs/BACKEND_HANDOFF.md` 대기 — 특히 §3 `/api/pricing` 연동·§6 costMeter 실원가 로깅이 그로스 운영가 확정의 선행조건), 그로스는 배포·PG가맹·리스팅 진행 중.
