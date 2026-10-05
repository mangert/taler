import type { AuditListParams } from '../../shared/api/audit';

export const auditKeys = {
  all: (userId: string) => ['audit', userId] as const,
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
  entity: (userId: string, entityId: string) =>
    [...auditKeys.all(userId), 'entity', entityId] as const,
};
