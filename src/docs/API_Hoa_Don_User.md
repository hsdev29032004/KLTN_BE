# API Hóa Đơn (User)

Base URL: `http://localhost:3001/api`

> Các API này dành cho **user đã đăng nhập** xem lịch sử mua khóa học của mình.

---

## 1. Lấy danh sách hóa đơn

```
GET /invoice/my
```

**Authentication:** Cookie JWT (bắt buộc)

### Query Parameters

| Param | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `status` | string | Không | Trạng thái hóa đơn: `purchased` \| `refunded` |
| `fromDate` | string | Không | Từ ngày (YYYY-MM-DD), tính từ 00:00:00 |
| `toDate` | string | Không | Đến ngày (YYYY-MM-DD), tính đến 23:59:59 |
| `page` | number | Không | Trang hiện tại (default: `1`) |
| `limit` | number | Không | Số bản ghi mỗi trang, tối đa 100 (default: `10`) |

### Ví dụ request

```
GET /invoice/my?status=purchased&fromDate=2026-04-01&page=1&limit=10
```

### Response thành công (200)

```json
{
  "message": "Lấy danh sách hóa đơn thành công",
  "data": [
    {
      "id": "invoice-uuid",
      "amount": 350000,
      "status": "purchased",
      "createdAt": "2026-04-06T08:00:00.000Z",
      "updatedAt": "2026-04-06T08:00:00.000Z",
      "detail_invoices": [
        {
          "id": "detail-uuid",
          "price": 200000,
          "commissionRate": 20,
          "status": "purchased",
          "courses": {
            "id": "course-uuid",
            "name": "Khóa học NestJS",
            "slug": "khoa-hoc-nestjs",
            "thumbnail": "https://cdn.example.com/thumbnail.jpg"
          }
        },
        {
          "id": "detail-uuid-2",
          "price": 150000,
          "commissionRate": 20,
          "status": "purchased",
          "courses": {
            "id": "course-uuid-2",
            "name": "Khóa học React",
            "slug": "khoa-hoc-react",
            "thumbnail": "https://cdn.example.com/thumbnail2.jpg"
          }
        }
      ]
    }
  ],
  "meta": {
    "total": 3,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

## 2. Lấy chi tiết một hóa đơn

```
GET /invoice/my/:id
```

**Authentication:** Cookie JWT (bắt buộc)

> Chỉ lấy được hóa đơn của chính mình. Nếu `id` không thuộc user → trả về lỗi 403.

### Path Parameters

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `id` | string (UUID) | ID của hóa đơn |

### Ví dụ request

```
GET /invoice/my/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Response thành công (200)

```json
{
  "message": "Lấy chi tiết hóa đơn thành công",
  "data": {
    "id": "invoice-uuid",
    "amount": 350000,
    "status": "purchased",
    "createdAt": "2026-04-06T08:00:00.000Z",
    "updatedAt": "2026-04-06T08:00:00.000Z",
    "detail_invoices": [
      {
        "id": "detail-uuid",
        "price": 200000,
        "commissionRate": 20,
        "status": "purchased",
        "createdAt": "2026-04-06T08:00:00.000Z",
        "courses": {
          "id": "course-uuid",
          "name": "Khóa học NestJS",
          "slug": "khoa-hoc-nestjs",
          "thumbnail": "https://cdn.example.com/thumbnail.jpg",
          "user": {
            "id": "teacher-uuid",
            "fullName": "Nguyễn Văn A",
            "avatar": "https://cdn.example.com/avatar.jpg"
          }
        }
      }
    ]
  }
}
```

### Response lỗi

| HTTP | Trường hợp |
|------|------------|
| `403` | Hóa đơn không tồn tại hoặc không thuộc về user |

```json
{
  "statusCode": 403,
  "message": "Không tìm thấy hóa đơn"
}
```

---

## Ghi chú

- `amount` — tổng tiền của toàn bộ hóa đơn (đơn vị VNĐ)
- `price` trong `detail_invoices` — giá của từng khóa học tại thời điểm mua
- `commissionRate` — phần trăm hoa hồng hệ thống tại thời điểm mua (%)
- `status` hóa đơn: `purchased` (đã mua) | `refunded` (đã hoàn tiền)
- Mỗi hóa đơn có thể chứa nhiều khóa học (mua gộp giỏ hàng)
