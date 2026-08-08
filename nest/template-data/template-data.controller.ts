import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { TemplateDataService } from './template-data.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// /api/template-data — 사용자별 저장 템플릿 데이터. 전 엔드포인트 인증 필요(= 레거시 requireAuth).
@Controller('api/template-data')
@UseGuards(JwtAuthGuard)
export class TemplateDataController {
  constructor(private readonly templateData: TemplateDataService) {}

  // POST /api/template-data (레거시도 201)
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    return { success: true, data: await this.templateData.create(req.user.id, body) };
  }

  // GET /api/template-data?templateType=&characterId=
  @Get()
  async list(@Req() req: any, @Query() q: any) {
    return { success: true, data: await this.templateData.list(req.user.id, q) };
  }

  // GET /api/template-data/:id
  @Get(':id')
  async getById(@Req() req: any, @Param('id') id: string) {
    return { success: true, data: await this.templateData.getById(req.user.id, id) };
  }

  // PATCH /api/template-data/:id
  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return { success: true, data: await this.templateData.update(req.user.id, id, body) };
  }

  // DELETE /api/template-data/:id
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return { success: true, data: await this.templateData.remove(req.user.id, id) };
  }
}
