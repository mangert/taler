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
import type { RecurringRule } from '../../shared/api/recurring-transactions';

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = async (): Promise<void> => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(rule);
    } catch {
      setError('Не удалось удалить правило. Попробуйте ещё раз.');
    } finally {
      setIsDeleting(false);
    }
  };
  return (
    <Dialog
      open
      onClose={isDeleting ? undefined : onClose}
      aria-labelledby="delete-recurring-rule-title"
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle id="delete-recurring-rule-title">
        Удалить правило
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Удалить повторяющееся правило для категории «{categoryName}»? Уже
          созданные транзакции сохранятся. Это действие нельзя отменить.
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
