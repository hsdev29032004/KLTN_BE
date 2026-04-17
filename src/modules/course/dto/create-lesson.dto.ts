import { IsString } from 'class-validator';

export class CreateLessonDto {
    @IsString()
    name!: string;
}
