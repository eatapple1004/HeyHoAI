import { Controller, Get } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingDto } from './dto/pricing.dto';

// GET /api/pricing — 가격 단일소스(공개, 인증 불필요). 이제 레거시 대신 NestJS가 처리.
//   Spring의 @RestController + 생성자 주입(@Autowired)과 동일 패턴.
@Controller('api/pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  get(): PricingDto {
    return this.pricing.get();
  }
}
