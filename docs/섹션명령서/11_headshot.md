# 섹션 작업 명령서 — 헤드샷 / 퍼스널 브랜딩 (key: headshot)

> 이 브리프 하나로 `headshot` 섹션 착수 가능(self-contained). 작업 디렉터리 `~/HeyHoAI`, 브랜치 `feat/ux-monetization-v2`. 산출 시드 경로 = `src/recipes/seeds/recipes.headshot.v2.js` (신규 생성).

---

## 1) 정체성
- **mode**: `influencer` (얼굴 모드 — 엔진은 인플루언서와 공유하나 톤은 정반대)
- **subject**: `type:face` · `reference_strategy:identity_lock` · `min_refs:1`
- **한 줄 정의**: 셀카 **얼굴 1장 → 정장·스튜디오·전문가 톤의 프로필/헤드샷 컷**을 자동 생성. 인플루언서(캐주얼/트렌디/필름그레인)와 **완전히 다른 톤** — 클린 라이팅, 중립 배경, 신뢰감 있는 비즈니스 무드. "AI 헤드샷" 거대 시장을 정조준한 net-new 카탈로그.

## 2) 타깃 유저 & JTBD
- **누가**: 링크드인/회사 팀페이지를 채우는 직장인·임원, 작가/강사/코치/컨설턴트(개인 브랜딩), 팟캐스터·유튜버(썸네일·게스트 카드), 스타트업/대행사 HR(팀 일관 컷), 부동산·세일즈·금융 등 신뢰 직군.
- **뭘 파는가**: "스튜디오 안 가고, 셀카 1장으로 전문가 프로필 한 세트." 출장 헤드샷 촬영비($150~500) 대체 + 팀 단위 일관성.
- **매출에 필요한 컷(전환 JTBD)**:
  1. **링크드인 정석 컷** — 중립 회색 배경, 어깨선, 살짝 미소, 정장. (가장 큰 수요)
  2. **임원/오소리티 컷** — 어두운 무드, 측광, 권위감(저자·강연·키노트용).
  3. **배경/복장 변형 세트** — 한 얼굴로 회색·화이트·오피스·아웃도어 등 여러 변형(JTBD: 채널마다 다른 배경 필요).
  4. **팀페이지 일관 컷** — 동일 조명·배경·크롭으로 여러 명이 같은 룩(HR 핵심).
  5. **팟캐스트/썸네일 컷** — 가로 여백·강한 림라이트·표정 강조(섬네일에 텍스트 얹을 자리).
  6. **친근한 브랜드 컷** — 코치/크리에이터용 따뜻한 자연광, 캐주얼 정장.
  7. **인트로 릴(저가)** — 헤드샷을 살짝 움직이는 1~2샷 LinkedIn/About 페이지용 무빙 프로필.

## 3) 현재 상태
**net-new — v2 초안 없음(기존 시드 무).** `recipes.headshot.v2.js` 미존재 → **처음부터 6~8개를 설계**한다. 기준 카탈로그(influencer/fashion v2)의 스키마·가격 캐논·meta 패턴을 그대로 차용하되, 톤만 전문가 헤드샷으로 전환. (참고: influencer v2는 6개 = Candid/FitCheck/GoldenHour 사진 + GRWM/Day-in-Life/Haul 릴. headshot은 이 톤의 정반대로 간다.)

## 4) ① 발굴 (Discover) — 후보 8~12개 브레인스톰
2026 AI-헤드샷 시장(Aragon/HeadshotPro/Remini 등) 표준 + LinkedIn/팀페이지/팟캐스트 포맷 + 빠진 전환 프레임 기준. (이름 · 무엇을 · 사진/영상 · 예상◈)

