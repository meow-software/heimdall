import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse, ResponseUtil } from 'src/lib/utils/response.util';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Default to 500 if status cannot be determined
    const status = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Nest exceptions often contain a structured response
    const errorResponse = exception.getResponse();

    // Build standardized error response
    const apiResponse: ApiResponse<null> = ResponseUtil.catch(
      {
        errors: errorResponse,
        message:
          (errorResponse as any)?.message ||
          exception.message ||
          'Unexpected error',
      },
      request.url,
    );

    response.status(status).json(apiResponse);
  }
}
