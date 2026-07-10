# ABCD 레이어드 재생기 — 핸드오프 (2026-07-10)

> Doppia Ad Video 미리보기를 "서버가 매번 구운 한 영상" → **브라우저가 조각(클립·자막·오디오)을 실시간 조립해 재생**으로 전환.
> 목표: **씬 전환/자막 즉시 · 편집 중 서버 왕복 0(에러·좀비 급감) · 최종본은 저장 때만 굽기.**

## 0. 먼저 읽기
- 사용자 메모리 `doppia_ugc_video_engine`(핵심상태·전체히스토리) — **반드시 먼저**.
- 진입점 메모리: `doppia_local_prod_isolation`, `doppia_preview_keepalive`, `doppia_kling_pipeline`, `doppia_media_storage_bug`.
- 레포 `~/HeyHoAI-launch`, 브랜치 `feat/launch-scope`(= upstream/main + SSL 로컬패치 위). prod 배포=`cd /home/ubuntu/HeyHoAI && git pull && pm2 restart HeyHoAI`.

## 1. 확정 설계 (사용자 결정, 변경 금지)
- **소리 = 음성·음악 따로 트랙 2개.** → on/off·볼륨·더킹 = 즉시(클라이언트 mute), *내용* 변경(새 보이스/음악/나레이션)만 서버가 몇 초 재생성(영상 안 멈추고 스르륵 스왑).
- **최종본(공유/다운로드) = Save & finish 때만 서버가 굽기.** 편집 중엔 서버 굽기 0.
- **편집 = 클라이언트 즉시**: 씬 버전전환·재배치·삭제·자막(텍스트/타이밍/스타일) 전부 재생기에서 즉시. "unsaved" 표시 필요.
- **씬 재생성(Kling)·오디오 생성(ElevenLabs)** 은 본질상 몇 초 걸림(AI가 실제 생성) — 즉시 불가, 단 영상 안 멈춤.

## 2. 이미 완료 (검증됨)
- **클립 시퀀서 핵심 = `public/js/ugcPlayer.js`** (`ugcMakePlayer(wrap, opts)`).
  - 더블버퍼 비디오 2개, 타임라인(씬 durationSec 누적), `seekTo/play/pause/setScenes/currentTime/total/visibleClip`.
  - `setScenes(newScenes)` = 버전전환·재배치·삭제 즉시 반영(클립만 스왑, 서버 0).
  - `onTime(ms,total)` 콜백 = 자막 싱크용.
  - **브라우저 격리 하네스 14/14 PASS**(끊김없는 전환·seekTo별 정확한 클립·버전스왑 즉시·재배치·삭제·루프·실제 영상 디코드 readyState4). 아직 studio.html엔 미배선.
- **백엔드 토대(미커밋, 이 트리에 있음)**: `src/ugc/ugcVideo.service.js` `editableScenes().versions[]`에 `clipUrl`·`durationSec` 추가(클라이언트가 버전별 클립을 스왑하려면 필수). 회귀 하네스 21/21 유지.

## 3. 단계별 계획 (각 단계 격리 검증 후 진행)
### A. 오디오 트랙(백엔드) — 음성·음악 따로
- `assembler`에서 믹싱된 오디오 대신 **voice-only, music-only 2개 파일** 산출(또는 기존 mix에서 분리). runPipeline이 영속화 → `getJob`에 `voiceUrl`·`musicUrl` 노출.
- 오디오 캐싱(voKey/musicKey) 재사용 유지. voice off/music off는 프론트에서 mute라 서버 무관.
- ⚠️ 실 소리는 ElevenLabs=prod. 로컬은 코드검증(더미 오디오로 ffmpeg 분리 확인)까지.

