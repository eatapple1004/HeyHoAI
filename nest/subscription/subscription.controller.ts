import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpException,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// /api/subscription — 전 엔드포인트 인증 필요(= 레거시 requireAuth). Spring: @RestController + @PreAuthorize.
//   응답 형식은 레거시와 동일하게 { success, data } 유지.
@Controller('api/subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscription: SubscriptionService) {}

  // GET /api/subscription — 현재 플랜·권한·24h 오퍼 상태
  @Get()
  async get(@Req() req: any) {
    return { success: true, data: await this.subscription.getSubscription(req.user, Date.now()) };
  }

  // POST /api/subscription/offer/start — 24h 업그레이드 오퍼 시작(멱등)
  @Post('offer/start')
  @HttpCode(200) // 레거시 res.json=200에 맞춤(Nest POST 기본 201 방지)
  async startOffer(@Req() req: any) {
    await this.subscription.startOffer(req.user.id, Date.now());
    return { success: true, data: await this.subscription.getSubscription(req.user, Date.now()) };
  }

  /**
   * POST /api/subscription/upgrade { plan, months }
   * ⚠️ 구독 결제 미연동. 실제 과금 플로우는 Eximbay 구독상품 심사 통과 후
   *    결제 성공 webhook에서 activatePlan(...)을 호출하도록 연결 예정.
   * 현재는 운영/테스트(admin)만 결제 없이 플랜을 활성화할 수 있다.
   */
  @Post('upgrade')
  @HttpCode(200)
  async upgrade(@Req() req: any, @Body() body: any) {
    const { plan = 'pro', months = 3 } = body || {};
    if (req.user.role !== 'admin') {
      // 레거시와 동일한 501 + comingSoon 페이로드(프론트가 이 플래그로 안내 문구를 띄움).
      throw new HttpException(
        {
          success: false,
          error: '이용권 결제는 곧 오픈됩니다. (가맹점 심사 대기 중)',
          comingSoon: true,
        },
        501,
      );
    }
    try {
      // 기간권(선불): months개월 부여 + 크레딧 일괄. eximbay 정기결제 오픈 전엔 admin 수동만.
      const result = await this.subscription.activatePlan(req.user.id, plan, Date.now(), months);
      return { success: true, data: result };
    } catch (err: any) {
      // 레거시와 동일: statusCode 있는 도메인 에러(400 유효하지 않은 플랜 / 409 하위등급 차단)는 그대로 반환.
      if (err && err.statusCode) {
        throw new HttpException({ success: false, error: err.message }, err.statusCode);
      }
      throw err;
    }
  }
}
