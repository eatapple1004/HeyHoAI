import { Injectable } from '@nestjs/common';
import { AffiliateStatsDto } from './dto/affiliate.dto';
import * as path from 'path';

// 추천(어필리에이트) 로직 재사용(중복 금지) — 코드 발급·집계는 레거시 affiliate.service.js가 담당.
//   dist/affiliate/affiliate.service.js 기준 ../../src/... = <repo>/src/...
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'affiliate', 'affiliate.service.js'));

@Injectable()
export class AffiliateService {
  // 내 추천 코드 + 클릭·가입·커미션 통계
  getStats(userId: string): Promise<AffiliateStatsDto> {
    return legacy.getStats(userId);
  }
}
