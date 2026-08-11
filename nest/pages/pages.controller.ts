import { Controller, Get, Next, Param, Req, Res, UseFilters, UseGuards } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { AdminPageGuard, PageGuard } from './page-auth.guard';
import { PageExceptionFilter } from './page-exception.filter';
import { AffiliateService } from '../affiliate/affiliate.service';

/**
 * 페이지 서빙 — HTML 파일과 리다이렉트를 담당한다.
 *
 * ⚠️ 여기서는 `@Res()`가 정상이다. 반환값 직렬화(JSON)가 아니라 **파일 전송·리다이렉트**가 목적이라
 *   응답 객체가 반드시 필요하다(위임형 @Res를 걷어낸 것과는 다른 경우).
 *
 * ⚠️ **선언 순서 = 매칭 순서.** 구체 경로를 먼저 두고 단일 세그먼트 와일드카드(`:name`)를 맨 끝에 둔다.
 *   `:name`을 위로 올리면 `/login`·`/store`까지 그게 삼킨다.
 */

/** dist/pages/pages.controller.js 기준 ../../public = <repo>/public */
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
/** 확장자 없는 클린 URL로 받아줄 이름 형식 — 레거시 정규식과 동일 */
const CLEAN_URL_RE = /^[a-z0-9-]+$/i;
/** 추천 쿠키 — 이름·수명이 레거시와 달라지면 기존 링크의 추천이 끊긴다 */
const REF_COOKIE = 'ref';
const REF_COOKIE_MAX_AGE = 60 * 24 * 60 * 60 * 1000; // 60일

const page = (name: string) => path.join(PUBLIC_DIR, name);

@Controller()
@UseFilters(PageExceptionFilter)
export class PagesController {
  constructor(private readonly affiliate: AffiliateService) {}

  // ── 공개 ──

  /** 메인 = SaaS 랜딩 */
  @Get('/')
  root(@Res() res: any) {
    return res.sendFile(page('landing.html'));
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * 스토어 폐쇄(2026-07-20) — 404 대신 /studio로 보낸다(옛 북마크를 막다른 길로 두지 않는다).
   * ⚠️ 클린 URL(`:name`)보다 **먼저** 선언해야 store.html이 그대로 서빙되지 않는다.
   */
  @Get('store')
  store(@Res() res: any) {
    return res.redirect(302, '/studio');
  }

  /** 추천 링크 — 클릭 기록 + 60일 쿠키 후 랜딩. 추적이 실패해도 방문은 막지 않는다. */
  @Get('r/:code')
  async referral(@Param('code') code: string, @Res() res: any) {
    try {
      if (await this.affiliate.recordClick(code)) {
        res.cookie(REF_COOKIE, code, {
          httpOnly: true, sameSite: 'lax', maxAge: REF_COOKIE_MAX_AGE, path: '/',
        });
      }
    } catch { /* 추적 실패해도 진행 */ }
    return res.redirect('/');
  }

  @Get('login')
  login(@Res() res: any) {
    return res.sendFile(page('login.html'));
  }

  @Get('signup')
  signup(@Res() res: any) {
    return res.sendFile(page('signup.html'));
  }

  // ── 로그인 필요 ──

  @UseGuards(PageGuard)
  @Get('heyhoai/image/generater/page')
  generatePage(@Res() res: any) { return res.sendFile(page('index.html')); }

  @UseGuards(PageGuard)
  @Get('heyhoai/character/page')
  characterPage(@Res() res: any) { return res.sendFile(page('character.html')); }

  @UseGuards(PageGuard)
  @Get('heyhoai/templates/page')
  templatesPage(@Res() res: any) { return res.sendFile(page('templates.html')); }

  @UseGuards(PageGuard)
  @Get('heyhoai/templates/birth-reel')
  birthReelPage(@Res() res: any) { return res.sendFile(page('birth-reel.html')); }

  @UseGuards(PageGuard)
  @Get('heyhoai/templates/baby-growth')
  babyGrowthPage(@Res() res: any) { return res.sendFile(page('baby-growth.html')); }

  /** 위 두 고정 경로보다 **뒤**에 있어야 birth-reel·baby-growth를 삼키지 않는다 */
  @UseGuards(PageGuard)
  @Get('heyhoai/templates/:templateId')
  templateFlowPage(@Res() res: any) { return res.sendFile(page('template-flow.html')); }

  @UseGuards(PageGuard)
  @Get('heyhoai/logs/page')
  logsPage(@Res() res: any) { return res.sendFile(page('logs.html')); }

  @UseGuards(PageGuard)
  @Get('heyhoai/accounts/page')
  accountsPage(@Res() res: any) { return res.sendFile(page('accounts.html')); }

  @UseGuards(PageGuard)
  @Get('heyhoai/accounts/:id/manage')
  accountManagePage(@Res() res: any) { return res.sendFile(page('account-manage.html')); }

  @UseGuards(PageGuard)
  @Get('heyhoai/accounts/:id/analytics')
  accountAnalyticsPage(@Res() res: any) { return res.sendFile(page('account-analytics.html')); }

  @UseGuards(PageGuard)
  @Get('heyhoai/editor/page')
  editorPage(@Res() res: any) { return res.sendFile(page('editor.html')); }

  // ── 관리자 전용(페이지 로드 시점부터 차단) ──

  @UseGuards(AdminPageGuard)
  @Get('admin-trials')
  adminTrials(@Res() res: any) { return res.sendFile(page('admin-trials.html')); }

  @UseGuards(AdminPageGuard)
  @Get('admin-refine')
  adminRefine(@Res() res: any) { return res.sendFile(page('admin-refine.html')); }

  @UseGuards(AdminPageGuard)
  @Get('admin-templates')
  adminTemplates(@Res() res: any) { return res.sendFile(page('admin-templates.html')); }

  @UseGuards(AdminPageGuard)
  @Get('admin-creations')
  adminCreations(@Res() res: any) { return res.sendFile(page('admin-creations.html')); }

  @UseGuards(AdminPageGuard)
  @Get('admin-stats')
  adminStats(@Res() res: any) { return res.sendFile(page('admin-stats.html')); }

  @UseGuards(AdminPageGuard)
  @Get('admin-proposal')
  adminProposal(@Res() res: any) { return res.sendFile(page('admin-proposal.html')); }

  /** 사업체 인스타 관리 — 목록. 상세(`:id`)보다 먼저 선언해야 한다. */
  @UseGuards(AdminPageGuard)
  @Get('admin-business')
  adminBusiness(@Res() res: any) { return res.sendFile(page('admin-business.html')); }

  @UseGuards(AdminPageGuard)
  @Get('admin-business/:id')
  adminBusinessDetail(@Res() res: any) { return res.sendFile(page('admin-business-detail.html')); }

  // ── 클린 URL (맨 마지막) ──

  /**
   * `/studio` → `public/studio.html`, `/studio.html` → **301** `/studio`(쿼리 보존).
   * 파일이 없으면 `next()` — 정적 미들웨어·레거시 폴백이 이어서 처리한다.
   */
  @Get(':name')
  cleanUrl(@Param('name') name: string, @Req() req: any, @Res() res: any, @Next() next: any) {
    const html = name.toLowerCase().endsWith('.html');
    const base = html ? name.slice(0, -5) : name;
    if (!CLEAN_URL_RE.test(base)) return next();
    if (html) {
      const q = req.originalUrl.indexOf('?');
      return res.redirect(301, `/${base}${q >= 0 ? req.originalUrl.slice(q) : ''}`);
    }
    const file = page(`${base}.html`);
    if (!fs.existsSync(file)) return next();
    return res.sendFile(file);
  }
}
