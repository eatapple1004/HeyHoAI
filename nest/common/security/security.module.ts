import { Global, Module } from '@nestjs/common';
import { OwnershipService } from './ownership.service';
import { TokenService } from './token.service';

/** 전역 보안 모듈 — 소유권 검증·JWT를 모든 도메인이 주입받는다. */
@Global()
@Module({
  providers: [OwnershipService, TokenService],
  exports: [OwnershipService, TokenService],
})
export class SecurityModule {}
