const { pool } = require('./client');
const { env } = require('../config');
const { hashPassword } = require('../auth/password');

const CREATE_CHARACTERS_TABLE = `
CREATE TABLE IF NOT EXISTS characters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    concept         VARCHAR(200) NOT NULL,
    persona         JSONB NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_characters_status ON characters(status);
`;

const CREATE_GENERATION_JOBS_TABLE = `
CREATE TABLE IF NOT EXISTS generation_jobs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id     UUID NOT NULL REFERENCES characters(id),
    provider         VARCHAR(50) NOT NULL,
    candidate_count  INT NOT NULL,
    master_image_id  UUID,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending',
    error            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gen_jobs_character ON generation_jobs(character_id);
CREATE INDEX IF NOT EXISTS idx_gen_jobs_status ON generation_jobs(status);
`;

const CREATE_IMAGE_ASSETS_TABLE = `
CREATE TABLE IF NOT EXISTS image_assets (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id     UUID NOT NULL REFERENCES characters(id),
    job_id           UUID NOT NULL REFERENCES generation_jobs(id),
    prompt           TEXT NOT NULL,
    negative_prompt  TEXT NOT NULL,
    provider         VARCHAR(50) NOT NULL,
    provider_job_id  VARCHAR(200),
    image_url        TEXT NOT NULL,
    width            INT NOT NULL,
    height           INT NOT NULL,
    seed             BIGINT,
    variation_label  VARCHAR(50) NOT NULL,
    metadata         JSONB DEFAULT '{}',
    status           VARCHAR(20) NOT NULL DEFAULT 'candidate',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_image_assets_character ON image_assets(character_id);
CREATE INDEX IF NOT EXISTS idx_image_assets_job ON image_assets(job_id);
CREATE INDEX IF NOT EXISTS idx_image_assets_status ON image_assets(status);
`;

const CREATE_VIDEO_GENERATION_JOBS_TABLE = `
CREATE TABLE IF NOT EXISTS video_generation_jobs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id     UUID NOT NULL REFERENCES characters(id),
    source_image_id  UUID NOT NULL REFERENCES image_assets(id),
    provider         VARCHAR(50) NOT NULL,
    provider_job_id  VARCHAR(200),
    video_style      VARCHAR(30) NOT NULL,
    motion_prompt    TEXT NOT NULL,
    video_asset_id   UUID,
    attempt          INT NOT NULL DEFAULT 0,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending',
    error            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_video_gen_jobs_character ON video_generation_jobs(character_id);
CREATE INDEX IF NOT EXISTS idx_video_gen_jobs_status ON video_generation_jobs(status);
`;

const CREATE_VIDEO_ASSETS_TABLE = `
CREATE TABLE IF NOT EXISTS video_assets (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id     UUID NOT NULL REFERENCES characters(id),
    job_id           UUID NOT NULL REFERENCES video_generation_jobs(id),
    source_image_id  UUID NOT NULL REFERENCES image_assets(id),
    motion_prompt    TEXT NOT NULL,
    negative_prompt  TEXT NOT NULL,
    provider         VARCHAR(50) NOT NULL,
    provider_job_id  VARCHAR(200),
    video_url        TEXT NOT NULL,
    width            INT NOT NULL,
    height           INT NOT NULL,
    duration_ms      INT NOT NULL,
    video_style      VARCHAR(30) NOT NULL,
    metadata         JSONB DEFAULT '{}',
    status           VARCHAR(20) NOT NULL DEFAULT 'ready',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_assets_character ON video_assets(character_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_job ON video_assets(job_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_status ON video_assets(status);
`;

const CREATE_CONTENTS_TABLE = `
CREATE TABLE IF NOT EXISTS contents (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id     UUID NOT NULL REFERENCES characters(id),
    media_type       VARCHAR(20) NOT NULL,
    media_asset_ids  UUID[] NOT NULL,
    caption          TEXT NOT NULL,
    hashtags         TEXT[] NOT NULL DEFAULT '{}',
    call_to_action   TEXT DEFAULT '',
    alt_text         TEXT DEFAULT '',
    media_context    TEXT NOT NULL,
    scheduled_at     TIMESTAMPTZ,
    status           VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contents_character ON contents(character_id);
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_contents_scheduled ON contents(scheduled_at)
  WHERE status = 'scheduled';
`;

const CREATE_PUBLISH_JOBS_TABLE = `
CREATE TABLE IF NOT EXISTS publish_jobs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id       UUID NOT NULL REFERENCES contents(id),
    character_id     UUID NOT NULL REFERENCES characters(id),
    scheduled_at     TIMESTAMPTZ,
    attempt          INT NOT NULL DEFAULT 0,
    ig_media_id      VARCHAR(200),
    ig_permalink     VARCHAR(500),
    status           VARCHAR(20) NOT NULL DEFAULT 'pending',
    error            TEXT,
    published_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_publish_jobs_content ON publish_jobs(content_id);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_character ON publish_jobs(character_id);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_status ON publish_jobs(status);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_pending ON publish_jobs(scheduled_at)
  WHERE status = 'pending';
`;

// ─── Visual Attributes (이미지 생성 구체화용 7개 요소) ───

const CREATE_VISUAL_ATTRIBUTE_CATEGORIES_TABLE = `
CREATE TABLE IF NOT EXISTS visual_attribute_categories (
    id          VARCHAR(30) PRIMARY KEY,
    name_ko     VARCHAR(50) NOT NULL,
    name_en     VARCHAR(50) NOT NULL,
    description TEXT,
    sort_order  INT NOT NULL DEFAULT 0
);
`;

const CREATE_VISUAL_ATTRIBUTES_TABLE = `
CREATE TABLE IF NOT EXISTS visual_attributes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id   VARCHAR(30) NOT NULL REFERENCES visual_attribute_categories(id),
    key           VARCHAR(100) NOT NULL,
    value         TEXT NOT NULL,
    prompt_fragment TEXT NOT NULL,
    tags          TEXT[] DEFAULT '{}',
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(category_id, key)
);

CREATE INDEX IF NOT EXISTS idx_visual_attrs_category ON visual_attributes(category_id);
CREATE INDEX IF NOT EXISTS idx_visual_attrs_tags ON visual_attributes USING GIN(tags);
`;

const CREATE_CHARACTER_VISUAL_PRESETS_TABLE = `
CREATE TABLE IF NOT EXISTS character_visual_presets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id    UUID NOT NULL REFERENCES characters(id),
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    attribute_ids   UUID[] NOT NULL,
    compiled_prompt TEXT,
    is_default      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visual_presets_character ON character_visual_presets(character_id);
`;

// ─── 시드 데이터 ───

const SEED_CATEGORIES = `
INSERT INTO visual_attribute_categories (id, name_ko, name_en, description, sort_order)
VALUES
  ('geometry',    '얼굴 구조',    'Geometry',    '얼굴형, 이목구비 배치, 비율, 체형 등 구조적 특징', 1),
  ('lighting',    '조명',         'Lighting',    '광원 방향, 강도, 색온도, 그림자 패턴',           2),
  ('color',       '색채',         'Color',       '색 팔레트, 채도, 톤 매핑, 컬러 그레이딩',        3),
  ('composition', '구도',         'Composition', '프레이밍, 카메라 앵글, 거리, 레이아웃',          4),
  ('psychology',  '인지/감정',     'Psychology',  '표정, 시선, 분위기, 감정 전달',                 5),
  ('texture',     '디테일/주파수', 'Texture',     '피부 질감, 재질, 노이즈, 선명도',               6),
  ('context',     '배경/상황',    'Context',     '장소, 시간대, 계절, 소품, 환경 요소',            7)
ON CONFLICT (id) DO NOTHING;
`;

