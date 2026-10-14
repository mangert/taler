/** Хранит ключи кеша запросов для работы с финансовой сводкой. */
export const dashboardKeys = {
  /** Формирует корневой ключ кеша финансовой сводки. */
  all: (userId: string) => ['dashboard', userId] as const,
  /** Формирует ключ кеша финансовой сводки. */
  summary: (userId: string, months: number) =>
    [...dashboardKeys.all(userId), 'summary', months] as const,
};
