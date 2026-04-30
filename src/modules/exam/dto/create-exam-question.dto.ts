import { IsString, IsIn } from 'class-validator';

export class CreateExamQuestionDto {
  @IsString()
  content!: string;

  @IsString()
  optionA!: string;

  @IsString()
  optionB!: string;

  @IsString()
  optionC!: string;

  @IsString()
  optionD!: string;

  @IsString()
  @IsIn(['A', 'B', 'C', 'D'])
  correctAnswer!: string;

  // Difficulty: 'easy' | 'normal' | 'hard'
  @IsString()
  @IsIn(['easy', 'normal', 'hard'])
  difficulty!: string;
}
