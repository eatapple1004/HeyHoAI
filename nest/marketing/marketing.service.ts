import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { MarketingRepository, TaskRow, TeamSettings } from './marketing.repository';
import { MarketingWriterService, Action } from './marketing-writer.service';
import { BusinessService } from '../business/business.service';
import { toPublicUrl } from '../business/business.repository';
import { naverPack, naverText } from '../business-site/naver-pack';

/**
 * AI 마케팅 팀(2026-10-20) — NoimosAI 구성(에이전트가 일하고 사람은 피드에서 승인)을 도피아 자산 위에 얹었다.
 *   인스타 담당: 아직 안 쓴 사업체 사진으로 게시물 초안(캡션은 기존 캡션 서비스) → 승인하면 기존 게시 큐에 예약
 *   동향 담당: 웹 검색 동향 보고 + 이번 주 할 일 제안 → 할 일을 누르면 게시물 초안·할 일로 이어진다
 *   리뷰 담당: Google 리뷰(홈페이지 제작에서 모은 것) 답글 초안 → 복사해서 단다(답글 API 없음)
 *   지시: 관리자가 한 줄로 시키면 할 일로 나눈다
 *   진단: 마케팅 진단(/admin-business/:id/report)의 약점·할 일을 이어받아 할 일로(같은 진단은 한 번만)
 * 실행은 항상 승인 뒤에만. 거절 사유는 브랜드 노트에 쌓여 다음 초안부터 지킨다.
 */

const AGENTS = ['instagram', 'trends', 'reviews'] as const;
type Agent = typeof AGENTS[number];
/** 뒤에서 도는 작업이 이보다 오래 running 이면 실패로 본다(재배포로 끊긴 경우) */
const STALE_MS = 15 * 60 * 1000;
const AUTO_CHECK_MS = 30 * 60 * 1000;

@Injectable()
export class MarketingService implements OnModuleInit {
  constructor(
    private readonly repo: MarketingRepository,
    private readonly writer: MarketingWriterService,
    private readonly business: BusinessService,
  ) {}

  /** 주간 자동 실행 — 켜 둔 팀만, 7일에 한 번. 승인은 여전히 사람이 한다 */
  onModuleInit() {
    const tick = async () => {
      for (let i = 0; i < 5; i++) {
        const id = await this.repo.claimDue().catch(() => null);
        if (!id) break;
        this.runAgents(id, null).catch((e) => console.warn('[marketing] auto run failed', id, e?.message));
      }
    };
    setTimeout(() => { tick().catch(() => undefined); }, 5 * 60 * 1000).unref();
    setInterval(() => { tick().catch(() => undefined); }, AUTO_CHECK_MS).unref();
  }

  private async biz(id: string) {
    const b = await this.repo.business(id);
    if (!b) throw new NotFoundException('사업체를 찾을 수 없습니다.');
    return b;
  }

  async get(businessId: string) {
    const business = await this.biz(businessId);
    const team = await this.repo.team(businessId);
    let tasks = await this.repo.tasks(businessId);
    const stale = tasks.filter((t) => t.status === 'running' && Date.now() - Date.parse(t.updated_at) > STALE_MS);
    for (const t of stale) await this.repo.updateTask(t.id, { status: 'error', error: '시간이 너무 오래 걸려 중단됐습니다. 다시 실행하세요.' });
    if (stale.length) tasks = await this.repo.tasks(businessId);
    const site = await this.repo.siteSource(businessId);
    return {
      business,
      team: { ...team, settings: settingsOf(team.settings) },
      tasks,
      status: {
        instagram: await this.repo.hasAccount(businessId),
        photos: (await this.repo.freshImages(businessId, 50)).length,
        reviews: (site?.source?.google?.reviews || []).length,
        place: Boolean(site?.source?.kakao || site?.source?.google),
        report: await this.reportStatus(businessId, tasks),
      },
    };
  }

