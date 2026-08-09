import { Module } from '@nestjs/common';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { CreditRepository } from './credit.repository';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [CreditsController],
  providers: [CreditsService, CreditRepository, JwtAuthGuard],
})
export class CreditsModule {}
