# API Tìm Kiếm Khóa Học

> **Base URL**: `/api/course`  
> **Auth**: Public — không cần đăng nhập

---

## Endpoint

```
GET /api/course/search
```

---

## Query Parameters

| Param        | Type   | Bắt buộc | Mặc định    | Mô tả                                                                                 |
| ------------ | ------ | -------- | ----------- | ------------------------------------------------------------------------------------- |
| `name`       | string | Không    | —           | Tìm theo tên khóa học (không phân biệt hoa/thường, tìm chuỗi con)                    |
| `teacherId`  | string | Không    | —           | Lọc theo ID giảng viên                                                                |
| `teacherName`| string | Không    | —           | Tìm theo tên giảng viên (không phân biệt hoa/thường, tìm chuỗi con)                  |
| `topicId`    | string | Không    | —           | Lọc theo ID chủ đề (đơn lẻ)                                                          |
| `topicIds`   | string | Không    | —           | Lọc theo nhiều chủ đề (CSV hoặc array). Ví dụ: `topicIds=uuid1,uuid2`                 |
| `minPrice`   | number | Không    | —           | Giá tối thiểu (VND, `≥ 0`)                                                            |
| `maxPrice`   | number | Không    | —           | Giá tối đa (VND, `≥ 0`)                                                               |
| `minStar`    | number | Không    | —           | Số sao tối thiểu (`0` – `5`)                                                          |
| `maxStar`    | number | Không    | —           | Số sao tối đa (`0` – `5`)                                                             |
| `fromDate`   | string | Không    | —           | Ngày tạo từ (ISO 8601), ví dụ: `2026-01-01`                                           |
| `toDate`     | string | Không    | —           | Ngày tạo đến (ISO 8601), ví dụ: `2026-12-31`                                         |
| `sortBy`     | string | Không    | `createdAt` | Trường sắp xếp: `createdAt` \| `price` \| `star` \| `studentCount`                   |
| `sortOrder`  | string | Không    | `desc`      | Chiều sắp xếp: `asc` \| `desc`                                                        |
| `page`       | number | Không    | `1`         | Trang hiện tại (`≥ 1`)                                                                |
| `limit`      | number | Không    | `20`        | Số bản ghi mỗi trang (`1` – `100`)                                                    |

> Tất cả các param đều **tùy chọn**, có thể kết hợp tùy ý. Không truyền param nào = lấy tất cả khóa học đã publish, sắp xếp mới nhất trước.

---

## Ví dụ Request

### Tìm theo tên + lọc giá + sắp xếp theo sao
```
GET /api/course/search?name=react&minPrice=0&maxPrice=500000&minStar=4&sortBy=star&sortOrder=desc
```

### Tìm theo giảng viên + chủ đề
```
GET /api/course/search?teacherName=Nguyen&topicId=abc-123&page=1&limit=10
```

### Tìm theo nhiều chủ đề
```
GET /api/course/search?topicIds=uuid-topic-1,uuid-topic-2&page=1&limit=20
```

### Lọc khóa học mới trong tháng
```
GET /api/course/search?fromDate=2026-04-01&toDate=2026-04-30&sortBy=createdAt&sortOrder=desc
```

### Sắp xếp theo số học viên (phổ biến nhất)
```
GET /api/course/search?sortBy=studentCount&sortOrder=desc
```

---

## Response `200 OK`

