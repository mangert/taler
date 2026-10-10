import type { RecurringRule } from '../../shared/api/recurring-transactions';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';

interface DeleteRecurringRuleDialogProps {
  rule: RecurringRule;
  categoryName: string;
  onClose(): void;
  onConfirm(rule: RecurringRule): Promise<void>;
}

export function DeleteRecurringRuleDialog({
  rule,
  categoryName,
  onClose,
  onConfirm,
}: DeleteRecurringRuleDialogProps) {
  return (
    <ConfirmDialog
      open
      title="Удалить правило"
      description={
        <>
          Удалить повторяющееся правило для категории «{categoryName}»? Уже
          созданные транзакции сохранятся. Это действие нельзя отменить.
        </>
      }
      confirmLabel="Удалить окончательно"
      pendingLabel="Удаляем…"
      destructive
      errorMessage="Не удалось удалить правило. Попробуйте ещё раз."
      onClose={onClose}
      onConfirm={() => onConfirm(rule)}
    />
  );
}
