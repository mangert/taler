import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Matches, Max, Min, ValidateIf } from 'class-validator';
import {
  AuditAction,
  AuditableEntityType,
} from '../../generated/prisma/client.js';

const provided = (_object: object, value: unknown): boolean =>
  value !== undefined;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export class ListAuditLogQueryDto {
  @ApiPropertyOptional({ enum: AuditableEntityType })
  @ValidateIf(provided)
  @IsEnum(AuditableEntityType)
  entityType?: AuditableEntityType;

  @ApiPropertyOptional({ enum: AuditAction })
  @ValidateIf(provided)
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({ format: 'date', description: 'Inclusive UTC day' })
  @ValidateIf(provided)
  @Matches(datePattern)
  dateFrom?: string;

  @ApiPropertyOptional({ format: 'date', description: 'Inclusive UTC day' })
  @ValidateIf(provided)
  @Matches(datePattern)
  dateTo?: string;

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
