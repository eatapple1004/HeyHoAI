# dev 점검 현황 (계속 갱신)

dev.doppia.ai 전수 점검 — 서버 로그(pm2), DB 실패 기록(최근 14일), 전 페이지 PC(1440)·폰(390) 캡처 + 콘솔/네트워크 에러.
상태: ✅ 고침(dev 반영) · ⏳ 남음 · 👤 다른 담당(개발자/팀원/결제)

마지막 갱신: 2026-10-17

## ✅ 고친 것

| # | 증상(사용자 입장) | 원인 | PR |
|---|---|---|---|
| 1 | Image·Video "My results", Explore·Home 커뮤니티 카드가 한참 빈 상자 | 카드마다 원본 PNG(6~8MB)·영상 수십 개를 한꺼번에 받음 | #409 (`js/thumbs.js`) |
| 2 | Video 결과 카드에 `fal-ai/…/reframe`, `ugc-v1` 같은 내부 이름 | 엔진 엔드포인트 원문 표시 | #409 |
| 3 | 폰에서 Studio 화면 전체가 옆으로 밀림, 가이드 팝업 화면 밖 | 결과 카드가 사진 원래 폭(460px)으로 늘어남 | #409 |
| 4 | /admin-proposal 동작 안 함(08-19부터) | admin-nav `<script>` 가 내보내기 HTML 문자열 안에 들어가 스크립트 전체 SyntaxError | #409 |
| 5 | Video Editor 폰·태블릿에서 미리보기·도구가 잘림, 1000px 이하에선 AI 도구가 아예 숨음 | 3단 고정 레이아웃 | #410 — 좁은 화면은 미리보기·타임라인·AI 도구·미디어 세로 배치 |
| 6 | 폰 Video 결과 카드에서 라벨과 "HD" 겹침 | 인라인 `columns:3` 이 폰에서도 3열 고정 | #410 — 좁은 화면 2열 + 라벨 말줄임 |
| 7 | PC Studio 가로 스크롤 53px | 오른쪽 끝 도움말 말풍선(가운데 정렬, 한 줄 300px)이 화면 밖 | #410 — 오른쪽 기준·줄바꿈 |
| 8 | Ad Video "My ad videos" 카드에서 영상이 왼쪽에 붙고 오른쪽이 빔 | `aspect-ratio`+`max-height` 가 폭을 259px 로 줄임 | #410 |
| 9 | Home(/home)이 닫힌 Content Pack 으로 안내 | 퀵스타트 "Create content pack" → /pack(Coming soon), 가이드 문구 | #410 — 퀵스타트 숨김, 가이드 문구 Lens 로 |
| 10 | Marketplace 하단 "Want to earn by referring others?" 문구만 덩그러니 | Affiliate 숨김인데 문구는 노출 | #410 — affiliate 플래그로 같이 숨김 |
| 11 | Marketplace 템플릿 카드가 이모지만 표시 | 대표 사진(`thumb`)이 있는데 카드가 안 씀 | #410 |
| 12 | Library 매번 404 + 콘솔 에러 | 로컬 전용 `recipe_sig.local.js` 로드 태그가 push 됨 | #410 |

## ⏳ 남은 것 / 👤 다른 담당

| 항목 | 내용 | 담당 |
|---|---|---|
| GPT Image 429 | OpenAI 크레딧 부족 — Editor 지우기·글자 고치기·확장이 GPT 로 갈 때 실패(14일 20건) | 👤 결제 충전 |
| 서버 디스크 92% | 10-16 dev 영상 1건 ENOSPC 실패. prd `tmp/ugc`(2.2GB)·`tmp/uploads`(1.9GB) 정리 크론 없음 | 👤 개발자 |
| Shoot 다각도 | 10-16 실행에서 24장 중 13~22장 "blocked". `mapLimit` 오류는 팀원이 이미 수정 | 👤 팀원(qwertty979) |
| /templates · /accounts 폰 가로 넘침 234px | 옛 상단 메뉴 | 👤 개발자 소유 파일 |
| 로그인·회원가입 한국어 고정 | 영어 랜딩에서 넘어가도 한국어 | 👤 개발자 소유 파일 |
| /accounts 인스타 프로필 사진 깨짐 | 인스타 CDN 링크 만료 | 👤 개발자 |
| Affiliate·Earnings·Business | 숨김 기능 — 직접 주소로 오면 랜딩(/)으로 이동(의도된 동작) | — |
