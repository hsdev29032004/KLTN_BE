# API: Home Dashboard (Trang Chủ)

## Endpoint

```
GET /api/stat/home
```

**Phạm vi truy cập:** Public — không cần đăng nhập.

---

## Response

```json
{
  "message": "Lấy dữ liệu trang chủ thành công",
  "data": {
    "stats": {
      "totalStudents": 3840,
      "totalPublishedCourses": 126
    },
    "topicCourses": [
      {
        "topic": {
          "id": "uuid-topic-1",
          "name": "Lập trình web",
          "slug": "lap-trinh-web"
        },
        "courses": [
          {
            "id": "uuid-course-1",
            "name": "NestJS từ cơ bản đến nâng cao",
            "slug": "nestjs-tu-co-ban-den-nang-cao",
            "thumbnail": "https://res.cloudinary.com/xxx/image/upload/thumb.jpg",
            "price": 299000,
            "star": 4.8,
            "studentCount": 450,
            "user": {
              "id": "uuid-teacher",
              "fullName": "Nguyễn Văn A",
              "avatar": "https://...",
              "slug": "nguyen-van-a"
            }
          }
        ]
      },
      {
        "topic": { "id": "uuid-topic-2", "name": "Data Science", "slug": "data-science" },
        "courses": [ ... ]
      },
      {
        "topic": { "id": "uuid-topic-3", "name": "Thiết kế UI/UX", "slug": "thiet-ke-ui-ux" },
        "courses": [ ... ]
      }
    ]
  }
}
```

---

## Mô tả các trường

### `data.stats`

| Trường                 | Kiểu   | Mô tả                                             |
|------------------------|--------|---------------------------------------------------|
| `totalStudents`        | number | Tổng số tài khoản học viên (role = User) hiện tại |
| `totalPublishedCourses`| number | Tổng số khóa học đang published                   |

### `data.topicCourses[]`

Mảng gồm **3 chủ đề ngẫu nhiên** (từ các chủ đề có ít nhất 1 khóa học published). Mỗi request trả về bộ 3 topic khác nhau.

| Trường           | Kiểu     | Mô tả                                        |
|------------------|----------|----------------------------------------------|
| `topic.id`       | string   | UUID của chủ đề                              |
| `topic.name`     | string   | Tên chủ đề                                   |
| `topic.slug`     | string   | Slug dùng để link `/courses?topicId=slug`    |
| `courses`        | array    | Tối đa **4 khóa học** sắp xếp theo `studentCount` giảm dần |

### `courses[]` (mỗi phần tử)

| Trường          | Kiểu        | Mô tả                                 |
|-----------------|-------------|---------------------------------------|
| `id`            | string      | UUID khóa học                         |
| `name`          | string      | Tên khóa học                          |
| `slug`          | string      | Slug dùng để routing `/course/:slug`  |
| `thumbnail`     | string\|null| URL ảnh bìa                           |
| `price`         | number      | Giá (VNĐ), `0` = miễn phí            |
| `star`          | number      | Điểm đánh giá trung bình (0–5)        |
| `studentCount`  | number      | Số học viên đã mua                    |
| `user.id`       | string      | UUID giảng viên                       |
| `user.fullName` | string      | Tên giảng viên                        |
| `user.avatar`   | string\|null| Ảnh đại diện giảng viên               |
| `user.slug`     | string      | Slug giảng viên → link `/teacher/:slug` |

---

## Lưu ý

- **3 chủ đề được chọn ngẫu nhiên** mỗi lần gọi API. FE nên cache response trong phiên làm việc (ví dụ: trong React Query với `staleTime: 5 * 60 * 1000`).
- Mỗi topic trả về tối đa **4 khóa học** phổ biến nhất (theo `studentCount`).
- Chỉ trả về topic có **ít nhất 1 khóa học published**. Nếu hệ thống có ít hơn 3 topic hợp lệ, `topicCourses` sẽ có ít hơn 3 phần tử.

---

## Hướng dẫn tích hợp FE

### 1. Gọi API khi load trang chủ

```ts
const res = await fetch('/api/stat/home');
const { data } = await res.json();

const { totalStudents, totalPublishedCourses } = data.stats;
const topicCourses = data.topicCourses; // mảng 3 topic
```

### 2. Cấu trúc giao diện gợi ý

```
┌──────────────────────────────────────────────────┐
│  🎓 3.840 Học viên đã tin tưởng                  │
│  📚 126 Khóa học chất lượng                       │
└──────────────────────────────────────────────────┘

── Lập trình web ──────────────────── [Xem tất cả →]
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ [thumb]  │ │ [thumb]  │ │ [thumb]  │ │ [thumb]  │
│ Tên KH   │ │ Tên KH   │ │ Tên KH   │ │ Tên KH   │
│ ⭐ 4.8   │ │ ⭐ 4.6   │ │ ⭐ 4.9   │ │ ⭐ 4.7   │
│ 450 HV   │ │ 280 HV   │ │ 510 HV   │ │ 190 HV   │
│ 299.000₫ │ │ 199.000₫ │ │ 0₫ Free  │ │ 499.000₫ │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

── Data Science ───────────────────── [Xem tất cả →]
[ ... 4 khóa học ... ]

── Thiết kế UI/UX ─────────────────── [Xem tất cả →]
[ ... 4 khóa học ... ]
```

### 3. Link "Xem tất cả" theo topic

```ts
// Link đến trang search lọc theo topic
const viewAllLink = `/courses/search?topicId=${topic.id}`;
// hoặc dùng slug nếu FE hỗ trợ
const viewAllLink = `/courses/search?topicSlug=${topic.slug}`;
```

### 4. Format hiển thị

```ts
const formatPrice = (price: number) =>
  price === 0 ? 'Miễn phí' : price.toLocaleString('vi-VN') + '₫';

const formatStat = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
// 3840 → "3.8k", 126 → "126"
```

### 5. Ví dụ React với React Query

```tsx
import { useQuery } from '@tanstack/react-query';

function HomePage() {
  const { data } = useQuery({
    queryKey: ['home-dashboard'],
    queryFn: () => fetch('/api/stat/home').then(r => r.json()),
    staleTime: 5 * 60 * 1000, // cache 5 phút
  });

  const stats = data?.data?.stats;
  const topicCourses = data?.data?.topicCourses ?? [];

  return (
    <>
      <StatsBar
        students={stats?.totalStudents}
        courses={stats?.totalPublishedCourses}
      />
      {topicCourses.map(({ topic, courses }) => (
        <TopicSection key={topic.id} topic={topic} courses={courses} />
      ))}
    </>
  );
}
```
