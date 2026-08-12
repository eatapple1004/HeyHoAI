import { Module } from '@nestjs/common';
import {
  ContentsController,
  PublishJobsController,
  CharacterPublishingController,
} from './publishing.controller';
import { PublishingService } from './publishing.service';
import { PublishingRepository } from './publishing.repository';
import { CharacterRepository } from '../characters/character.repository';
import { MediaRepository } from '../media/media.repository';
import { OwnershipService } from '../common/security/ownership.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [CharacterPublishingController, ContentsController, PublishJobsController],
  providers: [PublishingService, PublishingRepository, CharacterRepository, MediaRepository, OwnershipService, JwtAuthGuard],
})
export class PublishingModule {}
