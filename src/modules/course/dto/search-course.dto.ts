import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SearchCourseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  teacherName?: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  /** Nhiều chủ đề, có thể truyền dạng csv: topicIds=uuid1,uuid2 */
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
    return undefined;
  })
  topicIds?: string[];

  /** Giá tối thiểu */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  /** Giá tối đa */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  /** Số sao tối thiểu (0–5) */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minStar?: number;

  /** Số sao tối đa (0–5) */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  maxStar?: number;

  /** Ngày tạo từ (ISO string) */
  @IsOptional()
  @IsString()
  fromDate?: string;

  /** Ngày tạo đến (ISO string) */
  @IsOptional()
  @IsString()
  toDate?: string;

  /** Sắp xếp theo trường */
  @IsOptional()
  @IsIn(['createdAt', 'price', 'star', 'studentCount'])
  sortBy?: 'createdAt' | 'price' | 'star' | 'studentCount';

  /** Chiều sắp xếp */
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
