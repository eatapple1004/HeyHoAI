import { Controller, Delete, Get, HttpCode, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import * as path from 'path';
import { AdminGuard } from '../auth/admin.guard';
import { ApiResponse } from '../common/dto/api-response.dto';
import { BusinessMetaService, STATE_COOKIE } from './business-meta.service';
import { MetaAccountVo } from './business-meta.repository';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));

/**
 * Meta 직결 인스타 연동 — 관리자 전용, `/admin-business-meta` 화면의 백엔드.
 *
 * ⚠️ **선언 순서 = 매칭 순서.** 고정 세그먼트(`oauth/*`, `config`, `accounts`)를
 *   `accounts/:id` 계열보다 먼저 둔다(BusinessController와 같은 규칙).
 *
 * OAuth 콜백은 인스타에서 오는 **최상위 GET 리다이렉트**다. 우리 인증 쿠키는 SameSite=lax라
 *   이 이동에도 실려 오므로 AdminGuard가 그대로 통과한다(별도 예외 불필요).
 */
@Controller('api/admin/business-meta')
@UseGuards(AdminGuard)
export class BusinessMetaController {
  constructor(private readonly svc: BusinessMetaService) {}

  /** GET /config — 자격증명 설정 여부·리디렉션 URI(콘솔 등록값 확인용). 비밀값은 절대 안 내려간다. */
  @Get('config')
  config(): ApiResponse<ReturnType<BusinessMetaService['config']>> {
    return { success: true, data: this.svc.config() };
  }

  /** GET /oauth/start — 인스타 동의 화면으로 302. `expect`는 붙일 계정의 기대 핸들. */
  @Get('oauth/start')
  start(@Query('expect') expect: string, @Req() req: any, @Res() res: any) {
    const { url, state } = this.svc.startUrl(expect, req);
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true, sameSite: 'lax', secure: env.COOKIE_SECURE, maxAge: 10 * 60 * 1000, path: '/',
    });
    return res.redirect(url);
  }

  /**
   * GET /oauth/callback — 코드 교환 → 저장 → 화면으로 복귀.
   * 여기서 JSON을 내면 사용자는 브라우저에 원시 JSON을 보게 된다. 항상 화면으로 리다이렉트한다.
   */
  @Get('oauth/callback')
  async callback(@Query() q: any, @Req() req: any, @Res() res: any) {
    res.clearCookie(STATE_COOKIE, { path: '/' });
    const back = (params: Record<string, string>) =>
      res.redirect(`/admin-business-meta?${new URLSearchParams(params).toString()}`);

    // 사용자가 동의를 거부했거나 Meta가 에러를 실어 보낸 경우
    if (q.error) return back({ error: q.error_description || q.error_reason || q.error });
    if (!q.code) return back({ error: '인증 코드가 없습니다.' });

    try {
      const r = await this.svc.handleCallback(q.code, q.state, req.cookies?.[STATE_COOKIE], req);
      return back(r.mismatch
        ? { connected: r.username, mismatch: r.mismatch }
        : { connected: r.username });
    } catch (e: any) {
      return back({ error: e.message || '연결에 실패했습니다.' });
    }
  }

  /** GET /accounts — 연결된 Meta 직결 계정(토큰 제외) */
  @Get('accounts')
  async accounts(): Promise<ApiResponse<MetaAccountVo[]>> {
    return { success: true, data: await this.svc.accounts() };
  }

  /** POST /accounts/refresh — 만료 임박 토큰 일괄 갱신(수동 트리거) */
  @Post('accounts/refresh')
  @HttpCode(200)
  async refreshAll(): Promise<ApiResponse<{ tried: number; ok: number }>> {
    return { success: true, data: await this.svc.refreshExpiring() };
  }

  /** POST /accounts/:id/refresh — 한 계정 토큰 갱신(+60일) */
  @Post('accounts/:id/refresh')
  @HttpCode(200)
  async refreshOne(@Param('id') id: string): Promise<ApiResponse<MetaAccountVo>> {
    return { success: true, data: await this.svc.refreshOne(id) };
  }

  /** DELETE /accounts/:id — 연결 해제(토큰 삭제, 계정 행은 남긴다) */
  @Delete('accounts/:id')
  async disconnect(@Param('id') id: string): Promise<ApiResponse<null>> {
    await this.svc.disconnect(id);
    return { success: true, data: null };
  }
}
