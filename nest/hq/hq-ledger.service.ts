import { HttpException, Injectable } from '@nestjs/common';
import * as path from 'path';
import { HqRepository } from './hq.repository';
import { HqActor } from './hq.guard';
import { HqService } from './hq.service';
import {
  HQ_REF_STAGES,
  HqLedgerBulkDto,
  HqLedgerBulkResultDto,
  HqLedgerCardInDto,
  HqLedgerListDto,
  HqRefDto,
  HqVaultCreateDto,
  HqVaultStatusDto,
  HqVaultWrappedDto,
} from './dto/hq.dto';
import { HqLedgerBodyVo } from './vo/hq.vo';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

function fail(status: number, error: string): never {
  throw new HttpException({ success: false, error }, status);
}

const VAULT_KEY = 'vault';
const BULK_MAX = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const B64_RE = /^[A-Za-z0-9+/=_-]+$/;
const clean = (v: unknown, max = 2000): string => String(v ?? '').trim().slice(0, max);
const day = (v: unknown): string | null => {
  const s = String(v ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null;
};
const list = (v: unknown, n: number, max: number): string[] => (Array.isArray(v) ? v.slice(0, n).map((x) => clean(x, max)).filter(Boolean) : []);

/**
 * 레퍼런스 원장 + 금고.
 *   원장 = 모든 작업 세션에서 거둔 「한 일」 카드. 수확기가 밤마다 넣고, 같은 origin 이면 고친다.
 *   민감 카드는 수확기가 금고 **공개 열쇠**로 잠가서 보낸다 — 서버에는 잠긴 글만 남고 제목·내용은 비운다.
 *   잠긴 글을 푸는 **개인 열쇠**는 주인의 비밀 문구로 잠겨 저장되고, 주인 브라우저에서만 풀린다(서버는 비밀 문구를 모른다).
 */
@Injectable()
export class HqLedgerService {
  constructor(private readonly repo: HqRepository, private readonly hq: HqService) {}

  private isOwner(actor: HqActor): boolean {
    const owner = String(env.HQ_VAULT_OWNER || '').trim().toLowerCase();
    return !!owner && !actor.service && String(actor.email || '').toLowerCase() === owner;
  }

  private async ownerEmail(actor: HqActor): Promise<HqActor> {
    // 도피아 로그인으로 들어오면 토큰에 id 만 있어 메일을 한 번 찾는다
    if (actor.email || actor.service) return actor;
    return { ...actor, email: await this.hq.who(actor) };
  }

  async vaultStatus(actor: HqActor): Promise<HqVaultStatusDto> {
    const v = await this.repo.getState(VAULT_KEY);
    const a = await this.ownerEmail(actor);
    return { exists: !!v, owner: this.isOwner(a), publicKey: v ? (v.value as any).publicKey : null };
  }

  async vaultPublic(): Promise<{ publicKey: JsonWebKey | null }> {
    const v = await this.repo.getState(VAULT_KEY);
    return { publicKey: v ? (v.value as any).publicKey : null };
  }

  /** 주인만 — 비밀 문구로 잠긴 개인 열쇠를 돌려준다(푸는 건 브라우저) */
  async vaultWrapped(actor: HqActor): Promise<HqVaultWrappedDto> {
    if (!this.isOwner(await this.ownerEmail(actor))) fail(403, '금고 주인만 열 수 있습니다');
    const v = await this.repo.getState(VAULT_KEY);
    if (!v) fail(404, '금고가 아직 없습니다');
    return (v.value as any).wrapped;
  }

  /** 주인만, 처음 한 번 — 이미 있으면 바꾸지 않는다(잠긴 카드가 영영 안 풀리게 되는 사고 방지) */
  async createVault(body: HqVaultCreateDto, actor: HqActor): Promise<void> {
    const a = await this.ownerEmail(actor);
    if (!this.isOwner(a)) fail(403, '금고 주인만 만들 수 있습니다');
    if (await this.repo.getState(VAULT_KEY)) fail(409, '금고가 이미 있습니다');
    const pk = body?.publicKey as any;
    const w = body?.wrapped as any;
    if (!pk || pk.kty !== 'RSA' || typeof pk.n !== 'string' || typeof pk.e !== 'string' || pk.d) fail(400, '공개 열쇠 모양이 아닙니다');
    if (!w || ![w.salt, w.iv, w.ct].every((x) => typeof x === 'string' && B64_RE.test(x)) || !(w.iterations >= 100000)) fail(400, '잠긴 열쇠 모양이 아닙니다');
    const value = { publicKey: { kty: 'RSA', n: pk.n, e: pk.e, alg: pk.alg || 'RSA-OAEP-256', ext: true, key_ops: ['encrypt'] }, wrapped: { salt: w.salt, iv: w.iv, ct: w.ct, iterations: Number(w.iterations) }, createdAt: new Date().toISOString() };
    await this.repo.putState(VAULT_KEY, value, a.email || '');
    await this.repo.insertLog({ who: a.email || '', kind: '금고', text: '잠긴 카드 금고를 만들었다(비밀 문구는 서버에 없음)' });
  }

  async list(actor: HqActor): Promise<HqLedgerListDto> {
    const [cards, vault] = await Promise.all([this.repo.listLedger(), this.vaultStatus(actor)]);
    return { cards, vault };
  }

  /** 잠긴 글 모양만 확인(서버는 내용을 모른다) */
  private sealedOk(s: string): boolean {
    if (!s || s.length > 60000) return false;
    try {
      const o = JSON.parse(s);
      return o && o.v === 1 && [o.k, o.iv, o.ct].every((x: unknown) => typeof x === 'string' && B64_RE.test(x as string));
    } catch {
      return false;
    }
  }

  private cleanCard(c: HqLedgerCardInDto): { origin: string; day: string | null; area: string; title: string; kind: string; sensitive: boolean; body: HqLedgerBodyVo; sealed: string; session: string } | null {
    const origin = clean(c?.origin, 200);
    if (!origin) return null;
    const sensitive = c.sensitive === true;
    const base = { origin, day: day(c.day), area: clean(c.area, 40), kind: clean(c.kind, 20), session: clean(c.session, 80) };
    if (sensitive) {
      // 민감 카드: 잠긴 글이 없으면 받지 않는다. 제목·내용은 서버에 남기지 않는다
      const sealed = String(c.sealed || '');
      if (!this.sealedOk(sealed)) return null;
      // 사업 이름·종류도 잠긴 글 안에만 둔다 — 서버에는 날짜만 남는다
      return { ...base, area: '', kind: '', sensitive, title: '잠긴 카드', body: {}, sealed };
    }
    const title = clean(c.title, 120);
    if (!title) return null;
    const b = (c.body || {}) as HqLedgerBodyVo;
    const body: HqLedgerBodyVo = {
      what: clean(b.what, 2000), result: clean(b.result, 500), numbers: list(b.numbers, 20, 160), ai_role: clean(b.ai_role, 400),
      fails: clean(b.fails, 1500), visibility: ['내부', '확인 필요', '공개 가능'].includes(String(b.visibility)) ? String(b.visibility) : '내부', tags: list(b.tags, 6, 40),
    };
    return { ...base, sensitive, title, body, sealed: '' };
  }

  async bulk(body: HqLedgerBulkDto, actor: HqActor): Promise<HqLedgerBulkResultDto> {
    const raw = Array.isArray(body?.cards) ? body.cards : fail(400, 'cards 목록이 없습니다');
    if (raw.length > BULK_MAX) fail(400, `한 번에 ${BULK_MAX}장까지 넣을 수 있습니다`);
    const cards = raw.map((c) => this.cleanCard(c)).filter((c): c is NonNullable<typeof c> => !!c);
    const [added, changed] = cards.length ? await this.repo.upsertLedger(cards) : [0, 0];
    const skipped = raw.length - cards.length;
    if (added || changed || skipped) {
      await this.repo.insertLog({ who: await this.hq.who(actor), kind: '원장', text: `원장 카드 ${added}장 추가 · ${changed}장 갱신${skipped ? ` · ${skipped}장 버림(모양 불량)` : ''}` });
    }
    return { added, changed, skipped };
  }

  /** 원장 카드를 레퍼런스 보드 '완성' 칸으로 올린다. 잠긴 카드는 올리지 않는다(올리면 평문이 생긴다) */
  async promote(id: string, actor: HqActor): Promise<HqRefDto> {
    if (!UUID_RE.test(id)) fail(404, '없는 카드입니다');
    const c = await this.repo.findLedger(id);
    if (!c) fail(404, '없는 카드입니다');
    if (c.sensitive) fail(400, '잠긴 카드는 보드에 올릴 수 없습니다');
    if (await this.repo.refByLedger(id)) fail(409, '이미 보드에 있습니다');
    const b = c.body || {};
    const ref = await this.hq.createRef({
      title: c.title, kind: c.kind, source: c.area || '도피아', stage: HQ_REF_STAGES[1],
      note: [b.what, b.numbers && b.numbers.length ? `숫자: ${b.numbers.join(' · ')}` : '', b.fails ? `실패·고친 것: ${b.fails}` : ''].filter(Boolean).join('\n\n'),
      doneDate: c.day || undefined, resultUrl: /^https?:\/\//.test(String(b.result || '')) ? String(b.result) : undefined,
    }, actor);
    await this.repo.setRefLedger(ref.id, id);
    return { ...ref, ledger_id: id };
  }
}
