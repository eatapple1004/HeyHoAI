import { Global, Module } from '@nestjs/common';
import { EnvDbService } from './env-db.service';

/** 전역 — 환경 교차 조회를 쓰는 관리자 화면이 여럿이라 풀을 한 벌만 유지한다. */
@Global()
@Module({
  providers: [EnvDbService],
  exports: [EnvDbService],
})
export class EnvDbModule {}
