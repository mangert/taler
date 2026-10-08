import {
  Alert,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { CsvSample } from './csv-preview';

interface ImportPreviewProps {
  sample: CsvSample;
  pending: boolean;
  onBack: () => void;
  onImport: () => void;
}

export function ImportPreview({
  sample,
  pending,
  onBack,
  onImport,
}: ImportPreviewProps) {
  return (
    <Stack
      component="section"
      spacing={2}
      aria-label="Предварительный просмотр"
    >
      <Typography component="h2" variant="h5">
        Предварительный просмотр
      </Typography>
      <Alert severity="info">
        Предпросмотр показывает только образец и не заменяет проверку сервером.
      </Alert>
      {sample.rows.length ? (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" aria-label="Образец CSV">
            <TableHead>
              <TableRow>
                {sample.headers.map((header, index) => (
                  <TableCell key={`${header}-${index}`}>{header}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sample.rows.map((row, index) => (
                <TableRow key={`sample-row-${index + 2}`}>
                  {sample.headers.map((header, column) => (
                    <TableCell key={`${header}-${column}`}>
                      {row[column] ?? ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="warning">В образце нет строк данных.</Alert>
      )}
      <Stack direction="row" spacing={2}>
        <Button onClick={onBack} disabled={pending}>
          К сопоставлению
        </Button>
        <Button variant="contained" onClick={onImport} disabled={pending}>
          {pending ? 'Импортируем…' : 'Импортировать'}
        </Button>
      </Stack>
    </Stack>
  );
}
