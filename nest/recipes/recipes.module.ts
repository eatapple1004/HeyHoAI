import { Module } from '@nestjs/common';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [RecipesController],
  providers: [RecipesService, JwtAuthGuard],
})
export class RecipesModule {}
