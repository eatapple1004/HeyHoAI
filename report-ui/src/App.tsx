import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BarChart } from '@/components/charts/bar-chart';
import { Bar } from '@/components/charts/bar';
import { BarXAxis } from '@/components/charts/bar-x-axis';
import { BarYAxis } from '@/components/charts/bar-y-axis';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip';
import { RadarChart } from '@/components/charts/radar-chart';
import { RadarGrid } from '@/components/charts/radar-grid';
import { RadarAxis } from '@/components/charts/radar-axis';
import { RadarLabels } from '@/components/charts/radar-labels';
import { RadarArea } from '@/components/charts/radar-area';
import { RingChart } from '@/components/charts/ring-chart';
import { Ring } from '@/components/charts/ring';
import { PieChart } from '@/components/charts/pie-chart';
import { PieSlice } from '@/components/charts/pie-slice';

/**
 * 도피아 사업체 마케팅 진단 — /admin-business/:id/report
 *   데이터: GET/POST /api/admin/business/:id/report (수집 facts · 계산 scores · AI story)
 *   점수는 서버가 공식으로 계산한 것 그대로, 자료가 없으면 빈칸으로 보여 준다(지어내지 않는다).
 */

type Score = { key: string; label: string; score: number | null; basis: string[] };
type Story = {
  summary: string; findings: { title: string; body: string }[]; actions: { title: string; owner: string; when: string; why: string }[];
  reviewThemes: { good: string[]; bad: string[] }; plan: { phase: string; period: string; tasks: { task: string; owner: string; metric: string }[] }[];
  metrics: { name: string; now: string; target: string; note: string }[]; missing: { item: string; why: string; how: string }[]; questions: string[];
};
type Facts = any;
type ReportData = { facts: Facts; scores: Score[]; story: Story; check?: { unsourced: string[] } };
type ApiData = {
  business: { id: string; name: string };
  reports: { id: string; status: string; step: string | null; error: string | null; created_at: string }[];
  latest: { id: string; created_at: string; data: ReportData } | null;
  running: { id: string; step: string | null } | null;
};

const BIZ_ID = location.pathname.split('/').filter(Boolean)[1] || '';
const API = import.meta.env.DEV ? `${import.meta.env.BASE_URL}dev/mock.json` : `/api/admin/business/${BIZ_ID}/report`;
const COLORS = ['#6a40e0', '#a394ee', '#f59e0b', '#10b981', '#ef4444'];
const fmt = (n: number | null | undefined) => (n == null ? '–' : n.toLocaleString('ko-KR'));
const short = (s: string, n = 12) => (s.length > n ? `${s.slice(0, n)}…` : s);

async function api(method = 'GET'): Promise<ApiData> {
  const res = await fetch(API, { method, headers: { 'Content-Type': 'application/json' } });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.success === false) throw new Error(j.message || j.error || `요청 실패 (${res.status})`);
  return j.data;
}

