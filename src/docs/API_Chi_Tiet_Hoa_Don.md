# API: Lấy Danh Sách Chi Tiết Hóa Đơn (Detail Invoices)

## Thông Tin Chung

| Thuộc tính | Giá trị |
|---|---|
| **Endpoint** | `GET /invoice/details` |
| **Yêu cầu xác thực** | Bắt buộc (Bearer Token hoặc Cookie `access_token`) |
| **Roles được phép** | `Admin`, `Teacher` |

---

## Phân Quyền

| Role | Quyền hạn |
|---|---|
| **Admin** | Xem toàn bộ chi tiết hóa đơn, lọc được theo `userId` (người mua) |
| **Teacher** | Chỉ xem chi tiết hóa đơn của các khóa học **do mình sở hữu**. Param `userId` bị bỏ qua |
| **User / Không có token** | `403 Forbidden` |

---

## Query Parameters

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `courseId` | `string` | Không | Lọc theo ID khóa học |
| `userId` | `string` | Không | Lọc theo ID người mua (**chỉ Admin mới có hiệu lực**) |
| `status` | `string` | Không | Lọc theo trạng thái (`paid`, ...) |
| `invoiceId` | `string` | Không | Lọc theo ID hóa đơn cha (`Invoices.id`) |
| `fromDate` | `string (YYYY-MM-DD)` | Không | Lọc từ ngày (bao gồm, tính từ 00:00:00) |
| `toDate` | `string (YYYY-MM-DD)` | Không | Lọc đến ngày (bao gồm, tính đến 23:59:59) |
| `page` | `number` | Không | Trang hiện tại (mặc định: `1`) |
| `limit` | `number` | Không | Số bản ghi mỗi trang (mặc định: `10`, tối đa: `100`) |
| `sortBy` | `string` | Không | Trường sắp xếp: `createdAt` \| `price` \| `status` (mặc định: `createdAt`) |
| `order` | `string` | Không | Thứ tự: `asc` \| `desc` (mặc định: `desc`) |

---

## Ví Dụ Request

### Admin — lấy tất cả, lọc theo người mua
```
GET /invoice/details?userId=abc-123&page=1&limit=20&sortBy=createdAt&order=desc
Authorization: Bearer <admin_token>
```

### Admin — lọc theo khóa học cụ thể
```
GET /invoice/details?courseId=xyz-456&page=1&limit=10
Authorization: Bearer <admin_token>
```

### Teacher — xem hóa đơn của khóa học mình sở hữu
```
GET /invoice/details?page=1&limit=10
Authorization: Bearer <teacher_token>
```

### Teacher — lọc theo khóa học cụ thể (chỉ được lọc trong khóa học của mình)
```
GET /invoice/details?courseId=xyz-456&sortBy=price&order=asc
Authorization: Bearer <teacher_token>
```

---

## Response

### Thành công — `200 OK`

```json
{
  "message": "Lấy danh sách chi tiết hóa đơn thành công",
  "data": [
    {
      "id": "d1e2f3a4-...",
      "price": 299000,
      "status": "paid",
      "createdAt": "2026-04-01T10:00:00.000Z",
      "updatedAt": "2026-04-01T10:00:00.000Z",
      "courses": {
        "id": "c1d2e3f4-...",
        "name": "Khóa học React cơ bản",
        "slug": "khoa-hoc-react-co-ban",
        "thumbnail": "https://example.com/thumbnail.jpg",
        "user": {
          "id": "u1v2w3x4-...",
          "fullName": "Nguyễn Văn Giảng",
          "avatar": "https://example.com/avatar.jpg"
        }
      },
      "invoices": {
        "id": "i1j2k3l4-...",
        "amount": 598000,
        "status": "purchased",
        "createdAt": "2026-04-01T10:00:00.000Z",
        "users": {
          "id": "u9v8w7x6-...",
          "fullName": "Trần Thị Học",
          "email": "hoc@example.com",
          "avatar": "https://example.com/avatar2.jpg"
        }
      },
      "commissionRate": 70,
      "teacherEarnings": 209300,
    "commissionRate": 70
  }
}
```

### Mô tả các trường trong `data[]`

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | `string` | ID của detail invoice |
| `price` | `number` | Giá khóa học tại thời điểm mua (VNĐ) |
| `status` | `string` | Trạng thái của chi tiết hóa đơn (ví dụ: `paid`) |
| `createdAt` | `string (ISO 8601)` | Thời điểm tạo |
| `updatedAt` | `string (ISO 8601)` | Thời điểm cập nhật |
| `courses.id` | `string` | ID khóa học |
| `courses.name` | `string` | Tên khóa học |
| `courses.slug` | `string` | Slug khóa học |
| `courses.thumbnail` | `string` | URL ảnh thumbnail |
| `courses.user` | `object` | Giảng viên sở hữu khóa học |
| `invoices.id` | `string` | ID hóa đơn cha |
| `invoices.amount` | `number` | Tổng tiền của hóa đơn cha (tổng nhiều khóa học) |
| `invoices.status` | `string` | Trạng thái hóa đơn: `purchased` \| `refund_requested` \| `refunded` |
| `invoices.users` | `object` | Người mua |
| `commissionRate` | `number` | Tỷ lệ hoa hồng hệ thống (%) — Giảng viên nhận bao nhiêu % từ giá bán |
| `teacherEarnings` | `number` | Số tiền giảng viên nhận từ khoá học này (VNĐ) = `price` × `commissionRate` / 100 |

### Mô tả `meta`

| Trường | Kiểu | Mô tả |
|---|---|---|
| `total` | `number` | Tổng số bản ghi thỏa điều kiện |
| `page` | `number` | Trang hiện tại |
| `limit` | `number` | Số bản ghi mỗi trang |
| `totalPages` | `number` | Tổng số trang |
| `commissionRate` | `number` | Tỷ lệ hoa hồng hệ thống (%) — áp dụng cho toàn bộ khoá học |

---

## Lỗi Thường Gặp

| HTTP Status | Mô tả |
|---|---|
| `401 Unauthorized` | Không có token hoặc token hết hạn |
| `403 Forbidden` | Role không được phép (User hoặc chưa đăng nhập) |
