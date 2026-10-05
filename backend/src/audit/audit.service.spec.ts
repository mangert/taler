import { jest } from '@jest/globals';
import {
  AuditAction,
  AuditableEntityType,
  type AuditLog,
  type Prisma,
} from '../generated/prisma/client.js';
import { AuditService } from './audit.service.js';

const entry = {
  userId: '10000000-0000-4000-8000-000000000001',
  entityType: AuditableEntityType.TRANSACTION,
  entityId: '40000000-0000-4000-8000-000000000001',
  action: AuditAction.CREATE,
  after: { amount: '23.5000' },
};

describe('AuditService', () => {
  it('writes an audit entry through the supplied transaction client', async () => {
    const created: AuditLog = {
      id: '60000000-0000-4000-8000-000000000001',
      userId: entry.userId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      before: null,
      after: entry.after,
      createdAt: new Date('2026-09-28T12:00:00.000Z'),
    };
    const create = jest
      .fn<() => Promise<AuditLog>>()
      .mockResolvedValue(created);
    const transaction = {
      auditLog: { create },
    } as unknown as Prisma.TransactionClient;

    await expect(
      new AuditService().record(transaction, entry),
    ).resolves.toEqual(created);
    expect(create).toHaveBeenCalledWith({ data: entry });
  });

  it('propagates a transaction client write failure', async () => {
    const error = new Error('Audit write failed');
    const create = jest.fn<() => Promise<AuditLog>>().mockRejectedValue(error);
    const transaction = {
      auditLog: { create },
    } as unknown as Prisma.TransactionClient;

    await expect(new AuditService().record(transaction, entry)).rejects.toBe(
      error,
    );
  });
});
