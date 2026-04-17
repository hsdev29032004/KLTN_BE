# Flow 03: Phê duyệt Khóa học (Course Approval)

## Tổng quan
Teacher gửi khóa học để Admin duyệt. Admin có thể duyệt (publish) hoặc từ chối (reject).  
Khóa học đã published khi cập nhật sẽ vào trạng thái `update`, không ảnh hưởng bản đang live.

---

## 1. Luồng tổng thể

```mermaid
flowchart TD
    A[Teacher tạo khóa học - draft] --> B[Thêm lessons + materials]
    B --> C[Teacher gửi duyệt - submit-review]
    C --> D{Admin xem xét}
    D -->|Duyệt| E[Publish: draft items → published]
    D -->|Từ chối| F[Reject + lý do]
    F --> G[Teacher sửa lại]
    G --> C
    
    E --> H[Khóa học live cho students]
    H --> I[Teacher muốn cập nhật?]
    I -->|Có| J[Sửa nội dung → Course status = update khi submit]
    J --> K{Admin xem xét bản cập nhật}
    K -->|Duyệt| L[Publish: outdated → deleted, draft → published]
    K -->|Từ chối| M[need_update + lý do]
    M --> N[Teacher sửa → submit lại]
    N --> K

    style A fill:#e1f5fe
    style E fill:#c8e6c9
    style L fill:#c8e6c9
    style F fill:#ffcdd2
    style M fill:#fff3e0
```

---

## 2. Submit for Review (Gửi duyệt)

```mermaid
flowchart TD
    A[Teacher gửi POST /api/course/:courseId/submit-review] --> B{Course thuộc teacher?}
    B -->|Không| B1[403 Forbidden]
    B -->|Có| C{Course.status?}
    
    C -->|draft / rejected| D[Course.status → pending]
    C -->|published / need_update| E{hasUnpublishedChanges?}
    E -->|Không có gì thay đổi| E1[400 Không có nội dung mới cần duyệt]
    E -->|Có thay đổi| F[Course.status → update]
    
    C -->|pending / update| C1[400 Đang chờ duyệt]
    C -->|deleted| C2[400 Khóa học đã bị xóa]
    
    D --> G[Tạo CourseApproval record: status=pending]
    F --> G
    G --> H[Trả về success]

    style A fill:#e1f5fe
    style H fill:#c8e6c9
    style B1 fill:#ffcdd2
    style E1 fill:#ffcdd2
    style C1 fill:#ffcdd2
    style C2 fill:#ffcdd2
```

### Kiểm tra hasUnpublishedChanges
```mermaid
flowchart LR
    A[hasUnpublishedChanges] --> B{Có lesson status=draft?}
    B -->|Có| YES[return true]
    B -->|Không| C{Có lesson status=outdated?}
    C -->|Có| YES
    C -->|Không| D{Có material status=draft?}
    D -->|Có| YES
    D -->|Không| E{Có material status=outdated?}
    E -->|Có| YES
    E -->|Không| F{Có exam status=draft?}
    F -->|Có| YES
    F -->|Không| NO[return false]

    style YES fill:#c8e6c9
    style NO fill:#ffcdd2
```

### Database Changes
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `courses` | UPDATE | status → pending hoặc update |
| `course_approvals` | INSERT | courseId, teacherId, description, status=pending |

---

## 3. Admin Publish (Duyệt khóa học)

