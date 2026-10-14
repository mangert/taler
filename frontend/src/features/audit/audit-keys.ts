/** Хранит ключи кеша запросов для работы с журналом аудита. */
import type { AuditListParams } from '../../shared/api/audit';

export const auditKeys = {
  /** Формирует корневой ключ кеша записей аудита. */
  all: (userId: string) => ['audit', userId] as const,
  /** Формирует ключ кеша списка записей аудита. */
  list: (userId: string, params: AuditListParams) =>
    [
      ...auditKeys.all(userId),
      'list',
      params.entityType,
      params.action,
      params.dateFrom,
      params.dateTo,
      params.page,
      params.pageSize,
    ] as const,
  /** Формирует ключ кеша событий выбранной сущности. */
  entity: (userId: string, entityId: string) =>
    [...auditKeys.all(userId), 'entity', entityId] as const,
};
