import { Module } from '@nestjs/common';
import { TemplateDataController } from './template-data.controller';
import { TemplateDataService } from './template-data.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [TemplateDataController],
  providers: [TemplateDataService, JwtAuthGuard],
})
export class TemplateDataModule {}
