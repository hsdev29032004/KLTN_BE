# modules

Thư mục này chứa các module tính năng (feature modules) của hệ thống.

## Mục đích
- Tách biệt các chức năng thành từng module riêng biệt để dễ quản lý, mở rộng và bảo trì.
- Mỗi module sẽ quản lý các controller, service, provider, entity liên quan đến một nghiệp vụ cụ thể.

## Cấu trúc đề xuất
- **app/**: Module ứng dụng chính (AppModule)
- **user/**: Module quản lý người dùng
- **auth/**: Module xác thực, phân quyền
- ... (các module khác theo nghiệp vụ)

## Hướng dẫn mở rộng
- Khi cần thêm chức năng mới, tạo module mới trong thư mục này.
- Đặt tên module theo nghiệp vụ, ví dụ: `order`, `product`, ...
- Mỗi module nên có README riêng mô tả chức năng và cấu trúc.

## Tham khảo
- Xem tài liệu NestJS về [Modules](https://docs.nestjs.com/modules) để hiểu rõ hơn về cách tổ chức và mở rộng module.
