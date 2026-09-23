import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const isProvided = (_object: object, value: unknown): boolean =>
  value !== undefined;

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({ example: 'прод', maxLength: 100 })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf(isProvided)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @ValidateIf(isProvided)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @ValidateIf(isProvided)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
