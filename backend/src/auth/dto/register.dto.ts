import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsString,
  IsTimeZone,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

function normalizeEmailValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function trimValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeCurrencyValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class RegisterDto {
  @ApiProperty({ example: 'personal@taler.local', format: 'email' })
  @Transform(({ value }: TransformFnParams) =>
    normalizeEmailValue(value as unknown),
  )
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'TalerPersonal2026!', minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'Личный', minLength: 1, maxLength: 120 })
  @Transform(({ value }: TransformFnParams) => trimValue(value as unknown))
  @IsString()
  @Length(1, 120)
  displayName!: string;

  @ApiProperty({ example: 'RUB', pattern: '^[A-Z]{3}$' })
  @Transform(({ value }: TransformFnParams) =>
    normalizeCurrencyValue(value as unknown),
  )
  @Matches(/^[A-Z]{3}$/)
  baseCurrency!: string;

  @ApiProperty({ example: 'Europe/Moscow', maxLength: 100 })
  @Transform(({ value }: TransformFnParams) => trimValue(value as unknown))
  @IsTimeZone()
  @MaxLength(100)
  timeZone!: string;
}
