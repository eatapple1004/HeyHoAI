import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CharactersService, REF_MULTER_OPTIONS } from './characters.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiResponse, ApiPaginated } from '../common/dto/api-response.dto';
import { CharacterVo } from './vo/character.vo';
import { CreateCharacterDto, RegisterCharacterDto, RegisterWithImageDto, SetReferenceImageDto, ListCharactersQueryDto } from './dto/character.dto';

// /api/characters — 전 엔드포인트 인증 필요(= 레거시 requireAuth).
//   ⚠️ 라우트 선언 순서: 고정 경로(/register, /register-with-image)를 :id보다 먼저.
//   ⚠️ 캐릭터 하위 미디어 경로(:id/images·videos·visual-presets)는 MediaController가 소유한다.
@Controller('api/characters')
@UseGuards(JwtAuthGuard)
export class CharactersController {
  constructor(private readonly characters: CharactersService) {}

  // POST /api/characters — Claude 기반 생성(레거시도 201)
  @Post()
  async create(@Req() req: any, @Body() body: CreateCharacterDto): Promise<ApiResponse<CharacterVo>> {
    return { success: true, data: await this.characters.create(req.user.id, body) };
  }

  // POST /api/characters/register — 간단 등록(멀티파트 referenceImage, 201)
  @Post('register')
  @UseInterceptors(FileInterceptor('referenceImage', REF_MULTER_OPTIONS))
  async register(@Req() req: any, @Body() body: RegisterCharacterDto, @UploadedFile() file: any): Promise<ApiResponse<CharacterVo>> {
    return { success: true, data: await this.characters.register(req.user.id, body, file) };
  }

  // POST /api/characters/register-with-image — 생성된 이미지 파일명으로 등록(201)
  @Post('register-with-image')
  async registerWithImage(@Req() req: any, @Body() body: RegisterWithImageDto): Promise<ApiResponse<CharacterVo>> {
    return { success: true, data: await this.characters.registerWithImage(req.user.id, body) };
  }

  // GET /api/characters — 목록(+pagination)
  @Get()
  async list(@Req() req: any, @Query() q: ListCharactersQueryDto): Promise<ApiPaginated<CharacterVo[]>> {
    const { data, pagination } = await this.characters.list(req.user.id, q);
    return { success: true, data, pagination };
  }

  // GET /api/characters/:id
  @Get(':id')
  async getById(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<CharacterVo>> {
    return { success: true, data: await this.characters.getById(req.user.id, id) };
  }

  // PUT /api/characters/:id/reference-image — 대표 이미지 지정
  @Put(':id/reference-image')
  async setReferenceImage(@Req() req: any, @Param('id') id: string, @Body() body: SetReferenceImageDto): Promise<ApiResponse<CharacterVo>> {
    return { success: true, data: await this.characters.setReferenceImage(req.user.id, id, (body || {}).imageId) };
  }

  // DELETE /api/characters/:id/reference-image — 대표 이미지 해제
  @Delete(':id/reference-image')
  async clearReferenceImage(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<CharacterVo>> {
    return { success: true, data: await this.characters.clearReferenceImage(req.user.id, id) };
  }

  // DELETE /api/characters/:id — 소프트 삭제(archived)
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string): Promise<ApiResponse<CharacterVo>> {
    return { success: true, data: await this.characters.remove(req.user.id, id) };
  }
}