  async updateTeam(businessId: string, body: { settings?: TeamSettings; notes?: string; auto?: boolean }) {
    await this.biz(businessId);
    const cur = settingsOf((await this.repo.team(businessId)).settings);
    const s = body.settings || {};
    const settings: TeamSettings = {
      agents: { ...cur.agents, ...Object.fromEntries(AGENTS.filter((a) => typeof s.agents?.[a] === 'boolean').map((a) => [a, s.agents![a]])) },
      postsPerRun: s.postsPerRun !== undefined ? Math.max(1, Math.min(7, Number(s.postsPerRun) || 3)) : cur.postsPerRun,
      postTime: s.postTime !== undefined ? (/^([01]\d|2[0-3]):[0-5]\d$/.test(s.postTime) ? s.postTime : cur.postTime) : cur.postTime,
    };
    await this.repo.updateTeam(businessId, { settings, notes: body.notes !== undefined ? String(body.notes).slice(0, 4000) : undefined, auto: typeof body.auto === 'boolean' ? body.auto : undefined });
    return this.get(businessId);
  }

  /** 지금 실행 — agent 를 주면 그 담당만, 없으면 켜 둔 담당 전부 */
  async run(businessId: string, agent?: string) {
    await this.biz(businessId);
    if (agent && !AGENTS.includes(agent as Agent)) throw new BadRequestException('없는 담당입니다.');
    const running = (await this.repo.tasks(businessId, 30)).find((t) => t.status === 'running' && (!agent || t.agent === agent) && Date.now() - Date.parse(t.updated_at) < STALE_MS);
    if (running) throw new ConflictException('이미 일하는 중입니다. 끝나면 다시 실행하세요.');
    await this.repo.touchRun(businessId);
    this.runAgents(businessId, (agent as Agent) || null).catch((e) => console.warn('[marketing] run failed', e?.message));
    // 첫 작업 행이 생길 때까지 잠깐 기다려 화면이 바로 "일하는 중"을 보게 한다
    await new Promise((r) => setTimeout(r, 400));
    return this.get(businessId);
  }

  private async runAgents(businessId: string, only: Agent | null) {
    const s = settingsOf((await this.repo.team(businessId)).settings);
    const on = (a: Agent) => (only ? only === a : s.agents![a]);
    const jobs: Promise<unknown>[] = [];
    // 새 진단이 있으면 같이 이어받는다(이미 가져온 진단이면 건너뜀)
    if (!only || only === 'trends') jobs.push(this.importReport(businessId).catch(() => undefined));
    if (on('trends')) jobs.push(this.trends(businessId));
    if (on('instagram')) jobs.push(this.posts(businessId, s.postsPerRun || 3));
    if (on('reviews')) jobs.push(this.reviews(businessId));
    await Promise.all(jobs.map((j) => j.catch((e) => console.warn('[marketing] agent failed', e?.message))));
  }

  /** 작업 한 줄을 만들고 일을 돌린 뒤 결과를 채운다. 실패하면 그 줄에 이유를 남긴다 */
  private async work(businessId: string, agent: string, kind: string, title: string, fn: (t: TaskRow) => Promise<{ title?: string; body: any }>) {
    const t = await this.repo.addTask({ businessId, agent, kind, title });
    try {
      const out = await fn(t);
      await this.repo.updateTask(t.id, { status: 'ready', title: out.title || title, body: out.body });
    } catch (e: any) {
      await this.repo.updateTask(t.id, { status: 'error', error: String(e?.message || e).slice(0, 300) });
    }
  }

  // ── 동향 담당 ──
  private async trends(businessId: string, focus?: string) {
    const b = await this.biz(businessId);
    const team = await this.repo.team(businessId);
    const src = (await this.repo.siteSource(businessId))?.source || {};
    const place = { 이름: src.kakao?.name || src.google?.name, 주소: src.kakao?.roadAddress || src.kakao?.address || src.google?.address, 분류: src.kakao?.category || src.google?.type, 웹사이트: src.google?.website };
    await this.work(businessId, 'trends', 'report', '이번 주 동향 보고 작성 중', async () => {
      // 네이버 검색은 필수 — 실패하면 이 보고는 실패로 남는다(이유 표시)
      const naver = naverText(await naverPack(String(place.이름 || b.name), String(place.주소 || '')));
      const r = await this.writer.trends({ naver, name: siteName(b.name), industry: b.industry, memo: b.memo, place, notes: team.notes, stats: await this.repo.postStats(businessId), focus, diagnosis: diagnosisBrief((await this.repo.latestReport(businessId))?.data) });
      return { title: `이번 주 동향 보고 — 할 일 ${r.actions.length}개`, body: r };
    });
  }

