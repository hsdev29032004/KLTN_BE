# Đặc tả Cơ sở Dữ liệu

---

## 4.2.1. Đặc tả bảng Người dùng (users)

*Bảng 4-1: Đặc tả bảng Người dùng (users)*

| 1. Mô tả chung: Lưu trữ thông tin người dùng trong hệ thống | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã người dùng | x |
| 2 | fullName | varchar(255) | | Họ và tên | x |
| 3 | email | varchar(255) | UNIQUE | Địa chỉ email | x |
| 4 | password | varchar(255) | | Mật khẩu | x |
| 5 | avatar | varchar(255) | | Đường dẫn ảnh đại diện | |
| 6 | banId | uuid | FK (bans) | Mã lệnh cấm | |
| 7 | roleId | uuid | FK (roles) | Mã vai trò | x |
| 8 | isDeleted | boolean | DEFAULT false | Trạng thái xóa | x |
| 9 | timeBan | timestamp | | Thời gian bắt đầu cấm | |
| 10 | timeUnBan | timestamp | | Thời gian hết cấm | |
| 11 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 12 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |
| 13 | deletedAt | timestamp | | Thời gian xóa | |
| 14 | refreshToken | text | | Refresh token xác thực | |
| 15 | availableAmount | int | DEFAULT 0 | Số dư khả dụng | |
| 16 | slug | varchar(255) | UNIQUE | Định danh URL | x |
| 17 | introduce | text | DEFAULT '' | Giới thiệu bản thân | x |

---

## 4.2.2. Đặc tả bảng Vai trò (roles)

*Bảng 4-2: Đặc tả bảng Vai trò (roles)*

| 1. Mô tả chung: Lưu trữ thông tin các vai trò trong hệ thống | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã vai trò | x |
| 2 | name | varchar(255) | UNIQUE | Tên vai trò | x |
| 3 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 4 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |

---

## 4.2.3. Đặc tả bảng Quyền hạn (permissions)

*Bảng 4-3: Đặc tả bảng Quyền hạn (permissions)*

| 1. Mô tả chung: Lưu trữ thông tin các quyền hạn truy cập API | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã quyền hạn | x |
| 2 | api | varchar(255) | UNIQUE | Đường dẫn API | x |
| 3 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 4 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |

---

## 4.2.4. Đặc tả bảng Vai trò - Quyền hạn (role_permissions)

*Bảng 4-4: Đặc tả bảng Vai trò - Quyền hạn (role_permissions)*

| 1. Mô tả chung: Lưu trữ thông tin phân quyền theo vai trò | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã phân quyền | x |
| 2 | roleId | uuid | FK (roles) | Mã vai trò | x |
| 3 | permissionId | uuid | FK (permissions) | Mã quyền hạn | x |
| 4 | methods | varchar(255) | | Phương thức HTTP được phép | x |
| 5 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 6 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |

---

## 4.2.5. Đặc tả bảng Lệnh cấm (bans)

*Bảng 4-5: Đặc tả bảng Lệnh cấm (bans)*

| 1. Mô tả chung: Lưu trữ thông tin các lệnh cấm người dùng | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã lệnh cấm | x |
| 2 | reason | text | | Lý do cấm | x |
| 3 | isDeleted | boolean | DEFAULT false | Trạng thái xóa | x |
| 4 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 5 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |
| 6 | deletedAt | timestamp | | Thời gian xóa | |

---

## 4.2.6. Đặc tả bảng Khóa học (courses)

*Bảng 4-6: Đặc tả bảng Khóa học (courses)*

| 1. Mô tả chung: Lưu trữ thông tin các khóa học trong hệ thống | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã khóa học | x |
| 2 | name | varchar(255) | | Tên khóa học | x |
| 3 | price | int | | Giá khóa học (VNĐ) | x |
| 4 | thumbnail | varchar(255) | | Đường dẫn ảnh bìa | x |
| 5 | content | text | | Nội dung chi tiết | x |
| 6 | slug | varchar(255) | UNIQUE | Định danh URL | x |
| 7 | description | text | | Mô tả khóa học | x |
| 8 | status | enum | DEFAULT draft | Trạng thái khóa học | x |
| 9 | studentCount | int | DEFAULT 0 | Số lượng học viên | x |
| 10 | star | decimal(2,1) | | Điểm đánh giá trung bình | x |
| 11 | userId | uuid | FK (users) | Mã người tạo | x |
| 12 | publishedBy | uuid | FK (users) | Mã người duyệt | |
| 13 | isDeleted | boolean | DEFAULT false | Trạng thái xóa | x |
| 14 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 15 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |
| 16 | deletedAt | timestamp | | Thời gian xóa | |
| 17 | publishedAt | timestamp | | Thời gian duyệt xuất bản | |