1. **LinkedIn Classic** · 회색 시ーム리스 배경, 어깨 크롭, 정장, 신뢰 미소 4컷 · 📷 · ◈2 — **진입 앵커**
2. **Executive Authority** · 어두운 배경 측광, 권위감, 저자/임원용 4컷 · 📷 · ◈2
3. **Background & Wardrobe Swap** · 동일 얼굴, 4가지 배경×복장(회색/화이트/오피스/아웃도어) · 📷 · ◈2 — 변형 JTBD 핵심
4. **Team Page Consistent** · 동일 조명·배경·크롭 규격으로 통일된 팀 룩 4컷 · 📷 · ◈2 (HR)
5. **Approachable Brand** · 따뜻한 자연광, 캐주얼 정장(코치/크리에이터) 4컷 · 📷 · ◈2
6. **Podcast / Thumbnail Cut** · 강한 림라이트, 표정 강조, 텍스트 여백 확보 4컷 · 📷 · ◈2 (🅣 오버레이 주의)
7. **Environmental Office** · 흐린 오피스/유리벽 배경 보케, 현장감 있는 전문가 4컷 · 📷 · ◈2
8. **B&W Editorial Portrait** · 흑백 고급 인물, 작가/연사 프로필 4컷 · 📷 · ◈2 (프리미엄 무드)
9. **Speaking Profile Reel** · 헤드샷을 미세하게 무빙(눈 깜빡임·미소·살짝 끄덕) 1샷 인트로 · 🎬 · ◈2 — **싼 릴 진입**
10. **About-Page Intro Reel** · 2샷(정면→3/4 약한 회전) About/링크드인 무빙 프로필 · 🎬 · ◈4
11. **Headshot Variations Pack(확장)** · 한 베이스에서 미소/무표정/안경 유무 등 표정 변형 4컷 · 📷 · ◈2
12. **Creative Industry Portrait** · 컬러 액센트 배경, 디자이너/마케터용 모던 4컷 · 📷 · ◈2

## 5) ② 선별 (Select) — 최종 6~8개 권장
4축(커버리지·트렌드·원가가치·AI난이도) 평가. **권장 최종 7개**(사진 5 + 릴 2):

| # | 템플릿 | 출력 | ◈ | 판단 |
|---|--------|------|----|------|
| 1 | LinkedIn Classic | 📷4 | 2 | **keep** — 시장 1번 수요, ◈2 진입 앵커 |
| 2 | Executive Authority | 📷4 | 2 | **keep** — 톤 차별화(임원/저자), 커버리지 |
| 3 | Background & Wardrobe Swap | 📷4 | 2 | **keep** — "여러 배경/복장" JTBD 직격, 전환 레버리지 |
| 4 | Team Page Consistent | 📷4 | 2 | **keep** — B2B/HR 차별 컷, 경쟁사 약점 |
| 5 | Approachable Brand | 📷4 | 2 | **keep** — 코치/크리에이터 따뜻 톤, 1~2번과 무드 분리 |
| 6 | Speaking Profile Reel | 🎬1 | 2 | **add** — 싼 릴 진입(◈2), 미세 모션만(안전) |
| 7 | About-Page Intro Reel | 🎬2 | 4 | **add** — 무빙 프로필, 약한 회전(저위험) |

**keep/cut/merge/add 가이드**:
- **merge**: 후보 #8 B&W Editorial → Executive Authority의 `style_variants:["dark_color","mono_bw"]`로 흡수(별 템플릿 불필요). 후보 #11 표정 변형 Pack → Background & Wardrobe Swap의 변형 슬롯으로 흡수.
- **cut**: #6 Podcast/Thumbnail(텍스트 오버레이 의존 高 + LinkedIn Classic과 근접) → 출시 후 수요 보고 추가. #7 Environmental Office(#1/#5와 배경만 다른 near-dup) → Background Swap의 한 컷으로 흡수. #12 Creative Portrait(니치) → 보류.
- **add**: 위 표 6·7번.
- **가격사다리**: ◈2 진입 6종(사진 5 + 릴 1) → ◈4 무빙 프로필 1종. 사진은 전부 4×0.5=◈2(온모델 없음 → +1 없음). 가장 싼 영상 = **Speaking Profile Reel 1샷 ◈2**(1×2), About-Page 2샷 ◈4. **릴 바닥이 ◈2**로, influencer/fashion(바닥 ◈4)보다 더 낮은 진입 — 헤드샷의 강점.

