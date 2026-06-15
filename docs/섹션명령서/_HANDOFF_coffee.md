# ☕ 커피 카탈로그 — 세션 이관 전달서 (2026-06-13)

> 다음 **coffee 전담 세션**은 이 문서 하나로 현황·다음할일·제약·함정을 즉시 파악(self-contained). 진실원천 = 레포 파일. 작업 디렉터리 `~/HeyHoAI`.
> **핵심**: coffee는 food에서 분리된 **독립 net-new 카탈로그**(vertical key `coffee`)다. food 안이 아니라 자체 시드/섹션으로 이미 빠져 있다.

---

## 1) 역할 / 목적
- 카페·홈카페·음료 셀러가 **음료 사진 1장**으로 메뉴 썸네일·코지 무드·아이스 매크로·메뉴카드·푸어/ASMR 릴스를 생성하는 음료 전용 카탈로그.
- 워커 = **파일만 저장**(commit/push 금지). 로컬 검증·생성 테스트까지가 임무.

## 2) 현재 상태 (✅ 완료 — 생성까지 동작 확인)
**7종 확정** (`vertical:"coffee"` · 전부 `product`/`product_composite` · 이름 전역 고유):

| # | 이름 | 출력 | 컷/샷 | ◈ | 플래그 |
|---|---|---|---|---|---|
| 1 | Latte Art Top-Down | 📷 image | 4 | 2 | — |
| 2 | Cozy Cafe Moment | 📷 image | 4 | 2 | — (레퍼런스 무드) |
| 3 | Iced Coffee Condensation Hero | 📷 image | 4 | 2 | — |
| 4 | Signature Drink Menu Card | 📷 image | 6 | 3 | 🅣 text_overlay |
| 5 | Single-Cup Pour Reel | 🎬 reel | 1 | 2 | — |
| 6 | Latte Pour & Crema Reel | 🎬 reel | 2 | 4 | ⚠️ needs_human_review |
| 7 | Cafe Steam & Crema ASMR | 🎬 reel | 3 | 6 | ⚠️ needs_human_review |

가격 사다리 `I2 I2 I2 I3 · R2 R4 R6` (위반 0). 엔진 live 네거티브 필드 = **`look.extra_negative`**(`negative`는 死필드).

**검증됨**: `node` 로딩 OK · 비용공식 7/7 정합 · drift-guard(FE/계약/_CATALOG/_STATUS) **155 OK** · recipeStore resolve OK · **실제 생성 1컷 통과**(Latte Art Top-Down, nano-banana/Gemini → tmp/images, 의도대로 출력).

## 3) 산출물 / 파일 위치
- **시드**: `src/recipes/seeds/recipes.coffee.v2.js` (정본)
- **섹션 브리프**: `docs/섹션명령서/12_coffee.md`
- **작업기록**: `docs/섹션명령서/12_coffee_작업기록.md`
- **구조화 export(DB용)**: `docs/exports/recipes.coffee.v2.csv`
- **배선된 곳(5)**: `scripts/consolidate_recipes.js`(SECTIONS)·`scripts/recipe_card_contract.js`(VERTICALS)·`scripts/export_recipe_cards.js`(FE_VERTICALS)·`src/recipes/recipeStore.js`(SECTIONS)·`public/studio.html`(PRODUCT 배열 + VERTICAL_EMOJI ☕)
- **백본 동기화됨**: `docs/템플릿_한국어_카탈로그.md`·`public/_overview.html`·`docs/템플릿_v2_발굴선별강화_결과.md`·`docs/섹션명령서/00_INDEX.md`·`00_총지휘_종합관리.md`

## 4) ⚠️ 함정 / 교훈 (반드시 숙지 — 실제로 막혔던 것들)
1. **신규 vertical = 하드코딩 시드목록 5곳 전부 배선**. ④ `recipeStore.js` SECTIONS가 **런타임 사용성 게이트** — 빠지면 카드는 보여도 생성이 "사용 안 됨"(resolve 404).
2. **🔴 서버 재시작 필수**: `recipeStore`는 레시피 맵을 기동 시 1번만 빌드·캐시(`let MAP=null; if(MAP) return MAP`). `ecosystem.config.js` `watch:false`(pm2 `npm run pm2:restart`로 운영) → **시드/배선 고친 뒤 `npm run pm2:restart` 안 하면 반영 0.** (이전에 커피만 생성 실패한 진짜 원인이 이거였음 — 16h 묵은 프로세스가 커피 없이 캐시.)
3. **네거티브는 `look.extra_negative`에만**(엔진 `recipeResolver.js:104,161`이 읽음). `look.negative`는 死. `text`/`logo`/`watermark`는 전역 SAFETY가 자동주입 → 넣지 말 것(🅣 Menu Card는 특히 extra_negative에 text/logo 금지).
4. **"보류"(held) 배지 = 단순 상태표시, 생성 안 막음**. held=true는 `_pass_log.json` 미등록 의미. 통과 시 거기 등록하면 해제(아래 6).
5. **drift-guard**: 시드 바꾸면 3스크립트 체인 순서대로(consolidate→contract→export) 재실행 — 셋 다 안 하면 exit 1. `consolidate` exit 1이 떠도 커피가 "OK 7"면 무관(타 섹션 기존 이슈).

