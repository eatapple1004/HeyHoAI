/**
 * profiles/index.js — outputType 프로파일 레지스트리
 * ============================================================================
 * 브레인(ugcScript)을 포맷 무관 크리에이티브 디렉터로 일반화. 각 프로파일은
 * { sceneTypes, systemGuide, renderMap, aspect, defaultDurationSec }를 정의하고,
 * 빌더는 systemGuide를 시스템 프롬프트에 주입, 파이프라인은 renderMap으로 씬을 라우팅한다.
 */
const PROFILES = {
  'product-ad': require('./product-ad'),
  'model-editorial': require('./model-editorial'),
  'ugc-talking': require('./ugc-talking'),
  // 'product-editorial', 'lookbook' — 후속(스텁)
};

const DEFAULT_OUTPUT_TYPE = 'product-ad';

/** outputType → 프로파일. 미지정/미지원이면 기본(product-ad). */
function getProfile(outputType) {
  return PROFILES[outputType] || PROFILES[DEFAULT_OUTPUT_TYPE];
}

/** 등록된 outputType 목록 */
function listOutputTypes() {
  return Object.keys(PROFILES);
}

module.exports = { getProfile, listOutputTypes, DEFAULT_OUTPUT_TYPE, PROFILES };