### B. 재생기 배선(프론트) — `public/studio.html`
- `renderUgcInline`의 `useOverlay` 브랜치에서 단일 `<video src=previewUrl>` → **`ugcMakePlayer` 마운트**(scenes=editableScenes 활성 clipUrl). `.ugc-cap-ov` 오버레이 유지.
- 자막 싱크: 현재 `ugcSyncCap(video,jobId)`가 `video.currentTime` 사용 → **재생기 `onTime(ms,total)`가 자막 위치 구동**하게 리팩터(`ugcSyncCapAt(jobId,ms)` 신설, 기존 매칭·오버레이 로직 재사용).
- 오디오: voice/music `<audio>` 2개를 재생기 시계와 동기(재생기 currentTime을 master로, 오디오 currentTime 보정). muted 기본 유지(자동재생 정책), 언뮤트 시 소리.
- ⚠️ studio.html은 인증가드 → **:4178(launch-static-verify) 격리 하네스로 검증**(실 소스 함수/CSS 추출, getComputedStyle 기반). 실동작은 prod.

### C. 편집 클라이언트화
- `ugcSceneVersion`(‹›) → `ugcReassemble` **호출 제거**, 대신 `player.setScenes`(활성버전 clipUrl 교체)로 **즉시** + `_dirty=true`. 서버엔 활성버전 기록만(경량 PATCH, 굽기 없음) or 저장 시 일괄.
- 재배치·삭제도 동일(즉시 + dirty).
- 자막(텍스트/타이밍/스타일)은 이미 오버레이 클라이언트라 유지.
- **"Unsaved changes" 표시** + Save & finish 강조.

### D. 저장 시 굽기
- `Save & finish` → 현재 클라이언트 상태(활성버전·순서·자막·오디오)를 서버에 보내 **최종본 1회 생성**(기존 reRender/commit 재사용, 완성본 캐시 활용). 성공 시 committed.
- 이탈 시 sendBeacon auto-commit도 현재 상태로.

## 4. 위험지점 & 검증 원칙 (교훈)
- **DB경유 기능은 순수함수 말고 실 render→편집 로컬 harness(doppia_local, dryRun, user에 role:'admin'=과금면제)로 통합검증.**
- **표시 여부는 인라인 style 말고 `getComputedStyle().display`로 검증**(CSS base가 인라인 빈값 덮음 — 과거 자막 안뜨던 근본버그).
- **로컬(:3001 prod DB 조회전용·:3002 로컬DB·:4178/:8098 정적)에서 Kling 영상 생성/폴러 금지.** 이미지/대본/음성·음악 격리 테스트는 OK.
- 브라우저 옛 캐시 주의 → prod 확인은 `?v=` 붙여 새로고침.
- 검증 하네스는 실 studio.html/소스에서 **함수·CSS 추출**해 드리프트 0로.

## 5. 하드 제약
- **push는 사용자 명시 승인 시만.** 대상=upstream/main. **SSL-safe cherry-pick**으로 SSL패치(`src/db/client.js`, 로컬전용, feat/launch-scope 최상단) 제외. 푸시 전 fetch+충돌+시크릿 스캔. 커밋 끝 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **미리보기 3서버 항상 유지**(죽으면 재기동, 다른 챗 점유 가능).
- 제품 UI 카피는 영어, 사용자 답변은 한국어.

## 6. 병렬 세션 조율 ⚠️
- **다른 세션이 동시에 이 레포에서 작업 중.** ABCD는 `public/studio.html`(UGC 부분)·`src/ugc/*`·`src/index.js`(/images)를 크게 건드림.
- **위 파일은 ABCD 전용으로 간주.** 다른 파일 건드릴 일 생기면 충돌 확인.
- 별도 **git worktree**에서 작업 권장(같은 폴더 동시편집 방지). 푸시 전 `git fetch upstream && rebase`.
- 이 핸드오프 시점 미커밋 변경: `src/ugc/ugcVideo.service.js`(editableScenes versions clipUrl), `public/js/ugcPlayer.js`(신규), 이 문서. `git status`로 확인 후 이어받기.

## 7. 남은 근본(별개, ABCD 밖)
- **오브젝트 스토리지**(tmp/images 비영속=서버 재시작 시 클립 소실→재생기도 못 틈). ABCD 후 별도 진행해야 재시작에도 안정. [[doppia_media_storage_bug]].