---

## 4.2.7. Đặc tả bảng Bài học (lessons)

*Bảng 4-7: Đặc tả bảng Bài học (lessons)*

| 1. Mô tả chung: Lưu trữ thông tin các bài học thuộc khóa học | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã bài học | x |
| 2 | courseId | uuid | FK (courses) | Mã khóa học | x |
| 3 | name | varchar(255) | | Tên bài học | x |
| 4 | status | enum | DEFAULT draft | Trạng thái bài học | x |
| 5 | publisherId | uuid | FK (users) | Mã người duyệt | |
| 6 | isDeleted | boolean | DEFAULT false | Trạng thái xóa | x |
| 7 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 8 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |
| 9 | deletedAt | timestamp | | Thời gian xóa | |
| 10 | publishedAt | timestamp | | Thời gian duyệt xuất bản | |

---

## 4.2.8. Đặc tả bảng Tài liệu bài học (lesson_materials)

*Bảng 4-8: Đặc tả bảng Tài liệu bài học (lesson_materials)*

| 1. Mô tả chung: Lưu trữ thông tin các tài liệu, video của bài học | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã tài liệu | x |
| 2 | lessonId | uuid | FK (lessons) | Mã bài học | x |
| 3 | type | enum | | Loại tài liệu (video/pdf/img/link/other) | x |
| 4 | name | varchar(255) | | Tên tài liệu | x |
| 5 | url | text | | Đường dẫn tài liệu | x |
| 6 | status | enum | DEFAULT draft | Trạng thái tài liệu | x |
| 7 | publisherId | uuid | FK (users) | Mã người duyệt | |
| 8 | isDeleted | boolean | DEFAULT false | Trạng thái xóa | x |
| 9 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 10 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |
| 11 | deletedAt | timestamp | | Thời gian xóa | |
| 12 | publishedAt | timestamp | | Thời gian duyệt xuất bản | |
| 13 | isPreview | boolean | DEFAULT false | Cho phép xem trước | x |

---

## 4.2.9. Đặc tả bảng Chủ đề (topics)

*Bảng 4-9: Đặc tả bảng Chủ đề (topics)*

| 1. Mô tả chung: Lưu trữ thông tin các chủ đề phân loại khóa học | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã chủ đề | x |
| 2 | name | varchar(255) | | Tên chủ đề | x |
| 3 | slug | varchar(255) | UNIQUE | Định danh URL | x |
| 4 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 5 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |

---

## 4.2.10. Đặc tả bảng Khóa học - Chủ đề (course_topics)

*Bảng 4-10: Đặc tả bảng Khóa học - Chủ đề (course_topics)*

| 1. Mô tả chung: Lưu trữ quan hệ giữa khóa học và chủ đề | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã quan hệ | x |
| 2 | courseId | uuid | FK (courses) | Mã khóa học | x |
| 3 | topicId | uuid | FK (topics) | Mã chủ đề | x |
| 4 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 5 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |

---

## 4.2.11. Đặc tả bảng Cuộc trò chuyện (conversations)

*Bảng 4-11: Đặc tả bảng Cuộc trò chuyện (conversations)*

| 1. Mô tả chung: Lưu trữ thông tin các cuộc trò chuyện gắn với khóa học | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã cuộc trò chuyện | x |
| 2 | name | varchar(255) | DEFAULT '' | Tên cuộc trò chuyện | x |
| 3 | courseId | uuid | FK (courses), UNIQUE | Mã khóa học | x |
| 4 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 5 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |
| 6 | isDeleted | boolean | DEFAULT false | Trạng thái xóa | x |
| 7 | deletedAt | timestamp | | Thời gian xóa | |

---

## 4.2.12. Đặc tả bảng Tin nhắn (messages)

*Bảng 4-12: Đặc tả bảng Tin nhắn (messages)*

