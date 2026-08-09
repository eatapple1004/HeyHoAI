import { Module } from '@nestjs/common';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { CharacterRepository } from './character.repository';
import { MediaRepository } from '../media/media.repository';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/** 캐릭터 도메인 — 컨트롤러 · 서비스 · 리포지토리 3계층이 전부 nest/ 안에 있는 첫 도메인. */
@Module({
  controllers: [CharactersController],
  providers: [CharactersService, CharacterRepository, MediaRepository, JwtAuthGuard],
  exports: [CharactersService, CharacterRepository],
})
export class CharactersModule {}
