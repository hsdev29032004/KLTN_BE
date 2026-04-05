import { IsInt, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  @Min(10000)
  amount!: number;
}
