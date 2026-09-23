import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ApiError } from '../../shared/api/http';
import type { Category } from '../../shared/api/categories';
import { applyServerFieldErrors } from '../../shared/lib/server-field-errors';
import { FormAlert } from '../../shared/ui/FormAlert';
import { categorySchema, type CategoryFormValues } from './category-schema';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';

interface CategoryFormDialogProps {
  open: boolean;
  category: Category | null;
  onClose(): void;
  onSave(values: CategoryFormValues): Promise<void>;
}

function defaults(category: Category | null): CategoryFormValues {
  return {
    name: category?.name ?? '',
    icon: category?.icon ?? 'category',
    color: category?.color ?? '#2E7D32',
    type: category?.type ?? 'EXPENSE',
  };
}

export function CategoryFormDialog({
  open,
  category,
  onClose,
  onSave,
}: CategoryFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: defaults(category),
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSave({ ...values, color: values.color.toUpperCase() });
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === 'CATEGORY_NAME_EXISTS') {
        setError(
          'name',
          {
            type: 'server',
            message: 'Категория с таким названием уже существует',
          },
          { shouldFocus: true },
        );
        return;
      }
      if (
        applyServerFieldErrors<CategoryFormValues>(
          error,
          ['name', 'icon', 'color', 'type'],
          setError,
        )
      ) {
        return;
      }
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Не удалось сохранить категорию. Попробуйте ещё раз.',
      );
    }
  });

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      aria-labelledby="category-form-title"
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
    >
      <DialogTitle id="category-form-title">
        {category ? 'Изменить категорию' : 'Новая категория'}
      </DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="category-form"
          onSubmit={submit}
          noValidate
          spacing={2}
          sx={{ pt: 1 }}
        >
          {formError ? <FormAlert>{formError}</FormAlert> : null}
          <TextField
            label="Название"
            autoFocus
            fullWidth
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            {...register('name')}
          />
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <TextField
                select
                fullWidth
                label="Тип"
                value={field.value}
                onChange={field.onChange}
                error={Boolean(errors.type)}
                helperText={errors.type?.message}
              >
                <MenuItem value="EXPENSE">Расход</MenuItem>
                <MenuItem value="INCOME">Доход</MenuItem>
              </TextField>
            )}
          />
          <Controller
            name="icon"
            control={control}
            render={({ field }) => (
              <IconPicker
                value={field.value}
                onChange={field.onChange}
                error={errors.icon?.message}
              />
            )}
          />
          <Controller
            name="color"
            control={control}
            render={({ field }) => (
              <ColorPicker
                value={field.value}
                onChange={field.onChange}
                error={errors.color?.message}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button
          type="submit"
          form="category-form"
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Сохраняем…' : 'Сохранить категорию'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
