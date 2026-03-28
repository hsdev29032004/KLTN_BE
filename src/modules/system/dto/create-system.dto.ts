import { ApiProperty } from '@nestjs/swagger';

export class CreateSystemDto {
  @ApiProperty({
    example: '1234567890',
    description: 'Bank account number',
  })
  bankNumber: string;

  @ApiProperty({
    example: 'Vietcombank',
    description: 'Bank name',
  })
  bankName: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Account recipient/owner name',
  })
  recipient: string;
}
