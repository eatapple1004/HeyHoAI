# Bodywear 온바디(Worn Cut + On Model) — 다음 세션 진입점

이 문서 하나 읽고 바로 시작할 수 있게. 온바디는 큰 작업이라 별도 세션으로 이관(2026-07-18).

---

## §0. 지금 어디까지 됐나 (완료·라이브)
- **upstream/main = `52c33cd`**, worktree `~/doppia-underwear` (branch `feat/underwear-templates`), 미커밋 0.
- **no-person 완료 + 배포됨**: `bodywear` vertical (`src/recipes/seeds/recipes.bodywear.v2.js`) —
  Product Cut(4컷) + Hero(8무드). **Apparel > Innerwear & Swim** 에 노출.
  - 품목 = **garment axis**(studio.html `AXIS_DEFS.garment`: bottoms/bra/set/swim, 형태힌트 promptPhrase 주입). **이미 구축됨 — 온바디도 재사용.**
  - Hero 무드 = **품목별 조건부**(무드 cut `meta.garment` 태그 → contract 운반 → studio `cutsForFilter` 필터+재렌더). 패턴 확립됨.
- **taxonomy 3-카테고리 2-레벨**: Apparel[Clothing·Innerwear&Swim] / Beauty[Cosmetics·Nail] / Accessories.

## §1. 이번 세션 목표 = 온바디 2 패밀리
`bodywear`에 추가:
1. **Worn Cut** (◈3) — 얼굴 없는 성인 몸/부위 크롭 (로스터 미사용, 몸 생성). faceswap **불필요**(얼굴 없음).
2. **On Model** (◈5) — 로스터 얼굴 O. **faceswap 2-stage 필요.**
둘 다 garment axis(품목)로 파라미터화 — 품목별로 프레이밍·안전이 달라짐(§3).

## §2. 선행 필수 = faceswap 파이프라인 (엔진/백엔드)
**On Model은 이 파이프라인 없으면 실효 없음.** 전체 스펙 = **`docs/섹션명령서/14_underwear_작업기록.md`**
(그 문서는 "underwear"로 쓰였지만 개념은 bodywear에 그대로 적용). 핵심:
- **방법**: 얼굴 레퍼 없이 프롬프트로 모델 근사 생성(stage-1) → 로컬 **`~/facefusion`**(FaceFusion CLI, nsfw+age 자체게이트)로 우리 AI 합성얼굴 스왑(stage-2). ("모델레퍼+속옷" 벤더 거부 회피.)
- **아키텍처**: 비동기 잡(Postgres SKIP LOCKED) + 자가호스팅 GPU 워커풀. 인라인 자동(candidates 직후 스왑). 자기청소 래퍼(좀비 방지).
- **후킹**: `src/generate/generate.route.js`(스왑 호출·KIDS 거부) · `src/images/imageGeneration.service.js` · 신규 `src/images/faceswap.service.js` · 신규 워커.
- **keyed-strip** (`src/images/imagePrompt.builder.js`): 속옷/바디웨어일 때만 `underwear/lingerie/see-through/fully clothed/provocative/seductive/suggestive` strip. ⚠️**프리셋 이름으로 트리거 금지**(공유 프리셋 누수) → **`config` 명시 플래그** 또는 `vertical==='bodywear'`로.

## §3. bodywear가 추가한 새 맥락 (underwear 때보다 복잡)
온바디가 이제 **남성 속옷 + 여성 란제리/브라 + 수영복**을 다 커버 → 품목별로:
- **성별**: bra→여성, bottoms→남녀, swim→남녀, set→여성. **온모델 모델 픽커가 품목에 맞는 성별/로스터를 골라야** 함(garment axis 값 → 로스터 필터). ← underwear 때 "미룬 성별 부채"가 여기서 해소돼야.
- **안전(품목별)**: 여성 란제리·수영복 온모델은 남성 속옷보다 **벤더 노출게이트 리스크가 큼**. 품목별로 프레이밍·문구 절제 차등. §2의 4중 안전(kids 하드거부·stage-1 가드·facefusion 게이트·사람검수)에 더해 **란제리/비키니 온모델은 특히 테이스트풀 강제**.
- **프레이밍**: Worn Cut = 품목별 부위(허리밴드 크롭 / 브라 상체 크롭 / 세트 / 스윔). On Model = 품목별 상반신·토르소.

## §4. 배선 (5지점 — no-person 때 익힘, 그대로 반복)
① `recipes.bodywear.v2.js`에 Worn Cut·On Model 패밀리 추가(+ 로더는 이미 bodywear 등록됨) → recipes.generated 재생성
② `taxonomy.js` Innerwear & Swim content-type은 vertical:bodywear 매칭이라 **자동 포함**(추가 배선 불필요)
③ `themes.js` DEFAULT_OFFICIAL_RECIPES에 새 부모 id 추가
④ `studio.html buildTemplates` C.bodywear는 이미 있음 — On Model은 `meta.picker:'model'` 배선 + faceswap post 신호
⑤ `?v` 갱신
⚠️ **studio.html 편집 가능**(Ad Video 세션 중지됨). 단 시각렌더는 인증벽으로 확인 어려움 → 데이터체인+문법 검증 필수.

## §5. 착수 순서 (제안)
1. 사용자와 faceswap 파이프라인 범위 확정(인라인 자동 vs 수동, 워커 구축 범위) — §2.
2. Worn Cut 먼저(faceswap 불필요, 저위험) → recipes + 배선 + 검증.
3. On Model = faceswap 파이프라인 착지 후. 품목별 성별/로스터 + keyed-strip + 4중 안전.
4. 각 단계 커밋·ff·푸시(사용자 승인). 배포=public 재배포 + migrate.

## §6. 진입점 요약
- 이 문서 → §2 상세는 `docs/섹션명령서/14_underwear_작업기록.md` · 전체 설계 `docs/apparel_bodywear_재편_설계_2026-07-18.md`
- 메모리 `doppia_underwear.md` (재편 최신상태)
- ⚠️ push=사용자 승인만 · studio.html/i18n.js 주의 · 5지점 배선 · 데이터체인+문법 검증(시각렌더 인증벽)
