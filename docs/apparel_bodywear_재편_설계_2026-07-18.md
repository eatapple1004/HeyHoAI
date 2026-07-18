# Apparel / Bodywear 재편 — 설계결정 (2026-07-18)

기존 top-level `underwear` 카테고리(배포됨, upstream/main=54acf8c)를 **Apparel 하위 구조로 재편**하고,
**여성 속옷(브라·세트)·수영복까지 제대로 커버**하기 위한 설계. 구현 전 합의 고정용.

---

## §1. 범위
- **이번 범위 = no-person만** (Product Cut + Hero). 사람 없어 벤더 노출게이트 무관.
- **On-model = 보류** (faceswap 파이프라인 선행 필요 — 별도 문서 `docs/섹션명령서/14_underwear_작업기록.md`).
- 목표: 남성 속옷만 커버하던 것을 **여성 속옷·수영복까지** + 카테고리 폭증 없이 + 기술적으로 깨끗(중복0·MECE).

## §2. 확정 구조

```
Apparel (의류)                              ← 상단 카테고리
 ├ Clothing (일반 의류)                      ← 스몰 카테고리 (기존 fashion)
 └ Innerwear & Swim                         ← 스몰 카테고리 (속옷+란제리+수영복 버킷)
      │
      └ 템플릿(Product Cut · Hero) 안에서:
          ① Garment detail 셀렉터 (in-template 파라미터):
              · Bottoms   (브리프·복서·팬티)   → 형태힌트: 허리밴드·불투명
              · Bra       (브라)              → 형태힌트: 컵·스트랩·언더와이어
              · Set       (세트)              → 브라+하의 코디  ⚠️ 멀티레퍼런스
              · Swimwear  (수영복)            → 트렁크·원피스·비키니
          ② Hero 무드 = 품목별 조건부 (셀렉터 값에 따라 무드 목록 스왑):
              Bottoms → 클린·애슬레틱·노어
              Bra     → 레이스·실크·부드아르(테이스트풀)
              Set     → 로맨틱·코디·부드아르
              Swim    → 비치·풀사이드·선릿
      (On-model = 파이프라인 대기. 성별은 여기서만 필요 → 모델 픽커가 해결.)
```

**전체 top-level 재편 (3개 상단 카테고리, 각 스몰카테고리):**
```
Apparel (의류)       → Clothing · Innerwear & Swim
Beauty (뷰티)        → Cosmetics(화장품) · Nail(네일)      ← 현 top-level 화장품+네일을 뷰티로 묶음
Accessories (악세서리) → Jewelry(주얼리)                    ← 향후 가방·시계 확장 자리
```
→ 상단칩 5개(의류·화장품·네일·악세서리·underwear) → **3개(Apparel·Beauty·Accessories)** 로 정돈.
매핑: 스몰카테고리 = 기존 taxonomy의 content-type 자리에 배선(2층 유지, 신규 네비층 불필요). 각 스몰 밑 카드 = 템플릿(Product Cut·Hero 등).

## §3. 설계 결정 로그 (왜 이렇게)
1. **품목 = 카테고리 아니라 in-template 파라미터.** 생성은 reference-driven(업로드 이미지가 품목 결정) → 대부분 컷에서 품목은 "힌트"에 불과. 품목별 카테고리/레시피 복제는 잉여 → 셀렉터로 파라미터화해 **중복 0.**
2. **스몰 카테고리 2개(Clothing / Innerwear & Swim)만.** 겉옷 vs 바디헤깅 = MECE. 상단칩 폭증 방지.
3. **성별 분리 안 함.** 품목으로 자연 분리(브라=여성 함의, 하의=공용·같은 샷). 성별이 실제 필요한 곳은 **온모델뿐**(deferred) → 미룸.
4. **무드 = 품목별 조건부.** 브리프에 레이스, 브라에 애슬레틱이 뜨면 프로답지 못함.
5. **수영복 = 상세.** 형태(하의/컵/세트)와는 다른 "맥락" 축이지만, 같은 바디웨어 버킷 + 같은 온바디 파이프라인·안전이라 함께 둠.

## §4. 기술 노트 / 숙제 (구현 시 유의)
- **신규 FE 로직**: Garment 셀렉터 값 → ① 형태힌트 프롬프트 주입 ② Hero 무드 목록 **조건부 스왑**. 기존 axes(단순 주입)·picker(모델 그리드)보다 한 겹 위 → `studio.html`에 신규 배선.
- **Set = 멀티레퍼런스**: 브라+하의 2피스 업로드 → `min_refs:1` 전제와 다른 입력 플로우. (v1에서 단일 세트이미지만 받고, 2피스는 후속으로 둘 수도.)
- **기존 top-level `underwear` 흡수**: 배포된 top-level underwear 카테고리를 이 구조로 이전(taxonomy.js·themes.js·studio.html·recipes 정리).
- **라벨**: 칩은 영어(i18n.js off-limits) → "Innerwear & Swim" / "Clothing".
- **성별 부채**: 온모델 착수 시 "누가 입냐" 강제됨(브라→여성) → 그때 모델 로스터/픽커로 해소.

## §5. 구현 순서 (제안)
1. **taxonomy 재편** — apparel에 small category 2개(Clothing, Innerwear & Swim). 기존 top-level underwear 흡수.
2. **Bodywear 레시피** — Product Cut + Hero (파라미터형). garment-type axis + 품목별 무드 데이터.
3. **studio.html 셀렉터 UI** — garment 셀렉터 + 조건부 무드 스왑 + 형태힌트 주입.
4. **5지점 등록** — recipes.generated · taxonomy · themes · studio buildTemplates · ?v.
5. **검증**(데이터 체인) + 배포(public 재배포 + migrate).

## §6. 결정됨 (2026-07-18)
- **Set = 이미지 1장만** (유저가 세트를 한 장으로 촬영·업로드). 2피스는 후속.
- **fashion = "Clothing"으로 재배치** (그대로 두지 않고 Apparel 하위로 이전).
- **Beauty·Accessories도 재편** (화장품+네일 → Beauty / 주얼리 → Accessories).

## §7. 리스크 / 페이징 (⚠️ 라이브 재구성)
- Beauty·Accessories·Nail은 **현재 라이브 카테고리** → 재구성 시 딥링크(taxonomy 초기 vertical 매칭, studio.html L2323 부근)·기존 동작·저장상태 영향 가능. Apparel/Bodywear(신규 기능)보다 **블라스트 반경 큼**.
- **권장 페이징**: (1단계) Apparel/Bodywear 먼저 — 실제 제품 니즈(여성 속옷) · 신규라 리스크 낮음. (2단계) Beauty/Accessories 정돈 — 별도로 딥링크·동작 검증하며. 한 번에 몰아치면 중요 기능에 리스크 전가.
