# Filters

Thư mục này chứa các **filter** dùng chung cho dự án. Filter trong NestJS là các thành phần giúp xử lý lỗi (exception) hoặc các tình huống đặc biệt xảy ra trong quá trình chạy ứng dụng.

## Công dụng
- Bắt và xử lý các lỗi phát sinh trong hệ thống (ví dụ: lỗi không tìm thấy, lỗi quyền truy cập, lỗi server, ...).
- Chuẩn hóa thông điệp lỗi trả về cho client, giúp frontend dễ xử lý và hiển thị.
- Ghi log hoặc thực hiện các hành động bổ sung khi có lỗi.

## Cách hoạt động
- Khi có lỗi xảy ra ở bất kỳ đâu trong ứng dụng, filter sẽ "bắt" lỗi đó và xử lý theo logic đã định nghĩa.
- Có thể áp dụng filter cho toàn bộ hệ thống hoặc từng controller/route riêng lẻ.

## Hướng dẫn sử dụng
1. **Tạo filter mới:**
   - Tạo file mới trong thư mục này, đặt tên theo chức năng (ví dụ: `http-exception.filter.ts`).
   - Định nghĩa filter theo chuẩn NestJS (implement ExceptionFilter).
2. **Sử dụng filter:**
   - Đăng ký filter ở cấp toàn cục (global) hoặc cho từng controller/route bằng decorator `@UseFilters`.

## Ví dụ
```typescript
// http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // Xử lý lỗi và trả về response phù hợp
  }
}

// Đăng ký filter toàn cục trong main.ts
// app.useGlobalFilters(new HttpExceptionFilter());
```

## Lưu ý
- Chỉ đặt các filter dùng chung tại đây. Filter đặc thù cho từng module nên đặt trong module tương ứng.
- Đặt tên file và tên class filter rõ ràng, dễ hiểu.
- Viết tài liệu ngắn gọn cho mỗi filter nếu cần.

---
Mọi thắc mắc hoặc góp ý, vui lòng liên hệ team backend.
