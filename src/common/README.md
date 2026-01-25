# Common

Thư mục `common` chứa các thành phần dùng chung cho toàn bộ dự án, giúp tái sử dụng code, chuẩn hóa xử lý và giảm trùng lặp logic giữa các module.

## Các thành phần chính
- **decorators/**: Các nhãn dán (decorator) bổ sung chức năng cho controller, method, parameter, v.v.
- **exceptions/**: Định nghĩa các loại lỗi (exception) dùng chung.
- **filters/**: Xử lý và chuẩn hóa lỗi trả về cho client.
- **guards/**: Kiểm soát quyền truy cập, bảo vệ tài nguyên hệ thống.
- **interceptors/**: Ghi log, biến đổi dữ liệu trả về, xử lý logic chung trước/sau controller.
- **pipes/**: Kiểm tra, chuyển đổi, chuẩn hóa dữ liệu đầu vào.

## Mục đích
- Tăng khả năng tái sử dụng và bảo trì hệ thống.
- Chuẩn hóa cách xử lý lỗi, kiểm soát truy cập, validate dữ liệu, ...
- Giúp code ngắn gọn, rõ ràng, dễ mở rộng.

## Lưu ý
- Chỉ đặt các thành phần dùng chung tại đây. Thành phần đặc thù cho từng module nên đặt trong module tương ứng.
- Đặt tên file, tên class rõ ràng, dễ hiểu.
- Viết tài liệu ngắn gọn cho từng thành phần nếu cần.