export default function App() {
  const [state, setState] = useState<ApiData | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setState(await api()); setErr(''); } catch (e: any) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!state?.running) return;
    const t = setTimeout(load, 4000);
    return () => clearTimeout(t);
  }, [state, load]);

  const run = async () => {
    setBusy(true);
    try { setState(await api('POST')); setErr(''); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const r = state?.latest?.data;
  const lastErr = state?.reports?.[0]?.status === 'error' ? state.reports[0].error : null;
  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-24 pt-6 sm:px-8">
      <header className="no-print mb-6 flex flex-wrap items-center gap-3">
        <a href={`/admin-business/${BIZ_ID}`} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-600 no-underline">← 사업체 상세</a>
        <a href={`/admin-business/${BIZ_ID}/site`} className="text-sm text-violet-700">🌐 홈페이지</a>
        <a href={`/admin-business/${BIZ_ID}/marketing`} className="text-sm text-violet-700">🤖 AI 마케팅 팀</a>
        <div className="ml-auto flex items-center gap-2">
          {state?.running && <span className="text-sm text-amber-700">⏳ {state.running.step || '진단 중'}… (1~2분)</span>}
          {r && <button onClick={() => print()} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold">PDF로 저장</button>}
          <button disabled={busy || !!state?.running} onClick={run} className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{r ? '다시 진단' : '진단 시작'}</button>
        </div>
      </header>
      {err && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}
      {lastErr && !state?.running && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">마지막 진단 실패: {lastErr}</p>}
      {!state && !err && <p className="text-zinc-500">불러오는 중…</p>}
      {state && !r && !state.running && (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <h1 className="text-2xl font-extrabold">{state.business.name} 마케팅 진단</h1>
          <p className="mt-2 text-zinc-500">홈페이지 제작에서 모은 지도·리뷰·조사 자료와 주변 상권 데이터로 진단합니다. 매출처럼 공개되지 않은 자료는 빈칸으로 두고 받아야 할 자료로 정리합니다.</p>
          <button onClick={run} disabled={busy} className="mt-6 rounded-lg bg-violet-700 px-5 py-3 font-bold text-white">진단 시작</button>
        </div>
      )}
      {r && state && <Report data={r} at={state.latest!.created_at} history={state.reports} />}
    </div>
  );
}

function Report({ data, at, history }: { data: ReportData; at: string; history: ApiData['reports'] }) {
  const { facts: f, scores, story: s } = data;
  const known = scores.filter((x) => x.score != null);
  return (
    <article className="space-y-6">
      {/* 머리 */}
      <section className="overflow-hidden rounded-3xl bg-[#16141f] text-white">
        <div className="grid gap-8 p-8 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="text-xs font-bold tracking-widest text-violet-300">DOPPIA · 마케팅 진단</p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{f.business.name}</h1>
            <p className="mt-1 text-sm text-zinc-400">{f.business.category} · {f.business.address}</p>
            <p className="mt-1 text-xs text-zinc-500">진단 {new Date(at).toLocaleString('ko-KR')} · 지난 진단 {history.filter((h) => h.status === 'done').length - 1}회</p>
            <p className="mt-6 text-lg leading-relaxed text-zinc-100">{s.summary}</p>
          </div>
          <div className="flex items-center justify-center">
            {known.length >= 3 ? (
              <div className="w-full max-w-[340px] text-zinc-200">
                <RadarChart size={Math.min(340, window.innerWidth - 72)} metrics={scores.map((x) => ({ key: x.key, label: `${x.label} ${x.score ?? '–'}` }))}
                  data={[{ label: '점수', color: '#a394ee', values: Object.fromEntries(scores.map((x) => [x.key, x.score ?? 0])) }]}>
                  <RadarGrid stroke="#ffffff" strokeOpacity={0.15} />
                  <RadarAxis />
                  <RadarLabels fontSize={12} />
                  <RadarArea index={0} showPoints showGlow />
                </RadarChart>
              </div>
            ) : <p className="text-zinc-400">점수를 낼 자료가 부족합니다.</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-white/10 sm:grid-cols-5">
          {scores.map((x) => (
            <div key={x.key} className="border-white/10 p-5 [&:not(:first-child)]:border-l">
              <div className="text-xs text-zinc-400">{x.label}</div>
              <div className="mt-1 text-3xl font-extrabold tabular-nums">{x.score ?? <span className="text-xl text-zinc-500">자료 없음</span>}<span className="text-sm font-semibold text-zinc-500">{x.score != null ? ' /100' : ''}</span></div>
            </div>
          ))}
        </div>
      </section>

      {/* 발견 · 할 일 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="핵심 발견">
          <ol className="space-y-4">{s.findings.map((x, i) => (
            <li key={i} className="flex gap-3"><Num n={i + 1} /><div><b className="block">{x.title}</b><p className="text-sm leading-relaxed text-zinc-600">{x.body}</p></div></li>
          ))}</ol>
        </Card>
        <Card title="지금 할 일">
          <ol className="space-y-4">{s.actions.map((x, i) => (
            <li key={i} className="flex gap-3"><Num n={i + 1} /><div><b className="block">{x.title}</b>
              <div className="my-1 flex gap-2"><Tag tone={x.owner === '도피아' ? 'violet' : 'amber'}>{x.owner}</Tag>{x.when && <Tag tone="zinc">{x.when}</Tag>}</div>
              <p className="text-sm leading-relaxed text-zinc-600">{x.why}</p></div></li>
          ))}</ol>
        </Card>
      </div>

      {/* 점수 근거 */}
      <Card title="점수는 이렇게 계산했습니다" hint="AI가 매긴 점수가 아니라 정해진 공식으로 계산 — 자료가 없는 항목은 빈칸">
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="relative mx-auto w-[280px]">
            <RingChart size={280} strokeWidth={10} ringGap={5} baseInnerRadius={66} data={known.map((x, i) => ({ label: x.label, value: x.score as number, maxValue: 100, color: COLORS[i % 5] }))}>
              {known.map((x, i) => <Ring key={x.key} index={i} />)}
            </RingChart>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-extrabold tabular-nums">{Math.round(known.reduce((a, x) => a + (x.score as number), 0) / Math.max(1, known.length))}</div>
              <div className="text-xs text-zinc-500">평균({known.length}개 항목)</div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {scores.map((x, i) => (
              <div key={x.key} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: x.score == null ? '#d4d4d8' : COLORS[known.indexOf(x) % 5] }} /><b>{x.label}</b><span className="ml-auto font-bold tabular-nums">{x.score ?? '자료 없음'}</span></div>
                <ul className="mt-2 space-y-0.5 text-xs leading-relaxed text-zinc-600">{x.basis.map((b, k) => <li key={k}>{b}</li>)}</ul>
                {i === -1 && null}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Section n="01" title="평판" hint="Google 지도 · 네이버 블로그 후기 기준 · 리뷰 글은 최근 표본">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-violet-50 p-6">
            <div className="text-sm text-violet-900/70">Google 평점</div>
            <div className="text-5xl font-extrabold tabular-nums text-violet-900">{f.reputation.googleRating ?? '–'}</div>
            <div className="mt-1 text-sm text-violet-900/70">리뷰 {fmt(f.reputation.googleReviews)}개</div>
            {f.reputation.sample.length > 0 && (
              <div className="mx-auto mt-4 w-[180px]">
                <PieChart size={180} innerRadius={50} data={starDist(f.reputation.sample)}>
                  {starDist(f.reputation.sample).map((_, i) => <PieSlice key={i} index={i} />)}
                </PieChart>
                <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">{starDist(f.reputation.sample).map((d) => <span key={d.label} className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: d.color }} />{d.label} {d.value}</span>)}</div>
                <p className="mt-1 text-center text-[11px] text-zinc-500">최근 표본 {f.reputation.sample.length}개의 별점</p>
              </div>
            )}
          </div>
          <div className="lg:col-span-2">
            <NaverPlace nv={f.reputation.naverPlace} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Themes title="좋게 말한 점" items={s.reviewThemes.good} tone="good" />
              <Themes title="아쉬운 점" items={s.reviewThemes.bad} tone="bad" />
            </div>
            <ul className="mt-4 space-y-2">{f.reputation.sample.slice(0, 5).map((x: any, i: number) => (
              <li key={i} className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">
                <span className="mr-2 text-amber-500">{'★'.repeat(Math.round(x.rating || 0))}</span><b>{x.author}</b><span className="ml-2 text-xs text-zinc-500">{x.when} · {({ ko: '한국어', ja: '일본어', zh: '중국어', en: '영어' } as any)[x.lang]}</span>
                <p className="mt-1 line-clamp-2 text-zinc-600">{x.text}</p>
              </li>
            ))}</ul>
            <NaverBlogReviews nv={f.reputation.naver} blog={f.reputation.blog} />
          </div>
        </div>
      </Section>

      <Section n="02" title="경쟁 위치" hint={`주변 700m · Google에서 "${f.nearby.sameCategory.keyword}" 검색 · 같은 브랜드 지점은 회색`}>
        {f.competitors.length ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-bold text-zinc-600">리뷰 수</h4>
              <BarChart orientation="horizontal" aspectRatio="4 / 3" xDataKey="name" margin={{ left: 120 }}
                data={compRows(f).map((c) => ({ ...c, name: short(c.name) }))}>
                <Grid horizontal={false} vertical />
                <Bar dataKey="reviews" fill="var(--chart-1)" lineCap="round" />
                <BarYAxis showAllLabels />
                <ChartTooltip showCrosshair={false} />
              </BarChart>
            </div>
            <div className="self-start overflow-x-auto"><table className="tbl w-full text-sm">
              <thead><tr className="text-left text-xs text-zinc-500"><th className="py-2">가게</th><th>평점</th><th>리뷰</th><th>거리</th></tr></thead>
              <tbody>{compRows(f).map((c) => (
                <tr key={c.name} className={`border-t border-zinc-100 ${c.self ? 'bg-violet-50 font-bold' : c.sameBrand ? 'text-zinc-400' : ''}`}>
                  <td className="py-2 pr-2">{short(c.name, 18)}{c.self ? ' (우리)' : ''}</td><td className="tabular-nums">{c.rating}</td><td className="tabular-nums">{fmt(c.reviews)}</td><td className="tabular-nums">{c.distance == null ? '' : `${c.distance}m`}</td>
                </tr>
              ))}</tbody>
            </table></div>
          </div>
        ) : <Empty>주변 같은 업종을 찾지 못했습니다.</Empty>}
        <p className="mt-3 text-xs text-zinc-500">카카오맵 기준 반경 {f.nearby.radius}m 안 "{f.nearby.sameCategory.keyword}" {fmt(f.nearby.sameCategory.kakaoCount)}곳</p>
      </Section>

      <Section n="03" title="주변 유입 요인" hint={`카카오맵 · 반경 ${f.nearby.radius}m 안 시설 수 — 실제 방문자 수가 아닙니다`}>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <BarChart aspectRatio="16 / 9" xDataKey="label" data={f.nearby.categories.map((c: any) => ({ label: c.label, count: c.count }))}>
            <Grid horizontal />
            <Bar dataKey="count" fill="var(--chart-2)" lineCap="round" />
            <BarXAxis showAllLabels />
            <ChartTooltip showCrosshair={false} />
          </BarChart>
          <div className="space-y-4 text-sm">
            {f.nearby.categories.filter((c: any) => c.nearest?.length).map((c: any) => (
              <div key={c.code}><b className="text-zinc-600">가까운 {c.label}</b>
                <ul className="mt-1 space-y-0.5">{c.nearest.map((p: any) => <li key={p.name} className="flex justify-between gap-2"><span>{p.name}</span><span className="tabular-nums text-zinc-500">{p.distance}m</span></li>)}</ul></div>
            ))}
          </div>
        </div>
      </Section>

      <Section n="04" title="온라인 노출 · 운영" hint="지도 서비스·홈페이지·SNS 상태">
        <Sns sns={f.sns} />
        <div className="grid gap-4 sm:grid-cols-2">
          {['presence', 'content'].map((k) => { const x = scores.find((y) => y.key === k); return x ? (
            <div key={k} className="rounded-xl border border-zinc-200 p-4"><b>{x.label} <span className="tabular-nums text-violet-700">{x.score ?? '자료 없음'}</span></b>
              <ul className="mt-2 space-y-1 text-sm">{x.basis.map((b, i) => <li key={i} className={b.startsWith('✗') ? 'text-red-600' : b.startsWith('–') ? 'text-zinc-400' : ''}>{b}</li>)}</ul></div>
          ) : null; })}
        </div>
        {f.business.hours?.length > 0 && <p className="mt-3 text-xs text-zinc-500">영업시간(Google): {f.business.hours.join(' · ')}</p>}
      </Section>

      <Section n="05" title="90일 계획">
        <div className="grid gap-4 lg:grid-cols-3">{s.plan.map((p, i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-xs font-bold text-violet-700">{p.period}</div><h4 className="text-lg font-extrabold">{p.phase}</h4>
            <ul className="mt-3 space-y-3">{p.tasks.map((t, k) => (
              <li key={k} className="text-sm"><div className="flex items-start gap-2"><Tag tone={t.owner === '도피아' ? 'violet' : 'amber'}>{t.owner}</Tag><span>{t.task}</span></div>
                <p className="ml-1 mt-0.5 text-xs text-zinc-500">확인: {t.metric}</p></li>
            ))}</ul>
          </div>
        ))}</div>
      </Section>

      <Section n="06" title="90일 뒤 볼 지표" hint="지금 값은 모은 자료 기준 · 목표는 제안">
        <div className="overflow-x-auto"><table className="tbl w-full text-sm">
          <thead><tr className="text-left text-xs text-zinc-500"><th className="py-2">지표</th><th>지금</th><th>목표</th><th>메모</th></tr></thead>
          <tbody>{s.metrics.map((m, i) => (
            <tr key={i} className="border-t border-zinc-100"><td className="py-2 pr-3 font-semibold">{m.name}</td><td className="pr-3 tabular-nums">{m.now}</td><td className="pr-3 font-bold tabular-nums text-violet-700">{m.target}</td><td className="text-xs text-zinc-500">{m.note}</td></tr>
          ))}</tbody>
        </table></div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section n="07" title="받아야 할 자료" hint="공개 API로는 알 수 없는 것 — 받으면 다음 진단에 반영">
          <ul className="space-y-3">{s.missing.map((m, i) => (
            <li key={i} className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-3 text-sm"><b>{m.item}</b><p className="text-zinc-600">{m.why}</p><p className="text-xs text-amber-800">받는 방법: {m.how}</p></li>
          ))}</ul>
        </Section>
        <Section n="08" title="사장님께 여쭐 것">
          <ol className="list-decimal space-y-2 pl-5 text-sm">{s.questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
        </Section>
      </div>

      <Section n="09" title="근거 자료와 출처">
        {f.research?.facts?.length ? (
          <ul className="space-y-1.5 text-sm">{f.research.facts.map((x: any, i: number) => (
            <li key={i}><Tag tone="zinc">{x.topic}</Tag> {x.text} <span className="text-xs text-zinc-500">— {x.url ? <a className="text-violet-700" href={x.url} target="_blank" rel="noreferrer">{x.source}</a> : x.source}</span></li>
          ))}</ul>
        ) : <Empty>조사 시트가 없습니다(홈페이지 제작 2단계).</Empty>}
        <p className="mt-4 text-xs text-zinc-500">데이터 출처: 카카오 로컬 API(장소·주변 시설), Google Places API(평점·리뷰·영업시간·주변 같은 업종), 네이버 검색 API(지도 등록·블로그·카페·뉴스), 도피아 조사 시트(웹 검색, 출처별), 도피아 운영 기록(인스타 게시·사진).
          {f.business.kakaoUrl && <> · <a className="text-violet-700" href={f.business.kakaoUrl} target="_blank" rel="noreferrer">카카오맵</a></>}
          {f.business.googleUrl && <> · <a className="text-violet-700" href={f.business.googleUrl} target="_blank" rel="noreferrer">Google 지도</a></>}</p>
        {data.check?.unsourced?.length ? <p className="mt-2 text-xs text-red-600">확인 필요: 해석 글의 숫자 {data.check.unsourced.join(', ')}이(가) 모은 자료에 없습니다.</p> : <p className="mt-2 text-xs text-emerald-700">해석 글의 숫자는 모두 모은 자료에 있습니다.</p>}
        {Object.keys(f.errors || {}).length > 0 && <p className="mt-1 text-xs text-amber-700">일부 출처 실패: {Object.keys(f.errors).join(', ')}</p>}
      </Section>
    </article>
  );
}

/** 네이버 플레이스 — 외부 수집(ReefAPI). 공식 API가 아니라 출처를 따로 적는다 */
function NaverPlace({ nv }: { nv: any }) {
  if (!nv) return null;
  if (nv.skipped || nv.matched === false) return (
    <p className="mb-4 rounded-xl border border-dashed border-zinc-300 p-3 text-xs text-zinc-500">네이버 플레이스 리뷰: {nv.skipped || `주소가 맞는 장소를 찾지 못함 (후보: ${(nv.tried || []).join(' / ') || '없음'})`}</p>
  );
  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <b className="text-emerald-900">네이버 플레이스</b>
        {nv.rating != null && <span className="text-sm">평점 <b className="tabular-nums">{nv.rating}</b></span>}
        <span className="text-sm">방문자 리뷰 <b className="tabular-nums">{fmt(nv.visitorReviews)}</b>개</span>
        {nv.blogReviews != null && <span className="text-sm">블로그 리뷰 <b className="tabular-nums">{fmt(nv.blogReviews)}</b>개</span>}
        <a className="ml-auto text-xs text-emerald-800" href={nv.url} target="_blank" rel="noreferrer">네이버 지도에서 보기</a>
      </div>
      {nv.keywords?.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5">{nv.keywords.map((k: any) => <li key={k.label} className="rounded-full bg-white px-2.5 py-1 text-xs">{k.label}{k.count != null ? ` ${fmt(k.count)}` : ''}</li>)}</ul>}
      {nv.recent?.length > 0 && <ul className="mt-3 space-y-1.5">{nv.recent.slice(0, 3).map((x: any, i: number) => <li key={i} className="text-sm text-zinc-700"><span className="text-xs text-zinc-500">{x.when}</span> {x.text.length > 120 ? `${x.text.slice(0, 120)}…` : x.text}</li>)}</ul>}
      <p className="mt-2 text-[11px] text-zinc-500">외부 수집 서비스(ReefAPI) 기준 · 네이버 공식 API 아님 · {new Date(nv.fetchedAt).toLocaleDateString('ko-KR')}</p>
    </div>
  );
}

/** 계정별 공식 수치 — 팔로워·게시 주기·반응, 게시물별 반응 차트 */
function SnsStatsView({ accounts, setup }: { accounts: any[]; setup?: any }) {
  const withStats = accounts.filter((a) => a.stats);
  const top = withStats.find((a) => a.stats.recent?.some((p: any) => p.likes != null || p.views != null));
  const metric = top?.stats.recent?.some((p: any) => p.views != null) ? 'views' : 'react';
  const rows = top ? [...top.stats.recent].reverse().slice(-12).map((p: any) => ({
    d: new Date(p.at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
    v: metric === 'views' ? p.views || 0 : (p.likes || 0) + (p.comments || 0),
  })) : [];
  return (
    <div className="mt-4 space-y-4">
      {accounts.length > 0 && <div className="overflow-x-auto"><table className="tbl w-full text-sm">
        <thead><tr className="text-left text-xs text-zinc-500"><th className="py-2">계정</th><th>팔로워</th><th>팔로잉</th><th>게시물</th><th>최근 30일</th><th>평균 간격</th><th>게시물당 반응</th><th>반응률</th><th>마지막 게시</th></tr></thead>
        <tbody>{accounts.map((a) => { const st = a.stats; const sm = st?.summary || {}; return (
          <tr key={a.platform + a.handle} className="border-t border-zinc-100 align-top">
            <td className="py-2 pr-2"><b>{a.label}</b> <span className="text-xs text-zinc-500">{a.handle}</span>
              <div className="text-[11px] text-zinc-500">{st ? st.source : a.statsNote}</div>
              {a.official === 'other' && <div className="text-[11px] font-semibold text-amber-700">다른 지점 계정({a.otherBranch}) — 점수 제외</div>}
              {a.official === 'brand' && <div className="text-[11px] font-semibold text-zinc-500">본사 계정 — 점수 제외</div>}</td>
            {st ? (<>
              <td className="tabular-nums">{fmt(st.followers)}</td><td className="tabular-nums">{fmt(st.following)}</td><td className="tabular-nums">{fmt(st.posts)}</td>
              <td className="tabular-nums">{sm.last30 ?? '–'}건</td><td className="tabular-nums">{sm.avgGapDays != null ? `${sm.avgGapDays}일` : '–'}</td>
              <td className="tabular-nums text-xs">{sm.avgViews != null ? `조회 ${fmt(sm.avgViews)} · ` : ''}{sm.avgLikes != null ? `좋아요 ${fmt(sm.avgLikes)} · 댓글 ${fmt(sm.avgComments)}` : '–'}</td>
              <td className="tabular-nums">{sm.engagementPct != null ? `${sm.engagementPct}%` : '–'}</td>
              <td className="tabular-nums text-xs">{sm.lastPostAt ? `${new Date(sm.lastPostAt).toLocaleDateString('ko-KR')} (${sm.daysSinceLast}일 전)` : '–'}</td>
            </>) : <td colSpan={8} className="text-xs text-zinc-400">{a.followers || a.posts ? `검색 결과 기준: ${[a.followers, a.posts].filter(Boolean).join(' · ')}` : '수치 없음'}</td>}
          </tr>); })}</tbody>
      </table></div>}
      {top && rows.length > 2 && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div><h4 className="mb-1 text-sm font-bold text-zinc-600">{top.label} 최근 게시물별 {metric === 'views' ? '조회수' : '반응(좋아요+댓글)'}</h4>
            <BarChart aspectRatio="16 / 7" xDataKey="d" data={rows}><Grid horizontal /><Bar dataKey="v" fill="var(--chart-1)" lineCap="round" /><BarXAxis showAllLabels /><ChartTooltip showCrosshair={false} /></BarChart></div>
          <div><h4 className="mb-1 text-sm font-bold text-zinc-600">반응이 좋았던 게시물</h4>
            <ul className="space-y-2 text-sm">{(top.stats.summary.best || []).map((p: any, i: number) => (
              <li key={i} className="rounded-lg border border-zinc-200 p-2"><a className="line-clamp-2 text-violet-700" href={p.url} target="_blank" rel="noreferrer" title={p.caption || ''}>{p.caption || '게시물'}</a>
                <div className="text-xs text-zinc-500">{new Date(p.at).toLocaleDateString('ko-KR')} · {p.type}{p.views != null ? ` · 조회 ${fmt(p.views)}` : ''}{p.likes != null ? ` · 좋아요 ${fmt(p.likes)}` : ''}{p.comments != null ? ` · 댓글 ${fmt(p.comments)}` : ''}{p.reach != null ? ` · 도달 ${fmt(p.reach)}` : ''}{p.saved != null ? ` · 저장 ${fmt(p.saved)}` : ''}</div></li>
            ))}</ul>
            {top.stats.insights && <p className="mt-2 text-xs text-zinc-600">최근 28일 인사이트: {Object.entries(top.stats.insights).map(([k, v]) => `${({ reach: '도달', accounts_engaged: '반응한 계정', total_interactions: '전체 반응', views: '조회', profile_views: '프로필 방문' } as any)[k] || k} ${fmt(v as number)}`).join(' · ')}</p>}
            {top.stats.note && <p className="mt-2 text-xs text-amber-700">{top.stats.note}</p>}
          </div>
        </div>
      )}
      {setup && <p className="text-[11px] text-zinc-500">공식 수치 연결 상태: 인스타(도피아 연결) {setup.connectedInstagram?.length ? setup.connectedInstagram.map((u: string) => '@' + u).join(', ') : '없음'} · 남의 인스타 조회 {setup.discovery ? '켜짐' : '꺼짐'} · 유튜브 API {setup.youtube ? '켜짐' : '꺼짐'} · 네이버 블로그 RSS 켜짐 · 틱톡(외부 수집) {setup.tiktok ? '켜짐' : '꺼짐'} · 스레드·X·페이스북·카카오채널은 공식 조회 API 없음</p>}
    </div>
  );
}

/** SNS 계정 — 어디서 찾았는지·확인 수준·검색 결과에 보인 수치(날짜) */
function Sns({ sns }: { sns: any }) {
  if (!sns) return null;
  const tone = (l: string) => (l === '확인' ? 'bg-emerald-100 text-emerald-800' : l === '검색 결과 확인' ? 'bg-violet-100 text-violet-800' : 'bg-zinc-100 text-zinc-500');
  return (
    <div className="mb-5">
      <h4 className="mb-2 text-sm font-bold text-zinc-600">SNS 계정</h4>
      {sns.accounts?.length ? (
        <div className="overflow-x-auto"><table className="tbl w-full text-sm">
          <thead><tr className="text-left text-xs text-zinc-500"><th className="py-2">채널</th><th>계정</th><th>찾은 곳</th><th>확인</th><th>팔로워·게시물(검색 결과 기준)</th></tr></thead>
          <tbody>{sns.accounts.map((a: any) => (
            <tr key={a.platform + a.handle} className={`border-t border-zinc-100 ${a.level === '출처 미확인' ? 'text-zinc-400' : ''}`}>
              <td className="py-2 font-semibold">{a.label}{a.official === 'brand' ? <span className="ml-1 text-xs font-normal text-zinc-500">(본사)</span> : null}</td>
              <td><a className="text-violet-700" href={a.url} target="_blank" rel="noreferrer">{a.platform === 'instagram' || a.platform === 'tiktok' || a.platform === 'threads' ? '@' : ''}{a.handle}</a></td>
              <td className="text-xs">{a.found.join(' · ')}</td>
              <td><span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${tone(a.level)}`}>{a.level}</span></td>
              <td className="text-xs">{[a.followers, a.posts, a.lastActive && `최근 ${a.lastActive}`].filter(Boolean).join(' · ') || '–'}</td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <p className="text-sm text-red-600">공식 SNS 계정을 찾지 못했습니다.</p>}
      <SnsStatsView accounts={sns.accounts || []} setup={sns.setup} />
      <p className="mt-2 text-xs text-zinc-500">찾는 곳: 홈페이지에 걸린 링크 · Google 장소 웹사이트 칸 · 웹 검색{sns.naverAvailable ? ' · 네이버 웹 검색' : ' (네이버 검색은 키가 없어 제외)'}. 팔로워 수는 검색 결과에 보인 값이라 실제와 다를 수 있습니다{sns.checkedAt ? ` (확인 ${new Date(sns.checkedAt).toLocaleDateString('ko-KR')})` : ''}.</p>
    </div>
  );
}

function compRows(f: Facts) {
  const self = { name: f.business.name, rating: f.reputation.googleRating, reviews: f.reputation.googleReviews || 0, distance: null, sameBrand: false, self: true };
  return [self, ...f.competitors.map((c: any) => ({ ...c, self: false }))].sort((a, b) => b.reviews - a.reviews).slice(0, 10);
}

function ymd(d?: string) { return d && d.length === 8 ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}` : d || ''; }

/** 네이버 블로그 후기 — 공식 검색 API의 요약 글(본문 전체 아님) */
function NaverBlogReviews({ nv, blog }: { nv?: any; blog?: any }) {
  if (!nv) return <p className="mt-4 rounded-xl border border-dashed border-zinc-300 p-3 text-xs text-zinc-500">네이버 블로그 후기: 네이버 검색이 필수가 되기 전에 만든 진단입니다. 진단을 새로 만들면 들어갑니다.</p>;
  return (
    <div className="mt-5">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="text-sm font-bold text-emerald-800">네이버 블로그 후기</h4>
        <span className="text-xs text-zinc-500">"{nv.query}" 블로그 {fmt(nv.blogTotal)}건{blog ? ` · 최근 30일 언급 ${blog.recent30}건${blog.capped ? ' 이상' : ''}` : ''} · 카페 {fmt(nv.cafe?.total)}건 · 뉴스 {fmt(nv.news?.total)}건</span>
      </div>
      {nv.reviews?.length ? (
        <ul className="space-y-2">{nv.reviews.slice(0, 6).map((x: any, i: number) => (
          <li key={i} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-sm">
            <a className="font-semibold text-emerald-900" href={x.link} target="_blank" rel="noreferrer">{x.title}</a>
            <span className="ml-2 text-xs text-zinc-500">{ymd(x.date)}{x.by ? ` · ${x.by}` : ''}</span>
            <p className="mt-1 line-clamp-2 text-zinc-600">{x.text}</p>
          </li>
        ))}</ul>
      ) : <Empty>가게 이름이 들어간 블로그 후기를 찾지 못했습니다.</Empty>}
      <p className="mt-2 text-[11px] text-zinc-500">네이버 검색 API가 주는 글 요약입니다(본문 전체 아님) · 블로그 글에는 답글을 달 수 없어 분석에만 씁니다.</p>
    </div>
  );
}

function starDist(sample: { rating?: number }[]) {
  const tone: Record<number, string> = { 5: '#6a40e0', 4: '#a394ee', 3: '#f59e0b', 2: '#f97316', 1: '#ef4444' };
  return [5, 4, 3, 2, 1].map((st) => ({ label: `${st}점`, value: sample.filter((x) => Math.round(x.rating || 0) === st).length, color: tone[st] })).filter((d) => d.value > 0);
}

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-zinc-200 bg-white p-6"><h3 className="mb-4 text-lg font-extrabold">{title}{hint && <span className="ml-2 text-xs font-normal text-zinc-500">{hint}</span>}</h3>{children}</section>;
}
function Section({ n, title, hint, children }: { n: string; title: string; hint?: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-zinc-200 bg-white p-6"><div className="mb-4 flex flex-wrap items-baseline gap-x-3"><span className="font-mono text-sm font-bold text-violet-700">{n}</span><h3 className="text-xl font-extrabold">{title}</h3>{hint && <span className="text-xs text-zinc-500">{hint}</span>}</div>{children}</section>;
}
const Num = ({ n }: { n: number }) => <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-violet-700 text-sm font-bold text-white">{n}</span>;
function Tag({ tone, children }: { tone: 'violet' | 'amber' | 'zinc'; children: ReactNode }) {
  const c = { violet: 'bg-violet-100 text-violet-800', amber: 'bg-amber-100 text-amber-800', zinc: 'bg-zinc-100 text-zinc-600' }[tone];
  return <span className={`inline-block whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-bold ${c}`}>{children}</span>;
}
function Themes({ title, items, tone }: { title: string; items: string[]; tone: 'good' | 'bad' }) {
  return <div className={`rounded-xl p-4 ${tone === 'good' ? 'bg-emerald-50' : 'bg-red-50'}`}><b className={`text-sm ${tone === 'good' ? 'text-emerald-800' : 'text-red-800'}`}>{title}</b>
    {items.length ? <ul className="mt-2 flex flex-wrap gap-1.5">{items.map((t) => <li key={t} className="rounded-full bg-white px-2.5 py-1 text-xs">{t}</li>)}</ul> : <p className="mt-2 text-xs text-zinc-500">리뷰 표본에 없음</p>}</div>;
}
const Empty = ({ children }: { children: ReactNode }) => <p className="text-sm text-zinc-500">{children}</p>;
