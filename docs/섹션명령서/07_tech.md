# 섹션 작업 명령서 — 테크 (가젯/전자) (key: tech)

> 이 브리프 하나만 보고 테크 섹션 착수 가능(self-contained). 작업 디렉터리 `~/HeyHoAI`.
> 상태=**기존(existing)** — v2 초안 시드(`src/recipes/seeds/recipes.tech.v2.js`)가 7개 템플릿으로 이미 존재. 본 작업은 **재설계가 아니라 검증·확정 + 산출물 스펙 마무리**다.

---

## 1) 정체성

- **mode:** `product` (제품 모드 — 유저가 가젯 사진 1장 업로드)
- **subject:** `type: product` · `reference_strategy: product_composite` · `min_refs: 1` (얼굴 identity_lock 아님 — 제품 형상 보존이 핵심)
- **한 줄 정의:** 가젯/전자 셀러가 제품 사진 1장으로 **PDP 히어로·스펙 인포그래픽·빌드퀄 매크로·in-hand 데모·언박싱·360** 까지 출시 카탈로그 1세트를 뽑는 섹션. 전 카탈로그 중 **최응집(진단 7/10)** — 포맷 결손은 적고, 핵심 리스크는 **스펙 텍스트(글자)와 in-hand 손가락** 두 가지뿐.

---

## 2) 타깃 유저 & JTBD

- **누가:** Amazon/마켓플레이스 리스터, DTC 가젯 브랜드(이어버드·웨어러블·충전기·주변기기·스마트홈), 테크 리뷰/언박싱 크리에이터.
- **뭘 파나:** 물성이 있는 소형 전자기기 — 사진만 보면 **빌드퀄·크기·작동 방식**이 안 보여서 못 사는 카테고리. 그래서 "보여주기"가 곧 전환.
- **매출에 필요한 컷(JTBD 순서):**
  1. **PDP 리드 이미지** — 깨끗한 보이드 히어로(광고/썸네일 1순위).
  2. **스펙 콜아웃** — "노이즈캔슬링·40h·IPX4" 같은 사양을 시각화한 인포그래픽 패널(마켓플레이스 리스팅 표준). → **글자 필요 = 🅣 오버레이**.
  3. **빌드퀄 매크로** — 알루미늄 결·메시·각인. 프리미엄 가격 정당화.
  4. **in-hand 데모(2026 표준)** — 손에 쥐고 쓰는 컷. 크기감·실사용 신뢰. → **손가락 리스크**.
  5. **언박싱 / 360** — 신제품 드롭 하이프 + 전 각도 증명(PDP 루프·페이드 광고 B롤).

---

## 3) 현재 상태 (기존 — v2 초안 7개, 그대로 검증·확정)

`recipes.tech.v2.js` 실제 내용 (이름 · 타입 · ◈ · 특이):

| # | 이름 | 타입 | 컷 | ◈ | 특이 |
|---|---|---|---|---|---|
| 1 | Void Hero Cut | 📷 image_set | 4 | 2 | 무한 블랙 보이드 PDP 히어로 |
| 2 | Spec Callout Grid | 📷 image_set | 4 | 2 | **🅣** `text_overlay:true` + negative에서 text/logo 제외 + `meta.render_notes` 有 |
| 3 | Macro Tactile Zoom | 📷 image_set | 4 | 2 | 빌드퀄 극접사 (◈4→◈2 리프라이스 완료) |
| 4 | Desk Setup Flatlay | 📷 image_set | 4 | 2 | 라이프스타일 데스크 (◈3→◈2) |
| 5 | In-hand Quick Demo | 🎬 reel | 2 | 4 | **⚠️** `meta.flags:['experimental']` + 부분 손 크롭 negative |
| 6 | Unbox ASMR Reel | 🎬 reel | 3 | 6 | 런칭 티저 |
| 7 | 360 Glow Spin | 🎬 reel | 3 | 6 | 턴테이블 전 각도, transition=fade |

