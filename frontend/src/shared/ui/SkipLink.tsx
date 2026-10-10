import { Box } from '@mui/material';

export function SkipLink() {
  return (
    <Box
      component="a"
      href="#main-content"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: (theme) => theme.zIndex.modal + 1,
        transform: 'translateY(-150%)',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        px: 2,
        py: 1,
        borderBottomRightRadius: 2,
        '&:focus-visible': {
          transform: 'none',
          outline: '3px solid',
          outlineColor: 'secondary.main',
          outlineOffset: 2,
        },
      }}
    >
      Перейти к содержимому
    </Box>
  );
}
