# 섹션 작업 명령서 — 인플루언서 (key: influencer)

> 이 브리프 하나로 "인플루언서" 섹션 착수 가능(self-contained). 작업 디렉터리 `~/HeyHoAI`, 브랜치 `feat/ux-monetization-v2`. 표기: 📷=image_set · 🎬=reel · ◈=크레딧 · ⚠️=사람검수/실험 · 🅣=텍스트 오버레이 의존 · ◈ 비용공식: 사진=count×0.5, 릴스=shots×2, 온모델 +1.
> **상태 = existing**: v2 6개가 이미 확정·검증됨. 이 세션의 임무는 **재설계가 아니라 ③강화(산출물 스펙 마무리·레시피 정합 검증·확정)** + ①발굴/②선별은 "현 6개가 최적인지 재검증"으로 수행한다.

---

## 1) 정체성
- **mode**: `influencer`
- **subject**: `type: face` · `reference_strategy: identity_lock` · `min_refs: 1`
- **한 줄 정의**: 개인 크리에이터가 **얼굴 셀카 1장**을 올리면, 그 인물의 정체성을 락(identity_lock)한 채 **OOTD·포토덤프·노을감성·GRWM·데이인라이프·협찬 하울**용 피드 사진세트·릴스를 자동 생성하는 양식 묶음. (제품을 들고 파는 컷은 제품을 2차 레퍼런스로 공급하되 정체성 앵커는 항상 셀카.)

## 2) 타깃 유저 & JTBD
- **누가**: 팔로워를 기르는 개인 크리에이터(패션/뷰티/여행/라이프스타일). 프롬프트를 못 쓰는 노스킬 유저 — 셀카 한 장 + 양식 선택만.
- **무료 JTBD(피드 채우기·인게이지먼트)**: 오늘 올릴 OOTD 핏체크, 진정성 신호용 캔디드 포토덤프, 노을 감성 무드컷, 아침→저녁 데이인라이프 브이로그, GRWM(겟레디) — 저장·공유율이 높은 포맷.
- **★유료/매출 JTBD(진짜 돈)**: **협찬·어필리에이트 하울** — 크리에이터가 **제품을 손에 들고 직접 소개하는 컷**. 브랜드가 비용을 지불하는 본질적 산출물이며, 이게 없으면 인플루언서 카탈로그는 "예쁜 셀프포트레이트"만 남는다(v1 진단 6/10의 핵심 결함). 매출에 직결되는 컷 = **제품 들고 정면 소개 + 제품 클로즈업 리액션 + CTA 마무리**.
- **이 테마 특유 난이도**: 얼굴 재현(identity_lock)은 OK. **립싱크·말하는샷은 위험**(입 모핑·정체성 드리프트·음원 저작권) → v2에서 Lip-Sync는 cut됨. 협찬 하울의 **제품 든 손**은 손가락 리스크 → experimental + 사람검수.

## 3) 현재 상태 — (기존) v2 초안: 검증·확정
v2 시드 `src/recipes/seeds/recipes.influencer.v2.js`에 **6개 확정**(node 로딩 OK, 비용공식 위반 0). 가격 사다리: `I2 I2 I2 · R4 R6 R6` (◈2 진입 ✓, 싼 릴스 R4 ✓).

| # | 이름 | 타입 | 컷 | ◈ | meta.change | 비고 |
|---|---|---|---|---|---|---|
| 1 | Candid Photo Dump | 📷 | 4 | 2 | keep | 35mm 필름 포토덤프, ◈2 진입 앵커 |
| 2 | Fit Check On-Model | 📷 | 4 | 2 | repriced(◈4→2) | OOTD 전신 4앵글 |
| 3 | Golden Hour Anywhere | 📷 | 4 | 2 | repriced(◈3→2) | 노을빛 여행 무드 코닥톤 |
| 4 | GRWM Aurora Reel | 🎬 | 3 | 6 | keep | 겟레디 3비트(민낯→메이크업→완성) |
| 5 | Day-in-Life Reel | 🎬 | 2 | 4 | new | 아침→저녁 브이로그 2샷, 싼 릴스 티어 |
| 6 | Product Haul Reel ⚠️ | 🎬 | 3 | 6 | new (flags: experimental, needs_human_review; text_overlay:true) | 협찬 하울 3샷, 제품 2차 레퍼런스, 손 리스크 |

**v1 대비 변경 기록**: Trending Lip-Sync **cut**(구식+음원 저작권+입 모핑), Blurcore BTS Story **cut→Day-in-Life로 교체**(GRWM과 무드 근접). Day-in-Life·Product Haul **add**.

