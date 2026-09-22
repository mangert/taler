import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsString,
  IsTimeZone,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

function trimValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeCurrencyValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

const isProvided = (_object: object, value: unknown): boolean =>
  value !== undefined;

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Личный', minLength: 1, maxLength: 120 })
  @Transform(({ value }: TransformFnParams) => trimValue(value as unknown))
  @ValidateIf(isProvided)
  @IsString()
  @Length(1, 120)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Europe/Moscow', maxLength: 100 })
  @Transform(({ value }: TransformFnParams) => trimValue(value as unknown))
  @ValidateIf(isProvided)
  @IsTimeZone()
  @MaxLength(100)
  timeZone?: string;

  @ApiPropertyOptional({ example: 'RUB', pattern: '^[A-Z]{3}$' })
  @Transform(({ value }: TransformFnParams) =>
    normalizeCurrencyValue(value as unknown),
  )
  @ValidateIf(isProvided)
  @Matches(/^[A-Z]{3}$/)
  baseCurrency?: string;
}
