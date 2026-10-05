import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AuditLogListResponseDto,
  AuditLogResponseDto,
} from './dto/audit-log-response.dto.js';
import { ListAuditLogQueryDto } from './dto/list-audit-log-query.dto.js';

const dayMilliseconds = 24 * 60 * 60 * 1000;

function utcDay(value: string): Date {
  const date = new Date(value + 'T00:00:00.000Z');
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException({
      code: 'INVALID_DATE',
      message: 'Date must be a valid YYYY-MM-DD value',
    });
  }
  return date;
}

@Injectable()
export class AuditQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    query: ListAuditLogQueryDto,
  ): Promise<AuditLogListResponseDto> {
    const dateFrom = query.dateFrom ? utcDay(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? utcDay(query.dateTo) : undefined;
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: 'dateFrom must not exceed dateTo',
      });
    }

    const where: Prisma.AuditLogWhereInput = {
      userId,
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo
                ? { lt: new Date(dateTo.getTime() + dayMilliseconds) }
                : {}),
            },
          }
        : {}),
    };
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [records, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const items: AuditLogResponseDto[] = records.map((record) => ({
      id: record.id,
      entityType: record.entityType,
      entityId: record.entityId,
      action: record.action,
      before: record.before,
      after: record.after,
      createdAt: record.createdAt.toISOString(),
    }));
    return {
      items,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }
}
