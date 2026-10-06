import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Matches, Max, Min, ValidateIf } from 'class-validator';
import { budgetMonthPattern } from './create-budget.dto.js';

const provided = (_object: object, value: unknown): boolean =>
  value !== undefined;

export class ListBudgetsQueryDto {
  @ApiPropertyOptional({
    format: 'date',
    example: '2026-09-01',
    description:
      'First day of a month; defaults to the current month in the user time zone',
  })
  @ValidateIf(provided)
  @Matches(budgetMonthPattern)
  month?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @ValidateIf(provided)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @ValidateIf(provided)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
