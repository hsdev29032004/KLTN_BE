# API Thống Kê & Báo Cáo - Admin Dashboard

> **Base URL**: `/api/stat`  
> **Auth**: Tất cả API admin cần cookie `access_token` (httpOnly) với role `Admin`

---

## Mục lục

1. [Dashboard Overview](#1-dashboard-overview)
2. [Thống kê doanh thu](#2-thống-kê-doanh-thu)
3. [Doanh thu theo giảng viên](#3-doanh-thu-theo-giảng-viên)
4. [Doanh thu theo khóa học](#4-doanh-thu-theo-khóa-học)
5. [Thống kê người dùng](#5-thống-kê-người-dùng)
6. [Thống kê khóa học](#6-thống-kê-khóa-học)
7. [Giảng viên - Thống kê cá nhân](#7-giảng-viên---thống-kê-cá-nhân)

---

## 1. Dashboard Overview

> **Quyền**: `Admin`  
> Tổng quan hệ thống cho trang dashboard chính. Bao gồm overview, trends so sánh tháng này vs tháng trước, pending items, phân bố user/course.

```
GET /api/stat/dashboard
```

### Response `200 OK`

```json
{
  "message": "Lấy tổng quan dashboard thành công",
  "data": {
    "overview": {
      "totalUsers": 1250,
      "totalCourses": 85,
      "totalRevenue": 125000000,
      "totalTransactions": 340,
      "totalReviews": 520,
      "totalReports": 12
    },
    "trends": {
      "users": {
        "thisMonth": 45,
        "lastMonth": 38,
        "growth": 18
      },
      "revenue": {
        "thisMonth": 15200000,
        "lastMonth": 12800000,
        "growth": 19
      },
      "courses": {
        "thisMonth": 8,
        "lastMonth": 5,
        "growth": 60
      }
    },
    "pending": {
      "approvals": 3,
      "reports": 2,
      "withdrawals": 5
    },
    "distributions": {
      "usersByRole": [
        { "role": "Admin", "count": 2 },
        { "role": "Teacher", "count": 48 },
        { "role": "User", "count": 1200 }
      ],
      "coursesByStatus": [
        { "status": "published", "count": 60 },
        { "status": "draft", "count": 15 },
        { "status": "pending", "count": 5 },
        { "status": "rejected", "count": 3 },
        { "status": "need_update", "count": 2 }
      ]
    }
  }
}
```

### Gợi ý hiển thị Frontend

| Section                         | Component gợi ý                                                       |
| ------------------------------- | --------------------------------------------------------------------- |
| `overview`                      | 6 stat cards (icon + số + label)                                      |
| `trends`                        | Mỗi trend hiển thị arrow up/down + % growth. Xanh nếu > 0, đỏ nếu < 0 |
| `pending`                       | Badge đỏ trên sidebar hoặc notification bell                          |
| `distributions.usersByRole`     | Pie chart / Doughnut chart                                            |
| `distributions.coursesByStatus` | Bar chart / Stacked bar                                               |

---

## 2. Thống kê doanh thu

> **Quyền**: `Admin`  
> Doanh thu chi tiết với bộ filter đầy đủ + dữ liệu chart theo thời gian.

```
GET /api/stat/revenue
```

### Query Parameters

| Param       | Type   | Mặc định    | Mô tả                                      |
| ----------- | ------ | ----------- | ------------------------------------------ |
| `teacherId` | string | —           | Lọc theo giảng viên                        |
| `courseId`  | string | —           | Lọc theo khóa học cụ thể                   |
| `studentId` | string | —           | Lọc theo học viên (người mua)              |
| `fromDate`  | string | —           | Ngày bắt đầu (ISO 8601), vd: `2026-01-01`  |
| `toDate`    | string | —           | Ngày kết thúc (ISO 8601)                   |
| `groupBy`   | string | `month`     | Nhóm chart: `day`, `week`, `month`, `year` |
| `page`      | string | `"1"`       | Trang                                      |
| `limit`     | string | `"20"`      | Bản ghi / trang (tối đa 100)               |
| `sortBy`    | string | `createdAt` | Sắp xếp: `createdAt`, `price`              |
| `order`     | string | `desc`      | `asc` hoặc `desc`                          |

### Response `200 OK`

```json
{
  "message": "Lấy thống kê doanh thu thành công",
  "data": {
    "summary": {
      "totalRevenue": 125000000,
      "totalTransactions": 850,
      "avgTransactionValue": 147059
    },
    "chart": [
      {
        "period": "2026-01",
        "totalRevenue": 12800000,
        "platformRevenue": 2560000,
        "teacherRevenue": 10240000,
        "transactionCount": 95
      },
      {
        "period": "2026-02",
        "totalRevenue": 15200000,
        "platformRevenue": 3040000,
        "teacherRevenue": 12160000,
        "transactionCount": 112
      }
    ],
    "items": [
      {
        "id": "uuid",
        "price": 299000,
        "commissionRate": 20,
        "platformEarnings": 59800,
        "teacherEarnings": 239200,
        "status": "purchased",
        "createdAt": "2026-03-15T10:30:00.000Z",
        "courses": {
          "id": "uuid",
          "name": "NestJS Mastery",
          "slug": "nestjs-mastery",
          "thumbnail": "https://...",
          "user": {
            "id": "uuid",
            "fullName": "Nguyễn Giảng Viên",
            "avatar": "..."
          }
        },
        "invoices": {
          "id": "uuid",
          "users": {
            "id": "uuid",
            "fullName": "Trần Học Viên",
            "email": "hv@example.com"
          }
        }
      }
    ],
    "meta": {
      "total": 850,
      "page": 1,
      "limit": 20,
      "totalPages": 43
    }
  }
}
```

### Gợi ý hiển thị Frontend

| Section   | Component gợi ý                                                                           |
| --------- | ----------------------------------------------------------------------------------------- |
| `summary` | 3 stat cards hàng ngang                                                                   |
| `chart`   | Line chart hoặc Area chart (totalRevenue, platformRevenue, teacherRevenue trên cùng trục) |
| `items`   | Bảng phân trang với filter bar ở trên                                                     |

### Ví dụ gọi API

```
GET /api/stat/revenue?teacherId=abc&fromDate=2026-01-01&toDate=2026-03-31&groupBy=month&page=1&limit=10
GET /api/stat/revenue?courseId=xyz&groupBy=day
GET /api/stat/revenue?studentId=def&sortBy=price&order=desc
```

---

## 3. Doanh thu theo giảng viên

> **Quyền**: `Admin`  
> Xếp hạng giảng viên theo tổng doanh thu → hiển thị bảng top teachers.

```
GET /api/stat/revenue/by-teacher
```

### Query Parameters

| Param      | Type   | Mặc định | Mô tả                         |
| ---------- | ------ | -------- | ----------------------------- |
| `fromDate` | string | —        | Ngày bắt đầu (ISO 8601)       |
| `toDate`   | string | —        | Ngày kết thúc (ISO 8601)      |
| `limit`    | string | `"10"`   | Số giảng viên top (tối đa 50) |

### Response `200 OK`

```json
{
  "message": "Lấy doanh thu theo giảng viên thành công",
  "data": [
    {
      "teacher": {
        "id": "uuid",
        "fullName": "Nguyễn Văn A",
        "email": "a@example.com",
        "avatar": "https://..."
      },
      "totalRevenue": 45000000,
      "teacherEarnings": 36000000,
      "count": 125
    },
    {
      "teacher": {
        "id": "uuid",
        "fullName": "Trần Văn B",
        "email": "b@example.com",
        "avatar": "https://..."
      },
      "totalRevenue": 32000000,
      "teacherEarnings": 25600000,
      "count": 98
    }
  ]
}
```

### Gợi ý Frontend

- Bar chart ngang hoặc bảng xếp hạng
- Hiển thị avatar + tên + doanh thu + số giao dịch

---

## 4. Doanh thu theo khóa học

> **Quyền**: `Admin`  
> Xếp hạng khóa học theo doanh thu → top selling courses.

```
GET /api/stat/revenue/by-course
```

### Query Parameters

| Param       | Type   | Mặc định | Mô tả                       |
| ----------- | ------ | -------- | --------------------------- |
| `fromDate`  | string | —        | Ngày bắt đầu (ISO 8601)     |
| `toDate`    | string | —        | Ngày kết thúc (ISO 8601)    |
| `teacherId` | string | —        | Lọc theo giảng viên         |
| `limit`     | string | `"10"`   | Số khóa học top (tối đa 50) |

### Response `200 OK`

```json
{
  "message": "Lấy doanh thu theo khóa học thành công",
  "data": [
    {
      "course": {
        "id": "uuid",
        "name": "NestJS Mastery",
        "slug": "nestjs-mastery",
        "thumbnail": "https://...",
        "price": 299000,
        "star": 4.8,
        "studentCount": 150,
        "user": { "id": "uuid", "fullName": "Nguyễn Giảng Viên" }
      },
      "totalRevenue": 44850000,
      "platformRevenue": 8970000,
      "count": 150
    }
  ]
}
```

### Gợi ý Frontend

- Bảng với thumbnail khóa học + tên + giảng viên + doanh thu
- Hoặc bar chart top N khóa học

---

## 5. Thống kê người dùng

> **Quyền**: `Admin`  
> Thống kê tăng trưởng người dùng, phân bố role, top buyers.

```
GET /api/stat/users
```

### Query Parameters

| Param      | Type   | Mặc định | Mô tả                                      |
| ---------- | ------ | -------- | ------------------------------------------ |
| `fromDate` | string | —        | Ngày bắt đầu (ISO 8601)                    |
| `toDate`   | string | —        | Ngày kết thúc (ISO 8601)                   |
| `groupBy`  | string | `month`  | Nhóm chart: `day`, `week`, `month`, `year` |
| `roleName` | string | —        | Lọc theo role: `Admin`, `Teacher`, `User`  |

### Response `200 OK`

```json
{
  "message": "Lấy thống kê người dùng thành công",
  "data": {
    "summary": {
      "totalUsers": 1250,
      "bannedUsers": 5,
      "deletedUsers": 12
    },
    "roleDistribution": [
      { "role": "Admin", "count": 2 },
      { "role": "Teacher", "count": 48 },
      { "role": "User", "count": 1200 }
    ],
    "chart": [
      {
        "period": "2026-01",
        "newUsers": 85,
        "cumulativeTotal": 1050
      },
      {
        "period": "2026-02",
        "newUsers": 95,
        "cumulativeTotal": 1145
      },
      {
        "period": "2026-03",
        "newUsers": 105,
        "cumulativeTotal": 1250
      }
    ],
    "topBuyers": [
      {
        "id": "uuid",
        "fullName": "Trần Học Viên",
        "email": "hv@example.com",
        "avatar": "https://...",
        "createdAt": "2025-06-01T00:00:00.000Z",
        "_count": { "userCourses": 12, "invoices": 8 }
      }
    ]
  }
}
```

### Gợi ý Frontend

| Section            | Component                                                |
| ------------------ | -------------------------------------------------------- |
| `summary`          | 3 stat cards                                             |
| `roleDistribution` | Doughnut / Pie chart                                     |
| `chart`            | Dual axis chart: bar (newUsers) + line (cumulativeTotal) |
| `topBuyers`        | Bảng xếp hạng với avatar                                 |

---

## 6. Thống kê khóa học

> **Quyền**: `Admin`  
> Thống kê khóa học, phân bố trạng thái, top courses theo nhiều tiêu chí.

```
GET /api/stat/courses
```

### Query Parameters

| Param       | Type   | Mặc định       | Mô tả                                                 |
| ----------- | ------ | -------------- | ----------------------------------------------------- |
| `fromDate`  | string | —              | Ngày bắt đầu (ISO 8601)                               |
| `toDate`    | string | —              | Ngày kết thúc (ISO 8601)                              |
| `status`    | string | —              | Filter theo trạng thái: `published`, `pending`, ...   |
| `teacherId` | string | —              | Filter theo giảng viên                                |
| `groupBy`   | string | `month`        | Nhóm chart: `day`, `week`, `month`, `year`            |
| `sortBy`    | string | `studentCount` | Top courses sort: `studentCount`, `star`, `createdAt` |
| `order`     | string | `desc`         | `asc` hoặc `desc`                                     |
| `topN`      | string | `"10"`         | Giới hạn top N (tối đa 50)                            |

### Response `200 OK`

```json
{
  "message": "Lấy thống kê khóa học thành công",
  "data": {
    "summary": {
      "totalCourses": 85,
      "publishedCourses": 60,
      "pendingCourses": 5
    },
    "statusDistribution": [
      { "status": "published", "count": 60 },
      { "status": "draft", "count": 15 },
      { "status": "pending", "count": 5 },
      { "status": "rejected", "count": 3 },
      { "status": "need_update", "count": 2 }
    ],
    "chart": [
      { "period": "2026-01", "newCourses": 8 },
      { "period": "2026-02", "newCourses": 12 },
      { "period": "2026-03", "newCourses": 10 }
    ],
    "topCourses": [
      {
        "id": "uuid",
        "name": "NestJS Mastery",
        "slug": "nestjs-mastery",
        "thumbnail": "https://...",
        "price": 299000,
        "star": 4.8,
        "status": "published",
        "studentCount": 150,
        "createdAt": "2026-01-15T00:00:00.000Z",
        "user": { "id": "uuid", "fullName": "Nguyễn GV", "avatar": "..." },
        "_count": { "userCourses": 150, "reviews": 42, "lessons": 25 }
      }
    ],
    "topByRevenue": [
      {
        "course": {
          "id": "uuid",
          "name": "NestJS Mastery",
          "slug": "nestjs-mastery",
          "thumbnail": "...",
          "price": 299000,
          "star": 4.8,
          "studentCount": 150,
          "user": { "id": "uuid", "fullName": "Nguyễn GV" }
        },
        "totalRevenue": 44850000,
        "totalSales": 150
      }
    ]
  }
}
```

### Gợi ý Frontend

| Section              | Component                                  |
| -------------------- | ------------------------------------------ |
| `summary`            | 3 stat cards                               |
| `statusDistribution` | Horizontal bar chart hoặc pie chart        |
| `chart`              | Bar chart (newCourses theo thời gian)      |
| `topCourses`         | Bảng xếp hạng (theo studentCount mặc định) |
| `topByRevenue`       | Bảng xếp hạng riêng theo doanh thu         |

---

## 7. Giảng viên - Thống kê cá nhân

> **Quyền**: Đã đăng nhập (giảng viên xem thống kê của mình)

```
GET /api/stat/lecturer
```

### Response `200 OK`

```json
{
  "message": "Lấy thống kê giảng viên thành công",
  "data": {
    "overview": {
      "totalCourses": 5,
      "totalStudents": 320,
      "totalReviews": 85,
      "avgRating": 4.6,
      "totalRevenue": 45000000
    },
    "courses": [
      {
        "id": "uuid",
        "name": "NestJS Mastery",
        "price": 299000,
        "status": "published",
        "star": 4.8,
        "studentCount": 150,
        "createdAt": "2026-01-15T00:00:00.000Z",
        "_count": { "userCourses": 150, "reviews": 42, "lessons": 25 }
      }
    ],
    "revenueChart": [
      {
        "period": "2026-01",
        "totalRevenue": 12800000,
        "teacherRevenue": 10240000,
        "transactionCount": 42
      },
      {
        "period": "2026-02",
        "totalRevenue": 15200000,
        "teacherRevenue": 12160000,
        "transactionCount": 51
      }
    ],
    "invoiceDetails": [
      {
        "id": "uuid",
        "price": 299000,
        "commissionRate": 20,
        "status": "purchased",
        "createdAt": "2026-02-10T10:30:00.000Z",
        "courses": {
          "id": "uuid",
          "name": "NestJS Mastery",
          "slug": "nestjs-mastery"
        }
      }
    ]
  }
}
```

---

## Tổng kết API

| #   | Method | Route                       | Quyền | Mô tả                             |
| --- | ------ | --------------------------- | ----- | --------------------------------- |
| 1   | `GET`  | `/stat/dashboard`           | Admin | Dashboard overview + trends       |
| 2   | `GET`  | `/stat/revenue`             | Admin | Doanh thu chi tiết + chart        |
| 3   | `GET`  | `/stat/revenue/by-teacher`  | Admin | Top giảng viên theo doanh thu     |
| 4   | `GET`  | `/stat/revenue/by-course`   | Admin | Top khóa học theo doanh thu       |
| 5   | `GET`  | `/stat/users`               | Admin | Thống kê + tăng trưởng người dùng |
| 6   | `GET`  | `/stat/courses`             | Admin | Thống kê + phân bố khóa học       |
| 7   | `GET`  | `/stat/lecturer`            | Auth  | Thống kê cá nhân giảng viên       |
| 8   | `GET`  | `/stat/admin`               | Admin | Legacy overview (tương thích cũ)  |
| 9   | `GET`  | `/stat/course/:id/students` | Auth  | Danh sách học viên khóa học       |

---

## Ghi chú cho Frontend

### 1. Cách dùng `groupBy`

Truyền `groupBy=day|week|month|year` để thay đổi độ chi tiết của dữ liệu chart:

- **`day`**: Mỗi điểm dữ liệu = 1 ngày → dùng khi lọc khoảng ngắn (< 1 tháng)
- **`week`**: Mỗi điểm = 1 tuần → dùng khi lọc 1-3 tháng
- **`month`**: Mỗi điểm = 1 tháng → dùng khi lọc 3-12 tháng (mặc định)
- **`year`**: Mỗi điểm = 1 năm → dùng khi xem toàn bộ lịch sử

### 2. Doanh thu

- `totalRevenue` = Tổng tiền học viên trả
- `platformRevenue` = Phần hệ thống giữ (= totalRevenue × commissionRate / 100)
- `teacherRevenue` = Phần giảng viên nhận (= totalRevenue - platformRevenue)

### 3. Trends growth

- `growth` là phần trăm (%), dương = tăng, âm = giảm, 0 = không đổi
- Dùng màu xanh cho growth > 0, đỏ cho < 0, xám cho = 0

### 4. Date filter

- Luôn dùng format ISO 8601: `2026-01-01` hoặc `2026-01-01T00:00:00.000Z`
- Nếu không truyền `fromDate`/`toDate` = lấy tất cả (all time)

### 5. Flow gợi ý trang Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  GET /stat/dashboard  →  overview cards + trends + pending │
├──────────────────────────────────────────────────────────┤
│  GET /stat/revenue?groupBy=month  →  biểu đồ doanh thu    │
├──────────────────────────────────────────────────────────┤
│  GET /stat/users?groupBy=month  →  biểu đồ tăng trưởng    │
├──────────────────────────────────────────────────────────┤
│  GET /stat/revenue/by-teacher?limit=5  →  top giảng viên   │
│  GET /stat/revenue/by-course?limit=5   →  top khóa học     │
└──────────────────────────────────────────────────────────┘
```

Frontend nên gọi song song (Promise.all) 5 API trên khi load trang dashboard để giảm thời gian chờ.

### 6. Cookie Auth

Gửi request với `withCredentials: true` (axios) hoặc `credentials: 'include'` (fetch).
