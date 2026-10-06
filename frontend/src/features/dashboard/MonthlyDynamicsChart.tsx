import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  formatDashboardAmount,
  type MonthlyChartPoint,
} from './dashboard-view-model';

interface Props {
  data: MonthlyChartPoint[];
  currency: string;
}

export function MonthlyDynamicsChart({ data, currency }: Props) {
  const theme = useTheme();
  return (
    <Paper
      component={'section'}
      aria-label={'Динамика по месяцам'}
      sx={{ p: 2, minWidth: 0 }}
    >
      <Typography component={'h2'} variant={'h6'} gutterBottom>
        Динамика по месяцам
      </Typography>
      {data.length === 0 ||
      data.every((item) => item.income === 0 && item.expense === 0) ? (
        <Typography>Нет помесячных данных.</Typography>
      ) : (
        <Box
          role={'img'}
          aria-label={'Линейный график доходов и расходов по месяцам'}
          sx={{ height: { xs: 260, sm: 300 }, maxHeight: 300, minWidth: 0 }}
        >
          <ResponsiveContainer width={'100%'} height={'100%'}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray={'3 3'} />
              <XAxis dataKey={'label'} minTickGap={8} tick={{ fontSize: 11 }} />
              <YAxis
                width={64}
                tick={{ fontSize: 11 }}
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat('ru-RU', {
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(value)
                }
              />
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
                  formatDashboardAmount(String(value), currency),
                  String(name),
                ]}
              />
              <Legend />
              <Line
                name={'Доходы'}
                dataKey={'income'}
                stroke={theme.palette.primary.main}
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                name={'Расходы'}
                dataKey={'expense'}
                stroke={theme.palette.error.main}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
}
