import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { authApi, type UserProfile } from '../../shared/api/auth';
import { ApiError } from '../../shared/api/http';
import {
  AuthContext,
  authQueryKey,
  type AuthContextValue,
} from './auth-context';

function isAuthQueryKey(queryKey: readonly unknown[]): boolean {
  return (
    queryKey.length === authQueryKey.length &&
    queryKey.every((value, index) => value === authQueryKey[index])
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: authQueryKey,
    queryFn: async (): Promise<UserProfile | null> => {
      try {
        return await authApi.getCurrentUser();
      } catch (error: unknown) {
        if (error instanceof ApiError && error.statusCode === 401) {
          return null;
        }

        throw error;
      }
    },
  });

  const setUser = (user: UserProfile): UserProfile => {
    queryClient.setQueryData(authQueryKey, user);
    return user;
  };

  const value: AuthContextValue = {
    user: sessionQuery.data ?? null,
    isLoading: sessionQuery.isPending,
    error: sessionQuery.error instanceof Error ? sessionQuery.error : null,
    login: async (input) => setUser(await authApi.login(input)),
    register: async (input) => setUser(await authApi.register(input)),
    logout: async () => {
      try {
        await authApi.logout();
      } finally {
        await queryClient.cancelQueries();
        queryClient.setQueryData(authQueryKey, null);
        queryClient.removeQueries({
          predicate: ({ queryKey }) => !isAuthQueryKey(queryKey),
        });
        queryClient.getMutationCache().clear();
      }
    },
    updateProfile: async (input) => setUser(await authApi.updateProfile(input)),
    retry: async () => {
      await sessionQuery.refetch();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
