
# Decorators (Giải thích dễ hiểu)

Thư mục này dùng để lưu các "decorator" – bạn có thể hiểu đơn giản đây là những "nhãn dán" đặc biệt mà lập trình viên gắn vào các đoạn mã để bổ sung chức năng hoặc kiểm soát luồng xử lý của hệ thống. Decorator giúp mọi thứ rõ ràng, dễ kiểm soát và tái sử dụng, giống như việc dán nhãn lên các hộp để biết bên trong có gì và xử lý cho đúng.

## Decorator dùng để làm gì?
- Giúp kiểm tra quyền truy cập (ai được phép làm gì).
- Ghi lại thông tin hoạt động (logging).
- Kiểm tra dữ liệu đầu vào.
- Và nhiều chức năng khác mà cả dự án đều cần dùng chung.

## Các decorator có sẵn:
- **@PublicApi()**: API công khai, không cần đăng nhập và không cần quyền
- **@SkipPermission()**: Chỉ cần đăng nhập, không cần kiểm tra quyền (permission)
- **@Roles(['Admin'])**: Cần đăng nhập và phải có role cụ thể
- (Mặc định): Cần đăng nhập và phải có quyền trong hệ thống RBAC


## Các Decorator có sẵn

### @PublicAPI()
Đánh dấu API là public, không cần authentication và authorization.

**Cách sử dụng:**
```typescript
import { PublicAPI } from '@/common/decorators/public-api.decorator';

@PublicAPI()
@Post('login')
async login(@Body() loginDto: LoginDto) {
  return this.authService.login(loginDto);
}
```

### @Roles(...roles)
Kiểm tra role của user, chỉ cho phép các role được chỉ định truy cập.

**Cách sử dụng:**
```typescript
import { Roles } from '@/common/decorators/roles.decorator';

// Chỉ cho phép teacher
@Roles('teacher')
@Get('courses')
getCourses() {
  return this.courseService.findAll();
}

// Cho phép nhiều roles
@Roles('admin', 'teacher')
@Post('course')
createCourse(@Body() dto: CreateCourseDto) {
  return this.courseService.create(dto);
}
```

### @CurrentUser()
Lấy thông tin user hiện tại từ request.

**Cách sử dụng:**
```typescript
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Get('profile')
getProfile(@CurrentUser() user: any) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}
```

## Logic phân quyền

Hệ thống áp dụng theo thứ tự ưu tiên:

1. **@PublicAPI()** - Bỏ qua toàn bộ authentication và authorization
2. **@Roles('role1', 'role2')** - Chỉ check role của user (không check permission trong DB)
3. **Mặc định** - Check RBAC (api và method trong permission model) - dành cho admin

### Ví dụ

```typescript
// API public - ai cũng truy cập được
@PublicAPI()
@Post('register')
async register() { }

// API chỉ cho teacher và admin - check theo role
@Roles('teacher', 'admin')
@Get('courses')
async getCourses() { }

// API mặc định - check RBAC trong DB (dành cho admin)
@Post('users')
async createUser() { }
```
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
