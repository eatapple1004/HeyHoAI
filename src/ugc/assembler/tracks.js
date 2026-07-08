/**
 * assembler/tracks.js — 트랙 렌더러 인터페이스 + 미배선 슬롯 스텁
 * ============================================================================
 * 조립기는 "트랙 렌더러"들의 집합이다. v1은 video·subtitle 렌더러만 구현하고,
 * music·vo·presenter 는 인터페이스만 정의해 둔다. v2~v4는 여기에 렌더러를
 * 등록(register)하는 것으로 끝나고, ffmpeg.assembler 의 합성 루프는 바뀌지 않는다.
 *
 * 렌더러 계약:
 *   supports(plan) → boolean            // 이 트랙을 처리할 수 있는가
 *   async prepare(plan, ctx) → asset    // ffmpeg 입력/필터에 쓸 산출물(파일 경로 등)
 *
 * ctx = { workDir, targetW, targetH, fps, log }
 */

/** 아직 미배선인 트랙(후속 버전에서 렌더러 등록). */
const PENDING = {
  music: {
    track: 'music',
    version: 'v2',
    note: '배경음. musicVibe → 라이브러리/생성 트랙 선택 후 오디오 트랙으로 믹스.',
    prepare() { throw new Error('music track renderer not wired (v2)'); },
  },
  vo: {
    track: 'vo',
    version: 'v3',
    note: '더빙(ElevenLabs TTS). spoken/onScreenText → 오디오 트랙.',
    prepare() { throw new Error('vo track renderer not wired (v3)'); },
  },
  presenter: {
    track: 'presenter',
    version: 'v4',
    note: '토킹 아바타(HeyGen/Captions/Arcads). spoken 씬 → 립싱크 영상 트랙.',
    prepare() { throw new Error('presenter track renderer not wired (v4)'); },
  },
};

module.exports = { PENDING };
