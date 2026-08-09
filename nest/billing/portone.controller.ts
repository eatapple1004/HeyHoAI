import { Body, Controller, Get, HttpCode, HttpException, Post, Req, Res, UseGuards } from '@nestjs/common';
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
