import type {
  AuditAction,
  AuditEntry,
  AuditEntityType,
} from '../../shared/api/audit';

export const entityLabels: Record<AuditEntityType, string> = {
  TRANSACTION: 'Транзакция',
  BUDGET: 'Бюджет',
};

export const actionLabels: Record<AuditAction, string> = {
  CREATE: 'Создание',
  UPDATE: 'Изменение',
  DELETE: 'Удаление',
};

const fieldLabels: Record<string, string> = {
  categoryId: 'Категория',
  type: 'Тип',
  amount: 'Сумма',
  currency: 'Валюта',
  exchangeRateToBase: 'Курс к основной валюте',
  baseAmount: 'Сумма в основной валюте',
  transactionDate: 'Дата транзакции',
  description: 'Описание',
  month: 'Месяц',
  limitAmount: 'Лимит',
};

const fieldOrder = Object.keys(fieldLabels);

export interface AuditFieldChange {
  key: string;
  label: string;
  before: string;
  after: string;
  changed: boolean;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return 'Сложное значение';
}

export function auditChanges(entry: AuditEntry): AuditFieldChange[] {
  const before = entry.before ?? {};
  const after = entry.after ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => key !== 'id')
    .sort((left, right) => {
      const leftOrder = fieldOrder.indexOf(left);
      const rightOrder = fieldOrder.indexOf(right);
      return (
        (leftOrder < 0 ? fieldOrder.length : leftOrder) -
          (rightOrder < 0 ? fieldOrder.length : rightOrder) ||
        left.localeCompare(right)
      );
    });
  return keys.map((key) => ({
    key,
    label: fieldLabels[key] ?? key,
    before: displayValue(before[key]),
    after: displayValue(after[key]),
    changed: before[key] !== after[key],
  }));
}

export function auditSummary(entry: AuditEntry): string {
  const snapshot = entry.after ?? entry.before;
  if (typeof snapshot?.description === 'string' && snapshot.description.trim())
    return snapshot.description;
  if (typeof snapshot?.month === 'string') return `Бюджет за ${snapshot.month}`;
  return entityLabels[entry.entityType];
}

export function formatAuditTimestamp(
  timestamp: string,
  timeZone: string,
): string {
  const localDateTime = new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(timestamp));
  return `${localDateTime} (${timeZone})`;
}
