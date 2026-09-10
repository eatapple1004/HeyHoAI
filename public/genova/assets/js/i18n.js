/* ==========================================================================
   GENOVA HONORS — i18n
   기획안 31: Korean / English / Chinese / Japanese 다국어 확장 대비 구조

   HTML 사용법:
     data-i18n="key"             → textContent
     data-i18n-html="key"        → innerHTML (<br>, <em> 포함)
     data-i18n-placeholder="key" → placeholder
     data-i18n-alt="key"         → alt

   언어 추가 방법:
     1) 아래 window.I18N 에 zh / ja 객체를 en 과 같은 키로 추가
     2) layout.js 의 LANGS 배열 주석을 해제
   ========================================================================== */

window.I18N = {

/* ==================================================================== KO === */
ko: {
  "brand.sub": "Architecture · Development · Construction",

  "nav.about": "회사소개",
  "nav.business": "사업영역",
  "nav.construction": "건설·시공",
  "nav.projects": "프로젝트",
  "nav.news": "뉴스",
  "nav.contact": "문의",

  /* ---------- HOME ---------- */
  "meta.home.title": "제노바 아너스 | 건축 · 개발 · 건설",
  "meta.home.desc": "제노바 아너스는 기획부터 설계, 시공, 품질관리까지 수행하는 건설기업입니다. 건축을 통해 공간을 만들고 시공을 통해 가치를 완성합니다.",
  "home.h1a": "BUILDING",
  "home.h1b": "THE FUTURE",
  "home.tag": "Architecture That Creates Value",
  "home.lede": "건축과 시공을 넘어 공간의 가치와 새로운 라이프스타일을 만들어갑니다.",
  "home.cta1": "프로젝트 보기",
  "home.cta2": "문의하기",
  "home.scroll": "Scroll to explore",
  "home.hero.alt": "제노바 아너스가 시공한 프리미엄 주거 프로젝트 전경",

  "home.i.kicker": "About Genova Honors",
  "home.i.title": "공간을 만드는 기술,<br>가치를 완성하는 건설",
  "home.i.lead": "제노바 아너스는 사업 기획부터 건축 설계, 시공, 품질관리, 준공 후 관리까지 건설의 전 과정을 수행하는 기업입니다. 부동산을 중개하거나 분양만 담당하는 회사가 아니라, 실제로 건물을 짓는 회사입니다.",
  "home.i.p": "우리는 도면 위의 계획을 현장의 결과물로 바꾸는 일을 합니다. 그 과정에서 품질과 안전은 타협의 대상이 아니며, 디자인은 기능과 분리되지 않습니다. 완성된 공간이 사람의 일상을 어떻게 바꾸는지가 우리의 기준입니다.",
  "home.i.more": "회사소개 자세히",

  "home.s1.b": "01", "home.s1.s": "대표 프로젝트",
  "home.s2.b": "05", "home.s2.s": "사업 영역",
  "home.s3.b": "06", "home.s3.s": "시공 프로세스",
  "home.s4.b": "100%", "home.s4.s": "자체 품질관리",

  "home.b.kicker": "Our Business",
  "home.b.title": "사업영역",
  "home.b.sub": "개발 기획부터 프리미엄 주거 시공까지, 건설의 전 단계를 하나의 흐름으로 수행합니다.",
  "home.b.more": "사업영역 전체 보기",

  "home.p.kicker": "Our Projects",
  "home.p.title": "프로젝트",
  "home.p.sub": "제노바 아너스가 실제로 만들어낸 결과물입니다.",
  "home.p.more": "전체 프로젝트 보기",

  "home.c.kicker": "From Plan to Reality",
  "home.c.title": "계획을 현실로",
  "home.c.sub": "설계 도면에서 준공까지, 여섯 단계의 관리 체계를 통해 품질을 확보합니다.",
  "home.c.more": "건설·시공 자세히",

  "cta.title": "함께 지을 준비가 되어 있습니다",
  "cta.p": "사업 기획, 건축 설계, 시공 어느 단계에서든 문의해 주십시오. 담당자가 검토 후 회신드립니다.",
  "cta.btn": "문의하기",

  /* ---------- 사업영역 5종 (공용) ---------- */
  "biz.1.en": "Development",   "biz.1.ko": "개발사업",
  "biz.1.p": "부지 검토와 사업성 분석을 바탕으로 프로젝트를 기획하고 사업 구조를 설계합니다.",
  "biz.2.en": "Architecture",  "biz.2.ko": "건축 및 공간설계",
  "biz.2.p": "기능과 디자인을 함께 고려한 건축 솔루션으로 공간의 사용 가치를 높입니다.",
  "biz.3.en": "Construction",  "biz.3.ko": "건설·시공",
  "biz.3.p": "전문 시공 역량과 현장 관리 체계로 설계 의도를 손실 없이 구현합니다.",
  "biz.4.en": "Project Management", "biz.4.ko": "프로젝트 관리",
  "biz.4.p": "공정·품질·안전·일정을 통합 관리하여 예측 가능한 결과를 만듭니다.",
  "biz.5.en": "Premium Residential", "biz.5.ko": "프리미엄 주거",
  "biz.5.p": "고급 주거공간을 위한 차별화된 설계와 시공으로 거주 경험을 완성합니다.",

  /* ---------- 시공 프로세스 6단계 (공용) ---------- */
  "pr.1.h": "Planning",        "pr.1.p": "사업기획 · 사업성 검토",
  "pr.2.h": "Design",          "pr.2.p": "건축 설계 · 디자인",
  "pr.3.h": "Engineering",     "pr.3.p": "구조 · 설비 엔지니어링",
  "pr.4.h": "Construction",    "pr.4.p": "건설 · 시공",
  "pr.5.h": "Quality Control", "pr.5.p": "품질관리 · 검수",
  "pr.6.h": "Completion",      "pr.6.p": "준공 · 사후관리",

  /* ---------- ABOUT ---------- */
  "meta.about.title": "회사소개 | 제노바 아너스",
  "meta.about.desc": "제노바 아너스의 비전, 사업 역량, 연혁 그리고 대표 메시지를 소개합니다.",
  "ab.h1": "About Genova Honors",
  "ab.sub": "공간을 만드는 기술, 가치를 완성하는 건설. 제노바 아너스가 무엇을 하고, 어떻게 짓고, 무엇을 지키는 회사인지 소개합니다.",

  "ab.v.kicker": "Vision",
  "ab.v.title": "BUILDING VALUE.<em>CREATING LIFESTYLE.</em>",
  "ab.v.lead": "건축을 통해 공간을 만들고, 시공을 통해 가치를 완성하며, 사람이 살아갈 수 있는 새로운 라이프스타일을 제안하는 기업.",
  "ab.v.p": "건물은 완공되는 순간 끝나는 것이 아니라 그때부터 쓰이기 시작합니다. 제노바 아너스는 준공 이후의 시간을 기준으로 설계하고 시공합니다.",

  "ab.w1.h": "What We Do", "ab.w1.p": "부지 기획과 사업 개발, 건축 설계, 건설·시공, 준공 후 관리까지 건설 전 과정을 수행합니다.",
  "ab.w2.h": "How We Build", "ab.w2.p": "기획 · 설계 · 엔지니어링 · 시공 · 품질관리 · 준공의 여섯 단계를 자체 관리 체계로 운영합니다.",
  "ab.w3.h": "What We Value", "ab.w3.p": "품질과 신뢰, 디자인, 그리고 시간이 지나도 유지되는 지속가능한 가치를 우선합니다.",

  "ab.val.kicker": "Brand Values",
  "ab.val.title": "우리가 지키는 기준",
  "ab.val1.h": "Trust",        "ab.val1.p": "약속한 일정과 품질을 지킵니다.",
  "ab.val2.h": "Quality",      "ab.val2.p": "눈에 보이지 않는 부분까지 관리합니다.",
  "ab.val3.h": "Design",       "ab.val3.p": "기능과 아름다움을 분리하지 않습니다.",
  "ab.val4.h": "Construction", "ab.val4.p": "직접 짓는 회사로서 책임집니다.",
  "ab.val5.h": "Value",        "ab.val5.p": "완공 이후에도 남는 가치를 만듭니다.",

  "ab.ceo.kicker": "Message from the CEO",
  "ab.ceo.title": "대표 인사말",
  "ab.ceo.quote": "\"우리는 건물을 파는 회사가 아니라, 건물을 짓는 회사입니다. 도면 한 장이 현장의 구조물이 되고 누군가의 일상이 되기까지, 그 전 과정에 책임을 집니다.\"",
  "ab.ceo.p": "제노바 아너스는 기획과 시공을 함께 수행하는 구조를 통해 설계 의도가 현장에서 훼손되지 않도록 합니다. 이것이 저희가 가장 중요하게 생각하는 경쟁력입니다.",
  "ab.ceo.name": "대표이사",
  "ab.ceo.role": "Genova Honors",
  "ab.ceo.ph": "대표 사진 · 서명 이미지 필요",
  "ab.ceo.phs": "대표님 메시지 원문과 사진을 받아 교체 예정",

  "ab.h.kicker": "History",
  "ab.h.title": "연혁",
  "ab.h.note": "※ 아래 연혁은 구성 예시입니다. 실제 회사 연혁 자료를 받아 교체해야 합니다.",
  "ab.h1y": "2020", "ab.h1h": "회사 설립",       "ab.h1p": "Company Foundation",
  "ab.h2y": "2021", "ab.h2h": "사업 확장",       "ab.h2p": "Business Expansion",
  "ab.h3y": "2022", "ab.h3h": "개발사업 착수",   "ab.h3p": "Project Development",
  "ab.h4y": "2023", "ab.h4h": "주요 프로젝트 수행", "ab.h4p": "Major Project",
  "ab.h5y": "2024", "ab.h5h": "사업 영역 확대",   "ab.h5p": "Business Expansion",
  "ab.h6y": "2025", "ab.h6h": "신규 프로젝트",    "ab.h6p": "New Project",

  /* ---------- BUSINESS ---------- */
  "meta.biz.title": "사업영역 | 제노바 아너스",
  "meta.biz.desc": "개발사업, 건축설계, 건설·시공, 프로젝트 관리, 프리미엄 주거 — 제노바 아너스의 다섯 가지 사업 영역.",
  "bz.h1": "Our Business",
  "bz.sub": "제노바 아너스는 개발 기획부터 시공과 준공까지, 서로 끊기지 않는 하나의 흐름으로 사업을 수행합니다.",
  "bz.why.kicker": "Why Integrated",
  "bz.why.title": "기획과 시공을 함께 하는 이유",
  "bz.why.p": "설계와 시공이 분리되면 도면의 의도가 현장에서 조정되는 과정에서 손실됩니다. 제노바 아너스는 기획 단계부터 시공 조건을 반영하고, 시공 단계에서 설계 의도를 유지합니다. 공정 지연과 추가 비용의 상당 부분이 이 단절에서 발생하기 때문입니다.",

  /* ---------- CONSTRUCTION ---------- */
  "meta.con.title": "건설·시공 | 제노바 아너스",
  "meta.con.desc": "기획에서 준공까지 6단계 프로세스, 품질·안전 관리 체계, 실제 시공 역량을 소개합니다.",
  "cn.h1": "From Plan to Reality",
  "cn.sub": "제노바 아너스는 직접 시공하는 회사입니다. 계획을 현실로 만드는 과정과 그 과정을 관리하는 방식을 공개합니다.",

  "cn.pr.kicker": "Process",
  "cn.pr.title": "시공 프로세스",
  "cn.pr.sub": "여섯 단계 각각에 책임자와 검수 기준이 있습니다.",

  "cn.bda.kicker": "Before · During · After",
  "cn.bda.title": "완공 사진만으로는 알 수 없는 것",
  "cn.bda.sub": "건물의 품질은 마감이 아니라 과정에서 결정됩니다. 그래서 기획과 시공 현장, 준공까지 함께 기록합니다.",
  "cn.bda1.t": "Before", "cn.bda1.h": "사업 및 설계", "cn.bda1.p": "부지 분석, 사업성 검토, 건축 설계와 인허가 단계.",
  "cn.bda2.t": "During", "cn.bda2.h": "건설·시공",   "cn.bda2.p": "골조, 설비, 마감에 이르는 실제 시공과 현장 관리 단계.",
  "cn.bda3.t": "After",  "cn.bda3.h": "준공",       "cn.bda3.p": "검수와 인계, 그리고 준공 이후의 사후관리 단계.",

  "cn.q.kicker": "Quality Built Into Every Detail",
  "cn.q.title": "관리 체계",
  "cn.q.sub": "※ 실제 보유 기술·면허·특허·인증·시공능력평가 자료가 확보되면 이 영역을 수치와 함께 상세화합니다.",
  "cn.q1.h": "Quality",     "cn.q1.ko": "품질관리",   "cn.q1.p": "공정별 검수 기준과 자재 관리 절차를 운영합니다.",
  "cn.q2.h": "Safety",      "cn.q2.ko": "안전관리",   "cn.q2.p": "현장 안전 점검과 위험 요소 사전 관리 체계를 적용합니다.",
  "cn.q3.h": "Technology",  "cn.q3.ko": "건설기술",   "cn.q3.p": "공법 선정과 시공 기술을 프로젝트 조건에 맞게 적용합니다.",
  "cn.q4.h": "Engineering", "cn.q4.ko": "엔지니어링", "cn.q4.p": "구조·설비 검토를 통해 설계의 실현 가능성을 확보합니다.",
  "cn.q5.h": "Management",  "cn.q5.ko": "현장관리",   "cn.q5.p": "공정과 일정, 협력사를 통합적으로 관리합니다.",

  /* ---------- PROJECTS ---------- */
  "meta.pj.title": "프로젝트 | 제노바 아너스",
  "meta.pj.desc": "제노바 아너스가 수행한 프로젝트 포트폴리오.",
  "pj.h1": "Our Projects",
  "pj.sub": "제노바 아너스가 실제로 만들어낸 결과물입니다. 각 프로젝트는 기획 의도와 시공 과정, 완공 결과를 함께 기록합니다.",
  "pj.f.all": "전체", "pj.f.res": "주거", "pj.f.com": "상업", "pj.f.dev": "개발",
  "pj.1.name": "송도 잭니클라우스 프리미엄 레지던스",
  "pj.1.loc": "인천 송도", "pj.1.type": "프리미엄 주거", "pj.1.year": "2026", "pj.1.status": "진행중",
  "pj.empty.b": "프로젝트 추가 예정",
  "pj.empty.s": "신규 프로젝트 자료가 확보되면 이 자리에 추가됩니다",
  "pj.note": "※ 기획안대로 프로젝트가 추가될 때마다 카드만 늘리면 되는 구조입니다.",

  /* ---------- PROJECT DETAIL : SONGDO ---------- */
  "meta.sd.title": "송도 잭니클라우스 프리미엄 레지던스 | 제노바 아너스",
  "meta.sd.desc": "제노바 아너스의 대표 프로젝트. 송도국제도시 잭니클라우스 골프클럽에 인접한 프리미엄 주거 프로젝트 케이스 스터디.",
  "sd.crumb": "프로젝트",
  "sd.h1a": "Songdo Jack Nicklaus",
  "sd.h1b": "Premium Residence",
  "sd.tagline": "Global Premium Living in Songdo",
  "sd.hero.alt": "잭니클라우스 골프클럽 코리아 그린과 송도 스카이라인",

  "sd.ov.kicker": "Project Overview",
  "sd.ov.title": "프로젝트 개요",
  "sd.ov.p": "송도국제도시의 잭니클라우스 골프클럽 코리아에 인접한 프리미엄 주거 프로젝트입니다. 국제업무지구의 비즈니스 환경, 국제학교 인프라, 골프 코스 조망이라는 세 가지 입지 조건을 주거 설계에 반영했습니다.",
  "sd.ov.p2": "제노바 아너스는 본 프로젝트에서 기획 검토부터 건축 설계, 시공, 품질관리까지 수행합니다.",
  "sd.f1.t": "위치",       "sd.f1.d": "인천광역시 연수구 송도동",
  "sd.f2.t": "프로젝트 유형", "sd.f2.d": "프리미엄 단독형 주거",
  "sd.f3.t": "수행 범위",   "sd.f3.d": "기획 · 설계 · 시공 · 품질관리",
  "sd.f4.t": "연도",       "sd.f4.d": "2026 —",
  "sd.f5.t": "상태",       "sd.f5.d": "진행중",

  "sd.w.kicker": "Project Story 01",
  "sd.w.title": "Why Songdo?",
  "sd.w.sub": "비즈니스, 교육, 자연, 생활 인프라가 결합된 국제도시라는 입지 조건이 이 프로젝트의 출발점입니다.",
  "sd.w.cap": "송도국제업무지구",
  "sd.w.alt": "센트럴파크 수로와 함께 펼쳐진 송도국제업무지구 야경",
  "sd.w1.b": "Airport",   "sd.w1.s": "인천국제공항 20~30분",
  "sd.w2.b": "Business",  "sd.w2.s": "국제업무지구(IBD)",
  "sd.w3.b": "Education", "sd.w3.s": "글로벌 교육환경",
  "sd.w4.b": "Lifestyle", "sd.w4.s": "생활 인프라",
  "sd.w5.b": "Nature",    "sd.w5.s": "워터프런트 · 자연환경",

  "sd.e.kicker": "Project Story 02",
  "sd.e.title": "Global Education,<em>Global Future</em>",
  "sd.e.sub": "채드윅 인터내셔널을 비롯한 국제학교 인프라는 이 프로젝트의 수요층을 결정하는 핵심 입지 조건입니다.",
  "sd.e.p": "IB·AP 국제 교육과정을 운영하는 학교들이 도보·차량 생활권 내에 위치합니다. 외국인 가족과 국내 글로벌 기업 임직원 가구를 주 수요층으로 상정하고 세대 구성과 커뮤니티 시설을 설계했습니다.",
  "sd.e.note": "본 항목은 회사의 사업철학이 아니라 해당 프로젝트의 입지 및 생활환경 설명입니다.",
  "sd.e.cap": "국제학교 인프라",
  "sd.e.alt": "송도의 캠퍼스와 그린, 도시 스카이라인",

  "sd.b.kicker": "Project Story 03",
  "sd.b.title": "Where Business<em>Meets the World</em>",
  "sd.b.sub": "국제업무지구, 송도컨벤시아, G타워, 국제기구가 형성한 비즈니스 환경이 주거 수요의 기반이 됩니다.",
  "sd.b.cap": "국제업무지구 스카이라인",
  "sd.b.alt": "수변을 따라 늘어선 송도국제업무지구 고층 빌딩",
  "sd.b1.b": "IBD",        "sd.b1.s": "국제업무지구",
  "sd.b2.b": "Convensia",  "sd.b2.s": "송도컨벤시아",
  "sd.b3.b": "G-Tower",    "sd.b3.s": "국제기구 밀집",
  "sd.b4.b": "Global",     "sd.b4.s": "글로벌 기업 네트워크",

  "sd.c.kicker": "Project Story 04",
  "sd.c.title": "A Community That Completes<em>the Refined Lifestyle</em>",
  "sd.c.sub": "골프 코스 조망과 조경, 보안 및 커뮤니티 관리까지 하나의 생활 환경으로 설계했습니다.",
  "sd.c.cap": "잭니클라우스 골프클럽 코리아 조망",
  "sd.c.alt": "잭니클라우스 골프클럽 코리아 페어웨이와 호수",
  "sd.c1.b": "프리미엄 입지", "sd.c1.s": "골프클럽 인접",
  "sd.c2.b": "조망 · 조경",   "sd.c2.s": "코스 조망과 수변 경관",
  "sd.c3.b": "보안 시스템",   "sd.c3.s": "24시간 관리 체계",
  "sd.c4.b": "커뮤니티 관리", "sd.c4.s": "전담 운영 서비스",

  "sd.l.kicker": "Project Story 05",
  "sd.l.title": "Luxury Lifestyle",
  "sd.l.sub": "대한민국 프리미엄 주거의 기준을 목표로 설계와 시공을 진행합니다.",
  "sd.l.p": "현대적 건축 언어와 자연 소재를 결합한 외관, 조망을 최대화한 개구부 계획, 프라이버시를 확보한 진입 동선을 적용했습니다. 마감재와 설비는 준공 후 유지관리까지 고려해 선정합니다.",
  "sd.l.cap": "엔트런스",
  "sd.l.alt": "석재 수경 시설과 유리 라운지가 있는 조명 연출 엔트런스",

  "sd.g.kicker": "Project Gallery",
  "sd.g.title": "See the Project",
  "sd.g.sub": "카테고리를 선택해 프로젝트 이미지를 확인하실 수 있습니다.",
  "sd.g.all": "전체", "sd.g.arch": "건축 외관", "sd.g.int": "실내",
  "sd.g.land": "조경", "sd.g.golf": "골프코스", "sd.g.con": "시공 현장",
  "sd.g.connote": "시공 현장 사진은 회사 보유 원본 확보 후 추가 예정입니다.",
  "sd.g1": "그린 파사드의 현대적 주택 외관",
  "sd.g2": "노을 지는 저녁의 주택 외관",
  "sd.g3": "정원을 갖춘 화이트 톤 모던 주택",
  "sd.g4": "파노라마 공원 조망의 거실",
  "sd.g5": "도시 야경이 보이는 아일랜드 주방",
  "sd.g6": "송도 센트럴파크를 내려다보는 전망",
  "sd.g7": "도시를 조망하는 테라스 라운지",
  "sd.g8": "인천대교",
  "sd.g9": "G타워",
  "sd.g10": "송도컨벤시아",

  "sd.imgnote": "※ 현재 이미지는 제공받은 브로슈어 PDF에서 추출한 참고용 시안입니다. 회사 보유 고해상도 원본으로 교체가 필요합니다.",

  /* ---------- NEWS ---------- */
  "meta.news.title": "뉴스 | 제노바 아너스",
  "meta.news.desc": "제노바 아너스의 회사 소식, 프로젝트 착공 및 준공 소식, 언론 보도.",
  "nw.h1": "Genova Honors News",
  "nw.sub": "회사 소식과 프로젝트 진행 상황, 언론 보도를 전합니다.",
  "nw.f.all": "전체", "nw.f.co": "회사소식", "nw.f.pj": "프로젝트", "nw.f.md": "언론보도",
  "nw.1.cat": "프로젝트", "nw.1.date": "2026.08.20",
  "nw.1.h": "송도 잭니클라우스 프리미엄 레지던스 프로젝트 진행",
  "nw.2.cat": "회사소식", "nw.2.date": "2026.07.15",
  "nw.2.h": "제노바 아너스 공식 홈페이지 개편",
  "nw.3.cat": "회사소식", "nw.3.date": "2026.06.02",
  "nw.3.h": "건설·시공 사업 영역 확대",
  "nw.note": "※ 위 게시물은 레이아웃 확인용 예시입니다. 실제 보도자료와 회사 소식으로 교체해야 합니다.",

  /* ---------- CONTACT ---------- */
  "meta.ct.title": "문의 | 제노바 아너스",
  "meta.ct.desc": "사업 및 프로젝트 문의, 건설·시공 문의, 협력 및 제휴 문의.",
  "ct.h1": "Let's Build Something Great.",
  "ct.sub": "프로젝트 기획 단계든 시공 단계든, 어느 시점에서도 문의해 주십시오.",
  "ct.i1.h": "Business Inquiry",     "ct.i1.ko": "사업 및 프로젝트 문의", "ct.i1.p": "신규 사업 기획, 개발 검토, 사업 제안에 관한 문의.",
  "ct.i2.h": "Construction Inquiry", "ct.i2.ko": "건설·시공 문의",       "ct.i2.p": "시공 범위, 공정, 일정 및 견적에 관한 문의.",
  "ct.i3.h": "Partnership",          "ct.i3.ko": "협력 및 제휴 문의",     "ct.i3.p": "협력사 등록, 자재 및 기술 제휴에 관한 문의.",
  "ct.i4.h": "General Inquiry",      "ct.i4.ko": "일반 문의",            "ct.i4.p": "채용, 취재 등 그 밖의 문의.",

  "ct.f.kicker": "Inquiry Form",
  "ct.f.title": "문의하기",
  "ct.f.lead": "아래 양식을 작성해 주시면 담당자가 확인 후 회신드립니다.",
  "ct.m1": "주소",   "ct.m1v": "— 회사 주소 입력 필요 —",
  "ct.m2": "대표전화", "ct.m2v": "— 대표번호 입력 필요 —",
  "ct.m3": "이메일",  "ct.m3v": "— 이메일 입력 필요 —",
  "ct.m4": "운영시간", "ct.m4v": "월–금 09:00 – 18:00 (KST)",
  "ct.name": "성함", "ct.company": "회사명", "ct.email": "이메일", "ct.phone": "연락처",
  "ct.type": "문의 유형", "ct.msg": "문의 내용",
  "ct.agree": "문의 상담 목적의 개인정보 수집 및 이용에 동의합니다.",
  "ct.submit": "문의 보내기",
  "ct.p.name": "성함을 입력해 주세요",
  "ct.p.company": "회사명 또는 소속",
  "ct.p.email": "you@example.com",
  "ct.p.phone": "010-0000-0000",
  "ct.p.msg": "프로젝트 개요, 위치, 규모, 일정 등을 남겨 주시면 검토에 도움이 됩니다",

  "msg.name": "성함과 이메일을 입력해 주세요.",
  "msg.email": "올바른 이메일 주소를 입력해 주세요.",
  "msg.agree": "개인정보 수집 및 이용에 동의해 주세요.",
  "msg.ok": "문의가 접수되었습니다. 담당자가 확인 후 회신드리겠습니다.",

  /* ---------- FOOTER ---------- */
  "foot.menu": "메뉴", "foot.info": "회사 정보", "foot.inquiry": "문의",
  "foot.addr": "— 주소 입력 필요 —",
  "foot.tel": "— 대표전화 입력 필요 —",
  "foot.email": "— 이메일 입력 필요 —",
  "foot.copy": "© 2026 GENOVA HONORS. All rights reserved.",
  "foot.privacy": "개인정보처리방침",

  /* ---------- 공용 플레이스홀더 ---------- */
  "ph.con.b": "시공 현장 사진 필요",
  "ph.con.s": "실제 건설·시공 사진을 넣어야 시행사가 아닌 건설사로 보입니다",
  "ph.img.b": "이미지 준비 중",
  "ph.img.s": "회사 보유 고해상도 원본으로 교체 예정"
},

/* ==================================================================== EN === */
en: {
  "brand.sub": "Architecture · Development · Construction",

  "nav.about": "About",
  "nav.business": "Business",
  "nav.construction": "Construction",
  "nav.projects": "Projects",
  "nav.news": "News",
  "nav.contact": "Contact",

  "meta.home.title": "Genova Honors | Architecture · Development · Construction",
  "meta.home.desc": "Genova Honors is a construction company covering planning, design, construction and quality management. We build spaces through architecture and complete value through construction.",
  "home.h1a": "BUILDING",
  "home.h1b": "THE FUTURE",
  "home.tag": "Architecture That Creates Value",
  "home.lede": "Beyond architecture and construction — creating the value of space and a new way of living.",
  "home.cta1": "View Our Projects",
  "home.cta2": "Contact Us",
  "home.scroll": "Scroll to explore",
  "home.hero.alt": "Premium residential project built by Genova Honors",

  "home.i.kicker": "About Genova Honors",
  "home.i.title": "The Craft of Building,<br>The Completion of Value",
  "home.i.lead": "Genova Honors carries out the full construction cycle — business planning, architectural design, construction, quality control and post-completion management. We are not a brokerage or a sales agency. We build.",
  "home.i.p": "Our work is turning plans on paper into results on site. In that process quality and safety are not negotiable, and design is never separated from function. Our standard is how the finished space changes daily life.",
  "home.i.more": "More about us",

  "home.s1.b": "01", "home.s1.s": "Flagship Project",
  "home.s2.b": "05", "home.s2.s": "Business Areas",
  "home.s3.b": "06", "home.s3.s": "Process Stages",
  "home.s4.b": "100%", "home.s4.s": "In-House QC",

  "home.b.kicker": "Our Business",
  "home.b.title": "Business Areas",
  "home.b.sub": "From development planning to premium residential construction, delivered as one continuous flow.",
  "home.b.more": "See all business areas",

  "home.p.kicker": "Our Projects",
  "home.p.title": "Projects",
  "home.p.sub": "What Genova Honors has actually built.",
  "home.p.more": "See all projects",

  "home.c.kicker": "From Plan to Reality",
  "home.c.title": "Plan into Reality",
  "home.c.sub": "From drawing to completion, quality is secured through a six-stage management system.",
  "home.c.more": "More on construction",

  "cta.title": "Ready to build together",
  "cta.p": "Reach out at any stage — business planning, architectural design or construction. Our team will review and respond.",
  "cta.btn": "Contact Us",

  "biz.1.en": "Development",   "biz.1.ko": "Business Development",
  "biz.1.p": "Structuring projects on the basis of site review and feasibility analysis.",
  "biz.2.en": "Architecture",  "biz.2.ko": "Architecture & Spatial Design",
  "biz.2.p": "Architectural solutions that raise the usable value of space through function and design.",
  "biz.3.en": "Construction",  "biz.3.ko": "Construction",
  "biz.3.p": "Realising design intent without loss, through specialist capability and site management.",
  "biz.4.en": "Project Management", "biz.4.ko": "Project Management",
  "biz.4.p": "Integrated control of schedule, quality, safety and progress for predictable outcomes.",
  "biz.5.en": "Premium Residential", "biz.5.ko": "Premium Residential",
  "biz.5.p": "Differentiated design and construction that complete the experience of living.",

  "pr.1.h": "Planning",        "pr.1.p": "Business planning & feasibility",
  "pr.2.h": "Design",          "pr.2.p": "Architecture & design",
  "pr.3.h": "Engineering",     "pr.3.p": "Structural & MEP engineering",
  "pr.4.h": "Construction",    "pr.4.p": "Construction & site works",
  "pr.5.h": "Quality Control", "pr.5.p": "Quality management & inspection",
  "pr.6.h": "Completion",      "pr.6.p": "Handover & aftercare",

  "meta.about.title": "About | Genova Honors",
  "meta.about.desc": "The vision, capability, history and leadership message of Genova Honors.",
  "ab.h1": "About Genova Honors",
  "ab.sub": "The craft of building, the completion of value. What we do, how we build, and what we hold to.",

  "ab.v.kicker": "Vision",
  "ab.v.title": "BUILDING VALUE.<em>CREATING LIFESTYLE.</em>",
  "ab.v.lead": "A company that creates space through architecture, completes value through construction, and proposes a new way of living.",
  "ab.v.p": "A building does not end at completion — that is when it begins to be used. Genova Honors designs and builds against the time that follows handover.",

  "ab.w1.h": "What We Do", "ab.w1.p": "Site planning, business development, architectural design, construction and post-completion management.",
  "ab.w2.h": "How We Build", "ab.w2.p": "Six stages — planning, design, engineering, construction, quality control and completion — under our own management system.",
  "ab.w3.h": "What We Value", "ab.w3.p": "Quality and trust, design, and value that holds up over time.",

  "ab.val.kicker": "Brand Values",
  "ab.val.title": "The standards we hold",
  "ab.val1.h": "Trust",        "ab.val1.p": "We keep the schedule and quality we promise.",
  "ab.val2.h": "Quality",      "ab.val2.p": "We manage what will never be seen.",
  "ab.val3.h": "Design",       "ab.val3.p": "We do not separate function from beauty.",
  "ab.val4.h": "Construction", "ab.val4.p": "We build it ourselves, so we answer for it.",
  "ab.val5.h": "Value",        "ab.val5.p": "We create value that remains after completion.",

  "ab.ceo.kicker": "Message from the CEO",
  "ab.ceo.title": "CEO Message",
  "ab.ceo.quote": "\"We are not a company that sells buildings — we are a company that builds them. From a single drawing to a structure on site and then to someone's daily life, we take responsibility for the whole of it.\"",
  "ab.ceo.p": "By carrying out planning and construction together, Genova Honors ensures design intent is not eroded on site. That is the capability we value most.",
  "ab.ceo.name": "Chief Executive Officer",
  "ab.ceo.role": "Genova Honors",
  "ab.ceo.ph": "CEO portrait & signature needed",
  "ab.ceo.phs": "To be replaced with the CEO's own message and photograph",

  "ab.h.kicker": "History",
  "ab.h.title": "History",
  "ab.h.note": "※ The timeline below is a layout example. Replace with the company's actual history.",
  "ab.h1y": "2020", "ab.h1h": "Company Foundation",  "ab.h1p": "회사 설립",
  "ab.h2y": "2021", "ab.h2h": "Business Expansion",  "ab.h2p": "사업 확장",
  "ab.h3y": "2022", "ab.h3h": "Project Development", "ab.h3p": "개발사업 착수",
  "ab.h4y": "2023", "ab.h4h": "Major Project",       "ab.h4p": "주요 프로젝트",
  "ab.h5y": "2024", "ab.h5h": "Business Expansion",  "ab.h5p": "사업 영역 확대",
  "ab.h6y": "2025", "ab.h6h": "New Project",         "ab.h6p": "신규 프로젝트",

  "meta.biz.title": "Business | Genova Honors",
  "meta.biz.desc": "Development, architecture, construction, project management and premium residential.",
  "bz.h1": "Our Business",
  "bz.sub": "From development planning through construction to completion — carried out as one unbroken flow.",
  "bz.why.kicker": "Why Integrated",
  "bz.why.title": "Why we plan and build together",
  "bz.why.p": "When design and construction are separated, the intent of the drawing is lost as it is adjusted on site. Genova Honors reflects construction conditions from the planning stage and preserves design intent during construction — because much of the delay and added cost in a project originates in that gap.",

  "meta.con.title": "Construction | Genova Honors",
  "meta.con.desc": "A six-stage process from planning to completion, with quality and safety management.",
  "cn.h1": "From Plan to Reality",
  "cn.sub": "Genova Honors builds directly. Here is how a plan becomes reality, and how that process is managed.",

  "cn.pr.kicker": "Process",
  "cn.pr.title": "Construction Process",
  "cn.pr.sub": "Each of the six stages has an owner and an inspection standard.",

  "cn.bda.kicker": "Before · During · After",
  "cn.bda.title": "What a completion photo cannot show",
  "cn.bda.sub": "Quality is decided in the process, not the finish. So we record planning, the site, and completion together.",
  "cn.bda1.t": "Before", "cn.bda1.h": "Planning & Design", "cn.bda1.p": "Site analysis, feasibility review, architectural design and permits.",
  "cn.bda2.t": "During", "cn.bda2.h": "Construction",      "cn.bda2.p": "Structure, MEP and finishing — the actual build and its management.",
  "cn.bda3.t": "After",  "cn.bda3.h": "Completion",        "cn.bda3.p": "Inspection, handover and post-completion care.",

  "cn.q.kicker": "Quality Built Into Every Detail",
  "cn.q.title": "Management System",
  "cn.q.sub": "※ Once licences, patents, certifications and capability ratings are provided, this section will carry the actual figures.",
  "cn.q1.h": "Quality",     "cn.q1.ko": "Quality Control",  "cn.q1.p": "Inspection standards and material control by work stage.",
  "cn.q2.h": "Safety",      "cn.q2.ko": "Safety Management","cn.q2.p": "Site safety inspection and proactive hazard control.",
  "cn.q3.h": "Technology",  "cn.q3.ko": "Construction Tech","cn.q3.p": "Method selection matched to each project's conditions.",
  "cn.q4.h": "Engineering", "cn.q4.ko": "Engineering",      "cn.q4.p": "Structural and MEP review securing buildability.",
  "cn.q5.h": "Management",  "cn.q5.ko": "Site Management",  "cn.q5.p": "Integrated control of progress, schedule and partners.",

  "meta.pj.title": "Projects | Genova Honors",
  "meta.pj.desc": "The project portfolio of Genova Honors.",
  "pj.h1": "Our Projects",
  "pj.sub": "What Genova Honors has actually built. Each project records design intent, the construction process and the completed result.",
  "pj.f.all": "All", "pj.f.res": "Residential", "pj.f.com": "Commercial", "pj.f.dev": "Development",
  "pj.1.name": "Songdo Jack Nicklaus Premium Residence",
  "pj.1.loc": "Songdo, Incheon", "pj.1.type": "Premium Residential", "pj.1.year": "2026", "pj.1.status": "Ongoing",
  "pj.empty.b": "Project slot",
  "pj.empty.s": "New projects will be added here as material becomes available",
  "pj.note": "※ As planned, adding a project only requires adding one more card.",

  "meta.sd.title": "Songdo Jack Nicklaus Premium Residence | Genova Honors",
  "meta.sd.desc": "A flagship project by Genova Honors — a premium residential case study beside Jack Nicklaus Golf Club Korea in Songdo.",
  "sd.crumb": "Projects",
  "sd.h1a": "Songdo Jack Nicklaus",
  "sd.h1b": "Premium Residence",
  "sd.tagline": "Global Premium Living in Songdo",
  "sd.hero.alt": "Jack Nicklaus Golf Club Korea green with the Songdo skyline",

  "sd.ov.kicker": "Project Overview",
  "sd.ov.title": "Project Overview",
  "sd.ov.p": "A premium residential project adjoining Jack Nicklaus Golf Club Korea in Songdo International City. Three locational conditions — the business environment of the IBD, international school infrastructure, and golf course outlook — are carried directly into the residential design.",
  "sd.ov.p2": "Genova Honors covers planning review, architectural design, construction and quality management on this project.",
  "sd.f1.t": "Location",  "sd.f1.d": "Songdo-dong, Yeonsu-gu, Incheon",
  "sd.f2.t": "Type",      "sd.f2.d": "Premium detached residence",
  "sd.f3.t": "Scope",     "sd.f3.d": "Planning · Design · Construction · QC",
  "sd.f4.t": "Year",      "sd.f4.d": "2026 —",
  "sd.f5.t": "Status",    "sd.f5.d": "Ongoing",

  "sd.w.kicker": "Project Story 01",
  "sd.w.title": "Why Songdo?",
  "sd.w.sub": "An international city combining business, education, nature and living infrastructure — the starting point of this project.",
  "sd.w.cap": "Songdo International Business District",
  "sd.w.alt": "Songdo IBD at night with the Central Park waterway",
  "sd.w1.b": "Airport",   "sd.w1.s": "20–30 min to Incheon Int'l",
  "sd.w2.b": "Business",  "sd.w2.s": "International Business District",
  "sd.w3.b": "Education", "sd.w3.s": "Global education environment",
  "sd.w4.b": "Lifestyle", "sd.w4.s": "Living infrastructure",
  "sd.w5.b": "Nature",    "sd.w5.s": "Waterfront & greenery",

  "sd.e.kicker": "Project Story 02",
  "sd.e.title": "Global Education,<em>Global Future</em>",
  "sd.e.sub": "International school infrastructure, Chadwick International among them, is the locational condition that defines demand for this project.",
  "sd.e.p": "Schools running IB and AP curricula sit within the daily catchment. Unit mix and community facilities were designed around expatriate families and staff of global companies as the primary residents.",
  "sd.e.note": "This section describes the location and living environment of the project, not the company's philosophy.",
  "sd.e.cap": "International school infrastructure",
  "sd.e.alt": "Songdo campus and greens against the city skyline",

  "sd.b.kicker": "Project Story 03",
  "sd.b.title": "Where Business<em>Meets the World</em>",
  "sd.b.sub": "The IBD, Songdo Convensia, G-Tower and international organisations form the business environment underpinning residential demand.",
  "sd.b.cap": "IBD skyline",
  "sd.b.alt": "Songdo IBD towers along the waterfront",
  "sd.b1.b": "IBD",        "sd.b1.s": "International Business District",
  "sd.b2.b": "Convensia",  "sd.b2.s": "Songdo Convensia",
  "sd.b3.b": "G-Tower",    "sd.b3.s": "International organisations",
  "sd.b4.b": "Global",     "sd.b4.s": "Global corporate network",

  "sd.c.kicker": "Project Story 04",
  "sd.c.title": "A Community That Completes<em>the Refined Lifestyle</em>",
  "sd.c.sub": "Course outlook, landscaping, security and community management designed as a single living environment.",
  "sd.c.cap": "Jack Nicklaus Golf Club Korea outlook",
  "sd.c.alt": "Fairway and lake at Jack Nicklaus Golf Club Korea",
  "sd.c1.b": "Prime location", "sd.c1.s": "Adjoining the golf club",
  "sd.c2.b": "Outlook & landscape", "sd.c2.s": "Course and waterfront views",
  "sd.c3.b": "Security",       "sd.c3.s": "24-hour management",
  "sd.c4.b": "Community",      "sd.c4.s": "Dedicated operation service",

  "sd.l.kicker": "Project Story 05",
  "sd.l.title": "Luxury Lifestyle",
  "sd.l.sub": "Designed and built to set a benchmark for premium living in Korea.",
  "sd.l.p": "A facade combining contemporary architectural language with natural materials, an opening strategy that maximises outlook, and an approach sequence that secures privacy. Finishes and systems are selected with post-completion maintenance in mind.",
  "sd.l.cap": "The entrance",
  "sd.l.alt": "Illuminated entrance with stone water feature and glass lounge",

  "sd.g.kicker": "Project Gallery",
  "sd.g.title": "See the Project",
  "sd.g.sub": "Select a category to view project images.",
  "sd.g.all": "All", "sd.g.arch": "Architecture", "sd.g.int": "Interior",
  "sd.g.land": "Landscape", "sd.g.golf": "Golf", "sd.g.con": "Construction",
  "sd.g.connote": "Construction site photography will be added once company originals are available.",
  "sd.g1": "Contemporary residence with green facade",
  "sd.g2": "Residence exterior at dusk",
  "sd.g3": "White modern residence with garden",
  "sd.g4": "Living room with panoramic park view",
  "sd.g5": "Kitchen island with city night view",
  "sd.g6": "View over Songdo Central Park",
  "sd.g7": "Terrace lounge overlooking the city",
  "sd.g8": "Incheon Bridge",
  "sd.g9": "G-Tower",
  "sd.g10": "Songdo Convensia",

  "sd.imgnote": "※ Current images are reference crops from the supplied brochure PDF. They must be replaced with the company's high-resolution originals.",

  "meta.news.title": "News | Genova Honors",
  "meta.news.desc": "Company news, project milestones and media coverage from Genova Honors.",
  "nw.h1": "Genova Honors News",
  "nw.sub": "Company news, project progress and media coverage.",
  "nw.f.all": "All", "nw.f.co": "Company", "nw.f.pj": "Project", "nw.f.md": "Media",
  "nw.1.cat": "Project", "nw.1.date": "2026.08.20",
  "nw.1.h": "Songdo Jack Nicklaus Premium Residence in progress",
  "nw.2.cat": "Company", "nw.2.date": "2026.07.15",
  "nw.2.h": "Genova Honors official website renewed",
  "nw.3.cat": "Company", "nw.3.date": "2026.06.02",
  "nw.3.h": "Construction business scope expanded",
  "nw.note": "※ The posts above are layout examples. Replace with actual releases and company news.",

  "meta.ct.title": "Contact | Genova Honors",
  "meta.ct.desc": "Business and project inquiries, construction inquiries, partnership inquiries.",
  "ct.h1": "Let's Build Something Great.",
  "ct.sub": "Get in touch at any point — whether at planning stage or already on site.",
  "ct.i1.h": "Business Inquiry",     "ct.i1.ko": "Business & Projects", "ct.i1.p": "New business planning, development review and proposals.",
  "ct.i2.h": "Construction Inquiry", "ct.i2.ko": "Construction",        "ct.i2.p": "Scope, process, schedule and estimates.",
  "ct.i3.h": "Partnership",          "ct.i3.ko": "Partnership",         "ct.i3.p": "Supplier registration, material and technology partnerships.",
  "ct.i4.h": "General Inquiry",      "ct.i4.ko": "General",             "ct.i4.p": "Recruitment, press and everything else.",

  "ct.f.kicker": "Inquiry Form",
  "ct.f.title": "Send an inquiry",
  "ct.f.lead": "Complete the form below and our team will review and respond.",
  "ct.m1": "Address", "ct.m1v": "— company address required —",
  "ct.m2": "Tel",     "ct.m2v": "— main line required —",
  "ct.m3": "Email",   "ct.m3v": "— email required —",
  "ct.m4": "Hours",   "ct.m4v": "Mon–Fri 09:00 – 18:00 (KST)",
  "ct.name": "Name", "ct.company": "Company", "ct.email": "Email", "ct.phone": "Phone",
  "ct.type": "Inquiry type", "ct.msg": "Message",
  "ct.agree": "I agree to the collection and use of my personal information for this inquiry.",
  "ct.submit": "Send Inquiry",
  "ct.p.name": "Your full name",
  "ct.p.company": "Company or organisation",
  "ct.p.email": "you@example.com",
  "ct.p.phone": "+82 10 0000 0000",
  "ct.p.msg": "Project outline, location, scale and schedule help us review faster",

  "msg.name": "Please enter your name and email address.",
  "msg.email": "Please enter a valid email address.",
  "msg.agree": "Please agree to the use of your personal information.",
  "msg.ok": "Your inquiry has been received. Our team will respond shortly.",

  "foot.menu": "Menu", "foot.info": "Company", "foot.inquiry": "Inquiry",
  "foot.addr": "— address required —",
  "foot.tel": "— tel required —",
  "foot.email": "— email required —",
  "foot.copy": "© 2026 GENOVA HONORS. All rights reserved.",
  "foot.privacy": "Privacy Policy",

  "ph.con.b": "Construction photo required",
  "ph.con.s": "Real site photography is what shows a builder rather than a developer",
  "ph.img.b": "Image pending",
  "ph.img.s": "To be replaced with company high-resolution originals"
}

};

