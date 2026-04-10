## 1. Xác Thực (Auth)

### 1.1 Đăng nhập

**Unit** `login()` trong class `AuthService`

**Route:** `POST /api/auth/login` — `@PublicAPI()`

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| email | string | @IsEmail, @IsNotEmpty | Email đăng nhập |
| password | string | @IsString, @IsNotEmpty, @MinLength(6) | Mật khẩu |

**Output:**

Trường hợp thành công:
- Trả về object chứa:
  - `accessToken`: JWT access token
  - `refreshToken`: JWT refresh token
  - `user`: Thông tin user (không chứa password, refreshToken)
- Controller set cookies: `access_token` (httpOnly), `refresh_token` (httpOnly)
- Controller trả về `{ message: "Đăng nhập thành công", data: { user } }`

Trường hợp lỗi:
- `UnauthorizedException("Email is required")` — nếu email rỗng/null
- `UnauthorizedException("Password is required")` — nếu password rỗng/null
- `UnauthorizedException("Invalid credentials")` — nếu không tìm thấy user hoặc user đã bị xóa mềm (isDeleted = true)
- `UnauthorizedException("Invalid credentials")` — nếu mật khẩu không khớp (bcrypt.compare)
- `UnauthorizedException("User is banned")` — nếu user có banId, timeUnBan và thời gian hiện tại < timeUnBan

**Process:**
1. Nhận `LoginDto` gồm `email`, `password` từ controller.
2. Kiểm tra email rỗng → ném `UnauthorizedException("Email is required")`.
3. Kiểm tra password rỗng → ném `UnauthorizedException("Password is required")`.
4. Gọi `prisma.user.findUnique({ where: { email } })` kèm include `role` (cùng `rolePermissions.permission`) và `ban`.
5. Nếu không tìm thấy user hoặc `user.isDeleted === true` → ném `UnauthorizedException("Invalid credentials")`.
6. So sánh mật khẩu bằng `bcrypt.compare(password, user.password)`.
   - Nếu không khớp → ném `UnauthorizedException("Invalid credentials")`.
7. Kiểm tra ban: nếu `user.banId` và `user.timeUnBan` tồn tại và `new Date() < user.timeUnBan` → ném `UnauthorizedException("User is banned")`.
8. Tạo payload từ `buildJwtPayload(user)`.
9. Ký `accessToken` bằng `ACCESSTOKEN_SECRET_KEY` với thời hạn `ACCESSTOKEN_EXPIRE`.
10. Ký `refreshToken` bằng `REFRESHTOKEN_SECRET_KEY` với thời hạn `REFRESHTOKEN_EXPIRE` (thêm `type: 'refresh'`).
11. Lưu `refreshToken` vào DB: `prisma.user.update({ data: { refreshToken } })`.
12. Loại bỏ `password` và `refreshToken` khỏi object user, trả về `{ accessToken, refreshToken, user }`.

---

### 1.2 Đăng ký

**Unit** `register()` trong class `AuthService`

**Route:** `POST /api/auth/register` — `@PublicAPI()`

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| email | string | @IsEmail, @IsNotEmpty | Email đăng ký |
| password | string | @IsString, @IsNotEmpty, @MinLength(6) | Mật khẩu |
| name | string | @IsString, @IsNotEmpty | Họ tên |
| role | string | @IsOptional, @IsString | Vai trò ("user" hoặc "teacher") |

**Output:**

Trường hợp thành công:
- Trả về object:
  - `id`: UUID của user mới tạo
  - `email`: Email
  - `fullName`: Họ tên
  - `slug`: Slug tự động từ tên (e.g. `nguyen-van-a-1712345678`)
  - `avatar`: null
  - `role`: { id, name }

Trường hợp lỗi:
- `UnauthorizedException("Invalid register payload")` — nếu payload null hoặc không phải object
- `UnauthorizedException("Email already exists")` — nếu email đã tồn tại trong DB
- `UnauthorizedException("Missing required fields")` — nếu thiếu email, password, fullName hoặc role
- `UnauthorizedException("Default role not found")` — nếu role "user" không tồn tại trong DB
- `UnauthorizedException("Requested role not found")` — nếu client gửi role là "teacher" nhưng role đó không tồn tại trong DB

**Process:**
1. Nhận `registerDto` từ controller.
2. Kiểm tra payload hợp lệ (phải là object) → ném `UnauthorizedException("Invalid register payload")` nếu không.
3. Trích xuất `email`, `password`, `fullName` (hỗ trợ cả field `name`), `role` (normalize lowercase).
4. Kiểm tra email đã tồn tại: `prisma.user.findUnique({ where: { email } })`.
   - Nếu tồn tại → ném `UnauthorizedException("Email already exists")`.
5. Kiểm tra đủ trường bắt buộc (email, password, fullName, role) → ném `UnauthorizedException("Missing required fields")`.
6. Hash password bằng `bcrypt.hash(password, BCRYPT_SALT)`.
7. Lấy role mặc định "user": `prisma.role.findFirst({ where: { name: "user" } })`.
   - Nếu không tìm thấy → ném `UnauthorizedException("Default role not found")`.
8. Nếu role gửi lên là "teacher", tìm role teacher: `prisma.role.findFirst({ where: { name: "teacher" } })`.
   - Nếu không tìm thấy → ném `UnauthorizedException("Requested role not found")`.
9. Tạo user mới: `prisma.user.create()` với `slug = fullName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()`.
10. Trả về thông tin user (không bao gồm password).

---

### 1.3 Lấy thông tin người dùng hiện tại

**Unit** `fetchMe()` trong class `AuthController` (Controller lấy user từ JWT middleware)

**Route:** `GET /api/auth/me` — `@SkipPermission()` (yêu cầu đăng nhập)

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| user | IUser | @User() decorator (từ JWT) | Thông tin user đã giải mã từ token |

**Output:**

Trường hợp thành công:
- `{ message: "User information retrieved successfully", data: user }` — trả về thông tin user kèm role và ban (đã được middleware xử lý).

Trường hợp lỗi:
- `401 Unauthorized` — nếu không có hoặc token không hợp lệ (do Guard/Middleware xử lý).

**Process:**
1. Middleware/Guard giải mã JWT, inject user vào request.
2. Controller nhận user từ `@User()` decorator.
3. Trả về `{ message, data: user }`.

---

### 1.4 Đăng xuất

**Unit** `logout()` trong class `AuthService`

**Route:** `POST /api/auth/logout` — `@SkipPermission()` (yêu cầu đăng nhập)

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| userId | string | Từ user đăng nhập (JWT) | ID user hiện tại |

**Output:**

Trường hợp thành công:
- Xóa refreshToken trong DB: `prisma.user.update({ data: { refreshToken: null } })`
- Controller xóa cookies: `access_token`, `refresh_token`
- Trả về `{ message: "Đăng xuất thành công!" }`

**Process:**
1. Nhận `userId` từ controller (lấy từ JWT).
2. Gọi `prisma.user.update({ where: { id: userId }, data: { refreshToken: null } })`.
3. Controller xóa cookies và trả message.

---

### 1.5 Làm mới token

**Unit** `refreshToken()` trong class `AuthService`

**Route:** `POST /api/auth/refresh-token` — `@PublicAPI()`

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| refreshToken | string | Cookie `refresh_token` | Refresh token hiện tại |

**Output:**

Trường hợp thành công:
- Trả về object:
  - `accessToken`: JWT access token mới
  - `refreshToken`: JWT refresh token mới
  - `user`: { id, email, fullName, avatar, role: { id, name } }
  - `ban`: { id, reason } hoặc null
- Controller cập nhật cookies mới.

Trường hợp lỗi:
- `UnauthorizedException("Refresh token is required")` — nếu refreshToken rỗng/null
- `UnauthorizedException("Invalid or expired refresh token")` — nếu verify thất bại
- `UnauthorizedException("Invalid refresh token")` — nếu không tìm thấy user với id và refreshToken tương ứng trong DB, hoặc user đã bị xóa
- `UnauthorizedException("User is banned")` — nếu user đang bị ban

