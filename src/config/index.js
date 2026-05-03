require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-20250514'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

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

  // Publishing (Zernio)
  ZERNIO_API_KEY: z.string().optional(),
});

const env = envSchema.parse(process.env);

module.exports = { env };
