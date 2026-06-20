# 🚀 런칭 스코프 원장 (2026-06, branch `feat/launch-scope`)

> 카드심사 통과 → 즉시 런칭 대비. **"좁고 완벽한 코어 > 넓고 반쪽."**
> 실행 단일소스 = `public/js/flags.js` (이 문서는 사람용 설명).
> 🔄 **2026-06-21 피벗(코어 확장)**: "narrow core"에서 **제작↔발견 성장 루프**로 방향 전환. 아래 §피벗이 최신 정본이며, 일부 2026-06-20 "숨긴다" 항목을 재정의함.

## 🔄 피벗 (사용자 확정 2026-06-21) — 직접 생성 · 템플릿화 · Library/Feed

> "좁고 완벽한 코어"를 유지하되, **유저가 툴·프롬프트로 직접 만들고 → 템플릿화 → 남이 Try·좋아요** 하는 성장 루프를 코어로 흡수. 이전 "pro만/모델선택 숨김" 단순화는 아래로 대체.

### 되는 시스템 (데이터/엔진)
- **툴이 템플릿에 박힘**: `Template = {id, name, vertical, mode, prompt, negative, tool, params, enabled}`. 시드·유저 동일 형태.
- **Tool registry** (신규 `src/tools/registry.js`) = 단일정본 `{id, type(image|video), adapter, cost, params, enabled}`. `enabled`가 런칭 노출 큐레이션. → "잘나가는 툴 전부" 빌드하되 노출은 일부만.
- `generate.route`가 **템플릿의 tool로 라우팅**(레지스트리 경유). 기존 하드코딩 model 분기(flash/pro/gpt) 제거. 파워유저 override 파라미터.
- `user_templates`(Postgres) = `Template 형태 + tool_id, owner_id, visibility(public|private), likes_count, uses_count, preview_media`. 신규 테이블 `template_likes`·`template_uses`.

### UI/플로우
- **모드탭 = Influencer · Shopping · UGC · Custom** (Custom 4번째 신규). 기존=템플릿 고르기, **Custom=직접 짓기**(툴 픽커 + 풀 프롬프트 에디터).
- **단순 레인**: 템플릿(tool 내장) + 선택 `extraPrompt`(이미 존재). **모델 픽커 숨김**(tool=템플릿 속성이라 무의미).
- **Save as template = 에디터 + 결과 둘 다** → `user_templates`.
- **Gallery → Library** 리네임. 탭 3개: **My creations / My templates / Feed**. 유저 템플릿은 studio 그리드 "My templates" 필터로도 재사용.
- 유저 템플릿 **public/private 토글**. private=본인만.
- **Feed (런칭 코어)**: 공개 템플릿을 **크리에이터가 고른 예시 미디어**로 쇼케이스(사적 결과물 통째 공개 X — 프라이버시). 액션 = **Try it(무료, studio에 열려 내 사진으로 생성) + 좋아요**.

### 런칭 스코프 변화
- 🟢 **코어 추가**: Custom 모드 · 툴 레지스트리(전체 확장·enabled 큐레이션) · Save-as-template · Library/Feed · public/private · Try·좋아요.
- 🛡️ **T&S 최소 모더레이션 = 런칭 블로커로 추가**: 콘텐츠 정책 + Report(신고) + 테이크다운(관리자 숨김). T&S 도메인 활성 필요(현재 보류).
- 🔴 **후속(deferred)**: **Market = 유료 판매 전용**(크리에이터 정산·페이아웃·라이선스 → 숨겨둔 earnings·affiliate). **Feed가 무료 공유·발견 흡수.** Feed→Market = 항목에 가격표+"Get"→결제로 나중에 끼움.
- **"무료" 정의** = 크리에이터 추가요금 없음(템플릿 실행 자체는 평소 생성 크레딧 소모).
- 이전 "모델 단순화(pro만)"·"reels 숨김"은 이 피벗으로 재정의: 모델=템플릿 tool, 영상툴(kling 등)은 registry `enabled`로 관리.