## 6) ③ 강화 (Enhance) — 산출물 스펙 + 레시피

각 템플릿 산출물 스펙(사람이 결과 예측 가능하게) + 스키마 v1 레시피 요지. **이 테마의 AI 난이도**: 얼굴 = identity_lock으로 안전, 복장/배경 스왑 = 모델이 잘 처리, **손 거의 없음(어깨 크롭)이라 손가락 리스크 최소** = 카탈로그 전체가 저위험. 단 (a) **안경 반사/렌즈 왜곡**, (b) **셀카→정장 변환 시 정체성 드리프트**(여러 컷 간 동일 인물 유지), (c) 팀페이지 컷 간 **조명/배경 일관성**, (d) 🅣 **텍스트는 절대 AI로 그리지 말 것**(SAFETY_NEGATIVE가 'text'/'logo' 주입 → 썸네일/명함 글자는 `text_overlay:true` 오버레이 레이어로). 360/말하는 입 없음. 릴은 **미세 모션만**(립싱크·큰 회전 금지)으로 morph 회피.

**산출물 스펙(요약)**:
1. **LinkedIn Classic** — 회색 시ーム리스, 어깨~가슴 크롭, 정장, 신뢰 미소. 4컷: 정면 미소 / 정면 무표정 프로페셔널 / 살짝 3/4 각도 / 팔짱 약한 미디엄.
2. **Executive Authority** — 차콜/딥블루 배경, 측면 키라이트+림, 권위감. 4컷: 정면 진지 / 3/4 측광 / 흑백 변형 / 약한 로우앵글 미디엄. `style_variants:["dark_color","mono_bw"]`.
3. **Background & Wardrobe Swap** — 한 얼굴 4가지 변형: 회색+정장 / 화이트+셔츠 / 흐린 오피스+블레이저 / 야외 보케+니트. 표정 변형 슬롯 포함.
4. **Team Page Consistent** — **동일 조명·배경·크롭 규격** 4컷, 톤 통일(여러 멤버 합성 시 룩 일관). 정면 중심, 미세 각도 차만.
5. **Approachable Brand** — 따뜻한 자연광(창광), 캐주얼 블레이저/니트, 친근 미소. 4컷: 창가 정면 / 살짝 웃는 3/4 / 책상/식물 환경 미디엄 / 자연광 클로즈업.
6. **Speaking Profile Reel** — 🎬 1샷 9:16, 헤드샷이 **살아 움직이는** 인트로(눈 깜빡·미세 미소·아주 약한 끄덕). 모션 최소 = 안전.
7. **About-Page Intro Reel** — 🎬 2샷 9:16, 정면 → 3/4 약한 회전(±15°)으로 무빙 프로필. cut 전환.

**레시피 스키마 v1 (대표 2개 — 나머지는 동일 패턴으로 작성)**:

