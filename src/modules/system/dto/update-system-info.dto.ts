import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSystemInfoDto {
  @ApiProperty({
    example: 5.5,
    description: 'Commission rate percentage',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  comissionRate?: number;

  @ApiProperty({
    example: '<div>Contact us at <a href="mailto:contact@example.com">contact@example.com</a></div>',
    description: 'Contact information',
    required: false,
  })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiProperty({
    example: 'Terms and conditions...',
    required: false,
  })
  @IsOptional()
  @IsString()
  term?: string;
}
