# 13 · 제품컷(Product Cut) — 작업기록

> 신규 오피셜 테마 **productcut** + **중첩 템플릿(부모 1 + 컷 5종 자식)** 신설.
> 설계 결정: [../제품컷_중첩템플릿_설계결정_2026-07-05.md](../제품컷_중첩템플릿_설계결정_2026-07-05.md)
> 착수 세션: 2026-07-05. 상태: **로컬 데이터/파이프라인/백엔드 배선 완료 · drift OK · 순수함수 검증 통과**. 미배포.

## 확정 스코프 (Chief, 2026-07-05)
컷 5종만(효과 축2 나중) · 신규 slug `productcut`(Shopping 아래 독립 테마) · 단건 선택(배치 나중) · **균일 과금 ◈2**.

## 구조 (파라미터형 중첩)
```
Shopping (macro_group)
 └ theme: productcut ("Product Cut")            ← 신규 오피셜 테마
    └ template: Product Cut  (id=product-cut)   ← 진입점 카드 1장(부모)
       ├ Flat Lay Cut      (id=flat-lay-cut)      바닥컷
       ├ Hanger Cut        (id=hanger-cut)         옷걸이컷
       ├ Ghost Mannequin Cut (id=ghost-mannequin-cut) 고스트컷
       ├ Styled Object Cut (id=styled-object-cut)  오브제컷
       └ Detail Cut        (id=detail-cut)         디테일컷
       (자식 = config.parent_id='product-cut' · shots·look만 오버라이드 · output/subject는 부모 상속)
```
- **입력**: 의류 이미지 1장. 모델 없음 → `reference_strategy: 'product_composite'`.
- **비용**: 전 컷 count=4 → resolver `ceil(4×0.5)=◈2` 균일(자동).

## 자식 숨김 신호 = `config.parent_id` 존재 (새 플래그 0)
- `parent_id` 있는 레시피는 **카드 아님**(변형). `recipeStore.list()` · `recipe_card_contract.js` · `consolidate_recipes.js`에서 제외.
- `getById`는 자식도 반환 → Studio가 컷 선택 시 자식 id로 resolve.
- 하위호환(기존 레시피는 parent_id 없음=노출) · 다단 중첩에도 그대로 적용.

## 중첩 상속 메커니즘 (기존 코드 재사용, 스키마 변경 0)
- `recipeResolver.resolveRecipe`가 `parentConfig` 주면 `deepMerge(parent→child)` (이미 존재, L92). **배열은 통째 교체** → 자식 shots가 부모 shots를 대체.
- **1회 배선(Phase 2)**: `recipe.route.js` resolve가 `recipe.config.parent_id` 있으면 `getById(parent_id)`로 부모 fetch → `parentConfig`로 전달. subject.type도 병합 기준(자식 생략 시 부모값). 현재 1단 상속. 다단은 부모 체인 pre-merge로 확장(코드 0, 데이터만).

## 변경 파일
| 파일 | 변경 |
|---|---|
| `src/recipes/seeds/recipes.productcut.v2.js` | **신규** — 부모 + 컷 5종(영어명, parent_id, shots·look 오버라이드) |
| `src/recipes/recipeStore.js` | SECTIONS +productcut · `list()`에서 parent_id 자식 제외 |
| `src/recipes/recipe.route.js` | **Phase 2** — 부모 조회→parentConfig 전달, subject.type 병합기준(~10줄) |
| `scripts/consolidate_recipes.js` | SECTIONS +productcut · 자식 검증/카운트 제외 · 파라미터 섹션 6~8·가격사다리 휴리스틱 면제 |
| `scripts/recipe_card_contract.js` | VERTICALS +productcut · 자식 카드 제외(guards는 PREVIEW 전용이라 생략) |
| `scripts/export_recipe_cards.js` | FE_VERTICALS +productcut |
| `public/js/recipes.generated.js` | 재생성(부모 카드 1장 추가, 총 173→174) |
| `public/js/themes.js` | CAT_THEMES.Shopping +productcut · OFFICIAL_THEME_MAP['product-cut']='productcut' |
| `src/db/migrate.js` | 공식 마켓 시드(product-cut) · THEME_SEED(['productcut','Product Cut']) · OFFICIAL_THEME(['product-cut','productcut']) |

