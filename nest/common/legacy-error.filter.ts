import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { ZodError } from 'zod';

/**
 * Spring의 `@ControllerAdvice` + `@ExceptionHandler` 자리 — 전역 예외 → HTTP 응답 변환.
 *
 * 응답 형식은 레거시와 **바이트 단위로 같아야 한다**. Nest 기본 필터는 `{statusCode, message}`를
 * 내려주는데 프론트는 전부 `{success:false, error}`를 읽고 있어, 여기서 형식을 고정한다.
 */
@Catch()
export class LegacyErrorFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const err = exception || {};

    // 컨트롤러가 명시적으로 던진 HttpException은 그 상태/바디를 그대로(이미 레거시 형식).
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      return res.status(status).json(
        typeof body === 'string' ? { success: false, error: body } : body,
      );
    }

    // 검증 실패 — zod 4는 issues, zod 3은 errors.
    if (err instanceof ZodError) {
      const issues: any[] = (err as any).issues || (err as any).errors || [];
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: issues.map((e) => ({
          path: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
          message: e.message,
        })),
      });
    }

    // 서비스가 던진 statusCode 에러(가장 흔한 경로) — 402 크레딧 부족, 403 권한 등.
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        error: err.message,
        ...(err.violations && { violations: err.violations }),
      });
    }

    // AI 제공자(Anthropic 등) 에러는 502로 — 우리 잘못이 아님을 상태코드로 구분.
    if (err.status && err.error) {
      console.error('[Error] Anthropic API:', err.message);
      return res.status(502).json({ success: false, error: 'AI provider error', message: err.message });
    }

    // 미처리 예외 — 내부 정보를 노출하지 않고 500. 스택은 서버 로그에만.
    console.error('[Error] Unhandled:', err.message, err.stack?.slice(0, 300));
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
