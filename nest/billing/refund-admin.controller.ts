import { Body, Controller, Get, HttpCode, HttpException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PortoneService } from './portone.service';
import { AdminGuard } from '../auth/admin.guard';
import { EnvDbService, EnvKey } from '../common/env-db.service';

/**
 * /api/admin/refunds — 결제 취소(환불) 관리자 경로.
 *
 * 셀프 환불(/api/billing/portone/refund)이 규정상 **미사용·7일 이내 전액**만 열려 있으므로,
 * 그 밖의 모든 케이스(부분사용 후 회사 귀책 비례환불, 이중결제, 미성년자 결제 취소,
 * PG 심사용 취소 테스트)는 사람이 판단해 여기로 들어온다.
 *
 * 클래스 단위 AdminGuard = 레거시 requireAdmin과 동일(미인증 401 / 비관리자 403).
 */
@Controller('api/admin/refunds')
@UseGuards(AdminGuard)
export class RefundAdminController {
  constructor(
    private readonly portone: PortoneService,
    private readonly envDb: EnvDbService,
  ) {}

  /**
   * 조회 대상 환경을 정한다. 안 주면 이 서버의 환경.
   * @returns { key, db } — db는 **다른 환경일 때만** 채워진다(읽기 전용 질의 함수).
   *   같은 환경이면 null을 줘서 서버 자신의 연결(src/db/client)을 그대로 쓰게 한다 —
   *   읽기 전용 풀로 우회할 이유가 없고, 자기 환경만은 항상 평소 경로와 100% 같아야 한다.
   */
  private target(envKey?: string): { key: EnvKey; db: any } {
    const current = this.envDb.current();
    if (!envKey) return { key: current, db: null };
    const key = this.envDb.assertEnv(envKey);
    return { key, db: key === current ? null : this.envDb.queryFn(key) };
  }

  /**
   * 쓰기(실제 승인취소·크레딧 회수)는 **이 서버 환경에서만** 허용한다.
   *
   * 교차 환경 연결은 읽기 전용이라 애초에 쓰기가 불가능하지만, 그 이전에 PG 취소는 DB가 아니라
   * PortOne API로 나간다 — 즉 "환경을 잘못 고른 채 취소" 를 DB 권한이 막아주지 못한다.
   * 그래서 요청에 다른 환경이 실려 오면 **여기서 끊는다**(화면 버튼도 같이 잠그지만, 서버가 최종 방어선).
   */
  private assertWritable(envKey?: string) {
    if (!envKey) return;
    const key = this.envDb.assertEnv(envKey);
    const current = this.envDb.current();
    if (key !== current) {
      throw new HttpException(
        { success: false, error: `취소 실행은 그 환경의 어드민에서만 가능합니다(지금 서버=${current}, 요청=${key}).` },
        400,
      );
    }
  }

  /**
   * 그 환경에 환불 테이블이 아직 없는가(42P01 = undefined_table).
   *
   * 실측: dev에서 prod를 조회하면 500이었다 — prod DB에 `billing_refunds`가 없었다(환불 기능 미배포).
   * 환경마다 배포 시점이 다르니 **정상적으로 생길 수 있는 상태**다. 500으로 떨어뜨리면 화면에는
   * "Internal server error"만 남아 원인을 알 수가 없다. 자기 환경에서 나는 42P01은 진짜 사고이므로
   * 교차 조회(db != null)일 때만 이렇게 다룬다.
   */
  private isMissingTable(e: any): boolean { return !!e && e.code === '42P01'; }

  /** GET /api/admin/refunds?env=&orderId=&limit= — 취소 이력(환경 선택 가능, 조회 전용) */
  @Get()
  async list(
    @Query('env') envKey?: string,
    @Query('orderId') orderId?: string,
    @Query('limit') limit?: string,
  ) {
    const { key, db } = this.target(envKey);
    const meta = {
      env: key,
      label: this.envDb.label(key),
      db: this.envDb.dbName(key),
      current: this.envDb.current(),   // 화면이 "쓰기 가능한 환경"을 판단하는 기준
    };
    try {
      return { success: true, data: await this.portone.refundHistory(orderId, Number(limit) || 50, db), ...meta };
    } catch (e: any) {
      if (db && this.isMissingTable(e)) {
        return { success: true, data: [], ...meta, note: `${meta.label} 환경에는 아직 환불 테이블이 없습니다(환불 기능 미배포).` };
      }
      throw e;
    }
  }

