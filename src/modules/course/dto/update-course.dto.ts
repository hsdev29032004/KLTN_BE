import { IsString, IsInt, Min, IsOptional, IsNumber, Max, IsArray, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class UpdateCourseDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsString()
    thumbnail?: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(100)
    commissionRate?: number;

    /** Danh sách ID chủ đề. Truyền mảng rỗng [] để xóa hết chủ đề. */
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null) return undefined;
        if (Array.isArray(value)) return value;
        try { return JSON.parse(value); } catch { return [value]; }
    })
    @IsArray()
    @IsUUID('4', { each: true })
    topicIds?: string[];
}