```mermaid
flowchart TD
    A[Admin gửi POST /api/course/:courseId/publish] --> B{Course.status = pending hoặc update?}
    B -->|Không| B1[400 Không thể duyệt trạng thái này]
    B -->|Có| C[Transaction bắt đầu]
    
    C --> D[Course.status → published]
    D --> E[Course.publishedBy = adminId]
    E --> F[Course.publishedAt = now]
    
    F --> G[Tất cả Lesson.status=draft → published + publishedAt]
    G --> H[Tất cả Lesson.status=outdated → deleted]
    H --> I[Tất cả Material.status=draft → published + publishedAt]
    I --> J[Tất cả Material.status=outdated → deleted]
    J --> K[Tất cả Exam.status=draft → published + publishedAt]
    K --> L[Tất cả Exam.status=outdated → deleted]
    
    L --> M[CourseApproval.status → approved, adminId = admin]
    M --> N{Conversation tồn tại?}
    N -->|Chưa| O[Tạo Conversation cho khóa học]
    O --> P[Thêm teacher làm ConversationMember isHost=true]
    N -->|Rồi| Q[Bỏ qua]
    P --> R[Commit transaction]
    Q --> R
    R --> S[Trả về success]

    style A fill:#f3e5f5
    style S fill:#c8e6c9
    style B1 fill:#ffcdd2
```

### Quy trình chuyển trạng thái khi Publish

```mermaid
flowchart LR
    subgraph Trước khi Publish
        A1[Lesson: draft] 
        A2[Lesson: outdated]
        A3[Material: draft]
        A4[Material: outdated]
        A5[Exam: draft]
    end
    
    subgraph Sau khi Publish
        B1[Lesson: published ✓]
        B2[Lesson: deleted 🗑]
        B3[Material: published ✓]
        B4[Material: deleted 🗑]
        B5[Exam: published ✓]
    end
    
    A1 --> B1
    A2 --> B2
    A3 --> B3
    A4 --> B4
    A5 --> B5
```

### Database Changes (Transaction)
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `courses` | UPDATE | status=published, publishedBy, publishedAt |
| `lessons` | UPDATE (batch) | draft → published; outdated → deleted |
| `lesson_materials` | UPDATE (batch) | draft → published; outdated → deleted |
| `exams` | UPDATE (batch) | draft → published; outdated → deleted |
| `course_approvals` | UPDATE | status=approved, adminId |
| `conversations` | INSERT (nếu chưa có) | courseId, name |
| `conversation_members` | INSERT | conversationId, userId=teacher, isHost=true |

---

## 4. Admin Reject (Từ chối khóa học)

```mermaid
flowchart TD
    A[Admin gửi POST /api/course/:courseId/reject] --> B{Course.status?}
    B -->|pending| C[Course.status → rejected]
    B -->|update| D[Course.status → need_update]
    B -->|Khác| B1[400 Không thể từ chối trạng thái này]
    
    C --> E[CourseApproval.status → rejected]
    D --> E
    E --> F[CourseApproval.reason = lý do từ chối]
    F --> G[CourseApproval.adminId = admin]
    G --> H[Trả về success]

    style A fill:#f3e5f5
    style H fill:#c8e6c9
    style B1 fill:#ffcdd2
```

### Database Changes
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `courses` | UPDATE | status → rejected hoặc need_update |
| `course_approvals` | UPDATE | status=rejected, reason, adminId |

---

## 5. Sơ đồ trạng thái đầy đủ

```mermaid
stateDiagram-v2
    [*] --> draft: Teacher tạo

    draft --> pending: submit-review
    rejected --> pending: Teacher sửa + submit-review
    
    pending --> published: Admin publish ✅
    pending --> rejected: Admin reject ❌

    published --> update: Teacher sửa + submit-review
    need_update --> update: Teacher sửa + submit-review
    
    update --> published: Admin publish ✅ (bản cập nhật)
    update --> need_update: Admin reject ❌ (bản cập nhật)

    published --> deleted: Teacher xóa 🗑

    note right of published
        Bản live cho students
        Không bị ảnh hưởng khi
        teacher đang sửa (update)
    end note

    note right of need_update
        Bản live vẫn giữ nguyên
        Teacher cần sửa lại
        phần cập nhật
    end note
```

---

## Tổng hợp API

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| POST | `/api/course/:courseId/submit-review` | Teacher | Gửi duyệt |
| POST | `/api/course/:courseId/publish` | Admin | Duyệt khóa học |
| POST | `/api/course/:courseId/reject` | Admin | Từ chối + lý do |
| GET | `/api/course/admin/all?status=pending` | Admin | Danh sách chờ duyệt |
