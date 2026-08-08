import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [MarketplaceController],
  providers: [MarketplaceService, JwtAuthGuard],
})
export class MarketplaceModule {}
