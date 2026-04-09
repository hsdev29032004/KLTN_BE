# Flow 07: Hệ thống Đề thi (Exam System)

## Tổng quan
Teacher tạo đề thi cho khóa học với ngân hàng câu hỏi.  
Student làm bài → hệ thống random N câu → chấm điểm → pass/fail.  
**Exam Gate**: Student phải pass exam trước mới được xem bài học phía sau.

---

## 1. Luồng tổng thể

```mermaid
flowchart TD
    A[Teacher tạo Exam cho khóa học] --> B[Thêm ExamQuestions vào ngân hàng]
    B --> C[Submit review → Admin publish]
    C --> D[Exam published cùng khóa học]
    
    D --> E[Student mua khóa học]
    E --> F[Student xem nội dung]
    F --> G{Exam Gate: có exam trước bài này?}
    G -->|Có + chưa pass| H[❌ Bị chặn - phải pass exam]
    G -->|Không hoặc đã pass| I[✅ Xem nội dung]
    
    H --> J[Student bắt đầu làm bài]
    J --> K[Random N câu từ ngân hàng]
    K --> L[Student trả lời trong thời gian]
    L --> M[Nộp bài → chấm điểm]
    M --> N{Đạt ≥ passPercent?}
    N -->|Có| O[isPassed = true ✅]
    N -->|Không| P[isPassed = false\nLàm lại sau retryAfterDays ngày]

    style A fill:#e1f5fe
    style O fill:#c8e6c9
    style P fill:#ffcdd2
    style H fill:#ffcdd2
```

---

## 2. Teacher tạo đề thi (Create Exam)

```mermaid
flowchart TD
    A[Teacher gửi POST /api/exam] --> B{Course thuộc teacher?}
    B -->|Không| B1[403 Forbidden]
    B -->|Có| C[Tạo Exam: status=draft]
    C --> D[passPercent, retryAfterDays, questionCount, duration]
    D --> E[Trả về exam mới]

    style A fill:#e1f5fe
    style E fill:#c8e6c9
    style B1 fill:#ffcdd2
```

### Các trường Exam
| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `passPercent` | Int | % cần đạt để pass (vd: 70) |
| `retryAfterDays` | Int | Số ngày chờ trước khi làm lại (vd: 3) |
| `questionCount` | Int | Số câu random mỗi lần thi (vd: 10) |
| `duration` | Int | Thời gian làm bài (phút, vd: 30) |

---

## 3. Thêm câu hỏi (Add Questions)

```mermaid
flowchart TD
    A[Teacher gửi POST /api/exam/:examId/question] --> B{Exam → Course thuộc teacher?}
    B -->|Không| B1[403 Forbidden]
    B -->|Có| C[Tạo ExamQuestion]
    C --> D[content, optionA/B/C/D, correctAnswer]
    D --> E[Trả về question mới]

    style A fill:#e1f5fe
    style E fill:#c8e6c9
    style B1 fill:#ffcdd2
```

### Database Changes
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `exam_questions` | INSERT | examId, content, optionA/B/C/D, correctAnswer |

---

## 4. Student bắt đầu làm bài (Start Attempt)

```mermaid
flowchart TD
    A[Student gửi POST /api/exam/:examId/start] --> B{Đã mua khóa học?}
    B -->|Không| B1[403 Chưa mua khóa học]
    B -->|Có| C{Đã pass exam này?}
    C -->|Có| C1[400 Bạn đã pass bài thi này]
    C -->|Chưa| D{Có attempt gần đây?}
    D -->|Có + chưa đủ retryAfterDays| D1[400 Vui lòng chờ N ngày]
    D -->|Không hoặc đủ ngày| E{Có attempt đang làm dở?}
    E -->|Có| E1[Trả về attempt hiện tại]
    E -->|Không| F[Random questionCount câu từ ngân hàng]
    F --> G[Tạo ExamAttempt: isCompleted=false]
    G --> H[Tạo ExamAttemptAnswer cho mỗi câu: selectedAnswer=null]
    H --> I[Trả về attempt + questions - ẩn đáp án đúng]

    style A fill:#e1f5fe
    style I fill:#c8e6c9
    style E1 fill:#fff9c4
    style B1 fill:#ffcdd2
    style C1 fill:#ffcdd2
    style D1 fill:#ffcdd2
```

### Response - Questions (ẩn correctAnswer)
```json
{
  "data": {
    "attemptId": "attempt-id",
    "startedAt": "2026-04-10T10:00:00Z",
    "duration": 30,
    "questions": [
      {
        "id": "question-id",
        "content": "React hook nào dùng để quản lý state?",
        "optionA": "useEffect",
        "optionB": "useState",
        "optionC": "useRef",
        "optionD": "useMemo"
      }
    ]
  }
}
```

### Database Changes (Transaction)
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `exam_attempts` | INSERT | examId, userId, isCompleted=false, startedAt=now |
| `exam_attempt_answers` | INSERT (per question) | attemptId, questionId, selectedAnswer=null, isCorrect=false |

---

## 5. Student nộp bài (Submit Attempt)

