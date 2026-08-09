/** 대시보드 응답 계약 — src/dashboard/dashboard.service.js */

/** 최근 7일 일별 게시 수 */
export interface DailyPostCountDto {
  day: string;   // 'YYYY-MM-DD' (Asia/Seoul 기준)
  count: number;
}

export interface DashboardOverviewDto {
  accounts: number;
  published: number;
  queued: number;
  scheduled: number;
  daily: DailyPostCountDto[];
}

/** 캘린더 항목 — 유효일자 = scheduled_at | posted_at | created_at */
export interface CalendarItemDto {
  id: string;
  status: string;
  effectiveAt: string;
  scheduledAt: string | null;
  postedAt: string | null;
  type: 'reel' | 'photo' | 'post';
  username: string | null;
  platform: string | null;
}
