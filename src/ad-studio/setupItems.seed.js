/**
 * Ad Studio 공식 시드 — 훅(hook) · 장소(setting)
 * ============================================================================
 * 경쟁사(Higgsfield)는 훅 9개·장소 14개이고 **전부 영어**다. 한국어 훅이 우리 차별점이므로
 * 훅의 `prompt`는 **한국어 대사 패턴**으로, 장소의 `prompt`는 **영어 장면 지시**로 쓴다.
 *   · 훅   → 영상 첫 2~3초에 나올 말. 사람이 실제로 쓰는 구어체여야 스크롤이 멈춘다.
 *   · 장소 → 이미지·영상 모델에 들어가는 배경 지시. 영어가 모델 이해도가 높다.
 *
 * ⚠️ CLAUDE.md 📊 규칙 — 이 시드를 고치면 `docs/exports/ad_setup_items.csv`도 같이 갱신할 것.
 *    (DB 적재용 구조화 파일. `node scripts/export_ad_setup_items.js`)
 */

/** {{product}}는 컴파일러가 제품명으로 치환한다. */
const HOOKS = [
  ['problem',        '문제 제기',      '영상 첫 2초에 화자가 카메라를 보며 말한다: "이거 아직도 이렇게 쓰세요?" 그 다음 {{product}}로 자연스럽게 넘어간다.'],
  ['turnaround',     '반전 후기',      '화자가 솔직한 톤으로: "솔직히 기대 안 했는데, 3일 써보고 생각이 바뀌었어요." {{product}} 사용 장면으로 이어진다.'],
  ['before-after',   '비포 애프터',    '화자가 화면을 가리키며: "왼쪽이 쓰기 전, 오른쪽이 쓴 후예요." 대비가 드러나는 컷으로 이어진다.'],
  ['price-shock',    '가격 충격',      '놀란 표정으로: "이 가격에 이게 된다고요?" 곧바로 {{product}}를 보여준다.'],
  ['skeptic',        '의심하다 반함',  '화자가 웃으며: "저 진짜 안 믿었거든요." 그리고 {{product}}를 직접 써보며 표정이 바뀐다.'],
  ['top3',           '사기 전 체크',   '"이거 사기 전에 알았으면 좋았을 3가지" 라고 말하고 손가락으로 하나씩 세며 {{product}}의 포인트를 짚는다.'],
  ['warning',        '경고형',        '진지한 톤으로: "이렇게 쓰면 오래 못 씁니다." 잘못된 사용과 올바른 사용을 {{product}}로 비교한다.'],
  ['question',       '질문 던지기',    '카메라에 대고: "다들 이거 어떻게 쓰세요?" 자기 방식을 {{product}}로 보여준다.'],
  ['new-arrival',    '신상 소개',      '들뜬 목소리로: "드디어 나왔습니다." 포장을 열며 {{product}}를 공개한다.'],
  ['repurchase',     '재구매 인증',    '"벌써 세 번째 사는 중이에요." 여러 개를 보여주며 {{product}}를 왜 다시 사는지 말한다.'],
  ['review-quote',   '리뷰 인용',      '"리뷰 보고 샀는데 진짜였어요." 화면에 리뷰가 스치고 {{product}} 실사용으로 넘어간다.'],
  ['show-dont-tell', '백문불여일견',   '"말로 하면 못 믿으실 것 같아서요." 곧바로 {{product}} 시연에 들어간다. 대사보다 손동작 위주.'],
  ['fail-story',     '실패담',        '"이거 사기 전에 세 번 실패했어요." 실패한 방식들을 빠르게 스치고 {{product}}로 마무리한다.'],
  ['target-call',    '타깃 호명',      '"이거 쓰시는 분들 꼭 보세요." 특정 상황을 콕 집어 부르고 {{product}}를 제시한다.'],
  ['time-save',      '시간 절약',      '"10초면 끝나요." 실제로 짧은 시간에 {{product}}로 해결되는 과정을 보여준다.'],
  ['unboxing',       '언박싱',        '"박스부터 열어볼게요." 개봉 순서대로 {{product}}를 꺼내 보여준다. 손 클로즈업 위주.'],
  ['one-week',       '일주일 변화',    '"일주일 차이입니다." 날짜 자막과 함께 {{product}} 사용 전후를 비교한다.'],
  ['no-need-pricey', '가성비',        '"비싼 거 살 필요 없더라고요." 고가 대안과 비교하며 {{product}}를 제시한다.'],
  ['restock',        '재입고 알림',    '"품절 전에 말씀드려요." 급한 톤으로 {{product}}를 소개한다.'],
  ['relatable',      '공감 유도',      '"저만 그런 거 아니죠?" 흔한 불편을 짚고 {{product}}로 해결한다.'],
];

/**
 * 스타일(style) — "어떤 종류의 영상인가". 훅·장소가 *무엇을 말하고 어디서*라면, 스타일은 *어떤 물성*이다.
 *
 * 왜 별도 타입인가: 훅·장소는 **사람이 나오는 실사 UGC**를 전제로 쓰였다. 그런데 제품 광고에는
 * 사람이 아예 안 나오는 종류가 있다(제품만 떠다니는 모션그래픽·손만 나오는 시연 등).
 * 그걸 훅·장소로 표현하려 하면 "화자가 카메라를 보며 말한다"가 따라붙어 결과가 깨진다.
 *
 * `camera:false` = 카메라·렌즈·피부톤 같은 실사 지시를 빼야 하는 스타일. 컴파일러가 TECHNICAL 블록을 바꾼다.
 * `direction`    = 사용자가 지시문을 비웠을 때 쓸 기본 연출. **프롬프트 0을 유지하는 장치**다.
 */
