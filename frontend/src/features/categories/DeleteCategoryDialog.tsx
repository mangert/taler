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
import type { Category } from '../../shared/api/categories';
import { ApiError } from '../../shared/api/http';

interface DeleteCategoryDialogProps {
  category: Category | null;
  onClose(): void;
  onConfirm(category: Category): Promise<void>;
}

export function DeleteCategoryDialog({
  category,
  onClose,
  onConfirm,
}: DeleteCategoryDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async (): Promise<void> => {
    if (!category) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(category);
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiError && caught.code === 'CATEGORY_IN_USE'
          ? 'Категория используется в операциях, бюджетах или регулярных платежах.'
          : 'Не удалось удалить категорию. Попробуйте ещё раз.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={category !== null}
      onClose={isDeleting ? undefined : onClose}
      aria-labelledby="delete-category-title"
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle id="delete-category-title">Удалить категорию</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Удалить категорию «{category?.name}»? Это действие нельзя отменить.
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
          onClick={() => void confirm()}
          color="error"
          disabled={isDeleting}
        >
          {isDeleting ? 'Удаляем…' : 'Удалить окончательно'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
