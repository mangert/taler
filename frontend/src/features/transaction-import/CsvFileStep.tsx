import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useRef } from 'react';

interface CsvFileStepProps {
  file: File | null;
  pending: boolean;
  error: string | null;
  onSelect: (file: File) => void;
  onContinue?: () => void;
}

export function CsvFileStep({
  file,
  pending,
  error,
  onSelect,
  onContinue,
}: CsvFileStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openFilePicker = () => {
    if (!pending) fileInputRef.current?.click();
  };

  return (
    <Stack component="section" spacing={2} aria-label="Выбор файла">
      <Typography component="h2" variant="h5">
        Выберите файл
      </Typography>
      {file ? <Typography>Выбран файл: {file.name}</Typography> : null}
      {pending ? (
        <Typography role="status">Читаем образец CSV…</Typography>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Box
        component="div"
        role="button"
        tabIndex={pending ? -1 : 0}
        aria-label="Зона загрузки CSV"
        aria-disabled={pending}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragOver={(event) => {
          if (!pending) event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (!pending) {
            const selected = event.dataTransfer.files[0];
            if (selected) onSelect(selected);
          }
        }}
        sx={{
          border: 2,
          borderStyle: 'dashed',
          borderColor: 'divider',
          borderRadius: 2,
          p: { xs: 3, sm: 4 },
          textAlign: 'center',
          cursor: pending ? 'not-allowed' : 'pointer',
          '&:hover': { borderColor: pending ? 'divider' : 'primary.main' },
          '&:focus-visible': {
            outline: '3px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        <Typography>
          Перетащите CSV-файл сюда или нажмите, чтобы выбрать
        </Typography>
      </Box>
      <input
        ref={fileInputRef}
        aria-label="CSV-файл"
        type="file"
        tabIndex={-1}
        disabled={pending}
        accept=".csv,text/csv,application/csv,application/vnd.ms-excel"
        onChange={(event) => {
          const selected = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (selected) onSelect(selected);
        }}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />
      <Button
        variant="outlined"
        onClick={openFilePicker}
        disabled={pending}
        sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
      >
        Выбрать файл
      </Button>
      {file && onContinue ? (
        <Button
          onClick={onContinue}
          disabled={pending}
          sx={{ alignSelf: 'flex-start' }}
        >
          К сопоставлению
        </Button>
      ) : null}
    </Stack>
  );
}
