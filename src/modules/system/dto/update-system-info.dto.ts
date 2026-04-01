import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, IsNumber } from 'class-validator';

export class UpdateSystemInfoDto {
  @ApiProperty({
    example: 7,
    description: 'Time in days to request refund',
    required: false,
  })
  @IsOptional()
  @IsInt()
  timeRefund?: number;

  @ApiProperty({
    example: 3,
    description: 'Limit number of refunds',
    required: false,
  })
  @IsOptional()
  @IsInt()
  limitRefund?: number;

  @ApiProperty({
    example: 5.5,
    description: 'Commission rate percentage',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  comissionRate?: number;

  @ApiProperty({
    example: 'Terms and conditions...',
    description: 'System terms',
    required: false,
  })
  @IsOptional()
  @IsString()
  term?: string;
}
