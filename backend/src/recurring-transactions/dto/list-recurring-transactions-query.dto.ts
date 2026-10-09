import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min, ValidateIf } from 'class-validator';

const provided = (_object: object, value: unknown): boolean =>
  value !== undefined;

export class ListRecurringTransactionsQueryDto {
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
