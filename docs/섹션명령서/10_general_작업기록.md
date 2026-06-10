# 10 General/기타제품 — 워커 작업기록 (총지휘 수거용)

> 워커 세션이 작업할 때마다 여기에 바로 기록 → 총지휘가 `docs/섹션명령서/`에서 읽음.
> 공유 백본 정본 = `recipes.general.v2.js`(시드) + `_STATUS.md`(자동생성). 이 파일은 **시드에 안 들어가는 검증결과·분석·결정요청**을 남기는 곳.
> 규칙: 워커는 파일만 저장(commit/push 금지). 로스터 스코프 변경·엔진 작업은 총지휘/Chief/개발자 결정.

---

## 2026-06-10 · v2 net-new 7개 생성 ✅ (브리프 `10_general.md` 수행)
- **시드:** `src/recipes/seeds/recipes.general.v2.js` — net-new 7개. `node` 로딩 OK, `consolidate_recipes.js` 수거 OK(이슈 0, 중복이름 0).
- **정체성:** 전부 무모델(subject=product · reference_strategy=product_composite · min_refs=1). 7버티컬 어디에도 안 드는 catch-all 보집합.
- **비용공식 전수 통과:** `📷 Hero2 Lifestyle2 Packaging2 Macro2 FlatLay2 · 🎬 Reel4(2샷) Spin6(3샷)`. image=count×0.5, reel=shots×2. 임의가산 0.
- **⚠️ 이름 전역 고유 — 충돌 2건 발견·개명:** 브리프 원안 `Quick-Drop Teaser Reel`·`360 Product Spin`이 **fashion v2와 exact-match 충돌** → `Any-Product Drop Reel`·`Universal 360 Spin`으로 개명(8버티컬 전역 중복 0 확인). 나머지 5개는 충돌 없음.
- **🅣 오버레이 2개**(Packaging·Flat-Lay): `text_overlay:true`, `look.negative`에 bare `text`/`logo` 미주입 확인.
- (이후 사용자 편집: Macro Detail ◈3→◈2 재조정, Flat-Lay scale_cue를 손 미포함(동전/머그)으로 — 반영됨.)

---

## 2026-06-10 · 추가 분석 + v2.1 만족설계 (사용자 요청 — 멀티에이전트 ultracode)

### A. 제품 유니버스 — "General에 어떤 제품이 다 포함되나"
- catch-all 보집합을 **30 대분류(A~DD)** 로 전수 매핑(렌즈 6 + 완결성 비평). 캔들/문구/보충제/패키지F&B/원예/취미DIY/완구/파티/주방소모품/청소세탁/자동차공구/베이비/피트니스캠핑/플랫지류/뷰티도구/디지털액세서리/정리수납/조형물/연질소품/종교명절/기프트구독/초소형 + (비평추가) 악기·STEM·물리매체·여행잡화·전기패시브·비처방아이웨어·스포츠·흡연안전지대.

### B. 커버리지 감사 — "7버티컬 대조, General이 나머지 전부 덮나"
- 7버티컬 실제 스코프(브리프+시드)를 읽어 General 30군과 대조 → **구멍 11+종 식별.** (한방식품·주류잡화·입체각인·시상표창·헤어/네일부자재·비처방의료·동물사육·패키지농자재·소형침장·차량직물 + 대형본체군.)
- **결정적 구조 결함:** M·W·K·L·N·CC가 카테고리명으론 영역을 주장하나 **1m+ 대형 본체(자전거·대형악기·유모차·휠체어·캐리어·대형레저·롤업배너)는 7개 소형 정물 템플릿에 물리적으로 못 올라감** = 정의 vs 촬영수단 불일치.

### C. 만족도 판정 — "구멍을 템플릿에 흡수하면 고객 만족하나"
- 구멍 18종을 템플릿 라우팅 → 렌더 예측 → **적대적 QA 반증**. 결과: **즉시 만족 0종.** 소형 라벨/각인군은 보정 가능(부분), 1m+ 대형은 보정 불가(신규 템플릿 필수).
- 가로지르는 3대 실패축: **글자(text)** SAFETY-kill / **투명·정반사** 굴절 morph / **연질·유기·스케일** drape·증식·크기오인.

### D. v2.1 설계 반영 ✅ — "대다수 만족권 진입" (시드 반영 완료)
시드 `recipes.general.v2.js`를 v2.1로 갱신. **8개(7→8, 6~8 캡 준수)**, consolidate 11/11 OK·총 77개·중복 0·exit 0.

