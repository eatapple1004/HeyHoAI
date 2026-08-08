import { Controller, Get, Post, Param, Req, Res, Next, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PackService, normalizeUploads, PACK_UPLOAD_OPTIONS } from './pack.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// /api/pack — 콘텐츠 팩(분류 → 레퍼 굽기 → 컷 생성 → 영상). 전 엔드포인트 인증 필요(= 레거시 requireAuth).
//   응답은 핸들러가 직접 쓴다(@Res) — 202 + 백그라운드 작업, {error} 형태 에러, 스트리밍 없는 fire-and-respond 패턴을
//   그대로 보존하기 위함. 파이프라인 로직은 src/pack/pack.route.js 단일소스.
@Controller('api/pack')
@UseGuards(JwtAuthGuard)
export class PackController {
  constructor(private readonly pack: PackService) {}

  // POST /api/pack/classify (multipart photos[]) — 제품 분류 + 굽기 비용/잔여
  @Post('classify')
  @UseInterceptors(FilesInterceptor('photos', 10, PACK_UPLOAD_OPTIONS))
  classify(@Req() req: any, @Res() res: any, @Next() next: any) {
    // HEIC 정규화(레거시 미들웨어)를 태운 뒤 핸들러 실행 — 순서·거절 응답까지 레거시와 동일.
    return normalizeUploads(req, res, () => this.pack.run('classify', req, res, next));
  }

  // POST /api/pack (multipart photos[]) — 팩 생성(202 + 백그라운드 준비)
  @Post()
  @UseInterceptors(FilesInterceptor('photos', 10, PACK_UPLOAD_OPTIONS))
  create(@Req() req: any, @Res() res: any, @Next() next: any) {
    return normalizeUploads(req, res, () => this.pack.run('create', req, res, next));
  }

  // GET /api/pack/:id — 팩 상태 폴링(id 또는 shareId)
  @Get(':id')
  getPack(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.pack.run('getPack', req, res, next);
  }

  // POST /api/pack/:id/generate — 레퍼 게이트 통과 → 컷 생성 시작(크레딧 차감)
  @Post(':id/generate')
  generate(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.pack.run('generate', req, res, next);
  }

  // POST /api/pack/:id/resume — 중단분 이어서 만들기
  @Post(':id/resume')
  resume(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.pack.run('resume', req, res, next);
  }

  // POST /api/pack/:id/extend — 컷 더 만들기
  @Post(':id/extend')
  extend(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.pack.run('extend', req, res, next);
  }

  // POST /api/pack/:id/more-like — "이런 걸로 더" 재기획
  @Post(':id/more-like')
  moreLike(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.pack.run('moreLike', req, res, next);
  }

  // POST /api/pack/:id/concept-more — 컨셉(컷 라이브러리) 추가
  @Post(':id/concept-more')
  conceptMore(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.pack.run('conceptMore', req, res, next);
  }

  // POST /api/pack/:id/video — 팩 재료로 광고 영상 1편
  @Post(':id/video')
  video(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.pack.run('video', req, res, next);
  }

  // POST /api/pack/:id/regenerate-cut — 컷 재생성
  @Post(':id/regenerate-cut')
  regenerateCut(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.pack.run('regenerateCut', req, res, next);
  }

  // POST /api/pack/:id/rebake-ref — 기준 레퍼 재굽기(주기당 무료 한도 적용)
  @Post(':id/rebake-ref')
  rebakeRef(@Req() req: any, @Res() res: any, @Next() next: any) {
    return this.pack.run('rebakeRef', req, res, next);
  }
}
