import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { OwnershipService } from '../common/security/ownership.service';
import { AccountsRepository } from './accounts.repository';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService, AccountsRepository, OwnershipService, JwtAuthGuard],
})
export class AccountsModule {}
