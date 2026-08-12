import { Global, Module } from '@nestjs/common';
import { DbService } from './db.service';

/** 전역 모듈 — 모든 도메인 리포지토리가 DbService를 주입받는다(모듈마다 import 불필요). */
@Global()
@Module({
  providers: [DbService],
  exports: [DbService],
})
export class DbModule {}