**Process:**
1. Nhận `refreshToken` từ cookie.
2. Kiểm tra rỗng → ném `UnauthorizedException("Refresh token is required")`.
3. Verify token bằng `REFRESHTOKEN_SECRET_KEY`.
   - Nếu lỗi → ném `UnauthorizedException("Invalid or expired refresh token")`.
4. Tìm user: `prisma.user.findFirst({ where: { id: decoded.id, refreshToken, isDeleted: false } })` kèm include role và ban.
   - Nếu không tìm thấy → ném `UnauthorizedException("Invalid refresh token")`.
5. Kiểm tra ban: nếu `user.banId && user.timeUnBan && new Date() < user.timeUnBan` → ném `UnauthorizedException("User is banned")`.
6. Tạo payload mới, ký access token mới và refresh token mới.
7. Cập nhật refreshToken mới vào DB.
8. Trả về `{ accessToken, refreshToken, user, ban }`.

---

## 2. Khóa Học (Course)

### 2.1 Tạo khóa học

**Unit** `createCourse()` trong class `CourseService`

**Route:** `POST /api/course` — `@Roles('teacher')`

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| userId | string | Từ JWT | ID giảng viên |
| name | string | @IsString | Tên khóa học |
| price | number | @IsInt, @Min(0) | Giá khóa học |
| thumbnail | string | @IsString | URL ảnh bìa |
| content | string | @IsString | Nội dung HTML |
| description | string | @IsString | Mô tả ngắn |

**Output:**

Trường hợp thành công:
- `{ message: "Tạo khóa học thành công", data: course }` — course có `status = "draft"`, slug tự động từ tên.

**Process:**
1. Nhận `userId` và `CreateCourseDto` từ controller.
2. Tạo slug từ tên: `generateSlug(dto.name)`.
3. Kiểm tra slug trùng: `prisma.course.findUnique({ where: { slug } })`.
   - Nếu trùng, thêm timestamp: `slug-${Date.now()}`.
4. Tạo khóa học: `prisma.course.create()` với `status = "draft"`, `star = 0`, `studentCount = 0`.
5. Trả về `{ message, data: course }`.

---

### 2.2 Cập nhật khóa học

**Unit** `updateCourse()` trong class `CourseService`

**Route:** `PUT /api/course/:courseId` — Yêu cầu đăng nhập

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| userId | string | Từ JWT | ID giảng viên |
| courseId | string | Từ URL param | ID khóa học |
| name | string? | Optional | Tên mới |
| price | number? | Optional | Giá mới |
| thumbnail | string? | Optional | URL ảnh bìa mới |
| content | string? | Optional | Nội dung mới |
| description | string? | Optional | Mô tả mới |

**Output:**

Trường hợp thành công:
- `{ message: "Cập nhật khóa học thành công", data: updated }` — khóa học đã cập nhật.

Trường hợp lỗi:
- `NotFoundException("Khóa học không tồn tại")` — nếu không tìm thấy hoặc đã bị xóa mềm
- `ForbiddenException("Bạn không có quyền thao tác khóa học này")` — nếu `course.userId !== userId`

**Process:**
1. Nhận `userId`, `courseId`, `UpdateCourseDto` từ controller.
2. Tìm khóa học: `prisma.course.findFirst({ where: { id: courseId, isDeleted: false } })`.
   - Nếu không tìm thấy → ném `NotFoundException("Khóa học không tồn tại")`.
3. Kiểm tra quyền sở hữu: `course.userId !== userId` → ném `ForbiddenException(...)`.
4. Nếu `dto.name` khác `course.name` → tạo slug mới, kiểm tra trùng.
5. Cập nhật: `prisma.course.update({ where: { id: courseId }, data })`.
6. Trả về `{ message, data: updated }`.

---

### 2.3 Xóa khóa học

**Unit** `deleteCourse()` trong class `CourseService`

**Route:** `DELETE /api/course/:courseId` — Yêu cầu đăng nhập

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| userId | string | JWT | ID giảng viên |
| courseId | string | URL param | ID khóa học |

**Output:**

Trường hợp thành công:
- `{ message: "Xóa khóa học thành công" }`

Trường hợp lỗi:
- `NotFoundException("Khóa học không tồn tại")` — nếu không tìm thấy hoặc đã xóa
- `ForbiddenException("Bạn không có quyền thao tác khóa học này")` — nếu không phải chủ sở hữu

**Process:**
1. Tìm khóa học: `prisma.course.findFirst({ where: { id, isDeleted: false } })`.
   - Nếu không tìm thấy → ném `NotFoundException`.
2. Kiểm tra ownership → ném `ForbiddenException` nếu không phải chủ.
3. Thực hiện **soft delete** trong transaction:
   - Course: `status = "outdated"`, `isDeleted = true`, `deletedAt = now()`
   - Tất cả Lesson: `status = "outdated"`, `isDeleted = true`
   - Tất cả LessonMaterial: `status = "outdated"`, `isDeleted = true`
   - Tất cả Exam: `status = "outdated"`, `isDeleted = true`
4. Trả về message.

---

### 2.4 Lấy danh sách khóa học (public)

**Unit** `findAll()` trong class `CourseService`

**Route:** `GET /api/course` — Public

**Input:** Không có tham số (hoặc `ids` query param để lấy theo danh sách ID).

**Output:**

Trường hợp thành công:
- `{ message: "Lấy danh sách khóa học thành công", data: courses[] }` — chỉ trả về khóa học có `status in [published, update, need_update]` và `isDeleted = false`.
- Mỗi course bao gồm: `id, name, slug, thumbnail, price, star, status, studentCount, createdAt, user { id, fullName, avatar }, courseTopics[].topic { id, name, slug }`.

**Process:**
1. Query: `prisma.course.findMany()` với `where: { isDeleted: false, status: { in: [published, update, need_update] } }`.
2. Sắp xếp theo `createdAt desc`.
3. Trả về `{ message, data: courses }`.

---

### 2.5 Tìm kiếm khóa học

**Unit** `searchCourses()` trong class `CourseService`

**Route:** `GET /api/course/search` — Public

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| name | string? | Optional | Tìm theo tên (case-insensitive, contains) |
| teacherId | string? | Optional | Lọc theo ID giảng viên |
| teacherName | string? | Optional | Tìm theo tên giảng viên (case-insensitive) |
| topicId | string? | Optional | Lọc theo 1 chủ đề |
| topicIds | string[]? | Optional, CSV transform | Lọc theo nhiều chủ đề |
| minPrice | number? | @IsInt, @Min(0) | Giá tối thiểu |
| maxPrice | number? | @IsInt, @Min(0) | Giá tối đa |
| minStar | number? | @IsNumber, 0-5 | Số sao tối thiểu |
| maxStar | number? | @IsNumber, 0-5 | Số sao tối đa |
| fromDate | string? | ISO date string | Từ ngày tạo |
| toDate | string? | ISO date string | Đến ngày tạo |
| sortBy | string? | @IsIn([createdAt, price, star, studentCount]) | Trường sắp xếp, mặc định "createdAt" |
| sortOrder | string? | @IsIn([asc, desc]) | Chiều sắp xếp, mặc định "desc" |
| page | number? | @IsInt, @Min(1) | Trang, mặc định 1 |
| limit | number? | @IsInt, 1-100 | Số kết quả/trang, mặc định 20 |

**Output:**

Trường hợp thành công:
- Object chứa:
  - `message: "Tìm kiếm khóa học thành công"`
  - `data: courses[]` — danh sách khóa học phù hợp
  - `meta: { total, page, limit, totalPages }`

