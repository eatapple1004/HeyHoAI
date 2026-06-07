# 템플릿(Recipe) 구조 설계 — 후보안 비교 + 추천 (2026-06-06)

> 템플릿이 충족해야 할 것: ① 프롬프트 0 (양식만 고르면 됨) ② 한 번에 여러 장(변형) ③ 두 모드(얼굴/제품) ④ 두 출력(이미지/릴스) ⑤ 큐레이션·유지보수 쉬움 ⑥ Claude 자동확장과 호환.

기존 엔진 재료: `style_presets`(prefix/suffix/negative), `visual_attributes`(7카테고리 80조각), `SCENE_VARIATIONS`(scene+pose), 레퍼런스 이미지(identity), `motion_prompt`(영상), SAFETY 자동주입.

---

## A. 후보 구조 5종

### A1. Flat — 통문장 템플릿
템플릿 = 완성된 프롬프트 문자열 1개 + negative + params.
```jsonc
{ "name":"Travel Golden", "prompt":"A person walking on beach at golden hour, film tones...",
  "negative":"...", "count":4, "aspect":"4:5" }
```
- ✅ 단순·예측가능. 초보도 작성 가능.
- ❌ 변형 0 (4장이 거의 동일). 품질태그·안전 바꾸면 전 템플릿 수정. 재사용 0. 수백 개로 폭증.

### A2. Layered — 레이어 조립 (현재 스케치)
템플릿 = 조각들의 참조. 렌더 시점에 합성.
```jsonc
{ "style_preset":"Film", "attributes":["lighting:golden_hour","color:film_kodak"],
  "scenes":[{scene,pose},...], "aspect":"4:5", "count":4 }
```
- ✅ 재사용·조합폭발(적은 조각→많은 변형). 전역 수정 1곳. 기존 코드와 정합.
- ❌ 출력 예측성↓ (조합마다 QA 필요). "딱 이 룩" 보장 어려움.

### A3. Slot — 타입드 슬롯 + 스마트 디폴트
템플릿 = 이름붙은 슬롯(배경/조명/의상/무드/카메라) 각각 디폴트 + (선택)유저 변경옵션.
```jsonc
{ "slots": {
    "background": {"default":"beach golden hour", "options":["beach","rooftop","cafe"]},
    "wardrobe":   {"default":"summer dress", "options":["dress","denim","blazer"]},
    "lighting":   {"default":"golden_hour", "locked":true}
}}
```
- ✅ "프롬프트 0"이면서도 **한 가지만 톡 바꾸기** 가능 → UX 최고. 구조적.
- ❌ 슬롯 택소노미 정의 필요. UI·데이터 더 복잡. (출시엔 과할 수 있음)

### A4. Base + Variant — 상속
부모 템플릿("Travel Mood") + 자식 변형(Golden/Blue/Rainy)이 일부 필드만 override.
```jsonc
// parent: Travel Mood (style_preset, scenes 공통)
// child:  Golden Hour  → { "override": { "attributes":["lighting:golden_hour"] } }
```
- ✅ DRY. 카탈로그 정리 깔끔. 변형 양산 쉬움(트렌드 빨리 찍어내기).
- ❌ 해석(resolve) 로직 필요. 데이터 깊어짐.

### A5. Storyboard / Multi-shot — 샷 리스트
템플릿 = **순서있는 샷 배열**. 이미지셋=캐러셀 N컷, 릴스=씬 N개를 이어붙임.
```jsonc
{ "shots":[
    {"scene":"mirror, getting ready","motion":"push-in","dur":2},
    {"scene":"applying makeup","motion":"pan","dur":2},
    {"scene":"final look reveal","motion":"orbit","dur":2}
]}
```
- ✅ 릴스(GRWM=여러 씬)·IG 캐러셀에 자연스럽게 맞음. 기존 SCENE_VARIATIONS·video 파이프와 연결.
- ❌ 생성 오케스트레이션 복잡(여러 호출·스티칭). 단일컷보다 무거움.

---

## 비교표

| 기준 | A1 Flat | A2 Layered | A3 Slot | A4 Base/Variant | A5 Storyboard |
|---|---|---|---|---|---|
| 구현 난이도 | ★ | ★★ | ★★★ | ★★★ | ★★★★ |
| 변형 다양성 | ✗ | ◎ | ◎ | ○ | ◎ |
| 출력 예측성 | ◎ | △ | ○ | ○ | △ |
| 유지보수 | ✗ | ◎ | ○ | ◎ | ○ |
| 커스터마이즈 UX | ✗ | △ | ◎ | △ | ○ |
| 릴스 적합 | △ | ○ | ○ | ○ | ◎ |
| 기존코드 정합 | ○ | ◎ | △ | ○ | ◎ |

---

## ✅ 추천 — "A2 레이어 + A5 샷리스트"를 코어로, A3 슬롯·A4 변형은 옵션 필드로 흡수

