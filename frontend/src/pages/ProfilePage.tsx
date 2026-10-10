import { Button, Container, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import { ProfileForm } from '../features/profile/ProfileForm';
import { PageHeader } from '../shared/ui/PageHeader';

export function ProfilePage() {
  return (
    <Container component="main" maxWidth="sm" sx={{ py: { xs: 3, sm: 6 } }}>
      <Stack spacing={3}>
        <PageHeader
          title="Профиль"
          description="Настройте имя, часовой пояс и основную валюту."
        />
        <ProfileForm />
        <Button component={Link} to="/">
          Вернуться на главную
        </Button>
      </Stack>
    </Container>
  );
}
