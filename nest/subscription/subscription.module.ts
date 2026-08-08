import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, JwtAuthGuard],
})
export class SubscriptionModule {}
