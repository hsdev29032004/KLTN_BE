export class QueryRevenueDto {
  /** Filter theo giảng viên */
  teacherId?: string;
  /** Filter theo khóa học */
  courseId?: string;
  /** Filter theo học viên (người mua) */
  studentId?: string;
  /** Ngày bắt đầu (ISO 8601) */
  fromDate?: string;
  /** Ngày kết thúc (ISO 8601) */
  toDate?: string;
  /** Nhóm theo khoảng thời gian: day | week | month | year */
  groupBy?: string;
  /** Trang */
  page?: string;
  /** Số bản ghi mỗi trang */
  limit?: string;
  /** Sắp xếp: createdAt | price */
  sortBy?: string;
  /** asc | desc */
  order?: string;
}

export class QueryUserStatDto {
  /** Ngày bắt đầu */
  fromDate?: string;
  /** Ngày kết thúc */
  toDate?: string;
  /** Nhóm theo: day | week | month | year */
  groupBy?: string;
  /** Filter role: Admin | Teacher | User */
  roleName?: string;
}

export class QueryCourseStatDto {
  /** Ngày bắt đầu */
  fromDate?: string;
  /** Ngày kết thúc */
  toDate?: string;
  /** Filter theo trạng thái khóa học */
  status?: string;
  /** Filter theo giảng viên */
  teacherId?: string;
  /** Nhóm theo: day | week | month | year */
  groupBy?: string;
  /** Sắp xếp: studentCount | star | revenue | createdAt */
  sortBy?: string;
  /** asc | desc */
  order?: string;
  /** Giới hạn top N */
  topN?: string;
}
