# QT-1: NẠP TIỀN

## Mục Lục
- [Mô Tả Tổng Quan](#mô-tả-tổng-quan)
- [Vai Trò Tham Gia](#vai-trò-tham-gia)
- [Luồng Nghiệp Vụ](#luồng-nghiệp-vụ)
- [Flowchart](#flowchart)
- [Sequence Diagram](#sequence-diagram)
- [Data Model](#data-model)
- [API Documentation](#api-documentation)
- [Business Rules](#business-rules)
- [Error Handling](#error-handling)

---

## Mô Tả Tổng Quan

### Mục Đích
Cho phép người dùng nạp tiền vào ví hệ thống để có thể mua khóa học. Hệ thống sử dụng phương thức chuyển khoản ngân hàng với QR Code và tự động xác minh giao dịch.

### Tính Năng Chính
- Tạo đơn nạp tiền với mã giao dịch unique
- Sinh QR code tự động
- Tự động xác minh giao dịch qua webhook ngân hàng
- Timeout 15 phút tự động hủy đơn
- Cập nhật số dư real-time

### Đặc Điểm Kỹ Thuật
- **Phương thức thanh toán**: Chuyển khoản ngân hàng
- **Thời gian timeout**: 15 phút
- **Xác minh**: Tự động qua webhook
- **Trạng thái**: PENDING → SUCCESS/CANCELLED

---

## Vai Trò Tham Gia

### 1. User (Người Dùng)
**Trách nhiệm:**
- Tạo đơn nạp tiền
- Nhập số tiền cần nạp
- Thực hiện chuyển khoản theo thông tin hệ thống cung cấp
- Chờ hệ thống xác nhận

**Quyền hạn:**
- Xem lịch sử nạp tiền
- Hủy đơn nạp (trước khi chuyển khoản)
- Xem trạng thái đơn nạp

### 2. System (Hệ Thống)
**Trách nhiệm:**
- Tạo mã giao dịch unique
- Sinh QR code và thông tin chuyển khoản
- Lắng nghe webhook từ ngân hàng
- Xác minh nội dung chuyển khoản
- Cộng tiền vào ví user
- Tự động hủy đơn quá hạn

### 3. Banking API (Ngân Hàng)
**Trách nhiệm:**
- Nhận giao dịch chuyển khoản
- Gửi webhook notification về hệ thống
- Cung cấp thông tin giao dịch

---

## Luồng Nghiệp Vụ

### Bước 1: Tạo Đơn Nạp Tiền
1. User truy cập trang "Nạp tiền"
2. Nhập số tiền cần nạp (tối thiểu 10,000 VNĐ)
3. Click "Tạo đơn nạp tiền"

### Bước 2: Hệ Thống Xử Lý
1. Validate số tiền (min: 10,000 - max: 50,000,000 VNĐ)
2. Tạo mã đơn nạp unique: `DEP{timestamp}{random6digits}`
3. Lưu bản ghi với status `PENDING`
4. Sinh QR code chứa:
   - Số tài khoản ngân hàng hệ thống
   - Số tiền
   - Nội dung: Mã đơn nạp
5. Set timeout 15 phút

### Bước 3: User Chuyển Khoản
1. Quét QR code hoặc nhập thủ công:
   - Số tài khoản: `1234567890`
   - Số tiền: Theo đơn
   - Nội dung: **CHÍNH XÁC** mã đơn nạp
2. Xác nhận chuyển khoản trên app ngân hàng

### Bước 4: Webhook Xác Minh
1. Ngân hàng gửi webhook về hệ thống
2. Hệ thống nhận payload:
   ```json
   {
     "transactionId": "TXN123456",
     "amount": 100000,
     "content": "DEP20251209123456ABC123",
     "timestamp": "2025-12-09T10:30:00Z"
   }
   ```
3. Parse và verify:
   - Tìm đơn nạp theo content
   - So sánh số tiền
   - Kiểm tra trạng thái đơn

### Bước 5: Cập Nhật Kết Quả
**Nếu khớp:**
- Cộng tiền: `User.balance += amount`
- Cập nhật: `DepositOrder.status = SUCCESS`
- Lưu `completedAt` timestamp
- Gửi notification thành công

**Nếu không khớp:**
- Giữ nguyên status `PENDING`
- Admin xử lý thủ công

**Nếu quá 15 phút:**
- Auto update: `DepositOrder.status = CANCELLED`
- Gửi notification hủy đơn

---

## Flowchart

```mermaid
flowchart TD
    Start([User muốn nạp tiền]) --> Input[Nhập số tiền cần nạp]
    Input --> Validate{Số tiền hợp lệ?<br/>10K - 50M VNĐ}
    
    Validate -->|Không| Error1[Hiển thị lỗi:<br/>Số tiền không hợp lệ]
    Error1 --> Input
    
    Validate -->|Có| CreateOrder[Tạo đơn nạp tiền<br/>Mã: DEP{timestamp}{random}]
    CreateOrder --> GenQR[Sinh QR Code + STK + Nội dung]
    GenQR --> SaveDB[(Lưu DB: Status = PENDING<br/>ExpiredAt = Now + 15min)]
    
    SaveDB --> Display[Hiển thị cho User:<br/>- QR Code<br/>- STK: 1234567890<br/>- Số tiền<br/>- Nội dung CK]
    
    Display --> Timeout[Bắt đầu đếm ngược 15 phút]
    Display --> UserAction{User thực hiện?}
    
    UserAction -->|Chuyển khoản| BankTransfer[User CK trên app ngân hàng]
    BankTransfer --> BankProcess[Ngân hàng xử lý giao dịch]
    BankProcess --> Webhook[Gửi Webhook về hệ thống]
    
    Webhook --> ReceiveWebhook[System nhận webhook]
    ReceiveWebhook --> ParseData[Parse dữ liệu:<br/>- TransactionId<br/>- Amount<br/>- Content]
    
    ParseData --> FindOrder{Tìm đơn nạp<br/>theo Content}
    FindOrder -->|Không tìm thấy| LogError[Log lỗi + Báo admin]
    
    FindOrder -->|Tìm thấy| CheckAmount{Amount<br/>khớp?}
    CheckAmount -->|Không| ManualCheck[Đơn pending<br/>Admin xử lý thủ công]
    
    CheckAmount -->|Khớp| CheckStatus{Status<br/>= PENDING?}
    CheckStatus -->|Không| Duplicate[Giao dịch trùng<br/>Bỏ qua]
    
    CheckStatus -->|Có| UpdateBalance[Cộng tiền:<br/>User.balance += amount]
    UpdateBalance --> UpdateOrder[Update đơn:<br/>Status = SUCCESS<br/>CompletedAt = Now]
    UpdateOrder --> Notify1[Gửi notification<br/>thành công]
    Notify1 --> End1([Kết thúc - Thành công])
    
    Timeout --> CheckTimeout{15 phút<br/>đã qua?}
    CheckTimeout -->|Chưa| Timeout
    CheckTimeout -->|Rồi| CheckCompleted{Đơn đã<br/>SUCCESS?}
    
    CheckCompleted -->|Rồi| End1
    CheckCompleted -->|Chưa| AutoCancel[Auto update:<br/>Status = CANCELLED]
    AutoCancel --> Notify2[Gửi notification<br/>đơn đã hủy]
    Notify2 --> End2([Kết thúc - Đã hủy])
    
    UserAction -->|Không làm gì| CheckTimeout

    style Start fill:#90EE90
    style End1 fill:#90EE90
    style End2 fill:#FFB6C1
    style Error1 fill:#FFB6C1
    style UpdateBalance fill:#87CEEB
    style AutoCancel fill:#FFA500
```

---

## Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend API
    participant DB as Database
    participant QR as QR Service
    participant Bank as Banking API
    participant Cron as Cron Job
    participant Notif as Notification Service

    Note over U,Notif: PHASE 1: TẠO ĐơN NẠP TIỀN
    
    U->>FE: 1. Click "Nạp tiền"
    FE->>U: 2. Hiển thị form nhập số tiền
    U->>FE: 3. Nhập số tiền (VD: 100,000 VNĐ)
    FE->>FE: 4. Validate input (10K-50M)
    
    FE->>BE: 5. POST /api/deposit/create<br/>{amount: 100000}
    activate BE
    
    BE->>BE: 6. Generate unique code<br/>DEP20251209103045ABC123
    BE->>DB: 7. INSERT DepositOrder<br/>(status: PENDING, expiredAt: now+15min)
    activate DB
    DB-->>BE: 8. Order created (id: dep_001)
    deactivate DB
    
    BE->>QR: 9. Generate QR Code<br/>(accountNumber, amount, content)
    activate QR
    QR-->>BE: 10. QR image URL
    deactivate QR
    
    BE-->>FE: 11. Response:<br/>{orderId, qrCode, bankInfo, expiredAt}
    deactivate BE
    
    FE->>U: 12. Hiển thị:<br/>- QR Code<br/>- STK: 1234567890<br/>- Số tiền: 100,000<br/>- Nội dung: DEP20251209103045ABC123<br/>- Countdown: 15:00
    
    Note over U,Notif: PHASE 2: USER CHUYỂN KHOẢN
    
    U->>U: 13. Mở app ngân hàng
    U->>Bank: 14. Quét QR / Nhập thông tin CK
    activate Bank
    Bank->>Bank: 15. Xử lý giao dịch
    Bank-->>U: 16. Chuyển khoản thành công
    
    Note over U,Notif: PHASE 3: WEBHOOK XÁC MINH
    
    Bank->>BE: 17. POST /webhook/banking<br/>{txnId, amount, content, timestamp}
    deactivate Bank
    activate BE
    
    BE->>BE: 18. Verify webhook signature
    BE->>DB: 19. SELECT DepositOrder<br/>WHERE transactionContent = 'DEP...'
    activate DB
    DB-->>BE: 20. Found order (dep_001)
    deactivate DB
    
    BE->>BE: 21. Validate:<br/>- Amount matches?<br/>- Status = PENDING?<br/>- Not expired?
    
    alt Validation Success
        BE->>DB: 22. BEGIN TRANSACTION
        activate DB
        
        BE->>DB: 23. UPDATE Users<br/>SET balance = balance + 100000<br/>WHERE id = user_001
        
        BE->>DB: 24. UPDATE DepositOrders<br/>SET status='SUCCESS', completedAt=NOW()<br/>WHERE id = dep_001
        
        BE->>DB: 25. INSERT TransactionLog<br/>(type: DEPOSIT, amount, userId)
        
        BE->>DB: 26. COMMIT
        DB-->>BE: 27. Transaction committed
        deactivate DB
        
        BE->>Notif: 28. Send notification<br/>"Nạp tiền thành công +100,000 VNĐ"
        activate Notif
        Notif->>U: 29. Push notification
        deactivate Notif
        
        BE-->>Bank: 30. 200 OK
        deactivate BE
        
        FE->>BE: 31. GET /api/deposit/dep_001/status (polling)
        activate BE
        BE->>DB: 32. SELECT status FROM DepositOrders
        activate DB
        DB-->>BE: 33. status = SUCCESS
        deactivate DB
        BE-->>FE: 34. {status: SUCCESS, newBalance: 100000}
        deactivate BE
        
        FE->>U: 35. ✅ Hiển thị thành công!<br/>Số dư mới: 100,000 VNĐ
        
    else Validation Failed
        BE->>DB: 36. UPDATE status = PENDING_MANUAL_CHECK
        BE->>Notif: 37. Alert admin
        BE-->>Bank: 38. 200 OK (acknowledged)
    end
    
    Note over U,Notif: PHASE 4: AUTO CANCEL (nếu quá 15 phút)
    
    loop Every 1 minute
        Cron->>DB: 39. SELECT * FROM DepositOrders<br/>WHERE status='PENDING'<br/>AND expiredAt < NOW()
        activate DB
        DB-->>Cron: 40. List of expired orders
        deactivate DB
        
        alt Has expired orders
            Cron->>DB: 41. UPDATE DepositOrders<br/>SET status='CANCELLED'<br/>WHERE id IN (...)
            
            Cron->>Notif: 42. Send notification<br/>"Đơn nạp tiền đã hủy do quá thời gian"
            Notif->>U: 43. Push notification
        end
    end
    
    U->>FE: 44. Refresh page
    FE->>BE: 45. GET /api/deposit/dep_001/status
    BE->>DB: 46. SELECT status
    DB-->>BE: 47. status = CANCELLED
    BE-->>FE: 48. {status: CANCELLED}
    FE->>U: 49. ⚠️ Đơn đã hủy, vui lòng tạo đơn mới
```

---

## Data Model

### ERD Diagram

```mermaid
erDiagram
    USERS ||--o{ DEPOSIT_ORDERS : creates
    DEPOSIT_ORDERS ||--o| TRANSACTION_LOGS : records
    
    USERS {
        varchar(50) id PK
        varchar(255) email UK
        varchar(255) password
        varchar(255) fullName
        enum role
        decimal(15,2) balance
        varchar(50) bankAccount UK
        varchar(100) bankName
        timestamp createdAt
        timestamp updatedAt
    }
    
    DEPOSIT_ORDERS {
        varchar(50) id PK
        varchar(50) userId FK
        decimal(15,2) amount
        enum status
        varchar(100) transactionContent UK
        varchar(500) qrCodeUrl
        varchar(50) bankAccountNumber
        varchar(100) bankName
        varchar(50) bankTransactionId
        timestamp expiredAt
        timestamp completedAt
        timestamp createdAt
    }
    
    TRANSACTION_LOGS {
        varchar(50) id PK
        varchar(50) userId FK
        varchar(50) orderId FK
        enum transactionType
        decimal(15,2) amount
        decimal(15,2) balanceBefore
        decimal(15,2) balanceAfter
        text description
        timestamp createdAt
    }
```

### Database Schema

#### 1. DepositOrders Table

```sql
CREATE TABLE DepositOrders (
    -- Primary Key
    id VARCHAR(50) PRIMARY KEY COMMENT 'Unique ID: dep_{uuid}',
    
    -- Foreign Keys
    userId VARCHAR(50) NOT NULL COMMENT 'User ID thực hiện nạp',
    
    -- Transaction Info
    transactionContent VARCHAR(100) NOT NULL UNIQUE COMMENT 'Mã giao dịch: DEP{timestamp}{random}',
    amount DECIMAL(15,2) NOT NULL COMMENT 'Số tiền nạp (VNĐ)',
    
    -- Status
    status ENUM(
        'PENDING',              -- Chờ thanh toán
        'SUCCESS',              -- Thành công
        'CANCELLED',            -- Đã hủy (timeout)
        'FAILED',               -- Thất bại
        'PENDING_MANUAL_CHECK'  -- Chờ kiểm tra thủ công
    ) NOT NULL DEFAULT 'PENDING',
    
    -- Bank Info
    bankAccountNumber VARCHAR(50) NOT NULL COMMENT 'STK ngân hàng hệ thống',
    bankName VARCHAR(100) NOT NULL COMMENT 'Tên ngân hàng',
    bankTransactionId VARCHAR(50) NULL COMMENT 'Mã giao dịch từ ngân hàng',
    
    -- QR Code
    qrCodeUrl VARCHAR(500) NULL COMMENT 'URL QR code',
    
    -- Timestamps
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời gian tạo đơn',
    expiredAt TIMESTAMP NOT NULL COMMENT 'Thời gian hết hạn (createdAt + 15min)',
    completedAt TIMESTAMP NULL COMMENT 'Thời gian hoàn thành',
    
    -- Indexes
    INDEX idx_userId (userId),
    INDEX idx_status (status),
    INDEX idx_expiredAt (expiredAt),
    INDEX idx_transactionContent (transactionContent),
    
    -- Foreign Key Constraints
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
    
    -- Constraints
    CHECK (amount >= 10000 AND amount <= 50000000),
    CHECK (expiredAt > createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Đơn nạp tiền';
```

#### 2. TransactionLogs Table

```sql
CREATE TABLE TransactionLogs (
    -- Primary Key
    id VARCHAR(50) PRIMARY KEY COMMENT 'Unique ID: txn_{uuid}',
    
    -- Foreign Keys
    userId VARCHAR(50) NOT NULL COMMENT 'User ID',
    orderId VARCHAR(50) NULL COMMENT 'Order ID (DepositOrder, WithdrawOrder, etc.)',
    
    -- Transaction Details
    transactionType ENUM(
        'DEPOSIT',          -- Nạp tiền
        'WITHDRAW',         -- Rút tiền
        'PURCHASE_COURSE',  -- Mua khóa học
        'REFUND',           -- Hoàn tiền
        'COMMISSION'        -- Hoa hồng
    ) NOT NULL,
    
    amount DECIMAL(15,2) NOT NULL COMMENT 'Số tiền giao dịch',
    balanceBefore DECIMAL(15,2) NOT NULL COMMENT 'Số dư trước giao dịch',
    balanceAfter DECIMAL(15,2) NOT NULL COMMENT 'Số dư sau giao dịch',
    
    -- Description
    description TEXT NULL COMMENT 'Mô tả giao dịch',
    metadata JSON NULL COMMENT 'Dữ liệu bổ sung (JSON)',
    
    -- Timestamp
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời gian giao dịch',
    
    -- Indexes
    INDEX idx_userId (userId),
    INDEX idx_orderId (orderId),
    INDEX idx_transactionType (transactionType),
    INDEX idx_createdAt (createdAt),
    
    -- Foreign Key Constraints
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Lịch sử giao dịch';
```

#### 3. Users Table (Related Fields)

```sql
-- Chỉ các trường liên quan đến nạp tiền
ALTER TABLE Users ADD COLUMN balance DECIMAL(15,2) DEFAULT 0 COMMENT 'Số dư ví (VNĐ)';
ALTER TABLE Users ADD COLUMN bankAccount VARCHAR(50) UNIQUE NULL COMMENT 'Số tài khoản ngân hàng';
ALTER TABLE Users ADD COLUMN bankName VARCHAR(100) NULL COMMENT 'Tên ngân hàng';
ALTER TABLE Users ADD COLUMN accountHolderName VARCHAR(100) NULL COMMENT 'Tên chủ tài khoản';

-- Index cho balance
CREATE INDEX idx_balance ON Users(balance);
```

### Sample Data

```sql
-- User
INSERT INTO Users (id, email, fullName, role, balance) VALUES
('user_001', 'nguyen.van.a@email.com', 'Nguyễn Văn A', 'USER', 0);

-- Deposit Order (PENDING)
INSERT INTO DepositOrders (
    id, userId, transactionContent, amount, status,
    bankAccountNumber, bankName, qrCodeUrl, expiredAt
) VALUES (
    'dep_001',
    'user_001',
    'DEP20251209103045ABC123',
    100000,
    'PENDING',
    '1234567890',
    'Vietcombank',
    'https://cdn.example.com/qr/dep_001.png',
    DATE_ADD(NOW(), INTERVAL 15 MINUTE)
);

-- Deposit Order (SUCCESS)
INSERT INTO DepositOrders (
    id, userId, transactionContent, amount, status,
    bankAccountNumber, bankName, bankTransactionId, completedAt, expiredAt
) VALUES (
    'dep_002',
    'user_001',
    'DEP20251209093022XYZ456',
    500000,
    'SUCCESS',
    '1234567890',
    'Vietcombank',
    'VCB20251209001234',
    NOW(),
    DATE_ADD(NOW(), INTERVAL 15 MINUTE)
);

-- Transaction Log
INSERT INTO TransactionLogs (
    id, userId, orderId, transactionType,
    amount, balanceBefore, balanceAfter, description
) VALUES (
    'txn_001',
    'user_001',
    'dep_002',
    'DEPOSIT',
    500000,
    0,
    500000,
    'Nạp tiền vào ví qua chuyển khoản ngân hàng'
);
```

---

## API Documentation

### 1. Create Deposit Order

**Endpoint:** `POST /api/deposit/create`

**Description:** Tạo đơn nạp tiền mới

**Authentication:** Required (Bearer Token)

**Request:**

```http
POST /api/deposit/create HTTP/1.1
Host: api.onlearn.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "amount": 100000
}
```

**Request Body Schema:**

```json
{
  "amount": {
    "type": "number",
    "required": true,
    "min": 10000,
    "max": 50000000,
    "description": "Số tiền nạp (VNĐ)"
  }
}
```

**Response Success (201):**

```json
{
  "success": true,
  "message": "Đơn nạp tiền đã được tạo thành công",
  "data": {
    "orderId": "dep_001",
    "transactionContent": "DEP20251209103045ABC123",
    "amount": 100000,
    "status": "PENDING",
    "bankInfo": {
      "accountNumber": "1234567890",
      "bankName": "Vietcombank",
      "accountHolderName": "CONG TY ONLEARN"
    },
    "qrCodeUrl": "https://cdn.onlearn.com/qr/dep_001.png",
    "createdAt": "2025-12-09T10:30:45Z",
    "expiredAt": "2025-12-09T10:45:45Z",
    "remainingSeconds": 900
  }
}
```

**Response Error (400):**

```json
{
  "success": false,
  "message": "Số tiền không hợp lệ",
  "errors": {
    "amount": "Số tiền phải từ 10,000 đến 50,000,000 VNĐ"
  }
}
```

**cURL Example:**

```bash
curl -X POST https://api.onlearn.com/api/deposit/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 100000
  }'
```

---

### 2. Get Deposit Order Status

**Endpoint:** `GET /api/deposit/:orderId`

**Description:** Lấy thông tin và trạng thái đơn nạp tiền

**Authentication:** Required

**Request:**

```http
GET /api/deposit/dep_001 HTTP/1.1
Host: api.onlearn.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "orderId": "dep_001",
    "transactionContent": "DEP20251209103045ABC123",
    "amount": 100000,
    "status": "SUCCESS",
    "bankInfo": {
      "accountNumber": "1234567890",
      "bankName": "Vietcombank"
    },
    "qrCodeUrl": "https://cdn.onlearn.com/qr/dep_001.png",
    "createdAt": "2025-12-09T10:30:45Z",
    "expiredAt": "2025-12-09T10:45:45Z",
    "completedAt": "2025-12-09T10:32:15Z",
    "bankTransactionId": "VCB20251209001234"
  }
}
```

**Response Error (404):**

```json
{
  "success": false,
  "message": "Không tìm thấy đơn nạp tiền"
}
```

---

### 3. Get Deposit History

**Endpoint:** `GET /api/deposit/history`

**Description:** Lấy lịch sử nạp tiền của user

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Trang hiện tại |
| limit | number | No | 20 | Số record mỗi trang |
| status | string | No | all | Lọc theo trạng thái |
| fromDate | string | No | - | Từ ngày (ISO 8601) |
| toDate | string | No | - | Đến ngày (ISO 8601) |

**Request:**

```http
GET /api/deposit/history?page=1&limit=10&status=SUCCESS HTTP/1.1
Host: api.onlearn.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "orderId": "dep_002",
        "amount": 500000,
        "status": "SUCCESS",
        "createdAt": "2025-12-09T09:30:22Z",
        "completedAt": "2025-12-09T09:32:10Z"
      },
      {
        "orderId": "dep_001",
        "amount": 100000,
        "status": "SUCCESS",
        "createdAt": "2025-12-09T10:30:45Z",
        "completedAt": "2025-12-09T10:32:15Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalRecords": 2,
      "limit": 10
    }
  }
}
```

---

### 4. Banking Webhook

**Endpoint:** `POST /webhook/banking`

**Description:** Nhận notification từ ngân hàng khi có giao dịch

**Authentication:** Webhook Signature Verification

**Request:**

```http
POST /webhook/banking HTTP/1.1
Host: api.onlearn.com
Content-Type: application/json
X-Webhook-Signature: sha256=abc123def456...

{
  "bankCode": "VCB",
  "transactionId": "VCB20251209001234",
  "amount": 100000,
  "content": "DEP20251209103045ABC123",
  "accountNumber": "1234567890",
  "timestamp": "2025-12-09T10:32:15Z",
  "status": "SUCCESS"
}
```

**Process Flow:**
1. Verify webhook signature
2. Parse transaction content
3. Find deposit order
4. Validate amount and status
5. Update user balance
6. Update order status
7. Send notification to user
8. Return 200 OK

**Response Success (200):**

```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

---

### 5. Cancel Deposit Order

**Endpoint:** `PUT /api/deposit/:orderId/cancel`

**Description:** Hủy đơn nạp tiền (chỉ khi status = PENDING)

**Authentication:** Required

**Request:**

```http
PUT /api/deposit/dep_001/cancel HTTP/1.1
Host: api.onlearn.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Đơn nạp tiền đã được hủy"
}
```

**Response Error (400):**

```json
{
  "success": false,
  "message": "Không thể hủy đơn đã hoàn thành hoặc đã hủy"
}
```

---

## Business Rules

### 1. Số Tiền Nạp
- **Tối thiểu:** 10,000 VNĐ
- **Tối đa:** 50,000,000 VNĐ/lần
- **Không giới hạn:** Số lần nạp tiền/ngày

### 2. Thời Gian Timeout
- **Thời hạn:** 15 phút kể từ khi tạo đơn
- **Auto Cancel:** Hệ thống tự động hủy đơn PENDING quá 15 phút
- **Grace Period:** Không có thời gian gia hạn

### 3. Nội Dung Chuyển Khoản
- **Format:** `DEP{timestamp}{random6digits}`
- **Example:** `DEP20251209103045ABC123`
- **Case Sensitive:** Phải khớp chính xác 100%
- **Unique:** Mỗi đơn có mã riêng biệt

### 4. Xác Minh Giao Dịch
- **Tự động:** Qua webhook từ ngân hàng
- **Thủ công:** Admin xử lý nếu không khớp tự động
- **Điều kiện khớp:**
  - Nội dung chuyển khoản chính xác
  - Số tiền chính xác
  - Đơn chưa hết hạn
  - Status = PENDING

### 5. Bảo Mật
- **Webhook Verification:** Kiểm tra signature
- **Rate Limiting:** Tối đa 10 đơn/user/giờ
- **Fraud Detection:** Cảnh báo nếu có hành vi bất thường

---

## Error Handling

### Error Codes

| Code | Message | Description | HTTP Status |
|------|---------|-------------|-------------|
| DEPOSIT_001 | Invalid amount | Số tiền không hợp lệ | 400 |
| DEPOSIT_002 | Order not found | Không tìm thấy đơn nạp | 404 |
| DEPOSIT_003 | Order expired | Đơn đã hết hạn | 400 |
| DEPOSIT_004 | Order already completed | Đơn đã hoàn thành | 400 |
| DEPOSIT_005 | Cannot cancel completed order | Không thể hủy đơn đã hoàn thành | 400 |
| DEPOSIT_006 | Webhook verification failed | Xác thực webhook thất bại | 401 |
| DEPOSIT_007 | Rate limit exceeded | Vượt quá giới hạn tạo đơn | 429 |
| DEPOSIT_008 | Insufficient data | Thiếu dữ liệu bắt buộc | 400 |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "DEPOSIT_001",
    "message": "Số tiền không hợp lệ",
    "details": "Số tiền phải từ 10,000 đến 50,000,000 VNĐ",
    "field": "amount"
  },
  "timestamp": "2025-12-09T10:30:45Z"
}
```

---

## Implementation Notes

### 1. QR Code Generation
```javascript
const QRCode = require('qrcode');

async function generateDepositQR(orderData) {
  const qrContent = {
    bankCode: 'VCB',
    accountNumber: '1234567890',
    amount: orderData.amount,
    content: orderData.transactionContent,
    accountName: 'CONG TY ONLEARN'
  };
  
  const qrString = JSON.stringify(qrContent);
  const qrCodeUrl = await QRCode.toDataURL(qrString);
  
  return qrCodeUrl;
}
```

### 2. Webhook Signature Verification
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = 'sha256=' + hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### 3. Auto Cancel Cron Job
```javascript
// Chạy mỗi phút
cron.schedule('* * * * *', async () => {
  const expiredOrders = await DepositOrder.find({
    status: 'PENDING',
    expiredAt: { $lt: new Date() }
  });
  
  for (const order of expiredOrders) {
    await order.update({ status: 'CANCELLED' });
    await sendNotification(order.userId, 'Đơn nạp tiền đã hủy do quá thời gian');
  }
});
```

---

## Testing Scenarios

### Test Case 1: Nạp Tiền Thành Công
1. User tạo đơn nạp 100,000 VNĐ
2. Hệ thống trả về QR code và mã giao dịch
3. User chuyển khoản đúng thông tin
4. Webhook nhận được và xác minh thành công
5. Số dư user tăng lên 100,000 VNĐ
6. Đơn chuyển sang status SUCCESS

**Expected Result:** ✅ Pass

### Test Case 2: Timeout - Auto Cancel
1. User tạo đơn nạp 50,000 VNĐ
2. User không thực hiện chuyển khoản
3. Sau 15 phút, cron job chạy
4. Đơn tự động chuyển sang CANCELLED
5. User nhận notification

**Expected Result:** ✅ Pass

### Test Case 3: Nội Dung Chuyển Khoản Sai
1. User tạo đơn với mã: DEP20251209103045ABC123
2. User chuyển khoản với nội dung: DEP20251209103045ABC124 (sai 1 ký tự)
3. Webhook nhận được nhưng không tìm thấy đơn khớp
4. Đơn vẫn ở trạng thái PENDING
5. Admin nhận cảnh báo kiểm tra thủ công

**Expected Result:** ✅ Pass

### Test Case 4: Số Tiền Không Hợp Lệ
1. User nhập số tiền: 5,000 VNĐ (< min 10,000)
2. Frontend/Backend validate
3. Hiển thị lỗi: "Số tiền tối thiểu là 10,000 VNĐ"
4. Không tạo đơn

**Expected Result:** ✅ Pass

---

**Document Version:** 1.0  
**Last Updated:** December 9, 2025  
**Author:** OnLearn Technical Team