- 가격 사다리(검증 완료, 위반 0): **I2 I2 I2 I2 · R4 R6 R6**. ◈2 진입 ✓ / 싼 릴스 R4(In-hand) ✓.
- v1 대비 변경: Macro·Desk 리프라이스(→◈2), Spec Grid에 text_overlay 패치, **In-hand Quick Demo 신규 추가**.
- **본 작업 = 이 7개를 검증·확정하고 ③강화에서 각 템플릿 산출물 스펙을 한국어로 마무리**한다. 아래 ①②는 "빠진 게 없는지 재확인"용 — 결손이 거의 없으므로 keep 위주로 끝날 가능성이 높다.

---

## 4) ① 발굴 (Discover) — 테크 2026 포맷 브레인스톰

이미 7개가 핵심을 덮으므로, **결손 후보를 재점검**하는 용도로 폭넓게 나열(이름 · 무엇을/왜 · 사진/영상 · 예상◈):

1. **Void Hero Cut** — 무한 블랙 보이드 PDP 히어로 · 📷4 · ◈2 *(보유)*
2. **Spec Callout Grid** — 여백 패널 + 스펙 텍스트 오버레이 인포그래픽 · 📷4 · ◈2 🅣 *(보유)*
3. **Macro Tactile Zoom** — 메탈/메시/각인 빌드퀄 극접사 · 📷4 · ◈2 *(보유)*
4. **Desk Setup Flatlay** — 감성 데스크 라이프스타일 맥락 · 📷4 · ◈2 *(보유)*
5. **In-hand Quick Demo** — 부분 손 크롭 인핸드 사용 데모 · 🎬2 · ◈4 ⚠️ *(보유)*
6. **Unbox ASMR Reel** — 박스→오픈→히어로 언박싱 · 🎬3 · ◈6 *(보유)*
7. **360 Glow Spin** — 턴테이블 전 각도 회전 · 🎬3 · ◈6 *(보유)*
8. **Quick Hero Snap** *(후보 신규)* — 1샷 슬로우 푸시인 히어로 클립, 스토리 즉시 게시 · 🎬1 · ◈2. → 현재 가장 싼 릴스가 ◈4라 "1샷 ◈2 진입 릴스"가 비어 있음. **유일하게 진지하게 검토할 add 후보.**
9. **White-BG Pack** *(후보)* — 마켓플레이스 규격 순백 배경 4컷(Amazon main image 룰) · 📷4 · ◈2. → Void Hero가 흡수 가능, 별 슬롯 가치 낮음 → 보통 cut.
10. **Cable & Port Detail** *(후보)* — 단자/연결 구성 설명컷 · 📷4 · ◈2. → Macro Tactile + Spec Grid로 커버, 중복.
11. **Scale-in-Hand / Coin Reference** *(후보)* 🅣 — 동전·손 기준 크기 증명 + 치수 오버레이 · 📷4 · ◈2. → in-hand가 손가락 리스크 동반, 크기 증명은 360/Macro로 일부 대체. 주얼리·홈의 Scale 프레임과 컨셉 중복 → 보통 보류.
12. **"TikTok Made Me Buy It" POV** *(후보)* — 표정 리액션 발견형 광고 · 🎬1 · ◈2. → 이건 본질적으로 UGC 카탈로그(얼굴/identity_lock) 소관. **제품모드 테크 섹션에는 넣지 말 것**(모드 불일치).

**빠진 전환 프레임 점검 결과:** 스펙(2)·빌드퀄(3)·in-hand(5)·크기/360(7) 모두 보유. 결손은 사실상 **1샷 ◈2 진입 릴스** 하나뿐.

---

## 5) ② 선별 (Select) — 4축 평가 + keep/cut/merge/add

