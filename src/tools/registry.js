/**
 * Tool Registry — 생성 툴(이미지·영상) 단일 정본.
 *
 * 소비처: generate.route(템플릿 tool → 프로바이더 라우팅), studio UI(툴 픽커),
 *         recipe 시드/recipeStore(template.tool 기본값·검증).
 *
 * 원칙: "잘나가는 툴을 폭넓게 등록(빌드)하되, 런칭 노출은 enabled로 큐레이션."
 *   - enabled:true  = 런칭 노출(유저 선택 가능)
 *   - enabled:false = 코드엔 있으나 숨김(준비·검증 후 플립)
 *
 * 비용은 여기서 중복 정의하지 않는다(단일소스 = src/credits/credit.service.js).
 *   - image: costKey → COSTS.imageModelSurcharge[costKey]
 *   - video: 길이(duration)로 videoCost() 산정 → costKey 불필요
 *
 * model = 실제 프로바이더 모델 id. provider = 어댑터 키(src/images|videos/providers).
 */

// controls = 툴별 생성 폼 스키마(정본). 스튜디오가 이걸로 컨트롤을 동적 렌더(Leonardo식 "툴마다 폼").
//   aspectRatio: string[]  (select; 첫 값 = 기본)   imageSize/resolution: string[] (해상도 티어 select)
//   duration: number[] (영상 길이 select; 's' 접미)  negative: bool (네거티브 입력)  audio: bool (오디오 토글)
//   → 새 컨트롤 타입은 스튜디오 renderer에 케이스 1개만 추가하면 됨. 새 '툴'은 여기 한 줄로 폼이 생김.
//
// 🖼 imageSlots = 툴별 "이미지 입력" 슬롯(정본). Custom에서 이미지추가 버튼 → 슬롯 팝오버로 노출(Leonardo식).
//   [{ key, label, hint, multi? }]  — 이미지툴=Reference(다중), 영상툴=Start/End frame 등 각 툴 지원에 맞게.
//   ⚠️ 규칙: 이미지를 입력으로 받는 새 툴은 반드시 imageSlots를 정의할 것(없으면 기본 'reference' 단일).
//     매핑은 generate 경로에서: reference→referenceImages, startFrame→sourceImage, endFrame→image_tail 등.
// Gemini 이미지 지원 비율 10종(2.5 Flash Image 프로덕션 기준). 순서=노출 우선(첫 값=기본). IG 피드 4:5 우선.
const IMG_ASPECTS = ['4:5', '1:1', '9:16', '3:4', '4:3', '16:9', '2:3', '3:2', '5:4', '21:9'];

