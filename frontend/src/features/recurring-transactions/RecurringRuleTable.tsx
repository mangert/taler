import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import {
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import type { RecurringRule } from '../../shared/api/recurring-transactions';
import { RecurringNextRun } from './RecurringNextRun';
import { RecurringRuleStatus } from './RecurringRuleStatus';

interface RecurringRuleTableProps {
  rules: RecurringRule[];
  categoryNames: Map<string, string>;
  baseCurrency: string;
  timeZone: string;
  onEdit(rule: RecurringRule): void;
  onToggle(rule: RecurringRule): void;
  onDelete(rule: RecurringRule): void;
  togglingId: string | null;
}

export function RecurringRuleTable({
  rules,
  categoryNames,
  baseCurrency,
  timeZone,
  onEdit,
  onToggle,
  onDelete,
  togglingId,
}: RecurringRuleTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table
        size="small"
        aria-label="Повторяющиеся правила"
        sx={{ tableLayout: 'fixed' }}
      >
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '24%' }}>Правило</TableCell>
            <TableCell sx={{ width: '20%' }}>Расписание</TableCell>
            <TableCell sx={{ width: '18%' }}>Следующий запуск</TableCell>
            <TableCell sx={{ width: '18%' }}>Статус</TableCell>
            <TableCell sx={{ width: '12%' }} align="right">
              Управление
            </TableCell>
            <TableCell sx={{ width: '8%', color: 'error.main' }} align="right">
              Удаление
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rules.map((rule) => {
            const categoryName =
              categoryNames.get(rule.categoryId) ?? 'Неизвестная категория';
            return (
              <TableRow key={rule.id}>
                <TableCell>
                  <Typography variant="subtitle2">{categoryName}</Typography>
                  <Typography variant="body2">
                    {rule.type === 'INCOME' ? 'Доход' : 'Расход'}: {rule.amount}{' '}
                    {rule.currency}
                  </Typography>
                  {rule.description ? (
                    <Typography
                      variant="caption"
                      sx={{ display: 'block' }}
                      color="text.secondary"
                    >
                      {rule.description}
                    </Typography>
                  ) : null}
                  {rule.currency !== baseCurrency ? (
                    <Typography
                      variant="caption"
                      sx={{ display: 'block' }}
                      color="warning.main"
                    >
                      Курс: 1 {rule.currency} = {rule.exchangeRateToBase}{' '}
                      {baseCurrency}. Обновляйте вручную.
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    Каждый месяц {rule.dayOfMonth}-го числа
                    {rule.dayOfMonth >= 29
                      ? ' (в коротком месяце — в последний день)'
                      : ''}
                  </Typography>
                </TableCell>
                <TableCell>
                  <RecurringNextRun
                    nextRunAt={rule.nextRunAt}
                    timeZone={timeZone}
                    isActive={rule.isActive}
                    compact
                  />
                </TableCell>
                <TableCell>
                  <RecurringRuleStatus isActive={rule.isActive} compact />
                </TableCell>
                <TableCell align="right">
                  <Stack
                    role="group"
                    aria-label={`Управление правилом ${categoryName}`}
                    direction="row"
                    spacing={0.25}
                    sx={{ justifyContent: 'flex-end' }}
                  >
                    <Tooltip title="Изменить">
                      <IconButton
                        onClick={() => onEdit(rule)}
                        aria-label={`Изменить правило ${categoryName}`}
                        size="small"
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip
                      title={rule.isActive ? 'Приостановить' : 'Возобновить'}
                    >
                      <span>
                        <IconButton
                          onClick={() => onToggle(rule)}
                          disabled={togglingId === rule.id}
                          aria-label={`${rule.isActive ? 'Приостановить' : 'Возобновить'} правило ${categoryName}`}
                          size="small"
                        >
                          {rule.isActive ? (
                            <PauseCircleOutlinedIcon fontSize="small" />
                          ) : (
                            <PlayCircleOutlinedIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ borderLeft: 1, borderColor: 'divider' }}
                >
                  <Stack
                    role="group"
                    aria-label={`Удаление правила ${categoryName}`}
                    direction="row"
                    sx={{ justifyContent: 'flex-end' }}
                  >
                    <Tooltip title="Удалить">
                      <IconButton
                        color="error"
                        onClick={() => onDelete(rule)}
                        aria-label={`Удалить правило ${categoryName}`}
                        size="small"
                      >
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
