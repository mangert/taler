import { z } from 'zod';
import { isValidTimeZone } from '../../shared/lib/time-zone';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Введите корректный email')
    .max(320, 'Email не должен превышать 320 символов'),
  password: z
    .string()
    .min(1, 'Введите пароль')
    .max(128, 'Пароль не должен превышать 128 символов'),
});

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Введите корректный email')
    .max(320, 'Email не должен превышать 320 символов'),
  password: z
    .string()
    .min(12, 'Пароль должен содержать не менее 12 символов')
    .max(128, 'Пароль не должен превышать 128 символов'),
  displayName: z
    .string()
    .trim()
    .min(1, 'Введите имя')
    .max(100, 'Имя не должно превышать 100 символов'),
  baseCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Введите трёхбуквенный код валюты'),
  timeZone: z
    .string()
    .trim()
    .max(100, 'Часовой пояс не должен превышать 100 символов')
    .refine(isValidTimeZone, 'Введите корректный часовой пояс'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
