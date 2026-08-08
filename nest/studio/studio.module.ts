import { Module } from '@nestjs/common';
import { StudioController } from './studio.controller';
import { StudioService } from './studio.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [StudioController],
  providers: [StudioService, JwtAuthGuard],
})
export class StudioModule {}