→ **이 세션 임무**: 위 6개를 ④발굴/⑤선별 4축으로 재검증해 **확정**하고, ⑥강화에서 각 템플릿의 산출물 스펙(무슨 사진/영상을 만드는지)을 사람이 결과를 예측 가능하게 마무리한다. 큰 구조 변경은 권고하지 않음(이미 확정선) — 단, 발굴에서 명백히 더 강한 전환 포맷이 나오면 keep/cut/merge/add로 제안.

## 4) ① 발굴 (Discover) — 이 테마 2026 트렌드·플랫폼 포맷 + 빠진 전환 프레임
인플루언서 셀카→피드/릴스에 특화된 후보를 폭넓게 브레인스톰(이름 + 무엇을 + 사진/영상 + 예상◈):

1. **Candid Photo Dump** — 35mm 점앤슛 플래시 캐러셀(거리·식당·거울셀카). 📷4 / ◈2. (현 채택)
2. **Fit Check On-Model / OOTD** — 전신 핏체크 4앵글. 📷4 / ◈2. (현 채택)
3. **Golden Hour Anywhere** — 노을 백라이트 무드 4컷. 📷4 / ◈2. (현 채택)
4. **GRWM Reel** — 민낯→풀글램 3비트. 🎬3 / ◈6. (현 채택)
5. **Day-in-Life Reel** — 아침→저녁 2샷 브이로그. 🎬2 / ◈4. (현 채택)
6. **Product Haul Reel** — 협찬 제품 들고 소개+CTA 3샷. 🎬3 / ◈6. (현 채택 · ★유료)
7. **Mirror Selfie Pack** — 풀바디 거울셀카 4컷(헬스장·엘리베이터·피팅룸), OOTD의 캐주얼 변형. 📷4 / ◈2. (Fit Check와 근접 → merge 후보)
8. **Cafe/Aesthetic Lifestyle** — 카페·책상 감성 라이프스타일 4컷. 📷4 / ◈2. (Golden Hour와 무드 근접 → 중복 주의)
9. **#TikTokMadeMeBuyIt POV Haul** — 말 없이 표정만으로 제품 발견 리액션 1샷(립싱크 0, 안전). 🎬1 / ◈2. (UGC 카탈로그와 겹침 — 인플루언서판은 협찬 어필리에이트용 ◈2 싼 릴스 진입으로 가치 있음)
10. **Get The Look / Outfit Transition Reel** — 캐주얼→완성착장 1탭 전환 2샷. 🎬2 / ◈4. (패션 크리에이터 전환 프레임)
11. **Q&A / "Ask Me Anything" Static** — 답변 헤드라인 오버레이 정적 4컷. 📷4 / ◈2 🅣. (말하는샷 회피하며 토킹 콘텐츠 흉내 — 글자 오버레이)
12. **Couple/Friends Group Shot** — 2인 이상 동반 컷. (정체성 락 2명 = 난이도 급상승 → **제외 권장**)

**발굴 결론(빠진 전환 프레임 점검)**: 현 6개는 무료 JTBD(피드)+유료 JTBD(하울)를 덮음. 추가 검토 가치 있는 것은 **#9 POV Haul(◈2 싼 릴스 진입·립싱크 0 안전)**과 **#10 Outfit Transition(패션 전환)**뿐. 단 카탈로그를 6→7로 늘리려면 가격 사다리/슬롯 비용을 따져 ②선별에서 판정.

## 5) ② 선별 (Select) — 4축 평가 + keep/cut/merge/add
| 후보 | 커버리지 | 트렌드 | 원가-가치 | AI난이도 | 판정 |
|---|---|---|---|---|---|
| Candid Photo Dump | 진정성 피드(고유) | 높음 | ◈2 진입 최적 | 낮음(얼굴만) | **keep** |
| Fit Check On-Model | OOTD(고유) | 높음 | ◈2 정합 | 낮음 | **keep** |
| Golden Hour Anywhere | 여행/무드(고유) | 중상 | ◈2 정합 | 낮음 | **keep** |
| GRWM Aurora Reel | 겟레디(고유) | 최상(저장율) | ◈6 정합 | 중(손 약간) | **keep** |
| Day-in-Life Reel | 브이로그(고유) | 높음 | ◈4 싼 릴스 | 낮음 | **keep** |
| Product Haul Reel | ★유료 협찬(고유) | 높음 | ◈6 정합 | **높음(제품 든 손)** | **keep + ⚠️사람검수** |
| Mirror Selfie Pack | Fit Check와 중복 | — | — | — | **merge→Fit Check** (editable_slots 변형) |
| Cafe Lifestyle | Golden Hour와 무드 근접 | — | — | — | **cut**(near-dup) |
| #TikTokMadeMeBuyIt POV | 신규 ◈2 싼 릴스 진입 | 최상 | 매우 높음 | 낮음(말 없음) | **add 검토**(7번째 슬롯·립싱크 0) |
| Q&A Static 🅣 | 토킹 회피 우회 | 중 | 보통 | 낮음 | **보류**(오버레이 의존·우선순위 낮음) |
| Group Shot | — | — | — | 정체성 2인 락 불가 | **cut** |

