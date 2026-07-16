# 랜딩 재설계 (2026-07-17) — 다음 세션 진입점

> `upstream/main = 80fb3a7`. 7커밋 전부 푸시됨. **미배포.**

## 이 폴더

| 파일 | 뭔가 |
|---|---|
| `진실원장.md` (127KB) | **가장 중요.** 11도메인 코드 검증 원장 — 팔 수 있는 참인 주장 107 · 랜딩 거짓 105 · 미개발 자산 62 · 도메인별 SURPRISES 11. **랜딩에 문장을 쓰기 전에 여기서 근거를 찾아라.** 여기 `verdict=TRUE`로 없는 주장은 못 쓴다. |
| `확정결정.md` | 사용자가 확정한 결정. **원장·다른 docs와 충돌하면 이게 이긴다.** |
| `구조명세.md` | 34에이전트 워크플로(8차원 해체 → 백지 재설계 5안 → 적대심사 20건 → 종합) 산출. 10섹션 + 미결 12건. |

⚠️ 원장의 숫자도 **코드로 재확인할 것**. 원장이 자기모순인 곳이 있다(`ad_video` SURPRISE는 "fully live", `credit_economy`는 ":2927에서 blocked" — 정답은 live).

## 오늘 한 것

```
80fb3a7  앱 한국어 사전 구멍 메움 — 8페이지 미번역 0 (사전 580→644)
653950e  한국어 랜딩 /ko — 121슬롯 프리렌더 + 런타임 조립 lang 분기
8ae528a  /ko 배선 — SEO(canonical·hreflang·og 전부 신설) · 언어 스위처 · data-i18n · 빌드 파이프라인
f8f6d12  TRUST 섹션 — AWS 서울 + 벤더 공개
a83a1c7  가격 — 월/연 전환(priceY 16~17% 할인, 코드에 있는데 안 팔고 있었다)
842f535  구조 재설계 — 독자 질문 사다리 10섹션 + 거짓 전량 제거
f21ed73  거짓 제거 — 보장문 4곳·누끼·게시연동 + 갤러리 Apparel 4타일 정화
```

**척추 교체**: "프롬프트 안 씀"(섹션 헤딩 3/4 · 본문 15회) → **독자의 질문 순서**.
셀러는 프롬프트를 써본 적이 없어 그게 문제인 줄도 모르고, 차별점도 아니다.

**구조**: `nav → hero → advideo → shots → control → trust → pricing → faq → cta → footer`

## 🔴 배포 안 됨

```bash
cd /home/ubuntu/HeyHoAI && git pull      # → 80fb3a7
# ⚠️ migrate 누적분 확인 (테마 8테이블 · macro_group 등). 이번 7커밋은 스키마 0이지만
#    미배포분이 같이 얹히면 /owned가 500날 수 있다.
# Cloudflare Purge:
#   landing.html · ko.html · js/pricing.js · js/i18n.js · robots.txt · sitemap.xml · 16개 앱 html
```
**pm2 불필요** — `src/` 변경 0. `index.js`도 안 건드렸다(clean URL 정규식 `:80`이 `/ko`를 이미 매칭).

**배포 후 확인**: `https://doppia.ai/ko` 가 뜨는지. 로컬에선 정적 서버라 `/ko.html`로만 검증했다.

## 다음 세션이 이어받을 것

### 🔴 즉시 — 슬롯 2개 (사용자가 직접 넣기로 함)
- `landing.html` 히어로 슬롯 A — Ad Video 1편(9:16). 마크업에 교체 주석 있음.
- `landing.html` shots 입력 원본 — "이 티셔츠가 들어갔습니다"의 그 티셔츠.
→ 넣은 뒤 `node scripts/build_landing_ko.js` 재실행(ko.html 재생성).

### 🔴 가격표 진실화 — 최대 미해결
`billing.html`에 날조 18종이 살아 있다(랜딩에선 이미 제거):
`N concurrent slots`×6 · `Solo/Group lookbook` · `2K quality` · `Concept cut` · `Edit results` ·
`Video reels` · `Template reel(5s/10s)` · `watermark-free exports` · `/mo`
**번역도 일부러 안 했다** — 번역하면 거짓을 한국어로 굳힌다(`i18n.js` 주석에 목록 있음).
**원인**: 5티어 × 불릿 3~4 = 폼이 **17슬롯**을 요구하는데 `entitlements.js` 실축은 **2개**
(`monthlyCredits` · `privateMode`) + 계약 1개 → **15개를 지어내야 표가 채워진다.**
→ 불릿을 하나씩 고치는 건 무의미. **폼을 바꿔야 재발이 없다.** 랜딩이 그렇게 했다(경계1+스칼라1).
정본: `docs/가격표_진실화_변경셋_2026-07-14.md`(53 edits, ⏸️보류 — 상업권 결정 대기)

