import { Button, Container, Stack, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/auth-context';

export function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Container component="main" maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Typography component="h1" variant="h3">
          Добро пожаловать, {user?.displayName}
        </Typography>
        <Typography color="text.secondary">
          Основные финансовые разделы появятся на следующих этапах.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button component={Link} to="/profile" variant="contained">
            Открыть профиль
          </Button>
          <Button
            variant="outlined"
            onClick={async () => {
              await logout();
              await navigate('/login', { replace: true });
            }}
          >
            Выйти
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
