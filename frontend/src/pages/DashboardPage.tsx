import { Box, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { DashboardTextSummary } from '../features/dashboard/DashboardTextSummary';
import { ExpensesPieChart } from '../features/dashboard/ExpensesPieChart';
import { MonthlyDynamicsChart } from '../features/dashboard/MonthlyDynamicsChart';
import { SummaryCards } from '../features/dashboard/SummaryCards';
import { TopCategoriesList } from '../features/dashboard/TopCategoriesList';
import { dashboardKeys } from '../features/dashboard/dashboard-keys';
import { toDashboardViewModel } from '../features/dashboard/dashboard-view-model';
import { useAuth } from '../features/auth/auth-context';
import { dashboardApi, type Dashboard } from '../shared/api/dashboard';
import { ErrorState, PageSkeleton } from '../shared/ui/PageStates';

const months = 6;

export function DashboardPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const query = useQuery({
    queryKey: dashboardKeys.summary(userId, months),
    queryFn: () => dashboardApi.get(months),
    enabled: Boolean(userId),
  });

  return (
    <Stack
      component={'section'}
      aria-label={'Финансовая сводка'}
      spacing={2}
      sx={{ minWidth: 0 }}
    >
      <Typography component={'h2'} variant={'h4'}>
        Финансовая сводка
      </Typography>
      {query.isPending ? (
        <PageSkeleton label="Загрузка финансовой сводки" heights={[100, 260]} />
      ) : query.isError ? (
        <ErrorState
          message="Не удалось загрузить финансовую сводку."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <DashboardContent dashboard={query.data} />
      )}
    </Stack>
  );
}

function DashboardContent({ dashboard }: { dashboard: Dashboard }) {
  const view = toDashboardViewModel(dashboard);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          md: 'repeat(2, minmax(0, 1fr))',
        },
        gap: 2,
        minWidth: 0,
        alignItems: 'start',
        '& > *': { minWidth: 0 },
      }}
    >
      <Box sx={{ gridColumn: '1 / -1' }}>
        <SummaryCards totals={dashboard.totals} currency={dashboard.currency} />
      </Box>
      <ExpensesPieChart data={view.categories} currency={dashboard.currency} />
      <MonthlyDynamicsChart data={view.monthly} currency={dashboard.currency} />
      <TopCategoriesList
        data={view.topCategories}
        currency={dashboard.currency}
      />
      <DashboardTextSummary dashboard={dashboard} />
    </Box>
  );
}