**4축:**
- **커버리지:** 히어로·스펙·매크로·라이프스타일·in-hand·언박싱·360 — 핵심 상업 컷 전부 덮음. 중복 없음(Void=드라마틱 단독, Desk=맥락, Macro=질감으로 역할 분리). ✅
- **트렌드 적합:** in-hand(2026 표준)·언박싱·360 모두 IG Reels/TikTok 현역. 구식 컷 없음. ✅
- **원가-가치:** 사진 4종 전부 ◈2(진입 친화), 릴스 R4/R6/R6 공식 정합. ✅
- **AI 난이도:** Spec Grid 글자(오버레이로 해소) · In-hand 손가락(부분 크롭+experimental로 완화). 그 외 제품 정물/턴테이블은 저위험. ✅

**최종 권장: 7개 keep(현행 유지).** 8개로 늘릴지는 아래 add 후보로만 결정.

| 결정 | 항목 | 이유 |
|---|---|---|
| **keep** | Void / Spec Grid / Macro / Desk / In-hand / Unbox / 360 | 4축 전부 통과, 가격 사다리 위반 0 |
| **cut** | White-BG Pack, Cable & Port | Void·Macro·Spec Grid가 흡수, near-duplicate |
| **merge** | (없음) | 7개 역할이 이미 분리됨 |
| **add(선택)** | **Quick Hero Snap** 🎬1 ◈2 | 1샷 ◈2 진입 릴스 신설 → 8/9 카탈로그가 가진 "싼 릴스 ◈2~4" 정합. 채택 시 사다리 `… R2 R4 R6 R6`, 총 8개 |
| **금지** | POV/Scale-in-Hand 등 얼굴·과중복 | 모드 불일치 또는 타 카탈로그 소관 |

**가격사다리(권장 최종):** 채택 시 **I2 I2 I2 I2 · R2 R4 R6 R6** (◈2 진입 ✓, 싼 릴스 R2 ✓). Quick Hero Snap을 빼면 현행 7개 그대로 둔다(둘 다 허용 — 진단상 결손이 작아 강제 add 아님).

---

## 6) ③ 강화 (Enhance) — 산출물 스펙 + 레시피 확정

각 템플릿 "정확히 무슨 사진/영상을 만드는지". v2 시드의 영어 프롬프트는 이미 작성됨 — **검증하고, 한국어 산출물 스펙을 확정**한다. 테크 특유 주의 굵게.

**1. Void Hero Cut** 📷4 ◈2
- 산출물: 무한 매트블랙 보이드에 제품 단독. ①정면 히어로 ②3/4 측면(쿨 림라이트) ③살짝 부양 레비테이션 ④후/측면 포트·디테일.
- 레시피 핵심: single softbox key(좌상) + cool rim, 100mm macro/f8 딥포커스, soft contact shadow, glossy 런칭 광고룩.
- negative: warped geometry, duplicated ports/buttons, fake logos, harsh blown highlights, camera reflection, plastic toy look, color shift.

**2. Spec Callout Grid** 📷4 ◈2 **🅣**
- 산출물: 제품을 프레임 한쪽에 오프셋, **반대편에 넓은 네거티브 스페이스(빈 패널)만** 렌더. 스펙 텍스트·리더라인·헤드라인은 **렌더 후 결정적 오버레이 레이어**가 채움.
- ⚠️ **테크 최난이도 리스크:** 전역 `SAFETY_NEGATIVE`가 'text','logo'를 주입 → **글자를 AI로 그리지 말 것.** v2에 이미 `text_overlay:true` + look.negative에서 text/logo **제외** + `meta.render_notes`(빈 콜아웃 존만 생성) 설정됨. **이 3개가 살아있는지 반드시 확인.**
- 4컷: ①우측 여백 정면 ②컨트롤/버튼 3/4 ③상단 여백 톱다운 틸트 ④포트/충전부 클로즈업.
- negative(text/logo 없이): warped geometry, extra ports, cluttered bg, harsh shadows, arrows touching product.

**3. Macro Tactile Zoom** 📷4 ◈2
- 산출물: 빌드퀄 셀링 극접사. ①브러시드 메탈 결 ②버튼/다이얼 머시닝 ③스피커 메시/센서 ④각인 챔퍼/심.
- 레시피 핵심: raking grazing light, 100mm macro/f4 razor-thin focus + focus-stacked sharpness, 럭셔리 craftsmanship.
- negative: mushy/out-of-focus, repeating pattern artifacts, dust/lint, fingerprints, invented text/logos, oversharpening halos, duplicated seams.

