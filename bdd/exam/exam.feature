Feature: Luồng đề thi và kiểm tra
  Hành trình từ teacher tạo đề thi → thêm câu hỏi → student làm bài → nộp bài → exam gate chặn tài liệu.

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 1: Teacher tạo đề thi → Thêm câu hỏi → Publish cùng khóa học
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Teacher xây dựng hệ thống đề thi cho khóa học
    Given teacher "teacher@test.com" đã đăng nhập
    And teacher sở hữu khóa học "course-1" (draft)
    And đã có lesson "Bài 1 - Giới thiệu" và "Bài 2 - Nâng cao"

    # --- Bước 1: Tạo đề thi ---
    When teacher gửi POST /api/exam/course/course-1 với:
      | name          | passPercent | retryAfterDays | questionCount | duration |
      | Kiểm tra GK   | 70          | 3              | 5             | 30       |
    Then đề thi "Kiểm tra GK" được tạo với trạng thái "nháp", gắn vào course-1

    # --- Bước 2: Thêm câu hỏi từng cái ---
    When teacher gửi POST /api/exam/:examId/question với:
      | content   | optionA | optionB | optionC | optionD | correctAnswer |
      | 1 + 1 = ? | 1       | 2       | 3       | 4       | B             |
    Then câu hỏi được tạo và gắn vào đề thi

    # --- Bước 3: Thêm nhiều câu hỏi cùng lúc ---
    When teacher gửi POST /api/exam/:examId/questions với mảng 9 câu hỏi
    Then 9 câu hỏi được tạo bằng createMany
    And đề thi giờ có tổng 10 câu (nhưng questionCount = 5, mỗi lần thi random 5/10)

    # --- Bước 4: Tạo đề thi thứ 2 ---
    When teacher tạo thêm đề thi "Kiểm tra CK" (passPercent = 80, questionCount = 10, duration = 60)
    Then "Kiểm tra CK" được tạo draft
    And thứ tự theo createdAt: Bài 1 → Kiểm tra GK → Bài 2 → Kiểm tra CK

    # --- Bước 5: Xem chi tiết đề thi (teacher view) ---
    When teacher gửi GET /api/exam/:examId/detail
    Then trả về đề thi với TẤT CẢ câu hỏi (gồm correctAnswer)

    # --- Bước 6: Gửi duyệt khóa học → Exam cũng được publish ---
    When teacher gửi submit-review → admin gửi publish
    Then khóa học → published
    And "Kiểm tra GK" → published
    And "Kiểm tra CK" → published

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 2: Student làm bài thi — pass
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Student làm bài thi từ đầu đến khi pass
    Given student "student@test.com" đã mua khóa học "course-1"
    And khóa học có: Bài 1 → Kiểm tra GK (passPercent 70, questionCount 5) → Bài 2 → Kiểm tra CK

    # --- Bước 1: Xem thông tin đề thi ---
    When student gửi GET /api/exam/:examGK/info
    Then trả về name, passPercent, duration, questionCount
    And KHÔNG trả về nội dung câu hỏi
    And blockedByExam = null (không bị đề nào chặn, vì GK là đề đầu tiên)

    # --- Bước 2: Bắt đầu làm bài ---
    When student gửi POST /api/exam/:examGK/start
    Then hệ thống tạo ExamAttempt (status = "in_progress")
    And chọn ngẫu nhiên 5 câu từ tổng 10 câu (Fisher-Yates shuffle)
    And tạo 5 ExamAttemptAnswer records
    And trả về attempt với danh sách 5 câu hỏi (KHÔNG có correctAnswer)

    # --- Bước 3: Student trả lời và nộp bài ---
    When student gửi POST /api/exam/attempt/:attemptId/submit với answers:
      | questionId | selectedAnswer |
      | q-1        | B              |
      | q-2        | A              |
      | q-3        | C              |
      | q-4        | B              |
      | q-5        | D              |
    Then hệ thống so sánh selectedAnswer vs correctAnswer
    And giả sử 4/5 đúng → score = 80.0
    And 80 >= 70 (passPercent) → isPassed = true
    And attempt.status → "completed"

    # --- Bước 4: Xem kết quả ---
    When student gửi GET /api/exam/attempt/:attemptId/result
    Then trả về: score = 80.0, isPassed = true
    And answers[] với selectedAnswer + correctAnswer cho mỗi câu

    # --- Bước 5: Sau khi pass GK, xem được Bài 2 ---
    When student gửi GET /api/course/material/:bai2MaterialId
    Then hệ thống cho phép xem (exam GK đã pass)

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 3: Student thi rớt → Chờ retry → Thi lại
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Student thi rớt và phải chờ để thi lại
    Given student đã mua khóa học
    And đề thi "Kiểm tra GK" có retryAfterDays = 3

    # --- Lần 1: Thi rớt ---
    When student bắt đầu thi (POST /api/exam/:examId/start)
    And nộp bài với 2/5 câu đúng
    Then score = 40.0, isPassed = false

    # --- Cố thi lại ngay → bị chặn ---
    When student gửi POST /api/exam/:examId/start (ngay sau khi rớt)
    Then status 400, message chứa "Bạn cần đợi 3 ngày nữa"

    # --- Sau 3 ngày → thi lại được ---
    Given đã qua 3 ngày kể từ lần thi cuối
    When student gửi POST /api/exam/:examId/start
    Then hệ thống tạo ExamAttempt mới (random 5 câu khác)

    # --- Lần 2: Pass ---
    When student nộp bài với 4/5 câu đúng
    Then score = 80.0, isPassed = true

    # --- Xem lịch sử thi ---
    When student gửi GET /api/exam/:examId/history
    Then trả về 2 attempts: lần 1 (fail, 40.0) và lần 2 (pass, 80.0)

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 4: Exam Gate — Prerequisite tuần tự
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Student phải pass đề thi tuần tự để mở khóa nội dung
    Given khóa học có thứ tự theo createdAt:
      | #  | type   | name          |
      | 1  | lesson | Bài 1         |
      | 2  | exam   | Kiểm tra GK   |
      | 3  | lesson | Bài 2         |
      | 4  | exam   | Kiểm tra CK   |
      | 5  | lesson | Bài 3         |
    And student đã mua khóa học và chưa thi gì

    # --- Bước 1: Bài 1 xem được (trước exam đầu tiên) ---
    When student xem material thuộc "Bài 1"
    Then hệ thống cho phép

    # --- Bước 2: Bài 2 bị chặn (chưa pass GK) ---
    When student xem material thuộc "Bài 2"
    Then status 403, message "Bạn cần hoàn thành đề thi trước khi xem tài liệu này"

    # --- Bước 3: Kiểm tra CK info → bị chặn bởi GK ---
    When student gửi GET /api/exam/:examCK/info
    Then blockedByExam = { id: examGK_id, name: "Kiểm tra GK" }

    When student gửi POST /api/exam/:examCK/start
    Then status 400, message "Bạn cần hoàn thành đề thi Kiểm tra GK trước"

    # --- Bước 4: Pass GK → mở Bài 2, nhưng Bài 3 vẫn chặn ---
    Given student pass "Kiểm tra GK"
    When student xem material thuộc "Bài 2"
    Then cho phép

    When student xem material thuộc "Bài 3"
    Then status 403 (bị Kiểm tra CK chặn)

    # --- Bước 5: Pass CK → mở tất cả ---
    Given student pass "Kiểm tra CK"
    When student xem material thuộc "Bài 3"
    Then cho phép

    # --- Xem lịch sử toàn khóa ---
    When student gửi GET /api/exam/course/:courseId/history
    Then trả về tất cả attempts cho cả GK và CK

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 5: Teacher sửa/xóa đề thi & câu hỏi
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Teacher quản lý đề thi sau khi tạo
    Given teacher sở hữu đề thi "Kiểm tra GK" (draft) với 10 câu hỏi

    # --- Sửa đề thi ---
    When teacher gửi PUT /api/exam/:examId với name = "Kiểm tra Giữa Kỳ", passPercent = 75
    Then đề thi được cập nhật

    # --- Sửa câu hỏi ---
    When teacher gửi PUT /api/exam/question/:questionId với content mới
    Then câu hỏi được cập nhật

    # --- Xóa câu hỏi ---
    When teacher gửi DELETE /api/exam/question/:questionId
    Then câu hỏi chuyển isDeleted = true (soft delete)

    # --- Xóa đề thi draft → hard delete ---
    When teacher gửi DELETE /api/exam/:examId
    Then đề thi bị xóa thật + tất cả câu hỏi bị xóa thật

  Scenario: Xóa đề thi published → soft delete
    Given đề thi "Kiểm tra GK" đã published
    When teacher gửi DELETE /api/exam/:examId
    Then đề thi chuyển status "outdated"
    And tất cả câu hỏi chuyển isDeleted = true

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 6: Edge cases khi làm bài
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Các trường hợp đặc biệt khi làm bài
    Given student đã mua khóa học

    # --- Đang có attempt dở dang ---
    When student bắt đầu thi → có attempt in_progress
    And student cố start lại
    Then status 400, message "Bạn còn bài thi đang làm dở"

    # --- Nộp bài trống ---
    When student nộp bài với answers = [] (không chọn đáp án nào)
    Then score = 0.0, isPassed = false

    # --- Đã pass rồi → không cho thi lại ---
    Given student đã pass đề thi
    When student gửi POST /api/exam/:examId/start
    Then status 400, message "Bạn đã vượt qua đề thi này"
