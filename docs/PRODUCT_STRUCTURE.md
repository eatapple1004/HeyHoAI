# HeyHoAI Studio — 제품 완성 구조 (v1, 2026-06-06)

> 기존 "AI 가상 인플루언서 자동 운영 시스템"을 → **실제 인플루언서·쇼핑몰에게 파는 셀프서비스 콘텐츠 생성 SaaS**로 재포장.
> 목표 출시: **2026-06-11 (목)**

---

## 0. 한 줄 컨셉

> **Subject(얼굴 or 제품) + Recipe(양식) → Render(이미지/릴스)**
> 프롬프트 작성 0. 양식만 고르면 결과물이 나온다.

두 모드, 하나의 엔진:
- **모드 B — 인플루언서**: 본인 얼굴 1장 → 스타일/트렌드 양식 → 피드 사진·릴스
- **모드 A — 쇼핑몰**: 제품 1장 → 화보/착용/감성 양식 → 상세컷·릴스

---

## 1. 레이어 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│  FRONT (public/*.html)                                   │
│   landing · auth · dashboard · studio · gallery · billing │
└───────────────┬─────────────────────────────────────────┘
                │ REST /api
┌───────────────┴─────────────────────────────────────────┐
│  PRODUCT LAYER (신규)                                     │
│   auth/      유저·세션(JWT)                                │
│   billing/   크레딧·Stripe·원장(ledger)                    │
│   subjects/  얼굴/제품 등록·누끼·레퍼런스 관리              │
│   recipes/   큐레이션된 양식 카탈로그(데이터)               │
│   studio/    오케스트레이터: subject×recipe→render+크레딧차감│
└───────────────┬─────────────────────────────────────────┘
                │ 내부 호출 (재사용)
┌───────────────┴─────────────────────────────────────────┐
│  ENGINE LAYER (기존, 재사용)                              │
│   images/    멀티 프로바이더 이미지 생성                    │
│   videos/    image→video (Runway/Kling/Minimax)           │
│   generate/  프롬프트·스타일·결과 (imagePrompt.builder)     │
│   visuals/   80속성 (조명·색채·구도…)                      │
│   publishing/ 인스타 게시·스케줄 (옵션 기능)                │
└───────────────┬─────────────────────────────────────────┘
                │
        Postgres · tmp/(미디어) · 외부 API
```

원칙: **엔진은 안 건드린다.** PRODUCT LAYER가 엔진을 감싸 user_id·크레딧·양식을 입힌다.

---

## 2. 핵심 개념 3종

### Subject (입력 주체)
| 필드 | 설명 |
|---|---|
| type | `face` (인플루언서) \| `product` (쇼핑몰) |
| reference_image_ids[] | 업로드한 셀카/제품 컷 (Nano Banana 레퍼런스로 사용) |
| thumbnail | 대표 썸네일 |
> 엔진의 `referenceImagePath` / `characters.reference_image_url`에 그대로 연결.

### Recipe (양식 = 우리 자산)
프롬프트 통문장이 아니라 **레시피(슬롯 채운 설정)**. DB 행으로 저장 → 마지막에 시드.
```jsonc
{
  "id": "uuid",
  "mode": "influencer",            // influencer | shopping
  "category": "travel-mood",       // 스타일/트렌드/화보/착용/감성…
  "name": "Travel Mood — Golden Hour",
  "output_type": "image",          // image | reel
  "thumbnail": "/samples/travel-golden.jpg",
  "credit_cost": 2,
  "config": {
    "style_preset": "Film",        // 기존 style_presets 참조
    "scenes": [                     // 후보 다양성 (SCENE_VARIATIONS 형태)
      { "scene": "sandy beach at golden hour", "pose": "walking, candid" },
      { "scene": "rooftop terrace, city skyline", "pose": "leaning on railing" }
    ],
    "attribute_ids": ["lighting:golden_hour", "color:film_kodak", "composition:rule_of_thirds"],
    "aspect_ratio": "4:5",
    "count": 4,
    // reel 전용
    "motion_prompt": "gentle camera push-in, hair moving in breeze",
    "duration": "5"
  }
}
```
3단 공급:
1. **큐레이션 레시피** (손으로 30~40종) — 해자
2. **조합 엔진** (preset×scene×attr 자동 변형) — 기존 코드
3. **Claude 자동 확장** (롱테일/커스텀) — `claudeCharacter.provider` 패턴

### Render Job (실행)
`subject × recipe → N outputs`. 상태머신 + 크레딧 차감.
`pending → running → succeeded|failed`. 결과는 기존 `image_assets`/`video_assets` 재사용 + `render_jobs`로 묶음.

---

## 3. 데이터 모델 (신규 테이블)

```sql
-- 유저
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,                       -- 소셜로그인 시 NULL 가능
  oauth_provider VARCHAR(30),               -- google 등
  display_name  VARCHAR(100),
  plan          VARCHAR(30) NOT NULL DEFAULT 'free',  -- free|creator|brand
  credits       INT NOT NULL DEFAULT 0,     -- 현재 잔액(빠른 조회용)
  status        VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 크레딧 원장 (감사/충전/차감 이력)