**Process:**
1. Parse và coerce các query param về đúng kiểu (number, page >= 1, limit 1-100).
2. Xây dựng `where`: bắt buộc `isDeleted: false`, `status in [published, update, need_update]`.
3. Thêm các bộ lọc tùy điều kiện:
   - `name` → `{ contains, mode: 'insensitive' }`
   - `teacherId` → `userId = teacherId`
   - `teacherName` → `user.fullName contains insensitive`
   - `topicIds` → `courseTopics.some.topicId in topicIds`
   - `minPrice / maxPrice` → `price.gte / price.lte`
   - `minStar / maxStar` → `star.gte / star.lte`
   - `fromDate / toDate` → `createdAt.gte / createdAt.lte`
4. Thực hiện 2 query song song: `findMany` (có pagination, sort) + `count`.
5. Trả về `{ message, data, meta }`.

---

### 2.6 Xem chi tiết khóa học

**Unit** `findBySlugOrId()` trong class `CourseService`

**Route:** `GET /api/course/:key` — Support cả slug và ID

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| key | string | URL param | Slug hoặc ID khóa học |
| user | IUser? | JWT (optional) | User hiện tại (nếu đăng nhập) |

**Output:**

Trường hợp thành công:
- Object:
  - `message: "Lấy thông tin khóa học thành công"`
  - `data: course` — bao gồm: thông tin khóa học, user (giảng viên), publisher, courseTopics, lessons (kèm materials), reviews, exams, approvals, _count
  - `canAccess: boolean` — cho biết user có toàn quyền truy cập hay không

Trường hợp lỗi:
- `NotFoundException("Khóa học không tồn tại")` — nếu không tìm thấy hoặc đã xóa

**Process:**
1. Tìm khóa học cơ bản: `prisma.course.findFirst({ where: { OR: [{ slug: key }, { id: key }], isDeleted: false } })`.
   - Nếu không tìm thấy → ném `NotFoundException("Khóa học không tồn tại")`.
2. Xác định quyền truy cập:
   - `isOwner`: user.id === course.userId
   - `isSpecialRole`: role không phải "user" và không phải "teacher" (ví dụ: admin)
   - `isPrivileged = isOwner || isSpecialRole`
3. Nếu privileged → hiển thị tất cả lesson/material/exam (kể cả draft).
4. Nếu không privileged → chỉ hiển thị lesson/material/exam có `status in [published, outdated]`.
5. Query full course data với includes.
6. Kiểm tra thêm: nếu không privileged, check user đã mua → `canAccess = true`.
7. Trả về `{ message, data: course, canAccess }`.

---

### 2.7 Lấy danh sách khóa học đã mua

**Unit** `findMyCourses()` trong class `CourseService`

**Route:** `GET /api/course/purchased` — `@SkipPermission()` (yêu cầu đăng nhập)

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| userId | string | JWT | ID user hiện tại |

**Output:**

Trường hợp thành công:
- `{ message: "Lấy danh sách khóa học đã mua thành công", data: courses[] }` — danh sách khóa học đã mua (published/update/need_update)

**Process:**
1. Query `prisma.userCourse.findMany({ where: { userId } })` lấy danh sách courseId.
2. Nếu rỗng → trả về `{ data: [] }`.
3. Query `prisma.course.findMany()` với `id in courseIds`, `isDeleted: false`, `status in [published, update, need_update]`.
4. Trả về `{ message, data: courses }`.

---

### 2.8 Lấy khóa học theo user (giảng viên)

**Unit** `findByUserId()` trong class `CourseService`

**Route:** `GET /api/course/user/:userId` — Public

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| userId | string | URL param | ID giảng viên |

**Output:**

Trường hợp thành công:
- `{ message: "Lấy danh sách khóa học theo user thành công", data: courses[] }` — tất cả khóa học của giảng viên (chưa xóa).

**Process:**
1. Query `prisma.course.findMany({ where: { userId, isDeleted: false } })`.
2. Sắp xếp `createdAt desc`.
3. Trả về `{ message, data }`.

---

### 2.9 Lấy danh sách khóa học (Admin)

**Unit** `findAllForAdmin()` trong class `CourseService`

**Route:** `GET /api/course/admin/all` — `@Roles('admin')`

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| status | string? | Query param | Lọc theo trạng thái |
| userId | string? | Query param | Lọc theo giảng viên |
| page | string? | Query param | Trang, mặc định "1" |
| limit | string? | Query param | Số/trang, mặc định "20", max 100 |

**Output:**

Trường hợp thành công:
- Object:
  - `message: "Lấy danh sách khóa học thành công"`
  - `data: courses[]` — bao gồm thêm `description`, `publishedAt`, approval mới nhất
  - `meta: { total, page, limit, totalPages }`

**Process:**
1. Parse page, limit (giới hạn 1-100).
2. Xây dựng `where: { isDeleted: false }`, thêm `status` và `userId` nếu có.
3. Query song song `findMany` (có pagination) + `count`.
4. Trả về `{ message, data, meta }`.

---

### 2.10 Tạo bài học

**Unit** `createLesson()` trong class `CourseService`

**Route:** `POST /api/course/:courseId/lesson` — Yêu cầu đăng nhập

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| userId | string | JWT | ID giảng viên |
| courseId | string | URL param | ID khóa học |
| name | string | @IsString | Tên bài học |

**Output:**

Trường hợp thành công:
- `{ message: "Tạo bài học thành công", data: lesson }` — lesson với `status = "draft"`.

Trường hợp lỗi:
- `NotFoundException("Khóa học không tồn tại")` — nếu không tìm thấy hoặc đã xóa
- `ForbiddenException("Bạn không có quyền thao tác khóa học này")` — nếu không phải chủ

**Process:**
1. Tìm course: `prisma.course.findFirst({ where: { id: courseId, isDeleted: false } })`.
   - Không tìm thấy → ném `NotFoundException`.
2. Kiểm tra ownership → ném `ForbiddenException` nếu không phải chủ.
3. Tạo lesson: `prisma.lesson.create({ data: { name, courseId, status: "draft" } })`.
4. Trả về `{ message, data: lesson }`.

---

### 2.11 Cập nhật bài học

**Unit** `updateLesson()` trong class `CourseService`

**Route:** `PUT /api/course/lesson/:lessonId` — Yêu cầu đăng nhập

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| userId | string | JWT | ID giảng viên |
| lessonId | string | URL param | ID bài học |
| name | string? | Optional | Tên mới |

**Output:**

Trường hợp thành công:
- `{ message: "Cập nhật bài học thành công", data: updated }`

Trường hợp lỗi:
- `NotFoundException("Bài học không tồn tại")` — nếu không tìm thấy
- `ForbiddenException("Bạn không có quyền thao tác bài học này")` — nếu không phải chủ khóa học

**Process:**
1. Tìm lesson kèm `course.userId`.
   - Không tìm thấy → ném `NotFoundException`.
2. Kiểm tra `lesson.course.userId !== userId` → ném `ForbiddenException`.
3. Cập nhật: `prisma.lesson.update({ data: { ...dto } })`.
4. Trả về `{ message, data }`.

---

### 2.12 Xóa bài học

**Unit** `deleteLesson()` trong class `CourseService`

**Route:** `DELETE /api/course/lesson/:lessonId` — Yêu cầu đăng nhập

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| userId | string | JWT | ID giảng viên |
| lessonId | string | URL param | ID bài học |

**Output:**

Trường hợp thành công:
- `{ message: "Xóa bài học thành công" }`

Trường hợp lỗi:
- `NotFoundException("Bài học không tồn tại")` — nếu không tìm thấy
- `ForbiddenException("Bạn không có quyền thao tác bài học này")` — nếu không phải chủ

**Process:**
1. Tìm lesson kèm `course.userId`.
   - Không tìm thấy → ném `NotFoundException`.
2. Kiểm tra ownership → ném `ForbiddenException`.
3. **Nếu lesson.status === "draft"**: xóa thật (hard delete) lesson + toàn bộ materials trong transaction.
4. **Nếu lesson.status !== "draft"** (published): cập nhật `status = "outdated"` cho lesson + toàn bộ materials.
5. Trả về message.

