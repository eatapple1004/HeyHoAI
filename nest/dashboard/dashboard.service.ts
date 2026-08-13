import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';
import { DashboardOverviewDto, CalendarItemDto } from './dto/dashboard.dto';

/** 대시보드 도메인 서비스 — 집계 결과를 화면이 쓰는 형태로 변환한다. */
@Injectable()
export class DashboardService {
  constructor(private readonly dashboard: DashboardRepository) {}

  /** 소셜 계정 전체 발행 집계 + 최근 7일 일별 */
  async overview(userId: string): Promise<DashboardOverviewDto> {
    const counts = await this.dashboard.countsByUser(userId);
    const daily = await this.dashboard.dailyPosts(userId);
    return {
      accounts: parseInt(counts.accounts, 10),
      published: parseInt(counts.published, 10),
      queued: parseInt(counts.queued, 10),
      scheduled: parseInt(counts.scheduled, 10),
      daily: daily.map((r) => ({ day: r.day, count: parseInt(r.cnt, 10) })),
    };
  }

  /** 캘린더 렌더용 목록 */
  async calendar(userId: string): Promise<CalendarItemDto[]> {
    const rows = await this.dashboard.calendarItems(userId);
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      effectiveAt: r.effective_at,
      scheduledAt: r.scheduled_at,
      postedAt: r.posted_at,
      type: r.has_reel ? 'reel' : (r.has_image ? 'photo' : 'post'),
      username: r.username,
      platform: r.platform,
    }));
  }
}
