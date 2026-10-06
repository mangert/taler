import { Box } from '@mui/material';
import type { Budget } from '../../shared/api/budgets';
import { BudgetCard } from './BudgetCard';

interface BudgetGridProps {
  budgets: Budget[];
  categoryNames: Map<string, string>;
  onEdit(budget: Budget): void;
  onDelete(budget: Budget): void;
}

export function BudgetGrid({
  budgets,
  categoryNames,
  onEdit,
  onDelete,
}: BudgetGridProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(3, minmax(0, 1fr))',
        },
      }}
    >
      {budgets.map((budget) => (
        <BudgetCard
          key={budget.id}
          budget={budget}
          categoryName={
            categoryNames.get(budget.categoryId) ?? 'Неизвестная категория'
          }
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </Box>
  );
}
