import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 팩 파이프라인 재사용(중복 금지) — 멀티파트·HEIC 정규화·크레딧 정산·백그라운드 작업이 얽혀 있어
//   레거시 핸들러를 그대로 실행한다(Nest는 라우팅·가드·에러 필터만 가져간다).
//   ⚠️ 팩 응답은 다른 도메인과 달리 {success,data} 봉투를 쓰지 않는다({...}/{error}) — 핸들러 위임이 형태 보존에도 안전.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packRoute = require(path.join(__dirname, '..', '..', 'src', 'pack', 'pack.route.js'));

export const packHandlers = packRoute.handlers;
// 응답 수집 어댑터가 만든 데이터 반환 버전 — Nest가 응답을 직접 만든다(@Res 위임 제거).
const ops = packRoute.ops;
// 조회 API — 데이터만 반환하는 단일소스(@Res() 위임 없이 컨트롤러가 직접 호출).
const reads = packRoute.reads;
// 업로드 정규화(HEIC→JPEG 변환·매직바이트 검증) — 멀티파트 라우트에서 핸들러 앞에 태운다.
export const normalizeUploads = packRoute.normalizeUploads;
// 레거시와 동일한 multer 설정(tmp/uploads 디스크 저장·12MB) — FileInterceptor에 그대로 넘긴다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodePath = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
const packUploadDir = nodePath.join(process.cwd(), 'tmp', 'uploads');
fs.mkdirSync(packUploadDir, { recursive: true });
export const PACK_UPLOAD_OPTIONS = {
  storage: multer.diskStorage({ destination: packUploadDir }),
  limits: { fileSize: 12 * 1024 * 1024 },
};

@Injectable()
export class PackService {
  /** 핸들러를 실행하고 응답을 { status, body }로 받는다(응답 쓰기는 Nest가 담당). */
  op(name: string, req: any): Promise<{ status: number; body: any }> {
    return ops[name](req);
  }

  /** 팩 상태 폴링(숫자 id 또는 shareId). 미존재는 statusCode 404 에러. */
  pack(userId: string, key: string) {
    return reads.pack(userId, key);
  }
}
