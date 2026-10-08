import type { components } from './schema';
import { apiRequest } from './http';

export type TransactionImportResult = components['schemas']['ImportResultDto'];

interface TransactionImportMapping {
  date: string;
  amount: string;
  category: string;
  type: string;
  description: string;
  currency: string;
  rate: string;
}

export const transactionImportsApi = {
  import: (
    file: File,
    mapping: TransactionImportMapping,
  ): Promise<TransactionImportResult> => {
    const body = new FormData();
    body.append('file', file);
    body.append(
      'mapping',
      JSON.stringify({
        date: mapping.date,
        amount: mapping.amount,
        category: mapping.category,
        type: mapping.type,
        ...(mapping.description ? { description: mapping.description } : {}),
        ...(mapping.currency ? { currency: mapping.currency } : {}),
        ...(mapping.rate ? { rate: mapping.rate } : {}),
      }),
    );
    return apiRequest<TransactionImportResult>('/api/v1/transaction-imports', {
      method: 'POST',
      body,
    });
  },
};
