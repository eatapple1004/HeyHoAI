# 03 뷰티 — 워커 작업기록 (총지휘 수거용)

> 워커 세션이 작업할 때마다 여기에 바로 기록 → 총지휘가 `docs/섹션명령서/`에서 읽음.
> 공유 백본 정본 = `recipes.beauty.v2.js`(시드) + `_STATUS.md`(자동생성). 이 파일은 **시드에 안 들어가는 검증결과·분석·결정요청**을 남기는 곳.
> 규칙: 워커는 파일만 저장(commit/push 금지). 로스터 스코프 변경은 총지휘/Chief 결정.

---

## 2026-06-10 · v2 8개 검증·확정 ✅ (브리프 `03_beauty.md` 수행)
- **시드:** `src/recipes/seeds/recipes.beauty.v2.js` — 8개. `node` 로딩 OK, `consolidate_recipes.js` 수거 OK(이슈 0, 중복이름 0).
- **비용공식 전수 통과(8/8):** `📷 I2 I2 I2 I2 · I5(온모델) · 🎬 R2 R4 R8` = 합 ◈27.
  - image_set=count×0.5, reel=shots×2, on_model_tryon 4컷=◈5(기본+핏/QA 가산). 임의가산 0.
- **스키마:** top/config/look 필수필드·shot 3필드·reel 5필드·count==shots 전부 충족. 누락 필드 0(보강 불필요).
- **🅣 오버레이 2개**(Before/After·Ingredient Claim Card): `text_overlay:true`, `look.negative`에 SAFETY_NEGATIVE의 bare `text`/`logo` 미주입 확인.
- **⚠️ 정체성/손 리스크 3개**(On-Model·Before/After·GRWM): `needs_human_review`+손/identity negative 강화 확인.
- **이름 전역 고유:** 8개 이름이 타 v2 카탈로그 전체와 충돌 없음(sort_order 1~8 고유).
- **수정:** 헤더 주석 `6 templates`→`8 templates` 정정(스테일 코멘트). 그 외 시드 내용 변경 없음.
- 결론: **현재 8개 브리프대로 확정. 추가/삭제 없이 KEEP.**

| # | 이름 | 타입 | 컷 | ◈ | 카테고리 |
|---|---|---|---|---|---|
| 1 | Dewy Glass Hero | 📷 | 4 | 2 | Hero |
| 2 | Macro Swatch Lab | 📷 | 4 | 2 | Texture |
| 3 | On-Model Glow Drop | 📷 | 4 | 5 | OnModel ⚠️ |
| 4 | Before/After Result Reel | 🎬 | 2 | 4 | Reel ⚠️🅣 |
| 5 | GRWM Routine Reel | 🎬 | 4 | 8 | Reel ⚠️ |
| 6 | Quick Glow Snap | 🎬 | 1 | 2 | Reel |
| 7 | Aesthetic Shelfie | 📷 | 4 | 2 | Lifestyle |
| 8 | Ingredient Claim Card | 📷 | 4 | 2 | InfoCard 🅣 |

---

## 2026-06-10 · 추가 분석 (사용자 요청 — 멀티에이전트 ultracode)

### A. 제품 커버리지 분석 — "현재 8개가 모든 뷰티 제품을 덮나?"
- 제품 유형 **424종 / 36 카테고리**를 8개 템플릿에 매핑, 36/36 그룹 적대적 재검증.
- **결론:** 8개는 **4개 기계적 게이트** 위에 지어짐 → 통과하는 **액상/크림 페이스 스킨케어만 완전 지원**.
  - ⓐ 드로퍼 마개→Dewy Glass Hero · ⓑ 펴발리는 크림/젤→Macro Swatch · ⓒ 광택병→Quick Glow Snap · ⓓ 얼굴도포+잔류+피부개선클레임→On-Model/Before-After/GRWM.
  - **만능 바닥** = Aesthetic Shelfie + Ingredient Claim Card(형태 불문). → "기계적 완전 제외"는 거의 없음.
