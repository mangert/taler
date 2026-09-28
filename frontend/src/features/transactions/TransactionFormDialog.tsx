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
import type { Transaction } from '../../shared/api/transactions';
import { ApiError } from '../../shared/api/http';
import { applyServerFieldErrors } from '../../shared/lib/server-field-errors';
import { FormAlert } from '../../shared/ui/FormAlert';
import {
  createTransactionSchema,
  type TransactionFormValues,
} from './transaction-schema';

interface TransactionFormDialogProps {
  transaction: Transaction | null;
  categories: Category[];
  baseCurrency: string;
  onClose(): void;
  onSave(values: TransactionFormValues): Promise<void>;
}

function defaults(
  transaction: Transaction | null,
  baseCurrency: string,
): TransactionFormValues {
  return {
    categoryId: transaction?.categoryId ?? '',
    type: transaction?.type ?? 'EXPENSE',
    amount: transaction?.amount ?? '',
    currency: transaction?.currency ?? baseCurrency,
    exchangeRateToBase: transaction?.exchangeRateToBase ?? '1',
    transactionDate: transaction?.transactionDate ?? '',
    description: transaction?.description ?? '',
  };
}

export function TransactionFormDialog({
  transaction,
  categories,
  baseCurrency,
  onClose,
  onSave,
}: TransactionFormDialogProps) {
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
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(createTransactionSchema(baseCurrency)),
    defaultValues: defaults(transaction, baseCurrency),
  });
  const type = useWatch({ control, name: 'type' });
  const currency = useWatch({ control, name: 'currency' });
  const categoryOptions = categories.filter(
    (category) => category.type === type,
  );

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSave(values);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === 'CATEGORY_NOT_FOUND') {
        setError(
          'categoryId',
          { type: 'server', message: 'Категория больше недоступна' },
          { shouldFocus: true },
        );
        return;
      }
      if (
        error instanceof ApiError &&
        error.code === 'CATEGORY_TYPE_MISMATCH'
      ) {
        setError(
          'categoryId',
          {
            type: 'server',
            message: 'Тип категории не совпадает с типом транзакции',
          },
          { shouldFocus: true },
        );
        return;
      }
      if (
        applyServerFieldErrors<TransactionFormValues>(
          error,
          [
            'categoryId',
            'type',
            'amount',
            'currency',
            'exchangeRateToBase',
            'transactionDate',
            'description',
          ],
          setError,
        )
      )
        return;
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Не удалось сохранить транзакцию. Попробуйте ещё раз.',
      );
    }
  });

  return (
    <Dialog
      open
      onClose={isSubmitting ? undefined : onClose}
      aria-labelledby="transaction-form-title"
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
    >
      <DialogTitle id="transaction-form-title">
        {transaction ? 'Изменить транзакцию' : 'Новая транзакция'}
      </DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="transaction-form"
          onSubmit={submit}
          noValidate
          spacing={2}
          sx={{ pt: 1 }}
        >
          {formError ? <FormAlert>{formError}</FormAlert> : null}
          {categories.length === 0 ? (
            <Alert severity="info">
              Сначала создайте категорию подходящего типа.
            </Alert>
          ) : null}
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Тип транзакции"
                value={field.value}
                onChange={(event) => {
                  field.onChange(event);
                  setValue('categoryId', '', { shouldValidate: true });
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
                label="Категория транзакции"
                value={field.value}
                onChange={field.onChange}
                error={Boolean(errors.categoryId)}
                helperText={errors.categoryId?.message}
              >
                <MenuItem value="">Выберите категорию</MenuItem>
                {categoryOptions.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <TextField
            label="Сумма"
            autoFocus
            slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            error={Boolean(errors.amount)}
            helperText={errors.amount?.message}
            {...register('amount')}
          />
          <TextField
            label="Валюта"
            slotProps={{ htmlInput: { maxLength: 3 } }}
            error={Boolean(errors.currency)}
            helperText={errors.currency?.message}
            {...register('currency', {
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                if (event.target.value.trim().toUpperCase() === baseCurrency) {
                  setValue('exchangeRateToBase', '1');
                }
              },
            })}
          />
          {currency.trim().toUpperCase() !== baseCurrency ? (
            <TextField
              label="Курс к основной валюте"
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              error={Boolean(errors.exchangeRateToBase)}
              helperText={
                errors.exchangeRateToBase?.message ??
                `Сколько ${baseCurrency} за 1 ${currency.toUpperCase()}`
              }
              {...register('exchangeRateToBase')}
            />
          ) : null}
          <TextField
            label="Дата транзакции"
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
            error={Boolean(errors.transactionDate)}
            helperText={errors.transactionDate?.message}
            {...register('transactionDate')}
          />
          <TextField
            label="Описание"
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
          form="transaction-form"
          variant="contained"
          disabled={isSubmitting || categories.length === 0}
        >
          {isSubmitting ? 'Сохраняем…' : 'Сохранить транзакцию'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
