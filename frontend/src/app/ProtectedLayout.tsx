import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { AppHeader } from '../shared/ui/AppHeader';

export function ProtectedLayout() {
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppHeader />
      <Box id="main-content" tabIndex={-1}>
        <Outlet />
      </Box>
    </Box>
  );
}
