# 🚀 런칭 스코프 원장 (2026-06, branch `feat/launch-scope`)

> 카드심사 통과 → 즉시 런칭 대비. **"좁고 완벽한 코어 > 넓고 반쪽."**
> 실행 단일소스 = `public/js/flags.js` (이 문서는 사람용 설명).

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
