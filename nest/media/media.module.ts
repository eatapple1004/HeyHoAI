import { Module } from '@nestjs/common';
import {
  CharacterMediaController,
  ImagesController,
  VideosController,
  VisualsController,
} from './media.controller';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// 캐릭터 하위 미디어(이미지·영상·비주얼). 캐릭터 자체는 CharactersModule이 담당한다.
//   ⚠️ AppModule imports 순서: MediaModule을 CharactersModule보다 먼저 — 구체 경로(:characterId/images…)가 :id보다 앞서야 한다.
@Module({
  controllers: [
    CharacterMediaController,
    ImagesController,
    VideosController,
    VisualsController,
  ],
  providers: [MediaService, JwtAuthGuard],
})
export class MediaModule {}