| 1. Mô tả chung: Lưu trữ thông tin các tin nhắn trong cuộc trò chuyện | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã tin nhắn | x |
| 2 | conversationId | uuid | FK (conversations) | Mã cuộc trò chuyện | x |
| 3 | senderId | uuid | FK (users) | Mã người gửi | x |
| 4 | content | text | | Nội dung tin nhắn | x |
| 5 | isDeleted | boolean | DEFAULT false | Trạng thái xóa | x |
| 6 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 7 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |
| 8 | deletedAt | timestamp | | Thời gian xóa | |

---

## 4.2.13. Đặc tả bảng Đánh giá khóa học (course_reviews)

*Bảng 4-13: Đặc tả bảng Đánh giá khóa học (course_reviews)*

| 1. Mô tả chung: Lưu trữ thông tin đánh giá, nhận xét khóa học của học viên | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã đánh giá | x |
| 2 | reviewerId | uuid | FK (users) | Mã người đánh giá | x |
| 3 | courseId | uuid | FK (courses) | Mã khóa học | x |
| 4 | rating | int | | Điểm đánh giá (1-5) | x |
| 5 | content | text | | Nội dung nhận xét | x |
| 6 | isDeleted | boolean | DEFAULT false | Trạng thái xóa | x |
| 7 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 8 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |
| 9 | deletedAt | timestamp | | Thời gian xóa | |

---

## 4.2.14. Đặc tả bảng Báo cáo khóa học (course_reports)

*Bảng 4-14: Đặc tả bảng Báo cáo khóa học (course_reports)*

| 1. Mô tả chung: Lưu trữ thông tin báo cáo vi phạm khóa học | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã báo cáo | x |
| 2 | courseId | uuid | FK (courses) | Mã khóa học bị báo cáo | x |
| 3 | reporterId | uuid | FK (users) | Mã người báo cáo | x |
| 4 | processorId | uuid | FK (users) | Mã người xử lý | |
| 5 | reason | text | | Lý do báo cáo | x |
| 6 | status | enum | DEFAULT pending | Trạng thái xử lý | x |
| 7 | isDeleted | boolean | DEFAULT false | Trạng thái xóa | x |
| 8 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 9 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |
| 10 | deletedAt | timestamp | | Thời gian xóa | |

---

## 4.2.15. Đặc tả bảng Hóa đơn (invoices)

*Bảng 4-15: Đặc tả bảng Hóa đơn (invoices)*

| 1. Mô tả chung: Lưu trữ thông tin hóa đơn mua khóa học của người dùng | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã hóa đơn | x |
| 2 | userId | uuid | FK (users) | Mã người mua | x |
| 3 | amount | int | | Tổng số tiền (VNĐ) | x |
| 4 | status | enum | DEFAULT purchased | Trạng thái hóa đơn | x |
| 5 | isDeleted | boolean | DEFAULT false | Trạng thái xóa | x |
| 6 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 7 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |
| 8 | deletedAt | timestamp | | Thời gian xóa | |

---

## 4.2.16. Đặc tả bảng Chi tiết hóa đơn (detail_invoices)

*Bảng 4-16: Đặc tả bảng Chi tiết hóa đơn (detail_invoices)*

| 1. Mô tả chung: Lưu trữ thông tin chi tiết từng khóa học trong hóa đơn | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã chi tiết hóa đơn | x |
| 2 | coursePurchaseId | uuid | FK (invoices) | Mã hóa đơn | x |
| 3 | courseId | uuid | FK (courses) | Mã khóa học | x |
| 4 | price | int | | Giá khóa học tại thời điểm mua (VNĐ) | x |
| 5 | status | varchar(255) | | Trạng thái chi tiết | x |
| 6 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 7 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |

---

## 4.2.17. Đặc tả bảng Khóa học của học viên (user_courses)

*Bảng 4-17: Đặc tả bảng Khóa học của học viên (user_courses)*

| 1. Mô tả chung: Lưu trữ quan hệ sở hữu khóa học của người dùng | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã quan hệ | x |
| 2 | userId | uuid | FK (users) | Mã người dùng | x |
| 3 | courseId | uuid | FK (courses) | Mã khóa học | x |
| 4 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 5 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |

---

## 4.2.18. Đặc tả bảng Giao dịch (transactions)

*Bảng 4-18: Đặc tả bảng Giao dịch (transactions)*

