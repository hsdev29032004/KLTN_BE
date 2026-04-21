**Mô tả**

Tài liệu này hướng dẫn Frontend (FE) tích hợp tính năng Quên mật khẩu / Đặt lại mật khẩu với backend đã triển khai ở repository.

**Endpoints**

- POST `/auth/forgot-password`
  - Body: `{ "email": "user@example.com" }`
  - Success: 200, message: "Mã xác thực đã được gửi tới email nếu tồn tại" (FE nên hiển thị thông báo chung)

- POST `/auth/reset-password`
  - Body: `{ "email": "user@example.com", "code": "123456", "newPassword": "newpass" }`
  - Success: 200, message: "Cập nhật mật khẩu thành công"
  - Fail: 401 nếu mã không hợp lệ hoặc hết hạn

**Biến môi trường backend (FE team cần biết để test)**

- `PWD_RESET_TTL` — thời gian sống của mã (giây). Mặc định backend thiết lập ~600s.
- Mail config (để QA): `SMTP_SERVICE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.

**Flow UX đề xuất**

1. Form 1 — "Quên mật khẩu" (email)
   - Input: email (validate format trên client)
   - Khi submit: gọi `POST /auth/forgot-password`
   - Luôn hiển thị thông báo chung: "Nếu email tồn tại trong hệ thống, mã xác thực đã được gửi"; không hiển thị thông tin chi tiết để tránh lộ real users.
   - Sau success: chuyển sang form 2 (hoặc hiển thị modal) cho phép nhập `code` và `newPassword`.
   - Thêm nút `Resend` bị disable trong N giây (ví dụ 60s) để tránh spam.

2. Form 2 — "Đặt lại mật khẩu"
   - Inputs: `email` (prefill hoặc ẩn nếu đã cung cấp), `code` (6 chữ số), `newPassword` (min 6)
   - Validate client-side: code length, password minlength
   - Submit -> `POST /auth/reset-password`
   - On success: thông báo thành công, redirect tới trang đăng nhập
   - On 401: hiển thị `Mã không hợp lệ hoặc đã hết hạn`

**Ví dụ request (Fetch / Axios)**

- Fetch: gửi yêu cầu quên mật khẩu

```js
await fetch('/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
});
```

- Axios: đặt lại mật khẩu

```js
await axios.post('/auth/reset-password', {
  email,
  code,
  newPassword,
});
```

**Thông báo & validation trên FE**

- Luôn hiển thị thông báo chung sau `forgot-password` để không tiết lộ có/không user.
- Kiểm tra định dạng email (regex đơn giản).
- Code: kiểm tra độ dài (6 chữ số) trước khi gửi.
- Password: kiểm tra minlength >= 6.

**Throttling & bảo mật**

- Disable nút `Resend` trong 60s; hiển thị countdown.
- Backend áp rate-limit — FE nên xử lý thông báo lỗi và cho retry phù hợp.
- Sử dụng HTTPS.

**Gửi mail (QA notes)**

- Nếu backend dùng Gmail: cần tạo App Password (khi bật 2FA).
- Biến môi trường quan trọng cho QA: `SMTP_SERVICE=gmail`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<app-password>`, `EMAIL_FROM`.

**Ví dụ component React (skeleton)**

```jsx
// pseudo-code, chỉ minh họa
function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  async function requestCode() {
    await fetch('/auth/forgot-password', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email}) });
    setStep(2);
  }

  async function resetPassword() {
    await axios.post('/auth/reset-password', { email, code, newPassword: password });
    // show success and redirect to login
  }

  return (
    // render form based on step
  );
}
```

**Các test case QA cơ bản**

- Submit valid email -> nhận thông báo chung
- Submit non-existing email -> vẫn nhận thông báo chung
- Submit valid code + newPassword -> password updated -> can login with new password
- Submit invalid/expired code -> receive 401 and display error
- Ensure resend disabled for configured period

---

Nếu bạn muốn, mình có thể:

- Tạo `docs/.env.example` hoặc cập nhật file `.env.example` với các biến mail
- Viết component React/Vue cụ thể (sử dụng Axios + form validation)

Chọn bước tiếp theo bạn muốn mình làm.
