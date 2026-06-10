# UGC × 제품 버티컬 — 충실도 프로파일 적용·기록 (2026-06-10)

> 결론(이 대화): UGC를 제품 버티컬에 **병합하지 않음.** UGC = 공용 광고-포맷 라이브러리로 두고,
> 버티컬에서 `[이 제품으로 UGC 광고]` 로 건너올 때 **제품 레퍼런스 + 그 버티컬의 충실도 프로파일**만 얹는다.
> 연결 단위 = **제품/버티컬(8개)**, 템플릿(76개)이 아님.
> 데이터 시드: [`src/recipes/seeds/ugc.fidelity_profiles.v2.js`](../src/recipes/seeds/ugc.fidelity_profiles.v2.js) (node 로딩 검증 완료).
> 근거 = 8개 제품 시드 `recipes.*.v2.js` 의 `look.negative` 정독·추출.

---

## 1. 핵심 판단 — 3분류 (동일 / 동일제거 / 차등)

UGC 브리지가 base UGC 레시피에 얹는 것을 3층으로 나눴다.

| 층 | 적용 방식 | 내용 | 왜 |
|---|---|---|---|
| **① 동일 적용** | 8개 버티컬 **모두 같게** | 제품 보존(shape/color/material/finish/proportion 동일) + 스포크스퍼슨/립싱크/손 하드닝 | 제품이 뭐든 "레퍼런스와 동일 유지" + "말하는 사람"은 공통 |
| **② 동일 제거** | 8개 버티컬 **모두 같게 해제** | 제품 템플릿의 **반-인물 가드**(`no model`·`hands`·`faces or heads in frame`·`live model`) | 제품 모드는 "사람 빼"가 기본이지만 UGC는 **사람이 주인공** → 전 버티컬에서 그 금지를 뒤집어야 함 |
| **③ 차등 적용** | 버티컬마다 **다르게** | 제품 충실도 네거티브 + 제품-상호작용(착용/사용) + 추가 리스크 | 제품의 소재·크기·착용 방식이 버티컬마다 근본적으로 다름 |

> **가장 비직관적 포인트(꼭 기록):** ②. 예) `food` 제품 템플릿은 `"hands"`·`"faces or heads in frame"`·`"people's faces"`를 **금지**한다(깨끗한 음식컷용). 그런데 UGC food = *사람이 먹는 영상*이라 이 금지를 **반드시 해제**해야 한다. 이런 "반-인물 가드"는 fashion 360(`live model in frame`)·general(`model or hands in frame`)에도 있어 **전 버티컬 공통 제거** 대상.

---

## 2. 버티컬 그룹핑 — 동일 적용 가능 vs 차등 필수

`bespoke`(고유화 정도)와 `has_onmodel_seed`(사람-제품 시드가 이미 있나)로 갈린다.

| 그룹 | 버티컬 | bespoke | 사람-제품 시드 | 처리 |
|---|---|---|---|---|
| **A. 동일 적용(저-bespoke)** | **general** | low | ✗ | COMMON 그대로(general=catch-all=공통 그 자체, 추가 네거티브 0) |
| | **home** | low | ✗ | COMMON + 경량(비율/스케일/룸 지오메트리만) |
| | **tech** | medium | ✗ | COMMON + 포트/버튼/UI텍스트 + 부분손 크롭(finger_risk) |
| **B. 차등 필수(고-bespoke)** | **fashion** | high | ✓ | 착장 드레이프/프린트/핏 + 전신 착용 |
| | **beauty** | high | ✓ | 라벨/셰이드 + 피부 적용 + 동일인물(before/after) + 🅣오버레이 |
| | **jewelry** | high | ✓ | 패싯/스톤/프롱 + **손목 착용 = 손가락 리스크 최고** |
| | **pet** | high | ✓ | 제품-온펫 + 펫 anatomy 모핑(muzzle/limb) |
| | **food** | high | ✗ | 식용 정확도 + **가드 인버전(반-인물 금지 해제)** |

**해석**
- **동일 적용 가능 = general·home·tech** — 사람-제품 시드가 없고(=재사용/충돌 없음) 제품 충실도가 단순(고정형 사물). COMMON 한 벌로 거의 균일 적용. `general`은 사실상 COMMON 그 자체.
- **차등 필수 = fashion·beauty·jewelry·pet·food** — (i) 착용/적용/식용처럼 **제품-상호작용이 근본적으로 다르고**, (ii) 소재별 고유 충실도 가드가 다르며, (iii) 손가락·동일인물·펫모핑·가드인버전 등 **고유 리스크**가 붙는다.
  - 이 중 **fashion·beauty·jewelry·pet은 이미 `on_model_tryon`(사람이 제품 착용) 시드가 존재** → 그 시드의 충실도/리스크 네거티브를 **프로파일로 재사용**(새로 발명 X). = "시드로 작성해놓은 것".
  - **food는 사람-제품 시드가 없음**(제품 템플릿이 사람을 금지) → 프로파일을 **신규 정의** + 가드 인버전. = "시드 아닌 것".

---

## 3. 적용 규칙 (resolver/bridge가 합성하는 순서)

```
bridgedLook = base UGC 레시피.look (Demo / Testimonial / Hook+CTA … 중 택1)
  + COMMON.add_positive                       // ① 제품 보존(공통)
  + COMMON.add_negative                        // ①
  + COMMON.spokesperson_negative               // ① 립싱크/손/정체성(공통)
  − COMMON.remove_negative[]                    // ② 반-인물 가드 해제(전 버티컬 공통)
  + PROFILES[vertical].fidelity_negative        // ③ 버티컬 고유 충실도
  + PROFILES[vertical].finger_negative/pet_negative (있으면)  // ③ 고유 리스크
  ⇒ interaction/framing/extra_flags = PROFILES[vertical] 값으로 샷 구성·플래그
```

- `flags`는 항상 `['experimental','needs_human_review']`(UGC=말하는 인물) + 버티컬 `extra_flags`.
- `beauty.text_overlay`·🅣 류 문구는 AI로 그리지 않고 오버레이(엔진 SAFETY_NEGATIVE 정합).

---

## 4. 산출물 & 다음 단계
- **시드(데이터)**: `src/recipes/seeds/ugc.fidelity_profiles.v2.js` — `COMMON`(①②) + `PROFILES`(③) 8버티컬.
- **이 문서**: 동일/제거/차등 판단 + 그룹핑 기록.
- **후속(미구현)**: ⑴ resolver에 `mergeUGC()` 합성 로직, ⑵ studio.html 제품 버티컬에 `[이 제품으로 UGC 광고]` 브리지 버튼(제품+vertical 프로파일 전달), ⑶ 실렌더 QA로 버티컬별 충실도 네거티브 미세조정.