```js
// 1) LinkedIn Classic — 진입 앵커
{
  mode:"influencer", category:"Headshot", name:"LinkedIn Classic",
  output_type:"image_set", credit_cost:2, sort_order:1,
  rationale:"링크드인 정석 프로필 — 회색 배경·정장·신뢰 미소 4컷. 헤드샷 카탈로그 ◈2 진입 앵커, 최대 수요.",
  meta:{ change:"new", render_notes:null },
  config:{
    schema_version:1, mode:"influencer",
    output:{ type:"image_set", count:4, aspect_ratio:"4:5" },
    subject:{ type:"face", reference_strategy:"identity_lock", min_refs:1 },
    look:{
      style_preset:"Corporate",
      wardrobe:"professional business attire — tailored dark blazer over a crisp shirt, clean minimal styling",
      attributes:["lighting:soft_clamshell_studio","color:neutral_true","texture:skin_natural","context:grey_seamless_studio"],
      extra_positive:"professional corporate headshot, clean light-grey seamless studio backdrop, soft clamshell key with subtle hair light, 85mm at f4 flattering compression, shoulders-up crop, confident approachable expression, sharp eyes in focus, true-to-life skin, polished but natural retouch, identity preserved across all four shots",
      negative:"extra fingers, deformed hands, warped face, asymmetric eyes, plastic over-retouched skin, identity drift between shots, casual streetwear, harsh shadows, blown highlights, busy background, text artifacts, watermark, glasses glare distortion"
    },
    shot_strategy:"list",
    shots:[
      { scene:"light-grey seamless studio, soft even clamshell key", pose:"front-facing, gentle confident smile, squared shoulders", composition:"closeup" },
      { scene:"same studio", pose:"front-facing neutral professional expression, chin slightly down", composition:"closeup" },
      { scene:"same studio, subtle key from camera-left", pose:"slight three-quarter turn, soft smile, engaged eyes", composition:"medium_shot" },
      { scene:"same studio", pose:"arms loosely crossed, relaxed authoritative stance", composition:"medium_shot" }
    ],
    provider:{ image:"nano-banana", video:"kling" }
  }
}

// 6) Speaking Profile Reel — 싼 릴 진입(1샷 ◈2)
{
  mode:"influencer", category:"Reel", name:"Speaking Profile Reel",
  output_type:"reel", credit_cost:2, sort_order:6,
  rationale:"무빙 프로필 — 헤드샷을 미세하게 움직이는 1샷 인트로(눈 깜빡·미소). About/링크드인용 ◈2 최저가 릴, 모션 최소로 안전.",
  meta:{ change:"new", flags:["needs_human_review"], render_notes:"Motion must stay micro (blink, faint smile, tiny nod) — no lip-sync, no head turn beyond a few degrees, to avoid identity morph. Review face stability on every frame." },
  config:{
    schema_version:1, mode:"influencer",
    output:{ type:"reel", count:1, aspect_ratio:"9:16" },
    subject:{ type:"face", reference_strategy:"identity_lock", min_refs:1 },
    look:{
      style_preset:"Corporate",
      wardrobe:"tailored blazer over crisp shirt",
      attributes:["lighting:soft_clamshell_studio","color:neutral_true","texture:skin_natural","context:grey_seamless_studio"],
      extra_positive:"professional moving headshot intro, subtle lifelike micro-motion, clean grey studio, soft clamshell light, 85mm portrait look, confident warm expression, identity locked and stable",
      negative:"extra fingers, deformed hands, warped face, identity drift, lip-sync mouth distortion, large head rotation, jittery motion, plastic skin, text artifacts, watermark"
    },
    shot_strategy:"list",
    shots:[
      { scene:"light-grey seamless studio, soft clamshell key", pose:"front-facing professional, gentle smile holding gaze", composition:"closeup" }
    ],
    reel:{ per_shot_motion:["micro motion only: slow natural blink, faint warming smile, barely perceptible nod, very slow push-in"], duration_per_shot:4, transition:"cut", music_mood:"calm professional ambient", captions:"none" },
    provider:{ image:"nano-banana", video:"kling" }
  }
}
```

나머지 5개(Executive Authority / Background & Wardrobe Swap / Team Page Consistent / Approachable Brand / About-Page Intro Reel)는 위 두 패턴을 그대로 따라, §3 산출물 스펙의 4컷(또는 2샷) 씬/포즈/구도 + 톤별 라이팅(측광/창광/균일)·negative(특히 identity drift, glasses glare)·릴 모션을 채워 작성한다. About-Page Intro Reel은 count:2, credit_cost:4, per_shot_motion에 "정면 미세 드리프트" + "±15° 약한 3/4 회전"만 둔다(큰 회전 금지).

## 7) 산출물
1. **`src/recipes/seeds/recipes.headshot.v2.js`** (신규 생성, 위 스키마로 7개 객체 배열, 영어 프롬프트).
2. **한국어 산출물 스펙**: §6 표를 사람용 설명으로 정리("이 템플릿은 [무슨 컷]을 [몇 장] 만든다").
3. **keep/cut/add 표** (아래 — 신규라 cut/merge는 후보 단계 결정):

