import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AppLogger } from './logger.service';

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl, body, query, params } = req;

    const start = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const ms = Date.now() - start;

        this.logger.log('HTTP Request', {
          method,
          url: originalUrl,
          params,
          query,
          body,
          responseTime: `${ms}ms`,
          response: data,
        });
      }),
    );
  }
}
