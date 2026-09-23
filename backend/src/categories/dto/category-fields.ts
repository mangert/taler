import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsString, Length, Matches, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../generated/prisma/client.js';

const isProvided = (_object: object, value: unknown): boolean =>
  value !== undefined;

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function uppercase(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class CategoryFieldsDto {
  @ApiPropertyOptional({ example: 'Продукты', minLength: 1, maxLength: 100 })
  @Transform(({ value }: TransformFnParams) => trim(value as unknown))
  @ValidateIf(isProvided)
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({
    example: 'shopping_cart',
    pattern: '^[a-z][a-z0-9_]*$',
    maxLength: 80,
  })
  @Transform(({ value }: TransformFnParams) => trim(value as unknown))
  @ValidateIf(isProvided)
  @IsString()
  @Length(1, 80)
  @Matches(/^[a-z][a-z0-9_]*$/)
  icon?: string;

  @ApiPropertyOptional({ example: '#2E7D32', pattern: '^#[0-9A-F]{6}$' })
  @Transform(({ value }: TransformFnParams) => uppercase(value as unknown))
  @ValidateIf(isProvided)
  @Matches(/^#[0-9A-F]{6}$/)
  color?: string;

  @ApiPropertyOptional({
    example: TransactionType.EXPENSE,
    enum: TransactionType,
  })
  @ValidateIf(isProvided)
  @IsEnum(TransactionType)
  type?: TransactionType;
}