---

### 2.13 Tạo tài liệu bài học

**Unit** `createLessonMaterial()` trong class `CourseService`

**Route:** `POST /api/course/lesson/:lessonId/material` — Yêu cầu đăng nhập

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| userId | string | JWT | ID giảng viên |
| lessonId | string | URL param | ID bài học |
| name | string | @IsString | Tên tài liệu |
| url | string | @IsString | URL tài liệu |
| type | string | Enum: video/pdf/img/link/other | Loại tài liệu |

**Output:**

Trường hợp thành công:
- `{ message: "Tạo tài liệu thành công", data: material }` — material với `status = "draft"`.

Trường hợp lỗi:
- `NotFoundException("Bài học không tồn tại")` — nếu lesson không tồn tại
- `ForbiddenException("Bạn không có quyền thao tác bài học này")` — nếu không phải chủ khóa học

**Process:**
1. Tìm lesson kèm `course.userId`.
   - Không tìm thấy → ném `NotFoundException`.
2. Kiểm tra `lesson.course.userId !== userId` → ném `ForbiddenException`.
3. Tạo material: `prisma.lessonMaterial.create({ data: { name, url, type, lessonId, status: "draft" } })`.
4. Trả về `{ message, data: material }`.

---

### 2.14 Cập nhật tài liệu bài học

**Unit** `updateLessonMaterial()` trong class `CourseService`

**Route:** `PUT /api/course/material/:materialId` — Yêu cầu đăng nhập

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| userId | string | JWT | ID giảng viên |
| materialId | string | URL param | ID tài liệu |
| name | string? | Optional | Tên mới |
| url | string? | Optional | URL mới |
| type | string? | Optional, Enum | Loại mới |

**Output:**

Trường hợp thành công (draft):
- `{ message: "Cập nhật tài liệu thành công", data: updated }` — cập nhật trực tiếp.

Trường hợp thành công (published):
- `{ message: "Cập nhật tài liệu thành công (tạo bản mới)", data: newMaterial }` — tạo bản draft mới, bản cũ chuyển sang "outdated".

Trường hợp lỗi:
- `NotFoundException("Tài liệu không tồn tại")` — nếu không tìm thấy
- `ForbiddenException("Bạn không có quyền thao tác tài liệu này")` — nếu không phải chủ
- `BadRequestException("Không thể chỉnh sửa tài liệu khi khóa học đang chờ phê duyệt")` — nếu course.status là "pending" hoặc "update"
- `BadRequestException("Tài liệu đang ở trạng thái không thể chỉnh sửa")` — nếu status là "outdated" hoặc "deleted"

**Process:**
1. Tìm material kèm `lesson.course.userId` và `lesson.course.status`.
   - Không tìm thấy → ném `NotFoundException`.
2. Kiểm tra ownership → ném `ForbiddenException`.
3. Kiểm tra course đang chờ duyệt (pending/update) → ném `BadRequestException`.
4. **Nếu material.status === "draft"**: cập nhật trực tiếp → trả về updated.
5. **Nếu material.status === "published"**: trong transaction:
   - Bản cũ → `status = "outdated"`
   - Tạo bản mới với dữ liệu merge (dto + original), `status = "draft"`
   → Trả về bản mới.
6. **Nếu status khác** (outdated/deleted): ném `BadRequestException("Tài liệu đang ở trạng thái không thể chỉnh sửa")`.

---

### 2.15 Xóa tài liệu bài học

**Unit** `deleteLessonMaterial()` trong class `CourseService`

**Route:** `DELETE /api/course/material/:materialId` — Yêu cầu đăng nhập

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| userId | string | JWT | ID giảng viên |
| materialId | string | URL param | ID tài liệu |

**Output:**

Trường hợp thành công:
- `{ message: "Xóa tài liệu thành công" }`

Trường hợp lỗi:
- `NotFoundException("Tài liệu không tồn tại")` — nếu không tìm thấy
- `ForbiddenException("Bạn không có quyền thao tác tài liệu này")` — nếu không phải chủ

**Process:**
1. Tìm material kèm ownership.
   - Không tìm thấy → ném `NotFoundException`.
2. Kiểm tra ownership → ném `ForbiddenException`.
3. **Nếu status === "draft"**: xóa thật (hard delete).
4. **Nếu status !== "draft"** (published): chuyển `status = "outdated"`.
5. Trả về message.

---

### 2.16 Lấy tài liệu (xem/phát)

**Unit** `getMaterial()` trong class `CourseService`

**Route:** `GET /api/course/material/:materialId` — Hỗ trợ cả có/không đăng nhập

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| materialId | string | URL param | ID tài liệu |
| user | IUser? | JWT (optional) | User hiện tại |

**Output:**

Trường hợp thành công (không phải video):
- `{ message: "Lấy đường dẫn tài liệu thành công", data: { url } }`

Trường hợp thành công (video):
- `{ message: "Lấy token phát lại thành công", data: { token, url } }` — token JWT cho video playback.

Trường hợp lỗi:
- `NotFoundException("Tài liệu không tồn tại")` — nếu không tìm thấy hoặc status/course không hợp lệ
- `ForbiddenException("Bạn chưa mua khóa học này")` — nếu user không có quyền truy cập
- `ForbiddenException("Bạn cần hoàn thành đề thi trước khi xem tài liệu này")` — nếu có exam chặn chưa pass

**Process:**
1. Tìm material kèm lesson.course và userCourses.
   - Không tìm thấy → ném `NotFoundException`.
2. Xác định `isPrivileged` (owner hoặc admin).
3. Nếu không privileged → kiểm tra status material/lesson/course phải hợp lệ, nếu không → `NotFoundException`.
4. Kiểm tra quyền truy cập `checkAccess()`:
   - Preview material → cho phép tất cả
   - Không có user → từ chối
   - Owner → cho phép
   - Admin/special role → cho phép
   - Đã mua khóa học → cho phép
   - Còn lại → ném `ForbiddenException("Bạn chưa mua khóa học này")`.
5. Kiểm tra exam gate (chỉ cho user đã mua, không phải owner/admin):
   - Nếu có exam tạo trước lesson mà chưa pass → ném `ForbiddenException("Bạn cần hoàn thành đề thi...")`.
6. Nếu material.type !== "video": trả về `{ url }`.
7. Nếu video: tạo playback token (JWT), trả về `{ token, url }`.

---

## 3. Phê Duyệt Khóa Học (Course Approval)

### 3.1 Gửi xét duyệt khóa học

**Unit** `submitForReview()` trong class `CourseService`

**Route:** `POST /api/course/:courseId/submit-review` — Yêu cầu đăng nhập

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| userId | string | JWT | ID giảng viên |
| courseId | string | URL param | ID khóa học |
| description | string | @IsString | Mô tả thay đổi |

**Output:**

Trường hợp thành công (lần đầu):
- `{ message: "Gửi xét duyệt khóa học thành công" }` — course chuyển sang "pending".

Trường hợp thành công (cập nhật):
- `{ message: "Gửi xét duyệt cập nhật khóa học thành công" }` — course chuyển sang "update".

Trường hợp lỗi:
- `NotFoundException("Khóa học không tồn tại")` — nếu không tìm thấy
- `ForbiddenException("Bạn không có quyền thao tác khóa học này")` — nếu không phải chủ
- `BadRequestException("Khóa học đang ở trạng thái không thể gửi xét duyệt")` — trạng thái không hợp lệ
- `BadRequestException("Không có nội dung nào cần xét duyệt")` — nếu cập nhật nhưng không có thay đổi draft/outdated

**Process:**
1. Tìm course → ném `NotFoundException` nếu không tìm thấy.
2. Kiểm tra ownership → ném `ForbiddenException`.
3. Xác định `isFirstPublish = course.publishedAt === null`.
4. **Lần đầu publish:**
   - Status hợp lệ: `[draft, rejected]` → nếu không → ném `BadRequestException`.
   - Transaction: cập nhật course `status = "pending"` + tạo `CourseApproval`.
