/**
 * ─── Video Provider Interface ───
 *
 * 모든 영상 생성 provider는 이 인터페이스를 구현해야 한다.
 * Image-to-Video 방식: master image를 입력받아 모션을 부여한다.
 */

/**
 * @typedef {'slow_motion' | 'natural' | 'dynamic' | 'cinematic' | 'loop'} VideoStyle
 */

/**
 * @typedef {Object} VideoGenerationRequest
 * @property {string} sourceImageUrl    - 원본 이미지 URL (master image)
 * @property {string} motionPrompt      - 모션 설명 (예: "hair blowing in wind, subtle smile")
 * @property {string} negativePrompt    - 금지 모션 설명
 * @property {number} durationSec       - 영상 길이 (초): 3 | 5 | 10
 * @property {number} width             - 가로 해상도
 * @property {number} height            - 세로 해상도
 * @property {VideoStyle} style         - 영상 스타일
 * @property {number} [seed]            - 재현용 시드
 */

/**
 * @typedef {Object} VideoSubmitResult
 * @property {string} providerJobId     - provider 측 비동기 job ID
 */

/**
 * @typedef {'queued' | 'processing' | 'completed' | 'failed'} ProviderJobStatus
 */

/**
 * @typedef {Object} VideoPollResult
 * @property {ProviderJobStatus} status
 * @property {string} [videoUrl]        - 완료 시 결과 URL
 * @property {number} [durationMs]      - 실제 영상 길이 (ms)
 * @property {string} [error]           - 실패 시 에러 메시지
 * @property {Object} [metadata]        - provider별 추가 정보
 */

/**
 * @typedef {Object} VideoProvider
 * @property {string} name
 * @property {number} maxDurationSec                           - 지원 최대 길이
 * @property {(req: VideoGenerationRequest) => Promise<VideoSubmitResult>} submit
 * @property {(providerJobId: string) => Promise<VideoPollResult>} poll
 */

module.exports = {};
