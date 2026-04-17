# Flow 05: Đánh giá & Báo cáo Khóa học (Review & Report)

## Tổng quan
Student đã mua khóa học có thể đánh giá (1–5 sao + nội dung).  
Mỗi student chỉ đánh giá 1 lần/khóa. Điểm trung bình tự cập nhật.  
Mọi user có thể báo cáo khóa học vi phạm.

---

## 1. Tạo đánh giá (Create Review)

```mermaid
flowchart TD
    A[Student gửi POST /api/review] --> B{Đã mua khóa học?}
    B -->|Không| B1[403 Bạn chưa mua khóa học này]
    B -->|Có| C{Đã đánh giá khóa này?}
    C -->|Có| C1[400 Bạn đã đánh giá khóa học này]
    C -->|Không| D{rating hợp lệ? 1–5}
    D -->|Không| D1[400 Validation error]
    D -->|Có| E[Tạo CourseReview]
    E --> F[Tính lại trung bình sao]
    F --> G[Cập nhật Course.star]
    G --> H[Trả về review mới]

    style A fill:#e1f5fe
    style H fill:#c8e6c9
    style B1 fill:#ffcdd2
    style C1 fill:#ffcdd2
    style D1 fill:#ffcdd2
```

### Công thức tính sao
```
star = AVG(rating) của tất cả review có isDeleted=false
     = SUM(rating) / COUNT(reviews)
     → làm tròn 1 chữ số thập phân (Decimal(2,1))
```

### Database Changes (Transaction)
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `course_reviews` | INSERT | reviewerId, courseId, rating, content |
| `courses` | UPDATE | star = AVG(rating) |

---

## 2. Cập nhật đánh giá (Update Review)

```mermaid
flowchart TD
    A[Student gửi PUT /api/review/:reviewId] --> B{Review tồn tại + chưa xóa?}
    B -->|Không| B1[404 Not Found]
    B -->|Có| C{Review thuộc student này?}
    C -->|Không| C1[403 Forbidden]
    C -->|Có| D[Cập nhật rating và/hoặc content]
    D --> E[Tính lại AVG star]
    E --> F[Cập nhật Course.star]
    F --> G[Trả về review updated]

    style A fill:#e1f5fe
    style G fill:#c8e6c9
    style B1 fill:#ffcdd2
    style C1 fill:#ffcdd2
```

### Database Changes (Transaction)
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `course_reviews` | UPDATE | rating, content |
| `courses` | UPDATE | star = AVG(rating) |

---

## 3. Xóa đánh giá (Delete Review)

```mermaid
flowchart TD
    A[Student gửi DELETE /api/review/:reviewId] --> B{Review tồn tại + chưa xóa?}
    B -->|Không| B1[404 Not Found]
    B -->|Có| C{Review thuộc student này?}
    C -->|Không| C1[403 Forbidden]
    C -->|Có| D[Soft delete: isDeleted=true, deletedAt=now]
    D --> E[Tính lại AVG star - bỏ review đã xóa]
    E --> F{Còn review nào?}
    F -->|Có| G[Course.star = AVG mới]
    F -->|Không| H[Course.star = 0.0]
    G --> I[Trả về success]
    H --> I

    style A fill:#e1f5fe
    style I fill:#c8e6c9
    style B1 fill:#ffcdd2
    style C1 fill:#ffcdd2
```

---

## 4. Xem đánh giá khóa học (List Reviews)

```mermaid
flowchart TD
    A[GET /api/review/course/:courseId] --> B[Lấy reviews: isDeleted=false]
    B --> C[Include: reviewer.fullName, reviewer.avatar]
    C --> D[OrderBy: createdAt desc]
    D --> E[Trả về list reviews]

    style A fill:#e1f5fe
    style E fill:#c8e6c9
```

---

## 5. Luồng tính sao chi tiết

```mermaid
flowchart TD
    A[Thay đổi review\ncreate / update / delete] --> B[Query: AVG rating\nWHERE courseId AND isDeleted=false]
    B --> C{Có review nào?}
    C -->|Không| D[star = 0.0]
    C -->|Có| E[star = AVG result\nlàm tròn Decimal 2,1]
    D --> F[UPDATE courses SET star]
    E --> F

    style A fill:#fff3e0
    style F fill:#c8e6c9
```

### Ví dụ minh họa
```
Reviews: [5, 4, 5, 3, 4]
AVG = (5+4+5+3+4) / 5 = 4.2
Course.star = 4.2

Xóa review rating=3:
Reviews: [5, 4, 5, 4]
AVG = (5+4+5+4) / 4 = 4.5
Course.star = 4.5
```

---

## 6. Báo cáo khóa học (Report Course)

```mermaid
flowchart TD
    A[User gửi POST /api/review/report] --> B{Course tồn tại?}
    B -->|Không| B1[404 Not Found]
    B -->|Có| C[Tạo CourseReport: status=pending]
    C --> D[Trả về success]

    D --> E[Admin xem danh sách report]
    E --> F{Admin xử lý}
    F -->|Hợp lệ| G[Report.status → resolved\nXử lý khóa học vi phạm]
    F -->|Không hợp lệ| H[Report.status → dismissed]

    style A fill:#e1f5fe
    style D fill:#c8e6c9
    style G fill:#c8e6c9
    style H fill:#fff9c4
```

### Sơ đồ trạng thái Report

```mermaid
stateDiagram-v2
    [*] --> pending: User báo cáo
    pending --> resolved: Admin xác nhận vi phạm ✅
    pending --> dismissed: Admin bác báo cáo ❌
```

### Database Changes
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `course_reports` | INSERT | courseId, reporterId, reason, status=pending |
| `course_reports` | UPDATE (admin) | processorId, status=resolved/dismissed |

---

## Tổng hợp API

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| POST | `/api/review` | User (đã mua) | Tạo đánh giá |
| GET | `/api/review/course/:courseId` | Public | Xem đánh giá của khóa |
| GET | `/api/review/:reviewId` | Public | Chi tiết 1 đánh giá |
| PUT | `/api/review/:reviewId` | User (chủ review) | Sửa đánh giá |
| DELETE | `/api/review/:reviewId` | User (chủ review) | Xóa đánh giá |
| POST | `/api/review/report` | User | Báo cáo khóa học |
