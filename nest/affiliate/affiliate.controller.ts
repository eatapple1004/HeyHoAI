import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AffiliateService } from './affiliate.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// /api/affiliate — 인증 필요(= 레거시 requireAuth). 조회 전용.
@Controller('api/affiliate')
@UseGuards(JwtAuthGuard)
export class AffiliateController {
  constructor(private readonly affiliate: AffiliateService) {}

  // GET /api/affiliate — 내 추천 코드 + 통계
  @Get()
  async stats(@Req() req: any) {
    return { success: true, data: await this.affiliate.getStats(req.user.id) };
  }
}
