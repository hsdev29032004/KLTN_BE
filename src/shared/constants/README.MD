# shared/constants

Thư mục này chứa các hằng số (constant) dùng chung cho toàn bộ hệ thống.

## Mục đích
- Định nghĩa các giá trị cố định như tên role, status, message, ...
- Giúp quản lý tập trung, dễ thay đổi và tái sử dụng.

## Quy định đặt tên
- Tên hằng số phải được viết HOA_TOÀN_BỘ, các từ cách nhau bằng dấu gạch dưới (_).
- Ví dụ: USER_ROLE, MAX_LENGTH, DEFAULT_STATUS

## Hướng dẫn sử dụng
- Import các hằng số từ thư mục này vào các module, service, controller khi cần dùng.

### Ví dụ sử dụng
```typescript
// Định nghĩa hằng số
export const USER_ROLE = {
	ADMIN: 'admin',
	USER: 'user',
};

export const MAX_LENGTH = 255;

// Sử dụng hằng số
import { USER_ROLE, MAX_LENGTH } from '../shared/constants/user.constant';
```

