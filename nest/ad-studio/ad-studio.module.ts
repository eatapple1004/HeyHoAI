import { Module } from '@nestjs/common';
import { AdStudioController } from './ad-studio.controller';
import { AdStudioService } from './ad-studio.service';
import { AdStudioRepository } from './ad-studio.repository';
import { PromptCompilerService } from './prompt-compiler.service';
import { ShotPlannerService } from './shot-planner.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [AdStudioController],
  providers: [AdStudioService, AdStudioRepository, PromptCompilerService, ShotPlannerService, JwtAuthGuard],
})
export class AdStudioModule {}
