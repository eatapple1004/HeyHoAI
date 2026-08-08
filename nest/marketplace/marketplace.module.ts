import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceCreatorsController } from './marketplace-creators.controller';
import { MarketplaceService, MarketplaceCreatorsService } from './marketplace.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  // ⚠️ 등록 순서: 구체 경로(/templates/**)를 먼저 → 그 다음 나머지 /api/marketplace/**.
  controllers: [MarketplaceController, MarketplaceCreatorsController],
  providers: [MarketplaceService, MarketplaceCreatorsService, JwtAuthGuard],
})
export class MarketplaceModule {}
