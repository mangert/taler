import { AccountBalanceWallet } from '@mui/icons-material';
import { Box, Container, Paper, Stack, Typography } from '@mui/material';
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <Box
      component="main"
      sx={{
        alignItems: 'center',
        bgcolor: 'background.default',
        display: 'flex',
        minHeight: '100vh',
        py: { xs: 0, sm: 4 },
      }}
    >
      <Container
        maxWidth="xs"
        disableGutters
        sx={{ px: { xs: 0, sm: 3 }, width: '100%' }}
      >
        <Paper
          component="section"
          aria-label="Авторизация"
          elevation={3}
          sx={{
            bgcolor: 'background.paper',
            borderRadius: { xs: 0, sm: 3 },
            minHeight: { xs: '100vh', sm: 'auto' },
            p: { xs: 3, sm: 5 },
          }}
        >
          <Stack spacing={3}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <AccountBalanceWallet color="primary" fontSize="large" />
              <div>
                <Typography component="p" variant="h5" sx={{ fontWeight: 700 }}>
                  Taler
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Трекер личных финансов
                </Typography>
              </div>
            </Stack>
            <Outlet />
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
