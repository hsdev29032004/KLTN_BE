# Hệ Thống Phê Duyệt Khóa Học — API Documentation

## Mục Lục

- [Tổng quan luồng trạng thái](#tổng-quan-luồng-trạng-thái)
- [Quy tắc chỉnh sửa nội dung](#quy-tắc-chỉnh-sửa-nội-dung)
- [API 1: Gửi xét duyệt](#api-1-gửi-xét-duyệt)
- [API 2: Phê duyệt khóa học](#api-2-phê-duyệt-khóa-học)
- [API 3: Từ chối khóa học](#api-3-từ-chối-khóa-học)
- [Quy tắc hiển thị cho người dùng](#quy-tắc-hiển-thị-cho-người-dùng)

---

## Tổng quan luồng trạng thái

### Trạng thái khóa học (`CourseStatus`)

| Trạng thái | Mô tả |
|---|---|
| `draft` | Nháp — chưa từng published |
| `pending` | Đang chờ admin duyệt lần đầu |
| `published` | Đã published — người dùng có thể mua |
| `update` | Đã published, giảng viên gửi cập nhật chờ duyệt |
| `rejected` | Bị từ chối (chưa từng published) |
| `need_update` | Bị từ chối cập nhật (đã published trước đó — người dùng vẫn mua được) |

### Sơ đồ chuyển trạng thái khóa học

```
draft ──── submitReview ────► pending ──── approve ────► published
                                  │                         │
                                reject                  submitReview
                                  │                     (có thay đổi)
                                  ▼                         │
                              rejected                      ▼
                                  │                      update ──── approve ────► published
                             submitReview                   │
                                  │                       reject
                                  ▼                         │
                              pending                       ▼
                                                       need_update
                                                            │
                                                       submitReview
                                                       (có thay đổi)
                                                            │
                                                            ▼
                                                         update
```

### Trạng thái bài học & tài liệu (`LessonStatus`)

| Trạng thái | Mô tả |
|---|---|
| `draft` | Nháp — chưa published, có thể tự do chỉnh sửa/xóa |
| `published` | Đã published — hiển thị cho người dùng |
| `outdated` | Đã bị sửa/xóa bởi giảng viên, chờ admin duyệt. **Vẫn hiển thị** cho người dùng |
| `deleted` | Đã bị xóa sau khi admin duyệt — không hiển thị |

### Khi admin phê duyệt

| Trạng thái cũ | → Trạng thái mới |
|---|---|
| `draft` | → `published` |
| `outdated` | → `deleted` |
| `published` | Giữ nguyên |

---

## Quy tắc chỉnh sửa nội dung

### Chỉnh sửa KHÔNG cần phê duyệt

- Tên khóa học, giá, description, thumbnail
- Tên bài học

### Chỉnh sửa CẦN phê duyệt (thông qua gửi xét duyệt)

- Thêm mới bài học
- Thêm/sửa/xóa tài liệu bài học (material)
- Xóa bài học

### Quy tắc trạng thái khi thao tác

| Thao tác | Đối tượng | Điều kiện | Kết quả |
|---|---|---|---|
| Sửa tài liệu | Material | Đang `draft` | Cập nhật trực tiếp, không tạo bản outdated |
| Sửa tài liệu | Material | Đang `published` | Bản cũ → `outdated`, tạo bản mới `draft` |
| Sửa tài liệu | Material | Đang `outdated`/`deleted` | `400` — không cho sửa |
| Xóa tài liệu | Material | Đang `draft` | Xóa thật khỏi DB |
| Xóa tài liệu | Material | Đang `published` | → `outdated` |
| Xóa bài học | Lesson | Đang `draft` | Xóa thật lesson + toàn bộ material |
| Xóa bài học | Lesson | Đang `published` | Lesson → `outdated`, toàn bộ material → `outdated` |
| Thêm bài học mới | Lesson | — | Tạo với trạng thái `draft` |
| Thêm tài liệu mới | Material | — | Tạo với trạng thái `draft` |

---

## API 1: Gửi xét duyệt

### Thông tin chung

| Thuộc tính | Giá trị |
|---|---|
| **Endpoint** | `POST /course/:courseId/submit-review` |
| **Role** | `teacher` |
| **Auth** | Bắt buộc |

### Request Body

```json
{
  "description": "Thêm 2 bài học mới về React Hooks và sửa video bài 3"
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `description` | `string` | Có | Mô tả chi tiết các thay đổi để admin xem xét |

### Logic xử lý

| Trạng thái hiện tại | Điều kiện | Trạng thái mới | Ghi chú |
|---|---|---|---|
| `draft` | — | `pending` | Gửi duyệt lần đầu |
| `rejected` | — | `pending` | Gửi lại sau khi bị từ chối |
| `published` | Có thay đổi (draft/outdated items) | `update` | Gửi cập nhật |
| `need_update` | Có thay đổi (draft/outdated items) | `update` | Gửi lại sau khi bị từ chối cập nhật |

### Response thành công — `200 OK`

```json
{
  "message": "Gửi xét duyệt khóa học thành công"
}
```

hoặc (nếu đã published trước đó):

```json
{
  "message": "Gửi xét duyệt cập nhật khóa học thành công"
}
```

### Lỗi

| HTTP Status | Điều kiện |
|---|---|
| `400` | Khóa học đang ở trạng thái `pending` hoặc `update` (đang chờ duyệt) |
| `400` | Khóa học đã published nhưng không có thay đổi nào cần duyệt |
| `403` | Không phải chủ khóa học |
| `404` | Khóa học không tồn tại |

---

## API 2: Phê duyệt khóa học

### Thông tin chung

| Thuộc tính | Giá trị |
|---|---|
| **Endpoint** | `POST /course/:courseId/publish` |
| **Role** | `admin` |
| **Auth** | Bắt buộc |

### Request Body

Không cần body.

### Logic xử lý

1. Khóa học: `pending` / `update` → `published`
2. Bài học & tài liệu:
   - `draft` → `published`
   - `outdated` → `deleted` (isDeleted = true)
   - `published` → giữ nguyên
3. Tạo bản ghi `CourseApproval` với `status: approved`
4. Nếu là lần published đầu tiên → tạo **Conversation** cho khóa học

### Response thành công — `200 OK`

```json
{
  "message": "Duyệt khóa học thành công"
}
```

### Lỗi

| HTTP Status | Điều kiện |
|---|---|
| `400` | Khóa học không ở trạng thái `pending` hoặc `update` |
| `404` | Khóa học không tồn tại |

---

## API 3: Từ chối khóa học

### Thông tin chung

| Thuộc tính | Giá trị |
|---|---|
| **Endpoint** | `POST /course/:courseId/reject` |
| **Role** | `admin` |
| **Auth** | Bắt buộc |

### Request Body

```json
{
  "reason": "Video bài 3 bị lỗi âm thanh, bài 5 thiếu nội dung"
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `reason` | `string` | Có | Lý do từ chối để giảng viên biết cần sửa gì |

### Logic xử lý

| Trạng thái hiện tại | → Trạng thái mới | Ý nghĩa |
|---|---|---|
| `pending` | `rejected` | Khóa học chưa từng published, bị từ chối hoàn toàn |
| `update` | `need_update` | Khóa học đã published, cập nhật bị từ chối. **Người dùng vẫn mua được** bản published cũ |

### Response thành công — `200 OK`

```json
{
  "message": "Từ chối khóa học thành công"
}
```

### Lỗi

| HTTP Status | Điều kiện |
|---|---|
| `400` | Khóa học không ở trạng thái `pending` hoặc `update` |
| `404` | Khóa học không tồn tại |

---

## Quy tắc hiển thị cho người dùng

### Danh sách khóa học (public)

Chỉ hiển thị khóa học có status: **`published`** hoặc **`need_update`**

### Chi tiết khóa học

| Vai trò | Bài học / Tài liệu hiển thị |
|---|---|
| **Người dùng thường** | `published`, `outdated` (vì outdated vẫn là nội dung đã published trước đó) |
| **Giảng viên (chủ khóa học)** | Tất cả (kể cả `draft`) |
| **Admin** | Tất cả (kể cả `draft`) |

### Lưu ý quan trọng cho FE

1. **`outdated` ≠ bị ẩn** — Nội dung `outdated` vẫn hiển thị cho người dùng vì bản chất nó là nội dung đã published, chỉ đang chờ bị thay thế sau khi admin duyệt.

2. **`need_update` ≠ bị ẩn** — Khóa học `need_update` vẫn cho mua vì bản published cũ vẫn valid.

3. **Phân biệt `draft` khi hiển thị cho giảng viên** — Khi giảng viên xem khóa học của mình, các item `draft` nên được đánh dấu rõ ràng (badge "Nháp") để phân biệt với nội dung đã published.

4. **Hiển thị lịch sử phê duyệt** — Bảng `CourseApproval` lưu toàn bộ lịch sử gửi duyệt. Có thể hiển thị cho giảng viên xem lý do từ chối (`reason`) và mô tả gửi duyệt (`description`).

---

## Bảng `CourseApproval` (Lịch sử phê duyệt)

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | `string` | ID |
| `courseId` | `string` | ID khóa học |
| `teacherId` | `string` | ID giảng viên gửi duyệt |
| `description` | `string` | Mô tả thay đổi (giảng viên nhập) |
| `status` | `pending` \| `approved` \| `rejected` | Trạng thái phê duyệt |
| `reason` | `string?` | Lý do từ chối (admin nhập, null nếu approved) |
| `adminId` | `string?` | ID admin xử lý |
| `createdAt` | `string (ISO 8601)` | Thời điểm gửi duyệt |
| `updatedAt` | `string (ISO 8601)` | Thời điểm xử lý |