| # | 이름 | 타입 | 컷 | ◈ | 카테고리 | guards / 변형 |
|---|---|---|---|---|---|---|
| 1 | Clean Hero Pack | 📷 | 4 | 2 | Hero | single_sku·label_lock·scale_cue·form_lock |
| 2 | Lifestyle-in-Context | 📷 | 4 | 2 | Lifestyle | single_sku·label_lock·form_lock **(+in_use_form/faceless_mannequin 변형)** |
| 3 | Packaging & Unboxing | 📷 | 4 | 2 | Packaging 🅣 | label_lock·single_sku·form_lock |
| 4 | Macro Detail | 📷 | 4 | 2 | Detail | label_lock·count_lock·reflection_control·form_lock **(+engraving_relief 변형)** |
| 5 | Flat-Lay Grid | 📷 | 4 | 2 | FlatLay 🅣 | count_lock·scale_cue·label_lock·form_lock |
| 6 | Any-Product Drop Reel | 🎬 | 2 | 4 | Reel | single_sku·form_lock·reflection_control |
| 7 | Universal 360 Spin | 🎬 | 3 | 6 | Reel ⚠️ | single_sku·form_lock·reflection_control |
| 8 | **Large-Format Hero** | 📷 | 4 | 2 | Hero ⚠️oversize **(NEW)** | scale_cue·count_lock·form_lock·label_lock·reflection_control |

- **신규 비표준 컨벤션 — 총지휘 인지 필요:**
  - **`config.guards[]`** (6종: label_lock·single_sku·count_lock·scale_cue·reflection_control·form_lock) — consolidate는 검증 안 하지만 엔진이 소비할 가드 선언. 헤더에 규약 문서화.
  - **`meta.style_variants`** 흡수: Macro→engraving_relief(각인 디테일컷), Lifestyle→in_use_form/faceless_mannequin(얼굴·손 없는 사용맥락컷). 단독 템플릿 신설 대신 변형으로 흡수해 6~8 캡 유지.
  - **Large-Format Hero**: 1m+ 본체 전용, `editable_slots:[{output.aspect_ratio}]`(가로/세로 오버라이드), `meta.flags:[experimental,needs_human_review,oversize]`, 360/언박싱 off.
- **검증(재판정, by-design=가드 honor 전제 / today=현 엔진):**
  - by-design: **satisfied 11~12 / partial 6 / unsatisfied 0** → "대다수 진입" **설계상 달성**.
  - today: **satisfied 0 / partial 12 / unsatisfied 6** → 미실현. **단일 원인 = 엔진이 가드를 아직 안 읽음**(아래 핸드오프).

---

## ⚙️ ENGINE 도메인 핸드오프 (총지휘→Chief→개발자 라우팅 필요)

> ⚠️ 엔진=개발자(eatapple1004) 전담(`_HANDOFF_to_CHIEF.md` D항). 아래는 **시드 단독으로 안 듣는, 개발자에게 넘길 요구**. 워커가 엔진 코드 수정 안 함.
> today를 by-design(만족 11~12종)으로 수렴시키려면 ROI 순서대로:

| 우선 | 엔진 작업 | 영향 | 근거 |
|---|---|---|---|
| **1** | **⑥ `config.guards[]` 소비 + 리졸버 매핑버그** — `recipeResolver.js:148`이 `look.extra_negative`만 읽어 시드 `look.negative`(방어 negative) **통째 미적용**. (W4 리졸버 영역) | **18종 + 전 11버티컬** | 거의 한 줄. 모든 선언 가드를 살리는 마스터 스위치. 현 모든 negative 방어가 새는 정합 버그. |
| **2** | **⑤ SAFETY `text`/`logo` '디자인 면' 예외** (`imagePrompt.builder.js:27` 전역주입) + **① label_lock 픽셀 마스킹/inpaint** | 8~9종 | "글자=제품가치"군(사이니지·농자재·도장·트로피·한방식품)의 유일 치명 구멍. |
| **3** | **② 1m+ 자동 라우팅 → Large-Format Hero / '미지원' 정직반환** | 대형 8종 | keystone이 "존재해도 안 닿는" 문제. 노스킬 셀러 전제상 수동선택은 baseline 회귀. |
| **4** | **④ `meta.style_variants` 게이트 소비** (마네킹·engraving·before_after) | 4종(가발·네일·차량커버·의료재활) | 사용맥락컷 lift 발동. ②와 함께. |
| **5** | **③ scale_cue / text_overlay 결정론 합성** | 소형 부자재 다수 | 크기 전달·캡션. 점진 개선이라 후순위. |

- **inherent(구조적 한계 — 구현 말고 '미지원' 정직반환 권고):** 2~4m 초대형(서핑보드·카약·드럼셋·대형 현수막). 시드 `render_notes`의 미지원 분기를 **엔진에서 실제 차단 경로로 승격**할 것. 거짓 PARTIAL 금지.

---

## 다음 액션 (대기 — 총지휘/Chief/사용자 지시 필요)
- [ ] **엔진 핸드오프 ⑥(L148 매핑버그 + guards 소비)** = 전 버티컬 마스터 스위치. Chief→개발자 전달 / `BACKEND_HANDOFF.md` 체크리스트 등재 권고.
- [ ] **통합 뷰 동기화**(총지휘 DoD §6): `public/_overview.html` 데이터 + `docs/템플릿_한국어_카탈로그.md`에 general 8개 추가.
- [ ] **studio 와이어링**(총지휘 DoD §6): `public/studio.html` 모드/VERTICALS에 `general` 등록(딥링크 `?vertical=general`) — 안 하면 UI 미노출. (Large-Format Hero의 aspect editable_slot UI 노출 포함.)
- [ ] 시드 측은 v2.1 확정·검증 완료 — 추가 시드 작업은 엔진 ⑥ 반영 후 재판정으로 트리거.
