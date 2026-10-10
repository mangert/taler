import { Box, List, ListItem, Paper, Typography } from '@mui/material';
import { dashboardPanelSx } from './dashboard-layout';
import type { CategoryChartPoint } from './dashboard-view-model';
import { formatDashboardAmount } from './dashboard-view-model';

interface Props {
  data: CategoryChartPoint[];
  currency: string;
}

export function TopCategoriesList({ data, currency }: Props) {
  return (
    <Paper
      component={'section'}
      aria-label={'Топ категорий'}
      sx={{ ...dashboardPanelSx, overflowWrap: 'anywhere' }}
    >
      <Typography component={'h3'} variant={'h6'}>
        Топ категорий
      </Typography>
      {data.length === 0 ? (
        <Typography>Пока нет топ-категорий.</Typography>
      ) : (
        <List>
          {data.map((item) => (
            <ListItem
              key={item.id}
              sx={{ gap: 1, minWidth: 0, alignItems: 'flex-start' }}
            >
              <Box
                component={'span'}
                aria-hidden={'true'}
                sx={{
                  bgcolor: item.color,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  flexShrink: 0,
                  mt: 0.75,
                }}
              />
              <Typography
                component={'span'}
                sx={{ overflowWrap: 'anywhere', minWidth: 0 }}
              >
                {item.name} — {formatDashboardAmount(item.amount, currency)}
              </Typography>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}
