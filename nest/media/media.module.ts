import { Module } from '@nestjs/common';
import {
  CharacterMediaController,
  ImagesController,
  VideosController,
  VisualsController,
} from './media.controller';
import { MediaService } from './media.service';
import { CharactersController } from '../characters/characters.controller';
import { CharactersService } from '../characters/characters.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// 캐릭터와 그 하위 미디어(이미지·영상·비주얼)는 /api/characters 경로를 공유하므로 한 모듈로 묶는다.
//   ⚠️ 등록 순서: 구체 경로(:characterId/images…)를 가진 CharacterMediaController가 먼저.
@Module({
  controllers: [
    CharacterMediaController,
    CharactersController,
    ImagesController,
    VideosController,
    VisualsController,
  ],
  providers: [MediaService, CharactersService, JwtAuthGuard],
})
export class MediaModule {}
