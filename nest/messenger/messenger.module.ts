import { Module } from '@nestjs/common';
import { LineController } from './line.controller';
import { MessengerService } from './messenger.service';

/** (2026-10-18) 메신저 입구 — LINE 웹훅. 인증 가드 없음(서명 검증이 인증). 카톡 스킬 서버는 같은 모듈에 뒤에 붙는다. */
@Module({
  controllers: [LineController],
  providers: [MessengerService],
})
export class MessengerModule {}
