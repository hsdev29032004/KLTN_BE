# API Lịch Sử Giao Dịch

Base URL: `http://localhost:3001/api`

---

## 1. Lấy giao dịch của bản thân

> Dùng cho user xem lịch sử nạp/rút tiền của mình.

```
GET /payment/transactions
```

**Authentication:** Cookie JWT (bắt buộc)

### Query Parameters

| Param | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `type` | string | Không | Loại giao dịch: `deposit` \| `withdraw` |
| `status` | string | Không | Trạng thái: `completed` \| `failed` \| `pending` |
| `fromDate` | string | Không | Từ ngày (YYYY-MM-DD), tính từ 00:00:00 |
| `toDate` | string | Không | Đến ngày (YYYY-MM-DD), tính đến 23:59:59 |
| `page` | number | Không | Trang hiện tại (default: `1`) |
| `limit` | number | Không | Số bản ghi mỗi trang, tối đa 100 (default: `10`) |

### Ví dụ request

```
GET /payment/transactions?type=deposit&fromDate=2026-04-01&toDate=2026-04-06&page=1&limit=10
```

### Response thành công (200)

```json
{
  "message": "Lấy lịch sử giao dịch thành công",
  "data": [
    {
      "id": "abc123_1743955200000",
      "userId": "user-uuid",
      "type": "deposit",
      "amount": 100000,
      "bankName": "NCB",
      "accountNumber": null,
      "status": "completed",
      "isDeleted": false,
      "createdAt": "2026-04-06T10:00:00.000Z",
      "updatedAt": "2026-04-06T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

## 2. Lấy tất cả giao dịch (Admin)

> Dùng cho admin xem toàn bộ giao dịch của hệ thống, có thể lọc theo user.

```
GET /payment/admin/transactions
```

**Authentication:** Cookie JWT (bắt buộc, role: `admin`)

### Query Parameters

| Param | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `userId` | string | Không | Lọc theo ID của user cụ thể |
| `type` | string | Không | Loại giao dịch: `deposit` \| `withdraw` |
| `status` | string | Không | Trạng thái: `completed` \| `failed` \| `pending` |
| `fromDate` | string | Không | Từ ngày (YYYY-MM-DD), tính từ 00:00:00 |
| `toDate` | string | Không | Đến ngày (YYYY-MM-DD), tính đến 23:59:59 |
| `page` | number | Không | Trang hiện tại (default: `1`) |
| `limit` | number | Không | Số bản ghi mỗi trang, tối đa 100 (default: `10`) |

### Ví dụ request

```
GET /payment/admin/transactions?userId=abc-uuid&fromDate=2026-04-01&toDate=2026-04-06&page=1&limit=20
```

### Response thành công (200)

```json
{
  "message": "Lấy danh sách giao dịch thành công",
  "data": [
    {
      "id": "abc123_1743955200000",
      "userId": "user-uuid",
      "type": "deposit",
      "amount": 100000,
      "bankName": "NCB",
      "accountNumber": null,
      "status": "completed",
      "isDeleted": false,
      "createdAt": "2026-04-06T10:00:00.000Z",
      "updatedAt": "2026-04-06T10:00:00.000Z",
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        "name": "Nguyễn Văn A"
      }
    }
  ],
  "meta": {
    "total": 120,
    "page": 1,
    "limit": 20,
    "totalPages": 6
  }
}
```

---

## Ghi chú

- `amount` đơn vị là VNĐ (ví dụ: `100000` = 100,000đ)
- `type`: hiện tại chỉ có `deposit` (nạp tiền). `withdraw` sẽ bổ sung sau
- `status`:
  - `completed` — giao dịch thành công, tiền đã được cộng vào tài khoản
  - `failed` — giao dịch thất bại (hiện tại không lưu vào DB)
  - `pending` — đang xử lý
- Chỉ lưu bản ghi giao dịch khi thanh toán **thành công**
