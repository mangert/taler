import { Box, Paper, Typography } from '@mui/material';
import type { Dashboard } from '../../shared/api/dashboard';
import { dashboardPanelSx } from './dashboard-layout';
import { formatDashboardAmount } from './dashboard-view-model';

interface Props {
  totals: Dashboard['totals'];
  currency: string;
}

export function SummaryCards({ totals, currency }: Props) {
  if (
    totals.income === '0.0000' &&
    totals.expense === '0.0000' &&
    totals.balance === '0.0000'
  ) {
    return <Typography>Пока нет доходов и расходов.</Typography>;
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: 'repeat(3, minmax(0, 1fr))',
        },
        gap: 2,
        minWidth: 0,
      }}
    >
      {(
        [
          { title: 'Доходы', amount: totals.income, color: 'success.main' },
          { title: 'Расходы', amount: totals.expense, color: 'error.main' },
          { title: 'Баланс', amount: totals.balance, color: 'primary.main' },
        ] as const
      ).map(({ title, amount, color }) => (
        <Paper
          key={title}
          sx={{ ...dashboardPanelSx, overflowWrap: 'anywhere' }}
        >
          <Typography component={'h3'} variant={'h6'}>
            {title}
          </Typography>
          <Typography variant={'h5'} sx={{ color }}>
            {formatDashboardAmount(amount, currency)}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}
