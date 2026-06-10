# 06 홈 & 리빙 — 작업기록 / 분석·결정 로그 (총지휘 read-surface)

> 목적: home 워커 세션의 **검증 결과·분석·제안**을 파일시스템 백본에 남겨 총지휘가 바로 읽게 함.
> 진실원천 = `src/recipes/seeds/recipes.home.v2.js`. 이 문서는 그 위의 **결정 기록**.
> 갱신일 **2026-06-10**. 작업단위: home v2 검증·확정 + 전수 커버리지 감사.

---

## 0) 현재 상태 (한눈에)

| 항목 | 상태 |
|---|---|
| 시드 `recipes.home.v2.js` | ✅ 6개 확정, **변경 없음** (검증만 수행) |
| consolidate 검증 | ✅ home = OK (node 로딩·비용공식·전역 이름 고유 통과) |
| 가격 사다리 | ✅ `I2 I3 I3 · R4 R6 R6` (◈2 진입 + 싼릴 R4) |
| 🅣 오버레이 규약 | ✅ Scale & Dimensions: `text_overlay:true` + negative서 text/logo 제외 + render_notes 유지 |
| **커버리지 감사 결과** | ⚠️ **현 6개로는 전 고객 미충족** (아래 §2) |
| **개선 제안** | 🔶 **PROPOSAL (미반영)** — 승인 시 시드 반영 (아래 §3) |

---

## 1) 확정된 6개 (KEEP) — 변경 없음

| # | 이름 | 타입 | 컷 | ◈ | 역할 |
|---|---|---|---|---|---|
| 1 | Room & Warmth Styled | 📷 | 6 | 3 | 동경 룸씬(아침~골든아워) — 병합(Quiet Luxe+Golden Hour) |
| 2 | Material Detail Suite | 📷 | 6 | 3 | 소재 매크로 3 + 톤 플랫레이 3 — 병합(Macro+Flatlay) |
| 3 | Scale & Dimensions Frame 🅣 | 📷 | 4 | 2 | 치수 오버레이(반품 방지) — ◈2 진입 |
| 4 | Quick Warmth Snap | 🎬 | 2 | 4 | 싼 감성 릴 — **약체(아래 §3 교체 대상)** |
| 5 | Empty-to-Styled Reveal | 🎬 | 3 | 6 | 빈방→꾸민방 변신 — 확정 위너 |
| 6 | Slow ASMR Detail | 🎬 | 3 | 6 | 슬로우 소재 매크로 모션 |

비용공식 정합(image=count×0.5, reel=shots×2) 전수 통과. 전역 이름 충돌 0(로드되는 v2 카탈로그 기준).

---

## 2) 전수 커버리지 감사 (현 6개 → 전 고객 만족 가능?) = **아니오**

home 제품 전수 ≈ **180품목 / 7축**(가구·조명·데코오브제·테이블웨어·텍스타일·그린향·수납소형가전). 8개 클러스터 만족도:

| 클러스터 | 만족도 | 최대 미충족 컷 |
|---|---|---|
| 그린·향 | 🟢 80% | 향초 점등(조명과 공유) |
| 테이블웨어·주방 | 🟡 65% | 흰배경 단독 히어로 |
| 멀티컬러 변형군 | 🟡 62% | 색상/옵션 비교 그리드 |
| 대형 가구 | 🟡 58% | 라이프스타일 사용 맥락 |
| 데코 소형 오브제 | 🟡 55% | 흰배경 PDP, 색상 그리드 |
| 텍스타일 | 🟡 55% | 컬러웨이 그리드 |
| **수납·생활** | 🟠 **40%** | **용량·기능 시연** |
| **조명** | 🔴 **25%** | **점등(ON)·야간 분위기** |

**핵심 진단**: 현 6개는 전부 *낮·밝은·정적 관찰 모드* → **점등 / 기능 / 색상비교** 3대 축이 비어 있음. 조명·수납이 blocker.

---

## 3) 개선 제안 (PROPOSAL — 미반영, 승인 후 시드 반영)

