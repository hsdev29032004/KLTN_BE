# Tính năng Đề Thi (Exam System)

## 1. Tổng quan

Hệ thống đề thi cho phép giảng viên tạo đề thi trong khóa học (cùng cấp với Lesson). Học viên phải vượt qua đề thi mới có thể xem tài liệu của các lesson phía sau đề thi đó.

### Luồng hoạt động

```
Giảng viên tạo đề thi → Thêm câu hỏi vào ngân hàng đề → Submit review → Admin duyệt → Published

Học viên bấm làm bài → Hệ thống random N câu từ ngân hàng → Học viên trả lời & nộp bài
  → Đạt ≥ X% → Pass → Xem được lesson tiếp theo
  → Không đạt → Chờ Y ngày → Làm lại
```

### Thứ tự nội dung khóa học

Lesson và Exam sắp xếp theo `createdAt asc`. Exam hoạt động như **cổng chặn**: học viên phải pass tất cả exam trước lesson đó mới xem được tài liệu.

```
Lesson 1 (createdAt: T1) → Xem tự do
Lesson 2 (createdAt: T2) → Xem tự do
Exam 1   (createdAt: T3) → Phải pass Exam 1 mới xem được Lesson 3, 4
Lesson 3 (createdAt: T4) → Bị chặn nếu chưa pass Exam 1
Lesson 4 (createdAt: T5) → Bị chặn nếu chưa pass Exam 1
Exam 2   (createdAt: T6) → Phải pass Exam 1 + Exam 2 mới xem Lesson 5
Lesson 5 (createdAt: T7) → Bị chặn nếu chưa pass Exam 1 hoặc Exam 2
```

---

## 2. Database Schema mới

### Bảng `exams`
| Field | Type | Mô tả |
|-------|------|-------|
| id | UUID | PK |
| courseId | UUID | FK → courses |
| name | String | Tên đề thi |
| passPercent | Int | % để pass (VD: 70 = cần đúng ≥70%) |
| retryAfterDays | Int | Số ngày chờ trước khi làm lại |
| questionCount | Int | Số câu hỏi random mỗi lần thi |
| duration | Int | Thời gian làm bài (phút) |
| status | LessonStatus | draft/published/outdated/deleted |
| createdAt | DateTime | Thứ tự hiển thị trong khóa học |

### Bảng `exam_questions` (Ngân hàng câu hỏi)
| Field | Type | Mô tả |
|-------|------|-------|
| id | UUID | PK |
| examId | UUID | FK → exams |
| content | String | Nội dung câu hỏi |
| optionA | String | Đáp án A |
| optionB | String | Đáp án B |
| optionC | String | Đáp án C |
| optionD | String | Đáp án D |
| correctAnswer | String | "A" / "B" / "C" / "D" |
| isDeleted | Boolean | Soft delete |

### Bảng `exam_attempts` (Bài thi của học viên)
| Field | Type | Mô tả |
|-------|------|-------|
| id | UUID | PK |
| examId | UUID | FK → exams |
| userId | UUID | FK → users |
| score | Decimal(5,2) | % điểm (null nếu chưa nộp) |
| isPassed | Boolean | Đã pass chưa |
| isCompleted | Boolean | Đã nộp bài chưa |
| startedAt | DateTime | Thời điểm bắt đầu |
| submittedAt | DateTime? | Thời điểm nộp bài |

### Bảng `exam_attempt_answers` (Câu trả lời)
| Field | Type | Mô tả |
|-------|------|-------|
| id | UUID | PK |
| attemptId | UUID | FK → exam_attempts |
| questionId | UUID | FK → exam_questions |
| selectedAnswer | String? | "A"/"B"/"C"/"D" hoặc null |
| isCorrect | Boolean | Đúng hay sai |

---

## 3. API Endpoints

Base URL: `/api/exam`

### 3.1 Teacher APIs

#### 3.1.1 Tạo đề thi
```
POST /api/exam/course/:courseId
Role: teacher
```

**Request Body:**
```json
{
  "name": "Kiểm tra giữa kỳ",
  "passPercent": 70,
  "retryAfterDays": 3,
  "questionCount": 10,
  "duration": 30
}
```

**Response:**
```json
{
  "message": "Tạo đề thi thành công",
  "data": {
    "id": "uuid",
    "name": "Kiểm tra giữa kỳ",
    "passPercent": 70,
    "retryAfterDays": 3,
    "questionCount": 10,
    "duration": 30,
    "courseId": "uuid",
    "status": "draft",
    "createdAt": "2026-04-07T..."
  }
}
```

#### 3.1.2 Cập nhật đề thi
```
PUT /api/exam/:examId
Role: teacher
```

