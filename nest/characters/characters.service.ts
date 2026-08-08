import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 캐릭터 오케스트레이션 재사용(중복 금지) — 레거시 character.api.js 단일소스.
//   dist/characters/characters.service.js 기준 ../../src/... = <repo>/src/...
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'characters', 'character.api.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer');

// register(멀티파트) 업로드 설정 — 레거시와 동일한 저장경로·파일명(ref_<uuid>)·10MB 제한 공유.
export const REF_MULTER_OPTIONS = legacy.refUploadOptions(multer);

@Injectable()
export class CharactersService {
  create(userId: string, body: any) {
    return legacy.create(userId, body);
  }

  getById(userId: string, id: string) {
    return legacy.getById(userId, id);
  }

  // { data, pagination } — pagination은 응답 최상위 필드라 컨트롤러가 펼쳐서 내려준다.
  list(userId: string, q: any) {
    return legacy.list(userId, q || {});
  }

  setReferenceImage(userId: string, id: string, imageId: string) {
    return legacy.setReferenceImage(userId, id, imageId);
  }

  clearReferenceImage(userId: string, id: string) {
    return legacy.clearReferenceImage(userId, id);
  }

  register(userId: string, body: any, file: any) {
    return legacy.register(userId, body || {}, file);
  }

  registerWithImage(userId: string, body: any) {
    return legacy.registerWithImage(userId, body || {});
  }

  remove(userId: string, id: string) {
    return legacy.remove(userId, id);
  }
}