```mermaid
flowchart TD
    A[Student gửi POST /api/exam/attempt/:attemptId/submit\nBody: answers array] --> B{Attempt thuộc student?}
    B -->|Không| B1[403 Forbidden]
    B -->|Có| C{isCompleted = true?}
    C -->|Có| C1[400 Bài thi đã nộp rồi]
    C -->|Không| D{Còn trong thời gian? now < startedAt + duration}
    D -->|Hết giờ| D1[Vẫn chấm - tính câu đã trả lời]
    D -->|Còn| E[Cập nhật selectedAnswer cho mỗi câu]
    D1 --> E
    
    E --> F["Chấm điểm:\nLoop qua answers → so sánh correctAnswer"]
    F --> G[Tính score = correctCount / totalCount * 100]
    G --> H{score >= passPercent?}
    H -->|Có| I[isPassed = true ✅]
    H -->|Không| J[isPassed = false ❌]
    
    I --> K[isCompleted = true, submittedAt = now]
    J --> K
    K --> L[Trả về kết quả + đáp án đúng]

    style A fill:#e1f5fe
    style L fill:#c8e6c9
    style B1 fill:#ffcdd2
    style C1 fill:#ffcdd2
```

### Công thức chấm điểm
```
score = (số câu đúng / tổng số câu) × 100
isPassed = score >= exam.passPercent
```

### Database Changes (Transaction)
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `exam_attempt_answers` | UPDATE (per answer) | selectedAnswer, isCorrect |
| `exam_attempts` | UPDATE | score, isPassed, isCompleted=true, submittedAt=now |

---

## 6. Exam Gate - Chặn nội dung

```mermaid
flowchart TD
    A[Student request GET /api/course/material/:id] --> B[Lấy material → lesson → course]
    B --> C{User đã mua course?}
    C -->|Không| C1[Chỉ xem nếu isPreview=true]
    C -->|Có| D[Lấy tất cả exams published của course]
    D --> E[Sort exams theo createdAt ASC]
    E --> F{Có exam nào createdAt < lesson.createdAt?}
    F -->|Không| G[✅ Cho xem material]
    F -->|Có| H[Lấy exam attempts của user cho những exams đó]
    H --> I{Tất cả exams trước đều đã pass?}
    I -->|Có| G
    I -->|Không| J[❌ 403 Bạn cần pass bài thi trước]

    style A fill:#e1f5fe
    style G fill:#c8e6c9
    style J fill:#ffcdd2
```

### Logic chi tiết Exam Gate
```
Exams sorted by createdAt: [Exam1, Exam2, Exam3]
Lessons sorted by createdAt: [L1, L2, L3, L4, L5]

Timeline:
  L1 → L2 → Exam1 → L3 → Exam2 → L4 → L5 → Exam3

Quy tắc:
  - L1, L2: Xem tự do (không có exam trước)
  - L3: Phải pass Exam1
  - L4, L5: Phải pass Exam1 + Exam2
  - (Sau Exam3 nếu có lesson): Phải pass tất cả 3 exams
```

---

## 7. Quản lý đề thi (Teacher CRUD)

```mermaid
flowchart TD
    subgraph Exam CRUD
        A1[POST /api/exam] --> A2[Tạo exam - draft]
        B1[PUT /api/exam/:id] --> B2[Sửa exam]
        C1[DELETE /api/exam/:id] --> C2[Xóa exam]
    end
    
    subgraph Question CRUD
        D1[POST /api/exam/:id/question] --> D2[Thêm câu hỏi]
        E1[PUT /api/exam/question/:id] --> E2[Sửa câu hỏi]
        F1[DELETE /api/exam/question/:id] --> F2[Xóa câu hỏi]
    end
    
    subgraph Student Actions
        G1[POST /api/exam/:id/start] --> G2[Bắt đầu làm bài]
        H1[POST /api/exam/attempt/:id/submit] --> H2[Nộp bài]
        I1[GET /api/exam/attempt/:id] --> I2[Xem kết quả]
    end
```

---

## 8. Sơ đồ trạng thái Exam Attempt

```mermaid
stateDiagram-v2
    [*] --> started: Student start exam
    started --> submitted_pass: Nộp bài + score >= passPercent ✅
    started --> submitted_fail: Nộp bài + score < passPercent ❌
    submitted_fail --> waiting: Chờ retryAfterDays ngày
    waiting --> started: Làm lại (random câu mới)
    submitted_pass --> [*]: Hoàn thành - unlock nội dung tiếp
```

---

## Tổng hợp API

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| POST | `/api/exam` | Teacher | Tạo đề thi |
| PUT | `/api/exam/:examId` | Teacher | Sửa đề thi |
| DELETE | `/api/exam/:examId` | Teacher | Xóa đề thi |
| GET | `/api/exam/:examId` | Auth | Xem đề thi |
| POST | `/api/exam/:examId/question` | Teacher | Thêm câu hỏi |
| PUT | `/api/exam/question/:questionId` | Teacher | Sửa câu hỏi |
| DELETE | `/api/exam/question/:questionId` | Teacher | Xóa câu hỏi |
| POST | `/api/exam/:examId/start` | User (đã mua) | Bắt đầu làm bài |
| POST | `/api/exam/attempt/:attemptId/submit` | User | Nộp bài |
| GET | `/api/exam/attempt/:attemptId` | User | Xem kết quả |