| 결정 | 항목 | 이유 |
|------|------|------|
| add | LinkedIn Classic, Executive Authority, Background&Wardrobe Swap, Team Page Consistent, Approachable Brand, Speaking Profile Reel, About-Page Intro Reel | 핵심 전환 JTBD 커버 + ◈2 진입 + 저가 릴 |
| merge | B&W Editorial → Executive Authority 변형 / 표정 변형 → Background Swap 슬롯 | near-dup, 변형으로 흡수 |
| cut(보류) | Podcast/Thumbnail(텍스트 의존), Environmental Office(near-dup), Creative Portrait(니치) | 출시 후 수요 보고 추가 |

4. 동기화: 신규 카탈로그이므로 `public/_overview.html`·`docs/템플릿_한국어_카탈로그.md`·`public/studio.html`(MOCK_RECIPES/VERTICALS)에 `headshot` 카탈로그 추가 + AI 위험/오버레이 메모.

## 8) 착수 커맨드(붙여넣기용)
`~/HeyHoAI에서 이 헤드샷 브리프대로 recipes.headshot.v2.js를 net-new로 생성해 — influencer 모드·identity_lock 얼굴·전문가 스튜디오 톤으로 사진 5(LinkedIn Classic·Executive Authority·Background&Wardrobe Swap·Team Page Consistent·Approachable Brand, 각 4컷 ◈2) + 릴 2(Speaking Profile 1샷 ◈2·About-Page Intro 2샷 ◈4), 스키마 v1 준수, 텍스트는 오버레이·모션은 미세로만, 한국어 산출물 스펙과 keep/cut/add 표까지.`

---

## 공통 규칙 (요약 — 인용)
- **노스킬**: 유저는 프롬프트 안 쓰고 양식만 고름. 출력 2종: 📷 image_set(보통 4장, 4:5) / 🎬 reel(샷수=count, 9:16).
- **스키마 v1**: `{mode, category, name, output_type, credit_cost, rationale, config:{output{type,count,aspect_ratio}, subject{type:face, reference_strategy:identity_lock, min_refs}, look{style_preset, attributes[], wardrobe?, extra_positive, negative}, shot_strategy:'list', shots[{scene,pose,composition}], reel?{per_shot_motion[],duration_per_shot,transition,music_mood,captions}, provider{image:'nano-banana',video:'kling'}}}`.
- **비용**: image_set=count×0.5, reel=shots×2, 온모델 착용 +1. (4장=◈2, 1샷릴=◈2, 2샷릴=◈4.) 헤드샷은 온모델 없음 → +1 미적용. 각 카탈로그에 ◈2 진입 + 싼 릴 둘 것.
- **⚠️ 엔진**: 전역 SAFETY_NEGATIVE가 모든 렌더에 'text'/'logo' 주입 → 글자/브랜드(🅣)는 AI로 그리지 말고 `text_overlay:true` 오버레이 레이어로. 손가락/말하는입/360 = negative 강화 + 사람검수(헤드샷은 어깨 크롭이라 손 리스크 낮음; 릴은 미세 모션만).
- **2벌**: 영어 프롬프트(엔진용) + 한국어 산출물 설명(사람용). 마켓 전략 = 공식 우선(이 세트가 출시 카탈로그 본체).
- **참고**: 마스터 `/Users/jeon-yedam/HeyHoAI/docs/명령서_템플릿_발굴선별강화.md`, v2 결과 `/Users/jeon-yedam/HeyHoAI/docs/템플릿_v2_발굴선별강화_결과.md`, 형식 참고 시드 `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.influencer.v2.js`·`recipes.fashion.v2.js`, 생성 대상 `/Users/jeon-yedam/HeyHoAI/src/recipes/seeds/recipes.headshot.v2.js`.
