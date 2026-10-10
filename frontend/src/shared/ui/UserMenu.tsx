import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import { Button, Menu, MenuItem } from '@mui/material';
import { useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/auth-context';

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const displayName = user?.displayName ?? 'Пользователь';

  const openMenu = (event: MouseEvent<HTMLElement>): void => {
    setAnchorElement(event.currentTarget);
  };
  const closeMenu = (): void => setAnchorElement(null);
  const signOut = async (): Promise<void> => {
    closeMenu();
    try {
      await logout();
    } catch {
      // AuthProvider clears local session state even when the server is unavailable.
    }
    void navigate('/login', { replace: true });
  };

  return (
    <>
      <Button
        aria-label={`Меню пользователя: ${displayName}`}
        aria-controls={anchorElement ? 'user-menu' : undefined}
        aria-expanded={Boolean(anchorElement)}
        aria-haspopup="menu"
        color="inherit"
        onClick={openMenu}
        startIcon={<AccountCircleOutlinedIcon />}
        sx={{ flexShrink: 0, maxWidth: { xs: 160, sm: 240 } }}
      >
        {displayName}
      </Button>
      <Menu
        id="user-menu"
        anchorEl={anchorElement}
        open={Boolean(anchorElement)}
        onClose={closeMenu}
      >
        <MenuItem component={Link} to="/profile" onClick={closeMenu}>
          Профиль
        </MenuItem>
        <MenuItem onClick={() => void signOut()}>Выйти</MenuItem>
      </Menu>
    </>
  );
}
