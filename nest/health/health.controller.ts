import { Controller, Get } from '@nestjs/common';

// NestJS 이관 파일럿 컨트롤러 (Spring의 @RestController에 대응).
//   이 경로(/nest/health)는 Nest가 직접 처리 → 레거시 Express로 내려가지 않음.
//   "dev가 NestJS로 부팅됐는지" 확인용. 이후 실제 도메인은 이 방식으로 Controller+Service로 포팅.
import { HealthDto } from './dto/health.dto';

@Controller('nest')
export class HealthController {
  @Get('health')
  health(): HealthDto {
    return {
      framework: 'NestJS',
      ok: true,
      env: process.env.NODE_ENV || 'unknown',
      ts: new Date().toISOString(),
    };
  }
}
