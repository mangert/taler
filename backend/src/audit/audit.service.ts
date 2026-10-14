/** Реализует операции с журналом аудита. */
import { Injectable } from '@nestjs/common';
import { type AuditLog, type Prisma } from '../generated/prisma/client.js';

export type AuditEntryInput = Omit<
  Prisma.AuditLogUncheckedCreateInput,
  'id' | 'createdAt'
>;

@Injectable()
export class AuditService {
  /** Записывает событие в журнал аудита. */
  record(
    transaction: Prisma.TransactionClient,
    entry: AuditEntryInput,
  ): Promise<AuditLog> {
    return transaction.auditLog.create({ data: entry });
  }
}
