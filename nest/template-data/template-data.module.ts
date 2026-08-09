import { Module } from '@nestjs/common';
import { TemplateDataController } from './template-data.controller';
import { TemplateDataService } from './template-data.service';
import { TemplateDataRepository } from './template-data.repository';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [TemplateDataController],
  providers: [TemplateDataService, TemplateDataRepository, JwtAuthGuard],
})
export class TemplateDataModule {}
