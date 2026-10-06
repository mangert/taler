import {
  Button,
  Card,
  CardActions,
  CardContent,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useId } from 'react';
import type { Budget } from '../../shared/api/budgets';

interface BudgetCardProps {
  budget: Budget;
  categoryName: string;
  onEdit(budget: Budget): void;
  onDelete(budget: Budget): void;
}

function money(amount: string, currency: string): string {
  return `${amount} ${currency}`;
}

export function BudgetCard({
  budget,
  categoryName,
  onEdit,
  onDelete,
}: BudgetCardProps) {
  const progressTextId = useId();
  const progress = Math.min(100, Math.max(0, budget.progressPercent));
  const progressText = `${budget.progressPercent}% от лимита${budget.isExceeded ? ' — лимит превышен' : ''}`;
  return (
    <Card
      component={'article'}
      variant={'outlined'}
      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack spacing={1.5}>
          <Typography component={'h3'} variant={'h6'}>
            {categoryName}
          </Typography>
          <Typography>
            Лимит: {money(budget.limitAmount, budget.currency)}
          </Typography>
          <Typography>
            Расход: {money(budget.spentAmount, budget.currency)}
          </Typography>
          <Typography
            sx={{ color: budget.isExceeded ? 'error.main' : 'text.primary' }}
          >
            Остаток: {money(budget.remainingAmount, budget.currency)}
          </Typography>
          <LinearProgress
            variant={'determinate'}
            value={progress}
            color={budget.isExceeded ? 'error' : 'primary'}
            aria-label={`Прогресс бюджета ${categoryName}`}
            aria-valuetext={progressText}
            aria-describedby={progressTextId}
          />
          <Typography
            id={progressTextId}
            sx={{ color: budget.isExceeded ? 'error.main' : 'text.secondary' }}
          >
            {progressText}
          </Typography>
          {budget.spentAmount === '0.0000' ? (
            <Typography color={'text.secondary'}>
              В этом месяце расходов пока нет.
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button
          onClick={() => onEdit(budget)}
          aria-label={`Изменить бюджет ${categoryName}`}
        >
          Изменить
        </Button>
        <Button
          color={'error'}
          onClick={() => onDelete(budget)}
          aria-label={`Удалить бюджет ${categoryName}`}
        >
          Удалить
        </Button>
      </CardActions>
    </Card>
  );
}
