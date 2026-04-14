/**
 * @typedef {Object} ImageGenerationRequest
 * @property {string} prompt
 * @property {string} negativePrompt
 * @property {number} width
 * @property {number} height
 * @property {string} [style]       - provider-specific style preset
 * @property {number} [seed]        - 재현성을 위한 시드
 */

/**
 * @typedef {Object} ImageGenerationResult
 * @property {string} url           - 생성된 이미지 URL
 * @property {number} [seed]        - 사용된 시드 값
 * @property {string} providerJobId - provider 측 job ID
 * @property {Object} metadata      - provider별 추가 메타데이터
 */

/**
 * @typedef {Object} ImageProvider
 * @property {string} name
 * @property {(req: ImageGenerationRequest) => Promise<ImageGenerationResult>} generate
 */

module.exports = {};
