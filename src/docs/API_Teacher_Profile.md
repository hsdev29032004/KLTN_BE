# API: Trang Hồ Sơ Giảng Viên

## Endpoint

```
GET /api/user/profile/:slug
```

**Phạm vi truy cập:** Public — không cần đăng nhập.

---

## Query Parameters

| Tham số | Kiểu   | Mặc định | Mô tả                              |
|---------|--------|----------|------------------------------------|
| `page`  | number | `1`      | Trang hiện tại (danh sách khóa học)|
| `limit` | number | `12`     | Số khóa học mỗi trang (tối đa 50)  |

---

## Response

```json
{
  "message": "Lấy thông tin profile thành công",
  "data": {
    "id": "uuid",
    "fullName": "Nguyễn Văn A",
    "avatar": "https://res.cloudinary.com/xxx/image/upload/avatar.jpg",
    "slug": "nguyen-van-a",
    "introduce": "Giảng viên 5 năm kinh nghiệm lập trình...",
    "createdAt": "2025-01-15T08:00:00.000Z",
    "role": {
      "name": "teacher"
    },
    "stats": {
      "totalCourses": 8,
      "totalStudents": 1240,
      "totalReviews": 312,
      "avgRating": 4.7
    },
    "courses": [
      {
        "id": "uuid",
        "name": "NestJS từ cơ bản đến nâng cao",
        "slug": "nestjs-tu-co-ban-den-nang-cao",
        "thumbnail": "https://res.cloudinary.com/xxx/image/upload/thumb.jpg",
        "price": 299000,
        "star": 4.8,
        "studentCount": 450,
        "_count": {
          "reviews": 95,
          "lessons": 32
        }
      }
    ]
  },
  "meta": {
    "total": 8,
    "page": 1,
    "limit": 12,
    "totalPages": 1
  }
}
```

---

## Mô tả các trường

### `data`

| Trường      | Kiểu     | Mô tả                                               |
|-------------|----------|-----------------------------------------------------|
| `id`        | string   | UUID của giảng viên                                 |
| `fullName`  | string   | Tên hiển thị                                        |
| `avatar`    | string\|null | URL ảnh đại diện                               |
| `slug`      | string   | Slug dùng để routing (`/teacher/:slug`)             |
| `introduce` | string   | Giới thiệu bản thân (có thể rỗng `""`)             |
| `createdAt` | ISO8601  | Ngày tham gia hệ thống                              |
| `role.name` | string   | `"teacher"` / `"admin"` / `"user"`                 |

### `data.stats`

| Trường          | Kiểu   | Mô tả                                               |
|-----------------|--------|-----------------------------------------------------|
| `totalCourses`  | number | Số khóa học đã published                            |
| `totalStudents` | number | Tổng học viên (cộng `studentCount` tất cả khóa học)|
| `totalReviews`  | number | Tổng đánh giá nhận được                            |
| `avgRating`     | number | Điểm đánh giá trung bình (làm tròn 1 chữ số thập phân) |

### `data.courses[]`

| Trường              | Kiểu   | Mô tả                           |
|---------------------|--------|---------------------------------|
| `id`                | string | UUID khóa học                   |
| `name`              | string | Tên khóa học                    |
| `slug`              | string | Slug khóa học (dùng cho routing)|
| `thumbnail`         | string\|null | URL ảnh bìa               |
| `price`             | number | Giá (VNĐ), `0` = miễn phí      |
| `star`              | number | Điểm trung bình (0–5)           |
| `studentCount`      | number | Số học viên đã mua              |
| `_count.reviews`    | number | Số lượt đánh giá                |
| `_count.lessons`    | number | Số bài học                      |

### `meta`

| Trường       | Kiểu   | Mô tả                          |
|--------------|--------|--------------------------------|
| `total`      | number | Tổng số khóa học published     |
| `page`       | number | Trang hiện tại                 |
| `limit`      | number | Số item mỗi trang              |
| `totalPages` | number | Tổng số trang                  |

---

## Lỗi

| HTTP | Trường hợp                              |
|------|-----------------------------------------|
| 404  | Không tìm thấy user với slug này        |

```json
{ "statusCode": 404, "message": "Người dùng không tồn tại" }
```

---

## Hướng dẫn tích hợp FE

### 1. Route trang giảng viên

```
/teacher/:slug
```

Khi FE navigate vào trang giảng viên, dùng `slug` từ URL để gọi API.

### 2. Gọi API

```ts
// Lần đầu load trang
const res = await fetch(`/api/user/profile/${slug}?page=1&limit=12`);
const { data, meta } = await res.json();
```

### 3. Cấu trúc giao diện gợi ý

```
┌─────────────────────────────────────────────┐
│  [avatar]  Nguyễn Văn A        [Giảng viên] │
│            "Giới thiệu bản thân..."          │
│                                              │
│  8 Khóa học · 1.240 Học viên · ⭐ 4.7       │
│  312 Đánh giá · Tham gia 01/2025            │
└─────────────────────────────────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐
│ [thumb]  │ │ [thumb]  │ │ [thumb]  │
│ Tên KH   │ │ Tên KH   │ │ Tên KH   │
│ ⭐4.8    │ │ ⭐4.5    │ │ ⭐4.9    │
│ 450 HV   │ │ 280 HV   │ │ 510 HV   │
│ 299.000₫ │ │ 199.000₫ │ │ 499.000₫ │
└──────────┘ └──────────┘ └──────────┘

[ Trang: < 1 2 3 > ]
```

### 4. Pagination khóa học

```ts
// Khi user chuyển trang
const loadPage = async (page: number) => {
  const res = await fetch(`/api/user/profile/${slug}?page=${page}&limit=12`);
  const { data, meta } = await res.json();
  setCourses(data.courses);
  setMeta(meta);
};
```

### 5. Kiểm tra vai trò

```ts
// Hiển thị badge "Giảng viên" nếu role = teacher
const isTeacher = data.role?.name === 'teacher';
```

### 6. Format hiển thị

```ts
// Giá tiền
const formatPrice = (price: number) =>
  price === 0 ? 'Miễn phí' : price.toLocaleString('vi-VN') + '₫';

// Ngày tham gia
const joinedDate = new Date(data.createdAt).toLocaleDateString('vi-VN', {
  month: 'long', year: 'numeric'
});
```

---

## Ví dụ thực tế

```
GET /api/user/profile/nguyen-van-a?page=1&limit=12
GET /api/user/profile/nguyen-van-a?page=2&limit=12
```
