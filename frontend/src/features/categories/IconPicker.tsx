import { MenuItem, TextField } from '@mui/material';

const iconOptions = [
  { value: 'category', label: 'Категория' },
  { value: 'payments', label: 'Платежи' },
  { value: 'laptop', label: 'Ноутбук' },
  { value: 'shopping_cart', label: 'Корзина' },
  { value: 'directions_bus', label: 'Автобус' },
  { value: 'home', label: 'Дом' },
  { value: 'medical_services', label: 'Здоровье' },
  { value: 'account_balance_wallet', label: 'Кошелёк' },
  { value: 'redeem', label: 'Подарок' },
  { value: 'local_grocery_store', label: 'Магазин' },
  { value: 'receipt_long', label: 'Квитанция' },
  { value: 'school', label: 'Учёба' },
  { value: 'theater_comedy', label: 'Досуг' },
] as const;

interface IconPickerProps {
  value: string;
  onChange(value: string): void;
  error?: string;
}

export function IconPicker({ value, onChange, error }: IconPickerProps) {
  const hasCustomValue =
    value && !iconOptions.some((option) => option.value === value);

  return (
    <TextField
      select
      fullWidth
      label="Иконка"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={Boolean(error)}
      helperText={error}
    >
      {hasCustomValue ? <MenuItem value={value}>{value}</MenuItem> : null}
      {iconOptions.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
