// Doppia 경량 i18n — 영어가 원본. 한국어(ko) 선택 시 EN→KO 사전으로 화면 텍스트를 치환한다.
// 페이지를 뜯어고치지 않도록 DOM 텍스트 노드 + 사용자 노출 속성을 순회 치환하고,
// MutationObserver로 JS가 동적으로 넣는 텍스트(스튜디오 카드·토스트 등)도 처리한다.
// 사용법: 각 페이지 <head>에 <script src="/js/i18n.js?v=1" defer></script> 추가.
(function () {
  var LANG_KEY = 'doppia_lang';
  var SUPPORTED = { en: 'English', ko: '한국어' };

  // ── EN → KO 사전 (키: 화면에 보이는 영어 원문, trim 기준) ──
  // 아래 DICT는 자동 생성이 아니라 수기 관리. 새 문구는 여기에 추가하면 전 페이지에 반영된다.
  var DICT = { ko: {
    // ══ (2026-07-17) 누락분 보충 ══════════════════════════════════════════
    // 사전에 없는 문자열은 **영어로 남는다** → 레일이 "Home · 스튜디오 · Ad Video · 라이브러리"처럼
    // 뒤섞였다. 아래는 home/gallery/store/explore/creation/saas-login DOM 전수 대조로 뽑은 구멍.
    // ⛔ 번역하지 않는 것: Doppia · 플랜명 · 엔진명 · Reels · TikTok · 비율 · 숫자 · ◈ (고유명사)
    //
    // ✅ (2026-07-17 변경) **Ad Video·Shots는 번역한다** → 광고영상 · 컷.
    //    옛 규칙("제품명이라 영어 유지")을 뒤집은 이유: 한국어 랜딩이 이미 본문·<title>·og에서
    //    '광고영상'·'상세컷'으로 팔고 있었는데 nav·eyebrow만 영어라, 히어로에서 "상세컷"이라 불러서
    //    데려온 셀러가 세 스크롤 아래에서 "Shots"를 만났다 = 한 페이지 안 불일치.
    //    Shots→'컷'인 이유: 하위 항목이 전부 제품컷·착용컷·대표컷이라 '컷'이 이미 그 머리말이고(위계 자동),
    //      매체 중립이라 릴(v1.1)이 열려도 안 깨진다. '사진'·'상세컷'은 릴에서 깨지고,
    //      '제품컷'은 shots.tile.6(주얼리 Product Cut 패밀리)과 충돌한다.
    //    ⚠️ 'Shots'·'Ad Video'는 텍스트 키다 — 화면에 그 글자가 있으면 전부 치환된다.
    //    ⚠️ 영어 원본 UI는 Shots·Ad Video 그대로다. 바뀌는 건 한국어 모드뿐.
    // ⛔ billing.html은 **의도적으로 건너뛴다** — 미번역 67종 중 다수가 코드 근거 0인 날조다
    //    (Solo/Group lookbook · N concurrent slots · 2K quality · Concept cut · Edit results ·
    //     Video reels · Template reel · watermark-free). 번역하면 거짓을 한국어로 굳힌다.
    //    → 가격표 진실화(docs/가격표_진실화_변경셋) 선행 후 번역할 것.

    'Home': '홈',
    // home 히어로 — <h1>What will you <b>create</b> today?</h1> 텍스트노드 3개.
    // 노드 단위 치환이라 어순을 못 바꾼다 → 조각을 한국어 어순에 맞게 배분해 "오늘 뭘 만들어 볼까요?"를 만든다.
    // <b> 강조가 영문 'create'에서 한국어 '만들어'로 자연히 옮겨간다(둘 다 동사).
    'What will you': '오늘 뭘', 'create': '만들어', 'today?': '볼까요?',
    // 대표 상품 2개 — 레일 라벨이자 home 카드 제목. 이 두 키가 없으면 레일이
    //   "홈 · Shots · Ad Video · 라이브러리"로 섞인다(사전에 없는 문자열은 영어로 남는다).
    'Shots': '컷', 'Ad Video': '광고영상', 'Content Pack': '콘텐츠팩',
    'Create photos': '사진 만들기', 'Create an ad video': '광고영상 만들기',
    'Create Shots': '컷 만들기', 'Create an Ad Video': '광고영상 만들기',
    'Cutout': '제품컷', 'Editorial': '화보컷',
    'Auto script': '대본 자동 생성', 'AI voice & music': 'AI 음성 · 음악',
    'View more': '더 보기', 'Best offer': '가장 알뜰한 선택',
    'Search templates': '템플릿 검색', 'Creation preview': '결과 미리보기',
    'Scene preview': '씬 미리보기', 'Next scene': '다음 씬', 'Previous scene': '이전 씬',
    'Max scale': '최대 크기', 'OR': '또는', '⤢ New tab': '⤢ 새 탭',
    'Currency': '통화', 'English': 'English', 'Korean': '한국어',
    'Privacy Policy': '개인정보처리방침', 'Refund policy': '환불 정책',
    'Subscribe': '구독하기', 'Contact sales': '문의하기',
    'Priority support': '우선 지원', 'Dedicated support': '전담 지원',
    'Team roles & shared pool': '팀 권한 · 크레딧 공유',
    'Subscription plans': '구독 플랜', 'Subscription paused': '구독 일시정지됨',
    'Extra credits (one-time)': '추가 크레딧 (1회성)', 'Free tier': '무료',
    'Everything in Starter': 'Starter의 모든 것', 'Everything in Standard': 'Standard의 모든 것',
    'Everything in Team': 'Team의 모든 것',
    'you@example.com': 'you@example.com', 'your account': '내 계정',
    'Your email is used to sign in and can\'t be changed here.': '로그인에 쓰는 이메일이라 여기서는 변경할 수 없습니다.',
    'It saves to your gallery automatically even if you close this window.': '이 창을 닫아도 라이브러리에 자동으로 저장됩니다.',
    'add the ones you like': '마음에 드는 것을 담으세요',
    '— then use them in Shots with your own product.': '— 담은 템플릿은 컷에서 내 제품으로 바로 씁니다.',
    'creations': '크리에이션',
    'Open any photo and hit': '아무 사진이나 열어서 누르세요 —',
    'Turn one look into a full week\'s set in a tap': '한 번 탭으로 일주일치 세트를 만듭니다',
    'Deleting your account removes access to your studio, library, and credits. You won\'t be able to sign back in.':
      '계정을 삭제하면 스튜디오·라이브러리·크레딧에 접근할 수 없게 되고, 다시 로그인할 수 없습니다.',
    'Permanently disable your Doppia account. This can\'t be undone.':
      'Doppia 계정을 영구히 비활성화합니다. 되돌릴 수 없습니다.',
    'Pause instead (recommended)': '대신 일시정지 (권장)',
    'Pause keeps your account, gallery and trained faces — billing stops and resumes whenever you\'re back. Most people pause instead of cancelling.':
      '일시정지하면 계정과 라이브러리가 그대로 남고, 결제만 멈췄다가 돌아오실 때 다시 시작됩니다.',
    'Cancel anyway': '그래도 해지하기',
    '— no charges until you resume. Your credits and gallery stay safe.':
      '— 다시 시작하기 전까지 청구되지 않습니다. 크레딧과 라이브러리는 그대로입니다.',
    'DELETE': 'DELETE',
    // home 카드 본문 — ⚠️ 영문이 'cutouts'를 파는데 배경제거 구현은 0이다
    //   (removeBackground|remove_background|bgRemove grep 0건 · product-cut은 배경을 '생성'한다).
    //   랜딩에선 이미 걷어냈다(f21ed73). 한국어는 정직한 '제품컷'으로 옮긴다 —
    //   EN도 같이 고쳐야 정합이지만 그건 home.html 카피 수정 건이라 별도.
    'One product photo is enough — turn it into ad videos, cutouts, editorial and on-model shots. Pick a starting point; we handle the rest.':
      '제품 사진 한 장이면 충분합니다 — 광고영상, 제품컷, 화보컷, 모델 착용컷으로 바꿔 드립니다. 시작할 곳만 고르시면 나머지는 저희가 합니다.',
    'Cutouts, editorial and on-model looks from one product photo — driven by ready-made templates.':
      '제품 사진 한 장으로 제품컷 · 화보컷 · 모델 착용컷까지. 준비된 템플릿이 알아서 합니다.',
    'Turn a product photo into a narrated short — scenes, voice and music, ready for Reels & TikTok.':
      '제품 사진 한 장을 내레이션 숏폼으로. 씬 · 음성 · 음악까지 붙어 Reels · TikTok에 바로 올립니다.',
    // gallery
    '4 categories · dozens of templates, zero prompts': '4개 카테고리 · 템플릿 수십 종, 프롬프트 없이',
    'Come back daily — your streak earns free credits': '매일 들르시면 연속 출석으로 크레딧이 쌓입니다',
    'Turn one look into a full week\'s set in a tap': '한 번 탭으로 일주일치 세트를 만듭니다',
    'Create Reel ·': 'Reel 만들기 ·',
    'Describe the motion for your Reel': 'Reel에 넣을 움직임을 적어주세요',
    'e.g. camera slowly zooms in while hair sways gently': '예) 머리카락이 살랑이는 동안 카메라가 천천히 줌인',
    'Your very first result comes out watermark-free — make something you can post today.':
      '첫 결과물은 바로 올릴 수 있게 나옵니다.',  // ⚠️ 'watermark-free'는 배선 0(generate.route.js:385가 플랜 무관 watermarked:false) → 주장 제거
    // saas-login — (2026-07-29) 얼굴앱 시대 문구('my own face/content')를 셀러 중립 문구로 교체(EN 원문·키 동시 변경, KO 뜻 동일)
    'I confirm I have the rights to the content I upload and I agree to the': '본인이 권리를 가진 콘텐츠임을 확인하며, 다음에 동의합니다:',
    '✦ Flagship': '✦ 대표 상품',
    '— Reels reach far more people than photos.': '— Reels는 사진보다 훨씬 멀리 갑니다.',

    // ── billing.html — ⛔ 날조 18종은 **의도적으로 미번역**(아래 목록). 번역하면 거짓을 한국어로 굳힌다.
    //    N concurrent slots · Solo/Group lookbook · 2K quality · Concept cut · Edit results ·
    //    Video reels · Template reel(5s/10s) · watermark-free exports · /mo
    //    → entitlements.js PLANS에 그 축이 아예 없다(monthlyCredits·watermarkFree·hd·commercial·privateMode 5개뿐,
    //      그중 코드로 강제되는 건 privateMode 하나). 가격표 진실화 선행 후 삭제할 것.
    'Extra credits': '추가 크레딧', 'Credit packs': '크레딧 팩',
    '1,500 credits (one-time)': '1,500 크레딧 (가입 시 1회)',
    'Template photo (per image)': '템플릿 사진 (장당)',
    'Custom photo (per image)': '커스텀 사진 (장당)',
    'Photo — Flash (per image)': '사진 — Flash (장당)',
    'Ad Video (per scene)': '광고영상 (씬당)',
    'Add-on (caption · enhance)': '애드온 (캡션 · 보강)',
    'A monthly subscription for AI content creation — your usage credits refill every month, and you can cancel anytime. Need more mid-cycle? Add an extra credit pack.':
      'AI 콘텐츠 제작 월 구독 — 크레딧이 매월 충전되고 언제든 해지할 수 있습니다. 중간에 더 필요하시면 크레딧 팩을 추가하세요.',
    'A subscription gives the best value per credit — extra credit packs are for one-off needs. Credits are in-service usage units with no cash value and are non-refundable once used.':
      '크레딧당 단가는 구독이 가장 낮고, 크레딧 팩은 일회성 수요를 위한 것입니다. 크레딧은 서비스 내 사용 단위로 현금 가치가 없으며 사용 후에는 환불되지 않습니다.',
    'Never run out mid-generation. When your balance drops below the threshold, we auto-buy a pack so your renders never stop.':
      '생성 도중 크레딧이 떨어지지 않게, 잔액이 기준 아래로 내려가면 팩을 자동으로 구매합니다.',
    'When below': '잔액이 이 아래일 때', 'auto-buy': '자동 구매',
    'Enterprise — annual, best value per credit': '기업 — 연간 결제, 크레딧당 단가 최저',
    'billed annually': '연간 결제', 'SAVE 17%': '17% 절약',
    '20 credits': '20 크레딧', '50 credits': '50 크레딧', '100 credits': '100 크레딧',
    '50 credits — $5': '50 크레딧 — $5', '220 credits — $18': '220 크레딧 — $18', '580 credits — $40': '580 크레딧 — $40',
    // ⛔ 미번역 유지: DOPPIA · .AI(브랜드) · Enterprise Pro/Team(플랜명) · $ USD · ₩ KRW(통화코드)

    // ── 레일 · 계정 메뉴 · 공통 ──
    // ⚠️ 'Studio'는 이제 **배경 카테고리** 전용이다(js/backgrounds.roster.js category:"Studio").
    //    내비 라벨은 2026-07-17에 Shots로 바뀌었고 Shots는 번역하지 않는다(제품명).
    'Studio': '스튜디오', 'Library': '라이브러리', 'Store': '스토어', 'Community': '커뮤니티',
    'Creator': '크리에이터', 'Billing': '결제', 'Market': '마켓', 'Marketplace': '마켓플레이스',
    'Business': '비즈니스', 'Settings': '설정', 'Billing & credits': '결제 · 크레딧',
    'Log out': '로그아웃', 'Your account': '내 계정', 'Personal': '개인', 'Account menu': '계정 메뉴',
    'Account': '계정', 'Workspace': '워크스페이스', 'Guest': '게스트',
    'credits': '크레딧', 'credits left': '크레딧 남음', '+ Buy': '+ 구매', 'Top up →': '충전하기 →',
    'Cancel': '취소', 'Confirm': '확인', 'Done': '완료', 'Close': '닫기', 'Delete': '삭제',
    'Remove': '제거', 'Save changes': '변경 저장', 'Saving…': '저장 중…', 'Loading…': '불러오는 중…',
    'Manage': '관리', 'Use': '사용', 'View': '보기', 'Hide': '숨기기', 'Show more': '더 보기',
    'Free': '무료', 'Paid': '유료', 'All': '전체', 'Category': '카테고리', 'Name': '이름',
    'Description': '설명', 'Prompt': '프롬프트', 'Themes': '테마', 'Cover': '커버', 'Coming soon': '준비 중',
    'Report': '신고', 'Following': '팔로잉', '+ Follow': '+ 팔로우', 'Copy': '복사', '✓ Copied': '✓ 복사됨',
    'Link copied': '링크 복사됨', 'Copy failed': '복사 실패', 'Templates': '템플릿', 'Earnings': '수익',
    'Not enough credits': '크레딧 부족', 'Not enough credits — top up in Billing': '크레딧 부족 — 결제에서 충전하세요',
    'All rights reserved': '모든 권리 보유', 'Overview': '개요', 'Profile': '프로필', 'Status': '상태',

    // ── 설정 (Settings) ──
    'Your profile': '내 프로필', "Your email is used to sign in and can't be changed here.": '이메일은 로그인에 사용되며 여기서는 변경할 수 없습니다.',
    'Email': '이메일', 'Display name': '표시 이름', 'Your name': '이름',
    'This is the name shown across Doppia (account menu, community).': 'Doppia 전반(계정 메뉴·커뮤니티)에 표시되는 이름입니다.',
    'Delete account': '계정 삭제', "Permanently disable your Doppia account. This can't be undone.": 'Doppia 계정을 영구 비활성화합니다. 되돌릴 수 없습니다.',
    "Deleting your account removes access to your studio, library, and credits. You won't be able to sign back in.": '계정을 삭제하면 스튜디오·라이브러리·크레딧에 접근할 수 없으며 다시 로그인할 수 없습니다.',
    'Delete your account?': '계정을 삭제할까요?', 'Type DELETE': 'DELETE 입력',
    'Display name cannot be empty.': '표시 이름은 비워둘 수 없습니다.', 'Could not save changes.': '변경을 저장하지 못했습니다.',
    'Profile updated.': '프로필이 업데이트되었습니다.', 'Could not reach the server.': '서버에 연결하지 못했습니다.',
    'Could not delete account.': '계정을 삭제하지 못했습니다.', 'Language': '언어', 'Choose your language': '언어 선택',
    'Applies across Doppia on this device.': '이 기기의 Doppia 전체에 적용됩니다.',

    // ══ (2026-07-17) 광고영상(Ad Video) 화면 — /studio?mode=ugc ═══════════════════
    // 사전에 4개(Aspect ratio·Count·English·Video)만 있어서 3번 스텝만 '비디오'로 뜨고
    // 나머지가 통째로 영어였다 = 부분 번역이라 더 어색했다. 아래는 DOM 전수 대조로 뽑은 78건.
    // ⛔ 번역하지 않음: Reels · Shorts(고유명사) · 보이스 이름(Yooni·JY·Hanabad·Nara·Mono Beige·
    //    Juan·Jin·Minjoon) · 3s/5s(숫자) · CTA(마케팅 표준어) · UGC Ads(prod에서 flags.js ugc:launch:false로 숨김)
    // ⚠️ 보이스는 '이름 — 설명' 한 문자열이 통째로 <option> 텍스트다 → 이름은 두고 설명만 옮긴다.

    // 업로드
    'Add product photos': '제품 사진 추가',
    'Recommended — add multiple angles to keep your product consistent':
      '권장 — 여러 각도를 넣으면 제품이 일관되게 유지됩니다',
    'Required — at least one. Every photo must show the same product.':
      '필수 — 최소 한 장. 모든 사진이 같은 제품이어야 합니다.',
    'Which photos should I add?': '어떤 사진을 넣어야 하나요?',
    'Type a product name… (optional)': '제품명을 입력하세요… (선택)',
    // 컨셉
    'Concept': '컨셉', '— required · a sentence or a few keywords': '— 필수 · 한 문장이나 키워드 몇 개',
    '— written for you from your photo': '— 사진에서 자동으로 써드립니다', // (2026-07-27) 컨셉 자동화 라벨
    // Step 1 섹션 제목 (Product='제품'·Concept='컨셉'은 기존 키 재사용)
    'Style': '스타일', 'Format': '형식', 'Product name': '제품명', '— optional': '— 선택',
    'Write it for me': '대신 써주세요',
    'Add a photo and AI can write this for you': '사진을 넣으면 AI가 대신 써드립니다',
    'e.g. "clean, sensual lookbook for 20–30s"  ·  "red background, luxurious color"':
      '예) "20~30대를 위한 깔끔하고 감각적인 룩북"  ·  "빨간 배경, 고급스러운 컬러"',
    'Product details': '제품 상세',
    "Facts the AI may use — e.g. Brand: Rouge Paris · 24h wear · vegan · hydrating.  Leave blank to keep copy general (AI won't invent claims).":
      'AI가 쓸 수 있는 사실 — 예) 브랜드: Rouge Paris · 24시간 지속 · 비건 · 보습.  비워두면 카피가 일반적으로 나옵니다(없는 효능을 지어내지 않습니다).',
    'Video format': '영상 형식',
    'Product only': '제품만', 'Just the product': '모델 없이 제품만',
    'With a model': '모델과 함께', 'Product + a model using it': '제품 + 사용하는 모델',
    // 옵션별 ⓘ(2026-07-18) → 헤더 ⓘ 하나로 통합. 도움말 본문은 <b> 포함이라 영어 전용(기존과 동일)
    'What do the Video format options mean?': '영상 형식 옵션 설명',
    'Pick a model': '모델 고르기', 'Female': '여성', 'Male': '남성',
    // 소리 — (2026-07-17) 옛 'Voiceover'/'Music only' 폐기.
    //   'Music only'는 이름부터 틀렸다: 음악은 아래 별도 토글(#ugcMusic)이라 음성모드에서도 켜지고,
    //   이 모드에서 음악을 끄면 무음이 된다. 자막도 껐다(UGC_CAPTIONS_ENABLED=false, 커밋 96e6c6e).
    //   진짜 차이 = ① 목소리 유무 ② 씬 길이를 누가 정하느냐(음성모드=음성이 정함 / Visual=내가 고름).
    //   '목소리 없이' 같은 부정형은 없는 걸로 이름 짓는 셈이라 기각 → 둘 다 '있는 것'의 이름으로.
    'Sound': '소리', 'Narrated': '내레이션', 'No narration': '내레이션 없음',
    'What do the Sound options mean?': '소리 옵션 설명',
    // 결과 카드의 음성 트랙 토글 — 모드가 아니라 트랙 켜기/끄기라 명사형
    'Narration': '내레이션',
    // 요약줄 · 포맷
    'Change': '변경', 'Edit': '수정',
    'Feed': '피드', 'Wide': '와이드', 'Where you\'ll post it': '어디에 올릴지',
    // 씬 · 길이
    'Scenes & length': '씬 · 길이', '— Auto lets the script decide': '— 자동으로 두면 대본이 정합니다',
    'Auto': '자동', 'Length / scene': '씬당 길이', 'scenes': '씬',
    'Picking 3s makes shorter scenes but uses the same credits as 5s.':
      '3초를 골라도 씬만 짧아지고 크레딧은 5초와 같습니다.',
    '🎙️ Narrated — length is set by the voice.': '🎙️ 내레이션 — 길이는 음성이 정합니다.',
    // 언어
    // (2026-07-30) 내레이션 폐지 → '음성' 제거. 옛 키('— script & voice')는 남겨둔다(다른 화면 잔존 대비, 무해).
    'Ad language': '광고 언어', '— script': '— 대본', '— script & voice': '— 대본 · 음성',
    // (2026-07-30) Ad Video 폼 축소 — Count·Length/scene 폐지, 총 길이 하나만 받는다
    'Total length': '총 길이',
    // 컨셉 placeholder(TEXTAREA는 텍스트치환 SKIP이나 placeholder는 ATTRS로 처리됨)
    'e.g. A calming night serum for tired skin — cozy, candle-lit bedroom mood.':
      '예) 지친 피부를 위한 진정 나이트 세럼 — 아늑한 캔들 조명 무드.',
    // CTA — (2026-07-20) "Write script" 단독 라벨을 버렸다. 유저에게 시키는 말투인데 실제로는 AI가 쓴다.
    //   버튼이 게이트를 직접 말하므로 문구가 4가지다(준비됨 + 빠진 것 3가지). ugcCtaState 가 갈아끼우고
    //   i18n MutationObserver 가 치환한다. 'Write script' 키는 #ugcRewriteBtn 등이 아직 쓸 수 있어 남긴다.
    'Write script': '대본 쓰기',
    'AI writes the script': 'AI가 대본을 씁니다',
    'Free — edit it, then make the video': '무료 — 고친 다음 영상으로',
    'Add a product photo and a concept': '제품 사진과 컨셉이 필요합니다',
    'Add a product photo': '제품 사진을 넣어주세요',
    'Write one line of concept': '컨셉을 한 줄 써주세요',
    'A photo and one line starts it': '사진과 한 줄이 있으면 시작합니다',
    // (2026-07-27) 컨셉 자동화 — CTA 원탭·브리프 직접쓰기. 위 'AI writes the script' 등은 옛 게이트 문구(미사용·존치).
    'Create my ad video': '내 광고영상 만들기',
    'Concept & script are written for you — free': '컨셉·대본은 자동으로 써드립니다 — 무료',
    'One product photo starts it': '제품 사진 한 장이면 시작됩니다',
    'Write your own brief': '직접 브리프 쓰기',
    'Reading your product…': '제품을 읽는 중…',
    "⚠ Couldn't write a brief from the photo — add one line and try again.": '⚠ 사진으로 브리프를 쓰지 못했어요 — 한 줄 넣고 다시 시도하세요.',
    // 과금 안내(#ugcFreeNote). (2026-07-20) 우측 패널 2번 스텝("AI drafts it — free…")을 흡수해
    //   한 줄로 합쳤다 — 과금 안내가 세 곳(헤더·2번·무료안내) → 두 곳 → **한 곳**이 된 마지막 단계.
    // (2026-07-27) 컨셉 자동화로 문구 갱신. 옛 'The concept and the script are free…' 키는 영어 원문이 사라져 제거.
    'Doppia writes the concept and script for you — free. Review them first; credits are spent only when you generate the video, and the cost shows on that button.':
      'Doppia가 컨셉과 대본을 자동으로 써드립니다 — 무료. 먼저 확인하세요. 크레딧은 영상을 만들 때만 나가고, 비용은 그 버튼에 표시됩니다.',
    // Ad Video 빈 상태 리드(2026-07-20 신설, .ugc-lead-t/-chip).
    //   우측 "How this works" 패널이 제거되며 결과물 문장과 칩만 여기로 넘어왔다.
    //   칩 '9:16 · 1:1 · 16:9'와 'English · 한국어'는 번역 불필요(숫자·자기표기).
    //   ⚠️ 아래 죽은 키 12개를 같이 지웠다(패널과 함께 매칭 대상이 사라짐):
    //     'What you get' · 'How this works' · 'Your product' · 'Script' · 'Scenes'(주: 씬 스트립용은 별도 유지) ·
    //     'Ad video' · 'A photo and one line about the ad…' · 'AI drafts it — free…' ·
    //     'Each line becomes a scene…' · 'Your finished ad appears' · 'right here' ·
    //     ". Saved isn't final…" · 옛 #ugcFreeNote 긴 문장.
    //   ('Your photo'는 landing.html이 쓰고 있어 남긴다. 'Scenes'는 ugcSceneStripHtml이 쓴다.)
    'A finished ad video — your scenes cut together, ready to post.':
      '완성된 광고 영상 한 편 — 씬이 이어 붙은 채로, 바로 올릴 수 있게.',
    'Narration optional': '내레이션 선택', 'Music optional': '배경음악 선택',
    'Your photo': '제품 사진',
    'Scenes': '씬',
    // 번호 배지 플로우 제목(1·2·3·4). 1번=아래 'Your product photo', 2번=기존 'Concept',
    //   3번=아래 'Settings'(2026-07-21 신설, 옛 'Options'에서 개명), 4번=CTA(문구는 ugcCtaState).
    //   숫자 배지 자체는 번역 대상이 아니다(aria-hidden). 기존 'Options'→'옵션' 키는 다른 화면이 쓸 수 있어 유지.
    'Your product photo': '제품 사진',
    'Settings': '세팅',
    // 씬 스트립 안내(ugcSceneStripHtml). (2026-07-20) 패널 3·4번 스텝의 약속 두 개가 여기로 내려왔다 —
    //   "한 컷만 다시"·"저장 후에도 편집"은 씬 재생성이 **실제로 사는 자리**에서 말하는 게 맞다(사용자 결정 D-3).
    //   ⚠️ 옛 문구("…🔄 re-generates a scene (uses credits).")는 사전에 키가 아예 없어 한국어 모드에서도
    //      영어로 나오고 있었다. 이번에 키를 만들며 그 누락도 같이 메운다.
    "Reorder, edit captions, or remove — free. 🔄 remakes that one scene, not the whole video (uses credits). Saved isn't final — come back and change any scene.":
      '순서 바꾸기·자막 수정·삭제는 무료입니다. 🔄 는 영상 전체가 아니라 그 한 컷만 다시 만듭니다(크레딧 사용). 저장했다고 끝이 아닙니다 — 언제든 돌아와 어느 씬이든 바꾸세요.',
    // 음악 · 음성
    'Add background music': '배경음악 넣기', 'Voice': '음성',
    'Yooni — F, clear & calm': 'Yooni — 여성, 맑고 차분함',
    'JY — F, trendy & upbeat': 'JY — 여성, 트렌디하고 경쾌함',
    'Hanabad — F, confident': 'Hanabad — 여성, 자신감 있음',
    'Nara — F, warm & mature': 'Nara — 여성, 따뜻하고 성숙함',
    'Mono Beige — F, gentle': 'Mono Beige — 여성, 부드러움',
    'Juan — M, deep storyteller': 'Juan — 남성, 깊은 이야기꾼',
    'Jin — M, warm & classy': 'Jin — 남성, 따뜻하고 품격 있음',
    'Minjoon — M, warm & clear': 'Minjoon — 남성, 따뜻하고 또렷함',
    'Speed': '속도', 'Slow': '느리게', 'Normal': '보통', 'Fast': '빠르게',
    'Music mood': '음악 분위기', 'Auto (AI)': '자동 (AI)',
    'Upbeat': '경쾌하게', 'Calm': '차분하게', 'Luxury': '고급스럽게', 'Warm': '따뜻하게', 'Energetic': '활기차게',
    'Preview voice': '음성 미리듣기',
    // 대본 패널
    'Rewrite': '다시 쓰기', 'Generate video': '영상 만들기', 'Writing your script': '대본을 쓰는 중',
    'Hook': '훅',
    // (2026-07-27) 압축 확인 카드의 대본 에디터 토글
    '✎ Edit script': '✎ 대본 편집', '✎ Hide editor': '✎ 에디터 접기',

    // ── 스튜디오 (Studio) ──
    'Custom': '커스텀', 'Select a product': '제품 선택', 'Add your product': '제품 추가', 'Add your face': '얼굴 추가',
    'Add your spokesperson': '모델 추가', 'Select a face': '얼굴 선택', 'Ratio': '비율', 'Aspect ratio': '화면 비율',
    'More ratios': '비율 더 보기', 'Size': '크기', 'Count': '수량', 'Model': '모델', 'Models': '모델',
    'Quality': '품질', 'Private Mode': '비공개 모드', 'Generate': '생성', 'Pick a template': '템플릿 선택',
    // (2026-07-17) 옛 키 'No prompt needed — just choose a look.' 폐기 — 헤딩(template)과 부제(look)가
    //   한 박스에서 같은 것을 두 단어로 불렀다. EN을 통일했으므로 키도 따라간다.
    'No prompt needed — the template brings its own.': '프롬프트 불필요 — 템플릿이 프롬프트를 갖고 있습니다.',
    'Choose one below — no prompt needed': '아래에서 고르세요 — 프롬프트 불필요',
    // 페이월(크레딧 부족 모달). 랜딩 trust.a.b와 **같은 문장**을 쓴다 — 검증된 주장이고 두 모드 다 참이다.
    'You only pay for what renders.': '나온 것만 크레딧이 나갑니다.',
    'Official': '공식',
    'My templates': '내 템플릿', 'My creations': '내 크리에이션', 'Your creations': '내 크리에이션',
    'Image': '이미지', 'Video': '영상', 'Photos': '사진', 'Reels': '릴스', 'Length': '길이', 'Audio': '오디오',
    'Reference': '레퍼런스', 'Options': '옵션', 'Negative': '네거티브', 'Negative prompt': '네거티브 프롬프트',
    'Type a prompt...': '프롬프트를 입력하세요...', 'Type a negative...': '네거티브를 입력하세요...',
    'Add detail (optional)': '디테일 추가 (선택)', 'Add your own touch — e.g. red dress, golden hour, soft smile': '나만의 터치 추가 — 예: 레드 드레스, 골든아워, 부드러운 미소',
    'Cut type — pick one': '컷 유형 — 하나 선택', 'Cut type': '컷 유형', 'Background color': '배경색',
    // ── (2026-07-21 컷UI 재설계 · 안 ㄹ) 작성 카드 신규 문구. 기존 항목 미수정, 추가만. ──
    //   ⚠️ 'New'만 맥락의존적('새로 만들기') — 공유 페이지에 단독 'New' 텍스트노드 없음 확인(studio 카드만).
    //   나머지(연령·각도·배경 등)는 어디서든 맞는 보편 번역이라 충돌 무해.
    'New': '새로 만들기', 'Fold': '접기', 'Unfold': '펼치기',
    'Skin tone': '피부톤', 'Age': '연령', 'Garment type': '품목', 'Jewelry type': '주얼리 종류',
    'Angle': '각도', 'Background': '배경', 'Any model': '아무 모델',
    // 축 옵션 값 — studio AXIS_DEFS 전용(다른 페이지 텍스트노드 충돌 0 확인). 카드가 인라인 노출하므로 번역.
    //   ⚠️ 'Back'은 기존 '뒤로'(내비)를 물려받음(사전에 이미 있어 미수정) → angle의 Back은 '뒤로'로 표시.
    'Fair': '밝은', 'Light': '라이트', 'Medium': '중간', 'Tan': '탠', 'Deep': '딥',
    'Daylight': '자연광', 'Marble': '마블', 'Noir': '느와르', 'Golden': '골든', 'Pop': '팝', 'Cobalt': '코발트',
    'Bottoms': '하의', 'Bra': '브라', 'Set': '세트', 'Swimwear': '스윔웨어', 'Front': '정면',
    'Ring': '반지', 'Necklace': '목걸이', 'Earrings': '귀걸이', 'Bracelet': '팔찌',
    'Women': '여성', 'Men': '남성',
    // 선택된 템플릿 칩 부제(syncTplTrigger tpl-sel) — out=photos/reel 두 변형.
    'Your photos will be made with this look · tap to change': '이 룩으로 사진이 만들어집니다 · 탭하여 변경',
    'Your reel will be made with this look · tap to change': '이 룩으로 릴이 만들어집니다 · 탭하여 변경',
    'Generating… this takes ~20s': '생성 중… 약 20초 소요', 'Enhance': '향상', 'Try it': '체험하기',
    'Upload an image': '이미지 업로드', 'Upload a clear selfie — we keep your identity across every shot.': '선명한 셀피를 올려주세요 — 모든 컷에서 동일한 정체성을 유지합니다.',
    'Upload a product photo — we keep it consistent across scenes.': '제품 사진을 올려주세요 — 모든 장면에서 일관되게 유지합니다.',
    'Turn photo into a Reel': '사진을 릴스로', 'Turn photos into Reels': '사진을 릴스로', '▶ Make a Reel': '▶ 릴스 만들기',
    'Create Reel': '릴스 만들기', 'Turn this photo into a moving 5-second Reel. Describe the motion you want.': '이 사진을 움직이는 5초 릴스로 만듭니다. 원하는 움직임을 설명하세요.',
    'Creating your Reel… usually takes 2-5 minutes.': '릴스 생성 중… 보통 2~5분 걸립니다.', 'AI write script': 'AI 스크립트 작성',
    'Write your script': '스크립트 작성', 'Caption + hashtags': '캡션 + 해시태그', 'Writing caption…': '캡션 작성 중…',
    'Brand kit': '브랜드 키트', 'Brand colors': '브랜드 컬러', 'Brand font': '브랜드 폰트', 'Logo': '로고',
    'Change logo': '로고 변경', 'Save & apply to all outputs': '저장 후 모든 결과에 적용', 'Add to theme': '테마에 추가',
    'Add to studio themes': '스튜디오 테마에 추가', 'Remove from theme': '테마에서 제거', 'Save template': '템플릿 저장',
    'Create template': '템플릿 만들기', 'Delete template': '템플릿 삭제', 'Delete this creation': '이 크리에이션 삭제',
    'Use this template': '이 템플릿 사용', 'Tap to change template': '탭하여 템플릿 변경', 'Template selected': '템플릿 선택됨',
    'Select a face and a template to start.': '얼굴과 템플릿을 선택해 시작하세요.', 'Add image': '이미지 추가',
    'This is a Premium Feature. Subscribe to access it.': '프리미엄 기능입니다. 구독하면 사용할 수 있습니다.',
    'Premium template': '프리미엄 템플릿', 'Premium': '프리미엄', 'Purchased': '구매됨', 'Unlock': '잠금 해제',
    'Select a category…': '카테고리 선택…', 'Description (optional)': '설명 (선택)',
    'See all plans →': '모든 요금제 보기 →', 'View all in Library →': '라이브러리에서 전체 보기 →', 'Open Studio →': '스튜디오 열기 →',
    'Your Library': '내 라이브러리', 'Your library is waiting': '라이브러리가 기다리고 있어요',

    // ── 스토어 · 커뮤니티 (Store · Explore) ──
    'Browse templates and add the ones you like to your Library — then use them in Studio with your own face or product.': '템플릿을 둘러보고 마음에 드는 것을 라이브러리에 추가한 뒤, 내 얼굴이나 제품으로 스튜디오에서 사용하세요.',
    'Search templates…': '템플릿 검색…', 'No templates here': '템플릿이 없습니다', 'Try another category or price.': '다른 카테고리나 가격을 선택해 보세요.',
    'Adding…': '추가 중…', 'Already in My templates': '이미 내 템플릿에 있음', 'Added to My templates': '내 템플릿에 추가됨',
    'Could not add:': '추가하지 못했습니다:', '✓ In My templates': '✓ 내 템플릿에 있음', '＋ Add to My templates': '＋ 내 템플릿에 추가',
    '✓ In Library': '✓ 라이브러리에 있음', 'Saved to your Library': '라이브러리에 저장됨', 'Removed from Saved': '저장에서 제거됨',
    'Community Creations': '커뮤니티 크리에이션', 'Real creations from the Doppia community. Like one? Make it with your own face or product.': 'Doppia 커뮤니티의 실제 크리에이션. 마음에 드나요? 내 얼굴이나 제품으로 만들어 보세요.',
    'Nothing here yet': '아직 아무것도 없어요', 'Be the first — create something in Studio (Public mode on) and it shows up here.': '가장 먼저 만들어 보세요 — 스튜디오에서 공개 모드로 생성하면 여기에 표시됩니다.',
    'Like failed:': '좋아요 실패:', 'Liked': '좋아요됨', 'Like': '좋아요', 'Report this creation for review?': '이 크리에이션을 검토 요청할까요?',
    'Reported — removed from feed': '신고됨 — 피드에서 제거', 'Reported. Thank you.': '신고되었습니다. 감사합니다.', 'Report failed:': '신고 실패:',
    'Creator not found': '크리에이터를 찾을 수 없음', 'This creator has no public templates or creations yet.': '이 크리에이터는 아직 공개 템플릿이나 크리에이션이 없습니다.',
    'No creator selected': '선택된 크리에이터 없음', 'Open a creator from a template or the Explore feed.': '템플릿이나 탐색 피드에서 크리에이터를 열어보세요.',
    'No public templates yet.': '아직 공개 템플릿이 없습니다.', 'Showcase': '쇼케이스', 'No public creations yet.': '아직 공개 크리에이션이 없습니다.',
    'Follow failed:': '팔로우 실패:', 'Made with this template': '이 템플릿으로 만든 작품',

    // ── 결제 (Billing) ──
    'Back': '뒤로', 'Pricing': '요금제', 'Choose your plan': '요금제를 선택하세요',
    'Monthly plans': '월간 요금제',
    'Subscribe monthly — your credits refill every month. Cancel anytime. Or top up with credit packs.': '매월 구독 — 크레딧이 매달 충전됩니다. 언제든 해지하세요. 또는 크레딧 팩으로 충전하세요.',
    'Template looks cost more than custom prompts.': '템플릿 룩은 커스텀 프롬프트보다 비용이 더 듭니다.',
    'Get a 3-month pass — pay once, no auto-renew. Credits are granted upfront. Or top up with credit packs anytime.': '3개월 이용권 — 한 번 결제, 자동 갱신 없음. 크레딧은 선지급됩니다. 또는 언제든 크레딧 팩으로 충전하세요.',
    'Pay as you go': '사용한 만큼 결제', 'Refresh': '새로고침', 'Payment complete. Your credits may take a few seconds to appear.': '결제 완료. 크레딧 반영에 몇 초 걸릴 수 있습니다.',
    '3-Month Passes': '3개월 이용권', 'Monthly': '월간', 'Annual': '연간', 'Current tier': '현재 등급', 'Get pass': '이용권 받기',
    'Try all modes': '모든 모드 체험', 'First result watermark-free': '첫 결과물 워터마크 없음', 'Then watermarked': '이후 워터마크 적용',
    'No watermark': '워터마크 없음', 'Reels + HD': '릴스 + HD', 'Priority queue': '우선 대기열', 'Personal license': '개인 라이선스',
    'Everything in Creator': 'Creator의 모든 기능', 'Everything in Pro': 'Pro의 모든 기능', 'Most popular': '가장 인기',
    'Commercial license': '상업용 라이선스', 'On-model + bulk': '온모델 + 대량', 'Scaling across a team or agency?': '팀이나 에이전시로 확장하시나요?',
    'Top-up credit packs (one-time)': '크레딧 충전 팩 (1회성)', 'A subscription is always cheaper per credit. Packs are for one-off top-ups.': '구독이 크레딧당 항상 더 저렴합니다. 팩은 일회성 충전용입니다.',
    'What credits buy': '크레딧으로 할 수 있는 것', 'Photo set (4 imgs)': '사진 세트 (4장)', 'On-model / composite set': '온모델 / 합성 세트',
    'Macro / detail shots': '매크로 / 디테일 컷', 'Reel (5s)': '릴스 (5초)', 'Reel (10s)': '릴스 (10초)', 'Add-on (HD/4K/caption…)': '추가 기능 (HD/4K/캡션…)',
    '◈4 is the starting price — richer renders cost more. Payments secured by Eximbay.': '◈4는 시작 가격입니다 — 더 풍부한 결과물은 비용이 올라갑니다. 결제는 Eximbay로 보호됩니다.',
    'Wallet automation': '지갑 자동화', 'Auto top-up': '자동 충전', 'Manage subscription': '구독 관리', 'Need a break?': '잠시 쉬어갈까요?',
    'Pause subscription': '구독 일시정지', 'Before you cancel…': '취소하기 전에…', 'Could not prepare payment.': '결제를 준비하지 못했습니다.',
    'Could not open the checkout page.': '결제 페이지를 열지 못했습니다.', 'Payment connection failed.': '결제 연결에 실패했습니다.',
    '3-month pass activated!': '3개월 이용권이 활성화되었습니다!', 'Purchase failed.': '구매에 실패했습니다.',
    'Auto top-up is coming soon.': '자동 충전은 곧 제공됩니다.', 'Expires': '만료',

    // ── 랜딩 (Landing) ──
    'One product photo. A full content studio.': '제품 사진 한 장. 완전한 콘텐츠 스튜디오.', 'No prompt engineering. Ever.': '프롬프트 엔지니어링, 전혀 필요 없습니다.',
    'Create product content →': '제품 콘텐츠 만들기 →', 'See how it works': '작동 방식 보기', '10 free credits': '무료 크레딧 10개',
    'on sign-up · No credit card required': '가입 시 · 신용카드 불필요', 'How it works': '작동 방식', 'Three steps. Zero prompts.': '세 단계. 프롬프트 제로.',
    'Upload your product': '제품 업로드', 'Generate & post': '생성 후 게시', 'Built for product content': '제품 콘텐츠를 위해 설계됨',
    'Fashion': '패션', 'Beauty': '뷰티', 'Cosmetics': '화장품', 'Accessories': '악세서리', 'Jewelry': '주얼리', 'Food & Cafe': '푸드 & 카페', 'Home & Living': '홈 & 리빙',
    'Tech': '테크', 'Pet': '펫', '＋ more': '＋ 더보기', 'Pricing': '요금제', 'Start free. Scale when you grow.': '무료로 시작하고, 성장하면 확장하세요.',
    'Get started': '시작하기', 'Start creating': '제작 시작', 'Industries': '산업군', 'For business': '비즈니스용',
    'Sell on Doppia': 'Doppia에서 판매', 'About': '소개', 'Blog': '블로그', 'Careers': '채용', 'Legal': '법적 고지',
    'Terms': '이용약관', 'Privacy': '개인정보', 'Content policy': '콘텐츠 정책', 'Made for brands, everywhere.': '어디서나, 브랜드를 위해.',

    // ── 로그인 (saas-login) ──
    // (2026-07-29) 옛 얼굴앱 태그라인 교체 — 랜딩 히어로와 같은 목소리(셀러 포지셔닝)로 통일
    'One product photo — the plan, lookbook and ad video, all done for you.': '제품 사진 한 장이면, 기획·룩북·광고영상까지 다 만들어드려요.', 'Log in': '로그인', 'Sign up': '회원가입',
    'Sign up & get 10 free credits': '가입하고 무료 크레딧 10개 받기', 'Password': '비밀번호', 'Confirm password': '비밀번호 확인',
    'Create account': '계정 만들기', 'Continue with Google': 'Google로 계속하기', 'New here?': '처음이신가요?',
    'Create an account': '계정 만들기', 'Already have an account?': '이미 계정이 있으신가요?', 'Creating…': '생성 중…',
    'Logging in…': '로그인 중…', 'Sign-up failed.': '가입에 실패했습니다.', 'Incorrect email or password.': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'Could not reach the server. Please try again shortly.': '서버에 연결하지 못했습니다. 잠시 후 다시 시도하세요.',

    // ── 크리에이터 · 수익 · 제휴 · 비즈니스 · 팀 (공통 라벨) ──
    'Creator Studio': '크리에이터 스튜디오', 'Become a seller': '셀러 되기', 'Become a seller →': '셀러 되기 →', 'Become a creator': '크리에이터 되기',
    'Quick actions': '빠른 작업', 'Published templates': '게시된 템플릿', 'Published': '게시됨', 'Total uses': '총 사용 수',
    'Cash payout': '현금 지급', 'Manage templates →': '템플릿 관리 →', 'Earnings & payouts': '수익 & 지급', 'Collections': '컬렉션',
    'Your public storefront': '내 공개 스토어', 'Seller status': '셀러 상태', 'Creator handle': '크리에이터 핸들', 'Creator share': '크리에이터 수익 배분',
    'Manage template': '템플릿 관리', 'Visibility': '공개 범위', 'Public (in the Feed)': '공개 (피드에 표시)', 'Private (only me)': '비공개 (나만)',
    'Unlock price': '잠금 해제 가격', 'Per-use royalty': '사용당 로열티', 'Publish to Explore': '탐색에 게시', 'Publish': '게시',
    'Add to My templates': '내 템플릿에 추가', 'Published to Explore': '탐색에 게시됨', 'Could not publish': '게시하지 못했습니다',
    'Template updated': '템플릿이 업데이트됨', 'Template deleted': '템플릿이 삭제됨', 'Delete this template? This cannot be undone.': '이 템플릿을 삭제할까요? 되돌릴 수 없습니다.',
    'Affiliate program': '제휴 프로그램', 'Your referral link': '내 추천 링크', '⧉ Copy link': '⧉ 링크 복사', 'Clicks': '클릭 수',
    'Sign-ups': '가입 수', 'Commission': '수수료', 'Share your link': '링크 공유', 'Commission rate': '수수료율', 'Tracking window': '추적 기간',
    'For teams & brands': '팀 & 브랜드용', 'API access': 'API 접근', 'Team': '팀', 'White-label': '화이트라벨', 'Reveal': '표시', 'Regenerate': '재생성',
    'Shopify app': 'Shopify 앱', 'Install on Shopify': 'Shopify에 설치', 'No team yet': '아직 팀이 없습니다', '+ Create team': '+ 팀 만들기',
    'Team members': '팀 멤버', '+ Invite member': '+ 멤버 초대', 'Shared credit pool': '공유 크레딧 풀', 'Amount': '금액', 'Transfer →': '이체 →',
    'White-label for agencies': '에이전시용 화이트라벨', 'Request white-label': '화이트라벨 문의', 'Posts published': '게시된 포스트',
    'Connected accounts': '연결된 계정', 'In queue': '대기 중', 'Scheduled': '예약됨', '+ Schedule post': '+ 포스트 예약',
    'Enter a team name': '팀 이름을 입력하세요', 'Failed to create team': '팀 생성에 실패했습니다', 'Transfer failed': '이체에 실패했습니다',

    // ── 마켓 · 템플릿 · 크리에이션 상세 ──
    'Sell your templates': '내 템플릿 판매하기', 'Virtual Models': '버추얼 모델', 'No templates yet.': '아직 템플릿이 없습니다.',
    'Publish a template': '템플릿 게시', 'Template name': '템플릿 이름', 'Usage fee (credits)': '사용료 (크레딧)', 'Publishing…': '게시 중…',
    'Publishing failed.': '게시에 실패했습니다.', 'Please enter a name and a prompt.': '이름과 프롬프트를 입력하세요.', '← Back': '← 뒤로',
    'No template.': '템플릿이 없습니다.', 'Could not load this template.': '이 템플릿을 불러오지 못했습니다.', 'Reference images used': '사용된 레퍼런스 이미지',
    'Use with your face': '내 얼굴로 사용', 'Add & use with your face': '내 얼굴로 추가 후 사용', 'Made with': '제작 사용',
    'no longer available': '더 이상 제공되지 않음', 'Recreate this exact style with your own photo': '내 사진으로 이 스타일을 그대로 재현',
    'Your creation': '내 크리에이션', '🌐 Public — make private': '🌐 공개 — 비공개로 전환', '🔒 Private — make public': '🔒 비공개 — 공개로 전환',
    '⬇ Download': '⬇ 다운로드', 'Download': '다운로드', '↗ Share': '↗ 공유', '＋ Create template': '＋ 템플릿 만들기',
    'Now public — shows in Explore': '이제 공개 — 탐색에 표시됨', 'Now private': '이제 비공개', 'Created': '생성일',
    'Save this look as a private template. Only you can see and use it.': '이 룩을 스튜디오에 비공개 템플릿으로 저장합니다. 나만 보고 사용할 수 있습니다.',
    'Select a category…': '카테고리 선택…', 'Save template': '템플릿 저장', 'Name your template.': '템플릿 이름을 지정하세요.',
    'Pick a cover image.': '커버 이미지를 선택하세요.', 'Pick a category.': '카테고리를 선택하세요.', 'Pick at least one theme.': '테마를 하나 이상 선택하세요.',
    'Saved to your templates': '내 템플릿에 저장됨', 'Save failed:': '저장 실패:', 'Regenerating…': '재생성 중…',

    // ── 인라인 <b> 태그로 조각난 문장들 (텍스트 노드 단위 키) ──
    // store 서브카피
    'Browse templates and': '템플릿을 둘러보고',
    'add the ones you like to your Library': '마음에 드는 것을 라이브러리에 추가하세요',
    '— then use them in Studio with your own face or product.': '— 그런 다음 내 얼굴이나 제품으로 스튜디오에서 사용하세요.',
    // explore 서브카피
    'Real creations from the Doppia community. Like one?': 'Doppia 커뮤니티의 실제 크리에이션. 마음에 드나요?',
    'Make it with your own face or product.': '내 얼굴이나 제품으로 만들어 보세요.',
    // settings 삭제 모달
    'This permanently disables': '다음 계정을 영구 비활성화하고',
    'and signs you out. To confirm, type': '로그아웃합니다. 확인하려면 다음을 입력하세요',
    'below.': '',
    'to the creator': '크리에이터에게', 'uses your generation credits': '생성 크레딧을 사용합니다',
    // 스튜디오 서브 카피 조각
    'Turn one look into a full week\'s set in a tap': '한 번의 룩을 탭 한 번으로 일주일치 세트로',
    // (2026-07-20) 스토어 숨김 — 옛 키('… · discover more in the Store.')는 매칭 대상이 사라져 제거
    'Your creations. Manage templates in Shots.': '내 크리에이션. 템플릿은 컷에서 관리하세요.',
    'Turn a product photo into the shots your listing needs.': '제품 사진 한 장으로, 상세페이지에 필요한 컷을 만들어요.',

    // ── 랜딩 페이지 전체 (히어로 조각 · 섹션 · 요금제 · 푸터) ──
    'One product photo.': '제품 사진 한 장.', 'A full content studio.': '완전한 콘텐츠 스튜디오.',
    'Drop in one product shot — fashion, beauty, food, home, tech and more — pick a template, and Doppia generates studio-grade lookbooks, on-model sets, lifestyle scenes and reels. Background removed automatically.': '제품 사진 한 장만 올리면 — 패션·뷰티·푸드·홈·테크 등 — 템플릿을 고르는 것만으로 Doppia가 스튜디오급 룩북, 온모델 세트, 라이프스타일 장면, 릴스를 만듭니다. 배경은 자동으로 제거됩니다.',
    '≈ 1 reel or 5 photo sets': '≈ 릴스 1개 또는 사진 세트 5개', 'on sign-up · No credit card required': '가입 시 · 신용카드 불필요',
    '(≈ 1 reel or 5 photo sets) on sign-up · No credit card required': '(≈ 릴스 1개 또는 사진 세트 5개) 가입 시 · 신용카드 불필요',
    'No credit card required': '신용카드 불필요', 'Three steps. Zero prompts.': '세 단계. 프롬프트 제로.',
    'The hard part — prompt engineering, lighting, consistency — is baked into every template. You just choose.': '어려운 부분 — 프롬프트 엔지니어링, 조명, 일관성 — 은 모든 템플릿에 담겨 있습니다. 고르기만 하세요.',
    'One product photo — any angle. We remove the background and lock the product so it stays true across every frame.': '어떤 각도든 제품 사진 한 장. 배경을 제거하고 제품을 고정해 모든 프레임에서 동일하게 유지합니다.',
    'Browse curated looks and trending reel formats for your industry. Filter by style — no prompt writing, no settings to fiddle with.': '업종에 맞는 큐레이션된 룩과 트렌드 릴스 포맷을 둘러보세요. 스타일로 필터링 — 프롬프트 작성도, 설정 조정도 없습니다.',
    'Get a full set of product photos or a ready reel in seconds. Download, or publish straight to Instagram.': '몇 초 만에 완성된 제품 사진 세트나 릴스를 받으세요. 다운로드하거나 인스타그램에 바로 게시하세요.',
    'Every shot your store needs — from one photo': '스토어에 필요한 모든 컷 — 사진 한 장에서',
    'Whatever you sell, the same template magic turns a single product shot into a full campaign.': '무엇을 팔든, 같은 템플릿의 마법이 제품 사진 한 장을 완전한 캠페인으로 바꿉니다.',
    'Studio-grade shots, no studio': '스튜디오 없이, 스튜디오급 컷',
    'Drop in one product photo — fashion, beauty, food, home, tech, pet and more — and get lookbooks, lifestyle scenes and on-model shots. Background removed automatically.': '제품 사진 한 장만 올리면 — 패션·뷰티·푸드·홈·테크·펫 등 — 룩북, 라이프스타일 장면, 온모델 컷을 받습니다. 배경은 자동으로 제거됩니다.',
    'Tailored templates for your industry': '업종에 맞춘 템플릿', 'On-model, flat-lay & macro detail': '온모델·플랫레이·매크로 디테일',
    'Commercial license included': '상업용 라이선스 포함', 'Scroll-stopping video that sells': '시선을 붙잡고 판매로 이어지는 영상',
    'Turn the same product into 360° spins, unboxings and lifestyle reels — trending formats refreshed weekly, ready for Instagram and TikTok.': '같은 제품을 360° 스핀, 언박싱, 라이프스타일 릴스로 — 매주 갱신되는 트렌드 포맷, 인스타그램·틱톡에 바로 사용 가능.',
    'Trending reel formats, weekly drops': '트렌드 릴스 포맷, 매주 업데이트', 'Product stays true across every frame': '모든 프레임에서 제품이 그대로 유지',
    'Photos + reels in one click': '사진 + 릴스를 클릭 한 번에', 'Tailored templates for every industry': '모든 업종에 맞춘 템플릿',
    'Make great templates or AI models?': '멋진 템플릿이나 AI 모델을 만드시나요?', 'Sell on Doppia & keep 70% →': 'Doppia에서 판매하고 70%를 가져가세요 →',
    'Start free. Scale when you grow.': '무료로 시작하고, 성장하면 확장하세요.',
    'Monthly credits with your plan, top up anytime. Photo sets from ◈4 · reels from ◈8.': '요금제에 월 크레딧 포함, 언제든 충전. 사진 세트 ◈4부터 · 릴스 ◈8부터.',
    'to try': '체험용', 'All modes': '모든 모드', 'First result watermark-free': '첫 결과물 워터마크 없음', 'Personal license': '개인 라이선스',
    'credits / month': '크레딧 / 월', 'No watermark': '워터마크 없음', 'Reels + HD': '릴스 + HD', 'Priority queue': '우선 대기열',
    'Everything in Creator': 'Creator의 모든 기능', 'Start creating': '제작 시작', 'Everything in Pro': 'Pro의 모든 기능',
    '4K + multilingual captions': '4K + 다국어 캡션', 'Start with Pro': 'Pro로 시작', 'Everything in Pro': 'Pro의 모든 기능',
    'Commercial license': '상업용 라이선스', 'On-model + bulk': '온모델 + 대량', 'Premium AI models': '프리미엄 AI 모델', 'Choose Brand': 'Brand 선택',
    'Selling products or running ads?': '제품을 팔거나 광고를 운영하시나요?', 'Teams & agencies →': '팀 & 에이전시 →',
    'Your next 30 product shots are one photo away.': '다음 제품 컷 30장이 사진 한 장이면 됩니다.',
    'Join the brands and sellers making product content on autopilot.': '제품 콘텐츠를 자동으로 만드는 브랜드·셀러들과 함께하세요.',
    'Start free — 10 credits →': '무료로 시작 — 크레딧 10개 →', 'Start free': '무료로 시작', 'For business': '비즈니스용', 'About': '소개', 'Blog': '블로그',
    'Careers': '채용', 'Legal': '법적 고지', 'Content policy': '콘텐츠 정책', 'Made for brands, everywhere.': '어디서나, 브랜드를 위해.',
    'Powered by best-in-class models': '최고 수준의 모델로 구동', 'Built for product content': '제품 콘텐츠를 위해 설계됨',
    'Every shot your store needs': '스토어에 필요한 모든 컷', 'brands & sellers': '브랜드 & 셀러', 'product shots created': '생성된 제품 컷',
    'avg customer rating': '평균 고객 평점', 'industries supported': '지원 업종', 'to a full post': '완성된 게시물로',
    'curated templates': '큐레이션 템플릿', 'photo to start': '시작 사진', 'prompts to write': '작성할 프롬프트',
    'Product · 360° Spin': '제품 · 360° 스핀', 'On-Model Lookbook': '온모델 룩북', 'Studio Packshot': '스튜디오 팩샷',
    'Cafe Lifestyle': '카페 라이프스타일', 'Macro Detail': '매크로 디테일', 'Unboxing': '언박싱', 'Flat-Lay Set': '플랫레이 세트',
    'Lifestyle Scene': '라이프스타일 장면', 'Product Reels': '제품 릴스', 'Product Photos': '제품 사진',
    'On-Model Reel': '온모델 릴스', 'Editorial Hero': '에디토리얼 히어로', 'Color Pop': '컬러 팝', 'On-Neck Beauty': '온넥 뷰티', 'Colorblock': '컬러블록',
    'Sunlit Pop': '선릿 팝', 'Bold Color': '볼드 컬러',
    'from one photo': '사진 한 장에서', 'credits to try': '체험용 크레딧',
    'is included with Brand — and Studio offers it right when you publish.': '는 Brand에 포함되며, 게시할 때 스튜디오가 바로 제공합니다.',
    '🛍️ Product Photos': '🛍️ 제품 사진', '▶ Product Reels': '▶ 제품 릴스',
    '💸 Make great templates or AI models?': '💸 멋진 템플릿이나 AI 모델을 만드시나요?',
    'Product': '제품', 'Company': '회사', 'Resources': '리소스',

    // ── 온보딩 (Onboarding — doppia guide) ──
    // 플로우 라벨 · 메뉴 · 버튼
    'doppia guide': 'doppia 사용하는 법', 'Doppia guide': 'doppia 사용하는 법',
    'Doppia guide — how Shots works': 'doppia 사용하는 법 — 컷 작동 방식',
    'Guides': '가이드', 'What do you want to do?': '무엇을 하시겠어요?',
    'Create with a template': '템플릿으로 만들기', 'Write your own prompt': '직접 프롬프트 쓰기',
    'Save a creation as a template': '크리에이션을 템플릿으로 저장',
    'Skip': '건너뛰기', 'Next': '다음', 'Got it': '확인', 'Save': '저장',
    // 템플릿 플로우
    'Select your product': '제품 선택',
    'Click Select a product and upload one clear photo. We keep it consistent across every scene.': '‘제품 선택’을 눌러 선명한 사진 한 장을 올리세요. 모든 장면에서 일관되게 유지합니다.',
    'Tap a template below — the look is applied to your product instantly. Filter by category (Apparel, Beauty…). No prompt needed.': '아래 템플릿을 탭하면 그 룩이 제품에 바로 적용됩니다. 카테고리(의류·뷰티 등)로 필터링하세요. 프롬프트는 필요 없습니다.',
    'Adjust settings': '설정 조정',
    'Set the model, ratio, size, and count. The defaults work fine to start.': '모델·비율·크기·수량을 설정하세요. 처음엔 기본값으로 충분합니다.',
    'Hit Generate. The badge shows the credit cost, and your product shots appear below.': '‘생성’을 누르세요. 뱃지에 크레딧 비용이 표시되고, 제품 컷이 아래에 나타납니다.',
    // 커스텀 플로우
    'Switch to Custom': '커스텀으로 전환',
    'On the main screen, click "write your own prompt" to switch to Custom mode.': '메인 화면에서 ‘직접 프롬프트 쓰기’를 눌러 커스텀 모드로 전환하세요.',
    'Add a reference (optional)': '레퍼런스 추가 (선택)',
    'Select a product photo so results stay true to it — or skip it and go text-only.': '결과가 제품과 일치하도록 제품 사진을 선택하세요 — 또는 건너뛰고 텍스트만으로 진행하세요.',
    'Write your prompt': '프롬프트 작성',
    'Use "write your own prompt" to describe the shot — the scene, angle, and mood. No template needed.': '‘직접 프롬프트 쓰기’로 원하는 컷 — 장면·앵글·분위기 — 을 설명하세요. 템플릿은 필요 없습니다.',
    'Choose your settings': '설정 선택',
    'Pick the model, ratio, size, and count. The defaults work fine to start.': '모델·비율·크기·수량을 선택하세요. 처음엔 기본값으로 충분합니다.',
    'Hit Generate. Your custom product shots appear below.': '‘생성’을 누르세요. 커스텀 제품 컷이 아래에 나타납니다.',
    // 저장 플로우
    'Turn a Custom creation into a template': '커스텀 크리에이션을 템플릿으로',
    'In Your creations, click + Create template under any Custom creation — an image or reel you made from your own prompt. (Template-based creations already have a template.)': '‘내 크리에이션’에서 직접 프롬프트로 만든 커스텀 크리에이션(이미지 또는 릴스) 아래의 ‘＋ 템플릿 만들기’를 누르세요. (템플릿으로 만든 크리에이션은 이미 템플릿이 있습니다.)',
    'Name & category': '이름 & 카테고리',
    'Give it a name and pick a category so it is easy to reuse.': '나중에 다시 쓰기 쉽도록 이름을 정하고 카테고리를 고르세요.',
    'Pick themes': '테마 선택',
    'Choose at least one theme — it groups the template in Shots.': '테마를 하나 이상 선택하세요 — 스튜디오에서 템플릿을 묶어줍니다.',
    'Save — it is now in My templates, ready to reuse anytime. No prompt needed next time.': '저장하면 ‘내 템플릿’에 들어가 언제든 다시 쓸 수 있습니다. 다음엔 프롬프트가 필요 없습니다.',
    // 목업 문구 · 저장 모달 필드
    'write your own prompt': '직접 프롬프트 쓰기', '✎ Custom': '✎ 커스텀', '⧉ Copy prompt': '⧉ 프롬프트 복사',
    '— write your own prompt, no template needed.': '— 직접 프롬프트를 쓰세요, 템플릿 불필요.',
    'Type a prompt…': '프롬프트를 입력하세요…', '+ Negative prompt': '+ 네거티브 프롬프트',
    'Apparel': '의류', 'General': '일반', 'Nail': '네일',
    'Product Cut': '제품 컷', 'On-model': '온모델', 'Lookbook': '룩북',
    '(what generates the image)': '(이미지를 생성하는 내용)', 'My template': '내 템플릿',
    '(optional)': '(선택)', 'e.g. Editorial marble backdrop…': '예: 에디토리얼 마블 배경…',
    '(pick at least one)': '(하나 이상 선택)', 'Select a category… ▾': '카테고리 선택… ▾',
    '+ New theme': '+ 새 테마',

    // ── 라이브러리 · Shots: In use / Stored ──
    // (2026-07-17) 옛 'In Studio / Library only' 폐기. 사용자에게 'Studio'를 안 보이게 했으므로
    //   장소("스튜디오에 있음")로 말할 수 없다 → 상태("사용 중 / 보관만")로 바꿨다.
    //   ⚠️ 라벨만 바뀌었다. DB는 template_owns.in_studio 그대로다(엔드포인트 /owned/in-studio도 불변).
    //   ⚠️ 'Stored'(섹션 헤더=보관만)와 'Put away'(토스트=보관했습니다)를 일부러 다른 문자열로 뒀다 —
    //      사전 키가 EN 원문이라 같은 문자열이면 번역을 하나만 가질 수 있다.
    'In use': '사용 중', 'Stored': '보관만',
    '✓ In use': '✓ 사용 중', '↑ Take out': '↑ 꺼내기',
    'shown when you make Shots': '지금 쓰는 것들', 'owned · not in use': '보유 · 보관 중',
    '↑ Take all out': '↑ 전부 꺼내기', '↓ Store all': '↓ 전부 보관',
    'In use / Stored': '사용 중 / 보관만', 'Manage templates': '템플릿 관리',
    'Nothing taken out yet — take one out from Stored below.': '아직 꺼낸 게 없어요 — 아래 ‘보관만’에서 꺼내세요.',
    'Empty. Hit a card’s “✓ In use” (or “Store all”) to park templates here — they stay in your library but stop showing when you make Shots.': '비어 있습니다. 카드의 ‘✓ 사용 중’(또는 ‘전부 보관’)을 눌러 여기에 보관하세요 — 라이브러리에는 남고 고를 때만 안 뜹니다.',
    'Store — stays in your Library': '보관 — 라이브러리에는 남습니다',
    // (2026-07-20) Shots 템플릿 관리 '사용 중' 빈 상태 — 원래 사전에 없어 영어로 새던 문구(스토어 숨김으로 꼬리를 떼면서 같이 채움)
    'Nothing here yet — take one out from Stored below (↑).': '아직 꺼낸 게 없어요 — 아래 ‘보관만’에서 꺼내세요(↑).',
    'Take out again': '다시 꺼내기',
    'Taken out': '꺼냈습니다', 'Put away': '보관했습니다',
    'Could not update': '업데이트하지 못했습니다', 'Failed — try again': '실패 — 다시 시도하세요',

    // ── (2026-07-29) 홈 컨셉바·팩 CTA — 미번역으로 새던 문구 ──
    'Add a concept or mood — optional (a photo alone works)': '컨셉이나 무드를 한 줄 — 선택사항 (사진만으로도 충분해요)',
    'Create content pack': '콘텐츠 팩 만들기',
    'Start with your product photo — we build a full content pack. Or pick a specific tool below.': '제품 사진 한 장이면 콘텐츠 팩을 통째로 만들어 드려요. 아래에서 원하는 도구만 골라 시작해도 좋아요.',
    'Open in Shots': '컷에서 열기',
    // ── (2026-07-29) 템플릿 이름 한글판 — 홈 레일·스튜디오 픽커 카드 ──
    'Model Cut': '모델 컷', 'Product Hero': '제품 화보',
    'Jewelry Product Cut': '주얼리 제품 컷', 'Jewelry Worn Cut': '주얼리 착용 컷', 'Jewelry On Model': '주얼리 온모델',
    'Bodywear Product Cut': '바디웨어 제품 컷', 'Bodywear Worn Cut': '바디웨어 착용 컷', 'Bodywear On Model': '바디웨어 온모델',
    'Hand to Nail': '핸드 투 네일', 'Worn Cut': '착용 컷', 'On Model': '온모델',
    // ── (2026-07-29) 홈 레일 템플릿 설명 한글판 ──
    'Turn one flat garment photo into a clean e-commerce cut — flat lay or ghost mannequin, no model or studio needed.': '평면 의류 사진 한 장을 깔끔한 커머스 컷으로 — 플랫레이·고스트 마네킹, 모델도 스튜디오도 필요 없어요.',
    'Put your product on a photorealistic model. Choose the model and setting, then get on-model catalog shots from a single photo.': '제품을 실사 모델에게 입혀 드려요. 모델과 배경만 고르면 사진 한 장으로 온모델 카탈로그 컷이 나와요.',
    'Editorial hero shots for your product — dewy glass, liquid splash, noir gold and more premium sets to choose from.': '제품을 위한 에디토리얼 화보 — 듀이 글라스·리퀴드 스플래시·누아르 골드 등 프리미엄 세트에서 골라요.',
    'Show jewelry worn on hand, neck, ears or wrist — close, tactile shots that sell scale and shine.': '손·목·귀·손목에 착용한 주얼리를 가까이 — 크기와 반짝임이 그대로 전해지는 착용 컷이에요.',
    'Your jewelry on a styled model — earrings, necklace, ring or bracelet, shot editorial-clean.': '스타일링된 모델이 착용한 주얼리 — 귀걸이·목걸이·반지·팔찌를 에디토리얼 톤으로 찍어요.',
    'Turn a bare-hand photo into polished nail-art shots — ideal for nail salons and press-on brands.': '맨손 사진 한 장을 완성된 네일아트 컷으로 — 네일샵·프레스온 브랜드에 딱이에요.',

    // ── (2026-07-29) Ad Video(UGC) 페이지 — 미번역으로 새던 문구 ──
    'A finished ad video — your scenes cut together, ready to post.': '완성된 광고영상 — 씬을 이어 붙여, 바로 올릴 준비까지.',
    'Narration optional': '내레이션 선택', 'Music optional': '음악 선택',
    'Video quality': '영상 화질',
    'Basic — ◈625 / scene': '베이식 — 씬당 ◈625',
    'Premium — crisper frames & smoother motion · ◈945 / scene': '프리미엄 — 더 선명한 프레임·부드러운 모션 · 씬당 ◈945',
    "Review the script on the right, then generate — you're only charged when you build the video.": '오른쪽 대본을 확인한 뒤 생성하세요 — 크레딧은 영상을 만들 때만 차감돼요.',
    'Building your video…': '영상을 만드는 중…',
    'Each scene is being generated…': '각 씬을 생성하는 중…',
    'No need to wait — change the concept and write another. This one keeps building in Your creations.': '기다릴 필요 없어요 — 컨셉을 바꿔 하나 더 써도 돼요. 이 영상은 내 크리에이션에서 계속 만들어져요.',
    'Edit scene': '씬 편집', 'Add a scene': '씬 추가', 'Scenes': '씬',
    'Music': '음악', 'Change music': '음악 바꾸기', 'or describe a vibe…': '원하는 분위기를 적어보세요…',
    'Save & finish': '저장하고 끝내기',
    "Not saved yet — it'll auto-save when you leave, or Save & finish now.": '아직 저장 전 — 나가면 자동 저장되고, 지금 저장하고 끝내도 돼요.',
    'hook · scenes · caption': '훅 · 씬 · 자막',
    '🎣 Hook': '🎣 훅',

    // ── (2026-07-29) 빌링 가격표 진실화 후 한글판 — 날조 제거된 새 불릿·각주 ──
    'Subscription plans': '구독 플랜',
    'Monthly': '월간',
    'All features · 2K quality': '전 기능 · 2K 화질',
    'Results post to the public feed': '결과가 공개 피드에 게시',
    'Private Mode — results stay private': 'Private Mode — 결과 비공개',
    'All features · commercial license': '전 기능 · 커머셜 라이선스',
    'Highest volume': '최대 볼륨',
    'Shared team credit pool': '팀 공유 크레딧 풀',
    '10 concurrent jobs': '동시 작업 10',
    '15 concurrent jobs': '동시 작업 15',
    '20 concurrent jobs': '동시 작업 20',
    'Priority support': '우선 지원',
    'Dedicated support': '전담 지원',
    '+% = more credits per won than Starter, at the same spend': '+% = 같은 금액으로 Starter보다 더 받는 크레딧 비율',
    'Enterprise — annual, best value per credit': '기업 — 연간 결제, 크레딧당 단가 최저',

    // ── (2026-07-29) 새 가이드(guide.js v5) — 표면별 온보딩+인터랙티브 투어 ──
    'Welcome to Doppia': 'Doppia에 오신 걸 환영해요',
    'How Shots works': '컷, 이렇게 써요',
    'How Ad Video works': '광고영상, 이렇게 써요',
    'How Content Pack works': '콘텐츠 팩, 이렇게 써요',
    // (2026-07-29) pack.html이 i18n을 로드하면서 드러난 페이지 크롬 + studio 미디어 픽커 제목
    'Product Pack': '콘텐츠 팩',
    'Select Media': '미디어 선택',
    'One product photo is all you need': '제품 사진 한 장이면 충분해요',
    'Detail cuts, editorials, on-model shots and ad videos — everything starts from a single photo.': '상세컷·화보·착용컷·광고영상까지 — 전부 사진 한 장에서 시작돼요.',
    'Three ways to create': '만드는 방법은 세 가지',
    'Shots — catalog photos from templates. Ad Video — a 9:16 talking ad. Content Pack — a full planned set at once.': '컷 — 템플릿으로 만드는 카탈로그 사진. 광고영상 — 말하는 9:16 광고. 콘텐츠 팩 — 기획까지 알아서, 세트가 통째로.',
    'Pay only for what comes out': '나온 것만 과금돼요',
    'You start with 1,500 free credits. Failed generations refund automatically.': '가입하면 1,500 크레딧이 무료예요. 실패한 생성은 자동으로 환불돼요.',
    'Add your product photo': '제품 사진을 올려요',
    'One photo is enough — no extra angles, no references.': '한 장이면 돼요 — 다른 각도도, 레퍼런스도 필요 없어요.',
    'Pick a template': '템플릿을 골라요',
    'Choose the look you want. No prompts needed — the template does the planning.': '원하는 무드만 고르면 돼요. 프롬프트는 필요 없어요 — 기획은 템플릿이 해요.',
    'Set ratio, size and count': '비율·크기·수량을 정해요',
    'Match your product page: 4:5, 1:1, 9:16 or custom, up to 8 shots per run.': '상세페이지에 맞춰 4:5·1:1·9:16·커스텀, 한 번에 최대 8장까지.',
    'Generate and refine': '생성하고, 말로 고쳐요',
    'Results land in Your creations. Edit with words — "make the background gold".': '결과는 내 크리에이션에 쌓여요. "배경만 골드로" — 말로 고칠 수 있어요.',
    'Photo + one line': '사진 + 한 줄',
    'Add a product photo and one line about it — or leave the line empty and Doppia reads the photo.': '제품 사진과 한 줄이면 돼요 — 비워두면 사진을 읽고 대신 써 드려요.',
    'Free script preview': '대본은 무료로 먼저',
    'Doppia writes the concept, scenes and captions. Review the script for free before anything is charged.': '컨셉·씬·자막을 Doppia가 써요. 과금 전에 대본을 무료로 확인하세요.',
    'Edit scenes freely': '씬은 자유롭게 편집',
    'Reorder, rewrite or regenerate any single scene. Add music, narration and language (English · 한국어).': '순서 바꾸기·다시 쓰기·한 씬만 재생성까지. 음악·내레이션·언어(English · 한국어)도 골라요.',
    'Build the video': '영상을 만들어요',
    'Credits are charged only when you build the final video.': '크레딧은 최종 영상을 만들 때만 차감돼요.',
    'One photo, zero planning': '사진 한 장, 기획은 제로',
    'Upload a product photo. Writing a mood line is optional.': '제품 사진을 올리세요. 무드 한 줄은 선택이에요.',
    'Doppia plans the set': '세트는 Doppia가 기획해요',
    'It looks at your product and decides which cuts to make — PDP, lifestyle, concept, seasonal.': '제품을 보고 어떤 컷을 만들지 정해요 — 판매컷·라이프스타일·컨셉·시즌까지.',
    'Confirm, then generate': '확인하고, 생성해요',
    'You approve the base reference first. Assets arrive one by one — pay only for what renders.': '기준 레퍼런스를 먼저 승인해요. 결과는 하나씩 도착하고, 나온 것만 과금돼요.',
    'Try it with me →': '같이 해보기 →',
    'Got it': '알겠어요',
    'Don’t show this again': '다시 보지 않기',
    '“Try it with me” walks you through the real screen — generating at the end uses real credits (failed runs auto-refund).': '"같이 해보기"는 실제 화면 위에서 안내해요 — 마지막 생성에는 실제 크레딧이 쓰여요(실패는 자동 환불).',
    'Next': '다음',
    'Finish — over to you': '끝 — 이제 직접!',
    'Exit tour': '투어 나가기',
    'Step 1 — your product': '1단계 — 내 제품',
    'Click here and upload one product photo.': '여기를 눌러 제품 사진 한 장을 올리세요.',
    'Step 2 — template': '2단계 — 템플릿',
    'Pick a template below. Prices are shown per cut.': '아래에서 템플릿을 고르세요. 컷당 가격이 표시돼요.',
    'Step 3 — options': '3단계 — 옵션',
    'Ratio, size and count. Defaults are fine to start.': '비율·크기·수량. 처음엔 기본값 그대로도 좋아요.',
    'Step 4 — generate': '4단계 — 생성',
    'Press Generate when ready. This uses real credits — failed runs auto-refund.': '준비되면 생성을 누르세요. 실제 크레딧이 쓰여요 — 실패는 자동 환불돼요.',
    'Step 1 — photo': '1단계 — 사진',
    'Add your product photo here.': '여기에 제품 사진을 올리세요.',
    'Step 2 — one line': '2단계 — 한 줄',
    'Describe your product or the ad you want — or leave it empty and Doppia reads the photo.': '제품이나 원하는 광고를 한 줄로 — 비워두면 사진을 읽고 대신 써 드려요.',
    'Step 3 — free script, then build': '3단계 — 무료 대본, 그다음 영상',
    'Press this — the script is written for free. Review it on the right, then press “Create video” there to build. Credits are charged only at that final step.': '이걸 누르면 대본이 무료로 써져요. 오른쪽에서 확인한 뒤 거기의 "영상 만들기"를 누르세요 — 크레딧은 그 마지막 단계에서만 차감돼요.',
    'Drop your product photo here (or click to choose).': '여기에 제품 사진을 끌어다 놓으세요(클릭해도 돼요).',
    'Step 2 — mood (optional)': '2단계 — 무드(선택)',
    'One line of mood or concept. Empty is fine — Doppia plans from the photo.': '무드나 컨셉 한 줄. 비워도 괜찮아요 — 사진만 보고 기획해요.',
    'Step 3 — create': '3단계 — 만들기',
    'Start the pack. This uses real credits — you are charged only for delivered assets.': '팩을 시작해요. 실제 크레딧이 쓰이고, 도착한 결과물만 과금돼요.',

    // ── (2026-07-29) pack.html 영어 원본화 — 본문·모달·버튼 (KO값 = 기존 하드코딩 문자열 그대로) ──
    "Drop in one or a few product photos — we'll plan and make the content you need.": '상품 사진 1~몇 장을 넣으면 필요한 콘텐츠를 알아서 만들어 드립니다.',
    'Drag & drop photos, or click to upload': '사진을 끌어다 놓거나 클릭해서 업로드',
    'Concept · mood you want': '원하는 컨셉 · 분위기',
    '(optional — photos alone are enough)': '(선택 — 사진만으로도 됩니다)',
    'e.g. cozy morning café vibe with a latte / luxury cut on a minimal grey backdrop — describe any scene or mood you want': '예: 따뜻한 카페에서 라떼와 함께 아침 감성 / 미니멀한 회색 배경의 럭셔리 컷 — 원하는 장면·무드를 자유롭게 적어주세요',
    'Write one and cuts are planned around that concept. Leave it empty and a standard set is planned for your product. (Category and set detection is automatic from the photos.)': '적어주시면 그 컨셉을 기준으로 컷을 기획합니다. 비워두면 제품에 맞는 표준 구성으로 자동 생성돼요. (카테고리·세트 여부는 사진으로 자동 판단)',
    'Create content': '콘텐츠 만들기',
    'Generating…': '생성 중…',
    'Download all': '전체 다운로드',
    'Nothing here yet. Add a product photo above to make your first content.': '아직 만든 콘텐츠가 없어요. 위에서 상품 사진을 넣어 만들어 보세요.',

    // ── (2026-07-29) 템플릿·컷·스타일 이름 전수 한글판 + 테마 칩 + 디테일 placeholder ──
    'Clothing': '의류',
    'Innerwear & Swim': '이너웨어·수영복',
    'Add your own touch — e.g. red dress, golden hour': '나만의 디테일을 더해보세요 — 예: 붉은 드레스, 골든아워',
    'Bodywear Flat Lay': '바디웨어 플랫레이',
    'Bodywear Ghost Mannequin': '바디웨어 고스트 마네킹',
    'Bodywear Fabric Macro': '바디웨어 원단 매크로',
    'Bodywear Front Crop': '바디웨어 정면 크롭',
    'Bodywear Side Profile': '바디웨어 측면 실루엣',
    'Bodywear Back Crop': '바디웨어 후면 크롭',
    'Bodywear Waistband Detail': '바디웨어 밴드 디테일',
    'Bodywear Bust Fit': '바디웨어 상의 핏',
    'Bodywear On Model Front': '바디웨어 온모델 정면',
    'Bodywear On Model Three-Quarter': '바디웨어 온모델 사선',
    'Bodywear On Model Editorial': '바디웨어 온모델 화보',
    'Flat Lay Cut': '플랫레이 컷',
    'Ghost Mannequin Cut': '고스트 마네킹 컷',
    'Jewelry Flat Lay': '주얼리 플랫레이',
    'Jewelry Floating': '주얼리 플로팅',
    'Jewelry Macro Detail': '주얼리 매크로 디테일',
    'Jewelry On Ears': '귀 착용 컷',
    'Jewelry On Hand': '손 착용 컷',
    'Jewelry On Neck': '목 착용 컷',
    'Jewelry On Wrist': '손목 착용 컷',
    'Jewelry On Model Bracelet': '온모델 팔찌',
    'Jewelry On Model Earrings': '온모델 귀걸이',
    'Jewelry On Model Necklace': '온모델 목걸이',
    'Jewelry On Model Ring': '온모델 반지',
    'Jewelry Pedestal': '주얼리 페데스탈',
    'Jewelry Unbox ASMR': '주얼리 언박싱 ASMR',
    'Necklace on Neck': '목걸이 착용',
    'Ring on Finger': '반지 착용',
    'Earring on Ear': '귀걸이 착용',
    'Wrist Wear': '손목 착용',
    'Bracelet Café Candid': '팔찌 카페 캔디드',
    'Bracelet Color Pop': '팔찌 컬러 팝',
    'Bracelet Colorblock': '팔찌 컬러블록',
    'Bracelet Editorial Campaign': '팔찌 화보 캠페인',
    'Bracelet Golden Hour': '팔찌 골든아워',
    'Bracelet In Bloom': '팔찌 인 블룸',
    'Bracelet Intimate': '팔찌 인티밋',
    'Bracelet Monochrome Noir': '팔찌 모노크롬 누아르',
    'Bracelet Scarf Portrait': '팔찌 스카프 포트레이트',
    'Ring Café Candid': '반지 카페 캔디드',
    'Ring Color Pop': '반지 컬러 팝',
    'Ring Colorblock': '반지 컬러블록',
    'Ring Editorial Campaign': '반지 화보 캠페인',
    'Ring Golden Hour': '반지 골든아워',
    'Ring In Bloom': '반지 인 블룸',
    'Ring Intimate': '반지 인티밋',
    'Ring Monochrome Noir': '반지 모노크롬 누아르',
    'Ring Scarf Portrait': '반지 스카프 포트레이트',
    'Earring Campaign': '귀걸이 캠페인',
    'Earring Color Pop': '귀걸이 컬러 팝',
    'Earring Golden Hour': '귀걸이 골든아워',
    'Earring Intimate': '귀걸이 인티밋',
    'Earring Monochrome': '귀걸이 모노크롬',
    'Earring Scarf Portrait': '귀걸이 스카프 포트레이트',
    'Aqua Float': '아쿠아 플로트',
    'Bath Ledge': '배스 레지',
    'Bold Color Block': '볼드 컬러블록',
    'Botanical Dew': '보태니컬 듀',
    'Cryo Frost': '크라이오 프로스트',
    'Dewy Glass': '듀이 글라스',
    'Foam & Suds': '폼 앤 버블',
    'Gift Set Group': '기프트 세트',
    'Gloss Mirror': '글로스 미러',
    'Light Caustics': '빛 커스틱',
    'Liquid Splash': '리퀴드 스플래시',
    'Mineral Crystal': '미네랄 크리스털',
    'Noir Gold': '누아르 골드',
    'Palette Flat-lay': '팔레트 플랫레이',
    'Pastel Dream': '파스텔 드림',
    'Silk Drape': '실크 드레이프',
    'Stone Plinth Luxe': '스톤 플린스 럭스',
    'Swatch Beside': '스와치 컷',
    'Wet Tile Spa': '웻 타일 스파',
    'Sunlit Terrace': '선릿 테라스',
    'Summer Beach Coconut': '서머 비치 코코넛',
    'Compact Powder Pop': '컴팩트 파우더 팝',
    'Glide Stick Swipe': '글라이드 스틱 스와이프',
    'Quick Glow Snap': '퀵 글로우 스냅',
    'On-Model Glow Drop': '온모델 글로우 드롭',
    'On-Skin Patch Hero': '온스킨 패치 히어로',
    'Teeth Shade Card': '치아 셰이드 카드',
    'Shade Range Grid': '셰이드 레인지 그리드',
    'Macro Swatch Lab': '매크로 스와치 랩',
    'Ingredient Callout': '성분 강조 컷',
    'Ingredient Claim Card': '성분 클레임 카드',
    '360 Glow Spin': '360 글로우 스핀',
    '360 Product Spin': '360 제품 스핀',
    'Universal 360 Spin': '유니버설 360 스핀',
    'Aesthetic Shelfie': '감성 셀피 선반',
    'Analog Film Cafe': '아날로그 필름 카페',
    'Approachable Brand': '친근한 브랜드 톤',
    'Background & Wardrobe Swap': '배경·의상 스왑',
    'Bedroom Sanctuary Styled': '베드룸 생추어리',
    'Blue Hour Serenity': '블루아워 세레니티',
    'Bohemian Warmth Alcove': '보헤미안 웜 알코브',
    'Botanical Coffee Beans': '보태니컬 커피빈',
    'Candid Photo Dump': '캔디드 포토 덤프',
    'Clean Hero Pack': '클린 히어로 팩',
    'Cozy Cafe Moment': '코지 카페 모먼트',
    'Cuddle Hour': '커들 아워',
    'Dappled Shadows Studio': '나뭇잎 그림자 스튜디오',
    'Daylight Brunch Flatlay': '데이라이트 브런치 플랫레이',
    'Desk Setup Flatlay': '데스크 셋업 플랫레이',
    'Device UI Mockup Set': '디바이스 UI 목업 세트',
    'Empty-to-Styled Reveal': '비포·애프터 스타일링',
    'Entryway Welcome Styled': '엔트리 웰컴 스타일드',
    'Executive Authority': '이그제큐티브 포트레이트',
    'Fit & Size On-Body': '실착 핏·사이즈',
    'Fit Check On-Model': '온모델 핏 체크',
    'Flat-Lay Grid': '플랫레이 그리드',
    'Golden Hour Anywhere': '골든아워 애니웨어',
    'Golden Hour Window': '골든아워 윈도우',
    'Golden-Hour Cafe Mood': '골든아워 카페 무드',
    'Habitat Scene Set': '해비탯 씬 세트',
    'Holiday Warmth Styled': '홀리데이 웜 스타일드',
    'Housewarming Move-In Ready': '집들이 무드',
    'In-Room Scale Set': '실내 스케일 세트',
    'In-hand Quick Demo': '손에 든 퀵 데모',
    'Industrial Warmth Loft': '인더스트리얼 웜 로프트',
    'Japandi Warmth Nook': '재팬디 웜 누크',
    'Kitchen & Dining Styled': '키친·다이닝 스타일드',
    'Large-Format Hero': '대형 히어로',
    'Lifestyle Scene Pack': '라이프스타일 씬 팩',
    'Lifestyle-in-Context': '라이프스타일 컨텍스트',
    'LinkedIn Classic': '링크드인 클래식',
    'Macro Crunch': '매크로 크런치',
    'Macro Tactile Zoom': '매크로 질감 줌',
    'Macro Texture Shots': '매크로 텍스처 컷',
    'Marble Linen Still Life': '마블·린넨 정물',
    'Material Detail Suite': '소재 디테일 스위트',
    'Menu / Price Card': '메뉴·가격 카드',
    'Mid-Century Modern Warmth Studio': '미드센추리 웜 스튜디오',
    'Minimalist Negative Space': '미니멀 네거티브 스페이스',
    'Minimalist Warmth Study': '미니멀 웜 스터디',
    'Monochrome Fine Art': '모노크롬 파인아트',
    'Morning Light Study': '모닝 라이트 스터디',
    'On-Model Studio': '온모델 스튜디오',
    'On-Pet Fit': '반려동물 착용 핏',
    'Packaging & Unboxing': '패키징·언박싱',
    'Patio Season Styled': '파티오 시즌 스타일드',
    'Pet Product Hero': '펫 제품 히어로',
    'Pet Wearable Spec Sheet': '펫 웨어러블 스펙 시트',
    'Rainy Window Mood': '레이니 윈도우 무드',
    'Rainy Window Styled': '레이니 윈도우 스타일드',
    'Reflective Glass Surface': '리플렉티브 글라스',
    'Roastery Counter': '로스터리 카운터',
    'Room & Warmth Styled': '룸 앤 웜 스타일드',
    'Scale & Dimensions Frame': '크기·치수 프레임',
    'Scale & Spec Overlay': '크기·스펙 오버레이',
    'Seasonal Palette Studio': '시즌 팔레트 스튜디오',
    'Serving & Table Lifestyle': '서빙·테이블 라이프스타일',
    'Set & Stack Stylist': '세트·스택 스타일링',
    'Shadow Play Sunlight': '섀도우 플레이 선라이트',
    'Signature Drink Menu Card': '시그니처 드링크 메뉴 카드',
    'Slow Morning Coffee': '슬로우 모닝 커피',
    'Spec Callout Grid': '스펙 강조 그리드',
    'Studio & Editorial': '스튜디오·에디토리얼',
    'Study Nook Focus': '스터디 누크',
    'Styled Shelf Discovery': '스타일드 선반 컷',
    'Surface Macro': '표면 매크로',
    'Team Page Consistent': '팀 페이지 통일 컷',
    'Textiles Raked Light': '텍스타일 사광 컷',
    'Top-Down Hero': '톱다운 히어로',
    'Twilight Corner Glow': '트와일라잇 코너 글로우',
    'Variant Showcase Grid': '옵션별 쇼케이스 그리드',
    'Vintage Heirloom': '빈티지 에어룸',
    'Void Hero Cut': '보이드 히어로 컷',
    'Latte Art Top-Down': '라떼아트 톱다운',
    'Noir Marble Coffee': '누아르 마블 커피',
    'Iced Coffee Condensation Hero': '아이스커피 물방울 히어로',
    'Drip & Steam Macro': '드립·스팀 매크로',
    'Steam and Light Macro': '스팀·빛 매크로',
    'About-Page Intro Reel': '브랜드 소개 릴',
    'Any-Product Drop Reel': '신제품 드롭 릴',
    'Before/After Result Reel': '비포·애프터 릴',
    'Cafe Steam & Crema ASMR': '카페 스팀·크레마 ASMR',
    'Day-in-Life Reel': '브이로그 릴',
    'Day-to-Night Lighting Reveal': '낮→밤 라이팅 릴',
    'GRWM Aurora Reel': 'GRWM 오로라 릴',
    'GRWM Drop Reel': 'GRWM 드롭 릴',
    'GRWM Routine Reel': 'GRWM 루틴 릴',
    'Hands-On Pour & Unbox Reel': '핸즈온 언박싱 릴',
    'Hook + CTA Ad': '훅+CTA 광고',
    'Latte Pour & Crema Reel': '라떼 푸어·크레마 릴',
    'Lumen Reel': '루멘 릴',
    'Mist Burst Reel': '미스트 버스트 릴',
    'Outfit Transition Reel': '착장 전환 릴',
    'Problem → Solution': '문제 → 해결 광고',
    'Product Demo': '제품 데모',
    'Product Haul Reel': '하울 릴',
    'Quick-Drop Teaser Reel': '퀵드롭 티저 릴',
    'Region Result Reel': '부위별 결과 릴',
    'Single-Cup Pour Reel': '싱글컵 푸어 릴',
    'Single-Dish Sizzle': '싱글디시 시즐',
    'Single-Hero Sizzle Reel': '히어로 시즐 릴',
    'Sizzle & Steam ASMR': '시즐·스팀 ASMR',
    'Slow ASMR Detail': '슬로우 ASMR 디테일',
    'Speaking Profile Reel': '스피킹 프로필 릴',
    'Static UGC Photo Ad': 'UGC 사진 광고',
    'Talking Pet Skit': '말하는 반려동물 스킷',
    'Talking-Head Testimonial': '토킹헤드 후기',
    'Tech Unbox ASMR': '테크 언박싱 ASMR',
    'TikTok Discovery POV': '틱톡 디스커버리 POV',
    'Unboxing Reaction': '언박싱 리액션',
    'Wait For The Zoomies': '주무비 릴'
  } };
  // ── (2026-07-29) EN 모드 역방향 사전 — 한국어 원문(DB 오피셜 네일 템플릿명)을 영어로 ──
  DICT.en = {
    '네일 꾸꾸꾸!': 'Deco Nails!',
    '신부 컨셉 네일': 'Bridal Nails',
    '아기자기 글씨2': 'Cute Lettering 2'
  };

  function getLang() {
    try { return localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { return 'en'; }
  }
  function setLang(lang) {
    if (!SUPPORTED[lang]) lang = 'en';
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    document.cookie = LANG_KEY + '=' + lang + ';path=/;max-age=31536000;samesite=lax';
    location.reload();
  }

  var lang = getLang();
  var dict = DICT[lang] || null;

  // 원문 화이트스페이스를 보존하며 trim된 키로 사전을 찾아 치환.
  // 내부 줄바꿈·다중 공백은 하나로 정규화해서 조회(HTML 들여쓰기로 갈라진 문장도 매칭).
  function trText(raw) {
    if (!dict) return raw;
    var key = raw.trim();
    if (!key) return raw;
    var hit = dict[key];
    if (hit == null) {
      var norm = key.replace(/\s+/g, ' ');
      if (norm !== key) hit = dict[norm];
    }
    if (hit == null) return raw;
    // 앞뒤 공백/개행을 유지해 레이아웃이 깨지지 않게 함.
    var lead = raw.match(/^\s*/)[0];
    var tail = raw.match(/\s*$/)[0];
    return lead + hit + tail;
  }

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label'];

  function translateEl(el) {
    // 사용자 노출 속성
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (el.hasAttribute && el.hasAttribute(a)) {
        var v = el.getAttribute(a);
        var t = trText(v);
        if (t !== v) el.setAttribute(a, t);
      }
    }
    // 버튼/서브밋 input value
    if (el.tagName === 'INPUT') {
      var ty = (el.getAttribute('type') || '').toLowerCase();
      if (ty === 'button' || ty === 'submit') {
        var tv = trText(el.value);
        if (tv !== el.value) el.value = tv;
      }
    }
  }

  function translate(root) {
    if (!dict || !root) return;
    // 1) 텍스트 노드
    if (root.nodeType === 3) { root.nodeValue = trText(root.nodeValue); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        if (p && SKIP_TAGS[p.tagName]) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var batch = [], n;
    while ((n = walker.nextNode())) batch.push(n);
    for (var i = 0; i < batch.length; i++) {
      var node = batch[i];
      var t = trText(node.nodeValue);
      if (t !== node.nodeValue) node.nodeValue = t;
    }
    // 2) 속성 (자기 자신 포함)
    if (root.nodeType === 1) translateEl(root);
    var els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[aria-label],input') : [];
    for (var j = 0; j < els.length; j++) translateEl(els[j]);
  }

  function observe() {
    if (!dict || !window.MutationObserver) return;
    // characterData는 관찰하지 않는다 — translate()가 nodeValue를 쓰면 characterData 뮤테이션이
    // 다시 발생해 무한 루프가 되기 때문. 새로 추가되는 노드(childList)만 번역하면 충분하다.
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        for (var k = 0; k < m.addedNodes.length; k++) translate(m.addedNodes[k]);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function run() {
    document.documentElement.lang = lang;
    if (!dict) return; // en = 원본 그대로
    translate(document.body);
    observe();
  }

  // 전역 API — Settings의 Language 섹션에서 사용
  window.i18n = {
    getLang: getLang,
    setLang: setLang,
    supported: SUPPORTED,
    t: function (k) { return (dict && dict[k]) || k; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();

  // bfcache(뒤로/앞으로가기 복원) 대응 — 다른 페이지에서 언어를 바꾼 뒤 돌아오면
  // 스크립트가 재실행되지 않아 예전 언어로 남는다. 저장된 언어와 다르면 새로고침.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && getLang() !== lang) location.reload();
  });
})();
