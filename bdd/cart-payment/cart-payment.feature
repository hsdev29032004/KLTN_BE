Feature: Luồng mua khóa học
  Hành trình từ thêm giỏ hàng → thanh toán VNPay → callback → nhận quyền truy cập khóa học.

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 1: Thêm giỏ → Mua → Thanh toán thành công → Vào học
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Student mua khóa học từ đầu đến cuối
    Given student "student@test.com" đã đăng nhập
    And tồn tại khóa học published:
      | id       | name         | price   | owner            |
      | course-1 | Khóa React   | 300000  | teacher@test.com |
      | course-2 | Khóa Node.js | 500000  | teacher@test.com |
    And student chưa mua khóa nào

    # --- Bước 1: Thêm vào giỏ hàng ---
    When student gửi POST /api/cart với courseIds = ["course-1", "course-2"]
    Then cả 2 khóa được thêm vào giỏ hàng

    # --- Bước 2: Kiểm tra giỏ hàng ---
    When student gửi GET /api/cart
    Then response trả về:
      | count      | 2      |
      | totalPrice | 800000 |
    And mỗi item chứa: courseId, name, slug, thumbnail, price, star, instructor info
    And items sắp xếp theo createdAt desc

    # --- Bước 3: Tạo đơn mua ---
    When student gửi POST /api/course/purchase với courseIds = ["course-1", "course-2"]
    Then hệ thống tạo Invoice (status = "pending", total = 800000)
    And tạo 2 DetailInvoice (status = "pending"), mỗi cái snapshot commissionRate từ System
    And tạo vnpayTxnRef unique
    And trả về { invoiceId, amount: 800000, paymentUrl }
    And paymentUrl dẫn tới sandbox.vnpayment.vn

    # --- Bước 4: Student thanh toán trên VNPay ---
    # (Student redirect tới paymentUrl, hoàn tất thanh toán trên VNPay)

    # --- Bước 5: VNPay callback thành công ---
    When VNPay redirect về GET /api/payment/vnpay-return với vnp_ResponseCode = "00"
    Then hệ thống parse invoiceId từ vnp_OrderInfo
    And gọi handlePaymentSuccess(invoiceId) trong transaction:
      | Invoice.status         | purchased |
      | DetailInvoice.status   | paid      |
    And tạo UserCourse records (student ↔ course-1, student ↔ course-2)
    And tăng studentCount cho course-1 và course-2
    And thêm student làm member (non-host) vào Conversation của mỗi khóa
    And xóa course-1, course-2 khỏi giỏ hàng student
    And redirect browser tới FE_DOMAIN/payment?status=success

    # --- Bước 6: Giỏ hàng đã dọn sạch ---
    When student gửi GET /api/cart
    Then count = 0, totalPrice = 0, items = []

    # --- Bước 7: Student truy cập khóa học ---
    When student gửi GET /api/course/khoa-react
    Then canAccess = true
    And thấy tất cả lesson/material published

    When student gửi GET /api/course/material/:materialId (material không preview)
    Then hệ thống cho phép xem

    # --- Bước 8: Xem trang khóa đã mua ---
    When student gửi GET /api/course/purchased
    Then trả về 2 khóa: "Khóa React", "Khóa Node.js"

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 2: Thanh toán thất bại
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Thanh toán VNPay thất bại → Invoice failed
    Given student đã tạo đơn mua (Invoice "inv-1" status "pending")

    # --- VNPay callback thất bại ---
    When VNPay redirect về GET /api/payment/vnpay-return với vnp_ResponseCode = "24" (cancel)
    Then hệ thống gọi handlePaymentFailed(invoiceId):
      | Invoice.status         | failed |
      | DetailInvoice.status   | failed |
    And redirect tới FE_DOMAIN/payment?status=fail

    # --- Student vẫn chưa có quyền truy cập ---
    When student gửi GET /api/course/khoa-react
    Then canAccess = false

    # --- Giỏ hàng không bị xóa (chỉ xóa khi thành công) ---
    When student gửi GET /api/cart
    Then giỏ hàng vẫn còn các khóa

    # --- Student có thể mua lại ---
    When student gửi POST /api/course/purchase lại với cùng courseIds
    Then hệ thống tạo Invoice mới (pending)

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 3: Các guard khi thêm giỏ hàng
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Giỏ hàng lọc tự động các khóa không hợp lệ
    Given student đã đăng nhập
    And student sở hữu "my-course" (teacher của nó)
    And student đã mua "bought-course"
    And "draft-course" có status "draft"
    And "published-course" published, student chưa mua

    # --- Thêm hỗn hợp ---
    When student gửi POST /api/cart với courseIds = ["my-course", "bought-course", "draft-course", "published-course"]
    Then chỉ "published-course" được thêm vào giỏ
    And "my-course" bị bỏ qua (khóa của mình)
    And "bought-course" bị bỏ qua (đã mua)
    And "draft-course" bị bỏ qua (chưa published)

    # --- Thêm trùng ---
    When student gửi POST /api/cart với courseIds = ["published-course"] lần nữa
    Then không tạo duplicate (skipDuplicates)

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 4: Xóa khỏi giỏ hàng
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Quản lý giỏ hàng — xóa từng phần
    Given student có 3 khóa trong giỏ: course-1, course-2, course-3

    When student gửi DELETE /api/cart với courseIds = ["course-1"]
    Then giỏ còn 2 khóa: course-2, course-3

    When student gửi DELETE /api/cart với courseIds = ["course-2", "course-3"]
    Then giỏ hàng trống

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 5: Mua khóa đã mua
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Mua lại khóa đã sở hữu
    Given student đã mua "course-1"

    When student gửi POST /api/course/purchase với courseIds = ["course-1"]
    Then hệ thống trả về lỗi "Bạn đã mua khóa học này"

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 6: Lịch sử giao dịch
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Xem lịch sử hóa đơn
    Given student đã thực hiện 5 giao dịch: 3 purchased, 1 pending, 1 failed

    When student gửi GET /api/course/invoices?page=1&limit=10
    Then trả về 5 invoices phân trang
    And mỗi invoice chứa: id, total, status, vnpayTxnRef, createdAt, detailInvoices[]

    # --- Admin xem chi tiết ---
    Given admin đã đăng nhập
    When admin gửi GET /api/course/invoice/:invoiceId
    Then trả về invoice chi tiết với user info, course info, detailInvoices
