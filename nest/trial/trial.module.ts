import { Module } from '@nestjs/common';
import { AdminTrialsController, TrialController } from './trial.controller';
import { TrialService } from './trial.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Module({
  controllers: [AdminTrialsController, TrialController],
  providers: [TrialService, JwtAuthGuard, AdminGuard],
})
export class TrialModule {}
