import { HttpException, Injectable } from '@nestjs/common';
import { EnvDbService } from '../common/env-db.service';
import { HqRepository } from './hq.repository';
import { HqActor } from './hq.guard';
import {
  HQ_BOARD_SECTIONS,
  HQ_DECISION_STATUSES,
  HQ_FLOW_STATUSES,
  HQ_REF_STAGES,
  HqBoardDto,
  HqBoardSection,
  HqBoardUpdateDto,
  HqDecisionCreateDto,
  HqDecisionDto,
  HqDecisionUpdateDto,
  HqFlowStepDto,
  HqFlowUpdateDto,
  HqImportDto,
  HqLeadCreateDto,
  HqLeadDto,
  HqLeadUpdateDto,
  HqLogCreateDto,
  HqNumberDto,
  HqNumbersDto,
  HqRefCreateDto,
  HqRefDto,
  HqRefUpdateDto,
  HqSnapshotDto,
} from './dto/hq.dto';

/** 레거시 형식({success:false, error}) 그대로 내려가게 — 진단 퍼널(diagnose.service)과 같은 방식 */
function fail(status: number, error: string): never {
  throw new HttpException({ success: false, error }, status);
}

const BOARD_KEY = 'board';
const LOG_LIMIT = 300;
/** 운영 숫자는 화면을 열 때마다 운영 DB에 10번 묻지 않게 1분 동안 재사용한다 */
const NUMBERS_TTL_MS = 60_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** 'YYYY-MM-DD' 만 받는다. 비우면 null(날짜 지움) */
const dateOrNull = (v: unknown): string | null => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (!DATE_RE.test(s) || Number.isNaN(Date.parse(s))) fail(400, '날짜는 2026-11-20 같은 모양이어야 합니다');
  return s;
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 사람이 쓴 글을 자르고 다듬는다 — 길이 상한은 화면 입력칸과 같게 */
const clean = (v: unknown, max = 2000): string => String(v ?? '').trim().slice(0, max);
const isoOrNull = (v: unknown): string | null => {
  const s = String(v ?? '').trim();
  return s && !Number.isNaN(Date.parse(s)) ? s : null;
};

/**
 * 운영 숫자 — 흐름 단계 옆에 붙는 실제 수치. **운영(production) DB를 읽기 전용으로** 센다
 *   (EnvDbService 풀은 default_transaction_read_only=on). 아직 운영에 없는 테이블은 null 로 돌려준다
 *   — 0 과 "아직 없음"을 화면이 구분해서 보여 준다.
 */
const NUMBERS: Array<{ key: string; label: string; table: string; where?: string }> = [
  { key: 'diagnose_requests', label: '무료 진단 신청', table: 'diagnose_requests' },
  { key: 'businesses', label: '관리 중인 사업체', table: 'businesses', where: `status = 'active'` },
  { key: 'business_reports', label: '마케팅 진단 리포트', table: 'business_reports' },
  { key: 'marketing_tasks', label: 'AI 마케팅 팀 작업', table: 'marketing_tasks' },
  { key: 'payments', label: '결제 건수', table: 'payments' },
];

@Injectable()
export class HqService {
  private emails = new Map<string, string>();
  private numbersCache: { at: number; data: HqNumbersDto } | null = null;

  constructor(
    private readonly repo: HqRepository,
    private readonly envDb: EnvDbService,
  ) {}

  /** 기록에 남길 이름 — 메일 인증이면 그 메일, 관리자 로그인이면 토큰엔 id 만 있어 메일을 한 번 찾아 기억한다 */
  async who(actor: HqActor): Promise<string> {
    if (actor.service) return '수확기';
    if (actor.email) return actor.email;
    const id = String(actor.id || '');
    const cached = this.emails.get(id);
    if (cached) return cached;
    const email = (id && (await this.repo.emailOf(id))) || id || '알 수 없음';
    this.emails.set(id, email);
    return email;
  }

