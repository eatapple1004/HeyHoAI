import { Body, Controller, Get, HttpCode, HttpException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PortoneService } from './portone.service';
import { AdminGuard } from '../auth/admin.guard';

/**
 * /api/admin/refunds — 결제 취소(환불) 관리자 경로.
 *
 * 셀프 환불(/api/billing/portone/refund)이 규정상 **미사용·7일 이내 전액**만 열려 있으므로,
 * 그 밖의 모든 케이스(부분사용 후 회사 귀책 비례환불, 이중결제, 미성년자 결제 취소,
 * PG 심사용 취소 테스트)는 사람이 판단해 여기로 들어온다.
 *
 * 클래스 단위 AdminGuard = 레거시 requireAdmin과 동일(미인증 401 / 비관리자 403).
 */
@Controller('api/admin/refunds')
@UseGuards(AdminGuard)
export class RefundAdminController {
  constructor(private readonly portone: PortoneService) {}

  /** GET /api/admin/refunds?orderId=&limit= — 취소 이력 */
  @Get()
  async list(@Query('orderId') orderId?: string, @Query('limit') limit?: string) {
    return { success: true, data: await this.portone.refundHistory(orderId, Number(limit) || 50) };
  }

  /** GET /api/admin/refunds/assess/:paymentId — 취소 전 판정(금액·사용량·비례환불액 확인) */
  @Get('assess/:paymentId')
  async assess(@Param('paymentId') paymentId: string) {
    return this.wrap(async () => ({ success: true, data: await this.portone.assessRefund(paymentId) }));
  }

  /**
   * POST /api/admin/refunds { paymentId, amountKRW?, credits?, reason }
   *   amountKRW 생략 = 전액취소. credits 생략 = 취소 금액에 비례해 회수.
   */
  @Post()
  @HttpCode(200)
  async cancel(@Req() req: any, @Body() body: any) {
    return this.wrap(async () => ({
      success: true,
      data: await this.portone.refundAsAdmin(body && body.paymentId, {
        amountKRW: body && body.amountKRW,
        credits: body && body.credits,
        reason: body && body.reason,
        actorUserId: req.user.id,
      }),
    }));
  }

  /**
   * POST /api/admin/refunds/reconcile { paymentId }
   *   PortOne 콘솔에서 직접 취소했을 때 크레딧 회수를 뒤늦게 맞추는 복구용.
   *   (웹훅이 정상 도착하면 자동으로 도는 경로와 같은 함수다 — 수동 재실행해도 중복 회수되지 않는다.)
   */
  @Post('reconcile')
  @HttpCode(200)
  async reconcile(@Body() body: any) {
    return this.wrap(async () => ({
      success: true,
      data: await this.portone.reconcileRefund(body && body.paymentId),
    }));
  }

  /** 서비스의 statusCode 규약(400/403/404/409/502/503)을 HTTP 상태로 그대로 옮긴다 */
  private async wrap<T>(fn: () => T | Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e: any) {
      if (e && e.statusCode) throw new HttpException({ success: false, error: e.message }, e.statusCode);
      throw e;
    }
  }
}
