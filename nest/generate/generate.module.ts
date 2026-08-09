import { Module } from '@nestjs/common';
import { GenerateController } from './generate.controller';
import { GenerateService } from './generate.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [GenerateController],
  providers: [GenerateService, JwtAuthGuard],
})
export class GenerateModule {}
