# Giỏ Hàng & Thanh Toán Trực Tiếp VNPay

## 1. Tổng quan thay đổi

### Bỏ hoàn toàn
- ❌ Tính năng **nạp tiền** (`POST /api/payment/create-payment-url`)
- ❌ Tính năng **rút tiền** / số dư ví (`availableAmount`)
- ❌ API lịch sử giao dịch (`GET /api/payment/transactions`, `GET /api/payment/admin/transactions`)
- ❌ Logic **cộng tiền cho giảng viên** khi mua (admin sẽ tự chuyển cuối tháng dựa trên chi tiết hóa đơn)

### Thêm mới
- ✅ **Giỏ hàng** (Cart) - CRUD
- ✅ **Thanh toán trực tiếp qua VNPay** - không qua ví

### Thay đổi flow mua khóa học
```
CŨ: User nạp tiền vào ví → Bấm mua → Trừ ví → Xong
MỚI: User thêm vào giỏ hàng → Bấm mua → Tạo hóa đơn pending → Redirect VNPay → Thanh toán → Callback xử lý → Redirect FE
```

---

## 2. Cart APIs

Base URL: `/api/cart`

### 2.1 Thêm khóa học vào giỏ hàng
```
POST /api/cart
Auth: Required (any logged-in user)
```

**Request Body:**
```json
{
  "courseIds": ["course-id-1", "course-id-2"]
}
```

**Response:**
```json
{
  "message": "Đã thêm 2 khóa học vào giỏ hàng",
  "data": {
    "added": 2,
    "skipped": 0
  }
}
```

**Logic:**
- Tự động bỏ qua các khóa học đã có trong giỏ
- Bỏ qua khóa học đã mua
- Bỏ qua khóa học của chính mình
- Chỉ thêm khóa học đang published

### 2.2 Xóa khóa học khỏi giỏ hàng
```
DELETE /api/cart
Auth: Required
```

**Request Body:**
```json
{
  "courseIds": ["course-id-1"]
}
```

**Response:**
```json
{
  "message": "Đã xóa 1 khóa học khỏi giỏ hàng",
  "data": { "removed": 1 }
}
```

### 2.3 Lấy giỏ hàng
```
GET /api/cart
Auth: Required
```

**Response:**
```json
{
  "message": "Lấy giỏ hàng thành công",
  "data": {
    "items": [
      {
        "id": "cart-item-uuid",
        "courseId": "course-uuid",
        "addedAt": "2026-04-09T...",
        "course": {
          "id": "course-uuid",
          "name": "Khóa học React",
          "slug": "khoa-hoc-react",
          "thumbnail": "https://...",
          "price": 500000,
          "star": "4.5",
          "status": "published",
          "user": {
            "id": "teacher-uuid",
            "fullName": "Nguyễn Văn A",
            "avatar": "https://..."
          }
        }
      }
    ],
    "totalPrice": 500000,
    "count": 1
  }
}
```

---

## 3. Thanh Toán (Purchase Flow mới)

### 3.1 Mua khóa học (tạo hóa đơn + redirect VNPay)

```
POST /api/course/purchased
Role: user
```

**Request Body** (array courseIds):
```json
["course-id-1", "course-id-2"]
```

**Response:**
```json
{
  "message": "Tạo đơn hàng thành công",
  "data": {
    "invoiceId": "invoice-uuid",
    "amount": 1000000,
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=..."
  }
}
```

**FE cần làm:** Sau khi nhận response → `window.location.href = data.paymentUrl` để redirect sang trang thanh toán VNPay.

### 3.2 VNPay Callback (BE tự xử lý)

```
GET /api/payment/vnpay-return
Public (VNPay gọi trực tiếp)
```

BE xử lý xong sẽ redirect FE đến:

**Thành công:**
```
{FE_DOMAIN}/payment?status=success&invoiceId=xxx
```

**Thất bại:**
```
{FE_DOMAIN}/payment?status=fail&code=xxx&invoiceId=xxx
```

### 3.3 Khi thanh toán thành công, BE tự động:
1. Cập nhật invoice `pending` → `purchased`
2. Cập nhật detail invoices `pending` → `paid`
3. Tạo `UserCourse` records (user owns the courses)
4. Tăng `studentCount` của mỗi khóa học
5. Thêm user vào conversations của các khóa học
6. **Xóa các khóa học đã mua khỏi giỏ hàng**

### 3.4 Khi thanh toán thất bại:
1. Cập nhật invoice `pending` → `failed`
2. Cập nhật detail invoices → `failed`

---

## 4. Hóa đơn APIs (vẫn giữ nguyên)

