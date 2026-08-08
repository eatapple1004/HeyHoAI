import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [TeamsController],
  providers: [TeamsService, JwtAuthGuard],
})
export class TeamsModule {}
