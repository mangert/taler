import { Paper, Stack, Typography } from '@mui/material';
import type { Dashboard } from '../../shared/api/dashboard';
import {
  formatDashboardAmount,
  formatDashboardMonth,
} from './dashboard-view-model';

interface Props {
  dashboard: Dashboard;
}

export function DashboardTextSummary({ dashboard }: Props) {
  const hasActivity =
    dashboard.totals.income !== '0.0000' ||
    dashboard.totals.expense !== '0.0000';

  return (
    <Paper
      component={'section'}
      aria-label={'Текстовая сводка'}
      sx={{ p: 2, minWidth: 0, overflowWrap: 'anywhere' }}
    >
      <Typography component={'h2'} variant={'h6'} gutterBottom>
        Текстовая сводка
      </Typography>
      {!hasActivity ? (
        <Typography>Для текстовой сводки пока нет данных.</Typography>
      ) : (
        <Stack spacing={1}>
          <Typography>
            За период с {formatDashboardMonth(dashboard.fromMonth)} по{' '}
            {formatDashboardMonth(dashboard.toMonth)} доходы составили{' '}
            {formatDashboardAmount(dashboard.totals.income, dashboard.currency)}
            , расходы —{' '}
            {formatDashboardAmount(
              dashboard.totals.expense,
              dashboard.currency,
            )}
            .
          </Typography>
          <Typography>
            Баланс:{' '}
            {formatDashboardAmount(
              dashboard.totals.balance,
              dashboard.currency,
            )}
            .
          </Typography>
          {dashboard.topCategories[0] ? (
            <Typography>
              Главная категория расходов:{' '}
              {dashboard.topCategories[0].categoryName} (
              {formatDashboardAmount(
                dashboard.topCategories[0].amount,
                dashboard.currency,
              )}
              ).
            </Typography>
          ) : null}
          {dashboard.expensesByCategory.length > 0 ? (
            <Typography component={'h3'} variant={'subtitle1'}>
              Данные по категориям
            </Typography>
          ) : null}
          {dashboard.expensesByCategory.length > 0 ? (
            <Stack
              component={'ul'}
              spacing={0.5}
              sx={{ pl: 3 }}
              aria-label={'Расходы по категориям текстом'}
            >
              {dashboard.expensesByCategory.map((category) => (
                <Typography component={'li'} key={category.categoryId}>
                  {category.categoryName}:{' '}
                  {formatDashboardAmount(category.amount, dashboard.currency)}
                </Typography>
              ))}
            </Stack>
          ) : null}
          {dashboard.monthlySeries.length > 0 ? (
            <Typography component={'h3'} variant={'subtitle1'}>
              Данные по месяцам
            </Typography>
          ) : null}
          {dashboard.monthlySeries.length > 0 ? (
            <Stack
              component={'ul'}
              spacing={0.5}
              sx={{ pl: 3 }}
              aria-label={'Динамика по месяцам текстом'}
            >
              {dashboard.monthlySeries.map((month) => (
                <Typography component={'li'} key={month.month}>
                  {formatDashboardMonth(month.month)}: доходы{' '}
                  {formatDashboardAmount(month.income, dashboard.currency)},
                  расходы{' '}
                  {formatDashboardAmount(month.expense, dashboard.currency)}
                </Typography>
              ))}
            </Stack>
          ) : null}
        </Stack>
      )}
    </Paper>
  );
}