const STYLES = [
  ['ugc-real', 'UGC 실사', 'Filmed like a real person\'s phone video: handheld, natural indoor light, unpolished and believable.',
    { camera: true, direction: '제품을 실제로 쓰는 모습을 담백하게 보여줘.' }],

  ['product-motion-2d', '2D 제품 모션', [
    'Flat 2D motion-graphics product video. NO people, NO hands, NO real-world scene.',
    'The product is cut out cleanly from its background and floats on a smooth solid or gradient backdrop.',
    'Multiple identical copies of the SAME product drift, rotate gently and rearrange into deliberate compositions',
    '(radial burst, fan arc, grid, diagonal cascade) — every copy keeps the exact shape, color and detail of the source image.',
    'Motion is smooth and weightless with soft easing; add small sparkle and glow accents.',
    'Graphic-design look, like an animated poster — not a filmed scene.',
  ].join(' '), { camera: false, direction: '제품이 화면을 떠다니며 리듬감 있게 배치가 바뀌도록.' }],

  ['macro-detail', '매크로 디테일',
    'Macro product cinematography: the product fills the frame, slow push-in and slow rotation reveal surface, texture and finish.',
    { camera: true, hook: false, location: false,
      direction: '제품의 질감과 마감이 드러나도록 아주 가까이서.',
      technical: [
        'Shot on a tripod — locked-off or slow motorized move. No handheld shake.',
        'Lens: 100mm macro equivalent, very shallow depth of field, focus riding the product surface.',
        'Controlled studio light on a clean seamless backdrop. Neutral grade, no filter.',
      ] }],

  ['hands-demo', '손 시연',
    'Only hands interact with the product on a clean tabletop. No face, no speaking. The product stays the center of frame.',
    { camera: true, hook: false,
      direction: '손으로 제품을 다루는 과정을 순서대로 보여줘.',
      technical: [
        'Steady overhead and 3/4 angles, minimal shake, tripod or gimbal.',
        'Lens: 35mm equivalent, product in sharp focus.',
        'Soft natural daylight, realistic skin tone on the hands.',
      ] }],

  ['unbox-flatlay', '언박싱 플랫레이',
    'Top-down flatlay: packaging opens and contents are arranged neatly one by one on a clean surface. Only hands enter frame.',
    { camera: true, hook: false,
      direction: '포장을 열고 구성품을 하나씩 늘어놓는 과정.',
      technical: [
        'Locked-off top-down camera, perfectly level, no shake.',
        'Lens: 50mm equivalent, everything in focus.',
        'Even soft diffused light, clean neutral surface.',
      ] }],
];

/** 영어 장면 지시. 조명·시간대까지 포함해야 합성 티가 덜 난다. */
const SETTINGS = [
  ['cafe-window',   '카페 창가',      'a bright cafe by a large window, soft natural daylight, wooden table, shallow depth of field'],
  ['vanity',        '화장대',        'a tidy vanity desk with a mirror, warm bulb lighting, cosmetics neatly arranged'],
  ['bathroom',      '욕실 세면대',    'a clean modern bathroom sink, bright even lighting, tiled wall, water droplets'],
  ['kitchen',       '주방',          'a bright kitchen island with marble countertop, morning light from a side window'],
  ['bedroom',       '침실',          'a cozy bedroom with soft bedding, late afternoon light, calm neutral tones'],
  ['closet',        '옷장 앞',       'in front of an open wardrobe, clothes on hangers, soft indoor lighting'],
  ['desk',          '사무실 책상',    'a minimal office desk with a laptop, cool daylight from a window, clean background'],
  ['gym',           '헬스장',        'a modern gym interior, equipment softly blurred in the background, energetic lighting'],
  ['living-room',   '거실 소파',      'a comfortable living room sofa, warm lamp light in the evening, homey atmosphere'],
  ['park',          '야외 공원',      'an outdoor park with green trees, golden hour sunlight, gentle breeze'],
  ['street',        '도심 거리',      'a city street with blurred pedestrians and storefronts, late afternoon, cinematic'],
  ['car',           '자동차 안',      'inside a car in the driver seat, daylight through the windshield, shallow focus'],
  ['studio',        '스튜디오 무지',  'a clean seamless studio backdrop, soft even studio lighting, no props'],
  ['convenience',   '편의점',        'a convenience store aisle, bright fluorescent lighting, shelves in the background'],
  ['doorstep',      '현관 앞',       'at an apartment doorstep with a delivery box, natural hallway lighting'],
];

/** DB 적재용 평탄화 — migrate.js와 CSV export가 같은 소스를 쓴다. */
function rows() {
  const out = [];
  HOOKS.forEach(([slug, name, prompt], i) => {
    out.push({ type: 'hook', slug, name, prompt, locale: 'ko', sort_order: i + 1 });
  });
  SETTINGS.forEach(([slug, name, prompt], i) => {
    out.push({ type: 'setting', slug, name, prompt, locale: 'ko', sort_order: i + 1 });
  });
  STYLES.forEach(([slug, name, prompt, meta], i) => {
    out.push({ type: 'style', slug, name, prompt, meta: meta || null, locale: 'ko', sort_order: i + 1 });
  });
  return out;
}

module.exports = { HOOKS, SETTINGS, STYLES, rows };
