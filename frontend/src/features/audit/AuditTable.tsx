import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { AuditEntry } from '../../shared/api/audit';
import {
  actionLabels,
  auditSummary,
  entityLabels,
  formatAuditTimestamp,
} from './audit-display';

interface AuditTableProps {
  entries: AuditEntry[];
  timeZone: string;
  onDetails(entry: AuditEntry): void;
}

export function AuditTable({ entries, timeZone, onDetails }: AuditTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table aria-label="Журнал изменений">
        <TableHead>
          <TableRow>
            <TableCell>Дата и время</TableCell>
            <TableCell>Сущность</TableCell>
            <TableCell>Действие</TableCell>
            <TableCell>Запись</TableCell>
            <TableCell align="right">Детали</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>
                <Typography
                  component="time"
                  dateTime={entry.createdAt}
                  variant="body2"
                >
                  {formatAuditTimestamp(entry.createdAt, timeZone)}
                </Typography>
              </TableCell>
              <TableCell>{entityLabels[entry.entityType]}</TableCell>
              <TableCell>{actionLabels[entry.action]}</TableCell>
              <TableCell sx={{ overflowWrap: 'anywhere' }}>
                {auditSummary(entry)}
              </TableCell>
              <TableCell align="right">
                <Button
                  onClick={() => onDetails(entry)}
                  aria-label="Подробнее об изменении"
                >
                  Подробнее
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
