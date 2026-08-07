import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 가격 단일소스는 기존 src/pricing/pricing.config.js를 그대로 재사용(데이터 중복 금지, 이관 중엔 로직만 Nest로).
//   dist/pricing/pricing.service.js 기준 ../../src/pricing/pricing.config.js = <repo>/src/pricing/pricing.config.js
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getPricing } = require(path.join(__dirname, '..', '..', 'src', 'pricing', 'pricing.config.js'));

// Spring의 @Service에 대응 — 비즈니스 로직 계층.
@Injectable()
export class PricingService {
  get() {
    return getPricing();
  }
}
