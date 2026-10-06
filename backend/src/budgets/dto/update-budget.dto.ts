import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, Matches, ValidateIf } from 'class-validator';
import {
  budgetAmountPattern,
  budgetMonthPattern,
} from './create-budget.dto.js';

const provided = (_object: object, value: unknown): boolean =>
  value !== undefined;

export class UpdateBudgetDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf(provided)
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    example: '2026-09-01',
    format: 'date',
    pattern: budgetMonthPattern.source,
  })
  @ValidateIf(provided)
  @Matches(budgetMonthPattern)
  month?: string;

  @ApiPropertyOptional({
    example: '500.0000',
    pattern: budgetAmountPattern.source,
  })
  @ValidateIf(provided)
  @Matches(budgetAmountPattern)
  limitAmount?: string;
}