하나만 고르지 말고 **레이어(A2)를 뼈대로, 샷리스트(A5)로 출력을 표현**하고, 슬롯(A3)·상속(A4)은 같은 JSON 안의 *선택 필드*로 넣는다. 출시엔 A2+A5만 쓰고, A3/A4는 스키마만 열어두고 나중에 채움.

### 통합 스키마 (recipes.config JSONB, 버전드)
```jsonc
{
  "schema_version": 1,
  "mode": "influencer",                 // influencer | shopping

  "output": {
    "type": "image_set",                // image_set | carousel | reel
    "count": 4,
    "aspect_ratio": "4:5"
  },

  "subject": {
    "type": "face",                     // face | product
    "reference_strategy": "identity_lock", // identity_lock | product_composite | on_model_tryon
    "min_refs": 1
  },

  // ── LOOK: 프롬프트로 합성되는 스타일 (A2) ──
  "look": {
    "style_preset": "Film",             // FK style_presets.name
    "attributes": ["lighting:golden_hour", "color:film_kodak", "texture:grain_film"],
    "wardrobe": "casual summer dress",
    "extra_positive": "candid travel vibe",
    "extra_negative": ""
    // SAFETY_NEGATIVE / QUALITY_SUFFIX 는 엔진이 항상 자동주입
  },

  // ── SHOTS: 변형/순서 (A5). image_set=N개 변형, reel=N개 씬 ──
  "shot_strategy": "list",              // list | sample_pool | claude_dynamic
  "shots": [
    { "scene": "sandy beach at golden hour", "pose": "walking, candid",        "composition": "full_body" },
    { "scene": "rooftop terrace, skyline",   "pose": "leaning on railing",      "composition": "medium_shot" },
    { "scene": "seaside cafe window",        "pose": "holding coffee, smiling", "composition": "closeup" },
    { "scene": "boardwalk at sunset",        "pose": "looking back over shoulder","composition": "full_body" }
  ],

  // ── REEL 전용 (output.type==reel일 때만) ──
  "reel": {
    "per_shot_motion": ["gentle push-in", "hair in breeze", "slow pan"],
    "duration_per_shot": 3,
    "transition": "cut",                // cut | fade | whip
    "music_mood": "dreamy",
    "captions": "auto"                  // auto(Claude) | none
  },

  // ── 옵션: 유저가 바꿀 수 있는 슬롯 (A3) — 출시엔 비워둬도 됨 ──
  "editable_slots": [
    { "key": "wardrobe",  "label": "Outfit", "options": ["summer dress","denim","linen shirt"] },
    { "key": "look.attributes.lighting", "label": "Time of day", "options": ["golden_hour","blue_hour","overcast"] }
  ],

  // ── 옵션: 상속 (A4) ──
  "parent_id": null,                    // 있으면 부모 config에 이 config를 deep-merge

  // ── 프로바이더 힌트 ──
  "provider": { "image": "nano-banana", "video": "kling" }
}
```

### recipes 테이블은 그대로, config만 위 구조
```
recipes(id, mode, category, name, output_type, thumbnail_url, credit_cost, config JSONB, is_active, sort_order)
```
> `output_type`/`credit_cost`은 config에서 파생되지만, 카탈로그 필터·정렬·표시용으로 컬럼에도 둠(비정규화).

---

## 렌더 시 해석 순서 (resolver)
```
1. parent_id 있으면 부모 config + 자식 config deep-merge (A4)
2. editable_slots에 유저 입력 있으면 해당 경로 override (A3)
3. shot_strategy에 따라 shots 확정:
     list         → 그대로
     sample_pool  → 풀에서 count개 랜덤(시드 고정)
     claude_dynamic → Claude가 look 기반 scene/pose count개 생성
4. 각 shot마다 프롬프트 조립:
     [subject=reference로 처리]
     + style_preset.prefix
     + attributes 프래그먼트 + wardrobe + scene + pose + composition
     + extra_positive + QUALITY_SUFFIX(auto)
     negative = style_preset.negative + extra_negative + SAFETY(auto)
5. output.type:
     image_set/carousel → 이미지 N장 생성
     reel → 각 shot 이미지 1장 → image2video(per_shot_motion) → 스티칭 + music + captions
6. credit_cost 차감
```

---

## 크레딧 파생 규칙
```
image_set: count * 0.5  (4장=2)
carousel:  count * 0.5
reel:      shots * 2    (3샷=6)
on_model_tryon: +1 (착용샷 가산)
```

---

## 출시 범위
- 코어: **A2(look) + A5(shots) + image_set/reel**
- `editable_slots`, `parent_id`, `claude_dynamic`는 **스키마만 열고 비워둠** → 출시 후 점진 도입
- 레시피 30~40개를 이 스키마로 시드 → QA 통과분만 `is_active=true`
