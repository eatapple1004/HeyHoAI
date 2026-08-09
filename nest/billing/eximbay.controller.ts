import { Body, Controller, Get, HttpCode, HttpException, Post, Req, UseGuards } from '@nestjs/common';
import { EximbayService } from './eximbay.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PgConfigDto } from './dto/billing.dto';

// /api/billing/eximbay — 해외 결제(Eximbay) 준비. status 웹훅은 레거시(NEST_EXCLUDE).
@Controller('api/billing/eximbay')
@UseGuards(JwtAuthGuard)
export class EximbayController {
  constructor(private readonly eximbay: EximbayService) {}

  @Get('config')
  config(): PgConfigDto {
    return { success: true, data: this.eximbay.config() };
  }

  @Post('ready')
  @HttpCode(200)
  async ready(@Req() req: any, @Body() body: any) {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const data = await this.eximbay.ready(req.user, body && body.packId, baseUrl);
      return { success: true, data };
    } catch (err: any) {
      if (err && err.statusCode) throw new HttpException({ success: false, error: err.message }, err.statusCode);
      throw err;
    }
  }
}
