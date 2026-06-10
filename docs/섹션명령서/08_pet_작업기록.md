# 08 펫 — 작업기록 / 분석·결정 로그 (총지휘 read-surface)

> 목적: pet 워커 세션의 **검증 결과·분석·제안**을 파일시스템 백본에 남겨 총지휘가 바로 읽게 함.
> 진실원천 = `src/recipes/seeds/recipes.pet.v2.js`. 이 문서는 그 위의 **결정 기록**.
> 갱신일 **2026-06-10**. 작업단위: pet v2 검증·확정 + 전수 포트폴리오 감사.

---

## 0) 현재 상태 (한눈에)

| 항목 | 상태 |
|---|---|
| 시드 `recipes.pet.v2.js` | ✅ 6개 확정, **변경 없음** (검증만 수행) |
| consolidate 검증 | ✅ pet = OK (node 로딩·비용공식·전역 이름 고유·중복0 통과) |
| 가격 사다리 | ✅ `I2 I2 I2 I5 · R6 R4` (◈2 진입 3개 + 싼 릴스 R4) |
| 🅣 오버레이 규약 | ✅ Pet Product Hero: `text_overlay:true` + negative서 text/logo 제외 |
| ⚠️ 모핑 플래그 | ✅ On-Pet Fit·Talking Pet Skit = `experimental`+`needs_human_review` |
| **커버리지 감사 결과** | ⚠️ **현 6개로는 전 고객 미충족** (~55–60%, 아래 §2) |
| **개선 제안** | 🔶 **PROPOSAL (미반영)** — 승인 시 시드 반영 (아래 §3) |

---

## 1) 확정된 6개 (KEEP) — 변경 없음

| # | 이름 | 타입 | 컷 | ◈ | 역할 |
|---|---|---|---|---|---|
| 1 | Pet Product Hero 🅣 | 📷 | 4 | 2 | 펫 없이 제품 단독 클린 히어로(합성위험0) — ◈2 진입 앵커·최광폭 |
| 2 | Cuddle Hour | 📷 | 4 | 2 | 제품+반려동물 옆 포근 라이프스타일(소프트굿즈·휴식) |
| 3 | Macro Crunch | 📷 | 4 | 2 | 먹이·입자질감 극접사(간식·사료·모래·바닥재) |
| 4 | On-Pet Fit ⚠️ | 📷 | 4 | 5 | 웨어러블 펫 착용 핏(`on_model_tryon`) — experimental·검수 |
| 5 | Wait For The Zoomies | 🎬 | 3 | 6 | 장난감 반응 고에너지 릴 |
| 6 | Talking Pet Skit ⚠️ | 🎬 | 2 | 4 | 토킹펫 코믹 UGC(샷1 B롤+샷2 토킹) — experimental·검수 |

비용공식 정합(image=count×0.5, on_model 4컷=◈5, reel=shots×2) 전수 통과. 전역 이름 충돌 0. **On-Pet Fit ◈5 = "+1"이 아니라 `on_model_tryon` 4컷=◈5 고정관례(전 섹션 동일)** — 정정 기록.

---

## 2) 전수 커버리지 감사 (현 6개 → 전 고객 만족?) = **아니오 (~55–60%)**

펫 제품 전수 ≈ **488품목 / 16카테고리 / 8동물군**(개·고양이·말/조랑말·미니피그·포켓펫·조류/가금·파충류/양서류·곤충/무척추·수생).

**만족도 양극화:**
- 정적 제품샷이 가치 전부인 SKU(식품·간식·소프트가구·번들) → **70–85%**
- 동작·기능화면·스케일·환경·전후증명이 전환을 좌우하는 SKU(테크/스마트11·종특화환경15·작동디바이스10) → **20–35%**

**4대 구조갭:**
1. 🔴 **사람손 일반 영상 UGC 전무** — 붓기 ASMR·언박싱·핸드툴 시연·1회분 데모. 펫 영상이 장난감반응(Zoomies)·토킹(Talking)뿐이라 커머스 최빈 포맷 "사람이 제품 쓰는 영상"을 누구도 못 만듦.
2. 🔴 **테크/계기 UI 합성 슬롯0** — `SAFETY_NEGATIVE`가 화면글자 차단 → GPS·펫카메라·스마트칼라·자동급식/화장실·온습도계·테스트키트의 "작동 화면·데이터"(전환 트리거) 불가.
3. 🟠 **스케일/면적감 부재** — Hero 고립단품은 5kg=20kg 동일하게 보임 → 대용량백·캣타워·가구·대형평면매트의 "내 공간에서의 크기" 못 줌.
4. 🟠 **서식지 환경연출 부재** — 수조·비바리움·테라리움을 건식 Hero로 찍으면 "빈 어항". Macro는 먹이 극접사 전용이라 수중·습지 생태감 불가.

미봉: 듀얼니즈(착용+각인 ID태그·말 할터 네임플레이트), 사람착용 용품(트릿파우치·글러브·메모리얼 주얼리), 시즌 기후무드(쿨링베스트·말담요).

---

## 3) PROPOSAL — 6→12 (미반영 · 사용자 승인 시 시드 적용)

