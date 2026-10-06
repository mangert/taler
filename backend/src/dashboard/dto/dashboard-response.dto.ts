import { ApiProperty } from '@nestjs/swagger';

export class DashboardTotalsDto {
  @ApiProperty({ example: '1000.0000' })
  income!: string;

  @ApiProperty({ example: '350.0000' })
  expense!: string;

  @ApiProperty({ example: '650.0000' })
  balance!: string;
}

export class DashboardCategoryDto {
  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ example: 'Groceries' })
  categoryName!: string;

  @ApiProperty({ example: '#2E7D32' })
  color!: string;

  @ApiProperty({ example: '250.0000' })
  amount!: string;
}

export class DashboardMonthlyDto {
  @ApiProperty({ format: 'date', example: '2026-09-01' })
  month!: string;

  @ApiProperty({ example: '1000.0000' })
  income!: string;

  @ApiProperty({ example: '350.0000' })
  expense!: string;
}

export class DashboardResponseDto {
  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ example: 6 })
  months!: number;

  @ApiProperty({ format: 'date', example: '2026-04-01' })
  fromMonth!: string;

  @ApiProperty({ format: 'date', example: '2026-09-01' })
  toMonth!: string;

  @ApiProperty({ type: DashboardTotalsDto })
  totals!: DashboardTotalsDto;

  @ApiProperty({ type: [DashboardCategoryDto] })
  expensesByCategory!: DashboardCategoryDto[];

  @ApiProperty({ type: [DashboardMonthlyDto] })
  monthlySeries!: DashboardMonthlyDto[];

  @ApiProperty({ type: [DashboardCategoryDto] })
  topCategories!: DashboardCategoryDto[];
}
