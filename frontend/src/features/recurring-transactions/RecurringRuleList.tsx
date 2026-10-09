import { Stack, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { RecurringRule } from '../../shared/api/recurring-transactions';
import { RecurringRuleCard } from './RecurringRuleCard';
import { RecurringRuleTable } from './RecurringRuleTable';

interface RecurringRuleListProps {
  rules: RecurringRule[];
  categoryNames: Map<string, string>;
  baseCurrency: string;
  timeZone: string;
  onEdit(rule: RecurringRule): void;
  onToggle(rule: RecurringRule): void;
  onDelete(rule: RecurringRule): void;
  togglingId: string | null;
}

export function RecurringRuleList({
  rules,
  categoryNames,
  baseCurrency,
  timeZone,
  onEdit,
  onToggle,
  onDelete,
  togglingId,
}: RecurringRuleListProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  if (isDesktop)
    return (
      <RecurringRuleTable
        rules={rules}
        categoryNames={categoryNames}
        baseCurrency={baseCurrency}
        timeZone={timeZone}
        onEdit={onEdit}
        onToggle={onToggle}
        onDelete={onDelete}
        togglingId={togglingId}
      />
    );

  return (
    <Stack spacing={2}>
      {rules.map((rule) => (
        <RecurringRuleCard
          key={rule.id}
          rule={rule}
          categoryName={
            categoryNames.get(rule.categoryId) ?? 'Неизвестная категория'
          }
          baseCurrency={baseCurrency}
          timeZone={timeZone}
          onEdit={onEdit}
          onToggle={onToggle}
          onDelete={onDelete}
          isToggling={togglingId === rule.id}
        />
      ))}
    </Stack>
  );
}
