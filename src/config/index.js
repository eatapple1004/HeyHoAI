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

  // 영상 잡 폴러 비활성(로컬 개발용). 로컬 :3001이 prod DB에 붙으면 폴러가 prod 잡을 이중 폴링
  //   → 중복 finalize·attempts 부풀림(폴러 겹침). 로컬 프로세스만 DISABLE_VIDEO_POLLER=true로 폴러만 끔.
  //   기본 false(폴러 실행) → prod 무변경, 단일 폴러 유지.
  DISABLE_VIDEO_POLLER: z
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

  // On Model faceswap(stage-2) — facefusion 워커 설정. 미설정 시 홈디렉터리 ~/facefusion·CPU 기본.
  //   설계: docs/onmodel_faceswap_설계_2026-07-18.md. 워커=node src/workers/faceswapWorker.js.
  FACEFUSION_DIR: z.string().optional(),                     // facefusion 설치 경로(기본 ~/facefusion)
  FACEFUSION_PYTHON: z.string().optional(),                  // venv python(기본 <dir>/venv/bin/python)
  FACEFUSION_MODEL: z.string().default('inswapper_128'),     // face_swapper 모델
  FACEFUSION_PROVIDERS: z.string().default('cpu'),           // execution providers(cpu / coreml / cuda, 콤마구분)
  FACEFUSION_TIMEOUT_MS: z.coerce.number().default(120000),  // 이미지당 하드 타임아웃(좀비 방지)
  FACEFUSION_CONCURRENCY: z.coerce.number().default(1),      // 동시 facefusion 캡
  FACESWAP_POLL_MS: z.coerce.number().default(5000),         // 워커 큐 폴링 유휴 간격

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

  // OpenAI (GPT Image + TTS 폴백)
  OPENAI_API_KEY: z.string().optional(),

  // ElevenLabs (UGC 오디오 — TTS 음성 + Music v2 배경음악, 한 키로 둘 다).
  //   ELEVENLABS_API_KEY 설정 시 TTS는 ElevenLabs 우선(미설정이면 OpenAI TTS 폴백), 음악은 ElevenLabs Music.
  //   미설정 시 음성=OpenAI 폴백·음악=스킵(무음/무음악, 현행 무변경).
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().default('n2fbxG88jqAoaVPUy3IG'), // 기본=Yooni(한국어 원어민, clear&calm, 라이브러리 최다사용). 영상별로 스튜디오서 override.
  ELEVENLABS_TTS_MODEL: z.string().default('eleven_multilingual_v2'), // 한국어 포함 다국어
  ELEVENLABS_MUSIC_MODEL: z.string().default('music_v2'),            // music_v1 | music_v2(라이선스 클리어)

  // UGC 자막 번인 폰트(libass). 한글 글리프 있는 폰트여야 함(없으면 □□□ 두부박스).
  //   서버에 fonts-noto-cjk 설치 필요. 폰트 패밀리명이 다르면 이 값으로 override.
  UGC_SUBTITLE_FONT: z.string().default('Noto Sans CJK KR'),

  // UGC 자막(캡션) 기능 게이트. 첫 출시 스코프 컷으로 기본 OFF(제품에 자막 안 나옴).
  //   OFF면 assembler가 자막 번인을 건너뜀(base=최종) + 스튜디오가 오버레이·타임라인·스타일행 숨김.
  //   음성(TTS)·음악·retimeByVoice·클립 생성은 무영향. 재활성 = UGC_CAPTIONS_ENABLED=true.
  //   z.coerce.boolean()은 "false"도 true로 바꾸므로 명시 비교(위 부울 env와 동일 패턴).
  UGC_CAPTIONS_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

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