/* ==========================================================================
   엔진
   ========================================================================== */
(function () {
  'use strict';

  var STORE = 'gh-lang';
  var SUPPORTED = Object.keys(window.I18N);
  var DEFAULT = 'ko';

  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) {}
    return null;
  }

  function detect() {
    var saved = store(STORE);
    if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
    var q = new URLSearchParams(location.search).get('lang');
    if (q && SUPPORTED.indexOf(q) !== -1) return q;
    var nav = (navigator.language || '').toLowerCase();
    for (var i = 0; i < SUPPORTED.length; i++) {
      if (nav.indexOf(SUPPORTED[i]) === 0) return SUPPORTED[i];
    }
    return DEFAULT;
  }

  window.LANG = DEFAULT;

  window.t = function (key) {
    var d = window.I18N[window.LANG] || window.I18N[DEFAULT];
    if (d[key] !== undefined) return d[key];
    var f = window.I18N[DEFAULT];
    return f[key] !== undefined ? f[key] : key;
  };

  window.applyLang = function (lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT;
    window.LANG = lang;
    document.documentElement.setAttribute('lang', lang);

    // 페이지별 meta 키는 <body data-meta="home"> 로 지정
    var m = document.body.dataset.meta;
    if (m) {
      document.title = window.t('meta.' + m + '.title');
      var d = document.querySelector('meta[name="description"]');
      if (d) d.setAttribute('content', window.t('meta.' + m + '.desc'));
    }

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = window.t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = window.t(el.dataset.i18nHtml);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', window.t(el.dataset.i18nPlaceholder));
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      el.setAttribute('alt', window.t(el.dataset.i18nAlt));
    });

    document.querySelectorAll('.lang button[data-lang]').forEach(function (b) {
      var on = b.dataset.lang === lang;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });

    store(STORE, lang);
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  };

  document.addEventListener('DOMContentLoaded', function () {
    window.applyLang(detect());
    document.querySelectorAll('.lang button[data-lang]').forEach(function (b) {
      b.addEventListener('click', function () { window.applyLang(b.dataset.lang); });
    });
  });
})();
