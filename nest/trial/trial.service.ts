import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 체험 계정 로직 재사용(중복 금지) — 레거시 trial.service.js 단일소스.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacy = require(path.join(__dirname, '..', '..', 'src', 'trial', 'trial.service.js'));

@Injectable()
export class TrialService {
  // 관리자: 체험 계정 발급(password는 이 응답에서만 1회 노출)
  createTrialAccount(body: any = {}) {
    const { companyName, email, password, credits, quota, days } = body;
    return legacy.createTrialAccount({
      companyName, email, password, days,
      credits: credits != null ? credits : quota, // quota=구버전 클라 호환
    });
  }

  listTrials() {
    return legacy.listTrials();
  }

  // 관리자: 토큰 추가 지급 / 기간 변경 / 활성·비활성 토글(전달된 필드만 적용)
  async patchTrial(id: string, body: any = {}) {
    const out: any = { id };
    if (body.addCredits != null) out.credits = await legacy.grantCredits(id, body.addCredits);
    if (body.days != null) out.days = await legacy.setDays(id, body.days);
    if (body.status != null) out.status = await legacy.setStatus(id, body.status);
    return out;
  }

  // 본인 체험 상태(스튜디오 배너용). 비-체험이면 null.
  getStatus(userId: string) {
    return legacy.getStatus(userId);
  }
}
