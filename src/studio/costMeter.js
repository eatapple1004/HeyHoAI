/**
 * costMeter — 생성당 원가 로깅 / 마진 계산 (순수 모듈, DB·네트워크 의존 없음)
 *
 * 목적: 각 render_job이 실제로 얼마의 프로바이더 원가를 썼고, 우리가 받은 크레딧
 *       매출 대비 마진이 얼마인지 기록한다. → "어떤 SKU(템플릿/애드온)가 적자인지"
 *       출시 전부터 데이터로 파악하기 위함.
 *
 * 엔진(src/images,videos,generate)은 건드리지 않는다. studio 오케스트레이터가
 * 생성 직후 meterGeneration()을 호출해 cost 레코드를 만들고 logCost()로 적재한다.
 *
 * 원가 기준(docs/가격_재설계.md, 2026-06 실단가 검증): 이미지 4장 ≈ $0.156($0.039/장),
 * 릴스 5초 ≈ $0.25(Runway gen4_turbo, 5cr/초×$0.01). ⚠️ Kling v3 1080p는 $0.63/5초로 Runway 2.5배 → 기본 미사용.
 */

// 프로바이더별 단위 원가(USD) — 2026-06 공식 단가 검증치
const PROVIDER_COSTS = {
  image: { 'nano-banana': 0.039, flux: 0.04, replicate: 0.04, fal: 0.03 }, // 장당
  reel:  { runway: 0.25, minimax: 0.22, kling: 0.63 },                     // 5초 1편당 (runway 기본, kling 고가)
  upscale: { hd: 0.01, '4k': 0.03 },                                        // 장당 업스케일 가산
  caption: { claude: 0.003 },                                               // 캡션 1세트(Claude)
  lipsync: { default: 0.12 },                                               // UGC 립싱크+TTS 가산(영상 1편)
};

// 1 크레딧의 매출가치(USD) — billing top-up 기준가($0.10/credit)
const CREDIT_USD = 0.10;

const round = (n) => Math.round(n * 1e4) / 1e4;

/**
 * 실제 프로바이더 원가(USD) 추정.
 * @param {object} job
 * @param {'image'|'reel'} job.outputType
 * @param {number} [job.count]      이미지 장수(기본 4) / 릴스 1
 * @param {string} [job.provider]   프로바이더 id
 * @param {'std'|'hd'|'4k'} [job.quality]
 * @param {number} [job.variants]   A/B 변형 수(기본 1)
 * @param {boolean} [job.caption]   캡션 번들 여부
 * @param {boolean} [job.ugc]       UGC 광고(립싱크) 여부
 */
function estimateJobCost(job) {
  const {
    outputType,
    count = outputType === 'reel' ? 1 : 4,
    provider,
    quality = 'std',
    variants = 1,
    caption = false,
    ugc = false,
  } = job;

  const unit = outputType === 'reel'
    ? (PROVIDER_COSTS.reel[provider] ?? PROVIDER_COSTS.reel.runway)
    : (PROVIDER_COSTS.image[provider] ?? PROVIDER_COSTS.image['nano-banana']);

  let perRender = unit * count;
  if (quality !== 'std') {
    perRender += (PROVIDER_COSTS.upscale[quality] || 0) * (outputType === 'reel' ? 1 : count);
  }
  if (ugc && outputType === 'reel') perRender += PROVIDER_COSTS.lipsync.default;

  let total = perRender * variants;
  if (caption) total += PROVIDER_COSTS.caption.claude * variants;
  return round(total);
}

function creditValueUsd(credits) {
  return round(credits * CREDIT_USD);
}

/** 매출(크레딧가치) vs 원가 → 마진 */
function computeMargin({ creditsCharged, actualCostUsd }) {
  const revenueUsd = creditValueUsd(creditsCharged);
  const marginUsd = round(revenueUsd - actualCostUsd);
  const marginPct = revenueUsd > 0 ? Math.round((marginUsd / revenueUsd) * 100) : 0;
  return { revenueUsd, costUsd: round(actualCostUsd), marginUsd, marginPct };
}

/**
 * 생성 1건의 원가 레코드 생성 — generation_costs 테이블에 적재할 형태.
 * studio.service가 크레딧 차감 직후 호출.
 */
function meterGeneration({ userId, renderJobId, recipeId, creditsCharged, ...jobSpec }) {
  const actualCostUsd = estimateJobCost(jobSpec);
  const margin = computeMargin({ creditsCharged, actualCostUsd });
  return {
    user_id: userId,
    render_job_id: renderJobId,
    recipe_id: recipeId,
    output_type: jobSpec.outputType,
    provider: jobSpec.provider || null,
    quality: jobSpec.quality || 'std',
    variants: jobSpec.variants || 1,
    credits_charged: creditsCharged,
    actual_cost_usd: actualCostUsd,
    revenue_usd: margin.revenueUsd,
    margin_usd: margin.marginUsd,
    margin_pct: margin.marginPct,
    is_loss: margin.marginUsd < 0,
  };
}

// migrate.js에 추가할 테이블 (DB 연결 시):
const GENERATION_COSTS_SQL = `
CREATE TABLE IF NOT EXISTS generation_costs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  render_job_id   UUID REFERENCES render_jobs(id),
  recipe_id       UUID REFERENCES recipes(id),
  output_type     VARCHAR(20) NOT NULL,
  provider        VARCHAR(40),
  quality         VARCHAR(10) NOT NULL DEFAULT 'std',
  variants        INT NOT NULL DEFAULT 1,
  credits_charged INT NOT NULL,
  actual_cost_usd NUMERIC(10,4) NOT NULL,
  revenue_usd     NUMERIC(10,4) NOT NULL,
  margin_usd      NUMERIC(10,4) NOT NULL,
  margin_pct      INT NOT NULL,
  is_loss         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gen_costs_recipe ON generation_costs(recipe_id);
CREATE INDEX IF NOT EXISTS idx_gen_costs_loss ON generation_costs(is_loss) WHERE is_loss = true;`;

/** DB 연결 시 적재(파라미터라이즈드 INSERT). db = pg client/pool. */
async function logCost(db, record) {
  const q = `INSERT INTO generation_costs
    (user_id,render_job_id,recipe_id,output_type,provider,quality,variants,
     credits_charged,actual_cost_usd,revenue_usd,margin_usd,margin_pct,is_loss)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`;
  const r = record;
  const { rows } = await db.query(q, [
    r.user_id, r.render_job_id, r.recipe_id, r.output_type, r.provider, r.quality,
    r.variants, r.credits_charged, r.actual_cost_usd, r.revenue_usd, r.margin_usd,
    r.margin_pct, r.is_loss,
  ]);
  return rows[0].id;
}

module.exports = {
  PROVIDER_COSTS,
  CREDIT_USD,
  estimateJobCost,
  creditValueUsd,
  computeMargin,
  meterGeneration,
  logCost,
  GENERATION_COSTS_SQL,
};
