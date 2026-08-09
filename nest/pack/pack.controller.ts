import {
  Controller, Get, Post, Param, Req, Res, UseGuards, UseInterceptors, HttpException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PackService, normalizeUploads, PACK_UPLOAD_OPTIONS } from './pack.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * /api/pack — 콘텐츠 팩(분류 → 레퍼 굽기 → 컷 생성 → 영상). 전 엔드포인트 인증 필요.
 *
 * ⚠️ 이 도메인은 응답 봉투가 다르다 — 성공은 **객체 그대로**, 에러는 `{ error }`.
 *   더 이상 @Res()로 레거시 핸들러에 통째 위임하지 않는다. 응답 수집 어댑터(ops)가
 *   { status, body }를 돌려주고, **Nest가 응답을 만든다**(상태코드는 passthrough로 지정).
 *   생성 파이프라인 자체(멀티파트·크레딧 정산·setImmediate 백그라운드)는 src/pack 단일소스 유지.
 */
@Controller('api/pack')
@UseGuards(JwtAuthGuard)
export class PackController {
  constructor(private readonly pack: PackService) {}

  /** ops 결과를 Nest 응답으로 변환 — 4xx/5xx는 예외로 올려 전역 필터가 처리하게 한다. */
  private send(res: any, out: { status: number; body: any }) {
    if (out.status >= 400) throw new HttpException(out.body, out.status);
    if (out.status !== 200) res.status(out.status); // 예: 팩 생성 202
    return out.body;
  }

  // POST /api/pack/classify (multipart photos[]) — 제품 분류 + 굽기 비용/잔여
  @Post('classify')
  @UseInterceptors(FilesInterceptor('photos', 10, PACK_UPLOAD_OPTIONS))
  async classify(@Req() req: any, @Res({ passthrough: true }) res: any) {
    await new Promise<void>((resolve, reject) =>
      normalizeUploads(req, res, (e: any) => (e ? reject(e) : resolve())),
    );
    return this.send(res, await this.pack.op('classify', req));
  }

  // POST /api/pack (multipart photos[]) — 팩 생성(202 + 백그라운드 준비)
  @Post()
  @UseInterceptors(FilesInterceptor('photos', 10, PACK_UPLOAD_OPTIONS))
  async create(@Req() req: any, @Res({ passthrough: true }) res: any) {
    await new Promise<void>((resolve, reject) =>
      normalizeUploads(req, res, (e: any) => (e ? reject(e) : resolve())),
    );
    return this.send(res, await this.pack.op('create', req));
  }

  // GET /api/pack/:id — 팩 상태 폴링(id 또는 shareId)
  @Get(':id')
  async getPack(@Req() req: any, @Param('id') id: string) {
    try {
      return await this.pack.pack(req.user.id, id);
    } catch (err: any) {
      // 팩 도메인은 {success,error}가 아니라 {error} 형태 — 전역 필터 대신 여기서 맞춘다.
      if (err && err.statusCode) throw new HttpException({ error: err.message }, err.statusCode);
      throw err;
    }
  }

  // POST /api/pack/:id/generate — 레퍼 게이트 통과 → 컷 생성 시작(크레딧 차감)
  @Post(':id/generate')
  async generate(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.pack.op('generate', req));
  }

  // POST /api/pack/:id/resume — 중단분 이어서 만들기
  @Post(':id/resume')
  async resume(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.pack.op('resume', req));
  }

  // POST /api/pack/:id/extend — 컷 더 만들기
  @Post(':id/extend')
  async extend(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.pack.op('extend', req));
  }

  // POST /api/pack/:id/more-like — "이런 걸로 더" 재기획
  @Post(':id/more-like')
  async moreLike(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.pack.op('moreLike', req));
  }

  // POST /api/pack/:id/concept-more — 컨셉(컷 라이브러리) 추가
  @Post(':id/concept-more')
  async conceptMore(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.pack.op('conceptMore', req));
  }

  // POST /api/pack/:id/video — 팩 재료로 광고 영상 1편
  @Post(':id/video')
  async video(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.pack.op('video', req));
  }

  // POST /api/pack/:id/regenerate-cut — 컷 재생성
  @Post(':id/regenerate-cut')
  async regenerateCut(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.pack.op('regenerateCut', req));
  }

  // POST /api/pack/:id/rebake-ref — 기준 레퍼 재굽기(주기당 무료 한도 적용)
  @Post(':id/rebake-ref')
  async rebakeRef(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return this.send(res, await this.pack.op('rebakeRef', req));
  }
}
