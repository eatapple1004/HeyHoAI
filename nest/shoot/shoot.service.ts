import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { ShootModelDto } from './dto/shoot.dto';

// 학습·뱅크 파이프라인 재사용(중복 금지) — 힉스필드 호출·러너·과금은 레거시 shootModel.service.js 단일소스.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'shoot', 'shootModel.service.js'));

@Injectable()
export class ShootService {
  // 사진 파일 경로들 + 이름 → 모델 행 생성(과금 1회) + 백그라운드 러너 시작
  create(user: any, name: string | undefined, files: string[]): Promise<ShootModelDto> {
    return legacy.create(user, { name, files });
  }

  list(user: any): Promise<ShootModelDto[]> {
    return legacy.list(user);
  }

  // 소유 아니면 404 statusCode 에러를 throw
  get(user: any, id: string): Promise<ShootModelDto> {
    return legacy.get(user, id);
  }
}
