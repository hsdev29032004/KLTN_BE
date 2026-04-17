# Flow 10: Tìm kiếm Khóa học (Course Search)

## Tổng quan
API public cho phép tìm kiếm khóa học theo nhiều tiêu chí: tên, giảng viên, chủ đề, giá, sao, ngày.  
Hỗ trợ phân trang + sắp xếp linh hoạt.

---

## 1. Luồng tìm kiếm

```mermaid
flowchart TD
    A[Client gửi GET /api/course/search?...params] --> B[Parse + validate SearchCourseDto]
    B -->|Lỗi validate| B1[400 Bad Request]
    B -->|OK| C[Coerce numeric params: string → number]
    
    C --> D[Build WHERE clause]
    D --> E{name?}
    E -->|Có| E1["name ILIKE '%react%'"]
    E -->|Không| F{teacherId?}
    E1 --> F
    F -->|Có| F1["userId = teacherId"]
    F -->|Không| G{teacherName?}
    F1 --> G
    G -->|Có| G1["user.fullName ILIKE '%nguyen%'"]
    G -->|Không| H{topicIds?}
    G1 --> H
    H -->|Có| H1["courseTopics.some.topicId IN [...]"]
    H -->|Không| H2{topicId?}
    H2 -->|Có| H3["courseTopics.some.topicId = id"]
    H1 --> I{price range?}
    H2 -->|Không| I
    H3 --> I
    I -->|Có| I1["price >= min AND price <= max"]
    I -->|Không| J{star range?}
    I1 --> J
    J -->|Có| J1["star >= min AND star <= max"]
    J -->|Không| K{date range?}
    J1 --> K
    K -->|Có| K1["createdAt >= from AND createdAt <= to"]
    K -->|Không| L[Thêm base filter]
    K1 --> L
    
    L --> M["isDeleted=false AND status IN (published, update, need_update)"]
    M --> N[Execute: findMany + count song song]
    N --> O[Trả về data + meta pagination]

    style A fill:#e1f5fe
    style O fill:#c8e6c9
    style B1 fill:#ffcdd2
```

---

## 2. Các tiêu chí tìm kiếm

```mermaid
mindmap
  root((Tìm kiếm))
    Văn bản
      name - tên khóa học
      teacherName - tên giảng viên
    Lọc chính xác
      teacherId - ID giảng viên
      topicId - 1 chủ đề
      topicIds - nhiều chủ đề CSV
    Khoảng giá trị
      minPrice ~ maxPrice
      minStar ~ maxStar
      fromDate ~ toDate
    Sắp xếp
      sortBy: createdAt / price / star / studentCount
      sortOrder: asc / desc
    Phân trang
      page: từ 1
      limit: 1-100
```

---

## 3. Xử lý từng filter chi tiết

### Text Search (case-insensitive contains)
```mermaid
flowchart LR
    A["name=react"] --> B["Prisma: { contains: 'react', mode: 'insensitive' }"]
    C["teacherName=Nguyen"] --> D["Prisma: { user: { fullName: { contains: 'Nguyen', mode: 'insensitive' } } }"]
```

### Topic Filter
```mermaid
flowchart TD
    A{Cách truyền?} --> B["topicId=uuid-1\n→ Lọc 1 chủ đề"]
    A --> C["topicIds=uuid-1,uuid-2,uuid-3\n→ Lọc nhiều chủ đề (OR)"]
    
    B --> D["courseTopics: { some: { topicId } }"]
    C --> E["courseTopics: { some: { topicId: { in: topicIds } } }"]
    
    E --> F["Trả về khóa học thuộc\nBẤT KỲ topic nào trong list"]

    style F fill:#fff9c4
```

### Price & Star Range
```mermaid
flowchart LR
    A["minPrice=100000\nmaxPrice=500000"] --> B["price: { gte: 100000, lte: 500000 }"]
    C["minStar=4"] --> D["star: { gte: 4 }\n→ Từ 4 sao trở lên"]
    E["Chỉ truyền maxPrice=0"] --> F["price: { lte: 0 }\n→ Khóa học miễn phí"]
```

### Date Range
```mermaid
flowchart LR
    A["fromDate=2026-04-01\ntoDate=2026-04-30"] --> B["createdAt: { gte: Date, lte: Date }"]
    C["Chỉ truyền fromDate"] --> D["createdAt: { gte: Date }\n→ Từ ngày đó trở đi"]
```

---

## 4. Sorting & Pagination

```mermaid
flowchart TD
    A[Params: sortBy + sortOrder] --> B{sortBy?}
    B -->|createdAt| C[Mới nhất / Cũ nhất]
    B -->|price| D[Rẻ nhất / Đắt nhất]
    B -->|star| E[Đánh giá cao nhất / thấp nhất]
    B -->|studentCount| F[Phổ biến nhất / Ít nhất]
    
    C --> G[ORDER BY + skip/take]
    D --> G
    E --> G
    F --> G
    G --> H["Trả về: data + meta { total, page, limit, totalPages }"]

    style H fill:#c8e6c9
```

---

## 5. Response cấu trúc

```mermaid
flowchart LR
    subgraph Response
        A[data: Course array]
        B[meta: Pagination]
    end
    
    subgraph "Course item"
        C[id, name, slug, thumbnail]
        D[price, star, status, studentCount]
        E[createdAt]
        F["user: { id, fullName, avatar }"]
        G["courseTopics: [{ topic: { id, name, slug } }]"]
    end
    
    subgraph "Meta"
        H[total: tổng kết quả]
        I[page: trang hiện tại]
        J[limit: items/page]
        K[totalPages: tổng trang]
    end
    
    A --> C
    A --> D
    A --> E
    A --> F
    A --> G
    B --> H
    B --> I
    B --> J
    B --> K
```

---

## 6. Ví dụ kịch bản sử dụng

```mermaid
flowchart TD
    subgraph "Kịch bản 1: Trang chủ - Phổ biến nhất"
        A1["GET /course/search?sortBy=studentCount&sortOrder=desc&limit=8"]
    end
    
    subgraph "Kịch bản 2: Filter sidebar"
        A2["GET /course/search?topicIds=fe-id,be-id&minPrice=0&maxPrice=500000&minStar=4&page=1"]
    end
    
    subgraph "Kịch bản 3: Tìm kiếm thanh search"
        A3["GET /course/search?name=react&sortBy=star&sortOrder=desc"]
    end
    
    subgraph "Kịch bản 4: Khóa học miễn phí"
        A4["GET /course/search?maxPrice=0&sortBy=studentCount&sortOrder=desc"]
    end
    
    subgraph "Kịch bản 5: Khóa học mới trong tháng"
        A5["GET /course/search?fromDate=2026-04-01&sortBy=createdAt&sortOrder=desc"]
    end
```

---

## Tổng hợp API

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/api/course/search` | Public | Tìm kiếm đa tiêu chí |
