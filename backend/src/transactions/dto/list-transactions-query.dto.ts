import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { TransactionType } from '../../generated/prisma/client.js';
import { amountPattern, datePattern } from './transaction-fields.dto.js';

const provided = (_object: object, value: unknown): boolean =>
  value !== undefined;

export class ListTransactionsQueryDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf(provided)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ format: 'date' })
  @ValidateIf(provided)
  @Matches(datePattern)
  dateFrom?: string;

  @ApiPropertyOptional({ format: 'date' })
  @ValidateIf(provided)
  @Matches(datePattern)
  dateTo?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf(provided)
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: '1.0000' })
  @ValidateIf(provided)
  @Matches(amountPattern)
  minAmount?: string;

  @ApiPropertyOptional({ example: '100.0000' })
  @ValidateIf(provided)
  @Matches(amountPattern)
  maxAmount?: string;

  @ApiPropertyOptional({ enum: TransactionType })
  @ValidateIf(provided)
  @IsEnum(TransactionType)
  type?: TransactionType;

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
