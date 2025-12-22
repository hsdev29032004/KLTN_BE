# infras/loggers

Thư mục này chứa các thành phần liên quan đến logging (ghi log) cho hệ thống.

## Mục đích
- Theo dõi, ghi nhận các sự kiện, lỗi, request/response trong hệ thống.
- Hỗ trợ debug, giám sát và phân tích hoạt động của ứng dụng.

## Thành phần chính
- **http-logger.interceptor.ts**: Interceptor ghi log cho các request HTTP.
- **logger.module.ts**: Module cấu hình và cung cấp logger cho toàn hệ thống.
- **logger.service.ts**: Service thực hiện các thao tác ghi log (info, error, warn, ...).

## Hướng dẫn sử dụng
- Import `LoggerModule` vào các module cần sử dụng logging.
- Inject `LoggerService` vào service/controller để ghi log theo nhu cầu.

Ví dụ:
```typescript
import { LoggerService } from '../infras/loggers/logger.service';

constructor(private readonly logger: LoggerService) {}

this.logger.log('Thông báo');
this.logger.error('Có lỗi xảy ra');
```

## Lưu ý
- Cấu hình mức độ log phù hợp với môi trường (dev/prod).
- Có thể mở rộng logger để tích hợp với các hệ thống log tập trung (ELK, Datadog, ...).
