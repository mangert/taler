import type { components, operations } from './schema';
import { apiRequest } from './http';

export type AuditEntry = components['schemas']['AuditLogResponseDto'];
export type AuditList = components['schemas']['AuditLogListResponseDto'];
export type AuditEntityType = AuditEntry['entityType'];
export type AuditAction = AuditEntry['action'];
type AuditQuery = NonNullable<
  operations['AuditController_list']['parameters']['query']
>;

export interface AuditListParams {
  entityType: '' | AuditEntityType;
  action: '' | AuditAction;
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
}

export const auditApi = {
  list: (params: AuditListParams): Promise<AuditList> => {
    const query: AuditQuery = {
      page: params.page,
      pageSize: params.pageSize,
      entityType: params.entityType || undefined,
      action: params.action || undefined,
      dateFrom: params.dateFrom || undefined,
      dateTo: params.dateTo || undefined,
    };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) search.set(key, String(value));
    }
    return apiRequest<AuditList>(`/api/v1/audit-log?${search.toString()}`);
  },
};
