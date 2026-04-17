# Flow 04: Giỏ hàng & Mua khóa học (Cart & Purchase)

## Tổng quan
Student thêm khóa học vào giỏ → Checkout → Thanh toán qua VNPay → Nhận quyền truy cập.  
Hệ thống tạo Invoice + DetailInvoices, sau đó VNPay callback xử lý kết quả.

---

## 1. Luồng tổng thể (End-to-End)

```mermaid
flowchart TD
    A[Student xem khóa học] --> B[Thêm vào giỏ hàng]
    B --> C[Xem giỏ hàng]
    C --> D[Chọn khóa học cần mua]
    D --> E[Checkout: POST /api/course/purchased]
    E --> F[Tạo Invoice + DetailInvoices: status=pending]
    F --> G[Sinh VNPay payment URL]
    G --> H[Redirect user đến VNPay]
    H --> I{User thanh toán}
    I -->|Thành công| J[VNPay callback → handlePaymentSuccess]
    I -->|Thất bại/Hủy| K[VNPay callback → handlePaymentFailed]
    
    J --> L[Invoice.status = purchased]
    L --> M[Tạo UserCourse cho mỗi khóa]
    M --> N[studentCount += 1]
    N --> O[Thêm student vào Conversation]
    O --> P[Xóa CartItem đã mua]
    P --> Q[Redirect FE: ?status=success]
    
    K --> R[Invoice.status = failed]
    R --> S[Redirect FE: ?status=fail]

    style A fill:#e1f5fe
    style Q fill:#c8e6c9
    style S fill:#ffcdd2
```

---

## 2. Thêm vào giỏ hàng (Add to Cart)

```mermaid
flowchart TD
    A[Student gửi POST /api/cart] --> B{Course tồn tại + published?}
    B -->|Không| B1[404 Khóa học không tồn tại]
    B -->|Có| C{Là khóa học của chính mình?}
    C -->|Có| C1[400 Không thể thêm khóa học của mình]
    C -->|Không| D{Đã mua khóa học này?}
    D -->|Có| D1[400 Đã mua khóa học này]
    D -->|Không| E{Đã có trong giỏ?}
    E -->|Có| E1[400 Đã có trong giỏ hàng]
    E -->|Không| F[Tạo CartItem]
    F --> G[Trả về success]

    style A fill:#e1f5fe
    style G fill:#c8e6c9
    style B1 fill:#ffcdd2
    style C1 fill:#ffcdd2
    style D1 fill:#ffcdd2
    style E1 fill:#ffcdd2
```

### Database Changes
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `cart_items` | INSERT | userId, courseId |

---

## 3. Xem giỏ hàng (Get Cart)

```mermaid
flowchart TD
    A[Student gửi GET /api/cart] --> B[Lấy CartItems của user]
    B --> C[Filter: course.isDeleted=false AND status ∈ published/update/need_update]
    C --> D[Tính tổng giá]
    D --> E[Trả về items + totalPrice]

    style A fill:#e1f5fe
    style E fill:#c8e6c9
```

### Response
```json
{
  "data": [
    {
      "id": "cart-item-id",
      "course": {
        "id": "course-id",
        "name": "Khóa React",
        "thumbnail": "...",
        "price": 500000,
        "star": "4.5",
        "user": { "id": "teacher-id", "fullName": "Nguyễn Văn A" }
      }
    }
  ],
  "totalPrice": 500000
}
```

---

## 4. Xóa khỏi giỏ hàng (Remove from Cart)

```mermaid
flowchart TD
    A[Student gửi DELETE /api/cart] --> B{CartItem tồn tại + thuộc user?}
    B -->|Không| B1[404 Không tìm thấy]
    B -->|Có| C[Xóa CartItem]
    C --> D[Trả về success]

    style A fill:#e1f5fe
    style D fill:#c8e6c9
    style B1 fill:#ffcdd2
```

---

## 5. Checkout - Tạo hóa đơn + VNPay URL

