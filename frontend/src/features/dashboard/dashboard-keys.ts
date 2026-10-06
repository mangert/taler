export const dashboardKeys = {
  all: (userId: string) => ['dashboard', userId] as const,
  summary: (userId: string, months: number) =>
    [...dashboardKeys.all(userId), 'summary', months] as const,
};
