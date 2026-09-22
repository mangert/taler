import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Paper, Stack, TextField } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../auth/auth-context';
import { ApiError } from '../../shared/api/http';
import { applyServerFieldErrors } from '../../shared/lib/server-field-errors';
import { FormAlert } from '../../shared/ui/FormAlert';
import { profileSchema, type ProfileFormValues } from './profile-schema';

export function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      displayName: user?.displayName ?? '',
      baseCurrency: user?.baseCurrency ?? '',
      timeZone: user?.timeZone ?? '',
    },
  });

  if (!user) {
    return null;
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setIsSaved(false);

    try {
      const updatedUser = await updateProfile(values);

      reset({
        displayName: updatedUser.displayName,
        baseCurrency: updatedUser.baseCurrency,
        timeZone: updatedUser.timeZone,
      });
      setIsSaved(true);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === 'BASE_CURRENCY_LOCKED') {
        setError(
          'baseCurrency',
          { type: 'server', message: error.message },
          { shouldFocus: true },
        );
        return;
      }

      if (
        applyServerFieldErrors<ProfileFormValues>(
          error,
          ['displayName', 'baseCurrency', 'timeZone'],
          setError,
        )
      ) {
        return;
      }

      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Не удалось сохранить профиль. Попробуйте ещё раз.',
      );
    }
  });

  return (
    <Paper
      component="form"
      elevation={2}
      onSubmit={onSubmit}
      noValidate
      sx={{ p: { xs: 3, sm: 4 } }}
    >
      <Stack spacing={2.5}>
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        {isSaved ? <Alert severity="success">Профиль сохранён</Alert> : null}
        <TextField label="Email" value={user.email} disabled />
        <TextField
          label="Имя"
          autoComplete="name"
          error={Boolean(errors.displayName)}
          helperText={errors.displayName?.message}
          {...register('displayName')}
        />
        <TextField
          label="Основная валюта"
          slotProps={{ htmlInput: { maxLength: 3 } }}
          error={Boolean(errors.baseCurrency)}
          helperText={errors.baseCurrency?.message}
          {...register('baseCurrency')}
        />
        <TextField
          label="Часовой пояс"
          error={Boolean(errors.timeZone)}
          helperText={errors.timeZone?.message}
          {...register('timeZone')}
        />
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </Stack>
    </Paper>
  );
}
