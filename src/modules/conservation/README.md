# Conservation Module (Conversation/Chat Groups)

## Overview
Module quản lý các nhóm chat (conversation) của khóa học. Cho phép lấy danh sách nhóm chat của giảng viên thông qua các khóa học mà giảng viên tạo ra.

## API Endpoints

### 1. Lấy danh sách nhóm chat của giảng viên
**GET** `/conversation/instructor/:instructorId`

**Description**: Lấy tất cả nhóm chat (conversation) của một giảng viên bằng cách:
1. Query tất cả khóa học của giảng viên (userId = instructorId)
2. Từ các khóa học đó, query tất cả conversation liên quan

**Path Parameters**:
- `instructorId` (string, required): ID của giảng viên

**Response**:
```json
{
  "message": "Lấy danh sách nhóm chat của giảng viên thành công",
  "data": [
    {
      "id": "conv-id-1",
      "name": "Group Chat Name",
      "courseId": "course-id-1",
      "createdAt": "2026-04-02T10:00:00Z",
      "updatedAt": "2026-04-02T10:00:00Z",
      "course": {
        "id": "course-id-1",
        "name": "Course Name",
        "slug": "course-name",
        "thumbnail": "https://...",
        "user": {
          "id": "instructor-id",
          "fullName": "Instructor Name",
          "avatar": "https://..."
        }
      },
      "_count": {
        "messages": 25
      }
    }
  ]
}
```

### 2. Lấy chi tiết conversation kèm danh sách message
**GET** `/conversation/:conversationId`

**Description**: Lấy chi tiết của một conversation cùng với các tin nhắn trong đó

**Path Parameters**:
- `conversationId` (string, required): ID của conversation

**Response**:
```json
{
  "message": "Lấy chi tiết conversation thành công",
  "data": {
    "id": "conv-id-1",
    "name": "Group Chat Name",
    "courseId": "course-id-1",
    "createdAt": "2026-04-02T10:00:00Z",
    "updatedAt": "2026-04-02T10:00:00Z",
    "course": {
      "id": "course-id-1",
      "name": "Course Name",
      "slug": "course-name",
      "thumbnail": "https://...",
      "user": {
        "id": "instructor-id",
        "fullName": "Instructor Name",
        "avatar": "https://..."
      }
    },
    "messages": [
      {
        "id": "msg-id-1",
        "content": "Hello everyone!",
        "createdAt": "2026-04-02T10:05:00Z",
        "updatedAt": "2026-04-02T10:05:00Z",
        "sender": {
          "id": "user-id-1",
          "fullName": "User Name",
          "avatar": "https://..."
        }
      }
    ],
    "_count": {
      "messages": 1
    }
  }
}
```

### 3. Lấy conversation theo courseId
**GET** `/conversation/course/:courseId`

**Description**: Lấy conversation/nhóm chat của một khóa học cụ thể

**Path Parameters**:
- `courseId` (string, required): ID của khóa học

**Response**:
```json
{
  "message": "Lấy conversation theo khóa học thành công",
  "data": {
    "id": "conv-id-1",
    "name": "Group Chat Name",
    "courseId": "course-id-1",
    "createdAt": "2026-04-02T10:00:00Z",
    "updatedAt": "2026-04-02T10:00:00Z",
    "course": {
      "id": "course-id-1",
      "name": "Course Name",
      "slug": "course-name",
      "thumbnail": "https://..."
    },
    "_count": {
      "messages": 25
    }
  }
}
```

## Database Schema Relationships

```
User (Instructor)
  └── Course (userId)
      └── Conversation (courseId) 
          └── Message (conversationId)
              └── User (senderId - người gửi tin nhắn)
```

## Implementation Details

### Service Methods

**ConservationService** provides:

1. `getInstructorConversations(instructorId: string)`
   - Lấy tất cả conversation của giảng viên
   - Flow: giảng viên → các khóa học → các conversation

2. `getConversationDetails(conversationId: string)`
   - Lấy chi tiết conversation kèm message

3. `getConversationByCourseId(courseId: string)`
   - Lấy conversation theo courseId

### Authentication
- `@PublicAPI()`: Các endpoint này là công khai, không yêu cầu authentication
- Có thể thêm `@Roles('user')` hoặc `@Roles('instructor')` nếu cần kiểm soát quyền truy cập

## Usage Examples

### Example 1: Get all conversations for an instructor
```bash
GET /conversation/instructor/550e8400-e29b-41d4-a716-446655440000
```

### Example 2: Get conversation details with messages
```bash
GET /conversation/conv-550e8400-e29b-41d4-a716-446655440000
```

### Example 3: Get conversation for specific course
```bash
GET /conversation/course/course-550e8400-e29b-41d4-a716-446655440000
```

## Error Handling

- **NotFoundException**: Nếu giảng viên/conversation không tồn tại
- **400 Bad Request**: Nếu tham số không hợp lệ

## Notes

- Tất cả các query sử dụng `isDeleted: false` để được soft-deleted data
- Data được sắp xếp theo `createdAt` (từ mới nhất đến cũ nhất)
- Mỗi conversation có `_count.messages` hiển thị số lượng tin nhắn
