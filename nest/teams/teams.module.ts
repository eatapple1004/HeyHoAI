import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { TeamRepository } from './team.repository';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [TeamsController],
  providers: [TeamsService, TeamRepository, JwtAuthGuard],
})
export class TeamsModule {}
