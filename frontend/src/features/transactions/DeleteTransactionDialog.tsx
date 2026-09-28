import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useState } from 'react';
import type { Transaction } from '../../shared/api/transactions';

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async (): Promise<void> => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(transaction);
    } catch {
      setError('Не удалось удалить транзакцию. Попробуйте ещё раз.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={isDeleting ? undefined : onClose}
      aria-labelledby="delete-transaction-title"
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle id="delete-transaction-title">
        Удалить транзакцию
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Удалить «{transaction.description || transaction.transactionDate}»?
          Это действие нельзя отменить.
        </DialogContentText>
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isDeleting}>
          Отмена
        </Button>
        <Button
          color="error"
          onClick={() => void confirm()}
          disabled={isDeleting}
        >
          {isDeleting ? 'Удаляем…' : 'Удалить окончательно'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