const TOOLS = {
  // ── 이미지 ──
  'nano-banana-pro': {
    id: 'nano-banana-pro', label: 'Nano Banana Pro', type: 'image',
    provider: 'gemini', model: 'gemini-3-pro-image-preview',
    costKey: 'pro', enabled: true,
    controls: { aspectRatio: IMG_ASPECTS, imageSize: ['1K', '2K', '4K'], count: [1, 2, 3, 4, 5, 6, 7, 8], negative: true }, // 2K·4K=Pro 전용
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'References the visual style and composition of an image to influence the output.', multi: true }],
  },
  'nano-banana': {
    id: 'nano-banana', label: 'Nano Banana', type: 'image',
    provider: 'gemini', model: 'gemini-2.5-flash-image',
    costKey: 'flash', enabled: true,
    controls: { aspectRatio: IMG_ASPECTS, count: [1, 2, 3, 4, 5, 6, 7, 8], negative: true }, // flash=1K 고정(imageSize 없음)
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'References the visual style and composition of an image to influence the output.', multi: true }],
  },
  'gpt-image': {
    id: 'gpt-image', label: 'GPT Image', type: 'image',
    provider: 'openai', model: 'gpt-image-2',
    // (2026-10-13) 베이스 1차 — 노출. generate.route가 model 키(gpt-image-2)로 OpenAI 경로를 이미 탄다.
    costKey: 'gpt-image-2', enabled: true,
    controls: { aspectRatio: ['1:1', '3:4', '16:9', '9:16', '4:5'], count: [1, 2, 3, 4], negative: true },
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'Edits from your references (up to 16).', multi: true }],
  },
  'gpt-image-hd': {
    id: 'gpt-image-hd', label: 'GPT Image HD', type: 'image',
    provider: 'openai', model: 'gpt-image-2-high',
    costKey: 'gpt-image-2-high', enabled: false,
    controls: { aspectRatio: ['1:1', '3:4', '16:9'], negative: true },
  },
  'flux-pro': {
    id: 'flux-pro', label: 'Flux Pro', type: 'image',
    provider: 'replicate', model: 'black-forest-labs/flux-1.1-pro',
    costKey: null, enabled: false,
    controls: { aspectRatio: ['1:1', '3:4', '16:9', '9:16'], negative: true },
  },

  // (2026-10-13) 베이스 1차 — 외부 프로바이더 3종. generate.route의 runExternal 분기가 provider 키로 디스패치한다.
  //   costKey = credit.service IMG_CREDIT 키(원가 확정 전 pro 근사). 레퍼런스는 data URL로 넘긴다.
  'seedream': {
    id: 'seedream', label: 'Seedream 4.5', type: 'image',
    provider: 'seedream', model: 'fal-ai/bytedance/seedream/v4.5/text-to-image', editModel: 'fal-ai/bytedance/seedream/v4.5/edit', // 전체 엔드포인트 경로(어댑터가 그대로 쓴다)
    costKey: 'seedream', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3', '3:2', '2:3'], count: [1, 2, 3, 4] }, // negative 없음(스키마 미지원)
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'Edit mode with up to 10 references.', multi: true }],
  },
  'flux': {
    id: 'flux', label: 'FLUX dev', type: 'image',
    provider: 'fal', model: 'fal-ai/flux/dev',
    costKey: 'flux', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3'], count: [1, 2, 3, 4], negative: true }, // 텍스트→이미지만(레퍼런스 미지원)
  },
  'replicate': {
    id: 'replicate', label: 'FLUX 1.1 Pro', type: 'image',
    provider: 'replicate', model: 'black-forest-labs/flux-1.1-pro',
    costKey: 'replicate', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3'], count: [1, 2, 3, 4], negative: true }, // REPLICATE_MODEL로 교체 가능
  },

  // (2026-10-13) 베이스 1차 2차분 — 힉스필드 Image 메뉴 기준으로 "우리에 없던 모델" 추가. 모델 id는 전부 벤더 API 목록/fal 큐에서 실존 확인(10-13).
  //   gemini·openai 는 generate.route 의 기존 경로를 타되 모델 id만 여기 값(model)을 쓴다. fal 계열은 fal.provider(범용)이 model/editModel/sizing 을 읽는다.
  //   editModel = 레퍼런스가 있을 때 쓰는 편집 엔드포인트(없으면 텍스트 전용). sizing='aspect' = image_size 대신 aspect_ratio+resolution 을 받는 스키마(FLUX 3).
  //   costKey 는 전부 자리값(credit.service IMG_CREDIT) — 원가 확정 후 조정.
  'nano-banana-2.1': {
    id: 'nano-banana-2.1', label: 'Nano Banana 2.1', type: 'image',
    provider: 'gemini', model: 'gemini-nano-banana-2.1',
    costKey: 'nano-banana-2.1', enabled: true,
    controls: { aspectRatio: IMG_ASPECTS, count: [1, 2, 3, 4, 5, 6, 7, 8], negative: true }, // imageSize 지원 여부 미확인 → 1K 고정(flash 와 동일 취급)
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'References the visual style and composition of an image to influence the output.', multi: true }],
  },
  'gpt-image-2.5-sunburst': {
    id: 'gpt-image-2.5-sunburst', label: 'GPT Image 2.5 Sunburst', type: 'image',
    provider: 'openai', model: 'gpt-image-2.5-sunburst',
    costKey: 'gpt-image-2.5-sunburst', enabled: true,
    controls: { aspectRatio: ['1:1', '3:4', '16:9', '9:16', '4:5'], count: [1, 2, 3, 4], negative: true },
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'Edits from your references (up to 16).', multi: true }],
  },
  'gpt-image-2.5-flare': {
    id: 'gpt-image-2.5-flare', label: 'GPT Image 2.5 Flare', type: 'image',
    provider: 'openai', model: 'gpt-image-2.5-flare',
    costKey: 'gpt-image-2.5-flare', enabled: true,
    controls: { aspectRatio: ['1:1', '3:4', '16:9', '9:16', '4:5'], count: [1, 2, 3, 4], negative: true },
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'Edits from your references (up to 16).', multi: true }],
  },
  'seedream-5-pro': {
    id: 'seedream-5-pro', label: 'Seedream 5.0 Pro', type: 'image',
    provider: 'seedream', model: 'bytedance/seedream/v5/pro/text-to-image', editModel: 'bytedance/seedream/v5/pro/edit',
    costKey: 'seedream-5-pro', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3', '3:2', '2:3'], count: [1, 2, 3, 4] }, // negative 없음(스키마 미지원)
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'Edit mode with up to 10 references.', multi: true }],
  },
  'flux-2-pro': {
    id: 'flux-2-pro', label: 'FLUX.2 Pro', type: 'image',
    provider: 'fal', model: 'fal-ai/flux-2-pro', editModel: 'fal-ai/flux-2-pro/edit',
    costKey: 'flux-2-pro', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3'], count: [1, 2, 3, 4] }, // negative_prompt 스키마 없음
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'Edit from references.', multi: true }],
  },
  'flux-3': {
    id: 'flux-3', label: 'FLUX 3', type: 'image',
    provider: 'fal', model: 'blackforestlabs/flux-3/text-to-image', editModel: 'blackforestlabs/flux-3/edit-image', sizing: 'aspect',
    costKey: 'flux-3', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3', '3:2', '2:3', '21:9'], imageSize: ['1K', '2K', '4K'], count: [1, 2, 3, 4] },
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'Edit from references.', multi: true }],
  },
  'recraft': {
    id: 'recraft', label: 'Recraft V4.1', type: 'image',
    provider: 'fal', model: 'fal-ai/recraft/v4.1/text-to-image',
    costKey: 'recraft', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3'], count: [1, 2, 3, 4] }, // 텍스트 전용 · negative 없음
  },
  'z-image': {
    id: 'z-image', label: 'Z-Image', type: 'image',
    provider: 'fal', model: 'fal-ai/z-image/turbo',
    costKey: 'z-image', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3'], count: [1, 2, 3, 4] }, // 텍스트 전용(image-to-image 는 단일 image_url+strength 라 레퍼런스 슬롯과 뜻이 다름)
  },
  'grok-imagine': {
    id: 'grok-imagine', label: 'Grok Imagine 2.0', type: 'image',
    provider: 'xai', model: 'grok-imagine-image-2.0',
    costKey: 'grok-imagine', enabled: true, // XAI_API_KEY 없으면 목록에서 빠진다(isToolAvailable)
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3', '3:2', '2:3', '21:9'], imageSize: ['1K', '2K'], count: [1, 2, 3, 4] }, // 텍스트 전용 — edits(멀티파트)는 키 생기면 실측 후
  },
  'soul-cinema': {
    id: 'soul-cinema', label: 'Higgsfield Soul Cinema', type: 'image',
    provider: 'higgsfield', model: 'higgsfield-ai/soul/cinema', // 10-13 실생성 확인. 입력은 Soul 2 와 동일(카메라·렌즈 파라미터는 API 에 없음 — 앱 전용)
    costKey: 'soul', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '9:16', '16:9', '4:3', '3:4', '2:3', '3:2'], imageSize: ['720p', '1080p'], count: [1] },
  },
  // (2026-10-13) 업스케일 — 생성 툴이 아니라 "결과물 1장 → 더 큰 1장". type:'upscale' 로 따로 묶어 모델 목록엔 안 나오고
  //   tools API 의 upscale[] 로 나간다(메가메뉴 Upscale 기능 = 이게 비어 있지 않으면 live). 경로는 POST /api/generate/upscale.
  'topaz': {
    id: 'topaz', label: 'Topaz Upscale', type: 'upscale',
    provider: 'fal', model: 'fal-ai/topaz/upscale/image',
    costKey: 'upscale', enabled: true,
    controls: { upscaleFactor: [2, 4] }, // Topaz 'Standard V2' 고정 · 얼굴 보정 기본값(0.8) 그대로
    imageSlots: [{ key: 'source', label: 'Source image', hint: 'A result from your library.' }],
  },
  'soul': {
    id: 'soul', label: 'Higgsfield Soul 2', type: 'image',
    provider: 'higgsfield', model: 'higgsfield-ai/soul/v2/standard',
    costKey: 'soul', enabled: true, // HIGGSFIELD_API_KEY 없으면 목록에서 빠진다
    controls: { aspectRatio: ['1:1', '4:5', '9:16', '16:9', '4:3', '3:4', '2:3', '3:2'], imageSize: ['720p', '1080p'], count: [1] }, // 텍스트 전용(참조는 custom_reference_id=학습 캐릭터뿐)
  },

  // ── 영상 ──
  'kling': {
    id: 'kling', label: 'Kling 3.0', type: 'video',
    provider: 'kling', model: 'kling-v3',
    costKey: null, enabled: true, // 비디오 툴 런칭 노출(2026-06-21). ⚠️ 실제 생성은 KLING_ACCESS/SECRET_KEY 필요.
    // 라이브 async 경로 실배선. start=sourceImage, end=image_tail, audio=video-to-audio.
    controls: {
      duration: [5, 10],
      quality: [{ value: 'pro', label: 'Pro' }], // Standard(std) 미연결 — 숨김. Pro만 노출.
      aspectRatio: ['9:16', '1:1', '16:9'],
      audio: { type: 'toggle' },   // 효과음/배경음 합성(선택)
    },
    imageSlots: [
      { key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' },
      { key: 'endFrame', label: 'End frame', hint: 'Ending frame of the video' },
    ],
  },
  // (2026-10-13) 베이스 1차 — 영상 엔진 5종 노출. videoJob.service가 engine≠kling이면 src/videos/providers 어댑터로 제출·폴링한다.
  //   ⚠️ 비용은 엔진별 실원가 확정 전이라 전부 Kling 표(videoCost)를 공용으로 쓴다(placeholder, CLAUDE.md 가격 규칙).
  //   runway·minimax는 시작 프레임을 **공개 URL**로 받아야 해서 PUBLIC_URL이 필요하다(로컬에선 제출 실패 → 400 안내).
  'runway': {
    id: 'runway', label: 'Runway', type: 'video',
    provider: 'runway', model: 'gen4_turbo',
    costKey: null, enabled: true,
    controls: { duration: [5, 10], aspectRatio: ['9:16', '16:9', '1:1'] },
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }],
  },
  'veo': {
    id: 'veo', label: 'Veo 3.1', type: 'video',
    provider: 'veo', model: 'veo-3.1-generate-preview',
    costKey: null, enabled: true,
    controls: { duration: [4, 6, 8], aspectRatio: ['16:9', '9:16'], audio: { type: 'toggle' } }, // 내장 사운드(native)
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }],
  },
  'minimax': {
    id: 'minimax', label: 'MiniMax Hailuo 01', type: 'video',
    provider: 'minimax', model: 'video-01',
    costKey: null, enabled: true,
    controls: { duration: [6] },
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }],
  },
  'sora': {
    id: 'sora', label: 'Sora', type: 'video',
    provider: 'sora', model: 'sora-2',
    costKey: null, enabled: true,
    controls: { duration: [4, 8, 12], aspectRatio: ['9:16', '16:9', '1:1'] },
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }],
  },
  'seedance': {
    id: 'seedance', label: 'Seedance 2.0', type: 'video',
    provider: 'seedance', model: 'fal-ai/bytedance/seedance',
    costKey: null, enabled: true,
    controls: { duration: [5, 8, 10], aspectRatio: ['9:16', '16:9', '1:1'], resolution: ['720p', '1080p'] },
    imageSlots: [
      { key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' },
      { key: 'endFrame', label: 'End frame', hint: 'Ending frame of the video' },
    ],
  },

  // (2026-10-13) 영상 2차분 — 힉스필드 Video 메뉴 기준 "우리에 없던 모델". 전부 fal 큐 API(provider 'fal' → falVideo.provider, 키 FAL_API_KEY 공유).
  //   falInput = 엔드포인트별 필드 모양(어댑터 주석 참조). controls 의 허용값은 fal 검증 오류로 실측(10-13). 비용은 videoCost(길이) 공용 자리값.
  'seedance-2.5': {
    id: 'seedance-2.5', label: 'Seedance 2.5', type: 'video',
    provider: 'fal', model: 'bytedance/seedance-2.5/image-to-video',
    falInput: { image: 'image_url', duration: 'str', aspect: true, resolution: true, audio: 'generate_audio', endImage: 'end_image_url' },
    costKey: null, enabled: true,
    controls: { duration: [5, 8, 10, 15], aspectRatio: ['9:16', '16:9', '1:1'], resolution: ['720p', '1080p'], audio: { type: 'toggle' } }, // 길이 4~30 중 노출만 4종
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }, { key: 'endFrame', label: 'End frame', hint: 'Ending frame of the video' }],
  },
  'wan-3': {
    id: 'wan-3', label: 'Wan 3.0', type: 'video',
    provider: 'fal', model: 'alibaba/wan-3.0/image-to-video',
    falInput: { image: 'start_image_url', duration: 'int', aspect: true, resolution: true, audio: 'audio', endImage: 'end_image_url' },
    costKey: null, enabled: true,
    controls: { duration: [5, 10, 15], aspectRatio: ['9:16', '16:9', '1:1', '4:3', '3:4'], resolution: ['720p', '1080p'], audio: { type: 'toggle' } }, // 길이 ≤30
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }, { key: 'endFrame', label: 'End frame', hint: 'Ending frame of the video' }],
  },
  'hailuo-2.3': {
    id: 'hailuo-2.3', label: 'MiniMax Hailuo 2.3', type: 'video',
    provider: 'fal', model: 'fal-ai/minimax/hailuo-2.3/standard/image-to-video',
    falInput: { image: 'image_url', duration: 'str', extra: { prompt_optimizer: false } }, // 비율·해상도 필드 없음(standard = 768p 고정)
    costKey: null, enabled: true,
    controls: { duration: [6, 10] },
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }],
  },
  'minimax-h3': {
    id: 'minimax-h3', label: 'MiniMax H3', type: 'video',
    provider: 'fal', model: 'minimax/h3/image-to-video',
    falInput: { image: 'image_url', duration: 'int', resolution: true },
    costKey: null, enabled: true,
    controls: { duration: [5, 10, 15], resolution: ['768P', '2K'] }, // 480P·4K 도 받지만 노출 안 함(4K 는 원가 미확인)
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }],
  },
  'grok-video': {
    id: 'grok-video', label: 'Grok Imagine Video 1.5', type: 'video',
    provider: 'fal', model: 'xai/grok-imagine-video/image-to-video',
    falInput: { image: 'image_url', duration: 'int', aspect: true, resolution: true },
    costKey: null, enabled: true,
    controls: { duration: [6, 10, 15], aspectRatio: ['9:16', '16:9', '1:1', '3:4', '4:3'], resolution: ['480p', '720p'] },
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }],
  },
  'happyhorse': {
    id: 'happyhorse', label: 'HappyHorse 1.1', type: 'video',
    provider: 'fal', model: 'alibaba/happy-horse/v1.1/image-to-video',
    falInput: { image: 'image_url', duration: 'int', resolution: true }, // 비율 필드 없음(원본 비율 유지)
    costKey: null, enabled: true,
    controls: { duration: [5, 10, 15], resolution: ['720p', '1080p'] },
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }],
  },
  'flux-3-video': {
    id: 'flux-3-video', label: 'FLUX.3 Video', type: 'video',
    provider: 'fal', model: 'blackforestlabs/flux-3/image-to-video',
    falInput: { image: 'image_url', duration: 'int', aspect: true, resolution: true, audio: 'generate_audio' },
    costKey: null, enabled: true,
    controls: { duration: [5, 10, 15], aspectRatio: ['9:16', '16:9', '1:1', '3:4', '4:3'], resolution: ['720p', '1080p'], audio: { type: 'toggle' } }, // 길이 5~20
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }],
  },
  'gemini-omni': {
    id: 'gemini-omni', label: 'Gemini Omni Flash', type: 'video',
    provider: 'fal', model: 'fal-ai/gemini-omni-flash/image-to-video',
    falInput: { image: 'image_url', duration: 'int', aspect: true }, // 해상도 필드 없음 · 비율은 16:9·9:16 만
    costKey: null, enabled: true,
    controls: { duration: [5, 8, 10], aspectRatio: ['9:16', '16:9'] },
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }],
  },
};

