Tóm tắt thay đổi

- Trước đây frontend gửi `thumbnail` / `avatar` là một URL string.
- Hiện tại backend chấp nhận file upload (multipart/form-data) cho:
  - Tạo / cập nhật khóa học: trường `thumbnail` là file (field name: `thumbnail`).
  - Cập nhật avatar người dùng: trường `avatar` là file (field name: `avatar`).
- Backend vẫn chấp nhận fallback là một URL string (nếu frontend vẫn gửi text), nhưng khuyến nghị chuyển sang upload file để ảnh được lưu trên Cloudinary.

Endpoints (backend)

- POST /course
  - Content-Type: multipart/form-data
  - File field: `thumbnail` (optional)
  - Other fields: các field thông thường của `CreateCourseDto` (name, price, content, description, ...). Gửi chúng dưới dạng text fields trong FormData.
  - Response: trả về `course` với `thumbnail` là URL của ảnh được upload.

- PUT /course/:courseId
  - Content-Type: multipart/form-data
  - File field: `thumbnail` (optional)
  - Other fields: các field cập nhật trong `UpdateCourseDto`.

- PUT /user/avatar (giả sử endpoint cập nhật avatar)
  - Content-Type: multipart/form-data
  - File field: `avatar` (optional)
  - Response: trả về user với `avatar` là URL mới.

Frontend: ví dụ sử dụng Fetch API

- Tạo FormData, đính kèm file và các field khác:

```javascript
// giả sử `fileInput` là <input type="file" />
const formData = new FormData();
formData.append('thumbnail', fileInput.files[0]);
formData.append('name', 'Tên khóa học');
formData.append('price', '100000');
// ... các field khác

fetch('/course', {
  method: 'POST',
  body: formData, // CHÚ Ý: không set Content-Type, trình duyệt tự set
})
  .then(res => res.json())
  .then(data => console.log(data));
```

Frontend: ví dụ sử dụng Axios

```javascript
const formData = new FormData();
formData.append('thumbnail', fileInput.files[0]);
formData.append('name', 'Tên khóa học');

axios.post('/course', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }, // axios tự set boundary, nhưng ok nếu đặt
})
.then(res => console.log(res.data));
```

Ghi chú quan trọng cho frontend

- Không gửi JSON body khi có file; sử dụng `FormData` để đính kèm cả file và các field text.
- Khi upload file, đừng cố set header `Content-Type` thủ công nếu sử dụng `fetch`; để trình duyệt tự set boundary.
- Kích thước / định dạng file: backend hiện upload lên Cloudinary. Khuyến nghị: JPEG/PNG, kích thước < 5MB.
- Fallback: nếu frontend vẫn gửi `thumbnail`/`avatar` là URL string (ví dụ admin dùng link), backend vẫn chấp nhận và lưu URL đó.
- Response: sau khi upload, backend trả về thực thể (course/user) có trường `thumbnail` / `avatar` chứa URL an toàn (Cloudinary secure_url).

Kiểm tra/cảnh báo

- Kiểm tra CORS: nếu frontend gọi API từ domain khác, đảm bảo backend đã cấu hình CORS cho phép multipart requests.
- Hiển thị trạng thái tải lên trên UI (progress) để UX tốt hơn.
- Xử lý lỗi upload: nếu Cloudinary trả lỗi, backend sẽ trả HTTP error; frontend nên hiển thị thông báo cho người dùng.

Triển khai nhanh (checklist)

- [x] Thay đổi form trên frontend: chuyển input text URL -> file input
- [x] Thay đổi request sang `FormData` (multipart)
- [x] Kiểm tra response và dùng `data.thumbnail` / `data.avatar` để hiển thị ảnh
- [ ] (tùy chọn) Thêm client-side validation: file type + size

Nếu muốn, tôi có thể:
- Cập nhật ví dụ code React/React Hook Form để upload ảnh.
- Thêm đoạn curl sample để test API.
- Kiểm tra các endpoint user liên quan trong repo và cập nhật docs endpoint chính xác (nếu bạn chỉ định đường dẫn).


Lesson Material (create / update)

- Endpoints:
  - POST /course/lesson/:lessonId/material
    - Content-Type: multipart/form-data
    - File field: `file` (optional)
    - Body fields (FormData): `name` (string), `type` (string — e.g. `video`, `image`, `document`), `url` (string, optional fallback)
    - Behavior: if `type` is `image` and a `file` is provided, the backend uploads the file to Cloudinary and stores the returned URL in the `url` field of the created material. If no file is provided, the backend accepts a `url` string.

  - PUT /course/material/:materialId
    - Content-Type: multipart/form-data
    - File field: `file` (optional)
    - Body fields (FormData): same as create. For materials in `draft` status the record is updated in-place; for `published` materials the backend marks the existing record `outdated` and creates a new `draft` record (the new draft will use the uploaded URL if `type === 'image'` and `file` is provided).

- Frontend example (image material upload using Fetch):

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('name', 'Ảnh minh họa');
formData.append('type', 'image');

fetch(`/course/lesson/${lessonId}/material`, {
  method: 'POST',
  body: formData,
})
  .then(res => res.json())
  .then(data => console.log(data));
```

- Axios example (update material):

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('type', 'image');

axios.put(`/course/material/${materialId}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
}).then(res => console.log(res.data));
```

- curl quick test (upload image):

```bash
curl -X POST "${BE_URL}/course/lesson/${lessonId}/material" \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/image.jpg" \
  -F "name=Ảnh minh họa" \
  -F "type=image"
```

Ghi chú:
- Khi upload ảnh cho lesson material, backend ưu tiên `file` nếu cả `file` và `url` cùng được gửi cho `type === 'image'`.
- Nếu muốn client-side validation ví dụ kiểm tra loại MIME hoặc kích thước file, làm trên frontend trước khi gửi FormData.
- Đảm bảo token/cookies để xác thực (endpoints yêu cầu `teacher` role).

File updated: [docs/API_Image_Upload.md](docs/API_Image_Upload.md)
