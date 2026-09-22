import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../../shared/api/http';
import { applyServerFieldErrors } from '../../shared/lib/server-field-errors';
import { FormAlert } from '../../shared/ui/FormAlert';
import { PasswordField } from '../../shared/ui/PasswordField';
import { registerSchema, type RegisterFormValues } from './auth-schemas';
import { useAuth } from './auth-context';

export function RegisterForm() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      displayName: '',
      baseCurrency: 'EUR',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await registerUser(values);
      await navigate('/', { replace: true });
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_EXISTS') {
        setError(
          'email',
          { type: 'server', message: error.message },
          { shouldFocus: true },
        );
        return;
      }

      if (
        applyServerFieldErrors<RegisterFormValues>(
          error,
          ['email', 'password', 'displayName', 'baseCurrency', 'timeZone'],
          setError,
        )
      ) {
        return;
      }

      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Не удалось создать аккаунт. Попробуйте ещё раз.',
      );
    }
  });

  return (
    <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate>
      <div>
        <Typography component="h1" variant="h4" gutterBottom>
          Регистрация
        </Typography>
        <Typography color="text.secondary">
          Создайте отдельное пространство для своих финансов.
        </Typography>
      </div>
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
        {...register('email')}
      />
      <PasswordField
        label="Пароль"
        autoComplete="new-password"
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
        {...register('password')}
      />
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
        {isSubmitting ? 'Создаём…' : 'Создать аккаунт'}
      </Button>
      <Button component={Link} to="/login">
        Уже есть аккаунт
      </Button>
    </Stack>
  );
}
