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
import { dashboardChartViewportSx, dashboardPanelSx } from './dashboard-layout';

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
      sx={dashboardPanelSx}
    >
      <Typography component={'h3'} variant={'h6'} gutterBottom>
        Динамика по месяцам
      </Typography>
      {data.length === 0 ||
      data.every((item) => item.income === 0 && item.expense === 0) ? (
        <Typography>Нет помесячных данных.</Typography>
      ) : (
        <Box
          role={'img'}
          aria-label={'Линейный график доходов и расходов по месяцам'}
          sx={dashboardChartViewportSx}
        >
          <ResponsiveContainer width={'100%'} height={'100%'}>
            <LineChart data={data}>
              <CartesianGrid
                stroke={theme.palette.divider}
                strokeDasharray={'3 3'}
              />
              <XAxis
                dataKey={'label'}
                minTickGap={8}
                tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                axisLine={{ stroke: theme.palette.divider }}
                tickLine={false}
              />
              <YAxis
                width={64}
                tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                axisLine={{ stroke: theme.palette.divider }}
                tickLine={false}
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
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: theme.shape.borderRadius,
                  color: theme.palette.text.primary,
                  maxWidth: '100%',
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                }}
                labelStyle={{ color: theme.palette.text.primary }}
                formatter={(value, name) => [
                  formatDashboardAmount(String(value), currency),
                  String(name),
                ]}
              />
              <Legend wrapperStyle={{ color: theme.palette.text.secondary }} />
              <Line
                name={'Доходы'}
                dataKey={'income'}
                stroke={theme.palette.success.main}
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
