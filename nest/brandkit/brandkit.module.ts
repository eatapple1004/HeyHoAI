import { Module } from '@nestjs/common';
import { BrandkitController } from './brandkit.controller';
import { BrandkitService } from './brandkit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [BrandkitController],
  providers: [BrandkitService, JwtAuthGuard],
})
export class BrandkitModule {}