### 🟡 EN/KO 카피 불일치 2건 (한국어만 고쳐놨다)
- `home.html` "cutouts" — 배경제거 구현 0(`removeBackground|remove_background|bgRemove` grep 0건).
  KO는 '제품컷'으로 정직화. **EN도 고쳐야 정합.**
- `gallery.html` "Your very first result comes out watermark-free" — `generate.route.js:385`가
  플랜 무관 `watermarked:false`라 Free도 워터마크가 없다 = 팔 수 없는 약속. KO는 주장 제거. **EN 미수정.**

### 🟡 결정 대기
- `shots.tile.5` `Hero` → `대표컷`? 3안이 갈렸다(메인컷/대표컷/히어로컷). `대표컷`·`메인컷`은
  스마트스토어에서 **등록 슬롯**을 뜻해 오독 위험. Studio는 영문 UI라 셀러가 `Hero`로 본다.
- 상업권 개방 — 승인됐으나 **미적용**. `entitlements.js` **:13 starter · :14 standard · :15 pro**
  `commercial:false→true` + `terms.html:210` 표 **동시**(코드만 고치면 약관과 상충).
  ⚠️ 브리핑의 `:14-16`은 off-by-one이다.
- 무료 크레딧 금액 — 인상만 확정, 금액 미정. 랜딩은 `data-dp` 바인딩이라 재작성 0.
- 워터마크 배선 vs 폐기 — 어느 쪽이든 지금은 안 판다.

### 🟡 조건부 문언
`pricing.js` `CUR_META`의 `/월` · `매월 자동결제 · 언제든 해지`는 **결제 개시 시점부터** 참이다.
`subscription.route.js:31`이 아직 non-admin에 **501**을 준다(Eximbay 가맹점 심사 대기).
사용자 결정으로 "결제 들어왔다고 가정"하고 작업했다. **개시가 지연되면 라이브 거짓** — 런칭 전 재확인.

### 🟡 구조적 한계
`<title>`은 앱에서 번역 불가 — `i18n.js`가 `translate(document.body)`라 head를 못 건드린다.
랜딩은 프리렌더라 해결됐다. 앱도 고치려면 프리렌더로 가거나 i18n.js에 title 처리 추가.

### 별건 (작업 칩으로 띄워둠)
- **이메일 파생 공개 핸들 (P0)** — `split_part(u.email,'@',1)`이 3곳
  (`studioThemes.route.js:61` · `marketplace.route.js:607,624`). `brandname@company.com` → `@brandname` 공개.
  `privacy.html`·`terms.html`에 고지 **0건**. Free는 privateMode 없어 **항상 공개**.
- **옛 UGC 죽은 코드** — Ad Video(`src/ugc/`)가 완전 대체. 옛 `mode='ugc'` 잔해 5곳.
  ⚠️ `:811 #modeUgc`를 지우면 `:2047`의 `['Influencer','Shopping','Ugc','Custom']` 루프가
  `null.classList`로 터져 **스튜디오가 백지**가 된다. 같이 고칠 것.
  ⚠️ 개발자(eatapple1004·qwertty979)가 `studio.html`을 하루 5+커밋으로 만지는 중 — 잠잠해질 때까지 대기.

## 작업 규칙 (오늘 배운 것)

- **HTML 구조를 정규식으로 다루지 마라.** 두 번 사고 났다 — `data-i18n`이 `<span data-dp>` 안에 붙어
  런타임 크레딧 숫자를 덮어쓸 뻔했고, 빌드 스크립트가 bs4의 속성 순서 뒤집기에 죽었다. **파서를 써라.**
- **사전은 `js/i18n.js` 하나만 고치면 된다** → 개발자가 만지는 `studio.html`과 **교집합 0**.
- **런타임 조립 문자열은 사전이 원리적으로 못 덮는다**(`'≈ '+n+' photos'`).
  `documentElement.lang` 분기로 처리했다(`LP-CONV`·`LP-TABS`).
- 규모를 먼저 재고 워크플로를 붙일 것 — 문자열 121개 번역에 21에이전트는 낭비였다.
  자세히: 사용자 메모리 `workflow_scale_discipline.md`
