/** Формирует снимки сущностей для журнала аудита. */
import type { Budget, Transaction } from '../generated/prisma/client.js';

/** Создаёт снимок транзакции для аудита. */
export function transactionAuditSnapshot(record: Transaction) {
  return {
    id: record.id,
    categoryId: record.categoryId,
    type: record.type,
    amount: record.amount.toFixed(4),
    currency: record.currency,
    exchangeRateToBase: record.exchangeRateToBase.toFixed(8),
    baseAmount: record.baseAmount.toFixed(4),
    transactionDate: record.transactionDate.toISOString().slice(0, 10),
    description: record.description,
  };
}

/** Создаёт снимок бюджета для аудита. */
export function budgetAuditSnapshot(record: Budget) {
  return {
    id: record.id,
    categoryId: record.categoryId,
    month: record.month.toISOString().slice(0, 10),
    limitAmount: record.limitAmount.toFixed(4),
  };
}
