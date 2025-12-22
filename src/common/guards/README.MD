# Guards

Thư mục này chứa các **guard** dùng chung cho dự án. Guard là các "bảo vệ" giúp kiểm soát quyền truy cập vào các API hoặc chức năng trong hệ thống.

## Công dụng
- Kiểm tra quyền truy cập của người dùng trước khi cho phép thực hiện một hành động (ví dụ: xác thực, phân quyền, kiểm tra trạng thái tài khoản, ...).
- Ngăn chặn các request không hợp lệ hoặc không đủ điều kiện truy cập.
- Bảo vệ các tài nguyên quan trọng của hệ thống.

## Cách hoạt động
- Khi có request gửi đến, guard sẽ được thực thi trước controller.
- Nếu guard trả về true, request được phép tiếp tục.
- Nếu guard trả về false (hoặc throw exception), request sẽ bị chặn lại.

## Hướng dẫn sử dụng
1. **Tạo guard mới:**
   - Tạo file mới trong thư mục này, đặt tên theo chức năng (ví dụ: `permission.guard.ts`).
   - Định nghĩa guard theo chuẩn NestJS (implement CanActivate).
2. **Sử dụng guard:**
   - Đăng ký guard ở cấp toàn cục (global) hoặc cho từng controller/route bằng decorator `@UseGuards`.

## Ví dụ
```typescript
// permission.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class PermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Kiểm tra quyền truy cập ở đây
    return true;
  }
}

// Sử dụng trong controller
@UseGuards(PermissionGuard)
@Get('protected')
getProtectedData() {
  // ...
}
```

## Lưu ý
- Chỉ đặt các guard dùng chung tại đây. Guard đặc thù cho từng module nên đặt trong module tương ứng.
- Đặt tên file và tên class guard rõ ràng, dễ hiểu.
- Viết tài liệu ngắn gọn cho mỗi guard nếu cần.

---
Mọi thắc mắc hoặc góp ý, vui lòng liên hệ team backend.
