import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  message: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // Nếu data đã có format { message, data } thì giữ nguyên
        if (data && typeof data === 'object' && 'message' in data && 'data' in data) {
          return data;
        }

        // Nếu data có message nhưng không có data, thêm data: null
        if (data && typeof data === 'object' && 'message' in data) {
          return {
            ...data,
            data: null,
          };
        }

        // Nếu không thì wrap vào format mặc định với message rỗng
        return {
          message: '',
          data: data || null,
        };
      }),
    );
  }
}
