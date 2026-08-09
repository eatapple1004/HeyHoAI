import { Module } from '@nestjs/common';
import { BrandkitController } from './brandkit.controller';
import { BrandkitService } from './brandkit.service';
import { BrandkitRepository } from './brandkit.repository';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [BrandkitController],
  providers: [BrandkitService, BrandkitRepository, JwtAuthGuard],
})
export class BrandkitModule {}
