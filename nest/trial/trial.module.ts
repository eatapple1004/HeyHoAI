import { Module } from '@nestjs/common';
import { AdminTrialsController, TrialController } from './trial.controller';
import { TrialService } from './trial.service';
import { TrialRepository } from './trial.repository';
import { PasswordService } from '../auth/password.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Module({
  controllers: [AdminTrialsController, TrialController],
  providers: [TrialService, TrialRepository, PasswordService, JwtAuthGuard, AdminGuard],
  exports: [TrialService],   // 로그인 시 체험 카운트 시작(AuthModule)
})
export class TrialModule {}
