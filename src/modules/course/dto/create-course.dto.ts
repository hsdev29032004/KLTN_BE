import { IsString, IsInt, Min, IsNumber, Max, IsOptional, IsArray, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateCourseDto {
    @IsString()
    name!: string;

    @IsInt()
    @Min(0)
    price!: number;

    @IsString()
    thumbnail!: string;

    @IsString()
    content!: string;

    @IsString()
    description!: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(100)
    commissionRate!: number;

    /** Danh sách ID chủ đề. Có thể truyền nhiều lần hoặc dạng JSON array (multipart/form-data). */
    @IsOptional()
    @Transform(({ value }) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        try { return JSON.parse(value); } catch { return [value]; }
    })
    @IsArray()
    @IsUUID('4', { each: true })
    topicIds?: string[];
}
