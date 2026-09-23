import { TextField } from '@mui/material';

interface ColorPickerProps {
  value: string;
  onChange(value: string): void;
  error?: string;
}

export function ColorPicker({ value, onChange, error }: ColorPickerProps) {
  return (
    <TextField
      fullWidth
      type="color"
      label="Цвет"
      value={value}
      onChange={(event) => onChange(event.target.value.toUpperCase())}
      error={Boolean(error)}
      helperText={error}
      slotProps={{ inputLabel: { shrink: true } }}
    />
  );
}
