import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, IsNumber } from 'class-validator';

export class UpdateSystemInfoDto {
  @ApiProperty({
    example: 5.5,
    description: 'Commission rate percentage',
    required: false,
  })
  @IsOptional()
  @IsNumber()
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
