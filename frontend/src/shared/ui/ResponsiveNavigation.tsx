import MenuIcon from '@mui/icons-material/Menu';
import {
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';

const navigationItems = [
  { label: 'Обзор', to: '/' },
  { label: 'Транзакции', to: '/transactions' },
  { label: 'Категории', to: '/categories' },
  { label: 'Бюджеты', to: '/budgets' },
  { label: 'Повторяющиеся', to: '/recurring-transactions' },
  { label: 'Импорт CSV', to: '/transaction-imports' },
  { label: 'Журнал', to: '/audit-log' },
] as const;

export function ResponsiveNavigation() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (isDesktop) {
    return (
      <Stack
        component="nav"
        aria-label="Основная навигация"
        direction="row"
        spacing={0.25}
        sx={{ flexGrow: 1, justifyContent: 'center' }}
      >
        {navigationItems.map(({ label, to }) => (
          <Button
            key={to}
            component={NavLink}
            to={to}
            color="inherit"
            size="small"
            sx={{ whiteSpace: 'nowrap' }}
          >
            {label}
          </Button>
        ))}
      </Stack>
    );
  }

  return (
    <>
      <IconButton
        aria-label="Открыть навигацию"
        color="inherit"
        onClick={() => setDrawerOpen(true)}
      >
        <MenuIcon />
      </IconButton>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box
          component="nav"
          aria-label="Основная навигация"
          sx={{ width: 280, pt: 2 }}
        >
          <List>
            {navigationItems.map(({ label, to }) => (
              <ListItemButton
                key={to}
                component={NavLink}
                to={to}
                onClick={() => setDrawerOpen(false)}
              >
                <ListItemText primary={label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
