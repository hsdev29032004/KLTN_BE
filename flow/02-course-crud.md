# Flow 02: Quản lý Khóa học (Course CRUD)

## Tổng quan
Teacher tạo khóa học ở trạng thái `draft`, thêm bài học và tài liệu, sau đó gửi duyệt cho Admin.  
Mỗi khóa học có: lessons → lesson_materials (video, pdf, img, link, other).

---

## 1. Tạo khóa học (Create Course)

```mermaid
flowchart TD
    A[Teacher gửi POST /api/course] --> B{Validate DTO}
    B -->|Lỗi| B1[400 Bad Request]
    B -->|OK| C[Sinh slug từ name + timestamp]
    C --> D[Tạo Course: status=draft, star=0.0, studentCount=0]
    D --> E{Có topicIds?}
    E -->|Có| F[Tạo CourseTopic records]
    E -->|Không| G[Trả về course mới]
    F --> G

    style A fill:#e1f5fe
    style G fill:#c8e6c9
    style B1 fill:#ffcdd2
```

### Database Changes
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `courses` | INSERT | name, price, thumbnail, content, description, slug, userId, status=draft, star=0.0 |
| `course_topics` | INSERT (multiple) | courseId, topicId |

---

## 2. Thêm bài học (Create Lesson)

```mermaid
flowchart TD
    A[Teacher gửi POST /api/course/:courseId/lesson] --> B{Course thuộc teacher này?}
    B -->|Không| B1[403 Forbidden]
    B -->|Có| C{Course.status cho phép sửa?}
    C -->|Không - published chưa submit| C1[400 Khóa học đang published]
    C -->|OK - draft/rejected/update/need_update| D[Tạo Lesson: status=draft]
    D --> E[Trả về lesson mới]

    style A fill:#e1f5fe
    style E fill:#c8e6c9
    style B1 fill:#ffcdd2
    style C1 fill:#ffcdd2
```

### Database Changes
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `lessons` | INSERT | courseId, name, status=draft |

---

## 3. Thêm tài liệu bài học (Create Lesson Material)

```mermaid
flowchart TD
    A[Teacher gửi POST /api/course/lesson/:lessonId/material] --> B{Lesson → Course thuộc teacher?}
    B -->|Không| B1[403 Forbidden]
    B -->|Có| C[Tạo LessonMaterial: status=draft]
    C --> D{type = video?}
    D -->|Có| E[URL = video URL]
    D -->|Không| F[URL = file URL]
    E --> G[Trả về material mới]
    F --> G

    style A fill:#e1f5fe
    style G fill:#c8e6c9
    style B1 fill:#ffcdd2
```

### Database Changes
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `lesson_materials` | INSERT | lessonId, type, name, url, status=draft, isPreview |

---

## 4. Cập nhật khóa học (Update Course)

```mermaid
flowchart TD
    A[Teacher gửi PUT /api/course/:courseId] --> B{Course thuộc teacher?}
    B -->|Không| B1[403 Forbidden]
    B -->|Có| C{Course.isDeleted?}
    C -->|Có| C1[404 Not Found]
    C -->|Không| D[Update các trường đuợc gửi]
    D --> E{name thay đổi?}
    E -->|Có| F[Sinh slug mới từ name + timestamp]
    E -->|Không| G[Giữ slug cũ]
    F --> H[Lưu vào DB]
    G --> H
    H --> I[Trả về course updated]

    style A fill:#e1f5fe
    style I fill:#c8e6c9
    style B1 fill:#ffcdd2
    style C1 fill:#ffcdd2
```

### Các trường có thể cập nhật (KHÔNG cần duyệt lại)
- `name`, `price`, `description`, `thumbnail`, `content`

---

## 5. Cập nhật tài liệu bài học (Update Lesson Material)

```mermaid
flowchart TD
    A[Teacher gửi PUT /api/course/material/:materialId] --> B{Material → Course thuộc teacher?}
    B -->|Không| B1[403 Forbidden]
    B -->|Có| C{Material.status = draft?}
    C -->|Có - draft| D[Update trực tiếp]
    C -->|Không - published| E[Đánh dấu material cũ = outdated]
    E --> F[Tạo material mới: status=draft, copy dữ liệu + override]
    D --> G[Trả về material updated]
    F --> G

    style A fill:#e1f5fe
    style G fill:#c8e6c9
    style B1 fill:#ffcdd2
```

### Logic quan trọng: Published Material → Outdated + New Draft
```
Material (published) → status = outdated
     ↓
Material (draft) ← bản mới với nội dung cập nhật
```

### Database Changes
| Bảng | Hành động | Điều kiện | Dữ liệu |
|------|-----------|-----------|----------|
| `lesson_materials` | UPDATE | status=draft | Cập nhật trực tiếp |
| `lesson_materials` | UPDATE | status=published | status → outdated |
| `lesson_materials` | INSERT | status=published | Bản mới: status=draft |

