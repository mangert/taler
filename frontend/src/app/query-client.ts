/** Создаёт и настраивает клиент запросов. */
import { QueryClient } from '@tanstack/react-query';

/** Создаёт клиент запросов с настройками приложения. */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 60_000,
      },
      mutations: { retry: false },
    },
  });
}
