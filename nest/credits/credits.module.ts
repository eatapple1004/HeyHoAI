import { Module } from '@nestjs/common';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [CreditsController],
  providers: [CreditsService, JwtAuthGuard],
})
export class CreditsModule {}
