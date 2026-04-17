import { IsString } from 'class-validator';

export class SubmitReviewDto {
  @IsString()
  description!: string;
}
