Feature: Luồng xác thực người dùng
  Mô tả toàn bộ hành trình từ đăng ký → đăng nhập → sử dụng hệ thống → refresh → logout.

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 1: Đăng ký → Đăng nhập → Sử dụng → Logout
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Người dùng mới đăng ký và sử dụng hệ thống
    # --- Bước 1: Đăng ký tài khoản ---
    Given hệ thống đang hoạt động
    And tồn tại role "User" và "Teacher" trong database
    And chưa có tài khoản nào với email "student@test.com"

    When người dùng gửi POST /api/auth/register với body:
      | fullName    | email             | password   | role |
      | Nguyen Van A| student@test.com  | Pass@123   | user |
    Then hệ thống trả về status 201
    And user được tạo với roleId = "User", password mã hóa bcrypt, slug từ fullName

    # --- Bước 2: Đăng nhập ---
    When người dùng gửi POST /api/auth/login với:
      | email             | password |
      | student@test.com  | Pass@123 |
    Then hệ thống trả về status 200
    And response set cookie "access_token" (httpOnly, JWT)
    And response set cookie "refresh_token" (httpOnly)
    And refresh_token được lưu vào database

    # --- Bước 3: Truy cập thông tin cá nhân ---
    When gửi GET /api/auth/me với cookie access_token
    Then hệ thống trả về id, fullName, email, role, avatar của user vừa tạo

    # --- Bước 4: Access token hết hạn → Refresh ---
    When access_token hết hạn
    And gửi POST /api/auth/refresh-token với cookie refresh_token
    Then hệ thống cấp access_token mới và refresh_token mới
    And cookie cũ bị thay thế

    # --- Bước 5: Tiếp tục sử dụng với token mới ---
    When gửi GET /api/auth/me với access_token mới
    Then hệ thống trả về thông tin user bình thường

    # --- Bước 6: Logout ---
    When gửi POST /api/auth/logout
    Then cookie access_token bị clear
    And cookie refresh_token bị clear

    # --- Bước 7: Truy cập sau logout ---
    When gửi GET /api/auth/me (không có cookie)
    Then hệ thống trả về status 401

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 2: Đăng ký Teacher
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Giảng viên đăng ký và đăng nhập
    Given chưa có tài khoản với email "teacher@test.com"

    When gửi POST /api/auth/register với role = "teacher"
      | fullName | email              | password | role    |
      | Tran B   | teacher@test.com   | Pass@123 | teacher |
    Then user được tạo với roleId = "Teacher"

    When gửi POST /api/auth/login với email "teacher@test.com" / password "Pass@123"
    Then đăng nhập thành công, nhận JWT cookies

    When gửi GET /api/auth/me
    Then response.role = "Teacher"

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 3: Các trường hợp thất bại
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Đăng ký trùng email → Đăng nhập sai → Bị ban
    # --- Email trùng ---
    Given đã tồn tại user "student@test.com"
    When gửi POST /api/auth/register với email "student@test.com"
    Then status 400, message "Email đã tồn tại"

    # --- Đăng nhập sai password ---
    When gửi POST /api/auth/login với email "student@test.com" và password sai
    Then status 401, message "Sai mật khẩu"

    # --- Email không tồn tại ---
    When gửi POST /api/auth/login với email "nobody@test.com"
    Then status 404, message "Không tìm thấy tài khoản"

    # --- Tài khoản bị ban ---
    Given user "banned@test.com" đã bị ban
    When gửi POST /api/auth/login với email "banned@test.com"
    Then status 403, response chứa thông tin ban

    # --- Refresh token hết hạn ---
    Given refresh_token đã hết hạn
    When gửi POST /api/auth/refresh-token
    Then status 401
