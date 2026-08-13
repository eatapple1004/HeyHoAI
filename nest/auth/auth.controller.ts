import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { AuthApiService, googleHandlers } from './auth.service';
import { CookieService } from '../common/security/cookie.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiResponse, ApiOk } from '../common/dto/api-response.dto';
import { UserVo } from './vo/user.vo';
import { SignupDto, LoginDto, UpdateProfileDto } from './dto/auth.dto';

// /api/auth — 로그인/가입은 공개, /me 3종은 인증 필요.
//   ⚠️ 이 도메인은 응답에 쿠키·리다이렉트가 있어 @Res({passthrough:true})로 Express 응답을 직접 다룬다.
//      (passthrough=true라 반환값은 평소처럼 Nest가 JSON으로 직렬화한다.)
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthApiService,
    private readonly cookies: CookieService,
  ) {}

  // POST /api/auth/signup — 가입 + 인증 쿠키(레거시도 201)
  @Post('signup')
  async signup(@Req() req: any, @Body() body: SignupDto, @Res({ passthrough: true }) res: any): Promise<ApiResponse<UserVo>> {
    const refCode = req.cookies && req.cookies.ref; // 추천 쿠키(있으면 추천 관계 연결)
    const { user, refLinked } = await this.auth.signup(body, refCode);
    if (refLinked) res.clearCookie('ref', { path: '/' });
    this.cookies.setAuthCookie(res, user);
    return { success: true, data: user };
  }

  // POST /api/auth/login — 로그인 + 인증 쿠키
  @Post('login')
  @HttpCode(200) // 레거시 res.json=200
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: any): Promise<ApiResponse<UserVo>> {
    const user = await this.auth.login(body);
    this.cookies.setAuthCookie(res, user);
    return { success: true, data: user };
  }

  // POST /api/auth/logout — 쿠키 제거
  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: any): ApiOk {
    this.cookies.clearAuthCookie(res);
    return { success: true };
  }

  // GET /api/auth/google — 구글 동의화면으로 리다이렉트(레거시 핸들러 그대로 사용)
  @Get('google')
  googleStart(@Req() req: any, @Res() res: any) {
    return googleHandlers.googleStart(req, res);
  }

  // GET /api/auth/google/callback — 코드 교환 → 가입/로그인 → 쿠키 → /studio 리다이렉트
  @Get('google/callback')
  googleCallback(@Req() req: any, @Res() res: any) {
    return googleHandlers.googleCallback(req, res, (e: any) => {
      // 레거시 라우트에도 next는 사실상 미사용(핸들러가 자체적으로 리다이렉트 처리).
      if (e) throw e;
    });
  }

  // GET /api/auth/me (인증)
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any): Promise<ApiResponse<UserVo>> {
    return { success: true, data: await this.auth.me(req.user.id) };
  }

  // PATCH /api/auth/me (인증) — 표시 이름 변경
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req: any, @Body() body: UpdateProfileDto): Promise<ApiResponse<UserVo>> {
    return { success: true, data: await this.auth.updateProfile(req.user.id, body) };
  }

  // DELETE /api/auth/me (인증) — 계정 소프트 삭제 + 로그아웃
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Req() req: any, @Res({ passthrough: true }) res: any): Promise<ApiOk> {
    await this.auth.deleteAccount(req.user.id);
    this.cookies.clearAuthCookie(res);
    return { success: true };
  }
}