const SEED_ATTRIBUTES = `
INSERT INTO visual_attributes (category_id, key, value, prompt_fragment, tags) VALUES
  -- Geometry (얼굴 구조)
  ('geometry', 'face_oval',         '타원형 얼굴',          'oval face shape, balanced proportions',                              '{"face","shape"}'),
  ('geometry', 'face_round',        '둥근 얼굴',            'round face shape, soft jawline',                                     '{"face","shape"}'),
  ('geometry', 'face_vline',        'V라인 얼굴',           'V-line face shape, slim jawline, pointed chin',                       '{"face","shape"}'),
  ('geometry', 'face_heart',        '하트형 얼굴',          'heart-shaped face, wide forehead, narrow chin',                       '{"face","shape"}'),
  ('geometry', 'eyes_large',        '큰 눈',               'large expressive eyes',                                               '{"eyes","size"}'),
  ('geometry', 'eyes_monolid',      '무쌍꺼풀',             'monolid eyes, smooth eyelid',                                         '{"eyes","type"}'),
  ('geometry', 'eyes_double',       '쌍꺼풀',              'double eyelid, defined crease',                                        '{"eyes","type"}'),
  ('geometry', 'nose_small',        '작은 코',              'small delicate nose, refined bridge',                                  '{"nose"}'),
  ('geometry', 'nose_high',         '높은 콧대',            'high nose bridge, defined profile',                                    '{"nose"}'),
  ('geometry', 'lips_full',         '도톰한 입술',           'full plump lips, well-defined cupid bow',                              '{"lips"}'),
  ('geometry', 'lips_thin',         '얇은 입술',            'thin natural lips, subtle lip line',                                   '{"lips"}'),
  ('geometry', 'body_slim',         '슬림 체형',            'slim body type, slender frame',                                        '{"body"}'),
  ('geometry', 'body_athletic',     '운동형 체형',           'athletic body type, toned physique',                                   '{"body"}'),
  ('geometry', 'body_curvy',        '곡선형 체형',           'curvy body type, balanced natural proportions',                        '{"body"}'),

  -- Lighting (조명)
  ('lighting', 'natural_soft',      '자연광 소프트',         'soft natural lighting, diffused daylight',                             '{"natural","soft"}'),
  ('lighting', 'golden_hour',       '골든아워',             'golden hour lighting, warm orange sunlight, long shadows',              '{"natural","warm"}'),
  ('lighting', 'blue_hour',         '블루아워',             'blue hour lighting, cool ambient twilight',                             '{"natural","cool"}'),
  ('lighting', 'studio_soft',       '스튜디오 소프트박스',    'soft studio lighting, diffused softbox, even illumination',             '{"studio","soft"}'),
  ('lighting', 'studio_rembrandt',  '렘브란트 조명',         'Rembrandt lighting, triangle shadow on cheek, dramatic mood',          '{"studio","dramatic"}'),
  ('lighting', 'ring_light',        '링라이트',             'ring light, even facial illumination, circular catchlight in eyes',     '{"studio","beauty"}'),
  ('lighting', 'flash_harsh',       '직접 플래시',           'direct flash, harsh lighting, strong shadows, overexposed highlights', '{"flash","harsh"}'),
  ('lighting', 'neon_ambient',      '네온 앰비언트',         'neon ambient lighting, colorful reflections, urban night mood',        '{"artificial","night"}'),
  ('lighting', 'backlit',           '역광',                'backlit silhouette, rim lighting, glowing edges',                       '{"dramatic","backlit"}'),
  ('lighting', 'overcast',          '흐린 날',              'overcast sky lighting, flat even light, no harsh shadows',              '{"natural","flat"}'),

  -- Color (색채)
  ('color', 'warm_tone',            '웜톤',                'warm color grading, amber and golden tones',                            '{"warm","tone"}'),
  ('color', 'cool_tone',            '쿨톤',                'cool color grading, blue and teal tones',                               '{"cool","tone"}'),
  ('color', 'neutral_tone',         '뉴트럴톤',             'neutral balanced color palette, true to life colors',                   '{"neutral","tone"}'),
  ('color', 'pastel',               '파스텔',               'soft pastel color palette, muted desaturated tones',                    '{"soft","pastel"}'),
  ('color', 'vibrant',              '비비드',               'vibrant saturated colors, high color intensity',                        '{"vivid","saturated"}'),
  ('color', 'monochrome',           '모노크롬',             'monochromatic color scheme, single hue variations',                     '{"mono","minimal"}'),
  ('color', 'film_kodak',           '코닥 필름',            'Kodak Portra 400 film emulation, warm skin tones, soft grain',          '{"film","analog"}'),
  ('color', 'film_fuji',            '후지 필름',            'Fujifilm Superia look, slightly cool greens, warm highlights',          '{"film","analog"}'),
  ('color', 'cinematic_teal_orange','시네마틱 틸오렌지',      'cinematic teal and orange color grading, Hollywood look',               '{"cinematic","grading"}'),

  -- Composition (구도)
  ('composition', 'closeup',        '클로즈업',             'close-up shot, face fills frame, intimate framing',                     '{"distance","close"}'),
  ('composition', 'medium_shot',    '미디엄샷',             'medium shot, waist up, balanced framing',                               '{"distance","medium"}'),
  ('composition', 'full_body',      '풀바디',               'full body shot, head to toe visible, environmental context',             '{"distance","full"}'),
  ('composition', 'rule_of_thirds', '삼분할 구도',           'rule of thirds composition, subject off-center',                        '{"rule","classic"}'),
  ('composition', 'center_frame',   '중앙 구도',            'center framed composition, symmetrical balance',                        '{"center","symmetry"}'),
  ('composition', 'low_angle',      '로우앵글',             'low angle shot, looking up at subject, empowering perspective',          '{"angle","low"}'),
  ('composition', 'high_angle',     '하이앵글',             'high angle shot, looking down at subject, soft vulnerable feel',         '{"angle","high"}'),
  ('composition', 'eye_level',      '아이레벨',             'eye level shot, natural perspective, direct engagement',                 '{"angle","eye"}'),
  ('composition', 'over_shoulder',  '오버숄더',             'over the shoulder composition, depth and context',                       '{"angle","ots"}'),
  ('composition', 'mirror_selfie',  '거울 셀피',            'mirror selfie composition, phone visible, reflection framing',           '{"selfie","mirror"}'),

  -- Psychology (인지/감정)
  ('psychology', 'confident',       '자신감',               'confident expression, strong eye contact, empowered posture',            '{"confident","strong"}'),
  ('psychology', 'warm_friendly',   '따뜻하고 친근',         'warm friendly smile, approachable expression, relaxed demeanor',         '{"warm","friendly"}'),
  ('psychology', 'mysterious',      '미스터리한',            'mysterious expression, subtle enigmatic smile, alluring gaze',            '{"mysterious","cool"}'),
  ('psychology', 'playful',         '발랄한',               'playful expression, bright cheerful energy, dynamic pose',                '{"playful","fun"}'),
  ('psychology', 'contemplative',   '사색적인',             'contemplative mood, thoughtful gaze, introspective atmosphere',            '{"calm","thoughtful"}'),
  ('psychology', 'serene',          '평온한',               'serene peaceful expression, calm gentle presence, soft gaze',              '{"serene","peaceful"}'),
  ('psychology', 'bold',            '대담한',               'bold fierce expression, intense eye contact, powerful stance',              '{"bold","intense"}'),
  ('psychology', 'elegant',         '우아한',               'elegant sophisticated expression, poised graceful demeanor',               '{"elegant","classy"}'),

  -- Texture (디테일/주파수)
  ('texture', 'skin_natural',       '자연 피부',            'natural skin texture, visible pores, subtle imperfections, realistic',     '{"skin","natural"}'),
  ('texture', 'skin_smooth',        '매끈한 피부',           'smooth flawless skin, soft focus on skin, beauty retouch look',           '{"skin","smooth"}'),
  ('texture', 'skin_dewy',          '촉촉한 피부',           'dewy glowing skin, natural moisture, light reflecting off skin',          '{"skin","glow"}'),
  ('texture', 'detail_ultra',       '초고해상도 디테일',      'ultra sharp details, 8K resolution, every strand of hair visible',        '{"detail","sharp"}'),
  ('texture', 'detail_soft',        '소프트 디테일',         'slightly soft details, gentle diffusion, dreamy quality',                  '{"detail","soft"}'),
  ('texture', 'grain_film',         '필름 그레인',           'subtle film grain, analog texture, slight noise pattern',                  '{"grain","film"}'),
  ('texture', 'grain_none',         '노이즈 없음',           'clean noiseless image, smooth gradients, digital perfection',              '{"grain","clean"}'),
  ('texture', 'fabric_detail',      '옷감 디테일',           'detailed fabric texture, visible weave pattern, realistic material',       '{"fabric","detail"}'),

  -- Context (배경/상황)
  ('context', 'cafe_indoor',        '카페 실내',            'cozy indoor cafe setting, warm ambient lighting, coffee shop atmosphere',   '{"indoor","cafe"}'),
  ('context', 'street_urban',       '도심 거리',            'modern urban street, city buildings, metropolitan atmosphere',               '{"outdoor","urban"}'),
  ('context', 'studio_white',       '흰 배경 스튜디오',      'clean white studio background, professional photo studio setup',            '{"studio","minimal"}'),
  ('context', 'rooftop_sunset',     '루프탑 석양',           'rooftop terrace at sunset, city skyline in background, golden sky',         '{"outdoor","rooftop"}'),
  ('context', 'restaurant_night',   '레스토랑 야경',         'elegant restaurant interior at night, city night view through window',      '{"indoor","night"}'),
  ('context', 'park_nature',        '공원/자연',            'lush green park setting, natural foliage, dappled sunlight',                '{"outdoor","nature"}'),
  ('context', 'bedroom_morning',    '침실 아침',            'bright bedroom in morning light, soft white sheets, cozy atmosphere',        '{"indoor","morning"}'),
  ('context', 'gym_fitness',        '피트니스',             'modern gym interior, fitness equipment, motivational environment',            '{"indoor","fitness"}'),
  ('context', 'beach_seaside',      '해변',                'sandy beach setting, ocean waves, clear blue sky, seaside breeze feel',       '{"outdoor","beach"}'),
  ('context', 'office_modern',      '모던 오피스',           'modern minimalist office, clean desk, professional work environment',        '{"indoor","office"}')
ON CONFLICT (category_id, key) DO NOTHING;
`;

