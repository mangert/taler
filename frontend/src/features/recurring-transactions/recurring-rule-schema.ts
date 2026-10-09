import { z } from 'zod';

const amountPattern = /^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/;
const ratePattern = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,8})?$/;

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function createRecurringRuleSchema(baseCurrency: string) {
  return z
    .object({
      categoryId: z
        .string()
        .min(1, 'Выберите категорию')
        .uuid('Выберите категорию'),
      type: z.enum(['INCOME', 'EXPENSE']),
      amount: z
        .string()
        .min(1, 'Введите сумму')
        .regex(amountPattern, 'Введите сумму с точностью до 4 знаков')
        .refine((value) => /[1-9]/.test(value), 'Введите сумму больше нуля'),
      currency: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{3}$/, 'Введите код валюты из трёх букв'),
      exchangeRateToBase: z
        .string()
        .regex(ratePattern, 'Введите курс с точностью до 8 знаков')
        .refine((value) => /[1-9]/.test(value), 'Введите курс больше нуля'),
      dayOfMonth: z
        .string()
        .regex(/^(?:[1-9]|[12]\d|3[01])$/, 'Укажите день от 1 до 31'),
      startDate: z
        .string()
        .refine(isValidDate, 'Выберите корректную дату начала'),
      endDate: z
        .string()
        .refine(
          (value) => value === '' || isValidDate(value),
          'Выберите корректную дату окончания',
        ),
      description: z
        .string()
        .max(500, 'Описание не должно превышать 500 символов'),
    })
    .superRefine((values, context) => {
      if (
        values.currency === baseCurrency &&
        !/^1(?:\.0{1,8})?$/.test(values.exchangeRateToBase)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['exchangeRateToBase'],
          message: 'Для основной валюты курс должен быть равен 1',
        });
      }
      if (values.endDate && values.endDate < values.startDate) {
        context.addIssue({
          code: 'custom',
          path: ['endDate'],
          message: 'Дата окончания должна быть не раньше даты начала',
        });
      }
    });
}

export type RecurringRuleFormValues = z.infer<
  ReturnType<typeof createRecurringRuleSchema>
>;
