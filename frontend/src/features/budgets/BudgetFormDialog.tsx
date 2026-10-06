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
import type { Budget } from '../../shared/api/budgets';
import type { Category } from '../../shared/api/categories';
import { ApiError } from '../../shared/api/http';
import { applyServerFieldErrors } from '../../shared/lib/server-field-errors';
import { FormAlert } from '../../shared/ui/FormAlert';
import { budgetSchema, type BudgetFormValues } from './budget-schema';

interface BudgetFormDialogProps {
  budget: Budget | null;
  month: string;
  categories: Category[];
  onClose(): void;
  onSave(values: BudgetFormValues): Promise<void>;
}

export function BudgetFormDialog({
  budget,
  month,
  categories,
  onClose,
  onSave,
}: BudgetFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      categoryId: budget?.categoryId ?? '',
      month: (budget?.month ?? month).slice(0, 7),
      limitAmount: budget?.limitAmount ?? '',
    },
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSave(values);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === 'BUDGET_EXISTS') {
        setFormError('Для этой категории и месяца бюджет уже существует.');
        return;
      }
      if (
        applyServerFieldErrors<BudgetFormValues>(
          error,
          ['categoryId', 'month', 'limitAmount'],
          setError,
        )
      )
        return;
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Не удалось сохранить бюджет. Попробуйте ещё раз.',
      );
    }
  });

  return (
    <Dialog
      open
      onClose={isSubmitting ? undefined : onClose}
      aria-labelledby={'budget-form-title'}
      fullWidth
      maxWidth={'sm'}
      fullScreen={isMobile}
    >
      <DialogTitle id={'budget-form-title'}>
        {budget ? 'Изменить бюджет' : 'Новый бюджет'}
      </DialogTitle>
      <DialogContent>
        <Stack
          component={'form'}
          id={'budget-form'}
          onSubmit={submit}
          noValidate
          spacing={2}
          sx={{ pt: 1 }}
        >
          {formError ? <FormAlert>{formError}</FormAlert> : null}
          <Controller
            name={'categoryId'}
            control={control}
            render={({ field }) => (
              <TextField
                select
                label={'Категория расходов'}
                fullWidth
                value={field.value}
                onChange={field.onChange}
                error={Boolean(errors.categoryId)}
                helperText={errors.categoryId?.message}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <TextField
            label={'Месяц бюджета'}
            type={'month'}
            fullWidth
            error={Boolean(errors.month)}
            helperText={errors.month?.message}
            slotProps={{ inputLabel: { shrink: true } }}
            {...register('month')}
          />
          <TextField
            label={'Лимит'}
            fullWidth
            autoFocus
            inputMode={'decimal'}
            error={Boolean(errors.limitAmount)}
            helperText={errors.limitAmount?.message}
            {...register('limitAmount')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button
          type={'submit'}
          form={'budget-form'}
          variant={'contained'}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Сохраняем…' : 'Сохранить бюджет'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
