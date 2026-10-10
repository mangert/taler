import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { AuthProvider } from '../features/auth/AuthProvider';
import { createAppQueryClient } from './query-client';
import { appTheme } from './theme';

interface AppProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

export function AppProviders({ children, queryClient }: AppProvidersProps) {
  const [defaultQueryClient] = useState(createAppQueryClient);

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient ?? defaultQueryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