5. **Cập nhật:**
   - Status hợp lệ: `[published, need_update]` → nếu không → ném `BadRequestException`.
   - Kiểm tra `hasUnpublishedChanges()`: nếu không có thay đổi → ném `BadRequestException("Không có nội dung nào cần xét duyệt")`.
   - Transaction: cập nhật course `status = "update"` + tạo `CourseApproval`.
6. Trả về message.

---

### 3.2 Admin duyệt khóa học

**Unit** `publishCourse()` trong class `CourseService`

**Route:** `POST /api/course/:courseId/publish` — `@Roles('admin')`

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| adminId | string | JWT | ID admin |
| courseId | string | URL param | ID khóa học |

**Output:**

Trường hợp thành công:
- `{ message: "Duyệt khóa học thành công" }`

Trường hợp lỗi:
- `NotFoundException("Khóa học không tồn tại")` — nếu không tìm thấy
- `BadRequestException("Khóa học không ở trạng thái chờ duyệt")` — nếu status khác "pending" và "update"

**Process:**
1. Tìm course → ném `NotFoundException` nếu không.
2. Kiểm tra `status !== "pending" && status !== "update"` → ném `BadRequestException`.
3. Xác định `isFirstPublish = course.publishedAt === null`.
4. Thực hiện transaction:
   - Course → `status = "published"`, `publishedBy = adminId`, set `publishedAt` nếu lần đầu.
   - Lessons draft → published (set publisherId, publishedAt).
   - Lessons outdated → deleted (isDeleted, deletedAt).
   - Materials draft → published.
   - Materials outdated → deleted.
   - Exams draft → published.
   - Exams outdated → deleted.
   - CourseApproval pending → approved (adminId).
   - **Nếu lần đầu publish**: tạo `Conversation` + `ConversationMember` (giảng viên là host).
5. Trả về message.

---

### 3.3 Admin từ chối khóa học

**Unit** `rejectCourse()` trong class `CourseService`

**Route:** `POST /api/course/:courseId/reject` — `@Roles('admin')`

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| adminId | string | JWT | ID admin |
| courseId | string | URL param | ID khóa học |
| reason | string | @IsString | Lý do từ chối |

**Output:**

Trường hợp thành công:
- `{ message: "Từ chối khóa học thành công" }`

Trường hợp lỗi:
- `NotFoundException("Khóa học không tồn tại")` — nếu không tìm thấy
- `BadRequestException("Khóa học không ở trạng thái chờ duyệt")` — nếu status khác "pending"/"update"

**Process:**
1. Tìm course → ném `NotFoundException` nếu không.
2. Kiểm tra status → ném `BadRequestException`.
3. Xác định trạng thái mới:
   - `pending → rejected`
   - `update → need_update`
4. Transaction:
   - Course → `status = newStatus`.
   - CourseApproval pending → `status = "rejected"`, gán `reason`, `adminId`.
5. Trả về message.

---

## 4. Mua Khóa Học (Purchase)

### 4.1 Thanh toán khóa học 

**Unit** `purchaseCourses()` trong class `CourseService`

**Route:** `POST /api/course/purchased` — Yêu cầu đăng nhập

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| userId | string | JWT | ID người mua |
| courseIds | string[] | Body | Danh sách ID khóa học mua |
| ipAddr | string | Request IP | IP client |

**Output:**

Trường hợp thành công:
- Object:
  - `message: "Tạo đơn hàng thành công"`
  - `data: { invoiceId, amount, paymentUrl }` — paymentUrl chuyển hướng đến VNPay.

Trường hợp lỗi:
- `BadRequestException("Danh sách khóa học rỗng")` — nếu courseIds rỗng hoặc không phải mảng
- `BadRequestException("Tồn tại khóa học đã mua")` — nếu có khóa học đã mua trong danh sách
- `NotFoundException("Có khóa học không tồn tại")` — nếu có khóa học không tìm thấy
- `NotFoundException("Hệ thống chưa được cấu hình")` — nếu chưa có System config

**Process:**
1. Validate courseIds không rỗng.
2. Kiểm tra đã mua: `prisma.userCourse.findMany({ where: { userId, courseId in courseIds } })`.
   - Nếu có → ném `BadRequestException("Tồn tại khóa học đã mua")`.
3. Load danh sách khóa học: check tồn tại, isDeleted = false.
   - Nếu số lượng không khớp → ném `NotFoundException`.
4. Tính tổng tiền = sum(course.price).
5. Lấy commission rate từ System config.
6. Tạo hóa đơn (Invoice) + DetailInvoices trong transaction, status = "pending".
7. Tạo VNPay payment URL.
8. Lưu vnpayTxnRef vào invoice.
9. Trả về `{ invoiceId, amount, paymentUrl }`.

---

### 4.2 Xử lý thanh toán thành công

**Unit** `handlePaymentSuccess()` trong class `CourseService`

**Route:** Gọi nội bộ từ PaymentController sau callback VNPay

**Input:**
| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| invoiceId | string | ID hóa đơn |

**Output:** Không trả về giá trị (void).

**Process:**
1. Tìm invoice pending kèm detail_invoices.
   - Nếu không tìm thấy → return (đã xử lý hoặc không tồn tại).
2. Lấy userId và danh sách courseIds.
3. Thực hiện transaction:
   - Invoice → `status = "purchased"`.
   - DetailInvoices → `status = "paid"`.
   - Tạo `UserCourse` cho mỗi courseId (kiểm tra trùng lặp).
   - Tăng `studentCount` cho mỗi course.
   - Thêm buyer vào `ConversationMember` (nếu conversation tồn tại, kiểm tra trùng lặp).
   - Xóa các khóa học đã mua khỏi giỏ hàng (`CartItem.deleteMany`).

---

### 4.3 Xử lý thanh toán thất bại

**Unit** `handlePaymentFailed()` trong class `CourseService`

**Route:** Gọi nội bộ từ PaymentController sau callback VNPay

**Input:**
| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| invoiceId | string | ID hóa đơn |

**Output:** Không trả về giá trị cụ thể.

**Process:**
1. Cập nhật invoice: `status = "failed"` (chỉ ảnh hưởng pending).
2. Cập nhật detail invoices: `status = "failed"`.

---

## 5. Đánh Giá (Review)

### 5.1 Tạo đánh giá

**Unit** `create()` trong class `ReviewService`

**Route:** `POST /api/review` — `@SkipPermission()` (yêu cầu đăng nhập)

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| userId | string | JWT | ID người đánh giá |
| courseId | string | @IsUUID, @IsNotEmpty | ID khóa học |
| rating | number | @IsInt, 1-5 | Điểm đánh giá |
| content | string | @IsString, @IsNotEmpty | Nội dung đánh giá |

**Output:**

Trường hợp thành công:
- `{ message: "Đánh giá thành công", data: review }` — bao gồm id, rating, content, createdAt, reviewer info.
- **Side effect**: Cập nhật lại `course.star` = trung bình rating.

Trường hợp lỗi:
- `NotFoundException("Khóa học không tồn tại")` — nếu khóa học không tồn tại hoặc status khác "published"
- `ForbiddenException("Bạn phải mua khóa học trước khi đánh giá")` — nếu chưa có UserCourse
- `BadRequestException("Bạn đã đánh giá khóa học này rồi")` — nếu đã tồn tại review chưa xóa

**Process:**
1. Tìm course: `prisma.course.findFirst({ where: { id: courseId, isDeleted: false, status: "published" } })`.
   - Không tìm thấy → ném `NotFoundException("Khóa học không tồn tại")`.
2. Kiểm tra đã mua: `prisma.userCourse.findFirst({ where: { userId, courseId } })`.
   - Chưa mua → ném `ForbiddenException("Bạn phải mua khóa học trước khi đánh giá")`.
