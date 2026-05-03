const { pool } = require('./client');

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

  console.log('Running migrations...');
  await pool.query(CREATE_SOCIAL_ACCOUNTS_TABLE);
  await pool.query(CREATE_ACCOUNT_MEDIA_TABLE);
  await pool.query(CREATE_REEL_TEMPLATES_TABLE);

  // account_media에 is_base 컬럼 추가
  await pool.query(`ALTER TABLE account_media ADD COLUMN IF NOT EXISTS is_base BOOLEAN DEFAULT false;`);
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

  console.log('Migrations completed.');
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
