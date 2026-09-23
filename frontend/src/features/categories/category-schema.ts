import { z } from 'zod';

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Введите название категории')
    .max(100, 'Название не должно превышать 100 символов'),
  icon: z
    .string()
    .min(1, 'Выберите иконку')
    .max(80, 'Название иконки слишком длинное')
    .regex(/^[a-z][a-z0-9_]*$/, 'Выберите корректную иконку'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Выберите цвет в формате #RRGGBB'),
  type: z.enum(['INCOME', 'EXPENSE']),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
