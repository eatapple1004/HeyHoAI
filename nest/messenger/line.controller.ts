import { Body, Controller, Headers, HttpCode, Post, Req, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { MessengerService, WebhookAck } from './messenger.service';

/**
 * (2026-10-18) LINE Messaging API 웹훅 — POST /api/messenger/line/webhook
 *   인증 = X-Line-Signature(HMAC-SHA256 of raw body, channel secret). JwtAuthGuard 없음.
 *   LINE 은 빠른 200 을 원하므로 이벤트 처리는 서비스가 비동기로 돌리고 여기선 접수 수만 돌려준다.
 *   봉투 규칙({success,data})은 우리 API 용 — 웹훅 응답은 LINE 이 읽지 않으니 같은 모양으로 둔다.
 */
@Controller('api/messenger/line')
export class LineController {
  constructor(private readonly svc: MessengerService) {}

  @Post('webhook')
  @HttpCode(200)
  webhook(@Req() req: any, @Headers('x-line-signature') signature: string, @Body() body: any): { success: true; data: WebhookAck } {
    if (!this.svc.lineConfigured()) throw new ServiceUnavailableException('LINE is not configured on this server');
    if (!this.svc.verifyLine(req.rawBody, signature)) throw new UnauthorizedException('Bad LINE signature');
    return { success: true, data: this.svc.handleLine(body) };
  }
}
