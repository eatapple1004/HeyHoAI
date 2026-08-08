import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BrandkitService, LOGO_MULTER_OPTIONS } from './brandkit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// /api/brand-kit — 전 엔드포인트 인증 필요(= 레거시 requireAuth).
//   응답 형식은 레거시와 동일하게 { success, data } 유지.
@Controller('api/brand-kit')
@UseGuards(JwtAuthGuard)
export class BrandkitController {
  constructor(private readonly brandkit: BrandkitService) {}

  // GET /api/brand-kit
  @Get()
  async get(@Req() req: any) {
    return { success: true, data: await this.brandkit.get(req.user.id) };
  }

  // PATCH /api/brand-kit { primaryColor?, fontName?, enabled? }
  @Patch()
  async update(@Req() req: any, @Body() body: any) {
    return { success: true, data: await this.brandkit.update(req.user.id, body) };
  }

  // POST /api/brand-kit/logo (multipart: logo)
  //   multipart는 express.json이 건드리지 않으므로 FileInterceptor(multer)가 그대로 파싱한다.
  @Post('logo')
  @HttpCode(200) // 레거시 res.json=200에 맞춤(Nest POST 기본 201 방지)
  @UseInterceptors(FileInterceptor('logo', LOGO_MULTER_OPTIONS))
  async uploadLogo(@Req() req: any, @UploadedFile() file: any) {
    if (!file) {
      throw new HttpException({ success: false, error: 'logo file required' }, 400);
    }
    return { success: true, data: await this.brandkit.setLogo(req.user.id, file.filename) };
  }
}
