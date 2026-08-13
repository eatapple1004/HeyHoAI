import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceCreatorsController } from './marketplace-creators.controller';
import { MarketplaceService, MarketplaceCreatorsService } from './marketplace.service';
import { MarketplaceRepository } from './marketplace.repository';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  // ⚠️ 등록 순서: 구체 경로(/templates/**)를 먼저 → 그 다음 나머지 /api/marketplace/**.
  controllers: [MarketplaceController, MarketplaceCreatorsController],
  providers: [MarketplaceService, MarketplaceRepository, MarketplaceCreatorsService, JwtAuthGuard],
})
export class MarketplaceModule {}
