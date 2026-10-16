import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { ShootModelDto, CreateShootModelDto, AngleJobDto, ShotDto, ShotResultDto } from './dto/shoot.dto';

// 학습·뱅크 파이프라인 재사용(중복 금지) — 힉스필드 호출·러너·과금은 레거시 shootModel.service.js 단일소스.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'shoot', 'shootModel.service.js'));

@Injectable()
export class ShootService {
  // 사진 파일 경로들 + 이름 → 모델 행 생성(과금 1회) + 백그라운드 러너 시작
  create(user: any, body: CreateShootModelDto, files: string[]): Promise<ShootModelDto> {
    let photoUrls: string[] = [];
    try { photoUrls = JSON.parse((body && body.photoUrls) || '[]'); } catch { photoUrls = []; }
    return legacy.create(user, { name: body && body.name, consent: body && body.consent, files, photoUrls });
  }

  // 프롬프트만으로 Soul 2 + 내 모델(또는 공식 모델 'yuna') — 새 컷 1~4장, Library 에 저장
  shot(user: any, id: string, body: ShotDto): Promise<ShotResultDto> {
    return legacy.shot(user, id, body || {});
  }

  // 사진 1장 → 다각도 잡 시작(과금 1회). 결과는 getAngles 로 폴링.
  startAngles(user: any, file: string | undefined): Promise<AngleJobDto> {
    return legacy.startAngles(user, file);
  }

  getAngles(user: any, id: string): Promise<AngleJobDto> {
    return legacy.getAngles(user, id);
  }

  list(user: any): Promise<ShootModelDto[]> {
    return legacy.list(user);
  }

  // 소유 아니면 404 statusCode 에러를 throw
  get(user: any, id: string): Promise<ShootModelDto> {
    return legacy.get(user, id);
  }
}
