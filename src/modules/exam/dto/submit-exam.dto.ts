import { IsArray, ValidateNested, IsString, IsIn, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class AnswerDto {
  @IsString()
  questionId!: string;

  @IsString()
  @IsIn(['A', 'B', 'C', 'D'])
  selectedAnswer!: string;
}

export class SubmitExamDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}
