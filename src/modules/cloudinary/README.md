# Cloudinary Module

Module quản lý upload file lên Cloudinary. Backend nhận file từ frontend, upload lên Cloudinary, và lưu URL trả về vào database.

## Setup

### 1. Cài đặt Cloudinary Package
```bash
yarn add cloudinary next-cloudinary
# hoặc
npm install cloudinary next-cloudinary
```

### 2. Cấu hình Environment Variables
Cập nhật file `.env`:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Lấy thông tin từ [Cloudinary Dashboard](https://cloudinary.com/console)

## API Endpoints

### 1. Upload Single File
**POST** `/api/cloudinary/upload`

**Request**: Form-data
```
file: <binary file>
```

**Response**:
```json
{
  "message": "Upload file thành công",
  "data": {
    "publicId": "kltn/abc123xyz",
    "url": "https://res.cloudinary.com/xxx/image/upload/v123/kltn/abc123xyz.jpg"
  }
}
```

**cURL Example**:
```bash
curl -X POST "http://localhost:3001/api/cloudinary/upload" \
  -F "file=@/path/to/image.jpg"
```

### 2. Upload Multiple Files
**POST** `/api/cloudinary/upload-multiple`

**Request**: Form-data
```
files: <binary file 1>
files: <binary file 2>
files: <binary file 3>
```

**Response**:
```json
{
  "message": "Upload các file thành công",
  "data": [
    {
      "publicId": "kltn/abc123xyz",
      "url": "https://res.cloudinary.com/.../kltn/abc123xyz.jpg"
    },
    {
      "publicId": "kltn/def456uvw",
      "url": "https://res.cloudinary.com/.../kltn/def456uvw.jpg"
    }
  ]
}
```

**cURL Example**:
```bash
curl -X POST "http://localhost:3001/api/cloudinary/upload-multiple" \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg"
```

### 3. Upload File với Custom Folder
**POST** `/api/cloudinary/upload/:folder`

**Request**: Form-data
```
file: <binary file>
```

**Path Parameters**:
- `folder` (string): Tên folder trong Cloudinary (ví dụ: `courses`, `avatars`, `lessons`)

**Response**: Tương tự như upload single file

**cURL Example**:
```bash
curl -X POST "http://localhost:3001/api/cloudinary/upload/courses" \
  -F "file=@course-thumbnail.jpg"
```

## Flow Diagram

```
Frontend (sends image)
        ↓
Backend (receives image via express multer)
        ↓
CloudinaryService.uploadFile()
        ↓
Cloudinary API (upload & returns URL)
        ↓
Backend (saves URL to database)
        ↓
Frontend (displays image from URL)
```

## Integration Example

### Save Upload Link to Database

Khi user upload avatar, bạn có thể lưu URL vào database:

```typescript
// user.controller.ts
@Post('avatar')
@UseInterceptors(FileInterceptor('file'))
async updateAvatar(
  @UploadedFile() file: Express.Multer.File,
  @User() user: IUser,
) {
  // Upload to Cloudinary
  const result = await this.cloudinaryService.uploadFile(
    file,
    'avatars'
  );

  // Save to database
  const updatedUser = await this.prisma.user.update({
    where: { id: user.id },
    data: { avatar: result.url },
  });

  return {
    message: 'Cập nhật avatar thành công',
    data: updatedUser,
  };
}
```

### Save Course Thumbnail

```typescript
// course.controller.ts
@Post('thumbnail')
@UseInterceptors(FileInterceptor('file'))
async uploadThumbnail(
  @UploadedFile() file: Express.Multer.File,
  @Body('courseId') courseId: string,
) {
  // Upload to Cloudinary
  const result = await this.cloudinaryService.uploadFile(
    file,
    'courses'
  );

  // Save to database
  const updatedCourse = await this.prisma.course.update({
    where: { id: courseId },
    data: { thumbnail: result.url },
  });

  return {
    message: 'Cập nhật thumbnail thành công',
    data: updatedCourse,
  };
}
```

## Frontend Implementation

### Using Fetch API
```javascript
const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(
      'http://localhost:3001/api/cloudinary/upload',
      {
        method: 'POST',
        body: formData,
      }
    );

    const result = await response.json();
    console.log('Image URL:', result.data.url);
    // Lưu URL vào state hoặc gửi đi form khác
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Using Axios
```javascript
const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post(
      'http://localhost:3001/api/cloudinary/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    console.log('Image URL:', response.data.data.url);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

## File Size Limits

Mặc định Cloudinary cho phép:
- **Free tier**: 100 MB/file
- **Unlimited storage** cho tất cả file

Để giới hạn kích thước file từ backend:

```typescript
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

const fileFilter = (req, file, cb) => {
  const maxSize = 10 * 1024 * 1024; // 10 MB
  
  if (file.size > maxSize) {
    cb(new BadRequestException('File quá lớn (max 10MB)'));
  } else {
    cb(null, true);
  }
};

@UseInterceptors(
  FileInterceptor('file', {
    storage: memoryStorage(),
    fileFilter,
  })
)
```

## Supported File Types

Cloudinary hỗ trợ:
- **Images**: jpg, jpeg, png, gif, webp, ico, bmp, svg, tiff, asf
- **Videos**: mp4, avi, mov, flv, mkv, webm, ogv
- **Documents**: pdf, doc, docx, xls, xlsx, ppt, pptx

## Notes

- Cloudinary sẽ tự động optimize và cache các file
- URL returned là `secure_url` (https) nên an toàn
- Có thể xóa file từ Cloudinary nếu cần bằng `CloudinaryService.deleteFile(publicId)`
- Mỗi folder tạo thư mục riêng trong Cloudinary dashboard