- **완전지원:** 드로퍼 세럼·앰플·에센스, 크림/젤/에멀전, 오일, 선크림(로션/젤), K뷰티, 더마, 베이비·바디세럼.
- **부분/조건부:** 색조 메이크업(셰이드 라인업 못 팜), 스틱/고체·파우더·에어로졸·시트패치·세트·고체바.
- **제외(타 카탈로그):** 전자 디바이스→tech.v2.js, 얼굴주인공 크리에이터 GRWM→influencer/ugc.v2.js.

### B. 갭 로스터 분석 — ⚠️ **총지휘/Chief 결정요청** (스코프 변경)
> 사용자 질문 "현재 템플릿으로 모든 고객 만족 가능? 부족하면 추가/삭제 제시"에 대한 **권장안**. 워커가 시드에 무단 반영하지 않음 — 브리프 §5는 원래 "add 없음(8개 확정)"이었음. 확장 여부는 총지휘 결정.

**판정: 현재 8개로는 불충분.** 색조·세트·스틱·파우더·스프레이·시트패치·비얼굴(헤어/바디/네일/치아/립) 결과 세그먼트가 자기 핵심 셀링 포맷에 못 닿고 바닥에만 머묾.

**추가 권장(신규 8 + 선택 2, 이름 전역 고유 확인·비용공식 검증 완료):**

| 우선 | 이름 | 타입 | 컷 | ◈ | 닫는 갭 |
|---|---|---|---|---|---|
| P0 | Shade Range Grid | 📷 | 6 | 3 | 멀티 셰이드 색조(전환 1순위) |
| P0 | Region Result Reel | 🎬 | 2 | 4 | 비얼굴 Before/After(헤어/바디/네일/립; 치아 분리) |
| P0 | Gift Set Group Hero | 📷 | 4 | 2 | 세트/번들/기프트 그룹샷 |
| P1 | Glide Stick Swipe | 📷 | 4 | 2 | 스틱/고체(트위스트업+스와이프) |
| P1 | Compact Powder Pop | 📷 | 4 | 2 | 파우더/팩트 |
| P1 | Mist Burst Reel | 🎬 | 1 | 2 | 에어로졸/스프레이 분사 플룸 |
| P1 | On-Skin Patch Hero | 📷 | 4 | 2 | 시트/패치/사쳇(product 모드, ◈2) |
| P1 | Teeth Shade Card | 📷 | 4 | 2 | 치아미백 셰이드 진행(비평 추가) |
| P2 | Swatch Streak ASMR | 🎬 | 1* | 2* | 스와치 모션(*◈4→1샷◈2 강등 권장) |
| P2 | Lather Bar Hero | 📷 | 4 | 2 | 고체바 거품/젖은바(비평 추가) |

**삭제/조정 권장(기존 8개):** 하드 cut 권장 0(7 keep + 1 rescope).
- ⚠️ **Quick Glow Snap** = 가장 빈약(Dewy Glass Hero 1샷 클론, uniq 2/5). 단 "◈2 싼 릴스" 의무 슬롯이라 구조적 유지 — **슬롯 필요 시 1순위 삭제 후보.**
- 🔧 **On-Model Glow Drop** = ◈5 최고가 image_set인데 손+얼굴 첫렌더 성공률 최저 → **컷 재구성(손 노출↓)** 권장, 삭제 아님.
- 🔧 **GRWM** = ◈8 최고가, 비용 압박 시 3샷 ◈6 trim 옵션.

**최종 권장 로스터:** 코어 16(기존 8 + 신규 8), 가격사다리 ◈2→3→4→5→8, ◈2 정적+◈2 싼릴스 양쪽 보존.

**근거 원본:** 멀티에이전트 워크플로 산출(이 세션). 시드화 미실행 — 총지휘 승인 시 P0 3개부터 `recipes.beauty.v2.js`에 영어 프롬프트/샷리스트/negative/모션 풀 작성 + node·비용 재검증 예정.

