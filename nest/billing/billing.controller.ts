import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// /api/billing — 크레딧 팩·체크아웃·결제내역(전부 인증 필요).
//   ⚠️ 웹훅(/api/billing/webhook 등)은 raw body·무인증이라 레거시 유지(main.ts NEST_EXCLUDE).
@Controller('api/billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('packs')
  packs() {
    return { success: true, data: this.billing.packs() };
  }

  @Post('checkout')
  @HttpCode(200) // 레거시 res.json=200에 맞춤(Nest POST 기본 201 방지)
  async checkout(@Req() req: any, @Body() body: any) {
    // checkout()이 실패 시 HttpException(400/503/502, {success,error})을 던짐 → Nest가 그대로 응답.
    const data = await this.billing.checkout(req.user, req.protocol, req.get('host'), body && body.packId);
    return { success: true, data };
  }

  @Get('history')
  async history(@Req() req: any) {
    return { success: true, data: await this.billing.history(req.user.id) };
  }
}