**Request Body** (tất cả field optional):
```json
{
  "name": "Kiểm tra giữa kỳ - Cập nhật",
  "passPercent": 80,
  "retryAfterDays": 5,
  "questionCount": 15,
  "duration": 45
}
```

#### 3.1.3 Xóa đề thi
```
DELETE /api/exam/:examId
Role: teacher
```
- Draft → xóa thật (kèm câu hỏi)
- Published → chuyển `outdated`

#### 3.1.4 Xem chi tiết đề thi (giảng viên)
```
GET /api/exam/:examId/detail
Role: teacher
```

**Response:**
```json
{
  "message": "Lấy chi tiết đề thi thành công",
  "data": {
    "id": "uuid",
    "name": "Kiểm tra giữa kỳ",
    "passPercent": 70,
    "retryAfterDays": 3,
    "questionCount": 10,
    "duration": 30,
    "status": "draft",
    "course": { "userId": "uuid", "name": "Khóa học A" },
    "questions": [
      {
        "id": "uuid",
        "content": "Câu hỏi 1?",
        "optionA": "Đáp án A",
        "optionB": "Đáp án B",
        "optionC": "Đáp án C",
        "optionD": "Đáp án D",
        "correctAnswer": "A",
        "isDeleted": false,
        "createdAt": "..."
      }
    ],
    "_count": { "questions": 20 }
  }
}
```

#### 3.1.5 Thêm 1 câu hỏi
```
POST /api/exam/:examId/question
Role: teacher
```

**Request Body:**
```json
{
  "content": "React là gì?",
  "optionA": "Một thư viện UI",
  "optionB": "Một framework backend",
  "optionC": "Một ngôn ngữ lập trình",
  "optionD": "Một cơ sở dữ liệu",
  "correctAnswer": "A"
}
```

#### 3.1.6 Thêm nhiều câu hỏi cùng lúc
```
POST /api/exam/:examId/questions
Role: teacher
```

**Request Body** (array):
```json
[
  {
    "content": "Câu hỏi 1?",
    "optionA": "A1", "optionB": "B1", "optionC": "C1", "optionD": "D1",
    "correctAnswer": "A"
  },
  {
    "content": "Câu hỏi 2?",
    "optionA": "A2", "optionB": "B2", "optionC": "C2", "optionD": "D2",
    "correctAnswer": "C"
  }
]
```

#### 3.1.7 Cập nhật câu hỏi
```
PUT /api/exam/question/:questionId
Role: teacher
```

**Request Body** (tất cả field optional):
```json
{
  "content": "Câu hỏi đã sửa?",
  "correctAnswer": "B"
}
```

#### 3.1.8 Xóa câu hỏi
```
DELETE /api/exam/question/:questionId
Role: teacher
```
Soft delete (isDeleted = true)

---

### 3.2 Student APIs

#### 3.2.1 Xem thông tin đề thi
```
GET /api/exam/:examId/info
Role: user
```

**Response:**
```json
{
  "message": "Lấy thông tin đề thi thành công",
  "data": {
    "id": "uuid",
    "name": "Kiểm tra giữa kỳ",
    "passPercent": 70,
    "duration": 30,
    "questionCount": 10,
    "totalQuestions": 50,
    "courseName": "Khóa học A",
    "hasPassed": false,
    "canTakeExam": true,
    "retryAvailableAt": null,
    "inProgressAttemptId": null
  }
}
```

**Các trường hợp:**
- `hasPassed = true` → Đã vượt qua, không cần làm lại
- `canTakeExam = false` + `retryAvailableAt` → Phải chờ đến ngày đó
- `inProgressAttemptId != null` → Có bài thi đang làm dở, gọi `startExam` sẽ trả lại bài đó

#### 3.2.2 Bắt đầu / Tiếp tục làm bài
```
POST /api/exam/:examId/start
Role: user
```

**Response:**
```json
{
  "message": "Bắt đầu làm bài thi",
  "data": {
    "attemptId": "uuid",
    "startedAt": "2026-04-07T10:00:00Z",
    "duration": 30,
    "questions": [
      {
        "questionId": "uuid",
        "content": "React là gì?",
        "optionA": "Một thư viện UI",
        "optionB": "Một framework backend",
        "optionC": "Một ngôn ngữ lập trình",
        "optionD": "Một cơ sở dữ liệu",
        "selectedAnswer": null
      }
    ]
  }
}
```

**Lưu ý FE:**
- Nếu có bài đang làm dở → trả lại bài đó (message: "Tiếp tục bài thi đang làm")
- `selectedAnswer` sẽ có giá trị nếu đã chọn trước đó
- FE cần tính thời gian còn lại: `duration * 60 - (now - startedAt) / 1000`
- Hết giờ → FE gọi submit với những câu đã trả lời