async function migrate() {
  const CREATE_SOCIAL_ACCOUNTS_TABLE = `
    CREATE TABLE IF NOT EXISTS social_accounts (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        platform        VARCHAR(30) NOT NULL,
        account_id      VARCHAR(200) NOT NULL,
        username        VARCHAR(200),
        display_name    VARCHAR(200),
        profile_image   TEXT,
        followers       INT DEFAULT 0,
        status          VARCHAR(20) NOT NULL DEFAULT 'active',
        metadata        JSONB DEFAULT '{}',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(platform, account_id)
    );
    CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
    CREATE INDEX IF NOT EXISTS idx_social_accounts_status ON social_accounts(status);
  `;

  const CREATE_ACCOUNT_MEDIA_TABLE = `
    CREATE TABLE IF NOT EXISTS account_media (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id      UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
        file_path       TEXT NOT NULL,
        media_type      VARCHAR(20) NOT NULL DEFAULT 'image',
        caption         TEXT,
        hashtags        TEXT[] DEFAULT '{}',
        status          VARCHAR(20) NOT NULL DEFAULT 'ready',
        posted_at       TIMESTAMPTZ,
        post_url        TEXT,
        metadata        JSONB DEFAULT '{}',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_account_media_account ON account_media(account_id);
    CREATE INDEX IF NOT EXISTS idx_account_media_status ON account_media(status);
  `;

  const CREATE_REEL_TEMPLATES_TABLE = `
    CREATE TABLE IF NOT EXISTS reel_templates (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id      UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
        name            VARCHAR(200) NOT NULL,
        prompt          TEXT NOT NULL,
        duration        VARCHAR(10) DEFAULT '5',
        mode            VARCHAR(10) DEFAULT 'std',
        source_media_id UUID REFERENCES account_media(id),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_reel_templates_account ON reel_templates(account_id);
  `;

  const CREATE_OUTFIT_PROMPTS_TABLE = `
    CREATE TABLE IF NOT EXISTS outfit_prompts (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id      UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
        name            VARCHAR(200) NOT NULL,
        prompt          TEXT NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_outfit_prompts_account ON outfit_prompts(account_id);
  `;

  const CREATE_POST_QUEUE_TABLE = `
    CREATE TABLE IF NOT EXISTS post_queue (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id      UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
        image_media_id  UUID REFERENCES account_media(id) ON DELETE SET NULL,
        reel_media_id   UUID REFERENCES account_media(id) ON DELETE SET NULL,
        caption         TEXT,
        hashtags        TEXT[] DEFAULT '{}',
        status          VARCHAR(20) NOT NULL DEFAULT 'ready',
        scheduled_at    TIMESTAMPTZ,
        posted_at       TIMESTAMPTZ,
        post_url        TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_post_queue_account ON post_queue(account_id);
    CREATE INDEX IF NOT EXISTS idx_post_queue_status ON post_queue(status);
  `;

  const CREATE_TEMPLATE_DATA_TABLE = `
    CREATE TABLE IF NOT EXISTS template_data (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_type   VARCHAR(50) NOT NULL,
        character_id    UUID REFERENCES characters(id),
        name            VARCHAR(200) NOT NULL,
        data            JSONB NOT NULL DEFAULT '{}',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_template_data_type ON template_data(template_type);
    CREATE INDEX IF NOT EXISTS idx_template_data_character ON template_data(character_id);
  `;

  console.log('Running migrations...');
  // ⚠️ 기반 엔진 테이블을 먼저 생성 — 빈(신규) DB 부트스트랩 순서 보장.
  //   template_data 등이 characters(id)를 FK 참조하므로 characters가 앞서야 함.
  //   (프레시 DB에서 42P01 "relation characters does not exist" 방지. prod는 IF NOT EXISTS라 무영향.)
  await pool.query(CREATE_CHARACTERS_TABLE);
  await pool.query(CREATE_GENERATION_JOBS_TABLE);
  await pool.query(CREATE_IMAGE_ASSETS_TABLE);
  await pool.query(CREATE_VIDEO_GENERATION_JOBS_TABLE);
  await pool.query(CREATE_VIDEO_ASSETS_TABLE);
  await pool.query(CREATE_CONTENTS_TABLE);
  await pool.query(CREATE_PUBLISH_JOBS_TABLE);
  await pool.query(CREATE_VISUAL_ATTRIBUTE_CATEGORIES_TABLE);
  await pool.query(CREATE_VISUAL_ATTRIBUTES_TABLE);
  await pool.query(CREATE_CHARACTER_VISUAL_PRESETS_TABLE);

  await pool.query(CREATE_TEMPLATE_DATA_TABLE);
  await pool.query(CREATE_SOCIAL_ACCOUNTS_TABLE);
  await pool.query(CREATE_ACCOUNT_MEDIA_TABLE);
  await pool.query(CREATE_REEL_TEMPLATES_TABLE);
  await pool.query(CREATE_OUTFIT_PROMPTS_TABLE);
  await pool.query(CREATE_POST_QUEUE_TABLE);

  // account_media에 is_base 컬럼 추가
  await pool.query(`ALTER TABLE account_media ADD COLUMN IF NOT EXISTS is_base BOOLEAN DEFAULT false;`);

  // post_queue 캡션 분리 + 업로드 결과 + BGM
  await pool.query(`
    ALTER TABLE post_queue ADD COLUMN IF NOT EXISTS image_caption TEXT;
    ALTER TABLE post_queue ADD COLUMN IF NOT EXISTS reel_caption TEXT;
    ALTER TABLE post_queue ADD COLUMN IF NOT EXISTS image_post_url TEXT;
    ALTER TABLE post_queue ADD COLUMN IF NOT EXISTS reel_post_url TEXT;
    ALTER TABLE post_queue ADD COLUMN IF NOT EXISTS bgm_media_id UUID REFERENCES account_media(id) ON DELETE SET NULL;
  `);

  // ─── 사업체(마케팅 대행 대상) ───
  //   social_accounts는 "인스타 계정" 단위라 사업체 개념이 없다. 한 사업체가 계정을 여러 개
  //   가질 수 있고(브랜드 본계정/서브계정) 나중에 다른 플랫폼도 붙으므로 별도 테이블로 둔다.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS businesses (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(200) NOT NULL,
        industry    VARCHAR(50),
        memo        TEXT,
        status      VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
  `);

  // 기존 계정 데이터는 business_id NULL로 그대로 산다(미연결 계정 = 사업체에 붙이기 전 상태).
  await pool.query(`
    ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_social_accounts_business ON social_accounts(business_id);
  `);

  // 오리지널 이미지는 인스타 계정을 붙이기 **전에도** 올릴 수 있어야 한다(사업체 온보딩 순서상
  //   자료 수령이 계정 연동보다 먼저다) → account_media를 사업체에도 매달고 account_id를 옵셔널로 푼다.
  //   기존 코드 경로는 전부 account_id를 채우므로 제약만 완화될 뿐 동작은 그대로다.
  await pool.query(`
    ALTER TABLE account_media ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
    ALTER TABLE account_media ALTER COLUMN account_id DROP NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_account_media_business ON account_media(business_id);
  `);

  // 관리자가 직접 올린 원본(upload)과 팩·생성물에서 편입한 것(import)을 갈라야
  //   상세 화면이 "오리지널"과 "생성 결과물"을 구분해 보여줄 수 있다. 기존 행은 NULL로 남는다.
  await pool.query(`ALTER TABLE account_media ADD COLUMN IF NOT EXISTS source VARCHAR(20);`);

  // 사업체 ↔ 콘텐츠팩 연결. content_packs는 pack.repository가 지연 생성하는 테이블이라
  //   여기서 FK를 걸 수 없다(마이그레이션 시점에 아직 없을 수 있음) → pack_id만 보관한다.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS business_packs (
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        pack_id     BIGINT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (business_id, pack_id)
    );
  `);

  // ─── Ad Studio (URL to Ad) ───
  //   URL 하나로 광고 영상까지 가는 경로. 기존 UGC(대본→씬 조립)와 달리 "수집→컴파일→단일잡" 구조라
  //   테이블을 따로 둔다. 엔진은 프로바이더 계층에서 갈아끼운다(seedance|kling).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS web_products (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        url         TEXT NOT NULL,
        name        TEXT,
        description TEXT,
        price       TEXT,
        screenshots JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{viewport:'mobile'|'desktop', url}]
        images      JSONB NOT NULL DEFAULT '[]'::jsonb,   -- 추출된 제품 이미지 URL
        attributes  JSONB NOT NULL DEFAULT '{}'::jsonb,   -- vision 추출: 카테고리·소재·색·셀링포인트
        collector   VARCHAR(20),                          -- html|playwright|api|manual (어느 경로로 모았나)
        status      VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending|ready|failed
        error       TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_web_products_user ON web_products(user_id, created_at DESC);
  `);

  // 훅(첫 3초 대사)과 장소는 성격이 같아 한 테이블 + type으로 나눈다.
  //   locale이 핵심 — 경쟁사는 영어 고정이라 한국어 훅이 우리 차별점이다.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ad_setup_items (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type        VARCHAR(20) NOT NULL,                 -- 'hook' | 'setting'
        slug        VARCHAR(60) NOT NULL,
        name        TEXT NOT NULL,
        prompt      TEXT NOT NULL,
        locale      VARCHAR(10) NOT NULL DEFAULT 'ko',
        is_official BOOLEAN NOT NULL DEFAULT false,
        user_id     UUID REFERENCES users(id) ON DELETE CASCADE,  -- null = 공식 시드
        sort_order  INT NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_ad_setup_official ON ad_setup_items(type, slug, locale) WHERE user_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_ad_setup_type ON ad_setup_items(type, locale, sort_order);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ad_jobs (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id         UUID,
        mode            VARCHAR(40) NOT NULL DEFAULT 'ugc',
        specific_mode   VARCHAR(40) NOT NULL DEFAULT 'web_product',
        web_product_id  UUID REFERENCES web_products(id) ON DELETE SET NULL,
        hook_id         UUID REFERENCES ad_setup_items(id) ON DELETE SET NULL,
        setting_id      UUID REFERENCES ad_setup_items(id) ON DELETE SET NULL,
        avatar_ids      JSONB NOT NULL DEFAULT '[]'::jsonb,
        duration        INT NOT NULL DEFAULT 8,
        resolution      VARCHAR(10) NOT NULL DEFAULT '720p',
        aspect_ratio    VARCHAR(10) NOT NULL DEFAULT '9:16',
        generate_audio  BOOLEAN NOT NULL DEFAULT true,
        enhanced_prompt TEXT,                             -- 컴파일 결과 보존 = 품질 회귀 추적의 근거
        engine          VARCHAR(30),                      -- 어떤 엔진으로 돌았나(경쟁사는 이걸 숨긴다)
        provider_job_id TEXT,
        status          VARCHAR(20) NOT NULL DEFAULT 'pending',
        result_url      TEXT,
        error           TEXT,
        charged         INT NOT NULL DEFAULT 0,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        finished_at     TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_ad_jobs_user ON ad_jobs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ad_jobs_status ON ad_jobs(status) WHERE status IN ('pending','processing');
  `);

  // 브랜드킷 확장 — URL 자동 추출이 채울 필드들. 기존 3개(logo_url·primary_color·font_name)는 그대로.
  await pool.query(`
    ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS website_url       TEXT;
    ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS industry          VARCHAR(80);
    ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS keywords          JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS business_overview TEXT;
    ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS tone_of_voice     TEXT;
    ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS secondary_color   VARCHAR(20);
    ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS sns               JSONB DEFAULT '{}'::jsonb;
  `);

  // 예약 발행 — scheduled_at은 이미 post_queue에 있으나 스케줄러가 안 쓰던 컬럼이다.
  //   도래분을 분 단위로 훑으므로 (status, scheduled_at) 인덱스를 깔아준다.
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_post_queue_due ON post_queue(status, scheduled_at);
  `);

  // 훅·장소 공식 시드 — 재실행 안전(같은 type+slug+locale이면 내용만 갱신).
  //   시드 원본은 src/ad-studio/setupItems.seed.js, 구조화 export는 docs/exports/ad_setup_items.csv.
  {
    const { rows: setupRows } = require('../ad-studio/setupItems.seed');
    for (const r of setupRows()) {
      await pool.query(
        `INSERT INTO ad_setup_items (type, slug, name, prompt, locale, is_official, sort_order)
         VALUES ($1,$2,$3,$4,$5,true,$6)
         ON CONFLICT (type, slug, locale) WHERE user_id IS NULL
         DO UPDATE SET name = EXCLUDED.name, prompt = EXCLUDED.prompt, sort_order = EXCLUDED.sort_order`,
        [r.type, r.slug, r.name, r.prompt, r.locale, r.sort_order]
      );
    }
    console.log(`  ✓ ad_setup_items 시드: ${setupRows().length}개`);
  }

  await pool.query(SEED_CATEGORIES);
  await pool.query(SEED_ATTRIBUTES);

  // characters 테이블에 reference_image_id 컬럼 추가
  await pool.query(`
    ALTER TABLE characters
    ADD COLUMN IF NOT EXISTS reference_image_id UUID REFERENCES image_assets(id),
    ADD COLUMN IF NOT EXISTS reference_image_url TEXT;
  `);

  // ─── 프롬프트 테이블 ───
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prompts (
        idx             SERIAL PRIMARY KEY,
        character_id    UUID REFERENCES characters(id),
        prompt_text     TEXT NOT NULL,
        model           VARCHAR(100),
        reference_image_path TEXT,
        tags            TEXT[] DEFAULT '{}',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_prompts_character ON prompts(character_id);
  `);

  // ─── 결과물 테이블 ───
  await pool.query(`
    CREATE TABLE IF NOT EXISTS generation_results (
        idx             SERIAL PRIMARY KEY,
        prompt_idx      INT NOT NULL REFERENCES prompts(idx),
        character_id    UUID REFERENCES characters(id),
        file_path       TEXT NOT NULL,
        file_size_kb    INT,
        width           INT,
        height          INT,
        model           VARCHAR(100),
        metadata        JSONB DEFAULT '{}',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_gen_results_prompt ON generation_results(prompt_idx);
    CREATE INDEX IF NOT EXISTS idx_gen_results_character ON generation_results(character_id);
  `);

  // ─── 리뷰 테이블 ───
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
        idx             SERIAL PRIMARY KEY,
        result_idx      INT NOT NULL REFERENCES generation_results(idx),
        prompt_idx      INT NOT NULL REFERENCES prompts(idx),
        natural_score   DECIMAL(3,1) DEFAULT 0,
        sexual_score    DECIMAL(3,1) DEFAULT 0,
        post_rate       DECIMAL(5,2) DEFAULT 0,
        posted          BOOLEAN NOT NULL DEFAULT false,
        reviewer        VARCHAR(100) DEFAULT 'system',
        memo            TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_result ON reviews(result_idx);
    CREATE INDEX IF NOT EXISTS idx_reviews_prompt ON reviews(prompt_idx);
    CREATE INDEX IF NOT EXISTS idx_reviews_posted ON reviews(posted);
  `);

  // ─── 스타일 프리셋 테이블 ───
  await pool.query(`
    CREATE TABLE IF NOT EXISTS style_presets (
        idx             SERIAL PRIMARY KEY,
        name            VARCHAR(100) NOT NULL UNIQUE,
        category        VARCHAR(50) NOT NULL,
        prefix          TEXT NOT NULL,
        suffix          TEXT NOT NULL,
        negative_prompt TEXT DEFAULT '',
        description     TEXT DEFAULT '',
        sort_order      INT NOT NULL DEFAULT 0,
        is_active       BOOLEAN NOT NULL DEFAULT true,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // 스타일 시드 데이터
  await pool.query(`
    INSERT INTO style_presets (name, category, prefix, suffix, negative_prompt, description, sort_order) VALUES
      ('Natural', 'photography',
       'raw candid photo, iPhone camera, unedited, everyday life moment,',
       'natural skin texture, slight grain, realistic imperfections, no retouching, Instagram style, casual mood',
       'studio lighting, heavy makeup, over-retouched, artificial, posed, professional lighting',
       'Natural everyday snapshot feel', 1),

      ('Fashion', 'photography',
       'editorial fashion photography, high-end designer outfit focus, Vogue magazine aesthetic, clothing as main subject,',
       'professional fashion lighting, sharp fabric details, clothing texture emphasis, fashion magazine quality, full outfit visible, styling details prominent',
       'casual, low quality, blurry fabric, bad proportions, amateur',
       'Clothing and outfit as the main focus', 2),

      ('Dynamic', 'photography',
       'dynamic action shot, energetic composition, motion captured mid-movement, dramatic angle,',
       'motion blur on edges, vivid saturated colors, high contrast, dramatic lighting, cinematic energy, sense of speed',
       'static, boring, flat, dull colors, stiff pose',
       'Energetic movement and action', 3),

      ('Cinematic', 'photography',
       'cinematic film still, anamorphic lens, movie scene composition, Hollywood production quality,',
       'shallow depth of field, cinematic color grading, teal and orange tones, film grain, dramatic shadows, widescreen framing, bokeh',
       'flat lighting, amateur, snapshot, bright even lighting',
       'Movie scene aesthetic', 4),

      ('Portrait', 'photography',
       'professional portrait photography, studio lighting setup, 85mm lens, subject-focused,',
       'soft bokeh background, catchlight in eyes, skin detail visible, professional retouching, studio quality, sharp focus on face',
       'wide angle, distorted, full body, busy background',
       'Professional portrait with studio quality', 5),

      ('Street', 'photography',
       'street photography, urban environment, candid moment captured, documentary style,',
       'natural street lighting, urban texture, environmental context, authentic atmosphere, gritty detail, real-life moment',
       'studio, posed, artificial, clean background',
       'Urban street photography style', 6),

      ('Glamour', 'photography',
       'glamour photography, beauty lighting, magazine cover quality, alluring aesthetic,',
       'soft diffused lighting, glowing skin, beauty retouching, glossy finish, professional makeup visible, elegant pose',
       'casual, everyday, harsh shadows, unflattering angle',
       'Beauty and glamour magazine style', 7),

      ('Film', 'photography',
       '35mm film photography, Kodak Portra 400 film stock, analog camera shot,',
       'warm film tones, natural grain, slightly faded highlights, organic color palette, analog texture, nostalgic warmth, soft contrast',
       'digital, clean, sharp, HDR, oversaturated',
       'Analog film photography look', 8),

      ('3D Render', 'digital',
       '3D rendered character, octane render, volumetric lighting, CGI quality,',
       'smooth 3D surface, subsurface scattering on skin, ray traced shadows, ambient occlusion, photorealistic 3D render, Unreal Engine quality',
       'flat, 2D, hand drawn, sketch, painting',
       '3D CGI render style', 9),

      ('Anime', 'illustration',
       'anime style illustration, Japanese animation aesthetic, cel shading,',
       'vibrant anime colors, clean linework, expressive anime eyes, detailed anime hair, studio quality animation frame',
       'realistic, photograph, 3D render, western cartoon',
       'Japanese anime illustration style', 10)
    ON CONFLICT (name) DO NOTHING;
  `);

  // prompts 테이블에 style 컬럼 추가
  await pool.query(`
    ALTER TABLE prompts ADD COLUMN IF NOT EXISTS style_preset VARCHAR(100);
  `);

  // generation_results에 status, error 컬럼 추가
  await pool.query(`
    ALTER TABLE generation_results
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'success',
    ADD COLUMN IF NOT EXISTS error_message TEXT;
  `);
  // file_path NOT NULL 제약 제거 (실패 시 파일 없음)
  await pool.query(`
    ALTER TABLE generation_results ALTER COLUMN file_path DROP NOT NULL;
  `);

  // ─── 결과물 자동공개(커뮤니티) + attribution + 모더레이션 ───
  // ⚠️ visibility 기본값 'private': 기존(과거) 결과는 비공개 유지(소급 공개 방지). 신규는 앱이 명시 설정.
  await pool.query(`
    ALTER TABLE generation_results
    ADD COLUMN IF NOT EXISTS visibility      VARCHAR(10) NOT NULL DEFAULT 'private', -- public | private
    ADD COLUMN IF NOT EXISTS taken_down       BOOLEAN     NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS template_id      TEXT,        -- 출처 템플릿(마켓 UUID 또는 레시피 id), null=Custom
    ADD COLUMN IF NOT EXISTS template_source  VARCHAR(12), -- marketplace | recipe | null
    ADD COLUMN IF NOT EXISTS template_name    TEXT;
    CREATE INDEX IF NOT EXISTS idx_gen_results_public ON generation_results(visibility, taken_down, created_at DESC);
  `);
  // ─── 인증/멀티테넌시: users 테이블 + 루트 테이블 user_id ───
  //   아래 result_reports/result_likes/follows가 users(id)를 FK 참조하므로 users를 먼저 생성.
  //   (프레시 DB 부트스트랩 순서. prod는 이미 존재라 무영향 — migrateAuth는 멱등.)
  await migrateAuth();

  // 공개 결과물 신고(중복 무시) — 누적 시 자동 테이크다운
  await pool.query(`
    CREATE TABLE IF NOT EXISTS result_reports (
        result_idx   INT NOT NULL REFERENCES generation_results(idx) ON DELETE CASCADE,
        reporter_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason       VARCHAR(40),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (result_idx, reporter_id)
    );
  `);

  // 공개 결과물(creation) 좋아요 — Explore 피드. 중복 좋아요는 PK로 차단(멱등).
  // likes_count는 generation_results에 비정규화(인기순 정렬·크리에이터 대시보드용) → 토글 시 단일 CTE로 원자적 갱신.
  await pool.query(`
    ALTER TABLE generation_results ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0;
    CREATE TABLE IF NOT EXISTS result_likes (
        result_idx   INT NOT NULL REFERENCES generation_results(idx) ON DELETE CASCADE,
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (result_idx, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_result_likes_user ON result_likes(user_id, created_at DESC);
  `);

  // 크리에이터 팔로우 — follower_id가 creator_id를 팔로우. 자기 자신 금지(CHECK), 중복 PK 차단(멱등).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS follows (
        follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        creator_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (follower_id, creator_id),
        CHECK (follower_id <> creator_id)
    );
    CREATE INDEX IF NOT EXISTS idx_follows_creator ON follows(creator_id);
  `);

  // reviews에 active 컬럼 추가 (소프트 삭제)
  await pool.query(`
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
  `);

  // reviews에 hook_level 컬럼 추가 (관심도/반응 예측 0~10)
  await pool.query(`
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hook_level DECIMAL(3,1) DEFAULT 0;
  `);

  // video_generation_jobs / video_assets의 source_image_id NOT NULL 제거
  // (image_assets에 master가 없어도 character.reference_image_url 폴백으로 진행 가능하도록)
  await pool.query(`
    ALTER TABLE video_generation_jobs ALTER COLUMN source_image_id DROP NOT NULL;
  `).catch((e) => console.warn('[migrate] drop NOT NULL on video_generation_jobs.source_image_id skipped:', e.message));
  await pool.query(`
    ALTER TABLE video_assets ALTER COLUMN source_image_id DROP NOT NULL;
  `).catch((e) => console.warn('[migrate] drop NOT NULL on video_assets.source_image_id skipped:', e.message));

  // (migrateAuth는 위 result_reports/likes/follows 이전으로 이동됨 — users 선행 생성)

  // ─── 크레딧/결제 ───
  await migrateCredits();

  // ─── 브랜드킷 ───
  await pool.query(`
    CREATE TABLE IF NOT EXISTS brand_kits (
        user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        logo_url      TEXT,
        primary_color VARCHAR(20),
        font_name     VARCHAR(50),
        enabled       BOOLEAN NOT NULL DEFAULT false,
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // ─── 마켓플레이스 (템플릿 판매 + 수익분배) ───
  await migrateMarketplace();

  // ─── 어필리에이트 (추천 → 크레딧 보상) ───
  await migrateAffiliate();

  // ─── 팀 (Phase 1: 멤버십/초대) ───
  await migrateTeams();

  // ─── 팀 (Phase 2: 공유 크레딧 풀 + 활성 컨텍스트) ───
  await migrateTeamCredits();

  // ─── 팀 (Phase 3a: 공유 캐릭터) ───
  await pool.query(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_characters_team ON characters(team_id);`);

  // ─── 팀 (Phase 3b: 공유 갤러리 — 프롬프트/결과물) ───
  await pool.query(`ALTER TABLE prompts ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_prompts_team ON prompts(team_id);`);

  // ─── 비동기 릴스 생성 잡 큐 (Cloudflare 100초 타임아웃 회피) ───
  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_jobs (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
        prompt        TEXT NOT NULL,
        duration      VARCHAR(5)  NOT NULL DEFAULT '5',
        mode          VARCHAR(10) NOT NULL DEFAULT 'std',
        task_id       TEXT,                    -- Kling task_id
        charge_amount INT NOT NULL DEFAULT 0,  -- 실패 시 환불액
        status        VARCHAR(20) NOT NULL DEFAULT 'processing', -- processing | succeeded | failed
        result_idx    INT,                     -- generation_results.idx
        result_url    TEXT,
        error         TEXT,
        attempts      INT NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_video_jobs_user ON video_jobs(user_id, created_at DESC);

    -- On Model faceswap 잡 큐 (bodywear stage-2). video_jobs 미러.
    --   stage-1(얼굴 미첨부 생성)을 enqueue → faceswapWorker가 로스터 얼굴로 스왑 → 결과 삽입.
    --   설계: docs/onmodel_faceswap_설계_2026-07-18.md
    CREATE TABLE IF NOT EXISTS faceswap_jobs (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id           UUID REFERENCES teams(id) ON DELETE SET NULL,
        prompt_idx        INT,                     -- generation_prompts.idx (결과 삽입용 링크)
        character_id      UUID,
        source_face_path  TEXT NOT NULL,           -- 로스터 얼굴(/img/models/<id>) = 스왑 소스
        stage1_filename   TEXT NOT NULL,           -- stage-1 산출 파일명(mediaStore key) = 스왑 타겟
        model_id          TEXT,                    -- 렌더 모델(result.model)
        visibility        VARCHAR(10) NOT NULL DEFAULT 'public',
        template_id       TEXT,
        template_source   TEXT,
        template_name     TEXT,
        gen_meta          JSONB NOT NULL DEFAULT '{}'::jsonb, -- garment·source 모델명 등 컨텍스트
        charge_amount     INT NOT NULL DEFAULT 0,  -- 실패 시 환불액
        status            VARCHAR(20) NOT NULL DEFAULT 'queued', -- queued | processing | succeeded | failed
        result_idx        INT,                     -- generation_results.idx (스왑 결과)
        result_url        TEXT,
        error             TEXT,
        attempts          INT NOT NULL DEFAULT 0,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_faceswap_jobs_status ON faceswap_jobs(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_faceswap_jobs_user ON faceswap_jobs(user_id, created_at DESC);
  `);
  // 오디오 옵션(비동기 video-to-audio 단계가 잡 완료 후 실행할지) 보존
  await pool.query(`ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS audio BOOLEAN NOT NULL DEFAULT false;`);

  // 영상 결과 자동공개(P2): 잡이 visibility·출처 템플릿(attribution)을 운반 → finalize가 결과에 그대로 기록.
  // ⚠️ 기본 'private': 컬럼 미지정 잡(과거)은 비공개. 신규는 /video/async가 명시(이미지 경로와 동일 정책).
  await pool.query(`
    ALTER TABLE video_jobs
    ADD COLUMN IF NOT EXISTS visibility      VARCHAR(10) NOT NULL DEFAULT 'private', -- public | private
    ADD COLUMN IF NOT EXISTS template_id      TEXT,        -- 출처 템플릿(마켓 UUID 또는 레시피 id), null=Custom
    ADD COLUMN IF NOT EXISTS template_source  VARCHAR(12), -- marketplace | recipe | null
    ADD COLUMN IF NOT EXISTS template_name    TEXT;
  `);

  // 영상 결과 중복 방지(원천 봉쇄): 같은 Kling task는 결과 1개만.
  //   원인 = PM2 재시작/구버전 프로세스 겹침으로 같은 task가 두 번 finalize되던 버그.
  //   코드 가드(SELECT-then-insert)는 동시 실행 TOCTOU 레이스가 남아, DB가 원자적으로 거부하게 함.
  //   부분 유니크 인덱스: video 타입 + taskId 있을 때만(이미지/구 영상에 영향 없음).
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_gen_results_video_task
    ON generation_results ((metadata->>'taskId'))
    WHERE metadata->>'type' = 'video' AND metadata->>'taskId' IS NOT NULL;
  `);

  // ─── UGC 영상 엔진 잡(제품+컨셉→대본→클립→조립) — 다단계 비동기 오케스트레이션 ───
  //   video_jobs와 별개: 단일 Kling task가 아니라 자체 파이프라인. 인메모리 잡스토어를 대체(재시작·멀티인스턴스 견고).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ugc_jobs (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
        output_type   VARCHAR(24) NOT NULL DEFAULT 'product-ad',
        product       TEXT,
        concept       TEXT,
        title         TEXT,
        n_clips       INT NOT NULL DEFAULT 0,
        charge_amount INT NOT NULL DEFAULT 0,  -- 실패 시 환불액
        status        VARCHAR(20) NOT NULL DEFAULT 'processing', -- processing | succeeded | failed
        result_idx    INT,                     -- generation_results.idx
        result_url    TEXT,
        caption       TEXT,
        hashtags      JSONB,
        duration_sec  INT,
        subtitle_mode VARCHAR(12),             -- burned | sidecar | none
        visibility    VARCHAR(10) NOT NULL DEFAULT 'public', -- public | private
        error         TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_ugc_jobs_status ON ugc_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_ugc_jobs_user ON ugc_jobs(user_id, created_at DESC);
  `);
  // 결과 편집(씬 재배치·삭제·씬별 재생성·자막수정)을 위해 대본과 씬별 클립을 영속화.
  //   script      = 렌더에 쓴 대본 전체(scenes 포함) — 서버가 재조립 기준으로 보관(brollPrompt는 서버 내부만).
  //   scene_clips = { [sceneN]: { clip, thumb, durationMs, isStill } } — basename만 저장(로컬/S3/프론트 URL 공용).
  await pool.query(`
    ALTER TABLE ugc_jobs ADD COLUMN IF NOT EXISTS script JSONB;
    ALTER TABLE ugc_jobs ADD COLUMN IF NOT EXISTS scene_clips JSONB;
  `);

  console.log('Migrations completed.');
}

