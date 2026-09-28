import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import type { Transaction } from '../../shared/api/transactions';
import {
  formatTransactionAmount,
  formatTransactionDate,
} from './transaction-format';
import { TransactionTypeDisplay } from './TransactionTypeDisplay';

interface TransactionsTableProps {
  transactions: Transaction[];
  categoryNames: Map<string, string>;
  onEdit(transaction: Transaction): void;
  onDelete(transaction: Transaction): void;
}

export function TransactionsTable({
  transactions,
  categoryNames,
  onEdit,
  onDelete,
}: TransactionsTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table
        aria-label="Транзакции"
        sx={{ tableLayout: 'fixed', minWidth: 800 }}
      >
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 115 }}>Дата</TableCell>
            <TableCell>Описание</TableCell>
            <TableCell sx={{ width: '18%' }}>Категория</TableCell>
            <TableCell sx={{ width: 105 }}>Тип</TableCell>
            <TableCell align="right" sx={{ width: 165 }}>
              Сумма
            </TableCell>
            <TableCell
              align="right"
              sx={{
                width: 112,
                position: 'sticky',
                right: 0,
                bgcolor: 'background.paper',
                zIndex: 1,
              }}
            >
              Действия
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                {formatTransactionDate(transaction.transactionDate)}
              </TableCell>
              <TableCell sx={{ overflowWrap: 'anywhere' }}>
                {transaction.description || 'Без описания'}
              </TableCell>
              <TableCell>
                {categoryNames.get(transaction.categoryId) ??
                  'Категория недоступна'}
              </TableCell>
              <TableCell>
                <TransactionTypeDisplay type={transaction.type} />
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                }}
              >
                {formatTransactionAmount(
                  transaction.amount,
                  transaction.currency,
                  transaction.type,
                )}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  position: 'sticky',
                  right: 0,
                  bgcolor: 'background.paper',
                  zIndex: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                <IconButton
                  aria-label={`Изменить транзакцию ${transaction.description || transaction.transactionDate}`}
                  onClick={() => onEdit(transaction)}
                >
                  <EditOutlinedIcon />
                </IconButton>
                <IconButton
                  aria-label={`Удалить транзакцию ${transaction.description || transaction.transactionDate}`}
                  onClick={() => onDelete(transaction)}
                >
                  <DeleteOutlinedIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
