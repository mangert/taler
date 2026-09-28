import { ApiProperty } from '@nestjs/swagger';

export class TransactionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) categoryId!: string;
  @ApiProperty({ enum: ['INCOME', 'EXPENSE'] }) type!: 'INCOME' | 'EXPENSE';
  @ApiProperty({ example: '12.3456' }) amount!: string;
  @ApiProperty({ example: 'EUR' }) currency!: string;
  @ApiProperty({ example: '1.00000000' }) exchangeRateToBase!: string;
  @ApiProperty({ example: '12.3456' }) baseAmount!: string;
  @ApiProperty({ format: 'date' }) transactionDate!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class TransactionListMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class TransactionListResponseDto {
  @ApiProperty({ type: [TransactionResponseDto] })
  items!: TransactionResponseDto[];
  @ApiProperty({ type: TransactionListMetaDto }) meta!: TransactionListMetaDto;
}