#### 3.2.3 Nộp bài
```
POST /api/exam/attempt/:attemptId/submit
Role: user
```

**Request Body:**
```json
{
  "answers": [
    { "questionId": "uuid-1", "selectedAnswer": "A" },
    { "questionId": "uuid-2", "selectedAnswer": "C" },
    { "questionId": "uuid-3", "selectedAnswer": "B" }
  ]
}
```

**Response:**
```json
{
  "message": "Nộp bài thi thành công",
  "data": {
    "attemptId": "uuid",
    "score": 70,
    "isPassed": true,
    "correctCount": 7,
    "totalQuestions": 10,
    "passPercent": 70
  }
}
```

#### 3.2.4 Xem kết quả chi tiết bài thi
```
GET /api/exam/attempt/:attemptId/result
Role: user
```

**Response:**
```json
{
  "message": "Lấy kết quả bài thi thành công",
  "data": {
    "attemptId": "uuid",
    "examName": "Kiểm tra giữa kỳ",
    "courseName": "Khóa học A",
    "score": "70.00",
    "isPassed": true,
    "passPercent": 70,
    "startedAt": "2026-04-07T10:00:00Z",
    "submittedAt": "2026-04-07T10:25:00Z",
    "totalQuestions": 10,
    "correctCount": 7,
    "answers": [
      {
        "questionId": "uuid",
        "content": "React là gì?",
        "optionA": "Một thư viện UI",
        "optionB": "Một framework backend",
        "optionC": "Một ngôn ngữ lập trình",
        "optionD": "Một cơ sở dữ liệu",
        "correctAnswer": "A",
        "selectedAnswer": "A",
        "isCorrect": true
      }
    ]
  }
}
```

#### 3.2.5 Lịch sử thi 1 đề
```
GET /api/exam/:examId/history
Role: user
```

**Response:**
```json
{
  "message": "Lấy lịch sử làm thi thành công",
  "data": {
    "exam": {
      "id": "uuid",
      "name": "Kiểm tra giữa kỳ",
      "passPercent": 70,
      "duration": 30,
      "questionCount": 10,
      "courseName": "Khóa học A"
    },
    "attempts": [
      {
        "id": "uuid",
        "score": "70.00",
        "isPassed": true,
        "isCompleted": true,
        "startedAt": "...",
        "submittedAt": "...",
        "_count": { "answers": 10 }
      },
      {
        "id": "uuid",
        "score": "40.00",
        "isPassed": false,
        "isCompleted": true,
        "startedAt": "...",
        "submittedAt": "...",
        "_count": { "answers": 10 }
      }
    ]
  }
}
```

#### 3.2.6 Lịch sử thi tất cả đề trong 1 khóa học
```
GET /api/exam/course/:courseId/history
Role: user
```

**Response:**
```json
{
  "message": "Lấy lịch sử thi khóa học thành công",
  "data": {
    "courseId": "uuid",
    "courseName": "Khóa học A",
    "exams": [
      {
        "id": "uuid",
        "name": "Kiểm tra 1",
        "passPercent": 70,
        "duration": 30,
        "questionCount": 10,
        "createdAt": "...",
        "attempts": [
          { "id": "uuid", "score": "90.00", "isPassed": true, "isCompleted": true, "startedAt": "...", "submittedAt": "..." }
        ]
      },
      {
        "id": "uuid",
        "name": "Kiểm tra 2",
        "passPercent": 80,
        "duration": 45,
        "questionCount": 15,
        "createdAt": "...",
        "attempts": []
      }
    ]
  }
}
```

---

## 4. Thay đổi API hiện tại

### 4.1 GET /api/course/:key (Chi tiết khóa học)

Response bây giờ có thêm field `exams`:

```json
{
  "data": {
    "id": "...",
    "name": "...",
    "lessons": [...],
    "exams": [
      {
        "id": "uuid",
        "name": "Kiểm tra giữa kỳ",
        "passPercent": 70,
        "retryAfterDays": 3,
        "questionCount": 10,
        "duration": 30,
        "status": "published",
        "createdAt": "2026-04-07T...",
        "_count": { "questions": 20 }
      }
    ],
    ...
  }
}
```

**FE cần merge `lessons` và `exams` theo `createdAt` để hiển thị đúng thứ tự:**

```typescript
const courseContent = [
  ...course.lessons.map(l => ({ ...l, type: 'lesson' })),
  ...course.exams.map(e => ({ ...e, type: 'exam' })),
].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
```

### 4.2 GET /api/course/material/:materialId (Xem tài liệu)

**Thay đổi:** Nếu học viên chưa pass đề thi trước lesson chứa material này → trả `403`:

```json
{
  "statusCode": 403,
  "message": "Bạn cần hoàn thành đề thi trước khi xem tài liệu này"
}
```

