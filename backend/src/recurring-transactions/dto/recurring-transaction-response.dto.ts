import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '../../generated/prisma/client.js';

export class RecurringTransactionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ enum: TransactionType })
  type!: TransactionType;

  @ApiProperty({ example: '12.3456' })
  amount!: string;

  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ example: '1.00000000' })
  exchangeRateToBase!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ minimum: 1, maximum: 31 })
  dayOfMonth!: number;

  @ApiProperty({ format: 'date' })
  startDate!: string;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  endDate!: string | null;

  @ApiProperty({
    format: 'date-time',
    description: 'UTC instant of midnight in the user time zone',
  })
  nextRunAt!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class RecurringTransactionListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class RecurringTransactionListResponseDto {
  @ApiProperty({ type: [RecurringTransactionResponseDto] })
  items!: RecurringTransactionResponseDto[];

  @ApiProperty({ type: RecurringTransactionListMetaDto })
  meta!: RecurringTransactionListMetaDto;
}
