# API Chat & Socket.IO — Hội thoại khóa học

Base URL REST: `http://localhost:3001/api`  
Socket URL: `http://localhost:3001/chat`

---

## Phần 1: REST API

### 1.1. Lấy danh sách hội thoại của tôi

```
GET /conversation/my
```

**Authentication:** Cookie JWT (bắt buộc)

**Response (200):**

```json
{
  "message": "Lấy danh sách hội thoại thành công",
  "data": [
    {
      "id": "conv-uuid",
      "name": "Nhóm chat Khóa học NestJS",
      "courseId": "course-uuid",
      "createdAt": "2026-04-01T00:00:00.000Z",
      "updatedAt": "2026-04-06T10:30:00.000Z",
      "isHost": false,
      "lastMessage": {
        "id": "msg-uuid",
        "content": "Bài 3 khó quá anh ơi",
        "createdAt": "2026-04-06T10:30:00.000Z",
        "sender": {
          "id": "user-uuid",
          "fullName": "Nguyễn Văn A",
          "avatar": "https://cdn.example.com/avatar.jpg"
        }
      },
      "course": {
        "id": "course-uuid",
        "name": "Khóa học NestJS",
        "slug": "khoa-hoc-nestjs",
        "thumbnail": "https://cdn.example.com/thumb.jpg",
        "user": {
          "id": "teacher-uuid",
          "fullName": "Trần Văn B",
          "avatar": "https://cdn.example.com/teacher.jpg"
        }
      },
      "_count": { "messages": 42, "members": 15 }
    }
  ]
}
```

**Ghi chú:**
- `isHost = true` nếu user là giảng viên (chủ nhóm)
- `lastMessage` là tin nhắn mới nhất, `null` nếu chưa có tin nhắn
- Danh sách sắp xếp theo `updatedAt` giảm dần (conversation có tin nhắn mới nhất lên đầu)

---

### 1.2. Lấy chi tiết hội thoại + tin nhắn (phân trang)

```
GET /conversation/:conversationId
```

**Authentication:** Cookie JWT (bắt buộc, phải là thành viên)

**Query Parameters:**

| Param | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `page` | number | Không | Trang (default: `1`). Page 1 = tin nhắn mới nhất |
| `limit` | number | Không | Số tin nhắn/trang, max 100 (default: `50`) |

> **Lưu ý phân trang:** Messages trả về đã **đảo ngược** (cũ → mới) để hiển thị đúng thứ tự. Muốn load tin nhắn cũ hơn → tăng `page`.

**Response (200):**

```json
{
  "message": "Lấy chi tiết hội thoại thành công",
  "data": {
    "id": "conv-uuid",
    "name": "Nhóm chat Khóa học NestJS",
    "courseId": "course-uuid",
    "createdAt": "2026-04-01T00:00:00.000Z",
    "course": {
      "id": "course-uuid",
      "name": "Khóa học NestJS",
      "slug": "khoa-hoc-nestjs",
      "thumbnail": "...",
      "user": { "id": "teacher-uuid", "fullName": "Trần Văn B", "avatar": "..." }
    },
    "members": [
      {
        "userId": "teacher-uuid",
        "isHost": true,
        "user": { "id": "teacher-uuid", "fullName": "Trần Văn B", "avatar": "..." }
      },
      {
        "userId": "user-uuid",
        "isHost": false,
        "user": { "id": "user-uuid", "fullName": "Nguyễn Văn A", "avatar": "..." }
      }
    ],
    "messages": [
      {
        "id": "msg-1",
        "content": "Chào mọi người!",
        "createdAt": "2026-04-06T10:00:00.000Z",
        "sender": { "id": "teacher-uuid", "fullName": "Trần Văn B", "avatar": "..." }
      },
      {
        "id": "msg-2",
        "content": "Bài 3 khó quá",
        "createdAt": "2026-04-06T10:30:00.000Z",
        "sender": { "id": "user-uuid", "fullName": "Nguyễn Văn A", "avatar": "..." }
      }
    ]
  },
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

**Lỗi:**

| HTTP | Trường hợp |
|------|------------|
| `403` | User không phải thành viên |
| `404` | Hội thoại không tồn tại |

---

### 1.3. Gửi tin nhắn (REST — fallback)

> Dùng khi không kết nối được Socket.IO. **Ưu tiên dùng socket** để realtime.

```
POST /conversation/:conversationId/messages
```

**Authentication:** Cookie JWT (bắt buộc, phải là thành viên)

**Body:**

```json
{
  "content": "Nội dung tin nhắn"
}
```

**Response (201):**

```json
{
  "message": "Gửi tin nhắn thành công",
  "data": {
    "id": "msg-uuid",
    "content": "Nội dung tin nhắn",
    "createdAt": "2026-04-06T10:30:00.000Z",
    "conversationId": "conv-uuid",
    "sender": {
      "id": "user-uuid",
      "fullName": "Nguyễn Văn A",
      "avatar": "..."
    }
  }
}
```

---

## Phần 2: Socket.IO (Realtime)

### 2.1. Kết nối

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/chat', {
  auth: {
    token: 'access_token_jwt_string', // JWT token
  },
  // Hoặc nếu dùng cookie (withCredentials):
  withCredentials: true,
});
```

