/**
 * Doppia — 제품 가드(Satisfaction Guards) 중앙 프로파일 (8개 제품 버티컬 공통 소스)
 * ============================================================================
 * 배경: general 세션이 config.guards[](6종)을 발명했으나 general 단독이었음. 본 파일은
 *   8개 제품 세션 작업기록(general 18구멍 / beauty 424종·36게이트 / home 180·3축 / pet 488·4갭)을
 *   정독해 가드를 **전 제품 버티컬로 일반화**하고, "동일 적용 vs 차등 적용"을 확정한 중앙 정본.
 *   → 템플릿(config.guards[])과 UGC 브리지(ugc.fidelity_profiles.v2.js)가 같은 이 소스를 참조.
 *
 * 판단 규칙(핵심):
 *   ① UNIVERSAL (동일 적용)  = 어떤 제품이든 항상 ON. 8개 버티컬 전부 같게.
 *   ② CONDITIONAL (차등 적용) = 제품 물리 "실패축"이 켜질 때만 ON. 버티컬마다 다르게.
 *   resolvedGuards(vertical) = UNIVERSAL ∪ PROFILES[vertical].conditional
 *
 * 실패축(전 세션 공통 발견) → 가드 매핑:
 *   text(글자)        → label_lock        (beauty 라벨/셰이드, tech UI/로고, jewelry 각인, food 메뉴, general 패키징)
 *   specular(정반사)  → reflection_control (jewelry 금속/스톤, beauty 유리병, tech 스크린/메탈, home 유리데코)
 *   scale(크기오인)   → scale_cue          (home 가구, pet 대용량/캣타워, general 1m+, jewelry 초소형, tech 소형)
 *   count(다부품/세트)→ count_lock         (beauty 세트/셰이드, home 컬러변형, tech 포트, jewelry 스톤, general 번들)
 *   soft/dup(연질·증식)→ form_lock+single_sku (fashion 드레이프, food 유기물, pet 소프트, general 연질)
 *   emissive(점등/화면)→ emissive_render  ★NEW (home 조명 ON, pet 디바이스 UI, tech 스크린 발광) — general 6가드엔 없던 7번째 축
 *
 * ⚠️ 엔진 소비 필요(시드는 선언만): general 작업기록 ENGINE 핸드오프 ⑥(resolver L148 매핑버그=마스터스위치)
 *   + ①label_lock 픽셀마스킹 + ③scale_cue overlay + emissive 야간/발광 렌더(home②·pet②). 미반영 시 today 효과 0.
 */
