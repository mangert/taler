import { Container, Stack } from '@mui/material';
import { useAuth } from '../features/auth/auth-context';
import { PageHeader } from '../shared/ui/PageHeader';
import { DashboardPage } from './DashboardPage';

export function HomePage() {
  const { user } = useAuth();

  return (
    <Container component="main" maxWidth="md" sx={{ py: { xs: 3, sm: 6 } }}>
      <Stack spacing={3}>
        <PageHeader
          title={`Добро пожаловать, ${user?.displayName ?? ''}`}
          description="Ваши финансы за последние шесть месяцев."
        />
        <DashboardPage />
      </Stack>
    </Container>
  );
}
