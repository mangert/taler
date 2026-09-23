import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({
    example: '20000000-0000-4000-8000-000000000003',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ example: 'Продукты' })
  name!: string;

  @ApiProperty({ example: 'shopping_cart' })
  icon!: string;

  @ApiProperty({ example: '#2E7D32' })
  color!: string;

  @ApiProperty({ enum: ['INCOME', 'EXPENSE'], example: 'EXPENSE' })
  type!: 'INCOME' | 'EXPENSE';

  @ApiProperty({ example: '2026-09-22T10:00:00.000Z', format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-22T10:00:00.000Z', format: 'date-time' })
  updatedAt!: string;
}

export class CategoryListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 2 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class CategoryListResponseDto {
  @ApiProperty({ type: [CategoryResponseDto] })
  items!: CategoryResponseDto[];

  @ApiProperty({ type: CategoryListMetaDto })
  meta!: CategoryListMetaDto;
}
