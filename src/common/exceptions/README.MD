# Exceptions

Thư mục này chứa các **exception** (ngoại lệ) dùng chung cho dự án. Exception là các lỗi đặc biệt mà lập trình viên chủ động tạo ra để báo hiệu những tình huống bất thường hoặc không hợp lệ trong quá trình xử lý.

## Công dụng
- Định nghĩa các loại lỗi riêng biệt cho hệ thống (ví dụ: lỗi xác thực, lỗi quyền truy cập, lỗi dữ liệu không hợp lệ, ...).
- Giúp code rõ ràng, dễ kiểm soát luồng xử lý khi có lỗi.
- Chuẩn hóa thông điệp lỗi trả về cho client.

## Cách hoạt động
- Khi gặp tình huống bất thường, code sẽ chủ động "ném" (throw) exception tương ứng.
- Exception có thể được filter (bắt) để xử lý và trả về thông điệp phù hợp cho client.

## Hướng dẫn sử dụng
1. **Tạo exception mới:**
   - Tạo file mới trong thư mục này, đặt tên theo chức năng (ví dụ: `forbidden.exception.ts`).
   - Kế thừa từ các class exception của NestJS (ví dụ: `HttpException`, `ForbiddenException`, ...).
2. **Sử dụng exception:**
   - Khi gặp lỗi, throw exception tương ứng trong service/controller.

## Ví dụ
```typescript
// forbidden.exception.ts
import { ForbiddenException } from '@nestjs/common';

export class CustomForbiddenException extends ForbiddenException {
  constructor(message = 'Bạn không có quyền truy cập!') {
    super(message);
  }
}

// Sử dụng trong service/controller
if (!user.isAdmin) {
  throw new CustomForbiddenException();
}
```

## Lưu ý
- Chỉ đặt các exception dùng chung tại đây. Exception đặc thù cho từng module nên đặt trong module tương ứng.
- Đặt tên file và tên class exception rõ ràng, dễ hiểu.
- Viết tài liệu ngắn gọn cho mỗi exception nếu cần.

---
Mọi thắc mắc hoặc góp ý, vui lòng liên hệ team backend.