### 4.1 Danh sách hóa đơn của user
```
GET /api/invoice/my?page=1&limit=10&status=purchased&fromDate=...&toDate=...
Auth: Required
```

**Lưu ý:** Hóa đơn giờ có thêm các status mới:
- `pending` - đang chờ thanh toán
- `purchased` - đã thanh toán thành công
- `failed` - thanh toán thất bại

### 4.2 Chi tiết hóa đơn
```
GET /api/invoice/my/:invoiceId
Auth: Required
```

### 4.3 Admin/Teacher xem chi tiết hóa đơn
```
GET /api/invoice/details?courseId=...&userId=...&status=...
Role: admin, teacher
```

---

## 5. Hướng dẫn FE Implementation

### 5.1 Trang Giỏ Hàng (`/cart`)

```
1. Mount → GET /api/cart
2. Hiển thị danh sách khóa học trong giỏ:
   - Thumbnail, name, teacher, price
   - Nút xóa (gọi DELETE /api/cart với courseId)
3. Hiển thị tổng tiền (totalPrice)
4. Nút "Thanh toán" → gọi POST /api/course/purchased với mảng courseIds
5. Nhận paymentUrl → window.location.href = paymentUrl
```

### 5.2 Nút "Thêm vào giỏ" (Course Detail / Course List)

```typescript
const addToCart = async (courseId: string) => {
  await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseIds: [courseId] }),
    credentials: 'include',
  });
  // Update cart badge count
};
```

### 5.3 Trang kết quả thanh toán (`/payment`)

FE sẽ nhận query params sau khi VNPay redirect:

```typescript
// pages/payment.tsx
const searchParams = useSearchParams();
const status = searchParams.get('status');      // 'success' | 'fail'
const invoiceId = searchParams.get('invoiceId');
const errorCode = searchParams.get('code');     // VNPay error code nếu fail

if (status === 'success') {
  // Hiển thị "Thanh toán thành công!"
  // Gọi GET /api/invoice/my/{invoiceId} để show chi tiết
  // Nút "Xem khóa học đã mua" → /courses/purchased
} else {
  // Hiển thị "Thanh toán thất bại"
  // Nút "Thử lại" → quay lại giỏ hàng
}
```

### 5.4 Flow mua từ giỏ hàng (Complete)

```
┌──────────┐    GET /cart     ┌──────────┐   POST /course/purchased   ┌──────────┐
│  Cart     │ ──────────────► │  Checkout │ ────────────────────────► │  VNPay   │
│  Page     │                 │  Summary  │     ← paymentUrl          │  Payment │
└──────────┘                  └──────────┘                            └────┬─────┘
                                                                          │
                                                                   redirect back
                                                                          │
                                                                     ┌────▼─────┐
                                                                     │  /payment │
                                                                     │  result   │
                                                                     └──────────┘
```

### 5.5 Flow mua nhanh từ trang khóa học

```typescript
// Mua ngay 1 khóa học (không qua giỏ hàng)
const buyNow = async (courseId: string) => {
  const res = await fetch('/api/course/purchased', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([courseId]),
    credentials: 'include',
  });
  const { data } = await res.json();
  window.location.href = data.paymentUrl;
};
```

---

## 6. Xóa / Bỏ trên FE

| Tính năng cũ | Hành động |
|---------------|-----------|
| Trang nạp tiền (`/deposit`) | **Xóa hoàn toàn** |
| Trang rút tiền | **Xóa hoàn toàn** |
| Hiển thị số dư ví (availableAmount) | **Xóa hoàn toàn** |
| Lịch sử giao dịch nạp/rút | **Xóa hoàn toàn** |
| `POST /api/payment/create-payment-url` | **Không gọi nữa** |
| `GET /api/payment/transactions` | **Không gọi nữa** |
| `GET /api/payment/admin/transactions` | **Không gọi nữa** |

---

## 7. Trạng thái hóa đơn mới

| Status | Mô tả |
|--------|-------|
| `pending` | Đã tạo hóa đơn, đang chờ thanh toán VNPay |
| `purchased` | Thanh toán thành công |
| `failed` | Thanh toán thất bại |
| `refund_requested` | Yêu cầu hoàn tiền (giữ nguyên) |
| `refunded` | Đã hoàn tiền (giữ nguyên) |

---

## 8. Error Codes

| Status | Message | Khi nào |
|--------|---------|---------|
| 400 | Danh sách khóa học rỗng | courseIds trống |
| 400 | Tồn tại khóa học đã mua | Mua lại khóa đã có |
| 400 | Không có khóa học hợp lệ | Course IDs không tồn tại/not published |
| 404 | Có khóa học không tồn tại | Course ID invalid |
| 404 | Hệ thống chưa được cấu hình | Chưa setup System record |
