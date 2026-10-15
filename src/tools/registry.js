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
//   (2026-10-13) extras = 엔진 고유 옵션 전부(벤더 스키마 실측). [{ key, label, hint?, values?[]|type:'toggle'|'number'(min,max,step)|'text', default? }]
//     → image.html·video.html 이 자동 렌더, generate.route.pickExtras 가 선언된 키·값만 통과, 어댑터가 요청 본문에 합친다.
//   durationRange{min,max} = 영상 길이 직접 입력 범위. refModel/refInput = 레퍼런스 이미지가 있을 때 쓰는 reference-to-video 엔드포인트. t2vModel = 시작 프레임 없을 때.
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
    controls: { aspectRatio: IMG_ASPECTS, imageSize: ['1K', '2K', '4K'], count: [1, 2, 3, 4, 5, 6, 7, 8], negative: true }, // (10-13 구글 문서) 2.5 Flash 도 1K/2K/4K
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'References the visual style and composition of an image to influence the output.', multi: true }],
  },
  'gpt-image': {
    id: 'gpt-image', label: 'GPT Image', type: 'image',
    provider: 'openai', model: 'gpt-image-2',
    // (2026-10-13) 베이스 1차 — 노출. generate.route가 model 키(gpt-image-2)로 OpenAI 경로를 이미 탄다.
    costKey: 'gpt-image-2', enabled: true,
    controls: { aspectRatio: ['1:1', '3:4', '16:9', '9:16', '4:5'], count: [1, 2, 3, 4], negative: true,
      extras: [{ key: 'quality', label: 'Quality', values: ['medium', 'low', 'high', 'auto'] }, { key: 'background', label: 'Background', values: ['auto', 'transparent', 'opaque'], hint: 'transparent = PNG with alpha' }, { key: 'moderation', label: 'Moderation', values: ['auto', 'low'] }] },
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
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3', '3:2', '2:3'], count: [1, 2, 3, 4], extras: [{ key: 'seed', label: 'Seed', type: 'number', min: 0, max: 2147483647, hint: 'blank = random' }] }, // negative 없음(스키마 미지원)
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'Edit mode with up to 10 references.', multi: true }],
  },
  'flux': {
    id: 'flux', label: 'FLUX dev', type: 'image',
    provider: 'fal', model: 'fal-ai/flux/dev',
    costKey: 'flux', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3'], count: [1, 2, 3, 4], negative: true,
      extras: [{ key: 'guidance_scale', label: 'Guidance', type: 'number', min: 1, max: 20, step: 0.5, default: 3.5 }, { key: 'num_inference_steps', label: 'Steps', type: 'number', min: 1, max: 50, default: 28 }, { key: 'acceleration', label: 'Speed', values: ['none', 'regular', 'high'] }, { key: 'seed', label: 'Seed', type: 'number', min: 0, max: 2147483647, hint: 'blank = random' }] }, // 텍스트→이미지만(레퍼런스 미지원)
  },
  'replicate': {
    id: 'replicate', label: 'FLUX 1.1 Pro', type: 'image',
    provider: 'replicate', model: 'black-forest-labs/flux-1.1-pro',
    costKey: 'replicate', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3', '3:2', '2:3', '5:4'], count: [1, 2, 3, 4], negative: true,
      extras: [{ key: 'safety_tolerance', label: 'Safety tolerance', type: 'number', min: 1, max: 6, default: 2, hint: '1 strict · 6 permissive' }, { key: 'prompt_upsampling', label: 'Prompt upsampling', type: 'toggle', hint: 'Engine rewrites the prompt' }, { key: 'seed', label: 'Seed', type: 'number', min: 0, max: 2147483647, hint: 'blank = random' }] }, // REPLICATE_MODEL로 교체 가능
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'One image — FLUX Redux style/composition guide (image_prompt).' }], // 첫 장만 쓴다
  },

  // (2026-10-13) 베이스 1차 2차분 — 힉스필드 Image 메뉴 기준으로 "우리에 없던 모델" 추가. 모델 id는 전부 벤더 API 목록/fal 큐에서 실존 확인(10-13).
  //   gemini·openai 는 generate.route 의 기존 경로를 타되 모델 id만 여기 값(model)을 쓴다. fal 계열은 fal.provider(범용)이 model/editModel/sizing 을 읽는다.
  //   editModel = 레퍼런스가 있을 때 쓰는 편집 엔드포인트(없으면 텍스트 전용). sizing='aspect' = image_size 대신 aspect_ratio+resolution 을 받는 스키마(FLUX 3).
  //   costKey 는 전부 자리값(credit.service IMG_CREDIT) — 원가 확정 후 조정.
  'nano-banana-2.1': {
    id: 'nano-banana-2.1', label: 'Nano Banana 2.1', type: 'image',
    provider: 'gemini', model: 'gemini-nano-banana-2.1',
    costKey: 'nano-banana-2.1', enabled: true,
    controls: { aspectRatio: IMG_ASPECTS, imageSize: ['1K', '2K', '4K'], count: [1, 2, 3, 4, 5, 6, 7, 8], negative: true,
      extras: [{ key: 'thinking_level', label: 'Thinking', values: ['medium', 'minimal', 'high'], hint: 'More thinking = slower, better layout' }] }, // (10-13 구글 문서) 1K/2K/4K · 참조 최대 17장 · thinkingConfig.thinkingLevel 실측 통과
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'References the visual style and composition of an image to influence the output.', multi: true }],
  },
  'gpt-image-2.5-sunburst': {
    id: 'gpt-image-2.5-sunburst', label: 'GPT Image 2.5 Sunburst', type: 'image',
    provider: 'openai', model: 'gpt-image-2.5-sunburst',
    costKey: 'gpt-image-2.5-sunburst', enabled: true,
    controls: { aspectRatio: ['1:1', '3:4', '16:9', '9:16', '4:5'], count: [1, 2, 3, 4], negative: true,
      extras: [{ key: 'quality', label: 'Quality', values: ['medium', 'low', 'high', 'xhigh', 'max', 'auto'] }, { key: 'background', label: 'Background', values: ['auto', 'transparent', 'opaque'], hint: 'transparent = PNG with alpha' }, { key: 'moderation', label: 'Moderation', values: ['auto', 'low'] }, { key: 'input_fidelity', label: 'Reference fidelity', values: ['low', 'high'], hint: 'edits only' }] },
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'Edits from your references (up to 16).', multi: true }],
  },
  'gpt-image-2.5-flare': {
    id: 'gpt-image-2.5-flare', label: 'GPT Image 2.5 Flare', type: 'image',
    provider: 'openai', model: 'gpt-image-2.5-flare',
    costKey: 'gpt-image-2.5-flare', enabled: true,
    controls: { aspectRatio: ['1:1', '3:4', '16:9', '9:16', '4:5'], count: [1, 2, 3, 4], negative: true,
      extras: [{ key: 'quality', label: 'Quality', values: ['medium', 'low', 'high', 'xhigh', 'max', 'auto'] }, { key: 'background', label: 'Background', values: ['auto', 'transparent', 'opaque'], hint: 'transparent = PNG with alpha' }, { key: 'moderation', label: 'Moderation', values: ['auto', 'low'] }, { key: 'input_fidelity', label: 'Reference fidelity', values: ['low', 'high'], hint: 'edits only' }] },
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'Edits from your references (up to 16).', multi: true }],
  },
  'seedream-5-pro': {
    id: 'seedream-5-pro', label: 'Seedream 5.0 Pro', type: 'image',
    provider: 'seedream', model: 'bytedance/seedream/v5/pro/text-to-image', editModel: 'bytedance/seedream/v5/pro/edit',
    costKey: 'seedream-5-pro', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3', '3:2', '2:3'], count: [1, 2, 3, 4], extras: [{ key: 'enhance_prompt_mode', label: 'Prompt mode', values: ['standard', 'fast'], hint: 'standard = quality first' }] }, // negative 없음 · seed 없음(v5 스키마)
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'Edit mode with up to 10 references.', multi: true }],
  },
  'flux-2-pro': {
    id: 'flux-2-pro', label: 'FLUX.2 Pro', type: 'image',
    provider: 'fal', model: 'fal-ai/flux-2-pro', editModel: 'fal-ai/flux-2-pro/edit',
    costKey: 'flux-2-pro', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3'], count: [1, 2, 3, 4],
      extras: [{ key: 'safety_tolerance', label: 'Safety tolerance', values: ['2', '1', '3', '4', '5'], hint: '1 strict · 5 permissive' }, { key: 'seed', label: 'Seed', type: 'number', min: 0, max: 2147483647, hint: 'blank = random' }] }, // negative_prompt 스키마 없음
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'Edit from references.', multi: true }],
  },
  'flux-3': {
    id: 'flux-3', label: 'FLUX 3', type: 'image',
    provider: 'fal', model: 'blackforestlabs/flux-3/text-to-image', editModel: 'blackforestlabs/flux-3/edit-image', sizing: 'aspect',
    costKey: 'flux-3', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3', '3:2', '2:3', '21:9', '5:4', '5:7', '7:5', '2:1', '1:2'], imageSize: ['1K', '2K', '4K'], count: [1, 2, 3, 4],
      extras: [{ key: 'enable_prompt_expansion', label: 'Prompt expansion', type: 'toggle', hint: 'Engine expands the prompt' }, { key: 'safety_tolerance', label: 'Safety tolerance', type: 'number', min: 0, max: 4, default: 2, hint: '0 strict · 4 permissive' }] },
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'Up to 10 references (image 1…10 in prompt).', multi: true }],
  },
  'recraft': {
    id: 'recraft', label: 'Recraft V4.1', type: 'image',
    provider: 'fal', model: 'fal-ai/recraft/v4.1/text-to-image',
    costKey: 'recraft', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3'], count: [1, 2, 3, 4] }, // 텍스트 전용 · negative 없음
  },
  'z-image': {
    id: 'z-image', label: 'Z-Image', type: 'image',
    provider: 'fal', model: 'fal-ai/z-image/turbo', editModel: 'fal-ai/z-image/turbo/image-to-image', editSingle: true, // i2i 는 image_url 한 장 + strength
    costKey: 'z-image', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3'], count: [1, 2, 3, 4],
      extras: [{ key: 'acceleration', label: 'Speed', values: ['regular', 'none', 'high'] }, { key: 'num_inference_steps', label: 'Steps', type: 'number', min: 1, max: 8, default: 8 }, { key: 'enable_prompt_expansion', label: 'Prompt expansion', type: 'toggle', hint: 'Costs more' }, { key: 'strength', label: 'Image strength', type: 'number', min: 0.1, max: 1, step: 0.05, default: 0.6, hint: 'image-to-image only' }, { key: 'seed', label: 'Seed', type: 'number', min: 0, max: 2147483647, hint: 'blank = random' }] },
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'One image — image-to-image with strength.' }],
  },
  'grok-imagine': {
    id: 'grok-imagine', label: 'Grok Imagine 2.0', type: 'image',
    provider: 'xai', model: 'grok-imagine-image-2.0',
    costKey: 'grok-imagine', enabled: true, // XAI_API_KEY 없으면 목록에서 빠진다(isToolAvailable)
    controls: { aspectRatio: ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3', '3:2', '2:3', '21:9', '2:1', '1:2', '20:9', '9:20'], imageSize: ['1K', '2K'], count: [1, 2, 3, 4],
      extras: [{ key: 'quality', label: 'Quality', values: ['auto', 'low', 'medium'] }] },
    imageSlots: [{ key: 'reference', label: 'Image Reference', hint: 'Up to 5 images — /v1/images/edits.', multi: true }], // (10-13 실측) edits 는 JSON images:[{url}]
  },
  'soul-cinema': {
    id: 'soul-cinema', label: 'Higgsfield Soul Cinema', type: 'image',
    provider: 'higgsfield', model: 'higgsfield-ai/soul/cinema', // 10-13 실생성 확인. 입력은 Soul 2 와 동일(카메라·렌즈 파라미터는 API 에 없음 — 앱 전용)
    costKey: 'soul', enabled: true,
    controls: { aspectRatio: ['1:1', '4:5', '9:16', '16:9', '4:3', '3:4', '2:3', '3:2'], imageSize: ['720p', '1080p'], count: [1, 2, 3, 4],
      extras: [{ key: 'enhance_prompt', label: 'Enhance prompt', type: 'toggle', hint: 'Higgsfield rewrites the prompt' }, { key: 'seed', label: 'Seed', type: 'number', min: 1, max: 1000000, hint: 'blank = random' }] },
  },
  // (2026-10-13) 업스케일 — 생성 툴이 아니라 "결과물 1장 → 더 큰 1장". type:'upscale' 로 따로 묶어 모델 목록엔 안 나오고
  //   tools API 의 upscale[] 로 나간다. (2026-10-16) 실행 경로는 Editor 의 upscale op(POST /api/generate/edit) 하나 — 직결 /upscale 은 걷어냄.
  'topaz': {
    id: 'topaz', label: 'Topaz Upscale', type: 'upscale',
    provider: 'fal', model: 'fal-ai/topaz/upscale/image',
    costKey: 'upscale', enabled: true,
    controls: { upscaleFactor: [2, 4] }, // Topaz 'Standard V2' 고정 · 얼굴 보정 기본값(0.8) 그대로
    imageSlots: [{ key: 'source', label: 'Source image', hint: 'A result from your library.' }],
  },
  // (2026-10-14) 배경 제거 — type:'removebg', tools API removebg[]. (2026-10-16) 실행은 Editor 의 removebg op(POST /api/generate/edit). BiRefNet v2 는 제품 누끼용 기본값으로 고정.
  'birefnet': {
    id: 'birefnet', label: 'Remove background', type: 'removebg',
    provider: 'fal', model: 'fal-ai/birefnet/v2',
    costKey: 'removebg', enabled: true,
    controls: {},
    imageSlots: [{ key: 'source', label: 'Source image', hint: 'A result from your library.' }],
  },
  // (2026-10-16) 지우기 전용 — 프롬프트 없는 마스크 지우개. FLUX Fill 은 라벨 위를 지우면 가짜 글자를 그려 넣어서(dev 실측) Erase 1순위는 이것.
  'bria-eraser': {
    id: 'bria-eraser', label: 'Bria Eraser', type: 'edit',
    provider: 'fal', model: 'fal-ai/bria/eraser',
    costKey: 'bria-eraser', enabled: true,
    controls: {},
    imageSlots: [{ key: 'source', label: 'Source image' }, { key: 'mask', label: 'Mask' }],
  },
  // (2026-10-16) 마스크 채우기 — type:'edit' 라 생성 모델 목록엔 안 나오고 Editor(imageEdit.engine)만 쓴다. Inpaint·Erase·Expand 1순위(진짜 마스크).
  'flux-fill': {
    id: 'flux-fill', label: 'FLUX Fill', type: 'edit',
    provider: 'fal', model: 'fal-ai/flux-pro/v1/fill',
    costKey: 'flux-fill', enabled: true,
    controls: {},
    imageSlots: [{ key: 'source', label: 'Source image' }, { key: 'mask', label: 'Mask' }],
  },
  'soul': {
    id: 'soul', label: 'Higgsfield Soul 2', type: 'image',
    provider: 'higgsfield', model: 'higgsfield-ai/soul/v2/standard',
    costKey: 'soul', enabled: true, // HIGGSFIELD_API_KEY 없으면 목록에서 빠진다
    controls: { aspectRatio: ['1:1', '4:5', '9:16', '16:9', '4:3', '3:4', '2:3', '3:2'], imageSize: ['720p', '1080p'], count: [1, 2, 3, 4],
      extras: [{ key: 'enhance_prompt', label: 'Enhance prompt', type: 'toggle', hint: 'Higgsfield rewrites the prompt' }, { key: 'seed', label: 'Seed', type: 'number', min: 1, max: 1000000, hint: 'blank = random' }] }, // 텍스트 전용(참조는 custom_reference_id=학습 캐릭터뿐)
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
      // (2026-10-13) Kling v3 API 실측: cfg_scale·negative_prompt 통과, camera_control 은 "not supported by the current model".
      extras: [{ key: 'cfg_scale', label: 'Prompt adherence', type: 'number', min: 0, max: 1, step: 0.05, default: 0.5, hint: 'cfg_scale' }, { key: 'negative_prompt', label: 'Negative', type: 'text', max: 500, default: 'ugly, deformed, blurry, static' }],
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
    // (2026-10-13) Runway 검증 실측: ratio ∈ 1280:720·720:1280·1104:832·832:1104·960:960·1584:672 (어댑터가 비율→ratio 로 바꾼다) · seed ≥0
    controls: { duration: [5, 10], aspectRatio: ['9:16', '16:9', '1:1', '4:3', '3:4', '21:9'], extras: [{ key: 'seed', label: 'Seed', type: 'number', min: 0, max: 4294967295, hint: 'blank = random' }] },
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }],
  },
  'veo': {
    id: 'veo', label: 'Veo 3.1', type: 'video',
    provider: 'veo', model: 'veo-3.1-generate-preview',
    costKey: null, enabled: true,
    // (2026-10-13 구글 문서) 1080p 는 8초만 · 참조 이미지 최대 3장(8초 고정) · lastFrame = 끝프레임
    controls: { duration: [4, 6, 8], aspectRatio: ['16:9', '9:16'], resolution: ['720p', '1080p'], audio: { type: 'toggle' },
      extras: [{ key: 'negativePrompt', label: 'Negative', type: 'text', max: 500 }, { key: 'seed', label: 'Seed', type: 'number', min: 0, max: 4294967295, hint: 'blank = random' }] }, // 내장 사운드(native)
    refModel: 'veo-3.1-generate-preview', refInput: { max: 3 }, // 어댑터가 instances.referenceImages 로 넣는다
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }, { key: 'endFrame', label: 'End frame', hint: 'Last frame (interpolation)' }, { key: 'reference', label: 'Reference', hint: 'Up to 3 style/content references', multi: true }],
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
    // (2026-10-13) enabled:false — OpenAI 문서: "Sora 2 models and Videos API were shut down on September 24, 2026". 어댑터·엔트리는 보존(사용자 지시로 숨김만).
    costKey: null, enabled: false,
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
    // (2026-10-13) 사용자: "툴이 주는 옵션은 다 연다" → duration 칩은 빠른 선택, durationRange 가 실제 허용폭(fal 검증 실측). extras = 엔진 고유 옵션(어댑터가 그대로 전달).
    refModel: 'bytedance/seedance-2.5/reference-to-video', refInput: { refs: 'image_urls', max: 9 }, t2vModel: 'bytedance/seedance-2.5/text-to-video',
    controls: { duration: [5, 8, 10, 15], durationRange: { min: 4, max: 30 }, aspectRatio: ['9:16', '16:9', '1:1', '4:3', '3:4', '21:9'], resolution: ['720p', '1080p', '480p'], audio: { type: 'toggle' },
      extras: [{ key: 'bitrate_mode', label: 'Bitrate', values: ['standard', 'high'] }, { key: 'draft', label: 'Draft', hint: 'Cheap 480p preview', type: 'toggle' }, { key: 'codec', label: 'Codec', values: ['auto', 'H264', 'H265'] }, { key: 'seed', label: 'Seed', type: 'number', min: 0, max: 2147483647, hint: 'reference mode only' }] },
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }, { key: 'endFrame', label: 'End frame', hint: 'Ending frame of the video' }, { key: 'reference', label: 'Reference', hint: 'Up to 9 images — @Image1… in the prompt. Replaces the start frame.', multi: true }],
  },
  'wan-3': {
    id: 'wan-3', label: 'Wan 3.0', type: 'video',
    provider: 'fal', model: 'alibaba/wan-3.0/image-to-video',
    falInput: { image: 'start_image_url', duration: 'int', aspect: true, resolution: true, audio: 'audio', endImage: 'end_image_url' },
    costKey: null, enabled: true,
    refModel: 'alibaba/wan-3.0/reference-to-video', refInput: { refs: 'reference_image_urls', max: 10 }, t2vModel: 'alibaba/wan-3.0/text-to-video',
    controls: { duration: [5, 10, 15], durationRange: { min: 2, max: 30 }, aspectRatio: ['9:16', '16:9', '1:1', '4:3', '3:4'], resolution: ['720p', '1080p', '480p'], audio: { type: 'toggle' },
      extras: [{ key: 'enable_prompt_expansion', label: 'Prompt expansion', hint: 'Engine rewrites the prompt', type: 'toggle', default: true }, { key: 'enable_thinking', label: 'Thinking', hint: 'Reason before generating (slower)', type: 'toggle' }, { key: 'seed', label: 'Seed', type: 'number', min: 0, max: 2147483647, hint: 'blank = random' }] }, // 길이 ≤30(하한 미확인 → 2)
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }, { key: 'endFrame', label: 'End frame', hint: 'Ending frame of the video' }, { key: 'reference', label: 'Reference', hint: 'Up to 10 images. Replaces the start frame.', multi: true }],
  },
  'hailuo-2.3': {
    id: 'hailuo-2.3', label: 'MiniMax Hailuo 2.3', type: 'video',
    provider: 'fal', model: 'fal-ai/minimax/hailuo-2.3/standard/image-to-video',
    falInput: { image: 'image_url', duration: 'str' }, // 비율·해상도 필드 없음(standard = 768p 고정)
    costKey: null, enabled: true,
    controls: { duration: [6, 10], extras: [{ key: 'prompt_optimizer', label: 'Prompt optimizer', type: 'toggle', hint: 'MiniMax rewrites the prompt' }] },
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }],
  },
  'minimax-h3': {
    id: 'minimax-h3', label: 'MiniMax H3', type: 'video',
    provider: 'fal', model: 'minimax/h3/image-to-video',
    falInput: { image: 'image_url', duration: 'int', resolution: true, endImage: 'end_image_url' },
    refModel: 'minimax/h3/reference-to-video', refInput: { refs: 'reference_image_urls', max: 8 }, t2vModel: 'minimax/h3/text-to-video',
    costKey: null, enabled: true,
    controls: { duration: [5, 10, 15], durationRange: { min: 5, max: 15 }, resolution: ['768P', '2K', '4K', '480P'],
      extras: [{ key: 'prompt_expansion_mode', label: 'Prompt expansion', values: ['balanced', 'disabled', 'fast', 'quality'] }, { key: 'seed', label: 'Seed', type: 'number', min: 0, max: 2147483647, hint: 'blank = random' }] }, // 길이 5~15
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }, { key: 'endFrame', label: 'End frame', hint: 'Ending frame of the video' }, { key: 'reference', label: 'Reference', hint: 'Subject/style images — Image 1, Image 2… in the prompt.', multi: true }],
  },
  'grok-video': {
    id: 'grok-video', label: 'Grok Imagine Video 1.5', type: 'video',
    provider: 'fal', model: 'xai/grok-imagine-video/image-to-video',
    falInput: { image: 'image_url', duration: 'int', aspect: true, resolution: true },
    refModel: 'xai/grok-imagine-video/reference-to-video', refInput: { refs: 'reference_image_urls', max: 5 },
    costKey: null, enabled: true,
    controls: { duration: [6, 10, 15], durationRange: { min: 1, max: 15 }, aspectRatio: ['9:16', '16:9', '1:1', '3:4', '4:3', '3:2', '2:3'], resolution: ['720p', '480p'] }, // 길이 ≤15
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }, { key: 'reference', label: 'Reference', hint: 'Style/content images — @Image1… in the prompt.', multi: true }],
  },
  'happyhorse': {
    id: 'happyhorse', label: 'HappyHorse 1.1', type: 'video',
    provider: 'fal', model: 'alibaba/happy-horse/v1.1/image-to-video',
    falInput: { image: 'image_url', duration: 'int', resolution: true }, // 비율 필드 없음(원본 비율 유지)
    refModel: 'alibaba/happy-horse/v1.1/reference-to-video', refInput: { refs: 'image_urls', max: 9, aspect: true },
    costKey: null, enabled: true,
    controls: { duration: [5, 10, 15], durationRange: { min: 3, max: 15 }, resolution: ['720p', '1080p'], extras: [{ key: 'seed', label: 'Seed', type: 'number', min: 0, max: 2147483647, hint: 'blank = random' }] }, // 길이 3~15
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }, { key: 'reference', label: 'Reference', hint: 'Up to 9 subject images for consistency.', multi: true }],
  },
  'flux-3-video': {
    id: 'flux-3-video', label: 'FLUX.3 Video', type: 'video',
    provider: 'fal', model: 'blackforestlabs/flux-3/image-to-video',
    falInput: { image: 'image_url', duration: 'int', aspect: true, resolution: true, audio: 'generate_audio' },
    costKey: null, enabled: true,
    t2vModel: 'blackforestlabs/flux-3/text-to-video',
    controls: { duration: [5, 10, 15], durationRange: { min: 5, max: 20 }, aspectRatio: ['9:16', '16:9', '1:1', '3:4', '4:3', '21:9', '2:1'], resolution: ['720p', '1080p'], audio: { type: 'toggle' },
      extras: [{ key: 'safety_tolerance', label: 'Safety tolerance', type: 'number', min: 0, max: 4, default: 2, hint: '0 strict · 4 permissive' }] }, // 길이 5~20
    imageSlots: [{ key: 'startFrame', label: 'Start frame', hint: 'Starting frame of the video' }],
  },
  // (2026-10-14) 영상 입력 툴 — soon 1번 "영상 입력 칸". imageSlots 의 sourceVideo/motionVideo 키가 영상 칸이다(video.html 이 키로 분기).
  //   Seedance 편집·연장 = fal reference-to-video 의 task · Kling Motion Control = fal v3/pro/motion-control(실측) · Kling Omni Edit·Genjutsu = 힉스필드 API(fal 에 경로 없음, 실측).
  'seedance-2.5-edit': {
    id: 'seedance-2.5-edit', label: 'Seedance 2.5 Edit', type: 'video',
    provider: 'fal', model: 'bytedance/seedance-2.5/reference-to-video',
    falInput: { video: 'video_urls', refs: 'image_urls', duration: 'str', aspect: true, resolution: true, audio: 'generate_audio', extra: { task: 'editing' } },
    costKey: null, enabled: true,
    controls: { duration: [5, 8, 10, 15], durationRange: { min: 4, max: 30 }, aspectRatio: ['9:16', '16:9', '1:1', '4:3', '3:4', '21:9'], resolution: ['720p', '1080p', '480p'], audio: { type: 'toggle' },
      extras: [{ key: 'bitrate_mode', label: 'Bitrate', values: ['standard', 'high'] }, { key: 'seed', label: 'Seed', type: 'number', min: 0, max: 2147483647, hint: 'blank = random' }] },
    imageSlots: [{ key: 'sourceVideo', label: 'Video', hint: 'The video to edit — describe the change in the prompt (@Video1).' }, { key: 'reference', label: 'Reference', hint: 'Optional images — @Image1… in the prompt.', multi: true }],
  },
  'seedance-2.5-extend': {
    id: 'seedance-2.5-extend', label: 'Seedance 2.5 Extend', type: 'video',
    provider: 'fal', model: 'bytedance/seedance-2.5/reference-to-video',
    falInput: { video: 'video_urls', duration: 'str', resolution: true, audio: 'generate_audio', extra: { task: 'extension' } },
    costKey: null, enabled: true,
    controls: { duration: [5, 8, 10], durationRange: { min: 4, max: 30 }, resolution: ['720p', '1080p', '480p'], audio: { type: 'toggle' } },
    imageSlots: [{ key: 'sourceVideo', label: 'Video', hint: 'Continues from the last frame.' }],
  },
  'kling-motion': {
    id: 'kling-motion', label: 'Kling Motion Control', type: 'video',
    provider: 'fal', model: 'fal-ai/kling-video/v3/pro/motion-control',
    falInput: { image: 'image_url', video: 'video_url', extra: { character_orientation: 'image' } }, // 길이·비율은 참조 영상을 따른다
    costKey: null, enabled: true,
    controls: { duration: [5], extras: [{ key: 'character_orientation', label: 'Orientation follows', values: ['image', 'video'] }, { key: 'keep_original_sound', label: 'Keep video sound', type: 'toggle', default: true }] },
    // (10-14 실측) 이미지·영상 모두 사람 상반신이 보여야 한다 — 제품 클립은 "No complete upper body detected" 로 거절. 사람 전용.
    imageSlots: [{ key: 'startFrame', label: 'Character image', hint: 'A person, upper body visible' }, { key: 'motionVideo', label: 'Motion video', hint: 'A person moving, upper body visible' }],
  },
  'kling-edit': {
    id: 'kling-edit', label: 'Kling 3.0 Omni Edit', type: 'video',
    provider: 'higgsfieldVideo', model: 'kling-video/omni/video-edit',
    falInput: { video: 'video_urls' },
    costKey: null, enabled: true,
    controls: { duration: [5] },
    imageSlots: [{ key: 'sourceVideo', label: 'Video', hint: 'Describe the edit in the prompt.' }],
  },
  'genjutsu': {
    id: 'genjutsu', label: 'Higgsfield Genjutsu', type: 'video',
    provider: 'higgsfieldVideo', model: 'higgsfield/genjutsu/motion-transfer/v1.0',
    falInput: { video: 'video_url', image: 'image_urls', resolution: true },
    costKey: null, enabled: true,
    controls: { duration: [5], resolution: ['720p', '1080p', '480p'] },
    // (10-14 실측) 힉스필드 안전 필터가 엄격하다(속옷 차림 인물 이미지 = 거절). 플럼빙은 통과.
    imageSlots: [{ key: 'startFrame', label: 'Character image', hint: 'A person (safe-for-work)' }, { key: 'motionVideo', label: 'Motion video', hint: 'The movement to transfer' }],
  },
  // (2026-10-14) 영상 업스케일 — Topaz Video. 영상 입력 칸 재사용, 프롬프트 없음(noPrompt). 길이는 원본을 따르므로 과금은 자리값(5초 티어).
  'topaz-video': {
    id: 'topaz-video', label: 'Topaz Video Upscale', type: 'video',
    provider: 'fal', model: 'fal-ai/topaz/upscale/video',
    falInput: { video: 'video_url' }, noPrompt: true,
    costKey: null, enabled: true,
    controls: { duration: [5], extras: [{ key: 'upscale_factor', label: 'Scale', values: ['2', '4'] }, { key: 'model', label: 'Model', values: ['Proteus', 'Artemis HQ', 'Gaia HQ', 'Nyx', 'Nyx Fast'], hint: 'Proteus fits most footage' }] },
    imageSlots: [{ key: 'sourceVideo', label: 'Video', hint: 'Upscales ×2 or ×4. Length follows the source.' }],
  },
  'gemini-omni': {
    id: 'gemini-omni', label: 'Gemini Omni Flash', type: 'video',
    provider: 'fal', model: 'fal-ai/gemini-omni-flash/image-to-video',
    falInput: { image: 'image_url', duration: 'int', aspect: true }, // 해상도 필드 없음 · 비율은 16:9·9:16 만
    // ⚠️ enabled:false — 10-13 실측 3회(data URL·공개 URL·최소 입력) 전부 422 "Could not generate a video with the given inputs". 원인 미확인 → 숨김. 풀 때 실생성부터.
    costKey: null, enabled: false,
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
  xai: ['XAI_API_KEY'], higgsfield: ['HIGGSFIELD_API_KEY'], higgsfieldVideo: ['HIGGSFIELD_API_KEY'],
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
