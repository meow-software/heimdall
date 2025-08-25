import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter<T> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        errors = [{ type: exception.name, message: res }];
      } else if (typeof res === 'object') {
        const r = res as any;
        message = r.message || exception.message || 'Error';

        // Exemple pour validation errors de class-validator
        if (Array.isArray(r.message)) {
          errors = r.message.map((msg: string) => ({
            type: exception.name,
            message: msg,
          }));
        } else {
          errors = [{ type: exception.name, message }];
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
      errors = [{ type: exception.name, message }];
    }

    response.status(status).json({
      statusCode: status,
      success: status >= 200 && status < 300,
      message,
      data: {},
      errors,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }
}
