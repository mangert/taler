import { Button, Stack, Typography } from '@mui/material';
import { budgetMonthLabel, shiftBudgetMonth } from './budget-month';

interface MonthSelectorProps {
  month: string;
  onChange(month: string): void;
}

export function MonthSelector({ month, onChange }: MonthSelectorProps) {
  return (
    <Stack direction={'row'} spacing={1} sx={{ alignItems: 'center' }}>
      <Button
        aria-label={'Предыдущий месяц'}
        onClick={() => onChange(shiftBudgetMonth(month, -1))}
      >
        ←
      </Button>
      <Typography component={'h2'} variant={'h6'}>
        {budgetMonthLabel(month)}
      </Typography>
      <Button
        aria-label={'Следующий месяц'}
        onClick={() => onChange(shiftBudgetMonth(month, 1))}
      >
        →
      </Button>
    </Stack>
  );
}
