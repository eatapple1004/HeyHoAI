import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { BrandkitRepository } from './brandkit.repository';
import { BrandKitVo } from './vo/brand-kit.vo';
import { UpdateBrandKitDto } from './dto/brand-kit.dto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer');

// 로고 업로드 — 레거시와 동일한 저장경로(tmp/images)·파일명(logo_<uuid>)·5MB 제한.
const uploadDir = path.join(process.cwd(), 'tmp', 'images');
fs.mkdirSync(uploadDir, { recursive: true });
export const LOGO_MULTER_OPTIONS = {
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req: any, file: any, cb: any) =>
      cb(null, `logo_${crypto.randomUUID()}${path.extname(file.originalname) || '.png'}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
};

@Injectable()
export class BrandkitService {
  constructor(private readonly repo: BrandkitRepository) {}

  get(userId: string): Promise<BrandKitVo> {
    return this.repo.find(userId);
  }

  update(userId: string, body: UpdateBrandKitDto): Promise<BrandKitVo> {
    return this.repo.upsert(userId, body || {});
  }

  /** 업로드된 파일명을 /images/ 웹 경로로 저장(file:// 절대경로는 브라우저가 못 읽는다) */
  setLogo(userId: string, filename: string): Promise<BrandKitVo> {
    return this.repo.setLogo(userId, `/images/${filename}`);
  }
}
