import { Box } from '@mui/material';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../shared/ui/PageStates';
import { useAuth } from './auth-context';

export function ProtectedRoute() {
  const { user, isLoading, error, retry } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{ display: 'grid', minHeight: '100vh', placeItems: 'center' }}
      >
        <LoadingState message="Проверяем сессию…" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{ mx: 'auto', p: 3, maxWidth: 560 }}
      >
        <ErrorState
          message="Не удалось проверить сессию."
          onRetry={() => void retry()}
        />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
