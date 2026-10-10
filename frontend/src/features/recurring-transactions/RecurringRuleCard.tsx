import {
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import type { RecurringRule } from '../../shared/api/recurring-transactions';
import { RecurringNextRun } from './RecurringNextRun';
import { RecurringRuleStatus } from './RecurringRuleStatus';

interface RecurringRuleCardProps {
  rule: RecurringRule;
  categoryName: string;
  baseCurrency: string;
  timeZone: string;
  onEdit(rule: RecurringRule): void;
  onToggle(rule: RecurringRule): void;
  onDelete(rule: RecurringRule): void;
  isToggling: boolean;
}

export function RecurringRuleCard({
  rule,
  categoryName,
  baseCurrency,
  timeZone,
  onEdit,
  onToggle,
  onDelete,
  isToggling,
}: RecurringRuleCardProps) {
  const schedule = `Каждый месяц ${rule.dayOfMonth}-го числа${rule.dayOfMonth >= 29 ? ' (в коротком месяце — в последний день)' : ''}`;
  return (
    <Card component="article" variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Typography component="h2" variant="h6">
              {categoryName}
            </Typography>
            <RecurringRuleStatus isActive={rule.isActive} />
          </Stack>
          <Typography>
            {rule.type === 'INCOME' ? 'Доход' : 'Расход'}: {rule.amount}{' '}
            {rule.currency}
          </Typography>
          <Typography>{schedule}</Typography>
          <RecurringNextRun
            nextRunAt={rule.nextRunAt}
            timeZone={timeZone}
            isActive={rule.isActive}
          />
          {rule.description ? (
            <Typography color="text.secondary">{rule.description}</Typography>
          ) : null}
          {rule.currency !== baseCurrency ? (
            <>
              <Typography>
                Курс: 1 {rule.currency} = {rule.exchangeRateToBase}{' '}
                {baseCurrency}
              </Typography>
              <Typography color="warning.main">
                Курс задаётся вручную. Проверяйте его перед следующим запуском.
              </Typography>
            </>
          ) : null}
        </Stack>
      </CardContent>
      <CardActions
        role="group"
        aria-label={`Управление правилом ${categoryName}`}
        sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}
      >
        <Button
          onClick={() => onEdit(rule)}
          aria-label={`Изменить правило ${categoryName}`}
        >
          Изменить
        </Button>
        <Button
          onClick={() => onToggle(rule)}
          disabled={isToggling}
          aria-label={`${rule.isActive ? 'Приостановить' : 'Возобновить'} правило ${categoryName}`}
        >
          {rule.isActive ? 'Приостановить' : 'Возобновить'}
        </Button>
      </CardActions>
      <Divider />
      <CardActions
        role="group"
        aria-label={`Удаление правила ${categoryName}`}
        sx={{ justifyContent: 'flex-end' }}
      >
        <Button
          color="error"
          variant="outlined"
          onClick={() => onDelete(rule)}
          aria-label={`Удалить правило ${categoryName}`}
        >
          Удалить
        </Button>
      </CardActions>
    </Card>
  );
}
