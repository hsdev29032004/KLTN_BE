# Flow 06: Chat / Trao đổi trong khóa học (Conversation & Messaging)

## Tổng quan
Mỗi khóa học published có 1 Conversation. Teacher là host, students được thêm tự động khi mua.  
Chat real-time qua **Socket.IO** + REST API fallback.

---

## 1. Luồng tổng thể

```mermaid
flowchart TD
    A[Admin publish khóa học] --> B[Tạo Conversation]
    B --> C[Teacher = ConversationMember isHost=true]

    D[Student mua khóa học thành công] --> E[Tự động thêm ConversationMember isHost=false]

    C --> F[Teacher + Students chat real-time]
    E --> F

    F --> G{Kênh giao tiếp}
    G --> H[Socket.IO: real-time]
    G --> I[REST API: fallback]

    style A fill:#f3e5f5
    style D fill:#e1f5fe
    style F fill:#c8e6c9
```

---

## 2. Kết nối Socket.IO

```mermaid
flowchart TD
    A[Client connect ws://server/chat] --> B{Có access_token trong cookie/header?}
    B -->|Không| B1[Disconnect: Unauthorized]
    B -->|Có| C[Verify JWT → lấy userId]
    C -->|Invalid| C1[Disconnect: Token không hợp lệ]
    C -->|OK| D[Socket authenticated]
    D --> E[Client emit: join_conversation với conversationId]
    E --> F{User là member của conversation?}
    F -->|Không| F1[Emit error: Không có quyền]
    F -->|Có| G[Socket join room: conversationId]
    G --> H[Sẵn sàng nhận/gửi tin nhắn]

    style A fill:#e1f5fe
    style H fill:#c8e6c9
    style B1 fill:#ffcdd2
    style C1 fill:#ffcdd2
    style F1 fill:#ffcdd2
```

---

## 3. Gửi tin nhắn (Send Message)

### Qua Socket.IO (Real-time)

```mermaid
flowchart TD
    A[Client emit: send_message\nconversationId + content] --> B{User là member?}
    B -->|Không| B1[Emit error]
    B -->|Có| C[Tạo Message record trong DB]
    C --> D[Cập nhật Conversation.updatedAt]
    D --> E[Broadcast tới room: new_message]
    E --> F[Tất cả members trong room nhận tin nhắn]

    style A fill:#e1f5fe
    style F fill:#c8e6c9
    style B1 fill:#ffcdd2
```

### Qua REST API (Fallback)

```mermaid
flowchart TD
    A[Client gửi POST /api/conservation/:conversationId/message] --> B{User là member?}
    B -->|Không| B1[403 Forbidden]
    B -->|Có| C[Tạo Message record]
    C --> D[Cập nhật Conversation.updatedAt]
    D --> E[Trả về message mới]

    style A fill:#e1f5fe
    style E fill:#c8e6c9
    style B1 fill:#ffcdd2
```

### Database Changes
| Bảng | Hành động | Dữ liệu |
|------|-----------|----------|
| `messages` | INSERT | conversationId, senderId, content |
| `conversations` | UPDATE | updatedAt = now |

---

## 4. Xem danh sách cuộc trò chuyện

```mermaid
flowchart TD
    A[User gửi GET /api/conservation] --> B[Lấy conversations qua ConversationMember]
    B --> C[Filter: isDeleted=false]
    C --> D[Include: course name, thumbnail]
    D --> E[Include: tin nhắn cuối cùng]
    E --> F[OrderBy: updatedAt desc - mới nhất lên đầu]
    F --> G[Trả về danh sách conversations]

    style A fill:#e1f5fe
    style G fill:#c8e6c9
```

### Response
```json
{
  "data": [
    {
      "id": "conv-id",
      "name": "Khóa React Nâng Cao",
      "course": { "id": "...", "name": "...", "thumbnail": "..." },
      "lastMessage": {
        "content": "Bài tập tuần 3...",
        "sender": { "fullName": "Nguyễn Văn A" },
        "createdAt": "2026-04-09T..."
      },
      "updatedAt": "2026-04-09T..."
    }
  ]
}
```

---

## 5. Xem chi tiết cuộc trò chuyện + tin nhắn (phân trang)

```mermaid
flowchart TD
    A[User gửi GET /api/conservation/:id?page=1&limit=50] --> B{User là member?}
    B -->|Không| B1[403 Forbidden]
    B -->|Có| C[Lấy Conversation info]
    C --> D[Lấy Messages: phân trang, mới nhất trước]
    D --> E[Include: sender.fullName, sender.avatar]
    E --> F[Trả về conversation + messages + meta]

    style A fill:#e1f5fe
    style F fill:#c8e6c9
    style B1 fill:#ffcdd2
```

---

## 6. Sơ đồ Socket.IO Events

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server (Gateway)
    participant DB as Database
    participant R as Room (Other clients)

    C->>S: connect (with JWT)
    S->>S: Verify JWT
    S-->>C: connected ✓

    C->>S: join_conversation { conversationId }
    S->>DB: Check membership
    DB-->>S: OK - is member
    S-->>C: joined ✓

    C->>S: send_message { conversationId, content }
    S->>DB: INSERT message
    DB-->>S: message created
    S->>DB: UPDATE conversation.updatedAt
    S-->>R: new_message { message }
    S-->>C: message_sent ✓

    Note over C,R: Other clients receive new_message in real-time
```

---

## 7. Quyền truy cập Conversation

```mermaid
flowchart TD
    A{Ai có quyền?} --> B[Teacher chủ khóa học = host]
    A --> C[Students đã mua khóa = member]
    A --> D[Admin]
    
    B --> E[Đọc + gửi tin nhắn]
    C --> E
    D --> F[Chỉ xem - quản trị]
    
    G[User chưa mua] --> H[❌ Không truy cập được]
    I[Guest] --> H

    style E fill:#c8e6c9
    style H fill:#ffcdd2
```

---

## Tổng hợp API

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/api/conservation` | Auth | Danh sách conversations |
| GET | `/api/conservation/:id` | Auth (member) | Chi tiết + messages |
| POST | `/api/conservation/:id/message` | Auth (member) | Gửi tin nhắn (REST) |

### Socket.IO Events

| Event | Direction | Payload | Mô tả |
|-------|-----------|---------|--------|
| `join_conversation` | Client → Server | `{ conversationId }` | Tham gia room |
| `send_message` | Client → Server | `{ conversationId, content }` | Gửi tin nhắn |
| `new_message` | Server → Room | `{ message }` | Broadcast tin nhắn mới |
| `message_sent` | Server → Client | `{ message }` | Xác nhận gửi thành công |
| `error` | Server → Client | `{ message }` | Thông báo lỗi |