## 검증 (로컬, 통과)
- `consolidate` → productcut **OK, 카드 1(부모)**, 오탐 0. 총 174.
- `contract` drift-guard 174/174 **OK**, id충돌 0.
- `export` drift-guard FE174/계약174/_CATALOG174/_STATUS174 **OK ✓**. productcut:1.
- 순수함수 resolve 시뮬(라우트 로직): 6개 모두 `subject=product`(상속 확인), `◈2` 균일, 4잡, 각 컷 shots·look 오버라이드 정상(Styled Object=film look, Detail=macro). `list()`에 부모만 노출·자식 숨김 확인.
- 문법: 변경 파일 7종 `node -c` 전부 OK.

## Phase 3 Studio UI (2026-07-05 완료·코드)
컷 정보를 부모 카드에 실어 Studio가 컷 유형 그리드를 그린다.
- `recipe_card_contract.js`: 부모별 자식 수집 → 부모 카드에 `cuts:[{id,name}]` 부착. `export_recipe_cards.js`: `cuts` 통과. → `recipes.generated.js` 부모 카드에 cuts 5개.
- `public/studio.html`:
  - `buildTemplates` — `mk`에 `cuts` 보존(화이트리스트 누락 fix) + PRODUCT에 `productcut` 추가(`(C.productcut||[])` → shopping 풀, cat 'Product Cut'·theme productcut).
  - `state.cutId` 추가(기본값·setMode 리셋). `syncDefaultCut()`=부모 선택 시 첫 컷 기본. `setCut(id)`·`cutLabel()`.
  - `pickRecipe`/`selectFromModal`/`clearTemplate`에 컷 동기화 연결.
  - `syncTplTrigger`: 선택 칩 아래 **컷 유형 그리드**(`.cut-sel` 칩 버튼, 활성 하이라이트). `resolvePromptFor`: `r.cuts&&state.cutId` 있으면 **자식 컷 id로 resolve**(부모 상속 병합).
  - CSS `.cut-sel/.cut-btn` 추가.
- 검증(node 시뮬): 부모 카드 shopping 풀 진입·cuts 5 carried·컷 버튼 렌더·Ghost 선택 시 resolve id=`ghost-mannequin-cut`(자식). studio 인라인 스크립트 vm.Script 문법 클린. drift 174 유지.

## 남은 일 / 게이트
- ⏳ **로컬 :3002(doppia_local) migrate + 브라우저 검증** — Studio가 공식카드를 `/owned is_official`로 게이트하므로(`held=true` 기본, 보유 시 false), marketplace_templates+themes 시드가 로컬 DB에 있어야 카드가 뜸·컷 UI를 눈으로 확인. (static/백엔드 부재로는 카드 자체가 held로 미노출.)
- ⛔ **배포 게이트**: `migrate.js` prod RDS migrate + `pm2 restart`(백엔드 변경 포함) = Chief 승인·배포 시점. push도 승인 시에만.
- 📌 **미래(코드 0)**: 효과 축2(스튜디오/자연광/그림자) = 컷 id×효과 자식 추가. 컷별 과금 차등 = resolver per-cut cost 존중 필요(현재 shot수 기반 균일).
- 📌 **백본 카탈로그 동기화 대기**: `docs/템플릿_v2_발굴선별강화_결과.md`·`docs/템플릿_한국어_카탈로그.md`·`public/_overview.html`에 productcut 섹션 반영(파라미터형 특수 섹션).

