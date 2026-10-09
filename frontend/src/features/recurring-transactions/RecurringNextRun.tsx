import { Stack, Typography } from '@mui/material';

interface RecurringNextRunProps {
  nextRunAt: string;
  timeZone: string;
  isActive: boolean;
  compact?: boolean;
}

export function RecurringNextRun({
  nextRunAt,
  timeZone,
  isActive,
  compact = false,
}: RecurringNextRunProps) {
  const localDate = new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(nextRunAt));

  return (
    <Stack spacing={0.25}>
      <Typography variant={compact ? 'body2' : 'body1'}>
        {compact ? '' : 'Следующий запуск: '}
        {localDate}
        {isActive ? '' : ' (после возобновления)'}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Часовой пояс: {timeZone}
      </Typography>
    </Stack>
  );
}
