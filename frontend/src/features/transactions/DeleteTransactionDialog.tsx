import type { Transaction } from '../../shared/api/transactions';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';

interface DeleteTransactionDialogProps {
  transaction: Transaction;
  onClose(): void;
  onConfirm(transaction: Transaction): Promise<void>;
}

export function DeleteTransactionDialog({
  transaction,
  onClose,
  onConfirm,
}: DeleteTransactionDialogProps) {
  return (
    <ConfirmDialog
      open
      title="Удалить транзакцию"
      description={
        <>
          Удалить «{transaction.description || transaction.transactionDate}»?
          Это действие нельзя отменить.
        </>
      }
      confirmLabel="Удалить окончательно"
      pendingLabel="Удаляем…"
      destructive
      errorMessage="Не удалось удалить транзакцию. Попробуйте ещё раз."
      onClose={onClose}
      onConfirm={() => onConfirm(transaction)}
    />
  );
}
