Feature: Luồng quản trị hệ thống
  Admin cấu hình hệ thống, quản lý ngân hàng, xem thống kê, quản lý roles/permissions.

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 1: Cấu hình hệ thống → Ảnh hưởng đến giao dịch
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Admin cấu hình hoa hồng và thông tin hệ thống
    Given admin "admin@test.com" đã đăng nhập

    # --- Bước 1: Xem cấu hình hiện tại ---
    When admin gửi GET /api/system
    Then trả về system record: comissionRate = 10, contact, term

    # --- Bước 2: Tăng tỷ lệ hoa hồng ---
    When admin gửi PATCH /api/system với comissionRate = 15
    Then system.comissionRate = 15

    # --- Bước 3: Khi student mua khóa → commissionRate = 15 được snapshot ---
    Given student mua khóa "Khóa React" (500000đ)
    Then DetailInvoice.commissionRate = 15 (snapshot từ system tại thời điểm mua)

    # --- Bước 4: Admin đổi commission lại → không ảnh hưởng invoice cũ ---
    When admin gửi PATCH /api/system với comissionRate = 20
    Then invoice cũ vẫn giữ commissionRate = 15

    # --- Bước 5: Cập nhật liên hệ & điều khoản ---
    When admin gửi PATCH /api/system với:
      | contact | hotline: 1900xxxx, email: admin@edu.vn |
      | term    | Điều khoản sử dụng phiên bản mới...     |
    Then system.contact và system.term được cập nhật

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 2: Quản lý ngân hàng
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Admin CRUD danh sách ngân hàng
    Given admin đã đăng nhập

    # --- Bước 1: Xem danh sách (public, chưa có bank nào) ---
    When bất kỳ ai gửi GET /api/system/banks
    Then trả về danh sách trống

    # --- Bước 2: Tạo bank ---
    When admin gửi POST /api/system/banks với:
      | bankNumber | bankName     | recipient    |
      | 123456789  | Vietcombank  | NGUYEN VAN A |
    Then bank "Vietcombank" được tạo

    When admin thêm bank "Techcombank" (987654321, TRAN VAN B)
    Then có 2 banks

    # --- Bước 3: Public xem được danh sách ---
    When guest gửi GET /api/system/banks
    Then trả về 2 banks: Vietcombank, Techcombank

    # --- Bước 4: Sửa bank ---
    When admin gửi PATCH /api/system/banks/:bankId với recipient = "NGUYEN THI C"
    Then bank được cập nhật

    # --- Bước 5: Xóa bank ---
    When admin gửi DELETE /api/system/banks/:bankId
    Then bank bị soft delete
    And không còn xuất hiện trong danh sách

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 3: Thống kê giảng viên
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Teacher xem thống kê cá nhân
    Given teacher "teacher@test.com" đã đăng nhập
    And teacher có 3 khóa học, tổng 150 học viên, 45 reviews, 12 invoices

    # --- Bước 1: Xem tổng quan ---
    When teacher gửi GET /api/stat/lecturer
    Then trả về overview:
      | totalCourses  | 3    |
      | totalStudents | 150  |
      | totalReviews  | 45   |
      | avgRating     | 4.2  |
      | totalRevenue  | từ DetailInvoice |
    And courses[] = danh sách 3 khóa chi tiết
    And invoiceDetails[] = cho biểu đồ doanh thu theo thời gian

    # --- Bước 2: Xem danh sách học viên từng khóa ---
    When teacher gửi GET /api/stat/course/:courseId/students
    Then trả về students[]: id, fullName, avatar, email, purchasedAt

    # --- Teacher xem học viên khóa người khác → bị chặn ---
    When teacher gửi GET /api/stat/course/:otherCourseId/students
    Then status 403

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 4: Thống kê admin tổng quan
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Admin xem thống kê toàn hệ thống
    Given admin đã đăng nhập
    And hệ thống có 500 users, 50 courses, 200 invoices

    When admin gửi GET /api/stat/admin
    Then trả về tổng quan:
      | totalUsers        | 500  |
      | totalCourses      | 50   |
      | totalRevenue      | tổng doanh thu |
      | totalTransactions | 200  |
      | totalReviews      | số review |
      | totalReports      | số report |
    And usersByRole = { admin: X, teacher: Y, user: Z }
    And coursesByStatus = { draft: X, published: Y, pending: Z, ... }
    And courses[] = danh sách tất cả khóa
    And users[] = danh sách tất cả users

    # --- Admin xem học viên bất kỳ khóa nào ---
    When admin gửi GET /api/stat/course/:anyId/students
    Then trả về danh sách (admin có quyền xem tất cả)

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 5: Admin quản lý khóa học
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Admin xem và duyệt khóa học
    Given admin đã đăng nhập
    And có 10 khóa pending, 5 khóa update, 30 khóa published

    # --- Xem tất cả khóa theo status ---
    When admin gửi GET /api/course/admin/all?status=pending&page=1&limit=20
    Then trả về 10 khóa pending, phân trang
    And mỗi khóa kèm approval gần nhất (description, status, reason)

    When admin gửi GET /api/course/admin/all?status=update
    Then trả về 5 khóa đang chờ duyệt cập nhật

    # --- Admin duyệt 1 khóa (flow chi tiết ở course.feature) ---
    When admin gửi POST /api/course/:courseId/publish
    Then khóa → published

    # --- Admin từ chối 1 khóa ---
    When admin gửi POST /api/course/:courseId/reject với reason
    Then khóa → rejected (hoặc need_update nếu đang update)

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 6: Quản lý Role & Permission
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Thiết lập hệ thống phân quyền
    # --- Bước 1: Tạo permissions ---
    When gửi POST /api/permissions với api = "POST /api/course"
    Then permission "POST /api/course" được tạo

    When gửi POST /api/permissions với api = "DELETE /api/course/:id"
    Then permission "DELETE /api/course/:id" được tạo

    # --- Permission trùng → conflict ---
    When gửi POST /api/permissions với api = "POST /api/course" lần nữa
    Then status 409 (Conflict)

    # --- Bước 2: Tạo roles ---
    When gửi POST /api/roles với name = "Teacher"
    Then role "Teacher" được tạo

    # --- Role trùng → conflict ---
    When gửi POST /api/roles với name = "Teacher" lần nữa
    Then status 409 (Conflict)

    # --- Bước 3: Xem roles với permissions ---
    When gửi GET /api/roles
    Then trả về danh sách roles, mỗi role kèm permissions liên kết
    And sắp xếp theo createdAt desc

    When gửi GET /api/roles/:roleId
    Then trả về role chi tiết với danh sách permissions

    # --- Bước 4: Xem permissions với roles ---
    When gửi GET /api/permissions
    Then trả về danh sách permissions, mỗi permission kèm roles sử dụng nó

    When gửi GET /api/permissions/:permId
    Then trả về permission chi tiết với danh sách roles

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 7: Quản lý Topic
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: CRUD topic phân loại khóa học
    # --- Tạo topics ---
    When gửi POST /api/topic với name = "Web Development"
    Then topic được tạo

    When gửi POST /api/topic với name = "Mobile"
    Then topic "Mobile" được tạo

    # --- Xem danh sách ---
    When gửi GET /api/topic
    Then trả về 2 topics: "Web Development", "Mobile"

    # --- Xem chi tiết ---
    When gửi GET /api/topic/:topicId
    Then trả về topic info

    # --- Sửa ---
    When gửi PATCH /api/topic/:topicId với name = "Web Dev"
    Then topic được cập nhật

    # --- Xóa ---
    When gửi DELETE /api/topic/:topicId
    Then topic bị xóa
