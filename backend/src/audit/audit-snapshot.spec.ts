import {
  Prisma,
  type Budget,
  type Transaction,
} from '../generated/prisma/client.js';
import {
  budgetAuditSnapshot,
  transactionAuditSnapshot,
} from './audit-snapshot.js';

describe('audit snapshots', () => {
  it('serializes only transaction business fields and decimal strings', () => {
    const record: Transaction = {
      id: '40000000-0000-4000-8000-000000000001',
      userId: '10000000-0000-4000-8000-000000000001',
      categoryId: '20000000-0000-4000-8000-000000000003',
      type: 'EXPENSE',
      amount: new Prisma.Decimal('12.3456'),
      currency: 'USD',
      exchangeRateToBase: new Prisma.Decimal('0.92000000'),
      baseAmount: new Prisma.Decimal('11.3580'),
      transactionDate: new Date('2026-09-01T00:00:00.000Z'),
      description: 'Coffee',
      recurringTransactionId: null,
      scheduledDate: null,
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
      updatedAt: new Date('2026-09-01T11:00:00.000Z'),
    };

    const withSensitiveField = { ...record, passwordHash: 'must-not-leak' };
    expect(transactionAuditSnapshot(withSensitiveField)).toEqual({
      id: record.id,
      categoryId: record.categoryId,
      type: 'EXPENSE',
      amount: '12.3456',
      currency: 'USD',
      exchangeRateToBase: '0.92000000',
      baseAmount: '11.3580',
      transactionDate: '2026-09-01',
      description: 'Coffee',
    });
  });

  it('serializes only budget business fields', () => {
    const record: Budget = {
      id: '30000000-0000-4000-8000-000000000001',
      userId: '10000000-0000-4000-8000-000000000001',
      categoryId: '20000000-0000-4000-8000-000000000003',
      month: new Date('2026-09-01T00:00:00.000Z'),
      limitAmount: new Prisma.Decimal('30000.0000'),
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
      updatedAt: new Date('2026-09-01T11:00:00.000Z'),
    };

    const withSensitiveField = { ...record, passwordHash: 'must-not-leak' };
    expect(budgetAuditSnapshot(withSensitiveField)).toEqual({
      id: record.id,
      categoryId: record.categoryId,
      month: '2026-09-01',
      limitAmount: '30000.0000',
    });
  });
});
