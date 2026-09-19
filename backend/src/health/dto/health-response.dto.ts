import { ApiProperty } from '@nestjs/swagger';

export class HealthChecksDto {
  @ApiProperty({ example: 'up', enum: ['up'] })
  process!: 'up';

  @ApiProperty({ example: 'up', enum: ['up', 'down'] })
  database!: 'up' | 'down';
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'error'] })
  status!: 'ok' | 'error';

  @ApiProperty({ type: HealthChecksDto })
  checks!: HealthChecksDto;

  @ApiProperty({ example: '2026-09-18T20:00:00.000Z', format: 'date-time' })
  timestamp!: string;
}
