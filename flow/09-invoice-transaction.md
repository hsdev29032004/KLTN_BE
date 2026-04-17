# Flow 09: Hóa đơn & Lịch sử giao dịch (Invoice & Transaction)

## Tổng quan
Sau khi mua khóa học, hệ thống tạo Invoice (hóa đơn tổng) + DetailInvoices (chi tiết từng khóa).  
Admin/Teacher xem doanh thu, User xem lịch sử mua.

---

## 1. Cấu trúc dữ liệu

```mermaid
erDiagram
    INVOICES ||--|{ DETAIL_INVOICES : "1 hóa đơn có nhiều chi tiết"
    INVOICES }|--|| USERS : "thuộc về user"
    DETAIL_INVOICES }|--|| COURSES : "liên kết khóa học"
    
    INVOICES {
        uuid id PK
        uuid userId FK
        int amount "Tổng tiền"
        enum status "pending/purchased/failed/refund_requested/refunded"
        string vnpayTxnRef "Mã giao dịch VNPay"
    }
    
    DETAIL_INVOICES {
        uuid id PK
        uuid coursePurchaseId FK
        uuid courseId FK
        int price "Giá khóa học tại thời điểm mua"
        decimal commissionRate "% hoa hồng snapshot"
        string status "pending/purchased/failed"
    }
```

---

## 2. User xem lịch sử mua (My Invoices)

```mermaid
flowchart TD
    A[User gửi GET /api/invoice/my] --> B[Query invoices WHERE userId=me]
    B --> C[Include: detail_invoices + course info]
    C --> D[OrderBy: createdAt desc]
    D --> E[Trả về danh sách hóa đơn]

    style A fill:#e1f5fe
    style E fill:#c8e6c9
```

### Response
```json
{
  "data": [
    {
      "id": "invoice-id",
      "amount": 799000,
      "status": "purchased",
      "vnpayTxnRef": "TXN123456",
      "createdAt": "2026-04-09T...",
      "detail_invoices": [
        {
          "courseId": "course-1",
          "price": 299000,
          "commissionRate": "10.00",
          "status": "purchased",
          "courses": {
            "name": "Khóa React",
            "thumbnail": "..."
          }
        },
        {
          "courseId": "course-2",
          "price": 500000,
          "commissionRate": "10.00",
          "status": "purchased",
          "courses": {
            "name": "Khóa Node.js",
            "thumbnail": "..."
          }
        }
      ]
    }
  ]
}
```

---

## 3. User xem chi tiết 1 hóa đơn

```mermaid
flowchart TD
    A[User gửi GET /api/invoice/my/:invoiceId] --> B{Invoice thuộc user?}
    B -->|Không| B1[403 Forbidden]
    B -->|Có| C[Lấy invoice + detail_invoices + courses]
    C --> D[Trả về chi tiết đầy đủ]

    style A fill:#e1f5fe
    style D fill:#c8e6c9
    style B1 fill:#ffcdd2
```

---

## 4. Admin/Teacher xem DetailInvoices (Doanh thu)

```mermaid
flowchart TD
    A[GET /api/invoice/detail] --> B{Role?}
    B -->|Admin| C[Xem TẤT CẢ detail invoices]
    B -->|Teacher| D[Chỉ xem detail của khóa mình sở hữu]
    
    C --> E[Filter: fromDate, toDate, status, courseId]
    D --> E
    E --> F[Sort: createdAt / price / status]
    F --> G[Phân trang: page, limit]
    G --> H[Trả về list + tổng doanh thu]

    style A fill:#f3e5f5
    style H fill:#c8e6c9
```

### Tính doanh thu Teacher
```
teacherEarning = price × (1 - commissionRate / 100)

Ví dụ:
  price = 500,000đ
  commissionRate = 10%
  teacherEarning = 500,000 × 0.9 = 450,000đ
  platformFee = 500,000 × 0.1 = 50,000đ
```

---

## 5. Luồng trạng thái Invoice đầy đủ

```mermaid
stateDiagram-v2
    [*] --> pending: Checkout tạo invoice

    pending --> purchased: VNPay callback thành công ✅
    pending --> failed: VNPay callback thất bại ❌

    purchased --> refund_requested: User yêu cầu hoàn tiền
    refund_requested --> refunded: Admin duyệt hoàn tiền ✅
    refund_requested --> purchased: Admin từ chối hoàn tiền ❌

    note right of purchased
        User nhận quyền truy cập khóa học
        Được thêm vào conversation
        CartItems bị xóa
    end note

    note right of refunded
        Xóa UserCourse
        studentCount -= 1
        Hoàn tiền cho user
    end note
```

---

## 6. Luồng giao dịch nạp/rút tiền (Transactions)

```mermaid
flowchart TD
    subgraph Nạp tiền - Deposit
        A1[User gửi POST /api/payment/create-payment-url] --> A2[Sinh VNPay payment URL]
        A2 --> A3[User thanh toán trên VNPay]
        A3 --> A4{Thành công?}
        A4 -->|Có| A5[Transaction.status = completed\nUser.availableAmount += amount]
        A4 -->|Không| A6[Transaction.status = failed]
    end
    
    subgraph Rút tiền - Withdrawal
        B1[User gửi POST /api/payment/withdraw] --> B2{availableAmount >= amount?}
        B2 -->|Không| B3[400 Số dư không đủ]
        B2 -->|Có| B4[Tạo Transaction: status=pending\nUser.availableAmount -= amount]
        B4 --> B5{Admin xử lý}
        B5 -->|Duyệt| B6[Transaction.status = approved\nChuyển tiền thủ công]
        B5 -->|Từ chối| B7[Transaction.status = rejected\nUser.availableAmount += amount - hoàn lại]
    end
```

### Sơ đồ trạng thái Transaction

```mermaid
stateDiagram-v2
    [*] --> pending: User tạo giao dịch

    state Deposit {
        pending --> completed: VNPay thành công
        pending --> failed: VNPay thất bại
    }

    state Withdrawal {
        pending --> approved: Admin duyệt
        pending --> rejected: Admin từ chối (hoàn tiền)
    }
```

---

## 7. Xem lịch sử giao dịch

```mermaid
flowchart TD
    A[User gửi GET /api/payment/transactions] --> B[Query transactions WHERE userId=me]
    B --> C[Filter: type, status, fromDate, toDate]
    C --> D[OrderBy: createdAt desc]
    D --> E[Phân trang]
    E --> F[Trả về transactions + meta]

    style A fill:#e1f5fe
    style F fill:#c8e6c9
```

---

## Tổng hợp API

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/api/invoice/my` | User | Lịch sử hóa đơn |
| GET | `/api/invoice/my/:invoiceId` | User | Chi tiết hóa đơn |
| GET | `/api/invoice/detail` | Admin/Teacher | Danh sách chi tiết hóa đơn |
| POST | `/api/payment/create-payment-url` | User | Tạo URL nạp tiền VNPay |
| GET | `/api/payment/vnpay-return` | Public | VNPay callback |
| GET | `/api/payment/transactions` | User | Lịch sử giao dịch |
