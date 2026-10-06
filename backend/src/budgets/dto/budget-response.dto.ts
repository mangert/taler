import { ApiProperty } from '@nestjs/swagger';

export class BudgetResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ format: 'date', example: '2026-09-01' })
  month!: string;

  @ApiProperty({ example: '500.0000' })
  limitAmount!: string;

  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ example: '125.0000' })
  spentAmount!: string;

  @ApiProperty({ example: '375.0000' })
  remainingAmount!: string;

  @ApiProperty({ example: 25 })
  progressPercent!: number;

  @ApiProperty({ example: false })
  isExceeded!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class BudgetListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class BudgetListResponseDto {
  @ApiProperty({ type: [BudgetResponseDto] })
  items!: BudgetResponseDto[];

  @ApiProperty({ type: BudgetListMetaDto })
  meta!: BudgetListMetaDto;
}
