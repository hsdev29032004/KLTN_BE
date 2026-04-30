import { IsString, IsInt, Min, Max } from 'class-validator';

export class CreateExamDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  passPercent!: number;

  @IsInt()
  @Min(0)
  retryAfterDays!: number;

  @IsInt()
  @Min(1)
  questionCount!: number;

  @IsInt()
  @Min(1)
  duration!: number; // phút

  @IsInt()
  @Min(0)
  numEasy!: number;

  @IsInt()
  @Min(0)
  numNormal!: number;

  @IsInt()
  @Min(0)
  numHard!: number;
}
