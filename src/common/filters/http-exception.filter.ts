import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/** 모든 에러를 명세서의 공통 에러 응답 형식 `{ error: { code, message } }` 으로 변환한다. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response.status(status).json({
      error: {
        code: HttpStatus[status] ?? 'ERROR',
        message: this.getMessage(exception),
      },
    });
  }

  private getMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) {
      return '서버 오류가 발생했습니다.';
    }
    const body = exception.getResponse();
    if (typeof body === 'string') {
      return body;
    }
    const message = (body as { message?: string | string[] }).message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    return message ?? exception.message;
  }
}