3. Kiểm tra trùng: `prisma.courseReview.findFirst({ where: { reviewerId: userId, courseId, isDeleted: false } })`.
   - Đã tồn tại → ném `BadRequestException("Bạn đã đánh giá khóa học này rồi")`.
4. Transaction:
   - Tạo review: `prisma.courseReview.create({ data: { reviewerId: userId, courseId, rating, content } })`.
   - Tính trung bình rating: `prisma.courseReview.aggregate({ _avg: { rating: true } })`.
   - Cập nhật `course.star` = `_avg.rating ?? 0`.
5. Trả về `{ message, data: review }`.

---

### 5.2 Lấy đánh giá theo khóa học

**Unit** `findByCourseId()` trong class `ReviewService`

**Route:** `GET /api/review/:courseId` — `@PublicAPI()`

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| courseId | string | URL param | ID khóa học |

**Output:**

Trường hợp thành công:
- `{ message: "Lấy danh sách đánh giá thành công", data: reviews[] }` — sắp xếp `createdAt desc`.

Trường hợp lỗi:
- `NotFoundException("Khóa học không tồn tại")` — nếu khóa học không tồn tại

**Process:**
1. Tìm course: kiểm tra tồn tại và chưa xóa.
   - Không tìm thấy → ném `NotFoundException`.
2. Query reviews: `where: { courseId, isDeleted: false }`, bao gồm `reviewer` info.
3. Trả về `{ message, data: reviews }`.

---

### 5.3 Lấy chi tiết 1 đánh giá

**Unit** `findOne()` trong class `ReviewService`

**Route:** `GET /api/review/:id` — `@PublicAPI()`

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| id | string | URL param | ID đánh giá |

**Output:**

Trường hợp thành công:
- `{ message: "Lấy đánh giá thành công", data: review }` — bao gồm id, rating, content, createdAt, updatedAt, courseId, reviewer.

Trường hợp lỗi:
- `NotFoundException("Đánh giá không tồn tại")` — nếu không tìm thấy (hoặc đã xóa mềm)

**Process:**
1. Tìm review: `prisma.courseReview.findFirst({ where: { id, isDeleted: false } })`.
   - Không tìm thấy → ném `NotFoundException`.
2. Trả về `{ message, data: review }`.

---

### 5.4 Cập nhật đánh giá

**Unit** `update()` trong class `ReviewService`

**Route:** `PATCH /api/review/:id` — `@SkipPermission()` (yêu cầu đăng nhập)

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| id | string | URL param | ID đánh giá |
| userId | string | JWT | ID người sửa |
| rating | number? | @IsInt, 1-5, Optional | Điểm mới |
| content | string? | @IsString, Optional | Nội dung mới |

**Output:**

Trường hợp thành công:
- `{ message: "Cập nhật đánh giá thành công", data: updated }` — bao gồm review cập nhật + reviewer.
- **Side effect**: Cập nhật lại `course.star`.

Trường hợp lỗi:
- `NotFoundException("Đánh giá không tồn tại")` — nếu không tìm thấy
- `ForbiddenException("Bạn không có quyền sửa đánh giá này")` — nếu `review.reviewerId !== userId`

**Process:**
1. Tìm review → ném `NotFoundException` nếu không.
2. Kiểm tra ownership → ném `ForbiddenException`.
3. Transaction:
   - Cập nhật review (chỉ các field được gửi).
   - Tính lại trung bình rating → cập nhật `course.star`.
4. Trả về `{ message, data: updated }`.

---

### 5.5 Xóa đánh giá

**Unit** `remove()` trong class `ReviewService`

**Route:** `DELETE /api/review/:id` — `@SkipPermission()` (yêu cầu đăng nhập)

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| id | string | URL param | ID đánh giá |
| userId | string | JWT | ID người xóa |

**Output:**

Trường hợp thành công:
- `{ message: "Xóa đánh giá thành công" }`
- **Side effect**: Cập nhật lại `course.star` (trung bình mới sau khi xóa mềm review).

Trường hợp lỗi:
- `NotFoundException("Đánh giá không tồn tại")` — nếu không tìm thấy
- `ForbiddenException("Bạn không có quyền xóa đánh giá này")` — nếu không phải chủ

**Process:**
1. Tìm review → ném `NotFoundException`.
2. Kiểm tra ownership → ném `ForbiddenException`.
3. Transaction:
   - Soft delete: `isDeleted = true`, `deletedAt = new Date()`.
   - Tính lại trung bình rating (chỉ tính reviews chưa xóa) → cập nhật `course.star`.
4. Trả về message.

---

## 6. Giỏ Hàng (Cart)

### 6.1 Thêm khóa học vào giỏ hàng

**Unit** `addToCart()` trong class `CartService`

**Route:** `POST /api/cart` — `@SkipPermission()` (yêu cầu đăng nhập)

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| userId | string | JWT | ID user hiện tại |
| courseIds | string[] | Body: { courseIds } | Danh sách ID khóa học cần thêm |

**Output:**

Trường hợp thành công:
- `{ message: "Đã thêm {n} khóa học vào giỏ hàng", data: { added, skipped } }`
  - `added`: số khóa học thực sự thêm mới
  - `skipped`: số khóa học bỏ qua (đã có trong giỏ)

Trường hợp không thêm được:
- `{ message: "Không có khóa học mới để thêm vào giỏ hàng", data: { added: 0 } }` — nếu tất cả đều đã mua, thuộc sở hữu, hoặc đã trong giỏ.

Trường hợp lỗi:
- `BadRequestException("Danh sách khóa học rỗng")` — nếu courseIds rỗng hoặc không phải mảng
- `BadRequestException("Không có khóa học hợp lệ")` — nếu không có khóa học nào tồn tại và published

**Process:**
1. Validate courseIds không rỗng → ném `BadRequestException` nếu rỗng.
2. Tìm các khóa học hợp lệ: `prisma.course.findMany({ where: { id in courseIds, isDeleted: false, status in [published, update, need_update] } })`.
   - Nếu không có kết quả → ném `BadRequestException("Không có khóa học hợp lệ")`.
3. Loại bỏ khóa học **đã mua**: query `UserCourse` → lấy purchasedIds.
4. Loại bỏ khóa học **của chính mình**: `course.userId === userId`.
5. Lọc ra `toAdd` = validIds chưa mua và không phải của mình.
   - Nếu rỗng → trả về `{ added: 0 }`.
6. Kiểm tra đã có trong giỏ: query `CartItem` → lấy existingIds.
7. Lọc ra `newIds` = toAdd chưa có trong giỏ.
8. Tạo CartItem mới: `prisma.cartItem.createMany({ data, skipDuplicates: true })`.
9. Trả về `{ added: newIds.length, skipped: toAdd.length - newIds.length }`.

---

### 6.2 Xóa khóa học khỏi giỏ hàng

**Unit** `removeFromCart()` trong class `CartService`

**Route:** `DELETE /api/cart` — `@SkipPermission()` (yêu cầu đăng nhập)

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| userId | string | JWT | ID user hiện tại |
| courseIds | string[] | Body: { courseIds } | Danh sách ID khóa học cần xóa |

**Output:**

Trường hợp thành công:
- `{ message: "Đã xóa {n} khóa học khỏi giỏ hàng", data: { removed } }`
  - `removed`: số record đã xóa.

Trường hợp lỗi:
- `BadRequestException("Danh sách khóa học rỗng")` — nếu courseIds rỗng

**Process:**
1. Validate courseIds không rỗng → ném `BadRequestException`.
2. Xóa: `prisma.cartItem.deleteMany({ where: { userId, courseId in courseIds } })`.
3. Trả về `{ removed: result.count }`.

---

### 6.3 Lấy giỏ hàng

**Unit** `getCart()` trong class `CartService`

**Route:** `GET /api/cart` — `@SkipPermission()` (yêu cầu đăng nhập)

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| userId | string | JWT | ID user hiện tại |