### 3-1) rework 2 (순수 cut 0 — 적대적 검증이 orphan으로 전부 반려)
| 템플릿 | 진단 | 조치 |
|---|---|---|
| Wait For The Zoomies | 최고원가 ◈6 × 장난감 단일카테고리 × 질주컷 모션블러 위험(원가·폭 비율 최악) | 3샷◈6 → **2샷◈4**, 고속질주 opt-in(기본=저속 근접반응), 펫-장난감 인터랙션 비트 보존 |
| On-Pet Fit | ◈5 × 신뢰도 최저(모핑高) × 웨어러블 1카테고리(위험대비 최취약) | 기본 4컷◈5 유지·**고위험 풀바디 1컷 옵션화**, 사이즈/각인은 신규 ◈2로 분산 |

### 3-2) 신규 6 (전부 적대적 검증 통과 · 비용공식 정합)
| 신규 | 타입·◈ | 산출물 | 메우는 갭 | 우선 |
|---|---|---|---|---|
| Single-Hero Sizzle Reel | 🎬1샷 ◈2 | 제품단독 1샷 즉시게시 릴(물흐름·디스펜싱 단일동작) | 릴 최저가 부재 | must |
| Hands-On Pour & Unbox Reel | 🎬2샷 ◈4 | 사람손 붓기·언박싱·핸드툴/1회분 데모 | 갭① | must |
| Device UI Mockup Set 🅣 | 📷4 ◈2 | 디바이스+화면UI 합성(앱·지도·LCD수치, 화면 오프/오버레이) | 갭② | must |
| In-Room Scale Set 🅣 | 📷4 ◈2 | 룸 컨텍스트+크기 레퍼런스(대용량백·캣타워·가구·매트) | 갭③ | strong |
| Habitat Scene Set | 📷4 ◈2 | 수조/비바리움/테라리움 서식지 무드(제품1종 기준 일관렌더) | 갭⑦ | strong |
| Pet Wearable Spec Sheet 🅣 | 📷4 ◈2 | 펫부재 사이즈가이드/각인 매크로(하네스·할터·ID태그 듀얼) | 갭④·On-Pet 위험분산 | strong |

> 개명: 원제안 'On-Pet Size & Spec Guide' → **Pet Wearable Spec Sheet**(펫 미착용인데 'On-Pet' 접두가 `On-Pet Fit`과 혼동). `Single-Hero Sizzle Reel`도 `Pet Product Hero`와 혼동 여지 → 등록 직전 재점검.

### 3-3) 반려 2 (적대적 검증 탈락)
- `Human Wear & Carry Set` — 사람 몸 착용은 `on_model_tryon=◈5`(jewelry `Wrist & Hand`·fashion `Fit & Size On-Body`·beauty `On-Model Glow Drop` 캐논). ◈2 product_composite 책정은 **비용공식 위반**. job(사람착용 펫용품·갭⑤)은 실재 → **◈5+experimental로 재제출** 시 가능.
- `Before & After Proof Set` — beauty `Before/After Result Reel`·home `Empty-to-Styled Reveal`·general `Flat-Lay Grid(before_after)`로 **이미 3중 커버** + 펫 외형 모핑리스크([08_pet.md §4] 'Before/After Grooming' 기각 이력). **general 변형으로 우회 권고**.

### 3-4) 결과 카탈로그 6→12 · 비용사다리 검산
- 📷 image_set ◈2 진입 앵커 7개(무위험 진입 충분).
- 🎬 릴 사다리: **◈2(Sizzle 신설)** · ◈4(Pour&Unbox) · ◈4(Zoomies rework) · ◈4(Talking) → **'싼 릴스 1샷◈2' 규칙 비로소 충족**(확장 전 최저 릴 = ◈4 Talking, experimental뿐이라 미충족이었음).
- on-model ◈5(On-Pet Fit) 보존, 임의가산 0건.

### 3-5) 잔존 한계 (확장 후에도)
사람-온모델 ◈5 슬롯(트릿파우치·메모리얼 주얼리) · before/after 효과증명 · 시즌 기후무드 · 대형동물(말/미니피그) 착용 신뢰샷 · 테크 "실제 작동영상" · 노스킬 12개 선택피로(추천 디폴트 큐레이션 필요).

---

## 4) 교차섹션 ACTION (총지휘 처리)
- **[pet→general]** 펫 before/after는 펫 전용 신설 대신 general `Flat-Lay Grid`의 `before_after` 변형(image_set) 노출로 우회 → general 워커와 조율.
- **[캐논]** 사람착용(on_model) 슬롯은 ◈5+experimental로 통일(`Wrist & Hand` 등) — 펫 'Human Wear & Carry Set' 재제출 시 정합 확인.
- **[적용 전]** 신규 6개 이름 **77개 전수 exact-match grep** + 위 개명 확정 선행.

## 5) 다음 (사용자 승인 대기)
- **A)** 신규 6개 풀 스펙(영어 프롬프트+샷리스트+negative) 작성 + 시드 append
- **B)** rework 2개(Zoomies 2샷·On-Pet 풀바디 옵션화) 시드 반영
- **C)** must 3개만 최소확장(9개)
적용 시 §3-4 비용사다리·77개 이름 grep 재검증 후 `_결과.md`·`_카탈로그.md`·`_overview.html` 동기화 + consolidate 재실행.
