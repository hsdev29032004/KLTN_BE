# API – Cập nhật hoa hồng khóa học (newCommissionRate)

## Tổng quan

Khi giảng viên muốn thay đổi `commissionRate` (tỷ lệ hoa hồng) của một khóa học đang hoạt động, hệ thống **không áp dụng ngay** mà lưu giá trị mới vào trường `newCommissionRate` và tạo yêu cầu duyệt. Admin duyệt thì giá trị mới mới được áp dụng vào `commissionRate`.

### Trường hợp ngoại lệ

| Trạng thái khóa học | Hành vi khi đổi `commissionRate` |
|---------------------|----------------------------------|
| `draft` | Cập nhật trực tiếp vào `commissionRate`, không cần duyệt |
| `rejected` | Cập nhật trực tiếp vào `commissionRate`, không cần duyệt |
| `published` | Lưu vào `newCommissionRate`, tạo `CourseApproval`, đổi status → `update` |
| `need_update` | Lưu vào `newCommissionRate`, tạo `CourseApproval`, giữ status `need_update` |

---

## 1. Cập nhật hoa hồng (Teacher)

```
PATCH /api/course/:id
Authorization: Bearer <teacher_token>
Content-Type: multipart/form-data  hoặc  application/json
```

### Body

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| `commissionRate` | number (0–100) | Không | Tỷ lệ hoa hồng mới (%) |

### Response (khóa học đang published)

```json
{
  "message": "Cập nhật khóa học thành công",
  "data": {
    "id": "...",
    "status": "update",
    "commissionRate": "30",
    "newCommissionRate": "25",
    ...
  }
}
```

> `commissionRate` vẫn là giá trị cũ.  
> `newCommissionRate` là giá trị mới đang chờ duyệt.  
> `status` chuyển sang `update` (nếu trước đó là `published`).

### Response (khóa học đang draft/rejected)

```json
{
  "message": "Cập nhật khóa học thành công",
  "data": {
    "id": "...",
    "status": "draft",
    "commissionRate": "25",
    "newCommissionRate": null,
    ...
  }
}
```

---

## 2. Lấy chi tiết / danh sách khóa học

Tất cả API trả về khóa học đều bao gồm 2 trường:

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `commissionRate` | string (Decimal) | Tỷ lệ hoa hồng hiện tại đang áp dụng |
| `newCommissionRate` | string \| null | Tỷ lệ hoa hồng mới đang chờ duyệt. `null` nếu không có thay đổi chờ duyệt |

### Ví dụ

```json
{
  "commissionRate": "30",
  "newCommissionRate": "25"
}
```

---

## 3. Admin duyệt khóa học

```
PATCH /api/course/:id/publish
Authorization: Bearer <admin_token>
```

Khi admin duyệt:
- `commissionRate` ← giá trị của `newCommissionRate`
- `newCommissionRate` ← `null`
- `status` ← `published`

### Response

```json
{
  "message": "Duyệt khóa học thành công"
}
```

---

## 4. Hướng dẫn FE hiển thị

### Trang quản lý khóa học của giảng viên

```tsx
// Hiển thị hoa hồng hiện tại và giá trị đang chờ duyệt
{course.newCommissionRate !== null ? (
  <div>
    <span>Hoa hồng: {course.commissionRate}%</span>
    <Badge color="warning">
      Đang chờ duyệt: {course.newCommissionRate}%
    </Badge>
  </div>
) : (
  <span>Hoa hồng: {course.commissionRate}%</span>
)}
```

### Form chỉnh sửa khóa học

- Hiển thị `commissionRate` là giá trị hiện tại trong input.
- Nếu `newCommissionRate !== null`, hiển thị thêm banner/badge: *"Hoa hồng {newCommissionRate}% đang chờ admin duyệt"*.
- Khi giảng viên nhập giá trị mới và submit, gọi `PATCH /api/course/:id` với `commissionRate = <giá trị mới>`.

### Trang duyệt khóa học của admin

- Trong danh sách approval, nếu `description === "Cập nhật hoa hồng"` thì đây là yêu cầu đổi hoa hồng.
- Hiển thị: *"Yêu cầu đổi hoa hồng từ {commissionRate}% → {newCommissionRate}%"*.

---

## 5. Luồng trạng thái đầy đủ

```
Teacher đổi commissionRate
        │
        ├─ status = draft/rejected
        │       └─→ commissionRate cập nhật ngay ✓
        │
        └─ status = published / need_update
                └─→ newCommissionRate = giá trị mới
                    CourseApproval tạo mới (description: "Cập nhật hoa hồng")
                    status: published → update
                           need_update → need_update (giữ nguyên)
                              │
                    Admin xem xét
                    ├─ Duyệt → commissionRate = newCommissionRate
                    │          newCommissionRate = null
                    │          status = published
                    │
                    └─ Từ chối → newCommissionRate giữ nguyên (FE có thể ẩn đi)
                                 status: update → need_update
```
