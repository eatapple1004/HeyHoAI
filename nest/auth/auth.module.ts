import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthApiService } from './auth.service';
import { CookieService } from '../common/security/cookie.service';
import { TokenService } from '../common/security/token.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserRepository } from './user.repository';
import { PasswordService } from './password.service';
import { TrialModule } from '../trial/trial.module';
import { AffiliateModule } from '../affiliate/affiliate.module';

@Module({
  imports: [TrialModule, AffiliateModule],   // 로그인=체험 시작 · 가입=추천 연결
  controllers: [AuthController],
  providers: [AuthApiService, UserRepository, PasswordService, CookieService, TokenService, JwtAuthGuard],
})
export class AuthModule {}
