import { Body, Controller, Delete, Get, HttpCode, HttpException, Post, Req, Res, UseGuards } from '@nestjs/common';
import { PortoneService } from './portone.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PgConfigDto } from './dto/billing.dto';

// /api/billing/portone — 국내 결제(PortOne V2) 준비/완료검증. webhook은 레거시(NEST_EXCLUDE).
@Controller('api/billing/portone')
@UseGuards(JwtAuthGuard)
export class PortoneController {
  constructor(private readonly portone: PortoneService) {}

  @Get('config')
  config(): PgConfigDto {
    return { success: true, data: this.portone.publicConfig() };
  }

  @Post('pack/begin')
  @HttpCode(200)
  async begin(@Req() req: any, @Body() body: any) {
    try {
      const data = await this.portone.beginPack(req.user, body && body.packId);
      return { success: true, data };
    } catch (e: any) {
      if (e && e.statusCode) throw new HttpException({ success: false, error: e.message }, e.statusCode);
      throw e;
    }
  }

  // ── 빌링키(정기결제용 카드) ──
  //   토스 심사 요건상 "빌링 결제창"이 실제로 열려야 한다. 결제창(카드 인증)은 프론트 SDK가 띄우고,
  //   서버는 발급된 토큰의 검증·보관·청구만 맡는다(카드번호는 우리 쪽에 오지 않는다).

  /** GET /api/billing/portone/billing-key — 등록된 카드(없으면 data:null) */
  @Get('billing-key')
  async card(@Req() req: any) {
    return { success: true, data: await this.portone.card(req.user.id) };
  }

  /** GET /api/billing/portone/billing-key/params — 카드 등록창 파라미터(공개값만) */
  @Get('billing-key/params')
  params(@Req() req: any) {
    return this.wrap(() => ({ success: true, data: this.portone.issueParams(req.user) }));
  }

  /** POST /api/billing/portone/billing-key — SDK가 발급받은 billingKey 저장(서버가 PG에 재확인) */
  @Post('billing-key')
  @HttpCode(200)
  async register(@Req() req: any, @Body() body: any) {
    return this.wrap(async () => ({
      success: true,
      data: await this.portone.registerCard(req.user, body && body.billingKey),
    }));
  }

  /** DELETE /api/billing/portone/billing-key — 카드 해지(PG 폐기 + 우리 쪽 비활성) */
  @Delete('billing-key')
  async unregister(@Req() req: any) {
    return this.wrap(async () => {
      await this.portone.deleteCard(req.user);
      return { success: true };
    });
  }

  /** POST /api/billing/portone/billing-key/charge — 등록 카드로 크레딧 팩 즉시 청구 */
  @Post('billing-key/charge')
  @HttpCode(200)
  async charge(@Req() req: any, @Body() body: any) {
    return this.wrap(async () => ({
      success: true,
      data: await this.portone.chargePack(req.user, body && body.packId),
    }));
  }

  /** 레거시 핸들러의 statusCode 규약(503/400/402/404)을 HTTP 상태로 그대로 옮긴다 */
  private async wrap<T>(fn: () => T | Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e: any) {
      if (e && e.statusCode) throw new HttpException({ success: false, error: e.message }, e.statusCode);
      throw e;
    }
  }

  @Post('complete')
  @HttpCode(200) // 성공=200(레거시 동일). 미완료 시 아래에서 res.status(400/202)로 덮어씀.
  async complete(@Body() body: any, @Res({ passthrough: true }) res: any) {
    // 레거시와 동일: 미완료면 상태코드만 바꿔 {success:false,...} 반환(passthrough로 status 제어).
    const r = await this.portone.verifyAndComplete(body && body.paymentId);
    if (!r.ok) {
      if (r.mismatch) {
        res.status(400);
        return { success: false, error: '결제 금액이 일치하지 않습니다.' };
      }
      res.status(202);
      return { success: false, status: r.status || null, error: '결제 확인 대기 중이거나 완료되지 않았습니다.' };
    }
    return { success: true, credits: r.credits || null, already: !!r.already };
  }
}
