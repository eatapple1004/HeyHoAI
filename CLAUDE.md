# Doppia (구 HeyHoAI Studio) — 프로젝트 컨텍스트

AI 마케팅 콘텐츠 생성 SaaS. 얼굴 셀카 또는 제품 사진 1장 + 템플릿 → 사진/릴스 자동생성(프롬프트 0). 정적 프론트 `public/` + 엔진 `src/`. **현재 mock 단계**(백엔드 미연결 — `docs/BACKEND_HANDOFF.md`).

## 🧭 세션 조직 (이 repo는 다중 Claude 세션으로 운영)
구조: **👑Chief → 도메인 총지휘(템플릿·엔진·프론트UX·백엔드·그로스 +조건부 마켓·T&S) → 워커.** 세션 메모리 비공유 → 공유 백본 = 이 레포 파일.
- **전체 맵**: `docs/세션조직/00_조직도.md`
- **Chief 세션이면 먼저**: `docs/세션조직/_HANDOFF_to_CHIEF.md`(현재 상태·미해결) + `docs/세션조직/01_CHIEF.md`(역할)
- **도메인 총지휘/워커**: `docs/세션조직/<도메인>_총지휘.md` · 템플릿은 `docs/섹션명령서/`
- 본인이 어느 세션인지 모르면 사용자에게 역할(Chief/도메인/워커)을 먼저 확인.

## ⚠️ 하드 제약 (모든 세션 공통)
- **push = 사용자 명시 승인 시만. 강제푸시 절대 금지. `main` 직접 push 금지** (작업 브랜치 `feat/ux-monetization-v2`, PR #8 → base는 개발자 브랜치).
- **워커 = 파일만 저장(commit/push 금지)** · 도메인 총지휘 = 자기 도메인 git · **Chief = 최종 머지/릴리스**.
- **📥 PR마다 main 동기화 (필수 규칙)**: 새 PR을 올릴 때(PR 번호가 하나 올라갈 때)마다 **먼저 `git fetch` + origin/main 충돌 확인 → pull/rebase로 최신화** 후 진행. **작업 시작 전에도 origin/main 먼저 pull + 충돌 확인.** 장기 분기 금지 — main이 빠르게 전진해서 안 받으면 대량 충돌(실제 발생).
- **📊 프롬프트/템플릿 = 시드 + 구조화 export 동시 (필수 규칙)**: 시드(JS) 하드코딩과 **동시에** Excel/CSV 등 구조화 파일로 별도 저장(추후 **DB 적재용**). 시드 변경 시 export도 갱신.
- **📝 기록 루틴 (작업마다 즉시)**: 템플릿/시드를 만들거나 고치면 끝나는 즉시 — ① `node scripts/consolidate_recipes.js` 재실행(→ `_STATUS.md`·`_CATALOG.json`) ② 백본 문서 동기화(`docs/템플릿_v2_발굴선별강화_결과.md`·`docs/템플릿_한국어_카탈로그.md`·`public/_overview.html`) ③ 발굴·갭분석 등 판단 산출물은 채팅에만 두지 말고 docs에 남김. 상세 = `docs/섹션명령서/00_총지휘_종합관리.md` §7-6.
- **개발자(eatapple1004) 소유·레거시 파일 건드리지 말 것**: `login/signup/index/account-*`, `baby-growth/birth-reel/character/editor/logs/templates`. 우리 소유 = `studio·landing·billing·gallery·marketplace·affiliate·business·earnings·saas-login` + `js/{hh,pricing}` + `src/recipes`·`docs`·`scripts`.
- **시크릿 커밋 금지**(푸시 전 스캔). 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## 현재 핵심 상태
- 가격 = **추정 placeholder**(엔진 costMeter 실원가 확정 전까지 확정 금지). 단일소스 `public/js/pricing.js` → 백엔드 시 `/api/pricing`.
- ⚠️ **라이브 doppia.ai = 옛/부분 배포로 PR #8 작업 미반영** → `public/` 전체를 통째 재배포 필요(호스팅 방식 사용자 확인).
- 템플릿: 11섹션·78개 OK(`node scripts/consolidate_recipes.js`로 검증). jewelry는 v2.1 8개로 확장(커버리지 감사 반영). pet 포트폴리오 감사 결과(신규6+rework2 승인대기)는 `docs/섹션명령서/00_총지휘_종합관리.md` §9 / `08_pet_작업기록.md` 참조.
- 상세 진행/결정은 사용자 메모리 `heyhoai_studio.md` 참조.
