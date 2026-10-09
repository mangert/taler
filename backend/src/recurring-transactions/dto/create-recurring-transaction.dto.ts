import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
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
import {
  amountPattern,
  datePattern,
  ratePattern,
} from '../../transactions/dto/transaction-fields.dto.js';

export class CreateRecurringTransactionDto {
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

  @ApiProperty({ minimum: 1, maximum: 31, example: 31 })
  @IsDefined()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth!: number;

  @ApiProperty({ format: 'date', example: '2028-02-01' })
  @IsDefined()
  @Matches(datePattern)
  startDate!: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    nullable: true,
    example: '2028-12-31',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @Matches(datePattern)
  endDate?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 500, nullable: true })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Defaults to true when omitted on creation',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
