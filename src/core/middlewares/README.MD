# core/middlewares

Thư mục này chứa các middleware dùng để xử lý request/response ở tầng trung gian trong ứng dụng NestJS.

## Middleware là gì?
Middleware là các hàm trung gian được thực thi trước khi request đến controller hoặc trước khi response trả về client. Chúng thường được sử dụng để:
- Xử lý xác thực, phân quyền
- Ghi log
- Xử lý CORS
- Biến đổi dữ liệu request/response

## Hướng dẫn sử dụng

1. Định nghĩa middleware trong thư mục này.
2. Đăng ký middleware trong module (thường là app.module.ts hoặc module con) bằng cách implements `NestModule` và sử dụng phương thức `configure`.
3. Có thể áp dụng cho toàn bộ ứng dụng hoặc từng route cụ thể.

Ví dụ:
```typescript
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ExampleMiddleware } from './core/middlewares/example.middleware';

@Module({})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(ExampleMiddleware).forRoutes('*');
	}
}
```

## Lưu ý
- Đặt tên file middleware theo chuẩn: `xxx.middleware.ts`
- Đảm bảo middleware trả về `next()` để không chặn luồng xử lý.
