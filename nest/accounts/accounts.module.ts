import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { OwnershipService } from '../common/security/ownership.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService, OwnershipService, JwtAuthGuard],
})
export class AccountsModule {}
