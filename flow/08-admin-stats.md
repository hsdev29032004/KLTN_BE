# Flow 08: Quản trị hệ thống & Thống kê (Admin & Statistics)

## Tổng quan
Admin quản lý: cấu hình system, ngân hàng, user, xem thống kê doanh thu + tăng trưởng.

---

## 1. Cấu hình hệ thống (System Config)

```mermaid
flowchart TD
    A[Admin gửi GET /api/system] --> B[Trả về: comissionRate, term, contact, banks]
    
    C[Admin gửi PATCH /api/system] --> D[Cập nhật comissionRate / term / contact]
    D --> E[Trả về system updated]
    
    F[Ảnh hưởng]
    E --> F
    F --> G[comissionRate mới áp dụng cho\nhóa đơn tạo SAU thời điểm này]
    F --> H[Hóa đơn cũ giữ nguyên\ncommissionRate đã snapshot]

    style A fill:#e1f5fe
    style B fill:#c8e6c9
    style E fill:#c8e6c9
    style G fill:#fff9c4
    style H fill:#fff9c4
```

### Cơ chế Snapshot Commission Rate
```
Thời điểm T1: system.comissionRate = 10%
Student A mua → DetailInvoice.commissionRate = 10% (snapshot)

Thời điểm T2: Admin đổi comissionRate = 15%
Student B mua → DetailInvoice.commissionRate = 15% (snapshot)

→ Student A vẫn giữ 10%, Student B là 15%
```

---

## 2. Quản lý ngân hàng (Bank CRUD)

```mermaid
flowchart TD
    A[Admin gửi POST /api/system/bank] --> B[Tạo Bank: bankNumber, bankName, recipient]
    B --> C[Trả về bank mới]
    
    D[Admin gửi PUT /api/system/bank/:id] --> E[Cập nhật bank]
    E --> F[Trả về bank updated]
    
    G[Admin gửi DELETE /api/system/bank/:id] --> H[Soft delete: isDeleted=true]
    H --> I[Trả về success]

    style C fill:#c8e6c9
    style F fill:#c8e6c9
    style I fill:#c8e6c9
```

---

## 3. Quản lý người dùng (User Management)

```mermaid
flowchart TD
    A[Admin gửi GET /api/user/admin/all] --> B[Danh sách users + filter + phân trang]
    B --> C[Filter: search, roleId, isBanned, isDeleted, fromDate, toDate]
    C --> D[Sort: createdAt, fullName, email, availableAmount]
    D --> E[Trả về users + count courses/invoices]

    style A fill:#f3e5f5
    style E fill:#c8e6c9
```

### Cấm/Gỡ cấm người dùng

```mermaid
flowchart TD
    A[Admin gửi POST /api/user/admin/:userId/ban] --> B{User tồn tại?}
    B -->|Không| B1[404]
    B -->|Có| C[Set banId, timeBan=now, timeUnBan=expiry]
    C --> D[User bị cấm đăng nhập đến timeUnBan]
    
    E[Admin gửi POST /api/user/admin/:userId/unban] --> F[Clear banId, timeBan, timeUnBan]
    F --> G[User đăng nhập lại được ngay]

    style D fill:#ffcdd2
    style G fill:#c8e6c9
```

### Xóa/Khôi phục người dùng

```mermaid
flowchart TD
    A[Admin gửi DELETE /api/user/admin/:userId] --> B[Soft delete: isDeleted=true, deletedAt=now]
    B --> C[User không thể đăng nhập]
    
    D[Admin gửi POST /api/user/admin/:userId/restore] --> E[isDeleted=false, deletedAt=null]
    E --> F[User đăng nhập lại được]

    style C fill:#ffcdd2
    style F fill:#c8e6c9
```

---

## 4. Thống kê Dashboard

```mermaid
flowchart TD
    A[Admin gửi GET /api/stat/dashboard] --> B[Query tổng hợp]
    B --> C[Tổng doanh thu tháng này]
    B --> D[Tổng users mới tháng này]
    B --> E[Tổng khóa học mới]
    B --> F[Tổng giao dịch]
    C --> G[So sánh % với tháng trước]
    D --> G
    E --> G
    F --> G
    G --> H[Trả về overview + trends]

    style A fill:#f3e5f5
    style H fill:#c8e6c9
```