---

## 6. Xóa khóa học (Delete Course)

```mermaid
flowchart TD
    A[Teacher gửi DELETE /api/course/:courseId] --> B{Course thuộc teacher?}
    B -->|Không| B1[403 Forbidden]
    B -->|Có| C[Soft delete course]
    C --> D[course.isDeleted = true]
    D --> E[course.deletedAt = now]
    E --> F[course.status = deleted]
    F --> G[Trả về success]

    style A fill:#e1f5fe
    style G fill:#c8e6c9
    style B1 fill:#ffcdd2
```

---

## 7. Xóa bài học (Delete Lesson)

```mermaid
flowchart TD
    A[Teacher gửi DELETE /api/course/lesson/:lessonId] --> B{Lesson → Course thuộc teacher?}
    B -->|Không| B1[403 Forbidden]
    B -->|Có| C{Lesson.status = draft?}
    C -->|Có| D[Hard delete lesson + materials]
    C -->|Không - published| E[Lesson.status = outdated]
    D --> F[Trả về success]
    E --> F

    style A fill:#e1f5fe
    style F fill:#c8e6c9
    style B1 fill:#ffcdd2
```

---

## 8. Xóa tài liệu bài học (Delete Lesson Material)

```mermaid
flowchart TD
    A[Teacher gửi DELETE /api/course/material/:materialId] --> B{Material → Course thuộc teacher?}
    B -->|Không| B1[403 Forbidden]
    B -->|Có| C{Material.status = draft?}
    C -->|Có| D[Hard delete material]
    C -->|Không - published| E[Material.status = outdated]
    D --> F[Trả về success]
    E --> F

    style A fill:#e1f5fe
    style F fill:#c8e6c9
    style B1 fill:#ffcdd2
```

---

## 9. Xem danh sách khóa học (theo vai trò)

```mermaid
flowchart TD
    A{Ai đang xem?} --> B[Guest / Public]
    A --> C[Student đã mua]
    A --> D[Teacher chủ sở hữu]
    A --> E[Admin]

    B --> B1[Chỉ thấy published/update/need_update]
    B1 --> B2[Chỉ thấy lessons published + materials published + isPreview]
    
    C --> C1[Thấy published courses đã mua]
    C1 --> C2[Thấy tất cả published lessons + materials]
    C2 --> C3{Bị chặn bởi exam gate?}
    C3 -->|Có| C4[Không xem được material sau exam chưa pass]
    C3 -->|Không| C5[Xem bình thường]
    
    D --> D1[Thấy tất cả courses của mình]
    D1 --> D2[Thấy cả draft + published + outdated]
    
    E --> E1[Thấy tất cả courses trong hệ thống]
    E1 --> E2[Filter theo status, userId, pagination]

    style B1 fill:#e1f5fe
    style C5 fill:#c8e6c9
    style D2 fill:#fff9c4
    style E2 fill:#f3e5f5
```

---

## Tổng hợp trạng thái

```mermaid
stateDiagram-v2
    [*] --> draft: Teacher tạo mới
    draft --> pending: Submit for review
    pending --> published: Admin duyệt
    pending --> rejected: Admin từ chối
    rejected --> pending: Teacher sửa + submit lại
    published --> update: Teacher sửa nội dung + submit
    update --> published: Admin duyệt bản cập nhật
    update --> need_update: Admin từ chối bản cập nhật
    need_update --> update: Teacher sửa lại + submit
    published --> deleted: Teacher xóa
```

---

## Tổng hợp API

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| POST | `/api/course` | Teacher | Tạo khóa học |
| PUT | `/api/course/:courseId` | Teacher | Cập nhật khóa học |
| DELETE | `/api/course/:courseId` | Teacher | Xóa khóa học |
| POST | `/api/course/:courseId/lesson` | Teacher | Tạo bài học |
| PUT | `/api/course/lesson/:lessonId` | Teacher | Cập nhật bài học |
| DELETE | `/api/course/lesson/:lessonId` | Teacher | Xóa bài học |
| POST | `/api/course/lesson/:lessonId/material` | Teacher | Thêm tài liệu |
| PUT | `/api/course/material/:materialId` | Teacher | Cập nhật tài liệu |
| DELETE | `/api/course/material/:materialId` | Teacher | Xóa tài liệu |
| GET | `/api/course` | Public | Danh sách khóa học |
| GET | `/api/course/:key` | Public | Chi tiết khóa học |
| GET | `/api/course/user/:userId` | Public | Khóa học của giảng viên |
| GET | `/api/course/purchased` | User | Khóa học đã mua |
| GET | `/api/course/admin/all` | Admin | Tất cả khóa học + filter |