---

## 2026-06-11 · 프롬프트 네거티브 이관 ✅ (프롬프트 정밀화 총지휘 직접 수행)
> 배경: 11개 워커가 시드를 끝냈으나 **beauty만 미이관**으로 적발(死필드 16·extra_negative 0). 워커 미수행분을 총지휘가 직접 이관. 사용자(Chief) 승인: "지금 총지휘가 이관"(현 16개 구성 유지 전제).

- **이관:** 16/16 템플릿 `look.negative`(死) → `look.extra_negative`(resolver L148 live). dead negative/positive 키 = **0**(node 파싱 검증).
- **SAFETY dedup:** 전역 자동주입어 제거 — `watermark`(16), `lowres`(16, ≈low quality), `text`/`distorted label text→distorted label`, `smudged logo`(logo), `extra fingers`·`malformed hands`(SAFETY mutated hands/bad anatomy 커버). 고신호 SAFETY 토큰 실측 0건(주석 포함 0).
- **text_overlay 4개**(Before/After Result Reel·Shade Range Grid·Region Result Reel·Teeth Shade Card): `baked-in … text` 네거티브 항목 제거 → extra_negative에 bare `text`/`logo` **0건**. render_notes도 `look.extra_negative` 기준으로 정정.
- **손 노출(On-Model·GRWM·On-Skin Patch):** SAFETY가 막는 generic 대신 §99 권장 `six fingers, fused or webbed fingers` 유지. Region Result Reel은 SAFETY 미커버 `malformed toes, fused or webbed digits` 보존.
- **게이트 재검증:** `grep -c '"negative":'` = **0/11 전 섹션** ✅ · `node scripts/consolidate_recipes.js` EXIT 0·중복이름 0·비용/이름/스키마 불변 ✅.
  - ⚠️ consolidate 잔존 이슈 = **개수16(권장6~8)** — 프롬프트 영역 밖 **포트폴리오 결정**(8→16 확장은 위 A/B 분석 기반, Chief 별도 판단). 네거티브 이관 회귀 아님.
- **불변 확인:** name·credit_cost·output_type·shots·reel·guards 무수정(카드계약·비용 불변). extra_positive 16개 그대로 유지(이번 작업은 네거티브 이관 한정).
- **git:** 총지휘 로컬 검증·기록. push 보류(Chief 승인 후).

---

## 2026-06-12 · 보고 → 총지휘: Dewy Glass Hero 테스트 통과 ✅ + 적합 제품 정의
> 사용자(테스트 주체)가 실제 제품 이미지로 Dewy Glass Hero 생성 테스트 → **통과 확인.** 첫 검증 통과 템플릿. (워커=템플릿 적합성 사고 담당; 프롬프트 생성은 beauty prompt.)

### 테스트 결과
- **Dewy Glass Hero ✅ PASS** — 실제 제품 1장 업로드 → 4컷 정상 생성, 무드(물방울·웻시트·글래스·하이키) 의도대로 출력. 사용자 승인.

### 이 템플릿에 어울리는 제품 (적합성 정의)
- **적합 조건:** 유리병 + (가급적)드로퍼/피펫 + 흐르는 액상 + "수분/프레시/글래스" 무드.
- **⭐ 최적(4컷 다 빛남) — 드로퍼 유리병 액상 스킨케어:** 세럼(HA·비타민C·레티놀·나이아신아마이드·펩타이드·시카)·앰플·페이셜오일·글로우드롭·아이/립세럼.
- **◎ 차선(정면·포디엄 위주) — 유리병이나 드로퍼X:** 토너·에센스워터·페이스미스트(유리 스프레이)·향수 플라콘·펌프형 세럼/에센스.
- **△ 부적합(다른 템플릿):** 무광 튜브/자 크림·스틱·파우더·사쳇/시트·고체바·불투명 플라스틱.
- **무드 보너스:** "글래스 스킨"·아쿠아/하이드라 K뷰티 라인에 특히 강함.

