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

  // ─── 인증/멀티테넌시: users 테이블 + 루트 테이블 user_id ───
  await migrateAuth();

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

  // 공식 템플릿 시드 (한 번만)
  const existing = await pool.query(`SELECT 1 FROM marketplace_templates WHERE is_official LIMIT 1`);
  if (existing.rowCount === 0) {
    await pool.query(`
      INSERT INTO marketplace_templates (creator_handle, name, category, type, style, emoji, price_credits, usage_count, is_official, prompt) VALUES
        ('@heyhoai', 'Golden Hour Pro',     'Influencer', 'image', 'Natural',   '🌅', 0, 1240, true, 'golden hour on a rooftop terrace, warm orange sunlight, candid travel snapshot, wind in hair, looking into the distance, city skyline in background'),
        ('@heyhoai', 'Y2K Film Selfie',     'Influencer', 'image', 'Film',      '📸', 0,  990, true, 'y2k style mirror selfie, compact digital camera with flash, retro 2000s fashion, playful pose, slight motion blur'),
        ('@heyhoai', 'Aesthetic Cafe',      'Influencer', 'image', 'Portrait',  '☕', 0,  730, true, 'cozy indoor cafe, warm ambient lighting, holding a coffee cup with both hands, soft natural smile, window light from the side'),
        ('@heyhoai', 'Editorial Glam',      'Influencer', 'image', 'Glamour',   '💄', 0,  610, true, 'high-end editorial look, designer outfit, dramatic studio lighting, confident expression, magazine cover quality'),
        ('@heyhoai', 'GRWM Cinematic',      'Influencer', 'reel',  'Natural',   '💋', 0,  810, true, 'getting ready in front of a vanity mirror, applying makeup, soft morning light, casual intimate vlog feel, subtle natural movement'),
        ('@heyhoai', 'Lookbook Studio',     'Shopping',   'image', 'Fashion',   '📷', 0,  670, true, 'clean studio product photography, the product on a minimal pedestal, soft even lighting, premium lookbook style'),
        ('@heyhoai', 'Lifestyle Mood Shot', 'Shopping',   'image', 'Natural',   '🌿', 0,  430, true, 'the product placed in a cozy lifestyle scene, morning light through a window, plants and natural textures around, aesthetic instagram mood'),
        ('@heyhoai', 'Product Reel',        'Shopping',   'reel',  'Cinematic', '🎞️', 0,  350, true, 'slow cinematic camera orbit around the product, soft light sweeping across, premium aesthetic mood, shallow depth of field')
    `);
  }
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

  // 결제 기록 — PG 주문 멱등 처리용 (provider+order_id UNIQUE)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider    VARCHAR(30) NOT NULL,      -- lemonsqueezy
        order_id    TEXT NOT NULL,
        product     VARCHAR(50),               -- pack50 | pack220 | pack580
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
