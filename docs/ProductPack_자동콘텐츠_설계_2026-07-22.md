# Doppia "Product Pack" — 사진 → 콘텐츠 자동 생성 설계

_2026-07-22 · 근거 = 로컬편의점 오아플 돈워리비애플(no.249) 실증(스틸 24+·영상 4, 전부 헤드리스). "그때 수동으로 한 것"을 제품화한 설계._

## 0. 한 줄
> 유저가 **사진 1~몇 장**을 넣으면 → 시스템이 **뭘 만들지 알아서 판단** → **레퍼 베이크 → 스틸 배치 + 멀티오브젝트 합성 + 영상 조립** → **공유 갤러리 + 다운로드 팩**을 뱉는다.

로컬편의점 사장 공략 논지("신규 브랜드 온보딩 콘텐츠 팩토리")가 그대로 제품 기능이 된다.

## 1. 유저 플로우 (유저가 보는 것)
1. **업로드** — 상품 사진 1~N장 (휴대폰 컷 OK).
2. **확인** (1스텝) — 시스템이 카테고리·구성을 **자동 제안**, 유저는 확인만:
   · 이거 1개 상품인가요, 세트/변형 N개인가요? · 카테고리 맞나요(음료/뷰티/의류…)?
3. **[자동] 레퍼 베이크** → 깨끗한 캐논 레퍼 미리보기 → **승인 게이트**(라벨·색 오류를 여기서 잡음).
4. **[자동] 팩 생성** — 진행바(히어로·제품컷·성분·라이프·컨셉·영상 쫘라락).
5. **갤러리 + 다운로드** — 공유 링크 + zip.

핵심 UX 원칙: **유저 입력 최소(업로드 + 확인 1번)**, 나머지는 전부 자동.

## 2. 파이프라인 (블루프린트)

```
[업로드 1~N장]
      │
      ▼
[① 분류 Classify] ── 카테고리 + 구성(단일/세트) 판정 (v1=유저확인, v2=비전자동)
      │
      ▼
[② 레퍼 베이크 Reference Bake] ★신규
   · 업로드 → SKU별 깨끗한 캐논 레퍼(단품·라벨보존) 생성 (nanoBanana, kind:product)
   · 세트면 SKU마다 1장 · 승인 게이트
      │
      ▼
[③ 스위트 템플릿 조회] ── 카테고리 → 만들 콘텐츠 목록(컷·씬·카피) 결정
      │
      ├─────────────┬──────────────────┬────────────────┐
      ▼             ▼                  ▼                ▼
[스틸 배치]     [멀티오브젝트 합성]   [영상 조립]        [카피 생성]
 nanoBanana      ★신규 cutout+layout   kling→ugc/assembler  LLM
 (단품 컷 전부)   (로우·기프트·세트)    (씬→클립→자막+TTS)   (캡션·훅)
      └─────────────┴──────────────────┴────────────────┘
                          │
                          ▼
              [④ 팩 + 갤러리]  ★신규 오케스트레이션
              R2 저장 · 갤러리 페이지 · zip 다운로드
```

## 3. 스위트 템플릿 = 제품의 "뇌" (알아서 판단의 핵심)

"알아서 필요한 콘텐츠"의 정체 = **카테고리별로 미리 큐레이션된 콘텐츠 목록**. 사진에서 카테고리를 정하면, 그 카테고리의 스위트 템플릿이 "무엇을 몇 장·어떤 씬" 만들지 정한다.

```js
// suite_templates (신규 config, 팀이 버티컬별로 큐레이션 — 기존 recipe 지식 재사용)
{
  vertical: 'beverage',              // taxonomy.js 카테고리와 정렬
  refBake: { style: 'clean_studio_single', preserveLabel: true },
  stills: [
    { key: 'hero_sunlit',    recipe: 'sunlit-pop' },
    { key: 'hero_colorblock',recipe: 'bold-color-block' },
    { key: 'hero_noir',      recipe: 'noir-gold' },
    { key: 'pdp_front',      recipe: 'product-cut', variant: 'front' },
    { key: 'pdp_34',         recipe: 'product-cut', variant: 'three-quarter' },
    { key: 'ingredient',     prompt: 'product + fresh {ingredient}' },
    { key: 'lifestyle_morning', prompt: '...morning table...' },
    // concepts: splash/flatlay/editorial/iced/float/infocard...
  ],
  composites: [                       // 멀티오브젝트 → 합성 라우팅
    { key: 'lineup', layout: 'row', needs: 'all_skus' },
    { key: 'giftset', layout: 'box_tray', needs: 'all_skus + box' },
  ],
  video: {                            // 씬 플랜 → ugc/assembler
    aspect: '9:16', scenes: [
      { src: 'hero_sunlit', motion: 'push_in',  caption: '{line1}' },
      { src: 'lifestyle_iced', motion: 'fizz',  caption: '{line2}' },
      { src: 'giftset',    motion: 'push_in',   caption: '{cta}' },
    ]
  },
  copy: { hooks: 3, caption: true, use_real_claims: true },
}
```

- **beverage 스위트 = 방금 돈워리비애플로 실제 뽑은 그 목록.** 다른 버티컬(뷰티·의류·식품)은 팀이 같은 형식으로 큐레이션(이미 recipes에 컷 지식 있음).
- 유저는 스위트에서 컷을 **끄고 켤 수** 있음(과금·취향).

## 4. 기존 Doppia 인프라 매핑 (8할은 이미 있음)