/**
 * 팀 Phase 2: teams.credit_balance + team_credit_ledger + users.active_team_id. (멱등)
 */
async function migrateTeamCredits() {
  await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS credit_balance INT NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS active_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_credit_ledger (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        actor_id      UUID REFERENCES users(id) ON DELETE SET NULL, -- 차감/충전 행위자
        amount        INT NOT NULL,            -- 양수=충전, 음수=차감
        balance_after INT NOT NULL,
        type          VARCHAR(30) NOT NULL,    -- transfer_in | generation | refund | transfer_out
        description   TEXT DEFAULT '',
        ref_id        TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_team_ledger_team ON team_credit_ledger(team_id, created_at DESC);
  `);
}

/**
 * 팀 Phase 1: teams + team_members + team_invites. 기존 데이터 모델은 건드리지 않음. (멱등)
 */
async function migrateTeams() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teams (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(120) NOT NULL,
        owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_members (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role        VARCHAR(10) NOT NULL DEFAULT 'editor', -- owner | editor | viewer
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(team_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_invites (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        code        VARCHAR(20) NOT NULL UNIQUE,
        role        VARCHAR(10) NOT NULL DEFAULT 'editor',
        created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
        expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_team_invites_team ON team_invites(team_id);
  `);
}

/**
 * 어필리에이트: users.referral_code(고유) + referrals + referral_clicks. (멱등)
 */