> 제안 에이전트 신규 2개(Day-to-Night, Lifestyle Furniture) 중 **Lifestyle Furniture는 적대검증 기각**(home 정체성=사람 없음 위반). 검증 반영한 최종안 = **카탈로그 6→7, 비대화 최소**.

### 약체 템플릿 (삭제·개편)
- 🔻 **Quick Warmth Snap (🎬2샷 ◈4)** — 카탈로그 최약체. Room & Warmth와 무드·라이팅 **중복**, 2샷으로 무증명, 짐벌+f/2.0는 사실상 ◈6 난이도(◈4 허위 가성비). → **교체.**

### 변경안 (net +1)
| 액션 | 템플릿 | 타입/◈ | 메우는 갭 |
|---|---|---|---|
| **교체** | Quick Warmth Snap → **Day-to-Night Lighting Reveal** | 🎬2샷 ◈4 | 조명 blocker(점등·야간). 순증 0, 싼릴 R4 유지. ⚠️엔진=제품 발광체 야간 렌더 필요 |
| **추가** | **Variant Showcase Grid** ★신규 | 📷4컷 ◈2 | 멀티컬러/마감 비교(제품 55~60%가 멀티-SKU). 적대검증이 유일하게 ADD 승인 |

### editable_slot으로 흡수 (신규 템플릿 ❌ — 안티-비대화)
시즌 리스타일 · 스타일 스왑 · 대형가구 구조 매크로 · 선반 스타일링 · 라이프스타일 스케일 · 화분 그리드 → Room & Warmth / Material Detail의 `editable_slot` 변형.

### 추가하지 말 것 (검증 근거)
| 후보 | 기각 사유 |
|---|---|
| Lifestyle Furniture (사람 사용) | home 정체성 위반 — 사람/실루엣도 신체 프롭(브리프가 Cozy Hands 자른 리스크) |
| Cozy Hands B-roll | 동일(손가락 리스크) |
| Single-Object Hero (흰배경 PDP) | 실제 니즈지만 **shopping 카탈로그 Studio Lookbook(◈2)이 이미 커버** → home은 "공간 맥락" 차별성 유지 |
| Functional Storage Reveal | 서랍 열기·정리에 손 필요 → 정체성 위반. 수납은 Scale+Material+Room 조합으로 |
| Shoppable Tour Pan | 다제품 모핑·공간 일관성 리스크 |

### 제안 적용 시 최종 사다리 (7개) — 재검증 ✓
```
📷 ◈2  Scale & Dimensions Frame 🅣
📷 ◈2  Variant Showcase Grid        ★신규
📷 ◈3  Room & Warmth Styled
📷 ◈3  Material Detail Suite
🎬 ◈4  Day-to-Night Lighting Reveal ★교체 (← Quick Warmth Snap)
🎬 ◈6  Empty-to-Styled Reveal
🎬 ◈6  Slow ASMR Detail
```
✓ ◈2 진입 2개 · ✓ 싼릴 R4 · ✓ 개수 7∈[6,8] · ✓ 비용공식 정합

---

## 4) 후속 (승인 대기)

- [ ] **승인 시** 시드 반영: Variant Showcase Grid 추가 + Quick Warmth→Day-to-Night 교체 → `node scripts/consolidate_recipes.js` 재검증 → 전역 이름 고유 확인
- [ ] 반영 후 `docs/템플릿_한국어_카탈로그.md`(home 섹션 6→7) + `docs/템플릿_v2_발굴선별강화_결과.md`(home keep/cut/add) 동기화
- [ ] 엔진 의존 노트: ① Scale 치수 오버레이(기존) ② **Day-to-Night 야간 발광 렌더**(신규) — `imagePrompt.builder.js`/렌더 파이프라인 확인 필요
- [ ] 현재까지 **시드 미변경** — 위 §3은 의사결정 대기 상태

> 분석 근거 원본: 본 세션 워크플로 3건(전수열거 / 커버리지감사 / 적대검증). 총지휘는 이 문서로 home 현황·제안을 즉시 파악 가능.
