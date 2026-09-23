import { ApiProperty } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsDefined, IsEnum, IsString, Length, Matches } from 'class-validator';
import { TransactionType } from '../../generated/prisma/client.js';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Продукты', minLength: 1, maxLength: 100 })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsDefined()
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({
    example: 'shopping_cart',
    pattern: '^[a-z][a-z0-9_]*$',
    maxLength: 80,
  })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsDefined()
  @IsString()
  @Length(1, 80)
  @Matches(/^[a-z][a-z0-9_]*$/)
  icon!: string;

  @ApiProperty({ example: '#2E7D32', pattern: '^#[0-9A-F]{6}$' })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsDefined()
  @Matches(/^#[0-9A-F]{6}$/)
  color!: string;

  @ApiProperty({ example: TransactionType.EXPENSE, enum: TransactionType })
  @IsDefined()
  @IsEnum(TransactionType)
  type!: TransactionType;
}
