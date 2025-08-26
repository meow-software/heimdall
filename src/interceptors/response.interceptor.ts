import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ResponseUtil } from 'src/lib/utils/response.util';


@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();


    return next.handle().pipe(
      // Format success responses
      map((data) =>
        ResponseUtil.catch<any>(
          {
            data: data?.payload ?? data ?? {},
            message: data?.message || 'OK',
          },
          req.originalUrl,
        ),
      ),
    )
  }
}