| 1. Mô tả chung: Lưu trữ thông tin các giao dịch nạp/rút tiền của người dùng | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã giao dịch | x |
| 2 | userId | uuid | FK (users) | Mã người dùng | x |
| 3 | type | enum | | Loại giao dịch (deposit/withdrawal) | x |
| 4 | amount | int | | Số tiền giao dịch (VNĐ) | x |
| 5 | bankName | varchar(255) | | Tên ngân hàng | |
| 6 | accountNumber | varchar(255) | | Số tài khoản ngân hàng | |
| 7 | status | enum | DEFAULT pending | Trạng thái giao dịch | x |
| 8 | isDeleted | boolean | DEFAULT false | Trạng thái xóa | x |
| 9 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 10 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |
| 11 | deletedAt | timestamp | | Thời gian xóa | |

---

## 4.2.19. Đặc tả bảng Cài đặt hệ thống (systems)

*Bảng 4-19: Đặc tả bảng Cài đặt hệ thống (systems)*

| 1. Mô tả chung: Lưu trữ thông tin cấu hình chung của hệ thống | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | varchar(255) | PK, DEFAULT 'system' | Mã hệ thống | x |
| 2 | timeRefund | int | | Thời gian cho phép hoàn tiền (ngày) | x |
| 3 | limitRefund | int | | Giới hạn số lần hoàn tiền | x |
| 4 | comissionRate | decimal(5,2) | | Tỷ lệ hoa hồng hệ thống (%) | x |
| 5 | term | text | | Điều khoản sử dụng | x |
| 6 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |

---

## 4.2.20. Đặc tả bảng Ngân hàng (banks)

*Bảng 4-20: Đặc tả bảng Ngân hàng (banks)*

| 1. Mô tả chung: Lưu trữ thông tin tài khoản ngân hàng của hệ thống | | | | | |
|---|---|---|---|---|---|
| **2. Mô tả chi tiết** | | | | | |
| **STT** | **Thuộc tính** | **Kiểu dữ liệu** | **Ràng buộc** | **Mô tả** | **Not null** |
| 1 | id | uuid | PK | Mã tài khoản ngân hàng | x |
| 2 | systemId | varchar(255) | FK (systems) | Mã hệ thống | x |
| 3 | bankNumber | varchar(255) | | Số tài khoản ngân hàng | x |
| 4 | bankName | varchar(255) | | Tên ngân hàng | x |
| 5 | recipient | varchar(255) | | Tên chủ tài khoản | x |
| 6 | isDeleted | boolean | DEFAULT false | Trạng thái xóa | x |
| 7 | createdAt | timestamp | DEFAULT now() | Thời gian tạo | x |
| 8 | updatedAt | timestamp | AUTO UPDATE | Thời gian cập nhật | x |
| 9 | deletedAt | timestamp | | Thời gian xóa | |

---

## 4.3. Các kiểu liệt kê (Enums)

### 4.3.1. CourseStatus — Trạng thái khóa học

| Giá trị | Mô tả |
|---|---|
| draft | Bản nháp |
| pending | Chờ duyệt |
| published | Đã xuất bản |

### 4.3.2. LessonStatus — Trạng thái bài học / tài liệu

| Giá trị | Mô tả |
|---|---|
| draft | Bản nháp |
| pending | Chờ duyệt |
| published | Đã xuất bản |

### 4.3.3. MaterialType — Loại tài liệu

| Giá trị | Mô tả |
|---|---|
| video | Video bài học |
| pdf | Tài liệu PDF |
| img | Hình ảnh |
| link | Đường dẫn ngoài |
| other | Loại khác |

### 4.3.4. CourseReportStatus — Trạng thái báo cáo

| Giá trị | Mô tả |
|---|---|
| pending | Chờ xử lý |
| resolved | Đã xử lý |
| dismissed | Đã từ chối |

### 4.3.5. CoursePurchaseStatus — Trạng thái hóa đơn

| Giá trị | Mô tả |
|---|---|
| purchased | Đã mua |
| refund_requested | Yêu cầu hoàn tiền |
| refunded | Đã hoàn tiền |

### 4.3.6. TransactionType — Loại giao dịch

| Giá trị | Mô tả |
|---|---|
| deposit | Nạp tiền |
| withdrawal | Rút tiền |

### 4.3.7. TransactionStatus — Trạng thái giao dịch

| Giá trị | Mô tả |
|---|---|
| pending | Chờ xử lý |
| completed | Hoàn thành |
| failed | Thất bại |
| approved | Đã duyệt |
| rejected | Đã từ chối |
