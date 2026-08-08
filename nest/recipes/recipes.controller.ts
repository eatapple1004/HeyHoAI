import { Controller, Get, Post, Body, Param, Query, Req, UseGuards, HttpCode } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// /api/recipes — 전 엔드포인트 인증 필요(= 레거시 requireAuth).
//   404 등 도메인 에러는 서비스가 throw → LegacyErrorFilter가 레거시와 동일 형식으로 응답.
@Controller('api/recipes')
@UseGuards(JwtAuthGuard)
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  // GET /api/recipes?mode=&vertical=
  @Get()
  list(@Query('mode') mode?: string, @Query('vertical') vertical?: string) {
    return { success: true, data: this.recipes.list(mode, vertical) };
  }

  // POST /api/recipes/:id/resolve { subjectId?, userSlots? }
  @Post(':id/resolve')
  @HttpCode(200) // 레거시 res.json=200
  async resolve(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return { success: true, data: await this.recipes.resolve(id, req.user.id, body) };
  }
}
