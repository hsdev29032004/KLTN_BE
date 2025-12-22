
# Decorators (Giải thích dễ hiểu)

Thư mục này dùng để lưu các "decorator" – bạn có thể hiểu đơn giản đây là những "nhãn dán" đặc biệt mà lập trình viên gắn vào các đoạn mã để bổ sung chức năng hoặc kiểm soát luồng xử lý của hệ thống. Decorator giúp mọi thứ rõ ràng, dễ kiểm soát và tái sử dụng, giống như việc dán nhãn lên các hộp để biết bên trong có gì và xử lý cho đúng.

## Decorator dùng để làm gì?
- Giúp kiểm tra quyền truy cập (ai được phép làm gì).
- Ghi lại thông tin hoạt động (logging).
- Kiểm tra dữ liệu đầu vào.
- Và nhiều chức năng khác mà cả dự án đều cần dùng chung.

## Lấy thông tin người dùng từ access_token

Sử dụng decorator `@CurrentUser()` để lấy thông tin chi tiết user gửi request, bao gồm role và permission, bằng cách tự động giải mã access_token và truy vấn database.

Ví dụ:
```typescript
@Get('me')
async getMe(@CurrentUser() user) {
	return user;
}
```
Xem file `current-user.decorator.ts` để biết chi tiết.

## Mẫu kiểm soát quyền truy cập toàn hệ thống

Để chặn tất cả các API mà người dùng không được phép truy cập (trừ các API có gắn nhãn @PublicAPI), bạn có thể dùng mẫu sau:

1. **Tạo decorator @PublicAPI** để đánh dấu các API công khai (không cần kiểm tra quyền).
2. **Tạo PermissionGuard** để kiểm tra quyền truy cập dựa trên mảng permission của user.
3. **Áp dụng PermissionGuard** cho toàn bộ hệ thống (ở AppModule hoặc controller gốc).

### Cách dùng:

- Gắn @PublicAPI vào các API công khai:
	```typescript
	@PublicAPI()
	@Get('public-endpoint')
	getPublicData() { /* ... */ }
	```
- Các API còn lại sẽ tự động bị kiểm tra quyền dựa trên mảng permission của user (dạng {route, method}).

Xem file `public-api.decorator.ts` và `permission.guard.ts` trong thư mục `common` để biết chi tiết.

## Cách hoạt động (luồng xử lý)
Khi một người dùng (client) gửi yêu cầu (request) tới hệ thống, ví dụ như truy cập vào một đường dẫn đặc biệt (API), hệ thống sẽ làm các bước sau:

1. **Nhận yêu cầu:** Hệ thống nhận được yêu cầu từ người dùng.
2. **Kiểm tra nhãn dán (decorator):** Nếu đoạn mã có gắn nhãn kiểm tra quyền, hệ thống sẽ xem người dùng có đủ quyền không.
3. **Kiểm tra bảo vệ (guard):** Nếu có, hệ thống sẽ tiếp tục kiểm tra sâu hơn dựa trên thông tin từ decorator.
4. **Xử lý yêu cầu:** Nếu mọi thứ hợp lệ, hệ thống sẽ thực hiện chức năng mà người dùng yêu cầu.
5. **Trả kết quả:** Hệ thống gửi lại kết quả cho người dùng.

### Minh họa đơn giản

Hãy tưởng tượng bạn đến một tòa nhà:
- Ở cửa có bảo vệ (guard) kiểm tra thẻ (decorator) của bạn.
- Nếu thẻ hợp lệ, bạn được vào bên trong và thực hiện công việc.
- Nếu không hợp lệ, bạn sẽ bị từ chối ngay từ cửa.

### Sơ đồ tổng quát

Người dùng → [Kiểm tra nhãn dán] → [Bảo vệ kiểm tra] → Xử lý yêu cầu → Trả kết quả

## Lưu ý
- Chỉ nên đặt các nhãn dán dùng chung ở đây. Nếu chỉ dùng riêng cho một phần nào đó, hãy để ở đúng nơi sử dụng.
- Đặt tên rõ ràng, dễ hiểu để mọi người cùng làm việc thuận tiện.

---
Nếu có thắc mắc hoặc góp ý, hãy liên hệ team backend để được hỗ trợ!
