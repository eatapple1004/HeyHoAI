require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  // Claude 모델 — 역할별 지정(B안). base=정형작업(캡션·캐릭터), 나머지 둘은 품질 우선 override.
  //   미설정 시 base=sonnet-5, 대본·enhance=opus-4-8. 통일하려면 세 값을 같게 설정.
  CLAUDE_MODEL: z.string().default('claude-sonnet-5'),          // 캡션·캐릭터(정형)
  CLAUDE_MODEL_SCRIPT: z.string().default('claude-opus-4-8'),   // 대본생성(ugc) — 템플릿 저작 수준
  CLAUDE_MODEL_ENHANCE: z.string().default('claude-opus-4-8'),  // 프롬프트 Enhance — 결과 이미지 품질 직결
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Auth (JWT + 쿠키 기반 세션)
  JWT_SECRET: z.string().min(16, 'JWT_SECRET is required (16자 이상)'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ADMIN_EMAIL: z.string().email().default('admin@heyhoai.local'),
  // 기본값 없음(필수) + 알려진 약한 기본 비번 거부 — 미설정/약한 값이면 부팅 실패(fail-closed)
  ADMIN_PASSWORD: z
    .string()
    .min(12, 'ADMIN_PASSWORD는 12자 이상이어야 합니다')
    .refine((v) => v !== 'changeme1234', 'ADMIN_PASSWORD를 기본값에서 반드시 변경하세요'),
  // z.coerce.boolean()은 "false" 문자열도 true로 바꾸므로 명시적으로 비교한다
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'), // 프로덕션 HTTPS 환경에서 true

  // 마켓 유료 과금 게이트 — 점화 전엔 false(유저가 만든 유료 템플릿이 실제 크레딧을 돌리지 않게).
  // false면 비공식(유저) 유료 템플릿의 acquire 언락·사용당 로열티가 무료/미과금 처리됨.
  // 공식 시드(is_official)는 이 게이트와 무관하게 항상 라이브 유료(배포 즉시 유료 의도 보존).
  MARKETPLACE_PAID: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  // 외부 공개 주소 (도메인). 인스타 발행 시 미디어 URL·발행 링크 등에 사용.
  // 예: https://doppia.ai — 미설정 시 폴백 IP 사용
  PUBLIC_URL: z.string().url().optional(),

  // ── 미디어 오브젝트 스토리지 (S3 호환 — AWS S3 / Cloudflare R2) ──
  // 신규 영상/이미지를 로컬 tmp/images(비영속)뿐 아니라 영속 스토리지에도 저장해 재배포·메모리킬 시 404 방지.
  // MEDIA_S3_BUCKET 미설정 시 전부 로컬 동작(현행 무변경) — 로컬 개발/미설정 prod에 영향 없음.
  MEDIA_S3_BUCKET: z.string().optional(),                    // 설정 시 원격 활성화 스위치
  MEDIA_S3_REGION: z.string().default('ap-northeast-2'),     // EC2와 동일 리전 권장(서울)
  MEDIA_S3_ENDPOINT: z.string().url().optional(),            // R2 등 S3 호환 커스텀 엔드포인트. 순정 S3면 미설정.
  MEDIA_S3_PUBLIC_BASE: z.string().url().optional(),         // 공개 CDN/버킷 URL base(예: https://cdn.doppia.ai). 없으면 로컬 폴백만.
  MEDIA_S3_PREFIX: z.string().default('images'),             // 버킷 내 키 접두사
  // 자격증명은 표준 AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY 또는 EC2 인스턴스 프로파일(IAM Role)에서 자동 해석.

  // Google OAuth (소셜 로그인) — 미설정 시 비활성. 콘솔에서 OAuth 클라이언트 생성 후 입력.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // redirect_uri 미지정 시 PUBLIC_URL(또는 요청 host) + /api/auth/google/callback 사용
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

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
  LS_VARIANT_PACK120: z.string().optional(),
  LS_VARIANT_PACK300: z.string().optional(),
  LS_VARIANT_PACK700: z.string().optional(),

  // Billing (Eximbay — 해외/국내 카드 PG)
  EXIMBAY_API_KEY: z.string().optional(),        // Basic 인증용 API 키
  EXIMBAY_MID: z.string().optional(),            // 가맹점 ID
  EXIMBAY_ENV: z.enum(['test', 'production']).default('test'),
});

const env = envSchema.parse(process.env);

module.exports = { env };
