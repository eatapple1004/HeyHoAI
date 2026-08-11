import { Controller, Get, Next, Param, Req, Res } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

// R2/S3 래퍼는 엔진(외부 스토리지 SDK) — 이식 대상 아님.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mediaStore = require(path.join(__dirname, '..', '..', 'src', 'storage', 'mediaStore.js'));

const IMAGES_DIR = path.join(process.cwd(), 'tmp', 'images');
/**
 * /images 파일명은 전부 UUID(콘텐츠 주소) = 불변 → 30일 immutable 캐시.
 * 편집·버전전환마다 같은 영상을 다시 받지 않는다(파일명이 바뀌면 URL도 바뀌므로 스테일 없음).
 */
const IMG_CACHE_MS = 1000 * 60 * 60 * 24 * 30;

/**
 * 생성 미디어 서빙 — **스토리지 인지(storage-aware)**.
 *   ① 로컬 파일 우선(과거 파일·같은 프로세스 생성물, `sendFile`이 Range를 처리해 영상 seek 정상)
 *   ② 없으면 오브젝트 스토리지: 공개 버킷이면 302 오프로드, 비공개면 앱이 프록시 스트리밍(Range 전달)
 *   ③ 둘 다 없으면 next() → 404
 */
@Controller('images')
export class AssetsController {
  @Get(':file')
  async serve(@Param('file') file: string, @Req() req: any, @Res() res: any, @Next() next: any) {
    const name = path.basename(file);   // path traversal 방지
    const local = path.join(IMAGES_DIR, name);
    if (fs.existsSync(local)) return res.sendFile(local, { maxAge: IMG_CACHE_MS, immutable: true });
    if (!mediaStore.isRemote()) return next();   // 로컬 전용 모드 → 404

    const remote = mediaStore.remoteUrl(name);
    if (remote) return res.redirect(302, remote);

    try {
      const obj = await mediaStore.getObject(name, req.headers.range);
      if (!obj || !obj.Body) return next();
      res.setHeader('Cache-Control', `public, max-age=${Math.floor(IMG_CACHE_MS / 1000)}, immutable`);
      if (obj.ContentType) res.setHeader('Content-Type', obj.ContentType);
      if (obj.ContentLength != null) res.setHeader('Content-Length', obj.ContentLength);
      res.setHeader('Accept-Ranges', 'bytes');
      if (obj.ContentRange) { res.status(206); res.setHeader('Content-Range', obj.ContentRange); }
      obj.Body.on('error', () => { if (!res.headersSent) res.status(502); res.end(); });
      return obj.Body.pipe(res);
    } catch {
      return next();
    }
  }
}
