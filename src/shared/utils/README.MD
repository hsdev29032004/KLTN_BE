# shared/utils

Thư mục này chứa các hàm tiện ích (utility functions) dùng chung cho toàn bộ hệ thống.

## Mục đích
- Tổng hợp các hàm xử lý logic nhỏ, tái sử dụng nhiều nơi (ví dụ: format dữ liệu, validate, ...).
- Giúp giảm lặp code và tăng tính nhất quán khi xử lý dữ liệu.

## Hướng dẫn sử dụng
- Import các hàm tiện ích từ thư mục này vào các module, service, controller khi cần dùng.

Ví dụ:
```typescript
import { formatDate } from '../shared/utils/date.util';
```

