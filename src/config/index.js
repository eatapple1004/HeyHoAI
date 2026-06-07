require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-20250514'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Auth (JWT + 쿠키 기반 세션)
  JWT_SECRET: z.string().min(16, 'JWT_SECRET is required (16자 이상)'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ADMIN_EMAIL: z.string().email().default('admin@heyhoai.local'),
  ADMIN_PASSWORD: z.string().min(8).default('changeme1234'),
  // z.coerce.boolean()은 "false" 문자열도 true로 바꾸므로 명시적으로 비교한다
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'), // 프로덕션 HTTPS 환경에서 true

  // Image providers (최소 하나는 필요)
  REPLICATE_API_TOKEN: z.string().optional(),
  REPLICATE_MODEL: z.string().default('black-forest-labs/flux-1.1-pro'),
  FAL_API_KEY: z.string().optional(),
  FAL_MODEL: z.string().default('fal-ai/flux/dev'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_IMAGE_MODEL: z.string().default('gemini-2.5-flash-image'),

  // Video providers (최소 하나는 필요)
  RUNWAY_API_KEY: z.string().optional(),
  RUNWAY_MODEL: z.string().default('gen4_turbo'),
  KLING_ACCESS_KEY: z.string().optional(),
  KLING_SECRET_KEY: z.string().optional(),
  KLING_MODEL: z.string().default('kling-v3'),
  MINIMAX_API_KEY: z.string().optional(),
  MINIMAX_MODEL: z.string().default('video-01'),

  // OpenAI (GPT Image)
  OPENAI_API_KEY: z.string().optional(),

  // Publishing (Zernio)
  ZERNIO_API_KEY: z.string().optional(),

  // Billing (Lemon Squeezy — 크레딧 팩 결제)
  LEMONSQUEEZY_API_KEY: z.string().optional(),
  LEMONSQUEEZY_STORE_ID: z.string().optional(),
  LEMONSQUEEZY_WEBHOOK_SECRET: z.string().optional(),
  LS_VARIANT_PACK50: z.string().optional(),
  LS_VARIANT_PACK220: z.string().optional(),
  LS_VARIANT_PACK580: z.string().optional(),
});

const env = envSchema.parse(process.env);

module.exports = { env };