**권장 최종 세트 = 현 6개 확정.** (선택 확장: POV Haul Reel을 추가해 7개로 만들면 `I2 I2 I2 · R2 R4 R6 R6` → ◈2 싼 릴스 진입까지 확보. 6개 유지가 기본선, 7개는 사용자 승인 시 add.)

**가격 사다리 점검**: ◈2 진입 = Candid/Fit/Golden(✓). 싼 릴스 = Day-in-Life ◈4(✓). 가장 비싼 = GRWM·Haul ◈6. 위반 0. (POV add 시 ◈2 릴스까지 생겨 사다리 더 완전.)

## 6) ③ 강화 (Enhance) — 산출물 스펙 + 레시피(스키마 §3 준수)
각 템플릿이 **정확히 무슨 사진/영상을 만드는지** 정의. 이 테마 공통 negative: `extra fingers, deformed hands, warped face, plastic over-retouched skin, identity drift between shots, text artifacts, watermark`. **얼굴 재현은 강점이나 샷 간 정체성 드리프트 방지가 핵심** — 모든 릴스/세트에 identity-drift negative 필수.

**1. Candid Photo Dump** 📷4 ◈2 — *산출물*: 35mm 점앤슛 온카메라 플래시 룩의 비정형 일상 스냅 4장(거리 미드웃음 / 식당부스 클로즈업 / 야간 횡단보도 풀바디 모션블러 / 빈티지 거울셀카). 후지 필름 컬러·미세 그레인·약간 어긋난 프레이밍. negative에 `studio polish, perfect symmetry, stiff posed look` 추가.

**2. Fit Check On-Model** 📷4 ◈2 — *산출물*: 머리부터 발끝 스타일드 아웃핏 전신 4앵글(정면 당당 / 3/4 실루엣+백 / 걷기 모션 / 커프·액세서리 디테일 클로즈업). 85mm f4 직물 드레이프, 북향 소프트 윈도우 키. negative `distorted body proportions, melted garment texture, wardrobe inconsistency between shots`. (merge 흡수 시 거울셀카를 editable_slot 변형으로.)

**3. Golden Hour Anywhere** 📷4 ◈2 — *산출물*: 매직아워 여행 무드 4컷(해변 맨발 풀바디 / 루프탑 난간 미드 / 풀밭 백라이트 어깨돌림 / 카페 창가 음료 클로즈업). 50mm f2, 코닥 포트라 따뜻함, 헤어림+렌즈플레어. negative `harsh midday shadows, blue cold cast, double sun`.

**4. GRWM Aurora Reel** 🎬3 ◈6 — *산출물*: 겟레디 3비트 릴(민낯 거울 클로즈업 → 블러시 도포 매크로 → 풀룩 리빌 전신). 오로라 파스텔(라일락-민트-피치) 미러 글로우, 50mm f1.8. 샷별 모션: ① 거울 반사 슬로우 푸시인 ② 볼 따라가는 매크로 틸트 ③ 완성룩 오빗 리빌. duration 3s/transition whip/synth-pop/captions auto. negative `asymmetric eyes, over-smoothed CGI, identity drift between shots`.

**5. Day-in-Life Reel** 🎬2 ◈4 — *산출물*: 아침→저녁 2샷 브이로그(햇살 주방 커피 미드 / 저녁 거리·루프탑 네온 미드). 35mm 핸드헬드, 후지 톤. 샷별 모션: ① 핸드헬드 슬로우 줌인 ② 보케 시티라이트 슬로우 풀백. cut transition/lo-fi indie. negative `inconsistent lighting within a single shot`.

**6. Product Haul Reel** 🎬3 ◈6 ⚠️🅣 — *산출물*: 협찬 하울 3샷(정면 제품 가리키며 소개 미드 / 제품 얼굴 옆 들어올린 클로즈업 리액션 / CTA 마무리 미드). 85mm 포트레이트 룩, 소프트박스 클린 키. 샷별 모션: ① 크리에이터+제품 푸시인 ② 얼굴→제품 틸트다운→업 ③ 표정으로 끝내는 슬로우 풀백. **AI 난이도 주의(이 테마 특유)**: 샷2 제품 든 손 = 손가락 리스크 → negative `single hand showing exactly five fingers, melted or fused fingers, floating disembodied hand` 강화 + `meta.flags:[experimental, needs_human_review]`. **🅣 오버레이 주의**: 브랜드 마크/글자는 AI로 그리지 말 것(전역 SAFETY_NEGATIVE가 text/logo 제거) → `config.text_overlay:true`, 이 템플릿 negative에서 text/logo **제외**, 글자는 렌더 후 결정적 오버레이 레이어로 합성. 산출 손 해부학 매 출력 사람검수.

