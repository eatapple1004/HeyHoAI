import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthApiService } from './auth.service';
import { CookieService } from '../common/security/cookie.service';
import { TokenService } from '../common/security/token.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthApiService, CookieService, TokenService, JwtAuthGuard],
})
export class AuthModule {}