| 파이프라인 단계 | 기존 자산 | 상태 |
|---|---|---|
| 이미지 생성(제품락킹) | `src/images/providers/nanoBanana.provider.js` | ✅ 재사용 |
| 영상 생성(i2v) | `src/videos/providers/kling.provider.js` | ✅ 재사용 |
| 영상 조립(씬→클립→**자막·TTS·믹스**) | `src/ugc/assembler/{ffmpeg.assembler,tracks}.js` · `ugcScript.service.js` · `renderPlan.js` | ✅ **거의 그대로** |
| 템플릿/레시피(히어로 컷 등) | `src/recipes/` (producthero·productcut…) | ✅ 재사용 |
| 미디어 저장 | R2 미디어스토어 | ✅ |
| 과금 | `credit.service.js` (◈/장·영상 씬) | ✅ |
| 동시 배치 | Ad Video 동시생성 패턴 | ✅ 유사 재사용 |

## 5. 신규 3모듈 (이게 전부. 나머지는 배선)

### 5.1 Reference Bake service ★
- 입력: 업로드 사진(1~N) → 출력: SKU별 캐논 레퍼(단품·클린배경·라벨보존).
- 구현: nanoBanana.generate + "clean isolated studio, preserve exact label, single product" 프롬프트. 세트면 **병 지오메트리 통일 + 라벨만 교체** 전략(실증됨) 또는 SKU별 개별 베이크.
- 저장: R2, `pack.canonical_refs[]`. **승인 게이트**로 라벨/색 오류 조기 차단.

### 5.2 Multi-object Compositor ★
- **왜 필요**: 생성모델은 "정확히 N개 서로 다른 SKU"를 못 그린다(실측: 7병 요청→6~8병·요일 오류). 영상 assembler는 있지만 **정지 다개체 합성은 없음.**
- 구성: **컷아웃(매팅 모델 rembg/BiRefNet 소형 서비스)** → 레이아웃 엔진(row/grid/box-tray) → 그림자·조명 하모나이즈 → (옵션) count-lock 폴리시.
- 실증 대안: 같은 베이크는 배경 동일 → 슬라이스concat+밝기정규화+크로스페이드로 무이음새(코드로 검증). 매팅 넣으면 임의 배경 가능.

### 5.3 Pack Orchestrator + Gallery ★
- 스위트 템플릿을 읽어 스틸/합성/영상 잡을 **팬아웃**(동시성=기존 패턴), 상태 집계.
- 산출물 → **갤러리 페이지**(공유 링크·다운로드 zip). 프로토타입 = 이번에 만든 `gallery.html`.

## 6. 데이터 모델 (신규 2테이블 + 기존 재사용)

```
content_pack:  id, user_id, team_id, product_name, vertical, config(단일/세트),
               input_photos[], canonical_refs[], suite_template_id, status, credits, created_at
pack_asset:    id, pack_id, kind(ref|still|composite|video|copy), cut_key,
               recipe_id?, url, thumb_url, status, meta(jsonb)
suite_template: vertical, spec(jsonb)   // §3 구조
```
- 영상 클립은 기존 `video_jobs` 재사용(kling). 미디어는 기존 R2.

## 7. 과금
- 팩 = 부분합(스틸 N장×◈ + 영상 씬×◈). **업로드 직후 견적 표시**, 컷 해제로 조절.
- 번들 할인 옵션(온보딩 유인). 기존 `credit.service`·`pricing.config` 매핑.

## 8. "알아서" 지능 레벨 (단계적)
- **v1**: 유저가 카테고리+구성(단일/세트) 확인 → 결정론적 스위트. (신뢰도 100%, 빠름)
- **v2**: 비전(nanoBanana/gemini describe)으로 카테고리·세트여부 **자동 제안** → 유저는 확인만.
- **v3**: 원물·컨셉 자동 추론(성분컷의 "사과"를 사진에서 추출), 카피 자동.

## 9. 빌드 페이즈
- **P0 (MVP)**: suite_templates(음료 1개) + Reference Bake + 스틸 배치 + 갤러리. → **단일 상품 팩**부터. (합성·영상 제외)
- **P1**: Multi-object Compositor(컷아웃+레이아웃) → 로우·기프트·세트/변형.
- **P2**: 영상 씬플랜 → ugc/assembler 배선 → 팩 안에 완성 광고.
- **P3**: 비전 자동분류(v2) + 카피 생성 + 다국어 + 버티컬 스위트 확장.

## 10. 리스크 / 오픈 이슈
- **레퍼 소스 갭**: 세트 중 일부 SKU 소스 없음(예: FRI) → 승인 게이트에서 사람 확인/보정.
- **카운트 한계는 모델 본질** → 합성이 임시방편 아니라 **정답**(영구).
- **컷아웃 품질**: 매팅 모델 선택·유리병 투명도 처리(엣지 케이스).
- **표시광고/진정성**: 제품 기반 image-to-image만, 없는 재료·클레임 날조 금지, 가상모델 옵트인, **게시 전 승인 게이트**.
- **비용/팩당 생성량**: 견적+컷 해제로 방어.

## 11. "방금 실증"과 1:1 대응 (이게 곧 스펙)
| 이번에 수동으로 한 것 | 제품 모듈 |
|---|---|
| refs_249 8종 베이크 | ② Reference Bake |
| 카테고리별 컷 목록 결정 | ③ Suite Template (beverage) |
| gen_heroA/bcd/concepts (24컷) | 스틸 배치 |
| A1-row/A4 PIL 합성 | ⑤.2 Compositor |
| Kling 3클립 + ffmpeg 15초+자막 | 영상 조립(ugc/assembler) |
| gallery.html | ⑤.3 Pack + Gallery |
| 카피팩 | 카피 생성 |

→ **결론: ②·⑤.2·⑤.3 세 모듈 신규 + 나머지 배선.** 엔진(생성·영상조립·템플릿·저장·과금)은 이미 있다.