**(add 시) 7. TikTok Discovery POV Haul** 🎬1 ◈2 — *산출물*: 말 없이 표정만으로 제품 발견 리액션 1샷(립싱크 0 = 안전). 슬로우 푸시인. 어필리에이트용 ◈2 싼 릴스 진입. negative 표준.

## 7) 산출물 (Deliverables)
1. **`src/recipes/seeds/recipes.influencer.v2.js`** (갱신) — 현 6개 검증·확정. POV add 승인 시 7번째 객체 추가. 스키마 §3 준수, `node -e "require('./src/recipes/seeds/recipes.influencer.v2.js')"` 로딩 + 비용공식(사진 count×0.5 / 릴스 shots×2) 검증.
2. **한국어 산출물 스펙** — §6 각 템플릿 "무슨 사진/영상 + 컷별 씬/구도/무드"(사람 예측 가능), 영어 프롬프트(엔진용)와 2벌.
3. **keep/cut/add 표**:

| 항목 | 결정 | 이유 |
|---|---|---|
| Candid Photo Dump / Fit Check / Golden Hour | keep | 무료 피드 JTBD·◈2 진입 사다리 |
| GRWM Aurora / Day-in-Life | keep | 겟레디 최상 저장율 / 싼 릴스(◈4) |
| Product Haul Reel | keep ⚠️🅣 | ★유료 협찬 JTBD, 제품 든 손 검수 |
| Trending Lip-Sync (v1) | cut | 구식·음원 저작권·입 모핑 |
| Blurcore BTS (v1) | cut→Day-in-Life 교체 | GRWM과 무드 근접 |
| Mirror Selfie / Cafe Lifestyle | merge/cut | Fit Check·Golden Hour와 근접중복 |
| TikTok Discovery POV Haul | add(선택) | ◈2 싼 릴스 진입·립싱크 0 안전 |

4. (선택) `docs/템플릿_한국어_카탈로그.md`·`public/_overview.html`의 influencer 섹션 동기화.

## 8) 착수 커맨드 (붙여넣기용)
`~/HeyHoAI에서 docs/명령서_템플릿_발굴선별강화.md와 src/recipes/seeds/recipes.influencer.v2.js, docs/템플릿_v2_발굴선별강화_결과.md를 읽고, influencer 섹션(mode=influencer·subject=face/identity_lock·기존 v2 6개)을 4축으로 재검증해 확정하고, 각 템플릿 산출물 스펙(한/영)·강화된 레시피를 §3 스키마대로 마무리해. 손가락 리스크(Product Haul)와 🅣 오버레이 주의를 반영하고, node 로딩+비용공식 검증을 통과시켜.`

---

## 공통 규칙 (참고 — §끝 인용)
- **철학**: 노스킬. 유저는 프롬프트 안 씀, 양식만 고름. 출력 2종: 📷 image_set(보통 4장, 4:5) / 🎬 reel(샷수=count, 9:16).
- **레시피 스키마 v1**(A2 look + A5 shots): `{ mode, category, name, output_type, credit_cost, rationale, config:{ output{type,count,aspect_ratio}, subject{type:face|product|avatar, reference_strategy:identity_lock(face)|product_composite(product), min_refs}, look{style_preset, attributes[], wardrobe?, extra_positive, negative}, shot_strategy:'list', shots[{scene,pose,composition}], reel?{per_shot_motion[],duration_per_shot,transition,music_mood,captions}, provider{image:'nano-banana',video:'kling'} } }`
- **비용 규칙**: image_set=count×0.5, reel=shots×2, 온모델 +1. (4장=◈2, 3샷릴=◈6, 온모델4장=◈5). 각 카탈로그에 ◈2 진입 + 싼 릴스(1~2샷 ◈2~4).
- **⚠️ 엔진**: 전역 SAFETY_NEGATIVE가 모든 렌더에 'text','logo' 주입 → 글자/브랜드 템플릿(🅣)은 글자를 AI로 그리지 말고 `text_overlay:true` + negative에서 text/logo 제외 + 오버레이 레이어로. 손가락/말하는입/360 온모델은 negative 강화 + 사람검수.
- **2벌**: 영어 프롬프트(엔진용) + 한국어 산출물 설명(사람용). 마켓 전략 = 공식 우선(이 세트가 출시 카탈로그 본체).
- **참고 파일**: 마스터 `/Users/jeon-yedam/HeyHoAI/docs/명령서_템플릿_발굴선별강화.md`, v2 결과 `/Users/jeon-yedam/HeyHoAI/docs/템플릿_v2_발굴선별강화_결과.md`, v2 시드 `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.influencer.v2.js`.
