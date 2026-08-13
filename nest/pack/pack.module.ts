import { Module } from '@nestjs/common';
import { PackController } from './pack.controller';
import { PackService } from './pack.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [PackController],
  providers: [PackService, JwtAuthGuard],
})
export class PackModule {}
