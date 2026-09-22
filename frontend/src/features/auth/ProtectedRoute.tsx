import { Alert, Box, Button, CircularProgress, Stack } from '@mui/material';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';

export function ProtectedRoute() {
  const { user, isLoading, error, retry } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box
        component="main"
        sx={{ display: 'grid', minHeight: '100vh', placeItems: 'center' }}
      >
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <CircularProgress />
          <span>Проверяем сессию…</span>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box component="main" sx={{ mx: 'auto', p: 3, maxWidth: 560 }}>
        <Alert
          severity="error"
          action={<Button onClick={() => void retry()}>Повторить</Button>}
        >
          Не удалось проверить сессию.
        </Alert>
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
