import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthApiService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthApiService, JwtAuthGuard],
})
export class AuthModule {}
