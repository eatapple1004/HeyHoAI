/* ==========================================================================
   JAENOVA HONORS — 프로젝트 상세 (project.html?p=<id>)
   프로젝트 하나 = 아래 PROJECTS 에 한 항목. 이름·위치·규모·용도·연도는
   프로젝트 페이지 실적 목록과 같은 i18n 키(tr.rN.*)를 그대로 씁니다.
   main.js 보다 먼저 로드해야 갤러리 필터·라이트박스가 붙습니다.
   ========================================================================== */
(function () {
  'use strict';

  var IMG = 'assets/img/projects/detail/';

  var PROJECTS = [
    { id: 'gl-plaza', r: 'r2', hero: 'assets/img/projects/track/lg/gl-plaza.jpg',
      desc: {
        ko: '김포 풍무동 양도로변에 들어선 지하 2층~지상 12층 근린생활시설입니다. 병·의원과 상가를 위한 풍무2지구의 상업 건물로, 2023년 8월 사용승인을 받았습니다.',
        en: 'A B2–12F neighbourhood commercial building on Yangdo-ro in Pungmu-dong, Gimpo, built for clinics and retail in the Pungmu 2 district. Use approval was granted in August 2023.' },
      images: [['01.jpg', 'ext']] },

    { id: 'bongcheon-guggenheim', r: 'r3', hero: 'assets/img/projects/track/lg/bongcheon.jpg?v=20261007',
      desc: {
        ko: '서울 관악구 봉천동의 복층형 오피스텔로, 2022년 첫 입주를 시작했습니다. 층고를 살린 복층 구조와 밝은 마감의 실내로 구성했습니다.',
        en: 'A duplex officetel in Bongcheon-dong, Gwanak-gu, Seoul, first occupied in 2022 — high ceilings opened into lofts, with bright, clean interiors.' },
      images: [['01.jpg', 'ext'], ['02.jpg', 'ext'], ['03.jpg', 'con'], ['04.jpg', 'int'], ['05.jpg', 'int'], ['06.jpg', 'int'], ['07.jpg', 'int']] },

    { id: 'veritas-sillim', r: 'r12', hero: 'assets/img/projects/track/lg/veritas-sillim.jpg',
      desc: {
        ko: '신림역에서 도보 1분 거리의 신축 공동주택입니다. 2룸·3룸 세대로 구성했고, 2022년 준공했습니다.',
        en: 'New multi-family housing one minute on foot from Sillim Station, with two- and three-room homes, completed in 2022.' },
      images: [['01.jpg', 'ext'], ['02.jpg', 'int'], ['03.jpg', 'int'], ['04.jpg', 'int'], ['05.jpg', 'int'], ['06.jpg', 'int'], ['07.jpg', 'int']] },

    { id: 'noble-heim-sillim', r: 'r4', hero: 'assets/img/projects/track/lg/noble-sillim.jpg?v=20261007',
      desc: {
        ko: '서울 관악구 남부순환로 인근의 지하 1층~지상 7층 오피스텔로, 복층형 30세대로 구성했습니다. 2021년 준공했습니다.',
        en: 'A B1–7F officetel near Nambusunhwan-ro in Gwanak-gu, Seoul, with 30 duplex units, completed in 2021.' },
      images: [['01.jpg', 'ext'], ['02.jpg', 'ext'], ['03.jpg', 'ext'], ['04.jpg', 'int'], ['05.jpg', 'int'], ['06.jpg', 'int'], ['07.jpg', 'int'], ['08.jpg', 'int']] },

    { id: 'the-noblesse', r: 'r13', hero: 'assets/img/projects/track/lg/noblesse-bongcheon.jpg',
      desc: {
        ko: '서울 관악구 봉천동 청룡4길의 지하 1층~지상 9층 오피스텔로, 2020년 사용승인을 받았습니다. 1층에는 근린생활시설이 들어서 있습니다.',
        en: 'A B1–9F officetel on Cheongnyong 4-gil in Bongcheon-dong, Gwanak-gu, Seoul, with use approval in 2020 and a neighbourhood shop on the ground floor.' },
      images: [['01.jpg', 'ext'], ['02.jpg', 'ext'], ['03.jpg', 'ext']] },

    { id: 'guggenheim-gimpo', r: 'r5', role: 'c', hero: 'assets/img/projects/track/lg/guggenheim-gimpo.jpg',
      desc: {
        ko: '김포 풍무동의 지상 13층 오피스텔·상가 복합 건물로, 오피스텔 43실과 상가 9실로 구성했습니다. 시행은 노블레스건축, 시공은 (주)재인건설이 맡았습니다.',
        en: 'A 13-storey officetel and retail building in Pungmu-dong, Gimpo, with 43 officetels and 9 retail units. Developed by Noblesse Architecture and built by Jaein Construction.' },
      images: [['01.jpg', 'render'], ['02.jpg', 'int'], ['03.jpg', 'int'], ['04.jpg', 'int'], ['05.jpg', 'int'], ['06.jpg', 'int'], ['07.jpg', 'int']] },

    { id: 'veritas-bupyeong', r: 'r6', role: 'ds', hero: 'assets/img/projects/track/lg/veritas-bupyeong.jpg',
      desc: {
        ko: '인천 부평구 십정동 경인로변의 지상 12층 주거복합 건물로, 오피스텔 46실과 아파트 4세대로 구성했습니다. 2016년 12월 준공했으며 천우가 시행·분양을 맡았습니다.',
        en: 'A 12-storey mixed residential building on Gyeongin-ro in Sipjeong-dong, Bupyeong-gu, Incheon, with 46 officetels and 4 apartments. Completed in December 2016; developed and sold by Cheonwoo.' },
      images: [['01.jpg', 'render']] },

    { id: 'boston-hill', r: 'r7', hero: 'assets/img/projects/track/lg/boston-hill.jpg',
      desc: {
        ko: '인천 서구 원당동의 정원형 복층 단독주택 타운하우스입니다. 세대마다 테라스·다락방·정원과 독립 주차장을 두고, 지붕에는 약 3kW 태양광 발전 설비를 계획했습니다(분양 자료 기준).',
        en: 'Garden duplex townhouses in Wondang-dong, Seo-gu, Incheon. Each home has its own terrace, attic room, garden and parking, with roughly 3 kW of rooftop solar planned (per sales material).' },
      images: [['01.jpg', 'render'], ['02.jpg', 'plan'], ['03.jpg', 'ext'], ['04.jpg', 'ext'], ['05.jpg', 'int'], ['06.jpg', 'int'], ['07.jpg', 'int'], ['08.jpg', 'int'], ['09.jpg', 'int']] },

    { id: 'bullo', r: 'r9', role: 'ds', hero: 'assets/img/projects/track/lg/bullo.jpg',
      desc: {
        ko: '인천 서구 불로동의 38세대·2개동 타운하우스입니다. 단지 안에 바비큐 데크와 텃밭을 두어 이웃과 함께 쓰는 마당을 만들었습니다.',
        en: 'A 38-unit, two-building townhouse community in Bullo-dong, Seo-gu, Incheon, with a shared barbecue deck and kitchen gardens inside the complex.' },
      images: [['01.jpg', 'land'], ['02.jpg', 'land'], ['03.jpg', 'land'], ['04.jpg', 'int'], ['05.jpg', 'int'], ['06.jpg', 'int'], ['07.jpg', 'int']] }
  ];

  var STR = {
    ko: { 'pd.crumb': '프로젝트', 'pd.kicker': 'Project Overview', 'pd.title': '프로젝트 개요',
          'pd.f.loc': '위치', 'pd.f.year': '연도', 'pd.f.scale': '규모', 'pd.f.use': '용도', 'pd.f.role': '역할',
          'pd.g.kicker': 'Project Gallery', 'pd.g.title': 'See the Project', 'pd.g.all': '전체',
          'pd.k.ext': '외관', 'pd.k.int': '실내', 'pd.k.con': '시공 중', 'pd.k.render': '조감도', 'pd.k.plan': '단면 · 구성', 'pd.k.land': '조경 · 커뮤니티',
          'pd.note': '※ 관계사 (주)재인건설과 전신 법인의 실적입니다. 조감도는 분양 자료 기준이며 실제와 다를 수 있습니다.',
          'meta.pd.desc': '재노바 아너스와 뿌리를 같이하는 시공 실적.' },
    en: { 'pd.crumb': 'Projects', 'pd.kicker': 'Project Overview', 'pd.title': 'Overview',
          'pd.f.loc': 'Location', 'pd.f.year': 'Year', 'pd.f.scale': 'Scale', 'pd.f.use': 'Use', 'pd.f.role': 'Role',
          'pd.g.kicker': 'Project Gallery', 'pd.g.title': 'See the Project', 'pd.g.all': 'All',
          'pd.k.ext': 'Exterior', 'pd.k.int': 'Interior', 'pd.k.con': 'Under construction', 'pd.k.render': 'Rendering', 'pd.k.plan': 'Section · Layout', 'pd.k.land': 'Landscape · Community',
          'pd.note': '※ Record of our affiliate Jaein Construction and its predecessors. Renderings follow sales material and may differ from the built result.',
          'meta.pd.desc': 'Track record sharing its roots with Jaenova Honors.' }
  };

  var id = new URLSearchParams(location.search).get('p');
  var idx = -1;
  for (var i = 0; i < PROJECTS.length; i++) if (PROJECTS[i].id === id) idx = i;
  if (idx === -1) { location.replace('projects.html'); return; }
  var P = PROJECTS[idx];

  // 페이지 문구를 i18n 사전에 등록 (applyLang 이 data-i18n 으로 채움)
  ['ko', 'en'].forEach(function (lang) {
    var d = window.I18N[lang]; if (!d) return;
    Object.keys(STR[lang]).forEach(function (k) { d[k] = STR[lang][k]; });
    d['pd.desc'] = P.desc[lang];
    d['meta.pd.title'] = d['tr.' + P.r + '.n'] + (lang === 'ko' ? ' | 재노바 아너스' : ' | Jaenova Honors');
  });

  var k = function (f) { return 'tr.' + P.r + '.' + f; };
  var esc = function (s) { return String(s).replace(/"/g, '&quot;'); };

  document.getElementById('pdHeroImg').src = P.hero;
  document.getElementById('pdHeroImg').setAttribute('data-i18n-alt', k('n'));
  document.getElementById('pdCrumbType').setAttribute('data-i18n', k('t'));
  document.getElementById('pdName').setAttribute('data-i18n', k('n'));
  document.getElementById('pdLoc').setAttribute('data-i18n', k('l'));

  var rows = [['pd.f.loc', k('l')], ['pd.f.year', k('y')], ['pd.f.scale', k('s')], ['pd.f.use', k('t')]];
  if (P.role) rows.push(['pd.f.role', 'tr.role.' + P.role]);
  document.getElementById('pdFacts').innerHTML = rows.map(function (r) {
    return '<div><dt data-i18n="' + r[0] + '"></dt><dd data-i18n="' + r[1] + '"></dd></div>';
  }).join('');

  // 갤러리 + 종류별 필터 (해당 종류가 있을 때만 칩 표시)
  var kinds = [];
  P.images.forEach(function (im) { if (kinds.indexOf(im[1]) === -1) kinds.push(im[1]); });
  var bar = document.getElementById('pdFilters');
  if (kinds.length > 1) {
    bar.innerHTML = '<button data-filter="all" class="on" aria-pressed="true" data-i18n="pd.g.all"></button>' +
      kinds.map(function (c) { return '<button data-filter="' + c + '" aria-pressed="false" data-i18n="pd.k.' + c + '"></button>'; }).join('');
  } else {
    bar.remove();
  }
  document.getElementById('pdGallery').innerHTML = P.images.map(function (im) {
    var src = IMG + P.id + '/' + im[0];
    return '<figure data-cat="' + im[1] + '" data-full="' + esc(src) + '">' +
      '<img src="' + esc(src) + '" data-i18n-alt="pd.k.' + im[1] + '" alt="" loading="lazy">' +
      '<figcaption data-i18n="pd.k.' + im[1] + '"></figcaption></figure>';
  }).join('');

  // 이전 · 다음 — 송도(별도 페이지 project-songdo.html)가 순환의 첫 번째
  //   송도 페이지의 이전/다음 링크는 project-songdo.html 에 직접 적혀 있음: 이 순서를 바꾸면 같이 고칠 것
  var NAV = [{ href: 'project-songdo.html', name: 'pj.1.name' }].concat(PROJECTS.map(function (p) {
    return { href: 'project.html?p=' + p.id, name: 'tr.' + p.r + '.n' };
  }));
  var at = idx + 1;
  var prev = NAV[(at - 1 + NAV.length) % NAV.length];
  var next = NAV[(at + 1) % NAV.length];
  document.getElementById('pdNav').innerHTML =
    '<a class="pd-nav-link" href="' + prev.href + '"><small data-i18n="pd.prev"></small><b data-i18n="' + prev.name + '"></b></a>' +
    '<a class="pd-nav-all" href="projects.html" data-i18n="pd.all"></a>' +
    '<a class="pd-nav-link next" href="' + next.href + '"><small data-i18n="pd.next"></small><b data-i18n="' + next.name + '"></b></a>';
})();
