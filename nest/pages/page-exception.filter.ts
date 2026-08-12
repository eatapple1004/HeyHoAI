import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { AdminPageForbiddenException, PageRedirectException } from './page-auth.guard';

/** 관리자 아님 안내 화면 — 레거시와 **같은 HTML**이어야 한다(문구·스타일이 그대로 보인다) */
const ADMIN_ONLY_HTML = '<!doctype html><meta charset="utf-8"><title>관리자 전용</title><body style="font-family:system-ui;background:#0c0c14;color:#ececf4;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2>🔒 관리자 전용 페이지</h2><p style="color:#9a9ab0">이 페이지는 관리자 계정만 접근할 수 있습니다.</p><a href="/" style="color:#7c6cff">← 홈으로</a></div></body>';

/**
 * 페이지 예외 → 화면 응답. 컨트롤러에 `@UseFilters`로 붙이면 전역 필터보다 먼저 잡는다.
 * (전역 `LegacyErrorFilter`가 잡으면 JSON `{success:false}`가 나가서 사람이 볼 화면이 아니게 된다.)
 */
@Catch(PageRedirectException, AdminPageForbiddenException)
export class PageExceptionFilter implements ExceptionFilter {
  catch(exception: PageRedirectException | AdminPageForbiddenException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (exception instanceof PageRedirectException) return res.redirect(exception.location);
    return res.status(403).type('html').send(ADMIN_ONLY_HTML);
  }
}
