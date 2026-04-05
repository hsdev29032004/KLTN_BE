# API Nạp Tiền VNPay — Documentation cho Frontend

## Mục Lục

- [Tổng Quan Flow](#tổng-quan-flow)
- [Cấu Hình Env (Backend)](#cấu-hình-env-backend)
- [API 1: Tạo Link Thanh Toán](#api-1-tạo-link-thanh-toán)
- [API 2: VNPay Return (Backend xử lý)](#api-2-vnpay-return)
- [API 3: Lịch Sử Giao Dịch](#api-3-lịch-sử-giao-dịch)
- [Hướng Dẫn Implement FE](#hướng-dẫn-implement-fe)

---

## Tổng Quan Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│    FE    │         │    BE    │         │  VNPay   │         │    FE    │
│ (React)  │         │ (NestJS) │         │ Sandbox  │         │ (React)  │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │ 1. POST /api/payment/create-payment-url │                    │
     │    { amount: 100000 }                   │                    │
     │ ──────────────────►│                    │                    │
     │                    │                    │                    │
     │    { url: "https://sandbox.vnpay..." }  │                    │
     │ ◄──────────────────│                    │                    │
     │                    │                    │                    │
     │ 2. window.location.href = url           │                    │
     │ ─────────────────────────────────────►  │                    │
     │                    │                    │                    │
     │                    │ 3. VNPay redirect   │                    │
     │                    │    GET /api/payment/vnpay-return?...    │
     │                    │ ◄──────────────────│                    │
     │                    │                    │                    │
     │                    │ 4. Xử lý: cập nhật DB, cộng tiền      │
     │                    │                    │                    │
     │                    │ 5. Redirect 302     │                    │
     │                    │ ─────────────────────────────────────► │
     │                    │    http://localhost:3000/deposit?status=success
     │                    │                    │                    │
     │                    │                    │    6. FE đọc query │
     │                    │                    │       hiển thị KQ  │
```

---

## Cấu Hình Env (Backend)

Thêm vào file `.env`:

```env
VNPAY_TMN_CODE=X783MKOS
VNPAY_SECRET_KEY=YSOOD595SQM9RAFBDTS4K20FUH8ZTV0Z
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

---

## API 1: Tạo Link Thanh Toán

### Thông tin chung

| Thuộc tính | Giá trị |
|---|---|
| **Endpoint** | `POST /api/payment/create-payment-url` |
| **Auth** | Bắt buộc (Bearer Token hoặc Cookie `access_token`) |
| **Role** | Tất cả user đã đăng nhập |

### Request Body

```json
{
  "amount": 100000
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `amount` | `number (int)` | Có | Số tiền nạp (VNĐ). Tối thiểu `10000` |

### Response thành công — `201 Created`

```json
{
  "message": "Tạo link thanh toán thành công",
  "data": {
    "url": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=10000000&vnp_TxnRef=mailtest_1712345678901&...",
    "transactionId": "abc-123-def-456"
  }
}
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `url` | `string` | Link thanh toán VNPay. FE cần redirect user đến URL này |
| `transactionId` | `string` | ID giao dịch trong DB, dùng để tra cứu sau |

### Mã đơn hàng (vnp_TxnRef)

Format: `{email_bỏ_ký_tự_đặc_biệt}_{timestamp}`

Ví dụ:
- Email: `test@gmail.com` → `testgmailcom_1712345678901`
- Email: `user@edu.vn` → `usereduvn_1712345678901`

### Lỗi

| HTTP Status | Điều kiện |
|---|---|
| `400` | `amount` < 10000 hoặc không phải số nguyên |
| `401` | Chưa đăng nhập |

---

## API 2: VNPay Return (Backend tự xử lý)

> **FE KHÔNG gọi API này.** Đây là callback URL mà VNPay tự redirect về sau khi thanh toán.

| Thuộc tính | Giá trị |
|---|---|
| **Endpoint** | `GET /api/payment/vnpay-return` |
| **Auth** | Không (PublicAPI) |

### Backend xử lý

1. Đọc query params từ VNPay
2. Kiểm tra `vnp_ResponseCode`:
   - `00` → Thành công: cập nhật transaction = `completed`, cộng tiền vào `availableAmount`
   - Khác → Thất bại: cập nhật transaction = `failed`
3. Redirect (302) về FE

### FE nhận redirect tại

| Kết quả | Redirect URL |
|---|---|
| Thành công | `http://localhost:3000/deposit?status=success&amount=100000&transactionId=abc-123` |
| Thất bại | `http://localhost:3000/deposit?status=fail&code=24` |
| Đơn không hợp lệ | `http://localhost:3000/deposit?status=fail&reason=invalid_order` |
| Đã xử lý rồi | `http://localhost:3000/deposit?status=already_processed` |

### Mã lỗi VNPay phổ biến (`code`)

| Code | Ý nghĩa |
|---|---|
| `00` | Thành công |
| `07` | Trừ tiền thành công nhưng giao dịch bị nghi ngờ |
| `09` | Thẻ/TK chưa đăng ký dịch vụ InternetBanking |
| `10` | Xác thực thông tin thẻ/TK không đúng quá 3 lần |
| `11` | Đã hết hạn chờ thanh toán |
| `12` | Thẻ/TK bị khóa |
| `13` | Nhập sai mật khẩu OTP |
| `24` | Khách hàng hủy giao dịch |
| `51` | Tài khoản không đủ số dư |
| `65` | Vượt quá hạn mức giao dịch trong ngày |
| `75` | Ngân hàng thanh toán đang bảo trì |
| `79` | Nhập sai mật khẩu thanh toán quá số lần |
| `99` | Lỗi không xác định |

---

## API 3: Lịch Sử Giao Dịch

### Thông tin chung

| Thuộc tính | Giá trị |
|---|---|
| **Endpoint** | `GET /api/payment/transactions` |
| **Auth** | Bắt buộc |
| **Role** | Tất cả user đã đăng nhập |

### Query Parameters

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `type` | `string` | Không | `deposit` hoặc `withdrawal` |
| `status` | `string` | Không | `pending`, `completed`, `failed`, `approved`, `rejected` |
| `page` | `number` | Không | Mặc định: `1` |
| `limit` | `number` | Không | Mặc định: `10`, tối đa: `100` |

### Response thành công — `200 OK`

```json
{
  "message": "Lấy lịch sử giao dịch thành công",
  "data": [
    {
      "id": "abc-123",
      "userId": "user-456",
      "type": "deposit",
      "amount": 100000,
      "bankName": "VNPay",
      "accountNumber": "testgmailcom_1712345678901",
      "status": "completed",
      "isDeleted": false,
      "createdAt": "2026-04-05T10:00:00.000Z",
      "updatedAt": "2026-04-05T10:01:00.000Z",
      "deletedAt": null
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

## Hướng Dẫn Implement FE

### 1. Trang Nạp Tiền — Form

```tsx
const handleDeposit = async () => {
  const res = await fetch('/api/payment/create-payment-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ amount: 100000 }),
  });
  const data = await res.json();

  if (data.data?.url) {
    // Redirect sang VNPay
    window.location.href = data.data.url;
  }
};
```

### 2. Trang Kết Quả — Đọc query params

Sau khi thanh toán, VNPay → Backend → Redirect về FE tại `/deposit?status=...`

```tsx
// pages/deposit.tsx hoặc app/deposit/page.tsx
import { useSearchParams } from 'next/navigation'; // hoặc react-router

export default function DepositResultPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const amount = searchParams.get('amount');
  const code = searchParams.get('code');

  if (status === 'success') {
    return <div>Nạp tiền thành công! Số tiền: {Number(amount).toLocaleString()}đ</div>;
  }

  if (status === 'fail') {
    return <div>Nạp tiền thất bại. Mã lỗi: {code}</div>;
  }

  if (status === 'already_processed') {
    return <div>Giao dịch đã được xử lý trước đó.</div>;
  }

  return <div>Đang xử lý...</div>;
}
```

### 3. Trang Lịch Sử Giao Dịch

```tsx
const fetchTransactions = async (page = 1) => {
  const res = await fetch(`/api/payment/transactions?page=${page}&limit=10`, {
    credentials: 'include',
  });
  const data = await res.json();
  // data.data = array of transactions
  // data.meta = { total, page, limit, totalPages }
};
```

### 4. Test với VNPay Sandbox

| Thông tin | Giá trị |
|---|---|
| Ngân hàng | NCB |
| Số thẻ | `9704198526191432198` |
| Tên | `NGUYEN VAN A` |
| Ngày hết hạn | `07/15` |
| OTP | `123456` |
