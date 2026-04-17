Feature: Luồng trò chuyện khóa học
  Hành trình từ mua khóa học → tự động vào conversation → chat realtime giữa student và teacher.

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 1: Mua khóa → Vào conversation → Chat realtime
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Student mua khóa học và chat với teacher qua Socket.IO
    # --- Tiền điều kiện: Khóa học đã publish, conversation đã tạo ---
    Given teacher "teacher@test.com" sở hữu khóa "Khóa React" (published)
    And admin đã publish khóa → Conversation "conv-react" được tạo
    And teacher là host của "conv-react"

    # --- Bước 1: Student mua khóa → tự động vào conversation ---
    Given student "student@test.com" mua "Khóa React" thành công (VNPay callback OK)
    Then student được thêm làm member (non-host) của "conv-react"

    # --- Bước 2: Student xem danh sách conversation ---
    When student gửi GET /api/conversation/my
    Then trả về "conv-react" với:
      | name         | Khóa React (hoặc conversation name) |
      | lastMessage  | null (chưa có tin nhắn)               |
      | memberCount  | 2 (teacher + student)                 |

    # --- Bước 3: Student kết nối Socket.IO ---
    When student kết nối tới namespace /chat với JWT trong cookie "access_token"
    Then server verify JWT → tìm user trong DB
    And server emit "connected" với { userId: student_id, message: "Connected successfully" }

    # --- Bước 4: Student join room ---
    When student emit "joinRoom" với { conversationId: "conv-react" }
    Then server kiểm tra student là member → OK
    And socket join room "conv-react"
    And server emit "joinedRoom" với { conversationId: "conv-react", message }

    # --- Bước 5: Teacher cũng kết nối và join room ---
    When teacher kết nối tới /chat và emit "joinRoom" { conversationId: "conv-react" }
    Then teacher cũng join room "conv-react"

    # --- Bước 6: Student gửi tin nhắn qua socket ---
    When student emit "sendMessage" với { conversationId: "conv-react", content: "Thầy ơi, em có thắc mắc" }
    Then server lưu message vào DB
    And server broadcast "newMessage" tới room "conv-react":
      | id             | uuid                         |
      | content        | Thầy ơi, em có thắc mắc     |
      | conversationId | conv-react                   |
      | sender.id      | student_id                   |
      | sender.fullName| Nguyen Van A                 |
      | sender.avatar  | avatar_url                   |
    And cả student và teacher đều nhận event "newMessage"

    # --- Bước 7: Teacher reply ---
    When teacher emit "sendMessage" với { conversationId: "conv-react", content: "Em hỏi đi nhé!" }
    Then cả 2 nhận "newMessage" từ teacher

    # --- Bước 8: Xem lịch sử tin nhắn qua REST ---
    When student gửi GET /api/conversation/conv-react?page=1&limit=20
    Then trả về conversation detail:
      | members[]  | teacher + student                      |
      | messages[] | 2 tin nhắn, phân trang, desc createdAt |
      | course     | thông tin "Khóa React"                 |

    # --- Bước 9: Leave room ---
    When student emit "leaveRoom" với { conversationId: "conv-react" }
    Then server emit "leftRoom" với { conversationId: "conv-react" }
    And student không còn nhận "newMessage" từ room này

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 2: Nhiều student trong cùng conversation
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Nhiều student chat trong cùng khóa học
    Given teacher sở hữu "Khóa React" với conversation "conv-react"
    And student-A và student-B đều đã mua "Khóa React"
    And cả 2 kết nối socket và join room "conv-react"

    # --- Student-A gửi tin ---
    When student-A emit "sendMessage" { content: "Bài 2 khó quá" }
    Then teacher, student-A, student-B đều nhận "newMessage"

    # --- Teacher reply ---
    When teacher emit "sendMessage" { content: "Các em xem lại slide nhé" }
    Then cả 3 đều nhận

    # --- Student-B gửi ---
    When student-B emit "sendMessage" { content: "Em hiểu rồi, cảm ơn thầy" }
    Then cả 3 đều nhận

    # --- Xem danh sách conversation ---
    When student-A gửi GET /api/conversation/my
    Then "conv-react" có lastMessage = tin nhắn cuối cùng của student-B
    And memberCount = 3

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 3: Gửi tin nhắn qua REST (fallback khi không dùng socket)
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Gửi tin nhắn qua REST API thay vì socket
    Given student là member của "conv-react"

    When student gửi POST /api/conversation/conv-react/messages với content = "Gửi qua REST"
    Then tin nhắn được lưu DB
    And conversation.updatedAt được cập nhật
    And trả về message { id, content, createdAt, sender }

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 4: Bảo vệ quyền truy cập
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Không phải member → không truy cập được
    Given user "outsider@test.com" chưa mua "Khóa React"
    And KHÔNG phải member của "conv-react"

    # --- REST: xem chi tiết ---
    When outsider gửi GET /api/conversation/conv-react
    Then status 403

    # --- REST: gửi tin nhắn ---
    When outsider gửi POST /api/conversation/conv-react/messages
    Then status 403

    # --- Socket: join room ---
    When outsider kết nối socket và emit "joinRoom" { conversationId: "conv-react" }
    Then server emit "error" với message "Not a member"

    # --- Socket: send message ---
    When outsider emit "sendMessage" { conversationId: "conv-react", content: "hack" }
    Then server emit "error"
    And không lưu message

  # ══════════════════════════════════════════════════════════════════════════
  # LUỒNG 5: Xác thực socket
  # ══════════════════════════════════════════════════════════════════════════

  Scenario: Kết nối socket với JWT không hợp lệ
    # --- JWT hết hạn ---
    When client kết nối tới /chat với JWT đã hết hạn
    Then server emit "error"
    And ngắt kết nối

    # --- Không có JWT ---
    When client kết nối tới /chat mà không gửi JWT
    Then server emit "error"
    And ngắt kết nối

    # --- JWT hợp lệ nhưng user bị xóa ---
    When client kết nối với JWT của user đã bị xóa khỏi DB
    Then server emit "error"
    And ngắt kết nối
