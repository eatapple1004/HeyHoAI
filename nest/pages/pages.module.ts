import { Module } from '@nestjs/common';
import { PagesController } from './pages.controller';
import { AssetsController } from './assets.controller';
import { PageGuard, AdminPageGuard } from './page-auth.guard';
import { TokenService } from '../common/security/token.service';
import { AffiliateModule } from '../affiliate/affiliate.module';

/**
 * 프론트 서빙(HTML 페이지 · 생성 미디어).
 *
 * ⚠️ **AppModule의 맨 마지막에 import**할 것 — `PagesController`의 `:name`(클린 URL)이
 *   단일 세그먼트를 전부 잡으므로, API 컨트롤러보다 뒤에 등록돼야 한다.
 */
@Module({
  imports: [AffiliateModule],   // /r/:code 클릭 기록
  controllers: [AssetsController, PagesController],
  providers: [PageGuard, AdminPageGuard, TokenService],
})
export class PagesModule {}
