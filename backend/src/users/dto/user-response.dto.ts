import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '10000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: 'personal@taler.local', format: 'email' })
  email!: string;

  @ApiProperty({ example: 'Личный' })
  displayName!: string;

  @ApiProperty({ example: 'RUB', minLength: 3, maxLength: 3 })
  baseCurrency!: string;

  @ApiProperty({ example: 'Europe/Moscow' })
  timeZone!: string;

  @ApiProperty({ example: '2026-09-21T10:00:00.000Z', format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-21T10:00:00.000Z', format: 'date-time' })
  updatedAt!: string;
}