  async snapshot(actor: HqActor): Promise<HqSnapshotDto> {
    const [state, decisions, leads, refs, reports, log, me] = await Promise.all([
      this.repo.getState(BOARD_KEY),
      this.repo.listDecisions(),
      this.repo.listLeads(),
      this.repo.listRefs(),
      this.repo.listReports(),
      this.repo.listLog(LOG_LIMIT),
      this.who(actor),
    ]);
    return { board: state ? (state.value as HqBoardDto) : null, decisions, leads, refs, reports, refStages: HQ_REF_STAGES, log, me, env: this.envDb.label(this.envDb.current()) };
  }

  async numbers(): Promise<HqNumbersDto> {
    if (this.numbersCache && Date.now() - this.numbersCache.at < NUMBERS_TTL_MS) return this.numbersCache.data;
    const env = 'production' as const;
    const q = this.envDb.queryFn(env);
    const items: HqNumberDto[] = [];
    for (const n of NUMBERS) {
      // 테이블 이름은 위 고정 목록에서만 온다(사용자 입력 아님)
      const exists = (await q(`SELECT to_regclass($1) IS NOT NULL AS ok`, [`public.${n.table}`])).rows[0]?.ok;
      if (!exists) { items.push({ key: n.key, label: n.label, value: null }); continue; }
      const r = await q(`SELECT count(*)::int AS n FROM ${n.table}${n.where ? ` WHERE ${n.where}` : ''}`);
      items.push({ key: n.key, label: n.label, value: r.rows[0]?.n ?? 0 });
    }
    const data = { env: this.envDb.label(env), at: new Date().toISOString(), items };
    this.numbersCache = { at: Date.now(), data };
    return data;
  }

