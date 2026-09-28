import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TransactionType } from '../../generated/prisma/client.js';
import {
  amountPattern,
  datePattern,
  ratePattern,
} from './transaction-fields.dto.js';

export class CreateTransactionDto {
  @ApiProperty({ format: 'uuid' })
  @IsDefined()
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ enum: TransactionType })
  @IsDefined()
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiProperty({ example: '12.3456', pattern: amountPattern.source })
  @IsDefined()
  @Matches(amountPattern)
  amount!: string;

  @ApiProperty({ example: 'EUR', pattern: '^[A-Z]{3}$' })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsDefined()
  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @ApiProperty({ example: '1.00000000', pattern: ratePattern.source })
  @IsDefined()
  @Matches(ratePattern)
  exchangeRateToBase!: string;

  @ApiProperty({ example: '2026-09-01', format: 'date' })
  @IsDefined()
  @Matches(datePattern)
  transactionDate!: string;

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
