import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import {
  columnMappingSchema,
  mappingFields,
  type ColumnMapping,
} from './column-mapping';

interface ColumnMappingStepProps {
  headers: string[];
  initialMapping: ColumnMapping;
  onBack: (mapping: ColumnMapping) => void;
  onContinue: (mapping: ColumnMapping) => void;
}

export function ColumnMappingStep({
  headers,
  initialMapping,
  onBack,
  onContinue,
}: ColumnMappingStepProps) {
  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ColumnMapping>({
    resolver: zodResolver(columnMappingSchema),
    defaultValues: initialMapping,
  });

  return (
    <Stack
      component="form"
      aria-label="Сопоставление колонок"
      spacing={2}
      onSubmit={(event) => void handleSubmit(onContinue)(event)}
    >
      <Typography component="h2" variant="h5">
        Сопоставление колонок
      </Typography>
      <Typography color="text.secondary">
        Дата, сумма, категория и тип обязательны. Остальные поля можно
        пропустить.
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'repeat(2, minmax(0, 1fr))',
          },
          gap: 2,
        }}
      >
        {mappingFields.map(({ key, label }) => (
          <Controller
            key={key}
            name={key}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                fullWidth
                label={label}
                error={Boolean(errors[key])}
                helperText={errors[key]?.message}
              >
                <MenuItem value="">Не выбрано</MenuItem>
                {headers.map((header, index) => (
                  <MenuItem key={`${header}-${index}`} value={header}>
                    {header || `Колонка ${index + 1}`}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        ))}
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button onClick={() => onBack(getValues())}>К выбору файла</Button>
        <Button type="submit" variant="contained">
          Предпросмотр
        </Button>
      </Stack>
    </Stack>
  );
}