CREATE TABLE credit_ledger (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  delta       INT NOT NULL,                 -- +충전 / -차감
  reason      VARCHAR(50) NOT NULL,         -- purchase|render_image|render_reel|signup_bonus|refund
  ref_id      UUID,                         -- render_job_id 또는 stripe_payment_id
  balance_after INT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 결제 (Stripe)
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  stripe_session_id VARCHAR(200),
  amount_usd      DECIMAL(10,2) NOT NULL,
  credits_granted INT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending|paid|failed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 입력 주체 (얼굴/제품)
CREATE TABLE subjects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  type          VARCHAR(20) NOT NULL,       -- face | product
  name          VARCHAR(100) NOT NULL,
  reference_image_urls TEXT[] NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,
  metadata      JSONB DEFAULT '{}',         -- 누끼 여부, 원본 등
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subjects_user ON subjects(user_id);

-- 양식 카탈로그 (큐레이션 자산)
CREATE TABLE recipes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode         VARCHAR(20) NOT NULL,        -- influencer | shopping
  category     VARCHAR(50) NOT NULL,
  name         VARCHAR(120) NOT NULL,
  output_type  VARCHAR(20) NOT NULL,        -- image | reel
  thumbnail_url TEXT,
  credit_cost  INT NOT NULL DEFAULT 1,
  config       JSONB NOT NULL,              -- 위 Recipe.config
  is_active    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recipes_mode ON recipes(mode, is_active);

-- 실행 잡 (제품 레이어가 엔진 잡을 묶음)
CREATE TABLE render_jobs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  subject_id     UUID NOT NULL REFERENCES subjects(id),
  recipe_id      UUID NOT NULL REFERENCES recipes(id),
  output_type    VARCHAR(20) NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending',
  output_image_ids UUID[] DEFAULT '{}',     -- image_assets 참조
  output_video_ids UUID[] DEFAULT '{}',     -- video_assets 참조
  credits_charged INT NOT NULL DEFAULT 0,
  error          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ
);
CREATE INDEX idx_render_jobs_user ON render_jobs(user_id);
CREATE INDEX idx_render_jobs_status ON render_jobs(status);
```
> 기존 `characters/image_assets/video_assets/generation_jobs/style_presets/visual_attributes`는 **그대로 재사용**. 신규는 위 6개 + 시드.

---

## 4. API 라우트

### 신규
```
POST   /api/auth/register          이메일 가입
POST   /api/auth/login             로그인 → JWT
GET    /api/auth/me                현재 유저+크레딧

GET    /api/billing/plans          요금제/크레딧팩
POST   /api/billing/checkout       Stripe Checkout 세션 생성
POST   /api/billing/webhook        Stripe 결제완료 → 크레딧 적립
GET    /api/billing/wallet         잔액+원장

POST   /api/subjects               얼굴/제품 업로드 (multer) → (제품이면 누끼)
GET    /api/subjects               내 subject 목록
DELETE /api/subjects/:id

GET    /api/recipes?mode=influencer    양식 카탈로그(공개)
GET    /api/recipes/:id

