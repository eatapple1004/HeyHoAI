import { HttpException, Injectable } from '@nestjs/common';
import * as path from 'path';

// 팩 목록은 레거시 billing.route.js가 pricing.config에서 파생해 export한 PACKS를 그대로 재사용(단일소스).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PACKS } = require(path.join(__dirname, '..', '..', 'src', 'billing', 'billing.route.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { query } = require(path.join(__dirname, '..', '..', 'src', 'db', 'client.js'));

// LemonSqueezy 설정/매핑 — 레거시 billing.route.js와 동일(현재 키 미설정=휴면). 값은 env 단일소스.
function lsConfigured(): boolean {
  return Boolean(env.LEMONSQUEEZY_API_KEY && env.LEMONSQUEEZY_STORE_ID);
}
function variantIdFor(packId: string): string | null {
  const map: Record<string, any> = {
    pack9: env.LS_VARIANT_PACK50,
    pack49: env.LS_VARIANT_PACK120,
    pack199: env.LS_VARIANT_PACK300,
    pack349: env.LS_VARIANT_PACK700,
  };
  return map[packId] || null;
}

@Injectable()
export class BillingService {
  packs() {
    return {
      packs: PACKS.map((p: any) => ({ ...p, available: lsConfigured() && Boolean(variantIdFor(p.id)) })),
      configured: lsConfigured(),
    };
  }

  // 레거시 checkout 로직과 동일(LemonSqueezy 체크아웃 URL 생성). LS는 현재 휴면이라 대부분 503로 끝남.
  async checkout(user: any, protocol: string, host: string, packId: string) {
    const pack = PACKS.find((p: any) => p.id === packId);
    if (!pack) throw new HttpException({ success: false, error: 'Unknown pack' }, 400);
    if (!lsConfigured()) {
      throw new HttpException({ success: false, error: '결제가 아직 설정되지 않았습니다. (Lemon Squeezy 키 필요)' }, 503);
    }
    const variantId = variantIdFor(packId);
    if (!variantId) {
      throw new HttpException({ success: false, error: `${packId}의 상품(variant)이 설정되지 않았습니다.` }, 503);
    }
    const lsRes = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: user.email || undefined,
              custom: { user_id: user.id, pack_id: pack.id, credits: String(pack.credits) },
            },
            product_options: { redirect_url: `${protocol}://${host}/billing?purchased=${pack.id}` },
          },
          relationships: {
            store: { data: { type: 'stores', id: String(env.LEMONSQUEEZY_STORE_ID) } },
            variant: { data: { type: 'variants', id: String(variantId) } },
          },
        },
      }),
    });
    const lsData: any = await lsRes.json().catch(() => ({}));
    const url = lsData?.data?.attributes?.url;
    if (!lsRes.ok || !url) {
      throw new HttpException({ success: false, error: '결제 페이지 생성에 실패했습니다.' }, 502);
    }
    return { url };
  }

  async history(userId: string) {
    const r = await query(
      `SELECT id, provider, product, amount_usd, credits, created_at
         FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId],
    );
    return r.rows;
  }
}
