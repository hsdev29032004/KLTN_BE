import { IsString } from 'class-validator';

export class RejectCourseDto {
  @IsString()
  reason!: string;
}
