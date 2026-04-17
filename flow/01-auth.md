# Flow 01: Xác thực & Phân quyền (Authentication & Authorization)

## Tổng quan
Hệ thống sử dụng JWT (access_token + refresh_token) lưu trong httpOnly cookie.  
Có 3 role chính: **User**, **Teacher**, **Admin**.

---

## 1. Đăng ký (Register)

```mermaid
flowchart TD
    A[Client gửi POST /api/auth/register] --> B{Validate DTO}
    B -->|Lỗi| B1[400 Bad Request]
    B -->|OK| C{Email đã tồn tại?}
    C -->|Có| C1[409 Conflict: Email đã được sử dụng]
    C -->|Chưa| D[Hash password bằng bcrypt]
    D --> E{role = teacher?}
    E -->|Có| F[Tìm Role 'teacher' trong DB]
    E -->|Không| G[Tìm Role 'user' trong DB]
    F --> H[Tạo User record]
    G --> H
    H --> I[Sinh slug từ fullName + timestamp]
    I --> J[Lưu User vào DB]
    J --> K[Trả về user info - không trả password]

    style A fill:#e1f5fe
    style K fill:#c8e6c9
    style B1 fill:#ffcdd2
    style C1 fill:#ffcdd2
```

### Database Changes
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `users` | INSERT | fullName, email, hashedPassword, roleId, slug, availableAmount=0 |

---

## 2. Đăng nhập (Login)

```mermaid
flowchart TD
    A[Client gửi POST /api/auth/login] --> B{Tìm user theo email}
    B -->|Không tìm thấy| B1[401 Unauthorized]
    B -->|Tìm thấy| C{isDeleted = true?}
    C -->|Có| C1[403 Tài khoản đã bị xóa]
    C -->|Không| D{User bị ban?}
    D -->|Có + chưa hết hạn| D1[403 Tài khoản bị cấm đến ...]
    D -->|Có + hết hạn| D2[Gỡ ban: banId=null, timeBan=null, timeUnBan=null]
    D -->|Không bị ban| E{So sánh password với bcrypt}
    D2 --> E
    E -->|Sai| E1[401 Unauthorized]
    E -->|Đúng| F[Sinh access_token - 15 phút]
    F --> G[Sinh refresh_token - 7 ngày]
    G --> H[Lưu refreshToken hash vào DB]
    H --> I[Set httpOnly cookies: access_token, refresh_token]
    I --> J[Trả về user info + role]

    style A fill:#e1f5fe
    style J fill:#c8e6c9
    style B1 fill:#ffcdd2
    style C1 fill:#ffcdd2
    style D1 fill:#ffcdd2
    style E1 fill:#ffcdd2
```

### Database Changes
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `users` | UPDATE | refreshToken = hash(token) |
| `users` | UPDATE (nếu hết hạn ban) | banId=null, timeBan=null, timeUnBan=null |

---

## 3. Refresh Token

```mermaid
flowchart TD
    A[Client gửi POST /api/auth/refresh] --> B{Cookie refresh_token tồn tại?}
    B -->|Không| B1[401 Unauthorized]
    B -->|Có| C[Verify JWT refresh_token]
    C -->|Hết hạn/Invalid| C1[401 Token không hợp lệ]
    C -->|OK| D[Tìm user theo id từ payload]
    D -->|Không tìm thấy| D1[401 Unauthorized]
    D -->|Tìm thấy| E{So sánh hash refreshToken trong DB}
    E -->|Không khớp| E1[401 Token đã bị thu hồi]
    E -->|Khớp| F[Sinh access_token mới - 15 phút]
    F --> G[Set httpOnly cookie: access_token]
    G --> H[Trả về success]

    style A fill:#e1f5fe
    style H fill:#c8e6c9
    style B1 fill:#ffcdd2
    style C1 fill:#ffcdd2
    style D1 fill:#ffcdd2
    style E1 fill:#ffcdd2
```

---

## 4. Lấy thông tin user hiện tại (Fetch Me)

```mermaid
flowchart TD
    A[Client gửi GET /api/auth/me] --> B{Cookie access_token?}
    B -->|Không| B1[401 Unauthorized]
    B -->|Có| C[JwtGuard verify token]
    C -->|Invalid| C1[401 Unauthorized]
    C -->|OK| D[Tìm user theo id - include role, permissions]
    D --> E[Trả về user + role + rolePermissions]

    style A fill:#e1f5fe
    style E fill:#c8e6c9
```

---

## 5. Đăng xuất (Logout)

```mermaid
flowchart TD
    A[Client gửi POST /api/auth/logout] --> B[Xóa refreshToken trong DB → null]
    B --> C[Clear cookies: access_token, refresh_token]
    C --> D[Trả về success]

    style A fill:#e1f5fe
    style D fill:#c8e6c9
```

### Database Changes
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `users` | UPDATE | refreshToken = null |

---

## 6. Luồng phân quyền (Authorization Flow)

```mermaid
flowchart TD
    A[Request đến API] --> B{Có decorator @PublicAPI?}
    B -->|Có| Z[Bỏ qua auth → xử lý request]
    B -->|Không| C{Cookie access_token hợp lệ?}
    C -->|Không| C1[401 Unauthorized]
    C -->|Có| D[Giải mã JWT → lấy userId, roleId]
    D --> E{Có decorator @Roles?}
    E -->|Không| F[Cho phép mọi user đã login]
    E -->|Có| G{User.role.name ∈ roles?}
    G -->|Không| G1[403 Forbidden]
    G -->|Có| H{Có PermissionGuard?}
    H -->|Không| I[Cho phép]
    H -->|Có| J{RolePermission cho API + method tồn tại?}
    J -->|Không| J1[403 Forbidden]
    J -->|Có| I

    style A fill:#e1f5fe
    style Z fill:#c8e6c9
    style I fill:#c8e6c9
    style C1 fill:#ffcdd2
    style G1 fill:#ffcdd2
    style J1 fill:#ffcdd2
```

---

## Tổng hợp API

| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| POST | `/api/auth/register` | Public | — |
| POST | `/api/auth/login` | Public | — |
| POST | `/api/auth/refresh` | Cookie | — |
| GET | `/api/auth/me` | Cookie | Mọi role |
| POST | `/api/auth/logout` | Cookie | Mọi role |
