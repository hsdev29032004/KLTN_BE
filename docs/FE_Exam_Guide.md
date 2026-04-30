# Frontend Guide — Exam Feature

Tập trung vào cách FE tương tác với backend sau thay đổi: cấu hình số câu theo độ khó, gửi câu hỏi có độ khó, và xử lý khi gửi xét duyệt khóa học.

## 1. Tóm tắt thay đổi (backend)
- Bảng `exams` có thêm 3 trường cấu hình: `numEasy`, `numNormal`, `numHard` (mặc định 0).
- Bảng `exam_questions` có thêm trường `difficulty` (enum: `easy` | `normal` | `hard`, mặc định `normal`).
- Khi giảng viên gửi khóa học để xét duyệt, backend sẽ kiểm tra các *draft exams* trong khóa học phải có đủ số câu theo `numEasy/numNormal/numHard`. Nếu thiếu sẽ trả lỗi 400 với mô tả thiếu hụt.

## 2. Các endpoint quan trọng (base `/api/exam`)
- `POST /api/exam/course/:courseId` — Tạo exam (Role: teacher)
  - Request body (JSON):
    ```json
    {
      "name": "Kiểm tra giữa kỳ",
      "passPercent": 70,
      "retryAfterDays": 3,
      "questionCount": 10,
      "duration": 30,
      "numEasy": 2,
      "numNormal": 2,
      "numHard": 6
    }
    ```
- `PUT /api/exam/:examId` — Cập nhật exam (Role: teacher). Các trường `numEasy/numNormal/numHard` optional.
- `GET /api/exam/:examId/detail` — Lấy chi tiết exam (Role: teacher). Response bao gồm `questions` (mỗi câu có `difficulty`).
- `POST /api/exam/:examId/question` — Thêm 1 câu (Role: teacher)
  - Body example:
    ```json
    {
      "content": "React là gì?",
      "optionA": "Một thư viện UI",
      "optionB": "Một framework backend",
      "optionC": "Một ngôn ngữ lập trình",
      "optionD": "Một cơ sở dữ liệu",
      "correctAnswer": "A",
      "difficulty": "easy"
    }
    ```
- `POST /api/exam/:examId/questions` — Thêm nhiều câu (array), mỗi phần tử có thể chứa `difficulty`.
- `PUT /api/exam/question/:questionId` — Cập nhật câu (có thể cập nhật `difficulty`).

## 3. FE behavior & UI guidance
1. Exam form (create/update): bổ sung 3 input số `numEasy`, `numNormal`, `numHard` (default 0).
   - Validation: `numEasy + numNormal + numHard` có thể lớn hơn `questionCount` — backend giữ `questionCount` (không xóa), nhưng FE nên bỏ trường này khỏi cấu hình.
2. Question editor:
   - Thêm dropdown `Difficulty` với options `easy`, `normal`, `hard`.
   - Khi thêm nhiều câu (bulk add), hỗ trợ cột `difficulty` hoặc UI để set default difficulty.
3. Course submit (teacher clicks "Submit for review"):
   - Call existing endpoint (course submit). BE sẽ validate draft exams’ question counts.
   - Nếu backend trả lỗi 400 với thông báo kiểu: `Đề thi "X" thiếu: cần 2 câu dễ, 1 câu khó` → show error toast/modal và highlight exam(s) thiếu câu.
4. Exam list in course detail (teacher view):
   - Use `GET /api/exam/:examId/detail` to show counts by difficulty; show progress bar: easy X/numEasy, normal Y/numNormal, hard Z/numHard.
   - Provide quick actions: add missing questions (link to question editor).
5. Merge lessons + exams in timeline/sidebar: keep ordering by `createdAt`.

## 4. Error handling
- On course submit, handle 400 response and display backend message clearly to teacher.
- When creating/updating exam or questions, show validation errors from API (e.g., invalid numbers, missing required fields).

## 5. Sample FE snippets
- Create exam (fetch):
```javascript
await fetch(`/api/exam/course/${courseId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, passPercent, retryAfterDays, questionCount, duration, numEasy, numNormal, numHard }),
});
```

- Add question:
```javascript
await fetch(`/api/exam/${examId}/question`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content, optionA, optionB, optionC, optionD, correctAnswer, difficulty }),
});
```

- Handling submit-review error:
```javascript
const res = await fetch(`/api/course/${courseId}/submit-review`, { method: 'POST', body: JSON.stringify({ description }) });
if (!res.ok) {
  const err = await res.json();
  // show err.message to user (it will include shortage details)
}
```

## 6. Notes & recommendations
- Prefer FE validation to guide teachers (e.g., show current question counts vs required), but keep server as authoritative.
- When bulk-adding questions, allow CSV/Excel import that includes a `difficulty` column.
- After migrations, run `npx prisma generate` and ensure backend migrations applied before FE expects `difficulty` field.

---
File created: `docs/FE_Exam_Guide.md`
