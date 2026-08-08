import { Module } from '@nestjs/common';
import {
  ContentsController,
  PublishJobsController,
  CharacterPublishingController,
} from './publishing.controller';
import { PublishingService } from './publishing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [CharacterPublishingController, ContentsController, PublishJobsController],
  providers: [PublishingService, JwtAuthGuard],
})
export class PublishingModule {}
