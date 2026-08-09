import { Module } from '@nestjs/common';
import { CreditsController } from './credits.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [CreditsController],
  providers: [JwtAuthGuard],
})
export class CreditsModule {}