**Output:**

Trường hợp thành công:
- Object:
  - `message: "Lấy giỏ hàng thành công"`
  - `data`:
    - `items[]`: mỗi item gồm `{ id, courseId, addedAt, course: { id, name, slug, thumbnail, price, star, status, user } }`
    - `totalPrice`: tổng giá trị giỏ hàng
    - `count`: số lượng item

**Process:**
1. Query: `prisma.cartItem.findMany({ where: { userId } })` kèm include course + course.user.
2. Sắp xếp `createdAt desc`.
3. Tính `totalPrice = sum(item.course.price)`.
4. Map items → format `{ id, courseId, addedAt, course }`.
5. Trả về `{ message, data: { items, totalPrice, count } }`.

---

## 7. Người Dùng (User)

### 7.1 Xem profile công khai

**Unit** `getPublicProfile()` trong class `UserService`

**Route:** `GET /api/user/profile/:slug` — `@PublicAPI()`

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| slug | string | URL param | Slug của user |

**Output:**

Trường hợp thành công:
- Object:
  - `message: "Lấy thông tin profile thành công"`
  - `data`: { id, fullName, avatar, slug, introduce, createdAt, courses[] (top 10 published), _count: { courses, reviews } }

Trường hợp lỗi:
- `NotFoundException("Người dùng không tồn tại")` — nếu không tìm thấy hoặc isDeleted

**Process:**
1. Tìm user: `prisma.user.findUnique({ where: { slug, isDeleted: false } })` kèm 10 course published + count.
   - Không tìm thấy → ném `NotFoundException`.
2. Trả về `{ message, data: user }`.

---

### 7.2 Cập nhật profile cá nhân

**Unit** `updateProfile()` trong class `UserService`

**Route:** `PATCH /api/user/profile` — `@SkipPermission()` (yêu cầu đăng nhập)

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| userId | string | JWT | ID user hiện tại |
| fullName | string? | @MinLength(2), @MaxLength(100) | Họ tên mới |
| avatar | string? | Optional | URL avatar mới |
| introduce | string? | @MaxLength(1000) | Giới thiệu bản thân |

**Output:**

Trường hợp thành công:
- `{ message: "Cập nhật thông tin thành công", data: updated }` — user đã cập nhật.
- **Side effect**: Nếu thay đổi fullName → slug tự động cập nhật.

Trường hợp lỗi:
- `NotFoundException("Người dùng không tồn tại")` — nếu user không tồn tại hoặc đã xóa

**Process:**
1. Tìm user: `prisma.user.findUnique({ where: { id: userId } })`.
   - Không tìm thấy hoặc isDeleted → ném `NotFoundException`.
2. Xây dựng data update:
   - Nếu `fullName` được gửi → set fullName + tạo slug mới `fullName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()`.
   - Nếu `avatar` → set avatar.
   - Nếu `introduce` → set introduce.
3. Cập nhật: `prisma.user.update({ where: { id: userId }, data })`.
4. Trả về `{ message, data: updated }`.

---

### 7.3 Đổi mật khẩu

**Unit** `changePassword()` trong class `UserService`

**Route:** `POST /api/user/change-password` — `@SkipPermission()` (yêu cầu đăng nhập)

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| userId | string | JWT | ID user hiện tại |
| currentPassword | string | @IsNotEmpty | Mật khẩu hiện tại |
| newPassword | string | @IsNotEmpty, @MinLength(6) | Mật khẩu mới |

**Output:**

Trường hợp thành công:
- `{ message: "Đổi mật khẩu thành công" }`

Trường hợp lỗi:
- `NotFoundException("Người dùng không tồn tại")` — nếu user không tồn tại hoặc đã xóa
- `UnauthorizedException("Mật khẩu hiện tại không đúng")` — nếu mật khẩu hiện tại không khớp

**Process:**
1. Tìm user → ném `NotFoundException` nếu không tìm thấy.
2. So sánh `currentPassword` với `user.password` bằng `bcrypt.compare`.
   - Không khớp → ném `UnauthorizedException("Mật khẩu hiện tại không đúng")`.
3. Hash mật khẩu mới: `bcrypt.hash(newPassword, BCRYPT_SALT)`.
4. Cập nhật: `prisma.user.update({ data: { password: hash } })`.
5. Trả về message.

---

### 7.4 Admin: Danh sách người dùng

**Unit** `findAllUsers()` trong class `UserService`

**Route:** `GET /api/user/admin/all` — `@Roles('admin')`

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| user | IUser | JWT | Admin hiện tại |
| search | string? | Query param | Tìm theo tên hoặc email (insensitive) |
| roleId | string? | Query param | Lọc theo role ID |
| roleName | string? | Query param | Lọc theo tên role |
| isBanned | string? | "true"/"false" | Lọc theo trạng thái ban |
| isDeleted | string? | "true"/"false" | Lọc theo trạng thái xóa |
| fromDate | string? | ISO date | Từ ngày tạo |
| toDate | string? | ISO date | Đến ngày tạo |
| sortBy | string? | Mặc định "createdAt" | Trường sắp xếp (createdAt, fullName, email, availableAmount) |
| order | string? | "asc"/"desc" | Chiều sắp xếp, mặc định "desc" |
| page | string? | Mặc định "1" | Trang |
| limit | string? | Mặc định "20", max 100 | Số/trang |

**Output:**

Trường hợp thành công:
- Object:
  - `message: "Lấy danh sách người dùng thành công"`
  - `data: users[]` — mỗi user kèm `_count: { courses, userCourses, invoices }`
  - `meta: { total, page, limit, totalPages }`

Trường hợp lỗi:
- `ForbiddenException("Bạn không có quyền xem danh sách người dùng")` — nếu role khác admin

**Process:**
1. Kiểm tra role admin → ném `ForbiddenException`.
2. Xây dựng where clause với các bộ lọc.
3. Query song song `findMany` + `count`.
4. Trả về `{ message, data, meta }`.

---

### 7.5 Admin: Xem chi tiết người dùng

**Unit** `getUserDetail()` trong class `UserService`

**Route:** `GET /api/user/admin/:id` — Yêu cầu đăng nhập

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| currentUser | IUser | JWT | User hiện tại |
| userId | string | URL param | ID user cần xem |

**Output:**

Trường hợp thành công:
- `{ message: "Lấy thông tin người dùng thành công", data: user }` — kèm `_count: { courses, userCourses, reviews, invoices, transactions }`.

Trường hợp lỗi:
- `ForbiddenException("Bạn không có quyền xem thông tin này")` — nếu không phải admin và không phải xem chính mình
- `NotFoundException("Người dùng không tồn tại")` — nếu không tìm thấy

**Process:**
1. Kiểm tra: phải là admin hoặc xem chính mình → ném `ForbiddenException` nếu không.
2. Tìm user → ném `NotFoundException` nếu không.
3. Trả về `{ message, data: user }`.

---

### 7.6 Admin: Cập nhật người dùng

**Unit** `adminUpdateUser()` trong class `UserService`

**Route:** `PATCH /api/user/admin/:id` — `@Roles('admin')`

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| adminUser | IUser | JWT | Admin hiện tại |
| userId | string | URL param | ID user cần cập nhật |
| fullName | string? | @MinLength(2), @MaxLength(100) | Họ tên |
| avatar | string? | Optional | URL avatar |
| introduce | string? | @MaxLength(1000) | Giới thiệu |
| roleId | string? | Optional | Role ID mới |
| availableAmount | number? | Optional | Số dư khả dụng |

**Output:**

Trường hợp thành công:
- `{ message: "Cập nhật người dùng thành công", data: updated }`

Trường hợp lỗi:
- `ForbiddenException("Bạn không có quyền thực hiện thao tác này")` — nếu không phải admin
- `NotFoundException("Người dùng không tồn tại")` — nếu user không tồn tại
- `BadRequestException("Role không tồn tại")` — nếu roleId không hợp lệ
- `BadRequestException("Số dư khả dụng không được âm")` — nếu availableAmount < 0

