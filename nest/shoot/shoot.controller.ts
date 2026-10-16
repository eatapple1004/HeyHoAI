import { Controller, Get, Post, Body, Param, Req, UseGuards, UseInterceptors, UploadedFiles, HttpCode } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ShootService } from './shoot.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiResponse } from '../common/dto/api-response.dto';
import { GENERATE_UPLOAD_OPTIONS } from '../generate/generate.service';
import { ShootModelDto, CreateShootModelDto } from './dto/shoot.dto';

// /api/shoot — Doppia Shoot 내 모델(Soul ID 학습 + 장면 뱅크). 전 엔드포인트 인증 필요.
//   404·400·503 등 도메인 에러는 서비스가 statusCode 로 throw → LegacyErrorFilter 가 레거시와 동일 형식으로 응답.
@Controller('api/shoot')
@UseGuards(JwtAuthGuard)
export class ShootController {
  constructor(private readonly shoot: ShootService) {}

  // POST /api/shoot/models — multipart photos(1~20) + name. 사진 1장이면 다각도부터 만든다.
  @Post('models')
  @HttpCode(200) // 레거시 res.json=200
  @UseInterceptors(FileFieldsInterceptor([{ name: 'photos', maxCount: 20 }], GENERATE_UPLOAD_OPTIONS))
  async create(@Req() req: any, @UploadedFiles() files: { photos?: Array<{ path: string }> }, @Body() body: CreateShootModelDto): Promise<ApiResponse<ShootModelDto>> {
    return { success: true, data: await this.shoot.create(req.user, body, ((files && files.photos) || []).map((f) => f.path)) };
  }

  // GET /api/shoot/models — 내(또는 활성 팀) 모델 전부. 멈춘 진행 건은 여기서 재개된다.
  @Get('models')
  async list(@Req() req: any): Promise<ApiResponse<ShootModelDto[]>> {
    return { success: true, data: await this.shoot.list(req.user) };
  }

  // GET /api/shoot/models/:id — 진행 상태 폴링
  @Get('models/:id')
  async get(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<ShootModelDto>> {
    return { success: true, data: await this.shoot.get(req.user, id) };
  }
}
