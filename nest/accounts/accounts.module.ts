import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService, JwtAuthGuard],
})
export class AccountsModule {}
