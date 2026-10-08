import { Container, Stack, Typography } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../features/auth/auth-context';
import { auditKeys } from '../features/audit/audit-keys';
import { dashboardKeys } from '../features/dashboard/dashboard-keys';
import { ColumnMappingStep } from '../features/transaction-import/ColumnMappingStep';
import { CsvFileStep } from '../features/transaction-import/CsvFileStep';
import { ImportPreview } from '../features/transaction-import/ImportPreview';
import { ImportResult } from '../features/transaction-import/ImportResult';
import {
  ImportStepper,
  type ImportStep,
} from '../features/transaction-import/ImportStepper';
import { transactionKeys } from '../features/transactions/transaction-keys';
import {
  suggestColumnMapping,
  type ColumnMapping,
} from '../features/transaction-import/column-mapping';
import {
  readCsvSample,
  type CsvSample,
} from '../features/transaction-import/csv-preview';
import {
  transactionImportsApi,
  type TransactionImportResult,
} from '../shared/api/transaction-imports';

export function TransactionImportPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? '';
  const [file, setFile] = useState<File | null>(null);
  const [sample, setSample] = useState<CsvSample | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [step, setStep] = useState<ImportStep>('file');
  const [readPending, setReadPending] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [result, setResult] = useState<TransactionImportResult | null>(null);
  const [importError, setImportError] = useState<unknown>(null);
  const importMutation = useMutation({
    mutationFn: ({ file, mapping }: { file: File; mapping: ColumnMapping }) =>
      transactionImportsApi.import(file, mapping),
  });

  const selectFile = async (selected: File): Promise<void> => {
    setFile(selected);
    setSample(null);
    setMapping(null);
    setReadError(null);
    setReadPending(true);
    try {
      const nextSample = await readCsvSample(selected);
      setSample(nextSample);
      setMapping(suggestColumnMapping(nextSample.headers));
      setStep('mapping');
    } catch (error: unknown) {
      setReadError(
        error instanceof Error
          ? error.message
          : 'Не удалось прочитать CSV-файл.',
      );
    } finally {
      setReadPending(false);
    }
  };

  const importFile = async (): Promise<void> => {
    if (!file || !mapping) return;
    setImportError(null);
    setResult(null);
    try {
      const imported = await importMutation.mutateAsync({ file, mapping });
      setResult(imported);
      setStep('result');
      await Promise.allSettled([
        queryClient.invalidateQueries({
          queryKey: transactionKeys.all(userId),
        }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all(userId) }),
        queryClient.invalidateQueries({ queryKey: ['budgets', userId] }),
        queryClient.invalidateQueries({ queryKey: auditKeys.all(userId) }),
      ]);
    } catch (error: unknown) {
      setImportError(error);
      setStep('result');
    }
  };

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, sm: 6 } }}>
      <Stack spacing={3}>
        <Typography component="h1" variant="h3">
          Импорт транзакций
        </Typography>
        <ImportStepper currentStep={step} />
        {step === 'file' ? (
          <CsvFileStep
            file={file}
            pending={readPending}
            error={readError}
            onSelect={(selected) => void selectFile(selected)}
            onContinue={
              sample && mapping ? () => setStep('mapping') : undefined
            }
          />
        ) : null}
        {step === 'mapping' && sample && mapping ? (
          <ColumnMappingStep
            headers={sample.headers}
            initialMapping={mapping}
            onBack={(currentMapping) => {
              setMapping(currentMapping);
              setStep('file');
            }}
            onContinue={(nextMapping) => {
              setMapping(nextMapping);
              setStep('preview');
            }}
          />
        ) : null}
        {step === 'preview' && sample ? (
          <ImportPreview
            sample={sample}
            pending={importMutation.isPending}
            onBack={() => setStep('mapping')}
            onImport={() => void importFile()}
          />
        ) : null}
        {step === 'result' ? (
          <ImportResult
            result={result}
            error={importError}
            onBack={() => setStep('mapping')}
            onRestart={() => {
              setFile(null);
              setSample(null);
              setMapping(null);
              setResult(null);
              setStep('file');
            }}
          />
        ) : null}
      </Stack>
    </Container>
  );
}
