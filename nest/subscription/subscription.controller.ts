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
import { ApiResponse } from '../common/dto/api-response.dto';
import { SubscriptionDto, ActivatePlanResultDto, UpgradePlanDto } from './dto/subscription.dto';

// /api/subscription — 전 엔드포인트 인증 필요(= 레거시 requireAuth). Spring: @RestController + @PreAuthorize.
//   응답 형식은 레거시와 동일하게 { success, data } 유지.
@Controller('api/subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscription: SubscriptionService) {}

  // GET /api/subscription — 현재 플랜·권한·24h 오퍼 상태
  @Get()
  async get(@Req() req: any): Promise<ApiResponse<SubscriptionDto>> {
    return { success: true, data: await this.subscription.getSubscription(req.user, Date.now()) };
  }

  // POST /api/subscription/offer/start — 24h 업그레이드 오퍼 시작(멱등)
  @Post('offer/start')
  @HttpCode(200) // 레거시 res.json=200에 맞춤(Nest POST 기본 201 방지)
  async startOffer(@Req() req: any): Promise<ApiResponse<SubscriptionDto>> {
    await this.subscription.startOffer(req.user.id, Date.now());
    return { success: true, data: await this.subscription.getSubscription(req.user, Date.now()) };
  }

  // ── 정기결제(구독) ──
  //   결제창은 카드 등록(빌링키 발급) 때 한 번 뜨고, 이후 청구는 서버가 직접 한다.
  //   흐름: [카드 등록 = /api/billing/portone/billing-key] → subscribe → 매월 스케줄러 재청구

  /** GET /api/subscription/billing — 진행 중인 구독(카드 브랜드·끝4자리 포함). 없으면 data:null */
  @Get('billing')
  async billing(@Req() req: any) {
    return { success: true, data: await this.subscription.subscription(req.user.id) };
  }

  /** POST /api/subscription/subscribe { plan } — 등록 카드로 첫 달 청구 + 플랜 활성화 */
  @Post('subscribe')
  @HttpCode(200)
  async subscribe(@Req() req: any, @Body() body: any) {
    try {
      return { success: true, data: await this.subscription.subscribe(req.user, body && body.plan) };
    } catch (err: any) {
      if (err && err.statusCode) throw new HttpException({ success: false, error: err.message }, err.statusCode);
      throw err;
    }
  }

  /** POST /api/subscription/cancel — 기말 해지(이미 낸 기간은 그대로 사용) */
  @Post('cancel')
  @HttpCode(200)
  async cancel(@Req() req: any) {
    try {
      return { success: true, data: await this.subscription.cancelSubscription(req.user.id) };
    } catch (err: any) {
      if (err && err.statusCode) throw new HttpException({ success: false, error: err.message }, err.statusCode);
      throw err;
    }
  }

  /**
   * POST /api/subscription/upgrade { plan, months }
   * 기간권(선불) 수동 활성화 — **결제 없이** 플랜을 부여하므로 admin 전용으로 남긴다.
   * 일반 사용자의 유료 구독은 위 `subscribe`(빌링키 정기결제)를 쓴다.
   */
  @Post('upgrade')
  @HttpCode(200)
  async upgrade(@Req() req: any, @Body() body: UpgradePlanDto): Promise<ApiResponse<ActivatePlanResultDto>> {
    const { plan = 'pro', months = 3 } = body || {};
    if (req.user.role !== 'admin') {
      // 결제 없는 플랜 부여라 일반 사용자에게 열어줄 수 없다. 유료 경로는 subscribe로 안내한다.
      throw new HttpException(
        { success: false, error: '구독은 결제수단 등록 후 이용해주세요.', useSubscribe: true },
        403,
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
