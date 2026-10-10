import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import { AppBar, Button, Toolbar } from '@mui/material';
import { Link } from 'react-router-dom';
import { ResponsiveNavigation } from './ResponsiveNavigation';
import { UserMenu } from './UserMenu';

export function AppHeader() {
  return (
    <AppBar component="header" color="default" position="static">
      <Toolbar sx={{ gap: { xs: 0.5, lg: 1 }, px: { xs: 1, sm: 2 } }}>
        <ResponsiveNavigation />
        <Button
          component={Link}
          to="/"
          color="inherit"
          startIcon={<AccountBalanceWalletOutlinedIcon color="primary" />}
          sx={{ fontWeight: 700, flexShrink: 0, order: { lg: -1 } }}
        >
          Taler
        </Button>
        <UserMenu />
      </Toolbar>
    </AppBar>
  );
}
