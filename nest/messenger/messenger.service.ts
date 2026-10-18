import { Injectable } from '@nestjs/common';
import * as path from 'path';

// 레거시 서비스 브리지 — 본체는 src/messenger/line.service.js
// eslint-disable-next-line @typescript-eslint/no-var-requires
const line = require(path.join(__dirname, '..', '..', 'src', 'messenger', 'line.service.js'));

export interface WebhookAck { received: number }

@Injectable()
export class MessengerService {
  lineConfigured(): boolean { return line.configured(); }
  verifyLine(rawBody: Buffer | undefined, signature: string | undefined): boolean { return line.verifySignature(rawBody, signature); }
  handleLine(body: any): WebhookAck { return line.handleWebhook(body); }
}