## 5) 로컬 검증·생성 (서버·인증 없이도 됨)
```bash
cd ~/HeyHoAI
# A) 카드/사용성:  node -e 'const s=require("./src/recipes/recipeStore");console.table(s.list({vertical:"coffee"}))'
# B) 프롬프트:     node -e 'const{resolveRecipe}=require("./src/recipes/recipeResolver");const r=require("./src/recipes/seeds/recipes.coffee.v2.js").find(x=>x.name==="Cozy Cafe Moment");console.log(resolveRecipe(r.config,{subject:{type:"product",name:"iced latte"},presetMap:{},attributeMap:{},userSlots:{}}).jobs[0].prompt)'
# C) 파이프라인:   node scripts/consolidate_recipes.js && node scripts/recipe_card_contract.js && node scripts/export_recipe_cards.js
# D) 실제 생성:    studio(localhost:3000)에서 음료 사진 업로드 → 커피 템플릿 선택 → Generate. 시드/배선 고쳤으면 먼저 npm run pm2:restart.
```
- 실제 이미지 provider = **nano-banana(Gemini, `.env` GEMINI_API_KEY 설정됨)** → `tmp/images/<id>.png`. 앱은 mock단계지만 provider 직결 생성은 로컬에서 동작.
- 상세 = `docs/섹션명령서/_로컬검증_가이드.md`.

## 6) 다음 할 일 (우선순위)
1. **생성 QA 테스트** — 7종(특히 #6·#7 유체·라떼아트 모핑)을 실제 음료 사진으로 studio 생성 → 통과 확인.
2. **통과분 보류 해제** — 통과한 카드를 `docs/섹션명령서/_pass_log.json`에 등록(형식: id/name/vertical/result:"pass"/tested_at). PR #64(보류 라이프사이클) 머지 시 `node scripts/log_pass.js --sync`로 일괄 반영.
3. **product_composite reference** — 실제 음료 합성은 studio 업로드(또는 reference 이미지)로. 텍스트-only는 일반 음료가 나옴.
4. (선택) 음료 커버리지 확장 — 시즌 드링크/디저트음료 등은 6~8 norm 내에서 변형 슬롯 검토.

## 7) 제약 (반드시)
- **워커 = 파일만**. commit/push 금지(총지휘/Chief가 git 전담). `main` 직접 push 금지.
- 현재 워킹트리 브랜치 = `feat/beauty-hero-family-8`(다른 템플릿 작업과 같이 미커밋). CLAUDE.md 표준 작업 브랜치 = `feat/ux-monetization-v2`. **브랜치 처리는 총지휘 판단** — 워커는 옮기지 말 것.
- 시드/배선 수정 후 **`npm run pm2:restart` + 3스크립트 체인** 잊지 말 것(§4-2, §4-5).
- 신규 카탈로그 추가 시 §4-1의 5곳 배선 + studio 비준(FE/계약 스크립트는 비준 대상).

## 8) 킥오프 붙여넣기 문구 (새 coffee 세션에)
> `~/HeyHoAI에서 docs/섹션명령서/_HANDOFF_coffee.md를 읽고 coffee 카탈로그 전담 세션을 맡아. coffee는 food와 분리된 독립 net-new 카탈로그(7종, recipes.coffee.v2.js)다. 현황·함정(특히 recipeStore 캐시→pm2 재시작, extra_negative live 필드, 보류 배지, 5곳 배선)을 숙지하고, 다음할일은 7종 생성 QA 테스트 → 통과분 _pass_log.json 등록. 파일만 저장, commit/push 금지. 시드/배선 고치면 npm run pm2:restart + 3스크립트 체인 재실행.`