## 2026-07-05 후속 (리뷰 중 발견·수정)
- **모달 컷 선택 노출**: 상세 모달에 "Cut type — pick one" 5버튼 추가(발견성). `renderModalCuts`·`modalCutId`·`setModalCut`, selectFromModal이 모달 선택 컷 반영.
- **오피셜 전용 테마 개념**: productcut을 `CAT_THEMES.Shopping`에 넣으니 My templates 필터/유저 테마배정 UI에도 샘. → `themes.js` `window.OFFICIAL_ONLY_THEMES=['productcut']` 추가, 유저 영역 3곳 제외: studio `renderFilters`(user 서브탭)·studio `renderThemeChips`(Create template)·gallery `libThemeChips`. **결과: Product Cut 칩은 Official에만.**
- **캐시 버스트**: `themes.js?v=1→v2`(studio+gallery), `recipes.generated.js?v=5→v6`(studio). 내용 재생성 후 버전 미변경이 옛 칩 잔존 원인이었음.
- **prod 스코프 시드**(사용자 승인): 전체 migrate 대신 `scripts/seed_productcut_prod.js`로 product-cut만 멱등 삽입(theme·공식마켓·template_themes·recipes6). admin 비번 회전 등 부수효과 0. 검증 theme=1/official=1/recipes=6.
- **:3001 재시작**(사용자 지시, main 올리기 전 리뷰 환경): bare node(35821, HeyHoAI-launch, prod .env) kill→`PORT=3001 node src/index.js` 재기동. index.js는 부팅 시 migrate 없이 recipeStore.init만(prod안전). "Recipes loaded from db (179)"=173+productcut6. pm2 heyhoai(:3000, 다른 디렉토리)는 무관·미변경.

## 기본 제공(무료) 공식 개념 (2026-07-05)
사용자 확정: **Product Cut은 ◈8 프리미엄 공식이 아니라 "기본 제공" 공식** — Store 담기 없이 항상 Studio 노출·생성 무료.
- **게이트 원리**: 코드가 `price_credits > 0`인 공식만 프리미엄 취급 — `/recipe-gates`([marketplace.route.js:709])·생성 소유권 402([generate.route.js:177]) 둘 다 price>0만. → **product-cut price_credits=0 → 구매게이트/402 없음.**
- **Studio 노출**: `modePool`이 `OFFICIAL_RECIPES` 카드만 노출하는데 미보유 공식은 거기 없어 숨김. → `themes.js` `window.DEFAULT_OFFICIAL_RECIPES=['product-cut']` + studio `applyDefaultOfficials()`(mergeOwnedTemplates 성공/실패 양경로)에서 **소유 무관 OFFICIAL_RECIPES 포함 + held=false**. 시뮬 검증: 미보유에도 Official 탭 노출·My templates 제외.
- **DB**: migrate.js에서 product-cut을 프리미엄 루프(◈8)에서 분리 → 별도 price 0 삽입 + `UPDATE price=0` 보정. `scripts/seed_productcut_prod.js`도 price 0 + UPDATE. **prod·doppia_local 둘 다 price 0 적용·검증**.
- 캐시버스트 `themes.js?v=2→v3`. :3001 재시작 불필요(프론트 정적 + 백엔드 price 라이브 조회).
- Store엔 price 0(무료/included)로 남음. 재시작 없이 하드리프레시로 :3001 노출.

## 예시 이미지 슬롯 (2026-07-05, UI 컨벤션 방식)
컷마다 예시 사진 노출(사용자가 직접 제작). **시드 하드코딩 없음** — Studio가 컨벤션 경로 `/img/productcut/<id>.png`를 시도.
- **아직 안 넣었으면 다른 카드와 동일**: 파일 없으면 그리드 카드=그라디언트(레이어드 배경 `url(convention), grad`), 모달=표준 placeholder("Sample image coming soon", `onerror` 폴백). 데이터(생성 카드)엔 preview 없음.
- 파일 있으면 표시: 부모 그리드 썸네일=`product-cut.png`, 모달 컷 미리보기=`<cutId>.png`.
- 배선: buildTemplates가 productcut 카드에 `m.preview='/img/productcut/'+id+'.png'` 파생 / `setModalPreview`가 컷 경로 파생(명시 seed `preview` override 있으면 우선). contract/export의 preview 통과 코드는 override 대비 유지(현재 inert).
- 안내: `public/img/productcut/README.md`. 파일만 넣으면 재빌드 없이 반영. `recipes.generated.js?v=8`.

## ⚠️ 배포 주의
- `recipe.route.js`·`recipeStore.js`·`migrate.js` 변경 = **백엔드**. 배포 시 `pm2 restart` + prod migrate 필요.
- `migrate.js`는 전부 멱등(기존 8공식 패턴 답습). prod에서 재실행해도 안전.
