import { IsString, IsIn, IsOptional } from 'class-validator';

export class UpdateExamQuestionDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  optionA?: string;

  @IsOptional()
  @IsString()
  optionB?: string;

  @IsOptional()
  @IsString()
  optionC?: string;

  @IsOptional()
  @IsString()
  optionD?: string;

  @IsOptional()
  @IsString()
  @IsIn(['A', 'B', 'C', 'D'])
  correctAnswer?: string;
}