async function migrateAffiliate() {
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12);`);
  // 신규 가입자는 자동으로 코드 발급 (랜덤 8자 hex)
  await pool.query(`ALTER TABLE users ALTER COLUMN referral_code SET DEFAULT substr(md5(gen_random_uuid()::text), 1, 8);`);
  // 기존 사용자 backfill (id+email 해시 앞 8자)
  await pool.query(`UPDATE users SET referral_code = substr(md5(id::text || email), 1, 8) WHERE referral_code IS NULL;`);
  // 고유 인덱스 (없을 때만)
  const idx = await pool.query(`SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_referral_code'`);
  if (idx.rowCount === 0) {
    await pool.query(`CREATE UNIQUE INDEX idx_users_referral_code ON users(referral_code);`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS referrals (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referrer_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referred_user_id  UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        code              VARCHAR(12) NOT NULL,
        commission_earned INT NOT NULL DEFAULT 0,   -- 누적 지급 크레딧
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS referral_clicks (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code        VARCHAR(12) NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON referral_clicks(code);
  `);
}

/**
 * 마켓플레이스: 크리에이터 플래그 + 템플릿 카탈로그. 비어있을 때만 공식 템플릿 시드. (멱등)
 */
async function migrateMarketplace() {
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_creator BOOLEAN NOT NULL DEFAULT false;`);

  // 소셜 로그인(Google): 비번 없는 OAuth 사용자 허용 + google_id 연결
  await pool.query(`
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(64);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
  `);

  // 플랜(구독 티어) + 워터마크 무료 1회 제공 소진 플래그
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'free'; -- free | creator | pro | brand
    ALTER TABLE users ADD COLUMN IF NOT EXISTS first_clean_used BOOLEAN NOT NULL DEFAULT false;
    -- 구독 티어 부가: 24h 업그레이드 오퍼 시작 시각 + 구독 갱신 예정일(결제 연동 시 사용)
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_offer_started_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_renews_at TIMESTAMPTZ;
  `);

  // 체험 계정(회사별): 첫 로그인 시점부터 N일 + 이미지 M장 제한. (관리자 페이지에서 발급)
  //   trial_started_at = 첫 로그인 때 세팅(NULL이면 아직 시작 전). 만료/소진은 generate 게이트에서 검사.
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_trial          BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at   TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_days         INT NOT NULL DEFAULT 7;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_image_quota  INT NOT NULL DEFAULT 200;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_image_used   INT NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name       VARCHAR(120);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketplace_templates (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        creator_id     UUID REFERENCES users(id) ON DELETE SET NULL,
        creator_handle VARCHAR(80) NOT NULL DEFAULT '@heyhoai',
        name           VARCHAR(120) NOT NULL,
        category       VARCHAR(20) NOT NULL,   -- Influencer | Shopping | UGC
        type           VARCHAR(10) NOT NULL DEFAULT 'image', -- image | reel
        style          VARCHAR(50) NOT NULL DEFAULT 'Natural',
        prompt         TEXT NOT NULL,
        emoji          VARCHAR(8) DEFAULT '🎨',
        price_credits  INT NOT NULL DEFAULT 0,  -- 크리에이터 사용료(생성비와 별도)
        usage_count    INT NOT NULL DEFAULT 0,
        status         VARCHAR(20) NOT NULL DEFAULT 'active',
        is_official    BOOLEAN NOT NULL DEFAULT false,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_templates(category, status);
    CREATE INDEX IF NOT EXISTS idx_marketplace_creator ON marketplace_templates(creator_id);
  `);

  // 코어 확장(2026-06-21): 템플릿이 자기 툴을 가짐 + 공개/비공개 + Feed 인게이지먼트·예시미디어. (멱등·추가형)
  await pool.query(`
    ALTER TABLE marketplace_templates ADD COLUMN IF NOT EXISTS tool VARCHAR(40);
    ALTER TABLE marketplace_templates ADD COLUMN IF NOT EXISTS visibility VARCHAR(10) NOT NULL DEFAULT 'public'; -- public | private
    ALTER TABLE marketplace_templates ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0;
    ALTER TABLE marketplace_templates ADD COLUMN IF NOT EXISTS preview_media JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE marketplace_templates ADD COLUMN IF NOT EXISTS negative_prompt TEXT;
    ALTER TABLE marketplace_templates ADD COLUMN IF NOT EXISTS target_image_url TEXT; -- 생성 시 함께 보낼 레이아웃 타깃 이미지(admin 지정, URL 또는 data URL)
    CREATE INDEX IF NOT EXISTS idx_marketplace_visibility ON marketplace_templates(visibility, status);
  `);

  // T&S(2026-06-21): 신고 테이블 — 공개 Feed 모더레이션(서로 다른 신고자 누적 시 자동 비공개). (멱등)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS template_reports (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id  UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
        reporter_id  UUID REFERENCES users(id) ON DELETE SET NULL,
        reason       VARCHAR(40) NOT NULL DEFAULT 'other',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (template_id, reporter_id)
    );
    CREATE INDEX IF NOT EXISTS idx_template_reports_tpl ON template_reports(template_id);
  `);

  // 북마크(P2): 유저가 템플릿을 'Saved'로 저장 — Library Saved 탭 + 수요 신호. (멱등)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS template_bookmarks (
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        template_id  UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, template_id)
    );
    CREATE INDEX IF NOT EXISTS idx_template_bookmarks_user ON template_bookmarks(user_id, created_at DESC);
  `);

  // 보유/구매(buy-to-own): 무료=추가·유료=구매 1회 → 보유. 보유분이 studio pick-a-template에 등장. (멱등)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS template_owns (
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        template_id  UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
        source       VARCHAR(10) NOT NULL DEFAULT 'free', -- free | purchase
        price_paid   INT NOT NULL DEFAULT 0,               -- 구매 시 지불액(언락 가격)
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, template_id)
    );
    CREATE INDEX IF NOT EXISTS idx_template_owns_user ON template_owns(user_id, created_at DESC);
  `);
  // 보유 템플릿의 studio 노출 토글(Library Purchased 탭에서 켜고 끔). 구매 시 자동 true.
  await pool.query(`ALTER TABLE template_owns ADD COLUMN IF NOT EXISTS in_studio BOOLEAN NOT NULL DEFAULT true;`);
  // 사용당 로열티(하이브리드): 보유 후 생성마다 크리에이터에 분배할 소액(0=없음). price_credits=언락가, 이건 사용가.
  await pool.query(`
    ALTER TABLE marketplace_templates ADD COLUMN IF NOT EXISTS use_price_credits INT NOT NULL DEFAULT 0;
  `);
  // recipe-backed 유료 템플릿: 마켓 템플릿이 내장 recipe를 가리킴 → 구매/보유=마켓 시스템, 생성=리치 recipe resolver. (멱등)
  await pool.query(`
    ALTER TABLE marketplace_templates ADD COLUMN IF NOT EXISTS recipe_id TEXT;
  `);
  // Save한 creation 출처 포인터(γ): 비공개 개인 템플릿이 이 creation의 룩을 가리킴. 프롬프트는 템플릿에 저장 안 함(블랙박스),
  //   생성 시 γ-1(fromCreationIdx)로 서버사이드 해석. 내 것=내 프롬프트 / 남의 것=블랙박스(escrow는 γ-3). (멱등)
  await pool.query(`
    ALTER TABLE marketplace_templates ADD COLUMN IF NOT EXISTS from_creation_idx INT;
  `);
  // 상세 등록(2026-06-21): 크리에이터가 템플릿을 더 풍부하게 등록 — 설명 텍스트 + 제작에 쓴 레퍼런스(전시용 갤러리).
  //   reference_examples = 입력 레퍼런스 URL 배열(전시 전용·생성엔 미주입). preview_media(결과 예시)와 의미 분리. (멱등)
  await pool.query(`
    ALTER TABLE marketplace_templates ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE marketplace_templates ADD COLUMN IF NOT EXISTS reference_examples JSONB NOT NULL DEFAULT '[]'::jsonb;
  `);
  // 🆕 라이프사이클 재설계(2026-06-26): Custom 생성 자동민팅(auto-mint) 지원. (멱등·추가형)
  //   origin='auto' = 생성 파이프라인 자동민팅(블랙박스·owns 미생성) / 'manual' = 수동 Save·시드. 기존 행은 manual 백필(DEFAULT).
  //   visibility DEFAULT → 'private'(템플릿은 명시 공개 전까지 비공개). 모든 INSERT가 visibility를 명시하므로 기존 동작 무변화.
  //   동일 creation 중복 자동민팅은 부분유니크로 방지(생성 count 루프·영상 finalize 재시도 멱등).
  await pool.query(`
    ALTER TABLE marketplace_templates ADD COLUMN IF NOT EXISTS origin VARCHAR(8) NOT NULL DEFAULT 'manual'; -- auto | manual
    ALTER TABLE marketplace_templates ALTER COLUMN visibility SET DEFAULT 'private';
    CREATE UNIQUE INDEX IF NOT EXISTS uq_marketplace_auto_creation
      ON marketplace_templates(creator_id, from_creation_idx) WHERE origin = 'auto';
  `);
  // 백필(멱등): 기존 Custom 생성(template_source NULL·성공)에 auto 템플릿이 없으면 민팅 — 자동민팅(P1)은 신규에만 걸리므로
  //   과거 creation도 상세에서 "Add to My templates / Buy"가 동작하도록(블랙박스 prompt=''·private·preview=결과이미지). NOT EXISTS 가드.
  await pool.query(`
    INSERT INTO marketplace_templates (creator_id, creator_handle, name, category, type, style, prompt, visibility, emoji, from_creation_idx, preview_media, origin)
    SELECT p.user_id, '@'||split_part(u.email,'@',1), 'My custom look', 'Custom',
           CASE WHEN gr.metadata->>'type'='video' THEN 'reel' ELSE 'image' END,
           'Natural','','private','🎨', gr.idx,
           jsonb_build_array('/'||regexp_replace(gr.file_path,'^tmp/','')), 'auto'
      FROM generation_results gr
      JOIN prompts p ON p.idx = gr.prompt_idx
      JOIN users u ON u.id = p.user_id
     WHERE gr.template_source IS NULL AND gr.status = 'success' AND gr.taken_down = false AND gr.file_path IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM marketplace_templates mt WHERE mt.from_creation_idx = gr.idx AND mt.creator_id = p.user_id AND mt.origin = 'auto')
  `);
  // 🗑️ 가짜 placeholder 시드 제거: 개발자가 넣은 무료 공식 8개(@heyhoai, 미리보기 없음·하드코딩된 가짜 usage). (멱등)
  //    → 진짜 유료 recipe-backed 프리미엄으로 대체. recipe-backed(@doppia)는 보존.
  await pool.query(`DELETE FROM marketplace_templates WHERE is_official = true AND creator_handle = '@heyhoai' AND recipe_id IS NULL`);

  // (2026-07-11) 옛 오피셜 슬러그 은퇴 — 현재 recipe 세트(DEFAULT_OFFICIAL_RECIPES)에 없는 레거시 행을
  //   visibility='private'로 격하(비파괴·가역). fresh DB엔 애초 안 생기고, 기존 prod행은 Store에서 숨김.
  //   (ring/bracelet-editorial-campaign·top-down-hero·void-hero-cut·pet-product-hero=옛 프리미엄, studio-model-cut=model-cut 옛 이름 중복.)
  await pool.query(
    `UPDATE marketplace_templates SET visibility = 'private'
     WHERE is_official = true AND recipe_id = ANY($1::text[])`,
    [['ring-editorial-campaign', 'bracelet-editorial-campaign', 'top-down-hero', 'void-hero-cut', 'pet-product-hero', 'studio-model-cut']]
  );
  // (2026-07-08) beauty Hero 3종을 Product Hero(producthero)로 이관 → 옛 단독 프리미엄 오피셜 행 정리.
  //   recipe_id는 producthero 자식과 안 겹침(-hero/-luxe 접미사). 멱등.
  await pool.query(`DELETE FROM marketplace_templates WHERE recipe_id IN ('dewy-glass-hero','noir-gold-hero','stone-plinth-luxe') AND is_official = true`);

  // ✅ 기본 제공(무료) 공식 recipe 7종 — 현재 DEFAULT_OFFICIAL_RECIPES. price_credits=0 → Store 구매게이트/생성 402 없음.
  //    Studio는 소유 무관 노출(applyDefaultOfficials). preview_media = 큐레이션된 정적 /img/ 대표이미지(git 커밋 영속).
  //    멱등: 없으면 삽입, 있으면 price 0 보정 + preview_media를 정적 대표이미지로 갱신(@doppia 권위값).
  //    (2026-07-11) product-hero + jewelry×4 신규 추가 + 전 recipe 대표이미지 지정. themes는 아래 OFFICIAL_THEME에서 배선.
  for (const t of [
    { rid: 'product-cut',         name: 'Product Cut',         emoji: '🖼️', thumb: '/img/productcut/product-cut.png' },
    { rid: 'product-hero',        name: 'Product Hero',        emoji: '✨',  thumb: '/img/producthero/dewy-glass.jpg' },
    { rid: 'model-cut',           name: 'Model Cut',           emoji: '🧍', thumb: '/img/studiomodel/model-cut.png' },
    { rid: 'jewelry-product-cut', name: 'Jewelry Product Cut', emoji: '🖼️', thumb: '/img/accessories/jewelry-product-cut.png' },
    { rid: 'jewelry-worn-cut',    name: 'Jewelry Worn Cut',    emoji: '🖼️', thumb: '/img/accessories/jewelry-worn-cut.png' },
    { rid: 'jewelry-on-model',    name: 'Jewelry On Model',    emoji: '🖼️', thumb: '/img/accessories/jewelry-on-model.png' },
    { rid: 'jewelry-hero',        name: 'Jewelry Hero',        emoji: '✨',  thumb: '/img/accessories/jewelry-hero.png' },
  ]) {
    await pool.query(
      `INSERT INTO marketplace_templates
         (creator_handle, name, category, type, style, emoji, price_credits, use_price_credits, is_official, visibility, recipe_id, prompt)
       SELECT '@doppia', $1, 'Shopping', 'image', 'Natural', $2, 0, 0, true, 'public', $3, $4
       WHERE NOT EXISTS (SELECT 1 FROM marketplace_templates WHERE recipe_id = $3)`,
      [t.name, t.emoji, t.rid, `Included official template — ${t.name}`]
    );
    await pool.query(
      `UPDATE marketplace_templates
          SET price_credits = 0, use_price_credits = 0, preview_media = jsonb_build_array($2::text)
        WHERE recipe_id = $1 AND is_official = true`,
      [t.rid, t.thumb]
    );
  }
  // (2026-07-11) 네일 오피셜 대표이미지 백필 — 비어있는 것만(기존 /images 썸네일은 보존).
  await pool.query(
    `UPDATE marketplace_templates SET preview_media = jsonb_build_array('/img/nail/bridal-concept-nail.png')
      WHERE name = '신부 컨셉 네일' AND is_official = true
        AND (preview_media IS NULL OR preview_media = '[]'::jsonb OR (preview_media->>0) IS NULL)`
  );

  // ✅ 시드 레시피(93종) → recipes 테이블 적재. 정본은 시드 JS(recipeStore 런타임 로드),
  //    이 테이블은 config(JSONB) 전체를 보존하는 DB 사본. 멱등(upsert) — 배포마다 시드와 동기화.
  {
    const { RECIPES_TABLE_SQL, seedRecipes } = require('../recipes/recipeDbSeed');
    await pool.query(RECIPES_TABLE_SQL);
    const n = await seedRecipes(pool);
    console.log(`  ✓ recipes 테이블 적재: ${n}개`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 테마 조직화(2026-06-24, 설계=docs/테마_조직화_설계_2026-06-24.md). 전부 멱등.
  //  - themes: 글로벌 공유 어휘(Doppia 시드). template_themes: 크리에이터 다중 태그(Explore 분류).
  //  - user_studio_themes/_items: 유저 개인 스튜디오 큐레이션(활성 세트=멤버십, in_studio/recipe_hidden 대체).
  // ───────────────────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS themes (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug        TEXT UNIQUE NOT NULL,
        name        TEXT NOT NULL,
        is_official BOOLEAN NOT NULL DEFAULT true,
        sort_order  INT NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS template_themes (
        template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
        theme_id    UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
        PRIMARY KEY (template_id, theme_id)
    );
    CREATE INDEX IF NOT EXISTS idx_template_themes_theme ON template_themes(theme_id);
    CREATE TABLE IF NOT EXISTS user_studio_themes (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        sort_order  INT NOT NULL DEFAULT 0,
        origin      TEXT NOT NULL DEFAULT 'custom',  -- 'default'(시드) | 'custom'
        seed_slug   TEXT,                            -- default일 때 출처 글로벌 테마 slug(중복시드 방지)
        macro_group TEXT NOT NULL DEFAULT 'Shopping',-- 'Influencer' | 'Shopping' (커스텀 테마가 속한 대분류·"Your themes" 버킷 폐지)
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    -- 기존 DB: 커스텀 테마에 대분류 부여(없던 컬럼). 기본 'Shopping'으로 백필(대분류 미지정 레거시는 Shopping).
    ALTER TABLE user_studio_themes ADD COLUMN IF NOT EXISTS macro_group TEXT NOT NULL DEFAULT 'Shopping';
    CREATE INDEX IF NOT EXISTS idx_user_studio_themes_user ON user_studio_themes(user_id, sort_order);
    CREATE TABLE IF NOT EXISTS user_studio_theme_items (
        user_studio_theme_id UUID NOT NULL REFERENCES user_studio_themes(id) ON DELETE CASCADE,
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_type   TEXT NOT NULL,                   -- 'recipe' | 'template'
        item_id     TEXT NOT NULL,                   -- recipe 슬러그 또는 template uuid(text)
        added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_studio_theme_id, item_type, item_id)
    );
    CREATE INDEX IF NOT EXISTS idx_ustitems_user ON user_studio_theme_items(user_id);
    -- 기본 테마 섹션에서 유저가 숨긴 내장 레시피(있으면 스튜디오 picker 기본섹션에서 제외). 다시 넣기=행 삭제.
    CREATE TABLE IF NOT EXISTS user_hidden_recipes (
        user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipe_id TEXT NOT NULL,
        PRIMARY KEY (user_id, recipe_id)
    );
    -- 기본(글로벌) 테마 개인 오버라이드: 태그 파생 멤버십 위에 add(추가)/remove(제외). 템플릿을 특정 테마에 넣다/빼다.
    CREATE TABLE IF NOT EXISTS user_theme_overrides (
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        theme_slug TEXT NOT NULL,
        item_type  TEXT NOT NULL,                  -- 'recipe' | 'template'
        item_id    TEXT NOT NULL,
        action     TEXT NOT NULL,                  -- 'add' | 'remove'
        PRIMARY KEY (user_id, theme_slug, item_type, item_id)
    );
    CREATE INDEX IF NOT EXISTS idx_uto_user ON user_theme_overrides(user_id);
    -- 유저가 스튜디오에서 통째로 제거한 기본 테마(다시 보이기=행 삭제).
    CREATE TABLE IF NOT EXISTS user_hidden_themes (
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        theme_slug TEXT NOT NULL,
        PRIMARY KEY (user_id, theme_slug)
    );
    -- γ-2: 유저가 "내 템플릿에 저장"한 공개 creation 룩(재사용용 참조). 사용=γ-1 fromCreationIdx 블랙박스 경로.
    CREATE TABLE IF NOT EXISTS user_saved_creations (
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        creation_idx INT NOT NULL,
        saved_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, creation_idx)
    );
    CREATE INDEX IF NOT EXISTS idx_user_saved_creations ON user_saved_creations(user_id, saved_at DESC);
  `);
  // 글로벌 테마 시드(산업 8 + People + UGC). 멱등(slug UNIQUE).
  const THEME_SEED = [
    ['beauty', 'Beauty'], ['fashion', 'Fashion'], ['jewelry', 'Jewelry'], ['food', 'Food'],
    ['coffee', 'Coffee'], ['home', 'Home'], ['tech', 'Tech'], ['pet', 'Pet'],
    ['people', 'People'], ['ugc', 'UGC'], ['general', 'General'],
    ['productcut', 'Product Cut'], ['accessories', 'Accessories'], // (2026-07-11) accessories = jewelry 오피셜 전용 테마
  ];
  for (let i = 0; i < THEME_SEED.length; i++) {
    await pool.query(
      `INSERT INTO themes (slug, name, is_official, sort_order) VALUES ($1, $2, true, $3)
       ON CONFLICT (slug) DO NOTHING`,
      [THEME_SEED[i][0], THEME_SEED[i][1], i]
    );
  }
  // 공식 recipe-backed 시드 → 테마 백필(vertical 매핑). 멱등(PK).
  const OFFICIAL_THEME = [
    // (2026-07-11) 현재 오피셜 recipe → 테마. 옛 슬러그(editorial-campaign·top-down/void/pet-hero)는 은퇴로 제거.
    //   model-cut은 항목 없음 → 아래 'general' 폴백이 배선(prod와 동일).
    ['product-cut', 'productcut'], ['product-hero', 'beauty'],
    ['jewelry-product-cut', 'accessories'], ['jewelry-worn-cut', 'accessories'],
    ['jewelry-on-model', 'accessories'], ['jewelry-hero', 'accessories'],
  ];
  for (const [rid, slug] of OFFICIAL_THEME) {
    await pool.query(
      `INSERT INTO template_themes (template_id, theme_id)
       SELECT mt.id, th.id FROM marketplace_templates mt, themes th
        WHERE mt.recipe_id = $1 AND th.slug = $2
       ON CONFLICT DO NOTHING`,
      [rid, slug]
    );
  }
  // 기존 유저 템플릿 category → 테마 백필(아는 것만: Influencer→people, UGC→ugc; Shopping/Custom=미태그=크리에이터 후속 지정).
  await pool.query(
    `INSERT INTO template_themes (template_id, theme_id)
     SELECT mt.id, th.id FROM marketplace_templates mt
       JOIN themes th ON th.slug = (CASE mt.category WHEN 'Influencer' THEN 'people' WHEN 'UGC' THEN 'ugc' END)
      WHERE mt.recipe_id IS NULL AND mt.is_official = false
     ON CONFLICT DO NOTHING`
  );
  // 테마 미지정 템플릿 → 'general' 폴백("테마 없음 = General"). 멱등.
  await pool.query(
    `INSERT INTO template_themes (template_id, theme_id)
     SELECT mt.id, th.id FROM marketplace_templates mt CROSS JOIN themes th
      WHERE th.slug = 'general'
        AND NOT EXISTS (SELECT 1 FROM template_themes tt WHERE tt.template_id = mt.id)
     ON CONFLICT DO NOTHING`
  );
  // 일회성 백필(멱등): stranded된 미분류(Custom) 템플릿을 "적용된 테마의 대분류"로 승격 → Library↔Studio 모드 정합.
  //   효과 테마 = template_themes(base) ∪ 크리에이터 user_theme_overrides(add). Shopping 테마 있으면 Shopping, 없고 people면 Influencer.
  //   general/ugc는 대분류 신호 아님(중립). category='Custom'만 대상이라 재실행해도 무해(멱등). 신규는 코드(global-themes/items)가 즉시 승격.
  await pool.query(`
    UPDATE marketplace_templates mt SET category = 'Shopping'
     WHERE mt.category = 'Custom' AND mt.creator_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM (
           SELECT th.slug FROM template_themes tt JOIN themes th ON th.id = tt.theme_id WHERE tt.template_id = mt.id
           UNION
           SELECT o.theme_slug FROM user_theme_overrides o
             WHERE o.user_id = mt.creator_id AND o.item_type = 'template' AND o.item_id = mt.id::text AND o.action = 'add'
         ) eff
         WHERE eff.slug IN ('beauty','fashion','jewelry','pet','food','coffee','home','tech')
       )
  `);
  await pool.query(`
    UPDATE marketplace_templates mt SET category = 'Influencer'
     WHERE mt.category = 'Custom' AND mt.creator_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM (
           SELECT th.slug FROM template_themes tt JOIN themes th ON th.id = tt.theme_id WHERE tt.template_id = mt.id
           UNION
           SELECT o.theme_slug FROM user_theme_overrides o
             WHERE o.user_id = mt.creator_id AND o.item_type = 'template' AND o.item_id = mt.id::text AND o.action = 'add'
         ) eff
         WHERE eff.slug = 'people'
       )
  `);
}

