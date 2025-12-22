# Pipes

Thư mục này chứa các **pipe** dùng chung cho dự án. Pipe là các thành phần giúp xử lý, kiểm tra và chuyển đổi dữ liệu đầu vào (input) trước khi dữ liệu được truyền vào controller.

## Công dụng
- Kiểm tra tính hợp lệ của dữ liệu đầu vào (validation).
- Chuyển đổi kiểu dữ liệu (transformation), ví dụ: chuyển string sang number, date, ...
- Làm sạch hoặc chuẩn hóa dữ liệu trước khi xử lý.

## Cách hoạt động
- Khi có request gửi đến, pipe sẽ xử lý dữ liệu đầu vào trước khi controller nhận được.
- Nếu dữ liệu không hợp lệ, pipe có thể throw exception để chặn request.

## Hướng dẫn sử dụng
1. **Tạo pipe mới:**
   - Tạo file mới trong thư mục này, đặt tên theo chức năng (ví dụ: `parse-int.pipe.ts`).
   - Định nghĩa pipe theo chuẩn NestJS (implement PipeTransform).
2. **Sử dụng pipe:**
   - Đăng ký pipe ở cấp toàn cục (global) hoặc cho từng controller/route/parameter bằng decorator `@UsePipes` hoặc trực tiếp trên tham số.

## Ví dụ
```typescript
// parse-int.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException('Validation failed');
    }
    return val;
  }
}

// Sử dụng trong controller
@Get(':id')
getById(@Param('id', ParseIntPipe) id: number) {
  // ...
}
```

## Lưu ý
- Chỉ đặt các pipe dùng chung tại đây. Pipe đặc thù cho từng module nên đặt trong module tương ứng.
- Đặt tên file và tên class pipe rõ ràng, dễ hiểu.
- Viết tài liệu ngắn gọn cho mỗi pipe nếu cần.

---
Mọi thắc mắc hoặc góp ý, vui lòng liên hệ team backend.
