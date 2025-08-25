import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';


@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    return next.handle().pipe(
      map((data) => ({
        statusCode: res.statusCode,
        success: res.statusCode >= 200 && res.statusCode < 300,
        message: data?.message || 'OK',
        data: data?.payload ?? data ?? {},
        errors: [],
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
      })),
    );
  }
}