  /** 맥에서 쓰던 독립 HQ 기록을 한 번 옮겨 온다. 이미 판이 있으면 덮어쓰지 않는다. */
  async importAll(body: HqImportDto, actor: HqActor): Promise<void> {
    if (await this.repo.getState(BOARD_KEY)) fail(409, '이미 HQ 기록이 있습니다. 가져오기는 처음 한 번만 됩니다.');
    if (!body || !body.direction || !clean(body.direction.line)) fail(400, '가져올 파일에 방향(direction)이 없습니다');
    const who = await this.who(actor);
    const flow: HqFlowStepDto[] = (body.flow || []).map((s) => ({
      id: clean(s.id, 40).replace(/[^a-z0-9_-]/gi, '') || `s${Math.random().toString(36).slice(2, 7)}`,
      name: clean(s.name, 60),
      what: clean(s.what, 500),
      parts: clean(s.parts, 500),
      status: (HQ_FLOW_STATUSES as string[]).includes(s.status) ? s.status : '없음',
      note: clean(s.note),
    }));
    const board: HqBoardDto = {
      direction: { line: clean(body.direction.line, 500), why: clean(body.direction.why, 1000), decided: clean(body.direction.decided, 20) },
      weapons: (body.weapons || []).map((w) => ({ name: clean(w.name, 120), use: clean(w.use, 300) })),
      flow,
      products: (body.products || []).map((p) => ({ name: clean(p.name, 80), who: clean(p.who, 80), what: clean(p.what, 300) })),
      rules: (body.rules || []).map((r) => clean(r, 300)).filter(Boolean),
      links: (body.links || []).map((l) => ({ name: clean(l.name, 80), url: clean(l.url, 500) })).filter((l) => /^https?:\/\//.test(l.url)),
      leadStages: (body.leadStages || []).map((s) => clean(s, 20)).filter(Boolean),
    };
    if (!board.leadStages.length) board.leadStages = ['후보', '연락함', '진단 보냄', '상담', '계약', '운영 중', '보류'];
    await this.repo.putState(BOARD_KEY, board, who);

    let n = 0;
    for (const d of body.decisions || []) {
      if (!clean(d.question)) continue;
      n += 1;
      const status = (HQ_DECISION_STATUSES as string[]).includes(String(d.status)) ? String(d.status) : '대기';
      await this.repo.insertDecision({
        code: `D${n}`, question: clean(d.question, 300), options: clean(d.options, 1000), recommend: clean(d.recommend, 1000),
        status, answer: clean(d.answer), openedAt: isoOrNull(d.opened), decidedAt: status === '결정' ? isoOrNull(d.decided) : null,
      });
    }
    for (const l of body.leads || []) {
      if (!clean(l.name)) continue;
      const stage = board.leadStages.includes(String(l.stage)) ? String(l.stage) : board.leadStages[0];
      await this.repo.insertLead({
        name: clean(l.name, 120), kind: clean(l.kind, 60), source: clean(l.source, 80), stage, contact: clean(l.contact, 200),
        note: clean(l.note), businessId: null, createdAt: isoOrNull(l.created), updatedAt: isoOrNull(l.updated),
      });
    }
    // 오래된 것부터 넣어야 시간순이 맞는다(at 이 있으면 그 시각으로)
    for (const g of [...(body.log || [])].reverse()) {
      if (!clean(g.text)) continue;
      await this.repo.insertLog({ at: isoOrNull(g.at), who: clean(g.who, 120) || who, kind: clean(g.kind, 20) || '메모', text: clean(g.text, 4000) });
    }
    await this.repo.insertLog({ who, kind: '진행', text: 'HQ를 관리자 화면으로 옮겼다(맥 독립 버전에서 가져오기)' });
  }

  private async board(): Promise<HqBoardDto> {
    const s = await this.repo.getState(BOARD_KEY);
    if (!s) fail(404, 'HQ 기록이 아직 없습니다. 먼저 가져오기를 하세요.');
    return s.value as HqBoardDto;
  }

  async updateFlow(id: string, body: HqFlowUpdateDto, actor: HqActor): Promise<HqFlowStepDto> {
    if (body.status !== undefined && !(HQ_FLOW_STATUSES as string[]).includes(body.status)) fail(400, '상태는 없음·만드는 중·있음·운영 중 중 하나입니다');
    const who = await this.who(actor);
    let missing = false;
    const step = await this.repo.updateState(BOARD_KEY, who, (board: HqBoardDto) => {
      const s = board.flow.find((x) => x.id === id);
      if (!s) { missing = true; return null; }
      if (body.status !== undefined) s.status = body.status as HqFlowStepDto['status'];
      if (body.note !== undefined) s.note = clean(body.note);
      return s;
    });
    if (!step) fail(404, missing ? '없는 단계입니다' : 'HQ 기록이 아직 없습니다. 먼저 가져오기를 하세요.');
    await this.repo.insertLog({ who, kind: '흐름', text: `흐름 「${step.name}」 ${step.status}${body.note !== undefined ? ' · 메모 수정' : ''}` });
    return step;
  }

  /** 판의 한 칸(방향·무기·상품·지키는 것·바로가기)을 통째로 고친다 — 화면 '편집' 버튼 */
  async updateBoardSection(section: string, body: HqBoardUpdateDto, actor: HqActor): Promise<HqBoardDto> {
    if (!(HQ_BOARD_SECTIONS as string[]).includes(section)) fail(404, '고칠 수 없는 칸입니다');
    const value = this.cleanSection(section as HqBoardSection, body?.value);
    const who = await this.who(actor);
    const board = await this.repo.updateState(BOARD_KEY, who, (b: HqBoardDto) => { (b as any)[section] = value; return b; });
    if (!board) fail(404, 'HQ 기록이 아직 없습니다. 먼저 가져오기를 하세요.');
    const LABEL: Record<HqBoardSection, string> = { goal: '목표', axes: '축', engine: '엔진 한 장', direction: '방향', weapons: '우리 무기', products: '상품 초안', rules: '지키는 것', links: '바로가기' };
    await this.repo.insertLog({ who, kind: '판', text: `「${LABEL[section as HqBoardSection]}」 수정` });
    return board;
  }

  /** 칸마다 모양을 맞추고 길이를 자른다. 빈 줄은 버린다 */
  private cleanSection(section: HqBoardSection, v: any): any {
    const list = (x: any): any[] => (Array.isArray(x) ? x.slice(0, 50) : fail(400, '목록 모양이 아닙니다'));
    switch (section) {
      case 'axes': return list(v).slice(0, 12).map((a) => ({
        name: clean(a?.name, 30),
        color: /^#[0-9a-f]{6}$/i.test(String(a?.color || '').trim()) ? String(a.color).trim().toLowerCase() : '#9a9ab2',
        match: (Array.isArray(a?.match) ? a.match : String(a?.match || '').split(',')).map((m: unknown) => clean(m, 40)).filter(Boolean).slice(0, 30),
      })).filter((a) => a.name);
      case 'engine': {
        const strs = (x: any, n: number) => (Array.isArray(x) ? x : []).slice(0, n).map((s: unknown) => clean(s, 60)).filter(Boolean);
        const stages = (Array.isArray(v?.stages) ? v.stages : []).slice(0, 8).map((s: any) => ({ when: clean(s?.when, 20), what: clean(s?.what, 40) })).filter((s: any) => s.when || s.what);
        const now = Math.max(0, Math.min(stages.length - 1, Number.parseInt(String(v?.now ?? 0), 10) || 0));
        return { title: clean(v?.title, 60), sources: strs(v?.sources, 8), parts: strs(v?.parts, 8), businesses: strs(v?.businesses, 8), evidence: strs(v?.evidence, 6), loop: clean(v?.loop, 60), stages, now, math: strs(v?.math, 4) };
      }
      case 'goal': {
        const text = clean(v?.text, 500);
        if (!text) fail(400, '목표 한 줄이 비어 있습니다');
        return { text, decided: clean(v?.decided, 20) };
      }
      case 'direction': {
        const line = clean(v?.line, 500);
        if (!line) fail(400, '방향 한 줄이 비어 있습니다');
        return { line, why: clean(v?.why, 1000), decided: clean(v?.decided, 20) };
      }
      case 'weapons': return list(v).map((w) => ({ name: clean(w?.name, 120), use: clean(w?.use, 300) })).filter((w) => w.name);
      case 'products': return list(v).map((p) => ({ name: clean(p?.name, 80), who: clean(p?.who, 80), what: clean(p?.what, 300) })).filter((p) => p.name);
      case 'rules': return list(v).map((r) => clean(r, 300)).filter(Boolean);
      case 'links': return list(v).map((l) => ({ name: clean(l?.name, 80), url: clean(l?.url, 500) })).filter((l) => l.name && /^https?:\/\//.test(l.url));
    }
  }

  async createDecision(body: HqDecisionCreateDto, actor: HqActor): Promise<HqDecisionDto> {
    const question = clean(body.question, 300);
    if (!question) fail(400, '질문이 비어 있습니다');
    const item = await this.repo.insertDecision({
      code: await this.repo.nextDecisionCode(), question, options: clean(body.options, 1000), recommend: clean(body.recommend, 1000), status: '대기', answer: '',
    });
    await this.repo.insertLog({ who: await this.who(actor), kind: '결정', text: `결정 ${item.code} 추가: ${question}` });
    return item;
  }

  async updateDecision(code: string, body: HqDecisionUpdateDto, actor: HqActor): Promise<HqDecisionDto> {
    const cur = await this.repo.findDecision(code);
    if (!cur) fail(404, '없는 결정입니다');
    const status = body.status === undefined ? cur.status : String(body.status);
    if (!(HQ_DECISION_STATUSES as string[]).includes(status)) fail(400, '상태는 대기·결정·보류 중 하나입니다');
    const answer = body.answer === undefined ? cur.answer : clean(body.answer);
    if (status === '결정' && !answer) fail(400, '결론을 적어야 결정할 수 있습니다');
    const decidedAt = status === '결정' ? (cur.status === '결정' ? 'keep' : 'now') : 'clear';
    const item = await this.repo.updateDecision(code, status, answer, decidedAt);
    await this.repo.insertLog({ who: await this.who(actor), kind: '결정', text: `결정 ${code} ${status}${answer ? `: ${answer}` : ''}` });
    return item;
  }

  private async businessIdOrNull(v: unknown): Promise<string | null> {
    const id = clean(v, 60);
    if (!id) return null;
    if (!UUID_RE.test(id) || !(await this.repo.businessExists(id))) fail(400, '연결할 사업체를 찾을 수 없습니다');
    return id;
  }

  async createLead(body: HqLeadCreateDto, actor: HqActor): Promise<HqLeadDto> {
    const name = clean(body.name, 120);
    if (!name) fail(400, '이름이 비어 있습니다');
    const board = await this.board();
    const item = await this.repo.insertLead({
      name, kind: clean(body.kind, 60), source: clean(body.source, 80), stage: board.leadStages[0],
      contact: clean(body.contact, 200), note: clean(body.note), businessId: await this.businessIdOrNull(body.businessId),
      nextAction: clean(body.nextAction, 300), nextDate: dateOrNull(body.nextDate),
    });
    await this.repo.insertLog({ who: await this.who(actor), kind: '고객', text: `고객 추가: ${name}${item.source ? ` (${item.source})` : ''}` });
    return item;
  }

  async updateLead(id: string, body: HqLeadUpdateDto, actor: HqActor): Promise<HqLeadDto> {
    if (!UUID_RE.test(id)) fail(404, '없는 고객입니다');
    const cur = await this.repo.findLead(id);
    if (!cur) fail(404, '없는 고객입니다');
    const board = await this.board();
    const stage = body.stage === undefined ? cur.stage : String(body.stage);
    if (!board.leadStages.includes(stage)) fail(400, '없는 단계입니다');
    const next = {
      name: body.name === undefined ? cur.name : clean(body.name, 120),
      kind: body.kind === undefined ? cur.kind : clean(body.kind, 60),
      source: body.source === undefined ? cur.source : clean(body.source, 80),
      contact: body.contact === undefined ? cur.contact : clean(body.contact, 200),
      note: body.note === undefined ? cur.note : clean(body.note),
      businessId: body.businessId === undefined ? cur.business_id : await this.businessIdOrNull(body.businessId),
      nextAction: body.nextAction === undefined ? cur.next_action : clean(body.nextAction, 300),
      nextDate: body.nextDate === undefined ? cur.next_date : dateOrNull(body.nextDate),
      stage,
    };
    if (!next.name) fail(400, '이름이 비어 있습니다');
    const item = await this.repo.updateLead(id, next);
    const text = cur.stage !== stage ? `고객 ${item.name}: ${cur.stage} → ${stage}` : `고객 ${item.name} 수정`;
    await this.repo.insertLog({ who: await this.who(actor), kind: '고객', text });
    return item;
  }

  async deleteLead(id: string, actor: HqActor): Promise<void> {
    if (!UUID_RE.test(id)) fail(404, '없는 고객입니다');
    const cur = await this.repo.findLead(id);
    if (!cur) fail(404, '없는 고객입니다');
    await this.repo.deleteLead(id);
    await this.repo.insertLog({ who: await this.who(actor), kind: '고객', text: `고객 삭제: ${cur.name}` });
  }

  // ─── 레퍼런스 ───
  private async leadIdOrNull(v: unknown): Promise<string | null> {
    const id = clean(v, 60);
    if (!id) return null;
    if (!UUID_RE.test(id) || !(await this.repo.findLead(id))) fail(400, '연결할 고객을 찾을 수 없습니다');
    return id;
  }

  /** 공개 기록 — 채널 이름은 있어야 하고, 주소는 비우거나 http(s) 만. 날짜는 YYYY-MM-DD 또는 빈칸 */
  private cleanPublished(v: unknown): { channel: string; url: string; date: string }[] {
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) fail(400, '공개 기록 모양이 아닙니다');
    return (v as any[]).slice(0, 30).map((p) => {
      const url = clean(p?.url, 500);
      if (url && !/^https?:\/\//.test(url)) fail(400, '공개 주소는 http(s) 로 시작해야 합니다');
      return { channel: clean(p?.channel, 60), url, date: dateOrNull(p?.date) || '' };
    }).filter((p) => p.channel);
  }

  private resultUrl(v: unknown): string {
    const url = clean(v, 500);
    if (url && !/^https?:\/\//.test(url)) fail(400, '결과물 주소는 http(s) 로 시작해야 합니다');
    return url;
  }

  /** '공개' 칸은 실제로 어딘가에 올린 기록이 있어야 들어간다 — 레퍼런스 = 세상에 보인 것 */
  private checkStage(stage: string, published: unknown[]): void {
    if (!HQ_REF_STAGES.includes(stage)) fail(400, '없는 단계입니다');
    if (stage === '공개' && !published.length) fail(400, '공개로 옮기려면 어디에 올렸는지(채널) 한 줄 이상 적어야 합니다');
  }

  async createRef(body: HqRefCreateDto, actor: HqActor): Promise<HqRefDto> {
    const title = clean(body.title, 160);
    if (!title) fail(400, '작업 이름이 비어 있습니다');
    const stage = body.stage === undefined ? HQ_REF_STAGES[0] : String(body.stage);
    const published = this.cleanPublished(body.published);
    this.checkStage(stage, published);
    const item = await this.repo.insertRef({
      title, client: clean(body.client, 120), kind: clean(body.kind, 60), source: clean(body.source, 40) || '도피아', stage,
      leadId: await this.leadIdOrNull(body.leadId), resultUrl: this.resultUrl(body.resultUrl), note: clean(body.note), published,
      doneDate: dateOrNull(body.doneDate),
    });
    await this.repo.insertLog({ who: await this.who(actor), kind: '레퍼런스', text: `레퍼런스 추가: ${title} (${stage})` });
    return item;
  }

  async updateRef(id: string, body: HqRefUpdateDto, actor: HqActor): Promise<HqRefDto> {
    if (!UUID_RE.test(id)) fail(404, '없는 레퍼런스입니다');
    const cur = await this.repo.findRef(id);
    if (!cur) fail(404, '없는 레퍼런스입니다');
    const next = {
      title: body.title === undefined ? cur.title : clean(body.title, 160),
      client: body.client === undefined ? cur.client : clean(body.client, 120),
      kind: body.kind === undefined ? cur.kind : clean(body.kind, 60),
      source: body.source === undefined ? cur.source : clean(body.source, 40) || '도피아',
      stage: body.stage === undefined ? cur.stage : String(body.stage),
      leadId: body.leadId === undefined ? cur.lead_id : await this.leadIdOrNull(body.leadId),
      resultUrl: body.resultUrl === undefined ? cur.result_url : this.resultUrl(body.resultUrl),
      note: body.note === undefined ? cur.note : clean(body.note),
      published: body.published === undefined ? cur.published : this.cleanPublished(body.published),
      doneDate: body.doneDate === undefined ? cur.done_date : dateOrNull(body.doneDate),
    };
    if (!next.title) fail(400, '작업 이름이 비어 있습니다');
    this.checkStage(next.stage, next.published);
    const item = await this.repo.updateRef(id, next);
    const text = cur.stage !== next.stage ? `레퍼런스 ${item.title}: ${cur.stage} → ${next.stage}` : `레퍼런스 ${item.title} 수정`;
    await this.repo.insertLog({ who: await this.who(actor), kind: '레퍼런스', text });
    return item;
  }

  async deleteRef(id: string, actor: HqActor): Promise<void> {
    if (!UUID_RE.test(id)) fail(404, '없는 레퍼런스입니다');
    const cur = await this.repo.findRef(id);
    if (!cur) fail(404, '없는 레퍼런스입니다');
    await this.repo.deleteRef(id);
    await this.repo.insertLog({ who: await this.who(actor), kind: '레퍼런스', text: `레퍼런스 삭제: ${cur.title}` });
  }

  async addLog(body: HqLogCreateDto, actor: HqActor): Promise<void> {
    const text = clean(body.text, 4000);
    if (!text) fail(400, '내용이 비어 있습니다');
    await this.repo.insertLog({ who: await this.who(actor), kind: clean(body.kind, 20) || '메모', text });
  }
}
