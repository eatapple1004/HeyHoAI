import { HttpException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { HqRepository } from './hq.repository';
import { HqActor } from './hq.guard';
import { HqService } from './hq.service';
import {
  HQ_SERVICES,
  HQ_SHARE_LEVELS,
  HqClientPageDto,
  HqLeadDto,
  HqLeadOpsDto,
  HqLeadPageDto,
  HqReportCreateDto,
  HqReportDto,
  HqReportUpdateDto,
} from './dto/hq.dto';
import { HqLeadOpsVo } from './vo/hq.vo';

function fail(status: number, error: string): never {
  throw new HttpException({ success: false, error }, status);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const clean = (v: unknown, max = 2000): string => String(v ?? '').trim().slice(0, max);
const date = (v: unknown, need = false): string => {
  const s = clean(v, 10);
  if (!s && !need) return '';
  if (!DATE_RE.test(s) || Number.isNaN(Date.parse(s))) fail(400, '날짜는 2026-11-29 같은 모양이어야 합니다');
  return s;
};

/**
 * 고객 운영 — 계약한 고객을 같은 방식으로 굴리는 자리.
 *   ops        : 형태·스튜디오·범위·시작일·핵심 숫자(이름·단위·시작값·지금값)·시작 전 기록·공개 수준
 *   고객 페이지 : 로그인 없이 링크 하나로 여는 보는 전용 화면(/c/:token). 켜고 끄고 주소를 새로 만들 수 있다
 *   주간 보고   : 초안 → 게시. 고객 페이지에는 「게시」만 나간다
 * 고객 페이지 응답(HqClientPageDto)에는 정한 칸만 담는다 — 메모·연락처·내부 기록은 절대 내보내지 않는다.
 */
@Injectable()
export class HqClientsService {
  constructor(private readonly repo: HqRepository, private readonly hq: HqService) {}

  private async lead(id: string) {
    if (!UUID_RE.test(id)) fail(404, '없는 고객입니다');
    const l = await this.repo.findLead(id);
    if (!l) fail(404, '없는 고객입니다');
    return l;
  }

  /** 화면은 늘 전체를 보낸다. 틀린 값은 조용히 '미정'으로 바꾸지 않고 거절 — 저장된 값이 몰래 지워지지 않게 */
  private cleanOps(v: any): HqLeadOpsVo {
    if (!v || typeof v !== 'object') fail(400, '운영 정보가 비었습니다');
    const m = v.metric || {};
    const service = v.service === undefined || v.service === '' ? '미정' : String(v.service);
    const share = v.share === undefined || v.share === '' ? '미정' : String(v.share);
    if (!HQ_SERVICES.includes(service)) fail(400, `형태는 ${HQ_SERVICES.join('·')} 중 하나`);
    if (!HQ_SHARE_LEVELS.includes(share)) fail(400, `공개 수준은 ${HQ_SHARE_LEVELS.join('·')} 중 하나`);
    return {
      service, studio: clean(v?.studio, 40), scope: clean(v?.scope, 1000), started: date(v?.started),
      metric: { name: clean(m.name, 40), unit: clean(m.unit, 10), start: clean(m.start, 40), now: clean(m.now, 40) },
      before: clean(v?.before, 3000), share,
    };
  }

  async updateOps(id: string, body: HqLeadOpsDto, actor: HqActor): Promise<HqLeadDto> {
    const l = await this.lead(id);
    const ops = this.cleanOps(body?.ops);
    const item = await this.repo.setLeadOps(id, ops);
    await this.repo.insertLog({ who: await this.hq.who(actor), kind: '고객', text: `고객 ${l.name} 운영 정보 수정` });
    return item;
  }

  /** 고객 페이지 켜기·끄기·주소 새로 만들기(예전 주소는 바로 안 열림) */
  async setPage(id: string, body: HqLeadPageDto, actor: HqActor): Promise<HqLeadDto> {
    const l = await this.lead(id);
    const token = !l.page_token || body?.regenerate ? crypto.randomBytes(18).toString('base64url') : null;
    const item = await this.repo.setLeadPage(id, token, body?.on === true);
    const what = body?.regenerate ? '주소 새로 만듦' : item.page_on ? '켬' : '끔';
    await this.repo.insertLog({ who: await this.hq.who(actor), kind: '고객', text: `고객 ${l.name} 전용 페이지 ${what}` });
    return item;
  }

  async createReport(id: string, body: HqReportCreateDto, actor: HqActor): Promise<HqReportDto> {
    const l = await this.lead(id);
    const item = await this.repo.insertReport({ leadId: id, week: date(body?.week, true), metricValue: clean(body?.metricValue, 40), done: clean(body?.done, 3000), next: clean(body?.next, 2000) });
    await this.repo.insertLog({ who: await this.hq.who(actor), kind: '보고', text: `${l.name} 주간 보고 초안(${item.week} 주)` });
    return item;
  }

  async updateReport(reportId: string, body: HqReportUpdateDto, actor: HqActor): Promise<HqReportDto> {
    if (!UUID_RE.test(reportId)) fail(404, '없는 보고입니다');
    const cur = await this.repo.findReport(reportId);
    if (!cur) fail(404, '없는 보고입니다');
    const status = body?.status === undefined ? cur.status : String(body.status);
    if (!['초안', '게시'].includes(status)) fail(400, '상태는 초안·게시 중 하나입니다');
    const next = {
      week: body?.week === undefined ? cur.week : date(body.week, true),
      metricValue: body?.metricValue === undefined ? cur.metric_value : clean(body.metricValue, 40),
      done: body?.done === undefined ? cur.done : clean(body.done, 3000),
      next: body?.next === undefined ? cur.next : clean(body.next, 2000),
      status,
    };
    if (status === '게시' && !next.done) fail(400, '「이번 주 한 일」이 비어 있으면 게시할 수 없습니다');
    const item = await this.repo.updateReport(reportId, next);
    if (cur.status !== status) {
      const l = await this.repo.findLead(cur.lead_id);
      await this.repo.insertLog({ who: await this.hq.who(actor), kind: '보고', text: `${l?.name || ''} 주간 보고(${item.week} 주) ${status}` });
    }
    return item;
  }

  async deleteReport(reportId: string, actor: HqActor): Promise<void> {
    if (!UUID_RE.test(reportId)) fail(404, '없는 보고입니다');
    const cur = await this.repo.findReport(reportId);
    if (!cur) fail(404, '없는 보고입니다');
    await this.repo.deleteReport(reportId);
    await this.repo.insertLog({ who: await this.hq.who(actor), kind: '보고', text: `주간 보고 삭제(${cur.week} 주)` });
  }

  /** 고객 페이지 — 로그인 없음. 꺼졌거나 없는 주소는 같은 404(주소가 있는지 없는지 티 내지 않는다) */
  async clientPage(token: string): Promise<HqClientPageDto> {
    if (!TOKEN_RE.test(String(token || ''))) fail(404, '없는 페이지입니다');
    const l = await this.repo.findLeadByPage(token);
    if (!l) fail(404, '없는 페이지입니다');
    const ops = l.ops || {};
    const [reports, refs] = await Promise.all([this.repo.listReports(l.id, true), this.repo.refsForLead(l.id)]);
    const m = ops.metric || {};
    return {
      name: l.name, studio: ops.studio || '', service: ops.service || '', started: ops.started || '',
      metric: { name: m.name || '', unit: m.unit || '', start: m.start || '', now: m.now || '' },
      reports: reports.map((r) => ({ week: r.week, metric_value: r.metric_value, done: r.done, next: r.next })),
      results: refs.map((r) => ({ title: r.title, kind: r.kind, done_date: r.done_date, result_url: r.result_url })),
      updated_at: [l.updated_at, ...reports.map((r) => r.updated_at)].map((x) => new Date(x as any)).filter((d) => !isNaN(+d)).map((d) => d.toISOString()).sort().pop() || '',
    };
  }
}
