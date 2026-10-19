import { Body, Controller, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, Req, Res, UseFilters, UseGuards } from '@nestjs/common';
import * as path from 'path';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPageGuard } from '../pages/page-auth.guard';
import { PageExceptionFilter } from '../pages/page-exception.filter';
import { BusinessSiteService } from './business-site.service';

/**
 * 사업체 홈페이지 — 관리자 API. `/api/admin/business` 접두사는 이미 Nest 소유(main.ts NEST_PREFIXES).
 *   흐름: search(후보 찾기) → collect(자료 저장) → generate(AI 문구) → PATCH(수정·공개)
 */
@Controller('api/admin/business')
@UseGuards(AdminGuard)
export class BusinessSiteAdminController {
  constructor(private readonly sites: BusinessSiteService) {}

  @Get(':id/site')
  async get(@Param('id') id: string) {
    return { success: true, data: await this.sites.get(id) };
  }

  @Get(':id/site/search')
  async search(@Param('id') id: string, @Query('q') q: string) {
    return { success: true, data: await this.sites.search(id, q) };
  }

  @Post(':id/site/collect')
  @HttpCode(200)
  async collect(@Param('id') id: string, @Body() body: any) {
    return { success: true, data: await this.sites.collect(id, body || {}) };
  }

  @Post(':id/site/generate')
  @HttpCode(200)
  async generate(@Param('id') id: string, @Body() body: any) {
    return { success: true, data: await this.sites.generate(id, body || {}) };
  }

  @Get(':id/site/inquiries')
  async inquiries(@Param('id') id: string) {
    return { success: true, data: await this.sites.inquiries(id) };
  }

  @Patch(':id/site')
  async update(@Param('id') id: string, @Body() body: any) {
    return { success: true, data: await this.sites.update(id, body || {}) };
  }
}

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const NOT_FOUND_HTML = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>페이지를 찾을 수 없습니다</title><body style="font-family:system-ui,sans-serif;background:#fff;color:#222;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center"><div><h1 style="font-size:22px">페이지를 찾을 수 없습니다</h1><p style="color:#666">주소를 다시 확인해 주세요. 아직 공개 전인 페이지일 수도 있습니다.</p></div></body>';

/**
 * 화면 — 관리자 편집 페이지·미리보기, 공개 사이트, Google 사진 프록시.
 * ⚠️ PagesModule(`:name` 클린 URL)보다 먼저 등록돼야 한다 — 여기 경로는 전부 2세그먼트 이상이라 겹치진 않지만 순서를 지킨다.
 */
@Controller()
@UseFilters(PageExceptionFilter)
export class BusinessSitePagesController {
  constructor(private readonly sites: BusinessSiteService) {}

  @UseGuards(AdminPageGuard)
  @Get('admin-business/:id/site')
  editor(@Res() res: any) {
    return res.sendFile(path.join(PUBLIC_DIR, 'admin-business-site.html'));
  }

  @UseGuards(AdminPageGuard)
  @Get('admin-business/:id/site/preview/*path')
  async previewPath(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    const r = await this.sites.renderPreviewPath(id, restPath(req), req.query || {});
    if (!r) throw new NotFoundException();
    res.set('Cache-Control', 'no-store');
    return res.status(r.status).type(r.type).send(r.body);
  }

  /** 미리보기의 문의 폼 — 접수하지 않고 안내만 */
  @UseGuards(AdminPageGuard)
  @Post('admin-business/:id/site/preview/contact')
  previewContact(@Param('id') id: string, @Res() res: any) {
    return res.redirect(303, `/admin-business/${id}/site/preview/contact?error=${encodeURIComponent('미리보기에서는 문의가 접수되지 않습니다.')}`);
  }

  @UseGuards(AdminPageGuard)
  @Get('admin-business/:id/site/preview')
  async preview(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    const multi = await this.sites.renderPreviewPath(id, '', req.query || {});
    if (multi) { res.set('Cache-Control', 'no-store'); return res.status(multi.status).type(multi.type).send(multi.body); }
    const html = await this.sites.renderPreview(id);
    if (!html) throw new NotFoundException();
    res.set('Cache-Control', 'no-store');
    return res.type('html').send(html);
  }

  /** 여러 페이지 사이트의 하위 경로(/site/<slug>/about …) */
  @Get('site/:slug/*path')
  async sitePath(@Param('slug') slug: string, @Req() req: any, @Res() res: any) {
    const r = await this.sites.renderSitePath(slug, restPath(req), req.query || {});
    if (!r) return res.status(404).type('html').send(NOT_FOUND_HTML);
    res.set('Cache-Control', /^contact/.test(restPath(req)) ? 'no-store' : 'public, max-age=60, s-maxage=300');
    return res.status(r.status).type(r.type).send(r.body);
  }

  /** 문의 접수 — 일반 HTML 폼(urlencoded). 전역 파서는 JSON만 읽으므로 여기서 직접 읽는다(최대 16KB) */
  @Post('site/:slug/contact')
  async contact(@Param('slug') slug: string, @Req() req: any, @Res() res: any) {
    const raw = await readBody(req, 16 * 1024);
    const form = Object.fromEntries(new URLSearchParams(raw || ''));
    const result = await this.sites.submitInquiry(slug, form, String(req.ip || ''));
    const q = result === 'ok' ? 'sent=1' : `error=${encodeURIComponent(result)}`;
    res.set('Cache-Control', 'no-store');
    return res.redirect(303, `/site/${encodeURIComponent(slug)}/contact?${q}`);
  }

  @Get('site/:slug')
  async site(@Param('slug') slug: string, @Req() req: any, @Res() res: any) {
    const multi = await this.sites.renderSitePath(slug, '', req.query || {});
    if (multi) { res.set('Cache-Control', 'public, max-age=60, s-maxage=300'); return res.status(multi.status).type(multi.type).send(multi.body); }
    const html = await this.sites.renderPublished(slug);
    // 방문자가 보는 화면이라 JSON 대신 짧은 안내 페이지
    if (!html) return res.status(404).type('html').send(NOT_FOUND_HTML);
    // 수정이 바로 보이도록 엣지에 오래 두지 않는다(5분)
    res.set('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.type('html').send(html);
  }

  @Get('site-photo/:siteId/:n')
  async photo(@Param('siteId') siteId: string, @Param('n', ParseIntPipe) n: number, @Res() res: any) {
    const ph = await this.sites.googlePhoto(siteId, n);
    if (!ph) throw new NotFoundException();
    // Google 사진은 호출마다 과금 — 하루 캐시해 같은 사진을 반복 호출하지 않는다
    res.set('Cache-Control', 'public, max-age=86400');
    return res.type(ph.type).send(ph.buf);
  }
}

/** urlencoded 본문을 직접 읽는다 — 크기 상한을 넘으면 빈 문자열 */
function readBody(req: any, limit: number): Promise<string> {
  if (typeof req.body === 'string') return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let size = 0; const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => { size += c.length; if (size <= limit) chunks.push(c); });
    req.on('end', () => resolve(size > limit ? '' : Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(''));
  });
}

/** Express 5(path-to-regexp v8) 의 `*path` 는 세그먼트 배열로 온다 — 문자열 경로로 합친다 */
function restPath(req: any): string {
  const v = req.params?.path;
  return Array.isArray(v) ? v.join('/') : String(v || '');
}
