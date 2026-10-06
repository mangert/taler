import { Box, List, ListItem, Paper, Typography } from '@mui/material';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  formatDashboardAmount,
  type CategoryChartPoint,
} from './dashboard-view-model';

interface Props {
  data: CategoryChartPoint[];
  currency: string;
}

export function ExpensesPieChart({ data, currency }: Props) {
  return (
    <Paper
      component={'section'}
      aria-label={'Расходы по категориям'}
      sx={{ p: 2, minWidth: 0 }}
    >
      <Typography component={'h2'} variant={'h6'} gutterBottom>
        Расходы по категориям
      </Typography>
      {data.length === 0 || data.every((item) => item.value === 0) ? (
        <Typography>Нет расходов по категориям.</Typography>
      ) : (
        <Box
          role={'img'}
          aria-label={'Круговая диаграмма расходов по категориям'}
          sx={{ height: { xs: 240, sm: 280 }, maxHeight: 280, minWidth: 0 }}
        >
          <ResponsiveContainer width={'100%'} height={'100%'}>
            <PieChart>
              <Pie
                data={data}
                dataKey={'value'}
                nameKey={'name'}
                outerRadius={85}
                isAnimationActive={false}
              >
                {data.map((item) => (
                  <Cell key={item.id} fill={item.color} />
                ))}
              </Pie>
              <Tooltip
                allowEscapeViewBox={{ x: false, y: false }}
                position={{ x: 8 }}
                wrapperStyle={{
                  maxWidth: 'calc(100% - 16px)',
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                  zIndex: 1,
                }}
                contentStyle={{
                  maxWidth: '100%',
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                }}
                formatter={(value, name) => [
                  formatDashboardAmount(
                    data.find((item) => item.name === String(name))?.amount ??
                      String(value),
                    currency,
                  ),
                  String(name),
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      )}
      {data.length > 0 ? (
        <List
          dense
          aria-label={'Легенда расходов по категориям'}
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
            },
            columnGap: 2,
          }}
        >
          {data.map((item) => (
            <ListItem
              key={item.id}
              disableGutters
              sx={{ minWidth: 0, gap: 1, alignItems: 'flex-start' }}
            >
              <Box
                component={'span'}
                aria-hidden={'true'}
                sx={{
                  bgcolor: item.color,
                  width: 12,
                  height: 12,
                  mt: 0.75,
                  borderRadius: '50%',
                  flexShrink: 0,
                }}
              />
              <Typography
                component={'span'}
                sx={{ overflowWrap: 'anywhere', minWidth: 0 }}
              >
                {item.name}: {formatDashboardAmount(item.amount, currency)}
              </Typography>
            </ListItem>
          ))}
        </List>
      ) : null}
    </Paper>
  );
}