POST   /api/studio/render          {subjectId, recipeId} → 크레딧 검사·차감·잡 생성
GET    /api/studio/jobs            내 렌더 잡 목록
GET    /api/studio/jobs/:id        잡 상태/결과 폴링
GET    /api/studio/gallery         완료 결과물 갤러리
```

### 재사용 (내부)
`studio.service` → `imageGeneration.service` / `videoGeneration.service` / `generate` / `styleRepo.applyStyle` / `imagePrompt.builder`.

### 미들웨어
`authMiddleware` (JWT 검증 → req.user) — `/api/subjects`, `/api/studio`, `/api/billing/*`(webhook 제외)에 적용.

---

## 5. 생성 흐름 (studio.render)

```
1. authMiddleware → req.user
2. recipe = recipes.findById(recipeId)
3. cost = recipe.credit_cost ; user.credits >= cost 검사 (부족 → 402)
4. render_job 생성(status=pending), credit_ledger(-cost), users.credits 차감 (트랜잭션)
5. subject.reference_image_urls → referenceImagePath
6. prompt 조립:
     styleRepo.applyStyle(recipe.config.style_preset, basePrompt)
     + scenes/attributes (imagePrompt.builder 패턴)
     + SAFETY_* 자동
7. output_type == image:
     imageGeneration.service.generate({prompt, referenceImagePath, count, provider:nano-banana})
   output_type == reel:
     이미지 1장 생성 → videoGeneration.service (motion_prompt)
8. 결과 → image_assets/video_assets 저장, render_job.output_*_ids 채움, status=succeeded
9. 실패 시 status=failed + 크레딧 환불(credit_ledger +cost)
```
> 모드 A 차이: subject.type=product → 6단계 프롬프트가 "제품을 연출 씬에 배치" 템플릿 사용, 업로드 시 누끼 선처리.

---

## 6. 프론트 페이지 (public/)

| 파일 | 역할 |
|---|---|
| `landing.html` | 마케팅 랜딩 (영어), CTA→가입 |
| `saas-login.html` | 로그인/가입 |
| `app.html` (대시보드) | 모드 선택(인플루언서/쇼핑몰), 내 subject·갤러리 진입 |
| `studio.html` | ① subject 업로드/선택 → ② 양식 갤러리에서 recipe 클릭 → ③ 생성 → ④ 결과 |
| `gallery.html` | 결과물 보관함·다운로드 |
| `billing.html` | 크레딧 충전(Stripe), 잔액·이력 |
> 기존 `index.html`(관리자 생성기)·`character.html`·`accounts.html` 등은 **내부 운영툴**로 유지 (양식 큐레이션·QA에 사용).

---

## 7. 크레딧 / 요금 (원가 기반)

원가(실측): 이미지 4장 ≈ $0.16 / 5초 릴스 ≈ $0.25.

| 액션 | 크레딧 | 비고 |
|---|---|---|
| 이미지 세트(4장) | 2 | |
| 릴스(5초) | 6 | 원가 6배 반영 |

| 플랜 | 월 | 제공 크레딧 |
|---|---|---|
| Free | $0 | 가입 보너스 10 (체험) |
| Creator | $19 | 200 |
| Brand | $79 | 1000 + 상업 라이선스 |
> 1 크레딧 ≈ 마진 포함 단가. 초과분 크레딧팩 별도 판매(혼합 모델).

---

## 8. 디렉터리 추가 (기존 패턴 그대로)

```
src/
  auth/        auth.route.js  auth.controller.js  auth.service.js  user.repository.js  authMiddleware.js
  billing/     billing.route.js  stripe.client.js  credit.repository.js  payment.repository.js
  subjects/    subject.route.js  subject.controller.js  subject.repository.js
               providers/bgRemoval.provider.js   (fal BiRefNet 등)
  recipes/     recipe.route.js  recipe.repository.js  seeds/recipes.influencer.js  seeds/recipes.shopping.js
  studio/      studio.route.js  studio.controller.js  studio.service.js  renderJob.repository.js
src/db/migrate.js   ← 위 6개 테이블 + 시드 추가
public/      landing.html saas-login.html app.html studio.html gallery.html billing.html
```

---

## 9. 출시 범위 vs 패스트팔로우

| 출시(목) | 이후 |
|---|---|
| 모드 B 이미지 + 릴스 베타 | 착용샷(가상피팅) |
| 모드 A 화보·감성샷 | 트렌드 포맷 자동 업데이트 |
| 셀카/제품 1장 (Nano Banana) | LoRA 고일관성 옵션 |
| Stripe 크레딧 | 인스타 자동게시 토글 |
| 영어 단일 + i18n 구조 | 다국어 |

---

## 10. 리스크 가드
- **영상 원가 폭주** → 크레딧 차감 + 실패 시 자동 환불(원장)
- **얼굴 초상권** → 본인 인증 체크박스, 결과물 워터마크(무료플랜), 약관
- **안전필터** → `SAFETY_NEGATIVE/POSITIVE` 항상 주입 (이미 구현)
- **API 의존** → 프로바이더 추상화(이미 멀티 프로바이더) 유지
```
