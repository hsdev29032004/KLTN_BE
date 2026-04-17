import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BanUserDto {
  @ApiProperty({
    description: 'Lý do cấm',
    example: 'Vi phạm quy định cộng đồng',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description:
      'Thời gian hết cấm (ISO string). Nếu không truyền = cấm vĩnh viễn',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsString()
  timeUnBan?: string;
}