### Response Dashboard Overview
```json
{
  "data": {
    "revenue": { "current": 15000000, "previous": 12000000, "change": 25.0 },
    "users": { "current": 150, "previous": 120, "change": 25.0 },
    "courses": { "current": 20, "previous": 15, "change": 33.3 },
    "transactions": { "current": 200, "previous": 180, "change": 11.1 }
  }
}
```

---

## 5. Thống kê doanh thu chi tiết

```mermaid
flowchart TD
    A[GET /api/stat/revenue?groupBy=day&from=...&to=...] --> B[Query DetailInvoices]
    B --> C{groupBy?}
    C -->|day| D[Group by ngày]
    C -->|week| E[Group by tuần]
    C -->|month| F[Group by tháng]
    D --> G[Trả về chart data: labels + values]
    E --> G
    F --> G

    style A fill:#f3e5f5
    style G fill:#c8e6c9
```

---

## 6. Thống kê theo giảng viên / khóa học

```mermaid
flowchart TD
    subgraph Revenue by Teacher
        A1[GET /api/stat/revenue/teacher] --> A2[Top teachers by doanh thu]
        A2 --> A3["teacher, totalRevenue, courseCount, orderCount"]
    end
    
    subgraph Revenue by Course
        B1[GET /api/stat/revenue/course] --> B2[Top courses by doanh thu]
        B2 --> B3["course, totalRevenue, orderCount, avgPrice"]
    end
    
    subgraph User Stats
        C1[GET /api/stat/users] --> C2[Tăng trưởng users]
        C2 --> C3["roleDistribution, newUsersChart, growthRate"]
    end
    
    subgraph Course Stats
        D1[GET /api/stat/courses] --> D2[Thống kê khóa học]
        D2 --> D3["statusDistribution, topicDistribution, creationChart"]
    end
```

---

## 7. Thống kê giảng viên (Instructor Dashboard)

```mermaid
flowchart TD
    A[Teacher gửi GET /api/stat/instructor] --> B[Query courses + invoices của teacher]
    B --> C[Tổng doanh thu = SUM price × 1-commissionRate]
    B --> D[Tổng học viên]
    B --> E[Đánh giá trung bình]
    B --> F[Số khóa học]
    C --> G[Trả về instructor stats]
    D --> G
    E --> G
    F --> G

    style A fill:#e1f5fe
    style G fill:#c8e6c9
```

### Công thức doanh thu giảng viên
```
teacher_revenue = SUM(detail_invoice.price × (1 - detail_invoice.commissionRate / 100))
                  WHERE course.userId = teacherId
                  AND invoice.status = 'purchased'
```

---

## Tổng hợp API

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/api/system` | Public | Xem cấu hình hệ thống |
| PATCH | `/api/system` | Admin | Cập nhật cấu hình |
| POST | `/api/system/bank` | Admin | Thêm ngân hàng |
| PUT | `/api/system/bank/:id` | Admin | Sửa ngân hàng |
| DELETE | `/api/system/bank/:id` | Admin | Xóa ngân hàng |
| GET | `/api/user/admin/all` | Admin | Danh sách users |
| GET | `/api/user/admin/:userId` | Admin | Chi tiết user |
| PUT | `/api/user/admin/:userId` | Admin | Sửa user |
| POST | `/api/user/admin/:userId/ban` | Admin | Cấm user |
| POST | `/api/user/admin/:userId/unban` | Admin | Gỡ cấm |
| DELETE | `/api/user/admin/:userId` | Admin | Xóa user |
| POST | `/api/user/admin/:userId/restore` | Admin | Khôi phục user |
| GET | `/api/stat/dashboard` | Admin | Tổng quan dashboard |
| GET | `/api/stat/revenue` | Admin | Doanh thu chi tiết |
| GET | `/api/stat/revenue/teacher` | Admin | Doanh thu theo GV |
| GET | `/api/stat/revenue/course` | Admin | Doanh thu theo khóa |
| GET | `/api/stat/users` | Admin | Thống kê users |
| GET | `/api/stat/courses` | Admin | Thống kê khóa học |
| GET | `/api/stat/instructor` | Teacher | Thống kê giảng viên |