  /**
   * GET /api/admin/refunds/assess/:paymentId?env= — 취소 전 판정(부작용 없음).
   *
   * 금액·상태의 진실원본은 PortOne이고 **결제 스토어는 세 환경이 공유**한다 —
   *   환경마다 다른 건 우리 DB(주문·크레딧 원장)뿐이라, DB만 그 환경 것으로 바꿔 읽으면 판정이 맞는다.
   */
  @Get('assess/:paymentId')
  async assess(@Param('paymentId') paymentId: string, @Query('env') envKey?: string) {
    const { key, db } = this.target(envKey);
    return this.wrap(async () => {
      try {
        return {
          success: true,
          data: await this.portone.assessRefund(paymentId, undefined, db),
          env: key,
          current: this.envDb.current(),
        };
      } catch (e: any) {
        // 교차 환경 조회는 **어디서 막혔는지**를 말해 줘야 한다 — 원인이 DB인지 PG인지 구분이 안 되면
        //   화면에서 판단할 수가 없다. 두 경우의 안내가 정반대라 문구도 갈라 쓴다:
        //   · 404 = 그 환경 DB에 애초에 없는 주문(다른 환경에서 결제된 건) → 환경을 바꿔 보라는 말이 맞다.
        //   · 그 외(PG 조회 실패 등) = DB는 읽혔는데 PortOne 쪽에서 막힌 것 → 그 환경 어드민에서 재시도.
        if (db && this.isMissingTable(e)) {
          throw new HttpException(
            { success: false, error: `${this.envDb.label(key)} 환경에는 아직 환불 테이블이 없습니다(환불 기능 미배포) — 판정을 계산할 수 없습니다.` },
            400,
          );
        }
        if (db && e && e.message) {
          const lbl = this.envDb.label(key);
          e.message = e.statusCode === 404
            ? `${e.message} (${lbl} DB에 이 주문이 없습니다 — 다른 환경에서 결제된 건인지 확인하세요)`
            : `${e.message} (${lbl} 환경 조회 — 그 환경 어드민에서 다시 시도해 보세요)`;
        }
        throw e;
      }
    });
  }

  /**
   * POST /api/admin/refunds { paymentId, amountKRW?, credits?, reason }
   *   amountKRW 생략 = 전액취소. credits 생략 = 취소 금액에 비례해 회수.
   */
  @Post()
  @HttpCode(200)
  async cancel(@Req() req: any, @Body() body: any) {
    this.assertWritable(body && body.env);
    return this.wrap(async () => ({
      success: true,
      data: await this.portone.refundAsAdmin(body && body.paymentId, {
        amountKRW: body && body.amountKRW,
        credits: body && body.credits,
        reason: body && body.reason,
        actorUserId: req.user.id,
      }),
    }));
  }

  /**
   * POST /api/admin/refunds/reconcile { paymentId }
   *   PortOne 콘솔에서 직접 취소했을 때 크레딧 회수를 뒤늦게 맞추는 복구용.
   *   (웹훅이 정상 도착하면 자동으로 도는 경로와 같은 함수다 — 수동 재실행해도 중복 회수되지 않는다.)
   */
  @Post('reconcile')
  @HttpCode(200)
  async reconcile(@Body() body: any) {
    this.assertWritable(body && body.env);
    return this.wrap(async () => ({
      success: true,
      data: await this.portone.reconcileRefund(body && body.paymentId),
    }));
  }

  /** 서비스의 statusCode 규약(400/403/404/409/502/503)을 HTTP 상태로 그대로 옮긴다 */
  private async wrap<T>(fn: () => T | Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e: any) {
      if (e && e.statusCode) throw new HttpException({ success: false, error: e.message }, e.statusCode);
      throw e;
    }
  }
}
