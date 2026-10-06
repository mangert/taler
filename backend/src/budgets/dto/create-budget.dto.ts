import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsUUID, Matches } from 'class-validator';

export const budgetMonthPattern = /^\d{4}-(0[1-9]|1[0-2])-01$/;
export const budgetAmountPattern = /^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/;

export class CreateBudgetDto {
  @ApiProperty({ format: 'uuid' })
  @IsDefined()
  @IsUUID()
  categoryId!: string;

  @ApiProperty({
    example: '2026-09-01',
    format: 'date',
    pattern: budgetMonthPattern.source,
  })
  @IsDefined()
  @Matches(budgetMonthPattern)
  month!: string;

  @ApiProperty({ example: '500.0000', pattern: budgetAmountPattern.source })
  @IsDefined()
  @Matches(budgetAmountPattern)
  limitAmount!: string;
}
