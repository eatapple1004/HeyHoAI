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
    // ⛔ 번역하지 않는 것: Doppia · Ad Video · Shots · 플랜명 · 엔진명 · Reels · TikTok · 비율 · 숫자 · ◈
    //    (제품명·고유명사. 한국 SaaS 관행이자 Studio 영문 UI와의 정합.)
    // ⛔ billing.html은 **의도적으로 건너뛴다** — 미번역 67종 중 다수가 코드 근거 0인 날조다
    //    (Solo/Group lookbook · N concurrent slots · 2K quality · Concept cut · Edit results ·
    //     Video reels · Template reel · watermark-free). 번역하면 거짓을 한국어로 굳힌다.
    //    → 가격표 진실화(docs/가격표_진실화_변경셋) 선행 후 번역할 것.

    'Home': '홈',
    // home 히어로 — <h1>What will you <b>create</b> today?</h1> 텍스트노드 3개.
    // 노드 단위 치환이라 어순을 못 바꾼다 → 조각을 한국어 어순에 맞게 배분해 "오늘 뭘 만들어 볼까요?"를 만든다.
    // <b> 강조가 영문 'create'에서 한국어 '만들어'로 자연히 옮겨간다(둘 다 동사).
    'What will you': '오늘 뭘', 'create': '만들어', 'today?': '볼까요?',
    'Product & Model Photos': 'Product & Model Photos',
    'Create photos': '사진 만들기', 'Create an ad video': 'Ad Video 만들기',
    'Create Product & Model Photos': 'Product & Model Photos 만들기', 'Create an Ad Video': 'Ad Video 만들기',
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
    '— then use them in Studio with your own product.': '— 담은 템플릿은 스튜디오에서 내 제품으로 바로 씁니다.',
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
    // saas-login — ⚠️ 'my own face/content'는 폐기된 인플루언서 시대 문구(flags influencer:false)
    'I confirm this is my own face/content and I agree to the': '본인이 권리를 가진 콘텐츠임을 확인하며, 다음에 동의합니다:',
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
    'Ad Video (per scene)': 'Ad Video (씬당)',
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

    // ── 스튜디오 (Studio) ──
    'Custom': '커스텀', 'Select a product': '제품 선택', 'Add your product': '제품 추가', 'Add your face': '얼굴 추가',
    'Add your spokesperson': '모델 추가', 'Select a face': '얼굴 선택', 'Ratio': '비율', 'Aspect ratio': '화면 비율',
    'More ratios': '비율 더 보기', 'Size': '크기', 'Count': '수량', 'Model': '모델', 'Models': '모델',
    'Quality': '품질', 'Private Mode': '비공개 모드', 'Generate': '생성', 'Pick a template': '템플릿 선택',
    'No prompt needed — just choose a look.': '프롬프트 불필요 — 원하는 룩만 고르세요.', 'Official': '공식',
    'My templates': '내 템플릿', 'My creations': '내 크리에이션', 'Your creations': '내 크리에이션',
    'Image': '이미지', 'Video': '비디오', 'Photos': '사진', 'Reels': '릴스', 'Length': '길이', 'Audio': '오디오',
    'Reference': '레퍼런스', 'Options': '옵션', 'Negative': '네거티브', 'Negative prompt': '네거티브 프롬프트',
    'Type a prompt...': '프롬프트를 입력하세요...', 'Type a negative...': '네거티브를 입력하세요...',
    'Add detail (optional)': '디테일 추가 (선택)', 'Add your own touch — e.g. red dress, golden hour, soft smile': '나만의 터치 추가 — 예: 레드 드레스, 골든아워, 부드러운 미소',
    'Cut type — pick one': '컷 유형 — 하나 선택', 'Cut type': '컷 유형', 'Background color': '배경색',
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
    'Your face. Any look. Content on autopilot.': '당신의 얼굴로, 어떤 룩이든. 콘텐츠를 자동으로.', 'Log in': '로그인', 'Sign up': '회원가입',
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
    'Save this look as a private template in your Studio. Only you can see and use it.': '이 룩을 스튜디오에 비공개 템플릿으로 저장합니다. 나만 보고 사용할 수 있습니다.',
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
    'Your creations. Manage templates in Studio · discover more in the Store.': '내 크리에이션. 템플릿은 스튜디오에서 관리하고 · 스토어에서 더 찾아보세요.',

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
    'Doppia guide — how Studio works': 'doppia 사용하는 법 — 스튜디오 작동 방식',
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
    'Choose at least one theme — it groups the template in your Studio.': '테마를 하나 이상 선택하세요 — 스튜디오에서 템플릿을 묶어줍니다.',
    'Save — it is now in My templates, ready to reuse anytime. No prompt needed next time.': '저장하면 ‘내 템플릿’에 들어가 언제든 다시 쓸 수 있습니다. 다음엔 프롬프트가 필요 없습니다.',
    // 목업 문구 · 저장 모달 필드
    'Choose a look below — no prompt needed': '아래에서 룩을 고르세요 — 프롬프트 불필요',
    'write your own prompt': '직접 프롬프트 쓰기', '✎ Custom': '✎ 커스텀', '⧉ Copy prompt': '⧉ 프롬프트 복사',
    '— write your own prompt, no template needed.': '— 직접 프롬프트를 쓰세요, 템플릿 불필요.',
    'Type a prompt…': '프롬프트를 입력하세요…', '+ Negative prompt': '+ 네거티브 프롬프트',
    'Apparel': '의류', 'General': '일반', 'Nail': '네일',
    'Product Cut': '제품 컷', 'On-model': '온모델', 'Lookbook': '룩북',
    '(what generates the image)': '(이미지를 생성하는 내용)', 'My template': '내 템플릿',
    '(optional)': '(선택)', 'e.g. Editorial marble backdrop…': '예: 에디토리얼 마블 배경…',
    '(pick at least one)': '(하나 이상 선택)', 'Select a category… ▾': '카테고리 선택… ▾',
    '+ New theme': '+ 새 테마',

    // ── 라이브러리 · 스튜디오: In Studio / Library only (최근 추가) ──
    'In Studio': '스튜디오에 있음', 'Library only': '라이브러리 전용',
    '✓ In Studio': '✓ 스튜디오에 있음', '↑ To Studio': '↑ 스튜디오로',
    'synced with your Studio': '스튜디오와 동기화됨', 'owned · not in your Studio': '보유 · 스튜디오에 없음',
    '↓ Move all to Library only': '↓ 전체를 라이브러리 전용으로',
    'In Studio / Library only': '스튜디오에 있음 / 라이브러리 전용', 'Manage templates': '템플릿 관리',
    'Nothing in your Studio yet — add templates from Library only below.': '아직 스튜디오에 아무것도 없어요 — 아래 ‘라이브러리 전용’에서 템플릿을 추가하세요.',
    'Empty. Hit a card’s “✓ In Studio” (or “Move all to Library only”) to park templates here — they stay in your library but leave your Studio.': '비어 있습니다. 카드의 ‘✓ 스튜디오에 있음’(또는 ‘전체를 라이브러리 전용으로’)을 눌러 템플릿을 여기에 보관하세요 — 라이브러리에는 남지만 스튜디오에서는 빠집니다.',
    'Move to Library only — stays in your Library': '라이브러리 전용으로 이동 — 라이브러리에는 남습니다',
    'Add back to Studio': '스튜디오로 되돌리기',
    'Added to Studio': '스튜디오에 추가됨', 'Moved to Library only': '라이브러리 전용으로 이동됨',
    'Could not update': '업데이트하지 못했습니다', 'Failed — try again': '실패 — 다시 시도하세요'
  } };

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
