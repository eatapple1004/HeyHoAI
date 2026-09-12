/* ==========================================================================
   GENOVA HONORS — HOME v2 전용 사전
   i18n.js 뒤에 로드되어 window.I18N.ko / .en 에 v2 키만 추가합니다.
   (기존 8개 페이지는 이 파일을 읽지 않으므로 영향 없음)
   ========================================================================== */
(function () {
  'use strict';
  if (!window.I18N) return;

  Object.assign(window.I18N.ko, {
    /* ---------- HERO 슬라이드 ---------- */
    "v2.s1.kick": "Architecture · Development · Construction",
    "v2.s1.h": "공간의 가치를<br>짓습니다",
    "v2.s1.p": "부지 검토부터 설계, 시공, 품질관리까지. 제노바 아너스는 프로젝트의 전 과정을 하나의 책임으로 수행합니다.",
    "v2.s1.a1": "회사 소개",
    "v2.s1.a2": "사업영역 보기",
    "v2.s1.alt": "제노바 아너스 대표 프로젝트 전경",

    "v2.s2.kick": "Construction Capability",
    "v2.s2.h": "설계 의도를<br>손실 없이 구현합니다",
    "v2.s2.p": "6단계 공정 관리와 현장 중심 시공 체계로, 도면 위의 계획을 그대로 현장에 옮깁니다.",
    "v2.s2.a1": "시공 프로세스",
    "v2.s2.a2": "관리 체계",
    "v2.s2.alt": "시공 품질 관리 현장",

    "v2.s3.kick": "Our Projects",
    "v2.s3.h": "결과로<br>증명합니다",
    "v2.s3.p": "송도 잭니클라우스 프리미엄 레지던스를 비롯한 프로젝트의 기획 의도와 시공 과정을 기록으로 남깁니다.",
    "v2.s3.a1": "프로젝트 보기",
    "v2.s3.a2": "문의하기",
    "v2.s3.alt": "프리미엄 레지던스 준공 전경",

    "v2.prev": "이전 슬라이드", "v2.next": "다음 슬라이드",
    "v2.play": "슬라이드 재생", "v2.pause": "슬라이드 정지",
    "v2.scroll": "Scroll",

    /* ---------- 섹션 헤드 ---------- */
    "v2.biz.kick": "Business",
    "v2.biz.h": "5개 사업영역",
    "v2.biz.sub": "기획·설계·시공·관리를 잇는 구조로, 프로젝트가 끊기지 않도록 운영합니다.",
    "v2.biz.more": "사업영역 전체 보기",

    "v2.pj.kick": "Projects",
    "v2.pj.h": "대표 프로젝트",
    "v2.pj.sub": "제노바 아너스가 실제로 만들어낸 결과물입니다.",
    "v2.pj.more": "프로젝트 전체 보기",

    "v2.nw.kick": "News",
    "v2.nw.h": "공지사항 · 소식",
    "v2.nw.sub": "회사 소식과 프로젝트 진행 상황, 언론 보도를 전합니다.",
    "v2.nw.more": "뉴스 더 보기",
    "v2.nw.4.cat": "회사소식", "v2.nw.4.date": "2026.05.10",
    "v2.nw.4.h": "협력사 등록 및 자재 파트너십 상시 접수",

    /* ---------- 퀵링크 ---------- */
    "v2.q1.b": "오시는 길",   "v2.q1.s": "Directions",
    "v2.q2.b": "사업 문의",   "v2.q2.s": "Inquiry",
    "v2.q3.b": "프로젝트",    "v2.q3.s": "Portfolio",
    "v2.q4.b": "상담 전화",   "v2.q4.s": "Call",
    "v2.q5.b": "자료 요청",   "v2.q5.s": "Company Profile",

    /* ---------- 내비 하위메뉴 ---------- */
    "v2.n1.s1": "비전", "v2.n1.s2": "CEO 메시지", "v2.n1.s3": "연혁", "v2.n1.s4": "브랜드 밸류",
    "v2.n2.s1": "개발사업", "v2.n2.s2": "건축·공간설계", "v2.n2.s3": "건설·시공",
    "v2.n2.s4": "프로젝트 관리", "v2.n2.s5": "프리미엄 주거",
    "v2.n3.s1": "시공 프로세스", "v2.n3.s2": "Before · During · After", "v2.n3.s3": "관리 체계",
    "v2.n4.s1": "전체 프로젝트", "v2.n4.s2": "송도 잭니클라우스",
    "v2.n5.s1": "공지사항", "v2.n5.s2": "언론보도",
    "v2.n6.s1": "사업 문의", "v2.n6.s2": "시공 문의", "v2.n6.s3": "협력 제휴", "v2.n6.s4": "오시는 길",

    /* ---------- 팝업 ---------- */
    "v2.pop.kick": "Notice",
    "v2.pop.h": "협력사 상시 등록 안내",
    "v2.pop.p": "자재·공종별 협력사 등록을 상시 접수하고 있습니다. 문의 페이지에서 신청해 주십시오.",
    "v2.pop.go": "협력 문의 바로가기",
    "v2.pop.today": "하루 동안 열지 않기",
    "v2.pop.close": "닫기",

    /* ---------- 푸터 ---------- */
    "v2.ft.terms": "이용약관",
    "v2.ft.privacy": "개인정보처리방침",
    "v2.ft.email": "이메일무단수집거부",
    "v2.ft.sitemap": "사이트맵",
    "v2.ft.t1": "대표전화", "v2.ft.t1v": "— 번호 입력 필요 —",
    "v2.ft.t2": "사업·시공 문의", "v2.ft.t2v": "— 번호 입력 필요 —",
    "v2.ft.l1": "본사", "v2.ft.l1v": "— 주소 입력 필요 —",
    "v2.ft.l2": "이메일", "v2.ft.l2v": "— 이메일 입력 필요 —",
    "v2.ft.l3": "사업자등록번호", "v2.ft.l3v": "— 번호 입력 필요 —",
    "v2.ft.l4": "대표자", "v2.ft.l4v": "— 대표자명 입력 필요 —",
    "v2.ft.l5": "운영시간", "v2.ft.l5v": "월–금 09:00 – 18:00 (KST)",

    "v2.m1": "문의", "v2.m2": "전화", "v2.m3": "메뉴",
    "v2.top": "위로"
  });

  Object.assign(window.I18N.en, {
    "v2.s1.kick": "Architecture · Development · Construction",
    "v2.s1.h": "We build<br>the value of space",
    "v2.s1.p": "From site review to design, construction and quality control — Genova Honors carries the whole project under a single responsibility.",
    "v2.s1.a1": "About Us",
    "v2.s1.a2": "Our Business",
    "v2.s1.alt": "Flagship project by Genova Honors",

    "v2.s2.kick": "Construction Capability",
    "v2.s2.h": "Design intent,<br>realised without loss",
    "v2.s2.p": "A six-stage process and a site-led construction system carry the plan on the drawing straight onto the ground.",
    "v2.s2.a1": "Our Process",
    "v2.s2.a2": "Management",
    "v2.s2.alt": "Construction quality management on site",

    "v2.s3.kick": "Our Projects",
    "v2.s3.h": "Proven by<br>what we deliver",
    "v2.s3.p": "We record the design intent and the construction process of every project, starting with Songdo Jack Nicklaus Premium Residence.",
    "v2.s3.a1": "View Projects",
    "v2.s3.a2": "Contact Us",
    "v2.s3.alt": "Completed premium residence",

    "v2.prev": "Previous slide", "v2.next": "Next slide",
    "v2.play": "Play slideshow", "v2.pause": "Pause slideshow",
    "v2.scroll": "Scroll",

    "v2.biz.kick": "Business",
    "v2.biz.h": "Five Business Areas",
    "v2.biz.sub": "Planning, design, construction and management run as one chain so a project never breaks between stages.",
    "v2.biz.more": "See all business areas",

    "v2.pj.kick": "Projects",
    "v2.pj.h": "Featured Projects",
    "v2.pj.sub": "What Genova Honors has actually built.",
    "v2.pj.more": "See all projects",

    "v2.nw.kick": "News",
    "v2.nw.h": "Notice & News",
    "v2.nw.sub": "Company news, project progress and media coverage.",
    "v2.nw.more": "More news",
    "v2.nw.4.cat": "Company", "v2.nw.4.date": "2026.05.10",
    "v2.nw.4.h": "Supplier registration and material partnerships open year-round",

    "v2.q1.b": "Directions",  "v2.q1.s": "Visit us",
    "v2.q2.b": "Inquiry",     "v2.q2.s": "Business",
    "v2.q3.b": "Projects",    "v2.q3.s": "Portfolio",
    "v2.q4.b": "Call",        "v2.q4.s": "Consultation",
    "v2.q5.b": "Company Profile", "v2.q5.s": "Request",

    "v2.n1.s1": "Vision", "v2.n1.s2": "CEO Message", "v2.n1.s3": "History", "v2.n1.s4": "Brand Values",
    "v2.n2.s1": "Development", "v2.n2.s2": "Architecture", "v2.n2.s3": "Construction",
    "v2.n2.s4": "Project Management", "v2.n2.s5": "Premium Residential",
    "v2.n3.s1": "Process", "v2.n3.s2": "Before · During · After", "v2.n3.s3": "Management",
    "v2.n4.s1": "All Projects", "v2.n4.s2": "Songdo Jack Nicklaus",
    "v2.n5.s1": "Notice", "v2.n5.s2": "Media",
    "v2.n6.s1": "Business", "v2.n6.s2": "Construction", "v2.n6.s3": "Partnership", "v2.n6.s4": "Directions",

    "v2.pop.kick": "Notice",
    "v2.pop.h": "Supplier registration open",
    "v2.pop.p": "We accept supplier registrations for materials and trades year-round. Apply from the contact page.",
    "v2.pop.go": "Go to partnership inquiry",
    "v2.pop.today": "Don't show for a day",
    "v2.pop.close": "Close",

    "v2.ft.terms": "Terms of Use",
    "v2.ft.privacy": "Privacy Policy",
    "v2.ft.email": "No Email Collection",
    "v2.ft.sitemap": "Sitemap",
    "v2.ft.t1": "Main line", "v2.ft.t1v": "— number required —",
    "v2.ft.t2": "Business & Construction", "v2.ft.t2v": "— number required —",
    "v2.ft.l1": "Head office", "v2.ft.l1v": "— address required —",
    "v2.ft.l2": "Email", "v2.ft.l2v": "— email required —",
    "v2.ft.l3": "Business reg. no.", "v2.ft.l3v": "— number required —",
    "v2.ft.l4": "CEO", "v2.ft.l4v": "— name required —",
    "v2.ft.l5": "Hours", "v2.ft.l5v": "Mon–Fri 09:00 – 18:00 (KST)",

    "v2.m1": "Inquiry", "v2.m2": "Call", "v2.m3": "Menu",
    "v2.top": "Top"
  });
})();
