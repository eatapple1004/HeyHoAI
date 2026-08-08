import { Module } from '@nestjs/common';
import { AffiliateController } from './affiliate.controller';
import { AffiliateService } from './affiliate.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [AffiliateController],
  providers: [AffiliateService, JwtAuthGuard],
})
export class AffiliateModule {}