/**
 * 크레딧 시스템: users.credit_balance + 크레딧 원장 + 결제 기록 테이블. (멱등)
 */
async function migrateCredits() {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_balance INT NOT NULL DEFAULT 0;
  `);

  // 스트릭 / 데일리 보너스 (리텐션)
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_count INT NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_best  INT NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_bonus_at DATE;
  `);

  // 크레딧 원장 — 모든 증감 기록 (감사 추적용)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_ledger (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount        INT NOT NULL,            -- 양수=적립, 음수=차감
        balance_after INT NOT NULL,
        type          VARCHAR(30) NOT NULL,    -- signup_bonus | generation | refund | purchase | admin_adjust
        description   TEXT DEFAULT '',
        ref_id        TEXT,                    -- 관련 리소스/주문 ID
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger(user_id, created_at DESC);
  `);

  // 크리에이터 로열티 = 별도 '포인트'(현금성). credit(토큰)과 분리: 토큰으로 교환 가능 / 추후 현금 페이아웃. (멱등)
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS point_balance INT NOT NULL DEFAULT 0;
    CREATE TABLE IF NOT EXISTS point_ledger (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount        INT NOT NULL,            -- +적립(royalty) / -차감(exchange·payout)
        balance_after INT NOT NULL,
        type          VARCHAR(20) NOT NULL,    -- royalty | exchange | payout
        description   TEXT DEFAULT '',
        ref_id        TEXT,                    -- 관련 템플릿/주문 ID
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_point_ledger_user ON point_ledger(user_id, created_at DESC);
  `);

  // 엑심베이 등 redirect형 PG 주문 추적 (ready 시 pending 생성 → status_url에서 paid)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS billing_orders (
        order_id    TEXT PRIMARY KEY,
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider    VARCHAR(30) NOT NULL DEFAULT 'eximbay',
        pack_id     VARCHAR(50) NOT NULL,
        credits     INT NOT NULL,
        amount_usd  DECIMAL(10,2) NOT NULL,
        status      VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | paid | failed
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_billing_orders_user ON billing_orders(user_id, created_at DESC);
  `);

  // 빌링키(정기결제용 카드 토큰) — PortOne V2.
  //   ⚠️ 카드번호는 저장하지 않는다. PG가 보관하고 우리는 토큰(billing_key)과 표시용 last4/브랜드만 갖는다.
  //   해지는 행 삭제가 아니라 status='deleted' — 과거 청구 건의 추적성을 남긴다.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS billing_keys (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider    VARCHAR(30) NOT NULL DEFAULT 'portone',
        billing_key TEXT NOT NULL,
        card_brand  VARCHAR(60),
        card_last4  VARCHAR(8),
        status      VARCHAR(20) NOT NULL DEFAULT 'active',   -- active | deleted
        raw         JSONB DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_billing_keys_user ON billing_keys(user_id);
  `);
  // 유저당 활성 카드는 1장 — 부분 유니크 인덱스라 deleted 이력은 얼마든지 쌓인다.
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_keys_one_active
        ON billing_keys(user_id) WHERE status = 'active';
  `);

  // 구독(정기결제) — 빌링키로 매월 재청구하는 계약.
  //   users.plan/plan_renews_at 은 "지금 무슨 권한인가"(=엔타이틀먼트)를 들고,
  //   이 테이블은 "언제 얼마를 다시 청구할 것인가"(=청구 계약)를 들고 간다. 축이 다르므로 분리한다.
  //   status: active(청구중) | canceled(기말 해지 예약/해지됨) | past_due(청구 실패, 재시도 대기)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan            VARCHAR(30) NOT NULL,
        billing_key_id  UUID REFERENCES billing_keys(id) ON DELETE SET NULL,
        amount_krw      INT NOT NULL,
        status          VARCHAR(20) NOT NULL DEFAULT 'active',
        next_charge_at  TIMESTAMPTZ,
        canceled_at     TIMESTAMPTZ,
        fail_count      INT NOT NULL DEFAULT 0,
        last_error      TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_due ON subscriptions(status, next_charge_at);
  `);
  // 유저당 살아있는 구독은 1건 — 중복 구독으로 이중 청구되는 사고를 스키마에서 막는다.
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_one_active
        ON subscriptions(user_id) WHERE status IN ('active', 'past_due');
  `);

  // 구독 청구 이력 — 멱등 키(payment_id)로 같은 주기의 이중 청구를 막는다.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscription_charges (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id  UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        payment_id       TEXT NOT NULL UNIQUE,
        period_start     TIMESTAMPTZ NOT NULL,
        amount_krw       INT NOT NULL,
        status           VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | paid | failed
        error            TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_sub_charges_sub ON subscription_charges(subscription_id, created_at DESC);
  `);
  // 같은 구독의 같은 주기는 한 번만 청구된다 — 스케줄러가 겹쳐 돌아도 두 번 긁히지 않는다.
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_charges_period
        ON subscription_charges(subscription_id, period_start);
  `);

  // 결제 기록 — PG 주문 멱등 처리용 (provider+order_id UNIQUE)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider    VARCHAR(30) NOT NULL,      -- lemonsqueezy
        order_id    TEXT NOT NULL,
        product     VARCHAR(50),               -- pack9 | pack49 | pack199 | pack349 (pricing.config 단일소스)
        amount_usd  DECIMAL(10,2),
        credits     INT NOT NULL,
        raw         JSONB DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(provider, order_id)
    );
    CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC);
  `);
}

