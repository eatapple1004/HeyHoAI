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
import { MediaModule } from './media/media.module';
import { CharactersModule } from './characters/characters.module';
import { DbModule } from './db/db.module';
import { WalletModule } from './credits/wallet.module';
import { PagesModule } from './pages/pages.module';
import { SecurityModule } from './common/security/security.module';
import { TemplateDataModule } from './template-data/template-data.module';
import { TrialModule } from './trial/trial.module';
import { PublishingModule } from './publishing/publishing.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { PackModule } from './pack/pack.module';
import { AccountsModule } from './accounts/accounts.module';
import { GenerateModule } from './generate/generate.module';

// NestJS 이관 루트 모듈 — 포팅한 도메인 모듈을 여기 imports에 하나씩 추가한다.
@Module({
  imports: [
    DbModule,               // 전역 — 리포지토리가 DbService를 주입받는다
    WalletModule,           // 전역 — 개인/팀 크레딧(거의 모든 도메인이 사용)
    SecurityModule,     // 전역 — 소유권 검증(OwnershipService)·JWT(TokenService)
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
    MediaModule,
    CharactersModule,   // ⚠️ MediaModule 뒤 — :characterId/** 구체 경로가 :id보다 먼저 등록돼야 한다
    TemplateDataModule,
    TrialModule,
    PublishingModule,
    AdminModule,
    AuthModule,
    PackModule,
    AccountsModule,
    GenerateModule,
    PagesModule,          // ⚠️ 반드시 마지막 — 클린 URL(:name)이 단일 세그먼트를 전부 잡는다
  ],
  controllers: [HealthController],
})
export class AppModule {}
