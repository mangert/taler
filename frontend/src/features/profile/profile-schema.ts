import { z } from 'zod';
import { isValidTimeZone } from '../../shared/lib/time-zone';

export const profileSchema = z.object({
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

export type ProfileFormValues = z.infer<typeof profileSchema>;
