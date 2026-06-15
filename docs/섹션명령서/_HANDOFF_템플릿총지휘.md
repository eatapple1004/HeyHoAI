# 템플릿 총지휘 — 세션 이관 (2026-06-13)

> 다음 템플릿 총지휘 세션은 이 문서로 현황·다음할일·제약을 즉시 파악. 진실원천 = 레포 파일.

## 역할
템플릿 도메인 총지휘. 11개 카탈로그 v2 시드(현재 **94개**) 관리, 워커 11개 통솔, **테스트 통과 보고 + 어울리는 제품 보고 저장**.

## 현재 상태 (스냅샷)
- 브랜치 main 기준 94개. 검증 `node scripts/consolidate_recipes.js` → 11/11. beauty16/pet12는 **개수>8 의도예외**(Chief 승인 provisional 확장).
- **보류 UI**: 한때 main에 "전체 카드 보류 하드코딩"(bcd6886). → **PR #67 머지됨** = 통과로그 기반 조건부로 전환, **통과 6개 보류 해제 main 반영 완료.**

## 이 세션 산출물

### A. 머지된 PR
- **PR #67 (MERGED)** — "통과 6개 보류 해제". export가 `_pass_log.json`으로 `held=!passed` 주입 → studio 조건부 `보류` 배지. 포함파일: studio.html · export_recipe_cards.js · recipes.generated.js · _pass_log.json · log_pass.js.
- (이력: PR #63 status기반 보류UI→롤백 / PR #64 Chief 머지본 but main엔 블랭킷 bcd6886이 들어옴 → PR #67이 그걸 조건부화.)

### B. 추적 파일 (위치·상태)
| 파일 | 역할 | git |
|---|---|---|
| `docs/섹션명령서/_pass_log.json` | 워커 통과 누적(현재 **6건**) | **main에 있음**(PR #67) |
| `scripts/log_pass.js` | 통과 기록 헬퍼 | main에 있음 |
| `docs/섹션명령서/_template_products.json` | 통과 템플릿별 어울리는 제품 | ⚠ **untracked(로컬만)** — 미커밋 |
| `docs/섹션명령서/_template_status.json` | held→testing→confirmed 원장 | ⚠ 롤백된 PR #64 계열, **main엔 없음**(PR #67은 _pass_log 사용) |
| `scripts/template_status.js` | 라이프사이클 리포트 | untracked |
| `docs/출시_테스트_확정_프로세스.md` | 출시 보류·테스트 프로세스 | untracked |

### C. 통과 6건 (_pass_log.json)
void-hero-cut(tech) · pet-product-hero(pet) · lifestyle-scene-pack(fashion) · surface-macro(jewelry) · top-down-hero(food) · dewy-glass-hero(beauty). → 능동 스캔 + 워커 보고로 수집.

### D. 어울리는 제품 (_template_products.json) — ⚠ untracked, 미커밋
- **full(워커 풀보고 저장)**: dewy-glass-hero · top-down-hero · pet-product-hero.
- **partial**: void-hero-cut(스니펫 요약만).
- **pending(미수신)**: lifestyle-scene-pack · surface-macro.

## 다음 액션 (우선순위)
1. **워커 제품 풀보고 수신·저장** — 수신완료(full): beauty·food·pet·**fashion(Lifestyle Scene Pack)**. **대기 2개: tech(Void Hero Cut, 현재 partial→풀보고 대기)·jewelry(Surface Macro, pending)**. 도착하면 `_template_products.json`에 status:full로 저장. (현재 진실원천 = 그 파일.)
2. **`_template_products.json` 커밋** 여부 결정 — 현재 untracked. 제품 UI/백엔드가 쓸 거면 커밋 필요(별 PR).
3. **추가 통과 누적** — 워커 새 통과 보고 → `node scripts/log_pass.js "<name>" <vertical>` → `node scripts/export_recipe_cards.js` → 그 카드 자동 해제 → (작은) PR (PR #67 패턴).
4. **어울리는 제품 UI** — 미구현. 데이터(`_template_products.json`)가 더 채워지면 studio recipe 카드/모달에 표시(후속 PR). 데이터 모인 뒤 착수 권장.
5. (정리) PR #64 status원장 vs PR #67 _pass_log 방식 이원화 → 단일화 검토.

## 대기 결정 (총지휘 판단 필요)
- **beauty 히어로 패밀리 드래프트 8종** — `docs/섹션명령서/_beauty_hero_family_draft.json` (Dewy Glass Hero 형제, sort 17–24, 📷4컷 ◈2). beauty 워커가 생성+subject 정합/SAFETY 교정 완료. **⚠ 미검증 드래프트**(실생성 통과는 Dewy 1개뿐, 8개는 이미지 안 돌려봄).
  - 리스크 3종(Liquid Splash·Aqua Float·Cryo Frost = 액체/얼음 합성+라벨 가림) → 테스트 후 채택 권장.
  - 전량 채택 시 beauty 16→24(권장 6~8 초과) → **선별 채택**.
  - **총지휘 권고**: 라이프사이클대로 *드래프트 유지* → 안전한 1–2개(예: Stone Plinth Luxe=무광 자/튜브 갭 메움, Noir Gold Hero=럭셔리) 먼저 테스트 → **통과분만 시드 반영.** 리스크 3종은 보류.
  - 워커 대기: 총지휘가 (a)테스트할 1–2개 지정 or (b)채택 서브셋 결정 → 그에 맞춰 워커가 시드 반영.

## 제약 (반드시)
- **푸시 = 사용자 명시 승인 시만. main 직접 push/머지 금지. force 금지.** "PR만" 지시 = 피처브랜치 푸시+PR open, main 미머지.
- **푸시/PR 전 충돌검사 필수**: `git fetch origin main` → behind 0 + `git merge-tree` 충돌마커 0 확인. **studio.html이 핫**(동업자 활발 머지) → 충돌 빈번, 직전 rebase. (과거 실수: 충돌검사 없이 PR → studio.html 충돌. 이후 항상 사전검사.)
- **타 세션 미커밋 섞지 말 것**: `git add`로 내 파일만 선택(워킹트리에 타세션 docs 수정 다수 상존).
- **개발자/레거시 파일 금지**: login/signup/index/account-*/character/editor/logs/templates 등. 우리 소유 = studio·landing·billing·gallery·marketplace·affiliate·business·earnings·saas-login + js/{hh,pricing} + src/recipes·docs·scripts.
- 워커=파일만 저장. 총지휘=자기 도메인 git. **Chief(Doppia 총 최고관리자, local_a0599cf5-…)=최종 머지**.

## 워커·세션
- 워커 11개(=11카탈로그): `mcp__ccd_session_mgmt__list_sessions`로 보임(Tech/Pet/Fashion/Jewelry/Food/Beauty/Home/General/Headshot/UGC/Influencer recipes …).
- `search_session_transcripts`로 "테스트 통과" 능동 스캔 가능(스니펫만). `send_message`로 보고 요청(승인 프롬프트).

## 핵심 맥락 (참고 docs)
- 결정: 전 템플릿 출시 보류, 1:1 테스트 통과분만 해제(사용자 2026-06-13).
- product vs human / UGC=광고(제품 입력 슬롯 부재 갭) / 보류 라이프사이클 / guards / UGC fidelity bridge = `docs/제품_가드_적용_매트릭스.md` · `src/recipes/seeds/ugc.fidelity_profiles.v2.js` · `docs/프론트_핸드오프_게이트.md` · `docs/UGC_충실도_프로파일_적용.md`.
