/** Содержит общий UI-компонент: диалог подтверждения. */
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useId, useState, type ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  destructive?: boolean;
  errorMessage: string | ((error: unknown) => string);
  onClose(): void;
  onConfirm(): Promise<void>;
}

/** Отображает диалог подтверждения. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Подтвердить',
  pendingLabel = 'Выполняем…',
  destructive = false,
  errorMessage,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Закрывает диалог или меню. */
  const close = (): void => {
    setError(null);
    onClose();
  };
  /** Подтверждает выбранное действие. */
  const confirm = async (): Promise<void> => {
    setIsPending(true);
    setError(null);
    try {
      await onConfirm();
    } catch (caught: unknown) {
      setError(
        typeof errorMessage === 'function'
          ? errorMessage(caught)
          : errorMessage,
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isPending ? undefined : close}
      aria-labelledby={titleId}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={isPending} autoFocus={destructive}>
          Отмена
        </Button>
        <Button
          color={destructive ? 'error' : 'primary'}
          onClick={() => void confirm()}
          disabled={isPending}
        >
          {isPending ? pendingLabel : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