const SPEC = {
  schema_version: 1,
  kind: 'product_satisfaction_guards',
  consumed_by: ['recipes.<vertical>.v2.js#config.guards[]', 'ugc.fidelity_profiles.v2.js'],

  // ── 가드 택소노미 (7종) — 각 가드 = 실패축 1개 ────────────────────────────
  GUARD_TAXONOMY: {
    // ① UNIVERSAL (동일 적용 — 8개 버티컬 항상)
    form_lock: {
      tier: 'universal', axis: 'soft/fidelity',
      does: '레퍼런스의 형태/색/소재/마감/비율을 강하게 잠금(연질·유기물 모핑 방지)',
      negative: 'invented product, shape morphing, added or missing parts not in reference, color shift, warped geometry, material morphing',
      engine: 'prompt negative (오늘도 동작 — 단 resolver L148 매핑버그로 현재 누수)'
    },
    single_sku: {
      tier: 'universal', axis: 'duplication',
      does: '업로드 1장 = 단일 SKU. 번들/복제/추가 사본 invent 금지',
      negative: 'duplicated product, extra copies, invented bundle, cloned items',
      engine: 'prompt negative'
    },
    label_lock: {
      tier: 'universal', axis: 'text',
      does: '실물 라벨/인쇄/각인 픽셀 보존, AI로 글자 재생성 금지. 새 캡션은 text_overlay로만',
      negative: 'fabricated text on product, garbled lettering, invented logos, altered label',
      engine: 'label 픽셀 마스킹/inpaint + SAFETY text/logo "디자인 면" 예외 (general ①⑤)'
    },

    // ② CONDITIONAL (차등 적용 — 물리축 켜질 때만)
    reflection_control: {
      tier: 'conditional', axis: 'specular',
      does: '유리/금속/스크린 정반사·굴절 morph 억제(매트·반사억제 라이팅), 정반사면 360 smooth-orbit 금지(cut)',
      negative: 'warped reflections, refraction morph, blown specular hotspots, ghosting on glass/metal',
      engine: 'lighting preset + orbit 게이트'
    },
    scale_cue: {
      tier: 'conditional', axis: 'scale',
      does: '글자·손가락 없는 크기 기준(동전·카드·룸 컨텍스트·실측 그래픽 overlay) 주입 → 크기 오인 방지',
      negative: 'misleading scale, ambiguous size, wrong proportions vs real-world',
      engine: 'scale_cue 결정론 overlay 합성 (general ③)'
    },
    count_lock: {
      tier: 'conditional', axis: 'count',
      does: '레퍼런스 구성/부품/스톤/컬러변형 개수를 정확히 보존(추가·복제·누락 금지)',
      negative: 'added or missing components, wrong part count, duplicated stones/ports/items',
      engine: 'prompt negative + variant-grid style_variant 게이트'
    },
    emissive_render: {                       // ★ NEW — home/pet/tech가 드러낸 7번째 축
      tier: 'conditional', axis: 'emissive',
      does: '발광체를 켜진 상태로 렌더(램프·향초 점등, 디바이스 스크린/LCD 발광), 야간·어두운 맥락 변형',
      negative: 'unlit lamp that should glow, dead black screen that should display, no emission, flat daytime only',
      engine: '야간/발광 렌더 경로 (home ② Day-to-Night, pet ② Device UI). 화면 글자는 label_lock+text_overlay 병행',
      surfaced_by: ['home(조명 ON blocker)', 'pet(디바이스 UI 화면)', 'tech(스크린 발광)']
    }
  },

  UNIVERSAL: ['form_lock', 'single_sku', 'label_lock'],
  CONDITIONAL: ['reflection_control', 'scale_cue', 'count_lock', 'emissive_render'],

  // ── 버티컬별 프로파일 (universal은 생략=항상 포함, conditional만 명시) ──────
  // bespoke = universal 외 추가 가드 부하. axes = 켜진 실패축.
  PROFILES: {
    // ▼ 동일 적용권 (저-bespoke): conditional 최소 → UNIVERSAL로 거의 균일
    fashion: {
      bespoke: 'low', conditional: [], axes: ['soft(drape)', 'text(care tag/size)'],
      note: '연질 드레이프 = form_lock으로 충분. 정반사·점등 없음. 사이즈는 Fit&Size overlay(text_overlay)로 별도.'
    },
    food: {
      bespoke: 'low-med', conditional: ['count_lock', 'scale_cue'],
      axes: ['soft/organic(morph)', 'count(plating)', 'scale(portion)'],
      note: 'label_lock은 포장식품일 때만 실효(생물 음식엔 글자 없음). 정반사·점등 없음. 유기물 모핑이 핵심 → form_lock 강.'
    },

    // ▼ 차등권 (중-bespoke)
    beauty: {
      bespoke: 'med', conditional: ['reflection_control', 'count_lock'],
      axes: ['text(label/shade)', 'specular(glass bottle)', 'count(set/shade range)'],
      note: 'beauty 작업기록: 셰이드 정확도·세트가 핵심 갭 → count_lock. 유리병 정반사 → reflection. 라벨/클레임 = label_lock+🅣.'
    },
    pet: {
      bespoke: 'med', conditional: ['scale_cue', 'emissive_render', 'count_lock'],
      axes: ['scale(대용량/캣타워)', 'emissive(디바이스 UI)', 'count(번들)', 'habitat(환경-가드밖)'],
      note: 'pet 작업기록 4갭: 스케일·디바이스 UI화면(emissive+label)·서식지(컨텍스트). 서식지는 가드 아닌 씬 변형으로.'
    },

    // ▼ 고-bespoke (다축 동시)
    home: {
      bespoke: 'high', conditional: ['scale_cue', 'count_lock', 'reflection_control', 'emissive_render'],
      axes: ['scale(가구)', 'count(컬러변형)', 'specular(유리/금속 데코)', 'emissive(조명 ON)'],
      note: 'home 작업기록 3대 공백 = 점등·기능·색상비교 → emissive(조명 ON)·count(variant grid)·scale가 정확히 매핑. blocker=조명 → emissive 최우선.'
    },
    tech: {
      bespoke: 'high', conditional: ['reflection_control', 'count_lock', 'scale_cue', 'emissive_render'],
      axes: ['text(UI/logo)', 'specular(screen/metal)', 'count(ports/buttons)', 'scale(소형)', 'emissive(스크린 발광)'],
      note: 'tech = text(UI는 label_lock+🅣)·정반사·다부품·소형·스크린발광 동시. general과 함께 최고 가드부하.'
    },
    jewelry: {
      bespoke: 'high', conditional: ['reflection_control', 'scale_cue', 'count_lock'],
      axes: ['specular(metal/stone)', 'scale(초소형)', 'count(stones)', 'text(engraving)'],
      note: '초소형+정반사+각인+다스톤. 정반사면 360 금지. 각인=label_lock. 손목착용 손가락 리스크는 별도(ugc/on-model).'
    },

    // ▼ catch-all = 전 축 (general은 이미 inline guards[] 보유 — 본 정본과 정합)
    general: {
      bespoke: 'all', conditional: ['reflection_control', 'scale_cue', 'count_lock', 'emissive_render'],
      axes: ['text', 'specular', 'scale', 'count', 'soft/dup', 'emissive'],
      note: '형태 미지 catch-all → 전 축 대비. 1m+ 대형은 Large-Format Hero + scale_cue 강제. general v2.1 inline guards[]가 본 정본의 구현 선례.'
    }
  }
};

// ── A2d: resolvedGuards를 실함수로 (pseudocode → 실제 호출 가능). dead-data 해소. ──
/** 버티컬에 켜지는 가드 id 목록 = UNIVERSAL(동일 3) ∪ PROFILES[vertical].conditional(차등). */
function resolvedGuards(vertical) {
  const p = SPEC.PROFILES[vertical];
  if (!p) return null;                 // 비제품(influencer/ugc/headshot)·미지 버티컬 = null
  return [...SPEC.UNIVERSAL, ...(p.conditional || [])];
}
/** 버티컬에 주입할 가드 negative 프래그먼트(엔진/export가 look.negative에 합칠 수 있게). */
function guardNegatives(vertical) {
  return (resolvedGuards(vertical) || [])
    .map((id) => SPEC.GUARD_TAXONOMY[id] && SPEC.GUARD_TAXONOMY[id].negative)
    .filter(Boolean);
}
/** 카드/리뷰 표기용: {id, tier, axis, does} 상세. */
function guardDetail(vertical) {
  return (resolvedGuards(vertical) || []).map((id) => {
    const g = SPEC.GUARD_TAXONOMY[id] || {};
    return { id, tier: g.tier, axis: g.axis, does: g.does };
  });
}

module.exports = Object.assign(SPEC, { resolvedGuards, guardNegatives, guardDetail });
