import { Injectable } from '@nestjs/common';
import { type AuditLog, type Prisma } from '../generated/prisma/client.js';

export type AuditEntryInput = Omit<
  Prisma.AuditLogUncheckedCreateInput,
  'id' | 'createdAt'
>;

@Injectable()
export class AuditService {
  record(
    transaction: Prisma.TransactionClient,
    entry: AuditEntryInput,
  ): Promise<AuditLog> {
    return transaction.auditLog.create({ data: entry });
  }
}