**Xác thực:** Gửi JWT token qua:
- `auth.token` (khuyến nghị)
- Hoặc tự động qua cookie `access_token` nếu `withCredentials: true`

**Events nhận khi connect:**

```javascript
socket.on('connected', (data) => {
  console.log(data); // { userId: 'xxx', message: 'Kết nối thành công' }
});

socket.on('error', (data) => {
  console.error(data); // { message: 'Unauthorized' }
});
```

---

### 2.2. Join phòng chat

```javascript
socket.emit('joinRoom', { conversationId: 'conv-uuid' });
```

**Response events:**

```javascript
// Thành công
socket.on('joinedRoom', (data) => {
  console.log(data); // { conversationId: 'conv-uuid', message: 'Đã tham gia phòng chat' }
});

// Thất bại (không phải thành viên)
socket.on('error', (data) => {
  console.error(data); // { message: 'Bạn không phải thành viên của hội thoại này' }
});
```

---

### 2.3. Rời phòng chat

```javascript
socket.emit('leaveRoom', { conversationId: 'conv-uuid' });
```

**Response:**

```javascript
socket.on('leftRoom', (data) => {
  console.log(data); // { conversationId: 'conv-uuid' }
});
```

---

### 2.4. Gửi tin nhắn qua socket

```javascript
socket.emit('sendMessage', {
  conversationId: 'conv-uuid',
  content: 'Nội dung tin nhắn',
});
```

---

### 2.5. Nhận tin nhắn realtime

> Sau khi **joinRoom**, mọi thành viên trong room đều nhận được event `newMessage` khi có tin nhắn mới.

```javascript
socket.on('newMessage', (message) => {
  console.log(message);
  // {
  //   id: 'msg-uuid',
  //   content: 'Nội dung tin nhắn',
  //   createdAt: '2026-04-06T10:30:00.000Z',
  //   conversationId: 'conv-uuid',
  //   sender: {
  //     id: 'user-uuid',
  //     fullName: 'Nguyễn Văn A',
  //     avatar: '...'
  //   }
  // }
});
```

---

## Phần 3: Flow FE tích hợp đầy đủ

### 3.1. Trang danh sách hội thoại

```javascript
// 1. Fetch danh sách
const res = await fetch('/api/conversation/my', { credentials: 'include' });
const { data } = await res.json();
// Render danh sách với lastMessage, _count, course info

// 2. Kết nối socket (1 lần duy nhất cho toàn app)
const socket = io('http://localhost:3001/chat', {
  auth: { token: accessToken },
});
```

### 3.2. Vào phòng chat cụ thể

```javascript
// 1. Join room
socket.emit('joinRoom', { conversationId });

// 2. Fetch messages (trang 1 = mới nhất)
const res = await fetch(`/api/conversation/${conversationId}?page=1&limit=50`, {
  credentials: 'include',
});
const { data, meta } = await res.json();
// Render members + messages

// 3. Listen tin nhắn mới
socket.on('newMessage', (msg) => {
  if (msg.conversationId === conversationId) {
    // Append tin nhắn mới vào cuối danh sách
    appendMessage(msg);
  }
});

// 4. Gửi tin nhắn
function sendMessage(content) {
  socket.emit('sendMessage', { conversationId, content });
}

// 5. Load thêm tin nhắn cũ (scroll lên)
async function loadOlderMessages(page) {
  const res = await fetch(`/api/conversation/${conversationId}?page=${page}&limit=50`, {
    credentials: 'include',
  });
  const { data } = await res.json();
  // Prepend messages vào đầu danh sách
}
```

### 3.3. Rời phòng chat

```javascript
// Khi user navigate ra khỏi trang chat
socket.emit('leaveRoom', { conversationId });
```

### 3.4. Disconnect

```javascript
// Khi user logout hoặc close app
socket.disconnect();
```

---

## Phần 4: Tổng hợp Events

### Client → Server (emit)

| Event | Data | Mô tả |
|-------|------|-------|
| `joinRoom` | `{ conversationId: string }` | Tham gia phòng chat |
| `leaveRoom` | `{ conversationId: string }` | Rời phòng chat |
| `sendMessage` | `{ conversationId: string, content: string }` | Gửi tin nhắn |

### Server → Client (on)

| Event | Data | Mô tả |
|-------|------|-------|
| `connected` | `{ userId, message }` | Kết nối thành công |
| `joinedRoom` | `{ conversationId, message }` | Join room thành công |
| `leftRoom` | `{ conversationId }` | Rời room thành công |
| `newMessage` | `{ id, content, createdAt, conversationId, sender }` | Tin nhắn mới (broadcast) |
| `error` | `{ message }` | Lỗi (auth, permission, validation) |

---

## Phần 5: Cài đặt packages

**Backend (đã cài):**
```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

**Frontend:**
```bash
npm install socket.io-client
```
