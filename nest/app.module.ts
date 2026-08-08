import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { PricingModule } from './pricing/pricing.module';
import { CreditsModule } from './credits/credits.module';
import { BillingModule } from './billing/billing.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BrandkitModule } from './brandkit/brandkit.module';
import { TeamsModule } from './teams/teams.module';
import { AffiliateModule } from './affiliate/affiliate.module';
import { RecipesModule } from './recipes/recipes.module';
import { StudioModule } from './studio/studio.module';
import { MarketplaceModule } from './marketplace/marketplace.module';

// NestJS 이관 루트 모듈 — 포팅한 도메인 모듈을 여기 imports에 하나씩 추가한다.
@Module({
  imports: [
    PricingModule,
    CreditsModule,
    BillingModule,
    SubscriptionModule,
    DashboardModule,
    BrandkitModule,
    TeamsModule,
    AffiliateModule,
    RecipesModule,
    StudioModule,
    MarketplaceModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
