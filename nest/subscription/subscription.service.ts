import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { SubscriptionRepository } from './subscription.repository';
import { CreditsService } from '../credits/credits.service';
import { SubscriptionDto, ActivatePlanResultDto } from './dto/subscription.dto';

/**
 * ⚠️ 플랜 정의·가격은 **단일소스 유지**(복제 금지) —
 *    `lib/entitlements`(플랜별 권한·등급)와 `pricing.config`(월 가격·할인율).
 *    값이 갈리면 화면·청구·권한이 서로 다른 말을 하게 된다.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PLANS, planKey, entitlementsFor, isPro } = require(path.join(__dirname, '..', '..', 'src', 'lib', 'entitlements.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PRICING } = require(path.join(__dirname, '..', '..', 'src', 'pricing', 'pricing.config.js'));

/** 구독 가격(월, USD) — 전 플랜을 단일소스에서 동적 파생(플랜 키 변경에 안전) */
const PRICES: Record<string, number> = Object.fromEntries(
  Object.entries(PRICING.plans).map(([k, v]: [string, any]) => [k, v.price]),
);

/** 24시간 첫 업그레이드 오퍼 — 할인율은 pricing.config 단일소스 */
const OFFER = {
  windowMs: 24 * 60 * 60 * 1000,
  discountPct: PRICING.firstMonthOff,
  plan: 'pro',
};

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}
/** 오퍼 할인가(정수 USD) */
function offerPrice(plan = OFFER.plan): number {
  return Math.round((PRICES[plan] || 0) * (1 - OFFER.discountPct / 100));
}

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly repo: SubscriptionRepository,
    private readonly credits: CreditsService,
  ) {}

  /** 현재 플랜·권한·24h 오퍼 상태. nowMs는 컨트롤러가 주입(테스트 용이) */
  async getSubscription(reqUser: { id: string; role: string }, nowMs: number): Promise<SubscriptionDto> {
    const row = await this.repo.findPlan(reqUser.id);
    // planKey가 plan_renews_at을 보고 만료를 반영한다(만료면 free 취급)
    const user = { role: reqUser.role, plan: row.plan, plan_renews_at: row.plan_renews_at };
    const key = planKey(user);
    const ent = entitlementsFor(user);

    // 오퍼는 "시작됐고 · 아직 무료이며 · 윈도우 안"일 때만 활성
    let offer: any = { active: false, discountPct: OFFER.discountPct, plan: OFFER.plan };
    if (row.pro_offer_started_at && !isPro(user)) {
      const startedMs = new Date(row.pro_offer_started_at).getTime();
      const expiresMs = startedMs + OFFER.windowMs;
      if (nowMs < expiresMs) {
        offer = {
          active: true,
          discountPct: OFFER.discountPct,
          plan: OFFER.plan,
          listPrice: PRICES[OFFER.plan],
          offerPrice: offerPrice(),
          expiresAt: new Date(expiresMs).toISOString(),
          secondsLeft: Math.floor((expiresMs - nowMs) / 1000),
        };
      }
    }

    return {
      plan: key,
      planName: ent.name,
      isPro: isPro(user),
      prices: PRICES,
      entitlements: {
        monthlyCredits: ent.monthlyCredits,
        watermarkFree: ent.watermarkFree,
        hd: ent.hd,
        commercial: ent.commercial,
        privateMode: ent.privateMode,
      },
      renewsAt: row.plan_renews_at || null,
      offer,
    };
  }

  /** 24h 오퍼 시작(멱등) — 보통 신규 무료 사용자가 페이월을 처음 볼 때 */
  startOffer(userId: string, nowMs: number) {
    return this.repo.startOffer(userId, new Date(nowMs).toISOString());
  }

  /**
   * 기간권(선불) 활성화 — months개월 부여 + 기간분 크레딧 일괄 지급.
   * ⚠️ 결제 미연동 상태라 운영(admin)·테스트 전용(컨트롤러가 role을 검사).
   *   · 하위 등급 구매 차단(B안): 활성 상위 패스가 있으면 만료 후에만 가능
   *   · 활성 패스가 있으면 남은 기간에 **이어붙여 연장**
   *   · 상위 구매면 즉시 상향, 같은 등급이면 유지
   *   · 크레딧 지급 실패해도 활성화는 유지(사용자가 이미 낸 값을 되돌리지 않는다)
   */
  async activatePlan(userId: string, plan: string, nowMs: number, months = 3): Promise<ActivatePlanResultDto> {
    if (!PLANS[plan] || plan === 'free') throw httpError(400, '유효한 이용권이 아닙니다.');
    const m = Math.max(1, parseInt(String(months), 10) || 3);

    const row = await this.repo.findPlanForActivation(userId);
    const cur = planKey({ plan: row?.plan, plan_renews_at: row?.plan_renews_at }); // 만료면 'free'
    const curExpMs = row?.plan_renews_at ? new Date(row.plan_renews_at).getTime() : 0;
    const newRank = PLANS[plan].rank;
    const curRank = PLANS[cur].rank;

    if (cur !== 'free' && newRank < curRank) {
      throw httpError(409, `이미 ${PLANS[cur].name} 패스를 이용 중이에요. 만료 후 하위 이용권을 구매할 수 있어요.`);
    }
    const base = (cur !== 'free' && curExpMs > nowMs) ? curExpMs : nowMs;
    const expires = new Date(base + m * 30 * 24 * 60 * 60 * 1000).toISOString();
    const effPlan = newRank >= curRank ? plan : cur;
    await this.repo.activatePlan(userId, effPlan, expires);

    const credits = (PLANS[plan].monthlyCredits || 0) * m;
    if (credits > 0) {
      await this.credits.addCredits(userId, credits, {
        type: 'plan', description: `${PLANS[plan].name} ${m}개월 이용권`,
      }).catch(() => {});   // 지급 실패해도 활성화는 유지
    }
    return {
      plan: effPlan, expiresAt: expires, months: m, creditsGranted: credits,
      extended: base > nowMs, upgraded: newRank > curRank,
    };
  }
}
