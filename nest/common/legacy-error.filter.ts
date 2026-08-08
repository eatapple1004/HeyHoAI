import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import * as path from 'path';

// 레거시 전역 에러 핸들러 재사용(단일소스) — Zod 검증 400 / statusCode 커스텀 에러 /
//   Anthropic 502 / 그 외 500 {success:false,error:'Internal server error'} 형식을 그대로 따른다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { errorHandler } = require(path.join(__dirname, '..', '..', 'src', 'middleware', 'errorHandler.js'));

/**
 * Spring의 @ControllerAdvice + @ExceptionHandler에 대응하는 전역 예외 필터.
 * Nest 기본 필터는 {statusCode, message} 형식이라 레거시({success,error})와 응답 모양이 달라져,
 * 포팅한 도메인이 서비스에서 throw한 statusCode 에러를 레거시와 동일하게 내려주도록 위임한다.
 */
@Catch()
export class LegacyErrorFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    // 컨트롤러가 명시적으로 던진 HttpException은 그 상태/바디를 그대로 사용(이미 레거시 형식으로 맞춰둠).
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      return res.status(status).json(
        typeof body === 'string' ? { success: false, error: body } : body,
      );
    }

    // 그 외(서비스가 throw한 statusCode 에러·Zod·미처리 예외)는 레거시 errorHandler에 그대로 위임.
    return errorHandler(exception, req, res, () => undefined);
  }
}
