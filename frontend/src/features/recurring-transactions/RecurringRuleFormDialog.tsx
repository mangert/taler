import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
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
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { Category } from '../../shared/api/categories';
import type { RecurringRule } from '../../shared/api/recurring-transactions';
import { ApiError } from '../../shared/api/http';
import { applyServerFieldErrors } from '../../shared/lib/server-field-errors';
import {
  createRecurringRuleSchema,
  type RecurringRuleFormValues,
} from './recurring-rule-schema';

interface RecurringRuleFormDialogProps {
  rule: RecurringRule | null;
  categories: Category[];
  baseCurrency: string;
  onClose(): void;
  onSave(values: RecurringRuleFormValues): Promise<void>;
}

export function RecurringRuleFormDialog({
  rule,
  categories,
  baseCurrency,
  onClose,
  onSave,
}: RecurringRuleFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RecurringRuleFormValues>({
    resolver: zodResolver(createRecurringRuleSchema(baseCurrency)),
    defaultValues: {
      categoryId: rule?.categoryId ?? '',
      type: rule?.type ?? 'EXPENSE',
      amount: rule?.amount ?? '',
      currency: rule?.currency ?? baseCurrency,
      exchangeRateToBase: rule?.exchangeRateToBase ?? '1',
      dayOfMonth: rule ? String(rule.dayOfMonth) : '',
      startDate: rule?.startDate ?? '',
      endDate: rule?.endDate ?? '',
      description: rule?.description ?? '',
    },
  });
  const type = useWatch({ control, name: 'type' });
  const currency = useWatch({ control, name: 'currency' });
  const filteredCategories = categories.filter(
    (category) => category.type === type,
  );

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSave(values);
    } catch (error: unknown) {
      if (
        applyServerFieldErrors<RecurringRuleFormValues>(
          error,
          [
            'categoryId',
            'type',
            'amount',
            'currency',
            'exchangeRateToBase',
            'dayOfMonth',
            'startDate',
            'endDate',
            'description',
          ],
          setError,
        )
      )
        return;
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Не удалось сохранить правило. Попробуйте ещё раз.',
      );
    }
  });

  return (
    <Dialog
      open
      onClose={isSubmitting ? undefined : onClose}
      aria-labelledby="recurring-rule-form-title"
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
    >
      <DialogTitle id="recurring-rule-form-title">
        {rule ? 'Изменить правило' : 'Новое правило'}
      </DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="recurring-rule-form"
          onSubmit={submit}
          noValidate
          spacing={2}
          sx={{ pt: 1 }}
        >
          {formError ? <Alert severity="error">{formError}</Alert> : null}
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Тип"
                fullWidth
                value={field.value}
                onChange={(event) => {
                  field.onChange(event);
                  setValue('categoryId', '');
                }}
                error={Boolean(errors.type)}
                helperText={errors.type?.message}
              >
                <MenuItem value="EXPENSE">Расход</MenuItem>
                <MenuItem value="INCOME">Доход</MenuItem>
              </TextField>
            )}
          />
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Категория"
                fullWidth
                value={field.value}
                onChange={field.onChange}
                error={Boolean(errors.categoryId)}
                helperText={errors.categoryId?.message}
              >
                {filteredCategories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <TextField
            label="Сумма"
            fullWidth
            inputMode="decimal"
            error={Boolean(errors.amount)}
            helperText={errors.amount?.message}
            {...register('amount')}
          />
          <TextField
            label="Валюта"
            fullWidth
            slotProps={{ htmlInput: { maxLength: 3 } }}
            error={Boolean(errors.currency)}
            helperText={errors.currency?.message}
            {...register('currency', {
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                if (event.target.value.trim().toUpperCase() === baseCurrency)
                  setValue('exchangeRateToBase', '1');
              },
            })}
          />
          {currency?.trim().toUpperCase() !== baseCurrency ? (
            <>
              <TextField
                label={`Курс к ${baseCurrency}`}
                fullWidth
                inputMode="decimal"
                error={Boolean(errors.exchangeRateToBase)}
                helperText={errors.exchangeRateToBase?.message}
                {...register('exchangeRateToBase')}
              />
              <Alert severity="warning">
                Курс задаётся вручную и не обновляется автоматически. Проверяйте
                его перед следующим запуском.
              </Alert>
            </>
          ) : null}
          <TextField
            label="День месяца"
            fullWidth
            inputMode="numeric"
            error={Boolean(errors.dayOfMonth)}
            helperText={
              errors.dayOfMonth?.message ??
              'Если в месяце нет такого дня, запуск будет в последний день месяца.'
            }
            {...register('dayOfMonth')}
          />
          <TextField
            label="Дата начала"
            type="date"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            error={Boolean(errors.startDate)}
            helperText={errors.startDate?.message}
            {...register('startDate')}
          />
          <TextField
            label="Дата окончания"
            type="date"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            error={Boolean(errors.endDate)}
            helperText={errors.endDate?.message ?? 'Необязательно'}
            {...register('endDate')}
          />
          <TextField
            label="Описание"
            fullWidth
            multiline
            minRows={2}
            error={Boolean(errors.description)}
            helperText={errors.description?.message}
            {...register('description')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button
          type="submit"
          form="recurring-rule-form"
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Сохраняем…' : 'Сохранить правило'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