  // ── 진단 이어받기 ──
  /** 화면 표시용 — 최근 진단과 그걸 이미 가져왔는지 */
  private async reportStatus(businessId: string, tasks?: TaskRow[]) {
    const r = await this.repo.latestReport(businessId);
    if (!r) return null;
    const list = tasks || await this.repo.tasks(businessId, 200);
    // 가져오는 중(running, 아직 body 없음)도 가져온 것으로 본다 — 버튼과 팀 실행이 겹쳐 두 번 만드는 것 방지
    return { id: r.id, at: r.created_at, imported: list.some((t) => t.kind === 'diagnosis' && ((t.body?.reportId === r.id && t.status !== 'error') || (t.status === 'running' && Date.now() - Date.parse(t.updated_at) < STALE_MS))) };
  }

  /** 버튼 — 최근 진단을 지금 가져온다 */
  async fromReport(businessId: string) {
    await this.biz(businessId);
    const r = await this.repo.latestReport(businessId);
    if (!r) throw new BadRequestException('아직 끝난 마케팅 진단이 없습니다. 사업체 상세의 📊 마케팅 진단에서 먼저 만드세요.');
    const st = await this.reportStatus(businessId);
    if (st?.imported) throw new ConflictException('이 진단은 이미 가져왔습니다. 진단을 새로 만든 뒤 다시 가져오세요.');
    this.importReport(businessId).catch((e) => console.warn('[marketing] report import failed', e?.message));
    await new Promise((res) => setTimeout(res, 400));
    return this.get(businessId);
  }

  private async importReport(businessId: string) {
    const r = await this.repo.latestReport(businessId);
    if (!r || (await this.reportStatus(businessId))?.imported) return;
    const story = r.data?.story || {};
    const scores = (Array.isArray(r.data?.scores) ? r.data.scores : []).map((s: any) => ({ label: s.label, score: s.score ?? null }));
    const b = await this.biz(businessId);
    const notes = (await this.repo.team(businessId)).notes;
    await this.work(businessId, 'diagnosis', 'diagnosis', '마케팅 진단 이어받는 중', async () => {
      const out = await this.writer.fromReport({
        name: siteName(b.name), industry: b.industry, notes,
        diagnosis: { 요약: story.summary, 점수: (r.data?.scores || []).map((s: any) => ({ 영역: s.label, 점수: s.score, 근거: s.basis })), 발견: story.findings, 진단의_할일: story.actions, 계획: story.plan, 빈칸: story.missing, 리뷰_불만: story.reviewThemes?.bad },
      });
      return {
        title: `진단 이어받기 — 할 일 ${out.actions.length}개`,
        body: {
          reportId: r.id, reportAt: r.created_at, summary: out.summary || story.summary || '', scores,
          findings: (story.findings || []).slice(0, 6).map((f: any) => ({ text: `${f.title} — ${f.body}`.slice(0, 300) })),
          actions: out.actions,
        },
      };
    });
  }

  // ── 인스타 담당 ──
  private async posts(businessId: string, n: number, brief?: string) {
    const images = await this.repo.freshImages(businessId, n);
    if (!images.length) {
      await this.repo.addTask({ businessId, agent: 'instagram', kind: 'post', title: '쓸 사진이 없습니다', status: 'error' })
        .then((t) => this.repo.updateTask(t.id, { status: 'error', error: '아직 게시하지 않은 사업체 사진이 없습니다. 사업체 상세에서 사진을 올리세요.' }));
      return;
    }
    const s = settingsOf((await this.repo.team(businessId)).settings);
    const notes = (await this.repo.team(businessId)).notes;
    await Promise.all(images.map((img, i) => this.work(businessId, 'instagram', 'post', '인스타 게시물 초안 작성 중', async () => {
      const highlight = [brief, notes ? `지킬 것(사장님 노트): ${notes.slice(-800)}` : ''].filter(Boolean).join('\n');
      const d = await this.business.caption(businessId, { mediaId: img.id, highlight: highlight || undefined });
      const first = d.caption.split('\n')[0].slice(0, 28);
      return {
        title: `인스타 게시물 — ${first}${d.caption.length > 28 ? '…' : ''}`,
        body: { mediaId: img.id, imageUrl: toPublicUrl(img.file_path), caption: d.caption, hashtags: d.hashtags, altText: d.altText, brief: brief || '', scheduledAt: slot(i + 1, s.postTime || '19:00') },
      };
    })));
  }

