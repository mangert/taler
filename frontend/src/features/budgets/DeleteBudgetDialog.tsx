import type { Budget } from '../../shared/api/budgets';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';

interface DeleteBudgetDialogProps {
  budget: Budget;
  categoryName: string;
  onClose(): void;
  onConfirm(budget: Budget): Promise<void>;
}

export function DeleteBudgetDialog({
  budget,
  categoryName,
  onClose,
  onConfirm,
}: DeleteBudgetDialogProps) {
  return (
    <ConfirmDialog
      open
      title="Удалить бюджет"
      description={
        <>
          Удалить бюджет категории «{categoryName}» за{' '}
          {budget.month.slice(0, 7)}? Это действие нельзя отменить.
        </>
      }
      confirmLabel="Удалить окончательно"
      pendingLabel="Удаляем…"
      destructive
      errorMessage="Не удалось удалить бюджет. Попробуйте ещё раз."
      onClose={onClose}
      onConfirm={() => onConfirm(budget)}
    />
  );
}
