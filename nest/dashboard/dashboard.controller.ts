import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiResponse } from '../common/dto/api-response.dto';
import { DashboardOverviewDto, CalendarItemDto } from './dto/dashboard.dto';

// /api/dashboard — 전 엔드포인트 인증 필요(= 레거시 requireAuth). 조회 전용(GET만).
//   응답 형식은 레거시와 동일하게 { success, data } 유지.
@Controller('api/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  // GET /api/dashboard/overview — 발행 집계 + 최근 7일 일별 게시 수
  @Get('overview')
  async overview(@Req() req: any): Promise<ApiResponse<DashboardOverviewDto>> {
    return { success: true, data: await this.dashboard.overview(req.user.id) };
  }

  // GET /api/dashboard/calendar — 예약/게시 항목 목록(캘린더)
  @Get('calendar')
  async calendar(@Req() req: any): Promise<ApiResponse<CalendarItemDto[]>> {
    return { success: true, data: await this.dashboard.calendar(req.user.id) };
  }
}
