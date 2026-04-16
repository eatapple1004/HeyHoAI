const { query } = require('../db/client');

async function findAll() {
  const result = await query(
    'SELECT * FROM style_presets WHERE is_active = true ORDER BY sort_order'
  );
  return result.rows;
}

async function findByName(name) {
  const result = await query('SELECT * FROM style_presets WHERE name = $1', [name]);
  return result.rows[0] || null;
}

async function findByIdx(idx) {
  const result = await query('SELECT * FROM style_presets WHERE idx = $1', [idx]);
  return result.rows[0] || null;
}

/**
 * 스타일을 적용하여 최종 프롬프트를 조립한다.
 * @param {string} styleName - 스타일 이름 (없으면 원본 그대로)
 * @param {string} userPrompt - 사용자 프롬프트
 * @returns {Promise<{ prompt: string; negativePrompt: string; styleName: string }>}
 */
async function applyStyle(styleName, userPrompt) {
  if (!styleName || styleName === 'none') {
    return { prompt: userPrompt, negativePrompt: '', styleName: 'none' };
  }

  const style = await findByName(styleName);
  if (!style) {
    return { prompt: userPrompt, negativePrompt: '', styleName: 'none' };
  }

  const prompt = `${style.prefix} ${userPrompt}, ${style.suffix}`;
  return {
    prompt,
    negativePrompt: style.negative_prompt || '',
    styleName: style.name,
  };
}

module.exports = { findAll, findByName, findByIdx, applyStyle };