**Process:**
1. Kiểm tra admin role → ném `ForbiddenException`.
2. Tìm user → ném `NotFoundException`.
3. Xây dựng data update:
   - fullName → cập nhật kèm slug mới.
   - roleId → kiểm tra role tồn tại.
   - availableAmount → kiểm tra >= 0.
4. Cập nhật user.
5. Trả về `{ message, data }`.

---

### 7.7 Admin: Cấm người dùng

**Unit** `banUser()` trong class `UserService`

**Route:** `POST /api/user/admin/:id/ban` — `@Roles('admin')`

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| adminUser | IUser | JWT | Admin hiện tại |
| userId | string | URL param | ID user cần ban |
| reason | string | @IsNotEmpty, @IsString | Lý do cấm |
| timeUnBan | string? | @IsOptional, ISO string | Thời gian hết cấm (null = vĩnh viễn) |

**Output:**

Trường hợp thành công:
- `{ message: "Cấm người dùng thành công", data: updated }` — user kèm timeBan, timeUnBan.

Trường hợp lỗi:
- `ForbiddenException("Bạn không có quyền thực hiện thao tác này")` — nếu không phải admin
- `NotFoundException("Người dùng không tồn tại")` — nếu user không tồn tại
- `BadRequestException("Không thể cấm chính mình")` — nếu userId === adminUser.id
- `BadRequestException("timeUnBan không hợp lệ")` — nếu timeUnBan không parse được

**Process:**
1. Kiểm tra admin role → ném `ForbiddenException`.
2. Tìm user → ném `NotFoundException`.
3. Kiểm tra self-ban → ném `BadRequestException`.
4. Parse timeUnBan nếu có → kiểm tra hợp lệ.
5. Tạo ban record: `prisma.ban.create({ data: { reason } })`.
6. Cập nhật user: `banId = ban.id`, `timeBan = now`, `timeUnBan`.
7. Trả về `{ message, data }`.

---

### 7.8 Admin: Bỏ cấm người dùng

**Unit** `unbanUser()` trong class `UserService`

**Route:** `POST /api/user/admin/:id/unban` — `@Roles('admin')`

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| adminUser | IUser | JWT | Admin hiện tại |
| userId | string | URL param | ID user cần bỏ ban |

**Output:**

Trường hợp thành công:
- `{ message: "Bỏ cấm người dùng thành công", data: updated }`

Trường hợp lỗi:
- `ForbiddenException("Bạn không có quyền thực hiện thao tác này")` — nếu không phải admin
- `NotFoundException("Người dùng không tồn tại")` — nếu user không tồn tại
- `BadRequestException("Người dùng không bị cấm")` — nếu `user.banId === null`

**Process:**
1. Kiểm tra admin → ném `ForbiddenException`.
2. Tìm user → ném `NotFoundException`.
3. Kiểm tra user có bị ban → ném `BadRequestException("Người dùng không bị cấm")`.
4. Cập nhật user: `banId = null`, `timeBan = null`, `timeUnBan = null`.
5. Trả về `{ message, data }`.

---

### 7.9 Admin: Xóa mềm người dùng

**Unit** `softDeleteUser()` trong class `UserService`

**Route:** `DELETE /api/user/admin/:id` — `@Roles('admin')`

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| adminUser | IUser | JWT | Admin hiện tại |
| userId | string | URL param | ID user cần xóa |

**Output:**

Trường hợp thành công:
- `{ message: "Xóa người dùng thành công", data: updated }`

Trường hợp lỗi:
- `ForbiddenException("Bạn không có quyền thực hiện thao tác này")` — nếu không phải admin
- `NotFoundException("Người dùng không tồn tại")` — nếu user không tồn tại
- `BadRequestException("Không thể xóa chính mình")` — nếu userId === adminUser.id

**Process:**
1. Kiểm tra admin → ném `ForbiddenException`.
2. Tìm user → ném `NotFoundException`.
3. Kiểm tra self-delete → ném `BadRequestException`.
4. Soft delete: `isDeleted = true`, `deletedAt = new Date()`.
5. Trả về `{ message, data }`.

---

### 7.10 Admin: Khôi phục người dùng

**Unit** `restoreUser()` trong class `UserService`

**Route:** `POST /api/user/admin/:id/restore` — `@Roles('admin')`

**Input:**
| Tham số | Kiểu | Nguồn | Mô tả |
|---------|------|-------|-------|
| adminUser | IUser | JWT | Admin hiện tại |
| userId | string | URL param | ID user cần khôi phục |

**Output:**

Trường hợp thành công:
- `{ message: "Khôi phục người dùng thành công", data: updated }`

Trường hợp lỗi:
- `ForbiddenException("Bạn không có quyền thực hiện thao tác này")` — nếu không phải admin
- `NotFoundException("Người dùng không tồn tại")` — nếu user không tồn tại

**Process:**
1. Kiểm tra admin → ném `ForbiddenException`.
2. Tìm user → ném `NotFoundException`.
3. Restore: `isDeleted = false`, `deletedAt = null`.
4. Trả về `{ message, data }`.

---

### 7.11 Danh sách học viên (Teacher/Admin)

**Unit** `findStudentsOfTeacher()` trong class `UserService`

**Route:** `GET /api/user/students` — `@Roles('admin', 'teacher')`

**Input:**
| Tham số | Kiểu | Ràng buộc | Mô tả |
|---------|------|-----------|-------|
| user | IUser | JWT | User hiện tại (teacher hoặc admin) |
| search | string? | Query param | Tìm theo tên/email |
| fromDate | string? | ISO date | Từ ngày |
| toDate | string? | ISO date | Đến ngày |
| sortBy | string? | Mặc định "createdAt" | Trường sắp xếp |
| order | string? | "asc"/"desc" | Chiều sắp xếp |
| page | string? | Mặc định "1" | Trang |
| limit | string? | Mặc định "20" | Số/trang |

**Output:**

Trường hợp thành công:
- Object:
  - `message: "Lấy danh sách học viên thành công"`
  - `data[]`: mỗi item gồm `{ id, createdAt, user: { id, fullName, email, avatar, slug, createdAt }, course: { id, name, slug, thumbnail } }`
  - `meta: { total, page, limit, totalPages }`

Trường hợp lỗi:
- `ForbiddenException("Bạn không có quyền xem danh sách học viên")` — nếu không phải teacher/admin

**Process:**
1. Kiểm tra role (teacher hoặc admin) → ném `ForbiddenException`.
2. Xây dựng where: nếu teacher → chỉ khóa học của mình; nếu admin → tất cả.
3. Thêm bộ lọc search, fromDate, toDate nếu có.
4. Query song song `findMany` + `count`.
5. Trả về `{ message, data, meta }`.

---

## Tổng hợp Exception Types

| Exception | HTTP Status | Mô tả |
|-----------|-------------|-------|
| `UnauthorizedException` | 401 | Lỗi xác thực (login, token) |
| `ForbiddenException` | 403 | Không có quyền truy cập |
| `NotFoundException` | 404 | Không tìm thấy tài nguyên |
| `BadRequestException` | 400 | Dữ liệu đầu vào không hợp lệ |

## Quy tắc chung

1. **Soft Delete**: Hầu hết entity sử dụng `isDeleted = true` thay vì xóa thật. Query luôn filter `isDeleted: false`.
2. **Ownership Check**: Giảng viên chỉ thao tác được trên khóa học/bài học/tài liệu của mình.
3. **Status Flow**:
   - Course: `draft → pending → published/rejected → (published → update → published/need_update) → deleted`
   - Lesson/Material: `draft → published → outdated → deleted`
4. **Transaction**: Các thao tác liên quan nhiều bảng sử dụng Prisma `$transaction`.
5. **Rating Recalculation**: Mỗi khi tạo/sửa/xóa review → tính lại trung bình `course.star`.
