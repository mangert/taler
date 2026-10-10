import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <Stack
      component="div"
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ alignItems: { sm: 'flex-start' }, justifyContent: 'space-between' }}
    >
      <Box>
        <Typography
          component="h1"
          variant="h3"
          gutterBottom={Boolean(description)}
        >
          {title}
        </Typography>
        {description ? (
          <Typography color="text.secondary">{description}</Typography>
        ) : null}
      </Box>
      {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
    </Stack>
  );
}
