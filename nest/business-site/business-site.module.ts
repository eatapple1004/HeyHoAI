import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPageGuard } from '../pages/page-auth.guard';
import { TokenService } from '../common/security/token.service';
import { BusinessSiteAdminController, BusinessSitePagesController } from './business-site.controller';
import { BusinessSiteService } from './business-site.service';
import { BusinessSiteRepository } from './business-site.repository';
import { SiteWriterService } from './site-writer.service';
import { CorpWriterService } from './corp-writer.service';
import { ProcessWriterService } from './process-writer.service';
import { DesignService } from './design/design.service';
import { DesignWriterService } from './design/design-writer.service';

/**
 * (2026-10-19) 사업체 홈페이지 — 카카오·구글·네이버 공식 API로 자료를 모아 업종별 템플릿 + AI 문구로 만든다.
 *   관리자: /admin-business/:id/site · API /api/admin/business/:id/site/*
 *   공개:   /site/:slug (published 만)
 */
@Module({
  controllers: [BusinessSiteAdminController, BusinessSitePagesController],
  providers: [BusinessSiteService, BusinessSiteRepository, SiteWriterService, CorpWriterService, ProcessWriterService, DesignService, DesignWriterService, AdminGuard, AdminPageGuard, TokenService],
})
export class BusinessSiteModule {}
