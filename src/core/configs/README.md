# core/configs

Thư mục này chứa các file cấu hình cho các dịch vụ và thành phần cốt lõi của hệ thống.

## Các file cấu hình

- **cloudinary.config.ts**: Cấu hình cho dịch vụ lưu trữ và quản lý hình ảnh Cloudinary (API key, secret, cloud name, ...).
- **email.config.ts**: Cấu hình cho dịch vụ gửi email (SMTP, tài khoản, mật khẩu, ...).
- **README.md**: Tài liệu mô tả các file cấu hình trong thư mục này.

## Hướng dẫn sử dụng

Các file cấu hình này được import vào các module tương ứng trong hệ thống để khởi tạo và sử dụng các dịch vụ bên ngoài.

- Đảm bảo cập nhật các biến môi trường cần thiết trong file `.env` hoặc cấu hình môi trường tương ứng.
- Tham khảo từng file để biết chi tiết các tham số cấu hình cần thiết.
