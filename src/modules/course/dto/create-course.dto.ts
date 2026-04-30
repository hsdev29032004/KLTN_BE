import { IsString, IsInt, Min, IsNumber, Max } from 'class-validator';
import { Type } from 'class-transformer';

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
}