```mermaid
flowchart TD
    A[Student gửi POST /api/course/purchased\nBody: courseIds array] --> B{Validate courseIds}
    B -->|Rỗng| B1[400 Danh sách rỗng]
    B -->|OK| C{Có khóa đã mua?}
    C -->|Có| C1[400 Tồn tại khóa học đã mua]
    C -->|Không| D{Tất cả courses tồn tại?}
    D -->|Không| D1[404 Có khóa học không tồn tại]
    D -->|Có| E[Tính tổng giá]
    
    E --> F{total = 0? - tất cả miễn phí}
    F -->|Có| G[Tạo Invoice status=purchased ngay]
    F -->|Không| H[Tạo Invoice status=pending]
    
    G --> G1[handlePaymentSuccess → cấp quyền]
    G1 --> G2[Trả về message thành công]
    
    H --> I[Lấy system.comissionRate]
    I --> J[Tạo DetailInvoices cho mỗi course\ncommissionRate = snapshot từ system]
    J --> K[Khởi tạo VNPay]
    K --> L[Sinh payment URL: amount, orderId, returnUrl]
    L --> M[Trả về paymentUrl cho FE redirect]

    style A fill:#e1f5fe
    style G2 fill:#c8e6c9
    style M fill:#c8e6c9
    style B1 fill:#ffcdd2
    style C1 fill:#ffcdd2
    style D1 fill:#ffcdd2
```

### Database Changes (Transaction)
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `invoices` | INSERT | userId, amount=total, status=pending, vnpayTxnRef |
| `detail_invoices` | INSERT (per course) | coursePurchaseId, courseId, price, commissionRate, status=pending |

---

## 6. VNPay Callback - Thanh toán thành công

```mermaid
flowchart TD
    A[VNPay redirect: GET /api/payment/vnpay-return] --> B{vnp_ResponseCode = 00?}
    B -->|Không| C[handlePaymentFailed]
    B -->|Có| D[Parse invoiceId từ vnp_OrderInfo]
    D --> E[handlePaymentSuccess - Transaction]
    
    E --> F[Invoice.status → purchased]
    F --> G[Tất cả DetailInvoices.status → purchased]
    G --> H["Loop qua mỗi course:"]
    
    H --> I[Tạo UserCourse: userId, courseId]
    I --> J[Course.studentCount += 1]
    J --> K{Course có Conversation?}
    K -->|Có| L[Thêm ConversationMember: userId, isHost=false]
    K -->|Không| M[Bỏ qua]
    L --> N[Tiếp tục course tiếp theo]
    M --> N
    
    N --> O[Xóa CartItem đã mua]
    O --> P[Commit transaction]
    P --> Q[Redirect FE: /payment?status=success&amount=...]

    style A fill:#fff3e0
    style Q fill:#c8e6c9
```

### Database Changes (Transaction)
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `invoices` | UPDATE | status=purchased |
| `detail_invoices` | UPDATE (batch) | status=purchased |
| `user_courses` | INSERT (per course) | userId, courseId |
| `courses` | UPDATE (per course) | studentCount += 1 |
| `conversation_members` | INSERT (per course) | conversationId, userId, isHost=false |
| `cart_items` | DELETE | userId + courseIds đã mua |

---

## 7. VNPay Callback - Thanh toán thất bại

```mermaid
flowchart TD
    A[VNPay callback: responseCode ≠ 00] --> B[Parse invoiceId từ vnp_OrderInfo]
    B --> C[Invoice.status → failed]
    C --> D[Tất cả DetailInvoices.status → failed]
    D --> E[Redirect FE: /payment?status=fail]

    style A fill:#fff3e0
    style E fill:#ffcdd2
```

---

## 8. Sơ đồ trạng thái Invoice

```mermaid
stateDiagram-v2
    [*] --> pending: Checkout tạo invoice
    pending --> purchased: VNPay thành công ✅
    pending --> failed: VNPay thất bại ❌
    purchased --> refund_requested: Student yêu cầu hoàn tiền
    refund_requested --> refunded: Admin duyệt hoàn tiền
    refund_requested --> purchased: Admin từ chối hoàn tiền
```

---

## Tổng hợp API

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| POST | `/api/cart` | User | Thêm vào giỏ hàng |
| GET | `/api/cart` | User | Xem giỏ hàng |
| DELETE | `/api/cart` | User | Xóa khỏi giỏ hàng |
| POST | `/api/course/purchased` | User | Checkout + tạo VNPay URL |
| GET | `/api/payment/vnpay-return` | Public | VNPay callback (tự động) |