/**
 * users 테이블을 만들고, 기본 관리자 계정을 보장하며,
 * 루트 테이블(characters, social_accounts, prompts)에 user_id를 추가한 뒤
 * 기존 데이터를 관리자 계정으로 backfill 한다. (멱등)
 */
async function migrateAuth() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name  VARCHAR(100),
        role          VARCHAR(20) NOT NULL DEFAULT 'user',
        status        VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  // 기본 관리자 계정 보장 + 비밀번호를 ADMIN_PASSWORD로 회전.
  // (.env의 ADMIN_PASSWORD를 강력한 값으로 바꾸고 migrate를 실행하면 라이브 admin 비번이 교체됨)
  const adminEmail = env.ADMIN_EMAIL.toLowerCase();
  await pool.query(
    `INSERT INTO users (email, password_hash, display_name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now()`,
    [adminEmail, hashPassword(env.ADMIN_PASSWORD), 'Administrator']
  );
  const adminRes = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  const adminId = adminRes.rows[0].id;
  console.log(`[migrate] admin user: ${adminEmail} (${adminId})`);

  // 백필: 잘못 저장된 캐릭터 얼굴 URL을 웹 경로로 교정 (멱등)
  // file:///Users/.../tmp/images/X.png 또는 절대경로 → /images/X.png (파일명만 남기고 /images/ 접두)
  const fixRef = await pool.query(
    `UPDATE characters
     SET reference_image_url = '/images/' || regexp_replace(reference_image_url, '^.*/', ''),
         updated_at = now()
     WHERE reference_image_url ~ '^(file://|/Users/|/home/|/private/)'`
  );
  if (fixRef.rowCount > 0) console.log(`[migrate] 캐릭터 얼굴 URL 교정: ${fixRef.rowCount}건`);

  // 루트 테이블에 user_id 추가 + backfill + NOT NULL + FK + 인덱스
  for (const table of ['characters', 'social_accounts', 'prompts', 'template_data']) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_id UUID;`);
    await pool.query(`UPDATE ${table} SET user_id = $1 WHERE user_id IS NULL;`, [adminId]);
    await pool.query(`ALTER TABLE ${table} ALTER COLUMN user_id SET NOT NULL;`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_${table}_user ON ${table}(user_id);`);

    // FK는 IF NOT EXISTS 미지원 → 존재 여부 확인 후 조건부 추가
    const fkName = `fk_${table}_user`;
    const fkExists = await pool.query(
      `SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = $1 AND table_name = $2`,
      [fkName, table]
    );
    if (fkExists.rowCount === 0) {
      await pool.query(
        `ALTER TABLE ${table} ADD CONSTRAINT ${fkName}
         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;`
      );
    }
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrate };
