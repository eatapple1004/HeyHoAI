import { Injectable } from '@nestjs/common';
import { DashboardOverviewDto, CalendarItemDto } from './dto/dashboard.dto';
import * as path from 'path';

// 조회 로직 재사용(중복 금지) — SQL은 레거시 dashboard.service.js 단일소스가 담당.
//   dist/dashboard/dashboard.service.js 기준 ../../src/... = <repo>/src/...
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'dashboard', 'dashboard.service.js'));

@Injectable()
export class DashboardService {
  // 소셜 계정 전체 발행 집계(계정수·게시·대기·예약 + 최근 7일 일별)
  overview(userId: string): Promise<DashboardOverviewDto> {
    return legacy.getOverview(userId);
  }

  // 캘린더 렌더용 예약/게시 항목 목록(최근 80건)
  calendar(userId: string): Promise<CalendarItemDto[]> {
    return legacy.getCalendar(userId);
  }
}
