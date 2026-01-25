# infras

Thư mục này chứa các thành phần hạ tầng (infrastructure) hỗ trợ cho hệ thống, như logging, cache, ...

## Mục đích
- Tách biệt các thành phần hạ tầng ra khỏi business logic để dễ bảo trì, mở rộng và tái sử dụng.
- Đảm bảo các dịch vụ hạ tầng (log, cache, ...) có thể dùng chung cho toàn bộ hệ thống.

## Cấu trúc thư mục
- **loggers/**: Các thành phần ghi log, giám sát hệ thống.
- **cache/**: Các thành phần liên quan đến cache (bộ nhớ đệm).
- **...**

## Hướng dẫn mở rộng
- Khi cần thêm dịch vụ hạ tầng mới (ví dụ: queue, storage, ...), tạo thư mục tương ứng trong `infras/`.
- Đặt các service, module, provider liên quan vào đúng thư mục con.

## Tham khảo
- Xem README trong từng thư mục con để biết chi tiết cách sử dụng từng thành phần hạ tầng.
