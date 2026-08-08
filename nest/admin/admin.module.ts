import { Module } from '@nestjs/common';
import { AdminDataController, AdminProposalController, AdminRefineController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from '../auth/admin.guard';

@Module({
  // ⚠️ 등록 순서: 더 구체적인 /api/admin/proposal 컨트롤러를 먼저.
  controllers: [AdminProposalController, AdminRefineController, AdminDataController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
