Feature: Luồng quản lý khóa học
  Hành trình từ tạo khóa học → thêm bài học/tài liệu → gửi duyệt → admin duyệt/từ chối → cập nhật sau publish.

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 1: Tạo khóa học → Thêm nội dung → Gửi duyệt → Publish
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Teacher tạo khóa học từ đầu đến khi được publish
    # --- Bước 1: Tạo khóa học ---
    Given teacher "teacher@test.com" đã đăng nhập
    When teacher gửi POST /api/course với:
      | name        | price  | thumbnail | content     | description     |
      | Khóa React  | 500000 | url.jpg   | Nội dung... | Mô tả khóa học |
    Then khóa học được tạo với status "draft"
    And slug tự động tạo từ name ("khoa-react"), star = 0, studentCount = 0

    # --- Bước 2: Thêm bài học ---
    When teacher gửi POST /api/course/:courseId/lesson với name "Bài 1 - Giới thiệu"
    Then lesson được tạo với status "draft"

    When teacher thêm tiếp lesson "Bài 2 - Components"
    Then lesson thứ 2 được tạo với status "draft"

    # --- Bước 3: Thêm tài liệu cho bài học ---
    When teacher gửi POST /api/course/lesson/:lessonId/material với:
      | name           | url          | type  | isPreview |
      | Video giới thiệu | intro.mp4  | video | true      |
    Then material được tạo với status "draft", isPreview = true

    When teacher thêm material "Slide bài giảng" (type = document, isPreview = false)
    Then material thứ 2 được tạo draft

    # --- Bước 4: Gửi xét duyệt ---
    When teacher gửi POST /api/course/:courseId/submit-review với description "Xin duyệt lần đầu"
    Then khóa học chuyển status "draft" → "pending"
    And hệ thống tạo CourseApproval record

    # --- Bước 5: Trong lúc pending, teacher không thể chỉnh sửa material ---
    When teacher cố gửi PUT /api/course/material/:materialId
    Then status 400, message "Không thể chỉnh sửa tài liệu khi khóa học đang chờ phê duyệt"

    # --- Bước 6: Admin phê duyệt ---
    Given admin "admin@test.com" đã đăng nhập
    When admin gửi POST /api/course/:courseId/publish
    Then khóa học chuyển "pending" → "published"
    And tất cả lesson draft → published
    And tất cả material draft → published
    And CourseApproval status → "approved"
    And hệ thống tạo Conversation cho khóa học
    And teacher được thêm làm host của Conversation

    # --- Bước 7: Khóa học xuất hiện cho public ---
    When bất kỳ ai gửi GET /api/course
    Then "Khóa React" xuất hiện trong danh sách (status = published)

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 2: Cập nhật khóa học sau publish → Gửi duyệt lại
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Teacher cập nhật khóa học đã publish
    Given khóa học "Khóa React" đã published
    And teacher đăng nhập

    # --- Bước 1: Sửa tài liệu published → tạo bản draft mới ---
    When teacher gửi PUT /api/course/material/:materialId với name mới
    Then material cũ chuyển status "outdated"
    And hệ thống tạo material mới với status "draft" chứa dữ liệu đã cập nhật

    # --- Bước 2: Thêm lesson mới ---
    When teacher thêm lesson "Bài 3 - Hooks" với material mới
    Then lesson và material có status "draft"

    # --- Bước 3: Gửi duyệt cập nhật ---
    When teacher gửi POST /api/course/:courseId/submit-review
    Then khóa học chuyển "published" → "update"

    # --- Bước 4: Trong khi chờ duyệt, student vẫn xem được nội dung published cũ ---
    Given student đã mua "Khóa React"
    When student gửi GET /api/course/khoa-react
    Then vẫn thấy Bài 1, Bài 2 (published)
    And chưa thấy Bài 3 (draft)

    # --- Bước 5: Admin duyệt bản cập nhật ---
    When admin gửi POST /api/course/:courseId/publish
    Then khóa học chuyển "update" → "published"
    And material draft mới → published
    And material outdated cũ → bị xóa
    And lesson "Bài 3" → published
    And KHÔNG tạo Conversation mới (đã có)

    # --- Bước 6: Student thấy nội dung mới ---
    When student gửi GET /api/course/khoa-react
    Then thấy Bài 1, Bài 2, Bài 3 (tất cả published)

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 3: Admin từ chối → Teacher sửa → Gửi lại
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Khóa học bị từ chối và gửi lại
    Given teacher tạo khóa học "Khóa Node.js" (draft)
    And thêm lesson + material
    And gửi submit-review → status "pending"

    # --- Admin từ chối lần đầu ---
    When admin gửi POST /api/course/:courseId/reject với reason "Nội dung chưa đủ chi tiết"
    Then khóa học chuyển "pending" → "rejected"
    And CourseApproval status → "rejected" với reason

    # --- Teacher sửa và gửi lại ---
    When teacher cập nhật nội dung khóa học
    And teacher gửi submit-review lại
    Then khóa học chuyển "rejected" → "pending"

    # --- Admin duyệt lần 2 ---
    When admin gửi publish
    Then khóa học → "published"

  Scenario: Khóa học published bị từ chối khi cập nhật
    Given khóa học "Khóa React" đã published
    And teacher sửa material + gửi submit-review → status "update"

    # --- Admin từ chối bản update ---
    When admin gửi POST /api/course/:courseId/reject
    Then khóa học chuyển "update" → "need_update"
    And khóa học vẫn PUBLIC (student vẫn xem được nội dung published cũ)

    # --- Teacher sửa lại ---
    When teacher sửa lại material
    And gửi submit-review
    Then khóa học chuyển "need_update" → "update"

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 4: Xóa khóa học (cascade soft delete)
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Teacher xóa khóa học
    Given teacher sở hữu khóa học "course-1" với 3 lessons, 5 materials, 2 exams

    When teacher gửi DELETE /api/course/course-1
    Then khóa học chuyển status "outdated", isDeleted = true
    And tất cả 3 lessons → "outdated", isDeleted = true
    And tất cả 5 materials → "outdated", isDeleted = true
    And tất cả 2 exams → "outdated", isDeleted = true

    When bất kỳ ai gửi GET /api/course
    Then "course-1" không còn xuất hiện trong danh sách

  Scenario: Draft lesson/material bị hard delete
    Given teacher có lesson "Bài mới" status "draft" với material draft
    When teacher gửi DELETE /api/course/lesson/:lessonId
    Then lesson bị XÓA THẬT (hard delete)
    And material bên trong bị xóa thật

    Given teacher có material draft "Tài liệu mới"
    When teacher gửi DELETE /api/course/material/:materialId
    Then material bị xóa thật

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 5: Xem khóa học từ góc nhìn khác nhau
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Các vai trò xem khóa học khác nhau
    Given khóa học "Khóa React" đã published
    And có 3 lessons (published), 1 lesson (draft chờ duyệt)
    And có exams gắn với khóa học

    # --- Người lạ (chưa đăng nhập) ---
    When guest gửi GET /api/course/khoa-react
    Then thấy 3 lessons published, KHÔNG thấy lesson draft
    And canAccess = false
    And thấy exams[] với id, name, passPercent, duration, questionCount

    # --- Student chưa mua ---
    Given student đăng nhập nhưng chưa mua "Khóa React"
    When gửi GET /api/course/khoa-react
    Then canAccess = false
    And thấy material preview (isPreview = true)
    But không xem được material không preview → status 403 "Bạn chưa mua khóa học này"

    # --- Student đã mua ---
    Given student đã mua "Khóa React"
    When gửi GET /api/course/khoa-react
    Then canAccess = true
    And xem được tất cả material published (trừ bị exam chặn)

    # --- Teacher (owner) ---
    Given teacher sở hữu "Khóa React"
    When gửi GET /api/course/khoa-react
    Then canAccess = true
    And thấy TẤT CẢ lesson/material (draft, published, outdated)

    # --- Xem video ---
    When user có quyền xem material type "video"
    And gửi GET /api/course/material/:materialId
    Then response chứa { token (JWT playback), url }

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 6: Gửi duyệt khi không có thay đổi
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Gửi duyệt khi không có gì thay đổi
    Given khóa học "Khóa React" đã published
    And không có material/lesson nào ở trạng thái draft hay outdated

    When teacher gửi POST /api/course/:courseId/submit-review
    Then status 400, message "Không có nội dung nào cần xét duyệt"

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 7: Bảo vệ quyền sở hữu
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Teacher không thể thao tác khóa học người khác
    Given teacher-A sở hữu "course-1"
    And teacher-B đăng nhập

    When teacher-B gửi PUT /api/course/course-1
    Then status 403, message "Bạn không có quyền thao tác khóa học này"

    When teacher-B gửi DELETE /api/course/course-1
    Then status 403

    When teacher-B thêm lesson vào "course-1"
    Then status 403
