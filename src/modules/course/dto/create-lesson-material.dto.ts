import { IsString, IsEnum } from 'class-validator';

export class CreateLessonMaterialDto {
    @IsString()
    name!: string;

    @IsString()
    url!: string;

    @IsEnum(['video', 'pdf', 'img', 'link', 'other'])
    type!: string;
}
