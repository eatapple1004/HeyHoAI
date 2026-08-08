import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 브랜드킷 로직 재사용(중복 금지) — DB·업로드 설정은 레거시 brandkit.service.js 단일소스가 담당.
//   dist/brandkit/brandkit.service.js 기준 ../../src/... = <repo>/src/...
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'brandkit', 'brandkit.service.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer');

// FileInterceptor에 넘길 multer 옵션 — 레거시와 동일한 저장경로·파일명·5MB 제한을 공유한다.
export const LOGO_MULTER_OPTIONS = legacy.multerOptions(multer);

@Injectable()
export class BrandkitService {
  // 사용자 브랜드킷 조회(없으면 기본값)
  get(userId: string) {
    return legacy.getBrandKit(userId);
  }

  // 색상·폰트·사용여부 부분 수정(upsert)
  update(userId: string, body: any) {
    return legacy.updateBrandKit(userId, body || {});
  }

  // 업로드된 로고 파일명을 브랜드킷에 반영
  setLogo(userId: string, filename: string) {
    return legacy.setLogo(userId, filename);
  }
}