### 검증된 실제 적합 제품(테스트 풀, 웹검증 ideal 40/good 25)
- ⭐ The Ordinary HA 2%+B5 · Vichy Minéral 89 · COSRX Vitamin C 23 · Paula's Choice C15 · Kiehl's Midnight Recovery(오일) · Drunk Elephant Marula(오일) · Beauty of Joseon Glow Serum · Mizon 스네일 앰플 · numbuzin No.5 · SOME BY MI Galactomyces.
- ◎ SK-II FTE · Missha 퍼스트에센스 · Tatcha The Essence · Fresh Rose Toner · 페이스미스트(Caudalie·Tatcha·Chantecaille) · 향수(L'Eau d'Issey·Acqua di Gioia·Light Blue).

### 총지휘 액션 제안
- Dewy Glass Hero = **검증 통과 → 출시 후보 확정 가능.** 적합 제품 매칭표(위)를 PDP 추천 로직/온보딩에 반영 검토.
- 무드 미스 제품(무광·고체 등)은 형제 히어로 템플릿(Stone Plinth·Macro Swatch 등)으로 라우팅 — 미설계 상태.

---

## 2026-06-12 · 핸드오프 → 총지휘: Dewy 형제 히어로 패밀리 8종 초안 ✅ (사용자 승인 후 전달)
> 사용자 지시("각각 템플릿 및 프롬프트 생성")로 Dewy Glass Hero 무드 형제 8종 생성. **역할 분리 준수: 나=스펙 정의+오케스트레이션+스키마 QA교정 / 프롬프트 텍스트 생성=하위 beauty prompt 에이전트.**

- **생성물:** `docs/섹션명령서/_beauty_hero_family_draft.json` — 8개 시드용 레시피(📷4컷 ◈2 4:5, sort 17–24, 완성 프롬프트).
  - 2 Stone Plinth Luxe · 3 Liquid Splash Hero · 4 Botanical Dew · 5 Noir Gold Hero · 6 Cryo Frost Hero · 7 Silk Drape Hero · 8 Sunlit Pop · 9 Aqua Float.
- **생성/검증 파이프라인:** beauty prompt 생성 에이전트 8 + QA 8(워크플로). **품질=텍스트 양호**(무드·실패모드 negative·4컷 고유 scene·제품가드), **단 beauty prompt가 subject.type↔reference_strategy 8/8 스왑(QA 미검출) → 내가 전수 교정** + Sunlit Pop 'gibberish' 제거 + 비스키마키 정리. 현재 subject 정합·SAFETY 클린·◈2·4컷·이름 전역고유 확인.
- **⚠️ 미검증 드래프트:** 실제 생성 통과는 Dewy 1개뿐. 8종은 미렌더. 리스크 3종(Liquid Splash·Aqua Float·Cryo Frost=액체/얼음+라벨가림) 테스트 권장.
- **핸드오프:** 총지휘 세션(local_a9930914…)에 세션 메시지 전달 완료(2026-06-12). 요청=테스트 1–2개 지정 또는 채택 서브셋 결정.
- **포트폴리오:** 시드 반영 시 beauty 16→24(권장 초과) → 채택/시드 확정은 총지휘. 워커는 파일 저장만.
- **프로세스 교훈:** beauty prompt QA 체크리스트에 "subject.type=product / reference_strategy=product_composite" 명시 필요(이번 스왑 재발 방지).

---

## 다음 액션 (대기 — 총지휘/사용자 지시 필요)
- [ ] 갭 로스터 확장(8→16) 승인 여부 → 승인 시 P0 3개 시드화 → P1 5개 → consolidate 재검증.
- [ ] 승인 시 통합 뷰 동기화(`docs/템플릿_한국어_카탈로그.md` v2, `public/_overview.html`).
- [ ] 미승인 시 현행 8개 유지(이미 확정·검증 완료).
