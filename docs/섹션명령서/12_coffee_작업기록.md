# 작업 기록 — 카페 & 커피 (key: coffee)

> 총지휘 읽기용. 브리프 = [12_coffee.md](12_coffee.md) · 자동 현황 = [_STATUS.md](_STATUS.md).

## 2026-06-13 · ☕ coffee 카탈로그 신설 + 로컬 적용 완료 (net-new)
**요청**: 커피 전용 템플릿을 더 만들고, 로컬 적용 방법은 Home v2 spec에서 학습해 적용(유저 제공 레퍼런스 = 코지 아이스 라떼 이미지). **유저 결정: 새 전용 카탈로그 신설 · 7개.**

### ✅ 완료 (시드 + 파이프라인 + FE 배선)
- **시드** `src/recipes/seeds/recipes.coffee.v2.js` 신규 7개(설계+적대검증 워크플로). 검증: `node` 로딩 OK · 비용공식(image=round(count×0.5)/reel=shots×2) 7종 정합 · AR(📷4:5/🎬9:16) · **이름 전역 고유**(전체 155개 중 충돌 0) · #4 Menu의 `extra_negative`에 text/logo 미포함 · #6·#7 `meta.flags:["needs_human_review"]`.
- **⚠️ 필드 정정**: 워크플로 산출물은 처음 잘못 `negative`로 바꿔 썼다가, 엔진(`recipeResolver.js:104,161`)이 읽는 **live 필드 = `look.extra_negative`**(`negative`는 死필드)임을 확인해 7/7 `extra_negative`로 복구. (food/headshot 死필드 이관과 동일 규약.)
- **백엔드 배선(드리프트 가드 통과)**: `coffee`를 `consolidate_recipes.js` SECTIONS · `recipe_card_contract.js` VERTICALS · `export_recipe_cards.js` FE_VERTICALS에 등록 → 파이프라인 3종 재실행. **export drift-guard: FE 155 / 계약 155 / _CATALOG 155 / _STATUS 155 → OK ✓** (coffee:7). `_STATUS.md`·`_CATALOG.json`·`_card_contract.proposed.json`·`public/js/recipes.generated.js` 갱신.
- **FE 배선**: `public/studio.html` `PRODUCT` 배열 + `VERTICAL_EMOJI`(☕ Coffee) → 쇼핑 모드에 ☕ 카페&커피 필터 노출.
- **구조화 export(하드룰)**: `docs/exports/recipes.coffee.v2.csv`(7행, DB 적재용).
- **백본 동기화**: `docs/템플릿_한국어_카탈로그.md`(☕ 섹션) · `public/_overview.html`(DATA 행) · `docs/템플릿_v2_발굴선별강화_결과.md`(§카페&커피) · `00_INDEX.md`(12번째) · `00_총지휘_종합관리.md`(11→12섹션).