### 빌드 순서 (WBS)
1. **Tool registry** + `generate.route` 리팩터 (HOT)
2. 레시피 시드에 **`tool` 필드** + recipeStore 노출
3. 전 템플릿 **tool 배정** (🎨 도메인, 기본=pro 일괄 → 정제)
4. 생성 = **템플릿 tool 해석**(+override)
5. **`user_templates`** 마이그레이션 + CRUD + 시드/유저 병합 (HOT db)
6. studio **Custom 모드 + 점진공개 UI** (HOT)
7. **Library** 리네임 + 3탭 + public/private + Try + 좋아요
8. **T&S 최소 모더레이션** (Report/테이크다운)
9. **툴 어댑터 웨이브** (enabled 큐레이션)
10. `flags.js` 정리(모델픽커 숨김 제거, Feed/툴 게이팅)
- **첫 스텝**: `generate.route.js`(HOT) 현재 상태 동기화·보고 → 1·2 토대.

## 결정 (사용자 확정 2026-06-20)

### 🟢 살린다 (런칭 필수)
1. 인증 → 온보딩
2. 핵심 생성 루프 (사진 + 템플릿 → 이미지, 모델=pro)
3. 검증된 템플릿만 노출 (held/미검증 숨김)
4. 갤러리
5. 결제 / 크레딧
6. **워터마크 폐지 → 크레딧 하드게이트**: 토큰(크레딧) 0이면 생성 자체 차단(402). 무료 워터마크 출력 경로 제거.
   - ❓ 미정: 신규가입 무료 체험 크레딧 지급 여부(기본=기존 지급 유지 + 워터마크만 제거).

### 🔴 숨긴다 (flags.js, 로컬은 표시+배지)
brandkit(보류) · reels(Kling 영상) · marketplace · earnings · teams · business · affiliate

### 모델 단순화
**pro 하나만 노출**, flash·gpt 숨김 (백엔드 기본값 'pro' 유지).

## 동작 방식
- **로컬(localhost)**: 전부 노출 + `🔒 main 보류|숨김` 배지.
- **main(prod, doppia.ai)**: `launch:false` 기능 숨김.
- 판별: 프론트=hostname, 백엔드=`NODE_ENV`(돈/데이터 라우트 게이팅용 — 아직 미구현).
- **prod 미리보기 토글**: 어느 페이지든 `?prod=1` 붙이면 로컬에서도 prod(숨김) 모습 확인. 숨기기만 하므로 안전(노출 위험 없음).

## 작업 체크리스트
- [x] `public/js/flags.js` 생성 (단일소스)
- [x] **메커니즘 검증 완료** — `_flagtest.html` harness로 로컬=노출+배지 / prod시뮬=display:none 확인 (preview :8098)
- [x] studio: `flags.js` include + brandkit·reels·모델(pro만, flash/gpt data-flag·기본 .on=pro) 배선 (정적검증 OK, 화면확인은 로그인 필요)
- [x] landing: business(nav·audience·footer·teams줄)·marketplace(footer·sell-line) — :3001 숨김(6/6)/:3002 배지(6/6) 검증
- [x] **페이지 가드**: marketplace·business·affiliate·earnings·join-team에 flags.js — prod=홈 리다이렉트 / 로컬=배너. 검증 완료
- [ ] 🔥 **#6 워터마크 폐지 + 크레딧 하드게이트** — `src/generate/generate.route.js`(HOT). design-first.
- [ ] 백엔드 라우트 게이팅(prod): `/api/teams`·`/api/marketplace`·`/api/affiliate` 등 NODE_ENV=production+flag off → 404 (프론트 가드는 JS, 서버 하드닝은 별도).
- [ ] studio 화면 시각확인(로그인 필요) · 정리: `_flagtest.html` 삭제, launch.json 프리뷰 항목.

## 진행 메모
- 격리 worktree `~/HeyHoAI-launch` (`feat/launch-scope`, base `f355fcd`). 미커밋·미push.
- **로컬 2-포트 미리보기** (둘 다 같은 코드, flags.js가 포트로 모드 구분):
  - **:3002 = 로컬뷰** (다 보임 + `🔒 main` 배지) — preview `launch-app-local`
  - **:3001 = prod뷰** (실제 숨김) — preview `launch-app`
  - flags.js 규칙: `location.port==='3001'` → prod(숨김). 그 외 로컬 = 노출+배지. `?prod=1`도 유효.
  - 워커 :3000(다른 세션·flags 없음) 불가침 유지. 정적 미리보기 `launch-static`(:8098)도 가용.

## ⚠️ 제약
- `studio.html`·`generate.route.js`·`index.js` = 개발자 HOT/공유 → worktree 격리(이 브랜치), surgical 수정, 동기화, **충돌 즉시 중단·보고**. push·머지·배포 = 사용자.
- 가격 placeholder → 실원가 확정은 별도 런칭 블로커(코드 아님).
