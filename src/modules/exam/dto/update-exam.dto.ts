import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';

export class UpdateExamDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  passPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  retryAfterDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  questionCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  numEasy?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  numNormal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  numHard?: number;
}
