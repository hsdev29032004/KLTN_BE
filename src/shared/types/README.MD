# shared/types

Thư mục này chứa các type, interface dùng chung cho toàn bộ hệ thống.

## Mục đích
- Định nghĩa các kiểu dữ liệu, interface, type alias dùng chung giữa các module.
- Giúp đồng bộ kiểu dữ liệu, giảm lặp code và tăng tính an toàn khi phát triển.

## Hướng dẫn sử dụng
- Import các type/interface từ thư mục này vào các module, service, controller khi cần dùng.

### Ví dụ định nghĩa và sử dụng type/interface
```typescript
// Định nghĩa type
export type UserId = string | number;

// Định nghĩa interface
export interface UserPayload {
	id: UserId;
	email: string;
	role: string;
}

// Sử dụng type/interface
import { UserPayload, UserId } from '../shared/types/user.type';
```

