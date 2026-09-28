import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Box,
  Card,
  CardActions,
  CardContent,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import type { Transaction } from '../../shared/api/transactions';
import {
  formatTransactionAmount,
  formatTransactionDate,
} from './transaction-format';
import { TransactionTypeDisplay } from './TransactionTypeDisplay';

interface TransactionCardListProps {
  transactions: Transaction[];
  categoryNames: Map<string, string>;
  onEdit(transaction: Transaction): void;
  onDelete(transaction: Transaction): void;
}

export function TransactionCardList({
  transactions,
  categoryNames,
  onEdit,
  onDelete,
}: TransactionCardListProps) {
  return (
    <Box
      component="ul"
      aria-label="Карточки транзакций"
      sx={{ p: 0, m: 0, listStyle: 'none', display: 'grid', gap: 2 }}
    >
      {transactions.map((transaction) => (
        <Card
          component="li"
          key={transaction.id}
          variant="outlined"
          sx={{ minWidth: 0 }}
        >
          <CardContent>
            <Stack spacing={1}>
              <Typography
                component="h2"
                variant="h6"
                sx={{ overflowWrap: 'anywhere' }}
              >
                {transaction.description || 'Без описания'}
              </Typography>
              <Typography
                sx={{
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 600,
                  overflowWrap: 'anywhere',
                }}
              >
                {formatTransactionAmount(
                  transaction.amount,
                  transaction.currency,
                  transaction.type,
                )}
              </Typography>
              <TransactionTypeDisplay type={transaction.type} />
              <Typography
                color="text.secondary"
                sx={{ overflowWrap: 'anywhere' }}
              >
                {categoryNames.get(transaction.categoryId) ??
                  'Категория недоступна'}
              </Typography>
              <Typography color="text.secondary">
                {formatTransactionDate(transaction.transactionDate)}
              </Typography>
            </Stack>
          </CardContent>
          <CardActions sx={{ justifyContent: 'flex-end' }}>
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
          </CardActions>
        </Card>
      ))}
    </Box>
  );
}