// ── 키 유무 판정 (2026-10-13) ──
//   enabled는 "노출 의사", available은 "이 서버에 키가 있는가". 둘 다 참일 때만 목록에 나간다.
//   staging/prod처럼 키가 없는 환경에서 새 엔진이 선택지로 보였다가 503을 내는 사고를 막는다.
//   키 이름은 src/config/index.js의 zod 스키마와 같다. 프로바이더 모듈을 여기서 require하지 않는 이유:
//   registry는 시드·스튜디오·라우트가 두루 읽는 가벼운 정본이라 외부 SDK 로딩을 끌어오면 안 된다.
const PROVIDER_KEYS = {
  gemini: ['GEMINI_API_KEY'], openai: ['OPENAI_API_KEY'],
  fal: ['FAL_API_KEY'], seedream: ['FAL_API_KEY'], seedance: ['FAL_API_KEY'],
  replicate: ['REPLICATE_API_TOKEN'],
  xai: ['XAI_API_KEY'], higgsfield: ['HIGGSFIELD_API_KEY'],
  kling: ['KLING_ACCESS_KEY', 'KLING_SECRET_KEY'], runway: ['RUNWAY_API_KEY'], minimax: ['MINIMAX_API_KEY'],
  veo: ['GEMINI_API_KEY'], sora: ['OPENAI_API_KEY'],
};
/** 이 서버에 해당 프로바이더의 키가 전부 있는가 */
function isToolAvailable(tool) {
  const keys = PROVIDER_KEYS[tool && tool.provider] || [];
  if (!keys.length) return true; // 키가 필요 없는 툴(없음) — 보수적으로 통과
  return keys.every((k) => !!process.env[k]);
}

