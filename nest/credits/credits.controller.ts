import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpException,
} from '@nestjs/common';
import { CreditsService } from './credits.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// /api/credits — 전 엔드포인트 인증 필요(= 레거시 requireAuth). Spring: @RestController + @PreAuthorize.
//   응답 형식은 레거시와 동일하게 { success, data } 유지.
@Controller('api/credits')
@UseGuards(JwtAuthGuard) // 컨트롤러 전체에 인증 가드 적용
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}

  // GET /api/credits
  @Get()
  async overview(@Req() req: any) {
    return { success: true, data: await this.credits.overview(req.user) };
  }

  // POST /api/credits/points/exchange  { amount }
  @Post('points/exchange')
  @HttpCode(200) // 레거시 res.json=200에 맞춤(Nest POST 기본 201 방지)
  async exchange(@Req() req: any, @Body() body: any) {
    try {
      const out = await this.credits.exchange(req.user.id, body && body.amount);
      return { success: true, data: out };
    } catch (err: any) {
      // 레거시와 동일: statusCode 있는 도메인 에러는 그 상태코드 + {success:false,error}로 반환.
      if (err && err.statusCode) {
        throw new HttpException({ success: false, error: err.message }, err.statusCode);
      }
      throw err;
    }
  }

  // GET /api/credits/points/ledger?limit=50
  @Get('points/ledger')
  async pointLedger(@Req() req: any, @Query('limit') limit?: string) {
    const n = Math.min(parseInt(limit as string, 10) || 50, 200);
    return { success: true, data: await this.credits.pointLedger(req.user.id, n) };
  }

  // GET /api/credits/ledger?limit=50
  @Get('ledger')
  async ledger(@Req() req: any, @Query('limit') limit?: string) {
    const n = Math.min(parseInt(limit as string, 10) || 50, 200);
    return { success: true, data: await this.credits.ledger(req.user.id, n) };
  }
}
