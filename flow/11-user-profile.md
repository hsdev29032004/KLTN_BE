# Flow 11: Quản lý Profile & Xác thực người dùng (User Profile)

## Tổng quan
User tự quản lý profile (avatar, tên, giới thiệu) và đổi mật khẩu.  
Public có thể xem profile theo slug.

---

## 1. Xem profile public

```mermaid
flowchart TD
    A[GET /api/user/:slug] --> B{Tìm user theo slug}
    B -->|Không| B1[404 Not Found]
    B -->|Có| C{isDeleted?}
    C -->|Có| C1[404 Not Found]
    C -->|Không| D[Trả về: fullName, avatar, slug, introduce]
    D --> E[Include: published courses, review count]

    style A fill:#e1f5fe
    style E fill:#c8e6c9
    style B1 fill:#ffcdd2
```

---

## 2. Cập nhật profile

```mermaid
flowchart TD
    A[User gửi PUT /api/user/profile] --> B{Validate DTO}
    B -->|Lỗi| B1[400 Bad Request]
    B -->|OK| C[Update: fullName, avatar, introduce]
    C --> D{fullName thay đổi?}
    D -->|Có| E[Sinh slug mới]
    D -->|Không| F[Giữ slug cũ]
    E --> G[Lưu vào DB]
    F --> G
    G --> H[Trả về profile updated]

    style A fill:#e1f5fe
    style H fill:#c8e6c9
    style B1 fill:#ffcdd2
```

---

## 3. Đổi mật khẩu

```mermaid
flowchart TD
    A[User gửi PUT /api/user/change-password] --> B{oldPassword đúng?}
    B -->|Không| B1[401 Mật khẩu cũ không đúng]
    B -->|Có| C{newPassword = oldPassword?}
    C -->|Có| C1[400 Mật khẩu mới phải khác mật khẩu cũ]
    C -->|Không| D[Hash newPassword bằng bcrypt]
    D --> E[UPDATE users SET password = hash]
    E --> F[Trả về success]

    style A fill:#e1f5fe
    style F fill:#c8e6c9
    style B1 fill:#ffcdd2
    style C1 fill:#ffcdd2
```

---

## Tổng hợp API

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/api/user/:slug` | Public | Xem profile |
| PUT | `/api/user/profile` | Auth | Sửa profile |
| PUT | `/api/user/change-password` | Auth | Đổi mật khẩu |
