import type { Category } from '../../shared/api/categories';
import { ApiError } from '../../shared/api/http';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';

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
  return (
    <ConfirmDialog
      open={category !== null}
      title="Удалить категорию"
      description={
        <>Удалить категорию «{category?.name}»? Это действие нельзя отменить.</>
      }
      confirmLabel="Удалить окончательно"
      pendingLabel="Удаляем…"
      destructive
      errorMessage={(error) =>
        error instanceof ApiError && error.code === 'CATEGORY_IN_USE'
          ? 'Категория используется в операциях, бюджетах или регулярных платежах.'
          : 'Не удалось удалить категорию. Попробуйте ещё раз.'
      }
      onClose={onClose}
      onConfirm={async () => {
        if (category) await onConfirm(category);
      }}
    />
  );
}
