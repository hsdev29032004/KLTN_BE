# infras/cache

Thư mục này chứa các thành phần liên quan đến cache (bộ nhớ đệm) cho hệ thống.

## Mục đích
- Tăng hiệu năng truy xuất dữ liệu bằng cách lưu tạm thời các kết quả truy vấn hoặc dữ liệu thường xuyên sử dụng.
- Giảm tải cho database và các dịch vụ backend khác.

## Hướng dẫn sử dụng
- Định nghĩa các service, provider hoặc utility liên quan đến cache tại đây.
- Có thể sử dụng các giải pháp cache như Redis, MemoryStore, ...
- Khi cần sử dụng cache, import các thành phần từ thư mục này vào module hoặc service tương ứng.

## Lưu ý
- Đảm bảo dữ liệu cache được làm mới (invalidate) đúng lúc để tránh dữ liệu cũ.
- Cấu hình cache phù hợp với môi trường production và development.
