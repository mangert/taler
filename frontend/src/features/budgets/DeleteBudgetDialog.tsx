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
import type { Budget } from '../../shared/api/budgets';

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async (): Promise<void> => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(budget);
    } catch {
      setError('Не удалось удалить бюджет. Попробуйте ещё раз.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={isDeleting ? undefined : onClose}
      aria-labelledby={'delete-budget-title'}
      fullWidth
      maxWidth={'xs'}
    >
      <DialogTitle id={'delete-budget-title'}>Удалить бюджет</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Удалить бюджет категории «{categoryName}» за{' '}
          {budget.month.slice(0, 7)}? Это действие нельзя отменить.
        </DialogContentText>
        {error ? (
          <Alert severity={'error'} sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isDeleting}>
          Отмена
        </Button>
        <Button
          color={'error'}
          onClick={() => void confirm()}
          disabled={isDeleting}
        >
          {isDeleting ? 'Удаляем…' : 'Удалить окончательно'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
