# core

Thư mục này chứa các thành phần cốt lõi (core) dùng chung cho toàn bộ hệ thống.

## Cấu trúc thư mục

- **configs/**: Các file cấu hình cho dịch vụ bên ngoài (Cloudinary, Email, ...)
- **middlewares/**: Các middleware xử lý request/response ở tầng trung gian
- **...**

## Mục đích

Tách biệt các thành phần dùng chung, cấu hình, middleware để dễ dàng tái sử dụng và bảo trì trong toàn bộ dự án.

## Hướng dẫn mở rộng

- Khi cần thêm cấu hình cho dịch vụ mới, tạo file trong `configs/`.
- Khi cần thêm middleware, tạo file trong `middlewares/` và đăng ký ở module tương ứng.

## Tham khảo
- Xem thêm README trong từng thư mục con để biết chi tiết cách sử dụng.
