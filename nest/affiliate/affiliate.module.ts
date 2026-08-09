import { Module } from '@nestjs/common';
import { AffiliateController } from './affiliate.controller';
import { AffiliateService } from './affiliate.service';
import { AffiliateRepository } from './affiliate.repository';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [AffiliateController],
  providers: [AffiliateService, AffiliateRepository, JwtAuthGuard],
  exports: [AffiliateService],   // 가입 시 추천 연결(AuthModule)
})
export class AffiliateModule {}
