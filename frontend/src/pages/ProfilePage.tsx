import { Button, Container, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { ProfileForm } from '../features/profile/ProfileForm';

export function ProfilePage() {
  return (
    <Container component="main" maxWidth="sm" sx={{ py: { xs: 3, sm: 6 } }}>
      <Stack spacing={3}>
        <div>
          <Typography component="h1" variant="h3" gutterBottom>
            Профиль
          </Typography>
          <Typography color="text.secondary">
            Настройте имя, часовой пояс и основную валюту.
          </Typography>
        </div>
        <ProfileForm />
        <Button component={Link} to="/">
          Вернуться на главную
        </Button>
      </Stack>
    </Container>
  );
}