```json
{
  "message": "Tìm kiếm khóa học thành công",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Lập trình React từ cơ bản đến nâng cao",
      "slug": "lap-trinh-react-tu-co-ban-den-nang-cao",
      "thumbnail": "https://cdn.example.com/thumbnails/react-course.jpg",
      "price": 299000,
      "star": "4.8",
      "status": "published",
      "studentCount": 1250,
      "createdAt": "2026-01-10T08:00:00.000Z",
      "user": {
        "id": "uuid-teacher",
        "fullName": "Nguyễn Văn Giảng",
        "avatar": "https://cdn.example.com/avatars/teacher.jpg"
      },
      "courseTopics": [
        {
          "topic": {
            "id": "uuid-topic",
            "name": "Frontend",
            "slug": "frontend"
          }
        }
      ]
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### Mô tả các trường trong `data[]`

| Trường          | Type     | Mô tả                                           |
| --------------- | -------- | ----------------------------------------------- |
| `id`            | string   | UUID của khóa học                               |
| `name`          | string   | Tên khóa học                                    |
| `slug`          | string   | Slug dùng để điều hướng URL                     |
| `thumbnail`     | string   | URL ảnh bìa                                     |
| `price`         | number   | Giá (VND). `0` = miễn phí                       |
| `star`          | string   | Điểm đánh giá trung bình (1 chữ số thập phân)  |
| `status`        | string   | Luôn là `published`, `update`, hoặc `need_update` |
| `studentCount`  | number   | Số học viên đã đăng ký                          |
| `createdAt`     | string   | Thời điểm tạo (ISO 8601)                        |
| `user`          | object   | Thông tin giảng viên (`id`, `fullName`, `avatar`) |
| `courseTopics`  | array    | Danh sách chủ đề của khóa học                   |

### Mô tả `meta`

| Trường       | Type   | Mô tả                    |
| ------------ | ------ | ------------------------ |
| `total`      | number | Tổng số kết quả tìm được |
| `page`       | number | Trang hiện tại           |
| `limit`      | number | Số item mỗi trang        |
| `totalPages` | number | Tổng số trang            |

---

## Gợi ý implement phía FE

### 1. Quản lý state filter

```typescript
interface CourseSearchParams {
  name?: string;
  teacherId?: string;
  teacherName?: string;
  topicId?: string;
  topicIds?: string[]; // array of topic ids (multi-select)
  minPrice?: number;
  maxPrice?: number;
  minStar?: number;
  maxStar?: number;
  fromDate?: string;
  toDate?: string;
  sortBy?: 'createdAt' | 'price' | 'star' | 'studentCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

### 2. Build URL query string (bỏ qua param rỗng/undefined)

```typescript
function buildSearchParams(filters: CourseSearchParams): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === '' || value === null) return;
    // support arrays (topicIds)
    if (Array.isArray(value)) {
      params.set(key, value.join(','));
      return;
    }
    params.set(key, String(value));
  });
  return params.toString();
}

// Sử dụng:
const queryString = buildSearchParams({ name: 'react', minStar: 4, page: 1 });
// → "name=react&minStar=4&page=1"
fetch(`/api/course/search?${queryString}`);
```

### 3. Đồng bộ filter với URL (Next.js / React Router)

```typescript
// Khi filter thay đổi → push vào URL để share/bookmark được
const router = useRouter();
router.push(`/courses?${buildSearchParams(filters)}`);

// Khi load trang → đọc filter từ URL
const searchParams = useSearchParams();
const filters: CourseSearchParams = {
  name: searchParams.get('name') ?? undefined,
  minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
  topicIds: searchParams.get('topicIds') ? searchParams.get('topicIds')!.split(',').map(s => s.trim()).filter(Boolean) : undefined,
  // ...
};
```

### 4. Reset phân trang khi thay đổi filter

Khi người dùng thay đổi bất kỳ filter nào (trừ `page`), luôn reset `page` về `1` để tránh kết quả rỗng:

```typescript
function onFilterChange(newFilter: Partial<CourseSearchParams>) {
  setFilters(prev => ({ ...prev, ...newFilter, page: 1 }));
}
```

### 5. Debounce ô tìm kiếm theo tên

```typescript
const debouncedName = useDebounce(nameInput, 400); // 400ms
useEffect(() => {
  onFilterChange({ name: debouncedName });
}, [debouncedName]);
```

---

## Lưu ý

- Chỉ trả về khóa học có `status` là `published`, `update`, hoặc `need_update`. Khóa học `draft`/`pending`/`rejected` **không xuất hiện** trong kết quả.
- `minPrice` và `maxPrice` có thể dùng độc lập (chỉ truyền một trong hai).
- `star` trong response là kiểu **string** (decimal từ Prisma), FE cần parse sang number nếu cần so sánh: `parseFloat(course.star)`.
- `fromDate`/`toDate` lọc theo `createdAt` của khóa học, không phải ngày publish.
