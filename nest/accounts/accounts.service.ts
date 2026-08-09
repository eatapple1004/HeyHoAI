import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 계정(소셜) 파이프라인 재사용(중복 금지) — Zernio 동기화·Gemini 의상생성·Kling 릴스·발행 큐·미디어 업로드가
//   한 핸들러에 얽혀 있어 레거시 핸들러를 그대로 실행한다(Nest는 라우팅·가드만 가져간다). pack과 동일한 방식.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const accountRoute = require(path.join(__dirname, '..', '..', 'src', 'publishing', 'account.route.js'));
// 레거시 router.param('id')가 하던 계정 소유권 검증 — Nest에선 컨트롤러가 직접 호출한다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { assertAccountOwned } = require(path.join(__dirname, '..', '..', 'src', 'middleware', 'ownership.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

export const accountHandlers = accountRoute.handlers;

// 레거시와 동일한 multer 설정(tmp/images 디스크 저장·100MB) — FileInterceptor에 그대로 넘긴다.
const uploadDir = path.join(process.cwd(), 'tmp', 'images');
fs.mkdirSync(uploadDir, { recursive: true });
// eslint-disable-next-line @typescript-eslint/no-var-requires
const crypto = require('crypto');
export const ACCOUNT_UPLOAD_OPTIONS = {
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req: any, file: any, cb: any) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
};

@Injectable()
export class AccountsService {
  /** 계정 소유권 검증(= 레거시 router.param('id')). 실패 시 statusCode 에러 throw. */
  assertOwned(accountId: string, userId: string) {
    return assertAccountOwned(accountId, userId);
  }

  /** 레거시 핸들러를 Express 시그니처 그대로 실행(응답은 핸들러가 직접 씀). */
  run(name: string, req: any, res: any, next: any) {
    return accountHandlers[name](req, res, next);
  }
}
