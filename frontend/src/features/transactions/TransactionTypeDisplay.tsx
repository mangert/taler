import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import { Stack, Typography } from '@mui/material';
import type { TransactionType } from '../../shared/api/transactions';

export function TransactionTypeDisplay({ type }: { type: TransactionType }) {
  const income = type === 'INCOME';
  const label = income ? 'Доход' : 'Расход';
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      {income ? (
        <TrendingUpRoundedIcon
          titleAccess={label}
          fontSize="small"
          color="success"
        />
      ) : (
        <TrendingDownRoundedIcon
          titleAccess={label}
          fontSize="small"
          color="error"
        />
      )}
      <Typography component="span" variant="body2">
        {label}
      </Typography>
    </Stack>
  );
}
