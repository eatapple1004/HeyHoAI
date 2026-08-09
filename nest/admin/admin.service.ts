import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { AdminRepository } from './admin.repository';
import { ProposalRepository } from './proposal.repository';

// refine: 스트리밍(NDJSON) 핸들러는 Express 응답을 직접 다루므로 레거시 핸들러를 그대로 재사용한다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const refineRoute = require(path.join(__dirname, '..', '..', 'src', 'admin', 'adminRefine.route.js'));
export const refineHandler = refineRoute.handler;
export const refineApplyHandler = refineRoute.applyHandler;

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

/** 저장 경로 → 서빙 URL. R2/외부 URL·로스터(/img/…)는 그대로, 그 외 tmp 경로는 /images/<basename>. */
function toUrl(p: unknown): string {
  const s = String(p || '');
  if (!s) return '';
  if (s.startsWith('/img/') || /^https?:\/\//i.test(s)) return s;
  return '/images/' + s.split('/').pop();
}
const isReel = (p: unknown) => /\.(mp4|webm|mov)$/i.test(String(p || ''));

const MAX_PER_GROUP = 24;

@Injectable()
export class AdminService {
  constructor(
    private readonly repo: AdminRepository,
    private readonly proposals: ProposalRepository,
  ) {}

  /** 전체 크리에이션(비공개 포함). hasMore는 "가득 찼으면 더 있을 수 있다" 휴리스틱(총계 COUNT 생략). */
  async listCreations(q: any = {}) {
    const limit = Math.min(Math.max(parseInt(q.limit, 10) || 60, 1), 200);
    const offset = Math.max(parseInt(q.offset, 10) || 0, 0);
    const rows = await this.repo.listCreationRows({
      visibility: q.visibility, status: q.status, q: q.q, limit, offset,
    });
    const data = rows.map((x: any) => ({
      idx: x.idx,
      url: toUrl(x.file_path),
      isReel: isReel(x.file_path),
      visibility: x.visibility,
      status: x.status,
      takenDown: x.taken_down,
      templateName: x.template_name,
      templateSource: x.template_source,
      model: x.model,
      width: x.width,
      height: x.height,
      likes: x.likes_count,
      createdAt: x.created_at,
      userEmail: x.email,
      userName: x.display_name,
    }));
    return { data, hasMore: data.length === limit };
  }

  /**
   * 대시보드 통계 — 유저/생성물/기능별 사용량/매출/템플릿·모델/헤비유저/인게이지먼트/14일 시계열.
   * 블록끼리 의존이 없어 **전부 동시에** 실행한다(순차 실행하면 관리자 화면이 눈에 띄게 느려진다).
   */
  async getStats() {
    const [
      users, creations, videoJobs, ugcJobs, faceswap, packs, payments,
      byProvider, topTemplates, templateSources, topModels, ugcByType, topUsers,
      engagement, timeseries, recentPayments,
    ] = await Promise.all([
      this.repo.usersStats(), this.repo.creationsStats(), this.repo.videoJobStats(),
      this.repo.ugcJobStats(), this.repo.faceswapStats(), this.repo.packStats(),
      this.repo.paymentStats(), this.repo.revenueByProvider(), this.repo.topTemplates(),
      this.repo.templateSources(), this.repo.topModels(), this.repo.ugcByType(),
      this.repo.topUsers(), this.repo.engagement(), this.repo.timeseries(),
      this.repo.recentPayments(),
    ]);
    return {
      users, creations, videoJobs, ugcJobs, faceswap, packs, payments,
      byProvider, topTemplates, templateSources, topModels, ugcByType, topUsers,
      engagement, timeseries, recentPayments,
    };
  }

  // ── 제안서 ──

  /** 레퍼런스(before) 1장 + 결과(after) n장 묶음 목록. 그룹 단위 페이지네이션. */
  async listProposalResults(userId: string, q: any = {}) {
    const limit = Math.min(60, Math.max(1, parseInt(q.limit, 10) || 24));   // 그룹 수 기준
    const offset = Math.max(0, parseInt(q.offset, 10) || 0);
    const scope: 'mine' | 'all' = q.scope === 'all' ? 'all' : 'mine';
    const rows = await this.proposals.findResultRows(userId, { limit, offset, scope });

    const map = new Map<string, any>();
    for (const row of rows as any[]) {
      let grp = map.get(row.gkey);
      if (!grp) {
        const orig = row.reference_image_path ? toUrl(row.reference_image_path) : '';
        const canon = row.canonical_ref ? toUrl(row.canonical_ref) : '';
        grp = {
          gkey: row.gkey,
          beforeUrl: orig || canon,                    // 원본 우선, 없으면 캐논 레퍼런스
          altBeforeUrl: (orig && canon) ? canon : '',  // 둘 다 있으면 캐논을 토글 대상으로
          beforeKind: orig ? 'original' : 'canonical',
          isPack: row.is_pack,
          label: row.template_name || row.template_source || row.model || '',
          results: [],
        };
        map.set(row.gkey, grp);
      }
      if (grp.results.length < MAX_PER_GROUP) {
        grp.results.push({ idx: row.idx, afterUrl: toUrl(row.file_path), label: row.template_name || '' });
      }
    }
    const groups = [...map.values()].filter((g) => g.beforeUrl && g.results.length);
    return { groups, scope, hasMore: map.size === limit };
  }

  /** 저장/수정 — id가 있으면 update, 없으면 insert. 반환은 id. */
  async saveProposal(userId: string, b: any = {}) {
    const company = String(b.company || '').trim();
    if (!company) throw httpError(400, '회사명이 필요합니다.');
    const payload = {
      company,
      title: b.title || '',
      meta: {
        about: b.about || '', intro: b.intro || '', svc: b.svc || '',
        ctaLabel: b.ctaLabel || '', ctaUrl: b.ctaUrl || '', title: b.title || '',
      },
      selection: Array.isArray(b.selection) ? b.selection : [],
    };
    if (b.id) {
      const id = await this.proposals.update(b.id, payload);
      if (!id) throw httpError(404, 'not found');
      return id;
    }
    return this.proposals.insert(userId, payload);
  }

  listProposals() {
    return this.proposals.list();
  }

  async getProposal(id: string) {
    const row = await this.proposals.findById(id);
    if (!row) throw httpError(404, 'not found');
    return row;
  }

  removeProposal(id: string) {
    return this.proposals.remove(id);
  }

  // ── refine 기록(refine_runs) — 엔진 쪽 저장소를 그대로 읽는다 ──
  listRefineRuns() { return refineRoute.runsApi.listRuns(); }
  getRefineRun(id: string) { return refineRoute.runsApi.getRun(id); }
  removeRefineRun(id: string) { return refineRoute.runsApi.removeRun(id); }
}
