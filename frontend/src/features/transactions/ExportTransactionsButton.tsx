import { Alert, Button, Stack } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import {
  transactionsApi,
  type TransactionFilterParams,
} from '../../shared/api/transactions';

interface ExportTransactionsButtonProps {
  filters: TransactionFilterParams;
}

export function ExportTransactionsButton({
  filters,
}: ExportTransactionsButtonProps) {
  const exportCsv = useMutation({
    mutationFn: () => transactionsApi.export(filters),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'transactions.csv';
        document.body.append(link);
        link.click();
        link.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    },
  });

  return (
    <Stack spacing={1}>
      <Button
        variant="outlined"
        disabled={exportCsv.isPending}
        onClick={() => exportCsv.mutate()}
      >
        {exportCsv.isPending ? 'Готовим CSV…' : 'Экспорт CSV'}
      </Button>
      {exportCsv.isError ? (
        <Alert severity="error">
          Не удалось экспортировать CSV. Повторите попытку.
        </Alert>
      ) : null}
    </Stack>
  );
}