**FE cần xử lý:** Khi nhận 403 với message trên → hiển thị thông báo và redirect đến đề thi tương ứng.

### 4.3 Publish khóa học (Admin)

Khi admin duyệt khóa học, exam cũng được publish theo:
- `draft` → `published`
- `outdated` → `deleted`

---

## 5. Hướng dẫn FE Implementation

### 5.1 Trang chi tiết khóa học (Course Detail)

1. Gọi `GET /api/course/:slug` để lấy data
2. Merge `lessons` + `exams` theo `createdAt`
3. Hiển thị dạng timeline/sidebar:
   - Icon bài học 📖 cho lesson
   - Icon đề thi 📝 cho exam
4. Nếu user đã mua → gọi thêm `GET /api/exam/:examId/info` cho mỗi exam để biết trạng thái (đã pass, đang chờ retry, v.v.)

### 5.2 Trang quản lý đề thi (Teacher)

1. Trang danh sách: hiện trong chi tiết khóa học, cùng level với lesson
2. Trang tạo/sửa đề thi:
   - Form: name, passPercent, retryAfterDays, questionCount, duration
   - Gọi `POST /api/exam/course/:courseId` hoặc `PUT /api/exam/:examId`
3. Trang quản lý câu hỏi:
   - Gọi `GET /api/exam/:examId/detail` để lấy danh sách câu hỏi
   - Thêm 1 câu: `POST /api/exam/:examId/question`
   - Thêm nhiều câu: `POST /api/exam/:examId/questions`
   - Sửa: `PUT /api/exam/question/:questionId`
   - Xóa: `DELETE /api/exam/question/:questionId`

### 5.3 Trang làm bài thi (Student)

**Flow:**

```
1. Bấm "Làm bài" → POST /api/exam/:examId/start
2. Nhận danh sách câu hỏi + attemptId + startedAt + duration
3. Hiển thị UI làm bài:
   - Countdown timer: duration * 60 - (Date.now() - startedAt) / 1000
   - Danh sách câu hỏi dạng single-choice
   - Nút chuyển câu / đánh dấu
4. Bấm "Nộp bài" hoặc hết giờ → POST /api/exam/attempt/:attemptId/submit
5. Hiển thị kết quả: score, isPassed, correctCount / totalQuestions
6. Bấm "Xem chi tiết" → GET /api/exam/attempt/:attemptId/result
```

**Xử lý reload trang khi đang thi:**
- Gọi lại `POST /api/exam/:examId/start` → nếu có bài đang làm dở sẽ trả lại bài đó kèm `selectedAnswer` đã chọn
- Tính lại thời gian còn lại từ `startedAt`

**Xử lý khi chưa thể thi lại:**
- `canTakeExam = false` → disable nút "Làm bài"
- Hiển thị: "Bạn có thể làm lại vào ngày {retryAvailableAt}"

### 5.4 Trang lịch sử thi

- Lịch sử 1 đề: `GET /api/exam/:examId/history`
- Lịch sử cả khóa: `GET /api/exam/course/:courseId/history`
- Mỗi attempt → bấm "Xem chi tiết" → `GET /api/exam/attempt/:attemptId/result`

### 5.5 Chặn xem tài liệu (Exam Gate)

Khi gọi `GET /api/course/material/:materialId` bị 403 với message "Bạn cần hoàn thành đề thi...":
1. Parse response
2. Hiển thị modal/toast: "Bạn cần hoàn thành đề thi trước khi xem nội dung này"
3. Trong sidebar khóa học, đánh dấu icon 🔒 cho các lesson sau exam chưa pass
4. Logic FE kiểm tra: tìm exam gần nhất TRƯỚC lesson đó (theo createdAt), kiểm tra có attempt isPassed = true không

---

## 6. Error codes

| Status | Message | Khi nào |
|--------|---------|---------|
| 400 | Đề thi chưa có đủ câu hỏi | questionCount > số câu trong ngân hàng |
| 400 | Bạn đã vượt qua đề thi này rồi | Đã pass, cố start lại |
| 400 | Bạn chỉ có thể làm lại sau ngày... | Chưa hết cooldown |
| 400 | Bài thi đã được nộp | Submit lần 2 |
| 400 | Bài thi chưa được nộp | Xem result khi chưa submit |
| 403 | Bạn chưa mua khóa học này | Chưa mua mà cố thi |
| 403 | Bạn cần hoàn thành đề thi... | Xem material bị exam gate chặn |
| 404 | Đề thi không tồn tại | ID sai hoặc đã bị xóa |
| 404 | Câu hỏi không tồn tại | ID sai |
| 404 | Bài thi không tồn tại | attemptId sai |
