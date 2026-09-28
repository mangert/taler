import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import { TransactionType } from '../../generated/prisma/client.js';

const provided = (_object: object, value: unknown): boolean =>
  value !== undefined;
export const amountPattern = /^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/;
export const ratePattern = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,8})?$/;
export const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export class TransactionFieldsDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf(provided)
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: TransactionType })
  @ValidateIf(provided)
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ example: '12.3456', pattern: amountPattern.source })
  @ValidateIf(provided)
  @Matches(amountPattern)
  amount?: string;

  @ApiPropertyOptional({ example: 'EUR', pattern: '^[A-Z]{3}$' })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @ValidateIf(provided)
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiPropertyOptional({ example: '1.00000000', pattern: ratePattern.source })
  @ValidateIf(provided)
  @Matches(ratePattern)
  exchangeRateToBase?: string;

  @ApiPropertyOptional({ example: '2026-09-01', format: 'date' })
  @ValidateIf(provided)
  @Matches(datePattern)
  transactionDate?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'Coffee',
    maxLength: 500,
    nullable: true,
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
