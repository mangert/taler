import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

function normalizeEmailValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class LoginDto {
  @ApiProperty({ example: 'personal@taler.local', format: 'email' })
  @Transform(({ value }: TransformFnParams) =>
    normalizeEmailValue(value as unknown),
  )
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'TalerPersonal2026!', maxLength: 128 })
  @IsString()
  @MaxLength(128)
  password!: string;
}
