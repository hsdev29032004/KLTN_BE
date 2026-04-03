import { IsString, IsInt, Min } from 'class-validator';

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
}
