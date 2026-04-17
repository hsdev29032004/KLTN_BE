# API Quản Lý Người Dùng (User Management)

> **Base URL**: `/api/user`  
> **Auth**: Tất cả API (trừ Public) đều cần gửi cookie `access_token` (httpOnly)

---

## Mục lục

1. [Admin - Danh sách tất cả người dùng](#1-admin---danh-sách-tất-cả-người-dùng)
2. [Teacher/Admin - Danh sách học viên đã mua khóa học](#2-teacheradmin---danh-sách-học-viên-đã-mua-khóa-học)
3. [Public - Xem profile theo slug](#3-public---xem-profile-theo-slug)
4. [Auth - Cập nhật profile cá nhân](#4-auth---cập-nhật-profile-cá-nhân)
5. [Auth - Đổi mật khẩu](#5-auth---đổi-mật-khẩu)
6. [Admin - Xem chi tiết user](#6-admin---xem-chi-tiết-user)
7. [Admin - Cập nhật user](#7-admin---cập-nhật-user)
8. [Admin - Cấm người dùng](#8-admin---cấm-người-dùng)
9. [Admin - Bỏ cấm người dùng](#9-admin---bỏ-cấm-người-dùng)
10. [Admin - Xóa mềm người dùng](#10-admin---xóa-mềm-người-dùng)
11. [Admin - Khôi phục người dùng](#11-admin---khôi-phục-người-dùng)

---

## 1. Admin - Danh sách tất cả người dùng

> **Quyền**: `Admin`

```
GET /api/user/admin/all
```

### Query Parameters

| Param       | Type   | Mặc định    | Mô tả                                                        |
| ----------- | ------ | ----------- | ------------------------------------------------------------ |
| `search`    | string | —           | Tìm theo tên hoặc email (không phân biệt hoa/thường)         |
| `roleId`    | string | —           | Lọc theo ID role                                             |
| `roleName`  | string | —           | Lọc theo tên role (`Admin`, `Teacher`, `User`)               |
| `isBanned`  | string | —           | `"true"` = đang bị cấm, `"false"` = không bị cấm             |
| `isDeleted` | string | —           | `"true"` = đã xóa, `"false"` = chưa xóa                      |
| `fromDate`  | string | —           | Ngày bắt đầu tạo (ISO 8601), vd: `2026-01-01`                |
| `toDate`    | string | —           | Ngày kết thúc tạo (ISO 8601), vd: `2026-12-31`               |
| `page`      | string | `"1"`       | Trang hiện tại                                               |
| `limit`     | string | `"20"`      | Số bản ghi mỗi trang (tối đa 100)                            |
| `sortBy`    | string | `createdAt` | Sắp xếp: `createdAt`, `fullName`, `email`, `availableAmount` |
| `order`     | string | `desc`      | `asc` hoặc `desc`                                            |

### Response `200 OK`

```json
{
  "message": "Lấy danh sách người dùng thành công",
  "data": [
    {
      "id": "uuid",
      "fullName": "Nguyễn Văn A",
      "email": "a@example.com",
      "avatar": "https://...",
      "slug": "nguyen-van-a-1234567890",
      "introduce": "Giới thiệu...",
      "roleId": "uuid",
      "banId": null,
      "isDeleted": false,
      "timeBan": null,
      "timeUnBan": null,
      "availableAmount": 500000,
      "createdAt": "2026-01-15T10:30:00.000Z",
      "updatedAt": "2026-03-20T08:00:00.000Z",
      "role": { "id": "uuid", "name": "User" },
      "ban": null,
      "_count": {
        "courses": 0,
        "userCourses": 5,
        "invoices": 3
      }
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

### Ví dụ gọi API

```
GET /api/user/admin/all?search=nguyen&roleName=Teacher&page=1&limit=10&sortBy=createdAt&order=desc
```

---

## 2. Teacher/Admin - Danh sách học viên đã mua khóa học

> **Quyền**: `Admin`, `Teacher`  
> Teacher chỉ thấy học viên đã mua khóa học **của mình**. Admin thấy tất cả.

```
GET /api/user/students
```

### Query Parameters

| Param      | Type   | Mặc định    | Mô tả                                 |
| ---------- | ------ | ----------- | ------------------------------------- |
| `search`   | string | —           | Tìm theo tên hoặc email học viên      |
| `fromDate` | string | —           | Ngày bắt đầu mua khóa học (ISO 8601)  |
| `toDate`   | string | —           | Ngày kết thúc mua khóa học (ISO 8601) |
| `page`     | string | `"1"`       | Trang hiện tại                        |
| `limit`    | string | `"20"`      | Số bản ghi mỗi trang (tối đa 100)     |
| `sortBy`   | string | `createdAt` | Trường sắp xếp: `createdAt`           |
| `order`    | string | `desc`      | `asc` hoặc `desc`                     |

### Response `200 OK`

```json
{
  "message": "Lấy danh sách học viên thành công",
  "data": [
    {
      "id": "user-course-uuid",
      "createdAt": "2026-03-01T12:00:00.000Z",
      "user": {
        "id": "uuid",
        "fullName": "Trần Văn B",
        "email": "b@example.com",
        "avatar": "https://...",
        "slug": "tran-van-b-123",
        "createdAt": "2026-01-01T00:00:00.000Z"
      },
      "course": {
        "id": "uuid",
        "name": "Lập trình NestJS",
        "slug": "lap-trinh-nestjs",
        "thumbnail": "https://..."
      }
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### Ví dụ gọi API

```
GET /api/user/students?search=tran&page=1&limit=10
```

---

## 3. Public - Xem profile theo slug

> **Quyền**: Không cần đăng nhập

```
GET /api/user/profile/:slug
```

### Path Parameters

| Param  | Type   | Mô tả               |
| ------ | ------ | ------------------- |
| `slug` | string | Slug của người dùng |

### Response `200 OK`

```json
{
  "message": "Lấy thông tin profile thành công",
  "data": {
    "id": "uuid",
    "fullName": "Nguyễn Văn A",
    "avatar": "https://...",
    "slug": "nguyen-van-a-123",
    "introduce": "Giảng viên NestJS...",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "courses": [
      {
        "id": "uuid",
        "name": "Khóa học NestJS cơ bản",
        "slug": "khoa-hoc-nestjs-co-ban",
        "thumbnail": "https://...",
        "price": 299000,
        "star": 4.5,
        "studentCount": 120
      }
    ],
    "_count": {
      "courses": 5,
      "reviews": 42
    }
  }
}
```

### Response `404 Not Found`

```json
{ "message": "Người dùng không tồn tại", "data": null }
```

---

## 4. Auth - Cập nhật profile cá nhân

> **Quyền**: Đã đăng nhập (bất kỳ role)

```
PATCH /api/user/profile
```

### Request Body

| Field       | Type   | Bắt buộc | Mô tả                       |
| ----------- | ------ | -------- | --------------------------- |
| `fullName`  | string | Không    | Họ tên (2–100 ký tự)        |
| `avatar`    | string | Không    | URL ảnh đại diện            |
| `introduce` | string | Không    | Giới thiệu bản thân (≤1000) |

### Request Body Example

```json
{
  "fullName": "Nguyễn Văn A Updated",
  "introduce": "Giảng viên lập trình chuyên nghiệp"
}
```

### Response `200 OK`

```json
{
  "message": "Cập nhật thông tin thành công",
  "data": {
    "id": "uuid",
    "fullName": "Nguyễn Văn A Updated",
    "email": "a@example.com",
    "avatar": null,
    "slug": "nguyen-van-a-updated-1712345678",
    "introduce": "Giảng viên lập trình chuyên nghiệp",
    "roleId": "uuid",
    "banId": null,
    "isDeleted": false,
    "timeBan": null,
    "timeUnBan": null,
    "availableAmount": 500000,
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-04-08T12:00:00.000Z",
    "role": { "id": "uuid", "name": "User" },
    "ban": null
  }
}
```

---

## 5. Auth - Đổi mật khẩu

> **Quyền**: Đã đăng nhập (bất kỳ role)

```
POST /api/user/change-password
```

### Request Body

| Field             | Type   | Bắt buộc | Mô tả                            |
| ----------------- | ------ | -------- | -------------------------------- |
| `currentPassword` | string | Có       | Mật khẩu hiện tại                |
| `newPassword`     | string | Có       | Mật khẩu mới (tối thiểu 6 ký tự) |

### Request Body Example

```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

### Response `200 OK`

```json
{ "message": "Đổi mật khẩu thành công", "data": null }
```

### Response `401 Unauthorized`

```json
{ "message": "Mật khẩu hiện tại không đúng", "data": null }
```

---

## 6. Admin - Xem chi tiết user

> **Quyền**: `Admin`

```
GET /api/user/admin/:id
```

### Path Parameters

| Param | Type   | Mô tả     |
| ----- | ------ | --------- |
| `id`  | string | UUID user |

### Response `200 OK`

```json
{
  "message": "Lấy thông tin người dùng thành công",
  "data": {
    "id": "uuid",
    "fullName": "Nguyễn Văn A",
    "email": "a@example.com",
    "avatar": "https://...",
    "slug": "nguyen-van-a-123",
    "introduce": "...",
    "roleId": "uuid",
    "banId": null,
    "isDeleted": false,
    "timeBan": null,
    "timeUnBan": null,
    "availableAmount": 500000,
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-03-20T08:00:00.000Z",
    "role": { "id": "uuid", "name": "User" },
    "ban": null,
    "_count": {
      "courses": 3,
      "userCourses": 10,
      "reviews": 15,
      "invoices": 8,
      "transactions": 5
    }
  }
}
```

---

## 7. Admin - Cập nhật user

> **Quyền**: `Admin`

```
PATCH /api/user/admin/:id
```

### Path Parameters

| Param | Type   | Mô tả     |
| ----- | ------ | --------- |
| `id`  | string | UUID user |

### Request Body

| Field       | Type   | Bắt buộc | Mô tả                       |
| ----------- | ------ | -------- | --------------------------- |
| `fullName`  | string | Không    | Họ tên (2–100 ký tự)        |
| `avatar`    | string | Không    | URL ảnh đại diện            |
| `introduce` | string | Không    | Giới thiệu bản thân (≤1000) |
| `roleId`    | string | Không    | ID role mới (UUID)          |

### Request Body Example

```json
{
  "fullName": "Nguyễn Văn A",
  "roleId": "teacher-role-uuid"
}
```

### Response `200 OK`

```json
{
  "message": "Cập nhật người dùng thành công",
  "data": { ... }
}
```

### Response `400 Bad Request`

```json
{ "message": "Role không tồn tại", "data": null }
```

---

## 8. Admin - Cấm người dùng

> **Quyền**: `Admin`

```
POST /api/user/admin/:id/ban
```

### Path Parameters

| Param | Type   | Mô tả             |
| ----- | ------ | ----------------- |
| `id`  | string | UUID user cần cấm |

### Request Body

| Field       | Type   | Bắt buộc | Mô tả                                                      |
| ----------- | ------ | -------- | ---------------------------------------------------------- |
| `reason`    | string | Có       | Lý do cấm                                                  |
| `timeUnBan` | string | Không    | Thời gian hết cấm (ISO 8601). Không truyền = cấm vĩnh viễn |

### Request Body Example

```json
{
  "reason": "Vi phạm quy định cộng đồng lần 2",
  "timeUnBan": "2026-06-01T00:00:00.000Z"
}
```

### Response `200 OK`

```json
{
  "message": "Cấm người dùng thành công",
  "data": {
    "id": "uuid",
    "fullName": "Trần Văn B",
    "email": "b@example.com",
    "banId": "ban-uuid",
    "timeBan": "2026-04-08T12:00:00.000Z",
    "timeUnBan": "2026-06-01T00:00:00.000Z",
    "role": { "id": "uuid", "name": "User" },
    "ban": { "id": "ban-uuid", "reason": "Vi phạm quy định cộng đồng lần 2" }
  }
}
```

### Error Responses

| Status | Message                  |
| ------ | ------------------------ |
| 400    | Không thể cấm chính mình |
| 400    | timeUnBan không hợp lệ   |
| 404    | Người dùng không tồn tại |

---

## 9. Admin - Bỏ cấm người dùng

> **Quyền**: `Admin`

```
POST /api/user/admin/:id/unban
```

### Path Parameters

| Param | Type   | Mô tả                |
| ----- | ------ | -------------------- |
| `id`  | string | UUID user cần bỏ cấm |

### Response `200 OK`

```json
{
  "message": "Bỏ cấm người dùng thành công",
  "data": {
    "id": "uuid",
    "fullName": "Trần Văn B",
    "banId": null,
    "timeBan": null,
    "timeUnBan": null,
    "ban": null
  }
}
```

### Error Responses

| Status | Message                  |
| ------ | ------------------------ |
| 400    | Người dùng không bị cấm  |
| 404    | Người dùng không tồn tại |

---

## 10. Admin - Xóa mềm người dùng

> **Quyền**: `Admin`

```
DELETE /api/user/admin/:id
```

### Path Parameters

| Param | Type   | Mô tả             |
| ----- | ------ | ----------------- |
| `id`  | string | UUID user cần xóa |

### Response `200 OK`

```json
{
  "message": "Xóa người dùng thành công",
  "data": {
    "id": "uuid",
    "fullName": "Trần Văn B",
    "isDeleted": true
  }
}
```

### Error Responses

| Status | Message                  |
| ------ | ------------------------ |
| 400    | Không thể xóa chính mình |
| 404    | Người dùng không tồn tại |

---

## 11. Admin - Khôi phục người dùng

> **Quyền**: `Admin`

```
POST /api/user/admin/:id/restore
```

### Path Parameters

| Param | Type   | Mô tả                   |
| ----- | ------ | ----------------------- |
| `id`  | string | UUID user cần khôi phục |

### Response `200 OK`

```json
{
  "message": "Khôi phục người dùng thành công",
  "data": {
    "id": "uuid",
    "fullName": "Trần Văn B",
    "isDeleted": false
  }
}
```

---

## Tổng kết quyền truy cập

| API                         | Method   | Route                     | Admin | Teacher | User | Public |
| --------------------------- | -------- | ------------------------- | ----- | ------- | ---- | ------ |
| Danh sách tất cả người dùng | `GET`    | `/user/admin/all`         | ✅    | ❌      | ❌   | ❌     |
| Danh sách học viên          | `GET`    | `/user/students`          | ✅    | ✅      | ❌   | ❌     |
| Xem profile public          | `GET`    | `/user/profile/:slug`     | ✅    | ✅      | ✅   | ✅     |
| Cập nhật profile cá nhân    | `PATCH`  | `/user/profile`           | ✅    | ✅      | ✅   | ❌     |
| Đổi mật khẩu                | `POST`   | `/user/change-password`   | ✅    | ✅      | ✅   | ❌     |
| Xem chi tiết user           | `GET`    | `/user/admin/:id`         | ✅    | ❌      | ❌   | ❌     |
| Admin cập nhật user         | `PATCH`  | `/user/admin/:id`         | ✅    | ❌      | ❌   | ❌     |
| Cấm người dùng              | `POST`   | `/user/admin/:id/ban`     | ✅    | ❌      | ❌   | ❌     |
| Bỏ cấm người dùng           | `POST`   | `/user/admin/:id/unban`   | ✅    | ❌      | ❌   | ❌     |
| Xóa mềm người dùng          | `DELETE` | `/user/admin/:id`         | ✅    | ❌      | ❌   | ❌     |
| Khôi phục người dùng        | `POST`   | `/user/admin/:id/restore` | ✅    | ❌      | ❌   | ❌     |

---

## Response Format chung

### Thành công

```json
{
  "message": "Mô tả thao tác thành công",
  "data": { ... },
  "meta": {                 // chỉ có khi trả danh sách phân trang
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

### Lỗi validation (class-validator)

```json
{
  "message": "Validation failed",
  "data": {
    "errors": [
      "fullName must be longer than or equal to 2 characters",
      "newPassword must be longer than or equal to 6 characters"
    ]
  }
}
```

### Lỗi chung

```json
{
  "message": "Mô tả lỗi",
  "data": null
}
```

---

## Ghi chú cho Frontend

1. **Cookie Auth**: Gửi request với `withCredentials: true` (axios) hoặc `credentials: 'include'` (fetch) để tự động gửi cookie `access_token`.
2. **Pagination**: Luôn sử dụng `meta.totalPages` để disable nút phân trang, không tính riêng ở client.
3. **Filter isBanned**: Truyền string `"true"` hoặc `"false"`, không phải boolean.
4. **Ban vĩnh viễn**: Khi `timeUnBan` là `null`, nghĩa là cấm vĩnh viễn. Hiển thị "Vĩnh viễn" trên UI.
5. **Slug thay đổi**: Khi user đổi `fullName`, slug sẽ tự động cập nhật. Frontend nên dùng `id` để làm key, chỉ dùng `slug` cho URL thân thiện.
6. **Sort**: Chỉ những trường được liệt kê trong bảng query mới hợp lệ, các giá trị khác sẽ fallback về `createdAt`.
