/** Описывает клиентские запросы к API финансовой сводки. */
import type { components } from './schema';
import { apiRequest } from './http';

export type Dashboard = components['schemas']['DashboardResponseDto'];

export const dashboardApi = {
  /** Загружает финансовую сводку из API. */
  get: (months = 6): Promise<Dashboard> =>
    apiRequest<Dashboard>(`/api/v1/dashboard?months=${months}`),
};