**4. Desk Setup Flatlay** 📷4 ◈2
- 산출물: 감성 데스크 라이프스타일. ①탑다운 월넛 플랫레이(식물·노트·커피) ②창가 45° 사용맥락 ③전경 제품+배경 보케 ④소품 1개와 디테일.
- 레시피 핵심: soft window daylight, warm neutral, walnut+linen, 35mm, 제품 tack-sharp, 정돈된 네거티브 스페이스.
- negative: duplicated devices, cluttered desk, competing bright props, baked-in text, blown window, tangled cables, off-scale props.

**5. In-hand Quick Demo** 🎬2 ◈4 **⚠️ experimental**
- 산출물: 손에 쥐고 쓰는 인핸드 데모 2샷. 샷1=아래 프레임에서 손목이 올라오며 제품 그립(정면 선명). 샷2=살짝 틸트해 키 피처 노출.
- ⚠️ **테크 손가락 리스크:** **부분 손/손목 진입 크롭으로 5손가락 풀핸드를 절대 프레임에 넣지 않는다.** negative에 "full five fingers/six fingers/fused digits/floating hand/melting fingers" 강화 + `meta.flags:['experimental']` + 게시 전 사람 검수.
- 모션: 샷1 slow push-in(손 들어올림), 샷2 gentle tilt reveal+shallow drift, duration 3s, cut, lo-fi, captions auto.

**6. Unbox ASMR Reel** 🎬3 ◈6
- 산출물: 신제품 드롭 티저 3샷. ①밀봉 매트박스 정면(기대감) ②뚜껑 열림 톱다운 리빌 ③제품 꺼내 히어로 글로우.
- 모션: push-in → lid lift parallax → slow orbit + light glint sweep, 3s/샷, cut, satisfying ASMR ambient.
- negative: warped product, extra/malformed hands(핸즈프리 프레이밍 유지), baked-in text, jittery motion, motion blur smear.

**7. 360 Glow Spin** 🎬3 ◈6
- 산출물: 턴테이블 전 각도 PDP 루프. ①정면→3/4 회전 ②측면 프로필 ③후면→정면 복귀.
- ⚠️ **360 모핑 리스크:** "회전 중 형상 변형·포트 중복·프레임 간 모양 변화" negative 강화, locked camera.
- 모션: smooth clockwise rotation + highlight glint sweep, fade transition, sleek minimal electronic.

*(add 채택 시) 8. Quick Hero Snap* 🎬1 ◈2 — Void 룩 그대로 1샷 slow push-in 히어로 클립. negative는 Void Hero 준용, 단샷이므로 모핑 거의 없음.

**테크 섹션 🅣/⚠️ 요약:** 🅣=Spec Callout Grid(스펙 콜아웃·리더라인 오버레이) 1개 · ⚠️=In-hand Quick Demo(손가락 부분 크롭, experimental) 1개. 나머지 5개는 저위험 제품 정물/모션.

---

## 7) 산출물

1. **`src/recipes/seeds/recipes.tech.v2.js` 갱신** — 7개(또는 +Quick Hero Snap=8개). `node -e "require('./src/recipes/seeds/recipes.tech.v2.js')"` 로딩 + 비용공식(image=count×0.5, reel=shots×2) 검증 통과 필수. Spec Grid의 `text_overlay:true`/text·logo 제외/`render_notes`, In-hand의 `flags:['experimental']`+손 negative 유지 확인.
2. **한국어 산출물 스펙** — 각 템플릿 "무슨 사진/영상 몇 컷, 각 컷 씬/구도/무드"(위 ③ 그대로 사람용 설명).
3. **keep/cut/add 표** — §5 결정표. `docs/템플릿_v2_발굴선별강화_결과.md`의 테크 섹션(192~213행)과 동기화. 8개로 늘렸으면 가격 사다리(279행)도 `R2 R4 R6 R6`로 갱신.

