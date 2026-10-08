import { z } from 'zod';

export const mappingFields = [
  { key: 'date', label: 'Дата', aliases: ['date', 'transactiondate', 'дата'] },
  { key: 'amount', label: 'Сумма', aliases: ['amount', 'сумма'] },
  { key: 'category', label: 'Категория', aliases: ['category', 'категория'] },
  { key: 'type', label: 'Тип', aliases: ['type', 'тип'] },
  {
    key: 'description',
    label: 'Описание',
    aliases: ['description', 'описание'],
  },
  { key: 'currency', label: 'Валюта', aliases: ['currency', 'валюта'] },
  {
    key: 'rate',
    label: 'Курс',
    aliases: ['rate', 'exchangeratetobase', 'курс'],
  },
] as const;

const required = z.string().min(1, 'Выберите колонку');

export const columnMappingSchema = z
  .object({
    date: required,
    amount: required,
    category: required,
    type: required,
    description: z.string(),
    currency: z.string(),
    rate: z.string(),
  })
  .superRefine((mapping, context) => {
    const selected = new Set<string>();
    for (const field of mappingFields) {
      const header = mapping[field.key];
      if (!header) continue;
      if (selected.has(header))
        context.addIssue({
          code: 'custom',
          path: [field.key],
          message: 'Колонка уже используется',
        });
      selected.add(header);
    }
  });

export type ColumnMapping = z.infer<typeof columnMappingSchema>;

function normalized(value: string): string {
  return value.toLocaleLowerCase().replace(/[\s_-]/g, '');
}

export function suggestColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: '',
    amount: '',
    category: '',
    type: '',
    description: '',
    currency: '',
    rate: '',
  };
  for (const field of mappingFields) {
    mapping[field.key] =
      headers.find((header) =>
        field.aliases.some((alias) => normalized(header) === alias),
      ) ?? '';
  }
  return mapping;
}
