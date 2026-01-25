# shared

Thư mục này chứa các thành phần dùng chung (shared) cho toàn bộ hệ thống.

## Mục đích
- Tổng hợp các hằng số, kiểu dữ liệu, hàm tiện ích dùng chung giữa các module.
- Giúp giảm lặp code, tăng tính nhất quán và dễ bảo trì.

## Cấu trúc thư mục
- **constants/**: Các hằng số dùng chung (role, status, message, ...)
- **types/**: Các type, interface dùng chung
- **utils/**: Các hàm tiện ích dùng chung

## Hướng dẫn mở rộng
- Khi cần thêm hằng số, type hoặc hàm tiện ích mới, tạo file tương ứng trong thư mục con phù hợp.
- Đặt tên file rõ ràng, dễ hiểu theo chức năng.

## Tham khảo
- Xem README trong từng thư mục con để biết chi tiết cách sử dụng.