| 결정 | 항목 |
|---|---|
| keep ×7 | Void / Spec Grid 🅣 / Macro / Desk / In-hand ⚠️ / Unbox / 360 |
| cut | White-BG Pack, Cable & Port (중복) |
| add(선택) | Quick Hero Snap 🎬1 ◈2 (1샷 진입 릴스) |

---

## 8) 착수 커맨드 (붙여넣기용)

> `~/HeyHoAI`에서 이 브리프와 `src/recipes/seeds/recipes.tech.v2.js`(기존 7개)·`docs/템플릿_v2_발굴선별강화_결과.md`(테크 192~213행)를 읽고, 테크 섹션 7개를 4축으로 **검증·확정**하라. Spec Callout Grid의 text_overlay/네거티브 패치와 In-hand Quick Demo의 손가락 부분크롭·experimental 플래그가 살아있는지 확인하고, 각 템플릿 한국어 산출물 스펙을 마무리하라. 1샷 ◈2 진입 릴스(Quick Hero Snap) add 여부를 결정해 시드와 가격 사다리·키프/컷/애드 표를 동기화하라.

---

## § 공통 규칙 (전 섹션 동일 — 짧게 인용)

- **철학:** 노스킬 — 유저는 프롬프트 안 쓰고 양식만 고른다. 출력 2종: 📷 image_set(보통 4장, 4:5) / 🎬 reel(샷수=count, 9:16).
- **레시피 스키마 v1(A2 look + A5 shots):** `{ mode, category, name, output_type, credit_cost, rationale, config:{ output{type,count,aspect_ratio}, subject{type, reference_strategy, min_refs}, look{style_preset, attributes[], wardrobe?, extra_positive, negative}, shot_strategy:'list', shots[{scene,pose,composition}], reel?{per_shot_motion[],duration_per_shot,transition,music_mood,captions}, provider{image:'nano-banana',video:'kling'} } }`. 제품모드 subject=`product`/`product_composite`.
- **비용 규칙:** image_set=count×0.5, reel=shots×2, 온모델 착용 +1. (4장=◈2, 3샷릴=◈6). 카탈로그마다 ◈2 진입 + 싼 릴스(1~2샷 ◈2~4).
- **⚠️ 엔진:** 전역 `SAFETY_NEGATIVE`가 모든 렌더에 'text','logo' 주입 → 글자/브랜드 템플릿(🅣)은 글자를 AI로 그리지 말고 오버레이 레이어로(해당 템플릿 negative에서 text/logo 제외 + `text_overlay:true` + `render_notes`). 손가락/말하는입/360은 negative 강화 + 사람 검수.
- **2벌:** 영어 프롬프트(엔진용) + 한국어 산출물 설명(사람용). 마켓 전략=공식 우선(이 세트가 출시 카탈로그 본체).
- **참고 파일:** 마스터 `/Users/jeon-yedam/HeyHoAI/docs/명령서_템플릿_발굴선별강화.md` · v2 결과 `/Users/jeon-yedam/HeyHoAI/docs/템플릿_v2_발굴선별강화_결과.md` · v2 시드 `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.tech.v2.js`

---

## 9) 작업 로그 (워커 → 총지휘 핸드오프)

> 테크 워커가 작업할 때마다 여기에 **바로바로** 누적 기록(최신이 위). 총지휘는 이 섹션 + `_STATUS.md`(자동) + `_CATALOG.json`(자동)으로 현황 파악. 시드 변경은 자동채널이 잡지만 **분석·제안·미결정 사항은 자동채널이 못 잡으므로 여기로만 전달됨.**

