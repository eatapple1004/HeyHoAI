import { Module } from '@nestjs/common';
import { ShootController } from './shoot.controller';
import { ShootService } from './shoot.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [ShootController],
  providers: [ShootService, JwtAuthGuard],
})
export class ShootModule {}