  // ── 리뷰 담당 ──
  private async reviews(businessId: string) {
    const b = await this.biz(businessId);
    const notes = (await this.repo.team(businessId)).notes;
    const all = ((await this.repo.siteSource(businessId))?.source?.google?.reviews || []).filter((r: any) => r?.text);
    const done = new Set((await this.repo.tasks(businessId, 200)).filter((t) => t.kind === 'review_reply' && t.status !== 'error').map((t) => t.body?.key));
    const todo = all.map((r: any) => ({ ...r, key: `${r.author}|${String(r.text).slice(0, 40)}` })).filter((r: any) => !done.has(r.key)).slice(0, 5);
    if (!todo.length) return;
    await this.work(businessId, 'reviews', 'review_reply', `리뷰 답글 ${todo.length}개 작성 중`, async (t) => {
      const replies = await this.writer.reviewReplies({ name: siteName(b.name), industry: b.industry, notes, reviews: todo });
      // 리뷰마다 한 줄씩 — 첫 줄은 이 작업 행을 쓰고 나머지는 새 행
      for (let i = 1; i < todo.length; i++) {
        await this.repo.addTask({ businessId, agent: 'reviews', kind: 'review_reply', status: 'ready', title: replyTitle(todo[i]), body: { ...pickReview(todo[i]), reply: replies[i] } });
      }
      void t;
      return { title: replyTitle(todo[0]), body: { ...pickReview(todo[0]), reply: replies[0] } };
    });
  }

  // ── 지시 ──
  async direct(businessId: string, instruction: string) {
    const b = await this.biz(businessId);
    const text = String(instruction || '').trim().slice(0, 1000);
    if (!text) throw new BadRequestException('지시할 내용을 적으세요.');
    const notes = (await this.repo.team(businessId)).notes;
    this.work(businessId, 'direct', 'direct', `지시: ${text.slice(0, 40)}`, async () => {
      const r = await this.writer.direct({ name: siteName(b.name), industry: b.industry, memo: b.memo, notes, instruction: text });
      return { title: `지시: ${text.slice(0, 40)}`, body: { instruction: text, reply: r.reply, actions: r.actions } };
    }).catch(() => undefined);
    await new Promise((r) => setTimeout(r, 400));
    return this.get(businessId);
  }

  /** 보고·지시의 할 일 하나를 실행 — 게시물이면 초안을 만들고, 그 밖은 할 일 카드로 */
  async act(businessId: string, taskId: string, index: number) {
    const t = await this.own(businessId, taskId);
    const a: Action | undefined = t.body?.actions?.[index];
    if (!a) throw new BadRequestException('없는 할 일입니다.');
    if (t.body.actions[index].startedAt) throw new ConflictException('이미 시작한 할 일입니다.');
    const actions = [...t.body.actions];
    actions[index] = { ...a, startedAt: new Date().toISOString() };
    await this.repo.updateTask(t.id, { body: { ...t.body, actions } });
    if (a.kind === 'post') this.posts(businessId, 1, `${a.title} — ${a.brief}`).catch(() => undefined);
    else await this.repo.addTask({ businessId, agent: t.agent, kind: 'todo', status: 'ready', title: a.title, body: { why: a.why, brief: a.brief, kind: a.kind, from: t.id } });
    await new Promise((r) => setTimeout(r, 400));
    return this.get(businessId);
  }