### 🔧 의존성 / 플래그 (엔진·총지휘 확인 필요)
- `consolidate_recipes.js` exit=1은 **타 섹션 기존 이슈**(influencer #7 shots 누락 · beauty24·jewelry34·home27·pet12 개수 6~8 초과 — 병렬 세션 진행분). **coffee는 "OK 7"로 무관.**
- 신규 vertical 추가로 `studio.html`·계약/익스포트 스크립트(헤더상 **FE/계약 비준 대상**)를 건드림 → **FE/템플릿 총지휘 비준 필요.**
- #4 Menu Card `text_overlay` 합성 레이어 = food/home 🅣와 동일 미구현 파이프라인 의존.
- 카탈로그 norm: coffee=7(6~8 준수). 전체 11→12섹션.

### ⏳ 다음(QA)
- 7종 생성 테스트(특히 #6·#7 유체·라떼아트 모핑) → 통과분만 `_pass_log.json` 등록 시 studio 보류(held) 해제.

## 2026-06-13 (2) · 🐞 "커피 템플릿 사용 안 됨" 핫픽스
**증상**: studio에 ☕ 카드는 뜨는데 **선택·생성이 안 됨**(사용 불가).
**원인**: 신규 vertical 배선 시 **`src/recipes/recipeStore.js`의 하드코딩 `SECTIONS`(4번째 시드 목록)** 누락. 이 store가 런타임 `/api/recipes`·`/api/recipes/:id/resolve`의 정본 → coffee 시드 미로드 → `getById(slug)`=null → resolve/generate 실패. (카드는 정적 `recipes.generated.js`에서 떠서 "보이지만 안 됨".)
**수정**: `recipeStore.js` SECTIONS에 `coffee` 추가(11→12). 검증: `store.list({vertical:"coffee"})`=7 · generated.js의 7개 카드 id 전부 `getById` 해소 OK(=사용 가능).
**⚠️ 교훈(net-new 카탈로그 체크리스트)**: 신규 vertical은 **하드코딩 시드 목록 5곳**을 모두 배선해야 함 — ①`consolidate_recipes.js` SECTIONS ②`recipe_card_contract.js` VERTICALS ③`export_recipe_cards.js` FE_VERTICALS ④**`recipeStore.js` SECTIONS(런타임 사용성 게이트 — 빠지면 카드는 보여도 사용 불가)** ⑤`studio.html` PRODUCT+VERTICAL_EMOJI. (resolve.demo.js는 데모 전용이라 무관.)

## 2026-06-13 (3) · 곁길 정리 (사용자 요청 B)
로컬 생성 스모크 스크립트(`scripts/gen_test.coffee.js`) + 실제 Gemini API 콜 테스트 + 가이드 "D) 실제 생성" 절은 **표준 템플릿 생성 흐름 밖(곁길)**이라 제거. coffee는 다른 섹션과 동일하게 **시드 + 파이프라인 배선 + 문서**만 유지. (단 §(2)의 `recipeStore.js` 사용성 핫픽스는 필수 배선이라 유지 — 빠지면 카드는 보여도 생성 불가.)

## 2026-06-15 · ➕ #8 "Slow Morning Coffee" 신규 (레퍼런스 1:1 감성, 모든 커피)
**요청(사용자)**: ① **보류(held)는 무조건 유지** → `_pass_log.json` 미등록(전 종목 보류 유지, 손대지 않음). ② 커피 사진 1장 넣으면 **유저 제공 레퍼런스(책+우드코스터+구겨진 린넨+측면 창광 아이스라떼)** 같은 감성 한 컷을 만들어주는 템플릿, **어떤 커피 종류든** 적용.

### ✅ 완료 (시드 + CSV + 파이프라인, 7→8)
- **신규 #8 `Slow Morning Coffee`** (Lifestyle · image_set ◈2 · count4 · 4:5 · sort 8). `product_composite`로 업로드 음료를 핫/아이스·라떼/아메리카노/콜드브루 무관 **동일 유지**, 씬만 레퍼런스 감성으로 재현. `extra_positive`에 "regardless of its type" 명시 + `extra_negative` 선두에 `changed or substituted drink type` / `wrong cup or glass swapped in` 추가로 음료 정합 강제. #2(분위기 다양 4컷 세트)와 차별 = **이 정확한 한 컷 집중**.
- **이름 전역 고유** 확인(155개 중 충돌 0). **CSV 동기화**(`docs/exports/recipes.coffee.v2.csv` 8행, 하드룰).
- **3스크립트 체인 재실행**: consolidate `coffee OK 8`·중복 0 / contract 156·id충돌 0 / export **드리프트가드 FE 156·계약 156·_CATALOG 156·_STATUS 156 OK**(coffee:8). `npm run pm2:restart`(↺6, recipeStore 캐시 갱신).
- **QA 8/8 통과**(resolve·컷수=count·가격공식 ceil(4×0.5)=2·SAFETY text/logo/watermark 주입·extra_negative 반영·제품모드 brand-safe·런타임 `getById` 해소). 가격사다리 `I2 I2 I2 I3 R2 R4 R6 I2`(위반 0).
- **배선 5곳 무변경**: coffee 버티컬은 기존 배선(consolidate/contract/export/recipeStore/studio.html) 그대로 → 시드 내 템플릿 추가는 자동 픽업(신규 버티컬 아님).

### ⚠️ 남은 것 / 제약
- **#8은 _pass_log.json 미등록 = studio에서 보류(held) 표시 유지**(사용자 지시 "보류 무조건 유지"). 생성은 가능, 배지만 보류.
- **시각적 충실도(레퍼런스 닮았는지)는 미검증** — 실제 Gemini 렌더는 §(3)에서 곁길 제외됐고 앱 mock 단계. 구조·배선·프롬프트만 검증함. 실렌더 감성 확인은 사용자 보류 검수 몫.
- 워커 규칙 준수: **파일만 저장**, commit/push 없음(브랜치 `feat/beauty-hero-family-8` 그대로).

## 2026-06-15 (2) · ♻️ #8 교체: Slow Morning Coffee → Noir Marble Coffee (프리미엄)
**요청(사용자)**: Slow Morning Coffee 감성이 너무 아쉬움 → "더 고급스럽게, 새 템플릿". **판단**: 아쉬워한 #8을 빼고 그 자리에 프리미엄 신규 템플릿을 넣어 **커피 8종 유지(norm 6~8 준수)**. 둘 다 원하면 Slow Morning Coffee 복구해 9종 가능(미요청).

### ✅ 완료 (시드+CSV 교체, 8종 유지)
- **#8 `Noir Marble Coffee`** (Editorial · image_set ◈2 · count4 · 4:5 · sort 8). 룩 = **에디토리얼 누아르 럭셔리**: 다크 마블/honed travertine + 브러시드 브라스 + 파인 포슬린, 단일 드라마틱 측광 키아로스쿠로·깊은 벨벳 그림자·크레마/림 글로우, 85mm f/2.8, espresso brown·warm charcoal·soft gold 팔레트, 매거진급 정물. `product_composite`로 업로드 음료(핫/아이스 무관) 동일 유지, `extra_negative`에 `cheap or amateur look`/`changed or substituted drink type` 등으로 저급·음료변형 차단. 코지 무드 세트(#2)와 룩 대비 = 카탈로그 상단 럭셔리 포지셔닝.
- **이름 전역 고유** 확인. **CSV 동기화**(`docs/exports/recipes.coffee.v2.csv` 8행 교체).
- **3스크립트 체인 재실행**: consolidate `coffee OK 8`·중복 0 / contract 156·id충돌 0 / export 드리프트가드 **FE 156·계약 156·_CATALOG 156·_STATUS 156 OK**. `npm run pm2:restart`(↺7).
- **QA 8/8 ALL PASS**(가격사다리 `I2 I2 I2 I3 R2 R4 R6 I2`). **실서버 인증조회**: 커피 8종, Noir Marble Coffee 포함·Slow Morning Coffee 제거 확인.
- 보류 유지: `_pass_log.json` 무변경(전 종목 held). 시각적 충실도는 실렌더 검수 몫. **파일만 저장**, commit/push 없음.

## 2026-06-15 (3) · ➕ Slow Morning Coffee 복구 → 커피 9종 (교체 아닌 추가)
**요청(사용자)**: "로컬은 테스트라 6~8 준수 안 해도 됨. 그냥 템플릿 추가해." → (2)에서 교체로 뺐던 **Slow Morning Coffee를 #9(sort 9)로 복구**, Noir Marble Coffee(#8)와 **둘 다 유지**. 커피 8→9.
- **결과**: 8=Noir Marble Coffee(프리미엄 누아르), 9=Slow Morning Coffee(코지 레퍼런스). 룩 대비로 공존.
- **norm**: coffee=9 → consolidate `draft(이슈)`(6~8 초과, beauty/jewelry/home/pet과 동일 플래그). **사용자 승인된 로컬 정책** — 정식 확정 시점에 6~8로 정리 여부는 총지휘 판단.
- **체인 일관성 OK**: contract/export 드리프트가드 **157 전부 일치**(FE/계약/_CATALOG/_STATUS), id충돌 0, 중복이름 0. `npm run pm2:restart`(↺8). **QA 9/9 ALL PASS**(사다리 `I2 I2 I2 I3 R2 R4 R6 I2 I2`). 실서버 인증조회 커피 9종 확인.
- 보류 유지·`_pass_log.json` 무변경. **파일만 저장**, commit/push 없음.

## 2026-06-15 (4) · ➕ photoreal 5종 추가 → 커피 14종 (#10~#14)
**요청(사용자)**: "실제 사람이 고급카메라로 찍은 것같이, 다양한 컨셉으로 5개 더." → 모든 신규에 **실사(photoreal)·진짜 카메라/렌즈·자연광** 강조 + `extra_negative`에 **CGI/3D/AI 룩 차단** 박음. 전부 image_set ◈2·4:5·`product_composite`(어떤 커피든 동일 유지).
- **#10 Golden Hour Window**(골든아워 역광, 35mm f/1.4, 앰버 림라이트·플레어·긴 그림자)
- **#11 Analog Film Cafe**(35mm 아날로그, Portra/CineStill 톤·그레인·할레이션, 랩스캔 룩)
- **#12 Roastery Counter**(스페셜티 바 카운터, 에스프레소 머신 보케, 50mm f/1.8, 다큐 리얼리즘)
- **#13 Daylight Brunch Flatlay**(자연광 90° 탑다운 브런치 상차림, 35mm, 푸드 에디토리얼)
- **#14 Sunlit Terrace**(야외 테라스, 그린·거리 보케, dappled 햇살, 50mm f/2, 여행 캔디드)
- **체인 일관성 OK**: contract/export 드리프트가드 **162 전부 일치**(FE/계약/_CATALOG/_STATUS), id충돌 0, 중복이름 0. `npm run pm2:restart`(↺9). **QA 14/14 ALL PASS**(사다리 공식 일치, 가격검증 동적화). 실서버 인증조회 커피 14종 확인.
- **norm**: coffee=14 → consolidate `draft(이슈)`(로컬 테스트 정책상 OK). 정식 확정 시 6~8 정리 여부는 총지휘 판단.
- 보류 유지·`_pass_log.json` 무변경. **파일만 저장**, commit/push 없음.

## 2026-06-15 (5) · ➕ 감성 photoreal 10종 추가 → 커피 24종 (#15~#24, 가게 디테일 배제)
**요청(사용자)**: "다른 컨셉 10가지 더. 고급 카메라로 실제 사람이 찍은 것 같이, **가게 디테일 안 나오게** 감성 있게." → 전 신규에 photoreal(실 카메라/렌즈·자연광) + `extra_negative`에 **CGI/3D/AI 룩 + cafe interior/storefront/espresso machine/menu board/signage/other people** 명시 차단. 전부 image_set ◈2·4:5·`product_composite`(어떤 커피든 동일).
- **#15 Minimalist Negative Space**(심리스 여백) · **#16 Rainy Window Mood**(비오는 창·빗방울 보케) · **#17 Monochrome Fine Art**(흑백 파인아트) · **#18 Marble Linen Still Life**(마블+린넨 정물) · **#19 Shadow Play Sunlight**(블라인드/잎새 그림자 아트) · **#20 Botanical Coffee Beans**(원두·식물 매크로) · **#21 Pastel Dream**(파스텔 드리미) · **#22 Vintage Heirloom**(앤틱 올드월드 정물) · **#23 Reflective Glass Surface**(글로시 반영) · **#24 Steam and Light Macro**(백라이트 스팀 매크로).
- **배경 전략**: 모든 컷 scene을 표면·빛·질감·추상으로만 구성(매장 인테리어·바·머신·간판 0). negative에도 가게 단서 차단어 포함.
- **체인 일관성 OK**: contract/export 드리프트가드 **172 전부 일치**(FE/계약/_CATALOG/_STATUS), id충돌 0, 중복이름 0. `npm run pm2:restart`(↺10). **QA 24/24 ALL PASS**(가격사다리 공식 일치). 실서버 인증조회 커피 24종 확인.
- **norm**: coffee=24 → consolidate `draft(이슈)`(로컬 테스트 정책상 OK).
- 보류 유지·`_pass_log.json` 무변경. **파일만 저장**, commit/push 없음.
