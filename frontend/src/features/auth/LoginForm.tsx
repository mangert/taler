import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../../shared/api/http';
import { applyServerFieldErrors } from '../../shared/lib/server-field-errors';
import { FormAlert } from '../../shared/ui/FormAlert';
import { PasswordField } from '../../shared/ui/PasswordField';
import { loginSchema, type LoginFormValues } from './auth-schemas';
import { useAuth } from './auth-context';

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await login(values);
      const state: unknown = location.state;
      const destination =
        typeof state === 'object' &&
        state !== null &&
        'from' in state &&
        typeof state.from === 'string'
          ? state.from
          : '/';

      await navigate(destination, { replace: true });
    } catch (error: unknown) {
      if (
        applyServerFieldErrors<LoginFormValues>(
          error,
          ['email', 'password'],
          setError,
        )
      ) {
        return;
      }

      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Не удалось войти. Попробуйте ещё раз.',
      );
    }
  });

  return (
    <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate>
      <div>
        <Typography component="h1" variant="h4" gutterBottom>
          Вход в Taler
        </Typography>
        <Typography color="text.secondary">
          Продолжите работу со своими финансами.
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
        autoComplete="current-password"
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" variant="contained" disabled={isSubmitting}>
        {isSubmitting ? 'Входим…' : 'Войти'}
      </Button>
      <Button component={Link} to="/register">
        Создать аккаунт
      </Button>
    </Stack>
  );
}
