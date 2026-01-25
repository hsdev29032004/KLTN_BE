# modules/app

Đây là module ứng dụng chính (AppModule) của hệ thống.

## Vai trò
- Khởi tạo và cấu hình các thành phần cốt lõi khi ứng dụng NestJS được chạy.
- Import, kết nối các module con, service, provider cần thiết cho toàn bộ hệ thống.

## Thành phần chính
- **AppController**: Xử lý các route mặc định hoặc route kiểm tra trạng thái hệ thống.
- **AppService**: Chứa các logic xử lý chung cho toàn hệ thống.
- **AppModule**: Định nghĩa cấu trúc module chính, import các module con, cấu hình provider, ...

## Hướng dẫn mở rộng
- Khi cần thêm module chức năng mới, import vào AppModule.
- Đăng ký các provider, middleware, interceptor dùng chung tại đây nếu cần áp dụng toàn hệ thống.

## Tham khảo
- Xem tài liệu NestJS về [Modules](https://docs.nestjs.com/modules) để hiểu rõ hơn về cách tổ chức và mở rộng module.