### 2026-06-10 · 커버리지 감사(현행 7개 충분성 분석) — ⏳ 제안, 미구현, 결정 대기
- **결론:** 현행 7개로 **테크 전 클러스터 충족 불가**(10개 클러스터 평균 만족도 ~4/10, 크로스컷 2.5/10). 7개가 '단일 유닛·전원OFF·클린 스튜디오·정적' 가정에 갇힘.
- **8대 blocker 갭(다클러스터 공통):** ①컬러웨이 라인업 ②앱/화면UI 연동 ③기능 ON 모션(점등·스핀·전개) ④실크기 스케일 ⑤온모델 착용 ⑥멀티팩 knolling ⑦방수/아웃도어/러기드 ⑧설치/장착 컨텍스트.
- **신규 제안 6개(적대적 검증 통과):** `Colorway Lineup Grid`(📷4◈2) · `Scale Reference Proof`(📷4◈2⚠️) · `App Screen Pairing`(📷4◈2🅣) · `Knolling Kit Layout`(📷4◈2🅣) · `On-Model Wear Fit`(📷4◈3, 온모델+1, ⚠️) · `Function-On Action Reel`(🎬2◈4 ⚠️🅣). 이름 6종 전역 고유 확인.
- **미충족 잔여 2갭(추가 스펙 필요):** 갭⑦⑧을 묶은 후보 *In-Context Environment Pack*은 위험요소 혼재로 **kill** → `Rugged/Waterproof Proof`(📷4◈2)·`Install & Mount Context`(📷4◈2)로 분리 재제안 예정(아직 미설계).
- **기존 리프레임 제안(삭제 아님):** `In-hand Quick Demo`(10개 중 heavy=0)→'부분손 제스처 촉각감'으로 좁힘 · `Desk Setup Flatlay`→'감성 실내 데스크' 단일목적 한정. **하드 삭제 후보 0**(둘 다 통째 삭제 시 light 수요 고아). `Void/Spec/Macro` keep, `Unbox/360` keep(◈6 릴 2종 다 light → Function-On 도입 후 사용률 재평가).
- **⚠️ 총지휘/Chief 결정 필요(정책 충돌):** 제안 채택 시 tech 개수 **7 → 13(또는 +환경/설치 2 = 15)** → §관리규칙 "섹션당 6~8개" 정책 초과. (a)tech 한정 정책 예외 승인 / (b)blocker 최상위 3개(Colorway·Function-On·On-Model)만 우선 채택 축소 / (c)전면 채택 중 택1 필요. 가격 사다리도 `I2×8~10·I3×1·R4×2·R6×2`로 재산정됨.
- **산출 근거:** 제품 taxonomy(9클러스터 ~180종) + 10렌즈 커버리지 감사 워크플로우(this 세션). 채택 결정 전까지 시드 미반영.

### 2026-06-10 · v2 검증·확정 — ✅ 완료(시드 반영)
- **7개 keep 확정**(Void / Spec Grid🅣 / Macro / Desk / In-hand⚠️ / Tech Unbox ASMR / 360). 비용공식·로딩 통과, 가격 사다리 `I2 I2 I2 I2 · R4 R6 R6`(위반 0).
- **이름 전역 고유화:** `Unbox ASMR Reel` → **`Tech Unbox ASMR`** (jewelry.v2와 충돌 → vertical 접두). `consolidate_recipes.js` **중복 0 확인**. → 총지휘 §3/§5가 지적했던 tech측 충돌 **해소 완료**.
- **안전 플래그 생존 확인:** Spec Grid `text_overlay:true`+`render_notes`+negative에서 text/logo 제외 / In-hand `flags:['experimental']`+손가락 negative 강화.
- **Quick Hero Snap(🎬1◈2 add 후보) 보류:** In-hand(◈4)이 이미 싼 릴스 충족 → 강제 결손 아님(브리프 §5 권장 '7 keep' 채택).
- **동기화:** `docs/템플릿_v2_발굴선별강화_결과.md` 테크 섹션(리네임·보류 반영).
- **🔔 총지휘 참고:** jewelry는 여전히 `Unbox ASMR Reel` 보유(현재 충돌 없음). 일관성 원할 시 jewelry측도 `Jewelry Unbox ASMR`로 리네임 권고(jewelry 워커 소관).