  /** 초안 고치기(승인 전) — 캡션·해시태그·예약 시각·답글 */
  async edit(businessId: string, taskId: string, body: { caption?: string; hashtags?: string[] | string; scheduledAt?: string; reply?: string }) {
    const t = await this.own(businessId, taskId);
    if (t.status !== 'ready') throw new BadRequestException('승인 대기 중인 것만 고칠 수 있습니다.');
    const next = { ...t.body, edited: true };
    if (body.caption !== undefined) next.caption = String(body.caption).slice(0, 2200);
    if (body.hashtags !== undefined) next.hashtags = (Array.isArray(body.hashtags) ? body.hashtags : String(body.hashtags).split(/[\s,]+/)).map((h) => String(h).replace(/^#/, '').trim()).filter(Boolean).slice(0, 30);
    if (body.scheduledAt !== undefined) next.scheduledAt = body.scheduledAt || null;
    if (body.reply !== undefined) next.reply = String(body.reply).slice(0, 1000);
    await this.repo.updateTask(t.id, { body: next });
    return this.get(businessId);
  }

  /** 승인 = 실행. 게시물은 기존 게시 큐로(예약), 나머지는 완료 표시 */
  async approve(businessId: string, taskId: string) {
    const t = await this.own(businessId, taskId);
    if (t.status !== 'ready') throw new BadRequestException('승인 대기 중인 것만 승인할 수 있습니다.');
    if (t.kind === 'post') {
      const at = t.body.scheduledAt && Date.parse(t.body.scheduledAt) > Date.now() + 60 * 1000 ? t.body.scheduledAt : undefined;
      let q: any;
      try {
        q = await this.business.enqueue(businessId, { imageMediaId: t.body.mediaId, imageCaption: t.body.caption, hashtags: t.body.hashtags, scheduledAt: at });
      } catch (e: any) {
        const m = String(e?.message || e);
        throw new BadRequestException(/계정/.test(m) ? '인스타 계정이 연결되지 않았습니다 — 사업체 상세에서 인스타 계정을 연결한 뒤 승인하세요.' : `게시 큐에 넣지 못했습니다: ${m}`);
      }
      await this.repo.updateTask(t.id, { status: 'done', body: { ...t.body, queueId: q.id, queuedAt: new Date().toISOString(), scheduledAt: at || null } });
    } else {
      await this.repo.updateTask(t.id, { status: 'done' });
    }
    return this.get(businessId);
  }

  /** 거절 — 사유는 브랜드 노트에 쌓는다(다음 초안부터 지킨다) */
  async reject(businessId: string, taskId: string, reason?: string) {
    const t = await this.own(businessId, taskId);
    if (!['ready', 'error'].includes(t.status)) throw new BadRequestException('이미 처리된 항목입니다.');
    const why = String(reason || '').trim().slice(0, 300);
    await this.repo.updateTask(t.id, { status: 'rejected', feedback: why || null });
    if (why) {
      const team = await this.repo.team(businessId);
      const day = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
      await this.repo.updateTeam(businessId, { notes: `${team.notes ? `${team.notes}\n` : ''}- ${why} (${day}, ${t.title.slice(0, 30)} 거절)`.slice(-4000) });
    }
    return this.get(businessId);
  }

  private async own(businessId: string, taskId: string): Promise<TaskRow> {
    const t = await this.repo.task(taskId);
    if (!t || t.business_id !== businessId) throw new NotFoundException('없는 항목입니다.');
    return t;
  }
}

function settingsOf(s: TeamSettings | null | undefined): TeamSettings {
  return {
    agents: { instagram: true, trends: true, reviews: true, ...(s?.agents || {}) },
    postsPerRun: s?.postsPerRun || 3,
    postTime: s?.postTime || '19:00',
  };
}

/** 오늘부터 d일 뒤 KST hh:mm — ISO(UTC) */
function slot(d: number, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  const t = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + d, h - 9, m);
  return new Date(t).toISOString();
}

/** 동향 담당에게 줄 진단 한 묶음 — 점수와 요약만 짧게 */
function diagnosisBrief(data: any): string {
  if (!data?.story) return '';
  const sc = (Array.isArray(data.scores) ? data.scores : []).map((s: any) => `${s.label} ${s.score ?? '확인 불가'}점`).join(' · ');
  return `${sc}\n${String(data.story.summary || '').slice(0, 500)}`;
}

const pickReview = (r: any) => ({ key: r.key, author: r.author, authorUri: r.authorUri, rating: r.rating, when: r.when, text: r.text });
const replyTitle = (r: any) => `리뷰 답글 — ${r.author} ${r.rating ? `★${r.rating}` : ''}`.trim();
/** 관리자용 이름표("[예시] ")는 쓰지 않는다 */
const siteName = (n: string) => String(n || '').replace(/^\s*\[[^\]]*\]\s*/, '').trim() || n;
