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
  "home.hero.alt": "노을 진 송도 잭니클라우스 골프클럽 코리아와 송도 스카이라인",

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
  "pj.1.name": "송도 잭니클라우스 GL 프리미엄 레지던스",
  "pj.1.loc": "인천 송도", "pj.1.type": "프리미엄 주거", "pj.1.year": "2026", "pj.1.status": "진행중",
  "pj.empty.b": "프로젝트 추가 예정",
  "pj.empty.s": "신규 프로젝트 자료가 확보되면 이 자리에 추가됩니다",
  "pj.note": "※ 기획안대로 프로젝트가 추가될 때마다 카드만 늘리면 되는 구조입니다.",

  /* ---------- PROJECT DETAIL : SONGDO ---------- */
  "meta.sd.title": "송도 잭니클라우스 GL 프리미엄 레지던스 | 제노바 아너스",
  "meta.sd.desc": "제노바 아너스의 대표 프로젝트. 잭니클라우스 골프클럽 코리아에 인접한 송도동 117-37·38 단독형 주거, 잭니클라우스 GL.",
  "sd.crumb": "프로젝트",
  "sd.h1a": "Songdo Jack Nicklaus GL",
  "sd.h1b": "Premium Residence",
  "sd.tagline": "골프 코스와 서해 낙조를 품은 프리미엄 라이프스타일 주거",
  "sd.hero.alt": "노을 진 하늘 아래 잭니클라우스 골프클럽 코리아 페어웨이와 송도 고층 스카이라인",

  "sd.ov.kicker": "Project Overview",
  "sd.ov.title": "프로젝트 개요",
  "sd.ov.p": "잭니클라우스 GL은 송도국제도시 잭니클라우스 골프클럽 코리아에 인접한 단독형 프리미엄 주거입니다. 거실과 테라스에서 페어웨이와 서해 낙조가 그대로 펼쳐지며, 지하 라운지부터 2층 침실 영역까지 한 세대 안에서 층별로 생활을 나누어 설계했습니다.",
  "sd.ov.p2": "제노바 아너스는 본 프로젝트에서 기획 검토부터 건축 설계, 시공, 품질관리까지 수행합니다.",
  "sd.f1.t": "위치",       "sd.f1.d": "인천광역시 연수구 송도동 117-37, 38",
  "sd.f2.t": "프로젝트 유형", "sd.f2.d": "골프장 인접 프리미엄 단독형 주거",
  "sd.f3.t": "수행 범위",   "sd.f3.d": "기획 · 설계 · 시공 · 품질관리",
  "sd.f4.t": "연도",       "sd.f4.d": "2026 —",
  "sd.f5.t": "상태",       "sd.f5.d": "진행중",
  "sd.f6.t": "실사용면적",  "sd.f6.d": "1층 43.71평(144.5㎡) · 2층 47.43평(156.8㎡)",

  "sd.w.kicker": "Project Story 01",
  "sd.w.title": "Why Songdo?",
  "sd.w.sub": "골프 코스 너머로 송도국제도시의 스카이라인이 이어집니다. 공항·교통, 국제교육, 생활 편의시설이 모두 가까운 입지가 이 프로젝트의 출발점입니다.",
  "sd.w.cap": "잭니클라우스 골프클럽과 송도 스카이라인",
  "sd.w.alt": "잭니클라우스 골프클럽 페어웨이 너머로 길게 이어진 송도국제도시 스카이라인",
  "sd.w1.b": "Airport",   "sd.w1.s": "인천국제공항 · GTX-B 노선 계획 · 인천발 KTX",
  "sd.w2.b": "Transit",   "sd.w2.s": "송도트램 · 인천대교 · 지하철 연장",
  "sd.w3.b": "Education", "sd.w3.s": "채드윅 국제학교 · IGC(SUNY·유타대·연세대 국제캠퍼스)",
  "sd.w4.b": "Lifestyle", "sd.w4.s": "송도컨벤시아 · 현대프리미엄아울렛 · 코스트코 · 대형마트",
  "sd.w5.b": "Nature",    "sd.w5.s": "골프 코스 · 서해 조망",

  "sd.ws1.cap": "인천국제공항 · GTX-B 노선 계획 · 인천발 KTX",
  "sd.ws1.alt": "인천국제공항 제1여객터미널 출국장",
  "sd.ws2.cap": "인천대교 · 송도트램 · 지하철 연장 계획",
  "sd.ws2.alt": "바다를 가로지르는 인천대교",
  "sd.ws3.cap": "채드윅 국제학교 · 인천글로벌캠퍼스(IGC)",
  "sd.ws3.alt": "옥상 정원이 있는 인천글로벌캠퍼스 전경",
  "sd.ws4.cap": "센트럴파크 · 송도컨벤시아 · 현대프리미엄아울렛 · 코스트코",
  "sd.ws4.alt": "송도 센트럴파크 수로와 포스코타워, 국제업무지구 전경",
  "sd.ws5.cap": "잭니클라우스 골프클럽 코리아 너머 송도 스카이라인",
  "sd.ws5.alt": "잭니클라우스 골프클럽 페어웨이 너머로 길게 이어진 송도국제도시 스카이라인",

  "sd.ws.credit": "사진 출처(Wikimedia Commons): 인천국제공항 — Arne Müseler, <a href=\"https://creativecommons.org/licenses/by-sa/3.0/de/deed.en\" target=\"_blank\" rel=\"noopener\">CC BY-SA 3.0 DE</a> · 인천대교 — Jinho Jung, 퍼블릭 도메인 · 인천글로벌캠퍼스 — 인천글로벌캠퍼스, <a href=\"https://creativecommons.org/licenses/by-sa/4.0/\" target=\"_blank\" rel=\"noopener\">CC BY-SA 4.0</a> · 송도 센트럴파크 — Jaehyuk Lee, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\" target=\"_blank\" rel=\"noopener\">CC BY-SA 2.0</a> (리사이즈)",
  "sd.e.kicker": "Project Story 02",
  "sd.e.title": "Panorama View,<em>Every Evening</em>",
  "sd.e.sub": "명품 골프클럽의 페어웨이, 그리고 그 너머 서해로 지는 낙조. 매일 저녁 풍경이 달라지는 조망입니다.",
  "sd.e.p": "세대에서 바라보면 소나무가 늘어선 페어웨이와 벙커가 전경을 채우고, 수평선 위로 서해의 섬들과 낙조가 펼쳐집니다. 거실과 주방의 전면 창, 층별 테라스는 이 조망을 최대한 담도록 배치했습니다.",
  "sd.e.cap": "페어웨이와 서해 낙조",
  "sd.e.alt": "소나무가 서 있는 골프 코스 너머 서해 수평선과 섬 위로 물든 저녁 노을",

  "sd.b.kicker": "Project Story 03",
  "sd.b.title": "Two Levels,<em>One Private Residence</em>",
  "sd.b.sub": "석재 패널 외관과 깊은 처마의 경사 지붕, 필로티형 주차 공간을 갖춘 단독형 주택입니다. 1층은 가족과 손님이 함께하는 공용 공간, 2층은 침실 중심의 프라이빗 공간으로 구분했습니다.",
  "sd.b.cap": "외관 투시도",
  "sd.b.alt": "석재 패널 외관과 경사 지붕, 전면 창과 유리 난간을 갖춘 단독형 주택 투시도",
  "sd.b1.b": "1F · 144.5㎡",  "sd.b1.s": "거실 · 다이닝 · 메인/보조 주방 · 게스트룸",
  "sd.b2.b": "2F · 156.8㎡",  "sd.b2.s": "마스터 침실 · 침실 2~3 · 패밀리룸(침실 4)",
  "sd.b3.b": "Elevator",      "sd.b3.s": "세대 내 전용 엘리베이터",
  "sd.b4.b": "Dress · Bath",  "sd.b4.s": "침실별 드레스룸 · 욕실, 파우더룸 · 세탁실",

  "sd.c.kicker": "Project Story 04",
  "sd.c.title": "Living That Opens<em>onto the Fairway</em>",
  "sd.c.sub": "아일랜드 주방에서 거실을 지나 골프 코스까지 시선이 한 번에 이어지는 오픈 플랜입니다.",
  "sd.c.cap": "아일랜드 주방과 골프 코스 조망 거실",
  "sd.c.alt": "대리석 아일랜드 주방에서 바라본 거실과 통창 너머 골프 코스",
  "sd.c1.b": "Fairway View",  "sd.c1.s": "거실 전면 통창 · 테라스 연결",
  "sd.c2.b": "Kitchen",       "sd.c2.s": "대리석 아일랜드 · 월넛 수납 · 보조 주방",
  "sd.c3.b": "Atrium",        "sd.c3.s": "코너 통유리로 둘러싼 중정",
  "sd.c4.b": "Home Theater",  "sd.c4.s": "전동 스크린 · 천장 매립 프로젝터",

  "sd.l.kicker": "Project Story 05",
  "sd.l.title": "Luxury Lifestyle",
  "sd.l.sub": "천장이 두 개 층으로 열린 지하 라운지는 선큰 가든과 연결되어 지하에서도 하늘과 빛을 들입니다.",
  "sd.l.p": "블랙 대리석 바 카운터와 월넛 수납장, 간접 조명으로 마감한 라운지는 외부 계단을 통해 선큰 가든과 이어집니다. 단지는 명문 회원제 골프장 수준의 출입 통제와 보안 관리로 입주민의 프라이버시를 지킵니다.",
  "sd.l.cap": "복층 지하 라운지",
  "sd.l.alt": "천창과 유리 난간 아래로 선큰 가든이 보이는 복층 높이의 지하 라운지",
  "sd.l1.b": "Sunken Garden",      "sd.l1.s": "라운지와 연결된 외부 정원 · 계단",
  "sd.l2.b": "Privacy of Village", "sd.l2.s": "골프 빌리지 출입 통제 · 보안 관리",

  "sd.g.kicker": "Project Gallery",
  "sd.g.title": "See the Project",
  "sd.g.sub": "카테고리를 선택해 프로젝트 이미지를 확인하실 수 있습니다.",
  "sd.g.all": "전체", "sd.g.arch": "건축 · 평면", "sd.g.int": "실내",
  "sd.g.land": "중정 · 정원", "sd.g.golf": "조망", "sd.g.con": "시공 현장",
  "sd.g.connote": "시공 현장 사진은 회사 보유 원본 확보 후 추가 예정입니다.",
  "sd.g1": "해 질 녘 완공된 주택 외관",
  "sd.g2": "석재 외관의 주택 투시도",
  "sd.g3": "해 질 녘 조명 연출 외관 투시도",
  "sd.g4": "1층 평면 모델링 — 실사용 43.71평(144.5㎡)",
  "sd.g5": "2층 평면 모델링 — 실사용 47.43평(156.8㎡)",
  "sd.g6": "전동 스크린과 골프 코스 조망 거실",
  "sd.g7": "월넛 우드 천장의 거실과 아일랜드 주방, 중정",
  "sd.g8": "중정을 향해 열린 거실과 주방",
  "sd.g9": "아일랜드 주방에서 바라본 골프 코스",
  "sd.g10": "월넛 수납과 대리석 상판의 주방",
  "sd.g11": "빌트인 가전과 현관으로 이어지는 복도",
  "sd.g12": "엘리베이터와 계단이 있는 현관 복도",
  "sd.g13": "슬라이딩 중문과 현관",
  "sd.g14": "천창이 있는 복층 지하 라운지",
  "sd.g15": "블랙 대리석 벽과 복층 보이드",
  "sd.g16": "디딤석과 백자갈로 꾸민 중정",
  "sd.g17": "선큰 가든으로 내려가는 외부 계단",
  "sd.g18": "골프 코스 너머 서해 낙조",
  "sd.g19": "해 질 녘 페어웨이와 송도 스카이라인",
  "sd.g20": "페어웨이 너머 송도국제도시 전경",
  "sd.g21": "노을 진 골프 코스와 고층 스카이라인",

  "sd.imgnote": "※ 실내·조망·외관 사진은 현장 촬영본이며, 외관 투시도와 평면 모델링은 분양 자료 기준으로 실제와 일부 다를 수 있습니다.",

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
  "home.hero.alt": "Jack Nicklaus Golf Club Korea and the Songdo skyline at sunset",

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
  "pj.1.name": "Songdo Jack Nicklaus GL Premium Residence",
  "pj.1.loc": "Songdo, Incheon", "pj.1.type": "Premium Residential", "pj.1.year": "2026", "pj.1.status": "Ongoing",
  "pj.empty.b": "Project slot",
  "pj.empty.s": "New projects will be added here as material becomes available",
  "pj.note": "※ As planned, adding a project only requires adding one more card.",

  "meta.sd.title": "Songdo Jack Nicklaus GL Premium Residence | Genova Honors",
  "meta.sd.desc": "A flagship project by Genova Honors — Jack Nicklaus GL, detached premium residences at 117-37·38 Songdo-dong beside Jack Nicklaus Golf Club Korea.",
  "sd.crumb": "Projects",
  "sd.h1a": "Songdo Jack Nicklaus GL",
  "sd.h1b": "Premium Residence",
  "sd.tagline": "Premium living framed by the fairway and the West Sea sunset",
  "sd.hero.alt": "Jack Nicklaus Golf Club Korea fairway and the Songdo skyline under a sunset sky",

  "sd.ov.kicker": "Project Overview",
  "sd.ov.title": "Project Overview",
  "sd.ov.p": "Jack Nicklaus GL is a detached premium residence adjoining Jack Nicklaus Golf Club Korea in Songdo International City. The fairway and the West Sea sunset open up from the living room and terraces, and daily life is arranged level by level — from the lower-level lounge to the bedrooms upstairs.",
  "sd.ov.p2": "Genova Honors covers planning review, architectural design, construction and quality management on this project.",
  "sd.f1.t": "Location",  "sd.f1.d": "117-37, 38 Songdo-dong, Yeonsu-gu, Incheon",
  "sd.f2.t": "Type",      "sd.f2.d": "Detached premium residence beside a golf course",
  "sd.f3.t": "Scope",     "sd.f3.d": "Planning · Design · Construction · QC",
  "sd.f4.t": "Year",      "sd.f4.d": "2026 —",
  "sd.f5.t": "Status",    "sd.f5.d": "Ongoing",
  "sd.f6.t": "Net area",  "sd.f6.d": "1F 144.5㎡ (43.71 pyeong) · 2F 156.8㎡ (47.43 pyeong)",

  "sd.w.kicker": "Project Story 01",
  "sd.w.title": "Why Songdo?",
  "sd.w.sub": "Beyond the course, the skyline of Songdo International City runs along the horizon. Airport access, international education and everyday amenities close at hand are where this project starts.",
  "sd.w.cap": "Jack Nicklaus Golf Club and the Songdo skyline",
  "sd.w.alt": "Songdo International City skyline stretching beyond the Jack Nicklaus Golf Club fairway",
  "sd.w1.b": "Airport",   "sd.w1.s": "Incheon Int'l Airport · planned GTX-B · Incheon KTX",
  "sd.w2.b": "Transit",   "sd.w2.s": "Songdo Tram · Incheon Bridge · subway extension",
  "sd.w3.b": "Education", "sd.w3.s": "Chadwick International · IGC (SUNY, Utah, Yonsei Int'l Campus)",
  "sd.w4.b": "Lifestyle", "sd.w4.s": "Songdo Convensia · Hyundai Premium Outlets · Costco · hypermarkets",
  "sd.w5.b": "Nature",    "sd.w5.s": "Golf course · West Sea views",

  "sd.ws1.cap": "Incheon Int'l Airport · planned GTX-B · Incheon KTX",
  "sd.ws1.alt": "Departure hall of Incheon International Airport Terminal 1",
  "sd.ws2.cap": "Incheon Bridge · Songdo Tram · planned subway extension",
  "sd.ws2.alt": "Incheon Bridge spanning the sea",
  "sd.ws3.cap": "Chadwick International · Incheon Global Campus (IGC)",
  "sd.ws3.alt": "Incheon Global Campus with its green roof",
  "sd.ws4.cap": "Central Park · Songdo Convensia · Hyundai Premium Outlets · Costco",
  "sd.ws4.alt": "Songdo Central Park waterway, POSCO Tower and the IBD from above",
  "sd.ws5.cap": "The Songdo skyline beyond Jack Nicklaus Golf Club Korea",
  "sd.ws5.alt": "Songdo International City skyline stretching beyond the Jack Nicklaus Golf Club fairway",

  "sd.ws.credit": "Photo credits(Wikimedia Commons): Incheon Int'l Airport — Arne Müseler, <a href=\"https://creativecommons.org/licenses/by-sa/3.0/de/deed.en\" target=\"_blank\" rel=\"noopener\">CC BY-SA 3.0 DE</a> · Incheon Bridge — Jinho Jung, public domain · Incheon Global Campus — Incheon Global Campus, <a href=\"https://creativecommons.org/licenses/by-sa/4.0/\" target=\"_blank\" rel=\"noopener\">CC BY-SA 4.0</a> · Songdo Central Park — Jaehyuk Lee, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\" target=\"_blank\" rel=\"noopener\">CC BY-SA 2.0</a> (resized)",
  "sd.e.kicker": "Project Story 02",
  "sd.e.title": "Panorama View,<em>Every Evening</em>",
  "sd.e.sub": "The fairways of a signature golf club, and beyond them the sun setting over the West Sea — a view that changes every evening.",
  "sd.e.p": "Pine-lined fairways and bunkers fill the foreground, with the islands of the West Sea and the sunset along the horizon. Full-height glazing in the living room and kitchen, and terraces on each level, are placed to take in as much of this view as possible.",
  "sd.e.cap": "Fairway and West Sea sunset",
  "sd.e.alt": "Sunset glowing over the West Sea horizon and islands beyond a pine-dotted golf course",

  "sd.b.kicker": "Project Story 03",
  "sd.b.title": "Two Levels,<em>One Private Residence</em>",
  "sd.b.sub": "A detached house with a stone-panel facade, deep-eaved pitched roof and a covered carport. The ground floor holds shared family and guest space; the upper floor is a private, bedroom-centred level.",
  "sd.b.cap": "Exterior rendering",
  "sd.b.alt": "Rendering of a detached house with stone-panel facade, pitched roof, large windows and glass balustrade",
  "sd.b1.b": "1F · 144.5㎡",  "sd.b1.s": "Living · dining · main & sub kitchen · guest room",
  "sd.b2.b": "2F · 156.8㎡",  "sd.b2.s": "Master bedroom · bedrooms 2–3 · family room (bedroom 4)",
  "sd.b3.b": "Elevator",      "sd.b3.s": "Private in-home elevator",
  "sd.b4.b": "Dress · Bath",  "sd.b4.s": "Dressing room & bath per bedroom, powder & laundry rooms",

  "sd.c.kicker": "Project Story 04",
  "sd.c.title": "Living That Opens<em>onto the Fairway</em>",
  "sd.c.sub": "An open plan where the eye travels from the island kitchen, through the living room, straight out to the golf course.",
  "sd.c.cap": "Island kitchen and fairway-view living room",
  "sd.c.alt": "Living room and golf course beyond full-height glazing, seen from a marble island kitchen",
  "sd.c1.b": "Fairway View",  "sd.c1.s": "Full-height glazing · terrace access",
  "sd.c2.b": "Kitchen",       "sd.c2.s": "Marble island · walnut storage · sub kitchen",
  "sd.c3.b": "Atrium",        "sd.c3.s": "Courtyard wrapped in corner glazing",
  "sd.c4.b": "Home Theater",  "sd.c4.s": "Motorised screen · ceiling projector",

  "sd.l.kicker": "Project Story 05",
  "sd.l.title": "Luxury Lifestyle",
  "sd.l.sub": "A double-height lower-level lounge opens to a sunken garden, bringing sky and daylight below ground.",
  "sd.l.p": "Finished with a black marble bar counter, walnut joinery and indirect lighting, the lounge connects to the sunken garden by an outdoor stair. Across the village, access control and security on par with a private members' golf club protect residents' privacy.",
  "sd.l.cap": "Double-height lower lounge",
  "sd.l.alt": "Double-height lower-level lounge with skylight, glass balustrade and a view to the sunken garden",
  "sd.l1.b": "Sunken Garden",      "sd.l1.s": "Outdoor garden & stair linked to the lounge",
  "sd.l2.b": "Privacy of Village", "sd.l2.s": "Golf village access control · security",

  "sd.g.kicker": "Project Gallery",
  "sd.g.title": "See the Project",
  "sd.g.sub": "Select a category to view project images.",
  "sd.g.all": "All", "sd.g.arch": "Architecture · Plans", "sd.g.int": "Interior",
  "sd.g.land": "Courtyard · Garden", "sd.g.golf": "Views", "sd.g.con": "Construction",
  "sd.g.connote": "Construction site photography will be added once company originals are available.",
  "sd.g1": "Completed residences at dusk",
  "sd.g2": "Rendering of the stone-clad residence",
  "sd.g3": "Dusk rendering with facade lighting",
  "sd.g4": "Ground floor model — net 144.5㎡ (43.71 pyeong)",
  "sd.g5": "Upper floor model — net 156.8㎡ (47.43 pyeong)",
  "sd.g6": "Living room with motorised screen and golf course view",
  "sd.g7": "Living room under a walnut slat ceiling, island kitchen and atrium",
  "sd.g8": "Living and kitchen opening onto the atrium",
  "sd.g9": "Golf course seen from the island kitchen",
  "sd.g10": "Kitchen with walnut joinery and marble counters",
  "sd.g11": "Built-in appliances and the hall to the entrance",
  "sd.g12": "Entrance hall with elevator and stair",
  "sd.g13": "Sliding inner door and entrance",
  "sd.g14": "Double-height lower lounge with skylight",
  "sd.g15": "Black marble wall and double-height void",
  "sd.g16": "Atrium with stepping stones and white pebbles",
  "sd.g17": "Outdoor stair down to the sunken garden",
  "sd.g18": "West Sea sunset beyond the golf course",
  "sd.g19": "Fairway and Songdo skyline at dusk",
  "sd.g20": "Songdo International City beyond the fairway",
  "sd.g21": "Golf course and high-rise skyline at sunset",

  "sd.imgnote": "※ Interior, view and exterior photos were taken on site. Exterior renderings and floor models are from sales material and may differ in part from the built result.",

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
