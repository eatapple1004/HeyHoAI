import { Module } from '@nestjs/common';
import { StudioController } from './studio.controller';
import { StudioService } from './studio.service';
import { StudioRepository } from './studio.repository';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [StudioController],
  providers: [StudioService, StudioRepository, JwtAuthGuard],
})
export class StudioModule {}
