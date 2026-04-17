Feature: Luồng đánh giá khóa học
  Hành trình từ mua khóa học → đánh giá → cập nhật → xóa, với điểm trung bình tự động tính lại.

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 1: Mua khóa → Đánh giá → Sửa → Xóa
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Student đánh giá khóa học đã mua
    Given student "student@test.com" đã mua khóa "Khóa React" (course-1)
    And khóa "Khóa React" chưa có review nào (star = 0)

    # --- Bước 1: Tạo đánh giá ---
    When student gửi POST /api/review với:
      | courseId  | course-1           |
      | rating   | 5                  |
      | content  | Khóa học rất hay!  |
    Then review được tạo
    And hệ thống tính lại course.star = avg(5) = 5.0

    # --- Bước 2: Xem đánh giá vừa tạo (public) ---
    When bất kỳ ai gửi GET /api/review/course-1
    Then trả về 1 review: rating = 5, content, user info (fullName, avatar)

    # --- Bước 3: Student sửa đánh giá ---
    When student gửi PATCH /api/review/:reviewId với rating = 4
    Then review cập nhật rating = 4
    And course.star tính lại = avg(4) = 4.0

    # --- Bước 4: Student xóa đánh giá ---
    When student gửi DELETE /api/review/:reviewId
    Then review bị soft delete
    And course.star tính lại = 0 (không còn review nào)

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 2: Nhiều student đánh giá → Trung bình sao
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Nhiều student đánh giá cùng khóa học
    Given khóa "Khóa React" (course-1) đã published
    And student-A, student-B, student-C đều đã mua

    # --- Student-A đánh giá 5 sao ---
    When student-A gửi POST /api/review với rating = 5
    Then course.star = 5.0

    # --- Student-B đánh giá 4 sao ---
    When student-B gửi POST /api/review với rating = 4
    Then course.star = avg(5, 4) = 4.5

    # --- Student-C đánh giá 3 sao ---
    When student-C gửi POST /api/review với rating = 3
    Then course.star = avg(5, 4, 3) = 4.0

    # --- Student-A sửa từ 5 → 2 ---
    When student-A gửi PATCH /api/review/:reviewId với rating = 2
    Then course.star = avg(2, 4, 3) = 3.0

    # --- Student-B xóa review ---
    When student-B gửi DELETE /api/review/:reviewId
    Then course.star = avg(2, 3) = 2.5

    # --- Xem danh sách review (public) ---
    When gửi GET /api/review/course-1
    Then trả về 2 reviews (student-A rating 2, student-C rating 3)
    And review của student-B không xuất hiện (đã soft delete)

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 3: Các ràng buộc khi đánh giá
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Ràng buộc nghiệp vụ khi đánh giá
    # --- Chưa mua → không được đánh giá ---
    Given student chưa mua khóa "course-2"
    When student gửi POST /api/review với courseId = "course-2"
    Then lỗi, message chứa "chưa mua khóa học"

    # --- Đã đánh giá rồi → không đánh giá lần 2 ---
    Given student đã đánh giá "course-1"
    When student gửi POST /api/review với courseId = "course-1" lần nữa
    Then lỗi, message chứa "đã đánh giá"

    # --- Rating ngoài phạm vi ---
    When student gửi POST /api/review với rating = 0
    Then validation error (rating phải từ 1-5)

    When student gửi POST /api/review với rating = 6
    Then validation error

    # --- Sửa review người khác ---
    Given review "review-X" thuộc student-B
    When student-A gửi PATCH /api/review/review-X
    Then status 403

    # --- Xóa review người khác ---
    When student-A gửi DELETE /api/review/review-X
    Then status 403
