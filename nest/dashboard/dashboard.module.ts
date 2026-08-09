import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './dashboard.repository';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRepository, JwtAuthGuard],
})
export class DashboardModule {}
