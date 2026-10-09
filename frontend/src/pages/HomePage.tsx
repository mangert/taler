import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/auth-context';
import { DashboardPage } from './DashboardPage';

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
          Ваши финансы за последние шесть месяцев.
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Button component={Link} to="/profile" variant="contained">
            Открыть профиль
          </Button>
          <Button component={Link} to="/categories" variant="outlined">
            Категории
          </Button>
          <Button component={Link} to={'/budgets'} variant={'outlined'}>
            Бюджеты
          </Button>
          <Button
            component={Link}
            to="/recurring-transactions"
            variant="outlined"
          >
            Повторяющиеся транзакции
          </Button>
          <Button component={Link} to="/transactions" variant="outlined">
            Транзакции
          </Button>
          <Button component={Link} to="/audit-log" variant="outlined">
            Журнал изменений
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
        </Box>
        <DashboardPage />
      </Stack>
    </Container>
  );
}
