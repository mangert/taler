import { z } from 'zod';

export const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Выберите категорию'),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Выберите месяц'),
  limitAmount: z
    .string()
    .regex(
      /^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/,
      'Введите сумму с точностью до четырёх знаков',
    )
    .refine((value) => /[1-9]/.test(value), 'Лимит должен быть больше нуля'),
});

export type BudgetFormValues = z.infer<typeof budgetSchema>;
