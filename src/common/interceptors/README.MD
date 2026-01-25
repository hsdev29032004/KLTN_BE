# Interceptors

Thư mục này chứa các **interceptor** dùng chung cho dự án. Interceptor là các thành phần trung gian cho phép can thiệp vào luồng xử lý request/response của hệ thống.

## Công dụng
- Ghi log, đo thời gian xử lý request.
- Biến đổi dữ liệu trả về cho client.
- Xử lý logic chung trước hoặc sau khi controller thực thi.
- Bắt và xử lý lỗi ở cấp cao hơn.

## Cách hoạt động
- Interceptor sẽ được thực thi trước và/hoặc sau khi controller xử lý request.
- Có thể áp dụng interceptor cho toàn bộ hệ thống hoặc từng controller/route riêng lẻ.

## Hướng dẫn sử dụng
1. **Tạo interceptor mới:**
   - Tạo file mới trong thư mục này, đặt tên theo chức năng (ví dụ: `http-logger.interceptor.ts`).
   - Định nghĩa interceptor theo chuẩn NestJS (implement NestInterceptor).
2. **Sử dụng interceptor:**
   - Đăng ký interceptor ở cấp toàn cục (global) hoặc cho từng controller/route bằng decorator `@UseInterceptors`.

## Ví dụ
```typescript
// http-logger.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    return next.handle().pipe(
      tap(() => console.log(`Request handled in ${Date.now() - now}ms`)),
    );
  }
}

// Sử dụng trong controller
@UseInterceptors(HttpLoggerInterceptor)
@Get('data')
getData() {
  // ...
}
```

## Lưu ý
- Chỉ đặt các interceptor dùng chung tại đây. Interceptor đặc thù cho từng module nên đặt trong module tương ứng.
- Đặt tên file và tên class interceptor rõ ràng, dễ hiểu.
- Viết tài liệu ngắn gọn cho mỗi interceptor nếu cần.

---
Mọi thắc mắc hoặc góp ý, vui lòng liên hệ team backend.
