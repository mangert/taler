import { ApiProperty } from '@nestjs/swagger';
import {
  AuditAction,
  AuditableEntityType,
  type Prisma,
} from '../../generated/prisma/client.js';

export class AuditLogResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: AuditableEntityType })
  entityType!: AuditableEntityType;

  @ApiProperty({ format: 'uuid' })
  entityId!: string;

  @ApiProperty({ enum: AuditAction })
  action!: AuditAction;

  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  before!: Prisma.JsonValue | null;

  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  after!: Prisma.JsonValue | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class AuditLogListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 2 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  items!: AuditLogResponseDto[];

  @ApiProperty({ type: AuditLogListMetaDto })
  meta!: AuditLogListMetaDto;
}
