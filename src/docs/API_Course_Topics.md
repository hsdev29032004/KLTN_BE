# API: Chủ Đề Khóa Học (Topics)

Tài liệu này mô tả cách FE gắn / cập nhật chủ đề khi tạo và sửa khóa học.

---

## 0. Lấy danh sách chủ đề

> Gọi trước khi render form để hiển thị danh sách topic cho user chọn.

```
GET /api/topic
```

**Không cần auth.**

### Response

```json
{
  "message": "...",
  "data": [
    { "id": "uuid-1", "name": "Lập trình web", "slug": "lap-trinh-web" },
    { "id": "uuid-2", "name": "Thiết kế UI/UX",  "slug": "thiet-ke-ui-ux" },
    { "id": "uuid-3", "name": "Data Science",     "slug": "data-science" }
  ]
}
```

---

## 1. Tạo khóa học (có chọn chủ đề)

```
POST /api/course
Authorization: Bearer <teacher_token>
Content-Type: multipart/form-data
```

### Form fields

| Field           | Bắt buộc | Kiểu      | Mô tả                                              |
|-----------------|----------|-----------|----------------------------------------------------|
| `name`          | ✅        | string    | Tên khóa học                                       |
| `price`         | ✅        | number    | Giá (VNĐ), `0` = miễn phí                         |
| `content`       | ✅        | string    | Nội dung chi tiết (markdown/html)                  |
| `description`   | ✅        | string    | Mô tả ngắn                                         |
| `commissionRate`| ✅        | number    | Tỷ lệ hoa hồng hệ thống (0–100)                    |
| `thumbnail`     | ✅        | string/file | URL ảnh bìa **hoặc** upload file trực tiếp       |
| `topicIds`      | ❌        | string[]  | Mảng UUID chủ đề (xem cách truyền bên dưới)       |

### Cách truyền `topicIds` qua `multipart/form-data`

**Cách 1 — Nhiều field cùng tên (khuyên dùng):**
```
topicIds=uuid-1
topicIds=uuid-2
```

**Cách 2 — JSON string:**
```
topicIds=["uuid-1","uuid-2"]
```

### Ví dụ `fetch`

```ts
const form = new FormData();
form.append('name', 'NestJS nâng cao');
form.append('price', '299000');
form.append('content', '...');
form.append('description', 'Khóa học backend...');
form.append('commissionRate', '20');
form.append('thumbnail', thumbnailFile);         // File object
form.append('topicIds', 'uuid-1');               // Thêm từng topic
form.append('topicIds', 'uuid-2');

const res = await fetch('/api/course', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
```

### Response thành công (`201`)

```json
{
  "message": "Tạo khóa học thành công",
  "data": {
    "id": "course-uuid",
    "name": "NestJS nâng cao",
    "slug": "nestjs-nang-cao",
    "price": 299000,
    "status": "draft",
    ...
  }
}
```

> **Lưu ý:** Response trả về object course nhưng chưa include `courseTopics`.  
> Để lấy đầy đủ thông tin sau khi tạo, gọi thêm `GET /api/course/:id`.

---

## 2. Cập nhật khóa học (thay đổi chủ đề)

```
PUT /api/course/:courseId
Authorization: Bearer <teacher_token>
Content-Type: multipart/form-data
```

### Form fields

Tất cả fields đều **optional**. Chỉ truyền những field cần thay đổi.

| Field      | Kiểu     | Mô tả                                                               |
|------------|----------|---------------------------------------------------------------------|
| `topicIds` | string[] | **Replace toàn bộ** danh sách chủ đề. Truyền `[]` để xóa hết.     |

### Hành vi của `topicIds` khi update

| Giá trị truyền     | Kết quả                                                     |
|--------------------|-------------------------------------------------------------|
| Không truyền       | Giữ nguyên chủ đề hiện tại (**không thay đổi gì**)         |
| `["uuid-1"]`       | Xóa hết chủ đề cũ, gắn lại chỉ `uuid-1`                   |
| `["uuid-1","uuid-2"]` | Xóa hết chủ đề cũ, gắn `uuid-1` và `uuid-2`           |
| `[]` (mảng rỗng)   | Xóa hết toàn bộ chủ đề                                     |

### Ví dụ — Đổi chủ đề

```ts
const form = new FormData();
form.append('topicIds', 'uuid-1');
form.append('topicIds', 'uuid-3');

const res = await fetch(`/api/course/${courseId}`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
```

### Ví dụ — Xóa hết chủ đề

```ts
const form = new FormData();
form.append('topicIds', JSON.stringify([]));  // hoặc không append topicIds nào cả nếu dùng cách 1

// Cách đảm bảo nhất: truyền JSON empty array
form.append('topicIds', '[]');
```

### Response thành công (`200`)

```json
{
  "message": "Cập nhật khóa học thành công",
  "data": { ... }
}
```

---

## 3. Lấy chi tiết khóa học (bao gồm topics)

```
GET /api/course/:slugOrId
```

Trường `courseTopics` luôn có trong response:

```json
{
  "data": {
    "id": "course-uuid",
    "name": "NestJS nâng cao",
    "courseTopics": [
      {
        "id": "ct-uuid",
        "topicId": "uuid-1",
        "topic": { "id": "uuid-1", "name": "Lập trình web", "slug": "lap-trinh-web" }
      }
    ],
    ...
  }
}
```

---

## 4. Tìm kiếm theo chủ đề

```
GET /api/course/search?topicIds=uuid-1,uuid-2
GET /api/course/search?topicId=uuid-1
```

---

## 5. Luồng tích hợp giao diện

### Form tạo / sửa khóa học

```
1. Gọi GET /api/topic        → lấy danh sách topic để render checkbox/multi-select
2. User chọn các topic
3. Gọi POST /api/course      → truyền topicIds trong FormData  (tạo mới)
   hoặc PUT  /api/course/:id  → truyền topicIds trong FormData  (cập nhật)
4. Gọi GET  /api/course/:id  → render lại trang với courseTopics mới nhất
```

### Hiển thị topic đã chọn khi load form chỉnh sửa

```ts
// Lấy thông tin course hiện tại
const { data: course } = await fetch(`/api/course/${courseId}`).then(r => r.json());

// Map ra mảng topicId đang được chọn
const selectedTopicIds = course.courseTopics.map((ct: any) => ct.topicId);
// → dùng để pre-select trong UI
```
