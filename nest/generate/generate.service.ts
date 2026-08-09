import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 생성 파이프라인 재사용(중복 금지) — 멀티파트·크레딧 정산·프로바이더 호출·백그라운드 작업이 얽혀 있어
//   레거시 핸들러를 그대로 실행한다(Nest는 라우팅·가드만 가져간다). pack·accounts와 동일한 방식.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generateRoute = require(path.join(__dirname, '..', '..', 'src', 'generate', 'generate.route.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const crypto = require('crypto');

export const generateHandlers = generateRoute.handlers;
export const UGC_MAX_PRODUCT_IMAGES = generateRoute.UGC_MAX_PRODUCT_IMAGES;

// 레거시와 동일한 multer 설정 — 저장경로(tmp/uploads)·uuid 파일명·10MB.
const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
export const GENERATE_UPLOAD_OPTIONS = {
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req: any, file: any, cb: any) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
};

// BGM 업로드 — tmp/bgm·원본 파일명(정규화)·50MB.
const bgmDir = path.join(process.cwd(), 'tmp', 'bgm');
fs.mkdirSync(bgmDir, { recursive: true });
export const BGM_UPLOAD_OPTIONS = {
  storage: multer.diskStorage({
    destination: bgmDir,
    filename: (_req: any, file: any, cb: any) => cb(null, file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
};

@Injectable()
export class GenerateService {
  /** 레거시 핸들러를 Express 시그니처 그대로 실행(응답은 핸들러가 직접 씀). */
  run(name: string, req: any, res: any, next: any) {
    return generateHandlers[name](req, res, next);
  }
}
