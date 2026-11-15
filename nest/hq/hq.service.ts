import { HttpException, Injectable } from '@nestjs/common';
import { EnvDbService } from '../common/env-db.service';
import { HqRepository } from './hq.repository';
import {
  HQ_DECISION_STATUSES,
  HQ_FLOW_STATUSES,
  HqBoardDto,
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
  HqSnapshotDto,
} from './dto/hq.dto';

/** 레거시 형식({success:false, error}) 그대로 내려가게 — 진단 퍼널(diagnose.service)과 같은 방식 */
function fail(status: number, error: string): never {
  throw new HttpException({ success: false, error }, status);
}

const BOARD_KEY = 'board';
const LOG_LIMIT = 300;
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

  constructor(
    private readonly repo: HqRepository,
    private readonly envDb: EnvDbService,
  ) {}

  /** 기록에 남길 이름 — 관리자 토큰엔 id 만 있어 이메일을 한 번 찾아 기억한다 */
  async who(userId: string): Promise<string> {
    const cached = this.emails.get(userId);
    if (cached) return cached;
    const email = (await this.repo.emailOf(userId)) || userId;
    this.emails.set(userId, email);
    return email;
  }

  async snapshot(userId: string): Promise<HqSnapshotDto> {
    const [state, decisions, leads, log, me] = await Promise.all([
      this.repo.getState(BOARD_KEY),
      this.repo.listDecisions(),
      this.repo.listLeads(),
      this.repo.listLog(LOG_LIMIT),
      this.who(userId),
    ]);
    return { board: state ? (state.value as HqBoardDto) : null, decisions, leads, log, me, env: this.envDb.label(this.envDb.current()) };
  }

  async numbers(): Promise<HqNumbersDto> {
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
    return { env: this.envDb.label(env), at: new Date().toISOString(), items };
  }

  /** 맥에서 쓰던 독립 HQ 기록을 한 번 옮겨 온다. 이미 판이 있으면 덮어쓰지 않는다. */
  async importAll(body: HqImportDto, userId: string): Promise<void> {
    if (await this.repo.getState(BOARD_KEY)) fail(409, '이미 HQ 기록이 있습니다. 가져오기는 처음 한 번만 됩니다.');
    if (!body || !body.direction || !clean(body.direction.line)) fail(400, '가져올 파일에 방향(direction)이 없습니다');
    const who = await this.who(userId);
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

  async updateFlow(id: string, body: HqFlowUpdateDto, userId: string): Promise<HqFlowStepDto> {
    const board = await this.board();
    const step = board.flow.find((s) => s.id === id);
    if (!step) fail(404, '없는 단계입니다');
    if (body.status !== undefined) {
      if (!(HQ_FLOW_STATUSES as string[]).includes(body.status)) fail(400, '상태는 없음·만드는 중·있음·운영 중 중 하나입니다');
      step.status = body.status as HqFlowStepDto['status'];
    }
    if (body.note !== undefined) step.note = clean(body.note);
    const who = await this.who(userId);
    await this.repo.putState(BOARD_KEY, board, who);
    await this.repo.insertLog({ who, kind: '흐름', text: `흐름 「${step.name}」 ${step.status}${body.note !== undefined ? ' · 메모 수정' : ''}` });
    return step;
  }

  async createDecision(body: HqDecisionCreateDto, userId: string): Promise<HqDecisionDto> {
    const question = clean(body.question, 300);
    if (!question) fail(400, '질문이 비어 있습니다');
    const item = await this.repo.insertDecision({
      code: await this.repo.nextDecisionCode(), question, options: clean(body.options, 1000), recommend: clean(body.recommend, 1000), status: '대기', answer: '',
    });
    await this.repo.insertLog({ who: await this.who(userId), kind: '결정', text: `결정 ${item.code} 추가: ${question}` });
    return item;
  }

  async updateDecision(code: string, body: HqDecisionUpdateDto, userId: string): Promise<HqDecisionDto> {
    const cur = await this.repo.findDecision(code);
    if (!cur) fail(404, '없는 결정입니다');
    const status = body.status === undefined ? cur.status : String(body.status);
    if (!(HQ_DECISION_STATUSES as string[]).includes(status)) fail(400, '상태는 대기·결정·보류 중 하나입니다');
    const answer = body.answer === undefined ? cur.answer : clean(body.answer);
    if (status === '결정' && !answer) fail(400, '결론을 적어야 결정할 수 있습니다');
    const decidedAt = status === '결정' ? (cur.status === '결정' ? 'keep' : 'now') : 'clear';
    const item = await this.repo.updateDecision(code, status, answer, decidedAt);
    await this.repo.insertLog({ who: await this.who(userId), kind: '결정', text: `결정 ${code} ${status}${answer ? `: ${answer}` : ''}` });
    return item;
  }

  private async businessIdOrNull(v: unknown): Promise<string | null> {
    const id = clean(v, 60);
    if (!id) return null;
    if (!UUID_RE.test(id) || !(await this.repo.businessExists(id))) fail(400, '연결할 사업체를 찾을 수 없습니다');
    return id;
  }

  async createLead(body: HqLeadCreateDto, userId: string): Promise<HqLeadDto> {
    const name = clean(body.name, 120);
    if (!name) fail(400, '이름이 비어 있습니다');
    const board = await this.board();
    const item = await this.repo.insertLead({
      name, kind: clean(body.kind, 60), source: clean(body.source, 80), stage: board.leadStages[0],
      contact: clean(body.contact, 200), note: clean(body.note), businessId: await this.businessIdOrNull(body.businessId),
    });
    await this.repo.insertLog({ who: await this.who(userId), kind: '고객', text: `고객 추가: ${name}${item.source ? ` (${item.source})` : ''}` });
    return item;
  }

  async updateLead(id: string, body: HqLeadUpdateDto, userId: string): Promise<HqLeadDto> {
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
      stage,
    };
    if (!next.name) fail(400, '이름이 비어 있습니다');
    const item = await this.repo.updateLead(id, next);
    const text = cur.stage !== stage ? `고객 ${item.name}: ${cur.stage} → ${stage}` : `고객 ${item.name} 수정`;
    await this.repo.insertLog({ who: await this.who(userId), kind: '고객', text });
    return item;
  }

  async deleteLead(id: string, userId: string): Promise<void> {
    if (!UUID_RE.test(id)) fail(404, '없는 고객입니다');
    const cur = await this.repo.findLead(id);
    if (!cur) fail(404, '없는 고객입니다');
    await this.repo.deleteLead(id);
    await this.repo.insertLog({ who: await this.who(userId), kind: '고객', text: `고객 삭제: ${cur.name}` });
  }

  async addLog(body: HqLogCreateDto, userId: string): Promise<void> {
    const text = clean(body.text, 4000);
    if (!text) fail(400, '내용이 비어 있습니다');
    await this.repo.insertLog({ who: await this.who(userId), kind: clean(body.kind, 20) || '메모', text });
  }
}