const DEFAULT_IMAGE_TOOL = 'nano-banana-pro';
const DEFAULT_VIDEO_TOOL = 'kling';

/** id로 툴 조회 (없으면 null) */
function getTool(id) {
  return TOOLS[id] || null;
}

/** output 타입별 기본 툴 id ('reel'|'video' → 영상, 그 외 → 이미지) */
function defaultToolFor(type) {
  return (type === 'video' || type === 'reel') ? DEFAULT_VIDEO_TOOL : DEFAULT_IMAGE_TOOL;
}

/** 유효 툴 id 보장 — 모르는/빈 id는 type 기본값으로 폴백 */
function resolveToolId(id, type) {
  return (id && TOOLS[id]) ? id : defaultToolFor(type);
}

/** 목록 (옵션: type 필터, enabledOnly, availableOnly=키 있는 것만) */
function listTools({ type, enabledOnly = false, availableOnly = false } = {}) {
  return Object.values(TOOLS)
    .filter((t) => !type || t.type === type)
    .filter((t) => !enabledOnly || t.enabled)
    .filter((t) => !availableOnly || isToolAvailable(t));
}

module.exports = {
  TOOLS,
  DEFAULT_IMAGE_TOOL,
  DEFAULT_VIDEO_TOOL,
  getTool,
  defaultToolFor,
  resolveToolId,
  listTools,
  isToolAvailable,
};
